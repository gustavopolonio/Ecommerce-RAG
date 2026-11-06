export const EVALUATION_CATEGORIES = [
  "delivery",
  "out_of_scope",
  "payment",
  "product_catalog",
  "return",
  "security",
  "warranty",
] as const;

export const SCENARIO_TYPES = [
  "ambiguous",
  "failure_prone",
  "normal",
] as const;

export const EVALUATION_TARGETS = [
  "formatting",
  "grounding",
  "instruction_following",
  "reasoning",
  "retrieval",
] as const;

export const SCORING_METHODS = ["deterministic", "llm_rubric"] as const;

export type EvaluationCategory = (typeof EVALUATION_CATEGORIES)[number];
export type ScenarioType = (typeof SCENARIO_TYPES)[number];
export type EvaluationTarget = (typeof EVALUATION_TARGETS)[number];
export type ScoringMethod = (typeof SCORING_METHODS)[number];

export interface EvaluationCase {
  description: string;
  vars: {
    question: string;
  };
  metadata: {
    id: string;
    categories: EvaluationCategory[];
    scenarioType: ScenarioType;
    evaluationTargets: EvaluationTarget[];
    expectedDocumentIds: string[];
    expectedBehavior: string;
    expectedAnswerOrRubric: string;
    failureCategories: string[];
    scoringMethods: ScoringMethod[];
  };
}
