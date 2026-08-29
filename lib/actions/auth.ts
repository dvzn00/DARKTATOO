"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Encerra a sessão do admin.
 *
 * Feito no servidor para que o cookie seja apagado de verdade — um signOut só
 * no navegador deixaria o token válido do lado de cá até expirar.
 */
export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
