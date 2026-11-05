import Fastify, { type FastifyInstance } from "fastify";

import { healthRoutes } from "./routes/health.js";
import { chatRoutes, type ChatRoutesOptions } from "./routes/chat.js";

export interface BuildAppOptions {
  chat?: ChatRoutesOptions;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: false,
      },
    },
  });

  app.register(healthRoutes);
  app.register(chatRoutes, options.chat ?? {});

  return app;
}
