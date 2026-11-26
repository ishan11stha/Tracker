import {
  adToBs,
  bsToAd,
  formatADDateFull,
  formatBSDateEnglish,
  formatBSDateNepali,
  formatNPTTime,
  buildBSMonthGrid,
} from '../src/utils/nepaliDate.ts';
import {
  formatCurrency,
  formatCurrencyParts,
  getFinanceHealthMeta,
} from '../src/utils/currency.ts';
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from '../src/utils/numberInput.ts';
import {
  parseQuickInput,
  extractAmount,
  detectPaymentAndScope,
} from '../src/utils/nlpParser.ts';
import {
  calculateAccountBalances,
} from '../src/utils/accountBalances.ts';
import type {
  Account,
  Transaction,
} from '../src/types/index.ts';
import {
  transactionSchema,
  itemSchema,
  activitySchema,
  reminderSchema,
  savingsGoalSchema,
  vaultBackupSchema,
  isValidISODate,
  isValidTime24,
  parseRecurrenceWeekdays,
  formatRecurrenceLabel,
} from '../src/types/index.ts';
import { escapeCSV } from '../src/utils/csv.ts';
import { computeNextOccurrenceDate, getNPTTargetDate } from '../src/utils/dateRecurrence.ts';

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
    theme: 'dark',
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
console.log('7. Numeric & Decimal Input Sanitizers: PASSED');

// 8. Verify Monekin CurrencyDisplayer Split Parts, Private Mode Masking & FinanceHealthMeta
const parts = formatCurrencyParts(107200.5, 'NPR', false, false);
assert(
  parts.symbol === 'NPR' &&
    parts.integerPart === '1,07,200' &&
    parts.decimalPart === '.50',
  `Unexpected currency parts: ${JSON.stringify(parts)}`
);
const masked = formatCurrencyParts(107200.5, 'NPR', false, true);
assert(masked.integerPart === '••••', 'Private mode masking failed');
const healthExcel = getFinanceHealthMeta(85);
assert(healthExcel.label === 'EXCELLENT' && healthExcel.color === '#37A13B', 'FinanceHealthMeta failed');
console.log('8. Monekin CurrencyDisplayer, Private Mode & Financial Health Score Engine: PASSED');

// 9. Verify Intelligent Natural Language Quick Input Parser (Exact user requirements)
// Test A: "get by mom 200, add to bank"
const parsedA = parseQuickInput('get by mom 200, add to bank');
assert(parsedA.intent === 'income', `Expected intent 'income', got ${parsedA.intent}`);
assert(parsedA.amount === 200, `Expected amount 200, got ${parsedA.amount}`);
assert(parsedA.paymentMethod === 'Bank Transfer', `Expected 'Bank Transfer', got ${parsedA.paymentMethod}`);
assert(parsedA.title.toLowerCase().includes('mom'), `Expected title containing 'mom', got ${parsedA.title}`);

// Test B: "bought notebook, 5000"
const parsedB = parseQuickInput('bought notebook, 5000');
assert(parsedB.intent === 'expense', `Expected intent 'expense', got ${parsedB.intent}`);
assert(parsedB.amount === 5000, `Expected amount 5000, got ${parsedB.amount}`);
assert(parsedB.isItemAndExpense === true, 'Expected isItemAndExpense to be true for bought item');
assert(parsedB.itemName === 'Notebook', `Expected itemName 'Notebook', got ${parsedB.itemName}`);
assert(parsedB.category === 'Shopping' || parsedB.category === 'Books & Stationery', `Unexpected category ${parsedB.category}`);

// Test C: "drank coffee 150 cash"
const parsedC = parseQuickInput('drank coffee 150 cash');
assert(parsedC.intent === 'expense', `Expected intent 'expense', got ${parsedC.intent}`);
assert(parsedC.amount === 150, `Expected amount 150, got ${parsedC.amount}`);
assert(parsedC.paymentMethod === 'Cash', `Expected paymentMethod 'Cash', got ${parsedC.paymentMethod}`);
assert(parsedC.category === 'Food & Dining', `Expected category 'Food & Dining', got ${parsedC.category}`);

// Test D: "5km run 30 mins"
const parsedD = parseQuickInput('5km run 30 mins');
assert(parsedD.intent === 'activity', `Expected intent 'activity', got ${parsedD.intent}`);
assert(parsedD.numericValue === 5, `Expected numericValue 5, got ${parsedD.numericValue}`);
assert(parsedD.unit === 'km', `Expected unit 'km', got ${parsedD.unit}`);

