import {
  countSquatActivityDays,
  GLUTE_JOURNEY_DAYS,
  isSquatActivity,
} from '../lib/squatActivity';

function day(year: number, month: number, date: number, hour = 12) {
  return new Date(year, month, date, hour).getTime();
}

describe('squat activity journey', () => {
  it('starts with zero completed days', () => {
    expect(countSquatActivityDays([])).toBe(0);
  });

  it('fills only once for multiple squat sessions on the same local day', () => {
    expect(countSquatActivityDays([
      { completedAt: day(2026, 7, 3, 8), squats: 10, source: 'squat_session' },
      { completedAt: day(2026, 7, 3, 20), squats: 15, source: 'squat_session' },
      { completedAt: day(2026, 7, 2), squats: 5, source: 'squat_session' },
    ])).toBe(2);
  });

  it('counts squat-controlled games but ignores entries without squat activity', () => {
    const game = { completedAt: day(2026, 7, 3), squats: 0, source: 'game' as const };
    const empty = { completedAt: day(2026, 7, 2), squats: 0 };

    expect(isSquatActivity(game)).toBe(true);
    expect(isSquatActivity(empty)).toBe(false);
    expect(countSquatActivityDays([game, empty])).toBe(1);
  });

  it('caps the journey at 90 filled boxes', () => {
    const history = Array.from({ length: GLUTE_JOURNEY_DAYS + 5 }, (_, index) => ({
      completedAt: day(2026, 0, 1 + index),
      squats: 1,
      source: 'squat_session' as const,
    }));

    expect(countSquatActivityDays(history)).toBe(GLUTE_JOURNEY_DAYS);
  });
});
