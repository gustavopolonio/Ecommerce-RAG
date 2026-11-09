# Step 2 — OpenAI Vector Store retriever

## What this step adds

`OpenAIVectorStoreRetriever` is an adapter between two interfaces:

```text
LangChain                         OpenAI

retriever.invoke(question)
          |
          v
_getRelevantDocuments(question) -> vectorStores.search(...)
                                           |
                                           v
LangChain Document[]             <- search results
```

The OpenAI API already owns and indexes the six DemoShop Markdown files. This
step does not upload, split, or embed them again. It searches the existing
vector store identified by `OPENAI_VECTOR_STORE_ID`.

## Why a custom retriever?

LangChain defines a retriever as a runnable that receives a string and returns
relevant `Document` objects. OpenAI Vector Store search has a different result
shape, so the custom class extends LangChain's `BaseRetriever` and translates
between the two.

The adapter gives us three useful properties:

1. The existing OpenAI vector store remains unchanged.
2. Later LangChain steps can compose the retriever with prompts and models.
3. LangSmith can identify retrieval as its own traced operation later.

## Input and output

Input:

```ts
const documents = await retriever.invoke("Can I pay by Pix?");
```

Representative output:

```json
[
  {
    "id": "file-payment:0",
    "pageContent": "Pix is supported.",
    "metadata": {
      "fileId": "file-payment",
      "filename": "DOC-001_payment_policy.md",
      "score": 0.97,
      "documentId": "DOC-001",
      "sourceFilename": "DOC-001_payment_policy.md",
      "attributes": {
        "document_id": "DOC-001",
        "source_filename": "DOC-001_payment_policy.md"
      }
    }
  }
]
```

`pageContent` contains the retrieved text. `metadata` retains the evidence we
will need for citations and Recall@5 evaluation.

## Important implementation choices

- The default top-k is five, matching the original application.
- OpenAI accepts between 1 and 50 results, so invalid values are rejected
  before a request.
- Empty queries and vector-store IDs are rejected locally.
- Multiple text blocks in one result are joined with a blank line.
- Missing `document_id` or `source_filename` attributes become `null` rather
  than being guessed.
- The OpenAI client is injected into the class, allowing automated tests to use
  a mock without network traffic.
- The factory creates the real OpenAI client but does not make a request until
  `invoke` is called.

## Sources

- [LangChain `BaseRetriever` reference](https://reference.langchain.com/javascript/langchain-core/retrievers/BaseRetriever): custom retrievers extend this class and implement `_getRelevantDocuments`; retrievers are LangChain runnables.
- [LangChain `Document` reference](https://reference.langchain.com/javascript/langchain-core/documents/Document): retrieved text is stored in `pageContent`, with source information in `metadata`.
- [OpenAI Vector Store Search API](https://developers.openai.com/api/reference/typescript/resources/vector_stores/methods/search): documents the TypeScript `vectorStores.search` call, its top-k parameter, and returned filename, score, attributes, and content.
- [OpenAI Retrieval guide](https://developers.openai.com/api/docs/guides/retrieval): explains semantic search and the role of vector stores as searchable indexes.

## Cost boundary

The tests use a mock client and make no OpenAI request. A real call to
`retriever.invoke(...)` searches the configured OpenAI vector store. Do not run
a live example without explicit confirmation.
