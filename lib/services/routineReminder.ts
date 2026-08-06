import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ROUTINE_REMINDER_KIND = 'routine_reminder';
const ROUTINE_REMINDER_CHANNEL = 'default';

type RoutineReminderTime = {
  hour: number;
  minute: number;
};

type RoutineReminderState = {
  isSubscribed: boolean;
  onboardingComplete: boolean;
  returnOfferPending: boolean;
};

export type RoutineReminderDestination = 'resume-onboarding' | 'return-offer' | null;

export function shouldScheduleRoutineReminder({
  isSubscribed,
  onboardingComplete,
  returnOfferPending,
}: RoutineReminderState) {
  return !isSubscribed && (!onboardingComplete || returnOfferPending);
}

export function getRoutineReminderDestination({
  isSubscribed,
  onboardingComplete,
  returnOfferPending,
}: RoutineReminderState): RoutineReminderDestination {
  if (isSubscribed) return null;
  if (returnOfferPending) return 'return-offer';
  if (!onboardingComplete) return 'resume-onboarding';
  return null;
}

export function isRoutineReminderNotification(notification: Notifications.Notification) {
  return notification.request.content.data?.kind === ROUTINE_REMINDER_KIND;
}

function isRoutineReminder(request: Notifications.NotificationRequest) {
  return request.content.data?.kind === ROUTINE_REMINDER_KIND;
}

let reminderSyncQueue: Promise<void> = Promise.resolve();

async function cancelScheduledRoutineReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(isRoutineReminder)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

async function performRoutineReminderSync(time: RoutineReminderTime | null) {
  if (Platform.OS === 'web') return;

  await cancelScheduledRoutineReminders();
  if (!time) return;

  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ROUTINE_REMINDER_CHANNEL, {
      name: 'bootyblock notifications',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Earn your scroll time 🍑',
      body: "Let's do some squats to build your glutes and replace the doomscrolling.",
      sound: 'default',
      data: {
        kind: ROUTINE_REMINDER_KIND,
        url: '/onboarding',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
      channelId: ROUTINE_REMINDER_CHANNEL,
    },
  });
}

export function syncRoutineReminderNotification(time: RoutineReminderTime | null) {
  const sync = reminderSyncQueue.then(
    () => performRoutineReminderSync(time),
    () => performRoutineReminderSync(time),
  );
  reminderSyncQueue = sync.then(
    () => undefined,
    () => undefined,
  );
  return sync;
}