// Test E: "remind me tomorrow 5pm to pay wifi"
const parsedE = parseQuickInput('remind me tomorrow 5pm to pay wifi');
assert(parsedE.intent === 'reminder', `Expected intent 'reminder', got ${parsedE.intent}`);
assert(parsedE.timeString === '17:00', `Expected timeString '17:00', got ${parsedE.timeString}`);
assert(parsedE.title.toLowerCase().includes('wifi'), `Expected title with wifi, got ${parsedE.title}`);

// Test F: "family bank deposit 500"
const parsedF = parseQuickInput('family bank deposit 500');
assert(parsedF.intent === 'income', `Expected intent 'income', got ${parsedF.intent}`);
assert(parsedF.amount === 500, `Expected amount 500, got ${parsedF.amount}`);
assert(parsedF.accountScope === 'Family', `Expected accountScope 'Family', got ${parsedF.accountScope}`);

// Test G: quantity must not be mistaken for the purchase amount
const parsedG = parseQuickInput('bought 2 notebooks for 5000');
assert(parsedG.amount === 5000, `Expected amount 5000, got ${parsedG.amount}`);
assert(parsedG.isItemAndExpense === true, 'Expected linked item for purchase');

// Test H: an explicit "at 5" time must not consume a monetary amount
const parsedH = parseQuickInput('remind me tomorrow at 5 to pay wifi');
assert(parsedH.intent === 'reminder', `Expected reminder intent, got ${parsedH.intent}`);
assert(parsedH.timeString === '05:00', `Expected 05:00, got ${parsedH.timeString}`);
assert(parsedH.title.toLowerCase() === 'pay wifi', `Unexpected title: ${parsedH.title}`);

console.log('9. Intelligent NLP Intent & Entity Parser Engine: PASSED');

// 10. Multi-Account / Multi-Wallet Ownership & Scope Calculation Engine
const initialAccounts: Account[] = [
  {
    id: 'acc_personal_bank',
    name: 'Bank',
    scope: 'Personal',
    initialBalance: 0,
    paymentMethod: 'Bank Transfer',
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  },
  {
    id: 'acc_personal_cash',
    name: 'Cash',
    scope: 'Personal',
    initialBalance: 0,
    paymentMethod: 'Cash',
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  },
  {
    id: 'acc_family_bank',
    name: 'Bank',
    scope: 'Family',
    initialBalance: 0,
    paymentMethod: 'Bank Transfer',
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  },
  {
    id: 'acc_family_cash',
    name: 'Cash',
    scope: 'Family',
    initialBalance: 0,
    paymentMethod: 'Cash',
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  },
];

// Baseline test: without any transactions (Clean Zero Starting Wallets)
const baseline = calculateAccountBalances(initialAccounts, []);
assert(baseline.personalTotal === 0, `Expected Personal Total 0, got ${baseline.personalTotal}`);
assert(baseline.familyTotal === 0, `Expected Family Total 0, got ${baseline.familyTotal}`);
assert(baseline.grandTotal === 0, `Expected Grand Total 0, got ${baseline.grandTotal}`);

// Transaction test:
// 1. Mom gave 200, added to Personal Bank -> Personal Bank becomes 200 (Personal Total = 200)
// 2. Bought notebook 50 from Personal Bank -> Personal Bank becomes 150 (Personal Total = 150)
// 3. Family received 300 to Family Bank -> Family Bank becomes 300 (Family Total = 300)
const sampleTxns: Transaction[] = [
  {
    id: 't1',
    type: 'income',
    title: 'Received from Mom',
    amount: 200,
    category: 'Gift',
    dateISO: '2026-11-20',
    paymentMethod: 'Bank Transfer',
    accountId: 'acc_personal_bank',
    accountScope: 'Personal',
    description: '',
    createdAt: '2026-11-20T01:00:00Z',
    updatedAt: '2026-11-20T01:00:00Z',
  },
  {
    id: 't2',
    type: 'expense',
    title: 'Notebook',
    amount: 50,
    category: 'Shopping',
    dateISO: '2026-11-20',
    paymentMethod: 'Bank Transfer',
    accountId: 'acc_personal_bank',
    accountScope: 'Personal',
    description: '',
    createdAt: '2026-11-20T02:00:00Z',
    updatedAt: '2026-11-20T02:00:00Z',
  },
  {
    id: 't3',
    type: 'income',
    title: 'Family Contribution',
    amount: 300,
    category: 'Other Income',
    dateISO: '2026-11-20',
    paymentMethod: 'Bank Transfer',
    accountId: 'acc_family_bank',
    accountScope: 'Family',
    description: '',
    createdAt: '2026-11-20T03:00:00Z',
    updatedAt: '2026-11-20T03:00:00Z',
  },
];

