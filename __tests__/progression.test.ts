import { calculateBootyXp, getBootyProgress } from '../lib/progression';

const entry = (peaches: number, squats: number) => ({ peaches, squats });

describe('Booty XP progression', () => {
  it('adds Booty XP from lifetime squats, Peaches, and streak days', () => {
    expect(calculateBootyXp([entry(100, 10), entry(50, 5)], 3)).toEqual({
      xp: 465,
      squats: 15,
      peachesEarned: 150,
      streakDays: 3,
    });
  });

  it('returns the current level and next level progress', () => {
    const progress = getBootyProgress([entry(200, 20), entry(200, 20)], 3);

    expect(progress.currentLevel.title).toBe('Gym Girlie');
    expect(progress.nextLevel?.title).toBe('Glute Goblin');
    expect(progress.xp).toBe(790);
    expect(progress.xpToNext).toBe(710);
  });

  it('caps progress at Peach Legend', () => {
    const progress = getBootyProgress([entry(5000, 500)], 20);

    expect(progress.currentLevel.title).toBe('Peach Legend');
    expect(progress.nextLevel).toBeNull();
    expect(progress.progressRatio).toBe(1);
    expect(progress.xpToNext).toBe(0);
  });
});
