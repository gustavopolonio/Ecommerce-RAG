import type { Runnable, RunnableConfig } from "@langchain/core/runnables";

import type { DemoShopRagResult } from "../rag/demo-shop-rag-chain.js";

export interface DemoShopRagServiceResult extends DemoShopRagResult {
  latencyMs: number;
}

export type DemoShopRagService = (
  question: string,
  config?: RunnableConfig,
) => Promise<DemoShopRagServiceResult>;

export interface DemoShopRagServiceDependencies {
  chain: Runnable<string, DemoShopRagResult>;
  now?: () => number;
}

export function createDemoShopRagService({
  chain,
  now = performance.now.bind(performance),
}: DemoShopRagServiceDependencies): DemoShopRagService {
  return async (question, config) => {
    const startedAt = now();
    const result = await chain.invoke(question, config);

    return {
      ...result,
      latencyMs: elapsedMilliseconds(startedAt, now()),
    };
  };
}

function elapsedMilliseconds(startedAt: number, finishedAt: number): number {
  return Math.round((finishedAt - startedAt) * 100) / 100;
}
