import type { Metadata } from "next";
import Link from "next/link";

import { AgendaDoDia } from "@/components/admin/agenda-do-dia";
import { getAppointmentsByDate } from "@/lib/data/appointments";
import { getArtists } from "@/lib/data/catalog";
import { addDays, formatDateLong, isDateString, studioNow } from "@/lib/domain/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function paraLink(date: string, artist?: string): string {
  const busca = new URLSearchParams({ date });
  if (artist) busca.set("artist", artist);
  return `/admin/agenda?${busca.toString()}`;
}

export default async function AgendaPage({ searchParams }: Props) {
  const busca = await searchParams;
  const hoje = studioNow().date;

  const dataBruta = busca.date;
  const data =
    typeof dataBruta === "string" && isDateString(dataBruta) ? dataBruta : hoje;

  const artistas = await getArtists();
  const artistaBruto = busca.artist;
  const artistaSelecionado =
    typeof artistaBruto === "string" &&
    artistas.some((artista) => artista.id === artistaBruto)
      ? artistaBruto
      : undefined;

  const agendamentos = await getAppointmentsByDate(data, artistaSelecionado);

  const ativos = agendamentos.filter((item) => item.status !== "cancelled");

  const urlPdf = new URLSearchParams({ date: data });
  if (artistaSelecionado) urlPdf.set("artist", artistaSelecionado);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl capitalize text-ink md:text-3xl">
            {formatDateLong(data)}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {ativos.length === 0
              ? "Nenhuma sessão marcada."
              : ativos.length === 1
                ? "1 sessão marcada."
                : `${ativos.length} sessões marcadas.`}
            {agendamentos.length !== ativos.length
              ? ` ${agendamentos.length - ativos.length} cancelada(s).`
              : ""}
          </p>
        </div>

        <a
          href={`/api/export-pdf?${urlPdf.toString()}`}
          className="rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-gold-deep"
        >
          Exportar PDF do dia
        </a>
      </div>

      {/* Navegação de datas. Links simples: o estado vive na URL, então
          recarregar, compartilhar e voltar funcionam sem nenhum JavaScript. */}
      <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-4">
        <Link
          href={paraLink(addDays(data, -1), artistaSelecionado)}
          className="text-sm text-ink-muted transition-colors hover:text-ink"
        >
          ← Dia anterior
        </Link>
        {data !== hoje ? (
          <Link
            href={paraLink(hoje, artistaSelecionado)}
            className="text-sm text-gold-ink underline underline-offset-4 hover:text-ink"
          >
            Hoje
          </Link>
        ) : (
          <span className="text-sm text-ink-faint">Hoje</span>
        )}
        <Link
          href={paraLink(addDays(data, 1), artistaSelecionado)}
          className="text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Próximo dia →
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs uppercase tracking-widest text-ink-muted">
            Cadeira
          </span>
          <FiltroLink
            href={paraLink(data)}
            ativo={!artistaSelecionado}
            rotulo="As duas"
          />
          {artistas.map((artista) => (
            <FiltroLink
              key={artista.id}
              href={paraLink(data, artista.id)}
              ativo={artistaSelecionado === artista.id}
              rotulo={artista.name.split(" ")[0]}
            />
          ))}
        </div>
      </div>

      <div className="mt-10">
        <AgendaDoDia agendamentos={agendamentos} />
      </div>
    </div>
  );
}

function FiltroLink({
  href,
  ativo,
  rotulo,
}: {
  href: string;
  ativo: boolean;
  rotulo: string;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "true" : undefined}
      className={cn(
        "rounded-sm border px-3 py-1.5 text-xs transition-colors",
        ativo
          ? "border-gold-deep bg-gold-soft text-ink"
          : "border-line text-ink-muted hover:border-gold-deep hover:text-ink",
      )}
    >
      {rotulo}
    </Link>
  );
}
