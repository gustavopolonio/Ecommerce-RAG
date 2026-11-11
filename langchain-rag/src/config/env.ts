export interface OpenAIConfig {
  apiKey: string;
  model: string;
  vectorStoreId: string;
}

export interface ServerConfig {
  host: string;
  port: number;
}

export interface LangSmithDatasetConfig {
  apiKey: string;
  apiUrl?: string;
  workspaceId?: string;
  datasetName: string;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3001;
export const DEFAULT_LANGSMITH_DATASET_NAME = "demoshop-rag-evaluation";

export type LangSmithAgentEnvironment =
  | "local"
  | "development"
  | "staging"
  | "production";

export type LangSmithConfig =
  | { tracingEnabled: false }
  | {
      tracingEnabled: true;
      apiKey: string;
      destination:
        | { type: "project"; project: string }
        | {
            type: "agent";
            agentId: string;
            environment: LangSmithAgentEnvironment;
          };
    };

export interface AppConfig {
  openAI: OpenAIConfig;
  langSmith: LangSmithConfig;
}

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

export function getServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  return {
    host: env.HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.PORT),
  };
}

export function getLangSmithDatasetName(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    env.LANGSMITH_DATASET_NAME?.trim() || DEFAULT_LANGSMITH_DATASET_NAME
  );
}

export function getLangSmithDatasetConfig(
  env: NodeJS.ProcessEnv = process.env,
): LangSmithDatasetConfig {
  const apiUrl = env.LANGSMITH_ENDPOINT?.trim();
  const workspaceId = env.LANGSMITH_WORKSPACE_ID?.trim();

  return {
    apiKey: requireEnvironmentVariable(env, "LANGSMITH_API_KEY"),
    datasetName: getLangSmithDatasetName(env),
    ...(apiUrl ? { apiUrl } : {}),
    ...(workspaceId ? { workspaceId } : {}),
  };
}

export function getLangSmithConfig(
  env: NodeJS.ProcessEnv = process.env,
): LangSmithConfig {
  const tracingEnabled = parseBoolean(
    env.LANGSMITH_TRACING,
    "LANGSMITH_TRACING",
  );
  if (!tracingEnabled) {
    return { tracingEnabled };
  }

  const apiKey = requireEnvironmentVariable(env, "LANGSMITH_API_KEY");
  const agentId = env.LANGSMITH_AGENT_ID?.trim();
  const project = env.LANGSMITH_PROJECT?.trim();

  if (agentId && project) {
    throw new Error(
      "Choose one LangSmith destination: LANGSMITH_AGENT_ID or LANGSMITH_PROJECT, not both.",
    );
  }

  if (agentId) {
    return {
      tracingEnabled,
      apiKey,
      destination: {
        type: "agent",
        agentId,
        environment: parseLangSmithAgentEnvironment(
          env.LANGSMITH_AGENT_ENVIRONMENT,
        ),
      },
    };
  }

  if (project) {
    return {
      tracingEnabled,
      apiKey,
      destination: { type: "project", project },
    };
  }

  throw new Error(
    "Tracing requires LANGSMITH_AGENT_ID or LANGSMITH_PROJECT.",
  );
}

function parseLangSmithAgentEnvironment(
  value: string | undefined,
): LangSmithAgentEnvironment {
  const environment = value?.trim() || "local";
  const supportedEnvironments: LangSmithAgentEnvironment[] = [
    "local",
    "development",
    "staging",
    "production",
  ];

  if (
    !supportedEnvironments.includes(
      environment as LangSmithAgentEnvironment,
    )
  ) {
    throw new Error(
      "LANGSMITH_AGENT_ENVIRONMENT must be local, development, staging, or production.",
    );
  }

  return environment as LangSmithAgentEnvironment;
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
