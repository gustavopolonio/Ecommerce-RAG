import type { FastifyPluginAsync } from "fastify";
import OpenAI from "openai";

import { getOpenAIConfig } from "../config/env.js";
import {
  createAnswerQuestion,
  type AnswerQuestion,
} from "../rag/answer-question.js";

export interface ChatRoutesOptions {
  answerQuestion?: AnswerQuestion;
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
  let answerQuestion = options.answerQuestion;

  app.post<{ Body: { question: string } }>(
    "/chat",
    { schema: chatRequestSchema },
    async (request, reply) => {
      if (answerQuestion === undefined) {
        answerQuestion = createDefaultAnswerQuestion();
      }

      return reply.send(await answerQuestion(request.body.question.trim()));
    },
  );
};

function createDefaultAnswerQuestion(): AnswerQuestion {
  const config = getOpenAIConfig();
  const client = new OpenAI({ apiKey: config.apiKey });

  return createAnswerQuestion({
    client,
    vectorStoreId: config.vectorStoreId,
    model: config.model,
  });
}
