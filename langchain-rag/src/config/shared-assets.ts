import { fileURLToPath } from "node:url";
import path from "node:path";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export const SHARED_ASSETS = {
  assistantInstructions: path.join(
    REPOSITORY_ROOT,
    "src/instructions/ASSISTANT_INSTRUCTIONS.md",
  ),
  evaluationDataset: path.join(
    REPOSITORY_ROOT,
    "RAG-Ecommercedataset.csv",
  ),
  knowledgeBaseDirectory: path.join(REPOSITORY_ROOT, "knowledge-base"),
} as const;
