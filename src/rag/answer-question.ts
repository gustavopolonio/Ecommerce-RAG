import type OpenAI from "openai";

import { createAIResponse, type TokenUsage } from "../response/response.js";
import { assembleRetrievedContext } from "../retrieve/context.js";
import { retrieveVectorStoreDocuments } from "../retrieve/explicit-retrieve.js";

export interface RetrievedSource {
  fileId: string;
  filename: string;
  documentId: string | null;
  sourceFilename: string | null;
  score: number;
}

export interface AnswerQuestionResult {
  message: string;
  sources: RetrievedSource[];
  usage: TokenUsage;
  latencyMs: number;
}

export type AnswerQuestion = (
  question: string,
) => Promise<AnswerQuestionResult>;

export interface AnswerQuestionDependencies {
  client: OpenAI;
  vectorStoreId: string;
  model: string;
  now?: () => number;
}

const EMPTY_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
};

export function createAnswerQuestion({
  client,
  vectorStoreId,
  model,
  now = performance.now.bind(performance),
}: AnswerQuestionDependencies): AnswerQuestion {
  return async (question) => {
    const startedAt = now();
    const documents = await retrieveVectorStoreDocuments(
      client,
      vectorStoreId,
      question,
    );
    const sources = documents.map(
      ({ fileId, filename, documentId, sourceFilename, score }) => ({
        fileId,
        filename,
        documentId,
        sourceFilename,
        score,
      }),
    );

    if (documents.length === 0) {
      return {
        message:
          "I couldn't find enough information in the DemoShop knowledge base to answer that question.",
        sources,
        usage: EMPTY_USAGE,
        latencyMs: elapsedMilliseconds(startedAt, now()),
      };
    }

    const generated = await createAIResponse(
      client,
      model,
      assembleRetrievedContext(documents),
      question,
    );

    return {
      message: generated.answer,
      sources,
      usage: generated.usage,
      latencyMs: elapsedMilliseconds(startedAt, now()),
    };
  };
}

function elapsedMilliseconds(startedAt: number, finishedAt: number): number {
  return Math.round((finishedAt - startedAt) * 100) / 100;
}
