import { createReadStream } from "node:fs";

import type OpenAI from "openai";
import type { FileBatchCreateParams } from "openai/resources/vector-stores/file-batches";

import type { KnowledgeDocument } from "./documents.js";

const VECTOR_STORE_NAME = "DemoShop Knowledge Base";
const VECTOR_STORE_EXPIRATION_DAYS = 30;

export interface UploadedDocument {
  document: KnowledgeDocument;
  fileId: string;
}

export interface IngestionResult {
  batchId: string;
  createdVectorStore: boolean;
  fileIds: string[];
  vectorStoreId: string;
}

export type IngestionProgress = (message: string) => void;

export function buildVectorStoreFiles(
  uploads: readonly UploadedDocument[],
): NonNullable<FileBatchCreateParams["files"]> {
  return uploads.map(({ document, fileId }) => ({
    file_id: fileId,
    attributes: {
      document_id: document.documentId,
      source_filename: document.fileName,
    },
  }));
}

async function resolveVectorStore(
  client: OpenAI,
  configuredVectorStoreId: string | undefined,
): Promise<{ created: boolean; id: string }> {
  if (configuredVectorStoreId) {
    const vectorStore = await client.vectorStores.retrieve(
      configuredVectorStoreId,
    );

    if (vectorStore.file_counts.total > 0) {
      throw new Error(
        `Vector store ${vectorStore.id} already contains ${vectorStore.file_counts.total} file(s). Refusing to create duplicate knowledge-base entries.`,
      );
    }

    return { created: false, id: vectorStore.id };
  }

  const vectorStore = await client.vectorStores.create({
    name: VECTOR_STORE_NAME,
    description:
      "DemoShop fictional policies, catalog, and FAQ for RAG development and evaluation.",
    expires_after: {
      anchor: "last_active_at",
      days: VECTOR_STORE_EXPIRATION_DAYS,
    },
    metadata: {
      project: "demoshop-rag",
    },
  });

  return { created: true, id: vectorStore.id };
}

export async function ingestKnowledgeBase(
  client: OpenAI,
  documents: readonly KnowledgeDocument[],
  options: {
    vectorStoreId?: string;
    onProgress?: IngestionProgress;
  } = {},
): Promise<IngestionResult> {
  const progress = options.onProgress ?? (() => undefined);
  const vectorStore = await resolveVectorStore(client, options.vectorStoreId);

  progress(
    vectorStore.created
      ? `Created vector store ${vectorStore.id}.`
      : `Using empty vector store ${vectorStore.id}.`,
  );

  const uploads: UploadedDocument[] = [];

  for (const document of documents) {
    progress(`Uploading ${document.documentId} (${document.fileName})...`);

    const file = await client.files.create({
      file: createReadStream(document.filePath),
      purpose: "assistants",
    });

    uploads.push({ document, fileId: file.id });
  }

  progress(`Indexing ${uploads.length} documents...`);

  const batch = await client.vectorStores.fileBatches.createAndPoll(
    vectorStore.id,
    {
      files: buildVectorStoreFiles(uploads),
    },
  );

  if (
    batch.status !== "completed" ||
    batch.file_counts.failed > 0 ||
    batch.file_counts.completed !== documents.length
  ) {
    throw new Error(
      `Vector store indexing did not complete successfully: status=${batch.status}, completed=${batch.file_counts.completed}, failed=${batch.file_counts.failed}.`,
    );
  }

  return {
    batchId: batch.id,
    createdVectorStore: vectorStore.created,
    fileIds: uploads.map(({ fileId }) => fileId),
    vectorStoreId: vectorStore.id,
  };
}
