export const errorMessages = {
  forbidden: "No tienes permisos para realizar esta acción.",
  unauthorized: "Tu sesión no tiene acceso a esta operación.",
  activityConflict: "El técnico ya tiene una actividad programada en ese horario.",
  unexpected: "No fue posible completar la operación. Inténtalo nuevamente.",
  validation: {
    endBeforeStart: "La hora de finalización debe ser posterior a la hora de inicio.",
    recurrenceBeforeStart: "La recurrencia debe finalizar después de la primera actividad.",
  },
} as const;
