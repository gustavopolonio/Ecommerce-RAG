import { RunnableLambda } from "@langchain/core/runnables";
import { describe, expect, it, vi } from "vitest";

import { createDemoShopRagService } from "./demo-shop-rag-service.js";

describe("createDemoShopRagService", () => {
  it("invokes the chain and adds end-to-end latency", async () => {
    const invoke = vi.fn().mockResolvedValue({
      message: "Yes, DemoShop accepts Pix.",
      sources: [],
      usage: { inputTokens: 20, outputTokens: 6, totalTokens: 26 },
    });
    const chain = RunnableLambda.from(invoke);
    const now = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(145.237);
    const service = createDemoShopRagService({ chain, now });

    await expect(service("Can I pay by Pix?")).resolves.toEqual({
      message: "Yes, DemoShop accepts Pix.",
      sources: [],
      usage: { inputTokens: 20, outputTokens: 6, totalTokens: 26 },
      latencyMs: 45.24,
    });
    expect(invoke).toHaveBeenCalledWith("Can I pay by Pix?", expect.anything());
  });
});
