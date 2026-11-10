import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { describe, expect, it } from "vitest";

import type { OpenAIVectorStoreDocumentMetadata } from "../retrieval/openai-vector-store-retriever.js";
import {
  createDemoShopTraceConfig,
  DEMO_SHOP_TRACE_NAMES,
} from "../tracing/trace-contract.js";
import {
  createDemoShopRagChain,
  NO_RELEVANT_CONTEXT_MESSAGE,
} from "./demo-shop-rag-chain.js";

describe("createDemoShopRagChain", () => {
  it("retrieves context, generates an answer, and returns source evidence", async () => {
    const retriever = new FakeDemoShopRetriever([createPaymentDocument()]);
    const model = new FakeListChatModel({
      responses: ["Yes, DemoShop accepts Pix.", "unused"],
    });
    const chain = createDemoShopRagChain({
      assistantInstructions: "Answer using only DemoShop documents.",
      model,
      retriever,
    });

    await expect(chain.invoke("Can I pay by Pix?")).resolves.toEqual({
      message: "Yes, DemoShop accepts Pix.",
      sources: [
        {
          fileId: "file-payment",
          filename: "DOC-001_payment_policy.md",
          documentId: "DOC-001",
          sourceFilename: "DOC-001_payment_policy.md",
          score: 0.97,
        },
      ],
    });
    expect(model.i).toBe(1);
  });

  it("exposes the important RAG steps as stable runnable events", async () => {
    const chain = createDemoShopRagChain({
      assistantInstructions: "Answer using only DemoShop documents.",
      model: new FakeListChatModel({ responses: ["Pix is accepted."] }),
      retriever: new FakeDemoShopRetriever([createPaymentDocument()]),
    }).withConfig(
      createDemoShopTraceConfig({
        apiKey: "unused-test-key",
        model: "test-model",
        vectorStoreId: "vs-demo",
      }),
    );
    const startedRuns: Array<{
      name: string;
      tags: string[] | undefined;
      metadata: Record<string, unknown>;
    }> = [];

    for await (const event of chain.streamEvents("Can I pay by Pix?", {
      version: "v2",
    })) {
      if (event.event.endsWith("_start")) {
        startedRuns.push({
          name: event.name,
          tags: event.tags,
          metadata: event.metadata,
        });
      }
    }

    const importantRuns = startedRuns.filter(({ name }) =>
      Object.values(DEMO_SHOP_TRACE_NAMES).includes(
        name as (typeof DEMO_SHOP_TRACE_NAMES)[keyof typeof DEMO_SHOP_TRACE_NAMES],
      ),
    );

    expect(importantRuns.map(({ name }) => name)).toEqual([
      DEMO_SHOP_TRACE_NAMES.chain,
      DEMO_SHOP_TRACE_NAMES.retrieveDocuments,
      DEMO_SHOP_TRACE_NAMES.answerFromDocuments,
      DEMO_SHOP_TRACE_NAMES.formatContext,
      DEMO_SHOP_TRACE_NAMES.buildPrompt,
      DEMO_SHOP_TRACE_NAMES.generateAnswer,
    ]);
    expect(importantRuns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tags: expect.arrayContaining(["demoshop", "rag", "two-step"]),
          metadata: expect.objectContaining({
            application: "demoshop-langchain-rag",
            model: "test-model",
            vectorStoreId: "vs-demo",
          }),
        }),
      ]),
    );
  });

  it("does not call the model when retrieval returns no documents", async () => {
    const model = new FakeListChatModel({
      responses: ["This response must not be used.", "unused"],
    });
    const chain = createDemoShopRagChain({
      assistantInstructions: "Answer using only DemoShop documents.",
      model,
      retriever: new FakeDemoShopRetriever([]),
    });

    await expect(chain.invoke("Unknown policy")).resolves.toEqual({
      message: NO_RELEVANT_CONTEXT_MESSAGE,
      sources: [],
    });
    expect(model.i).toBe(0);
  });

  it("rejects empty questions and instructions before generation", async () => {
    const model = new FakeListChatModel({ responses: ["unused"] });
    const retriever = new FakeDemoShopRetriever([createPaymentDocument()]);

    expect(() =>
      createDemoShopRagChain({
        assistantInstructions: " ",
        model,
        retriever,
      }),
    ).toThrow("assistantInstructions must not be empty");

    const chain = createDemoShopRagChain({
      assistantInstructions: "Use DemoShop documents.",
      model,
      retriever,
    });
    await expect(chain.invoke(" ")).rejects.toThrow(
      "question must not be empty",
    );
    expect(model.i).toBe(0);
  });
});

class FakeDemoShopRetriever extends BaseRetriever<OpenAIVectorStoreDocumentMetadata> {
  lc_namespace = ["test", "demoshop"];

  constructor(
    private readonly documents: Array<
      Document<OpenAIVectorStoreDocumentMetadata>
    >,
  ) {
    super();
  }

  async _getRelevantDocuments(): Promise<
    Array<Document<OpenAIVectorStoreDocumentMetadata>>
  > {
    return this.documents;
  }
}

function createPaymentDocument(): Document<OpenAIVectorStoreDocumentMetadata> {
  return new Document({
    pageContent: "Pix is supported.",
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
  });
}
