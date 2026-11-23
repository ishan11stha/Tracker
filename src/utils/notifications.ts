import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import { ReminderAlertMode, ReminderItem } from '../types';
import { adToBs, formatBSDateNepali } from './nepaliDate';
import { computeNextOccurrenceDate, getNPTTargetDate } from './dateRecurrence';

export { computeNextOccurrenceDate, getNPTTargetDate };

const VIBRATE_PATTERN = [0, 500, 200, 500, 200, 700];

try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const alertMode =
        (notification.request.content.data?.alertMode as
          | ReminderAlertMode
          | undefined) || 'both';

      // Physically vibrate on Android when notification fires in foreground
      if (Platform.OS === 'android' && alertMode !== 'alarm') {
        try {
          Vibration.vibrate(VIBRATE_PATTERN);
        } catch {
          // Ignore on devices without vibrator hardware
        }
      }

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
  // Safe fallback for environments where native notifications are unavailable
}

export function getNotificationChannelId(
  alertMode: ReminderAlertMode = 'both'
): string {
  if (alertMode === 'alarm') return 'vault-alarm-v2';
  if (alertMode === 'vibrate') return 'vault-vibrate-v2';
  return 'vault-alarm-vibrate-v2';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const alarmAudioAttributes = {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      };

      await Promise.all([
        Notifications.setNotificationChannelAsync('vault-alarm-v2', {
          name: 'VAULT Alarm Reminders (Sound)',
          importance: Notifications.AndroidImportance.MAX,
          enableVibrate: false,
          lightColor: '#EA580C',
          sound: 'default',
          bypassDnd: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          audioAttributes: alarmAudioAttributes,
        }),
        Notifications.setNotificationChannelAsync('vault-vibrate-v2', {
          name: 'VAULT Vibrate Mode Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          enableVibrate: true,
          vibrationPattern: VIBRATE_PATTERN,
          lightColor: '#EA580C',
          sound: null,
          bypassDnd: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        }),
        Notifications.setNotificationChannelAsync('vault-alarm-vibrate-v2', {
          name: 'VAULT Alarm & Vibrate Reminders',
          importance: Notifications.AndroidImportance.MAX,
          enableVibrate: true,
          vibrationPattern: VIBRATE_PATTERN,
          lightColor: '#EA580C',
          sound: 'default',
          bypassDnd: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          audioAttributes: alarmAudioAttributes,
        }),
      ]);
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
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
        vibrate: alertMode === 'alarm' ? [] : VIBRATE_PATTERN,
        priority: Notifications.AndroidNotificationPriority.MAX,
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

/**
 * Fires an immediate test notification & hardware vibration for the given reminder
 * so the user can test and verify Alarm, Vibrate, or Alarm & Vibrate mode on Android.
 */
export async function triggerImmediateReminderAlert(
  reminder: Pick<
    ReminderItem,
    'id' | 'title' | 'description' | 'dateISO' | 'timeString' | 'priority' | 'alertMode'
  >
): Promise<void> {
  const alertMode: ReminderAlertMode = reminder.alertMode || 'both';

  if (Platform.OS === 'android' && alertMode !== 'alarm') {
    try {
      Vibration.vibrate(VIBRATE_PATTERN);
    } catch {
      // Ignore if vibrator unavailable
    }
  }

  try {
    const hasPerm = await requestNotificationPermissions();
    if (!hasPerm) return;

    const bs = adToBs(reminder.dateISO);
    const bsFormatted = formatBSDateNepali(bs, false);
    const modePrefix =
      alertMode === 'alarm'
        ? '⏰ ALARM'
        : alertMode === 'vibrate'
          ? '📳 VIBRATE'
          : '⏰ ALARM & VIBRATE';

    await Notifications.scheduleNotificationAsync({
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
        vibrate: alertMode === 'alarm' ? [] : VIBRATE_PATTERN,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger:
        Platform.OS === 'android'
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: getNotificationChannelId(alertMode),
            }
          : null,
    });
  } catch {
    // Safe fallback
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
