# 006 — Mem0 #7535: old memories outrank their corrections

- Upstream: https://github.com/mem0ai/mem0/issues/7535
- Date: **2026-10-21**
- Status: **open upstream; independent scoring-layer reproduction; competing hypotheses tested**
- Source inspected: `mem0/utils/scoring.py` on GitHub default branch, with `score_and_rank` source showing semantic, BM25 and entity contributions but no recency contribution.
- Existing unmerged proposals: https://github.com/mem0ai/mem0/pull/7538 (closed, not merged, optional recency weight) and https://github.com/mem0ai/mem0/pull/6626 (open, score tie-breaker only).

## The actual question

When an AI remembers multiple competing versions of a fact, **how can retrieval surface useful/current information without destroying the evidence needed to explain a correction or disagreement?**

Upstream issue #7535 reports a real retrieval test with an out-of-date fact scoring above its correction in 2 of 3 cases. The reporter also measured answer changes on LongMemEval and MemoryAgentBench; those benchmarks were **not independently rerun here**.

## Independent experiment

We evaluated the *actual native Python `score_and_rank` implementation* (current source fetched from GitHub and executed standalone in an isolated Python 3.11 VM, without installing the full Mem0 dependency stack), using deterministic synthetic candidates. Four scenarios:

1. **Explicit update**: older score 0.92, newer score 0.75, linked with `supersedes=old`. Original rank: old, new. Global +0.1 recency bonus *still*: old, new. Our relationship-aware postprocessor: visible new, old retained as superseded.
2. **Recent but unrelated**: relevant score 0.82, unrelated newer score 0.77. Global +0.1 recency bonus ranks the unrelated item first. Relationship-aware postprocessor leaves original relevance order.
3. **Unlinked contradiction**: two mutually incompatible counts, no verified relationship. Postprocessor keeps both instead of guessing that new means true.
4. **Recent guess vs old verified assertion**: recency bonus ranks guess first; relationship-aware postprocessor does not silently erase the verified assertion.

These are **controlled counterexamples to simplistic recency prioritization**, not an end-to-end Mem0 bug-fix validation. The global recency bonus and postprocessor are independent research prototypes, **not an execution of the closed PR #7538**. The initial 4-case run completed with all assertions satisfied.

Reproduction script: [probe.py](probe.py) — requires a compatible Mem0 Python SDK installation for importing `mem0.utils.scoring`. The isolated VM experiment used the same code with that module's source injected directly, so the saved import-based script itself has **not been independently executed after saving**.

## A candidate answer

Preserve three distinct things rather than collapsing them into one floating-point rank:
- **Relevance**: whether a memory is about the question.
- **Temporal/evidential relationship**: whether there is an explicit correction or supersession link, and the date of the event versus the date metadata was edited.
- **Retrieval purpose**: current-state answer or historical/accountability question.

For a *current-state* question, only an explicit, trusted same-fact supersession edge may move a predecessor into a separate `superseded` output. Preserve its original text and score for audit and historical questions. Where evidence is missing or conflicts, return both as unresolved. A historical query returns both.

A useful consequence: a newly written record is not automatically proof that it overrides every older record.

## Real implementation obstacles

Mem0's upstream issue also reports that `linked_memory_ids` are not consistently persisted through the extraction path. Without reliable fact identity and links, the relationship-aware prototype cannot perform reliable reconciliation. A second issue is **top-k truncation**: if the corrected record was filtered out or not retrieved, a downstream postprocessor never sees it. An actual system needs candidate expansion or relationship traversal before truncation, with explicit limits.

Other limitations: invented `fact_key` and `supersedes` fields, no LLM extraction or Qdrant, no evaluation of linked-fact precision, provenance reliability, safety, resource consumption or user-facing answer quality. Therefore this is **one proposed architecture with controlled evidence**, not a production patch or a universal resolution.

## Connection to Astra Field

Potential transfer: preserve the old judgment and its reason while recording what superseded it and why, instead of promoting a newer summary by timestamp. This is a conceptual connection to CJM, **not a claim that Astra Field currently has the same defect or that transfer has been validated**.

No changes or comments were sent to upstream Mem0.
