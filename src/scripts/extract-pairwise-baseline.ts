import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASELINE_RESPONSE_CASE_IDS,
  extractStoredResponses,
} from "../evaluation/pairwise-comparison.js";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const inputPath = resolve(projectRoot, "evaluation/results/latest.json");
const outputPath = resolve(
  projectRoot,
  "evaluation/comparison/baseline.json",
);

async function main(): Promise<void> {
  const report = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
  const responses = extractStoredResponses(
    report,
    BASELINE_RESPONSE_CASE_IDS,
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(responses, null, 2)}\n`,
    "utf8",
  );

  console.log(`Extracted ${responses.length} baseline responses to ${outputPath}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Baseline extraction failed: ${message}`);
  process.exitCode = 1;
});
