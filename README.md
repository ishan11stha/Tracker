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
│   ├── components/                   # Reusable UI & Modal Components
│   │   ├── NepaliDateClockBanner.tsx # Isolated 1s live NPT clock & BS/AD hero card
│   │   ├── NepaliCalendarModal.tsx   # Dual BS / AD interactive calendar modal
│   │   ├── TimePickerModal.tsx       # 12h / 24h Nepal Standard Time picker modal
│   │   ├── TransactionFormModal.tsx  # Income/Expense form modal (React Hook Form + Zod)
│   │   ├── ItemFormModal.tsx         # Personal Item & Photo form modal
│   │   ├── ActivityFormModal.tsx     # Daily Activity logger modal
│   │   └── ReminderFormModal.tsx     # Reminder & Notification scheduler modal
│   ├── constants/
│   │   └── categories.ts             # Domain categories, units, statuses & priorities
│   ├── db/
│   │   └── database.ts               # Expo SQLite WAL database & transactional CRUD
│   ├── hooks/
│   │   └── useNepalClock.ts          # Live Nepal Standard Time (UTC+05:45) hook
│   ├── store/
│   │   └── useVaultStore.ts          # Zustand store with submission locking & selectors
│   ├── theme/
│   │   └── colors.ts                 # Light/Dark palettes & section-specific colors
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces & Zod validation schemas
│   └── utils/
│       ├── nepaliDate.ts             # Verified 2000–2099 BS <-> AD conversion engine
│       ├── currency.ts               # NPR South Asian Lakh/Crore currency formatter
│       ├── notifications.ts          # Android notification channel & recurrence calculation
│       └── exportBackup.ts           # Expo SDK 58 File/Paths CSV export & JSON backup validation
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
npx tsc --noEmit
node scripts/verify-vault.ts
```

### Build & Export Installable Android `.apk`
- **Cloud APK Build via EAS (No local Android Studio required):**
  ```bash
  npm run apk:cloud
  ```
- **Local Gradle Release APK Build:**
  ```bash
  npm run apk:local
  ```
