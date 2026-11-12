import type { EvaluationResult } from "langsmith/evaluation";

export const RECALL_AT_FIVE_KEY = "retrieval_recall_at_5";
export const RECALL_AT_FIVE_PASS_SCORE = 1;

export interface RecallAtFiveEvaluatorArguments {
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}

export function recallAtFiveEvaluator({
  outputs,
  referenceOutputs,
}: RecallAtFiveEvaluatorArguments): EvaluationResult {
  const expectedDocumentIds = referenceOutputs?.expectedDocumentIds;

  if (!isStringArray(expectedDocumentIds)) {
    return result(
      0,
      "Recall@5 could not run because expectedDocumentIds is missing or invalid.",
    );
  }

  if (expectedDocumentIds.length === 0) {
    return result(
      null,
      "Recall@5 is not applicable because this case has no expected documents.",
    );
  }

  if (!Array.isArray(outputs.sources)) {
    return result(
      0,
      "Recall@5 could not find the retrieved sources in the target output.",
    );
  }

  const expected = [...new Set(expectedDocumentIds)];
  const retrieved = new Set(
    outputs.sources.slice(0, 5).flatMap((source) => {
      const documentId = readDocumentId(source);
      return documentId === null ? [] : [documentId];
    }),
  );
  const hits = expected.filter((documentId) => retrieved.has(documentId));
  const missing = expected.filter((documentId) => !retrieved.has(documentId));
  const score = hits.length / expected.length;

  return result(
    score,
    missing.length === 0
      ? `Retrieved all expected documents in the top 5: ${hits.join(", ")}.`
      : `Missing expected documents from the top 5: ${missing.join(", ")}.`,
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function readDocumentId(source: unknown): string | null {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  const documentId = Reflect.get(source, "documentId");
  return typeof documentId === "string" ? documentId : null;
}

function result(score: number | null, comment: string): EvaluationResult {
  return {
    key: RECALL_AT_FIVE_KEY,
    score,
    comment,
  };
}
