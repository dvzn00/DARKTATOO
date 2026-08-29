import Link from "next/link";

import { StatusBadge } from "@/components/shared/ui-bits";
import { getDaySummary } from "@/lib/data/appointments";
import { getArtists } from "@/lib/data/catalog";
import { studioNow, trimSeconds } from "@/lib/domain/time";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const hoje = studioNow().date;
  const artistas = await getArtists();
  const resumo = await getDaySummary(
    hoje,
    artistas.map((artista) => artista.id),
  );

  const cartoes = [
    { valor: resumo.total, rotulo: "sessões hoje", destaque: false },
    { valor: resumo.confirmed, rotulo: "confirmadas", destaque: false },
    {
      valor: resumo.pending,
      rotulo: "aguardando você",
      destaque: resumo.pending > 0,
    },
    { valor: resumo.freeSlots, rotulo: "horários livres", destaque: false },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <h1 className="text-2xl text-ink md:text-3xl">Hoje no estúdio</h1>

      <div className="mt-10 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
        {cartoes.map((cartao) => (
          <div
            key={cartao.rotulo}
            className={cn(
              "bg-bg px-6 py-8",
              cartao.destaque && "bg-gold-soft/50",
            )}
          >
            <p
              className={cn(
                "numeric font-display text-4xl",
                cartao.destaque ? "text-gold-ink" : "text-ink",
              )}
            >
              {cartao.valor}
            </p>
            <p className="mt-2 text-xs uppercase tracking-widest text-ink-muted">
              {cartao.rotulo}
            </p>
          </div>
        ))}
      </div>

      {resumo.pending > 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          {resumo.pending === 1
            ? "Uma sessão espera confirmação."
            : `${resumo.pending} sessões esperam confirmação.`}{" "}
          <Link
            href="/admin/agenda"
            className="text-gold-ink underline underline-offset-4 hover:text-ink"
          >
            Abrir a agenda →
          </Link>
        </p>
      ) : null}

      <section className="mt-16">
        <h2 className="text-xs uppercase tracking-widest text-ink-muted">
          Próxima sessão
        </h2>

        {resumo.next ? (
          <div className="mt-5 border border-line bg-bg p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="numeric font-display text-3xl text-ink">
                  {trimSeconds(resumo.next.start_time)}
                </p>
                <p className="mt-3 text-base text-ink">
                  {resumo.next.client_name}
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  {resumo.next.service.name} · {resumo.next.artist.name} ·{" "}
                  {resumo.next.duration_minutes} min
                </p>
              </div>
              <StatusBadge status={resumo.next.status} />
            </div>
          </div>
        ) : (
          <div className="mt-5 border border-dashed border-line px-6 py-14 text-center">
            <p className="font-display text-xl text-ink">
              Nada mais na agenda de hoje.
            </p>
            <p className="mt-3 text-sm text-ink-muted">
              As duas cadeiras estão livres até o fechamento, às 20h.
            </p>
          </div>
        )}
      </section>

      <p className="mt-16 text-sm text-ink-muted">
        Para ver outro dia, filtrar por artista ou exportar o PDF,{" "}
        <Link
          href="/admin/agenda"
          className="text-gold-ink underline underline-offset-4 hover:text-ink"
        >
          vá para a agenda
        </Link>
        .
      </p>
    </div>
  );
}
