import { cn } from "@/lib/utils";

/**
 * Esqueletos de carregamento.
 *
 * A forma do esqueleto imita a forma do conteúdo que vem — é isso que evita o
 * pulo de layout quando os dados chegam. Um retângulo genérico piscando não
 * faria isso.
 *
 * A animação é `pulse` do Tailwind, que `prefers-reduced-motion` já desliga
 * globalmente em globals.css.
 */
export function Barra({
  className,
  largura,
}: {
  className?: string;
  largura?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("block h-3 animate-pulse rounded-sm bg-raised", className)}
      style={largura ? { width: largura } : undefined}
    />
  );
}

/** Envolve um esqueleto com o rótulo que o leitor de tela anuncia. */
export function Carregando({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{rotulo}</span>
      {children}
    </div>
  );
}

/** Grade de cartões — usada nas etapas de serviço e artista. */
export function EsqueletoCartoes({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: quantidade }, (_, indice) => (
        <div key={indice} className="border border-line bg-bg p-6">
          <Barra className="h-5" largura="60%" />
          <Barra className="mt-4" largura="95%" />
          <Barra className="mt-2" largura="70%" />
          <div className="mt-6 flex justify-between border-t border-line pt-4">
            <Barra largura="4rem" />
            <Barra largura="5rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Coluna de horas da agenda do admin. */
export function EsqueletoAgenda({ linhas = 6 }: { linhas?: number }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {Array.from({ length: linhas }, (_, indice) => (
        <div key={indice} className="grid grid-cols-[4.5rem_1fr] gap-4 py-6">
          <Barra largura="3rem" />
          <div>
            <Barra className="h-4" largura="45%" />
            <Barra className="mt-3" largura="65%" />
          </div>
        </div>
      ))}
    </div>
  );
}
