/**
 * Tipos de domínio, derivados dos schemas Zod.
 *
 * Ponto único de import para o resto da aplicação: nada deveria precisar
 * conhecer o caminho de cada schema.
 */

export type { AppointmentStatus, ServiceDuration } from "@/lib/domain/constants";
export type { StudioClock } from "@/lib/domain/time";
export type {
  AvailabilityInput,
  BookedSlot,
  TimeSlot,
} from "@/lib/domain/availability";
export type {
  BookableArtist,
  BookableService,
  BookingContext,
  BookingValidation,
  ValidatedBooking,
} from "@/lib/domain/booking-rules";
export type { BookingErrorCode } from "@/lib/errors";

export type { Service, ServiceSummary } from "@/lib/validations/service";
export type { TattooArtist } from "@/lib/validations/artist";
export type {
  AdminStatus,
  AgendaFilter,
  Appointment,
  UpdateStatusInput,
} from "@/lib/validations/appointment";
export type {
  AvailabilityQuery,
  BookingInput,
  BookingStepParams,
} from "@/lib/validations/booking";

/** Agendamento com serviço e artista já resolvidos — o que a agenda mostra. */
export interface AppointmentWithRelations {
  id: string;
  public_token: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  price_snapshot: number;
  status: import("@/lib/domain/constants").AppointmentStatus;
  reference_image_url: string | null;
  notes: string | null;
  service: { id: string; name: string };
  artist: { id: string; name: string };
}
