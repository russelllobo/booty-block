import { router } from 'expo-router';
import { Dumbbell, Flame, Lock, LockKeyhole, Unlock } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

function formatBankDuration(totalSeconds: number) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const remainingSeconds = roundedSeconds % 3600;
  const durationMinutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const minuteLabel = String(durationMinutes).padStart(hours > 0 ? 2 : 1, '0');
  const secondLabel = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${minuteLabel}:${secondLabel}`;
  }

  return `${minuteLabel}:${secondLabel}`;
}

function remainingTimeAccessibilityLabel(totalSeconds: number, context: 'bank' | 'window') {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(roundedSeconds / 3600);
  const remainingSeconds = roundedSeconds % 3600;
  const durationMinutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const parts = [
    hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : null,
    durationMinutes ? `${durationMinutes} ${durationMinutes === 1 ? 'minute' : 'minutes'}` : null,
    `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`,
  ].filter(Boolean);

  return `${parts.join(', ')} remaining ${context === 'window' ? 'in current unlock window' : 'in bank'}`;
}

export default function Home() {
  const {
    timeBankSeconds,
    usageWindowSeconds,
    selectedAppsConfigured,
    selectionSummary,
    currentStreak,
    syncTimeBank,
  } = useBootyblock();
  const [, setTick] = useState(Date.now);

  useEffect(() => {
    syncTimeBank();
    setTick(Date.now());
    const interval = setInterval(() => {
      syncTimeBank();
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [syncTimeBank]);

  const hasBank = timeBankSeconds > 0;
  const hasUsageWindow = usageWindowSeconds > 0;
  const showUnlockedState = hasUsageWindow;

  const status = useMemo(() => {
    if (hasUsageWindow) return 'All apps unlocked';
    return 'Locked';
  }, [hasUsageWindow]);
  const blockedAppCount = selectionSummary
    ? selectionSummary.applicationCount + selectionSummary.categoryCount + selectionSummary.webDomainCount
    : 0;
  const blockedAppLabel = `${blockedAppCount} ${blockedAppCount === 1 ? 'app' : 'apps'} blocked`;

  return (
    <Screen>
      <Header
        title="BootyBlock"
        logo
        centerLogo
        logoHeight={48}
        rightAccessory={
          <View
            className="h-11 flex-row items-center gap-1 rounded-full bg-white/70 px-3"
            accessible
            accessibilityLabel={`${currentStreak} day streak`}
          >
            <Flame
              size={18}
              stroke={colors.raspberry}
              fill={currentStreak > 0 ? colors.raspberry : 'transparent'}
            />
            <Text className="text-base font-black text-cocoa">{currentStreak}</Text>
          </View>
        }
      />

      <View className={`mt-auto overflow-hidden rounded-[40px] p-7 ${showUnlockedState ? 'bg-mint' : 'bg-raspberry'}`}>
        {showUnlockedState ? (
          <View className="mb-5 flex-row justify-end">
            <View className="rounded-full bg-white/45 px-4 py-2">
              <Text className="text-xs font-black uppercase tracking-[1.2px] text-cocoa">
                Unlocked window
              </Text>
            </View>
          </View>
        ) : null}

        <View className="items-center">
          <View
            className={`h-20 w-20 items-center justify-center rounded-[28px] ${
              showUnlockedState ? 'bg-white/60' : 'bg-white/15'
            }`}
          >
            {showUnlockedState ? (
              <Unlock size={38} stroke={colors.cocoa} strokeWidth={3} />
            ) : (
              <Lock size={38} stroke={colors.white} strokeWidth={3} />
            )}
          </View>
          <Text className={`mt-4 text-5xl font-bold ${showUnlockedState ? 'text-cocoa' : 'text-white'}`}>
            {status}
          </Text>
          <Text className={`mt-2 text-base font-bold ${showUnlockedState ? 'text-mink' : 'text-white/75'}`}>
            {blockedAppLabel}
          </Text>
        </View>

        {showUnlockedState ? (
          <View className="mt-6 rounded-[28px] bg-white/55 p-4">
            <Text className="text-xs font-black uppercase tracking-[1.4px] text-mink">
              {hasUsageWindow ? 'Remaining time' : 'Banked time'}
            </Text>
            <Text
              className="mt-1 text-4xl font-black tabular-nums text-cocoa"
              accessibilityLabel={remainingTimeAccessibilityLabel(
                hasUsageWindow ? usageWindowSeconds : timeBankSeconds,
                hasUsageWindow ? 'window' : 'bank',
              )}
            >
              {formatBankDuration(hasUsageWindow ? usageWindowSeconds : timeBankSeconds)}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-auto gap-3 pt-6">
        {hasBank ? (
          <Button label="Use minutes" icon={Flame} onPress={() => router.push('/(tabs)/plan')} />
        ) : (
          <Button label="Earn minutes" icon={Dumbbell} onPress={() => router.push('/(tabs)/plan')} />
        )}
        {hasBank ? (
          <Button
            label="Earn more"
            icon={Dumbbell}
            variant="secondary"
            noOutline
            onPress={() => router.push({ pathname: '/(tabs)/plan', params: { mode: 'earn' } })}
          />
        ) : null}
        {!selectedAppsConfigured ? (
          <Button label="Choose blocked apps" icon={LockKeyhole} variant="secondary" noOutline onPress={() => router.push('/onboarding/apps')} />
        ) : null}
      </View>
    </Screen>
  );
}
