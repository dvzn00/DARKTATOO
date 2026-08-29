import { z } from "zod";

import { APPOINTMENT_STATUSES } from "@/lib/domain/constants";
import {
  dateStringSchema,
  emailSchema,
  moneySchema,
  personNameSchema,
  timeStringSchema,
  uuidSchema,
} from "./common";

export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);

export const appointmentSchema = z.object({
  id: uuidSchema,
  public_token: uuidSchema,
  client_name: personNameSchema,
  client_email: emailSchema,
  client_phone: z.string().min(10),
  service_id: uuidSchema,
  artist_id: uuidSchema,
  date: dateStringSchema,
  start_time: timeStringSchema,
  end_time: timeStringSchema,
  duration_minutes: z.number().int().positive(),
  price_snapshot: moneySchema,
  status: appointmentStatusSchema,
  reference_image_url: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Appointment = z.infer<typeof appointmentSchema>;

/**
 * Transições que o admin pode aplicar.
 *
 * `pending` está fora de propósito: é o estado inicial de quem agendou, e não
 * um destino. Reabrir um agendamento cancelado seria devolver um horário que
 * já pode ter sido dado a outro cliente.
 */
export const adminStatusSchema = z.enum([
  "confirmed",
  "cancelled",
  "completed",
]);

export type AdminStatus = z.infer<typeof adminStatusSchema>;

export const updateStatusInputSchema = z.object({
  id: uuidSchema,
  status: adminStatusSchema,
});

export type UpdateStatusInput = z.infer<typeof updateStatusInputSchema>;

/** Filtro da agenda do admin. Sem artista = os dois. */
export const agendaFilterSchema = z.object({
  date: dateStringSchema,
  artistId: uuidSchema.optional(),
});

export type AgendaFilter = z.infer<typeof agendaFilterSchema>;
