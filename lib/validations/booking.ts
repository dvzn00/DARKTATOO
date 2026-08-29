import { z } from "zod";

import {
  dateStringSchema,
  emailSchema,
  optionalHttpsUrlSchema,
  optionalText,
  personNameSchema,
  phoneSchema,
  timeStringSchema,
  uuidSchema,
} from "./common";

/**
 * O que o cliente envia para reservar uma sessão.
 *
 * Não há campo de senha, e nunca haverá: clientes são visitantes. Também não
 * há `end_time` nem `price` — os dois são derivados do serviço por trigger,
 * para que ninguém possa reservar 120 minutos pagando por 60.
 */
export const bookingInputSchema = z.object({
  serviceId: uuidSchema,
  artistId: uuidSchema,
  date: dateStringSchema,
  startTime: timeStringSchema,

  clientName: personNameSchema,
  clientEmail: emailSchema,
  clientPhone: phoneSchema,

  referenceImageUrl: optionalHttpsUrlSchema,
  notes: optionalText(
    1000,
    "Observações longas demais — use no máximo 1000 caracteres.",
  ),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

/** O que a URL do fluxo carrega entre as etapas (`/agendar?...`). */
export const bookingStepParamsSchema = z.object({
  service: uuidSchema.optional(),
  artist: uuidSchema.optional(),
  date: dateStringSchema.optional(),
  time: timeStringSchema.optional(),
});

export type BookingStepParams = z.infer<typeof bookingStepParamsSchema>;

/** Consulta de disponibilidade. */
export const availabilityQuerySchema = z.object({
  date: dateStringSchema,
  artistId: uuidSchema,
  serviceId: uuidSchema,
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
