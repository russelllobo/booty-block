export type BootyLock = {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
};

export const DEFAULT_BOOTY_LOCKS: BootyLock[] = [
  { id: 'midnight', hour: 0, minute: 0, enabled: true },
  { id: 'noon', hour: 12, minute: 0, enabled: true },
  { id: 'evening', hour: 18, minute: 0, enabled: true },
];

export const MAX_BOOTY_LOCKS = 8;

export function normalizeBootyLocks(value: unknown): BootyLock[] {
  if (!Array.isArray(value)) return DEFAULT_BOOTY_LOCKS.map((lock) => ({ ...lock }));

  const locks = value
    .filter((lock): lock is Partial<BootyLock> => Boolean(lock && typeof lock === 'object'))
    .map((lock, index) => ({
      id: typeof lock.id === 'string' && lock.id ? lock.id : `lock-${index}`,
      hour: Math.min(23, Math.max(0, Math.floor(Number(lock.hour) || 0))),
      minute: Math.min(59, Math.max(0, Math.floor(Number(lock.minute) || 0))),
      enabled: lock.enabled !== false,
    }))
    .slice(0, MAX_BOOTY_LOCKS);

  return locks.length > 0 ? locks : DEFAULT_BOOTY_LOCKS.map((lock) => ({ ...lock }));
}
export function formatBootyLockTime(lock: Pick<BootyLock, 'hour' | 'minute'>) {
  const displayHour = lock.hour % 12 || 12;
  const minute = String(lock.minute).padStart(2, '0');
  const period = lock.hour >= 12 ? 'pm' : 'am';
  return { displayHour, minute, period, label: `${displayHour}:${minute} ${period}` };
}
