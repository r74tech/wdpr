/**
 * Format a Date object using an optional strftime-like format string.
 *
 * When no format is provided, returns the ISO 8601 string representation.
 */
export function formatDate(date: Date, format?: string): string {
  if (!format) {
    return date.toISOString();
  }
  if (format === "%Y-%m-%d") {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }
  return strftime(date, format);
}

/** Full month names for strftime `%B` token. Static to avoid per-call allocation. */
const MONTHS = [
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
/** Abbreviated month names for strftime `%b` token. */
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
/** Full day names for strftime `%A` token. */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Abbreviated day names for strftime `%a` token. */
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Pre-compiled regex matching strftime tokens (`%X` where X is supported). */
const STRFTIME_REGEX = /%([YymdHeHIMSpbBaAwjZz%])/g;

function strftime(date: Date, format: string): string {
  return format.replace(STRFTIME_REGEX, (_, token: string) => {
    switch (token) {
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
      case "I":
        return pad2(date.getHours() % 12 || 12);
      case "M":
        return pad2(date.getMinutes());
      case "S":
        return pad2(date.getSeconds());
      case "p":
        return date.getHours() < 12 ? "AM" : "PM";
      case "b":
        return MONTHS_SHORT[date.getMonth()] ?? "";
      case "B":
        return MONTHS[date.getMonth()] ?? "";
      case "a":
        return DAYS_SHORT[date.getDay()] ?? "";
      case "A":
        return DAYS[date.getDay()] ?? "";
      case "w":
        return String(date.getDay());
      case "j":
        return pad3(getDayOfYear(date));
      case "Z":
        return "UTC";
      case "z":
        return "+0000";
      case "%":
        return "%";
      default:
        return `%${token}`;
    }
  });
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function pad3(n: number): string {
  if (n < 10) return `00${n}`;
  if (n < 100) return `0${n}`;
  return String(n);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
