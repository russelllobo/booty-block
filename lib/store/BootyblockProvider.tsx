import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
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
  profileName: string;
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
  completeOnboarding: () => Promise<void>;
  setProfileName: (name: string) => void;
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
  resetAppData: () => Promise<void>;
};

const STORAGE_KEY = 'bootyblock:v1';
const USAGE_WINDOW_MONITOR_VERSION = 1;

const BootyblockContext = createContext<BootyblockState | null>(null);

function defaultPayload() {
  const webUiPreview = Platform.OS === 'web';
  const now = Date.now();

  return {
    onboardingComplete: webUiPreview,
    profileName: '',
    ageRange: '18-24',
    exerciseFrequency: '',
    dailyScreenTimeHours: 4,
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

export function BootyblockProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [payload, setPayload] = useState(defaultPayload);
  const payloadRef = useRef(payload);

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
        const usageWindowSeconds = usageWindowStartedAt && !usageWindowDepleted
          ? Math.max(0, usageWindowStartedSeconds - usageWindowProgressSeconds)
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

  const completeOnboarding = useCallback(async () => {
    setPayload((current) => ({ ...current, onboardingComplete: true }));
  }, []);

  const setProfileName = useCallback((name: string) => {
    setPayload((current) => ({ ...current, profileName: name.trim() }));
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
  }, []);

  const setRequestedMinutes = useCallback((minutes: number) => {
    setPayload((current) => ({ ...current, requestedMinutes: minutes }));
  }, []);

  const bankTime = useCallback(async (minutes: number) => {
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
  }, []);

  const useBankedTime = useCallback(async (minutes: number) => {
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
  }, []);

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
        const nextUsageWindowSeconds = windowDepleted || progressDepleted
          ? 0
          : Math.max(0, currentWindow.startedSeconds - progressSeconds);
        if (__DEV__ && progressSeconds > 0) {
          console.log('Bootyblock usage window progress', { progressSeconds, nextUsageWindowSeconds });
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

  const resetAppData = useCallback(async () => {
    screenTimeService.resetNativeSetup();
    const fresh = defaultPayload();
    setPayload(fresh);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<BootyblockState>(
    () => ({
      hydrated,
      ...payload,
      selectedAppsLabel: payload.selectedAppsConfigured
        ? payload.selectionSummary
          ? screenTimeService.formatSelectionSummary(payload.selectionSummary)
          : 'Selected apps configured'
        : 'No apps or categories selected',
      currentStreak: calculateCurrentStreak(payload.unlockHistory ?? []),
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
      resetAppData,
    }),
    [
      hydrated,
      payload,
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
      resetAppData,
    ],
  );

  return <BootyblockContext.Provider value={value}>{children}</BootyblockContext.Provider>;
}

export function useBootyblock() {
  const context = useContext(BootyblockContext);
  if (!context) {
    throw new Error('useBootyblock must be used inside BootyblockProvider');
  }
  return context;
}
