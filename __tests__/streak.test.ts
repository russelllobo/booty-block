import { calculateCurrentStreak } from '../lib/streak';

const day = (year: number, month: number, date: number, hour = 12) =>
  new Date(year, month - 1, date, hour).getTime();

const entry = (completedAt: number) => ({
  id: String(completedAt),
  peaches: 10,
  squats: 10,
  completedAt,
});

describe('calculateCurrentStreak', () => {
  it('counts consecutive days through today', () => {
    const now = day(2026, 6, 22);

    expect(
      calculateCurrentStreak(
        [
          entry(day(2026, 6, 22, 8)),
          entry(day(2026, 6, 21)),
          entry(day(2026, 6, 20)),
          entry(day(2026, 6, 18)),
        ],
        now,
      ),
    ).toBe(3);
  });

  it('keeps the streak alive before the user completes today', () => {
    const now = day(2026, 6, 22);

    expect(calculateCurrentStreak([entry(day(2026, 6, 21)), entry(day(2026, 6, 20))], now)).toBe(2);
  });

  it('returns zero once today and yesterday are both missed', () => {
    const now = day(2026, 6, 22);

    expect(calculateCurrentStreak([entry(day(2026, 6, 20))], now)).toBe(0);
  });

  it('only counts a day once when multiple slots are completed', () => {
    const now = day(2026, 6, 22);

    expect(
      calculateCurrentStreak(
        [
          entry(day(2026, 6, 22, 9)),
          entry(day(2026, 6, 22, 20)),
          entry(day(2026, 6, 21)),
        ],
        now,
      ),
    ).toBe(2);
  });
});