const afterMovements = calculateAccountBalances(initialAccounts, sampleTxns);
const pBank = afterMovements.personalAccounts.find((a) => a.id === 'acc_personal_bank')!;
const fBank = afterMovements.familyAccounts.find((a) => a.id === 'acc_family_bank')!;

assert(pBank.currentBalance === 150, `Expected Personal Bank 150 (0 + 200 - 50), got ${pBank.currentBalance}`);
assert(fBank.currentBalance === 300, `Expected Family Bank 300 (0 + 300), got ${fBank.currentBalance}`);
assert(afterMovements.personalTotal === 150, `Expected Personal Total 150, got ${afterMovements.personalTotal}`);
assert(afterMovements.familyTotal === 300, `Expected Family Total 300, got ${afterMovements.familyTotal}`);
assert(afterMovements.grandTotal === 450, `Expected Grand Total 450, got ${afterMovements.grandTotal}`);

console.log('10. Multi-Account / Multi-Wallet Ownership & Scope Calculation: PASSED');

// 11. Fresh Start & Empty State Reset verification
const freshStartBalances = calculateAccountBalances(initialAccounts, []);
assert(freshStartBalances.personalTotal === 0, `Expected fresh Personal Total 0, got ${freshStartBalances.personalTotal}`);
assert(freshStartBalances.familyTotal === 0, `Expected fresh Family Total 0, got ${freshStartBalances.familyTotal}`);
assert(freshStartBalances.grandTotal === 0, `Expected fresh Grand Total 0, got ${freshStartBalances.grandTotal}`);
console.log('11. Fresh Start Zero-Balance Wallets (Zero Data): PASSED\n');

// 12. Security & Form Validation Boundary Tests
const invalidZeroTxn = transactionSchema.safeParse({
  type: 'expense',
  title: 'Invalid Zero',
  amount: 0,
  category: 'Shopping',
  dateISO: '2026-11-20',
  paymentMethod: 'Cash',
});
assert(!invalidZeroTxn.success, 'Expected zero amount transaction to fail validation');

const invalidTitleTxn = transactionSchema.safeParse({
  type: 'expense',
  title: '   ',
  amount: 500,
  category: 'Shopping',
  dateISO: '2026-11-20',
  paymentMethod: 'Cash',
});
assert(!invalidTitleTxn.success, 'Expected blank title transaction to fail validation');

const invalidItem = itemSchema.safeParse({
  name: '',
  category: 'Electronics',
  purchasePrice: -50,
  purchaseDateISO: '2026-11-20',
  quantity: 0,
  location: '',
  status: 'Owned',
});
assert(!invalidItem.success, 'Expected negative price / zero quantity item to fail validation');

assert(isValidISODate('2024-02-29'), 'Leap day should be a valid date');
assert(!isValidISODate('2026-02-31'), 'Impossible calendar date should be rejected');
assert(!isValidISODate('2026-13-01'), 'Invalid month should be rejected');
assert(isValidTime24('23:59'), '23:59 should be valid');
assert(!isValidTime24('24:00'), '24:00 should be invalid');

const impossibleDateTxn = transactionSchema.safeParse({
  type: 'expense',
  title: 'Invalid date',
  amount: 100,
  category: 'Shopping',
  dateISO: '2026-02-31',
  paymentMethod: 'Cash',
  description: '',
});
assert(!impossibleDateTxn.success, 'Impossible date must fail schema validation');

const invalidTimeReminder = reminderSchema.safeParse({
  title: 'Bad time',
  description: '',
  dateISO: '2026-11-20',
  timeString: '25:90',
  priority: 'Medium',
  category: 'Other',
  recurrence: 'none',
});
assert(!invalidTimeReminder.success, 'Invalid time must fail schema validation');

const emptyNameBackup = vaultBackupSchema.safeParse({
  version: 1,
  exportedAt: '2026-11-20T05:45:00.000Z',
  settings: {
    userName: '',
    userTitle: 'Kathmandu, Nepal',
    currency: 'NPR',
    language: 'en',
    preferredCalendar: 'BS',
    timeFormat: '12h',
    notificationsEnabled: true,
    theme: 'dark',
  },
  transactions: [],
  items: [],
  itemHistory: [],
  activities: [],
  reminders: [],
});
assert(
  emptyNameBackup.success,
  'Backups created before profile setup must remain restorable'
);

