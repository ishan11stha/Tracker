/**
 * Nepali Rupee (NPR) & multi-currency formatter
 * Formats numbers using Nepali/South Asian digit grouping (e.g., 1,25,000.00)
 * Supports Monekin's Private Mode masking and split currency parts.
 */

export function getCurrencySymbol(
  currency: 'NPR' | 'USD' | 'INR' = 'NPR'
): string {
  return currency === 'NPR' ? 'NPR ' : currency === 'INR' ? '₹' : '$';
}

export function formatCurrencyParts(
  amount: number,
  currency: 'NPR' | 'USD' | 'INR' = 'NPR',
  compact = false,
  privateMode = false
): {
  sign: string;
  symbol: string;
  integerPart: string;
  decimalPart: string;
} {
  const symbol = currency === 'NPR' ? 'NPR' : currency === 'INR' ? '₹' : '$';
  if (privateMode) {
    return {
      sign: '',
      symbol,
      integerPart: '••••••',
      decimalPart: '',
    };
  }

  const isNegative = amount < 0;
  const absVal = Math.abs(Number(amount) || 0);
  const sign = isNegative ? '−' : '';

  if (compact && absVal >= 10000000) {
    return {
      sign,
      symbol,
      integerPart: `${(absVal / 10000000).toFixed(2)} Cr`,
      decimalPart: '',
    };
  }
  if (compact && absVal >= 100000) {
    return {
      sign,
      symbol,
      integerPart: `${(absVal / 100000).toFixed(2)} L`,
      decimalPart: '',
    };
  }

  const hasDecimals = absVal % 1 !== 0;
  const fixed = hasDecimals ? absVal.toFixed(2) : Math.round(absVal).toString();
  const [intPart, decPart] = fixed.split('.');

  let formattedInt = intPart;
  if (currency === 'NPR' || currency === 'INR') {
    if (intPart.length > 3) {
      const lastThree = intPart.slice(-3);
      const otherNumbers = intPart.slice(0, -3);
      formattedInt =
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }
  } else {
    formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return {
    sign,
    symbol,
    integerPart: formattedInt,
    decimalPart: decPart ? `.${decPart}` : '',
  };
}

export function formatCurrency(
  amount: number,
  currency: 'NPR' | 'USD' | 'INR' = 'NPR',
  compact = false,
  privateMode = false
): string {
  const sym = getCurrencySymbol(currency);
  if (privateMode) {
    return `${sym}••••••`;
  }

  const isNegative = amount < 0;
  const absVal = Math.abs(Number(amount) || 0);

  if (compact && absVal >= 10000000) {
    return `${isNegative ? '-' : ''}${sym}${(absVal / 10000000).toFixed(2)} Cr`;
  }
  if (compact && absVal >= 100000) {
    return `${isNegative ? '-' : ''}${sym}${(absVal / 100000).toFixed(2)} L`;
  }

  const hasDecimals = absVal % 1 !== 0;
  const fixed = hasDecimals ? absVal.toFixed(2) : Math.round(absVal).toString();
  const [intPart, decPart] = fixed.split('.');

  let formattedInt = intPart;
  if (currency === 'NPR' || currency === 'INR') {
    if (intPart.length > 3) {
      const lastThree = intPart.slice(-3);
      const otherNumbers = intPart.slice(0, -3);
      formattedInt =
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }
  } else {
    formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const finalNumber = decPart ? `${formattedInt}.${decPart}` : formattedInt;
  return `${isNegative ? '- ' : ''}${sym}${finalNumber}`;
}

export function getFinanceHealthMeta(score: number): {
  color: string;
  label: string;
  description: string;
} {
  if (score >= 80) {
    return {
      color: '#37A13B',
      label: 'EXCELLENT',
      description:
        'Strong savings rate, healthy positive cash flow, and consistent habit & bill completion.',
    };
  }
  if (score >= 60) {
    return {
      color: '#2563EB',
      label: 'GOOD',
      description:
        'Your cash flow and daily records are well balanced. Keep building your net savings buffer.',
    };
  }
  if (score >= 40) {
    return {
      color: '#D97706',
      label: 'FAIR',
      description:
        'Expenses are consuming a large share of income or some reminders need attention.',
    };
  }
  return {
    color: '#EF4444',
    label: 'NEEDS ATTENTION',
    description:
      'Expenses currently exceed income or overdue reminders require immediate review.',
  };
}
