import { describe, expect, it, vi } from "vitest";

import { createDemoShopEvaluationTarget } from "./evaluation-target.js";

describe("createDemoShopEvaluationTarget", () => {
  it("adapts a dataset question to the result evaluators need", async () => {
    const ragService = vi.fn().mockResolvedValue({
      message: "Yes, DemoShop accepts Pix.",
      sources: [
        {
          fileId: "file-payment",
          filename: "DOC-001_payment_policy.md",
          documentId: "DOC-001",
          sourceFilename: "DOC-001_payment_policy.md",
          score: 0.91,
        },
      ],
      usage: { inputTokens: 20, outputTokens: 6, totalTokens: 26 },
      latencyMs: 125.4,
    });
    const target = createDemoShopEvaluationTarget({ ragService });
    const config = { tags: ["evaluation"] };

    await expect(
      target({ question: "  Can I pay by Pix?  " }, config),
    ).resolves.toEqual({
      answer: "Yes, DemoShop accepts Pix.",
      sources: [
        {
          fileId: "file-payment",
          filename: "DOC-001_payment_policy.md",
          documentId: "DOC-001",
          sourceFilename: "DOC-001_payment_policy.md",
          score: 0.91,
        },
      ],
      usage: { inputTokens: 20, outputTokens: 6, totalTokens: 26 },
      latencyMs: 125.4,
    });
    expect(ragService).toHaveBeenCalledOnce();
    expect(ragService).toHaveBeenCalledWith("Can I pay by Pix?", config);
  });

  it.each(["", "   "])(
    "rejects an empty dataset question (%j)",
    async (question) => {
      const ragService = vi.fn();
      const target = createDemoShopEvaluationTarget({ ragService });

      await expect(target({ question })).rejects.toThrow(
        "Evaluation input question must be a non-empty string.",
      );
      expect(ragService).not.toHaveBeenCalled();
    },
  );
});
