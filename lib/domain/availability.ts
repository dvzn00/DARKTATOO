/**
 * Disponibilidade de horários — função pura, sem I/O.
 *
 * Recebe os agendamentos já lidos do banco e devolve os horários livres.
 * Não conhece Supabase, não conhece React, não conhece `new Date()`. É por
 * isso que dá para testar cada regra isoladamente.
 */

import {
  BLOCKING_STATUSES,
  CLOSING_TIME,
  OPENING_TIME,
  SLOT_STEP_MINUTES,
  type AppointmentStatus,
} from "./constants";
import { toMinutes, toTimeString, type StudioClock } from "./time";

/** O mínimo que um agendamento precisa expor para ocupar a agenda. */
export interface BookedSlot {
  artist_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
}

export interface TimeSlot {
  /** `HH:MM` — o que vai no banco. */
  start: string;
  /** `HH:MM` — início + duração do serviço. */
  end: string;
  startMinutes: number;
  endMinutes: number;
}

export interface AvailabilityInput {
  /** `YYYY-MM-DD`. */
  date: string;
  artistId: string;
  /** Duração do serviço escolhido, em minutos. */
  serviceDurationMinutes: number;
  /**
   * Agendamentos conhecidos. Podem vir de qualquer artista ou data: a função
   * filtra sozinha. Passar demais é seguro; passar de menos, não.
   */
  appointments: readonly BookedSlot[];
  /** O agora do estúdio. Injetado para manter a função pura. */
  now: StudioClock;
}

/** Dois intervalos meio-abertos `[início, fim)` se cruzam? */
function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Converte os agendamentos que ocupam a agenda em intervalos de minutos.
 *
 * Descarta o que não interessa: outro artista, outro dia, e status que não
 * bloqueia. Um agendamento `cancelled` devolve o horário para a agenda — é
 * exatamente o mesmo recorte que o `WHERE` da EXCLUDE constraint no banco.
 */
export function toBusyIntervals(
  appointments: readonly BookedSlot[],
  artistId: string,
  date: string,
): Array<{ start: number; end: number }> {
  return appointments
    .filter(
      (appointment) =>
        appointment.artist_id === artistId &&
        appointment.date === date &&
        BLOCKING_STATUSES.includes(appointment.status),
    )
    .map((appointment) => ({
      start: toMinutes(appointment.start_time),
      end: toMinutes(appointment.end_time),
    }));
}

/**
 * Horários livres para um artista, numa data, para um serviço.
 *
 * Um horário só entra na lista se passar em todas estas regras:
 *  1. a data não é passada;
 *  2. a sessão inteira cabe dentro do expediente — o que importa é o FIM,
 *     não o início: às 19h ainda se agenda 60 min, mas não 120;
 *  3. não cruza nenhum agendamento pendente ou confirmado;
 *  4. se for hoje, o início ainda está por vir.
 *
 * Devolve `[]` quando não há nada livre — a interface trata esse caso com um
 * empty state, nunca com uma lista vazia sem explicação.
 */
export function getAvailableSlots(input: AvailabilityInput): TimeSlot[] {
  const { date, artistId, serviceDurationMinutes, appointments, now } = input;

  if (!Number.isInteger(serviceDurationMinutes) || serviceDurationMinutes <= 0) {
    throw new RangeError(
      `Duração de serviço inválida: ${serviceDurationMinutes}`,
    );
  }

  // Regra 1 — dia que já passou não tem horário nenhum.
  if (date < now.date) return [];

  const opening = toMinutes(OPENING_TIME);
  const closing = toMinutes(CLOSING_TIME);
  const busy = toBusyIntervals(appointments, artistId, date);
  const isToday = date === now.date;

  const slots: TimeSlot[] = [];

  for (
    let start = opening;
    start + serviceDurationMinutes <= closing; // Regra 2
    start += SLOT_STEP_MINUTES
  ) {
    const end = start + serviceDurationMinutes;

    // Regra 4 — hoje, só o que ainda não começou.
    if (isToday && start <= now.minutes) continue;

    // Regra 3 — nada de sobreposição.
    const isTaken = busy.some((interval) =>
      overlaps(start, end, interval.start, interval.end),
    );
    if (isTaken) continue;

    slots.push({
      start: toTimeString(start),
      end: toTimeString(end),
      startMinutes: start,
      endMinutes: end,
    });
  }

  return slots;
}

/** Atalho para o calendário: o dia tem ao menos um horário livre? */
export function hasAvailability(input: AvailabilityInput): boolean {
  return getAvailableSlots(input).length > 0;
}

/** Um horário específico está livre? Usado antes de gravar a reserva. */
export function isSlotAvailable(
  input: AvailabilityInput,
  startTime: string,
): boolean {
  const target = toMinutes(startTime);
  return getAvailableSlots(input).some((slot) => slot.startMinutes === target);
}
