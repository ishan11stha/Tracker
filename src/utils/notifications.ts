import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ReminderItem } from '../types';
import { adToBs, formatBSDateNepali } from './nepaliDate';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vault-reminders', {
        name: 'VAULT Reminders (NPT)',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EA580C',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Converts a Nepal Standard Time (UTC+05:45) YYYY-MM-DD and HH:mm into an exact Date object
 */
export function getNPTTargetDate(dateISO: string, timeString: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  // NPT is UTC + 5h 45m (345 mins)
  const utcMillis =
    Date.UTC(year, month - 1, day, hours, minutes, 0) - 345 * 60 * 1000;
  return new Date(utcMillis);
}

export async function scheduleReminderNotification(
  reminder: ReminderItem,
  enabled = true
): Promise<string> {
  if (!enabled || reminder.isCompleted) {
    return '';
  }

  try {
    const hasPerm = await requestNotificationPermissions();
    if (!hasPerm) return '';

    if (reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId);
    }

    const targetDate = getNPTTargetDate(reminder.dateISO, reminder.timeString);
    const now = new Date();

    if (targetDate.getTime() <= now.getTime() && reminder.recurrence === 'none') {
      return '';
    }

    const bs = adToBs(reminder.dateISO);
    const bsFormatted = formatBSDateNepali(bs, false);

    let triggerDate = targetDate;
    if (triggerDate.getTime() <= now.getTime()) {
      // Advance to future occurrence for recurring reminders
      const diffDays = Math.ceil((now.getTime() - triggerDate.getTime()) / 86400000);
      triggerDate = new Date(triggerDate.getTime() + Math.max(1, diffDays) * 86400000);
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `VAULT • ${reminder.title}`,
        body: `${reminder.description ? reminder.description + ' • ' : ''}${bsFormatted} (${reminder.timeString} NPT)`,
        data: { reminderId: reminder.id, priority: reminder.priority },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: Platform.OS === 'android' ? 'vault-reminders' : undefined,
      },
    });

    return id;
  } catch {
    return '';
  }
}

export async function cancelReminderNotification(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Ignore if already dismissed or expired
  }
}
