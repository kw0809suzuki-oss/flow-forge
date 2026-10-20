// Independent research prototype for duckdb/duckdb#19491.
// NOT an upstream patch. Verified only for specified experiments.
// Rounds a binary64 input to decimal places using an exact rational comparison,
// then converts the rounded decimal result once to the nearest binary64.
export function roundEvenExact(x, precision) {
  if (!Number.isInteger(precision) || precision < -100 || precision > 100) {
    throw new RangeError("Prototype supports integral precision from -100 to 100");
  }
  if (!Number.isFinite(x) || x === 0) return x;

  const negative = x < 0;
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, Math.abs(x), false);
  const bits = view.getBigUint64(0, false);

  const exponent = Number((bits >> 52n) & 2047n);
  let numerator = bits & ((1n << 52n) - 1n);
  let denominator = 1n;

  if (exponent === 0) {
    // IEEE-754 subnormal: fraction * 2^-1074
    denominator = 1n << 1074n;
  } else {
    numerator |= 1n << 52n;
    const shift = exponent - 1023 - 52;
    if (shift >= 0) numerator <<= BigInt(shift);
    else denominator = 1n << BigInt(-shift);
  }

  if (precision >= 0) numerator *= 10n ** BigInt(precision);
  else denominator *= 10n ** BigInt(-precision);

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const isMoreThanHalf = 2n * remainder > denominator;
  const isTieAtOdd = 2n * remainder === denominator && (quotient & 1n) === 1n;
  const rounded = quotient + (isMoreThanHalf || isTieAtOdd ? 1n : 0n);

  // Avoid Number(rounded) / 10**precision: that introduces a second
  // floating-point rounding and showed discrepancies at precision=15.
  const digits = rounded.toString();
  let decimal;
  if (precision === 0) decimal = digits;
  else if (precision < 0) decimal = digits + "0".repeat(-precision);
  else if (digits.length <= precision) {
    decimal = "0." + "0".repeat(precision - digits.length) + digits;
  } else {
    decimal = digits.slice(0, -precision) + "." + digits.slice(-precision);
  }
  return Number((negative ? "-" : "") + decimal);
}
