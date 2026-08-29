"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateAppointmentStatus } from "@/lib/actions/admin";
import { allowedTransitions, STATUS_LABELS } from "@/lib/domain/status";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/domain";

const VERBO: Partial<Record<AppointmentStatus, string>> = {
  confirmed: "Confirmar",
  completed: "Concluir",
  cancelled: "Cancelar",
};

/**
 * Os botões de cada agendamento.
 *
 * Só aparecem as transições que a regra de domínio permite — em vez de mostrar
 * tudo e recusar depois. Cancelar pede confirmação porque, para o cliente, é
 * irreversível: o horário volta para a agenda na hora.
 */
export function AcoesStatus({
  id,
  status,
  cliente,
}: {
  id: string;
  status: AppointmentStatus;
  cliente: string;
}) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  const permitidas = allowedTransitions(status);

  if (permitidas.length === 0) return null;

  function aplicar(destino: AppointmentStatus) {
    setErro(null);
    iniciar(async () => {
      const resultado = await updateAppointmentStatus({ id, status: destino });
      if (resultado.ok) {
        setConfirmandoCancelamento(false);
        router.refresh();
        return;
      }
      setErro(resultado.message);
    });
  }

  if (confirmandoCancelamento) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink">
          Cancelar a sessão de {cliente}? O horário volta para a agenda
          imediatamente.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={salvando}
            onClick={() => aplicar("cancelled")}
            className="rounded-sm border border-danger px-4 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-60"
          >
            {salvando ? "Cancelando…" : "Sim, cancelar"}
          </button>
          <button
            type="button"
            disabled={salvando}
            onClick={() => setConfirmandoCancelamento(false)}
            className="rounded-sm border border-line px-4 py-2 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            Manter a sessão
          </button>
        </div>
        {erro ? (
          <p role="alert" className="text-xs text-danger">
            {erro}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {permitidas.map((destino) => {
          const cancelar = destino === "cancelled";

          return (
            <button
              key={destino}
              type="button"
              disabled={salvando}
              onClick={() =>
                cancelar
                  ? setConfirmandoCancelamento(true)
                  : aplicar(destino)
              }
              className={cn(
                "rounded-sm px-4 py-2 text-xs font-medium transition-colors disabled:opacity-60",
                cancelar
                  ? "border border-line text-ink-muted hover:border-danger hover:text-danger"
                  : "bg-gold text-ink hover:bg-gold-deep",
              )}
            >
              {VERBO[destino] ?? STATUS_LABELS[destino]}
            </button>
          );
        })}
      </div>

      {erro ? (
        <p role="alert" className="text-xs text-danger">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
