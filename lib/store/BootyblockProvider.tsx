import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Modal, Platform, Pressable, StyleSheet } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';

import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
import { hasActiveEntitlement, revenueCatService } from '../services/revenueCat';
import {
  screenTimeService,
  ScreenTimeSelectionSummary,
  ScreenTimeStatus,
} from '../services/screenTime';
import { calculateCurrentStreak } from '../streak';

type BankEarnedSession = {
  minutes: number;
  squats: number;
  bankedMinutes: number;
  completedAt: number;
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
  minutes: number;
  squats: number;
  completedAt: number;
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
  requestedMinutes: number;
  timeBankMinutes: number;
  timeBankSeconds: number;
  usageWindow: UsageWindow | null;
  usageWindowSeconds: number;
  unlockHistory: UnlockHistoryEntry[];
  currentStreak: number;
  subscriptionHydrated: boolean;
  subscriptionConfigured: boolean;
  isSubscribed: boolean;
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
  setRequestedMinutes: (minutes: number) => void;
  bankTime: (minutes: number) => Promise<BankEarnedSession>;
  useBankedTime: (minutes: number) => Promise<boolean>;
  syncTimeBank: () => void;
  refreshSubscription: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  presentSubscriptionPaywall: (options?: { force?: boolean }) => Promise<boolean>;
  presentOneTimeOffer: () => Promise<boolean>;
  requestSubscriptionAccess: () => Promise<boolean>;
  openSubscriptionManagement: () => Promise<void>;
  resetAppData: () => Promise<void>;
};

const STORAGE_KEY = 'bootyblock:v1';
const RESET_SUBSCRIPTION_STATE_KEY = 'bootyblock:subscription-reset';
const USAGE_WINDOW_MONITOR_VERSION = 1;

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
    requestedMinutes: 10,
    timeBankMinutes: webUiPreview ? 12 : 0,
    timeBankSeconds: webUiPreview ? 12 * 60 : 0,
    usageWindow: null as UsageWindow | null,
    usageWindowSeconds: 0,
    usageWindowMonitorVersion: 0,
    unlockHistory: webUiPreview
      ? ([
          { id: 'preview-1', minutes: 10, squats: 10, completedAt: now },
          { id: 'preview-2', minutes: 15, squats: 15, completedAt: now - 86_400_000 },
          { id: 'preview-3', minutes: 5, squats: 5, completedAt: now - 2 * 86_400_000 },
          { id: 'preview-4', minutes: 20, squats: 20, completedAt: now - 7 * 86_400_000 },
          { id: 'preview-5', minutes: 30, squats: 30, completedAt: now - 18 * 86_400_000 },
        ] satisfies UnlockHistoryEntry[])
      : ([] as UnlockHistoryEntry[]),
  };
}

type StoredPayload = ReturnType<typeof defaultPayload> & {
  activeUnlock?: { startedAt?: number; minutes?: number };
  timeBankStartedAt?: number | null;
  timeBankStartedSeconds?: number;
  usageWindow?: UsageWindow | null;
};

type OneTimeOfferModalState = {
  offering: Awaited<ReturnType<typeof revenueCatService.getOneTimeOfferPaywallOffering>>;
  resolve: (active: boolean) => void;
};

