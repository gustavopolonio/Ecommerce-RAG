import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildPromptfooCases,
  LLM_RUBRIC_THRESHOLD,
  MAX_EVALUATION_LATENCY_MS,
} from "./build-promptfoo-cases.js";
import type { EvaluationCase } from "./evaluation-case.js";
import { loadEvaluationDataset } from "./load-evaluation-dataset.js";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourcePath = resolve(projectRoot, "RAG-Ecommercedataset.csv");
const generatedPath = resolve(projectRoot, "evaluation/promptfoo-cases.json");

describe("buildPromptfooCases", () => {
  it("maps dataset metadata to the expected assertion mix", async () => {
    const cases = buildPromptfooCases(await loadEvaluationDataset(sourcePath));
    const assertions = cases.flatMap((item) => item.assert);

    expect(cases).toHaveLength(40);
    expect(
      assertions.filter(
        (assertion) => assertion.metric === "retrieval_recall_at_5",
      ),
    ).toHaveLength(35);
    expect(
      assertions.filter(
        (assertion) => assertion.metric === "deterministic_correctness",
      ),
    ).toHaveLength(8);
    expect(
      assertions.filter((assertion) => assertion.metric === "answer_quality"),
    ).toHaveLength(38);
    expect(
      assertions.filter((assertion) => assertion.metric === "latency_ms"),
    ).toHaveLength(40);
  });

  it("configures Recall@5, rubric grading, and latency explicitly", async () => {
    const cases = buildPromptfooCases(await loadEvaluationDataset(sourcePath));
    const paymentCase = findCase(cases, "001");

    expect(paymentCase.assert).toEqual([
      {
        type: "javascript",
        metric: "retrieval_recall_at_5",
        value: "file://evaluation/assertions/recall-at-5.cjs",
        config: { expectedDocumentIds: ["DOC-001"] },
      },
      {
        type: "llm-rubric",
        metric: "answer_quality",
        value: "Confirm that PIX is acceptable",
        threshold: LLM_RUBRIC_THRESHOLD,
      },
      {
        type: "latency",
        metric: "latency_ms",
        threshold: MAX_EVALUATION_LATENCY_MS,
      },
    ]);
  });

  it("does not add retrieval assertions to cases without expected documents", async () => {
    const cases = buildPromptfooCases(await loadEvaluationDataset(sourcePath));
    const securityCase = findCase(cases, "005");

    expect(
      securityCase.assert.some(
        (assertion) => assertion.metric === "retrieval_recall_at_5",
      ),
    ).toBe(false);
  });

  it("fails when a deterministic case has no reviewed rule", () => {
    const incompleteCase: EvaluationCase = {
      description: "Missing rule",
      vars: { question: "Question" },
      metadata: {
        id: "999",
        categories: ["payment"],
        scenarioType: "normal",
        evaluationTargets: ["formatting"],
        expectedDocumentIds: [],
        expectedBehavior: "Expected behavior",
        expectedAnswerOrRubric: "Expected answer",
        failureCategories: ["formatting_violation"],
        scoringMethods: ["deterministic"],
      },
    };

    expect(() => buildPromptfooCases([incompleteCase])).toThrow(
      "Missing deterministic assertion rule for evaluation case 999",
    );
  });

  it("keeps the generated Promptfoo cases synchronized with the CSV", async () => {
    const [cases, generatedJson] = await Promise.all([
      loadEvaluationDataset(sourcePath),
      readFile(generatedPath, "utf8"),
    ]);

    expect(JSON.parse(generatedJson)).toEqual(buildPromptfooCases(cases));
  });

  it("references assertion scripts from the Promptfoo project root", async () => {
    const cases = buildPromptfooCases(await loadEvaluationDataset(sourcePath));
    const scriptPaths = cases
      .flatMap((item) => item.assert)
      .filter((assertion) => assertion.type === "javascript")
      .map((assertion) => assertion.value);

    await Promise.all(
      scriptPaths.map((scriptPath) => {
        if (!scriptPath?.startsWith("file://")) {
          throw new Error(`Invalid assertion script path: ${scriptPath}`);
        }

        return access(resolve(projectRoot, scriptPath.slice("file://".length)));
      }),
    );
  });
});

function findCase<T extends EvaluationCase>(cases: T[], id: string): T {
  const evaluationCase = cases.find((item) => item.metadata.id === id);

  if (!evaluationCase) {
    throw new Error(`Missing test fixture ${id}.`);
  }

  return evaluationCase;
}
