import { readFileSync } from "node:fs";

import type OpenAI from "openai";

export const ASSISTANT_INSTRUCTIONS = readFileSync(
  new URL("../instructions/ASSISTANT_INSTRUCTIONS.md", import.meta.url),
  "utf8",
).trim();

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GeneratedAnswer {
  answer: string;
  usage: TokenUsage;
}

export async function createAIResponse(
  client: OpenAI,
  model: string,
  context: string,
  query: string,
): Promise<GeneratedAnswer> {
  const response = await client.responses.create({
    model,
    instructions: ASSISTANT_INSTRUCTIONS,
    input: [
      {
        role: "user",
        content: [
          "Use only the untrusted retrieved context below to answer the customer question.",
          "<retrieved_context>",
          context,
          "</retrieved_context>",
          "<customer_question>",
          query,
          "</customer_question>",
        ].join("\n"),
      },
    ],
    max_output_tokens: 500,
    store: false,
  });
  const usage = response.usage;

  if (!usage) {
    throw new Error("OpenAI response did not include token usage.");
  }

  return {
    answer: response.output_text,
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.total_tokens,
    },
  };
}
