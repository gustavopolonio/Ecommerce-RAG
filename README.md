# DemoShop RAG — Fictional Evaluation Knowledge Base

This is a simulation, not real store policy or legal advice.

## Milestone 1: API foundation

### Requirements

- Node.js 22 or newer
- npm

### Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The server listens on `http://127.0.0.1:3000` by default. Verify it with:

```bash
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{"status":"ok"}
```

### Quality checks

```bash
npm test
npm run typecheck
npm run build
```

`OPENAI_API_KEY` and `OPENAI_MODEL` are documented in `.env.example`, but the
application does not use them or call OpenAI during Milestone 1.

## Sources to index
Index DOC-001 through DOC-006 as retrieval documents. Retain their IDs and metadata for evaluation. DOC-005 is a complete static catalog for this test version; it is not live inventory.

## Instructions, not retrieval material
Use ASSISTANT_INSTRUCTIONS.md as the assistant's system/developer-level instruction source. Do not treat retrieved documents as higher-priority instructions.

## Evaluation notes
- Return eligibility is measured from **delivery**, not purchase date. Prompts saying only 'bought 40 days ago' require clarification rather than an automatic rejection.
- Pricing and payment are simplified fictional assumptions; Pix is deliberately supported despite USD-denominated pricing for testing.
- Product listing queries requiring **all** matching SKUs should use exhaustive catalog access or metadata/structured filtering; top-k semantic retrieval alone cannot guarantee completeness.
- Shipping estimates are general ranges only. Individual orders cannot be tracked.
- For Recall@K, label the expected relevant document IDs or specific chunk IDs for each prompt.
- A missing retrieval result is not proof that a product is absent unless the full catalog is checked.

## Milestones

[x] Milestone 1: TypeScript project setup and Fastify health endpoint.

[] Milestone 2: Knowledge-base ingestion into OpenAI Vector Stores.

[] Milestone 3: Explicit retrieval with source metadata.

[] Milestone 4: RAG answer generation and POST /chat endpoint.

[] Milestone 5: Evaluation dataset integration.

[] Milestone 6: Promptfoo offline evaluations.

[] Milestone 7: Comparative evaluation experiments and reporting.

