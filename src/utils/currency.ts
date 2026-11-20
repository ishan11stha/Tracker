/**
 * Nepali Rupee (NPR) & multi-currency formatter
 * Formats numbers using Nepali/South Asian digit grouping (e.g., 1,25,000.00)
 */

export function formatCurrency(
  amount: number,
  currency: 'NPR' | 'USD' | 'INR' = 'NPR',
  compact = false
): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(Number(amount) || 0);

  const symbol = currency === 'NPR' ? 'NPR ' : currency === 'INR' ? '₹' : '$';

  if (compact && absVal >= 10000000) {
    return `${isNegative ? '-' : ''}${symbol}${(absVal / 10000000).toFixed(2)} Cr`;
  }
  if (compact && absVal >= 100000) {
    return `${isNegative ? '-' : ''}${symbol}${(absVal / 100000).toFixed(2)} L`;
  }

  const hasDecimals = absVal % 1 !== 0;
  const fixed = hasDecimals ? absVal.toFixed(2) : Math.round(absVal).toString();
  const [intPart, decPart] = fixed.split('.');

  let formattedInt = intPart;
  if (currency === 'NPR' || currency === 'INR') {
    // South Asian Lakh/Crore grouping: last 3 digits, then pairs of 2 digits
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
  return `${isNegative ? '- ' : ''}${symbol}${finalNumber}`;
}
