# Step 3 — LangChain RAG chain

## What this step adds

The chain connects the Step 2 retriever to an OpenAI chat model through
LangChain runnables:

```text
question
   |
   v
OpenAIVectorStoreRetriever
   |
   v
LangChain Document[]
   |
   +----> attributed JSON context
   |
   v
ChatPromptTemplate
   |
   v
ChatOpenAI (Responses API)
   |
   v
answer + sources + token usage
```

## Instruction hierarchy

The existing `ASSISTANT_INSTRUCTIONS.md` is loaded at startup and sent as a
`developer` message. Retrieved documents and the customer question are placed
in a separate `user` message.

```text
developer message: trusted DemoShop application rules
user message:      retrieved context + customer question
```

This preserves the distinction between application behavior and factual
context. Retrieved documents provide facts; they do not override the assistant
instructions.

The user message uses explicit XML boundaries around JSON data:

```text
<retrieved_documents>
[
  {
    "sourceIndex": 1,
    "documentId": "DOC-001",
    "filename": "DOC-001_payment_policy.md",
    "content": "Pix is supported."
  }
]
</retrieved_documents>

<customer_question>
Can I pay by Pix?
</customer_question>
```

## Runnable composition

The application calls one runnable:

```ts
const result = await chain.invoke("Can I pay by Pix?");
```

Internally, the chain is composed from named runnables:

1. `retrieve_documents` validates the question and invokes the retriever.
2. `answer_from_documents` coordinates the grounded-answer branch.
3. `format_context` converts retrieved documents into attributed JSON.
4. `build_prompt` creates the developer and user messages.
5. `generate_answer` invokes the model.
6. `demoshop_rag` is the name of the complete chain.

These stable names form the LangSmith trace contract added in Step 4.

If retrieval returns no documents, the chain returns the existing safe fallback
message and does not call the model. This avoids spending generation tokens on
an answer without supporting context.

## Production and test dependencies

`createConfiguredDemoShopRagChain` creates:

- The real Step 2 OpenAI vector-store retriever.
- `ChatOpenAI` configured for the OpenAI Responses API.
- The existing assistant instructions loaded from the shared repository file.

`createDemoShopRagChain` accepts injected dependencies instead. Tests use
a custom in-memory retriever and LangChain's `FakeListChatModel`, so they
perform no network requests.

## Sources

- [LangChain `ChatPromptTemplate`](https://reference.langchain.com/javascript/langchain-core/prompts/ChatPromptTemplate): formats message-based prompts and participates in runnable composition.
- [LangChain `RunnableSequence`](https://reference.langchain.com/javascript/langchain-core/runnables/RunnableSequence): connects runnable outputs to the next runnable's inputs.
- [LangChain `ChatOpenAI`](https://reference.langchain.com/javascript/langchain-openai/ChatOpenAI): OpenAI chat-model integration, including the `useResponsesApi` option.
- [OpenAI prompt engineering guide](https://developers.openai.com/api/docs/guides/prompt-engineering): application rules belong in developer instructions, which have higher priority than user content; retrieved context can be included to implement RAG.

## Cost boundary

Tests, type checking, and builds use fake dependencies and make no OpenAI or
LangSmith requests. Invoking the configured production chain performs one
vector-store search and, when documents are found, one model request. Do not
run it live without explicit confirmation.
