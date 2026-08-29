import { z } from "zod";

import { SERVICE_DURATIONS } from "@/lib/domain/constants";
import { moneySchema, uuidSchema } from "./common";

/** Duração de serviço aceita pelo estúdio. Espelha o CHECK da migration. */
export const serviceDurationSchema = z
  .number()
  .int()
  .refine(
    (value): value is (typeof SERVICE_DURATIONS)[number] =>
      (SERVICE_DURATIONS as readonly number[]).includes(value),
    `Duração precisa ser ${SERVICE_DURATIONS.join(", ")} minutos.`,
  );

export const serviceSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(400),
  duration_minutes: serviceDurationSchema,
  price: moneySchema,
  image_url: z.string().nullable(),
  display_order: z.number().int().nonnegative(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type Service = z.infer<typeof serviceSchema>;

/** O que o fluxo de agendamento precisa saber sobre um serviço. */
export const serviceSummarySchema = serviceSchema.pick({
  id: true,
  name: true,
  description: true,
  duration_minutes: true,
  price: true,
  image_url: true,
});

export type ServiceSummary = z.infer<typeof serviceSummarySchema>;
