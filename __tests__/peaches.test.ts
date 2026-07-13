import {
  legacySecondsToPeaches,
  migrateTenToOnePeaches,
  minutesToPeaches,
  peachesToSpendableMinutes,
  resolveStoredPeachBalance,
} from '../lib/peaches';

describe('Peaches economy', () => {
  it('converts one Peach to one unlock minute', () => {
    expect(minutesToPeaches(1)).toBe(1);
    expect(minutesToPeaches(12)).toBe(12);
    expect(peachesToSpendableMinutes(12)).toBe(12);
  });

  it('migrates legacy seconds without losing value', () => {
    expect(legacySecondsToPeaches(12 * 60)).toBe(12);
    expect(legacySecondsToPeaches(30)).toBe(1);
    expect(legacySecondsToPeaches(1)).toBe(1);
  });

  it('treats every whole Peach as a spendable minute', () => {
    expect(peachesToSpendableMinutes(0)).toBe(0);
    expect(peachesToSpendableMinutes(19)).toBe(19);
  });

  it('prefers a stored Peach balance so migration cannot run twice', () => {
    expect(resolveStoredPeachBalance(12, 12 * 60)).toBe(12);
    expect(resolveStoredPeachBalance(undefined, 12 * 60)).toBe(12);
  });

  it('preserves purchasing power when migrating the temporary ten-to-one economy', () => {
    expect(migrateTenToOnePeaches(120)).toBe(12);
    expect(migrateTenToOnePeaches(125)).toBe(13);
  });
});
