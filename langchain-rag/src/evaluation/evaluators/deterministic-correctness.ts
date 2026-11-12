import type { EvaluationResult } from "langsmith/evaluation";

export const DETERMINISTIC_CORRECTNESS_KEY = "deterministic_correctness";

type DeterministicRule =
  | { type: "exact_bullet_count"; count: number }
  | { type: "contains_all"; values: string[] }
  | { type: "json_sku_set"; expectedSkus: string[] }
  | {
      type: "json_product_set";
      expectedProducts: Array<{ sku: string; name: string; price: number }>;
      allowedFields: string[];
    }
  | { type: "shipping_markdown_table" };

export interface DeterministicEvaluatorArguments {
  outputs: Record<string, unknown>;
  example: {
    metadata?: Record<string, unknown> | null;
  };
}

const DETERMINISTIC_RULES = {
  "006": { type: "exact_bullet_count", count: 3 },
  "011": { type: "contains_all", values: ["book"] },
  "013": {
    type: "json_sku_set",
    expectedSkus: [
      "BK-101",
      "AC-201",
      "AC-202",
      "ST-301",
      "ST-302",
      "EL-401",
      "AC-203",
    ],
  },
  "022": {
    type: "contains_all",
    values: ["$60", "paid in full"],
  },
  "027": {
    type: "contains_all",
    values: ["$74.99", "$75", "$5"],
  },
  "033": {
    type: "contains_all",
    values: ["Adjustable Reading Lamp"],
  },
  "035": {
    type: "json_product_set",
    expectedProducts: [
      { sku: "EL-401", name: "Wireless Mouse", price: 25 },
    ],
    allowedFields: ["sku", "name", "price"],
  },
  "038": { type: "shipping_markdown_table" },
} satisfies Record<string, DeterministicRule>;

export function deterministicCorrectnessEvaluator({
  outputs,
  example,
}: DeterministicEvaluatorArguments): EvaluationResult {
  const scoringMethods = example.metadata?.scoringMethods;

  if (!isStringArray(scoringMethods)) {
    return result(
      0,
      "Deterministic correctness could not run because scoringMethods is missing or invalid.",
    );
  }

  if (!scoringMethods.includes("deterministic")) {
    return result(
      null,
      "Deterministic correctness is not applicable to this case.",
    );
  }

  const caseId = example.metadata?.caseId;

  if (typeof caseId !== "string") {
    return result(
      0,
      "Deterministic correctness could not run because caseId is missing or invalid.",
    );
  }

  const rule = readRule(caseId);

  if (!rule) {
    return result(
      0,
      `No deterministic rule is configured for case ${caseId}.`,
    );
  }

  if (typeof outputs.answer !== "string") {
    return result(
      0,
      "Deterministic correctness could not find a string answer in the target output.",
    );
  }

  return applyRule(outputs.answer, rule);
}

function readRule(caseId: string): DeterministicRule | undefined {
  return (DETERMINISTIC_RULES as Record<string, DeterministicRule>)[caseId];
}

function applyRule(answer: string, rule: DeterministicRule): EvaluationResult {
  switch (rule.type) {
    case "exact_bullet_count":
      return exactBulletCount(answer, rule.count);
    case "contains_all":
      return containsAll(answer, rule.values);
    case "json_sku_set":
      return jsonSkuSet(answer, rule.expectedSkus);
    case "json_product_set":
      return jsonProductSet(
        answer,
        rule.expectedProducts,
        rule.allowedFields,
      );
    case "shipping_markdown_table":
      return shippingMarkdownTable(answer);
  }
}

function exactBulletCount(answer: string, expectedCount: number) {
  const bulletLines = answer
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(line));
  const pass = bulletLines.length === expectedCount;

  return passFailResult(
    pass,
    `Expected exactly ${expectedCount} bullet points; found ${bulletLines.length}.`,
  );
}

