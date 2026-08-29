import Link from "next/link";

const NAVEGACAO = [
  { href: "/#estudio", label: "Estúdio" },
  { href: "/#artistas", label: "Artistas" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#contato", label: "Contato" },
];

/**
 * Cabeçalho fixo, sem JavaScript.
 *
 * A versão "transparente que vira sólida no scroll" exigiria um listener e um
 * componente de cliente para ganhar muito pouco. Um fio de 1px com fundo
 * translúcido resolve o mesmo problema — o texto nunca briga com o conteúdo
 * que passa por baixo — e não custa nada.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
        <Link
          href="/"
          className="font-display text-lg tracking-wide text-ink"
          aria-label="Dark Ink Studio, página inicial"
        >
          DARK INK
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAVEGACAO.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/agendar"
          className="rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-gold-deep"
        >
          Agendar
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface px-6 py-14 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-display text-lg text-ink">DARK INK</p>
          <p className="mt-3 max-w-xs text-sm text-ink-muted">
            Rua das Palmeiras, 218 · Vila Madalena, São Paulo
          </p>
          <p className="numeric mt-1 text-sm text-ink-muted">
            Terça a sábado, 10h às 20h
          </p>
        </div>

        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {NAVEGACAO.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/login"
                className="text-sm text-ink-faint transition-colors hover:text-ink"
              >
                Área do estúdio
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Honestidade sobre o que este site é. Ver docs/BLOCO-0, decisão D5. */}
      <div className="mx-auto mt-12 w-full max-w-6xl border-t border-line pt-6">
        <p className="max-w-2xl text-xs leading-relaxed text-ink-faint">
          Projeto de demonstração. Dark Ink Studio é um estúdio fictício —
          artistas, serviços, preços, depoimentos e endereço são conteúdo de
          exemplo e não descrevem pessoas ou negócios reais.
        </p>
      </div>
    </footer>
  );
}
