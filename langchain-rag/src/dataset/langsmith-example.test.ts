import { describe, expect, it } from "vitest";

import { SHARED_ASSETS } from "../config/shared-assets.js";
import {
  DATASET_SOURCE_FILE,
  mapEvaluationCasesToLangSmithExamples,
} from "./langsmith-example.js";
import { loadEvaluationDataset } from "./load-evaluation-dataset.js";

describe("mapEvaluationCasesToLangSmithExamples", () => {
  it("maps all cases into LangSmith inputs, references, and metadata", async () => {
    const cases = await loadEvaluationDataset(
      SHARED_ASSETS.evaluationDataset,
    );
    const examples = mapEvaluationCasesToLangSmithExamples(cases);

    expect(examples).toHaveLength(40);
    expect(examples[0]).toEqual({
      inputs: { question: "Can I pay by PIX?" },
      referenceOutputs: {
        expectedBehavior:
          "Check payment policy and accurately state whether PIX is accepted",
        expectedAnswerOrRubric: "Confirm that PIX is acceptable",
        expectedDocumentIds: ["DOC-001"],
      },
      metadata: {
        caseId: "001",
        description: "[001] Payment — Can I pay by PIX?",
        sourceFile: DATASET_SOURCE_FILE,
        sourceRowNumber: 4,
        categories: ["payment"],
        scenarioType: "normal",
        evaluationTargets: ["retrieval"],
        failureCategories: ["incorrect_policy_information"],
        scoringMethods: ["llm_rubric"],
      },
    });
  });

  it("keeps retrieval references separate from scoring metadata", async () => {
    const cases = await loadEvaluationDataset(
      SHARED_ASSETS.evaluationDataset,
    );
    const examples = mapEvaluationCasesToLangSmithExamples(cases);
    const case35 = examples.find(({ metadata }) => metadata.caseId === "035");

    expect(case35?.referenceOutputs.expectedDocumentIds).toEqual([
      "DOC-005",
    ]);
    expect(case35?.metadata).toMatchObject({
      evaluationTargets: ["retrieval", "formatting"],
      scoringMethods: ["deterministic"],
    });
  });
});
