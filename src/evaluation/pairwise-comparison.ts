import type { EvaluationCase } from "./evaluation-case.js";

export const BASELINE_RESPONSE_CASE_IDS = [
  "006",
  "014",
  "017",
  "018",
  "019",
  "020",
  "037",
] as const;

export const PAIRWISE_CASE_IDS = [
  "017",
  "018",
  "019",
  "020",
  "037",
] as const;

export interface StoredEvaluationResponse {
  id: string;
  question: string;
  answer: string;
}

export interface PairwiseCase {
  description: string;
  vars: {
    caseId: string;
    question: string;
  };
  metadata: EvaluationCase["metadata"];
  assert: Array<{
    type: "select-best";
    metric: "pairwise_preference";
    value: string;
  }>;
}

export function buildPairwiseCases(
  evaluationCases: EvaluationCase[],
): PairwiseCase[] {
  return PAIRWISE_CASE_IDS.map((id) => {
    const evaluationCase = evaluationCases.find(
      (item) => item.metadata.id === id,
    );

    if (!evaluationCase) {
      throw new Error(`Missing pairwise evaluation case ${id}.`);
    }

    return {
      description: `[${id}] Pairwise — ${evaluationCase.vars.question}`,
      vars: {
        caseId: id,
        question: evaluationCase.vars.question,
      },
      metadata: evaluationCase.metadata,
      assert: [
        {
          type: "select-best",
          metric: "pairwise_preference",
          value: [
            "Choose the response that more completely satisfies the case-specific requirements.",
            `Requirements: ${evaluationCase.metadata.expectedAnswerOrRubric}`,
            "Prefer accurate, grounded, direct, and appropriately clarifying answers.",
            "Do not reward unsupported claims or verbosity by itself.",
          ].join(" "),
        },
      ],
    };
  });
}

export function extractStoredResponses(
  report: unknown,
  caseIds: readonly string[],
): StoredEvaluationResponse[] {
  const reportObject = requireRecord(report, "Promptfoo report");
  const resultContainer = requireRecord(
    reportObject.results,
    "Promptfoo report results",
  );

  const { results } = resultContainer;

  if (!Array.isArray(results)) {
    throw new Error("Promptfoo report does not contain a results array.");
  }

  return caseIds.map((id) => {
    const result = results.find((item: unknown) => readCaseId(item) === id);
    const resultObject = requireRecord(result, `Promptfoo result ${id}`);
    const vars = requireRecord(resultObject.vars, `Promptfoo result ${id} vars`);
    const response = requireRecord(
      resultObject.response,
      `Promptfoo result ${id} response`,
    );

    if (typeof vars.question !== "string" || vars.question.trim() === "") {
      throw new Error(`Promptfoo result ${id} has no question.`);
    }

    if (typeof response.output !== "string" || response.output.trim() === "") {
      throw new Error(`Promptfoo result ${id} has no answer output.`);
    }

    return {
      id,
      question: vars.question,
      answer: response.output,
    };
  });
}

export function readChatAnswer(response: unknown): string {
  const responseObject = requireRecord(response, "DemoShop chat response");

  if (
    typeof responseObject.message !== "string" ||
    responseObject.message.trim() === ""
  ) {
    throw new Error("DemoShop chat response has no answer message.");
  }

  return responseObject.message;
}

function readCaseId(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.testCase)) {
    return undefined;
  }

  const { metadata } = value.testCase;
  return isRecord(metadata) && typeof metadata.id === "string"
    ? metadata.id
    : undefined;
}

function requireRecord(
  value: unknown,
  description: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${description} must be an object.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
