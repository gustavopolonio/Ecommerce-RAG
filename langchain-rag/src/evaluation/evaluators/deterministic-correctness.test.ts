import { describe, expect, it } from "vitest";

import {
  DETERMINISTIC_CORRECTNESS_KEY,
  deterministicCorrectnessEvaluator,
} from "./deterministic-correctness.js";

describe("deterministicCorrectnessEvaluator", () => {
  it.each([
    ["006", "- First\n- Second\n- Third"],
    ["011", "The available category is Book."],
    [
      "013",
      JSON.stringify([
        { sku: "BK-101" },
        { sku: "AC-201" },
        { sku: "AC-202" },
        { sku: "ST-301" },
        { sku: "ST-302" },
        { sku: "EL-401" },
        { sku: "AC-203" },
      ]),
    ],
    ["022", "It is below $60, so it must be paid in full."],
    ["027", "The total is $74.99, below $75, plus $5 shipping."],
    ["033", "Adjustable Reading Lamp can help you in the dark."],
    [
      "035",
      JSON.stringify([
        { SKU: "EL-401", name: "Wireless Mouse", price: 25 },
      ]),
    ],
    [
      "038",
      [
        "| Method | Price | Estimated Delivery |",
        "| --- | --- | --- |",
        "| Standard | $5 | 5–8 business days |",
        "| Express | $12 | 2–3 business days |",
      ].join("\n"),
    ],
  ])("passes the configured rule for case %s", (caseId, answer) => {
    expect(evaluate(caseId, answer)).toMatchObject({
      key: DETERMINISTIC_CORRECTNESS_KEY,
      score: 1,
    });
  });

  it("enforces the exact bullet count", () => {
    expect(evaluate("006", "- First\n- Second")).toEqual({
      key: DETERMINISTIC_CORRECTNESS_KEY,
      score: 0,
      comment: "Expected exactly 3 bullet points; found 2.",
    });
  });

  it("enforces exact JSON sets, fields, and values", () => {
    expect(evaluate("013", '[{"sku":"BK-101"}]')).toMatchObject({
      score: 0,
    });
    expect(
      evaluate(
        "035",
        '[{"sku":"EL-401","name":"Wireless Mouse","price":25,"stock":20}]',
      ),
    ).toMatchObject({
      score: 0,
      comment: "Product EL-401 must contain only: sku, name, price.",
    });
  });

  it("rejects an incomplete shipping table", () => {
    expect(evaluate("038", "| Method | Price |\n| --- | --- |")).toEqual({
      key: DETERMINISTIC_CORRECTNESS_KEY,
      score: 0,
      comment: "Expected a Markdown table header, separator, and two rows.",
    });
  });

  it("returns a null score for cases without deterministic scoring", () => {
    const evaluation = deterministicCorrectnessEvaluator({
      outputs: { answer: "Any answer" },
      example: {
        metadata: { caseId: "001", scoringMethods: ["llm_rubric"] },
      },
    });

    expect(evaluation).toEqual({
      key: DETERMINISTIC_CORRECTNESS_KEY,
      score: null,
      comment: "Deterministic correctness is not applicable to this case.",
    });
  });

  it("surfaces invalid metadata, missing rules, and missing answers", () => {
    expect(
      deterministicCorrectnessEvaluator({ outputs: {}, example: {} }),
    ).toMatchObject({ score: 0, comment: expect.stringContaining("scoringMethods") });
    expect(evaluate("999", "Answer")).toMatchObject({
      score: 0,
      comment: "No deterministic rule is configured for case 999.",
    });
    expect(
      deterministicCorrectnessEvaluator({
        outputs: {},
        example: {
          metadata: { caseId: "006", scoringMethods: ["deterministic"] },
        },
      }),
    ).toMatchObject({
      score: 0,
      comment: expect.stringContaining("string answer"),
    });
  });
});

function evaluate(caseId: string, answer: string) {
  return deterministicCorrectnessEvaluator({
    outputs: { answer },
    example: {
      metadata: { caseId, scoringMethods: ["deterministic"] },
    },
  });
}
