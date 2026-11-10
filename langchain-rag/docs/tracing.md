# Step 4 — LangSmith tracing

## Goal

Tracing explains how one RAG answer was produced. It records related runs for
retrieval, context formatting, prompt construction, and generation so a wrong
answer can be diagnosed at the step where it originated.

Tracing is observability, not evaluation:

- A trace shows the execution of one request.
- An evaluation scores many executions against quality criteria.

The evaluation steps later in this project will use the stable trace contract
created here.

## Trace hierarchy

The complete chain exposes these stable run names:

```text
demoshop_rag
|
+-- retrieve_documents
|
+-- answer_from_documents
    |
    +-- format_context
    +-- build_prompt
    +-- generate_answer
```

LangChain's retriever, prompt, and chat-model integrations may add lower-level
child runs beneath these application runs. The names above are the application
contract and should remain stable so traces can be filtered and compared across
versions.

The trace metadata added to the configured chain is:

```json
{
  "application": "demoshop-langchain-rag",
  "architecture": "two-step-rag",
  "model": "<OPENAI_MODEL>",
  "vectorStoreId": "<OPENAI_VECTOR_STORE_ID>"
}
```

Tags are `demoshop`, `rag`, and `two-step`. The OpenAI API key and LangSmith API
key are never added to trace metadata.

Set `LANGSMITH_REVISION_ID` to a Git commit SHA in deployed environments when
you want LangSmith to associate traces with an exact code revision.

## Local verification

The trace contract is tested without OpenAI or LangSmith:

```bash
npm test -- src/rag/demo-shop-rag-chain.test.ts \
  src/tracing/trace-contract.test.ts
```

The test uses an in-memory retriever, a fake model, and LangChain's local
`streamEvents` API. It verifies that the important run names start in the
expected order. Local events are not uploaded to LangSmith.

## Remote tracing configuration

Remote tracing remains off by default:

```env
LANGSMITH_TRACING=false
```

When tracing is intentionally enabled, a LangSmith API key and exactly one
destination are required.

### Current agent-based LangSmith Cloud workspace

```env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your-key
LANGSMITH_AGENT_ID=your-agent-id
LANGSMITH_AGENT_ENVIRONMENT=local
LANGSMITH_PROJECT=
```

Supported environments in this project are `local`, `development`, `staging`,
and `production`.

### Project-based or self-hosted workspace

```env
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your-key
LANGSMITH_AGENT_ID=
LANGSMITH_PROJECT=demoshop-langchain-rag
```

Do not configure `LANGSMITH_AGENT_ID` and `LANGSMITH_PROJECT` together. If the
LangSmith account uses a non-US data region, also set the regional
`LANGSMITH_ENDPOINT` documented by LangSmith.

No extra tracing call is needed. Once the environment is configured, invoking
the LangChain Runnable normally sends the trace:

```ts
const result = await chain.invoke("Can I pay by Pix?");
```

That invocation also performs OpenAI vector-store search and model generation.
Do not run it merely to create a trace without first accepting the OpenAI and
LangSmith usage and data boundaries.

## Controlled live smoke test

After reviewing the data boundary and enabling tracing, run one known,
non-sensitive question from the DemoShop evaluation dataset:

```bash
npm run trace:smoke -- "Can I pay by Pix?"
```

The command requires `LANGSMITH_TRACING=true`; it refuses to run as a tracing
smoke test when tracing is disabled. It performs one OpenAI vector-store search,
one model generation when documents are found, and one remote LangSmith trace.

After it finishes:

1. Confirm the terminal response is grounded in the payment document.
2. Open the configured LangSmith agent/environment or tracing project.
3. Open the newest `demoshop_rag` trace.
4. Confirm the expected child runs, inputs, outputs, timing, and metadata.
5. Check that no API key or other secret appears in the trace.

## Data and privacy boundary

With normal input and output tracing enabled, this application may send the
following data to LangSmith:

| Run | Potentially recorded data |
| --- | --- |
| `demoshop_rag` | Customer question, final answer, and sources |
| `retrieve_documents` | Search query and retrieved documents |
| `format_context` | Knowledge-base passages and attribution metadata |
| `build_prompt` | Assistant instructions, context, and customer question |
| `generate_answer` | Formatted model input, output, usage, and model metadata |

This repository's knowledge base and evaluation questions are suitable for a
learning trace. Real customer questions may contain personal or confidential
information and need a separate privacy decision.

LangSmith can completely hide trace inputs and outputs:

```env
LANGSMITH_HIDE_INPUTS=true
LANGSMITH_HIDE_OUTPUTS=true
```

That protects content but also removes much of the information needed to debug
RAG quality. For production, selective masking or anonymization is usually more
useful than hiding everything.

## Official sources

- [Trace LangChain applications](https://docs.langchain.com/langsmith/trace-with-langchain)
- [LangSmith tracing quickstart](https://docs.langchain.com/langsmith/observability-quickstart)
- [Add metadata and tags](https://docs.langchain.com/langsmith/add-metadata-tags)
- [Prevent logging sensitive data](https://docs.langchain.com/langsmith/mask-inputs-outputs)

## Cost boundary

The tests in this step are local and make no OpenAI or LangSmith requests.
Remote tracing requires a LangSmith account and may be metered according to its
plan. A real traced RAG invocation also incurs the existing OpenAI retrieval,
storage, and generation usage. Remote tracing stays disabled until the user
reviews the trace contents and explicitly enables it.
