import "dotenv/config";

import { Client } from "langsmith";

import { getLangSmithDatasetConfig } from "../config/env.js";
import { SHARED_ASSETS } from "../config/shared-assets.js";
import { mapEvaluationCasesToLangSmithExamples } from "./langsmith-example.js";
import { loadEvaluationDataset } from "./load-evaluation-dataset.js";
import {
  createLangSmithDatasetGateway,
  syncLangSmithDataset,
} from "./sync-langsmith-dataset.js";

const config = getLangSmithDatasetConfig();
const cases = await loadEvaluationDataset(SHARED_ASSETS.evaluationDataset);
const examples = mapEvaluationCasesToLangSmithExamples(cases);
const client = new Client({
  apiKey: config.apiKey,
  ...(config.apiUrl ? { apiUrl: config.apiUrl } : {}),
  ...(config.workspaceId ? { workspaceId: config.workspaceId } : {}),
});
const result = await syncLangSmithDataset(
  createLangSmithDatasetGateway(client),
  config.datasetName,
  examples,
);
const datasetUrl = await client.getDatasetUrl({
  datasetId: result.datasetId,
});

console.log(JSON.stringify({ ...result, datasetUrl }, null, 2));
