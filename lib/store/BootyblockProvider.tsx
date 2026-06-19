import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { MINUTES_TO_SQUATS, selectedAppPlaceholders } from '../../constants/bootyblock';
import { screenTimeService, ScreenTimeStatus } from '../services/screenTime';

type UnlockSession = {
  minutes: number;
  squats: number;
  startedAt: number;
  endsAt: number;
};

type BootyblockState = {
  hydrated: boolean;
  onboardingComplete: boolean;
  screenTimeStatus: ScreenTimeStatus;
  selectedAppsConfigured: boolean;
  selectedAppsLabel: string;
  requestedMinutes: number;
  activeUnlock: UnlockSession | null;
  completeOnboarding: () => Promise<void>;
  requestScreenTime: () => Promise<ScreenTimeStatus>;
  markSelectionConfigured: () => Promise<void>;
  setRequestedMinutes: (minutes: number) => void;
  grantUnlock: (minutes: number) => Promise<UnlockSession>;
  clearUnlockIfExpired: () => void;
  resetLocalDemo: () => Promise<void>;
};

const STORAGE_KEY = 'bootyblock:v1';

const BootyblockContext = createContext<BootyblockState | null>(null);

function defaultPayload() {
  return {
    onboardingComplete: false,
    screenTimeStatus: screenTimeService.getAuthorizationStatus(),
    selectedAppsConfigured: false,
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
        if (raw) {
          setPayload({ ...defaultPayload(), ...JSON.parse(raw) });
        }
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

  const requestScreenTime = useCallback(async () => {
    const status = await screenTimeService.requestAuthorization();
    setPayload((current) => ({ ...current, screenTimeStatus: status }));
    return status;
  }, []);

  const markSelectionConfigured = useCallback(async () => {
    screenTimeService.saveNativeSelectionConfigured();
    await screenTimeService.startAlwaysBlockMonitor();
    setPayload((current) => ({ ...current, selectedAppsConfigured: true }));
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

  const resetLocalDemo = useCallback(async () => {
    const fresh = defaultPayload();
    setPayload(fresh);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<BootyblockState>(
    () => ({
      hydrated,
      ...payload,
      selectedAppsLabel: payload.selectedAppsConfigured ? selectedAppPlaceholders.join(', ') : 'No apps selected yet',
      completeOnboarding,
      requestScreenTime,
      markSelectionConfigured,
      setRequestedMinutes,
      grantUnlock,
      clearUnlockIfExpired,
      resetLocalDemo,
    }),
    [
      hydrated,
      payload,
      completeOnboarding,
      requestScreenTime,
      markSelectionConfigured,
      setRequestedMinutes,
      grantUnlock,
      clearUnlockIfExpired,
      resetLocalDemo,
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
