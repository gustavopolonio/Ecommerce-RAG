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

`OPENAI_MODEL` selects the model used for answer generation.

## Milestone 2: knowledge-base ingestion

The ingestion command validates and uploads only `DOC-001` through `DOC-006`.
`ASSISTANT_INSTRUCTIONS.md` is deliberately excluded because it contains
higher-priority application instructions rather than searchable store knowledge.

1. Add your API key to the local `.env` file. Never commit or paste the key:

   ```dotenv
   OPENAI_API_KEY=your_key_here
   ```

2. Run the ingestion command:

   ```bash
   npm run ingest:kb
   ```

If `OPENAI_VECTOR_STORE_ID` is empty, the command creates a vector store named
`DemoShop Knowledge Base`. It uploads the six documents, attaches `document_id`
and `source_filename` attributes to each vector-store file, and waits until the
batch finishes indexing. Newly created stores expire 30 days after their last
active time to avoid retaining an abandoned vector index indefinitely.

3. Copy the printed ID into `.env`:

   ```dotenv
   OPENAI_VECTOR_STORE_ID=vs_...
   ```

The command accepts a configured existing store only when it is empty. This
guard prevents accidentally duplicating the knowledge base on repeated runs.

## Milestone 3: explicit retrieval

The retrieval layer searches the configured vector store for the top five
results and preserves each result's text, document ID, filename, file ID, and
similarity score. Keeping this stage separate makes retrieval quality measurable
without involving answer generation.

Run the manual retrieval demo with:

```bash
npm run retrieve:explicit
```

This command contacts the OpenAI API. The automated tests use mocks and do not
make network calls.

## Milestone 4: RAG answers and `POST /chat`

Set `OPENAI_MODEL` in `.env`, start the server, and send a question:

```bash
npm run dev
curl -X POST http://127.0.0.1:3000/chat \
  -H 'content-type: application/json' \
  -d '{"question":"Can I pay by Pix?"}'
```

The endpoint performs explicit retrieval, assembles attributed context, and
then calls the Responses API. It returns the generated answer plus the evidence
needed for later evaluation:

```json
{
  "message": "Yes, DemoShop accepts Pix.",
  "sources": [
    {
      "fileId": "file_...",
      "filename": "DOC-001_payment_policy.md",
      "documentId": "DOC-001",
      "sourceFilename": "DOC-001_payment_policy.md",
      "score": 0.98
    }
  ],
  "usage": {
    "inputTokens": 100,
    "outputTokens": 20,
    "totalTokens": 120
  },
  "latencyMs": 450.25
}
```

`npm run rag:demo` runs three live retrieval-and-generation examples. Both
manual demo commands contact OpenAI and should be treated as potentially
billable operations. The assistant should obtain confirmation before running
them on the user's behalf.

## Milestone 5: evaluation dataset integration

The original `RAG-Ecommercedataset.csv` remains the editable source of truth.
Generate the normalized Promptfoo-compatible JSON dataset with:

```bash
npm run evaluation:build
```

The command locates the CSV header after its leading empty rows, validates all
40 cases, normalizes compound categories, targets, document IDs, and scoring
methods, and writes `evaluation/cases.json`. The generated file contains
Promptfoo-native `description`, `vars`, and `metadata` fields. Executable
assertions are added in Milestone 6.

This operation is entirely local and does not call OpenAI.

## Milestone 6: Promptfoo offline evaluations

`npm run evaluation:build` now also generates
`evaluation/promptfoo-cases.json`. The Promptfoo suite evaluates the HTTP API
with four explicit signals:

- Recall@5 for the 35 cases with expected knowledge-base documents.
- Eight deterministic checks for strict formatting or exact catalog values.
- LLM rubric grading with a `0.8` pass threshold for answer quality.
- A 15-second per-request latency ceiling.

Validate the configuration without starting the API or calling OpenAI:

```bash
npm run eval:validate
```

For a live evaluation, start the API in one terminal:

```bash
npm run dev
```

Then run either the first three cases or the complete dataset in another:

```bash
npm run eval:smoke
npm run eval:offline
```

Both live commands can incur OpenAI charges. The smoke run makes three
DemoShop requests and three rubric-judge requests. The complete run makes 40
DemoShop requests and 38 rubric-judge requests. Each DemoShop request performs
vector-store retrieval followed by answer generation. Retries are disabled,
concurrency is limited to one, and caching is disabled so latency assertions
measure real requests. Both the application and rubric judge use the model in
`OPENAI_MODEL`.

Promptfoo stores the latest JSON and HTML reports under `evaluation/results/`.
That directory and Promptfoo's local state directory are excluded from Git.

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

[x] Milestone 2: Knowledge-base ingestion into OpenAI Vector Stores.

[x] Milestone 3: Explicit retrieval with source metadata.

[x] Milestone 4: RAG answer generation and POST /chat endpoint.

[x] Milestone 5: Evaluation dataset integration.

[x] Milestone 6: Promptfoo offline evaluations.

[] Milestone 7: Comparative evaluation experiments and reporting.

