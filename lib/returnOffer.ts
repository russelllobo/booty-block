import AsyncStorage from '@react-native-async-storage/async-storage';

const RETURN_OFFER_KEY = 'bootyblock:return-offer:v1';

export type ReturnOfferState = {
  onboardingPaywallSeenAt: number;
  returnFlowCompletedAt?: number;
};

function isValidTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function localDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function isReturnOfferDue(state: ReturnOfferState | null, now = Date.now()) {
  if (!state || state.returnFlowCompletedAt) return false;
  if (!isValidTimestamp(state.onboardingPaywallSeenAt) || state.onboardingPaywallSeenAt > now) {
    return false;
  }

  return localDayKey(state.onboardingPaywallSeenAt) < localDayKey(now);
}

export async function getReturnOfferState(): Promise<ReturnOfferState | null> {
  try {
    const raw = await AsyncStorage.getItem(RETURN_OFFER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ReturnOfferState>;
    if (!isValidTimestamp(parsed.onboardingPaywallSeenAt)) return null;

    return {
      onboardingPaywallSeenAt: parsed.onboardingPaywallSeenAt,
      ...(isValidTimestamp(parsed.returnFlowCompletedAt)
        ? { returnFlowCompletedAt: parsed.returnFlowCompletedAt }
        : {}),
    };
  } catch {
    return null;
  }
}

export async function shouldShowReturnOffer(now = Date.now()) {
  return isReturnOfferDue(await getReturnOfferState(), now);
}

export async function markOnboardingPaywallSeen(seenAt = Date.now()) {
  const current = await getReturnOfferState();
  if (current?.onboardingPaywallSeenAt) return;

  await AsyncStorage.setItem(RETURN_OFFER_KEY, JSON.stringify({
    onboardingPaywallSeenAt: seenAt,
  } satisfies ReturnOfferState));
}

export async function markReturnOfferFlowCompleted(completedAt = Date.now()) {
  const current = await getReturnOfferState();
  if (!current) return;

  await AsyncStorage.setItem(RETURN_OFFER_KEY, JSON.stringify({
    ...current,
    returnFlowCompletedAt: completedAt,
  } satisfies ReturnOfferState));
}

export async function clearReturnOfferState() {
  await AsyncStorage.removeItem(RETURN_OFFER_KEY);
}
