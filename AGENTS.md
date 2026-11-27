This is **VAULT**, a strictly **Android-only** (`"platforms": ["android"]`), 100% offline-first Expo/React Native TypeScript app backed by `expo-sqlite`, Nepal Standard Time (NPT, UTC+05:45), and Bikram Sambat (BS) calendar.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before writing code that touches an Expo, EAS, or React Native API:

1. Read the major version of `expo` in `package.json`.
2. Check matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/` or inspect installed types in `node_modules/`.
3. Never install unnecessary packages when existing dependencies (`lucide-react-native`, `react-native-svg`, `zustand`, `zod`, `expo-sqlite`) already cover the need.

## Verification & Commands (Windows PowerShell)

- **PowerShell syntax**: Chain commands with `;` (never `&&`) and always quote paths containing `(tabs)` (e.g., `"src/app/(tabs)/index.tsx"`).
- **Git Push Guardrail**: Never run `git push` automatically — only push to remote when the user explicitly asks to push.
- **Do NOT run `npx expo lint`**: This project intentionally has no ESLint dependency (running it auto-installs ~238 packages).
- **Required verification before declaring any task done**:
  ```powershell
  npm run typecheck   # tsc --noEmit
  npm run verify      # node scripts/verify-vault.ts (all 16 core suites)
  ```
- Always install Expo modules via `npx expo install <package>` so SDK-compatible versions are resolved.

## Product & Data Guardrails

- **Android-only & Offline-first**: Do not add web (`react-dom`, `react-native-web`) or iOS targets/dependencies.
- **Currency & Settings**: Currency is locked to default **NPR** — never add currency-switching controls. Do not re-add a Location/Subtitle field to Settings.
- **Protect User Data**: Never reset, drop, or destructively migrate SQLite tables. Add new columns only via safe idempotent `try { ALTER TABLE ... } catch {}` migrations in `src/db/database.ts`.
- **Repeating Habits & Reminders**: Never mark repeating items (`recurrence !== 'none'` or `repeat !== 'once'`) permanently completed into Done — track per-day completion in `completedDates: string[]` so they stay active for future days.

## UI, Layout & Performance Standards

- **Design System**: Use the unified **Hero Card** (`src/components/ui/HeroCard.tsx`) across all main tabs with crisp light/dark contrast. Avoid duplicating Money's Net Balance card on Home (Home uses the Today's Pulse + Next Up + Spent Today / Net Worth hero).
- **Compact Spacing (No Excess Whitespace)**: Keep outer screen padding compact (`paddingHorizontal: 14`, `paddingTop: 10`, `paddingBottom: 22`), card gaps `12px`, and hero padding `14–16px`. Keep Home's quick dock and 4-module pulse strip icon-only (no noisy text labels).
- **Header Controls**: Home top-right has **Light/Dark Theme (`Sun`/`Moon`)** + **Settings**; **Private Mode (`Eye`/`EyeOff`)** lives in Money's Balance Hero card.
- **Responsiveness**:
  - Use optimistic Zustand updates for toggle actions (`toggleActivityStatus`, `toggleReminderCompleted`) so taps respond at 0ms.
  - Use targeted Zustand selectors (`useVaultStore((s) => s.slice)`) on layout/shared components to avoid cascading re-renders.
  - Keep `lazy: true`, `freezeOnBlur: true`, and `animation: 'none'` on bottom tabs, and `keyboardShouldPersistTaps="handled"` on `ScrollView`s.

## Native Modules & Navigation

- **Expo Go Safety**: Never statically import native-only Expo modules not bundled in Expo Go (e.g., `expo-speech-recognition`) at top level. Always resolve them via `requireOptionalNativeModule(...)` so Expo Go never crashes with `Cannot find native module`.
- **Routing**: Use **Expo Router** (`src/app/`). Keep non-route code outside `src/app/`.
- **CNG**: Never create or edit `android/` by hand — configure native behavior in `app.json` and config plugins.
