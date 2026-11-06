module.exports = function deterministicAssertion(output, context) {
  const config = context.config ?? {};

  switch (config.rule) {
    case "exact_bullet_count":
      return exactBulletCount(output, config.count);
    case "contains_all":
      return containsAll(output, config.values);
    case "json_sku_set":
      return jsonSkuSet(output, config.expectedSkus);
    case "json_product_set":
      return jsonProductSet(
        output,
        config.expectedProducts,
        config.allowedFields,
      );
    case "shipping_markdown_table":
      return shippingMarkdownTable(output);
    default:
      return failure(`Unknown deterministic assertion rule: ${config.rule}.`);
  }
};

function exactBulletCount(output, expectedCount) {
  const bulletLines = String(output)
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(line));
  const pass = bulletLines.length === expectedCount;

  return result(
    pass,
    `Expected exactly ${expectedCount} bullet points; found ${bulletLines.length}.`,
  );
}

function containsAll(output, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return failure("contains_all requires one or more values.");
  }

  const normalizedOutput = String(output).toLowerCase();
  const missing = values.filter(
    (value) => !normalizedOutput.includes(String(value).toLowerCase()),
  );

  return result(
    missing.length === 0,
    missing.length === 0
      ? `Output contained all required values: ${values.join(", ")}.`
      : `Output was missing required values: ${missing.join(", ")}.`,
  );
}

function jsonSkuSet(output, expectedSkus) {
  const parsed = parseJsonArray(output);

  if (!parsed.ok) {
    return failure(parsed.reason);
  }

  const actualSkus = parsed.value.map(readSku);

  if (actualSkus.some((sku) => sku === null)) {
    return failure("Every JSON array item must contain a SKU field.");
  }

  return exactSetResult(actualSkus, expectedSkus, "SKUs");
}

function jsonProductSet(output, expectedProducts, allowedFields) {
  const parsed = parseJsonArray(output);

  if (!parsed.ok) {
    return failure(parsed.reason);
  }

  if (!Array.isArray(expectedProducts) || !Array.isArray(allowedFields)) {
    return failure("json_product_set has invalid assertion configuration.");
  }

  if (parsed.value.length !== expectedProducts.length) {
    return failure(
      `Expected ${expectedProducts.length} products; found ${parsed.value.length}.`,
    );
  }

  const normalizedAllowedFields = allowedFields.map((field) =>
    String(field).toLowerCase(),
  );

  for (const expected of expectedProducts) {
    const actual = parsed.value.find((item) => readSku(item) === expected.sku);

    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      return failure(`Missing expected product ${expected.sku}.`);
    }

    const normalized = Object.fromEntries(
      Object.entries(actual).map(([key, value]) => [key.toLowerCase(), value]),
    );
    const fields = Object.keys(normalized).sort();
    const expectedFields = [...normalizedAllowedFields].sort();

    if (JSON.stringify(fields) !== JSON.stringify(expectedFields)) {
      return failure(
        `Product ${expected.sku} must contain only: ${allowedFields.join(", ")}.`,
      );
    }

    if (
      normalized.sku !== expected.sku ||
      normalized.name !== expected.name ||
      Number(normalized.price) !== expected.price
    ) {
      return failure(`Product ${expected.sku} contained incorrect values.`);
    }
  }

  return result(true, "JSON contained the exact expected product set and fields.");
}

function shippingMarkdownTable(output) {
  const rows = String(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (rows.length < 4) {
    return failure("Expected a Markdown table header, separator, and two rows.");
  }

  const normalized = rows.join("\n").toLowerCase().replaceAll("–", "-");
  const required = [
    "method",
    "price",
    "estimated delivery",
    "standard",
    "$5",
    "5-8",
    "express",
    "$12",
    "2-3",
  ];
  const missing = required.filter((value) => !normalized.includes(value));

  return result(
    missing.length === 0,
    missing.length === 0
      ? "Markdown table contained both shipping methods and expected values."
      : `Markdown table was missing: ${missing.join(", ")}.`,
  );
}

function parseJsonArray(output) {
  try {
    const value = JSON.parse(String(output));

    if (!Array.isArray(value)) {
      return { ok: false, reason: "Output must be a JSON array." };
    }

    return { ok: true, value };
  } catch {
    return { ok: false, reason: "Output was not valid JSON." };
  }
}

function readSku(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return null;
  }

  const entry = Object.entries(item).find(
    ([key]) => key.toLowerCase() === "sku",
  );
  return typeof entry?.[1] === "string" ? entry[1] : null;
}

function exactSetResult(actual, expected, label) {
  if (!Array.isArray(expected)) {
    return failure(`Expected ${label} were not configured.`);
  }

  const actualSet = [...new Set(actual)].sort();
  const expectedSet = [...new Set(expected)].sort();
  const pass =
    actual.length === expected.length &&
    JSON.stringify(actualSet) === JSON.stringify(expectedSet);

  return result(
    pass,
    pass
      ? `Output contained exactly the expected ${label}.`
      : `Expected ${label}: ${expectedSet.join(", ")}; received: ${actualSet.join(", ")}.`,
  );
}

function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

function failure(reason) {
  return result(false, reason);
}
