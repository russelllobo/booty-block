import { calculatePeachXp, getPeachProgress } from '../lib/progression';

const entry = (minutes: number, squats: number) => ({ minutes, squats });

describe('peach progression', () => {
  it('adds Peach XP from lifetime squats, minutes avoided, and streak days', () => {
    expect(calculatePeachXp([entry(10, 10), entry(5, 5)], 3)).toEqual({
      xp: 465,
      squats: 15,
      minutesAvoided: 15,
      streakDays: 3,
    });
  });

  it('returns the current level and next level progress', () => {
    const progress = getPeachProgress([entry(20, 20), entry(20, 20)], 3);

    expect(progress.currentLevel.title).toBe('Gym Girlie');
    expect(progress.nextLevel?.title).toBe('Glute Goblin');
    expect(progress.xp).toBe(790);
    expect(progress.xpToNext).toBe(710);
  });

  it('caps progress at Peach Legend', () => {
    const progress = getPeachProgress([entry(500, 500)], 20);

    expect(progress.currentLevel.title).toBe('Peach Legend');
    expect(progress.nextLevel).toBeNull();
    expect(progress.progressRatio).toBe(1);
    expect(progress.xpToNext).toBe(0);
  });
});