const futureBackup = vaultBackupSchema.safeParse({
  ...(emptyNameBackup.success ? emptyNameBackup.data : {}),
  version: 99,
});
assert(!futureBackup.success, 'Unknown future backup versions must be rejected');

assert(
  escapeCSV('=HYPERLINK("https://example.com")') ===
    '"\'=HYPERLINK(""https://example.com"")"',
  'CSV formula injection must be neutralized'
);
assert(escapeCSV('Normal note') === '"Normal note"', 'Normal CSV values must remain intact');

console.log('12. Security & Form Validation Boundaries: PASSED');

// 13. Currency Formatting & Lakh/Crore System Stress Testing
assert(formatCurrency(-5400, 'NPR') === '- NPR 5,400', `Unexpected negative format: ${formatCurrency(-5400, 'NPR')}`);
assert(formatCurrency(10000000, 'NPR') === 'NPR 1,00,00,000', `Expected 1 Crore format, got ${formatCurrency(10000000, 'NPR')}`);
assert(formatCurrency(0, 'NPR') === 'NPR 0', `Expected zero format, got ${formatCurrency(0, 'NPR')}`);
console.log('13. Currency Formatting & Lakh/Crore Stress Tests: PASSED');

// 14. Quick Action NLP Example Prompts Verification
const p1 = parseQuickInput('get by mom 200, add to bank');
assert(p1.intent === 'income' && p1.amount === 200 && p1.paymentMethod === 'Bank Transfer', 'Failed parsing "get by mom 200, add to bank"');

const p2 = parseQuickInput('bought notebook, 5000');
assert(p2.intent === 'expense' && p2.amount === 5000 && p2.isItemAndExpense === true, 'Failed parsing "bought notebook, 5000"');

const p3 = parseQuickInput('drank coffee 150 cash');
assert(p3.intent === 'expense' && p3.amount === 150 && p3.paymentMethod === 'Cash', 'Failed parsing "drank coffee 150 cash"');

const p4 = parseQuickInput('5km run 30 mins');
assert(p4.intent === 'activity' && p4.numericValue === 5 && p4.unit === 'km', 'Failed parsing "5km run 30 mins"');

const p5 = parseQuickInput('remind me tomorrow 5pm to pay wifi');
assert(p5.intent === 'reminder' && p5.timeString === '17:00' && p5.title.toLowerCase().includes('wifi'), 'Failed parsing "remind me tomorrow 5pm to pay wifi"');

const p6 = parseQuickInput('family bank deposit 500');
assert(p6.intent === 'income' && p6.amount === 500 && p6.accountScope === 'Family', 'Failed parsing "family bank deposit 500"');
console.log('14. NLP Quick Action All Example Prompts: PASSED');

// 15. Reminder Recurrence & Notification Scheduling Math
const futureBase = computeNextOccurrenceDate('2027-01-01', '09:00', 'none', new Date('2026-11-20T00:00:00Z'));
assert(futureBase !== null, 'Future reminder should have valid trigger date');

const pastDaily = computeNextOccurrenceDate('2026-11-19', '09:00', 'daily', new Date('2026-11-20T10:00:00Z'));
assert(pastDaily !== null && pastDaily.getTime() > new Date('2026-11-20T10:00:00Z').getTime(), 'Past daily reminder should advance to next future trigger');

const pastWeekly = computeNextOccurrenceDate('2026-11-01', '09:00', 'weekly', new Date('2026-11-20T10:00:00Z'));
assert(pastWeekly !== null && pastWeekly.getTime() > new Date('2026-11-20T10:00:00Z').getTime(), 'Past weekly reminder should advance to next week');

