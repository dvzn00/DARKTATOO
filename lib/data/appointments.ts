import "server-only";

import type { BookedSlot } from "@/lib/domain/availability";
import { getAvailableSlots } from "@/lib/domain/availability";
import { BLOCKING_STATUSES, SLOT_STEP_MINUTES } from "@/lib/domain/constants";
import { studioNow } from "@/lib/domain/time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AppointmentStatus,
  AppointmentWithRelations,
} from "@/types/domain";

/**
 * Leituras de agendamentos.
 *
 * Duas famílias, com clientes Supabase diferentes de propósito:
 *
 *  · `getBookedSlots` alimenta a disponibilidade pública. Usa `service_role`
 *    porque o papel `anon` não tem acesso nenhum a `appointments` — e devolve
 *    SÓ horários, nunca dados de cliente.
 *
 *  · o resto é do admin. Usa o cliente com a sessão, então a RLS é quem
 *    autoriza: se a policy falhar, a consulta volta vazia, não com dados.
 */

const RELACOES = `
  id, public_token, client_name, client_email, client_phone,
  date, start_time, end_time, duration_minutes, price_snapshot,
  status, reference_image_url, notes,
  service:services!inner ( id, name ),
  artist:tattoo_artists!inner ( id, name )
` as const;

interface LinhaComRelacoes {
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
  status: AppointmentStatus;
  reference_image_url: string | null;
  notes: string | null;
  service: { id: string; name: string } | { id: string; name: string }[];
  artist: { id: string; name: string } | { id: string; name: string }[];
}

/** PostgREST devolve a relação como objeto ou array conforme a inferência. */
function primeiro<T>(valor: T | T[]): T {
  return Array.isArray(valor) ? valor[0] : valor;
}

function normalizar(linha: LinhaComRelacoes): AppointmentWithRelations {
  return {
    ...linha,
    price_snapshot: Number(linha.price_snapshot),
    service: primeiro(linha.service),
    artist: primeiro(linha.artist),
  };
}

/**
 * Só o que ocupa a agenda de um artista numa data: horário e status.
 *
 * Nenhum dado de cliente sai daqui — é o que permite o fluxo público
 * responder "14:00 está livre?" sem expor quem reservou as 15:00.
 */
export async function getBookedSlots(
  date: string,
  artistId: string,
): Promise<BookedSlot[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("artist_id, date, start_time, end_time, status")
    .eq("date", date)
    .eq("artist_id", artistId)
    .in("status", [...BLOCKING_STATUSES]);

  if (error) {
    throw new Error(`Falha ao consultar a agenda: ${error.message}`);
  }

  return data ?? [];
}

/** Ocupação de um intervalo de datas, para o calendário saber o que desabilitar. */
export async function getBookedSlotsInRange(
  fromDate: string,
  toDate: string,
  artistId: string,
): Promise<BookedSlot[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("artist_id, date, start_time, end_time, status")
    .gte("date", fromDate)
    .lte("date", toDate)
    .eq("artist_id", artistId)
    .in("status", [...BLOCKING_STATUSES]);

  if (error) {
    throw new Error(`Falha ao consultar a agenda: ${error.message}`);
  }

  return data ?? [];
}

/** A ficha que o cliente vê depois de agendar. Sem login, pelo token. */
export async function getAppointmentByToken(
  token: string,
): Promise<AppointmentWithRelations | null> {
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from("appointments")
    .select(RELACOES)
    .eq("public_token", token)
    .maybeSingle<LinhaComRelacoes>();

  return data ? normalizar(data) : null;
}

/** A agenda do dia, para o admin. Retorna vazio se não houver sessão válida. */
export async function getAppointmentsByDate(
  date: string,
  artistId?: string,
): Promise<AppointmentWithRelations[]> {
  const supabase = await createSupabaseServerClient();

  let consulta = supabase
    .from("appointments")
    .select(RELACOES)
    .eq("date", date)
    .order("start_time", { ascending: true });

  if (artistId) {
    consulta = consulta.eq("artist_id", artistId);
  }

  const { data, error } = await consulta.returns<LinhaComRelacoes[]>();

  if (error) {
    throw new Error(`Falha ao carregar a agenda: ${error.message}`);
  }

  return (data ?? []).map(normalizar);
}

export interface DaySummary {
  date: string;
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  /** Horários de 60 min ainda livres, somando as duas cadeiras. */
  freeSlots: number;
  next: AppointmentWithRelations | null;
}

/** Os números do dashboard. */
export async function getDaySummary(
  date: string,
  artistIds: readonly string[],
): Promise<DaySummary> {
  const agendamentos = await getAppointmentsByDate(date);
  const agora = studioNow();

  const conta = (status: AppointmentStatus) =>
    agendamentos.filter((item) => item.status === status).length;

  const ocupados: BookedSlot[] = agendamentos.map((item) => ({
    artist_id: item.artist.id,
    date: item.date,
    start_time: item.start_time,
    end_time: item.end_time,
    status: item.status,
  }));

  const freeSlots = artistIds.reduce(
    (total, artistId) =>
      total +
      getAvailableSlots({
        date,
        artistId,
        serviceDurationMinutes: SLOT_STEP_MINUTES,
        appointments: ocupados,
        now: agora,
      }).length,
    0,
  );

  const emAndamento = agendamentos
    .filter((item) => item.status === "pending" || item.status === "confirmed")
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return {
    date,
    total: agendamentos.filter((item) => item.status !== "cancelled").length,
    pending: conta("pending"),
    confirmed: conta("confirmed"),
    completed: conta("completed"),
    cancelled: conta("cancelled"),
    freeSlots,
    next: emAndamento[0] ?? null,
  };
}
