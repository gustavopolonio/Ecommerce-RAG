# DemoShop RAG with LangChain and LangSmith

This folder is an isolated, learning-focused rebuild of the DemoShop RAG
application. It uses its own dependencies and build configuration so the
existing Promptfoo implementation remains available as a reference until the
new evaluation workflow reaches feature parity.

## Current status

- [x] Step 1: isolated TypeScript project foundation.
- [ ] Step 2: LangChain retriever for the existing OpenAI vector store.
- [ ] Step 3: LangChain RAG chain using the existing assistant instructions.
- [ ] Step 4: LangSmith tracing.
- [ ] Step 5: Fastify `POST /chat` endpoint.
- [ ] Step 6: import the existing CSV into a LangSmith dataset.
- [ ] Step 7: TypeScript evaluation harness and evaluators.
- [ ] Step 8: baseline-versus-candidate experiment comparison and reports.
- [ ] Step 9: remove Promptfoo after feature parity is verified.

The detailed learning goals, deliverables, and cost boundaries for each step
are in [docs/implementation-plan.md](docs/implementation-plan.md).

## Shared source material

This project deliberately reuses these repository files instead of copying
them:

```text
../knowledge-base/
../src/instructions/ASSISTANT_INSTRUCTIONS.md
../RAG-Ecommercedataset.csv
```

Their resolved paths are centralized in `src/config/shared-assets.ts`.

## Setup

From this folder:

```bash
npm install
cp .env.example .env
npm test
npm run typecheck
npm run build
```

Keep `LANGSMITH_TRACING=false` until you intentionally want to send traces to
LangSmith. The current foundation does not make OpenAI or LangSmith requests.

## Why LangChain and LangSmith?

- LangChain will coordinate retrieval, context construction, prompting, and
  model invocation.
- LangSmith will record traces and run evaluation experiments against a
  managed copy of the CSV dataset.
- The original CSV remains the editable dataset source of truth.
- Local JSON reports will preserve repository evidence for comparisons.
