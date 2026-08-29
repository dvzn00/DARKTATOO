import type { Metadata } from "next";
import Link from "next/link";

import { PassoData } from "@/components/booking/calendario";
import { FichaAgendamento } from "@/components/booking/ficha-agendamento";
import { FormularioDados } from "@/components/booking/formulario";
import {
  PassoArtista,
  PassoHorario,
  PassoServico,
  TituloPasso,
} from "@/components/booking/passos";
import { Trilha } from "@/components/booking/trilha";
import { hrefDoPasso, passoAtual, type BookingParams } from "@/lib/booking-url";
import {
  getBookedSlots,
  getBookedSlotsInRange,
} from "@/lib/data/appointments";
import {
  getArtistById,
  getArtists,
  getServiceById,
  getServices,
} from "@/lib/data/catalog";
import { getAvailableSlots } from "@/lib/domain/availability";
import { BOOKING_HORIZON_DAYS } from "@/lib/domain/constants";
import { addDays, studioNow } from "@/lib/domain/time";

export const metadata: Metadata = {
  title: "Agendar sessão",
  description:
    "Escolha o serviço, o artista, o dia e o horário. Sem cadastro e sem telefonema.",
};

/** A disponibilidade muda a cada reserva; nada aqui pode ser cacheado. */
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function texto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" && valor.length > 0 ? valor : undefined;
}

export default async function AgendarPage({ searchParams }: Props) {
  const busca = await searchParams;

  const params: BookingParams = {
    service: texto(busca.service),
    artist: texto(busca.artist),
    date: texto(busca.date),
    time: texto(busca.time),
  };

  // Um parâmetro inválido na URL não pode quebrar a página: se o serviço ou o
  // artista não existirem mais, a etapa correspondente simplesmente reaparece.
  const [servico, artista] = await Promise.all([
    params.service ? getServiceById(params.service) : null,
    params.artist ? getArtistById(params.artist) : null,
  ]);

  const validos: BookingParams = {
    service: servico?.id,
    artist: artista?.id,
    date: servico && artista ? params.date : undefined,
    time: servico && artista && params.date ? params.time : undefined,
  };

  const atual = passoAtual(validos);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
          <Link
            href={atual === 1 ? "/" : hrefDoPasso(validos, atual - 1)}
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            ← {atual === 1 ? "Voltar ao site" : "Voltar"}
          </Link>
          <Link href="/" className="font-display text-lg text-ink">
            DARK INK
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8">
        <Trilha params={validos} atual={atual} />
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 pb-24 sm:px-8 lg:grid-cols-12">
        <main id="conteudo" className="lg:col-span-7">
          <Etapa atual={atual} params={validos} servico={servico} />
        </main>

        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="lg:sticky lg:top-24">
            <FichaAgendamento
              servico={servico}
              artista={artista}
              data={validos.date}
              horario={validos.time}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

async function Etapa({
  atual,
  params,
  servico,
}: {
  atual: number;
  params: BookingParams;
  servico: Awaited<ReturnType<typeof getServiceById>>;
}) {
  if (atual === 1) {
    return <PassoServico servicos={await getServices()} params={params} />;
  }

  if (atual === 2) {
    return <PassoArtista artistas={await getArtists()} params={params} />;
  }

  if (!servico || !params.artist) return null;

  const agora = studioNow();
  const primeiroDia = agora.date;
  const ultimoDia = addDays(agora.date, BOOKING_HORIZON_DAYS);

  if (atual === 3) {
    // Uma consulta para os 40 dias, e a disponibilidade de cada um sai da
    // função pura — em vez de 40 idas ao banco.
    const ocupados = await getBookedSlotsInRange(
      primeiroDia,
      ultimoDia,
      params.artist,
    );

    const datasLivres = new Set<string>();
    for (let dia = primeiroDia; dia <= ultimoDia; dia = addDays(dia, 1)) {
      const livres = getAvailableSlots({
        date: dia,
        artistId: params.artist,
        serviceDurationMinutes: servico.duration_minutes,
        appointments: ocupados,
        now: agora,
      });
      if (livres.length > 0) datasLivres.add(dia);
    }

    return (
      <PassoData
        params={params}
        primeiroDia={primeiroDia}
        ultimoDia={ultimoDia}
        datasLivres={datasLivres}
      />
    );
  }

  if (!params.date) return null;

  if (atual === 4) {
    const ocupados = await getBookedSlots(params.date, params.artist);

    const slots = getAvailableSlots({
      date: params.date,
      artistId: params.artist,
      serviceDurationMinutes: servico.duration_minutes,
      appointments: ocupados,
      now: agora,
    });

    // Se o dia está cheio, o estado vazio precisa oferecer uma saída concreta.
    let proximaDataLivre: string | null = null;
    if (slots.length === 0) {
      const noIntervalo = await getBookedSlotsInRange(
        params.date,
        ultimoDia,
        params.artist,
      );
      for (
        let dia = addDays(params.date, 1);
        dia <= ultimoDia;
        dia = addDays(dia, 1)
      ) {
        const livres = getAvailableSlots({
          date: dia,
          artistId: params.artist,
          serviceDurationMinutes: servico.duration_minutes,
          appointments: noIntervalo,
          now: agora,
        });
        if (livres.length > 0) {
          proximaDataLivre = dia;
          break;
        }
      }
    }

    return (
      <PassoHorario
        slots={slots}
        params={params}
        proximaDataLivre={proximaDataLivre}
      />
    );
  }

  if (!params.time) return null;

  return (
    <>
      <TituloPasso
        numero={5}
        titulo="Quase lá."
        apoio="Precisamos de um contato para confirmar a sessão."
      />
      <FormularioDados
        serviceId={servico.id}
        artistId={params.artist}
        date={params.date}
        startTime={params.time}
      />
    </>
  );
}
