import { readFile } from "node:fs/promises";

import { parse } from "csv-parse/sync";

import {
  EVALUATION_CATEGORIES,
  EVALUATION_TARGETS,
  SCENARIO_TYPES,
  type EvaluationCase,
  type ScoringMethod,
} from "./evaluation-case.js";

export const EXPECTED_EVALUATION_CASE_COUNT = 40;

interface RawEvaluationRow {
  id: string;
  category: string;
  prompt: string;
  expectedBehavior: string;
  scenarioType: string;
  evaluationTarget: string;
  documentId: string;
  expectedAnswerOrRubric: string;
  failureCategory: string;
  scoringMethod: string;
}

const REQUIRED_COLUMNS = {
  id: ["id"],
  category: ["category"],
  prompt: ["prompt"],
  expectedBehavior: ["expected behavior"],
  scenarioType: ["scenario type"],
  evaluationTarget: ["evaluation target"],
  documentId: ["document id"],
  expectedAnswerOrRubric: [
    "expected answer/rucbric",
    "expected answer/rubric",
  ],
  failureCategory: ["failure category"],
  scoringMethod: ["scoring method"],
} as const;

export async function loadEvaluationDataset(
  csvPath: string,
): Promise<EvaluationCase[]> {
  const csv = await readFile(csvPath, "utf8");
  const cases = parseEvaluationDataset(csv);

  if (cases.length !== EXPECTED_EVALUATION_CASE_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_EVALUATION_CASE_COUNT} evaluation cases, found ${cases.length}.`,
    );
  }

  return cases;
}

export function parseEvaluationDataset(csv: string): EvaluationCase[] {
  const rows = parse(csv, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];
  const headerIndex = rows.findIndex(isHeaderRow);

  if (headerIndex === -1) {
    throw new Error("Could not find the evaluation dataset header row.");
  }

  const columnIndexes = buildColumnIndexes(rows[headerIndex] ?? []);
  const cases = rows
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row, index) => {
      const sourceRowNumber = headerIndex + index + 2;
      return convertRow(readRawRow(row, columnIndexes), sourceRowNumber);
    });

  assertUniqueIds(cases);
  return cases;
}

function isHeaderRow(row: string[]): boolean {
  const normalizedCells = row.map(normalizeHeader);
  return normalizedCells.includes("id") && normalizedCells.includes("prompt");
}

function buildColumnIndexes(
  header: string[],
): Record<keyof RawEvaluationRow, number> {
  const normalizedHeader = header.map(normalizeHeader);
  const indexes = {} as Record<keyof RawEvaluationRow, number>;

  for (const [field, aliases] of Object.entries(REQUIRED_COLUMNS) as Array<
    [keyof RawEvaluationRow, readonly string[]]
  >) {
    const index = normalizedHeader.findIndex((value) =>
      aliases.includes(value),
    );

    if (index === -1) {
      throw new Error(`Missing required CSV column: ${aliases[0]}.`);
    }

    indexes[field] = index;
  }

  return indexes;
}

function readRawRow(
  row: string[],
  indexes: Record<keyof RawEvaluationRow, number>,
): RawEvaluationRow {
  return Object.fromEntries(
    Object.entries(indexes).map(([field, index]) => [
      field,
      row[index]?.trim() ?? "",
    ]),
  ) as unknown as RawEvaluationRow;
}

function convertRow(
  raw: RawEvaluationRow,
  sourceRowNumber: number,
): EvaluationCase {
  const id = normalizeId(requireValue(raw.id, "id", sourceRowNumber));
  const question = requireValue(raw.prompt, "prompt", sourceRowNumber);
  const categoryLabel = requireValue(
    raw.category,
    "category",
    sourceRowNumber,
  );

  return {
    id,
    description: `[${id}] ${categoryLabel} — ${question}`,
    question,
    sourceRowNumber,
    categories: normalizeList(
      categoryLabel,
      EVALUATION_CATEGORIES,
      "category",
      sourceRowNumber,
    ),
    scenarioType: normalizeSingleValue(
      requireValue(raw.scenarioType, "scenario type", sourceRowNumber),
      SCENARIO_TYPES,
      "scenario type",
      sourceRowNumber,
    ),
    evaluationTargets: normalizeList(
      requireValue(
        raw.evaluationTarget,
        "evaluation target",
        sourceRowNumber,
      ),
      EVALUATION_TARGETS,
      "evaluation target",
      sourceRowNumber,
    ),
    expectedDocumentIds: normalizeDocumentIds(
      raw.documentId,
      sourceRowNumber,
    ),
    expectedBehavior: requireValue(
      raw.expectedBehavior,
      "expected behavior",
      sourceRowNumber,
    ),
    expectedAnswerOrRubric: requireValue(
      raw.expectedAnswerOrRubric,
      "expected answer or rubric",
      sourceRowNumber,
    ),
    failureCategories: normalizeFailureCategories(
      requireValue(raw.failureCategory, "failure category", sourceRowNumber),
    ),
    scoringMethods: normalizeScoringMethods(
      requireValue(raw.scoringMethod, "scoring method", sourceRowNumber),
      sourceRowNumber,
    ),
  };
}

function normalizeId(value: string): string {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Evaluation case ID must be numeric, received: ${value}.`);
  }

  return value.padStart(3, "0");
}

