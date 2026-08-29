"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth";
import { canTransition, transitionError } from "@/lib/domain/status";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateStatusInputSchema } from "@/lib/validations/appointment";
import type { ActionResult } from "@/types/actions";
import type { AppointmentStatus } from "@/types/domain";

/**
 * Ações do painel. Toda função aqui confere a sessão antes de tocar no banco.
 *
 * A checagem é redundante de propósito: a RLS já recusaria a escrita de quem
 * não for admin. Mas RLS recusando devolve "0 linhas afetadas", que na tela
 * vira um botão que não faz nada. Conferir antes dá uma frase de verdade.
 */
export async function updateAppointmentStatus(
  input: unknown,
): Promise<ActionResult<{ id: string; status: AppointmentStatus }>> {
  const session = await getAdminSession();

  if (!session) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      message: "Sua sessão expirou. Entre novamente para continuar.",
    };
  }

  const parsed = updateStatusInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      message: "Não foi possível identificar o agendamento.",
    };
  }

  const { id, status } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data: atual, error: erroLeitura } = await supabase
    .from("appointments")
    .select("id, status, date")
    .eq("id", id)
    .maybeSingle();

  if (erroLeitura || !atual) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Este agendamento não existe mais.",
    };
  }

  if (!canTransition(atual.status, status)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: transitionError(atual.status, status),
    };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      code: "UPDATE_FAILED",
      message: "Não foi possível salvar a mudança. Tente de novo.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/agenda");

  return { ok: true, data: { id, status } };
}

/**
 * Endereço do PDF do dia.
 *
 * Deliberadamente não é uma Server Action. Uma Action devolve um valor de
 * JavaScript por um canal RSC — ela não consegue emitir uma resposta com
 * `Content-Disposition: attachment`, que é o que faz o navegador baixar o
 * arquivo. Download é navegação, então o botão é um link para esta rota.
 */
export async function getDailyPdfUrl(
  date: string,
  artistId?: string,
): Promise<string> {
  const params = new URLSearchParams({ date });
  if (artistId) params.set("artist", artistId);
  return `/api/export-pdf?${params.toString()}`;
}
