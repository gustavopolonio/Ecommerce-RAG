import { access } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { SHARED_ASSETS } from "./shared-assets.js";

describe("SHARED_ASSETS", () => {
  it("points to the existing DemoShop source material", async () => {
    await expect(
      Promise.all([
        access(SHARED_ASSETS.assistantInstructions),
        access(SHARED_ASSETS.evaluationDataset),
        access(SHARED_ASSETS.knowledgeBaseDirectory),
      ]),
    ).resolves.toEqual([undefined, undefined, undefined]);
  });
});
