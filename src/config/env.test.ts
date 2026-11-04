import { describe, expect, it } from "vitest";

import { getOpenAIRetrievalConfig, getServerConfig } from "./env.js";

describe("getServerConfig", () => {
  it("uses safe local defaults", () => {
    expect(getServerConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3000,
    });
  });

  it("reads HOST and PORT from the environment", () => {
    expect(getServerConfig({ HOST: "0.0.0.0", PORT: "8080" })).toEqual({
      host: "0.0.0.0",
      port: 8080,
    });
  });

  it("rejects an invalid port", () => {
    expect(() => getServerConfig({ PORT: "not-a-port" })).toThrow(
      "PORT must be an integer between 1 and 65535.",
    );
  });
});

describe("getOpenAIRetrievalConfig", () => {
  it("reads and trims the retrieval configuration", () => {
    expect(
      getOpenAIRetrievalConfig({
        OPENAI_API_KEY: " secret ",
        OPENAI_VECTOR_STORE_ID: " vs-demo ",
      }),
    ).toEqual({
      apiKey: "secret",
      vectorStoreId: "vs-demo",
    });
  });

  it("rejects an incomplete retrieval configuration", () => {
    expect(() =>
      getOpenAIRetrievalConfig({
        OPENAI_API_KEY: "secret",
      }),
    ).toThrow("OPENAI_VECTOR_STORE_ID is required");
  });
});
