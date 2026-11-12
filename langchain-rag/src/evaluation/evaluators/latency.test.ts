import { describe, expect, it } from "vitest";

import {
  LATENCY_MILLISECONDS_KEY,
  LATENCY_WITHIN_THRESHOLD_KEY,
  createLatencyEvaluator,
  latencyEvaluator,
} from "./latency.js";

describe("latencyEvaluator", () => {
  it("records milliseconds and passes latency below the default limit", () => {
    expect(latencyEvaluator({ outputs: { latencyMs: 1_234.56 } })).toEqual({
      results: [
        {
          key: LATENCY_MILLISECONDS_KEY,
          score: 1_234.56,
          comment: "Latency 1234.56 ms was within the 15000 ms limit.",
        },
        {
          key: LATENCY_WITHIN_THRESHOLD_KEY,
          score: true,
          comment: "Latency 1234.56 ms was within the 15000 ms limit.",
        },
      ],
    });
  });

  it("treats the configured limit as inclusive", () => {
    const evaluator = createLatencyEvaluator(500);

    expect(evaluator({ outputs: { latencyMs: 500 } })).toMatchObject({
      results: [
        { key: LATENCY_MILLISECONDS_KEY, score: 500 },
        { key: LATENCY_WITHIN_THRESHOLD_KEY, score: true },
      ],
    });
  });

  it("fails latency above the configured limit", () => {
    const evaluator = createLatencyEvaluator(500);

    expect(evaluator({ outputs: { latencyMs: 500.01 } })).toEqual({
      results: [
        {
          key: LATENCY_MILLISECONDS_KEY,
          score: 500.01,
          comment: "Latency 500.01 ms exceeded the 500 ms limit.",
        },
        {
          key: LATENCY_WITHIN_THRESHOLD_KEY,
          score: false,
          comment: "Latency 500.01 ms exceeded the 500 ms limit.",
        },
      ],
    });
  });

  it.each([undefined, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "reports invalid target latency (%s)",
    (latencyMs) => {
      expect(latencyEvaluator({ outputs: { latencyMs } })).toMatchObject({
        results: [
          { key: LATENCY_MILLISECONDS_KEY, score: null },
          { key: LATENCY_WITHIN_THRESHOLD_KEY, score: false },
        ],
      });
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid configured limit (%s)",
    (maximumLatencyMs) => {
      expect(() => createLatencyEvaluator(maximumLatencyMs)).toThrow(
        "maximumLatencyMs must be a positive finite number.",
      );
    },
  );
});
