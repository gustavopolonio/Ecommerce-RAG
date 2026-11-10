import { Document } from "@langchain/core/documents";
import { describe, expect, it } from "vitest";

import type { OpenAIVectorStoreDocumentMetadata } from "../retrieval/openai-vector-store-retriever.js";
import { formatRetrievedContext } from "./context.js";

describe("formatRetrievedContext", () => {
  it("formats attributed passages without turning metadata into instructions", () => {
    const document = new Document<OpenAIVectorStoreDocumentMetadata>({
      pageContent: "Pix is supported.",
      metadata: {
        fileId: "file-payment",
        filename: "DOC-001_payment_policy.md",
        score: 0.97,
        documentId: "DOC-001",
        sourceFilename: "DOC-001_payment_policy.md",
        attributes: null,
      },
    });

    expect(JSON.parse(formatRetrievedContext([document]))).toEqual([
      {
        sourceIndex: 1,
        documentId: "DOC-001",
        filename: "DOC-001_payment_policy.md",
        content: "Pix is supported.",
      },
    ]);
  });
});
