// Independent experimental workaround for dubzzz/fast-check#6532.
// Install: npm install fast-check@4.10.2
// Run: node raw-float32-array.mjs
// Not a production-ready replacement for fc.float32Array().
import fc from "fast-check";

export const rawFloat32Array = fc.uint32Array({
  minLength: 1,
  maxLength: 4,
}).map(
  words => new Float32Array(
    words.buffer.slice(words.byteOffset, words.byteOffset + words.byteLength)
  ),
  floats => new Uint32Array(
    floats.buffer.slice(floats.byteOffset, floats.byteOffset + floats.byteLength)
  )
);

const bits = array => Array.from(
  new Uint32Array(array.buffer, array.byteOffset, array.length),
  v => v.toString(16)
);

for (const array of fc.sample(rawFloat32Array, { seed: 20261015, numRuns: 10 })) {
  console.log(bits(array));
}

// Recreate the property experiment with fixed generator constraints (length 1..3):
const roundTripArbitrary = fc.uint32Array({ minLength: 1, maxLength: 3 }).map(
  words => new Float32Array(words.buffer.slice(words.byteOffset, words.byteOffset + words.byteLength)),
  floats => new Uint32Array(floats.buffer.slice(floats.byteOffset, floats.byteOffset + floats.byteLength))
);
const sameBytes = (a,b) => {
  const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const y = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  return x.length === y.length && x.every((v,i) => v === y[i]);
};
const result = fc.check(
  fc.property(roundTripArbitrary, arr => sameBytes(arr, new Float32Array([...arr]))),
  { numRuns: 1000, seed: 6532 }
);
console.log({ failed: result.failed, counterexample: result.counterexample?.map(bits), seed: result.seed, path: result.counterexamplePath });
