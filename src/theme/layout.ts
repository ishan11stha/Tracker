/**
 * Shared layout constraints for phone, foldable, and tablet widths.
 * The application stays single-column on phones but caps content width on
 * larger displays so cards and forms do not stretch into unreadable rows.
 */
export const LAYOUT = {
  maxContentWidth: 760,
  maxModalWidth: 640,
  horizontalPadding: 16,
} as const;
