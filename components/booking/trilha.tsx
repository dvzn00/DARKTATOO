import Link from "next/link";

import { hrefDoPasso, PASSOS, type BookingParams } from "@/lib/booking-url";
import { cn } from "@/lib/utils";

/**
 * A trilha das cinco etapas.
 *
 * Etapa concluída é link — dá para voltar e trocar. Etapa futura é texto
 * inerte: não existe atalho para frente, porque cada escolha depende da
 * anterior.
 */
export function Trilha({
  params,
  atual,
}: {
  params: BookingParams;
  atual: number;
}) {
  return (
    <nav aria-label="Etapas do agendamento">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {PASSOS.map((passo, indice) => {
          const concluida = passo.numero < atual;
          const ativa = passo.numero === atual;

          const conteudo = (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  ativa && "bg-gold ring-2 ring-gold-soft",
                  concluida && "bg-gold-deep",
                  !ativa && !concluida && "bg-ink-faint/50",
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  ativa && "font-medium text-ink",
                  concluida && "text-gold-ink",
                  !ativa && !concluida && "text-ink-muted",
                )}
              >
                {passo.rotulo}
              </span>
            </span>
          );

          return (
            <li key={passo.numero} className="flex items-center gap-3">
              {concluida ? (
                <Link
                  href={hrefDoPasso(params, passo.numero)}
                  className="rounded-sm underline-offset-4 hover:underline"
                >
                  {conteudo}
                </Link>
              ) : (
                <span aria-current={ativa ? "step" : undefined}>
                  {conteudo}
                </span>
              )}

              {indice < PASSOS.length - 1 ? (
                <span aria-hidden className="h-px w-4 bg-line sm:w-6" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
