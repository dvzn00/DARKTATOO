"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Erro inesperado.
 *
 * Não pede desculpas e não é vago: diz o que aconteceu, dá uma saída e mostra
 * o identificador que o estúdio pode citar ao procurar no log. O `error.message`
 * fica de fora de propósito — em produção ele vem higienizado, e mesmo assim
 * não é assunto do visitante.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="conteudo"
      className="flex min-h-full flex-1 items-center justify-center px-6 py-24"
    >
      <div className="w-full max-w-md">
        <p className="eyebrow">Algo travou</p>

        <h1 className="mt-5 text-2xl text-ink">
          Esta página não carregou.
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          A falha foi nossa, não sua. Tente de novo — se insistir, a agenda
          continua acessível pelo início.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep"
          >
            Tentar de novo
          </button>
          <Link
            href="/"
            className="text-sm text-gold-ink underline underline-offset-4 transition-colors hover:text-ink"
          >
            Voltar ao início
          </Link>
        </div>

        {error.digest ? (
          <p className="numeric mt-10 text-xs text-ink-muted">
            Referência: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
