import { Platform, Vibration } from 'react-native';

/**
 * Triggers a crisp, subtle 10ms tactile tick on Android for check-offs and mic taps.
 */
export function triggerLightHaptic(): void {
  if (Platform.OS !== 'android') return;
  try {
    Vibration.vibrate(10);
  } catch {
    // Ignore on devices without vibrator hardware
  }
}