// Weekday recurrence names verification (e.g. 'sunday', 'monday,wednesday,friday')
assert(
  JSON.stringify(parseRecurrenceWeekdays('monday,wednesday,friday')) ===
    JSON.stringify(['monday', 'wednesday', 'friday']),
  'Failed parsing comma-separated weekday recurrence'
);
assert(
  formatRecurrenceLabel('sunday') === 'Sunday',
  `Expected 'Sunday', got '${formatRecurrenceLabel('sunday')}'`
);
assert(
  formatRecurrenceLabel('monday,wednesday,friday') === 'Mon, Wed, Fri',
  `Expected 'Mon, Wed, Fri', got '${formatRecurrenceLabel('monday,wednesday,friday')}'`
);
const weekdayReminderParse = reminderSchema.safeParse({
  title: 'Team Sync',
  description: 'Weekly check-in',
  dateISO: '2026-11-20',
  timeString: '10:00',
  priority: 'Medium',
  category: 'Work & Deadlines',
  recurrence: 'sunday,monday',
  alertMode: 'vibrate',
});
assert(
  weekdayReminderParse.success &&
    weekdayReminderParse.data.alertMode === 'vibrate',
  'Weekday recurrence and vibrate alertMode must pass reminderSchema validation'
);
const alarmReminderParse = reminderSchema.safeParse({
  title: 'Morning Wakeup',
  description: 'Alarm ring',
  dateISO: '2026-11-20',
  timeString: '06:00',
  priority: 'High',
  category: 'Personal & Family',
  recurrence: 'monday,tuesday,wednesday,thursday,friday',
  alertMode: 'alarm',
});
assert(
  alarmReminderParse.success && alarmReminderParse.data.alertMode === 'alarm',
  'Alarm alertMode must pass reminderSchema validation'
);

const nextSundayTrigger = computeNextOccurrenceDate(
  '2026-11-20', // Friday
  '09:00',
  'sunday',
  new Date('2026-11-20T10:00:00Z')
);
assert(
  nextSundayTrigger !== null &&
    nextSundayTrigger.getTime() > new Date('2026-11-20T10:00:00Z').getTime(),
  'Weekday recurrence should schedule for the next matching weekday'
);

// Same-minute ("Now" preset) trigger test: 09:00 NPT = 03:15:00 UTC, checked at 03:15:25 UTC
const sameMinuteNowTrigger = computeNextOccurrenceDate(
  '2026-11-20',
  '09:00',
  'none',
  new Date('2026-11-20T03:15:25Z')
);
assert(
  sameMinuteNowTrigger !== null &&
    sameMinuteNowTrigger.getTime() > new Date('2026-11-20T03:15:25Z').getTime(),
  'Same-minute ("Now" preset) reminder must schedule 2s ahead instead of returning null'
);
console.log('15. Notification Recurrence & Scheduling Engine (including Weekday Names): PASSED');

// 16. Full Backup Payload & Restoration Roundtrip Schema Check
const fullPayload = {
  version: 1,
  exportedAt: new Date().toISOString(),
  settings: {
    userName: 'Ishan Shrestha',
    userTitle: 'Kathmandu, Nepal',
    currency: 'NPR',
    language: 'en',
    preferredCalendar: 'BS',
    timeFormat: '12h',
    notificationsEnabled: true,
    theme: 'dark',
    privateMode: false,
  },
  accounts: [
    {
      id: 'acc-1',
      name: 'Personal Bank',
      scope: 'Personal',
      initialBalance: 0,
      paymentMethod: 'Bank Transfer',
      color: '#1E40AF',
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    },
  ],
  transactions: [
    {
      id: 'txn-1',
      type: 'income',
      title: 'Salary Deposit',
      amount: 100000,
      category: 'Salary',
      dateISO: '2026-11-20',
      paymentMethod: 'Bank Transfer',
      accountId: 'acc-1',
      accountScope: 'Personal',
      description: 'Monthly pay',
      createdAt: '2026-11-20T00:00:00.000Z',
      updatedAt: '2026-11-20T00:00:00.000Z',
    },
  ],
  items: [],
  itemHistory: [],
  activities: [],
  reminders: [],
};
const parsedBackup = vaultBackupSchema.safeParse(fullPayload);
assert(parsedBackup.success, 'Full backup payload must pass schema validation');

const validGoal = savingsGoalSchema.safeParse({
  title: 'Emergency Fund',
  targetAmount: 50000,
  savedAmount: 28000,
  targetDateISO: '2026-12-31',
  icon: 'shield',
  color: '#10B981',
});
assert(validGoal.success, 'Valid savings goal must pass schema validation');

const invalidGoal = savingsGoalSchema.safeParse({
  title: 'Bad Goal',
  targetAmount: 0,
  savedAmount: -10,
  icon: 'shield',
  color: '#10B981',
});
assert(!invalidGoal.success, 'Zero target or negative saved amount must fail savingsGoalSchema');
console.log('16. Backup Payload & Savings Goal Schema Integrity: PASSED\n');

console.log('✅ ALL VAULT CORE & ARCHITECTURAL CHECKS PASSED!');
