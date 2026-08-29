import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente do navegador, com a chave pública.
 *
 * Uso previsto: apenas o login do admin. O fluxo público de agendamento não
 * fala com o banco pelo navegador — ver docs/BLOCO-0 §1.2.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
