import { describe, expect, it } from "vitest";

import {
  loadExistingExperiment,
  type ExistingExperimentGateway,
} from "./load-existing-experiment.js";

describe("loadExistingExperiment", () => {
  it("reconstructs ordered report rows from existing LangSmith data", async () => {
    const gateway = createGateway();
    const result = await loadExistingExperiment(gateway, "experiment-1");

    expect(result.experiment).toEqual({
      projectId: "project-1",
      datasetId: "dataset-1",
      name: "experiment-1",
      metadata: { ragModel: "rag-model", judgeModel: "judge-model" },
      startedAt: "2026-11-11T00:00:00.000Z",
    });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.example.metadata?.caseId)).toEqual([
      "001",
      "002",
    ]);
    expect(result.rows[0]?.evaluationResults.results).toEqual([
      {
        key: "retrieval_recall_at_5",
        score: 1,
        comment: "All documents found.",
      },
    ]);
  });

  it("rejects runs that are not connected to dataset examples", async () => {
    const gateway = createGateway();
    gateway.listRootRuns = async function* () {
      yield { id: "run-without-example" };
    };

    await expect(
      loadExistingExperiment(gateway, "experiment-1"),
    ).rejects.toThrow("is not linked to a dataset example");
  });

  it("rejects an incomplete example lookup", async () => {
    const gateway = createGateway();
    gateway.listExamples = async function* () {};

    await expect(
      loadExistingExperiment(gateway, "experiment-1"),
    ).rejects.toThrow("Could not load dataset example");
  });
});

function createGateway(): ExistingExperimentGateway {
  return {
    readExperiment: async (name) => ({
      projectId: "project-1",
      datasetId: "dataset-1",
      name,
      metadata: { ragModel: "rag-model", judgeModel: "judge-model" },
      startedAt: "2026-11-11T00:00:00.000Z",
    }),
    listRootRuns: async function* () {
      yield {
        id: "run-2",
        referenceExampleId: "example-2",
        outputs: { answer: "Second" },
      };
      yield {
        id: "run-1",
        referenceExampleId: "example-1",
        outputs: { answer: "First" },
      };
    },
    listExamples: async function* () {
      yield {
        id: "example-1",
        inputs: { question: "First?" },
        metadata: { caseId: "001" },
      };
      yield {
        id: "example-2",
        inputs: { question: "Second?" },
        metadata: { caseId: "002" },
      };
    },
    listFeedback: async function* () {
      yield {
        runId: "run-1",
        key: "retrieval_recall_at_5",
        score: 1,
        comment: "All documents found.",
      };
    },
  };
}
