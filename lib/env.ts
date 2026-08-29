/**
 * Leitura de variáveis de ambiente.
 *
 * A checagem é feita na chamada, não no topo do módulo: validar no import
 * quebraria `next build` em qualquer ambiente sem as chaves configuradas.
 */

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Copie .env.example para .env.local e preencha.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseServiceRoleKey(): string {
  return requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
