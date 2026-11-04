import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MAX_RESULTS,
  retrieveVectorStoreDocuments,
} from "./explicit-retrieve.js";

describe("retrieveVectorStoreDocuments", () => {
  it("returns the complete top-k result set with source metadata", async () => {
    const search = vi.fn().mockResolvedValue({
      data: [
        {
          file_id: "file-payment",
          filename: "DOC-001_payment_policy.md",
          score: 0.97,
          attributes: {
            document_id: "DOC-001",
            source_filename: "DOC-001_payment_policy.md",
          },
          content: [
            { type: "text", text: "Pix is supported." },
            { type: "text", text: "Payments are confirmed after approval." },
          ],
        },
        {
          file_id: "file-faq",
          filename: "DOC-006_faq.md",
          score: 0.72,
          attributes: null,
          content: [{ type: "text", text: "See the payment policy." }],
        },
      ],
    });
    const client = { vectorStores: { search } } as unknown as OpenAI;

    await expect(
      retrieveVectorStoreDocuments(client, "vs-demo", "Can I pay by Pix?"),
    ).resolves.toEqual([
      {
        fileId: "file-payment",
        filename: "DOC-001_payment_policy.md",
        score: 0.97,
        documentId: "DOC-001",
        sourceFilename: "DOC-001_payment_policy.md",
        text: "Pix is supported.\n\nPayments are confirmed after approval.",
      },
      {
        fileId: "file-faq",
        filename: "DOC-006_faq.md",
        score: 0.72,
        documentId: null,
        sourceFilename: null,
        text: "See the payment policy.",
      },
    ]);
    expect(search).toHaveBeenCalledWith("vs-demo", {
      query: "Can I pay by Pix?",
      max_num_results: DEFAULT_MAX_RESULTS,
    });
  });
});
