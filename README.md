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

`OPENAI_MODEL` is reserved for answer generation in a later milestone.

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

[] Milestone 4: RAG answer generation and POST /chat endpoint.

[] Milestone 5: Evaluation dataset integration.

[] Milestone 6: Promptfoo offline evaluations.

[] Milestone 7: Comparative evaluation experiments and reporting.

