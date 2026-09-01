export type ActivityTimeRangeInput = {
  endsAt: Date;
  startsAt: Date;
};

export type ActivityTimeRangeResult =
  | { durationMinutes: number; valid: true }
  | { message: string; valid: false };

export function validateActivityTimeRange({ endsAt, startsAt }: ActivityTimeRangeInput): ActivityTimeRangeResult {
  const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);

  if (durationMinutes <= 0) {
    return {
      message: "La hora de fin debe ser posterior a la hora de inicio.",
      valid: false,
    };
  }

  return { durationMinutes, valid: true };
}
