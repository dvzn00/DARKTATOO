import "server-only";

import { ARTIST_COUNT } from "@/lib/domain/constants";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { ServiceRow, TattooArtistRow } from "@/types/database";

/**
 * Leitura do catálogo público.
 *
 * Estas são funções de servidor, não Server Actions: são chamadas de Server
 * Components durante a renderização. Marcá-las com `"use server"` criaria
 * endpoints POST públicos sem necessidade nenhuma.
 */

/** Os serviços ativos, na ordem em que o estúdio quer exibi-los. */
export async function getServices(): Promise<ServiceRow[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar os serviços: ${error.message}`);
  }

  return data ?? [];
}

/** Os tatuadores ativos. São dois — o banco não deixa ser diferente. */
export async function getArtists(): Promise<TattooArtistRow[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("tattoo_artists")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar os tatuadores: ${error.message}`);
  }

  return (data ?? []).slice(0, ARTIST_COUNT);
}

export async function getServiceById(id: string): Promise<ServiceRow | null> {
  const supabase = createSupabasePublicClient();

  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  return data ?? null;
}

export async function getArtistById(
  id: string,
): Promise<TattooArtistRow | null> {
  const supabase = createSupabasePublicClient();

  const { data } = await supabase
    .from("tattoo_artists")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  return data ?? null;
}
