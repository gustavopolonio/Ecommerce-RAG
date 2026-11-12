import { describe, expect, it } from "vitest";

import {
  DEFAULT_EVALUATION_EXPERIMENT_PREFIX,
  DEFAULT_EVALUATION_MAX_CONCURRENCY,
  DEFAULT_EVALUATION_REPORT_DIRECTORY,
  DEFAULT_LANGSMITH_DATASET_NAME,
  getAppConfig,
  getEvaluationExperimentConfig,
  getLangSmithDatasetConfig,
  getLangSmithDatasetName,
  getLangSmithConfig,
  getOpenAIConfig,
  getOpenAIJudgeConfig,
  getServerConfig,
} from "./env.js";

describe("getEvaluationExperimentConfig", () => {
  it("uses safe, repeatable local defaults", () => {
    expect(getEvaluationExperimentConfig({})).toEqual({
      experimentPrefix: DEFAULT_EVALUATION_EXPERIMENT_PREFIX,
      maxConcurrency: DEFAULT_EVALUATION_MAX_CONCURRENCY,
      reportDirectory: DEFAULT_EVALUATION_REPORT_DIRECTORY,
    });
  });

  it("accepts explicit experiment settings", () => {
    expect(
      getEvaluationExperimentConfig({
        EVALUATION_EXPERIMENT_PREFIX: " baseline-v1 ",
        EVALUATION_MAX_CONCURRENCY: " 4 ",
        EVALUATION_REPORT_DIRECTORY: " artifacts/evaluations ",
      }),
    ).toEqual({
      experimentPrefix: "baseline-v1",
      maxConcurrency: 4,
      reportDirectory: "artifacts/evaluations",
    });
  });

  it.each(["0", "-1", "1.5", "many"])(
    "rejects invalid evaluation concurrency: %s",
    (value) => {
      expect(() =>
        getEvaluationExperimentConfig({ EVALUATION_MAX_CONCURRENCY: value }),
      ).toThrow("EVALUATION_MAX_CONCURRENCY must be a positive integer");
    },
  );
});

describe("getLangSmithDatasetConfig", () => {
  it("uses a stable default name for local dry runs", () => {
    expect(getLangSmithDatasetName({})).toBe(
      DEFAULT_LANGSMITH_DATASET_NAME,
    );
    expect(
      getLangSmithDatasetName({
        LANGSMITH_DATASET_NAME: " custom-dataset ",
      }),
    ).toBe("custom-dataset");
  });

  it("reads the credentials and routing used by dataset uploads", () => {
    expect(
      getLangSmithDatasetConfig({
        LANGSMITH_API_KEY: " secret ",
        LANGSMITH_ENDPOINT: " https://example.test ",
        LANGSMITH_WORKSPACE_ID: " workspace-1 ",
        LANGSMITH_DATASET_NAME: " DemoShop cases ",
      }),
    ).toEqual({
      apiKey: "secret",
      apiUrl: "https://example.test",
      workspaceId: "workspace-1",
      datasetName: "DemoShop cases",
    });
  });

  it("requires an API key only for the upload configuration", () => {
    expect(() => getLangSmithDatasetConfig({})).toThrow(
      "LANGSMITH_API_KEY is required",
    );
  });
});

describe("getServerConfig", () => {
  it("uses local defaults and accepts explicit server settings", () => {
    expect(getServerConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3001,
    });
    expect(getServerConfig({ HOST: " 0.0.0.0 ", PORT: " 4100 " })).toEqual({
      host: "0.0.0.0",
      port: 4100,
    });
  });

  it.each(["0", "65536", "12.5", "not-a-number"])(
    "rejects an invalid port: %s",
    (port) => {
      expect(() => getServerConfig({ PORT: port })).toThrow(
        "PORT must be an integer between 1 and 65535",
      );
    },
  );
});

