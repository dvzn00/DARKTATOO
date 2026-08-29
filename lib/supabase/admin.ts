import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente com `service_role`. IGNORA RLS.
 *
 * Existe por um motivo só: o agendamento público. O papel `anon` não tem
 * nenhuma policy em `appointments`, porque conceder SELECT a ele exporia nome,
 * e-mail e telefone de todos os clientes (docs/BLOCO-0 §1.2). A reserva
 * acontece aqui, no servidor, e as constraints do Postgres seguem sendo a
 * autoridade final — inclusive contra este cliente.
 *
 * O `import "server-only"` acima faz o build QUEBRAR se alguém importar este
 * módulo em um client component. É proposital.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
