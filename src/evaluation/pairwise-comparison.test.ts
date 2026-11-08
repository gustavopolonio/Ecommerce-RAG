import { describe, expect, it } from "vitest";

import type { EvaluationCase } from "./evaluation-case.js";
import {
  buildPairwiseCases,
  extractStoredResponses,
  PAIRWISE_CASE_IDS,
  readChatAnswer,
} from "./pairwise-comparison.js";

describe("buildPairwiseCases", () => {
  it("builds one select-best comparison for every reviewed case", () => {
    const cases = PAIRWISE_CASE_IDS.map(buildEvaluationCase);
    const pairwiseCases = buildPairwiseCases(cases);

    expect(pairwiseCases.map((item) => item.metadata.id)).toEqual(
      PAIRWISE_CASE_IDS,
    );
    expect(pairwiseCases).toHaveLength(5);
    expect(pairwiseCases[0]?.assert).toEqual([
      expect.objectContaining({
        type: "select-best",
        metric: "pairwise_preference",
      }),
    ]);
    expect(pairwiseCases[0]?.assert[0]?.value).toContain("Requirement 017");
  });
});

describe("extractStoredResponses", () => {
  it("extracts compact replay fixtures from a Promptfoo report", () => {
    const report = {
      results: {
        results: [
          {
            vars: { question: "Question 017" },
            testCase: { metadata: { id: "017" } },
            response: { output: "Answer 017" },
          },
        ],
      },
    };

    expect(extractStoredResponses(report, ["017"])).toEqual([
      {
        id: "017",
        question: "Question 017",
        answer: "Answer 017",
      },
    ]);
  });

  it("rejects reports that are missing a requested case", () => {
    expect(() =>
      extractStoredResponses({ results: { results: [] } }, ["017"]),
    ).toThrow("Promptfoo result 017 must be an object");
  });
});

describe("readChatAnswer", () => {
  it("extracts a DemoShop chat message", () => {
    expect(readChatAnswer({ message: "Answer" })).toBe("Answer");
  });

  it("rejects an empty DemoShop chat message", () => {
    expect(() => readChatAnswer({ message: "" })).toThrow(
      "DemoShop chat response has no answer message",
    );
  });
});

function buildEvaluationCase(id: string): EvaluationCase {
  return {
    description: `Case ${id}`,
    vars: { question: `Question ${id}` },
    metadata: {
      id,
      categories: ["return"],
      scenarioType: "normal",
      evaluationTargets: ["grounding"],
      expectedDocumentIds: ["DOC-002"],
      expectedBehavior: `Behavior ${id}`,
      expectedAnswerOrRubric: `Requirement ${id}`,
      failureCategories: ["incorrect_policy_information"],
      scoringMethods: ["llm_rubric"],
    },
  };
}
