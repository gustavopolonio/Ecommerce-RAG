import "dotenv/config";

import { fileURLToPath } from "node:url";

import OpenAI from "openai";

import { discoverKnowledgeDocuments } from "../ingestion/documents.js";
import { ingestKnowledgeBase } from "../ingestion/ingest-knowledge-base.js";

const knowledgeBaseDirectory = fileURLToPath(
  new URL("../../knowledge-base", import.meta.url),
);

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required. Add it to your local .env file; never commit the key.",
    );
  }

  const configuredVectorStoreId =
    process.env.OPENAI_VECTOR_STORE_ID?.trim() || undefined;
  const documents = await discoverKnowledgeDocuments(knowledgeBaseDirectory);
  const client = new OpenAI({ apiKey });

  console.log(`Validated ${documents.length} DemoShop knowledge documents.`);

  const result = await ingestKnowledgeBase(client, documents, {
    ...(configuredVectorStoreId
      ? { vectorStoreId: configuredVectorStoreId }
      : {}),
    onProgress: console.log,
  });

  console.log("Knowledge-base ingestion completed.");
  console.log(`OPENAI_VECTOR_STORE_ID=${result.vectorStoreId}`);
  console.log(`Batch: ${result.batchId}`);
  console.log(`Files: ${result.fileIds.join(", ")}`);
  console.log(
    "Copy the OPENAI_VECTOR_STORE_ID line into .env before starting Milestone 3.",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Ingestion failed: ${message}`);
  process.exitCode = 1;
});
