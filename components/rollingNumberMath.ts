export type RollDirection = 'up' | 'down';

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function digitForPosition(position: number) {
  return positiveModulo(position, 10);
}

export function nextRollingDigitPosition(
  currentPosition: number,
  nextDigit: number,
  direction: RollDirection,
) {
  const currentDigit = digitForPosition(currentPosition);
  if (currentDigit === nextDigit) return currentPosition;

  if (direction === 'up') {
    return currentPosition + positiveModulo(nextDigit - currentDigit, 10);
  }

  return currentPosition - positiveModulo(currentDigit - nextDigit, 10);
}
