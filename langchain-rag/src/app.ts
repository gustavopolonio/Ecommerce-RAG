import Fastify, { type FastifyInstance } from "fastify";

import { chatRoutes, type ChatRoutesOptions } from "./routes/chat.js";
import { healthRoutes } from "./routes/health.js";

export interface BuildAppOptions {
  chat?: ChatRoutesOptions;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
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
