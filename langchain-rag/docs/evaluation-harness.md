# Step 7 — TypeScript evaluation harness

The evaluation harness is the TypeScript code that connects a LangSmith
dataset to the DemoShop RAG application and its evaluators. It will eventually
run all 40 examples, record per-case scores in a LangSmith experiment, and
write a local summary for version comparisons.

This step is intentionally implemented in small parts.

## Part 1 — Evaluation target

The evaluation target is the function LangSmith calls once for each dataset
example. It is an adapter around the existing `DemoShopRagService`; it does not
duplicate retrieval, prompting, model generation, or latency measurement.

```text
LangSmith example input
{ question: string }
          |
          v
evaluation target
          |
          v
DemoShopRagService
          |
          v
evaluation output
{ answer, sources, usage, latencyMs }
```

The field names are designed for the evaluators that follow:

- `answer` is inspected by deterministic rules and the LLM judge.
- `sources` contains the document IDs needed by Recall@5.
- `latencyMs` is inspected by the latency evaluator.
- `usage` preserves token counts for experiment analysis.

The target accepts an object rather than a bare string because each LangSmith
dataset example stores its values under `inputs`. The current dataset uses the
shape `{ "question": "..." }`.

Unit tests inject a fake RAG service. They verify the mapping and validation
without making OpenAI or LangSmith requests.

## Part 2 — Recall@5 evaluator

Recall@5 measures whether the first five retrieved sources include every
document expected by the dataset example:

```text
recall@5 = expected documents found in top 5 / expected documents
```

For example, finding one of two expected documents produces `0.5`. Finding
both produces `1.0`. The initial pass policy requires `1.0`, because all
expected policy documents should be available to the answer-generation step.

The evaluator reads:

- `outputs.sources` from the evaluation target.
- `referenceOutputs.expectedDocumentIds` from the LangSmith example.

It applies to 35 dataset cases. The five cases with an empty expected-document
list receive `score: null`, meaning that retrieval recall is not applicable and
should not affect the aggregate Recall@5 score. Missing or malformed evaluator
data receives `0` so configuration errors remain visible.

Recall@5 is a local code evaluator. Calculating it makes no OpenAI request and
requires no judge model.

## Part 3 — Deterministic correctness evaluator

Deterministic checks validate output requirements that code can judge exactly.
The evaluator reads `outputs.answer`, plus `caseId` and `scoringMethods` from
the LangSmith example metadata.

Eight cases currently have deterministic rules:

| Case | Rule |
| --- | --- |
| `006` | Exactly three bullet points |
| `011` | Contains the required product category |
| `013` | JSON contains the exact SKU set |
| `022` | Contains the required installment values |
| `027` | Contains the required cart and shipping values |
| `033` | Contains the expected product name; the SKU is optional |
| `035` | JSON contains the exact product and allowed fields |
| `038` | Markdown table contains both shipping methods and values |

Passing a rule produces `deterministic_correctness: 1`; failing produces `0`
with a diagnostic comment. Cases without deterministic scoring produce
`score: null` and do not affect the aggregate metric. Invalid metadata or a
missing configured rule produces `0` so evaluation configuration regressions
are visible.

These checks are a typed port of the existing Promptfoo rules. They are local,
repeatable, and make no OpenAI or LangSmith request.

## Part 4 — Latency evaluator

The evaluation target already measures end-to-end application latency around
the RAG service call. That duration includes retrieval, prompt construction,
and answer generation. The latency evaluator reads `outputs.latencyMs` and
returns two complementary LangSmith metrics:

- `latency_ms` stores the actual duration for averages and version comparison.
- `latency_within_threshold` records whether the duration passed the policy.

The initial policy is `latencyMs <= 15,000`. The limit is inclusive and can be
overridden when constructing the evaluator. A missing, negative, or non-finite
duration produces a null measurement and a failed threshold result so broken
instrumentation is visible.

This evaluator performs only arithmetic over the target output. It makes no
OpenAI or LangSmith request by itself.

## Part 5 — LLM-as-judge answer quality

Some answer requirements are semantic and cannot be checked reliably with
string matching. The answer-quality evaluator sends four case-specific fields
to a judge model:

- The customer question.
- The generated answer.
- The expected behavior.
- The answer rubric from the dataset.

