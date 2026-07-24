import * as Notifications from 'expo-notifications';

import { syncRoutineReminderNotification } from '../lib/services/routineReminder';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { MAX: 5 },
  PermissionStatus: { DENIED: 'denied', GRANTED: 'granted' },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

const getAllScheduledNotificationsAsync =
  Notifications.getAllScheduledNotificationsAsync as jest.MockedFunction<
    typeof Notifications.getAllScheduledNotificationsAsync
  >;
const getPermissionsAsync = Notifications.getPermissionsAsync as jest.MockedFunction<
  typeof Notifications.getPermissionsAsync
>;

describe('syncRoutineReminderNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  it('replaces only the existing routine reminder with a daily notification', async () => {
    getAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'routine',
        content: {
          title: 'Old reminder',
          data: { kind: 'routine_reminder' },
        },
        trigger: null,
      },
      {
        identifier: 'something-else',
        content: {
          title: 'Keep me',
          data: { kind: 'another_notification' },
        },
        trigger: null,
      },
    ] as unknown as Notifications.NotificationRequest[]);
    getPermissionsAsync.mockResolvedValue({
      canAskAgain: true,
      expires: 'never',
      granted: true,
      status: Notifications.PermissionStatus.GRANTED,
    });

    await syncRoutineReminderNotification({ hour: 18, minute: 30 });

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('routine');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Earn your scroll time 🍑',
        body: "Let's do some squats to build your glutes and replace the doomscrolling.",
        sound: 'default',
        data: {
          kind: 'routine_reminder',
          url: '/plan',
        },
      },
      trigger: {
        type: 'daily',
        hour: 18,
        minute: 30,
        channelId: 'default',
      },
    });
  });

  it('does not schedule when notification permission is unavailable', async () => {
    getPermissionsAsync.mockResolvedValue({
      canAskAgain: false,
      expires: 'never',
      granted: false,
      status: Notifications.PermissionStatus.DENIED,
    });

    await syncRoutineReminderNotification({ hour: 9, minute: 0 });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('removes the routine reminder when the user skips it', async () => {
    getAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'routine',
        content: {
          title: 'Old reminder',
          data: { kind: 'routine_reminder' },
        },
        trigger: null,
      },
    ] as unknown as Notifications.NotificationRequest[]);

    await syncRoutineReminderNotification(null);

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('routine');
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
