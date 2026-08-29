import { cn } from "@/lib/utils";

/**
 * A Ficha do Estúdio — o elemento-assinatura do produto.
 *
 * Um estúdio de tatuagem trabalha com um artefato físico: a ficha de sessão,
 * o papel que o cliente leva para casa. Esta é a versão em tela desse objeto,
 * e ela reaparece em três lugares: preenchendo-se durante o agendamento, como
 * card na agenda do admin, e impressa no PDF.
 *
 * Toda a ousadia visual do projeto está gasta aqui. Tudo em volta é quieto.
 */

export function Ficha({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("ficha", className)} {...props}>
      {children}
    </div>
  );
}

export function FichaCabecalho({
  numero,
  titulo,
  className,
}: {
  numero: string;
  titulo: string;
  className?: string;
}) {
  return (
    <div className={cn("px-6 pb-5 pt-6", className)}>
      <p className="eyebrow">{titulo}</p>
      <p className="numeric mt-2 text-sm text-ink-faint">{numero}</p>
    </div>
  );
}

/** O picote. Separa o cabeçalho do corpo com os dois furos laterais. */
export function FichaPicote({ className }: { className?: string }) {
  return <div className={cn("ficha-picote", className)} aria-hidden />;
}

/**
 * Uma linha da ficha: rótulo, pontilhado, valor.
 *
 * Sem valor, mostra um travessão — a linha existe desde o começo e vai sendo
 * preenchida, como uma ficha de papel sendo escrita à mão.
 */
export function FichaLinha({
  rotulo,
  valor,
  numerico = false,
}: {
  rotulo: string;
  valor?: string | null;
  numerico?: boolean;
}) {
  const preenchida = Boolean(valor);

  return (
    <div className="ficha-linha">
      <dt>{rotulo}</dt>
      <span className="preenchimento" aria-hidden />
      <dd
        className={cn(
          numerico && "numeric",
          preenchida ? "text-ink" : "text-ink-faint",
        )}
      >
        {valor ?? "—"}
      </dd>
    </div>
  );
}

/** O selo. Aparece uma única vez no produto: quando a sessão é confirmada. */
export function FichaSelo({ texto = "Confirmado" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex size-14 shrink-0 items-center justify-center rounded-full border border-gold-deep bg-gold-soft"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none">
          <path
            d="M4 12.5 9.5 18 20 6.5"
            stroke="var(--gold-ink)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div>
        <p className="font-display text-xl text-ink">{texto}</p>
        <p className="text-sm text-ink-muted">
          Guarde esta página — é o seu comprovante.
        </p>
      </div>
    </div>
  );
}

/** Número da ficha a partir do id, para o cliente ter o que citar. */
export function numeroDaFicha(token: string): string {
  return `#DK-${token.replace(/\D/g, "").slice(0, 4).padStart(4, "0")}`;
}