The judge uses OpenAI structured output to return a score from `0` to `1` and a
concise explanation. The evaluator stores two LangSmith metrics:

- `answer_quality` contains the judge's numeric score.
- `answer_quality_pass` records whether the score is at least `0.8`.

The threshold is inclusive and configurable. The evaluator validates all input
fields and the judge response. Cases without `llm_rubric` in their scoring
methods receive `score: null`, and the judge is not called. In the current
dataset, 38 of 40 cases use the judge.

The OpenAI adapter uses a strict JSON schema and treats dataset text as data,
not as instructions. `OPENAI_JUDGE_MODEL` is deliberately separate from
`OPENAI_MODEL`; no default is selected, so a paid experiment cannot silently
inherit a potentially expensive generation model.

Local tests inject a fake judge and make no API request. A complete live run
would make up to 38 paid judge calls in addition to the RAG calls, so the
experiment runner must show the planned operation and require confirmation
before execution.

## Part 6 — Experiment runner and local report

The runner connects the managed LangSmith dataset, evaluation target, and all
four evaluators. Start with the free preview:

```bash
npm run evaluation:preview
```

The preview reads and validates the local 40-case CSV, then displays the
dataset, experiment prefix, RAG and judge models, concurrency, report location,
and maximum expected paid operations. It makes no network request and prints
no API keys or vector-store ID.

The live command has a second explicit safety boundary:

```bash
npm run evaluation:run -- --confirm-paid
```

Without the exact `--confirm-paid` flag, `evaluation:run` prints the same
preview and stops before constructing the OpenAI-backed chain or judge. With
the flag, LangSmith `evaluate()` runs the target over the managed dataset,
attaches evaluator feedback, and creates an experiment.

The runner propagates LangSmith's callback configuration through the target,
RAG service, and chain. This preserves retrieval, prompt, and generation child
runs under each evaluated example.

After completion, the runner writes an ignored local JSON file under `results/`
by default. It contains:

- Experiment, dataset, model, and policy configuration.
- Per-case answer, sources, latency, token usage, evaluator scores, and errors.
- Aggregate metrics and total token usage.
- Per-case gate decisions and the exact failed metrics.

See [sample-evaluation-report.json](sample-evaluation-report.json) for the
committed example shape. Change the output folder with
`EVALUATION_REPORT_DIRECTORY`; generated `results/` files remain untracked by
default.

The installed LangSmith SDK materializes completed rows in
`evaluation.results` before `evaluate()` returns. The runner reads that array
directly and refuses to write a report unless it contains exactly the same
number of rows as the local dataset. This guards against silently empty or
partial reports.

If the remote experiment completed but its local report is missing or invalid,
regenerate it without rerunning the RAG target or judge:

```bash
npm run evaluation:report -- <existing-experiment-name>
```

This command performs read-only LangSmith requests for the existing root runs,
dataset examples, and evaluator feedback. It makes zero OpenAI calls and safely
overwrites the report file for that experiment.

## Pass/fail policy

A case passes when its run succeeds and every applicable gate passes:

- Recall@5 equals `1.0`; cases without expected documents are not applicable.
- Deterministic correctness equals `1`; non-deterministic cases are not
  applicable.
- Answer-quality pass is `true`, which currently means a score of at least
  `0.8`; non-rubric cases are not applicable.
- Latency is at most `15,000 ms` for every case.

A missing evaluator result counts as a failure. This prevents broken evaluation
instrumentation from creating a false passing report.

## Cost boundary

`evaluation:preview`, unit tests, typecheck, and build are local and free. The
confirmed live run creates external LangSmith data and can perform up to 40
vector-store searches, 40 RAG generations, and 38 judge calls. Review the
preview and current provider pricing before confirming it.

## Official source

- [LangSmith evaluation](https://docs.langchain.com/langsmith/evaluation)
  describes the dataset, target, evaluators, experiment, and analysis flow.
- [LangSmith evaluation types](https://docs.langchain.com/langsmith/evaluation-types)
  explains code evaluators, LLM-as-judge, summary evaluators, and pairwise
  comparison.
- [LangChain structured output](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph)
  demonstrates `withStructuredOutput` for typed model responses.
- [Manage LangSmith datasets](https://docs.langchain.com/langsmith/manage-datasets)
  demonstrates passing a dataset to the TypeScript `evaluate()` runner.
