module.exports = function recallAtFive(_output, context) {
  const expected = context.config?.expectedDocumentIds;
  const sources = context.providerResponse?.metadata?.sources;

  if (!Array.isArray(expected) || expected.length === 0) {
    return failure("Recall@5 requires at least one expected document ID.");
  }

  if (!Array.isArray(sources)) {
    return failure("The provider response did not include retrieved sources.");
  }

  const retrieved = new Set(
    sources
      .slice(0, 5)
      .map((source) => source?.documentId)
      .filter((documentId) => typeof documentId === "string"),
  );
  const hits = expected.filter((documentId) => retrieved.has(documentId));
  const recall = hits.length / expected.length;
  const missing = expected.filter((documentId) => !retrieved.has(documentId));

  return {
    pass: recall === 1,
    score: recall,
    reason:
      missing.length === 0
        ? `Retrieved all expected documents in the top 5: ${hits.join(", ")}.`
        : `Missing expected documents from the top 5: ${missing.join(", ")}.`,
    namedScores: {
      recall_at_5: recall,
    },
  };
};

function failure(reason) {
  return { pass: false, score: 0, reason };
}
