import "dotenv/config";

import { getAppConfig } from "../config/env.js";
import { createConfiguredDemoShopRagChain } from "../rag/demo-shop-rag-chain.js";

const question = process.argv.slice(2).join(" ").trim();

if (!question) {
  throw new Error(
    'Provide one question, for example: npm run trace:smoke -- "Can I pay by Pix?"',
  );
}

const config = getAppConfig();

if (!config.langSmith.tracingEnabled) {
  throw new Error(
    "LANGSMITH_TRACING must be true for the live tracing smoke test.",
  );
}

// A CLI process is short-lived, so wait for trace callbacks before exiting.
process.env.LANGCHAIN_CALLBACKS_BACKGROUND ??= "false";

const chain = await createConfiguredDemoShopRagChain(config.openAI);
const result = await chain.invoke(question);

console.log(JSON.stringify(result, null, 2));
