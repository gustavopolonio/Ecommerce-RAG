# Step 6 — LangSmith dataset import

This step turns the existing CSV into examples that the LangSmith evaluation
harness can read. The CSV remains the editable source of truth. LangSmith holds
a managed copy for experiments and version comparisons.

## Data flow

```text
../RAG-Ecommercedataset.csv
          |
          v
CSV parser and validation
          |
          v
DemoShopDatasetExample[40]
          |
          +------> local JSON dry-run
          |
          +------> managed LangSmith dataset (only after approval)
```

The importer handles the source CSV's leading blank rows, quoted fields,
compound values, and reviewed spelling corrections. It requires exactly 40
unique numeric case IDs and accepts only the known categories, scenario types,
evaluation targets, scoring methods, and `DOC-001` through `DOC-006` document
identifiers.

## LangSmith example shape

Each CSV case becomes one example:

```json
{
  "inputs": {
    "question": "Can I pay by PIX?"
  },
  "referenceOutputs": {
    "expectedBehavior": "Check payment policy and accurately state whether PIX is accepted",
    "expectedAnswerOrRubric": "Confirm that PIX is acceptable",
    "expectedDocumentIds": ["DOC-001"]
  },
  "metadata": {
    "caseId": "001",
    "description": "[001] Payment — Can I pay by PIX?",
    "sourceFile": "RAG-Ecommercedataset.csv",
    "sourceRowNumber": 4,
    "categories": ["payment"],
    "scenarioType": "normal",
    "evaluationTargets": ["retrieval"],
    "failureCategories": ["incorrect_policy_information"],
    "scoringMethods": ["llm_rubric"]
  }
}
```

The separation is intentional:

- `inputs` are passed to the RAG target in Step 7.
- `referenceOutputs` are the expected facts and rubric used by evaluators.
- `metadata` describes how to group, filter, and diagnose the case.

## Inspect locally

From `langchain-rag/`:

```bash
npm run dataset:dry-run
```

The command prints the dataset name, source filename, count, and all 40 mapped
examples as JSON. It reads only the local CSV and makes no OpenAI or LangSmith
request.

The default managed dataset name is `demoshop-rag-evaluation`. Override it in
`.env` when necessary:

```env
LANGSMITH_DATASET_NAME=demoshop-rag-evaluation
```

## Upload after approval

```bash
npm run dataset:upload
```

This command is an external write. It reads `LANGSMITH_API_KEY`, the regional
`LANGSMITH_ENDPOINT`, and the optional `LANGSMITH_WORKSPACE_ID` from `.env`.
It does not call OpenAI.

Synchronization is incremental:

1. Create the named dataset if it does not exist.
2. Match managed examples by `sourceFile` and `caseId`.
3. Skip examples whose input, references, and metadata are unchanged.
4. Update changed examples.
5. Create missing examples.

Examples from other sources are left untouched. The importer does not delete
stale or unrelated examples because deletion should be a separate, explicit
operation. If an upload stops partway through, running it again safely repairs
the remaining creates or updates.

## Tests and cost boundary

```bash
npm test -- src/dataset
npm run typecheck
npm run build
```

Tests use the real CSV plus an in-memory LangSmith gateway. They make no remote
requests. The dry-run is free. LangSmith's public pricing does not list a
separate per-example dataset storage charge, but later experiments create
traces and real RAG runs incur OpenAI retrieval and generation usage.

## Official sources

- [Create and manage LangSmith datasets programmatically](https://docs.langchain.com/langsmith/manage-datasets-programmatically)
  documents TypeScript dataset creation and bulk example creation.
- [Manage LangSmith datasets](https://docs.langchain.com/langsmith/manage-datasets)
  documents dataset versions, filtering, sharing, and export.
- [LangSmith Evaluation](https://docs.langchain.com/langsmith/evaluation)
  explains how datasets feed offline experiments and regression testing.
- [LangSmith pricing](https://www.langchain.com/pricing)
  lists the current plan and trace allowances.
