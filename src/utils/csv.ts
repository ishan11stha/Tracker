/**
 * Escapes a value for CSV and neutralizes spreadsheet formula injection.
 *
 * Quoting alone is not enough: spreadsheet applications evaluate cells that
 * begin with =, +, -, or @ even when quoted. Prefixing those cells with an
 * apostrophe keeps user-entered titles and notes as plain text.
 */
export function escapeCSV(value: unknown): string {
  const raw = String(value ?? '');
  const neutralized = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}
