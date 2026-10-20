# Flow Forge

An open workshop for exploring real software problems, testing fixes, and keeping the evidence — including failed approaches and unresolved questions.

We preserve the distinction between **reported bugs**, **independently reproduced behavior**, **proposed fixes**, and **verified fixes**. A patch is not a completed fix until it passes relevant tests.

## Cases

- [001 — Ruff FURB103: unsafe autofix for nested `write()`](cases/001-ruff-furb103/README.md) — reproduced; patch proposed; Rust build and regression tests pending.
- [002 — fast-check #6532: non-canonical NaN bit patterns](cases/002-fast-check-noncanonical-nan/README.md) — independently investigated and reproduced; raw-bit workaround and seed/path counterexample archived; no upstream fix.

- [003 — Ruff UP040/UP046/UP047: TypeVar keyword unpacking lost during autofix](cases/003-ruff-typevar-unpacking/README.md) — reproduced and extended to unpacked bounds; experimental guard patch prepared; Rust build/tests pending.

- [004 — DuckDB #26507: optimizer cast rewrite audit](cases/004-duckdb-cast-rewrite/README.md) — upstream fix already merged; 7/7 optimized-vs-unoptimized SQL checks pass on DuckDB v1.5.6.

- [005 — DuckDB #19491: binary64 round-to-even precision](cases/005-duckdb-round-even/README.md) — 713 differences in a 1,506-case stress sample; exact-rational prototype matched 4,977 Python oracle comparisons; C++ port untested.

Original projects and maintainers retain ownership of their code. Work here is independent unless an upstream pull request is explicitly submitted.
