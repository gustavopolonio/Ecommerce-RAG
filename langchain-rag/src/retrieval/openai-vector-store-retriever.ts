import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import OpenAI from "openai";

export const DEFAULT_MAX_RESULTS = 5;

export interface OpenAIVectorStoreDocumentMetadata
  extends Record<string, unknown> {
  fileId: string;
  filename: string;
  score: number;
  documentId: string | null;
  sourceFilename: string | null;
  attributes: Record<string, string | number | boolean> | null;
}

interface VectorStoreSearchResult {
  file_id: string;
  filename: string;
  score: number;
  attributes: Record<string, string | number | boolean> | null;
  content: Array<{ type: "text"; text: string }>;
}

interface VectorStoreSearchPage {
  data: VectorStoreSearchResult[];
}

export interface OpenAIVectorStoreSearchClient {
  vectorStores: {
    search(
      vectorStoreId: string,
      parameters: { query: string; max_num_results: number },
    ): PromiseLike<VectorStoreSearchPage>;
  };
}

export interface OpenAIVectorStoreRetrieverOptions {
  client: OpenAIVectorStoreSearchClient;
  vectorStoreId: string;
  maxResults?: number;
}

export interface CreateOpenAIVectorStoreRetrieverOptions {
  apiKey: string;
  vectorStoreId: string;
  maxResults?: number;
}

/**
 * Adapts OpenAI Vector Store search results to LangChain Documents.
 *
 * Extending BaseRetriever makes this class a LangChain Runnable. Future steps
 * can compose it into a RAG chain and trace each invocation with LangSmith.
 */
export class OpenAIVectorStoreRetriever extends BaseRetriever<OpenAIVectorStoreDocumentMetadata> {
  static lc_name(): string {
    return "OpenAIVectorStoreRetriever";
  }

  lc_namespace = ["demoshop", "retrieval"];

  private readonly client: OpenAIVectorStoreSearchClient;
  private readonly vectorStoreId: string;
  readonly maxResults: number;

  constructor({
    client,
    vectorStoreId,
    maxResults = DEFAULT_MAX_RESULTS,
  }: OpenAIVectorStoreRetrieverOptions) {
    super({
      metadata: { vectorStoreId },
      tags: ["demoshop", "openai-vector-store"],
    });

    this.client = client;
    this.vectorStoreId = requireNonEmptyString(
      vectorStoreId,
      "vectorStoreId",
    );
    this.maxResults = validateMaxResults(maxResults);
  }

  async _getRelevantDocuments(
    query: string,
  ): Promise<Array<Document<OpenAIVectorStoreDocumentMetadata>>> {
    const normalizedQuery = requireNonEmptyString(query, "query");
    const results = await this.client.vectorStores.search(this.vectorStoreId, {
      query: normalizedQuery,
      max_num_results: this.maxResults,
    });

    return results.data.map(
      (result, index) =>
        new Document<OpenAIVectorStoreDocumentMetadata>({
          id: `${result.file_id}:${index}`,
          pageContent: result.content.map((item) => item.text).join("\n\n"),
          metadata: {
            fileId: result.file_id,
            filename: result.filename,
            score: result.score,
            documentId: getStringAttribute(
              result.attributes,
              "document_id",
            ),
            sourceFilename: getStringAttribute(
              result.attributes,
              "source_filename",
            ),
            attributes: result.attributes,
          },
        }),
    );
  }
}

export function createOpenAIVectorStoreRetriever({
  apiKey,
  vectorStoreId,
  maxResults,
}: CreateOpenAIVectorStoreRetrieverOptions): OpenAIVectorStoreRetriever {
  const client = new OpenAI({
    apiKey: requireNonEmptyString(apiKey, "apiKey"),
  });

  return new OpenAIVectorStoreRetriever({
    client,
    vectorStoreId,
    ...(maxResults === undefined ? {} : { maxResults }),
  });
}

function validateMaxResults(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new Error("maxResults must be an integer between 1 and 50.");
  }

  return value;
}

function requireNonEmptyString(value: string, name: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${name} must not be empty.`);
  }

  return normalizedValue;
}

function getStringAttribute(
  attributes: Record<string, string | number | boolean> | null,
  key: string,
): string | null {
  const value = attributes?.[key];
  return typeof value === "string" ? value : null;
}
