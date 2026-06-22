type CompletionEntry = {
  completedAt: number;
};

function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function addLocalDays(dayStart: number, days: number) {
  const date = new Date(dayStart);
  date.setDate(date.getDate() + days);
  return startOfLocalDay(date.getTime());
}

export function calculateCurrentStreak(history: CompletionEntry[], now = Date.now()) {
  if (history.length === 0) return 0;

  const completedDays = new Set(history.map((entry) => startOfLocalDay(entry.completedAt)));
  const today = startOfLocalDay(now);
  const yesterday = addLocalDays(today, -1);

  if (!completedDays.has(today) && !completedDays.has(yesterday)) return 0;

  let cursor = completedDays.has(today) ? today : yesterday;
  let streak = 0;

  while (completedDays.has(cursor)) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
}
