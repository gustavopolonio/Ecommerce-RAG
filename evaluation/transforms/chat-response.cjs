module.exports = function transformChatResponse(json) {
  if (!json || typeof json !== "object") {
    throw new Error("DemoShop /chat did not return a JSON object.");
  }

  if (typeof json.message !== "string" || json.message.trim() === "") {
    throw new Error("DemoShop /chat returned an empty or invalid message.");
  }

  if (!Array.isArray(json.sources)) {
    throw new Error("DemoShop /chat did not return a sources array.");
  }

  const usage = json.usage;

  if (
    !usage ||
    typeof usage.inputTokens !== "number" ||
    typeof usage.outputTokens !== "number" ||
    typeof usage.totalTokens !== "number"
  ) {
    throw new Error("DemoShop /chat returned invalid token usage.");
  }

  if (typeof json.latencyMs !== "number") {
    throw new Error("DemoShop /chat returned invalid latency.");
  }

  return {
    output: json.message,
    tokenUsage: {
      prompt: usage.inputTokens,
      completion: usage.outputTokens,
      total: usage.totalTokens,
    },
    metadata: {
      sources: json.sources,
      applicationLatencyMs: json.latencyMs,
    },
  };
};
