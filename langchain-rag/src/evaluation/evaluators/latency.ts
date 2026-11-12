import type { EvaluationResult } from "langsmith/evaluation";

export const LATENCY_MILLISECONDS_KEY = "latency_ms";
export const LATENCY_WITHIN_THRESHOLD_KEY = "latency_within_threshold";
export const MAX_EVALUATION_LATENCY_MS = 15_000;

export interface LatencyEvaluatorArguments {
  outputs: Record<string, unknown>;
}

export interface LatencyEvaluationResults {
  results: EvaluationResult[];
}

export type LatencyEvaluator = (
  arguments_: LatencyEvaluatorArguments,
) => LatencyEvaluationResults;

export function createLatencyEvaluator(
  maximumLatencyMs = MAX_EVALUATION_LATENCY_MS,
): LatencyEvaluator {
  if (!isValidLatency(maximumLatencyMs) || maximumLatencyMs === 0) {
    throw new Error("maximumLatencyMs must be a positive finite number.");
  }

  return ({ outputs }) => {
    const latencyMs = outputs.latencyMs;

    if (!isValidLatency(latencyMs)) {
      const comment =
        "Latency evaluation could not find a non-negative finite latencyMs in the target output.";

      return {
        results: [
          result(LATENCY_MILLISECONDS_KEY, null, comment),
          result(LATENCY_WITHIN_THRESHOLD_KEY, false, comment),
        ],
      };
    }

    const withinThreshold = latencyMs <= maximumLatencyMs;
    const comment = withinThreshold
      ? `Latency ${latencyMs} ms was within the ${maximumLatencyMs} ms limit.`
      : `Latency ${latencyMs} ms exceeded the ${maximumLatencyMs} ms limit.`;

    return {
      results: [
        result(LATENCY_MILLISECONDS_KEY, latencyMs, comment),
        result(LATENCY_WITHIN_THRESHOLD_KEY, withinThreshold, comment),
      ],
    };
  };
}

export const latencyEvaluator = createLatencyEvaluator();

function isValidLatency(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function result(
  key: string,
  score: number | boolean | null,
  comment: string,
): EvaluationResult {
  return { key, score, comment };
}
