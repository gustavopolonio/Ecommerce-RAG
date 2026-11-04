import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

export const EXPECTED_DOCUMENT_IDS = [
  "DOC-001",
  "DOC-002",
  "DOC-003",
  "DOC-004",
  "DOC-005",
  "DOC-006",
] as const;

export interface KnowledgeDocument {
  documentId: string;
  fileName: string;
  filePath: string;
}

const KNOWLEDGE_DOCUMENT_PATTERN = /^(DOC-\d{3})_[a-z0-9_]+\.md$/i;

export function selectKnowledgeDocuments(
  fileNames: readonly string[],
  directory: string,
): KnowledgeDocument[] {
  const documents = fileNames.flatMap((fileName) => {
    const match = KNOWLEDGE_DOCUMENT_PATTERN.exec(fileName);

    if (!match?.[1]) {
      return [];
    }

    return [
      {
        documentId: match[1].toUpperCase(),
        fileName,
        filePath: resolve(directory, fileName),
      },
    ];
  });

  const actualIds = documents.map(({ documentId }) => documentId).sort();
  const expectedIds = [...EXPECTED_DOCUMENT_IDS];

  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((documentId, index) => documentId !== expectedIds[index])
  ) {
    throw new Error(
      `Knowledge base must contain exactly ${expectedIds.join(", ")}; found ${actualIds.join(", ") || "none"}.`,
    );
  }

  return documents.sort((a, b) => a.documentId.localeCompare(b.documentId));
}

export async function discoverKnowledgeDocuments(
  directory: string,
): Promise<KnowledgeDocument[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  return selectKnowledgeDocuments(fileNames, directory);
}
