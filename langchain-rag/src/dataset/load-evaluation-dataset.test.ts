import { describe, expect, it } from "vitest";

import { SHARED_ASSETS } from "../config/shared-assets.js";
import type { EvaluationCase } from "./evaluation-case.js";
import {
  EXPECTED_EVALUATION_CASE_COUNT,
  loadEvaluationDataset,
  parseEvaluationDataset,
} from "./load-evaluation-dataset.js";

describe("loadEvaluationDataset", () => {
  it("loads and normalizes all 40 CSV cases", async () => {
    const cases = await loadEvaluationDataset(
      SHARED_ASSETS.evaluationDataset,
    );

    expect(cases).toHaveLength(EXPECTED_EVALUATION_CASE_COUNT);
    expect(new Set(cases.map(({ id }) => id)).size).toBe(
      EXPECTED_EVALUATION_CASE_COUNT,
    );
    expect(findCase(cases, "001")).toMatchObject({
      question: "Can I pay by PIX?",
      sourceRowNumber: 4,
      categories: ["payment"],
      evaluationTargets: ["retrieval"],
      expectedDocumentIds: ["DOC-001"],
      scoringMethods: ["llm_rubric"],
    });
    expect(findCase(cases, "040")).toMatchObject({
      sourceRowNumber: 43,
      categories: ["payment", "delivery"],
      evaluationTargets: ["retrieval", "grounding"],
      expectedDocumentIds: ["DOC-001", "DOC-003", "DOC-005"],
    });
  });

  it("normalizes source typos, compound values, and absent documents", async () => {
    const cases = await loadEvaluationDataset(
      SHARED_ASSETS.evaluationDataset,
    );

    expect(findCase(cases, "005").expectedDocumentIds).toEqual([]);
    expect(findCase(cases, "006").scoringMethods).toEqual([
      "deterministic",
      "llm_rubric",
    ]);
    expect(findCase(cases, "014").evaluationTargets).toEqual([
      "grounding",
    ]);
    expect(findCase(cases, "015").expectedDocumentIds).toEqual([
      "DOC-002",
      "DOC-004",
    ]);
  });

  it("preserves the reviewed rubrics for cases 006 and 014", async () => {
    const cases = await loadEvaluationDataset(
      SHARED_ASSETS.evaluationDataset,
    );

    expect(findCase(cases, "006").expectedAnswerOrRubric).toContain(
      "Additional policy details are acceptable",
    );
    expect(findCase(cases, "014").expectedAnswerOrRubric).toContain(
      "cannot calculate an address-specific or ZIP-specific estimate",
    );
  });
});

describe("parseEvaluationDataset", () => {
  it("rejects duplicate case IDs", () => {
    expect(() =>
      parseEvaluationDataset(buildCsv([validRow("1"), validRow("1")])),
    ).toThrow("Duplicate evaluation case ID: 001");
  });

  it("rejects invalid document IDs", () => {
    expect(() =>
      parseEvaluationDataset(buildCsv([validRow("1", "DOC-999")])),
    ).toThrow('Invalid document ID "DOC-999"');
  });

  it("rejects missing required columns", () => {
    expect(() => parseEvaluationDataset("id,prompt\n1,Question")).toThrow(
      "Missing required CSV column: category",
    );
  });
});

function findCase(cases: EvaluationCase[], id: string): EvaluationCase {
  const evaluationCase = cases.find((item) => item.id === id);

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