export function BootyblockProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [payload, setPayload] = useState(defaultPayload);
  const [subscriptionHydrated, setSubscriptionHydrated] = useState(Platform.OS === 'web');
  const [subscriptionConfigured, setSubscriptionConfigured] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(Platform.OS === 'web');
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [oneTimeOfferModal, setOneTimeOfferModal] = useState<OneTimeOfferModalState | null>(null);
  const accessRequestRef = useRef<Promise<boolean> | null>(null);
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
        const bankProgressSeconds = screenTimeService.getUsageBankProgressSeconds(storedBankStartedAt);
        const progressDepleted = bankProgressSeconds === Number.MAX_SAFE_INTEGER;
        const remainingBankSeconds = progressDepleted
          ? 0
          : Math.max(0, storedBankSeconds - bankProgressSeconds);
        const timeBankSeconds = Math.min(storedBankSeconds, remainingBankSeconds);
        const timeBankMinutes = Math.ceil(timeBankSeconds / 60);
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
        if (screenTimeService.isAvailable()) {
          screenTimeService.configureShield();
          if (usageWindow) {
            void screenTimeService.startUsageWindow(usageWindow.seconds);
          } else {
            screenTimeService.applyDefaultBlock();
          }
        }
        setPayload({
          ...stored,
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
          timeBankMinutes,
          timeBankSeconds,
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
      setPayload((current) => ({
        ...current,
        selectedAppsConfigured: true,
        selectionSummary: current.selectionSummary ?? defaultPayload().selectionSummary,
      }));
      return true;
    }

    const selectionSummary = screenTimeService.getSelectionSummary();
    if (!selectionSummary) return false;

    screenTimeService.saveNativeSelectionConfigured();
    await screenTimeService.startAlwaysBlockMonitor();
    setPayload((current) => ({
      ...current,
      selectedAppsConfigured: true,
      selectionSummary,
    }));
    return true;
  }, [isSubscribed]);

  const setRequestedMinutes = useCallback((minutes: number) => {
    setPayload((current) => ({ ...current, requestedMinutes: minutes }));
  }, []);

  const bankTime = useCallback(async (minutes: number) => {
    if (!hasSubscriptionAccess(isSubscribed)) {
      throw new Error('Bootyblock Pro is required to bank app time.');
    }

    const squats = minutes * MINUTES_TO_SQUATS;
    const completedAt = Date.now();
    const nextBankSeconds = (payloadRef.current.timeBankSeconds ?? (payloadRef.current.timeBankMinutes ?? 0) * 60) + (minutes * 60);
    const nextBankMinutes = Math.ceil(nextBankSeconds / 60);
    const historyEntry = {
      id: `${completedAt}-${Math.random().toString(36).slice(2)}`,
      minutes,
      squats,
      completedAt,
    };
    setPayload((current) => {
      return {
        ...current,
        timeBankMinutes: nextBankMinutes,
        timeBankSeconds: nextBankSeconds,
        unlockHistory: [historyEntry, ...(current.unlockHistory ?? [])],
      };
    });
    screenTimeService.applyDefaultBlock();
    return {
      minutes,
      squats,
      bankedMinutes: nextBankMinutes,
      completedAt,
    };
  }, [isSubscribed]);

  const useBankedTime = useCallback(async (minutes: number) => {
    if (!hasSubscriptionAccess(isSubscribed)) return false;

    const requestedSeconds = Math.max(0, Math.round(minutes * 60));
    const availableSeconds = payloadRef.current.timeBankSeconds ?? 0;
    const spendSeconds = Math.min(requestedSeconds, availableSeconds);
    if (spendSeconds <= 0) return false;

    await screenTimeService.startUsageWindow(spendSeconds);
    const startedAt = Date.now();
    setPayload((current) => {
      const actualSpendSeconds = Math.min(spendSeconds, current.timeBankSeconds ?? 0);
      const nextBankSeconds = Math.max(0, (current.timeBankSeconds ?? 0) - actualSpendSeconds);
      return {
        ...current,
        timeBankMinutes: Math.ceil(nextBankSeconds / 60),
        timeBankSeconds: nextBankSeconds,
        usageWindow: {
          startedAt,
          seconds: actualSpendSeconds,
          startedSeconds: actualSpendSeconds,
        },
        usageWindowSeconds: actualSpendSeconds,
        usageWindowMonitorVersion: USAGE_WINDOW_MONITOR_VERSION,
      };
    });
    return true;
  }, [isSubscribed]);

  const syncTimeBank = useCallback(() => {
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

      if (current.timeBankSeconds <= 0 && current.timeBankMinutes !== 0) {
        return { ...current, timeBankMinutes: 0 };
      }

      return current;
    });
  }, []);

  useEffect(() => {
    if (!subscriptionHydrated || hasSubscriptionAccess(isSubscribed)) return;

    screenTimeService.applyDefaultBlock();
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
  }, [isSubscribed, subscriptionHydrated]);

  useEffect(() => {
    syncTimeBank();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncTimeBank();
      }
    });
    return () => subscription.remove();
  }, [syncTimeBank]);

  useEffect(() => {
    const subscription = screenTimeService.onUsageBankThreshold(syncTimeBank);
    return () => subscription.remove();
  }, [syncTimeBank]);

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

  const presentSubscriptionPaywall = useCallback(async (options?: { force?: boolean }) => {
    if ((isSubscribed && !options?.force) || Platform.OS === 'web') return true;

    if (!revenueCatService.configured) {
      setSubscriptionConfigured(false);
      setSubscriptionError('RevenueCat is not configured yet.');
      return false;
    }

    try {
      const active = await revenueCatService.presentPaywallIfNeeded(options);
      setIsSubscribed(active);
      setSubscriptionError(null);
      return active;
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Could not show the subscription paywall.');
      return false;
    }
  }, [isSubscribed]);

  const presentOneTimeOfferModal = useCallback(async () => {
    const offering = await revenueCatService.getOneTimeOfferPaywallOffering();

    return new Promise<boolean>((resolve) => {
      setOneTimeOfferModal({ offering, resolve });
    });
  }, []);

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

  const requestSubscriptionAccess = useCallback(async () => {
    if (hasSubscriptionAccess(isSubscribed)) return true;
    if (accessRequestRef.current) return accessRequestRef.current;

    const request = (async () => {
      if (Platform.OS === 'web') return true;

      if (!revenueCatService.configured) {
        setSubscriptionConfigured(false);
        setSubscriptionError('RevenueCat is not configured yet.');
        return false;
      }

      try {
        const outcome = await revenueCatService.presentPaywallWithResult();

        if (outcome.active) {
          subscriptionResetLockedRef.current = false;
          await AsyncStorage.removeItem(RESET_SUBSCRIPTION_STATE_KEY);
          await refreshSubscription();
          setIsSubscribed(true);
          setSubscriptionError(null);
          return true;
        }

        if (outcome.cancelled) {
          const offerActive = await presentOneTimeOfferModal();
          if (offerActive) {
            subscriptionResetLockedRef.current = false;
            await AsyncStorage.removeItem(RESET_SUBSCRIPTION_STATE_KEY);
            await refreshSubscription();
            setIsSubscribed(true);
            setSubscriptionError(null);
            return true;
          }

          return false;
        }

        setSubscriptionError('Subscription was not completed. Please try again.');
        return false;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not show the subscription paywall.';
        setSubscriptionError(message);
        Alert.alert('Subscription unavailable', message);
        return false;
      }
    })();

    accessRequestRef.current = request;
    const active = await request;
    accessRequestRef.current = null;
    return active;
  }, [isSubscribed, presentOneTimeOfferModal, refreshSubscription]);

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
    setSubscriptionError(null);
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
      subscriptionError,
      completeOnboarding,
      setProfileName,
      setOnboardingGoals,
      setAgeRange,
      setExerciseFrequency,
      setUsageTargets,
      setRoutineReminderTime,
      requestScreenTime,
      markSelectionConfigured,
      setRequestedMinutes,
      bankTime,
      useBankedTime,
      syncTimeBank,
      refreshSubscription,
      restorePurchases,
      presentSubscriptionPaywall,
      presentOneTimeOffer,
      requestSubscriptionAccess,
      openSubscriptionManagement,
      resetAppData,
    }),
    [
      hydrated,
      payload,
      subscriptionHydrated,
      subscriptionConfigured,
      isSubscribed,
      subscriptionError,
      completeOnboarding,
      setProfileName,
      setAgeRange,
      setExerciseFrequency,
      setUsageTargets,
      setRoutineReminderTime,
      requestScreenTime,
      markSelectionConfigured,
      setRequestedMinutes,
      bankTime,
      useBankedTime,
      syncTimeBank,
      refreshSubscription,
      restorePurchases,
      presentSubscriptionPaywall,
      presentOneTimeOffer,
      requestSubscriptionAccess,
      openSubscriptionManagement,
      resetAppData,
    ],
  );

  return (
    <BootyblockContext.Provider value={value}>
      {children}
      <Modal
        animationType="slide"
        onRequestClose={() => resolveOneTimeOfferModal(false)}
        presentationStyle="fullScreen"
        visible={Boolean(oneTimeOfferModal)}
      >
        {oneTimeOfferModal ? (
          <>
            <RevenueCatUI.Paywall
              onDismiss={() => resolveOneTimeOfferModal(false)}
              onPurchaseCompleted={({ customerInfo }) => resolveOneTimeOfferModal(hasActiveEntitlement(customerInfo))}
              onRestoreCompleted={({ customerInfo }) => resolveOneTimeOfferModal(hasActiveEntitlement(customerInfo))}
              options={{ offering: oneTimeOfferModal.offering, displayCloseButton: false }}
              style={styles.oneTimeOfferPaywall}
            />
            <Pressable
              accessibilityLabel="I'd rather pay full price"
              accessibilityRole="button"
              onPress={() => resolveOneTimeOfferModal(false)}
              style={styles.fullPricePaywallTapTarget}
            />
          </>
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
  fullPricePaywallTapTarget: {
    bottom: 54,
    height: 78,
    left: 32,
    position: 'absolute',
    right: 32,
    zIndex: 10,
  },
});
