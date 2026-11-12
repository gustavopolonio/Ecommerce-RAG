import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { EvaluationResult } from "langsmith/evaluation";

import {
  ANSWER_QUALITY_PASS_KEY,
  ANSWER_QUALITY_PASS_THRESHOLD,
} from "./evaluators/answer-quality.js";
import { DETERMINISTIC_CORRECTNESS_KEY } from "./evaluators/deterministic-correctness.js";
import {
  LATENCY_WITHIN_THRESHOLD_KEY,
  MAX_EVALUATION_LATENCY_MS,
} from "./evaluators/latency.js";
import {
  RECALL_AT_FIVE_KEY,
  RECALL_AT_FIVE_PASS_SCORE,
} from "./evaluators/recall-at-five.js";

export interface EvaluationExperimentRow {
  run: {
    id: string;
    outputs?: Record<string, unknown>;
    error?: string;
  };
  example: {
    id: string;
    inputs: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  evaluationResults: {
    results: EvaluationResult[];
  };
}

export interface EvaluationReportConfig {
  experimentName: string;
  datasetName: string;
  experimentPrefix: string;
  ragModel: string;
  judgeModel: string;
  maxConcurrency: number;
  generatedAt?: string;
}

export interface EvaluationReport {
  schemaVersion: 1;
  generatedAt: string;
  experiment: Omit<EvaluationReportConfig, "generatedAt">;
  policy: {
    recallAtFive: number;
    deterministicCorrectness: number;
    answerQuality: number;
    maximumLatencyMs: number;
  };
  summary: {
    totalCases: number;
    passedCases: number;
    failedCases: number;
    runErrors: number;
    tokenUsage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    metrics: Record<string, MetricSummary>;
  };
  cases: EvaluationReportCase[];
}

interface MetricSummary {
  applicableCount: number;
  nullCount: number;
  averageNumericScore?: number;
  trueCount?: number;
  falseCount?: number;
}

interface EvaluationReportCase {
  caseId: string;
  exampleId: string;
  runId: string;
  question: unknown;
  answer: unknown;
  sources: unknown;
  latencyMs: unknown;
  usage: unknown;
  error: string | null;
  passed: boolean;
  failedGates: string[];
  scores: Record<
    string,
    { score: number | boolean | null; comment: string | null }
  >;
}

export function buildEvaluationReport(
  rows: EvaluationExperimentRow[],
  config: EvaluationReportConfig,
): EvaluationReport {
  const cases = rows.map(mapReportCase);

  return {
    schemaVersion: 1,
    generatedAt: config.generatedAt ?? new Date().toISOString(),
    experiment: {
      experimentName: config.experimentName,
      datasetName: config.datasetName,
      experimentPrefix: config.experimentPrefix,
      ragModel: config.ragModel,
      judgeModel: config.judgeModel,
      maxConcurrency: config.maxConcurrency,
    },
    policy: {
      recallAtFive: RECALL_AT_FIVE_PASS_SCORE,
      deterministicCorrectness: 1,
      answerQuality: ANSWER_QUALITY_PASS_THRESHOLD,
      maximumLatencyMs: MAX_EVALUATION_LATENCY_MS,
    },
    summary: {
      totalCases: cases.length,
      passedCases: cases.filter(({ passed }) => passed).length,
      failedCases: cases.filter(({ passed }) => !passed).length,
      runErrors: cases.filter(({ error }) => error !== null).length,
      tokenUsage: sumTokenUsage(rows),
      metrics: summarizeMetrics(rows),
    },
    cases,
  };
}

export async function writeEvaluationReport(
  report: EvaluationReport,
  reportDirectory: string,
): Promise<string> {
  const directory = resolve(reportDirectory);
  const filePath = resolve(
    directory,
    createEvaluationReportFilename(report.experiment.experimentName),
  );

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return filePath;
}

export function createEvaluationReportFilename(experimentName: string): string {
  const slug = experimentName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "evaluation-experiment"}.json`;
}

function mapReportCase(row: EvaluationExperimentRow): EvaluationReportCase {
  const scores = Object.fromEntries(
    row.evaluationResults.results.map(({ key, score = null, comment }) => [
      key,
      { score, comment: comment ?? null },
    ]),
  );
  const failedGates = evaluateGates(scores, row.run.error);

  return {
    caseId:
      typeof row.example.metadata?.caseId === "string"
        ? row.example.metadata.caseId
        : row.example.id,
    exampleId: row.example.id,
    runId: row.run.id,
    question: row.example.inputs.question ?? null,
    answer: row.run.outputs?.answer ?? null,
    sources: row.run.outputs?.sources ?? null,
    latencyMs: row.run.outputs?.latencyMs ?? null,
    usage: row.run.outputs?.usage ?? null,
    error: row.run.error ?? null,
    passed: failedGates.length === 0,
    failedGates,
    scores,
  };
}

function evaluateGates(
  scores: EvaluationReportCase["scores"],
  runError: string | undefined,
): string[] {
  const failures: string[] = [];

  if (runError) {
    failures.push("run_error");
  }

  checkGate(scores, RECALL_AT_FIVE_KEY, true, (score) => score === 1, failures);
  checkGate(
    scores,
    DETERMINISTIC_CORRECTNESS_KEY,
    true,
    (score) => score === 1,
    failures,
  );
  checkGate(
    scores,
    ANSWER_QUALITY_PASS_KEY,
    true,
    (score) => score === true,
    failures,
  );
  checkGate(
    scores,
    LATENCY_WITHIN_THRESHOLD_KEY,
    false,
    (score) => score === true,
    failures,
  );

  return failures;
}

function checkGate(
  scores: EvaluationReportCase["scores"],
  key: string,
  allowNull: boolean,
  passes: (score: number | boolean) => boolean,
  failures: string[],
) {
  const metric = scores[key];

  if (!metric || (metric.score === null && !allowNull)) {
    failures.push(key);
    return;
  }

  if (metric.score !== null && !passes(metric.score)) {
    failures.push(key);
  }
}

function summarizeMetrics(
  rows: EvaluationExperimentRow[],
): Record<string, MetricSummary> {
  const byKey = new Map<string, Array<number | boolean | null>>();

  for (const row of rows) {
    for (const { key, score = null } of row.evaluationResults.results) {
      const values = byKey.get(key) ?? [];
      values.push(score);
      byKey.set(key, values);
    }
  }

  return Object.fromEntries(
    [...byKey.entries()].map(([key, values]) => {
      const numeric = values.filter(
        (value): value is number => typeof value === "number",
      );
      const booleans = values.filter(
        (value): value is boolean => typeof value === "boolean",
      );
      const summary: MetricSummary = {
        applicableCount: values.filter((value) => value !== null).length,
        nullCount: values.filter((value) => value === null).length,
        ...(numeric.length > 0
          ? {
              averageNumericScore:
                Math.round(
                  (numeric.reduce((sum, value) => sum + value, 0) /
                    numeric.length) *
                    10_000,
                ) / 10_000,
            }
          : {}),
        ...(booleans.length > 0
          ? {
              trueCount: booleans.filter(Boolean).length,
              falseCount: booleans.filter((value) => !value).length,
            }
          : {}),
      };

      return [key, summary];
    }),
  );
}

function sumTokenUsage(rows: EvaluationExperimentRow[]) {
  return rows.reduce(
    (total, { run }) => {
      const usage = run.outputs?.usage;

      if (!isRecord(usage)) {
        return total;
      }

      total.inputTokens += readNumber(usage.inputTokens);
      total.outputTokens += readNumber(usage.outputTokens);
      total.totalTokens += readNumber(usage.totalTokens);
      return total;
    },
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
