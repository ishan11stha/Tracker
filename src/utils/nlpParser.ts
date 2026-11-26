import type {
  AccountScope,
  ParsedQuickInput,
  PaymentMethod,
} from '../types';

/**
 * Calculates current timestamp in Nepal Standard Time (UTC+05:45).
 * Kept self-contained so standalone Node verification scripts can import
 * nlpParser.ts directly under Node ESM type-stripping.
 */
export function getNPTNow(): { isoDate: string; time24: string } {
  const nptMillis = Date.now() + 345 * 60 * 1000;
  const d = new Date(nptMillis);
  const isoDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const time24 = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return { isoDate, time24 };
}

/**
 * Standardize text: convert Nepali digits (०-९) to English (0-9), lowercase, trim.
 */
export function normalizeQuickText(text: string): string {
  if (!text) return '';
  const nepaliDigits: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
  };
  let result = text.replace(/[०-९]/g, (ch) => nepaliDigits[ch] || ch);
  return result.trim();
}

/**
 * Extracts numeric amount from text. Supports:
 * - 5000
 * - 5,000
 * - 5k -> 5000
 * - 2.5k -> 2500
 * - rs 200, 200 rs, rupees 200, रू 200
 */
export function extractAmount(text: string): number | null {
  const norm = normalizeQuickText(text);

  // Pattern with 'k' or 'kilo'
  const kMatch = norm.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]) * 1000;
    if (!isNaN(val) && val > 0) return Math.round(val);
  }

  // Currency prefix patterns e.g. "rs. 5000", "rupees 500", "रू 200", "npr 1200"
  const prefixMatch = norm.match(
    /(?:rs\.?|रू|npr|rupees?|inr|\$)\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i
  );
  if (prefixMatch) {
    const cleanNum = prefixMatch[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    if (!isNaN(val) && val > 0) return val;
  }

  // Currency suffix patterns e.g. "5000 rs", "500 rupees", "200/-"
  const suffixMatch = norm.match(
    /([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\s*(?:rs\.?|रू|npr|rupees?|inr|\$|\/-)/i
  );
  if (suffixMatch) {
    const cleanNum = suffixMatch[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    if (!isNaN(val) && val > 0) return val;
  }

  // Any standalone number in the string (prefer numbers that aren't part of
  // times like "5pm" or "17:00"). Quantity words such as "2 notebooks" are a
  // common source of false positives, so use the largest remaining candidate.
  // In natural purchase phrasing the monetary amount is normally the largest
  // number ("bought 2 notebooks for 5000").
  const standaloneRegex = /\b([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)\b(?!\s*(?:am|pm|mins?|minutes?|hrs?|hours?|km|steps?|pages?|glasses?|st|nd|rd|th))/gi;
  const matches = [...norm.matchAll(standaloneRegex)];
  let largest: number | null = null;
  for (const m of matches) {
    const cleanNum = m[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    if (!isNaN(val) && val > 0 && (largest === null || val > largest)) {
      largest = val;
    }
  }

  return largest;
}

/**
 * Detect Payment Method and Account Scope from text
 */
export function detectPaymentAndScope(text: string): {
  paymentMethod: PaymentMethod;
  accountScope: AccountScope;
} {
  const lower = text.toLowerCase();

  // Detect Scope
  let accountScope: AccountScope = 'Personal';
  if (
    lower.includes('family') ||
    lower.includes('ghar') ||
    lower.includes('parivar')
  ) {
    accountScope = 'Family';
  }

  // Detect Payment Method
  let paymentMethod: PaymentMethod = 'Bank Transfer'; // default fallback for 'add to bank'
  if (
    lower.includes('cash') ||
    lower.includes('rokad') ||
    lower.includes('pocket') ||
    lower.includes('wallet')
  ) {
    paymentMethod = 'Cash';
  } else if (lower.includes('esewa') || lower.includes('e-sewa')) {
    paymentMethod = 'eSewa';
  } else if (lower.includes('khalti')) {
    paymentMethod = 'Khalti';
  } else if (lower.includes('connectips') || /\bips\b/.test(lower)) {
    paymentMethod = 'ConnectIPS';
  } else if (lower.includes('card') || lower.includes('atm')) {
    paymentMethod = 'Card';
  } else if (
    lower.includes('bank') ||
    lower.includes('transfer') ||
    lower.includes('nabil') ||
    lower.includes('nic') ||
    lower.includes('account')
  ) {
    paymentMethod = 'Bank Transfer';
  } else {
    // Default to Cash if words like 'cash' or general small purchase, or Bank Transfer
    paymentMethod = 'Cash';
  }

  return { paymentMethod, accountScope };
}

/**
 * Smart Category Mapper for common expense/item words
 */
export function detectCategory(
  title: string
): { expenseCategory: string; itemCategory: string; isItemLike: boolean } {
  const t = title.toLowerCase();

  // Item keywords (Notebook, Laptop, Shoes, Watch, Book, Bag, Headphone)
  if (
    t.includes('notebook') ||
    t.includes('copy') ||
    t.includes('pen') ||
    t.includes('diary') ||
    t.includes('pencil') ||
    t.includes('stationery')
  ) {
    return {
      expenseCategory: 'Shopping',
      itemCategory: 'Books',
      isItemLike: true,
    };
  }

  if (
    t.includes('laptop') ||
    t.includes('phone') ||
    t.includes('mobile') ||
    t.includes('tablet') ||
    t.includes('headphone') ||
    t.includes('airpods') ||
    t.includes('charger') ||
    t.includes('camera') ||
    t.includes('keyboard') ||
    t.includes('monitor')
  ) {
    return {
      expenseCategory: 'Shopping',
      itemCategory: 'Electronics',
      isItemLike: true,
    };
  }

  if (
    t.includes('book') ||
    t.includes('novel') ||
    t.includes('textbook') ||
    t.includes('course')
  ) {
    return {
      expenseCategory: 'Education',
      itemCategory: 'Books',
      isItemLike: true,
    };
  }

  if (
    t.includes('shoes') ||
    t.includes('shirt') ||
    t.includes('pant') ||
    t.includes('jacket') ||
    t.includes('dress') ||
    t.includes('clothes')
  ) {
    return {
      expenseCategory: 'Shopping',
      itemCategory: 'Clothing',
      isItemLike: true,
    };
  }

  if (
    t.includes('coffee') ||
    t.includes('tea') ||
    t.includes('lunch') ||
    t.includes('dinner') ||
    t.includes('breakfast') ||
    t.includes('momo') ||
    t.includes('khaja') ||
    t.includes('restaurant') ||
    t.includes('burger') ||
    t.includes('pizza') ||
    t.includes('cafe')
  ) {
    return {
      expenseCategory: 'Food & Dining',
      itemCategory: 'Other',
      isItemLike: false,
    };
  }

  if (
    t.includes('grocery') ||
    t.includes('groceries') ||
    t.includes('vegetables') ||
    t.includes('milk') ||
    t.includes('bhatbhateni') ||
    t.includes('fruits') ||
    t.includes('oil') ||
    t.includes('rice')
  ) {
    return {
      expenseCategory: 'Groceries',
      itemCategory: 'Other',
      isItemLike: false,
    };
  }

  if (
    t.includes('wifi') ||
    t.includes('internet') ||
    t.includes('electricity') ||
    t.includes('water bill') ||
    t.includes('rent') ||
    t.includes('recharge')
  ) {
    return {
      expenseCategory: 'Rent & Utilities',
      itemCategory: 'Other',
      isItemLike: false,
    };
  }

  if (
    t.includes('bus') ||
    t.includes('pathao') ||
    t.includes('indrive') ||
    t.includes('taxi') ||
    t.includes('petrol') ||
    t.includes('fuel') ||
    t.includes('bike')
  ) {
    return {
      expenseCategory: 'Transport',
      itemCategory: 'Vehicle & Accessories',
      isItemLike: false,
    };
  }

  if (
    t.includes('medicine') ||
    t.includes('doctor') ||
    t.includes('hospital') ||
    t.includes('clinic') ||
    t.includes('pharmacy')
  ) {
    return {
      expenseCategory: 'Health & Medical',
      itemCategory: 'Other',
      isItemLike: false,
    };
  }

  return {
    expenseCategory: 'Shopping',
    itemCategory: 'Other',
    isItemLike: false,
  };
}

/**
 * Intelligent Natural Language Parser for VAULT.
 * Parses user input e.g.:
 * - "get by mom 200, add to bank"
 * - "bought notebook, 5000"
 * - "drank coffee 150 cash"
 * - "5km run 30 mins"
 * - "remind me tomorrow 5pm to pay wifi"
 */
export function parseQuickInput(rawText: string): ParsedQuickInput {
  const norm = normalizeQuickText(rawText);
  const lower = norm.toLowerCase();
  const nptNow = getNPTNow();

  // 1. Check for Reminder Intent
  if (
    lower.startsWith('remind') ||
    lower.includes('reminder') ||
    lower.includes('alert me') ||
    lower.includes("don't forget")
  ) {
    let clean = norm
      .replace(/^remind(?:\s+me)?\s*/i, '')
      .replace(/^reminder(?:\s+to)?\s*/i, '')
      .trim();

    // Check date: tomorrow vs today
    let dateISO = nptNow.isoDate;
    if (lower.includes('tomorrow') || lower.includes('bholi')) {
      const parts = dateISO.split('-').map(Number);
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
      dateISO = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      clean = clean.replace(/tomorrow/gi, '').replace(/bholi/gi, '').trim();
    }

    // Check time: 5pm, 17:00, 9am, 10:30 am
    let timeString = '09:00';
    const meridiemMatch = clean.match(
      /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i
    );
    const colonMatch = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    const atMatch = clean.match(
      /\bat\s+([01]?\d|2[0-3])(?::([0-5]\d))?\b/i
    );
    const timeMatch = meridiemMatch || colonMatch || atMatch;
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = meridiemMatch
        ? meridiemMatch[3]?.toLowerCase()
        : undefined;
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      clean = clean.replace(timeMatch[0], '').trim();
    }

    // Remove leading words like "to ", "about "
    clean = clean
      .replace(/^(?:to|about|for|at)\s+/i, '')
      .replace(/[,\.]/g, '')
      .trim();
    const title = clean.length > 0 ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Scheduled Reminder';

    return {
      rawText,
      intent: 'reminder',
      title,
      dateISO,
      timeString,
      category: 'Bills & Finance',
      confidence: 0.95,
      humanSummary: `Reminder set: "${title}" on ${dateISO} at ${timeString}`,
    };
  }

  // 2. Check for Activity / Habit Intent
  // e.g. "5km run 30 mins", "run 5km 30 mins", "studied 45 mins", "read 20 pages"
  const isActivity =
    /\b(run|jog|walk|steps?|gym|workout|studied|study|read|reading|meditat(?:e|ed)|water)\b/i.test(
      lower
    ) &&
    !lower.includes('bought') &&
    !lower.includes('buy') &&
    !lower.includes('get') &&
    !lower.includes('paid');

  if (isActivity) {
    let numericValue = 1;
    let unit = 'mins';

    const numMatch = lower.match(/(\d+(?:\.\d+)?)\s*(km|steps?|pages?|mins?|hrs?|hours?|glasses?)/i);
    if (numMatch) {
      numericValue = parseFloat(numMatch[1]);
      unit = numMatch[2].toLowerCase();
      if (unit.startsWith('min')) unit = 'mins';
      if (unit.startsWith('hr') || unit.startsWith('hour')) unit = 'hrs';
      if (unit.startsWith('step')) unit = 'steps';
      if (unit.startsWith('page')) unit = 'pages';
    }

    // Capitalize activity name
    let title = norm.charAt(0).toUpperCase() + norm.slice(1);
    let category = 'Health';
    if (lower.includes('read') || lower.includes('study') || lower.includes('studied')) {
      category = 'Study';
    } else if (lower.includes('meditat')) {
      category = 'Personal';
    }

    return {
      rawText,
      intent: 'activity',
      title,
      numericValue,
      unit,
      category,
      timeString: nptNow.time24,
      confidence: 0.9,
      humanSummary: `Activity logged: "${title}" (${numericValue} ${unit})`,
    };
  }

  // 3. Financial Intents (Income vs Expense / Item)
  const amount = extractAmount(norm);

  // Check for Income
  // Triggers: "get by mom", "got from", "received", "from mom", "salary", "credited", "earned", "gift"
  const isIncome =
    /\b(get\s+by|got\s+from|from\s+mom|from\s+dad|received|income|salary|credited|earned|gift|bonus|deposit)\b/i.test(
      lower
    ) ||
    (lower.includes('add to bank') && !lower.includes('bought') && !lower.includes('paid') && !lower.includes('spent')) ||
    (lower.includes('add to cash') && !lower.includes('bought') && !lower.includes('paid'));

  const { paymentMethod, accountScope } = detectPaymentAndScope(norm);

  if (isIncome) {
    // Never invent an amount. The command processor asks the user instead.
    const finalAmount = amount || 0;
    let title = 'Income Received';

    if (lower.includes('mom') || lower.includes('aama')) {
      title = 'Received from Mom';
    } else if (lower.includes('dad') || lower.includes('buba')) {
      title = 'Received from Dad';
    } else if (lower.includes('salary')) {
      title = 'Salary Credit';
    } else if (lower.includes('freelance') || lower.includes('client')) {
      title = 'Freelance Payment';
    } else {
      // Clean up common filler words
      const cleaned = norm
        .replace(/^(?:get by|got from|received|add to bank|add to cash)\s*/i, '')
        .replace(/\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:rs|rupees|npr|k)?\b/gi, '')
        .replace(/[,\.]/g, '')
        .trim();
      if (cleaned.length > 2) {
        title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }

    const category =
      lower.includes('salary') ? 'Salary' :
        lower.includes('freelance') ? 'Freelance' :
          lower.includes('mom') || lower.includes('dad') || lower.includes('gift') ? 'Gift' : 'Other Income';

    return {
      rawText,
      intent: 'income',
      title,
      amount: finalAmount,
      category,
      paymentMethod: lower.includes('bank') ? 'Bank Transfer' : paymentMethod,
      accountScope,
      confidence: 0.95,
      humanSummary: `Income of Rs. ${finalAmount.toLocaleString('en-IN')} ("${title}") added to ${accountScope} ${lower.includes('bank') ? 'Bank' : paymentMethod}`,
    };
  }

  // 4. Item Purchase & Expense ("bought notebook, 5000" or "bought laptop 80000")
  const isPurchase =
    /\b(bought|buy|purchased|ordered|acquired|got\s+new)\b/i.test(lower);

  // Extract candidate item name
  let candidateTitle = norm;
  if (isPurchase) {
    candidateTitle = norm.replace(/\b(bought|buy|purchased|ordered|got\s+new)\b/i, '').trim();
  }

  // Strip amount and payment method from candidate title
  candidateTitle = candidateTitle
    .replace(/\b(?:rs\.?|रू|npr|rupees?|inr|\$)?\s*\d+(?:,\d+)*(?:\.\d+)?\s*(?:rs\.?|रू|npr|rupees?|k)?\b/gi, '')
    .replace(/\b(in|with|via|by|to|from)\s+(bank|cash|esewa|khalti|card)\b/gi, '')
    .replace(/\b(bank|cash|esewa|khalti|card)\b/gi, '')
    .replace(/[,\.\:\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(?:for|at|on|from)\s*$/i, '')
    .trim();

  if (!candidateTitle) {
    candidateTitle = isPurchase ? 'Purchased Item' : 'Expense';
  } else {
    candidateTitle = candidateTitle.charAt(0).toUpperCase() + candidateTitle.slice(1);
  }

  const { expenseCategory, itemCategory, isItemLike } = detectCategory(candidateTitle);
  const finalAmount = amount || 0;

  // If user says "bought notebook, 5000", we should record the expense AND place the item in items inventory!
  const isItemAndExpense = isPurchase || isItemLike;

  return {
    rawText,
    intent: 'expense',
    title: candidateTitle,
    amount: finalAmount,
    category: expenseCategory,
    paymentMethod,
    accountScope,
    isItemAndExpense,
    itemName: candidateTitle,
    itemCategory,
    itemPrice: finalAmount,
    itemLocation: 'Personal / Study',
    confidence: 0.92,
    humanSummary: isItemAndExpense
      ? `Expense of Rs. ${finalAmount.toLocaleString('en-IN')} recorded & "${candidateTitle}" saved to Items inventory`
      : `Expense of Rs. ${finalAmount.toLocaleString('en-IN')} ("${candidateTitle}") recorded in ${expenseCategory}`,
  };
}
