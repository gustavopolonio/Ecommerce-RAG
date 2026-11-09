# Incremental implementation plan

The rebuild is intentionally divided into small steps. Each step introduces
one major LangChain or LangSmith concept and must be tested before the next
one begins.

## Architecture target

```text
RAG-Ecommercedataset.csv
          |
          v
TypeScript dataset importer --------> LangSmith dataset
                                           |
                                           v
knowledge-base/*.md                 evaluation experiment
          |                                |
          v                                v
OpenAI vector store <--- retriever <--- TypeScript eval harness
                              |
                              v
                    LangChain RAG chain
                    |       |        |
                    |       |        +--> ChatOpenAI
                    |       +-----------> existing assistant instructions
                    +-------------------> attributed context
                              |
                              v
                        answer + sources
                              |
                              +----------> LangSmith trace
                              +----------> local JSON report
```

## Step 1 — Project foundation

Introduce the isolated Node and TypeScript project, LangChain packages,
LangSmith SDK, environment validation, shared-asset paths, and local quality
checks.

Learning goal: distinguish the responsibilities of LangChain, LangSmith, and
the OpenAI SDK.

Completion evidence:

- Independent `package.json` and lockfile.
- Strict TypeScript configuration.
- Validated OpenAI and LangSmith environment settings.
- Tests proving that the existing knowledge base, instructions, and CSV are
  referenced without being copied.

Cost boundary: entirely local; no OpenAI or LangSmith requests.

## Step 2 — LangChain retriever

Wrap OpenAI vector-store search in a LangChain retriever. Convert each search
result into a LangChain `Document` while retaining document ID, filename, file
ID, similarity score, and text.

Learning goal: understand `Document`, retriever input/output, top-k retrieval,
and metadata preservation.

Completion evidence:

- Retriever implementation with dependency injection.
- Unit tests with a mocked OpenAI client.
- One documented input/output example.

Cost boundary: tests are local. Ask for confirmation before a live vector-store
search.

## Step 3 — LangChain RAG chain

Build a runnable chain that loads the existing assistant instructions,
retrieves context, formats attributed passages, creates a chat prompt, and
invokes `ChatOpenAI`.

Learning goal: understand prompt templates, runnable composition, and the
difference between application instructions and retrieved knowledge.

Completion evidence:

- Chain returning the same answer-and-sources contract as the original app.
- Tests with fake retriever and model implementations.
- The six knowledge-base documents remain the only retrieval material.

Cost boundary: tests are local. Ask for confirmation before live generation.

## Step 4 — LangSmith tracing

Trace retrieval, context formatting, prompt construction, and generation as
related runs in one LangSmith project.

Learning goal: inspect a trace and understand run hierarchy, inputs, outputs,
latency, metadata, and errors.

Completion evidence:

- Tracing is optional and disabled by default.
- Trace names and metadata are stable across versions.
- A short guide explains what data is sent to LangSmith.

Cost and privacy boundary: review trace contents and request confirmation
before enabling remote tracing.

## Step 5 — HTTP endpoint

Expose the chain through Fastify `POST /chat` while preserving the response
shape used by the original application.

Learning goal: keep HTTP transport separate from the RAG chain.

Completion evidence:

- Request validation.
- Route tests with a fake RAG service.
- Health endpoint and local development command.

Cost boundary: route tests are local; a live chat request uses OpenAI.

## Step 6 — LangSmith dataset import

Parse and validate the existing `RAG-Ecommercedataset.csv`, map its 40 rows to
LangSmith examples, and create or update a named dataset.

Learning goal: distinguish the local dataset source of truth from its managed
LangSmith representation.

Completion evidence:

- Deterministic CSV-to-example mapper.
- Tests covering all 40 cases and important metadata.
- Dry-run output for inspection before upload.

External-write boundary: request confirmation before creating or updating the
LangSmith dataset.

## Step 7 — TypeScript evaluation harness

Execute every LangSmith dataset example through the RAG chain and attach:

- Recall@5 evaluator.
- Existing deterministic rules.
- LLM-as-judge answer-quality evaluator.
- Latency evaluator.

Learning goal: understand the target function, code evaluators, model-graded
evaluators, and experiment-level summaries.

Completion evidence:

- Core TypeScript runner.
- Unit-tested deterministic evaluators.
- Sample local JSON result.
- Explicit pass/fail policy.

Cost boundary: deterministic tests are local. Ask for confirmation before an
experiment that calls OpenAI or an LLM judge.

## Step 8 — Compare versions and generate reports

Give every experiment a stable version label containing prompt, model, and
retrieval configuration. Compare a candidate experiment against an approved
baseline and export a local JSON report listing improvements and regressions.

Learning goal: understand repeatable experiments and regression gates.

Completion evidence:

- Baseline and candidate experiment names.
- Per-case deltas and aggregate metrics.
- Local report generation.
- Documented release-gate decision.

## Step 9 — Retire Promptfoo

Remove Promptfoo only after the LangSmith flow covers the existing dataset,
deterministic checks, rubric evaluation, pairwise comparison, and reports.

Learning goal: perform a safe replacement without losing evaluation coverage.

Completion evidence:

- Feature-parity checklist.
- Promptfoo dependency and configuration removed.
- Root documentation points to the new workflow.
- Full test, typecheck, and build verification.
