function assertInteger(value, label) {
  if (!Number.isSafeInteger(value)) throw new Error(`INVALID_${label}`);
}

export function greatestCommonDivisor(left, right) {
  assertInteger(left, 'NUMERATOR');
  assertInteger(right, 'DENOMINATOR');
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

export function normalizeFraction(numerator, denominator) {
  assertInteger(numerator, 'NUMERATOR');
  assertInteger(denominator, 'DENOMINATOR');
  if (denominator === 0) throw new Error('ZERO_DENOMINATOR');
  const sign = denominator < 0 ? -1 : 1;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return {
    numerator: sign * numerator / divisor,
    denominator: Math.abs(denominator) / divisor
  };
}

export function parseFraction(value) {
  if (value && Number.isSafeInteger(value.numerator) && Number.isSafeInteger(value.denominator)) {
    return normalizeFraction(value.numerator, value.denominator);
  }
  const text = typeof value === 'string' ? value : value?.value;
  const match = /^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/.exec(text ?? '');
  if (!match) throw new Error('INVALID_FRACTION');
  return normalizeFraction(Number(match[1]), Number(match[2]));
}

export function addFractions(left, right) {
  const a = parseFraction(left);
  const b = parseFraction(right);
  return normalizeFraction(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator
  );
}

export function fractionsEqual(left, right) {
  try {
    const a = parseFraction(left);
    const b = parseFraction(right);
    return a.numerator === b.numerator && a.denominator === b.denominator;
  } catch {
    return false;
  }
}

export function formatFraction(value) {
  const fraction = parseFraction(value);
  return `${fraction.numerator}/${fraction.denominator}`;
}
