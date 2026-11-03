import "dotenv/config";

import { buildApp } from "./app.js";
import { getServerConfig } from "./config/env.js";

const app = buildApp();

try {
  const config = getServerConfig();
  await app.listen(config);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
