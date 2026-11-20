/**
 * Shared numeric input sanitizers for Android text fields.
 * Prevents multiple decimal points, leading garbage, or NaN values.
 */

export function sanitizeDecimalInput(raw: string): {
  text: string;
  value: number;
} {
  const stripped = raw.replace(/[^0-9.]/g, '');
  const parts = stripped.split('.');
  const normalized =
    parts.length > 1
      ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
      : parts[0];

  const parsed = parseFloat(normalized);
  return {
    text: normalized,
    value: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
  };
}

export function sanitizeIntegerInput(
  raw: string,
  fallback = 1
): {
  text: string;
  value: number;
} {
  const stripped = raw.replace(/[^0-9]/g, '');
  const parsed = parseInt(stripped, 10);
  return {
    text: stripped,
    value: Number.isFinite(parsed) && parsed > 0 ? parsed : fallback,
  };
}
