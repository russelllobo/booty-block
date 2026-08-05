import {
  DEFAULT_BOOTY_LOCKS,
  formatBootyLockTime,
  normalizeBootyLocks,
} from '../lib/bootyLocks';

describe('booty locks', () => {
  it('defaults to midnight, noon, and 6 pm enabled every day', () => {
    expect(normalizeBootyLocks(undefined)).toEqual(DEFAULT_BOOTY_LOCKS);
    expect(DEFAULT_BOOTY_LOCKS.map(formatBootyLockTime).map((time) => time.label)).toEqual([
      '12:00 am',
      '12:00 pm',
      '6:00 pm',
    ]);
  });

  it('keeps valid stored schedules and clamps invalid time components', () => {
    expect(normalizeBootyLocks([
      { id: 'morning', hour: 7, minute: 30, enabled: false },
      { id: 'late', hour: 28, minute: 90, enabled: true },
    ])).toEqual([
      { id: 'morning', hour: 7, minute: 30, enabled: false },
      { id: 'late', hour: 23, minute: 59, enabled: true },
    ]);
  });
});
