import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEvaluationDataset } from "../evaluation/load-evaluation-dataset.js";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourcePath = resolve(projectRoot, "RAG-Ecommercedataset.csv");
const outputPath = resolve(projectRoot, "evaluation/cases.json");

async function main(): Promise<void> {
  const cases = await loadEvaluationDataset(sourcePath);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(cases, null, 2)}\n`, "utf8");

  console.log(`Generated ${cases.length} evaluation cases at ${outputPath}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Evaluation dataset generation failed: ${message}`);
  process.exitCode = 1;
});
