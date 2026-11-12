import { describe, expect, it } from "vitest";

import {
  RECALL_AT_FIVE_KEY,
  recallAtFiveEvaluator,
} from "./recall-at-five.js";

describe("recallAtFiveEvaluator", () => {
  it("scores full recall when every expected document is in the top five", () => {
    const evaluation = recallAtFiveEvaluator({
      outputs: {
        sources: sources("DOC-006", "DOC-001", "DOC-003"),
      },
      referenceOutputs: {
        expectedDocumentIds: ["DOC-001", "DOC-006"],
      },
    });

    expect(evaluation).toEqual({
      key: RECALL_AT_FIVE_KEY,
      score: 1,
      comment:
        "Retrieved all expected documents in the top 5: DOC-001, DOC-006.",
    });
  });

  it("scores partial recall and identifies missing documents", () => {
    const evaluation = recallAtFiveEvaluator({
      outputs: { sources: sources("DOC-001", "DOC-003") },
      referenceOutputs: {
        expectedDocumentIds: ["DOC-001", "DOC-006"],
      },
    });

    expect(evaluation).toEqual({
      key: RECALL_AT_FIVE_KEY,
      score: 0.5,
      comment: "Missing expected documents from the top 5: DOC-006.",
    });
  });

  it("ignores an expected document retrieved below rank five", () => {
    const evaluation = recallAtFiveEvaluator({
      outputs: {
        sources: sources(
          "DOC-001",
          "DOC-002",
          "DOC-003",
          "DOC-004",
          "DOC-005",
          "DOC-006",
        ),
      },
      referenceOutputs: { expectedDocumentIds: ["DOC-006"] },
    });

    expect(evaluation.score).toBe(0);
    expect(evaluation.comment).toBe(
      "Missing expected documents from the top 5: DOC-006.",
    );
  });

  it("returns a null score when retrieval is not applicable", () => {
    const evaluation = recallAtFiveEvaluator({
      outputs: { sources: [] },
      referenceOutputs: { expectedDocumentIds: [] },
    });

    expect(evaluation).toEqual({
      key: RECALL_AT_FIVE_KEY,
      score: null,
      comment:
        "Recall@5 is not applicable because this case has no expected documents.",
    });
  });

  it("fails clearly when reference outputs or retrieved sources are invalid", () => {
    expect(
      recallAtFiveEvaluator({ outputs: { sources: [] } }),
    ).toMatchObject({
      score: 0,
      comment:
        "Recall@5 could not run because expectedDocumentIds is missing or invalid.",
    });
    expect(
      recallAtFiveEvaluator({
        outputs: {},
        referenceOutputs: { expectedDocumentIds: ["DOC-001"] },
      }),
    ).toMatchObject({
      score: 0,
      comment:
        "Recall@5 could not find the retrieved sources in the target output.",
    });
  });
});

function sources(...documentIds: string[]) {
  return documentIds.map((documentId) => ({ documentId }));
}
