import "dotenv/config";

import { Client } from "langsmith";
import { evaluate, type EvaluatorT } from "langsmith/evaluation";

import {
  getEvaluationExperimentConfig,
  getLangSmithDatasetConfig,
  getOpenAIConfig,
  getOpenAIJudgeConfig,
} from "../config/env.js";
import { SHARED_ASSETS } from "../config/shared-assets.js";
import { loadEvaluationDataset } from "../dataset/load-evaluation-dataset.js";
import { createConfiguredDemoShopRagChain } from "../rag/demo-shop-rag-chain.js";
import { createDemoShopRagService } from "../services/demo-shop-rag-service.js";
import { collectCompletedEvaluationRows } from "./collect-evaluation-rows.js";
import { buildEvaluationOperationPreview } from "./evaluation-preview.js";
import {
  buildEvaluationReport,
  writeEvaluationReport,
} from "./evaluation-report.js";
import { createDemoShopEvaluationTarget } from "./evaluation-target.js";
import { createAnswerQualityEvaluator } from "./evaluators/answer-quality.js";
import { deterministicCorrectnessEvaluator } from "./evaluators/deterministic-correctness.js";
import { latencyEvaluator } from "./evaluators/latency.js";
import { createOpenAIAnswerQualityJudge } from "./evaluators/openai-answer-quality-judge.js";
import { recallAtFiveEvaluator } from "./evaluators/recall-at-five.js";
import { hasPaidEvaluationConfirmation } from "./paid-evaluation-confirmation.js";

const cases = await loadEvaluationDataset(SHARED_ASSETS.evaluationDataset);
const openAI = getOpenAIConfig();
const judgeConfig = getOpenAIJudgeConfig();
const langSmith = getLangSmithDatasetConfig();
const experiment = getEvaluationExperimentConfig();
const preview = buildEvaluationOperationPreview(cases, {
  datasetName: langSmith.datasetName,
  experimentPrefix: experiment.experimentPrefix,
  ragModel: openAI.model,
  judgeModel: judgeConfig.model,
  maxConcurrency: experiment.maxConcurrency,
  reportDirectory: experiment.reportDirectory,
});

if (!hasPaidEvaluationConfirmation(process.argv.slice(2))) {
  console.log(JSON.stringify(preview, null, 2));
  throw new Error(
    "Paid evaluation was not confirmed. Review the preview, then use the exact nextCommand shown above.",
  );
}

// A CLI process must flush target and evaluator traces before it exits.
process.env.LANGCHAIN_CALLBACKS_BACKGROUND ??= "false";

const client = new Client({
  apiKey: langSmith.apiKey,
  ...(langSmith.apiUrl ? { apiUrl: langSmith.apiUrl } : {}),
  ...(langSmith.workspaceId ? { workspaceId: langSmith.workspaceId } : {}),
});
const chain = await createConfiguredDemoShopRagChain(openAI);
const ragService = createDemoShopRagService({ chain });
const target = createDemoShopEvaluationTarget({ ragService });
const judge = createOpenAIAnswerQualityJudge(judgeConfig);
const evaluators: EvaluatorT[] = [
  recallAtFiveEvaluator,
  deterministicCorrectnessEvaluator,
  latencyEvaluator,
  createAnswerQualityEvaluator({ judge }),
];
const evaluation = await evaluate(target, {
  data: langSmith.datasetName,
  evaluators,
  client,
  experimentPrefix: experiment.experimentPrefix,
  description: "DemoShop RAG offline evaluation over the managed CSV dataset.",
  metadata: {
    application: "demoshop-langchain-rag",
    ragModel: openAI.model,
    judgeModel: judgeConfig.model,
    vectorStoreId: openAI.vectorStoreId,
    policyVersion: "step-7-v1",
  },
  maxConcurrency: experiment.maxConcurrency,
});
const rows = collectCompletedEvaluationRows(evaluation, cases.length);

const report = buildEvaluationReport(rows, {
  experimentName: evaluation.experimentName,
  datasetName: langSmith.datasetName,
  experimentPrefix: experiment.experimentPrefix,
  ragModel: openAI.model,
  judgeModel: judgeConfig.model,
  maxConcurrency: experiment.maxConcurrency,
});
const reportPath = await writeEvaluationReport(
  report,
  experiment.reportDirectory,
);

console.log(
  JSON.stringify(
    {
      experimentName: evaluation.experimentName,
      reportPath,
      summary: report.summary,
    },
    null,
    2,
  ),
);
