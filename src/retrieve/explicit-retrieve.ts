import type OpenAI from "openai";

export const DEFAULT_MAX_RESULTS = 5;

export interface RetrievedDocument {
  fileId: string;
  filename: string;
  score: number;
  documentId: string | null;
  sourceFilename: string | null;
  text: string;
}

export async function retrieveVectorStoreDocuments(
  client: OpenAI,
  vectorStoreId: string,
  query: string,
  maxResults = DEFAULT_MAX_RESULTS,
): Promise<RetrievedDocument[]> {
  const results = await client.vectorStores.search(vectorStoreId, {
    query,
    max_num_results: maxResults,
  });

  return results.data.map((result) => ({
    fileId: result.file_id,
    filename: result.filename,
    score: result.score,
    documentId: getStringAttribute(result.attributes, "document_id"),
    sourceFilename: getStringAttribute(result.attributes, "source_filename"),
    text: result.content.map((item) => item.text).join("\n\n"),
  }));
}

function getStringAttribute(
  attributes: Record<string, string | number | boolean> | null,
  key: string,
): string | null {
  const value = attributes?.[key];
  return typeof value === "string" ? value : null;
}
