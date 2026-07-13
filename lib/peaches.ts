import { PEACHES_PER_MINUTE } from '../constants/bootyblock';

export function minutesToPeaches(minutes: number) {
  return Math.max(0, Math.round(minutes * PEACHES_PER_MINUTE));
}

export function legacySecondsToPeaches(seconds: number) {
  return Math.max(0, Math.ceil(seconds / (60 / PEACHES_PER_MINUTE)));
}

export function resolveStoredPeachBalance(peachBalance: unknown, legacySeconds: number) {
  return typeof peachBalance === 'number' && Number.isFinite(peachBalance)
    ? Math.max(0, Math.floor(peachBalance))
    : legacySecondsToPeaches(legacySeconds);
}

export function peachesToSpendableMinutes(peaches: number) {
  return Math.max(0, Math.floor(peaches / PEACHES_PER_MINUTE));
}
