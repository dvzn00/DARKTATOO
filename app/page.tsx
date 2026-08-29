/**
 * Placeholder da fundação (BLOCO 1).
 *
 * Serve para provar que fontes, tokens e escala tipográfica estão de pé.
 * A landing completa — Sobre, Artistas, Serviços, Depoimentos, Contato — é
 * construída no BLOCO 5.
 */
export default function Home() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-24 sm:px-8"
    >
      <p className="eyebrow">São Paulo · desde 2016</p>

      <h1 className="mt-6 text-4xl text-ink sm:text-5xl lg:text-6xl">
        Cada linha
        <br />
        é <em className="font-display italic">permanente</em>.
      </h1>

      <p className="mt-8 max-w-md text-base text-ink-muted">
        Duas cadeiras. Agenda aberta com 40 dias.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <span className="rounded-md bg-gold px-6 py-3 text-sm font-medium text-ink">
          Agendar sessão
        </span>
        <span className="text-sm text-gold-ink">Ver os artistas →</span>
      </div>

      <hr className="mt-16 border-0 border-t border-gold" />
    </main>
  );
}
