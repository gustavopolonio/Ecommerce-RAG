import type { RunnableConfig } from "@langchain/core/runnables";

import type {
  DemoShopRagService,
  DemoShopRagServiceResult,
} from "../services/demo-shop-rag-service.js";

export interface EvaluationTargetInput {
  question: string;
}

export interface EvaluationTargetOutput {
  answer: string;
  sources: DemoShopRagServiceResult["sources"];
  usage: DemoShopRagServiceResult["usage"];
  latencyMs: number;
}

export type DemoShopEvaluationTarget = (
  inputs: EvaluationTargetInput,
  config?: RunnableConfig,
) => Promise<EvaluationTargetOutput>;

export interface DemoShopEvaluationTargetDependencies {
  ragService: DemoShopRagService;
}

export function createDemoShopEvaluationTarget({
  ragService,
}: DemoShopEvaluationTargetDependencies): DemoShopEvaluationTarget {
  return async ({ question }, config) => {
    const normalizedQuestion = requireNonEmptyQuestion(question);
    const result = await ragService(normalizedQuestion, config);

    return {
      answer: result.message,
      sources: result.sources,
      usage: result.usage,
      latencyMs: result.latencyMs,
    };
  };
}

function requireNonEmptyQuestion(question: string): string {
  if (typeof question !== "string" || !question.trim()) {
    throw new Error("Evaluation input question must be a non-empty string.");
  }

  return question.trim();
}
