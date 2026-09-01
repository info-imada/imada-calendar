import type { ActivityInput } from "@/lib/validations/activity";

export type OccurrenceWindow = {
  startsAt: Date;
  endsAt: Date;
};

const MAX_OCCURRENCES = 60;

function addRecurrenceInterval(
  date: Date,
  frequency: NonNullable<ActivityInput["recurrence"]>["frequency"],
  interval: number,
) {
  const next = new Date(date);
  if (frequency === "DAILY") next.setUTCDate(next.getUTCDate() + interval);
  if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + (interval * 7));
  if (frequency === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + interval);
  return next;
}

export function buildOccurrenceWindows(
  input: Pick<ActivityInput, "startsAt" | "endsAt" | "recurrence">,
): OccurrenceWindow[] {
  const duration = input.endsAt.getTime() - input.startsAt.getTime();
  const windows: OccurrenceWindow[] = [];
  let occurrenceStart = new Date(input.startsAt);

  while (!input.recurrence || occurrenceStart <= input.recurrence.endsAt) {
    if (windows.length >= MAX_OCCURRENCES) throw new Error("RECURRENCE_LIMIT");
    windows.push({
      startsAt: new Date(occurrenceStart),
      endsAt: new Date(occurrenceStart.getTime() + duration),
    });
    if (!input.recurrence) break;
    occurrenceStart = addRecurrenceInterval(
      occurrenceStart,
      input.recurrence.frequency,
      input.recurrence.interval,
    );
  }

  return windows;
}

export function hasInternalScheduleOverlap(windows: OccurrenceWindow[]) {
  return windows.some((window, index) => {
    const next = windows[index + 1];
    return Boolean(next && next.startsAt < window.endsAt);
  });
}
