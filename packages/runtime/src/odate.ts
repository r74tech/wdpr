/** Format timestamp metadata from rendered Wikidot dates in the browser's locale. */
const hoverListeners = new WeakMap<HTMLElement, () => void>();

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

/** Read modern format_ classes and the older format% encoding. */
function processOdate(el: HTMLElement): void {
  let timestamp: number | null = null;
  let format: string | null = null;
  for (const cls of el.className.split(/\s+/)) {
    if (/^time_-?\d+$/.test(cls)) timestamp = Number(cls.slice(5));
    else if (cls.startsWith("format_")) format = decodeFormat(cls.slice(7));
    else if (cls.startsWith("format%")) format = decodeFormat(cls.slice(6));
  }
  if (timestamp === null || !Number.isSafeInteger(timestamp)) return;
  const date = new Date(timestamp * 1000);
  if (!Number.isFinite(date.getTime())) return;
  const [pattern, ...options] = format?.split("|") ?? [];
  el.textContent = pattern === undefined ? date.toLocaleString() : formatDate(date, pattern);

  const previous = hoverListeners.get(el);
  if (previous) {
    el.removeEventListener("mouseover", previous);
    hoverListeners.delete(el);
    el.removeAttribute("title");
  }
  if (options.includes("agohover")) {
    const updateHover = () => {
      el.title = `${elapsedTime(date)} ago`;
    };
    updateHover();
    el.addEventListener("mouseover", updateHover);
    hoverListeners.set(el, updateHover);
  }
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
 * - `%O` -- elapsed seconds, minutes, hours or days
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
      return elapsedTime(date);
    case "c":
      return date.toLocaleString();
    case "I":
      return pad2(date.getHours() % 12 || 12);
    case "p":
      return date.getHours() < 12 ? "AM" : "PM";
    case "r":
      return formatDate(date, "%I:%M:%S %p");
    case "R":
      return formatDate(date, "%H:%M");
    case "T":
      return formatDate(date, "%H:%M:%S");
    case "D":
      return formatDate(date, "%m/%d/%y");
    case "z": {
      const minutes = -date.getTimezoneOffset();
      return `${minutes >= 0 ? "+" : "-"}${pad2(Math.floor(Math.abs(minutes) / 60))}${pad2(Math.abs(minutes) % 60)}`;
    }
    case "Z":
      return (
        new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
          .formatToParts(date)
          .find((part) => part.type === "timeZoneName")?.value ?? ""
      );
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

/** Match Wikidot's seconds/minutes/hours/days elapsed-time units. */
function elapsedTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const [amount, unit] =
    seconds >= 86400
      ? ([Math.floor(seconds / 86400), "day"] as const)
      : seconds >= 3600
        ? ([Math.floor(seconds / 3600), "hour"] as const)
        : seconds >= 60
          ? ([Math.floor(seconds / 60), "minute"] as const)
          : ([seconds || 1, "second"] as const);
  return `${amount} ${unit}${amount > 1 ? "s" : ""}`;
}
