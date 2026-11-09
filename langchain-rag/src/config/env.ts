export interface OpenAIConfig {
  apiKey: string;
  model: string;
  vectorStoreId: string;
}

export interface LangSmithConfig {
  tracingEnabled: boolean;
  apiKey?: string;
  project: string;
}

export interface AppConfig {
  openAI: OpenAIConfig;
  langSmith: LangSmithConfig;
}

const DEFAULT_LANGSMITH_PROJECT = "demoshop-langchain-rag";

export function getAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppConfig {
  return {
    openAI: getOpenAIConfig(env),
    langSmith: getLangSmithConfig(env),
  };
}

export function getOpenAIConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpenAIConfig {
  return {
    apiKey: requireEnvironmentVariable(env, "OPENAI_API_KEY"),
    model: requireEnvironmentVariable(env, "OPENAI_MODEL"),
    vectorStoreId: requireEnvironmentVariable(
      env,
      "OPENAI_VECTOR_STORE_ID",
    ),
  };
}

export function getLangSmithConfig(
  env: NodeJS.ProcessEnv = process.env,
): LangSmithConfig {
  const tracingEnabled = parseBoolean(
    env.LANGSMITH_TRACING,
    "LANGSMITH_TRACING",
  );
  const project =
    env.LANGSMITH_PROJECT?.trim() || DEFAULT_LANGSMITH_PROJECT;

  if (!tracingEnabled) {
    return { tracingEnabled, project };
  }

  return {
    tracingEnabled,
    apiKey: requireEnvironmentVariable(env, "LANGSMITH_API_KEY"),
    project,
  };
}

function parseBoolean(value: string | undefined, name: string): boolean {
  if (value === undefined || value.trim() === "") {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new Error(`${name} must be either true or false.`);
}

function requireEnvironmentVariable(
  env: NodeJS.ProcessEnv,
  name:
    | "LANGSMITH_API_KEY"
    | "OPENAI_API_KEY"
    | "OPENAI_MODEL"
    | "OPENAI_VECTOR_STORE_ID",
): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required. Add it to langchain-rag/.env; never commit secrets.`,
    );
  }

  return value;
}
