import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import { ReminderAlertMode, ReminderItem } from '../types';
import { adToBs, formatBSDateNepali } from './nepaliDate';
import { computeNextOccurrenceDate, getNPTTargetDate } from './dateRecurrence';

export { computeNextOccurrenceDate, getNPTTargetDate };

/**
 * Builds an Android vibration pattern with `count` strong pulses.
 * Format: [initialDelay, vibrateMs, pauseMs, vibrateMs, ...]
 */
export function buildVibrationPattern(repeatCount = 3): number[] {
  const count = Math.max(1, Math.min(10, Math.round(repeatCount)));
  const pattern: number[] = [0];
  for (let i = 0; i < count; i++) {
    pattern.push(550);
    if (i < count - 1) pattern.push(250);
  }
  return pattern;
}

try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data || {};
      const alertMode =
        (data.alertMode as ReminderAlertMode | undefined) || 'both';
      const repeatCount = Number(data.repeatCount) || 3;

      // Physically vibrate on Android when notification fires in foreground
      if (Platform.OS === 'android' && alertMode !== 'alarm') {
        try {
          Vibration.vibrate(buildVibrationPattern(repeatCount));
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
  alertMode: ReminderAlertMode = 'both',
  repeatCount = 3
): string {
  const safeCount = Math.max(1, Math.min(10, Math.round(repeatCount)));
  if (alertMode === 'alarm') return 'vault-alarm-v3';
  if (alertMode === 'vibrate') return `vault-vibrate-v3-${safeCount}x`;
  return `vault-alarm-vibrate-v3-${safeCount}x`;
}

export async function requestNotificationPermissions(
  repeatCount = 3
): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const safeCount = Math.max(1, Math.min(10, Math.round(repeatCount)));
      const vibPattern = buildVibrationPattern(safeCount);
      const alarmAudioAttributes = {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      };

      await Promise.all([
        Notifications.setNotificationChannelAsync('vault-alarm-v3', {
          name: 'VAULT Alarm Sound',
          importance: Notifications.AndroidImportance.MAX,
          enableVibrate: false,
          lightColor: '#EA580C',
          sound: 'default',
          bypassDnd: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          audioAttributes: alarmAudioAttributes,
        }),
        Notifications.setNotificationChannelAsync(
          `vault-vibrate-v3-${safeCount}x`,
          {
            name: `VAULT Vibrate (${safeCount}x)`,
            importance: Notifications.AndroidImportance.HIGH,
            enableVibrate: true,
            vibrationPattern: vibPattern,
            lightColor: '#EA580C',
            sound: null,
            bypassDnd: true,
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
          }
        ),
        Notifications.setNotificationChannelAsync(
          `vault-alarm-vibrate-v3-${safeCount}x`,
          {
            name: `VAULT Alarm & Vibrate (${safeCount}x)`,
            importance: Notifications.AndroidImportance.MAX,
            enableVibrate: true,
            vibrationPattern: vibPattern,
            lightColor: '#EA580C',
            sound: 'default',
            bypassDnd: true,
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            audioAttributes: alarmAudioAttributes,
          }
        ),
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

/**
 * Schedules `repeatCount` staggered Android alarm/vibrate alerts (spaced 5s apart)
 * so the alarm rings & vibrates the configured number of times even when locked.
 */
export async function scheduleReminderNotification(
  reminder: ReminderItem,
  enabled = true,
  repeatCount = 3
): Promise<string> {
  if (!enabled || reminder.isCompleted) {
    return '';
  }

  try {
    const safeCount = Math.max(1, Math.min(10, Math.round(repeatCount)));
    const hasPerm = await requestNotificationPermissions(safeCount);
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
    const vibPattern = buildVibrationPattern(safeCount);
    const channelId =
      Platform.OS === 'android'
        ? getNotificationChannelId(alertMode, safeCount)
        : undefined;

    const scheduledIds: string[] = [];
    for (let i = 0; i < safeCount; i++) {
      const burstDate = new Date(triggerDate.getTime() + i * 5000);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${modePrefix} • ${reminder.title}`,
          body: `${
            reminder.description ? reminder.description + ' • ' : ''
          }${bsFormatted} (${reminder.timeString} NPT)${
            safeCount > 1 ? ` [${i + 1}/${safeCount}]` : ''
          }`,
          data: {
            reminderId: reminder.id,
            priority: reminder.priority,
            alertMode,
            repeatCount: safeCount,
          },
          sound: alertMode === 'vibrate' ? false : 'default',
          vibrate: alertMode === 'alarm' ? [] : vibPattern,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: burstDate,
          channelId,
        },
      });
      if (id) scheduledIds.push(id);
    }

    return scheduledIds.join(',');
  } catch {
    return '';
  }
}

/**
 * Fires an immediate test alert & hardware vibration matching `repeatCount`
 * so the user can test Alarm & Vibrate right on their Android phone.
 */
export async function triggerImmediateReminderAlert(
  reminder: Pick<
    ReminderItem,
    'id' | 'title' | 'description' | 'dateISO' | 'timeString' | 'priority' | 'alertMode'
  >,
  repeatCount = 3
): Promise<void> {
  const safeCount = Math.max(1, Math.min(10, Math.round(repeatCount)));
  const alertMode: ReminderAlertMode = reminder.alertMode || 'both';
  const vibPattern = buildVibrationPattern(safeCount);

  if (Platform.OS === 'android' && alertMode !== 'alarm') {
    try {
      Vibration.vibrate(vibPattern);
    } catch {
      // Ignore if vibrator unavailable
    }
  }

  try {
    const hasPerm = await requestNotificationPermissions(safeCount);
    if (!hasPerm) return;

    const bs = adToBs(reminder.dateISO);
    const bsFormatted = formatBSDateNepali(bs, false);
    const modePrefix =
      alertMode === 'alarm'
        ? '⏰ ALARM'
        : alertMode === 'vibrate'
          ? '📳 VIBRATE'
          : '⏰ ALARM & VIBRATE';
    const channelId =
      Platform.OS === 'android'
        ? getNotificationChannelId(alertMode, safeCount)
        : undefined;

    for (let i = 0; i < safeCount; i++) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${modePrefix} • ${reminder.title}`,
          body: `${
            reminder.description ? reminder.description + ' • ' : ''
          }${bsFormatted} (${reminder.timeString} NPT)${
            safeCount > 1 ? ` [${i + 1}/${safeCount}]` : ''
          }`,
          data: {
            reminderId: reminder.id,
            priority: reminder.priority,
            alertMode,
            repeatCount: safeCount,
          },
          sound: alertMode === 'vibrate' ? false : 'default',
          vibrate: alertMode === 'alarm' ? [] : vibPattern,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger:
          Platform.OS === 'android'
            ? {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 1 + i * 4,
                channelId,
              }
            : null,
      });
    }
  } catch {
    // Safe fallback
  }
}

export async function cancelReminderNotification(
  notificationId?: string
): Promise<void> {
  if (!notificationId) return;
  const ids = notificationId
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignore if already dismissed or expired
    }
  }
}
