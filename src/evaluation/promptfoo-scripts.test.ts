import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const recallAtFive = require(
  "../../evaluation/assertions/recall-at-5.cjs",
) as AssertionFunction;
const deterministic = require(
  "../../evaluation/assertions/deterministic.cjs",
) as AssertionFunction;
const transformChatResponse = require(
  "../../evaluation/transforms/chat-response.cjs",
) as (json: unknown) => unknown;
const ReplayResponsesProvider = require(
  "../../evaluation/providers/replay-responses.cjs",
) as new (options: {
  config: { providerId: string; responsesFile: string };
}) => {
  id(): string;
  callApi(
    prompt: string,
    context: { vars: { caseId: string } },
  ): Promise<{ output?: string; error?: string }>;
};

interface AssertionResult {
  pass: boolean;
  score: number;
  reason: string;
  namedScores?: Record<string, number>;
}

type AssertionFunction = (
  output: string,
  context: Record<string, unknown>,
) => AssertionResult;

describe("Recall@5 assertion", () => {
  it("scores partial recall and identifies missing documents", () => {
    const result = recallAtFive("answer", {
      config: { expectedDocumentIds: ["DOC-001", "DOC-003"] },
      providerResponse: {
        metadata: {
          sources: [
            { documentId: "DOC-001" },
            { documentId: "DOC-006" },
          ],
        },
      },
    });

    expect(result).toMatchObject({
      pass: false,
      score: 0.5,
      namedScores: { recall_at_5: 0.5 },
    });
    expect(result.reason).toContain("DOC-003");
  });
});

describe("deterministic assertions", () => {
  it("enforces an exact bullet count", () => {
    expect(
      deterministic("- One\n- Two\n- Three", {
        config: { rule: "exact_bullet_count", count: 3 },
      }),
    ).toMatchObject({ pass: true, score: 1 });
  });

  it("checks exact JSON SKU sets", () => {
    expect(
      deterministic('[{"sku":"A"},{"SKU":"B"}]', {
        config: { rule: "json_sku_set", expectedSkus: ["A", "B"] },
      }),
    ).toMatchObject({ pass: true, score: 1 });
  });

  it("checks JSON product fields and values", () => {
    expect(
      deterministic(
        '[{"SKU":"EL-401","name":"Wireless Mouse","price":25}]',
        {
          config: {
            rule: "json_product_set",
            expectedProducts: [
              { sku: "EL-401", name: "Wireless Mouse", price: 25 },
            ],
            allowedFields: ["sku", "name", "price"],
          },
        },
      ),
    ).toMatchObject({ pass: true, score: 1 });
  });

  it("checks the required shipping Markdown table values", () => {
    const table = [
      "| Method | Price | Estimated Delivery |",
      "| --- | --- | --- |",
      "| Standard | $5 | 5–8 business days |",
      "| Express | $12 | 2–3 business days |",
    ].join("\n");

    expect(
      deterministic(table, {
        config: { rule: "shipping_markdown_table" },
      }),
    ).toMatchObject({ pass: true, score: 1 });
  });
});

describe("chat response transform", () => {
  it("preserves output, sources, token usage, and application latency", () => {
    expect(
      transformChatResponse({
        message: "Answer",
        sources: [{ documentId: "DOC-001", score: 0.9 }],
        usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
        latencyMs: 123.45,
      }),
    ).toEqual({
      output: "Answer",
      tokenUsage: { prompt: 10, completion: 4, total: 14 },
      metadata: {
        sources: [{ documentId: "DOC-001", score: 0.9 }],
        applicationLatencyMs: 123.45,
      },
    });
  });

  it("rejects an invalid API response", () => {
    expect(() => transformChatResponse({ message: "Answer" })).toThrow(
      "sources array",
    );
  });
});

describe("pairwise replay provider", () => {
  it("returns a stored baseline answer by case ID", async () => {
    const provider = new ReplayResponsesProvider({
      config: {
        providerId: "baseline",
        responsesFile: "evaluation/comparison/baseline.json",
      },
    });

    const response = await provider.callApi("question", {
      vars: { caseId: "017" },
    });

    expect(provider.id()).toBe("replay:baseline");
    expect(response.output).toContain("30 calendar days after delivery");
  });

  it("returns an error for a response that was not stored", async () => {
    const provider = new ReplayResponsesProvider({
      config: {
        providerId: "baseline",
        responsesFile: "evaluation/comparison/baseline.json",
      },
    });

    await expect(
      provider.callApi("question", { vars: { caseId: "999" } }),
    ).resolves.toEqual({
      error: "No baseline response was stored for case 999.",
    });
  });
});
