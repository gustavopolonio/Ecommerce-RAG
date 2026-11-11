import type { FastifyPluginAsync } from "fastify";

import { getOpenAIConfig } from "../config/env.js";
import { createConfiguredDemoShopRagChain } from "../rag/demo-shop-rag-chain.js";
import {
  createDemoShopRagService,
  type DemoShopRagService,
} from "../services/demo-shop-rag-service.js";

export interface ChatRoutesOptions {
  ragService?: DemoShopRagService;
}

interface ChatRequestBody {
  question: string;
}

const chatRequestSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["question"],
    properties: {
      question: {
        type: "string",
        minLength: 1,
        maxLength: 2_000,
        pattern: "\\S",
      },
    },
  },
} as const;

export const chatRoutes: FastifyPluginAsync<ChatRoutesOptions> = async (
  app,
  options,
) => {
  let servicePromise = options.ragService
    ? Promise.resolve(options.ragService)
    : undefined;

  app.post<{ Body: ChatRequestBody }>(
    "/chat",
    { schema: chatRequestSchema },
    async (request, reply) => {
      servicePromise ??= createDefaultDemoShopRagService();
      const ragService = await servicePromise;

      return reply.send(await ragService(request.body.question.trim()));
    },
  );
};

async function createDefaultDemoShopRagService(): Promise<DemoShopRagService> {
  const chain = await createConfiguredDemoShopRagChain(getOpenAIConfig());

  return createDemoShopRagService({ chain });
}
