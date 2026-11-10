import { describe, expect, it } from "vitest";

import { createDemoShopPrompt } from "./prompt.js";

describe("createDemoShopPrompt", () => {
  it("keeps application instructions above retrieved and user content", async () => {
    const prompt = await createDemoShopPrompt().invoke({
      assistantInstructions: "Never invent DemoShop policy.",
      context: '[{"documentId":"DOC-001","content":"Pix is supported."}]',
      question: "Can I pay by Pix?",
    });
    const [developerMessage, userMessage] = prompt.toChatMessages();

    expect(developerMessage).toMatchObject({
      role: "developer",
      content: "Never invent DemoShop policy.",
    });
    expect(userMessage).toMatchObject({
      content: expect.stringContaining("<retrieved_documents>"),
    });
    expect(userMessage?.content).toContain("Pix is supported.");
    expect(userMessage?.content).toContain("Can I pay by Pix?");
  });
});
