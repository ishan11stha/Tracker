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
assert(masked.integerPart === '••••••', 'Private mode masking failed');
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

console.log('9. Intelligent NLP Intent & Entity Parser Engine: PASSED');

// 10. Multi-Account / Multi-Wallet Ownership & Scope Calculation Engine
const initialAccounts: Account[] = [
  {
    id: 'acc_personal_bank',
    name: 'Bank',
    scope: 'Personal',
    initialBalance: 5000,
    paymentMethod: 'Bank Transfer',
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  },
  {
    id: 'acc_personal_cash',
    name: 'Cash',
    scope: 'Personal',
    initialBalance: 50,
    paymentMethod: 'Cash',
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  },
  {
    id: 'acc_family_bank',
    name: 'Bank',
    scope: 'Family',
    initialBalance: 500,
    paymentMethod: 'Bank Transfer',
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  },
  {
    id: 'acc_family_cash',
    name: 'Cash',
    scope: 'Family',
    initialBalance: 100,
    paymentMethod: 'Cash',
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  },
];

// Baseline test: without any transactions
const baseline = calculateAccountBalances(initialAccounts, []);
assert(baseline.personalTotal === 5050, `Expected Personal Total 5050, got ${baseline.personalTotal}`);
assert(baseline.familyTotal === 600, `Expected Family Total 600, got ${baseline.familyTotal}`);
assert(baseline.grandTotal === 5650, `Expected Grand Total 5650, got ${baseline.grandTotal}`);

// Transaction test:
// 1. Mom gave 200, added to Personal Bank -> Personal Bank becomes 5200 (Personal Total = 5250)
// 2. Bought notebook 5000 from Personal Bank -> Personal Bank becomes 200 (Personal Total = 250)
// 3. Family received 300 to Family Bank -> Family Bank becomes 800 (Family Total = 900)
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
    amount: 5000,
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

assert(pBank.currentBalance === 200, `Expected Personal Bank 200 (5000 + 200 - 5000), got ${pBank.currentBalance}`);
assert(fBank.currentBalance === 800, `Expected Family Bank 800 (500 + 300), got ${fBank.currentBalance}`);
assert(afterMovements.personalTotal === 250, `Expected Personal Total 250 (200 bank + 50 cash), got ${afterMovements.personalTotal}`);
assert(afterMovements.familyTotal === 900, `Expected Family Total 900 (800 bank + 100 cash), got ${afterMovements.familyTotal}`);
assert(afterMovements.grandTotal === 1150, `Expected Grand Total 1150, got ${afterMovements.grandTotal}`);

console.log('10. Multi-Account / Multi-Wallet Ownership & Scope Calculation: PASSED');

// 11. Fresh Start & Empty State Reset verification
const freshStartBalances = calculateAccountBalances(initialAccounts, []);
assert(freshStartBalances.personalTotal === 5050, `Expected fresh Personal Total 5050, got ${freshStartBalances.personalTotal}`);
assert(freshStartBalances.familyTotal === 600, `Expected fresh Family Total 600, got ${freshStartBalances.familyTotal}`);
assert(freshStartBalances.grandTotal === 5650, `Expected fresh Grand Total 5650, got ${freshStartBalances.grandTotal}`);
console.log('11. Fresh Start Initial Wallets State (Zero Transactions): PASSED\n');

console.log('✅ ALL VAULT CORE & ARCHITECTURAL CHECKS PASSED!');
