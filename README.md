# Flow Forge

An open workshop for exploring real software problems, testing fixes, and keeping the evidence — including failed approaches and unresolved questions.

We preserve the distinction between **reported bugs**, **independently reproduced behavior**, **proposed fixes**, and **verified fixes**. A patch is not a completed fix until it passes relevant tests.

## Cases

- [001 — Ruff FURB103: unsafe autofix for nested `write()`](cases/001-ruff-furb103/README.md) — reproduced; patch proposed; Rust build and regression tests pending.
- [002 — fast-check #6532: non-canonical NaN bit patterns](cases/002-fast-check-noncanonical-nan/README.md) — independently investigated and reproduced; raw-bit workaround and seed/path counterexample archived; no upstream fix.

Original projects and maintainers retain ownership of their code. Work here is independent unless an upstream pull request is explicitly submitted.
