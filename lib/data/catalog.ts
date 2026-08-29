import "server-only";

import { ARTIST_COUNT } from "@/lib/domain/constants";
import { supabaseHost } from "@/lib/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { ServiceRow, TattooArtistRow } from "@/types/database";

/**
 * Leitura do catálogo público.
 *
 * Estas são funções de servidor, não Server Actions: são chamadas de Server
 * Components durante a renderização. Marcá-las com `"use server"` criaria
 * endpoints POST públicos sem necessidade nenhuma.
 */

/**
 * Traduz a falha do PostgREST em algo sobre o que se possa agir.
 *
 * "fetch failed" sozinho não diz nada, e é o que aparece no log do deploy
 * quando a URL está malformada. Nomear o host que foi tentado separa, em uma
 * olhada, os três casos que acontecem de verdade: endereço errado na variável
 * de ambiente, projeto Supabase pausado, ou policy de RLS recusando.
 */
function falhaDeCatalogo(oQue: string, mensagem: string): Error {
  const texto = mensagem.toLowerCase();

  let dica = "";

  if (texto.includes("fetch failed")) {
    dica =
      ` Não foi possível alcançar ${supabaseHost()}: confira` +
      ` NEXT_PUBLIC_SUPABASE_URL e se o projeto no Supabase não está pausado.`;
  } else if (texto.includes("api key") || texto.includes("jwt")) {
    dica =
      ` O endereço está certo, então o problema é a chave: confira` +
      ` NEXT_PUBLIC_SUPABASE_ANON_KEY em Project Settings › API Keys.` +
      ` Ela precisa ser a chave publicável do MESMO projeto, copiada inteira.`;
  }

  return new Error(
    `Falha ao carregar ${oQue} de ${supabaseHost()}: ${mensagem}.${dica}`,
  );
}

/** Os serviços ativos, na ordem em que o estúdio quer exibi-los. */
export async function getServices(): Promise<ServiceRow[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw falhaDeCatalogo("os serviços", error.message);
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
    throw falhaDeCatalogo("os tatuadores", error.message);
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
