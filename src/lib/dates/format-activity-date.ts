const DEFAULT_OPERATION_TIMEZONE = "America/Panama";
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

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function formatActivityDateTime(
  value: string | Date,
  timeZone = DEFAULT_OPERATION_TIMEZONE,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(value));
  const hour24 = Number(getPart(parts, "hour"));
  const hour12 = hour24 % 12 || 12;
  const period = hour24 < 12 ? "a. m." : "p. m.";
  const month = MONTHS[Number(getPart(parts, "month")) - 1];

  return `${getPart(parts, "day")} ${month} ${getPart(parts, "year")} · ${hour12}:${getPart(parts, "minute")} ${period}`;
}

export function formatActivityDate(
  value: string | Date,
  timeZone = DEFAULT_OPERATION_TIMEZONE,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(value));
  const month = MONTHS[Number(getPart(parts, "month")) - 1];

  return `${getPart(parts, "day")} ${month} ${getPart(parts, "year")}`;
}
