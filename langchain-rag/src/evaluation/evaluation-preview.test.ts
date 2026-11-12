import { describe, expect, it } from "vitest";

import { SHARED_ASSETS } from "../config/shared-assets.js";
import { loadEvaluationDataset } from "../dataset/load-evaluation-dataset.js";
import { buildEvaluationOperationPreview } from "./evaluation-preview.js";

describe("buildEvaluationOperationPreview", () => {
  it("shows the paid operation count before a full experiment", async () => {
    const cases = await loadEvaluationDataset(
      SHARED_ASSETS.evaluationDataset,
    );

    expect(
      buildEvaluationOperationPreview(cases, {
        datasetName: "demoshop-rag-evaluation",
        experimentPrefix: "baseline-v1",
        ragModel: "rag-model",
        judgeModel: "judge-model",
        maxConcurrency: 2,
        reportDirectory: "results",
      }),
    ).toMatchObject({
      dryRun: true,
      externalWrites: true,
      paidOperation: true,
      cases: {
        total: 40,
        withExpectedDocuments: 35,
        withDeterministicRules: 8,
        withRubricJudging: 38,
      },
      estimatedMaximumOperations: {
        vectorStoreSearches: 40,
        ragGenerationCalls: 40,
        judgeModelCalls: 38,
      },
      nextCommand: "npm run evaluation:run -- --confirm-paid",
    });
  });
});
