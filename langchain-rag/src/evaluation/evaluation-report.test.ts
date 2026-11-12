import { describe, expect, it } from "vitest";

import {
  buildEvaluationReport,
  createEvaluationReportFilename,
  type EvaluationExperimentRow,
} from "./evaluation-report.js";

describe("buildEvaluationReport", () => {
  it("summarizes passing and failing cases, metrics, and token usage", () => {
    const report = buildEvaluationReport(
      [
        row("001", {
          retrieval_recall_at_5: 1,
          deterministic_correctness: null,
          answer_quality_pass: true,
          latency_within_threshold: true,
          latency_ms: 100,
        }),
        row("002", {
          retrieval_recall_at_5: 0.5,
          deterministic_correctness: null,
          answer_quality_pass: false,
          latency_within_threshold: true,
          latency_ms: 200,
        }),
      ],
      {
        experimentName: "baseline-2026",
        datasetName: "demoshop-rag-evaluation",
        experimentPrefix: "baseline",
        ragModel: "rag-model",
        judgeModel: "judge-model",
        maxConcurrency: 2,
        generatedAt: "2026-11-11T00:00:00.000Z",
      },
    );

    expect(report.summary).toMatchObject({
      totalCases: 2,
      passedCases: 1,
      failedCases: 1,
      runErrors: 0,
      tokenUsage: {
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
      },
      metrics: {
        retrieval_recall_at_5: {
          applicableCount: 2,
          nullCount: 0,
          averageNumericScore: 0.75,
        },
        deterministic_correctness: {
          applicableCount: 0,
          nullCount: 2,
        },
        answer_quality_pass: {
          applicableCount: 2,
          nullCount: 0,
          trueCount: 1,
          falseCount: 1,
        },
        latency_ms: {
          applicableCount: 2,
          nullCount: 0,
          averageNumericScore: 150,
        },
      },
    });
    expect(report.cases[1]).toMatchObject({
      caseId: "002",
      passed: false,
      failedGates: ["retrieval_recall_at_5", "answer_quality_pass"],
    });
  });

  it("creates a safe report filename from the experiment name", () => {
    expect(createEvaluationReportFilename(" DemoShop / Baseline #1 ")).toBe(
      "demoshop-baseline-1.json",
    );
  });
});

function row(
  caseId: string,
  scores: Record<string, number | boolean | null>,
): EvaluationExperimentRow {
  return {
    run: {
      id: `run-${caseId}`,
      outputs: {
        answer: "Answer",
        sources: [],
        latencyMs: scores.latency_ms,
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      },
    },
    example: {
      id: `example-${caseId}`,
      inputs: { question: "Question" },
      metadata: { caseId },
    },
    evaluationResults: {
      results: Object.entries(scores).map(([key, score]) => ({
        key,
        score,
        comment: `${key} comment`,
      })),
    },
  };
}
