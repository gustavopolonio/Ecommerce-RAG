import "dotenv/config";

import OpenAI from "openai";

import { getOpenAIRetrievalConfig } from "../config/env.js";
import { retrieveVectorStoreDocuments } from "../retrieve/explicit-retrieve.js";

async function main(): Promise<void> {
  const config = getOpenAIRetrievalConfig();
  const client = new OpenAI({ apiKey: config.apiKey });
  const questions = [
    { text: "Can I pay by Pix?", expectedDocument: "DOC-001" },
    { text: "Can I return a product?", expectedDocument: "DOC-002" },
    { text: "Do you sell books?", expectedDocument: "DOC-005" },
  ];

  for (const question of questions) {
    const documents = await retrieveVectorStoreDocuments(
      client,
      config.vectorStoreId,
      question.text,
    );

    console.dir(
      {
        question: question.text,
        expectedDocument: question.expectedDocument,
        documents,
      },
      { depth: null },
    );
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Explicit retrieval failed: ${message}`);
  process.exitCode = 1;
});
