const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

export interface ServerConfig {
  host: string;
  port: number;
}

export interface OpenAIRetrievalConfig {
  apiKey: string;
  vectorStoreId: string;
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function getServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  return {
    host: env.HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.PORT),
  };
}

export function getOpenAIRetrievalConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpenAIRetrievalConfig {
  return {
    apiKey: requireEnvironmentVariable(env, "OPENAI_API_KEY"),
    vectorStoreId: requireEnvironmentVariable(env, "OPENAI_VECTOR_STORE_ID"),
  };
}

function requireEnvironmentVariable(
  env: NodeJS.ProcessEnv,
  name: "OPENAI_API_KEY" | "OPENAI_VECTOR_STORE_ID",
): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required. Add it to your local .env file; never commit secrets.`,
    );
  }

  return value;
}
