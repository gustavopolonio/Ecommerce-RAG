import "dotenv/config";

import OpenAI from "openai";

import { getOpenAIConfig } from "../config/env.js";
import { createAnswerQuestion } from "../rag/answer-question.js";

async function main(): Promise<void> {
  const config = getOpenAIConfig();
  const client = new OpenAI({ apiKey: config.apiKey });
  const answerQuestion = createAnswerQuestion({
    client,
    vectorStoreId: config.vectorStoreId,
    model: config.model,
  });
  const questions = [
    {
      text: "Can I pay by Pix?",
      expectedDocument: "DOC-001",
    },
    {
      text: "Can I return a product?",
      expectedDocument: "DOC-002",
    },
    {
      text: "Do you sell books?",
      expectedDocument: "DOC-005",
    },
  ];

  for (const question of questions) {
    console.log(`Starting: ${question.text}`);
    const result = await answerQuestion(question.text);
    console.dir(
      { ...result, expectedDocument: question.expectedDocument },
      { depth: null },
    );
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Explicit retrieve and response failed: ${message}`);
  process.exitCode = 1;
});
