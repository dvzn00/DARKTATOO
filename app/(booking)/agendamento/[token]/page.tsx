import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Ficha,
  FichaLinha,
  FichaPicote,
  FichaSelo,
  numeroDaFicha,
} from "@/components/shared/ficha";
import { StatusBadge } from "@/components/shared/ui-bits";
import { getAppointmentByToken } from "@/lib/data/appointments";
import { formatDateLong, formatTimeRange } from "@/lib/domain/time";

export const metadata: Metadata = {
  title: "Sua sessão",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function formatarTelefone(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos;
}

/**
 * A confirmação: a ficha em tamanho real.
 *
 * É o único momento do produto em que o dourado ocupa área — o selo. O acesso
 * é pelo `public_token`, não pelo id, e a página é `noindex`: o link é do
 * cliente, não do buscador.
 */
export default async function ConfirmacaoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const agendamento = await getAppointmentByToken(token);

  if (!agendamento) notFound();

  const confirmado =
    agendamento.status === "confirmed" || agendamento.status === "completed";
  const cancelado = agendamento.status === "cancelled";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-6 sm:px-8">
          <Link href="/" className="font-display text-lg text-ink">
            DARK INK
          </Link>
        </div>
      </header>

      <main
        id="conteudo"
        className="mx-auto w-full max-w-lg flex-1 px-6 py-16 sm:px-8"
      >
        <div className="mb-10">
          {cancelado ? (
            <>
              <h1 className="text-2xl text-ink">Sessão cancelada.</h1>
              <p className="mt-3 text-sm text-ink-muted">
                Este horário foi devolvido para a agenda. Você pode marcar outro
                quando quiser.
              </p>
            </>
          ) : confirmado ? (
            <FichaSelo
              texto={
                agendamento.status === "completed" ? "Concluída" : "Confirmado"
              }
            />
          ) : (
            <>
              <h1 className="text-2xl text-ink">Horário reservado.</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                O estúdio confirma por e-mail em até um dia útil. Guarde esta
                página — é o seu comprovante.
              </p>
            </>
          )}
        </div>

        <Ficha className="[--bg-ambiente:var(--surface)]">
          <div className="flex items-start justify-between px-6 pb-5 pt-6">
            <div>
              <p className="eyebrow">Ficha de sessão</p>
              <p className="numeric mt-2 text-sm text-ink-faint">
                {numeroDaFicha(agendamento.public_token)}
              </p>
            </div>
            <StatusBadge status={agendamento.status} />
          </div>

          <FichaPicote />

          <dl className="space-y-4 px-6 py-7">
            <FichaLinha rotulo="Serviço" valor={agendamento.service.name} />
            <FichaLinha rotulo="Artista" valor={agendamento.artist.name} />
            <FichaLinha
              rotulo="Data"
              valor={formatDateLong(agendamento.date)}
            />
            <FichaLinha
              rotulo="Horário"
              valor={formatTimeRange(
                agendamento.start_time,
                agendamento.end_time,
              )}
              numerico
            />
            <FichaLinha
              rotulo="Duração"
              valor={`${agendamento.duration_minutes} min`}
              numerico
            />
          </dl>

          <FichaPicote />

          <dl className="space-y-4 px-6 py-7">
            <FichaLinha rotulo="Nome" valor={agendamento.client_name} />
            <FichaLinha rotulo="E-mail" valor={agendamento.client_email} />
            <FichaLinha
              rotulo="Telefone"
              valor={formatarTelefone(agendamento.client_phone)}
              numerico
            />
          </dl>

          {agendamento.notes ? (
            <div className="border-t border-line px-6 py-5">
              <p className="text-xs uppercase tracking-widest text-ink-muted">
                Observações
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                {agendamento.notes}
              </p>
            </div>
          ) : null}

          <div className="border-t border-line px-6 py-5">
            <div className="ficha-linha">
              <dt className="text-ink">A partir de</dt>
              <span className="preenchimento" aria-hidden />
              <dd className="numeric text-lg text-gold-ink">
                {MOEDA.format(agendamento.price_snapshot)}
              </dd>
            </div>
          </div>
        </Ficha>

        <div className="mt-10 space-y-4 text-sm">
          <p className="text-ink-muted">
            Chegue com 10 minutos de folga. Se precisar remarcar, responda o
            e-mail de confirmação.
          </p>
          <p className="numeric text-ink-muted">
            Rua das Palmeiras, 218 · Vila Madalena · terça a sábado, 10h às 20h
          </p>
          <Link
            href="/"
            className="inline-block text-gold-ink underline underline-offset-4 transition-colors hover:text-ink"
          >
            Voltar ao site →
          </Link>
        </div>
      </main>
    </div>
  );
}
