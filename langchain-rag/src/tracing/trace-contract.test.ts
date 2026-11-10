import { describe, expect, it } from "vitest";

import {
  createDemoShopTraceConfig,
  DEMO_SHOP_TRACE_NAMES,
} from "./trace-contract.js";

describe("DemoShop trace contract", () => {
  it("keeps run names stable for filtering and comparison", () => {
    expect(DEMO_SHOP_TRACE_NAMES).toEqual({
      chain: "demoshop_rag",
      retrieveDocuments: "retrieve_documents",
      answerFromDocuments: "answer_from_documents",
      formatContext: "format_context",
      buildPrompt: "build_prompt",
      generateAnswer: "generate_answer",
    });
  });

  it("adds useful metadata without including credentials", () => {
    const traceConfig = createDemoShopTraceConfig({
      apiKey: "must-not-appear",
      model: "test-model",
      vectorStoreId: "vs-demo",
    });

    expect(traceConfig).toEqual({
      tags: ["demoshop", "rag", "two-step"],
      metadata: {
        application: "demoshop-langchain-rag",
        architecture: "two-step-rag",
        model: "test-model",
        vectorStoreId: "vs-demo",
      },
    });
    expect(JSON.stringify(traceConfig)).not.toContain("must-not-appear");
  });
});
