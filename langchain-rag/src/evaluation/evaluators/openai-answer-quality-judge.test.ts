import { describe, expect, it } from "vitest";

import { buildAnswerQualityJudgePrompt } from "./openai-answer-quality-judge.js";

describe("buildAnswerQualityJudgePrompt", () => {
  it("serializes every case-specific field for the judge", () => {
    const prompt = buildAnswerQualityJudgePrompt({
      question: "Can I pay by Pix?",
      answer: "Yes.",
      expectedBehavior: "Explain the payment policy.",
      rubric: "Confirm that Pix is accepted.",
    });

    expect(prompt).toContain('"question": "Can I pay by Pix?"');
    expect(prompt).toContain('"answer": "Yes."');
    expect(prompt).toContain('"expectedBehavior"');
    expect(prompt).toContain('"rubric"');
  });
});
