# 002 — fast-check #6532: non-canonical NaN generation and bit-exact round trips

- Upstream issue: https://github.com/dubzzz/fast-check/issues/6532
- Investigation: **2026-10-15** (Technical Flow, Floot compute VM)
- Issue state when checked on 2026-10-21: **open**
- **Status: reproduced; independent workaround explored; counterexample found and replayed; no upstream fix**

## Why this mattered

JavaScript NaNs compare indistinguishably as numeric values, but their raw IEEE-754 bit patterns may differ. That matters when testing bit-perfect serialization or typed-array round trips. The issue reports that fast-check's `float32Array()` and `float64Array()` do not generate non-canonical NaNs.

## Environment and observations

Node.js **22.23.2**, fast-check **4.10.2**, run in an isolated Floot VM. The upstream reporter used fast-check 4.5.3.

1. Standard `fc.float32Array({minLength:1,maxLength:5})`, seed **6532**, **6,000 arrays**: 2 NaNs, only one NaN pattern (`0x7fc00000`).
2. Standard `fc.float64Array({minLength:1,maxLength:5})`, same sampling conditions: 11 NaNs, one NaN pattern (`0x7ff8000000000000`).
3. Alternative `fc.uint32Array({minLength:1,maxLength:4})` mapped over shared raw bytes to `Float32Array`, seed **20261015**, **20,000 arrays**: **759 NaNs**, **224 distinct non-canonical NaN patterns** observed.

These are finite sampling results, not a proof that all distributions or runtimes behave the same way.

## What broke, and what was preserved

On the tested VM, `Float32Array` buffer copies, `.slice()`, `.subarray()`, and `Float32Array.from(typedArray)` preserved the signaling NaN bits `0x7f800001`.

Converting through a *plain numeric array* — e.g. `new Float32Array([...array])` — changed it to `0x7fc00001`. `JSON.stringify([...array])` produced `[null]`, losing NaN identity altogether.

The tested Float64 signaling NaN `0x7ff0000000000001` **did not show the same spread-copy change** in that VM; do not generalize the Float32 result to Float64.

## Property-based exploration

Using the [raw-bit generator](raw-float32-array.mjs) and the property that a numeric-array round trip preserves the original 32-bit words:

- `fc.check(..., {numRuns:1000, seed:6532})` detected a failure on run **118**.
- Shrinking took **14** steps.
- Minimized words: `[0xff800001, 0x00000000]`.
- Replay **seed** `6532`, **path** `117:13:1:1:1:3:2:1:2:2:2:2:2:3:3`; the original investigation confirmed replay of the same failure.
- An independent scan of signaling NaN payloads found `0x7f800001` as the smallest example. A separate byte-buffer copying property passed 200 examples.

## Proposed direction

For tests requiring exact IEEE-754 payloads, generate **integer bit patterns**, then reinterpret their backing buffer as `Float32Array`, with an inverse mapping for shrinking. This is an independent workaround, **not a fast-check patch**.

Before proposing an upstream change, investigate constraints compatibility, distributions, shrink quality, Float64 coverage, JavaScript engine portability, and compatibility with fast-check's existing API.

## Boundaries and provenance

**Verified in the original Technical Flow experiment:** Issue and implementation review; finite sampling; the raw-bit generator; a bit-loss counterexample; shrinking and deterministic seed/path replay.

**Not verified:** Any fix merged into fast-check, cross-engine generality, a production-ready generator, full Float64 coverage, persistent AI learning, or a comprehensive resolution of #6532.

Original experiment note (not automatically exported to this repository):
`static/__dev/notes/technical-flow-github-fast-check-nan-issue-6532-2026-10-15.md` in the Technical Flow Floot project. Its measurements are the source for this retrospective case record.

No comment, PR, or patch was submitted upstream.
