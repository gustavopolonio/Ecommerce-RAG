import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../app.js";
import type { AnswerQuestionResult } from "../rag/answer-question.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe("POST /chat", () => {
  it("returns the complete RAG result", async () => {
    const result: AnswerQuestionResult = {
      message: "Yes, DemoShop accepts Pix.",
      sources: [
        {
          fileId: "file-payment",
          filename: "DOC-001_payment_policy.md",
          documentId: "DOC-001",
          sourceFilename: "DOC-001_payment_policy.md",
          score: 0.98,
        },
      ],
      usage: { inputTokens: 20, outputTokens: 6, totalTokens: 26 },
      latencyMs: 45.2,
    };
    const answerQuestion = vi.fn().mockResolvedValue(result);
    const app = buildApp({ chat: { answerQuestion } });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload: { question: "  Can I pay by Pix?  " },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(result);
    expect(answerQuestion).toHaveBeenCalledWith("Can I pay by Pix?");
  });

  it.each([
    {},
    { question: "" },
    { question: "   " },
    { question: "x".repeat(2_001) },
    { question: 42 },
    { question: "Valid question", unexpected: true },
  ])("rejects an invalid body: %j", async (payload) => {
    const answerQuestion = vi.fn();
    const app = buildApp({ chat: { answerQuestion } });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/chat",
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(answerQuestion).not.toHaveBeenCalled();
  });
});
