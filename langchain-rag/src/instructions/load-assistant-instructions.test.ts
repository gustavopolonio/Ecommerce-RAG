import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { SHARED_ASSETS } from "../config/shared-assets.js";
import { loadAssistantInstructions } from "./load-assistant-instructions.js";

describe("loadAssistantInstructions", () => {
  it("loads the existing DemoShop assistant instructions without copying them", async () => {
    const source = (
      await readFile(SHARED_ASSETS.assistantInstructions, "utf8")
    ).trim();

    await expect(loadAssistantInstructions()).resolves.toBe(source);
  });
});
