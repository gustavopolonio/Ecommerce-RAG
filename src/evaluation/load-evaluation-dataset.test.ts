import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { EvaluationCase } from "./evaluation-case.js";
import {
  EXPECTED_EVALUATION_CASE_COUNT,
  loadEvaluationDataset,
  parseEvaluationDataset,
} from "./load-evaluation-dataset.js";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourcePath = resolve(projectRoot, "RAG-Ecommercedataset.csv");
const generatedPath = resolve(projectRoot, "evaluation/cases.json");

describe("loadEvaluationDataset", () => {
  it("loads and normalizes all 40 evaluation cases", async () => {
    const cases = await loadEvaluationDataset(sourcePath);

    expect(cases).toHaveLength(EXPECTED_EVALUATION_CASE_COUNT);
    expect(new Set(cases.map((item) => item.metadata.id))).toHaveLength(
      EXPECTED_EVALUATION_CASE_COUNT,
    );
    expect(findCase(cases, "001")).toMatchObject({
      vars: { question: "Can I pay by PIX?" },
      metadata: {
        categories: ["payment"],
        evaluationTargets: ["retrieval"],
        expectedDocumentIds: ["DOC-001"],
        scoringMethods: ["llm_rubric"],
      },
    });
  });

  it("normalizes compound values, source typos, and absent documents", async () => {
    const cases = await loadEvaluationDataset(sourcePath);

    expect(findCase(cases, "005").metadata.expectedDocumentIds).toEqual([]);
    expect(findCase(cases, "006").metadata.scoringMethods).toEqual([
      "deterministic",
      "llm_rubric",
    ]);
    expect(findCase(cases, "014").metadata.evaluationTargets).toEqual([
      "grounding",
    ]);
    expect(findCase(cases, "015").metadata.expectedDocumentIds).toEqual([
      "DOC-002",
      "DOC-004",
    ]);
    expect(findCase(cases, "040").metadata.categories).toEqual([
      "payment",
      "delivery",
    ]);
  });

  it("parses quoted rubric text containing commas", async () => {
    const cases = await loadEvaluationDataset(sourcePath);

    expect(findCase(cases, "002").metadata.expectedAnswerOrRubric).toContain(
      "unused, undamaged, and includes its original accessories",
    );
  });

  it("keeps the generated Promptfoo JSON synchronized with the CSV", async () => {
    const [cases, generatedJson] = await Promise.all([
      loadEvaluationDataset(sourcePath),
      readFile(generatedPath, "utf8"),
    ]);

    expect(JSON.parse(generatedJson)).toEqual(cases);
  });
});

describe("parseEvaluationDataset", () => {
  it("rejects duplicate IDs", () => {
    expect(() =>
      parseEvaluationDataset(buildCsv([validRow("1"), validRow("1")])),
    ).toThrow("Duplicate evaluation case ID: 001");
  });

  it("rejects invalid document IDs", () => {
    expect(() =>
      parseEvaluationDataset(buildCsv([validRow("1", "DOC-999")])),
    ).toThrow('Invalid document ID "DOC-999"');
  });

  it("rejects a missing required header", () => {
    expect(() => parseEvaluationDataset("id,prompt\n1,Question"))
      .toThrow("Missing required CSV column: category");
  });
});

function findCase(cases: EvaluationCase[], id: string): EvaluationCase {
  const evaluationCase = cases.find((item) => item.metadata.id === id);

  if (!evaluationCase) {
    throw new Error(`Missing test fixture ${id}.`);
  }

  return evaluationCase;
}

function buildCsv(rows: string[][]): string {
  return [
    [
      "id",
      "category",
      "prompt",
      "expected behavior",
      "Scenario type",
      "evaluation target",
      "document id",
      "Expected answer/rucbric",
      "Failure category",
      "Scoring method",
    ],
    ...rows,
  ]
    .map((row) => row.join(","))
    .join("\n");
}

function validRow(id: string, documentId = "DOC-001"): string[] {
  return [
    id,
    "Payment",
    "Can I pay by PIX?",
    "Answer from policy",
    "Normal",
    "Retrieval",
    documentId,
    "Confirm PIX support",
    "Incorrect policy information",
    "Judge-based",
  ];
}
