import { readFile } from "node:fs/promises";

import { SHARED_ASSETS } from "../config/shared-assets.js";

export async function loadAssistantInstructions(
  filePath = SHARED_ASSETS.assistantInstructions,
): Promise<string> {
  const instructions = (await readFile(filePath, "utf8")).trim();

  if (!instructions) {
    throw new Error(`Assistant instructions are empty: ${filePath}`);
  }

  return instructions;
}
