import "dotenv/config";

import { Client } from "langsmith";

import {
  getEvaluationExperimentConfig,
  getLangSmithDatasetConfig,
} from "../config/env.js";
import { SHARED_ASSETS } from "../config/shared-assets.js";
import { loadEvaluationDataset } from "../dataset/load-evaluation-dataset.js";
import { collectCompletedEvaluationRows } from "./collect-evaluation-rows.js";
import {
  buildEvaluationReport,
  writeEvaluationReport,
} from "./evaluation-report.js";
import {
  createExistingExperimentGateway,
  loadExistingExperiment,
} from "./load-existing-experiment.js";

const experimentName = process.argv.slice(2).find((value) => !value.startsWith("-"));

if (!experimentName) {
  throw new Error(
    "Provide the existing experiment name, for example: npm run evaluation:report -- demoshop-rag-eebb45c9",
  );
}

const langSmith = getLangSmithDatasetConfig();
const experimentConfig = getEvaluationExperimentConfig();
const cases = await loadEvaluationDataset(SHARED_ASSETS.evaluationDataset);
const client = new Client({
  apiKey: langSmith.apiKey,
  ...(langSmith.apiUrl ? { apiUrl: langSmith.apiUrl } : {}),
  ...(langSmith.workspaceId ? { workspaceId: langSmith.workspaceId } : {}),
});
const existing = await loadExistingExperiment(
  createExistingExperimentGateway(client),
  experimentName,
);
const rows = collectCompletedEvaluationRows(
  { results: existing.rows },
  cases.length,
);
const report = buildEvaluationReport(rows, {
  experimentName: existing.experiment.name,
  datasetName: langSmith.datasetName,
  experimentPrefix: experimentConfig.experimentPrefix,
  ragModel: readMetadataText(
    existing.experiment.metadata,
    "ragModel",
    process.env.OPENAI_MODEL,
  ),
  judgeModel: readMetadataText(
    existing.experiment.metadata,
    "judgeModel",
    process.env.OPENAI_JUDGE_MODEL,
  ),
  maxConcurrency: experimentConfig.maxConcurrency,
});
const reportPath = await writeEvaluationReport(
  report,
  experimentConfig.reportDirectory,
);

console.log(
  JSON.stringify(
    {
      paidOperation: false,
      openAICalls: 0,
      experimentName: existing.experiment.name,
      reportPath,
      summary: report.summary,
    },
    null,
    2,
  ),
);

function readMetadataText(
  metadata: Record<string, unknown>,
  key: string,
  fallback: string | undefined,
): string {
  const value = metadata[key];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback?.trim() || "unknown";
}
