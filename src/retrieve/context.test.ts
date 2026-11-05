import { describe, expect, it } from "vitest";

import { assembleRetrievedContext } from "./context.js";

describe("assembleRetrievedContext", () => {
  it("keeps passages associated with stable source identifiers", () => {
    const context = assembleRetrievedContext([
      {
        fileId: "file-payment",
        filename: "payment.md",
        score: 0.9,
        documentId: "DOC-001",
        sourceFilename: "payment.md",
        text: "Pix is supported.",
      },
      {
        fileId: "file-faq",
        filename: "faq.md",
        score: 0.8,
        documentId: null,
        sourceFilename: null,
        text: "FAQ content.",
      },
    ]);

    expect(JSON.parse(context)).toEqual([
      {
        sourceIndex: 1,
        documentId: "DOC-001",
        filename: "payment.md",
        content: "Pix is supported.",
      },
      {
        sourceIndex: 2,
        documentId: null,
        filename: "faq.md",
        content: "FAQ content.",
      },
    ]);
  });
});
