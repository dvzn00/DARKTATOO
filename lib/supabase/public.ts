import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente anônimo sem cookies, para o catálogo público.
 *
 * Existe separado do `server.ts` por um motivo concreto: aquele lê `cookies()`,
 * o que torna a página dinâmica. Serviços e tatuadores são os mesmos para todo
 * mundo, então a landing pode ser gerada estaticamente e revalidada — desde
 * que a leitura não passe por cookie nenhum.
 *
 * Respeita RLS: só enxerga o que as policies `*_public_read` permitem.
 */
export function createSupabasePublicClient() {
  return createClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
