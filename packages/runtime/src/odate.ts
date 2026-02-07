/**
 *
 * Runtime module for converting server-rendered dates to the user's local timezone.
 *
 * Wikidot encodes timestamps and format strings in CSS class names on
 * `<span class="odate">` elements:
 * - `time_{unix_timestamp}` -- the Unix timestamp in seconds
 * - `format%{url_encoded_format}` -- the strftime-compatible format string
 *
 * This module scans for these elements and replaces their text content
 * with the formatted date in the user's local timezone.
 *
 * Supported strftime specifiers: `%Y`, `%y`, `%m`, `%d`, `%e`, `%H`, `%M`,
 * `%S`, `%a`, `%A`, `%b`, `%B`, `%j`, `%O`, `%%`.
 *
 * This is a one-shot initialization (no event listeners to clean up).
 *
 * @module
 */

/** Abbreviated English day names, indexed by `Date.getDay()`. */
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Full English day names, indexed by `Date.getDay()`. */
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Abbreviated English month names, indexed by `Date.getMonth()`. */
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** Full English month names, indexed by `Date.getMonth()`. */
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Initialize odate processing for all `<span class="odate">` elements within root.
 *
 * Scans for every `span.odate` and replaces its text content with the
 * formatted date string in the user's local timezone. This is a one-shot
 * operation with no event listeners and therefore no cleanup is needed.
 *
 * @param root - The root DOM element containing rendered Wikidot markup.
 */
export function initOdate(root: HTMLElement): void {
  const elements = root.querySelectorAll<HTMLElement>("span.odate");
  for (const el of elements) {
    processOdate(el);
  }
}

/**
 * Extract timestamp and format from a single odate element's CSS classes
 * and replace its text content with the locally-formatted date.
 *
 * The timestamp class has the form `time_{unix_seconds}` and the format
 * class has the form `format%{url_encoded_strftime}`. If no format class
 * is present, the default `%e %b %Y, %H:%M` is used (matching Wikidot).
 *
 * @param el - A `<span class="odate">` element to process.
 */
function processOdate(el: HTMLElement): void {
  const classes = el.className.split(/\s+/);

  let timestamp: number | null = null;
  let format = "%e %b %Y, %H:%M";

  for (const cls of classes) {
    if (cls.startsWith("time_")) {
      const val = Number(cls.slice(5));
      if (!Number.isNaN(val)) timestamp = val;
    } else if (cls.startsWith("format%")) {
      format = decodeFormat(cls.slice(6));
    }
  }

  if (timestamp === null) return;

  const date = new Date(timestamp * 1000);
  el.textContent = formatDate(date, format);
}

/**
 * Decode a URL-encoded strftime format string from a CSS class value.
 *
 * Wikidot encodes percent signs as pipes (`|`) in class names to avoid
 * conflicts with CSS selectors, so `|25e|20|25b` becomes `%25e%20%25b`
 * after pipe-to-percent replacement, which `decodeURIComponent` then
 * decodes to `%e %b`.
 *
 * @param encoded - The raw class suffix after `format%` (pipe-encoded).
 * @returns The decoded strftime format string, or the raw input on decode failure.
 */
function decodeFormat(encoded: string): string {
  // Format is URL-encoded in class name (e.g. %25e%20%25b → %e %b)
  try {
    return decodeURIComponent(encoded.replace(/\|/g, "%"));
  } catch {
    return encoded;
  }
}

/**
 * Format a `Date` using a strftime-compatible format string.
 *
 * Walks the format string character by character; when a `%` is
 * encountered, the next character is interpreted as a specifier and
 * dispatched to {@link formatSpec}. All other characters are copied
 * verbatim.
 *
 * @param date - The date to format.
 * @param format - A strftime-compatible format string (e.g. `"%e %b %Y, %H:%M"`).
 * @returns The formatted date string.
 */
function formatDate(date: Date, format: string): string {
  let result = "";
  let i = 0;
  while (i < format.length) {
    if (format[i] === "%" && i + 1 < format.length) {
      i++;
      const spec = format[i];
      result += formatSpec(date, spec ?? "");
      i++;
    } else {
      result += format[i];
      i++;
    }
  }
  return result;
}

/**
 * Expand a single strftime specifier character into a string.
 *
 * Supported specifiers:
 * - `%Y` -- four-digit year
 * - `%y` -- two-digit year
 * - `%m` -- zero-padded month (01-12)
 * - `%d` -- zero-padded day of month (01-31)
 * - `%e` -- day of month without padding (1-31)
 * - `%H` -- zero-padded hour in 24h format (00-23)
 * - `%M` -- zero-padded minute (00-59)
 * - `%S` -- zero-padded second (00-59)
 * - `%a` -- abbreviated day name (Sun-Sat)
 * - `%A` -- full day name (Sunday-Saturday)
 * - `%b` -- abbreviated month name (Jan-Dec)
 * - `%B` -- full month name (January-December)
 * - `%j` -- day of year (1-366)
 * - `%O` -- day of month with English ordinal suffix (1st, 2nd, ...)
 * - `%%` -- literal percent sign
 *
 * Unknown specifiers are returned as-is (e.g. `%z` becomes `"%z"`).
 *
 * @param date - The date to extract values from.
 * @param spec - A single specifier character (the character after `%`).
 * @returns The formatted value for the specifier.
 */
function formatSpec(date: Date, spec: string): string {
  switch (spec) {
    case "Y":
      return String(date.getFullYear());
    case "y":
      return String(date.getFullYear()).slice(-2);
    case "m":
      return pad2(date.getMonth() + 1);
    case "d":
      return pad2(date.getDate());
    case "e":
      return String(date.getDate());
    case "H":
      return pad2(date.getHours());
    case "M":
      return pad2(date.getMinutes());
    case "S":
      return pad2(date.getSeconds());
    case "a":
      return DAYS_SHORT[date.getDay()] ?? "";
    case "A":
      return DAYS_LONG[date.getDay()] ?? "";
    case "b":
      return MONTHS_SHORT[date.getMonth()] ?? "";
    case "B":
      return MONTHS_LONG[date.getMonth()] ?? "";
    case "j":
      return String(getDayOfYear(date));
    case "O":
      return getOrdinalSuffix(date.getDate());
    case "%":
      return "%";
    default:
      return `%${spec}`;
  }
}

/**
 * Zero-pad a number to at least two digits.
 *
 * @param n - A non-negative integer (0-99 in typical usage).
 * @returns The number as a string, left-padded with a `0` if less than 10.
 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Compute the 1-based day-of-year for a given date.
 *
 * Calculates the difference in milliseconds between the date and
 * midnight of December 31 of the previous year (month 0, day 0),
 * then divides by the number of milliseconds in a day.
 *
 * @param date - The date to compute the day-of-year for.
 * @returns The day of the year (1 for January 1, 366 for December 31 in a leap year).
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * Format a day-of-month number with its English ordinal suffix.
 *
 * Special-cases 11th, 12th, and 13th (which do not follow the
 * usual -st/-nd/-rd pattern), then dispatches on the last digit.
 *
 * @param day - The day of the month (1-31).
 * @returns The day with its ordinal suffix (e.g. `"1st"`, `"12th"`, `"23rd"`).
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}
