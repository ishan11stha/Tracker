import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ReminderAlertMode, ReminderItem, ReminderRecurrence } from '../types';
import { adToBs, formatBSDateNepali } from './nepaliDate';

try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const alertMode =
        (notification.request.content.data?.alertMode as
          | ReminderAlertMode
          | undefined) || 'both';
      return {
        shouldShowAlert: true,
        shouldPlaySound: alertMode !== 'vibrate',
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
} catch {
  // Safe fallback for environments like Expo Go or Web
}

export function getNotificationChannelId(
  alertMode: ReminderAlertMode = 'both'
): string {
  if (alertMode === 'alarm') return 'vault-reminders-alarm';
  if (alertMode === 'vibrate') return 'vault-reminders-vibrate';
  return 'vault-reminders-both';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Promise.all([
        Notifications.setNotificationChannelAsync('vault-reminders-alarm', {
          name: 'VAULT Alarm Reminders (Sound)',
          importance: Notifications.AndroidImportance.MAX,
          enableVibrate: false,
          lightColor: '#EA580C',
          sound: 'default',
          bypassDnd: true,
        }),
        Notifications.setNotificationChannelAsync('vault-reminders-vibrate', {
          name: 'VAULT Vibrate Mode Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          enableVibrate: true,
          vibrationPattern: [0, 500, 200, 500, 200, 500],
          lightColor: '#EA580C',
          sound: null,
        }),
        Notifications.setNotificationChannelAsync('vault-reminders-both', {
          name: 'VAULT Alarm & Vibrate Reminders',
          importance: Notifications.AndroidImportance.MAX,
          enableVibrate: true,
          vibrationPattern: [0, 600, 200, 600, 200, 800],
          lightColor: '#EA580C',
          sound: 'default',
          bypassDnd: true,
        }),
      ]);
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
    const alertMode: ReminderAlertMode = reminder.alertMode || 'both';
    const modePrefix =
      alertMode === 'alarm'
        ? '⏰ ALARM'
        : alertMode === 'vibrate'
          ? '📳 VIBRATE'
          : '⏰ ALARM & VIBRATE';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${modePrefix} • ${reminder.title}`,
        body: `${
          reminder.description ? reminder.description + ' • ' : ''
        }${bsFormatted} (${reminder.timeString} NPT)`,
        data: {
          reminderId: reminder.id,
          priority: reminder.priority,
          alertMode,
        },
        sound: alertMode === 'vibrate' ? false : 'default',
        vibrate:
          alertMode === 'alarm' ? [] : [0, 500, 200, 500, 200, 600],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId:
          Platform.OS === 'android'
            ? getNotificationChannelId(alertMode)
            : undefined,
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
