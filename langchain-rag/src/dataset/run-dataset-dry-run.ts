import "dotenv/config";

import { basename } from "node:path";

import { getLangSmithDatasetName } from "../config/env.js";
import { SHARED_ASSETS } from "../config/shared-assets.js";
import { mapEvaluationCasesToLangSmithExamples } from "./langsmith-example.js";
import { loadEvaluationDataset } from "./load-evaluation-dataset.js";

const cases = await loadEvaluationDataset(SHARED_ASSETS.evaluationDataset);
const examples = mapEvaluationCasesToLangSmithExamples(cases);

console.log(
  JSON.stringify(
    {
      dryRun: true,
      datasetName: getLangSmithDatasetName(),
      sourceFile: basename(SHARED_ASSETS.evaluationDataset),
      exampleCount: examples.length,
      examples,
    },
    null,
    2,
  ),
);
