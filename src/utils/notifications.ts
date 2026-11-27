import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ReminderAlertMode, ReminderItem } from '../types';
import { adToBs, formatBSDateNepali } from './nepaliDate';
import { computeNextOccurrenceDate, getNPTTargetDate } from './dateRecurrence';

export { computeNextOccurrenceDate, getNPTTargetDate };

/**
 * Builds an Android vibration pattern with `count` strong pulses.
 * Format: [initialDelay, vibrateMs, pauseMs, vibrateMs, ...]
 */
export function buildVibrationPattern(repeatCount = 1): number[] {
  const count = Math.max(1, Math.min(10, Math.round(repeatCount)));
  const pattern: number[] = [0];
  for (let i = 0; i < count; i++) {
    pattern.push(550);
    if (i < count - 1) pattern.push(250);
  }
  return pattern;
}

const SINGLE_BURST_VIBRATION = buildVibrationPattern(1);

try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data || {};
      const alertMode =
        (data.alertMode as ReminderAlertMode | undefined) || 'both';

      // Android NotificationChannel already handles sound & vibration cleanly
      // for each scheduled burst — do not double-vibrate via Vibration.vibrate().
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
  _repeatCount = 1
): string {
  if (alertMode === 'alarm') return 'vault-alarm-v4';
  if (alertMode === 'vibrate') return 'vault-vibrate-v4';
  return 'vault-alarm-vibrate-v4';
}

export async function requestNotificationPermissions(
  _repeatCount = 1
): Promise<boolean> {
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
        Notifications.setNotificationChannelAsync('vault-alarm-v4', {
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
        Notifications.setNotificationChannelAsync('vault-vibrate-v4', {
          name: 'VAULT Vibrate',
          importance: Notifications.AndroidImportance.HIGH,
          enableVibrate: true,
          vibrationPattern: SINGLE_BURST_VIBRATION,
          lightColor: '#EA580C',
          sound: null,
          bypassDnd: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        }),
        Notifications.setNotificationChannelAsync('vault-alarm-vibrate-v4', {
          name: 'VAULT Alarm & Vibrate',
          importance: Notifications.AndroidImportance.MAX,
          enableVibrate: true,
          vibrationPattern: SINGLE_BURST_VIBRATION,
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

/**
 * Cancels every pending scheduled notification so stale bursts from previous
 * repeat-count settings can never fire unexpectedly.
 */
export async function cancelAllScheduledReminderNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignore on platforms where notifications are unavailable
  }
}

/**
 * Schedules `repeatCount` staggered Android alarm/vibrate alerts (spaced 5s apart).
 * Each burst rings once and vibrates once, so `1x` fires strictly 1 time,
 * `2x` fires strictly 2 times, `3x` fires strictly 3 times, etc.
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
          vibrate: alertMode === 'alarm' ? [] : SINGLE_BURST_VIBRATION,
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
 * Fires an immediate test alert matching `repeatCount` exactly (1x = 1 alert, 3x = 3 alerts).
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
          vibrate: alertMode === 'alarm' ? [] : SINGLE_BURST_VIBRATION,
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
