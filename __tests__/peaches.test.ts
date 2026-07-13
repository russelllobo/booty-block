import {
  legacySecondsToPeaches,
  minutesToPeaches,
  peachesToSpendableMinutes,
  resolveStoredPeachBalance,
} from '../lib/peaches';

describe('Peaches economy', () => {
  it('converts ten Peaches to one unlock minute', () => {
    expect(minutesToPeaches(1)).toBe(10);
    expect(minutesToPeaches(12)).toBe(120);
    expect(peachesToSpendableMinutes(125)).toBe(12);
  });

  it('migrates legacy seconds without losing value', () => {
    expect(legacySecondsToPeaches(12 * 60)).toBe(120);
    expect(legacySecondsToPeaches(30)).toBe(5);
    expect(legacySecondsToPeaches(1)).toBe(1);
  });

  it('keeps sub-minute leftovers but does not spend them as a full minute', () => {
    expect(peachesToSpendableMinutes(9)).toBe(0);
    expect(peachesToSpendableMinutes(19)).toBe(1);
  });

  it('prefers a stored Peach balance so migration cannot run twice', () => {
    expect(resolveStoredPeachBalance(125, 12 * 60)).toBe(125);
    expect(resolveStoredPeachBalance(undefined, 12 * 60)).toBe(120);
  });
});
