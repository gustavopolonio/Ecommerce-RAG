# Step 5 — Fastify HTTP API

This step makes the RAG chain available to an HTTP client without putting HTTP
concerns inside the chain itself.

## Request flow

```text
POST /chat
    |
    v
Fastify JSON Schema validation
    |
    v
trim question
    |
    v
DemoShopRagService --------------> measure end-to-end latency
    |
    v
LangChain RAG runnable -----------> retrieval + generation + token usage
    |
    v
JSON response
```

The responsibilities are deliberately separated:

- `src/routes/chat.ts` owns the HTTP request schema and response delivery.
- `src/services/demo-shop-rag-service.ts` invokes the chain and adds latency.
- `src/rag/demo-shop-rag-chain.ts` owns retrieval and answer generation.
- `src/app.ts` composes the routes and configures Fastify.
- `src/server.ts` loads `.env` and starts the listening server.

The route receives a `DemoShopRagService` dependency. Production creates the
real service lazily on the first valid chat request; tests inject a fake. This
means `/health` can start without making an OpenAI request, and invalid chat
requests never initialize the RAG dependencies.

## HTTP contract

### Health

```http
GET /health
```

```json
{ "status": "ok" }
```

### Chat

```http
POST /chat
Content-Type: application/json
```

```json
{ "question": "Can I pay by Pix?" }
```

`question` must be a nonblank string with at most 2,000 characters. Extra body
properties are rejected. The successful response preserves the original
DemoShop API shape:

```json
{
  "message": "Yes, DemoShop accepts Pix.",
  "sources": [
    {
      "fileId": "file-payment",
      "filename": "DOC-001_payment_policy.md",
      "documentId": "DOC-001",
      "sourceFilename": "DOC-001_payment_policy.md",
      "score": 0.98
    }
  ],
  "usage": {
    "inputTokens": 20,
    "outputTokens": 6,
    "totalTokens": 26
  },
  "latencyMs": 45.2
}
```

LangChain exposes model token counts through the generated `AIMessage`'s
`usage_metadata`. The chain maps those snake-case fields into the existing
camel-case API contract. If no document is retrieved, or a test model does not
provide usage metadata, all token counts are zero.

## Run locally

From `langchain-rag/`:

```bash
npm run dev
```

The default address is `http://127.0.0.1:3001`. `HOST` and `PORT` can override
it in `.env`.

The health request is local and free:

```bash
curl http://127.0.0.1:3001/health
```

A valid `/chat` request searches the configured OpenAI vector store and may
generate an OpenAI response, so it can incur OpenAI usage charges. When
LangSmith tracing is enabled, the trace is also sent to the configured
LangSmith endpoint.

## Test locally without API calls

```bash
npm test
npm run typecheck
npm run build
```

Fastify's `inject` method executes requests against the application without
opening a network port. The chat tests inject a fake RAG service and verify the
complete success response plus invalid bodies. No test uses an OpenAI or
LangSmith credential.

## Implementation sources

- [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
  documents route-level JSON Schema validation.
- [Fastify testing guide](https://fastify.dev/docs/latest/Guides/Testing/)
  documents `app.inject` for HTTP tests without a listening server.
- [Fastify TypeScript reference](https://fastify.dev/docs/latest/Reference/TypeScript/)
  documents typed route bodies and JSON Schema usage.
