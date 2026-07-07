export type ProgressionEntry = {
  minutes: number;
  squats: number;
};

export type PeachLevel = {
  level: number;
  title: string;
  minXp: number;
};

export const peachLevels = [
  { level: 1, title: 'Baby Peach', minXp: 0 },
  { level: 2, title: 'Gym Girlie', minXp: 500 },
  { level: 3, title: 'Glute Goblin', minXp: 1500 },
  { level: 4, title: 'Doomscroll Slayer', minXp: 3200 },
  { level: 5, title: 'Peach Legend', minXp: 6000 },
] satisfies PeachLevel[];

const SQUAT_XP = 8;
const MINUTE_AVOIDED_XP = 5;
const STREAK_DAY_XP = 90;

export function calculatePeachXp(history: ProgressionEntry[], currentStreak: number) {
  const totals = history.reduce(
    (summary, entry) => ({
      squats: summary.squats + Math.max(0, entry.squats),
      minutesAvoided: summary.minutesAvoided + Math.max(0, entry.minutes),
    }),
    { squats: 0, minutesAvoided: 0 },
  );
  const streakDays = Math.max(0, currentStreak);
  const xp = (totals.squats * SQUAT_XP)
    + (totals.minutesAvoided * MINUTE_AVOIDED_XP)
    + (streakDays * STREAK_DAY_XP);

  return {
    xp,
    squats: totals.squats,
    minutesAvoided: totals.minutesAvoided,
    streakDays,
  };
}

export function getPeachProgress(history: ProgressionEntry[], currentStreak: number) {
  const totals = calculatePeachXp(history, currentStreak);
  const currentLevel = [...peachLevels].reverse().find((level) => totals.xp >= level.minXp) ?? peachLevels[0];
  const nextLevel = peachLevels.find((level) => level.minXp > totals.xp) ?? null;
  const previousMinXp = currentLevel.minXp;
  const nextMinXp = nextLevel?.minXp ?? previousMinXp;
  const xpForLevel = Math.max(0, nextMinXp - previousMinXp);
  const xpIntoLevel = nextLevel ? totals.xp - previousMinXp : xpForLevel;
  const xpToNext = nextLevel ? Math.max(0, nextLevel.minXp - totals.xp) : 0;
  const progressRatio = nextLevel && xpForLevel > 0
    ? Math.min(1, Math.max(0, xpIntoLevel / xpForLevel))
    : 1;

  return {
    ...totals,
    currentLevel,
    nextLevel,
    xpForLevel,
    xpIntoLevel,
    xpToNext,
    progressRatio,
  };
}
