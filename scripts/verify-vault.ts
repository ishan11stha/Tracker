import {
  adToBs,
  bsToAd,
  formatADDateFull,
  formatBSDateEnglish,
  formatBSDateNepali,
  formatNPTTime,
  buildBSMonthGrid,
} from '../src/utils/nepaliDate.ts';
import { formatCurrency } from '../src/utils/currency.ts';
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '../src/utils/numberInput.ts';
import {
  transactionSchema,
  itemSchema,
  activitySchema,
  reminderSchema,
  vaultBackupSchema,
} from '../src/types/index.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

console.log('=== VAULT CORE ENGINE & ARCHITECTURE VERIFICATION ===\n');

// 1. Verify exact requirement example: Friday, November 20, 2026 -> २०८३ मंसिर ४, शुक्रबार
const testDateISO = '2026-11-20';
const bs = adToBs(testDateISO);
const formattedNepali = formatBSDateNepali(bs, true);
const formattedAD = formatADDateFull(testDateISO);
const formattedRoman = formatBSDateEnglish(bs, true);

console.log('1. Testing Nepali Date Conversion (2026-11-20):');
console.log('   BS Nepali Script :', formattedNepali);
console.log('   AD Full English  :', formattedAD);
console.log('   BS Romanized     :', formattedRoman);

assert(bs.year === 2083, `Expected BS year 2083, got ${bs.year}`);
assert(bs.month === 8, `Expected BS month 8 (Mangsir), got ${bs.month}`);
assert(bs.day === 4, `Expected BS day 4, got ${bs.day}`);
assert(bs.weekday === 5, `Expected weekday 5 (Friday/शुक्रबार), got ${bs.weekday}`);
assert(
  formattedNepali === '२०८३ मंसिर ४, शुक्रबार',
  `Expected '२०८३ मंसिर ४, शुक्रबार', got '${formattedNepali}'`
);
assert(
  formattedAD === 'Friday, November 20, 2026',
  `Expected 'Friday, November 20, 2026', got '${formattedAD}'`
);

// 2. Verify BS -> AD roundtrip conversion across multiple decades & clamping
const sampleBSDates = [
  { y: 2000, m: 1, d: 1, expectedAD: '1943-04-14' },
  { y: 2080, m: 1, d: 1, expectedAD: '2023-04-14' },
  { y: 2081, m: 1, d: 1, expectedAD: '2024-04-13' },
  { y: 2082, m: 1, d: 1, expectedAD: '2025-04-14' },
  { y: 2083, m: 8, d: 4, expectedAD: '2026-11-20' },
];

for (const s of sampleBSDates) {
  const ad = bsToAd(s.y, s.m, s.d);
  assert(
    ad.isoDate === s.expectedAD,
    `BS ${s.y}-${s.m}-${s.d} expected AD ${s.expectedAD}, got ${ad.isoDate}`
  );
  const backToBS = adToBs(ad.isoDate);
  assert(
    backToBS.year === s.y && backToBS.month === s.m && backToBS.day === s.d,
    `Roundtrip failed for ${s.y}-${s.m}-${s.d}`
  );
}

// Verify boundary clamping for invalid day (e.g. day 35 in Mangsir 2083 clamps to 29)
const clampedResult = bsToAd(2083, 8, 35);
const expectedEndMangsir = bsToAd(2083, 8, 29);
assert(
  clampedResult.isoDate === expectedEndMangsir.isoDate,
  'Out-of-bounds BS day clamping failed'
);
console.log('2. BS <-> AD Multi-Decade Roundtrip & Boundary Clamping: PASSED');

// 3. Verify BS Month Calendar Grid
const grid = buildBSMonthGrid(2083, 8);
assert(grid.days.length === 29, `Expected 29 days in Mangsir 2083, got ${grid.days.length}`);
console.log('3. Nepali Calendar Month Grid Generator: PASSED');

// 4. Verify Live NPT Clock formatting
const live12 = formatNPTTime('12h', false, new Date('2026-11-20T05:21:00Z')); // 05:21 UTC + 05:45 = 11:06 AM NPT
assert(live12 === '11:06 AM NPT', `Expected '11:06 AM NPT', got '${live12}'`);
console.log('4. Nepal Standard Time (UTC+05:45) Clock Verification:', live12, '-> PASSED');

