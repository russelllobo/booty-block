import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePostHog } from 'posthog-react-native';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Modal, Platform, StyleSheet } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { SubscriptionPaywall } from '../../components/SubscriptionPaywall';
import {
  MAX_SQUAT_SESSION_PEACHES,
  PEACHES_PER_MINUTE,
  PEACHES_PER_SQUAT,
} from '../../constants/bootyblock';
import { captureAnalytics, trackOnboardingStepViewed } from '../analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../onboardingSteps';
import {
  getPaywallOfferingDiagnostics,
  hasActiveEntitlement,
  OneTimeOfferNotDiscountedError,
  revenueCatService,
  type PaywallOfferingDiagnostics,
} from '../services/revenueCat';
import {
  screenTimeService,
  ScreenTimeSelectionSummary,
  ScreenTimeStatus,
} from '../services/screenTime';
import { tiktokService } from '../services/tiktok';
import { calculateCurrentStreak } from '../streak';
import { migrateTenToOnePeaches, minutesToPeaches, resolveStoredPeachBalance } from '../peaches';

type PeachEarnedSession = {
  peaches: number;
  squats: number;
  peachBalance: number;
  completedAt: number;
};

type GamePeachSession = PeachEarnedSession & {
  source: 'game';
  gameId: string;
  score: number;
  durationSeconds: number;
  xpAwarded: number;
};

export type XpRewardNotice = {
  id: string;
  amount: number;
  title: string;
  message: string;
};

type UsageWindow = {
  startedAt: number;
  seconds: number;
  startedSeconds: number;
};

export type RoutineReminderTime = {
  hour: number;
  minute: number;
};

export type UnlockHistoryEntry = {
  id: string;
  peaches: number;
  squats: number;
  completedAt: number;
  source?: 'squat_session' | 'game';
  gameId?: string;
  score?: number;
  durationSeconds?: number;
};

type BootyblockState = {
  hydrated: boolean;
  onboardingComplete: boolean;
  hasAppAccess: boolean;
  profileName: string;
  onboardingGoals: string[];
  ageRange: string;
  exerciseFrequency: string;
  dailyScreenTimeHours: number;
  dailyScreenTimeGoalHours: number;
  routineReminderTime: RoutineReminderTime | null;
  screenTimeStatus: ScreenTimeStatus;
  selectedAppsConfigured: boolean;
  selectionSummary: ScreenTimeSelectionSummary | null;
  selectedAppsLabel: string;
  requestedPeaches: number;
  peachBalance: number;
  usageWindow: UsageWindow | null;
  usageWindowSeconds: number;
  unlockHistory: UnlockHistoryEntry[];
  bonusXp: number;
  earnedXpMilestones: string[];
  xpRewardNotice: XpRewardNotice | null;
  currentStreak: number;
  subscriptionHydrated: boolean;
  subscriptionConfigured: boolean;
  isSubscribed: boolean;
  subscriptionCelebrationPending: boolean;
  subscriptionError: string | null;
  completeOnboarding: () => Promise<void>;
  setProfileName: (name: string) => void;
  setOnboardingGoals: (goals: string[]) => void;
  setAgeRange: (ageRange: string) => void;
  setExerciseFrequency: (frequency: string) => void;
  setUsageTargets: (currentHours: number, goalHours: number) => void;
  setRoutineReminderTime: (time: RoutineReminderTime | null) => void;
  requestScreenTime: () => Promise<ScreenTimeStatus>;
  markSelectionConfigured: () => Promise<boolean>;
  setRequestedPeaches: (peaches: number) => void;
  earnPeaches: (peaches: number) => Promise<PeachEarnedSession>;
  earnGamePeaches: (input: { peaches: number; gameId: string; score: number; durationSeconds: number }) => Promise<GamePeachSession>;
  spendPeachesForMinutes: (minutes: number) => Promise<boolean>;
  syncUsageWindow: () => void;
  refreshSubscription: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  presentSubscriptionPaywall: (options?: { force?: boolean }) => Promise<boolean>;
  presentOneTimeOffer: () => Promise<boolean>;
  requestSubscriptionAccess: () => Promise<boolean>;
  requestOnboardingSubscriptionAccess: () => Promise<SubscriptionAccessStatus>;
  consumeSubscriptionCelebration: () => void;
  openSubscriptionManagement: () => Promise<void>;
  dismissXpRewardNotice: () => void;
  resetAppData: () => Promise<void>;
};

type SubscriptionAccessOptions = {
  analyticsFlow?: 'onboarding';
};

export type SubscriptionAccessStatus = 'active' | 'declined' | 'unavailable';

type SubscriptionAccessOutcome = {
  active: boolean;
  status: SubscriptionAccessStatus;
};

function offeringAnalyticsProperties(diagnostics: PaywallOfferingDiagnostics) {
  return {
    offering_id: diagnostics.offeringIdentifier,
    package_count: diagnostics.packageCount,
    package_ids: diagnostics.packageIdentifiers.join('|'),
    product_ids: diagnostics.productIdentifiers.join('|'),
    localized_prices: diagnostics.priceStrings.join('|'),
    currency_codes: diagnostics.currencyCodes.join('|'),
  };
}

function errorAnalyticsProperties(error: unknown) {
  const details = error && typeof error === 'object'
    ? error as Record<string, unknown>
    : {};
  const userInfo = details.userInfo && typeof details.userInfo === 'object'
    ? details.userInfo as Record<string, unknown>
    : {};
  const message = error instanceof Error
    ? error.message
    : typeof details.message === 'string'
      ? details.message
      : String(error);

  return {
    error_code: details.code == null ? 'unknown' : String(details.code),
    readable_error_code:
      typeof userInfo.readableErrorCode === 'string'
        ? userInfo.readableErrorCode
        : typeof details.readableErrorCode === 'string'
          ? details.readableErrorCode
          : 'unknown',
    error_message: message.slice(0, 500),
    underlying_error_message:
      typeof details.underlyingErrorMessage === 'string'
        ? details.underlyingErrorMessage.slice(0, 500)
        : '',
  };
}