function normalizeList<T extends string>(
  value: string,
  allowedValues: readonly T[],
  field: string,
  sourceRowNumber: number,
): T[] {
  return unique(
    splitCompoundValue(value).map((item) =>
      normalizeSingleValue(item, allowedValues, field, sourceRowNumber),
    ),
  );
}

function normalizeSingleValue<T extends string>(
  value: string,
  allowedValues: readonly T[],
  field: string,
  sourceRowNumber: number,
): T {
  const normalized = toSnakeCase(value);
  const corrected = normalized === "grouding" ? "grounding" : normalized;

  if (!allowedValues.includes(corrected as T)) {
    throw new Error(
      `Unknown ${field} "${value}" on CSV row ${sourceRowNumber}.`,
    );
  }

  return corrected as T;
}

function normalizeDocumentIds(
  value: string,
  sourceRowNumber: number,
): string[] {
  if (value.trim() === "" || value.trim() === "-") {
    return [];
  }

  return unique(
    splitCompoundValue(value).map((documentId) => {
      if (!/^DOC-00[1-6]$/.test(documentId)) {
        throw new Error(
          `Invalid document ID "${documentId}" on CSV row ${sourceRowNumber}.`,
        );
      }

      return documentId;
    }),
  );
}

function normalizeFailureCategories(value: string): string[] {
  return unique(
    splitCompoundValue(value).map((item) => {
      const normalized = toSnakeCase(item);
      return normalized === "icorrect_policy_information"
        ? "incorrect_policy_information"
        : normalized;
    }),
  );
}

function normalizeScoringMethods(
  value: string,
  sourceRowNumber: number,
): ScoringMethod[] {
  return unique(
    splitCompoundValue(value).map((item): ScoringMethod => {
      const normalized = toSnakeCase(item);

      if (normalized === "deterministic") {
        return "deterministic";
      }

      if (
        normalized === "judge_base" ||
        normalized === "judge_based" ||
        normalized === "rubric"
      ) {
        return "llm_rubric";
      }

      throw new Error(
        `Unknown scoring method "${item}" on CSV row ${sourceRowNumber}.`,
      );
    }),
  );
}

function requireValue(
  value: string,
  field: string,
  sourceRowNumber: number,
): string {
  if (value.trim() === "") {
    throw new Error(`Missing ${field} on CSV row ${sourceRowNumber}.`);
  }

  return value.trim();
}

function assertUniqueIds(cases: EvaluationCase[]): void {
  const ids = new Set<string>();

  for (const evaluationCase of cases) {
    if (ids.has(evaluationCase.id)) {
      throw new Error(`Duplicate evaluation case ID: ${evaluationCase.id}.`);
    }

    ids.add(evaluationCase.id);
  }
}

function splitCompoundValue(value: string): string[] {
  return value
    .split(/\s*(?:\+|\/)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function toSnakeCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
