import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { MINUTES_TO_SQUATS } from '../../constants/bootyblock';
import {
  screenTimeService,
  ScreenTimeSelectionSummary,
  ScreenTimeStatus,
} from '../services/screenTime';

type UnlockSession = {
  minutes: number;
  squats: number;
  startedAt: number;
  endsAt: number;
};

type BootyblockState = {
  hydrated: boolean;
  onboardingComplete: boolean;
  profileName: string;
  dailyScreenTimeHours: number;
  dailyScreenTimeGoalHours: number;
  screenTimeStatus: ScreenTimeStatus;
  selectedAppsConfigured: boolean;
  selectionSummary: ScreenTimeSelectionSummary | null;
  selectedAppsLabel: string;
  requestedMinutes: number;
  activeUnlock: UnlockSession | null;
  completeOnboarding: () => Promise<void>;
  setProfileName: (name: string) => void;
  setUsageTargets: (currentHours: number, goalHours: number) => void;
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
  return {
    onboardingComplete: false,
    profileName: '',
    dailyScreenTimeHours: 4,
    dailyScreenTimeGoalHours: 3,
    screenTimeStatus: screenTimeService.getAuthorizationStatus(),
    selectedAppsConfigured: false,
    selectionSummary: null as ScreenTimeSelectionSummary | null,
    requestedMinutes: 10,
    activeUnlock: null as UnlockSession | null,
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
        const stored = raw ? { ...defaultPayload(), ...JSON.parse(raw) } : defaultPayload();
        const selectionSummary = screenTimeService.getSelectionSummary();
        setPayload({
          ...stored,
          screenTimeStatus: screenTimeService.getAuthorizationStatus(),
          selectedAppsConfigured: screenTimeService.isAvailable()
            ? Boolean(selectionSummary)
            : stored.selectedAppsConfigured,
          selectionSummary: selectionSummary ?? stored.selectionSummary ?? null,
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

  const setUsageTargets = useCallback((currentHours: number, goalHours: number) => {
    setPayload((current) => ({
      ...current,
      dailyScreenTimeHours: currentHours,
      dailyScreenTimeGoalHours: goalHours,
    }));
  }, []);

  const requestScreenTime = useCallback(async () => {
    const status = await screenTimeService.requestAuthorization();
    setPayload((current) => ({ ...current, screenTimeStatus: status }));
    return status;
  }, []);

  const markSelectionConfigured = useCallback(async () => {
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
    const session = {
      minutes,
      squats,
      startedAt: Date.now(),
      endsAt: Date.now() + minutes * 60_000,
    };
    screenTimeService.grantUnlock(minutes);
    setPayload((current) => ({ ...current, activeUnlock: session }));
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
      completeOnboarding,
      setProfileName,
      setUsageTargets,
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
      setUsageTargets,
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
