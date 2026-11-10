import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseRetrieverInterface } from "@langchain/core/retrievers";
import {
  RunnableLambda,
  type Runnable,
  type RunnableConfig,
} from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

import type { OpenAIConfig } from "../config/env.js";
import { loadAssistantInstructions } from "../instructions/load-assistant-instructions.js";
import {
  createOpenAIVectorStoreRetriever,
  type OpenAIVectorStoreDocumentMetadata,
} from "../retrieval/openai-vector-store-retriever.js";
import {
  createDemoShopTraceConfig,
  DEMO_SHOP_TRACE_NAMES,
} from "../tracing/trace-contract.js";
import { formatRetrievedContext } from "./context.js";
import { createDemoShopPrompt } from "./prompt.js";

export const NO_RELEVANT_CONTEXT_MESSAGE =
  "I couldn't find enough information in the DemoShop knowledge base to answer that question.";

export interface RetrievedSource {
  fileId: string;
  filename: string;
  documentId: string | null;
  sourceFilename: string | null;
  score: number;
}

export interface DemoShopRagResult {
  message: string;
  sources: RetrievedSource[];
}

export interface DemoShopRagChainDependencies {
  retriever: BaseRetrieverInterface<OpenAIVectorStoreDocumentMetadata>;
  model: BaseChatModel;
  assistantInstructions: string;
}

interface RetrievedState {
  question: string;
  documents: Awaited<
    ReturnType<
      BaseRetrieverInterface<OpenAIVectorStoreDocumentMetadata>["invoke"]
    >
  >;
}

export function createDemoShopRagChain({
  retriever,
  model,
  assistantInstructions,
}: DemoShopRagChainDependencies): Runnable<string, DemoShopRagResult> {
  const normalizedInstructions = requireNonEmptyText(
    assistantInstructions,
    "assistantInstructions",
  );
  const formatContext = RunnableLambda.from(formatRetrievedContext).withConfig({
    runName: DEMO_SHOP_TRACE_NAMES.formatContext,
  });
  const buildPrompt = createDemoShopPrompt().withConfig({
    runName: DEMO_SHOP_TRACE_NAMES.buildPrompt,
  });
  const generateAnswer = model.withConfig({
    runName: DEMO_SHOP_TRACE_NAMES.generateAnswer,
  });

  const retrieveDocuments = RunnableLambda.from(
    async (
      question: string,
      config?: RunnableConfig,
    ): Promise<RetrievedState> => {
      const normalizedQuestion = requireNonEmptyText(question, "question");
      const documents = await retriever.invoke(normalizedQuestion, config);

      return { question: normalizedQuestion, documents };
    },
  ).withConfig({ runName: DEMO_SHOP_TRACE_NAMES.retrieveDocuments });

  const answerFromDocuments = RunnableLambda.from(
    async (
      state: RetrievedState,
      config?: RunnableConfig,
    ): Promise<DemoShopRagResult> => {
      const sources = state.documents.map(({ metadata }) => ({
        fileId: metadata.fileId,
        filename: metadata.filename,
        documentId: metadata.documentId,
        sourceFilename: metadata.sourceFilename,
        score: metadata.score,
      }));

      if (state.documents.length === 0) {
        return {
          message: NO_RELEVANT_CONTEXT_MESSAGE,
          sources,
        };
      }

      const context = await formatContext.invoke(state.documents, config);
      const prompt = await buildPrompt.invoke(
        {
          assistantInstructions: normalizedInstructions,
          context,
          question: state.question,
        },
        config,
      );
      const response = await generateAnswer.invoke(prompt, config);
      const message = response.text.trim();

      if (!message) {
        throw new Error("The model returned an empty answer.");
      }

      return { message, sources };
    },
  ).withConfig({ runName: DEMO_SHOP_TRACE_NAMES.answerFromDocuments });

  return retrieveDocuments.pipe(answerFromDocuments).withConfig({
    runName: DEMO_SHOP_TRACE_NAMES.chain,
  });
}

export async function createConfiguredDemoShopRagChain(
  config: OpenAIConfig,
): Promise<Runnable<string, DemoShopRagResult>> {
  const assistantInstructions = await loadAssistantInstructions();
  const retriever = createOpenAIVectorStoreRetriever({
    apiKey: config.apiKey,
    vectorStoreId: config.vectorStoreId,
  });
  const model = new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    maxRetries: 0,
    useResponsesApi: true,
  });

  return createDemoShopRagChain({
    assistantInstructions,
    model,
    retriever,
  }).withConfig(createDemoShopTraceConfig(config));
}

function requireNonEmptyText(value: string, name: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${name} must not be empty.`);
  }

  return normalizedValue;
}
