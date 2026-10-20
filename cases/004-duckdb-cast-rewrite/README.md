# 004 — DuckDB #26507: verifying an optimizer rewrite after an upstream fix

- Upstream issue: https://github.com/duckdb/duckdb/issues/26507
- Merged fix: https://github.com/duckdb/duckdb/pull/26508 (merged **2026-10-06**)
- Similar outstanding PR: https://github.com/duckdb/duckdb/pull/26608
- Investigation date: **2026-10-21**
- **Status: merged upstream fix located; 7-case regression smoke check passed on DuckDB v1.5.6; no new patch proposed**

## Original fault

A nested `list_transform(list_filter(list_transform(...)))` SQL expression, when optimized, dropped some casts and changed its meaning: `2::BOOLEAN::INTEGER` was replaced with the original `2`, instead of `1`. The issue's original author reproduced incorrect results on a prior development revision.

## A decision changed by GitHub history

At first the problem appeared unresolved because **Issue #26507 was still open**. Inspecting the upstream code and PR history changed that assessment.

**PR #26508 was already merged** on October 6. The present code in `src/optimizer/rule/list_comprehension_rewrite.cpp` uses `MatchesStructFieldProjection` to restrict cast matching, rather than generically unwrapping arbitrary casts. It still accepts one ordinary Boolean filter cast that the rewrite itself recreates, while rejecting `TRY_CAST` in that position. Another overlapping PR (#26608) remains open.

This is why this case does not propose a redundant patch. **Issue status alone was not reliable evidence of implementation status.**

## Independent execution

A temporary isolated ARM64 Linux environment installed `@duckdb/node-api` from npm. The embedded DuckDB version reported **v1.5.6**. Each SQL statement ran twice, with the optimizer enabled and disabled.

| SQL scenario | Outcome on v1.5.6 |
| --- | --- |
| lossy result cast `2::BOOLEAN::INTEGER` | both returned `[1]` |
| result cast to VARCHAR | both returned `["2"]` |
| intermediate filter cast to DECIMAL and BOOLEAN | both returned the same one-element decimal list (0.9) |
| `TRY_CAST` filter of `['true','bad']` | both returned `['true']` |
| ordinary list comprehension | both returned `[2,3]` |
| list with NULL | both returned `[1,2]` |
| empty input list | both returned `[]` |

**7/7 comparisons passed**, with no SQL execution errors in the final run. The first experiment script incorrectly failed to JSON-serialize BigInt values and used syntactically invalid empty-list SQL; those *harness mistakes* were corrected before this final result.

Executable regression probe: [probe.mjs](probe.mjs). Install with `npm install @duckdb/node-api`, then `node probe.mjs` from this directory. Outputs are compared including their DuckDB wrapper representations. This is a smoke check, not a full regression suite.

## Transfer from Ruff — where the analogy holds

- Ruff UP040/046/047 lost optional parameters when *rewriting source syntax* while ignoring `**kwargs`.
- DuckDB #26507 lost value-changing casts when *rewriting an expression tree* while matching through casts.

The structural similarity is **discarding information during a transformation that is supposed to preserve behavior**. But the implementation mechanisms differ; they are not asserted to be the same root cause.

This led to a reusable testing question: *Which source expressions may be transformed, and which semantics must the replacement preserve?* For SQL optimizers, one useful check is comparing optimized and unoptimized execution on selected inputs. That test is insufficient to prove global equivalence.

## Boundary

- Independently confirmed: current GitHub PR state, inspected source, DuckDB v1.5.6 behavior on 7 concrete SQL inputs with two optimizer modes.
- Based on upstream issue report rather than re-executed here: original failure on an older development revision and upstream PR's comprehensive tests.
- Not established: all SQL inputs, all DuckDB builds/platforms, no remaining optimizer bugs, or a new fix contributed by Flow Forge.

No modifications, PRs, or comments were made to DuckDB upstream.
