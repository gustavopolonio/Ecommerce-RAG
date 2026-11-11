import type { EvaluationCase } from "./evaluation-case.js";

export const DATASET_SOURCE_FILE = "RAG-Ecommercedataset.csv";

export interface DemoShopDatasetExample {
  inputs: {
    question: string;
  };
  referenceOutputs: {
    expectedBehavior: string;
    expectedAnswerOrRubric: string;
    expectedDocumentIds: string[];
  };
  metadata: {
    caseId: string;
    description: string;
    sourceFile: typeof DATASET_SOURCE_FILE;
    sourceRowNumber: number;
    categories: EvaluationCase["categories"];
    scenarioType: EvaluationCase["scenarioType"];
    evaluationTargets: EvaluationCase["evaluationTargets"];
    failureCategories: string[];
    scoringMethods: EvaluationCase["scoringMethods"];
  };
}

export function mapEvaluationCasesToLangSmithExamples(
  cases: EvaluationCase[],
): DemoShopDatasetExample[] {
  return cases.map((evaluationCase) => ({
    inputs: {
      question: evaluationCase.question,
    },
    referenceOutputs: {
      expectedBehavior: evaluationCase.expectedBehavior,
      expectedAnswerOrRubric: evaluationCase.expectedAnswerOrRubric,
      expectedDocumentIds: evaluationCase.expectedDocumentIds,
    },
    metadata: {
      caseId: evaluationCase.id,
      description: evaluationCase.description,
      sourceFile: DATASET_SOURCE_FILE,
      sourceRowNumber: evaluationCase.sourceRowNumber,
      categories: evaluationCase.categories,
      scenarioType: evaluationCase.scenarioType,
      evaluationTargets: evaluationCase.evaluationTargets,
      failureCategories: evaluationCase.failureCategories,
      scoringMethods: evaluationCase.scoringMethods,
    },
  }));
}
