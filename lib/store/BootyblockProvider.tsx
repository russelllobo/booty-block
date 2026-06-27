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
  timeBankStartedAt: number | null;
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
  syncTimeBank: () => void;
  resetAppData: () => Promise<void>;
};

const STORAGE_KEY = 'bootyblock:v1';

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
    timeBankStartedAt: webUiPreview ? now : null as number | null,
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
        const stored = raw ? { ...defaultPayload(), ...JSON.parse(raw) } : defaultPayload();
        const selectionSummary = screenTimeService.getSelectionSummary();
        const legacyActiveUnlock = (stored as typeof stored & { activeUnlock?: { startedAt?: number; minutes?: number } }).activeUnlock;
        const storedBankStartedAt = stored.timeBankStartedAt ?? legacyActiveUnlock?.startedAt ?? null;
        const storedBankMinutes = stored.timeBankMinutes ?? legacyActiveUnlock?.minutes ?? 0;
        const bankDepleted = screenTimeService.hasUsageBankDepleted(storedBankStartedAt);
        const timeBankMinutes = bankDepleted ? 0 : storedBankMinutes;
        const timeBankStartedAt = bankDepleted || timeBankMinutes <= 0 ? null : storedBankStartedAt ?? Date.now();
        if (screenTimeService.isAvailable()) {
          screenTimeService.configureShield();
          if (timeBankMinutes > 0) {
            void screenTimeService.startUsageBankMonitor(timeBankMinutes);
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
          timeBankStartedAt,
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
    const nextBankMinutes = (payloadRef.current.timeBankMinutes ?? 0) + minutes;
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
        timeBankStartedAt: completedAt,
        unlockHistory: [historyEntry, ...(current.unlockHistory ?? [])],
      };
    });
    await screenTimeService.startUsageBankMonitor(nextBankMinutes);
    return {
      minutes,
      squats,
      bankedMinutes: nextBankMinutes,
      completedAt,
    };
  }, []);

  const syncTimeBank = useCallback(() => {
    setPayload((current) => {
      if (current.timeBankMinutes <= 0 || !screenTimeService.hasUsageBankDepleted(current.timeBankStartedAt)) {
        return current;
      }
      screenTimeService.applyDefaultBlock();
      return { ...current, timeBankMinutes: 0, timeBankStartedAt: null };
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
