/**
 * Constantes de domínio do Dark Ink Studio.
 *
 * Fonte única da verdade para as regras fixas do estúdio. Qualquer regra que o
 * banco também impõe (horário comercial, grade de horários) está espelhada nas
 * constraints das migrations — se mudar aqui, mude lá.
 */

/** Fuso do estúdio. Nunca usar `new Date()` cru: o servidor roda em UTC. */
export const STUDIO_TIMEZONE = "America/Sao_Paulo";

/** Abertura do estúdio, HH:MM. */
export const OPENING_TIME = "10:00";

/** Fechamento do estúdio, HH:MM. Toda sessão precisa TERMINAR até aqui. */
export const CLOSING_TIME = "20:00";

/** Passo da grade de horários, em minutos. A duração vem do serviço. */
export const SLOT_STEP_MINUTES = 60;

/** Quantos dias à frente a agenda fica aberta para o cliente. */
export const BOOKING_HORIZON_DAYS = 40;

/** O estúdio tem exatamente duas cadeiras. */
export const ARTIST_COUNT = 2;

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Status que ocupam a agenda. Um cancelamento devolve o horário. */
export const BLOCKING_STATUSES: readonly AppointmentStatus[] = [
  "pending",
  "confirmed",
];

/** Durações de serviço aceitas, em minutos. */
export const SERVICE_DURATIONS = [60, 90, 120] as const;

export type ServiceDuration = (typeof SERVICE_DURATIONS)[number];