describe("getOpenAIConfig", () => {
  it("reads and trims the OpenAI configuration", () => {
    expect(
      getOpenAIConfig({
        OPENAI_API_KEY: " secret ",
        OPENAI_MODEL: " test-model ",
        OPENAI_VECTOR_STORE_ID: " vs-demo ",
      }),
    ).toEqual({
      apiKey: "secret",
      model: "test-model",
      vectorStoreId: "vs-demo",
    });
  });

  it("rejects an incomplete configuration before an API call", () => {
    expect(() =>
      getOpenAIConfig({
        OPENAI_API_KEY: "secret",
        OPENAI_MODEL: "test-model",
      }),
    ).toThrow("OPENAI_VECTOR_STORE_ID is required");
  });
});

describe("getOpenAIJudgeConfig", () => {
  it("uses a separate model for paid answer-quality judgments", () => {
    expect(
      getOpenAIJudgeConfig({
        OPENAI_API_KEY: " secret ",
        OPENAI_JUDGE_MODEL: " judge-model ",
      }),
    ).toEqual({ apiKey: "secret", model: "judge-model" });
  });

  it("requires an explicit judge model before a paid evaluation", () => {
    expect(() =>
      getOpenAIJudgeConfig({ OPENAI_API_KEY: "secret" }),
    ).toThrow("OPENAI_JUDGE_MODEL is required");
  });
});

describe("getLangSmithConfig", () => {
  it("keeps tracing off by default without requiring a key", () => {
    expect(getLangSmithConfig({})).toEqual({
      tracingEnabled: false,
    });
  });

  it("requires an API key only when tracing is enabled", () => {
    expect(() =>
      getLangSmithConfig({ LANGSMITH_TRACING: "true" }),
    ).toThrow("LANGSMITH_API_KEY is required");

    expect(
      getLangSmithConfig({
        LANGSMITH_TRACING: " true ",
        LANGSMITH_API_KEY: " ls-secret ",
        LANGSMITH_PROJECT: " learning-project ",
      }),
    ).toEqual({
      tracingEnabled: true,
      apiKey: "ls-secret",
      destination: {
        type: "project",
        project: "learning-project",
      },
    });
  });

  it("supports current agent addressing with a safe local default", () => {
    expect(
      getLangSmithConfig({
        LANGSMITH_TRACING: "true",
        LANGSMITH_API_KEY: "ls-secret",
        LANGSMITH_AGENT_ID: " agent-demo ",
      }),
    ).toEqual({
      tracingEnabled: true,
      apiKey: "ls-secret",
      destination: {
        type: "agent",
        agentId: "agent-demo",
        environment: "local",
      },
    });
  });

  it("rejects missing or conflicting trace destinations", () => {
    expect(() =>
      getLangSmithConfig({
        LANGSMITH_TRACING: "true",
        LANGSMITH_API_KEY: "ls-secret",
      }),
    ).toThrow("LANGSMITH_AGENT_ID or LANGSMITH_PROJECT");

    expect(() =>
      getLangSmithConfig({
        LANGSMITH_TRACING: "true",
        LANGSMITH_API_KEY: "ls-secret",
        LANGSMITH_AGENT_ID: "agent-demo",
        LANGSMITH_PROJECT: "project-demo",
      }),
    ).toThrow("not both");
  });

  it("rejects unknown agent environments", () => {
    expect(() =>
      getLangSmithConfig({
        LANGSMITH_TRACING: "true",
        LANGSMITH_API_KEY: "ls-secret",
        LANGSMITH_AGENT_ID: "agent-demo",
        LANGSMITH_AGENT_ENVIRONMENT: "preview",
      }),
    ).toThrow("must be local, development, staging, or production");
  });

  it("rejects ambiguous tracing values", () => {
    expect(() =>
      getLangSmithConfig({ LANGSMITH_TRACING: "yes" }),
    ).toThrow("LANGSMITH_TRACING must be either true or false");
  });
});

describe("getAppConfig", () => {
  it("combines OpenAI and LangSmith configuration", () => {
    expect(
      getAppConfig({
        OPENAI_API_KEY: "secret",
        OPENAI_MODEL: "test-model",
        OPENAI_VECTOR_STORE_ID: "vs-demo",
        LANGSMITH_TRACING: "false",
      }),
    ).toEqual({
      openAI: {
        apiKey: "secret",
        model: "test-model",
        vectorStoreId: "vs-demo",
      },
      langSmith: {
        tracingEnabled: false,
      },
    });
  });
});
