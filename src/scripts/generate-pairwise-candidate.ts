import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PAIRWISE_CASE_IDS,
  readChatAnswer,
  type StoredEvaluationResponse,
} from "../evaluation/pairwise-comparison.js";
import { loadEvaluationDataset } from "../evaluation/load-evaluation-dataset.js";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourcePath = resolve(projectRoot, "RAG-Ecommercedataset.csv");
const outputPath = resolve(
  projectRoot,
  "evaluation/comparison/candidate-b.json",
);
const chatUrl = process.env.DEMOSHOP_CHAT_URL ?? "http://127.0.0.1:3000/chat";

async function main(): Promise<void> {
  const cases = await loadEvaluationDataset(sourcePath);
  const responses: StoredEvaluationResponse[] = [];

  for (const id of PAIRWISE_CASE_IDS) {
    const evaluationCase = cases.find((item) => item.metadata.id === id);

    if (!evaluationCase) {
      throw new Error(`Missing pairwise evaluation case ${id}.`);
    }

    const response = await fetch(chatUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: evaluationCase.vars.question }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await response.json()) as unknown;

    if (!response.ok) {
      throw new Error(
        `DemoShop request for case ${id} failed with HTTP ${response.status}: ${JSON.stringify(body)}`,
      );
    }

    responses.push({
      id,
      question: evaluationCase.vars.question,
      answer: readChatAnswer(body),
    });
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(responses, null, 2)}\n`,
    "utf8",
  );

  console.log(`Stored ${responses.length} Candidate B responses at ${outputPath}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Candidate generation failed: ${message}`);
  process.exitCode = 1;
});
