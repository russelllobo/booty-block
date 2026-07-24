import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ROUTINE_REMINDER_KIND = 'routine_reminder';
const ROUTINE_REMINDER_CHANNEL = 'default';

type RoutineReminderTime = {
  hour: number;
  minute: number;
};

function isRoutineReminder(request: Notifications.NotificationRequest) {
  return request.content.data?.kind === ROUTINE_REMINDER_KIND;
}

async function cancelScheduledRoutineReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(isRoutineReminder)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

export async function syncRoutineReminderNotification(time: RoutineReminderTime | null) {
  if (Platform.OS === 'web') return;

  await cancelScheduledRoutineReminders();
  if (!time) return;

  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ROUTINE_REMINDER_CHANNEL, {
      name: 'Bootyblock notifications',
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
        url: '/plan',
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
