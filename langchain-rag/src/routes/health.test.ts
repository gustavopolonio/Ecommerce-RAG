import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe("GET /health", () => {
  it("reports that the HTTP server is healthy", async () => {
    const app = buildApp({ logger: false });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(response.headers["content-type"]).toContain("application/json");
  });
});
