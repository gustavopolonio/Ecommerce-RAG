import type { EvaluationResult } from "langsmith/evaluation";

export const ANSWER_QUALITY_KEY = "answer_quality";
export const ANSWER_QUALITY_PASS_KEY = "answer_quality_pass";
export const ANSWER_QUALITY_PASS_THRESHOLD = 0.8;

export interface AnswerQualityJudgeInput {
  question: string;
  answer: string;
  expectedBehavior: string;
  rubric: string;
}

export interface AnswerQualityJudgment {
  score: number;
  reasoning: string;
}

export type AnswerQualityJudge = (
  input: AnswerQualityJudgeInput,
) => Promise<AnswerQualityJudgment>;

export interface AnswerQualityEvaluatorArguments {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
  example: {
    metadata?: Record<string, unknown> | null;
  };
}

export interface AnswerQualityEvaluatorDependencies {
  judge: AnswerQualityJudge;
  passThreshold?: number;
}

export interface AnswerQualityEvaluationResults {
  results: EvaluationResult[];
}

export type AnswerQualityEvaluator = (
  arguments_: AnswerQualityEvaluatorArguments,
) => Promise<AnswerQualityEvaluationResults>;

export function createAnswerQualityEvaluator({
  judge,
  passThreshold = ANSWER_QUALITY_PASS_THRESHOLD,
}: AnswerQualityEvaluatorDependencies): AnswerQualityEvaluator {
  if (!isScore(passThreshold)) {
    throw new Error("passThreshold must be a finite number from 0 to 1.");
  }

  return async ({ inputs, outputs, referenceOutputs, example }) => {
    const scoringMethods = example.metadata?.scoringMethods;

    if (!isStringArray(scoringMethods)) {
      return configurationFailure(
        "Answer quality could not run because scoringMethods is missing or invalid.",
        passThreshold,
      );
    }

    if (!scoringMethods.includes("llm_rubric")) {
      const comment = "Answer quality is not applicable to this case.";

      return {
        results: [
          result(ANSWER_QUALITY_KEY, null, comment, passThreshold),
          result(ANSWER_QUALITY_PASS_KEY, null, comment, passThreshold),
        ],
      };
    }

    const judgeInput = readJudgeInput(inputs, outputs, referenceOutputs);

    if (!judgeInput.ok) {
      return configurationFailure(judgeInput.comment, passThreshold);
    }

    const judgment = await judge(judgeInput.value);

    if (!isScore(judgment.score) || !judgment.reasoning?.trim()) {
      return configurationFailure(
        "The answer-quality judge returned an invalid score or empty reasoning.",
        passThreshold,
      );
    }

    const score = judgment.score;
    const passed = score >= passThreshold;
    const comment = judgment.reasoning.trim();

    return {
      results: [
        result(ANSWER_QUALITY_KEY, score, comment, passThreshold),
        result(ANSWER_QUALITY_PASS_KEY, passed, comment, passThreshold),
      ],
    };
  };
}

function readJudgeInput(
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
  referenceOutputs?: Record<string, unknown>,
): { ok: true; value: AnswerQualityJudgeInput } | { ok: false; comment: string } {
  const fields = {
    question: inputs.question,
    answer: outputs.answer,
    expectedBehavior: referenceOutputs?.expectedBehavior,
    rubric: referenceOutputs?.expectedAnswerOrRubric,
  };

  for (const [name, value] of Object.entries(fields)) {
    if (typeof value !== "string" || !value.trim()) {
      return {
        ok: false,
        comment: `Answer quality could not run because ${name} is missing or invalid.`,
      };
    }
  }

  return {
    ok: true,
    value: {
      question: String(fields.question).trim(),
      answer: String(fields.answer).trim(),
      expectedBehavior: String(fields.expectedBehavior).trim(),
      rubric: String(fields.rubric).trim(),
    },
  };
}

function configurationFailure(
  comment: string,
  passThreshold: number,
): AnswerQualityEvaluationResults {
  return {
    results: [
      result(ANSWER_QUALITY_KEY, 0, comment, passThreshold),
      result(ANSWER_QUALITY_PASS_KEY, false, comment, passThreshold),
    ],
  };
}

function result(
  key: string,
  score: number | boolean | null,
  comment: string,
  passThreshold: number,
): EvaluationResult {
  return {
    key,
    score,
    comment,
    evaluatorInfo: { passThreshold },
  };
}

function isScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
