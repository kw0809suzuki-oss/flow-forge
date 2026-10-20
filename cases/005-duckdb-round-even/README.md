# 005 — DuckDB #19491: accurate binary64 round-to-even

- Upstream Issue: https://github.com/duckdb/duckdb/issues/19491 (open when inspected on 2026-10-21)
- Date: **2026-10-21**
- DuckDB binary independently tested: **v1.5.6** using `@duckdb/node-api` in an isolated ARM64 Linux VM
- Oracle: Python **3.11** `round(float(x), precision)`
- **Status: reproduced widely; independent algorithmic proof-of-concept verified on finite sample; no DuckDB/C++ patch, compilation or upstream PR**

## Observation

`SELECT round_even(2.675::DOUBLE, 2)` returned `2.68` on DuckDB v1.5.6. Python's `round(2.675, 2)` returned `2.67`.

The exact binary64 value of the input is **2.67499999999999982236431605997495353221893310546875**, i.e. *less* than the decimal midpoint.

The current DuckDB source `extension/core_functions/scalar/math/numeric.cpp` uses `RoundOperatorPrecision<RoundHalfToEven>`; for nonnegative precision, its floating-point branch computes `Nearest(input * pow(10, precision)) / pow(10, precision)`. Multiplication in binary64 can erase the distinction between a value just below a decimal half point and the exact half point.

This is an **algorithmic cause** corroborated by source inspection, not proof that no other bugs exist.

## Experiments

1. Generated **1,506** deliberately midpoint-adjacent values, including negative inputs, at **precision = 2**.
2. Compared DuckDB v1.5.6 results to Python 3.11's `round` on each corresponding binary64 value.
3. **713 / 1,506** returned different results (approximately **47.3%** of this *biased stress sample*, not an incidence estimate for real-world numbers).

Example:

| Value | DuckDB `round_even(value,2)` | Python `round(value,2)` |
| --- | --- | --- |
| `2.675` | `2.68` | `2.67` |
| `-2.675` | `-2.68` | `-2.67` |
| `4.025` | `4.03` | `4.03` |

## Proposed mechanism

Rather than rounding `x * 10^precision` *in binary64*, extract the exact dyadic rational from the IEEE-754 bit representation, scale numerator or denominator by powers of 10 using arbitrary-precision integers, compare the remainder to exactly half the denominator, apply ties-to-even, and convert the rounded decimal result **once** to binary64.

See [standalone JavaScript prototype](round-even-exact.mjs).

The first prototype converted the rounded integer via `Number(integer) / 10**precision`; a broader comparison found failures at 15 decimal places caused by the final floating-point arithmetic. We **revised** it to construct the exact rounded decimal value as text and parse it once.

The revised prototype matched Python **1,506 / 1,506** for the original precision=2 sample, and **4,977 / 4,977** for a separate deterministic suite that included 700 generated values each tested at precisions `-2, 0, 1, 2, 4, 10, 15`, plus eleven edge inputs tested at all seven precisions. The latter comparison used `round(float(x), p)` to avoid accidentally comparing against Python's different integer-rounding behavior. Positive and negative inputs, subnormal and extremely large binary64 values were represented in that suite.

## What this changes

The original question was whether the DuckDB result was a bad tie-breaking policy. The actual observations instead made **correct identification of the decimal rounding boundary** the main problem. A correct ties-to-even decision cannot repair an input previously rounded to the wrong side of that boundary.

Our first proposed output conversion also introduced mistakes, so the prototype itself had to change.

## Important limitations

The JavaScript proof-of-concept is **not** a production solution. It restricts `precision` to `[-100,100]` and uses arbitrary-precision `BigInt` plus decimal-string parsing; it may be too slow and allocate excessively in a native SQL vectorized execution path. It has not been benchmarked, compiled into DuckDB, tested against every representable binary64, or validated over its complete declared precision range. The 4,977-comparison result is finite evidence, not a general guarantee.

An efficient DuckDB implementation might instead use an exact integer-quotient algorithm with bounded fast paths and carefully handled binary64 conversion. The interface and performance constraints should be evaluated separately before writing a C++ patch.

No changes, comments, or PR were submitted to upstream DuckDB.
