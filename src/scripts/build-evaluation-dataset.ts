import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildPromptfooCases } from "../evaluation/build-promptfoo-cases.js";
import { loadEvaluationDataset } from "../evaluation/load-evaluation-dataset.js";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const sourcePath = resolve(projectRoot, "RAG-Ecommercedataset.csv");
const outputPath = resolve(projectRoot, "evaluation/cases.json");
const promptfooOutputPath = resolve(
  projectRoot,
  "evaluation/promptfoo-cases.json",
);

async function main(): Promise<void> {
  const cases = await loadEvaluationDataset(sourcePath);
  const promptfooCases = buildPromptfooCases(cases);

  await mkdir(dirname(outputPath), { recursive: true });
  await Promise.all([
    writeFile(outputPath, `${JSON.stringify(cases, null, 2)}\n`, "utf8"),
    writeFile(
      promptfooOutputPath,
      `${JSON.stringify(promptfooCases, null, 2)}\n`,
      "utf8",
    ),
  ]);

  console.log(
    `Generated ${cases.length} evaluation cases at ${outputPath} and ${promptfooOutputPath}.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Evaluation dataset generation failed: ${message}`);
  process.exitCode = 1;
});
