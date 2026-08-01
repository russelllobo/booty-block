import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../components/AppText';
import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import {
  colors,
  onboardingLightBackground,
  onboardingLightGradient,
} from '../../constants/theme';
import { useOnboardingStepAnalytics } from '../../lib/analytics';
import { ONBOARDING_STEP_TOTAL, ONBOARDING_STEPS } from '../../lib/onboardingSteps';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

const routineGlass = 'rgba(255, 255, 255, 0.72)';
const routineGlassBorder = 'rgba(58, 31, 44, 0.14)';
const DEFAULT_ROUTINE_REMINDER = { hour: 12, minute: 55 };

const styles = StyleSheet.create({
  nativePickerFrame: {
    backgroundColor: routineGlass,
  },
  nativePicker: {
    height: 196,
    width: '100%',
  },
  surface: {
    minHeight: 168,
    backgroundColor: routineGlass,
    justifyContent: 'center',
  },
});

function dateFromReminderTime(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function displayHourFromDate(date: Date) {
  const hour = date.getHours();
  const value = hour % 12;
  return value === 0 ? 12 : value;
}

function formatMinute(date: Date) {
  return String(date.getMinutes()).padStart(2, '0');
}

function periodFromDate(date: Date) {
  return date.getHours() >= 12 ? 'PM' : 'AM';
}

function formatReminderDate(date: Date) {
  return `${displayHourFromDate(date)}:${formatMinute(date)} ${periodFromDate(date)}`;
}

function RoutineTimeSurface({
  selectedDate,
  onPress,
}: {
  selectedDate: Date;
  onPress?: () => void;
}) {
  const content = (
    <LinearGradient
      colors={['rgba(255, 255, 255, 0.88)', 'rgba(255, 255, 255, 0.62)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="overflow-hidden rounded-[28px] border px-7"
      style={[styles.surface, { borderColor: routineGlassBorder }]}
    >
      <View className="flex-row items-end justify-center">
        <Text className="text-[58px] font-black leading-[64px] text-cocoa">
          {displayHourFromDate(selectedDate)}:{formatMinute(selectedDate)}
        </Text>
        <Text className="mb-2 ml-3 text-xl font-black text-mink">
          {periodFromDate(selectedDate)}
        </Text>
      </View>
    </LinearGradient>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose routine time, currently ${formatReminderDate(selectedDate)}`}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

export default function RoutineReminder() {
  const { routineReminderTime, setRoutineReminderTime } = useBootyblock();
  const initialTime = routineReminderTime ?? DEFAULT_ROUTINE_REMINDER;
  const [selectedDate, setSelectedDate] = useState(() =>
    dateFromReminderTime(initialTime.hour, initialTime.minute),
  );
  const posthog = usePostHog();

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/routine-reminder',
    ONBOARDING_STEPS.routineReminder.key,
    ONBOARDING_STEPS.routineReminder.title,
    ONBOARDING_STEPS.routineReminder.index,
    ONBOARDING_STEP_TOTAL,
  );

  function setNativeDate(date: Date) {
    setSelectedDate(dateFromReminderTime(date.getHours(), date.getMinutes()));
    void Haptics.selectionAsync();
  }

  function handlePickerChange(event: DateTimePickerEvent, date?: Date) {
    if (event.type === 'dismissed' || !date) return;
    setNativeDate(date);
  }

  function continueToActivity() {
    router.push('/onboarding/activity');
  }

  function skip() {
    setRoutineReminderTime(null);
    continueToActivity();
  }

  function save() {
    setRoutineReminderTime({
      hour: selectedDate.getHours(),
      minute: selectedDate.getMinutes(),
    });
    continueToActivity();
  }

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: selectedDate,
      mode: 'time',
      display: 'spinner',
      is24Hour: false,
      positiveButton: { label: 'Set' },
      negativeButton: { label: 'Cancel' },
      onChange: handlePickerChange,
    });
  }

  return (
    <Screen
      scroll={false}
      backgroundColor={onboardingLightBackground}
      backgroundGradient={onboardingLightGradient}
    >
      <OnboardingProgress
        step={ONBOARDING_STEPS.routineReminder.index}
        onBack={() => router.back()}
        showBar={false}
      />

      <SlidePanel animateOnMount>
        <View className="flex-1">
          <View>
            <Text className="text-[28px] font-bold leading-[33px] text-cocoa">
              what is the best time for you to exercise?
            </Text>
            <Text className="mt-1 text-base font-bold leading-5 text-mink">
              reminders make it 65% more likely to stick to bootyblock after a week.
            </Text>
          </View>

          <View className="flex-1 justify-center py-8">
            {Platform.OS === 'ios' ? (
              <View
                className="overflow-hidden rounded-[28px] border px-2"
                style={[styles.nativePickerFrame, { borderColor: routineGlassBorder }]}
              >
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="spinner"
                  minuteInterval={1}
                  themeVariant="light"
                  textColor={colors.cocoa}
                  accentColor={colors.raspberry}
                  onChange={handlePickerChange}
                  style={styles.nativePicker}
                />
              </View>
            ) : (
              <RoutineTimeSurface
                selectedDate={selectedDate}
                onPress={Platform.OS === 'android' ? openAndroidPicker : undefined}
              />
            )}
          </View>

          <View className="gap-4">
            <Pressable
              accessibilityRole="button"
              onPress={skip}
              className="h-11 items-center justify-center self-center rounded-full border px-8"
              style={{ borderColor: routineGlassBorder, backgroundColor: routineGlass }}
            >
              <Text className="text-sm font-black text-cocoa">Skip</Text>
            </Pressable>
            <Button label="Set Routine" onPress={save} />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
