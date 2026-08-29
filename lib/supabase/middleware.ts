import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * Renova a sessão a cada navegação e tranca /admin.
 *
 * Roda antes da renderização, o que resolve dois problemas de uma vez: Server
 * Components não conseguem escrever cookies, então é aqui que o token
 * atualizado é gravado; e a guarda de acesso acontece antes de qualquer
 * consulta, em vez de depois de a página já ter começado a montar.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser valida o token no servidor de auth. getSession só lê o cookie,
  // que o navegador pode ter forjado — não serve como guarda.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin") && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(login);
  }

  if (pathname === "/login" && user) {
    const painel = request.nextUrl.clone();
    painel.pathname = "/admin";
    painel.search = "";
    return NextResponse.redirect(painel);
  }

  return response;
}