function containsAll(answer: string, values: string[]) {
  const normalizedAnswer = answer.toLowerCase();
  const missing = values.filter(
    (value) => !normalizedAnswer.includes(value.toLowerCase()),
  );

  return passFailResult(
    missing.length === 0,
    missing.length === 0
      ? `Answer contained all required values: ${values.join(", ")}.`
      : `Answer was missing required values: ${missing.join(", ")}.`,
  );
}

function jsonSkuSet(answer: string, expectedSkus: string[]) {
  const parsed = parseJsonArray(answer);

  if (!parsed.ok) {
    return result(0, parsed.comment);
  }

  const actualSkus = parsed.value.map(readSku);

  if (actualSkus.some((sku) => sku === null)) {
    return result(0, "Every JSON array item must contain a SKU field.");
  }

  return exactSetResult(actualSkus as string[], expectedSkus, "SKUs");
}

function jsonProductSet(
  answer: string,
  expectedProducts: Array<{ sku: string; name: string; price: number }>,
  allowedFields: string[],
) {
  const parsed = parseJsonArray(answer);

  if (!parsed.ok) {
    return result(0, parsed.comment);
  }

  if (parsed.value.length !== expectedProducts.length) {
    return result(
      0,
      `Expected ${expectedProducts.length} products; found ${parsed.value.length}.`,
    );
  }

  const normalizedAllowedFields = allowedFields.map((field) =>
    field.toLowerCase(),
  );

  for (const expected of expectedProducts) {
    const actual = parsed.value.find((item) => readSku(item) === expected.sku);

    if (!isRecord(actual)) {
      return result(0, `Missing expected product ${expected.sku}.`);
    }

    const normalized = Object.fromEntries(
      Object.entries(actual).map(([key, value]) => [key.toLowerCase(), value]),
    );
    const fields = Object.keys(normalized).sort();
    const expectedFields = [...normalizedAllowedFields].sort();

    if (JSON.stringify(fields) !== JSON.stringify(expectedFields)) {
      return result(
        0,
        `Product ${expected.sku} must contain only: ${allowedFields.join(", ")}.`,
      );
    }

    if (
      normalized.sku !== expected.sku ||
      normalized.name !== expected.name ||
      Number(normalized.price) !== expected.price
    ) {
      return result(0, `Product ${expected.sku} contained incorrect values.`);
    }
  }

  return result(1, "JSON contained the exact expected product set and fields.");
}

function shippingMarkdownTable(answer: string) {
  const rows = answer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (rows.length < 4) {
    return result(0, "Expected a Markdown table header, separator, and two rows.");
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

  return passFailResult(
    missing.length === 0,
    missing.length === 0
      ? "Markdown table contained both shipping methods and expected values."
      : `Markdown table was missing: ${missing.join(", ")}.`,
  );
}

function parseJsonArray(
  answer: string,
): { ok: true; value: unknown[] } | { ok: false; comment: string } {
  try {
    const value: unknown = JSON.parse(answer);

    return Array.isArray(value)
      ? { ok: true, value }
      : { ok: false, comment: "Answer must be a JSON array." };
  } catch {
    return { ok: false, comment: "Answer was not valid JSON." };
  }
}

function readSku(item: unknown): string | null {
  if (!isRecord(item)) {
    return null;
  }

  const entry = Object.entries(item).find(
    ([key]) => key.toLowerCase() === "sku",
  );
  return typeof entry?.[1] === "string" ? entry[1] : null;
}

function exactSetResult(actual: string[], expected: string[], label: string) {
  const actualSet = [...new Set(actual)].sort();
  const expectedSet = [...new Set(expected)].sort();
  const pass =
    actual.length === expected.length &&
    JSON.stringify(actualSet) === JSON.stringify(expectedSet);

  return passFailResult(
    pass,
    pass
      ? `Answer contained exactly the expected ${label}.`
      : `Expected ${label}: ${expectedSet.join(", ")}; received: ${actualSet.join(", ")}.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function passFailResult(pass: boolean, comment: string): EvaluationResult {
  return result(pass ? 1 : 0, comment);
}

function result(score: number | null, comment: string): EvaluationResult {
  return {
    key: DETERMINISTIC_CORRECTNESS_KEY,
    score,
    comment,
  };
}
