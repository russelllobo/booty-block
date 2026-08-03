export type SquatActivityEntry = {
  completedAt: number;
  squats: number;
  source?: 'squat_session' | 'game';
};

export const GLUTE_JOURNEY_DAYS = 90;

export function isSquatActivity(entry: SquatActivityEntry) {
  return entry.squats > 0 || entry.source === 'game';
}

function localDateKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function countSquatActivityDays(history: SquatActivityEntry[]) {
  const completedDays = new Set(
    history
      .filter(isSquatActivity)
      .map((entry) => localDateKey(entry.completedAt)),
  );

  return Math.min(GLUTE_JOURNEY_DAYS, completedDays.size);
}
