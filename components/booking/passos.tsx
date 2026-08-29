import Image from "next/image";
import Link from "next/link";

import { EstadoVazio } from "@/components/shared/ui-bits";
import { href, type BookingParams } from "@/lib/booking-url";
import type { TimeSlot } from "@/lib/domain/availability";
import { formatDateLong } from "@/lib/domain/time";
import { cn } from "@/lib/utils";
import type { ServiceRow, TattooArtistRow } from "@/types/database";

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/**
 * As etapas 1, 2 e 4 são listas de links renderizadas no servidor.
 *
 * Escolher um serviço é navegar para a mesma página com um parâmetro a mais —
 * então não há estado de cliente, nem `onClick`, nem JavaScript. A seleção é
 * a própria URL.
 */

export function TituloPasso({
  numero,
  titulo,
  apoio,
}: {
  numero: number;
  titulo: string;
  apoio?: string;
}) {
  return (
    <header className="mb-9">
      <p className="numeric text-xs text-gold-ink">
        Etapa {numero} de 5
      </p>
      <h1 className="mt-3 text-2xl text-ink md:text-3xl">{titulo}</h1>
      {apoio ? (
        <p className="mt-3 max-w-md text-sm text-ink-muted">{apoio}</p>
      ) : null}
    </header>
  );
}

export function PassoServico({
  servicos,
  params,
}: {
  servicos: ServiceRow[];
  params: BookingParams;
}) {
  return (
    <>
      <TituloPasso
        numero={1}
        titulo="O que você quer tatuar?"
        apoio="A duração define os horários que vão aparecer mais adiante."
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {servicos.map((servico) => (
          <li key={servico.id}>
            <Link
              href={href({ ...params, service: servico.id })}
              className={cn(
                "group flex h-full flex-col border bg-bg p-6 transition-colors",
                params.service === servico.id
                  ? "border-gold-deep bg-gold-soft/40"
                  : "border-line hover:border-gold-deep hover:bg-raised",
              )}
            >
              <span className="text-lg text-ink">{servico.name}</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                {servico.description}
              </span>
              <span className="numeric mt-6 flex items-baseline justify-between border-t border-line pt-4 text-sm">
                <span className="text-ink-muted">
                  {servico.duration_minutes} min
                </span>
                <span className="text-gold-ink">
                  {MOEDA.format(Number(servico.price))}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PassoArtista({
  artistas,
  params,
}: {
  artistas: TattooArtistRow[];
  params: BookingParams;
}) {
  return (
    <>
      <TituloPasso
        numero={2}
        titulo="Com quem?"
        apoio="Cada artista tem a própria agenda — a disponibilidade muda conforme a escolha."
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {artistas.map((artista) => (
          <li key={artista.id}>
            <Link
              href={href({ ...params, artist: artista.id })}
              className={cn(
                "group flex h-full gap-5 border bg-bg p-5 transition-colors",
                params.artist === artista.id
                  ? "border-gold-deep bg-gold-soft/40"
                  : "border-line hover:border-gold-deep hover:bg-raised",
              )}
            >
              <span className="relative size-20 shrink-0 overflow-hidden bg-surface">
                <Image
                  src={artista.profile_picture_url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </span>
              <span className="flex flex-col justify-center">
                <span className="eyebrow">{artista.specialty}</span>
                <span className="mt-2 text-lg text-ink">{artista.name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PassoHorario({
  slots,
  params,
  proximaDataLivre,
}: {
  slots: TimeSlot[];
  params: BookingParams;
  proximaDataLivre: string | null;
}) {
  return (
    <>
      <TituloPasso
        numero={4}
        titulo="A que horas?"
        apoio={
          params.date
            ? `Horários livres em ${formatDateLong(params.date)}.`
            : undefined
        }
      />

      {slots.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum horário livre neste dia."
          descricao={
            proximaDataLivre
              ? "A agenda deste artista está cheia. O próximo dia com vaga está logo ali."
              : "A agenda deste artista está cheia nos próximos 40 dias. Tente o outro artista."
          }
          acao={
            proximaDataLivre
              ? {
                  href: href({ ...params, date: proximaDataLivre, time: undefined }),
                  label: `Ver ${formatDateLong(proximaDataLivre)} →`,
                }
              : {
                  href: href({ service: params.service }),
                  label: "Escolher o outro artista →",
                }
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((slot) => (
            <li key={slot.start}>
              <Link
                href={href({ ...params, time: slot.start })}
                prefetch={false}
                className={cn(
                  "numeric flex flex-col items-center border bg-bg px-3 py-4 transition-colors",
                  params.time === slot.start
                    ? "border-gold-deep bg-gold-soft/40"
                    : "border-line hover:border-gold-deep hover:bg-raised",
                )}
              >
                <span className="text-base text-ink">{slot.start}</span>
                <span className="mt-1 text-xs text-ink-muted">
                  até {slot.end}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
