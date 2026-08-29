/**
 * Regras de negócio do agendamento — função pura, sem I/O.
 *
 * `validateBooking` recebe o que o cliente enviou e o estado do mundo já lido
 * do banco, e responde com um resultado tipado. Não lança exceção para erro
 * esperado: quem chama trata os dois ramos.
 */

import { bookingErrorMessage, type BookingErrorCode } from "@/lib/errors";
import {
  bookingInputSchema,
  type BookingInput,
} from "@/lib/validations/booking";
import { getAvailableSlots, type BookedSlot } from "./availability";
import {
  BOOKING_HORIZON_DAYS,
  CLOSING_TIME,
  OPENING_TIME,
  SLOT_STEP_MINUTES,
} from "./constants";
import { addMinutes, daysBetween, toMinutes, type StudioClock } from "./time";

/** Serviço, reduzido ao que a validação precisa saber. */
export interface BookableService {
  id: string;
  duration_minutes: number;
  is_active: boolean;
}

/** Artista, reduzido ao que a validação precisa saber. */
export interface BookableArtist {
  id: string;
  is_active: boolean;
}

export interface BookingContext {
  /** O serviço escolhido, ou `undefined` se não existe no catálogo. */
  service: BookableService | undefined;
  /** O artista escolhido, ou `undefined` se não existe. */
  artist: BookableArtist | undefined;
  /** Agendamentos conhecidos do artista naquela data. */
  appointments: readonly BookedSlot[];
  now: StudioClock;
}

/** O agendamento validado, com o que o banco precisa gravar. */
export interface ValidatedBooking extends BookingInput {
  endTime: string;
  durationMinutes: number;
}

export type BookingValidation =
  | { ok: true; value: ValidatedBooking }
  | {
      ok: false;
      code: BookingErrorCode;
      message: string;
      /** Preenchido só em INVALID_INPUT, para marcar o campo na tela. */
      fieldErrors?: Record<string, string[]>;
    };

function fail(
  code: BookingErrorCode,
  fieldErrors?: Record<string, string[]>,
): BookingValidation {
  return { ok: false, code, message: bookingErrorMessage(code), fieldErrors };
}

/**
 * Valida um pedido de agendamento contra o schema e contra as regras do
 * estúdio, em ordem: primeiro a forma, depois o catálogo, depois o calendário,
 * depois o expediente e, por último, o conflito de agenda.
 *
 * A ordem importa: cada regra pressupõe que a anterior passou, e o cliente
 * recebe o erro mais específico possível em vez de um "dados inválidos".
 */
export function validateBooking(
  input: unknown,
  context: BookingContext,
): BookingValidation {
  // 1 — forma
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    const { fieldErrors } = collectFieldErrors(parsed.error);
    return fail("INVALID_INPUT", fieldErrors);
  }
  const booking = parsed.data;

  // 2 — catálogo
  const { service, artist } = context;
  if (!service || service.id !== booking.serviceId || !service.is_active) {
    return fail("SERVICE_NOT_FOUND");
  }
  if (!artist || artist.id !== booking.artistId || !artist.is_active) {
    return fail("ARTIST_NOT_FOUND");
  }

  // 3 — calendário
  const horizonDays = daysBetween(context.now.date, booking.date);
  if (horizonDays < 0) return fail("PAST_SLOT");
  if (horizonDays > BOOKING_HORIZON_DAYS) return fail("OUTSIDE_HORIZON");

  // 4 — expediente: o que precisa caber é o FIM da sessão, não o início
  const startMinutes = toMinutes(booking.startTime);
  const endMinutes = startMinutes + service.duration_minutes;
  const opening = toMinutes(OPENING_TIME);
  const closing = toMinutes(CLOSING_TIME);

  if (startMinutes < opening || endMinutes > closing) {
    return fail("OUTSIDE_BUSINESS_HOURS");
  }
  if ((startMinutes - opening) % SLOT_STEP_MINUTES !== 0) {
    return fail("OFF_GRID");
  }

  // 5 — hoje, o horário ainda precisa estar por vir
  if (booking.date === context.now.date && startMinutes <= context.now.minutes) {
    return fail("PAST_SLOT");
  }

  // 6 — conflito de agenda
  const isFree = getAvailableSlots({
    date: booking.date,
    artistId: booking.artistId,
    serviceDurationMinutes: service.duration_minutes,
    appointments: context.appointments,
    now: context.now,
  }).some((slot) => slot.startMinutes === startMinutes);

  if (!isFree) return fail("SLOT_TAKEN");

  return {
    ok: true,
    value: {
      ...booking,
      endTime: addMinutes(booking.startTime, service.duration_minutes),
      durationMinutes: service.duration_minutes,
    },
  };
}

/** Achata os erros do Zod no formato que o formulário consome. */
function collectFieldErrors(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): { fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (fieldErrors[field] ??= []).push(issue.message);
  }

  return { fieldErrors };
}
