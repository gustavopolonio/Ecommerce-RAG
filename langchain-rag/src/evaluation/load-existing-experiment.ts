import { Client } from "langsmith";

import type { EvaluationExperimentRow } from "./evaluation-report.js";

interface StoredExperiment {
  projectId: string;
  datasetId: string;
  name: string;
  metadata: Record<string, unknown>;
  startedAt: string;
}

interface StoredRun {
  id: string;
  referenceExampleId?: string;
  outputs?: Record<string, unknown>;
  error?: string;
}

interface StoredExample {
  id: string;
  inputs: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface StoredFeedback {
  runId: string;
  key: string;
  score: number | boolean | null;
  comment: string | null;
}

export interface ExistingExperimentGateway {
  readExperiment(experimentName: string): Promise<StoredExperiment>;
  listRootRuns(experiment: StoredExperiment): AsyncIterable<StoredRun>;
  listExamples(
    datasetId: string,
    exampleIds: string[],
  ): AsyncIterable<StoredExample>;
  listFeedback(runIds: string[]): AsyncIterable<StoredFeedback>;
}

export interface ExistingExperimentData {
  experiment: StoredExperiment;
  rows: EvaluationExperimentRow[];
}

export function createExistingExperimentGateway(
  client: Client,
): ExistingExperimentGateway {
  return {
    readExperiment: async (experimentName) => {
      const project = await client.readProject({ projectName: experimentName });
      const extra = isRecord(project.extra) ? project.extra : {};
      const metadata = isRecord(extra.metadata) ? extra.metadata : extra;

      if (!project.reference_dataset_id) {
        throw new Error(
          `Experiment ${experimentName} is not linked to a reference dataset.`,
        );
      }

      return {
        projectId: project.id,
        datasetId: project.reference_dataset_id,
        name: project.name ?? experimentName,
        metadata,
        startedAt: toIsoTimestamp(project.start_time),
      };
    },
    listRootRuns: async function* (experiment) {
      for await (const run of client.runs.query({
        project_ids: [experiment.projectId],
        is_root: true,
        min_start_time: experiment.startedAt,
        selects: ["ID", "OUTPUTS", "ERROR", "REFERENCE_EXAMPLE_ID"],
      })) {
        if (!run.id) {
          throw new Error("LangSmith returned an experiment run without an ID.");
        }

        yield {
          id: run.id,
          ...(run.reference_example_id
            ? { referenceExampleId: run.reference_example_id }
            : {}),
          ...(run.outputs ? { outputs: run.outputs } : {}),
          ...(run.error ? { error: run.error } : {}),
        };
      }
    },
    listExamples: async function* (datasetId, exampleIds) {
      for await (const example of client.listExamples({
        datasetId,
        exampleIds,
      })) {
        yield {
          id: example.id,
          inputs: example.inputs,
          ...(example.metadata ? { metadata: example.metadata } : {}),
        };
      }
    },
    listFeedback: async function* (runIds) {
      for await (const feedback of client.listFeedback({ runIds })) {
        yield {
          runId: feedback.run_id,
          key: feedback.key,
          score: feedback.score,
          comment: feedback.comment,
        };
      }
    },
  };
}

export async function loadExistingExperiment(
  gateway: ExistingExperimentGateway,
  experimentName: string,
): Promise<ExistingExperimentData> {
  const experiment = await gateway.readExperiment(experimentName);
  const runs: StoredRun[] = [];

  for await (const run of gateway.listRootRuns(experiment)) {
    if (!run.referenceExampleId) {
      throw new Error(
        `Experiment run ${run.id} is not linked to a dataset example.`,
      );
    }

    runs.push(run);
  }

  if (runs.length === 0) {
    throw new Error(`Experiment ${experimentName} contains no root runs.`);
  }

  const exampleIds = [...new Set(runs.map(({ referenceExampleId }) => referenceExampleId!))];
  const examples = new Map<string, StoredExample>();

  for await (const example of gateway.listExamples(
    experiment.datasetId,
    exampleIds,
  )) {
    examples.set(example.id, example);
  }

  const feedbackByRun = new Map<string, StoredFeedback[]>();
  const feedbackKeys = new Set<string>();

  for await (const feedback of gateway.listFeedback(runs.map(({ id }) => id))) {
    const uniqueKey = `${feedback.runId}:${feedback.key}`;

    if (feedbackKeys.has(uniqueKey)) {
      throw new Error(
        `Experiment contains duplicate feedback ${feedback.key} for run ${feedback.runId}.`,
      );
    }

    feedbackKeys.add(uniqueKey);
    const stored = feedbackByRun.get(feedback.runId) ?? [];
    stored.push(feedback);
    feedbackByRun.set(feedback.runId, stored);
  }

  const rows = runs.map((run): EvaluationExperimentRow => {
    const example = examples.get(run.referenceExampleId!);

    if (!example) {
      throw new Error(
        `Could not load dataset example ${run.referenceExampleId} for run ${run.id}.`,
      );
    }

    return {
      run: {
        id: run.id,
        ...(run.outputs ? { outputs: run.outputs } : {}),
        ...(run.error ? { error: run.error } : {}),
      },
      example,
      evaluationResults: {
        results: (feedbackByRun.get(run.id) ?? []).map((feedback) => ({
          key: feedback.key,
          score: feedback.score,
          ...(feedback.comment ? { comment: feedback.comment } : {}),
        })),
      },
    };
  });

  rows.sort((left, right) => readCaseId(left).localeCompare(readCaseId(right)));

  return { experiment, rows };
}

function readCaseId(row: EvaluationExperimentRow): string {
  return typeof row.example.metadata?.caseId === "string"
    ? row.example.metadata.caseId
    : row.example.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toIsoTimestamp(value: number | string): string {
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  const milliseconds = value < 10_000_000_000 ? value * 1_000 : value;
  return new Date(milliseconds).toISOString();
}
