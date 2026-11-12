import { describe, expect, it, vi } from "vitest";

import {
  ANSWER_QUALITY_KEY,
  ANSWER_QUALITY_PASS_KEY,
  createAnswerQualityEvaluator,
  type AnswerQualityEvaluatorArguments,
  type AnswerQualityJudge,
} from "./answer-quality.js";

describe("createAnswerQualityEvaluator", () => {
  it("passes a rubric case and sends the expected fields to the judge", async () => {
    const judge = vi.fn<AnswerQualityJudge>().mockResolvedValue({
      score: 0.9,
      reasoning: "The answer satisfies the policy requirements.",
    });
    const evaluator = createAnswerQualityEvaluator({ judge });

    await expect(evaluator(argumentsForCase())).resolves.toEqual({
      results: [
        {
          key: ANSWER_QUALITY_KEY,
          score: 0.9,
          comment: "The answer satisfies the policy requirements.",
          evaluatorInfo: { passThreshold: 0.8 },
        },
        {
          key: ANSWER_QUALITY_PASS_KEY,
          score: true,
          comment: "The answer satisfies the policy requirements.",
          evaluatorInfo: { passThreshold: 0.8 },
        },
      ],
    });
    expect(judge).toHaveBeenCalledWith({
      question: "Can I pay by Pix?",
      answer: "Yes, DemoShop accepts Pix.",
      expectedBehavior: "Accurately explain whether Pix is accepted.",
      rubric: "Confirm that Pix is accepted.",
    });
  });

  it("uses an inclusive configurable pass threshold", async () => {
    const judge = vi.fn<AnswerQualityJudge>().mockResolvedValue({
      score: 0.75,
      reasoning: "Mostly correct.",
    });
    const evaluator = createAnswerQualityEvaluator({
      judge,
      passThreshold: 0.75,
    });

    await expect(evaluator(argumentsForCase())).resolves.toMatchObject({
      results: [
        { key: ANSWER_QUALITY_KEY, score: 0.75 },
        { key: ANSWER_QUALITY_PASS_KEY, score: true },
      ],
    });
  });

  it("fails a score below the threshold", async () => {
    const judge = vi.fn<AnswerQualityJudge>().mockResolvedValue({
      score: 0.79,
      reasoning: "An important condition is missing.",
    });
    const evaluator = createAnswerQualityEvaluator({ judge });

    await expect(evaluator(argumentsForCase())).resolves.toMatchObject({
      results: [
        { key: ANSWER_QUALITY_KEY, score: 0.79 },
        { key: ANSWER_QUALITY_PASS_KEY, score: false },
      ],
    });
  });

  it("does not call the judge when rubric scoring is not applicable", async () => {
    const judge = vi.fn<AnswerQualityJudge>();
    const evaluator = createAnswerQualityEvaluator({ judge });
    const arguments_ = argumentsForCase();
    arguments_.example.metadata = { scoringMethods: ["deterministic"] };

    await expect(evaluator(arguments_)).resolves.toMatchObject({
      results: [
        { key: ANSWER_QUALITY_KEY, score: null },
        { key: ANSWER_QUALITY_PASS_KEY, score: null },
      ],
    });
    expect(judge).not.toHaveBeenCalled();
  });

  it("surfaces invalid evaluator input without calling the judge", async () => {
    const judge = vi.fn<AnswerQualityJudge>();
    const evaluator = createAnswerQualityEvaluator({ judge });
    const arguments_ = argumentsForCase();
    arguments_.outputs = {};

    await expect(evaluator(arguments_)).resolves.toMatchObject({
      results: [
        { key: ANSWER_QUALITY_KEY, score: 0 },
        { key: ANSWER_QUALITY_PASS_KEY, score: false },
      ],
    });
    expect(judge).not.toHaveBeenCalled();
  });

  it("rejects invalid judge results and threshold configuration", async () => {
    const invalidJudge = vi.fn<AnswerQualityJudge>().mockResolvedValue({
      score: 2,
      reasoning: "",
    });
    const evaluator = createAnswerQualityEvaluator({ judge: invalidJudge });

    await expect(evaluator(argumentsForCase())).resolves.toMatchObject({
      results: [
        { key: ANSWER_QUALITY_KEY, score: 0 },
        { key: ANSWER_QUALITY_PASS_KEY, score: false },
      ],
    });
    expect(() =>
      createAnswerQualityEvaluator({ judge: invalidJudge, passThreshold: 1.1 }),
    ).toThrow("passThreshold must be a finite number from 0 to 1.");
  });
});

function argumentsForCase(): AnswerQualityEvaluatorArguments {
  return {
    inputs: { question: "Can I pay by Pix?" },
    outputs: { answer: "Yes, DemoShop accepts Pix." },
    referenceOutputs: {
      expectedBehavior: "Accurately explain whether Pix is accepted.",
      expectedAnswerOrRubric: "Confirm that Pix is accepted.",
    },
    example: {
      metadata: { scoringMethods: ["llm_rubric"] },
    },
  };
}
