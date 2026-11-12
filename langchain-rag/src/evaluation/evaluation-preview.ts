import type { EvaluationCase } from "../dataset/evaluation-case.js";

export interface EvaluationPreviewConfig {
  datasetName: string;
  experimentPrefix: string;
  ragModel: string;
  judgeModel: string;
  maxConcurrency: number;
  reportDirectory: string;
}

export interface EvaluationOperationPreview {
  dryRun: true;
  externalWrites: true;
  paidOperation: true;
  datasetName: string;
  experimentPrefix: string;
  models: {
    rag: string;
    judge: string;
  };
  cases: {
    total: number;
    withExpectedDocuments: number;
    withDeterministicRules: number;
    withRubricJudging: number;
  };
  estimatedMaximumOperations: {
    vectorStoreSearches: number;
    ragGenerationCalls: number;
    judgeModelCalls: number;
  };
  evaluators: string[];
  maxConcurrency: number;
  reportDirectory: string;
  nextCommand: "npm run evaluation:run -- --confirm-paid";
}

export function buildEvaluationOperationPreview(
  cases: EvaluationCase[],
  config: EvaluationPreviewConfig,
): EvaluationOperationPreview {
  const withExpectedDocuments = cases.filter(
    ({ expectedDocumentIds }) => expectedDocumentIds.length > 0,
  ).length;
  const withDeterministicRules = cases.filter(({ scoringMethods }) =>
    scoringMethods.includes("deterministic"),
  ).length;
  const withRubricJudging = cases.filter(({ scoringMethods }) =>
    scoringMethods.includes("llm_rubric"),
  ).length;

  return {
    dryRun: true,
    externalWrites: true,
    paidOperation: true,
    datasetName: config.datasetName,
    experimentPrefix: config.experimentPrefix,
    models: {
      rag: config.ragModel,
      judge: config.judgeModel,
    },
    cases: {
      total: cases.length,
      withExpectedDocuments,
      withDeterministicRules,
      withRubricJudging,
    },
    estimatedMaximumOperations: {
      vectorStoreSearches: cases.length,
      ragGenerationCalls: cases.length,
      judgeModelCalls: withRubricJudging,
    },
    evaluators: [
      "retrieval_recall_at_5",
      "deterministic_correctness",
      "latency_ms",
      "latency_within_threshold",
      "answer_quality",
      "answer_quality_pass",
    ],
    maxConcurrency: config.maxConcurrency,
    reportDirectory: config.reportDirectory,
    nextCommand: "npm run evaluation:run -- --confirm-paid",
  };
}
