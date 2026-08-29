import Image from "next/image";
import Link from "next/link";

import { Eyebrow, Secao, TituloSecao } from "@/components/shared/ui-bits";
import type { ServiceRow, TattooArtistRow } from "@/types/database";

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function Sobre() {
  return (
    <Secao id="estudio">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Eyebrow>O estúdio</Eyebrow>
          <TituloSecao>
            Duas cadeiras,
            <br />
            por escolha.
          </TituloSecao>
        </div>

        <div className="space-y-6 text-base leading-relaxed text-ink-muted md:col-span-6 md:col-start-7">
          <p>
            O Dark Ink não cresce em número de artistas. Cresce em tempo por
            peça. Cada sessão começa com uma conversa e um desenho feito para
            uma pessoa só — nada de catálogo repetido em pele diferente.
          </p>
          <p>
            A agenda é curta de propósito: quarenta dias abertos, dois
            profissionais, e o intervalo entre sessões que o trabalho exige. É o
            que permite tratar uma tatuagem como o que ela é — uma decisão que
            não se desfaz.
          </p>
        </div>
      </div>
    </Secao>
  );
}

export function Artistas({ artistas }: { artistas: TattooArtistRow[] }) {
  return (
    <Secao id="artistas">
      <Eyebrow>Quem tatua</Eyebrow>
      <TituloSecao>Os dois artistas da casa.</TituloSecao>

      <div className="mt-14 grid gap-10 sm:grid-cols-2">
        {artistas.map((artista) => (
          <article
            key={artista.id}
            className="group border border-line bg-bg transition-colors hover:border-gold-deep"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-surface">
              <Image
                src={artista.profile_picture_url}
                alt={`Retrato de ${artista.name}`}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div className="p-7">
              <p className="eyebrow">{artista.specialty}</p>
              <h3 className="mt-3 text-xl text-ink">{artista.name}</h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                {artista.bio}
              </p>

              {artista.instagram_url ? (
                <a
                  href={artista.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-block text-sm text-gold-ink underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  Ver o trabalho no Instagram →
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </Secao>
  );
}

/**
 * Serviços em grade de flash sheet.
 *
 * A numeração 01–04 existe porque estúdios numeram os desenhos da folha de
 * flash de verdade — é o vernáculo do assunto, não enfeite. Nenhuma outra
 * seção do site usa marcador numerado.
 */
export function Servicos({ servicos }: { servicos: ServiceRow[] }) {
  return (
    <Secao id="servicos" fundo="surface">
      <Eyebrow>A folha</Eyebrow>
      <TituloSecao>O que sai daqui.</TituloSecao>

      <div className="mt-14 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-4">
        {servicos.map((servico, indice) => (
          <article
            key={servico.id}
            className="border-b border-r border-line bg-bg p-7 transition-colors hover:bg-raised"
          >
            <p className="numeric text-xs text-gold-ink">
              {String(indice + 1).padStart(2, "0")}
            </p>

            <h3 className="mt-6 text-lg text-ink">{servico.name}</h3>

            <p className="mt-3 min-h-16 text-sm leading-relaxed text-ink-muted">
              {servico.description}
            </p>

            <dl className="mt-7 space-y-1 border-t border-line pt-4">
              <div className="flex justify-between">
                <dt className="text-xs text-ink-muted">Duração</dt>
                <dd className="numeric text-xs text-ink">
                  {servico.duration_minutes} min
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-ink-muted">A partir de</dt>
                <dd className="numeric text-sm text-gold-ink">
                  {MOEDA.format(Number(servico.price))}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <p className="mt-8 max-w-lg text-sm text-ink-muted">
        O valor final depende do tamanho e da região do corpo. A primeira
        conversa é sem compromisso.
      </p>
    </Secao>
  );
}

/** Conteúdo de demonstração — ver nota no rodapé. */
const DEPOIMENTOS = [
  {
    texto:
      "Levei uma ideia mal explicada e saí com um desenho que era exatamente o que eu não sabia descrever.",
    autor: "Camila R.",
    contexto: "Fine line, 2025",
  },
  {
    texto:
      "Marcar levou dois minutos e ninguém me ligou de volta para remarcar. O horário estava lá quando cheguei.",
    autor: "Otávio M.",
    contexto: "Blackwork, 2025",
  },
  {
    texto:
      "Três sessões, mesmo traço, mesma mão. Dá para ver onde uma terminou e a outra começou? Eu não consigo.",
    autor: "Priscila D.",
    contexto: "Realismo, 2024",
  },
];

export function Depoimentos() {
  return (
    <Secao>
      <Eyebrow>Quem passou pela cadeira</Eyebrow>

      <div className="mt-12 divide-y divide-line border-y border-line">
        {DEPOIMENTOS.map((depoimento) => (
          <figure
            key={depoimento.autor}
            className="grid gap-6 py-12 md:grid-cols-12"
          >
            <blockquote className="md:col-span-8">
              <p className="font-display text-xl italic leading-snug text-ink md:text-2xl">
                {depoimento.texto}
              </p>
            </blockquote>
            <figcaption className="text-sm text-ink-muted md:col-span-3 md:col-start-10 md:text-right">
              {depoimento.autor}
              <span className="mt-1 block text-ink-muted">
                {depoimento.contexto}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Secao>
  );
}

export function Contato() {
  return (
    <Secao id="contato" fundo="surface">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-6">
          <Eyebrow>Onde e quando</Eyebrow>
          <TituloSecao>Venha conversar antes.</TituloSecao>

          <dl className="mt-10 space-y-6">
            <div>
              <dt className="text-xs uppercase tracking-widest text-ink-muted">
                Endereço
              </dt>
              <dd className="mt-2 text-base text-ink">
                Rua das Palmeiras, 218
                <br />
                Vila Madalena · São Paulo
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-ink-muted">
                Atendimento
              </dt>
              <dd className="numeric mt-2 text-base text-ink">
                Terça a sábado · 10h às 20h
              </dd>
            </div>
          </dl>
        </div>

        <div className="md:col-span-5 md:col-start-8">
          <div className="border border-line bg-bg p-9">
            <h3 className="font-display text-xl text-ink">
              A agenda está aberta.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              Escolha o trabalho, o artista e o horário. Leva menos de dois
              minutos e não pede cadastro.
            </p>
            <Link
              href="/agendar"
              className="mt-8 inline-flex items-center rounded-md bg-gold px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-gold-deep"
            >
              Agendar sessão
            </Link>
          </div>
        </div>
      </div>
    </Secao>
  );
}
