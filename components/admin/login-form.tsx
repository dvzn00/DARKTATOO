"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Entrada do estúdio.
 *
 * O erro é específico de propósito: "E-mail ou senha incorretos" — e não
 * "algo deu errado", que não ajuda ninguém, nem "e-mail não cadastrado", que
 * confirmaria a existência da conta para quem estivesse tentando adivinhar.
 */
export function LoginForm({ proximo }: { proximo: string }) {
  const router = useRouter();
  const [entrando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const idBase = useId();

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setErro(null);

    iniciar(async () => {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: String(dados.get("email") ?? "").trim(),
        password: String(dados.get("password") ?? ""),
      });

      if (error) {
        setErro("E-mail ou senha incorretos.");
        return;
      }

      router.replace(proximo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      {erro ? (
        <p
          role="alert"
          className="border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {erro}
        </p>
      ) : null}

      <div>
        <label htmlFor={`${idBase}-email`} className="block text-sm text-ink">
          E-mail
        </label>
        <input
          id={`${idBase}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          className={cn(
            "mt-2 w-full border border-line bg-bg px-4 py-3 text-sm text-ink",
            "transition-colors focus:border-gold-deep",
          )}
        />
      </div>

      <div>
        <label htmlFor={`${idBase}-senha`} className="block text-sm text-ink">
          Senha
        </label>
        <input
          id={`${idBase}-senha`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={cn(
            "mt-2 w-full border border-line bg-bg px-4 py-3 text-sm text-ink",
            "transition-colors focus:border-gold-deep",
          )}
        />
      </div>

      <button
        type="submit"
        disabled={entrando}
        className="w-full rounded-md bg-gold px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        {entrando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