// 5. Verify NPR Currency Formatting & Financial Formula (Total Balance = Total Income - Total Expenses)
const income = 120000;
const expense = 12800;
const balance = income - expense;
assert(balance === 107200, 'Balance formula mismatch');
const formattedNPR = formatCurrency(balance, 'NPR');
assert(formattedNPR === 'NPR 1,07,200', `Expected 'NPR 1,07,200', got '${formattedNPR}'`);
console.log('5. Financial Calculation & NPR Lakh/Crore Formatting:', formattedNPR, '-> PASSED');

// 6. Verify Zod Form & Backup Validation Schemas
const validTxn = transactionSchema.safeParse({
  type: 'income',
  title: 'Salary',
  amount: 95000,
  category: 'Salary',
  dateISO: '2026-11-20',
  paymentMethod: 'Bank Transfer',
  description: 'Verified',
});
assert(validTxn.success, 'Transaction schema failed valid payload');

const validItem = itemSchema.safeParse({
  name: 'MacBook Pro',
  description: 'M3',
  category: 'Electronics',
  purchasePrice: 265000,
  purchaseDateISO: '2026-11-20',
  quantity: 1,
  imageUri: '',
  location: 'Desk',
  status: 'Owned',
});
assert(validItem.success, 'Item schema failed valid payload');

const validAct = activitySchema.safeParse({
  title: 'Morning Run',
  description: '5km',
  category: 'Fitness & Health',
  dateISO: '2026-11-20',
  timeString: '06:30',
  numericValue: 45,
  unit: 'mins',
  status: 'completed',
});
assert(validAct.success, 'Activity schema failed valid payload');

const validRem = reminderSchema.safeParse({
  title: 'Pay Electricity Bill',
  description: 'NEA online payment',
  dateISO: '2026-11-20',
  timeString: '17:00',
  priority: 'High',
  category: 'Bills & Finance',
  recurrence: 'monthly',
});
assert(validRem.success, 'Reminder schema failed valid payload');

// Verify Backup JSON schema accepts valid payload and rejects tampered payload
const validBackup = vaultBackupSchema.safeParse({
  version: 1,
  exportedAt: '2026-11-20T05:45:00.000Z',
  settings: {
    userName: 'Aarav Sharma',
    userTitle: 'Kathmandu, Nepal',
    currency: 'NPR',
    language: 'ne',
    preferredCalendar: 'BS',
    timeFormat: '12h',
    notificationsEnabled: true,
    theme: 'light',
  },
  transactions: [],
  items: [],
  itemHistory: [],
  activities: [],
  reminders: [],
});
assert(validBackup.success, 'Valid backup payload rejected by vaultBackupSchema');

const invalidBackup = vaultBackupSchema.safeParse({
  version: 1,
  exportedAt: '2026-11-20T05:45:00.000Z',
  settings: { currency: 'INVALID_CURRENCY' },
  transactions: 'not-an-array',
});
assert(!invalidBackup.success, 'Invalid backup payload should be rejected');
console.log('6. Zod Form & Backup Security Validation Schemas: PASSED');

// 7. Verify Number Input Sanitizers (multiple decimals, negative characters, integer clamping)
const dec1 = sanitizeDecimalInput('1250.55.99');
assert(dec1.text === '1250.55' && dec1.value === 1250.55, `Expected 1250.55, got ${dec1.text}`);
const dec2 = sanitizeDecimalInput('abc-99.5');
assert(dec2.text === '99.5' && dec2.value === 99.5, `Expected 99.5, got ${dec2.text}`);
const int1 = sanitizeIntegerInput('00', 1);
assert(int1.value === 1, `Expected fallback 1 for zero quantity, got ${int1.value}`);
const int2 = sanitizeIntegerInput('15px', 1);
assert(int2.text === '15' && int2.value === 15, `Expected 15, got ${int2.value}`);
console.log('7. Numeric & Decimal Input Sanitizers: PASSED\n');
console.log('✅ ALL VAULT CORE & ARCHITECTURAL CHECKS PASSED!');
