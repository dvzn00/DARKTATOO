import Link from "next/link";

/**
 * O hero é a tese da página.
 *
 * Sem imagem de fundo, sem gradiente, sem número gigante com rótulo pequeno.
 * O assunto é traço permanente, então a página abre com tipografia e uma única
 * linha dourada — o gesto mínimo que o assunto pede.
 *
 * A entrada é uma sequência escalonada, uma vez só. `prefers-reduced-motion`
 * está tratado globalmente em globals.css.
 */
export function Hero() {
  return (
    <section className="px-6 pb-12 pt-24 sm:px-8 md:pb-16 md:pt-36">
      <div className="mx-auto w-full max-w-6xl">
        <p className="eyebrow revelar" style={{ animationDelay: "0ms" }}>
          São Paulo · desde 2016
        </p>

        <h1 className="mt-8 text-4xl text-ink sm:text-5xl lg:text-6xl xl:text-7xl">
          <span
            className="revelar block"
            style={{ animationDelay: "90ms" }}
          >
            Cada linha
          </span>
          <span
            className="revelar block"
            style={{ animationDelay: "180ms" }}
          >
            é <em className="italic">permanente</em>.
          </span>
        </h1>

        <p
          className="revelar mt-10 max-w-lg text-base leading-relaxed text-ink-muted md:text-lg"
          style={{ animationDelay: "300ms" }}
        >
          Duas cadeiras, dois artistas, uma agenda aberta com 40 dias. Você
          escolhe o trabalho, o profissional e o horário — sem telefonema e sem
          criar conta.
        </p>

        <div
          className="revelar mt-11 flex flex-wrap items-center gap-x-8 gap-y-4"
          style={{ animationDelay: "400ms" }}
        >
          <Link
            href="/agendar"
            className="inline-flex items-center rounded-md bg-gold px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-gold-deep"
          >
            Agendar sessão
          </Link>
          <Link
            href="/#artistas"
            className="text-sm text-gold-ink underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Ver os artistas →
          </Link>
        </div>

        <hr
          className="revelar mt-16 border-0 border-t border-gold"
          style={{ animationDelay: "520ms" }}
        />
      </div>
    </section>
  );
}
