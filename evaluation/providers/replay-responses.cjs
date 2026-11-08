const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

module.exports = class ReplayResponsesProvider {
  constructor(options) {
    const config = options.config ?? {};

    if (typeof config.providerId !== "string" || config.providerId === "") {
      throw new Error("Replay provider requires config.providerId.");
    }

    if (
      typeof config.responsesFile !== "string" ||
      config.responsesFile === ""
    ) {
      throw new Error("Replay provider requires config.responsesFile.");
    }

    this.providerId = config.providerId;
    this.responsesFile = resolve(process.cwd(), config.responsesFile);
    const responses = JSON.parse(readFileSync(this.responsesFile, "utf8"));

    if (!Array.isArray(responses)) {
      throw new Error(`${this.responsesFile} must contain a JSON array.`);
    }

    this.responses = new Map(
      responses.map((response) => [response.id, response]),
    );
  }

  id() {
    return `replay:${this.providerId}`;
  }

  async callApi(_prompt, context) {
    const caseId = context.vars?.caseId;
    const response = this.responses.get(caseId);

    if (!response || typeof response.answer !== "string") {
      return {
        error: `No ${this.providerId} response was stored for case ${caseId}.`,
      };
    }

    return {
      output: response.answer,
      metadata: {
        caseId,
        replaySource: this.responsesFile,
      },
    };
  }
};
