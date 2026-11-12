import "dotenv/config";

import {
  getEvaluationExperimentConfig,
  getLangSmithDatasetName,
  getOpenAIConfig,
  getOpenAIJudgeConfig,
} from "../config/env.js";
import { SHARED_ASSETS } from "../config/shared-assets.js";
import { loadEvaluationDataset } from "../dataset/load-evaluation-dataset.js";
import { buildEvaluationOperationPreview } from "./evaluation-preview.js";

const cases = await loadEvaluationDataset(SHARED_ASSETS.evaluationDataset);
const openAI = getOpenAIConfig();
const judge = getOpenAIJudgeConfig();
const experiment = getEvaluationExperimentConfig();
const preview = buildEvaluationOperationPreview(cases, {
  datasetName: getLangSmithDatasetName(),
  experimentPrefix: experiment.experimentPrefix,
  ragModel: openAI.model,
  judgeModel: judge.model,
  maxConcurrency: experiment.maxConcurrency,
  reportDirectory: experiment.reportDirectory,
});

console.log(JSON.stringify(preview, null, 2));
