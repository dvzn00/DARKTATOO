import Link from "next/link";

import { AcoesStatus } from "@/components/admin/acoes-status";
import { Ficha, FichaPicote } from "@/components/shared/ficha";
import { StatusBadge } from "@/components/shared/ui-bits";
import {
  CLOSING_TIME,
  OPENING_TIME,
  SLOT_STEP_MINUTES,
} from "@/lib/domain/constants";
import { formatPhone, telHref } from "@/lib/domain/phone";
import { toMinutes, toTimeString, trimSeconds } from "@/lib/domain/time";
import { cn } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/domain";

/**
 * A agenda como uma coluna contínua de horas, das 10h às 20h.
 *
 * Os buracos vazios são informação: o admin vê a agenda respirar, e enxerga de
 * relance onde ainda cabe alguém. Uma lista só dos agendamentos esconderia
 * exatamente isso.
 */
export function AgendaDoDia({
  agendamentos,
}: {
  agendamentos: AppointmentWithRelations[];
}) {
  const abertura = toMinutes(OPENING_TIME);
  const fechamento = toMinutes(CLOSING_TIME);

  const horas: number[] = [];
  for (let m = abertura; m < fechamento; m += SLOT_STEP_MINUTES) horas.push(m);

  // Um agendamento é ancorado na hora em que começa; as horas que ele cobre
  // depois ficam marcadas como ocupadas, sem repetir o card.
  const inicios = new Map<number, AppointmentWithRelations[]>();
  const cobertas = new Set<number>();

  for (const item of agendamentos) {
    const inicio = toMinutes(item.start_time);
    const fim = toMinutes(item.end_time);
    const lista = inicios.get(inicio) ?? [];
    lista.push(item);
    inicios.set(inicio, lista);

    if (item.status !== "cancelled") {
      for (let m = inicio + SLOT_STEP_MINUTES; m < fim; m += SLOT_STEP_MINUTES) {
        cobertas.add(m);
      }
    }
  }

  return (
    <ol className="divide-y divide-line border-y border-line">
      {horas.map((minuto) => {
        const naHora = inicios.get(minuto) ?? [];
        const ocupadaPorSessaoLonga = cobertas.has(minuto);

        return (
          <li key={minuto} className="grid grid-cols-[4.5rem_1fr] gap-4 py-4">
            <span
              className={cn(
                "numeric pt-1 text-sm",
                naHora.length > 0 ? "text-ink" : "text-ink-muted",
              )}
            >
              {toTimeString(minuto)}
            </span>

            <div className="space-y-4">
              {naHora.map((item) => (
                <CardAgendamento key={item.id} agendamento={item} />
              ))}

              {naHora.length === 0 ? (
                <p className="pt-1 text-sm text-ink-muted">
                  {ocupadaPorSessaoLonga ? "— em sessão —" : "— livre —"}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CardAgendamento({
  agendamento,
}: {
  agendamento: AppointmentWithRelations;
}) {
  const cancelado = agendamento.status === "cancelled";

  return (
    <Ficha
      className={cn(
        "max-w-2xl [--bg-ambiente:var(--bg)]",
        cancelado && "opacity-60",
        agendamento.status === "pending" && "border-gold-deep",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div>
          <p
            className={cn(
              "text-base text-ink",
              cancelado && "line-through decoration-1",
            )}
          >
            {agendamento.client_name}
          </p>
          <p className="numeric mt-1 text-sm text-ink-muted">
            {trimSeconds(agendamento.start_time)} –{" "}
            {trimSeconds(agendamento.end_time)} · {agendamento.duration_minutes}{" "}
            min
          </p>
        </div>
        <StatusBadge status={agendamento.status} />
      </div>

      <FichaPicote />

      <div className="space-y-3 px-5 py-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-ink">{agendamento.service.name}</span>
          <span className="text-ink-muted">{agendamento.artist.name}</span>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
          <a
            href={telHref(agendamento.client_phone)}
            className="numeric underline-offset-4 hover:text-ink hover:underline"
          >
            {formatPhone(agendamento.client_phone)}
          </a>
          <a
            href={`mailto:${agendamento.client_email}`}
            className="underline-offset-4 hover:text-ink hover:underline"
          >
            {agendamento.client_email}
          </a>
        </div>

        {agendamento.notes ? (
          <p className="text-sm leading-relaxed text-ink-muted">
            {agendamento.notes}
          </p>
        ) : null}

        {agendamento.reference_image_url ? (
          <Link
            href={agendamento.reference_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-gold-ink underline underline-offset-4 hover:text-ink"
          >
            Ver referência enviada →
          </Link>
        ) : null}
      </div>

      <div className="border-t border-line px-5 py-4">
        <AcoesStatus
          id={agendamento.id}
          status={agendamento.status}
          cliente={agendamento.client_name}
        />
      </div>
    </Ficha>
  );
}
