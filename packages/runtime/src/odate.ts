const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

/** Process all span.odate elements within root, converting timestamps to local time */
export function initOdate(root: HTMLElement): void {
  const elements = root.querySelectorAll<HTMLElement>("span.odate");
  for (const el of elements) {
    processOdate(el);
  }
}

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

function decodeFormat(encoded: string): string {
  // Format is URL-encoded in class name (e.g. %25e%20%25b → %e %b)
  try {
    return decodeURIComponent(encoded.replace(/\|/g, "%"));
  } catch {
    return encoded;
  }
}

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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

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
