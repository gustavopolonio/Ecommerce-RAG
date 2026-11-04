import { describe, expect, it } from "vitest";

import { buildVectorStoreFiles } from "./ingest-knowledge-base.js";

describe("buildVectorStoreFiles", () => {
  it("preserves document identity as per-file attributes", () => {
    expect(
      buildVectorStoreFiles([
        {
          document: {
            documentId: "DOC-001",
            fileName: "DOC-001_payment_policy.md",
            filePath: "/knowledge-base/DOC-001_payment_policy.md",
          },
          fileId: "file-payment",
        },
      ]),
    ).toEqual([
      {
        file_id: "file-payment",
        attributes: {
          document_id: "DOC-001",
          source_filename: "DOC-001_payment_policy.md",
        },
      },
    ]);
  });
});
