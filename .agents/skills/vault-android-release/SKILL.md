---
name: vault-android-release
description: >-
  Runbook for VAULT Android native configuration, alarm/notification scheduling,
  optional native modules (voice/speech), splash screen / edge-to-edge layout,
  and EAS cloud APK builds. Use when modifying app.json, native modules,
  Android notifications/alarms, or building/troubleshooting an Android APK.
---

# VAULT Android Release & Native Runbook

## 1. Optional Native Modules (Expo Go + APK Compatibility)

When integrating any native module not bundled in Expo Go (such as `expo-speech-recognition`):
1. Install with `npx expo install <package>` and verify its plugin entry in `app.json`.
2. **Never** use a top-level value import that executes `requireNativeModule(...)` at import time.
3. Import only types (`import type { ... }`) and load the runtime module via `requireOptionalNativeModule('<ModuleName>')` from `'expo'`.
4. Attach native listeners inside `useEffect` only when the module is non-null, and show a friendly alert in Expo Go explaining that an APK rebuild activates the feature.

## 2. Android Alarms & Exact Repeat Counts

- Channels (`src/utils/notifications.ts`) use `AndroidAudioUsage.ALARM` (`vault-alarm-v4`, `vault-vibrate-v4`, `vault-alarm-vibrate-v4`) with a **single-pulse vibration** (`[0, 550]`) per burst.
- **Never** call `Vibration.vibrate()` inside `setNotificationHandler` or before scheduling `triggerImmediateReminderAlert` — Android's channel already handles 1 sound + 1 vibration per scheduled burst.
- Before rescheduling on app hydration or when `alarmRepeatCount` / `notificationsEnabled` changes, call `cancelAllScheduledReminderNotifications()` so stale bursts from previous settings never fire.

## 3. Splash Screen & Edge-to-Edge Safe Area

- Keep `expo-splash-screen` configured in `app.json` with solid `backgroundColor` (`#F8FAFC` light / `#0B0F19` dark) and **no `image`** so Expo writes a transparent drawable instead of the default grey wireframe grid.
- Keep `SafeAreaProvider initialMetrics={initialWindowMetrics}` and `SplashScreen.preventAutoHideAsync()` -> `SplashScreen.hideAsync()` on hydration in `src/app/_layout.tsx`.
- Keep `useSafeAreaInsets()` bottom padding on the tab bar in `src/app/(tabs)/_layout.tsx`.

## 4. Pre-Build Verification & EAS Cloud APK Build

Run in PowerShell:
```powershell
npx expo-doctor
npm run typecheck
npm run verify
```

Verify EAS login and trigger a cloud APK build:
```powershell
npx eas-cli@latest whoami
npx eas-cli@latest build --platform android --profile preview --non-interactive
```
Share the resulting `https://expo.dev/.../builds/<id>` link for direct Android installation.
