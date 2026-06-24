import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
import {
  screenTimeService,
  ScreenTimeSelectionSummary,
  ScreenTimeStatus,
} from '../services/screenTime';
import { calculateCurrentStreak } from '../streak';

type UnlockSession = {
  minutes: number;
  squats: number;
  startedAt: number;
  endsAt: number;
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
  activeUnlock: UnlockSession | null;
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
  grantUnlock: (minutes: number) => Promise<UnlockSession>;
  clearUnlockIfExpired: () => void;
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
    activeUnlock: null as UnlockSession | null,
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

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        const webUiPreview = Platform.OS === 'web';
        const stored = raw ? { ...defaultPayload(), ...JSON.parse(raw) } : defaultPayload();
        const selectionSummary = screenTimeService.getSelectionSummary();
        if (screenTimeService.isAvailable()) {
          screenTimeService.configureShield();
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

  const grantUnlock = useCallback(async (minutes: number) => {
    const squats = minutes * MINUTES_TO_SQUATS;
    const startedAt = Date.now();
    const session = {
      minutes,
      squats,
      startedAt,
      endsAt: startedAt + minutes * 60_000,
    };
    const historyEntry = {
      id: `${startedAt}-${Math.random().toString(36).slice(2)}`,
      minutes,
      squats,
      completedAt: startedAt,
    };
    await screenTimeService.grantUnlock(minutes);
    setPayload((current) => ({
      ...current,
      activeUnlock: session,
      unlockHistory: [historyEntry, ...(current.unlockHistory ?? [])],
    }));
    return session;
  }, []);

  const clearUnlockIfExpired = useCallback(() => {
    setPayload((current) => {
      if (!current.activeUnlock || current.activeUnlock.endsAt > Date.now()) return current;
      screenTimeService.applyDefaultBlock();
      return { ...current, activeUnlock: null };
    });
  }, []);

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
      grantUnlock,
      clearUnlockIfExpired,
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
      grantUnlock,
      clearUnlockIfExpired,
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
