import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { ASSISTANT_INSTRUCTIONS, createAIResponse } from "./response.js";

describe("createAIResponse", () => {
  it("grounds the response in context and maps token usage", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: "Yes, DemoShop accepts Pix.",
      usage: {
        input_tokens: 42,
        output_tokens: 8,
        total_tokens: 50,
      },
    });
    const client = { responses: { create } } as unknown as OpenAI;

    await expect(
      createAIResponse(
        client,
        "test-model",
        '<source id="DOC-001">Pix is supported.</source>',
        "Can I pay by Pix?",
      ),
    ).resolves.toEqual({
      answer: "Yes, DemoShop accepts Pix.",
      usage: {
        inputTokens: 42,
        outputTokens: 8,
        totalTokens: 50,
      },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        instructions: ASSISTANT_INSTRUCTIONS,
        max_output_tokens: 500,
        store: false,
        input: [
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("Pix is supported."),
          }),
        ],
      }),
    );
  });
});
