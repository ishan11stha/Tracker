# VAULT — Personal Finance & Life Tracker (Android)

> **Your life. Your records. Your control.**

**VAULT** is a minimalist, offline-first Android smartphone application built with React Native, Expo SDK 58, Expo Router, TypeScript, and Expo SQLite. It integrates native **Nepali Bikram Sambat (BS)** date conversion and a live **Nepal Standard Time (`Asia/Kathmandu`, UTC+05:45)** clock across every module.

---

## 1. Project Architecture & Folder Structure

```text
c:\Users\user\Documents\Tracker
├── src/
│   ├── app/                          # Expo Router Screens & Navigation
│   │   ├── _layout.tsx               # Root Stack navigator & SQLite hydration
│   │   ├── settings.tsx              # Settings, Profile, CSV Export & JSON Backup/Restore
│   │   └── (tabs)/
│   │       ├── _layout.tsx           # 5-tab English bottom navigation bar
│   │       ├── index.tsx             # Dashboard (Neutral #F5F6F8)
│   │       ├── money.tsx             # Money Manager (Soft Green #E8F5E9)
│   │       ├── items.tsx             # Item Tracker (Soft Blue #E8F1FC)
│   │       ├── tracker.tsx           # Activity Tracker (Soft Lavender #F0EBFA)
│   │       └── reminders.tsx         # Reminder Manager (Soft Peach #FFF0E6)
│   ├── components/                   # Reusable UI & modal components
│   │   ├── AppErrorBoundary.tsx      # Crash recovery with a safe reload screen
│   │   ├── NepaliDateClockBanner.tsx # Isolated live NPT clock & BS/AD hero card
│   │   ├── NepaliCalendarModal.tsx   # Dual BS / AD interactive calendar modal
│   │   ├── TimePickerModal.tsx       # 12h / 24h Nepal Standard Time picker modal
│   │   ├── QuickActionMessageBox.tsx # Natural-language quick entry with undo
│   │   ├── monekin/                  # Charts and shared financial visualization primitives
│   │   ├── TransactionFormModal.tsx  # Income/expense form (React Hook Form + Zod)
│   │   ├── ItemFormModal.tsx         # Personal item & persistent photo form
│   │   ├── ActivityFormModal.tsx     # Daily activity logger
│   │   └── ReminderFormModal.tsx     # Reminder & notification scheduler
│   ├── constants/
│   │   └── appSettings.ts            # Canonical first-run settings
│   ├── db/
│   │   └── database.ts               # Expo SQLite WAL database, migrations & transactional CRUD
│   ├── hooks/
│   │   ├── useNepalClock.ts          # Live NPT clock with background pause/resume
│   │   └── useCurrentNPT.ts          # Focus-aware current Nepal date refresh
│   ├── store/
│   │   └── useVaultStore.ts          # Zustand store with submission locking & selectors
│   ├── theme/
│   │   ├── colors.ts                 # Light/Dark palettes & section-specific colors
│   │   └── layout.ts                 # Shared phone/tablet content width constraints
│   ├── types/
│   │   └── index.ts                  # Interfaces, real date/time checks & Zod schemas
│   └── utils/
│       ├── nepaliDate.ts             # Verified 2000–2099 BS <-> AD conversion engine
│       ├── currency.ts               # NPR South Asian Lakh/Crore currency formatter
│       ├── notifications.ts          # Android notification channel & recurrence calculation
│       ├── csv.ts                    # CSV escaping with formula-injection protection
│       ├── itemImages.ts             # Persistent item photo storage and cleanup
│       └── exportBackup.ts           # CSV export & validated JSON backup/restore
├── scripts/
│   └── verify-vault.ts               # Automated verification test suite
├── app.json                          # Android-exclusive Expo configuration
├── eas.json                          # EAS Cloud APK build profiles
└── package.json                      # Scripts & dependencies
```

---

## 2. Mobile Design System & Section Color Identities

| Bottom Tab (English) | Module | Background | Accent | Route |
|---|---|---|---|---|
| **Home** | Dashboard | `#F5F6F8` | `#1E293B` | `src/app/(tabs)/index.tsx` |
| **Money** | Money Manager | `#E8F5E9` | `#16A34A` | `src/app/(tabs)/money.tsx` |
| **Items** | Item Tracker | `#E8F1FC` | `#2563EB` | `src/app/(tabs)/items.tsx` |
| **Tracker** | Activity Tracker | `#F0EBFA` | `#7C3AED` | `src/app/(tabs)/tracker.tsx` |
| **Reminders** | Reminder Manager | `#FFF0E6` | `#EA580C` | `src/app/(tabs)/reminders.tsx` |

---

## 3. Running & Exporting the Android Application

### Live Development with Expo Go
```bash
npx expo start
# Or over tunnel:
npm run tunnel
```

### Run Typecheck & Automated Verification Suite
```bash
npm run typecheck
npm run verify
```

Quality checks cover Nepali date conversion, NPT clock formatting, Zod form and
backup validation, CSV formula-injection escaping, multi-wallet balances, and
the natural-language quick-entry parser.

### Data protection notes
- Backups are schema-validated before any SQLite data is replaced.
- CSV cells beginning with `=`, `+`, `-`, or `@` are neutralized to prevent
  spreadsheet formula injection.
- The app only requests notification permission when notifications are used.
- Camera and notification permissions are declared; unused microphone and
  legacy broad-storage permissions are intentionally absent.

### Build & Export Installable Android `.apk`
- **Cloud APK Build via EAS (No local Android Studio required):**
  ```bash
  npm run apk:cloud
  ```
- **Local Gradle Release APK Build:**
  ```bash
  npm run apk:local
  ```
