import { Document } from "@langchain/core/documents";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MAX_RESULTS,
  OpenAIVectorStoreRetriever,
  createOpenAIVectorStoreRetriever,
  type OpenAIVectorStoreSearchClient,
} from "./openai-vector-store-retriever.js";

describe("OpenAIVectorStoreRetriever", () => {
  it("searches the configured store and returns LangChain Documents", async () => {
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
            { type: "text", text: "Approval confirms the payment." },
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
    const retriever = new OpenAIVectorStoreRetriever({
      client: createMockClient(search),
      vectorStoreId: " vs-demo ",
    });

    const documents = await retriever.invoke(" Can I pay by Pix? ");

    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith("vs-demo", {
      query: "Can I pay by Pix?",
      max_num_results: DEFAULT_MAX_RESULTS,
    });
    expect(documents).toHaveLength(2);
    expect(documents.every((document) => document instanceof Document)).toBe(
      true,
    );
    expect(documents).toEqual([
      expect.objectContaining({
        id: "file-payment:0",
        pageContent:
          "Pix is supported.\n\nApproval confirms the payment.",
        metadata: {
          fileId: "file-payment",
          filename: "DOC-001_payment_policy.md",
          score: 0.97,
          documentId: "DOC-001",
          sourceFilename: "DOC-001_payment_policy.md",
          attributes: {
            document_id: "DOC-001",
            source_filename: "DOC-001_payment_policy.md",
          },
        },
      }),
      expect.objectContaining({
        id: "file-faq:1",
        pageContent: "See the payment policy.",
        metadata: {
          fileId: "file-faq",
          filename: "DOC-006_faq.md",
          score: 0.72,
          documentId: null,
          sourceFilename: null,
          attributes: null,
        },
      }),
    ]);
  });

  it("supports a custom top-k value", async () => {
    const search = vi.fn().mockResolvedValue({ data: [] });
    const retriever = new OpenAIVectorStoreRetriever({
      client: createMockClient(search),
      vectorStoreId: "vs-demo",
      maxResults: 3,
    });

    await retriever.invoke("return policy");

    expect(search).toHaveBeenCalledWith("vs-demo", {
      query: "return policy",
      max_num_results: 3,
    });
  });

  it.each([0, 1.5, 51])("rejects invalid maxResults %s", (maxResults) => {
    expect(
      () =>
        new OpenAIVectorStoreRetriever({
          client: createMockClient(vi.fn()),
          vectorStoreId: "vs-demo",
          maxResults,
        }),
    ).toThrow("maxResults must be an integer between 1 and 50");
  });

  it("rejects empty identifiers and queries before making a request", async () => {
    const search = vi.fn();

    expect(
      () =>
        new OpenAIVectorStoreRetriever({
          client: createMockClient(search),
          vectorStoreId: " ",
        }),
    ).toThrow("vectorStoreId must not be empty");

    const retriever = new OpenAIVectorStoreRetriever({
      client: createMockClient(search),
      vectorStoreId: "vs-demo",
    });

    await expect(retriever.invoke(" ")).rejects.toThrow(
      "query must not be empty",
    );
    expect(search).not.toHaveBeenCalled();
  });

  it("creates a configured retriever without making an API request", () => {
    const retriever = createOpenAIVectorStoreRetriever({
      apiKey: "test-key",
      vectorStoreId: "vs-demo",
      maxResults: 4,
    });

    expect(retriever).toBeInstanceOf(OpenAIVectorStoreRetriever);
    expect(retriever.maxResults).toBe(4);
  });
});

function createMockClient(
  search: ReturnType<typeof vi.fn>,
): OpenAIVectorStoreSearchClient {
  return {
    vectorStores: {
      search:
        search as unknown as OpenAIVectorStoreSearchClient["vectorStores"]["search"],
    },
  };
}
