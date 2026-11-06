import type { EvaluationCase } from "./evaluation-case.js";

export const MAX_EVALUATION_LATENCY_MS = 15_000;
export const LLM_RUBRIC_THRESHOLD = 0.8;

export interface PromptfooAssertion {
  type: "javascript" | "latency" | "llm-rubric";
  metric: string;
  value?: string;
  threshold?: number;
  config?: Record<string, unknown>;
}

export interface PromptfooCase extends EvaluationCase {
  assert: PromptfooAssertion[];
}

interface DeterministicRule {
  rule: string;
  [key: string]: unknown;
}

const DETERMINISTIC_RULES: Record<string, DeterministicRule> = {
  "006": { rule: "exact_bullet_count", count: 3 },
  "011": { rule: "contains_all", values: ["book"] },
  "013": {
    rule: "json_sku_set",
    expectedSkus: [
      "BK-101",
      "AC-201",
      "AC-202",
      "ST-301",
      "ST-302",
      "EL-401",
      "AC-203",
    ],
  },
  "022": {
    rule: "contains_all",
    values: ["$59", "$60", "paid in full"],
  },
  "027": {
    rule: "contains_all",
    values: ["$74.99", "$75", "$5"],
  },
  "033": {
    rule: "contains_all",
    values: ["Adjustable Reading Lamp", "AC-202"],
  },
  "035": {
    rule: "json_product_set",
    expectedProducts: [
      { sku: "EL-401", name: "Wireless Mouse", price: 25 },
    ],
    allowedFields: ["sku", "name", "price"],
  },
  "038": { rule: "shipping_markdown_table" },
};

export function buildPromptfooCases(
  cases: EvaluationCase[],
): PromptfooCase[] {
  return cases.map((evaluationCase) => ({
    ...evaluationCase,
    assert: buildAssertions(evaluationCase),
  }));
}

function buildAssertions(evaluationCase: EvaluationCase): PromptfooAssertion[] {
  const assertions: PromptfooAssertion[] = [];
  const { metadata } = evaluationCase;

  if (metadata.expectedDocumentIds.length > 0) {
    assertions.push({
      type: "javascript",
      metric: "retrieval_recall_at_5",
      value: "file://evaluation/assertions/recall-at-5.cjs",
      config: {
        expectedDocumentIds: metadata.expectedDocumentIds,
      },
    });
  }

  if (metadata.scoringMethods.includes("deterministic")) {
    const rule = DETERMINISTIC_RULES[metadata.id];

    if (!rule) {
      throw new Error(
        `Missing deterministic assertion rule for evaluation case ${metadata.id}.`,
      );
    }

    assertions.push({
      type: "javascript",
      metric: "deterministic_correctness",
      value: "file://evaluation/assertions/deterministic.cjs",
      config: rule,
    });
  }

  if (metadata.scoringMethods.includes("llm_rubric")) {
    assertions.push({
      type: "llm-rubric",
      metric: "answer_quality",
      value: metadata.expectedAnswerOrRubric,
      threshold: LLM_RUBRIC_THRESHOLD,
    });
  }

  assertions.push({
    type: "latency",
    metric: "latency_ms",
    threshold: MAX_EVALUATION_LATENCY_MS,
  });

  return assertions;
}
