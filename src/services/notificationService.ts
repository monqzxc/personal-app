import { Platform } from 'react-native';
import type { ScheduledReminder } from './reminderSelectors';

export class NotificationService {
  async enable(): Promise<void> {
    if (Platform.OS === 'web') throw new Error('Device reminders are available in the Android/iOS app.');
    const Notifications = await import('expo-notifications');
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('daywell', { name: 'Personal reminders', importance: Notifications.AndroidImportance.DEFAULT });
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) throw new Error('Notifications were not allowed. You can enable them in device settings.');
  }
  async reconcile(reminders: ScheduledReminder[], enabled: boolean): Promise<string> {
    if (Platform.OS === 'web') return 'Device reminders require the Android/iOS app.';
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of pending.filter(item => item.identifier.startsWith('daywell:'))) await Notifications.cancelScheduledNotificationAsync(item.identifier);
    if (!enabled) return 'Device reminders are off.';
    if (!(await Notifications.getPermissionsAsync()).granted) return 'Notification permission is disabled. Re-enable it in device settings.';
    // Keep under iOS's pending-request limit; replenish on app open or any saved change.
    const upcoming = reminders.slice(0, 60);
    for (const reminder of upcoming) await Notifications.scheduleNotificationAsync({ identifier: reminder.id,
      content: { title: reminder.title, body: 'Your MONAPp reminder', data: { route: reminder.route } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminder.at), channelId: 'daywell' },
    });
    return `${upcoming.length} reminders scheduled${reminders.length > 60 ? ' (next 60; reopen to replenish)' : ''}. Device settings may affect delivery.`;
  }
}
export const notificationService = new NotificationService();
