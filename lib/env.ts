/**
 * Leitura de variáveis de ambiente.
 *
 * A checagem é feita na chamada, não no topo do módulo: validar no import
 * quebraria `next build` em qualquer ambiente sem as chaves configuradas.
 *
 * Tudo aqui é paranoico com o formato do valor por um motivo concreto: quem
 * cola uma chave no painel de um serviço de deploy cola junto, com frequência,
 * um espaço, uma quebra de linha ou o par de aspas. O erro que isso produz
 * mais adiante é `TypeError: fetch failed`, que não diz nada sobre a causa.
 */

function requireEnv(name: string, value: string | undefined): string {
  const limpo = (value ?? "").trim().replace(/^["']|["']$/g, "");

  if (limpo === "") {
    throw new Error(
      `Variável de ambiente ausente: ${name}. ` +
        `Localmente, copie .env.example para .env.local e preencha. ` +
        `Na Vercel, defina em Settings › Environment Variables e refaça o deploy.`,
    );
  }

  return limpo;
}

export function supabaseUrl(): string {
  const bruto = requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

  let url: URL;
  try {
    url = new URL(bruto);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL não é uma URL válida: "${bruto}". ` +
        `O valor esperado é https://SEU-PROJETO.supabase.co — sem aspas, ` +
        `sem barra no fim e sem espaço em branco.`,
    );
  }

  if (url.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL precisa usar https, e veio "${url.protocol}//".`,
    );
  }

  if (!url.hostname.includes(".")) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL aponta para "${url.hostname}", que não parece ` +
        `o endereço de um projeto Supabase. Confira em Project Settings › API.`,
    );
  }

  // `origin` descarta caminho, query e a barra final, se vierem junto.
  return url.origin;
}

/** O host, para aparecer em mensagens de erro sem expor chave nenhuma. */
export function supabaseHost(): string {
  try {
    return new URL(supabaseUrl()).hostname;
  } catch {
    return "(host desconhecido)";
  }
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
