/**
 * Transições de status — função pura.
 *
 * Um agendamento anda para frente, nunca para trás. `cancelled` e `completed`
 * são terminais: reabrir um cancelado devolveria ao cliente um horário que o
 * estúdio já pode ter dado a outra pessoa, e a EXCLUDE constraint recusaria a
 * gravação de qualquer jeito — melhor recusar antes, com uma frase que explica.
 */

import type { AppointmentStatus } from "./constants";

const TRANSICOES: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return TRANSICOES[from].includes(to);
}

export function allowedTransitions(
  from: AppointmentStatus,
): readonly AppointmentStatus[] {
  return TRANSICOES[from];
}

/** Por que a transição foi recusada, na voz da interface. */
export function transitionError(
  from: AppointmentStatus,
  to: AppointmentStatus,
): string {
  if (from === to) {
    return `Este agendamento já está como ${STATUS_LABELS[to]}.`;
  }
  if (allowedTransitions(from).length === 0) {
    return `Um agendamento ${STATUS_LABELS[from]} não muda mais de estado.`;
  }
  return `Não dá para ir de ${STATUS_LABELS[from]} para ${STATUS_LABELS[to]}.`;
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "pendente",
  confirmed: "confirmado",
  cancelled: "cancelado",
  completed: "concluído",
};
