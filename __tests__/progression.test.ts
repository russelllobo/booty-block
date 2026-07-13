import { calculateBootyXp, getBootyProgress } from '../lib/progression';

const entry = (peaches: number, squats: number) => ({ peaches, squats });

describe('Booty XP progression', () => {
  it('adds Booty XP from lifetime squats, Peaches, and streak days', () => {
    expect(calculateBootyXp([entry(10, 10), entry(5, 5)], 3)).toEqual({
      xp: 465,
      squats: 15,
      peachesEarned: 15,
      streakDays: 3,
      bonusXp: 0,
    });
  });

  it('adds milestone and game bonus XP', () => {
    expect(calculateBootyXp([], 0, 150)).toEqual({
      xp: 150,
      squats: 0,
      peachesEarned: 0,
      streakDays: 0,
      bonusXp: 150,
    });
  });

  it('returns the current level and next level progress', () => {
    const progress = getBootyProgress([entry(20, 20), entry(20, 20)], 3);

    expect(progress.currentLevel.title).toBe('Gym Girlie');
    expect(progress.nextLevel?.title).toBe('Glute Goblin');
    expect(progress.xp).toBe(790);
    expect(progress.xpToNext).toBe(710);
  });

  it('caps progress at Peach Legend', () => {
    const progress = getBootyProgress([entry(500, 500)], 20);

    expect(progress.currentLevel.title).toBe('Peach Legend');
    expect(progress.nextLevel).toBeNull();
    expect(progress.progressRatio).toBe(1);
    expect(progress.xpToNext).toBe(0);
  });
});
