# 001 — Ruff FURB103: unsafe autofix for nested `write()`

- Upstream issue: https://github.com/astral-sh/ruff/issues/29452
- Upstream project: https://github.com/astral-sh/ruff
- Investigation: October 2026
- **Status: independently reproduced / fix proposed / fix NOT validated in compiled Ruff**

## Observed bug

Using Ruff **v0.17.1**, `ruff check --preview --isolated --select FURB103 --fix repro.py` was run in an isolated ARM64 Linux environment.

| Case | Before autofix | After autofix |
| --- | --- | --- |
| `flag and f.write("hello")`, with `flag=False` | file reads as `''` | file reads as `'hello'` |
| `print(f.write("abc"))` | stdout `3` | stdout empty |
| standalone `f.write("abc")` | works | works |

Both nested-expression cases change behavior despite an ordinary `--fix`.

## Cause found in upstream source

File: `crates/ruff_linter/src/rules/refurb/rules/write_whole_file.rs`.

`WriteMatcher` recursively finds a `write()` call, while `generate_fix` only requires the `with` body to contain one `Stmt::Expr`. It then replaces the entire `with` statement. A matched write may be nested in a conditional expression or another function call, so this replacement discards its surrounding behavior.

## Proposed minimal change

Only generate the whole-statement fix if the matched `write()` expression covers the **entire** expression statement. Preserve autofix on the straightforward `f.write(...)` case, but withhold the fix for nested expression cases.

Files here:
- [Proposed Rust patch](fix.patch)
- [Regression-case inputs](regression-cases.py)

## Evidence boundary

**Confirmed:** reproducibility on Ruff v0.17.1; relevant upstream source and match condition inspected; source-level patch drafted.

**Not confirmed:** that the patch compiles against Ruff, passes its Rust unit/snapshot suite, correctly handles every AST edge case, or has been accepted upstream. The Python file contains proposed fixture inputs, **not a passing Ruff regression test suite**.

The upstream Issue already contains a volunteer offering to implement a similar guard, and the issue discussion acknowledges that volunteer. **No pull request was created or sent upstream from this investigation.**

## Next check

Apply the patch to a pinned Ruff source checkout, run Ruff's FURB103 fixtures, and ensure the two nested cases no longer receive an automatic fix while the standalone case still does.
