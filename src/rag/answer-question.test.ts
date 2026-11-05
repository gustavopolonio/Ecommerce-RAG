import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { createAnswerQuestion } from "./answer-question.js";

describe("createAnswerQuestion", () => {
  it("returns sources, usage, and end-to-end latency", async () => {
    const client = {
      vectorStores: {
        search: vi.fn().mockResolvedValue({
          data: [
            {
              file_id: "file-payment",
              filename: "DOC-001_payment_policy.md",
              score: 0.98,
              attributes: {
                document_id: "DOC-001",
                source_filename: "DOC-001_payment_policy.md",
              },
              content: [{ type: "text", text: "Pix is supported." }],
            },
          ],
        }),
      },
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: "Yes, you can pay by Pix.",
          usage: {
            input_tokens: 30,
            output_tokens: 7,
            total_tokens: 37,
          },
        }),
      },
    } as unknown as OpenAI;
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(125.678);

    const answerQuestion = createAnswerQuestion({
      client,
      vectorStoreId: "vs-demo",
      model: "test-model",
      now,
    });

    await expect(answerQuestion("Can I pay by Pix?")).resolves.toEqual({
      message: "Yes, you can pay by Pix.",
      sources: [
        {
          fileId: "file-payment",
          filename: "DOC-001_payment_policy.md",
          documentId: "DOC-001",
          sourceFilename: "DOC-001_payment_policy.md",
          score: 0.98,
        },
      ],
      usage: {
        inputTokens: 30,
        outputTokens: 7,
        totalTokens: 37,
      },
      latencyMs: 25.68,
    });
  });

  it("does not spend generation tokens when retrieval finds nothing", async () => {
    const create = vi.fn();
    const client = {
      vectorStores: {
        search: vi.fn().mockResolvedValue({ data: [] }),
      },
      responses: { create },
    } as unknown as OpenAI;
    const now = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(12);
    const answerQuestion = createAnswerQuestion({
      client,
      vectorStoreId: "vs-demo",
      model: "test-model",
      now,
    });

    const result = await answerQuestion("Unknown question");

    expect(result.sources).toEqual([]);
    expect(result.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
    expect(result.latencyMs).toBe(2);
    expect(create).not.toHaveBeenCalled();
  });
});
