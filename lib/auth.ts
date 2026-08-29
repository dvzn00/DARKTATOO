import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminSession {
  userId: string;
  email: string;
  name: string | null;
}

/**
 * Quem está logado, se for admin.
 *
 * Usa `getUser()` e não `getSession()`: o primeiro valida o token no servidor
 * de auth, o segundo apenas lê o cookie — que o navegador pode ter forjado.
 * Para uma guarda de acesso, só o primeiro serve.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") return null;

  return { userId: profile.id, email: profile.email, name: profile.name };
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}
