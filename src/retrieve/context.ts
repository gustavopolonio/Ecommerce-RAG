import type { RetrievedDocument } from "./explicit-retrieve.js";

export function assembleRetrievedContext(
  documents: RetrievedDocument[],
): string {
  return JSON.stringify(
    documents.map((document, index) => ({
      sourceIndex: index + 1,
      documentId: document.documentId,
      filename: document.filename,
      content: document.text,
    })),
    null,
    2,
  );
}
