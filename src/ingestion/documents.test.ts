import { describe, expect, it } from "vitest";

import {
  EXPECTED_DOCUMENT_IDS,
  selectKnowledgeDocuments,
} from "./documents.js";

const knowledgeFileNames = [
  "DOC-006_faq.md",
  "DOC-002_return_refund_policy.md",
  "DOC-004_product_warranty.md",
  "DOC-001_payment_policy.md",
  "DOC-005_product_catalog.md",
  "DOC-003_shipping_policy.md",
];

describe("selectKnowledgeDocuments", () => {
  it("selects and orders exactly the six numbered documents", () => {
    const documents = selectKnowledgeDocuments(
      [...knowledgeFileNames, "ASSISTANT_INSTRUCTIONS.md"],
      "/knowledge-base",
    );

    expect(documents.map(({ documentId }) => documentId)).toEqual(
      EXPECTED_DOCUMENT_IDS,
    );
    expect(documents[0]).toEqual({
      documentId: "DOC-001",
      fileName: "DOC-001_payment_policy.md",
      filePath: "/knowledge-base/DOC-001_payment_policy.md",
    });
  });

  it("rejects a missing source document", () => {
    expect(() =>
      selectKnowledgeDocuments(knowledgeFileNames.slice(1), "/knowledge-base"),
    ).toThrow("Knowledge base must contain exactly");
  });

  it("rejects an unexpected numbered source document", () => {
    expect(() =>
      selectKnowledgeDocuments(
        [...knowledgeFileNames, "DOC-007_extra.md"],
        "/knowledge-base",
      ),
    ).toThrow("DOC-007");
  });
});
