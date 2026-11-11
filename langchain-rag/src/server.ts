import "dotenv/config";

import { buildApp } from "./app.js";
import { getServerConfig } from "./config/env.js";

const app = buildApp();

try {
  await app.listen(getServerConfig());
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
