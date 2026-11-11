import { isDeepStrictEqual } from "node:util";

import { Client } from "langsmith";

import {
  DATASET_SOURCE_FILE,
  type DemoShopDatasetExample,
} from "./langsmith-example.js";

export const DEMO_SHOP_DATASET_DESCRIPTION =
  "DemoShop RAG evaluation cases imported from RAG-Ecommercedataset.csv.";

interface DatasetRecord {
  id: string;
}

interface StoredExample {
  id: string;
  inputs: unknown;
  referenceOutputs: unknown;
  metadata: unknown;
}

export interface DatasetExampleUpdate {
  id: string;
  example: DemoShopDatasetExample;
}

export interface LangSmithDatasetGateway {
  hasDataset(datasetName: string): Promise<boolean>;
  createDataset(
    datasetName: string,
    description: string,
  ): Promise<DatasetRecord>;
  readDataset(datasetName: string): Promise<DatasetRecord>;
  listExamples(datasetId: string): AsyncIterable<StoredExample>;
  createExamples(
    datasetId: string,
    examples: DemoShopDatasetExample[],
  ): Promise<void>;
  updateExamples(
    datasetId: string,
    updates: DatasetExampleUpdate[],
  ): Promise<void>;
}

export interface DatasetSyncResult {
  datasetId: string;
  datasetName: string;
  createdDataset: boolean;
  createdExamples: number;
  updatedExamples: number;
  unchangedExamples: number;
}

export function createLangSmithDatasetGateway(
  client: Client,
): LangSmithDatasetGateway {
  return {
    hasDataset: async (datasetName) =>
      client.hasDataset({ datasetName }),
    createDataset: async (datasetName, description) =>
      client.createDataset(datasetName, {
        dataType: "kv",
        description,
      }),
    readDataset: async (datasetName) =>
      client.readDataset({ datasetName }),
    listExamples: async function* (datasetId) {
      for await (const example of client.listExamples({ datasetId })) {
        yield {
          id: example.id,
          inputs: example.inputs,
          referenceOutputs: example.outputs,
          metadata: example.metadata,
        };
      }
    },
    createExamples: async (datasetId, examples) => {
      await client.createExamples(
        examples.map((example) => ({
          dataset_id: datasetId,
          inputs: example.inputs,
          reference_outputs: example.referenceOutputs,
          metadata: example.metadata,
        })),
      );
    },
    updateExamples: async (datasetId, updates) => {
      await client.updateExamples(
        updates.map(({ id, example }) => ({
          id,
          dataset_id: datasetId,
          inputs: example.inputs,
          outputs: example.referenceOutputs,
          metadata: example.metadata,
        })),
      );
    },
  };
}

export async function syncLangSmithDataset(
  gateway: LangSmithDatasetGateway,
  datasetName: string,
  desiredExamples: DemoShopDatasetExample[],
): Promise<DatasetSyncResult> {
  assertUniqueCaseIds(desiredExamples);

  const datasetExists = await gateway.hasDataset(datasetName);
  const dataset = datasetExists
    ? await gateway.readDataset(datasetName)
    : await gateway.createDataset(
        datasetName,
        DEMO_SHOP_DATASET_DESCRIPTION,
      );
  const existingByCaseId = new Map<string, StoredExample>();

  for await (const existing of gateway.listExamples(dataset.id)) {
    const caseId = getManagedCaseId(existing.metadata);

    if (!caseId) {
      continue;
    }

    if (existingByCaseId.has(caseId)) {
      throw new Error(
        `LangSmith dataset contains duplicate DemoShop case ID: ${caseId}.`,
      );
    }

    existingByCaseId.set(caseId, existing);
  }

  const creates: DemoShopDatasetExample[] = [];
  const updates: DatasetExampleUpdate[] = [];
  let unchangedExamples = 0;

  for (const desired of desiredExamples) {
    const existing = existingByCaseId.get(desired.metadata.caseId);

    if (!existing) {
      creates.push(desired);
      continue;
    }

    if (examplesAreEqual(existing, desired)) {
      unchangedExamples += 1;
      continue;
    }

    updates.push({ id: existing.id, example: desired });
  }

  if (creates.length > 0) {
    await gateway.createExamples(dataset.id, creates);
  }

  if (updates.length > 0) {
    await gateway.updateExamples(dataset.id, updates);
  }

  return {
    datasetId: dataset.id,
    datasetName,
    createdDataset: !datasetExists,
    createdExamples: creates.length,
    updatedExamples: updates.length,
    unchangedExamples,
  };
}

function getManagedCaseId(metadata: unknown): string | undefined {
  if (!isRecord(metadata)) {
    return undefined;
  }

  return metadata.sourceFile === DATASET_SOURCE_FILE &&
    typeof metadata.caseId === "string"
    ? metadata.caseId
    : undefined;
}

function examplesAreEqual(
  existing: StoredExample,
  desired: DemoShopDatasetExample,
): boolean {
  return (
    isDeepStrictEqual(existing.inputs, desired.inputs) &&
    isDeepStrictEqual(existing.referenceOutputs, desired.referenceOutputs) &&
    isDeepStrictEqual(existing.metadata, desired.metadata)
  );
}

function assertUniqueCaseIds(examples: DemoShopDatasetExample[]): void {
  const ids = new Set<string>();

  for (const example of examples) {
    const caseId = example.metadata.caseId;

    if (ids.has(caseId)) {
      throw new Error(`Duplicate desired DemoShop case ID: ${caseId}.`);
    }

    ids.add(caseId);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
