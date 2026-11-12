import { describe, expect, it } from "vitest";

import { collectCompletedEvaluationRows } from "./collect-evaluation-rows.js";
import type { EvaluationExperimentRow } from "./evaluation-report.js";

describe("collectCompletedEvaluationRows", () => {
  it("uses the rows already materialized by LangSmith evaluate()", () => {
    const rows = [row("001"), row("002")];

    expect(collectCompletedEvaluationRows({ results: rows }, 2)).toEqual(rows);
  });

  it("refuses to create a silently incomplete report", () => {
    expect(() => collectCompletedEvaluationRows({ results: [] }, 40)).toThrow(
      "Expected 40 completed evaluation rows; received 0",
    );
  });
});

function row(caseId: string): EvaluationExperimentRow {
  return {
    run: { id: `run-${caseId}`, outputs: {} },
    example: {
      id: `example-${caseId}`,
      inputs: {},
      metadata: { caseId },
    },
    evaluationResults: { results: [] },
  };
}
