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
      project: "demoshop-langchain-rag",
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
      project: "learning-project",
    });
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
        project: "demoshop-langchain-rag",
      },
    });
  });
});
