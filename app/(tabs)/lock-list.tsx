import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { DeviceActivitySelectionSheetViewPersisted } from 'react-native-device-activity';
import { router, useLocalSearchParams } from 'expo-router';
import { AppWindow, Clock3, LockKeyhole, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native';

import { Text } from '../../components/AppText';
import { HomeShowcase, type HomeShowcaseStep } from '../../components/HomeShowcase';
import { Screen } from '../../components/Screen';
import { SELECTION_ID } from '../../constants/bootyblock';
import { colors, shadow } from '../../constants/theme';
import { formatBootyLockTime, MAX_BOOTY_LOCKS, type BootyLock } from '../../lib/bootyLocks';
import { screenTimeService } from '../../lib/services/screenTime';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const wordSizes = [20, 16, 18, 15, 17, 14, 16, 13];
const wordColors = [colors.raspberry, colors.cocoa, colors.mink];

function dateFromLock(lock: BootyLock) {
  const date = new Date();
  date.setHours(lock.hour, lock.minute, 0, 0);
  return date;
}

function LockTimeRow({
  lock,
  last,
  onEdit,
  onToggle,
}: {
  lock: BootyLock;
  last: boolean;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const formatted = formatBootyLockTime(lock);

  return (
    <View style={[styles.timeRow, !last && styles.timeRowDivider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Change lock time, currently ${formatted.label}`}
        onPress={onEdit}
        style={styles.timePressable}
      >
        <View className="flex-row items-baseline">
          <Text className="text-[29px] font-semibold leading-[33px] text-cocoa">
            {formatted.displayHour}:{formatted.minute}
          </Text>
          <Text className="ml-1 text-sm font-bold text-mink">{formatted.period}</Text>
        </View>
        <Text className="mt-0.5 text-[13px] font-semibold text-mink">every day</Text>
      </Pressable>
      <Switch
        accessibilityLabel={`${formatted.label} daily lock`}
        value={lock.enabled}
        trackColor={{ false: '#D8D1D4', true: colors.bubble }}
        thumbColor={colors.white}
        ios_backgroundColor="#D8D1D4"
        onValueChange={onToggle}
      />
    </View>
  );
}

export default function LockList() {
  const params = useLocalSearchParams<{ showcase?: 'timings' }>();
  const {
    bootyLocks,
    selectionSummary,
    selectedAppsConfigured,
    subscriptionConfigured,
    subscriptionError,
    hasAppAccess,
    markSelectionConfigured,
    requestSubscriptionAccess,
    screenTimeStatus,
    setBootyLockEnabled,
    setBootyLockTime,
    addBootyLock,
  } = useBootyblock();
  const [editingLock, setEditingLock] = useState<BootyLock | null>(null);
  const [draftDate, setDraftDate] = useState(new Date());
  const [nativePickerOpen, setNativePickerOpen] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [showcaseStep, setShowcaseStep] = useState<HomeShowcaseStep | null>(null);
  const timingsShowcaseTargetRef = useRef<View>(null);
  const enabledCount = bootyLocks.filter((lock) => lock.enabled).length;
  const totalSelected = selectionSummary
    ? selectionSummary.applicationCount + selectionSummary.categoryCount + selectionSummary.webDomainCount
    : 0;
  const displayedApps = useMemo(
    () => selectionSummary?.applications?.filter((app) => app.displayName).slice(0, 8) ?? [],
    [selectionSummary],
  );
  const displayedAppCount = displayedApps.length;
  const nativePickerReady = Platform.OS === 'ios'
    && screenTimeService.isAvailable()
    && screenTimeStatus === 'approved';

  useEffect(() => {
    if (params.showcase === 'timings') setShowcaseStep('timings');
  }, [params.showcase]);

  async function updateLockedApps() {
    if (hasAppAccess) {
      if (nativePickerReady) {
        setNativePickerOpen(true);
      } else {
        router.push('/locked-apps');
      }
      return;
    }

    setSubscriptionBusy(true);
    try {
      const subscribed = await requestSubscriptionAccess();
      if (subscribed) {
        if (nativePickerReady) {
          setNativePickerOpen(true);
        } else {
          router.push('/locked-apps');
        }
      } else if (!subscriptionConfigured) {
        Alert.alert(
          'RevenueCat setup needed',
          subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
        );
      }
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function closeNativePicker() {
    // The native bridge persists picker changes on a short debounce. Keep its
    // host mounted until the final selection has reached shared storage.
    await new Promise((resolve) => setTimeout(resolve, 150));
    const configured = await markSelectionConfigured();
    setNativePickerOpen(false);
    if (!configured) {
      Alert.alert(
        'Choose at least one app',
        'At least one app, category, or website must remain selected.',
        [{ text: 'Choose apps', onPress: () => setNativePickerOpen(true) }],
      );
    }
  }

  function beginEditing(lock: BootyLock) {
    const date = dateFromLock(lock);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'time',
        display: 'spinner',
        is24Hour: false,
        onChange: (event, nextDate) => {
          if (event.type !== 'set' || !nextDate) return;
          setBootyLockTime(lock.id, nextDate.getHours(), nextDate.getMinutes());
          void Haptics.selectionAsync().catch(() => {});
        },
      });
      return;
    }

    setDraftDate(date);
    setEditingLock(lock);
    void Haptics.selectionAsync().catch(() => {});
  }

  function saveEditingTime() {
    if (!editingLock) return;
    setBootyLockTime(editingLock.id, draftDate.getHours(), draftDate.getMinutes());
    setEditingLock(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function handlePickerChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'dismissed' || !date) return;
    setDraftDate(date);
  }

  function adjustWebTime(minutes: number) {
    const next = new Date(draftDate);
    next.setMinutes(next.getMinutes() + minutes);
    setDraftDate(next);
  }

  function addTime() {
    if (bootyLocks.length >= MAX_BOOTY_LOCKS) {
      Alert.alert('Daily lock limit reached', `You can add up to ${MAX_BOOTY_LOCKS} booty locks.`);
      return;
    }
    addBootyLock();
    void Haptics.selectionAsync().catch(() => {});
  }

  const summary = enabledCount === 0
    ? 'all booty locks are turned off'
    : `your apps will lock ${enabledCount} time${enabledCount === 1 ? '' : 's'} every day`;

  return (
    <Screen backgroundColor="#FFF7F2" backgroundGradient={['#FFF9F5', '#FFF1F6', '#FFE9DE']}>
      <View className="items-center pb-6 pt-1">
        <Text className="text-center text-[30px] font-black leading-[35px] text-cocoa">lock settings</Text>
        <Text className="mt-1 text-center text-[14px] font-semibold text-mink">
          choose apps and set your daily booty locks
        </Text>
      </View>

      <View className="gap-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change locked apps"
          disabled={subscriptionBusy}
          onPress={() => void updateLockedApps()}
          style={({ pressed }) => [styles.section, pressed && styles.pressed]}
        >
          <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
            <View className="flex-row items-center gap-2">
              <LockKeyhole size={16} stroke={colors.raspberry} strokeWidth={2.8} />
              <Text className="text-xl font-black leading-6 text-cocoa">locked apps</Text>
            </View>
            <View className="min-w-7 items-center rounded-full bg-bubble px-2 py-1">
              <Text className="text-xs font-black text-white">{totalSelected}</Text>
            </View>
          </View>

          <View className="min-h-[74px] px-4 pb-4">
            {displayedApps.length > 0 ? (
              <View
                style={styles.appWordCloud}
                accessibilityLabel={`Locked apps: ${displayedApps.map((app) => app.displayName).join(', ')}`}
              >
                {displayedApps.map((app, index) => (
                  <Text
                    key={app.id}
                    style={{
                      color: wordColors[index % wordColors.length],
                      fontSize: wordSizes[index % wordSizes.length],
                      fontWeight: index < 3 ? '900' : '800',
                      lineHeight: wordSizes[index % wordSizes.length] + 7,
                    }}
                  >
                    {app.displayName}
                  </Text>
                ))}
                {totalSelected > displayedAppCount ? (
                  <Text className="text-sm font-black text-raspberry">+{totalSelected - displayedAppCount} more</Text>
                ) : null}
              </View>
            ) : (
              <View className="flex-row items-center gap-3">
                <View style={styles.emptyAppIcon}>
                  <AppWindow size={25} stroke={colors.mink} strokeWidth={2.2} />
                </View>
                <Text className="text-sm font-bold text-mink">
                  {selectedAppsConfigured ? 'app names unavailable' : 'no apps selected yet'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.updateButton}>
            {subscriptionBusy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <LockKeyhole size={15} stroke={colors.white} strokeWidth={3} />
                <Text className="text-[15px] font-black text-white">update locked apps</Text>
              </>
            )}
          </View>
        </Pressable>

        <View ref={timingsShowcaseTargetRef} collapsable={false} style={styles.section}>
          <View className="flex-row items-start justify-between px-4 pb-2 pt-4">
            <View className="min-w-0 flex-1 pr-3">
              <View className="flex-row items-center gap-2">
                <Clock3 size={21} stroke={colors.raspberry} strokeWidth={2.7} />
                <Text className="text-xl font-black leading-6 text-cocoa">booty locks</Text>
              </View>
              <Text className="mt-2 text-[13px] font-semibold leading-[17px] text-mink">
                your apps lock at these times and stay locked until you complete 10 squats
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add booty lock"
              onPress={addTime}
              className="h-9 w-9 items-center justify-center rounded-full bg-[#FFF0E8]"
            >
              <Plus size={21} stroke={colors.raspberry} strokeWidth={2.7} />
            </Pressable>
          </View>

          <View className="px-4 pb-1">
            {bootyLocks.map((lock, index) => (
              <LockTimeRow
                key={lock.id}
                lock={lock}
                last={index === bootyLocks.length - 1}
                onEdit={() => beginEditing(lock)}
                onToggle={(enabled) => {
                  setBootyLockEnabled(lock.id, enabled);
                  void Haptics.selectionAsync().catch(() => {});
                }}
              />
            ))}
          </View>
        </View>
      </View>

      <Text className="px-4 pt-4 text-center text-[12px] font-semibold leading-4 text-mink">
        {summary}. tap any time to change it.
      </Text>

      <HomeShowcase
        step={showcaseStep}
        targetRef={timingsShowcaseTargetRef}
        onAdvance={() => {
          setShowcaseStep(null);
          router.replace({ pathname: '/(tabs)/settings', params: { showcase: 'support' } });
        }}
      />

      {nativePickerOpen && nativePickerReady ? (
        <DeviceActivitySelectionSheetViewPersisted
          familyActivitySelectionId={SELECTION_ID}
          includeEntireCategory
          headerText="Choose apps for bootyblock"
          footerText="These apps will lock at your enabled booty lock times."
          onDismissRequest={() => void closeNativePicker()}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <Modal
        transparent
        visible={Boolean(editingLock)}
        animationType="fade"
        onRequestClose={() => setEditingLock(null)}
      >
        <Pressable style={styles.modalScrim} onPress={() => setEditingLock(null)}>
          <Pressable style={styles.timeEditor} onPress={(event) => event.stopPropagation()}>
            <View className="mb-3 flex-row items-center justify-between">
              <Pressable onPress={() => setEditingLock(null)} className="h-10 justify-center px-2">
                <Text className="text-base font-bold text-mink">cancel</Text>
              </Pressable>
              <Text className="text-lg font-black text-cocoa">lock time</Text>
              <Pressable onPress={saveEditingTime} className="h-10 justify-center px-2">
                <Text className="text-base font-black text-raspberry">save</Text>
              </Pressable>
            </View>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={draftDate}
                mode="time"
                display="spinner"
                minuteInterval={1}
                themeVariant="light"
                textColor={colors.cocoa}
                accentColor={colors.raspberry}
                onChange={handlePickerChange}
                style={styles.nativePicker}
              />
            ) : (
              <View className="items-center gap-5 py-5">
                <Text className="text-[48px] font-black text-cocoa">
                  {formatBootyLockTime({ hour: draftDate.getHours(), minute: draftDate.getMinutes() }).label}
                </Text>
                <View className="flex-row gap-3">
                  {[-60, -15, 15, 60].map((minutes) => (
                    <Pressable
                      key={minutes}
                      onPress={() => adjustWebTime(minutes)}
                      className="rounded-full bg-petal px-4 py-3"
                    >
                      <Text className="font-black text-cocoa">{minutes > 0 ? '+' : ''}{minutes}m</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(58, 31, 44, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    ...shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  appWordCloud: { minHeight: 58, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, rowGap: 3 },
  emptyAppIcon: { height: 58, width: 58, borderRadius: 17, backgroundColor: '#F2EEF0', alignItems: 'center', justifyContent: 'center' },
  updateButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.raspberry,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  timeRow: { minHeight: 79, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(58, 31, 44, 0.13)' },
  timePressable: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(58, 31, 44, 0.34)' },
  timeEditor: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFF9F7',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
  },
  nativePicker: { height: 210, width: '100%' },
});
