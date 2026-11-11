import { describe, expect, it, vi } from "vitest";

import type { DemoShopDatasetExample } from "./langsmith-example.js";
import {
  DEMO_SHOP_DATASET_DESCRIPTION,
  type LangSmithDatasetGateway,
  syncLangSmithDataset,
} from "./sync-langsmith-dataset.js";

describe("syncLangSmithDataset", () => {
  it("creates a missing dataset and uploads all examples", async () => {
    const examples = [createExample("001"), createExample("002")];
    const createDataset = vi.fn().mockResolvedValue({ id: "dataset-1" });
    const createExamples = vi.fn().mockResolvedValue(undefined);
    const gateway = createGateway({
      hasDataset: vi.fn().mockResolvedValue(false),
      createDataset,
      createExamples,
    });

    await expect(
      syncLangSmithDataset(gateway, "demoshop-rag-evaluation", examples),
    ).resolves.toEqual({
      datasetId: "dataset-1",
      datasetName: "demoshop-rag-evaluation",
      createdDataset: true,
      createdExamples: 2,
      updatedExamples: 0,
      unchangedExamples: 0,
    });
    expect(createDataset).toHaveBeenCalledWith(
      "demoshop-rag-evaluation",
      DEMO_SHOP_DATASET_DESCRIPTION,
    );
    expect(createExamples).toHaveBeenCalledWith("dataset-1", examples);
  });

  it("creates missing cases, updates changed cases, and skips unchanged cases", async () => {
    const unchanged = createExample("001");
    const changed = createExample("002");
    const missing = createExample("003");
    const createExamples = vi.fn().mockResolvedValue(undefined);
    const updateExamples = vi.fn().mockResolvedValue(undefined);
    const gateway = createGateway({
      listExamples: async function* () {
        yield storedExample("remote-1", unchanged);
        yield storedExample("remote-2", {
          ...changed,
          inputs: { question: "Outdated question" },
        });
        yield {
          id: "unrelated",
          inputs: {},
          referenceOutputs: {},
          metadata: { sourceFile: "another-source.csv", caseId: "999" },
        };
      },
      createExamples,
      updateExamples,
    });

    await expect(
      syncLangSmithDataset(gateway, "demoshop-rag-evaluation", [
        unchanged,
        changed,
        missing,
      ]),
    ).resolves.toEqual({
      datasetId: "dataset-1",
      datasetName: "demoshop-rag-evaluation",
      createdDataset: false,
      createdExamples: 1,
      updatedExamples: 1,
      unchangedExamples: 1,
    });
    expect(createExamples).toHaveBeenCalledWith("dataset-1", [missing]);
    expect(updateExamples).toHaveBeenCalledWith("dataset-1", [
      { id: "remote-2", example: changed },
    ]);
  });

  it("rejects duplicate managed case IDs already stored in LangSmith", async () => {
    const example = createExample("001");
    const gateway = createGateway({
      listExamples: async function* () {
        yield storedExample("remote-1", example);
        yield storedExample("remote-2", example);
      },
    });

    await expect(
      syncLangSmithDataset(gateway, "demoshop-rag-evaluation", [example]),
    ).rejects.toThrow("duplicate DemoShop case ID: 001");
  });
});

function createGateway(
  overrides: Partial<LangSmithDatasetGateway> = {},
): LangSmithDatasetGateway {
  return {
    hasDataset: vi.fn().mockResolvedValue(true),
    createDataset: vi.fn().mockResolvedValue({ id: "dataset-1" }),
    readDataset: vi.fn().mockResolvedValue({ id: "dataset-1" }),
    listExamples: async function* () {},
    createExamples: vi.fn().mockResolvedValue(undefined),
    updateExamples: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createExample(caseId: string): DemoShopDatasetExample {
  return {
    inputs: { question: `Question ${caseId}` },
    referenceOutputs: {
      expectedBehavior: `Behavior ${caseId}`,
      expectedAnswerOrRubric: `Rubric ${caseId}`,
      expectedDocumentIds: ["DOC-001"],
    },
    metadata: {
      caseId,
      description: `[${caseId}] Test case`,
      sourceFile: "RAG-Ecommercedataset.csv",
      sourceRowNumber: 4,
      categories: ["payment"],
      scenarioType: "normal",
      evaluationTargets: ["retrieval"],
      failureCategories: ["incorrect_policy_information"],
      scoringMethods: ["llm_rubric"],
    },
  };
}

function storedExample(id: string, example: DemoShopDatasetExample) {
  return {
    id,
    inputs: example.inputs,
    referenceOutputs: example.referenceOutputs,
    metadata: example.metadata,
  };
}
