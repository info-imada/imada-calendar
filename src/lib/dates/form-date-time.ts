export function combineLocalDateAndTime(date: Date, time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new RangeError("Time must use HH:mm format.");

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new RangeError("Time is outside the valid range.");

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function endOfSelectedDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function getLocalTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
