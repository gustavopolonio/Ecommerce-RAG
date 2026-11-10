import { describe, expect, it } from "vitest";

import {
  getAppConfig,
  getLangSmithConfig,
  getOpenAIConfig,
} from "./env.js";

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
