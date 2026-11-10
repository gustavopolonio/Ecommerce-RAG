import type { RunnableConfig } from "@langchain/core/runnables";

import type { OpenAIConfig } from "../config/env.js";

export const DEMO_SHOP_TRACE_NAMES = {
  chain: "demoshop_rag",
  retrieveDocuments: "retrieve_documents",
  answerFromDocuments: "answer_from_documents",
  formatContext: "format_context",
  buildPrompt: "build_prompt",
  generateAnswer: "generate_answer",
} as const;

export function createDemoShopTraceConfig(
  config: OpenAIConfig,
): RunnableConfig {
  return {
    tags: ["demoshop", "rag", "two-step"],
    metadata: {
      application: "demoshop-langchain-rag",
      architecture: "two-step-rag",
      model: config.model,
      vectorStoreId: config.vectorStoreId,
    },
  };
}
