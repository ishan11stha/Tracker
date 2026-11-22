import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ReminderItem, ReminderRecurrence } from '../types';
import { adToBs, formatBSDateNepali } from './nepaliDate';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Safe fallback for environments like Expo Go or Web
}

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

import { computeNextOccurrenceDate, getNPTTargetDate } from './dateRecurrence';

export { computeNextOccurrenceDate, getNPTTargetDate };

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

    const triggerDate = computeNextOccurrenceDate(
      reminder.dateISO,
      reminder.timeString,
      reminder.recurrence
    );

    if (!triggerDate) {
      return '';
    }

    const bs = adToBs(reminder.dateISO);
    const bsFormatted = formatBSDateNepali(bs, false);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `VAULT • ${reminder.title}`,
        body: `${
          reminder.description ? reminder.description + ' • ' : ''
        }${bsFormatted} (${reminder.timeString} NPT)`,
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

export async function cancelReminderNotification(
  notificationId?: string
): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Ignore if already dismissed or expired
  }
}
