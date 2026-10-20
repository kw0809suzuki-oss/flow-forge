# 003 — Ruff #27008: PEP 695 autofix drops unpacked `TypeVar` keywords

- Upstream issue: https://github.com/astral-sh/ruff/issues/27008
- Investigation: 2026-10-21, Technical Flow (ARM64 Linux Floot VM)
- Tested binary: **ruff 0.17.1**
- Source snapshot consulted: `astral-sh/ruff@807f7239a1a19b5b979552fc8dc84e1205f65dfa`
- **Status: reproduced; additional examples measured; experimental patch prepared; Rust compilation/behavior NOT verified**

## Reproduction

Run:

```bash
ruff check --isolated --target-version py314 --preview \
  --select UP040,UP046,UP047 --unsafe-fixes --fix issue.py
```

Using the [minimal reproducer](repro.py), Ruff reported **3 fixed issues**, and rewrote the type alias, class, and function to PEP 695 syntax, but discarded the default specified in:

```python
T = TypeVar("T", **{"default": Any})
```

For example, `type AnyList[T]` replaced the parameter that should preserve `T = Any` at runtime.

The original issue reports that Python 3.14 changes `has_default()` from `True` before rewriting to `False` afterward for all three constructs. **This investigation independently reproduced the transformation, not the Python 3.14 runtime comparison**, because the VM has Python 3.11.

## Exploratory 7-case matrix

Each row was tested independently with Ruff 0.17.1 in a file containing a `TypeAliasType`, a `Generic[T]` class, and a function referencing `T`, with all three rules enabled.

| `T = ...` construction | Ruff output | Behavior/assessment |
| --- | --- | --- |
| `TypeVar("T", default=Any)` | `[T = Any]` | default represented |
| `TypeVar("T", **{"default": Any})` | `[T]` | default omitted |
| `TypeVar("T", bound=str)` | `[T: str]` | bound represented |
| `TypeVar("T", **{"bound": str})` | `[T]` | bound omitted |
| `TypeVar("T", **{})` | `[T]` | appears harmless, but static analysis does not generally know expanded contents |
| `options={"default":Any}; TypeVar("T", **options)` | `[T]` | default omitted |
| `TypeVar("T", bound=str, **{"default": Any})` | `[T: str]` | default omitted; bound retained |

In **all seven cases**, Ruff reported `Found 3 errors (3 fixed, 0 remaining)`. The table shows the actual generated syntax. This expands the investigation beyond the original issue: both **default** and **bound** information may be dropped.

## Source-level mechanism

Shared parsing code in `pep695/mod.rs`, function `expr_name_to_type_var`, extracts explicit `default` and `bound` using `arguments.find_keyword(...)`. Unpacked keyword entries have no explicit keyword name at that call site. The resulting `TypeVar` representation therefore lacks information supplied through `**kwargs`; downstream UP040/046/047 fix builders construct a PEP 695 type parameter list without it.

## Choice made

Possible directions included evaluating arbitrary `**kwargs`, suppressing all three rules, or **retaining diagnostics but withholding automatic fixes when referenced `TypeVar` constructors have keyword unpacking**. We chose the latter to avoid executing/evaluating source code and retain useful feedback and ordinary direct-keyword conversions.

The [experimental Rust patch](proposed.patch) introduces a shared unpacked-keyword check and uses it for all three autofixes. Its **7 textual diff hunks matched the pinned source**, checked independently against the original files in the isolated VM.

**Not verified:** compilation, Rust test suite, snapshot output, handling of re-exported or shadowed type parameters, effects on Ruff's fix metadata, or that the proposed patch fully resolves the issue. The patch is an experiment, not an upstream contribution. It has not been applied to Ruff or submitted as a PR.

## Next meaningful test

Apply to a Ruff checkout at a known commit, run `cargo test` for the UP040/046/047 fixtures, verify that unpacked-keyword cases retain diagnostics but receive no fixes, and ensure direct keyword cases still fix correctly. Review unusual resolution paths before proposing upstream.

A comment already exists on the upstream issue proposing to suppress autofixes for keyword unpacking; the direction itself is **not claimed as an original discovery**. This experiment independently validated an additional `bound` case and mapped the shared implementation.