const STORAGE_KEY = 'bootyblock:v1';
const RESET_SUBSCRIPTION_STATE_KEY = 'bootyblock:subscription-reset';
const USAGE_WINDOW_MONITOR_VERSION = 1;
const STORAGE_SCHEMA_VERSION = 3;
const BLOCKED_APPS_XP = 100;
const GAME_COMPLETION_XP = 50;
const BLOCKED_APPS_MILESTONE = 'blocked_apps_configured';

const BootyblockContext = createContext<BootyblockState | null>(null);

function hasSubscriptionAccess(isSubscribed: boolean) {
  return Platform.OS === 'web' || isSubscribed;
}

function elapsedSecondsSince(startedAt: number | null | undefined) {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function defaultPayload() {
  const webUiPreview = Platform.OS === 'web';
  const now = Date.now();

  return {
    onboardingComplete: webUiPreview,
    profileName: '',
    onboardingGoals: [] as string[],
    ageRange: '18-24',
    exerciseFrequency: '',
    dailyScreenTimeHours: 5,
    dailyScreenTimeGoalHours: 3,
    routineReminderTime: null as RoutineReminderTime | null,
    screenTimeStatus: webUiPreview ? 'approved' as ScreenTimeStatus : screenTimeService.getAuthorizationStatus(),
    selectedAppsConfigured: webUiPreview,
    selectionSummary: webUiPreview
      ? { applicationCount: 3, categoryCount: 1, webDomainCount: 0 }
      : null as ScreenTimeSelectionSummary | null,
    schemaVersion: STORAGE_SCHEMA_VERSION,
    requestedPeaches: 10,
    peachBalance: webUiPreview ? 12 : 0,
    usageWindow: null as UsageWindow | null,
    usageWindowSeconds: 0,
    usageWindowMonitorVersion: 0,
    unlockHistory: webUiPreview
      ? ([
          { id: 'preview-1', peaches: 10, squats: 10, completedAt: now },
          { id: 'preview-2', peaches: 15, squats: 15, completedAt: now - 86_400_000 },
          { id: 'preview-3', peaches: 5, squats: 5, completedAt: now - 2 * 86_400_000 },
          { id: 'preview-4', peaches: 20, squats: 20, completedAt: now - 7 * 86_400_000 },
          { id: 'preview-5', peaches: 30, squats: 30, completedAt: now - 18 * 86_400_000 },
        ] satisfies UnlockHistoryEntry[])
      : ([] as UnlockHistoryEntry[]),
    bonusXp: 0,
    earnedXpMilestones: [] as string[],
  };
}

type StoredUnlockHistoryEntry = Omit<UnlockHistoryEntry, 'peaches'> & {
  peaches?: number;
  minutes?: number;
};

type StoredPayload = Omit<ReturnType<typeof defaultPayload>, 'unlockHistory'> & {
  schemaVersion?: number;
  requestedMinutes?: number;
  timeBankMinutes?: number;
  timeBankSeconds?: number;
  activeUnlock?: { startedAt?: number; minutes?: number };
  timeBankStartedAt?: number | null;
  timeBankStartedSeconds?: number;
  usageWindow?: UsageWindow | null;
  unlockHistory: StoredUnlockHistoryEntry[];
};

type OneTimeOfferModalState = {
  offering: Awaited<ReturnType<typeof revenueCatService.getOneTimeOfferPaywallOffering>>;
  resolve: (active: boolean) => void;
};

type NormalPaywallResult = {
  active: boolean;
  cancelled: boolean;
  result: 'CANCELLED' | 'PURCHASED' | 'RESTORED';
  offering: PaywallOfferingDiagnostics;
};

type NormalPaywallModalState = {
  offering: Awaited<ReturnType<typeof revenueCatService.getNormalPaywallOffering>>;
  resolve: (result: NormalPaywallResult) => void;
};

export function BootyblockProvider({ children }: PropsWithChildren) {
  const posthog = usePostHog();
  const [hydrated, setHydrated] = useState(false);
  const [payload, setPayload] = useState(defaultPayload);
  const [subscriptionHydrated, setSubscriptionHydrated] = useState(Platform.OS === 'web');
  const [subscriptionConfigured, setSubscriptionConfigured] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(Platform.OS === 'web');
  const [subscriptionCelebrationPending, setSubscriptionCelebrationPending] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [xpRewardNotice, setXpRewardNotice] = useState<XpRewardNotice | null>(null);
  const [oneTimeOfferModal, setOneTimeOfferModal] = useState<OneTimeOfferModalState | null>(null);
  const [normalPaywallModal, setNormalPaywallModal] = useState<NormalPaywallModalState | null>(null);
  const accessRequestRef = useRef<Promise<SubscriptionAccessOutcome> | null>(null);
  const payloadRef = useRef(payload);
  const subscriptionResetLockedRef = useRef(false);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        const webUiPreview = Platform.OS === 'web';
        const parsedPayload: Partial<StoredPayload> = raw ? JSON.parse(raw) : {};
        const stored: StoredPayload = { ...defaultPayload(), ...parsedPayload };
        const selectionSummary = screenTimeService.getSelectionSummary();
        const legacyActiveUnlock = stored.activeUnlock;
        const storedBankStartedAt = parsedPayload.timeBankStartedAt ?? legacyActiveUnlock?.startedAt ?? null;
        const storedBankSeconds = typeof parsedPayload.timeBankSeconds === 'number'
          ? parsedPayload.timeBankSeconds
          : ((stored.timeBankMinutes ?? legacyActiveUnlock?.minutes ?? 0) * 60);
        const bankProgressSeconds = typeof parsedPayload.peachBalance === 'number'
          ? 0
          : screenTimeService.getUsageBankProgressSeconds(storedBankStartedAt);
        const progressDepleted = bankProgressSeconds === Number.MAX_SAFE_INTEGER;
        const remainingBankSeconds = progressDepleted
          ? 0
          : Math.max(0, storedBankSeconds - bankProgressSeconds);
        const legacyRemainingBankSeconds = Math.min(storedBankSeconds, remainingBankSeconds);
        const storedUsesTenToOnePeaches = parsedPayload.schemaVersion === 2;
        const resolvedPeachBalance = raw
          ? resolveStoredPeachBalance(parsedPayload.peachBalance, legacyRemainingBankSeconds)
          : stored.peachBalance;
        const peachBalance = storedUsesTenToOnePeaches
          ? migrateTenToOnePeaches(resolvedPeachBalance)
          : resolvedPeachBalance;
        const requestedPeaches = typeof parsedPayload.requestedPeaches === 'number'
          ? Math.min(
              MAX_SQUAT_SESSION_PEACHES,
              Math.max(
                PEACHES_PER_MINUTE,
                storedUsesTenToOnePeaches
                  ? migrateTenToOnePeaches(parsedPayload.requestedPeaches)
                  : Math.floor(parsedPayload.requestedPeaches),
              ),
            )
          : typeof parsedPayload.requestedMinutes === 'number'
            ? Math.min(
                MAX_SQUAT_SESSION_PEACHES,
                Math.max(PEACHES_PER_MINUTE, minutesToPeaches(parsedPayload.requestedMinutes)),
              )
            : Math.min(MAX_SQUAT_SESSION_PEACHES, stored.requestedPeaches);
        const unlockHistory = (stored.unlockHistory ?? []).map((entry) => ({
          id: entry.id,
          peaches: typeof entry.peaches === 'number'
            ? storedUsesTenToOnePeaches
              ? migrateTenToOnePeaches(entry.peaches)
              : Math.max(0, Math.floor(entry.peaches))
            : minutesToPeaches(entry.minutes ?? 0),
          squats: entry.squats,
          completedAt: entry.completedAt,
          source: entry.source,
          gameId: entry.gameId,
          score: entry.score,
          durationSeconds: entry.durationSeconds,
        } satisfies UnlockHistoryEntry));
        const storedUsageWindow = stored.usageWindow ?? null;
        const usageWindowStartedAt = storedUsageWindow?.startedAt ?? null;
        const usageWindowStartedSeconds = storedUsageWindow?.startedSeconds ?? storedUsageWindow?.seconds ?? 0;
        const usageWindowProgressSeconds = screenTimeService.getUsageWindowProgressSeconds(usageWindowStartedAt);
        const usageWindowDepleted = screenTimeService.hasUsageWindowDepleted(usageWindowStartedAt)
          || usageWindowProgressSeconds === Number.MAX_SAFE_INTEGER;
        const usageWindowElapsedSeconds = Math.max(
          usageWindowProgressSeconds === Number.MAX_SAFE_INTEGER ? 0 : usageWindowProgressSeconds,
          elapsedSecondsSince(usageWindowStartedAt),
        );
        const usageWindowSeconds = usageWindowStartedAt && !usageWindowDepleted
          ? Math.max(0, usageWindowStartedSeconds - usageWindowElapsedSeconds)
          : 0;
        const usageWindow = usageWindowSeconds > 0
          ? {
              startedAt: Date.now(),
              seconds: usageWindowSeconds,
              startedSeconds: usageWindowSeconds,
            }
          : null;
        const {
          activeUnlock: _activeUnlock,
          requestedMinutes: _requestedMinutes,
          timeBankMinutes: _timeBankMinutes,
          timeBankSeconds: _timeBankSeconds,
          timeBankStartedAt: _timeBankStartedAt,
          timeBankStartedSeconds: _timeBankStartedSeconds,
          ...currentStored
        } = stored;
        setPayload({
          ...currentStored,
          schemaVersion: STORAGE_SCHEMA_VERSION,
          onboardingComplete: webUiPreview ? true : stored.onboardingComplete,
          screenTimeStatus: webUiPreview ? 'approved' : screenTimeService.getAuthorizationStatus(),
          selectedAppsConfigured: webUiPreview
            ? true
            : screenTimeService.isAvailable()
              ? Boolean(selectionSummary)
              : stored.selectedAppsConfigured,
          selectionSummary: webUiPreview
            ? stored.selectionSummary ?? defaultPayload().selectionSummary
            : selectionSummary ?? stored.selectionSummary ?? null,
          requestedPeaches,
          peachBalance,
          unlockHistory,
          usageWindow,
          usageWindowSeconds,
          usageWindowMonitorVersion: usageWindow ? USAGE_WINDOW_MONITOR_VERSION : 0,
        });
      })
      .finally(() => mounted && setHydrated(true));

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, payload]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const didConfigure = revenueCatService.configure();
    setSubscriptionConfigured(didConfigure);

    if (!didConfigure) {
      setSubscriptionHydrated(true);
      setIsSubscribed(false);
      return;
    }

    let mounted = true;
    let removeListener: () => void = () => undefined;

    AsyncStorage.getItem(RESET_SUBSCRIPTION_STATE_KEY)
      .then((locked) => {
        if (!mounted) return;
        subscriptionResetLockedRef.current = locked === 'true';

        removeListener = revenueCatService.addCustomerInfoUpdateListener((customerInfo) => {
          if (subscriptionResetLockedRef.current) return;
          setIsSubscribed(hasActiveEntitlement(customerInfo));
          setSubscriptionError(null);
        });

        if (subscriptionResetLockedRef.current) {
          setIsSubscribed(false);
          setSubscriptionError(null);
          setSubscriptionHydrated(true);
          return undefined;
        }

        return revenueCatService.getCustomerInfo()
          .then((customerInfo) => {
            if (!mounted) return;
            setIsSubscribed(hasActiveEntitlement(customerInfo));
            setSubscriptionError(null);
          });
      })
      .catch((error) => {
        if (!mounted) return;
        setSubscriptionError(error instanceof Error ? error.message : 'Could not load subscription status.');
      })
      .finally(() => {
        if (mounted) setSubscriptionHydrated(true);
      });

    return () => {
      mounted = false;
      removeListener();
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!payloadRef.current.onboardingComplete) {
      tiktokService.trackOnboardingComplete({
        selected_apps_configured: payloadRef.current.selectedAppsConfigured,
        screen_time_status: payloadRef.current.screenTimeStatus,
      });
    }

    setPayload((current) => ({ ...current, onboardingComplete: true }));
  }, []);

  const setProfileName = useCallback((name: string) => {
    setPayload((current) => ({ ...current, profileName: name.trim() }));
  }, []);

  const setOnboardingGoals = useCallback((goals: string[]) => {
    setPayload((current) => ({ ...current, onboardingGoals: goals }));
  }, []);

  const setAgeRange = useCallback((ageRange: string) => {
    setPayload((current) => ({ ...current, ageRange }));
  }, []);

  const setExerciseFrequency = useCallback((frequency: string) => {
    setPayload((current) => ({ ...current, exerciseFrequency: frequency }));
  }, []);

  const setUsageTargets = useCallback((currentHours: number, goalHours: number) => {
    setPayload((current) => ({
      ...current,
      dailyScreenTimeHours: currentHours,
      dailyScreenTimeGoalHours: goalHours,
    }));
  }, []);

  const setRoutineReminderTime = useCallback((time: RoutineReminderTime | null) => {
    setPayload((current) => ({ ...current, routineReminderTime: time }));
  }, []);

  const requestScreenTime = useCallback(async () => {
    const status = await screenTimeService.requestAuthorization();
    setPayload((current) => ({ ...current, screenTimeStatus: status }));
    return status;
  }, []);

  const markSelectionConfigured = useCallback(async () => {
    if (!hasSubscriptionAccess(isSubscribed)) return false;

    if (Platform.OS === 'web') {
      const shouldAwardXp = !payloadRef.current.earnedXpMilestones.includes(BLOCKED_APPS_MILESTONE);
      setPayload((current) => ({
        ...current,
        selectedAppsConfigured: true,
        selectionSummary: current.selectionSummary ?? defaultPayload().selectionSummary,
        bonusXp: shouldAwardXp ? current.bonusXp + BLOCKED_APPS_XP : current.bonusXp,
        earnedXpMilestones: shouldAwardXp
          ? [...current.earnedXpMilestones, BLOCKED_APPS_MILESTONE]
          : current.earnedXpMilestones,
      }));
      if (shouldAwardXp) {
        setXpRewardNotice({
          id: `${BLOCKED_APPS_MILESTONE}-${Date.now()}`,
          amount: BLOCKED_APPS_XP,
          title: 'Setup complete',
          message: 'Blocked apps added',
        });
      }
      return true;
    }

    const selectionSummary = screenTimeService.getSelectionSummary();
    if (!selectionSummary) return false;

    screenTimeService.saveNativeSelectionConfigured();
    await screenTimeService.startAlwaysBlockMonitor();
    const shouldAwardXp = !payloadRef.current.earnedXpMilestones.includes(BLOCKED_APPS_MILESTONE);
    setPayload((current) => ({
      ...current,
      selectedAppsConfigured: true,
      selectionSummary,
      bonusXp: shouldAwardXp ? current.bonusXp + BLOCKED_APPS_XP : current.bonusXp,
      earnedXpMilestones: shouldAwardXp
        ? [...current.earnedXpMilestones, BLOCKED_APPS_MILESTONE]
        : current.earnedXpMilestones,
    }));
    if (shouldAwardXp) {
      setXpRewardNotice({
        id: `${BLOCKED_APPS_MILESTONE}-${Date.now()}`,
        amount: BLOCKED_APPS_XP,
        title: 'Setup complete',
        message: 'Blocked apps added',
      });
    }
    return true;
  }, [isSubscribed]);

  const setRequestedPeaches = useCallback((peaches: number) => {
    setPayload((current) => ({
      ...current,
      requestedPeaches: Math.min(
        MAX_SQUAT_SESSION_PEACHES,
        Math.max(PEACHES_PER_MINUTE, Math.floor(peaches)),
      ),
    }));
  }, []);

  const earnPeaches = useCallback(async (peaches: number) => {
    if (!hasSubscriptionAccess(isSubscribed)) {
      throw new Error('bootyblock Pro is required to earn Peaches.');
    }

    const safePeaches = Math.min(MAX_SQUAT_SESSION_PEACHES, Math.max(0, Math.floor(peaches)));
    if (safePeaches <= 0) throw new Error('No Peaches were earned.');
    const squats = Math.ceil(safePeaches / PEACHES_PER_SQUAT);
    const completedAt = Date.now();
    const nextPeachBalance = (payloadRef.current.peachBalance ?? 0) + safePeaches;
    const historyEntry = {
      id: `${completedAt}-${Math.random().toString(36).slice(2)}`,
      peaches: safePeaches,
      squats,
      completedAt,
      source: 'squat_session' as const,
    };
    setPayload((current) => {
      return {
        ...current,
        peachBalance: nextPeachBalance,
        unlockHistory: [historyEntry, ...(current.unlockHistory ?? [])],
      };
    });
    screenTimeService.applyDefaultBlock();
    return {
      peaches: safePeaches,
      squats,
      peachBalance: nextPeachBalance,
      completedAt,
    };
  }, [isSubscribed]);

  const earnGamePeaches = useCallback(async ({
    peaches,
    gameId,
    score,
    durationSeconds,
  }: {
    peaches: number;
    gameId: string;
    score: number;
    durationSeconds: number;
  }) => {
    if (!hasSubscriptionAccess(isSubscribed)) {
      throw new Error('bootyblock Pro is required to earn Peaches.');
    }

    const safePeaches = Math.max(0, Math.floor(peaches));
    if (safePeaches <= 0) {
      throw new Error('No game Peaches were earned.');
    }

    const completedAt = Date.now();
    const nextPeachBalance = (payloadRef.current.peachBalance ?? 0) + safePeaches;
    const historyEntry = {
      id: `${completedAt}-${Math.random().toString(36).slice(2)}`,
      peaches: safePeaches,
      squats: 0,
      completedAt,
      source: 'game' as const,
      gameId,
      score,
      durationSeconds,
    };

    setPayload((current) => ({
      ...current,
      peachBalance: nextPeachBalance,
      unlockHistory: [historyEntry, ...(current.unlockHistory ?? [])],
      bonusXp: current.bonusXp + GAME_COMPLETION_XP,
    }));
    screenTimeService.applyDefaultBlock();

    return {
      peaches: safePeaches,
      squats: 0,
      peachBalance: nextPeachBalance,
      completedAt,
      source: 'game' as const,
      gameId,
      score,
      durationSeconds,
      xpAwarded: GAME_COMPLETION_XP,
    };
  }, [isSubscribed]);

  const dismissXpRewardNotice = useCallback(() => {
    setXpRewardNotice(null);
  }, []);

  const spendPeachesForMinutes = useCallback(async (minutes: number) => {
    if (!hasSubscriptionAccess(isSubscribed)) return false;

    const requestedSeconds = Math.max(0, Math.round(minutes * 60));
    const peachCost = minutesToPeaches(minutes);
    if (requestedSeconds <= 0 || peachCost <= 0 || (payloadRef.current.peachBalance ?? 0) < peachCost) return false;

    await screenTimeService.startUsageWindow(requestedSeconds);
    const startedAt = Date.now();
    setPayload((current) => {
      return {
        ...current,
        peachBalance: Math.max(0, current.peachBalance - peachCost),
        usageWindow: {
          startedAt,
          seconds: requestedSeconds,
          startedSeconds: requestedSeconds,
        },
        usageWindowSeconds: requestedSeconds,
        usageWindowMonitorVersion: USAGE_WINDOW_MONITOR_VERSION,
      };
    });
    return true;
  }, [isSubscribed]);

  const syncUsageWindow = useCallback(() => {
    setPayload((current) => {
      const currentWindow = current.usageWindow ?? null;
      if (currentWindow) {
        if (current.usageWindowMonitorVersion !== USAGE_WINDOW_MONITOR_VERSION) {
          void screenTimeService.startUsageWindow(currentWindow.seconds);
          return {
            ...current,
            usageWindowMonitorVersion: USAGE_WINDOW_MONITOR_VERSION,
          };
        }

        const windowDepleted = screenTimeService.hasUsageWindowDepleted(currentWindow.startedAt);
        const progressSeconds = screenTimeService.getUsageWindowProgressSeconds(currentWindow.startedAt);
        const progressDepleted = progressSeconds === Number.MAX_SAFE_INTEGER;
        const elapsedSeconds = Math.max(
          progressDepleted ? 0 : progressSeconds,
          elapsedSecondsSince(currentWindow.startedAt),
        );
        const nextUsageWindowSeconds = windowDepleted || progressDepleted
          ? 0
          : Math.max(0, currentWindow.startedSeconds - elapsedSeconds);
        if (__DEV__ && progressSeconds > 0) {
          console.log('Bootyblock usage window progress', { progressSeconds, elapsedSeconds, nextUsageWindowSeconds });
        }

        if (nextUsageWindowSeconds > 0) {
          return nextUsageWindowSeconds === current.usageWindowSeconds
            ? current
            : {
                ...current,
                usageWindow: {
                  ...currentWindow,
                  seconds: nextUsageWindowSeconds,
                },
                usageWindowSeconds: nextUsageWindowSeconds,
              };
        }

        screenTimeService.applyDefaultBlock();
        return {
          ...current,
          usageWindow: null,
          usageWindowSeconds: 0,
          usageWindowMonitorVersion: 0,
        };
      }

      return current;
    });
  }, []);

  useEffect(() => {
    if (!hydrated || !subscriptionHydrated) return;

    if (hasSubscriptionAccess(isSubscribed)) {
      const currentUsageWindow = payloadRef.current.usageWindow;
      if (currentUsageWindow?.seconds) {
        void screenTimeService.startUsageWindow(currentUsageWindow.seconds);
      } else {
        screenTimeService.applyDefaultBlock();
      }
      return;
    }

    screenTimeService.releaseAllBlocks();
    setPayload((current) => (
      current.usageWindow || current.usageWindowSeconds > 0 || current.usageWindowMonitorVersion !== 0
        ? {
            ...current,
            usageWindow: null,
            usageWindowSeconds: 0,
            usageWindowMonitorVersion: 0,
          }
        : current
    ));
  }, [hydrated, isSubscribed, subscriptionHydrated]);

  useEffect(() => {
    syncUsageWindow();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncUsageWindow();
      }
    });
    return () => subscription.remove();
  }, [syncUsageWindow]);

  const refreshSubscription = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsSubscribed(true);
      setSubscriptionHydrated(true);
      setSubscriptionError(null);
      return true;
    }

    if (!revenueCatService.configured) {
      setSubscriptionConfigured(false);
      setSubscriptionHydrated(true);
      setSubscriptionError('RevenueCat is not configured yet.');
      return false;
    }

    if (subscriptionResetLockedRef.current) {
      setIsSubscribed(false);
      setSubscriptionError(null);
      return false;
    }

    try {
      const customerInfo = await revenueCatService.getCustomerInfo();
      const active = hasActiveEntitlement(customerInfo);
      setIsSubscribed(active);
      setSubscriptionError(null);
      return active;
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Could not refresh subscription status.');
      return false;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !revenueCatService.configured) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshSubscription();
      }
    });

    return () => subscription.remove();
  }, [refreshSubscription]);

  const restorePurchases = useCallback(async () => {
    if (Platform.OS === 'web') return refreshSubscription();

    if (!revenueCatService.configured) {
      setSubscriptionError('RevenueCat is not configured yet.');
      return false;
    }

    try {
      const customerInfo = await revenueCatService.restorePurchases();
      const active = hasActiveEntitlement(customerInfo);
      if (active) {
        subscriptionResetLockedRef.current = false;
        await AsyncStorage.removeItem(RESET_SUBSCRIPTION_STATE_KEY);
      }
      setIsSubscribed(active);
      setSubscriptionError(null);
      return active;
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Could not restore purchases.');
      return false;
    }
  }, [refreshSubscription]);

  const resolveNormalPaywallModal = useCallback((
    active: boolean,
    result: NormalPaywallResult['result'],
  ) => {
    setNormalPaywallModal((current) => {
      if (!current) return null;
      current.resolve({
        active,
        cancelled: result === 'CANCELLED',
        offering: getPaywallOfferingDiagnostics(current.offering),
        result,
      });
      return null;
    });
  }, []);

  const presentNormalPaywallModal = useCallback(async () => {
    const offering = await revenueCatService.getNormalPaywallOffering();
    const diagnostics = getPaywallOfferingDiagnostics(offering);
    return new Promise<NormalPaywallResult>((resolve) => {
      setNormalPaywallModal({ offering, resolve });
    }).then((result) => ({ ...result, offering: diagnostics }));
  }, []);

  const presentSubscriptionPaywall = useCallback(async (options?: { force?: boolean }) => {
    if ((isSubscribed && !options?.force) || Platform.OS === 'web') return true;

    if (!revenueCatService.configured) {
      setSubscriptionConfigured(false);
      setSubscriptionError('RevenueCat is not configured yet.');
      return false;
    }

    try {
      tiktokService.trackPaywallViewed({
        placement: options?.force ? 'forced_subscription_paywall' : 'subscription_paywall_if_needed',
      });
      const outcome = await presentNormalPaywallModal();
      const active = outcome.active;
      setIsSubscribed(active);
      setSubscriptionError(null);
      if (active) {
        setSubscriptionCelebrationPending(true);
        tiktokService.trackSubscribe({ placement: 'subscription_paywall_if_needed' });
      }
      return active;
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Could not show the subscription paywall.');
      return false;
    }
  }, [isSubscribed, presentNormalPaywallModal]);

  const presentOneTimeOfferModal = useCallback(async (analyticsFlow?: SubscriptionAccessOptions['analyticsFlow']) => {
    const startedAt = Date.now();
    captureAnalytics(posthog, 'revenuecat_paywall_attempted', {
      placement: 'one_time_offer',
      analytics_flow: analyticsFlow ?? 'in_app',
    });
    let offering;
    try {
      offering = await revenueCatService.getOneTimeOfferPaywallOffering();
    } catch (error) {
      if (error instanceof OneTimeOfferNotDiscountedError) {
        captureAnalytics(posthog, 'revenuecat_one_time_offer_skipped', {
          analytics_flow: analyticsFlow ?? 'in_app',
          reason: error.comparison.reason,
          normal_price: error.comparison.normalPrice,
          normal_price_string: error.comparison.normalPriceString,
          normal_currency_code: error.comparison.normalCurrencyCode,
          offer_price: error.comparison.offerPrice,
          offer_price_string: error.comparison.offerPriceString,
          offer_currency_code: error.comparison.offerCurrencyCode,
        });
        return false;
      }
      throw error;
    }
    const diagnostics = getPaywallOfferingDiagnostics(offering);
    captureAnalytics(posthog, 'revenuecat_offering_resolved', {
      placement: 'one_time_offer',
      analytics_flow: analyticsFlow ?? 'in_app',
      duration_ms: Date.now() - startedAt,
      ...offeringAnalyticsProperties(diagnostics),
    });
    if (analyticsFlow === 'onboarding') {
      trackOnboardingStepViewed(
        posthog,
        '/onboarding/one-time-offer-paywall',
        ONBOARDING_STEPS.oneTimeOfferPaywall.key,
        ONBOARDING_STEPS.oneTimeOfferPaywall.title,
        ONBOARDING_STEPS.oneTimeOfferPaywall.index,
        ONBOARDING_STEP_TOTAL,
      );
    }
    tiktokService.trackPaywallViewed({
      content_id: 'bootyblock_one_time_offer_yearly',
      content_name: 'Bootyblock Pro One-Time Offer',
      placement: 'one_time_offer',
      value: 29.99,
    });

    const active = await new Promise<boolean>((resolve) => {
      setOneTimeOfferModal({ offering, resolve });
    });
    captureAnalytics(posthog, 'revenuecat_paywall_result', {
      placement: 'one_time_offer',
      analytics_flow: analyticsFlow ?? 'in_app',
      result: active ? 'ACTIVE' : 'DECLINED',
      active,
      duration_ms: Date.now() - startedAt,
      ...offeringAnalyticsProperties(diagnostics),
    });
    return active;
  }, [posthog]);

  const presentOneTimeOffer = useCallback(async () => {
    if (hasSubscriptionAccess(isSubscribed)) return true;
    if (Platform.OS === 'web') return true;

    if (!revenueCatService.configured) {
      setSubscriptionConfigured(false);
      setSubscriptionError('RevenueCat is not configured yet.');
      return false;
    }

    try {
      const active = await presentOneTimeOfferModal();
      if (active) {
        subscriptionResetLockedRef.current = false;
        await AsyncStorage.removeItem(RESET_SUBSCRIPTION_STATE_KEY);
        await refreshSubscription();
        setIsSubscribed(true);
        setSubscriptionCelebrationPending(true);
        setSubscriptionError(null);
        return true;
      }

      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not show the subscription paywall.';
      setSubscriptionError(message);
      Alert.alert('Subscription unavailable', message);
      return false;
    }
  }, [isSubscribed, presentOneTimeOfferModal, refreshSubscription]);

  const requestSubscriptionAccessOutcome = useCallback(async (
    options?: SubscriptionAccessOptions,
  ): Promise<SubscriptionAccessOutcome> => {
    if (hasSubscriptionAccess(isSubscribed)) {
      return { active: true, status: 'active' };
    }
    if (accessRequestRef.current) return accessRequestRef.current;

    const request = (async () => {
      if (Platform.OS === 'web') {
        return { active: true, status: 'active' } as SubscriptionAccessOutcome;
      }

      if (!revenueCatService.configured) {
        setSubscriptionConfigured(false);
        setSubscriptionError('RevenueCat is not configured yet.');
        captureAnalytics(posthog, 'revenuecat_paywall_error', {
          placement: 'normal_paywall',
          analytics_flow: options?.analyticsFlow ?? 'in_app',
          error_stage: 'configuration',
          error_code: 'not_configured',
          error_message: 'RevenueCat is not configured yet.',
        });
        if (options?.analyticsFlow === 'onboarding') {
          Alert.alert(
            'Subscription unavailable',
            'The subscription screen could not be opened. Please try again—your setup has been kept.',
          );
        }
        return { active: false, status: 'unavailable' } as SubscriptionAccessOutcome;
      }

      const startedAt = Date.now();
      let activePlacement = 'normal_paywall';
      let errorStage = 'offering';

      try {
        if (options?.analyticsFlow === 'onboarding') {
          trackOnboardingStepViewed(
            posthog,
            '/onboarding/subscription-paywall',
            ONBOARDING_STEPS.subscriptionPaywall.key,
            ONBOARDING_STEPS.subscriptionPaywall.title,
            ONBOARDING_STEPS.subscriptionPaywall.index,
            ONBOARDING_STEP_TOTAL,
          );
        }
        captureAnalytics(posthog, 'revenuecat_paywall_attempted', {
          placement: activePlacement,
          analytics_flow: options?.analyticsFlow ?? 'in_app',
        });
        const outcome = await presentNormalPaywallModal();
        errorStage = 'presentation';
        captureAnalytics(posthog, 'revenuecat_offering_resolved', {
          placement: activePlacement,
          analytics_flow: options?.analyticsFlow ?? 'in_app',
          duration_ms: Date.now() - startedAt,
          ...offeringAnalyticsProperties(outcome.offering),
        });
        captureAnalytics(posthog, 'revenuecat_paywall_result', {
          placement: activePlacement,
          analytics_flow: options?.analyticsFlow ?? 'in_app',
          result: String(outcome.result),
          active: outcome.active,
          cancelled: outcome.cancelled,
          duration_ms: Date.now() - startedAt,
          ...(outcome.offering ? offeringAnalyticsProperties(outcome.offering) : {}),
        });

        if (outcome.active) {
          subscriptionResetLockedRef.current = false;
          await AsyncStorage.removeItem(RESET_SUBSCRIPTION_STATE_KEY);
          await refreshSubscription();
          setIsSubscribed(true);
          setSubscriptionCelebrationPending(true);
          setSubscriptionError(null);
          tiktokService.trackSubscribe({ placement: 'normal_paywall' });
          return { active: true, status: 'active' } as SubscriptionAccessOutcome;
        }

        if (outcome.cancelled) {
          activePlacement = 'one_time_offer';
          errorStage = 'offering';
          const offerActive = await presentOneTimeOfferModal(options?.analyticsFlow);
          if (offerActive) {
            subscriptionResetLockedRef.current = false;
            await AsyncStorage.removeItem(RESET_SUBSCRIPTION_STATE_KEY);
            await refreshSubscription();
            setIsSubscribed(true);
            setSubscriptionCelebrationPending(true);
            setSubscriptionError(null);
            return { active: true, status: 'active' } as SubscriptionAccessOutcome;
          }

          return { active: false, status: 'declined' } as SubscriptionAccessOutcome;
        }

        const message = `RevenueCat returned ${String(outcome.result)} before the subscription flow completed.`;
        setSubscriptionError(message);
        Alert.alert(
          'Subscription unavailable',
          'The subscription screen could not be opened. Please try again—your setup has been kept.',
        );
        return { active: false, status: 'unavailable' } as SubscriptionAccessOutcome;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not show the subscription paywall.';
        setSubscriptionError(message);
        captureAnalytics(posthog, 'revenuecat_paywall_error', {
          placement: activePlacement,
          analytics_flow: options?.analyticsFlow ?? 'in_app',
          error_stage: errorStage,
          duration_ms: Date.now() - startedAt,
          ...errorAnalyticsProperties(error),
        });
        Alert.alert(
          'Subscription unavailable',
          options?.analyticsFlow === 'onboarding'
            ? 'The subscription screen could not be opened. Please try again—your setup has been kept.'
            : message,
        );
        return { active: false, status: 'unavailable' } as SubscriptionAccessOutcome;
      }
    })();

    accessRequestRef.current = request;
    try {
      return await request;
    } finally {
      accessRequestRef.current = null;
    }
  }, [isSubscribed, posthog, presentNormalPaywallModal, presentOneTimeOfferModal, refreshSubscription]);

  const requestSubscriptionAccess = useCallback(async () => (
    await requestSubscriptionAccessOutcome()
  ).active, [requestSubscriptionAccessOutcome]);

  const requestOnboardingSubscriptionAccess = useCallback(async () => (
    await requestSubscriptionAccessOutcome({ analyticsFlow: 'onboarding' })
  ).status, [requestSubscriptionAccessOutcome]);

  const consumeSubscriptionCelebration = useCallback(() => {
    setSubscriptionCelebrationPending(false);
  }, []);

  const openSubscriptionManagement = useCallback(async () => {
    await revenueCatService.presentCustomerCenter();
    await refreshSubscription();
  }, [refreshSubscription]);

  const resolveOneTimeOfferModal = useCallback((active: boolean) => {
    setOneTimeOfferModal((current) => {
      current?.resolve(active);
      return null;
    });
  }, []);

  const resetAppData = useCallback(async () => {
    screenTimeService.resetNativeSetup();
    const fresh = defaultPayload();
    subscriptionResetLockedRef.current = true;
    setIsSubscribed(Platform.OS === 'web');
    setSubscriptionCelebrationPending(false);
    setSubscriptionError(null);
    setXpRewardNotice(null);
    setPayload(fresh);
    await AsyncStorage.setItem(RESET_SUBSCRIPTION_STATE_KEY, 'true');
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<BootyblockState>(
    () => ({
      hydrated,
      ...payload,
      hasAppAccess: hasSubscriptionAccess(isSubscribed),
      selectedAppsLabel: payload.selectedAppsConfigured
        ? payload.selectionSummary
          ? screenTimeService.formatSelectionSummary(payload.selectionSummary)
          : 'Selected apps configured'
        : 'No apps or categories selected',
      currentStreak: calculateCurrentStreak(payload.unlockHistory ?? []),
      subscriptionHydrated,
      subscriptionConfigured,
      isSubscribed,
      subscriptionCelebrationPending,
      subscriptionError,
      xpRewardNotice,
      completeOnboarding,
      setProfileName,
      setOnboardingGoals,
      setAgeRange,
      setExerciseFrequency,
      setUsageTargets,
      setRoutineReminderTime,
      requestScreenTime,
      markSelectionConfigured,
      setRequestedPeaches,
      earnPeaches,
      earnGamePeaches,
      spendPeachesForMinutes,
      syncUsageWindow,
      refreshSubscription,
      restorePurchases,
      presentSubscriptionPaywall,
      presentOneTimeOffer,
      requestSubscriptionAccess,
      requestOnboardingSubscriptionAccess,
      consumeSubscriptionCelebration,
      openSubscriptionManagement,
      dismissXpRewardNotice,
      resetAppData,
    }),
    [
      hydrated,
      payload,
      subscriptionHydrated,
      subscriptionConfigured,
      isSubscribed,
      subscriptionCelebrationPending,
      subscriptionError,
      xpRewardNotice,
      completeOnboarding,
      setProfileName,
      setAgeRange,
      setExerciseFrequency,
      setUsageTargets,
      setRoutineReminderTime,
      requestScreenTime,
      markSelectionConfigured,
      setRequestedPeaches,
      earnPeaches,
      earnGamePeaches,
      spendPeachesForMinutes,
      syncUsageWindow,
      refreshSubscription,
      restorePurchases,
      presentSubscriptionPaywall,
      presentOneTimeOffer,
      requestSubscriptionAccess,
      requestOnboardingSubscriptionAccess,
      consumeSubscriptionCelebration,
      openSubscriptionManagement,
      dismissXpRewardNotice,
      resetAppData,
    ],
  );

  return (
    <BootyblockContext.Provider value={value}>
      {children}
      <Modal
        animationType="fade"
        onRequestClose={() => resolveNormalPaywallModal(false, 'CANCELLED')}
        presentationStyle="fullScreen"
        visible={Boolean(normalPaywallModal)}
      >
        {normalPaywallModal ? (
          <SubscriptionPaywall
            offering={normalPaywallModal.offering}
            onClose={() => resolveNormalPaywallModal(false, 'CANCELLED')}
            onPurchase={async (selectedPackage: PurchasesPackage) => {
              const active = await revenueCatService.purchasePackage(selectedPackage);
              if (active) resolveNormalPaywallModal(true, 'PURCHASED');
              return active;
            }}
            onRestore={async () => {
              const customerInfo = await revenueCatService.restorePurchases();
              const active = hasActiveEntitlement(customerInfo);
              if (active) resolveNormalPaywallModal(true, 'RESTORED');
              return active;
            }}
          />
        ) : null}
      </Modal>
      <Modal
        animationType="slide"
        onRequestClose={() => resolveOneTimeOfferModal(false)}
        presentationStyle="fullScreen"
        visible={Boolean(oneTimeOfferModal)}
      >
        {oneTimeOfferModal ? (
          <RevenueCatUI.Paywall
            onDismiss={() => resolveOneTimeOfferModal(false)}
            onPurchaseCompleted={({ customerInfo }) => {
              const active = hasActiveEntitlement(customerInfo);
              if (active) {
                tiktokService.trackSubscribe({ placement: 'one_time_offer_modal' });
                tiktokService.trackPurchase({
                  content_id: 'bootyblock_one_time_offer_yearly',
                  content_name: 'Bootyblock Pro One-Time Offer',
                  description: 'Discounted yearly app blocking access',
                  event_id: 'bootyblock_one_time_offer_yearly_modal',
                  placement: 'one_time_offer_modal',
                  value: 29.99,
                });
              }
              resolveOneTimeOfferModal(active);
            }}
            onRestoreCompleted={({ customerInfo }) => resolveOneTimeOfferModal(hasActiveEntitlement(customerInfo))}
            options={{ offering: oneTimeOfferModal.offering, displayCloseButton: false }}
            style={styles.oneTimeOfferPaywall}
          />
        ) : null}
      </Modal>
    </BootyblockContext.Provider>
  );
}

export function useBootyblock() {
  const context = useContext(BootyblockContext);
  if (!context) {
    throw new Error('useBootyblock must be used inside BootyblockProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  oneTimeOfferPaywall: {
    flex: 1,
  },
});
