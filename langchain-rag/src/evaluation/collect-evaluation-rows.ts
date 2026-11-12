import type { EvaluationExperimentRow } from "./evaluation-report.js";

export interface CompletedEvaluationResults {
  results: EvaluationExperimentRow[];
}

export function collectCompletedEvaluationRows(
  evaluation: CompletedEvaluationResults,
  expectedCount: number,
): EvaluationExperimentRow[] {
  if (evaluation.results.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} completed evaluation rows; received ${evaluation.results.length}. Refusing to write an incomplete report.`,
    );
  }

  return [...evaluation.results];
}
