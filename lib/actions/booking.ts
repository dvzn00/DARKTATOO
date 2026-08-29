"use server";

import { getBookedSlots } from "@/lib/data/appointments";
import { getArtistById, getServiceById } from "@/lib/data/catalog";
import { getAvailableSlots, type TimeSlot } from "@/lib/domain/availability";
import {
  fieldErrorsFrom,
  validateBooking,
} from "@/lib/domain/booking-rules";
import { MAX_ACTIVE_PER_EMAIL } from "@/lib/domain/constants";
import { studioNow } from "@/lib/domain/time";
import { bookingErrorMessage, mapDatabaseError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  availabilityQuerySchema,
  bookingInputSchema,
} from "@/lib/validations/booking";
import type { ActionResult } from "@/types/actions";

/**
 * O fluxo público de agendamento.
 *
 * Ninguém aqui está autenticado — por isso cada Action revalida tudo do zero,
 * sem confiar em nada que tenha vindo da tela.
 */

/**
 * Horários livres para uma data, artista e serviço.
 *
 * Devolve apenas horários. Mesmo lendo `appointments` com `service_role`, nada
 * de nome, e-mail ou telefone atravessa esta fronteira.
 */
export async function getAvailability(
  input: unknown,
): Promise<ActionResult<{ slots: TimeSlot[] }>> {
  const parsed = availabilityQuerySchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: bookingErrorMessage("INVALID_INPUT"),
    };
  }

  const { date, artistId, serviceId } = parsed.data;

  const [service, artist] = await Promise.all([
    getServiceById(serviceId),
    getArtistById(artistId),
  ]);

  if (!service) {
    return {
      ok: false,
      code: "SERVICE_NOT_FOUND",
      message: bookingErrorMessage("SERVICE_NOT_FOUND"),
    };
  }

  if (!artist) {
    return {
      ok: false,
      code: "ARTIST_NOT_FOUND",
      message: bookingErrorMessage("ARTIST_NOT_FOUND"),
    };
  }

  const appointments = await getBookedSlots(date, artistId);

  const slots = getAvailableSlots({
    date,
    artistId,
    serviceDurationMinutes: service.duration_minutes,
    appointments,
    now: studioNow(),
  });

  return { ok: true, data: { slots } };
}

/**
 * Grava a reserva.
 *
 * Três camadas, nesta ordem — e a última é a que manda:
 *
 *  1. `validateBooking` confere forma, catálogo, calendário e conflito com o
 *     que o banco dizia um instante atrás;
 *  2. um limite por e-mail evita que a agenda seja entupida por script;
 *  3. o INSERT encontra a EXCLUDE constraint. Se outro cliente tiver gravado
 *     o mesmo horário entre 1 e 3, é aqui que a corrida é decidida — o
 *     Postgres recusa com 23P01 e o segundo cliente recebe uma frase clara.
 */
export async function createAppointment(
  input: unknown,
): Promise<ActionResult<{ token: string }>> {
  // Um primeiro parse só para descobrir O QUE buscar no banco. Se a forma já
  // estiver errada, nem chegamos a consultar — e `validateBooking` refaz este
  // parse depois, agora como parte da validação de verdade.
  const forma = bookingInputSchema.safeParse(input);

  if (!forma.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: bookingErrorMessage("INVALID_INPUT"),
      fieldErrors: fieldErrorsFrom(forma.error.issues),
    };
  }

  const { serviceId, artistId, date } = forma.data;

  const [service, artist, appointments] = await Promise.all([
    getServiceById(serviceId),
    getArtistById(artistId),
    getBookedSlots(date, artistId),
  ]);

  const validation = validateBooking(input, {
    service: service
      ? {
          id: service.id,
          duration_minutes: service.duration_minutes,
          is_active: service.is_active,
        }
      : undefined,
    artist: artist ? { id: artist.id, is_active: artist.is_active } : undefined,
    appointments,
    now: studioNow(),
  });

  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      message: validation.message,
      fieldErrors: validation.fieldErrors,
    };
  }

  const booking = validation.value;
  const supabase = createSupabaseAdminClient();

  // Camada 2 — limite por e-mail.
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_email", booking.clientEmail)
    .in("status", ["pending", "confirmed"])
    .gte("date", studioNow().date);

  if ((count ?? 0) >= MAX_ACTIVE_PER_EMAIL) {
    return {
      ok: false,
      code: "TOO_MANY_ACTIVE",
      message: `Você já tem ${MAX_ACTIVE_PER_EMAIL} sessões em aberto. Conclua ou cancele uma antes de marcar outra.`,
    };
  }

  // Camada 3 — o banco decide.
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      client_name: booking.clientName,
      client_email: booking.clientEmail,
      client_phone: booking.clientPhone,
      service_id: booking.serviceId,
      artist_id: booking.artistId,
      date: booking.date,
      start_time: booking.startTime,
      reference_image_url: booking.referenceImageUrl,
      notes: booking.notes,
    })
    .select("public_token")
    .single();

  if (error || !data) {
    const code = mapDatabaseError(error);
    return { ok: false, code, message: bookingErrorMessage(code) };
  }

  return { ok: true, data: { token: data.public_token } };
}
