const RESET_WINDOW_MS = 2 * 60 * 1000;

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("La fecha no es válida.");
  }
  return date;
}

function getParts(value: DateInput, timezone: string) {
  const date = toDate(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  return Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
}

export function getWorkDate(value: DateInput, timezone: string): string {
  const parts = getParts(value, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatWorkLogDateTime(value: DateInput, timezone: string): string {
  const parts = getParts(value, timezone);
  const month = MONTHS[Number(parts.month) - 1];
  const period = parts.dayPeriod.toLowerCase() === "am" ? "a. m." : "p. m.";

  return `${parts.day} ${month} ${parts.year} · ${parts.hour}:${parts.minute} ${period}`;
}

export function isStartResetAllowed(startedAt: DateInput, now: DateInput = new Date()): boolean {
  const started = toDate(startedAt).getTime();
  const current = toDate(now).getTime();
  const elapsed = current - started;

  return elapsed >= 0 && elapsed <= RESET_WINDOW_MS;
}

export const workLogResetWindowMs = RESET_WINDOW_MS;
