import { buildMonths, buildYears, firstActivityDate } from '../components/StatisticsPanel';

const at = (year: number, month: number, day: number) => new Date(year, month, day, 12).getTime();

describe('statistics calendar ranges', () => {
  const now = at(2026, 7, 3);

  it('starts at the first recorded squat and ignores zero-squat entries', () => {
    const start = firstActivityDate([
      { id: 'game', peaches: 1, squats: 0, completedAt: at(2024, 0, 1) },
      { id: 'first-squats', peaches: 1, squats: 10, completedAt: at(2026, 2, 18) },
      { id: 'later-squats', peaches: 1, squats: 10, completedAt: at(2026, 6, 1) },
    ], now);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2);
  });

  it('shows months from first activity through today in chronological order', () => {
    const months = buildMonths(new Map(), new Date(2026, 2, 18), now);

    expect(months.map((month) => month.label)).toEqual([
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
    ]);
  });

  it('only shows years in the activity range and keeps them chronological', () => {
    expect(buildYears(new Map(), new Date(2026, 2, 18), now).map(({ year }) => year)).toEqual([2026]);
    expect(buildYears(new Map(), new Date(2024, 8, 1), now).map(({ year }) => year)).toEqual([
      2024,
      2025,
      2026,
    ]);
  });
});
