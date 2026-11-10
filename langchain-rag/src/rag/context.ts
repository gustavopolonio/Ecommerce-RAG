import type { Document } from "@langchain/core/documents";

import type { OpenAIVectorStoreDocumentMetadata } from "../retrieval/openai-vector-store-retriever.js";

export function formatRetrievedContext(
  documents: Array<Document<OpenAIVectorStoreDocumentMetadata>>,
): string {
  return JSON.stringify(
    documents.map((document, index) => ({
      sourceIndex: index + 1,
      documentId: document.metadata.documentId,
      filename: document.metadata.filename,
      content: document.pageContent,
    })),
    null,
    2,
  );
}
