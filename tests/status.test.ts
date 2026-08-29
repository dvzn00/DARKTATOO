import { describe, expect, it } from "vitest";

import { APPOINTMENT_STATUSES } from "@/lib/domain/constants";
import {
  allowedTransitions,
  canTransition,
  transitionError,
} from "@/lib/domain/status";

describe("transições de status", () => {
  it("um agendamento pendente pode ser confirmado ou cancelado", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
  });

  it("um agendamento confirmado pode ser concluído ou cancelado", () => {
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
  });

  it("não pula direto de pendente para concluído", () => {
    expect(canTransition("pending", "completed")).toBe(false);
  });

  /**
   * A regra que protege o cliente: reabrir um cancelado devolveria um horário
   * que o estúdio já pode ter dado a outra pessoa — e a EXCLUDE constraint
   * recusaria a gravação de qualquer jeito.
   */
  it("cancelado e concluído são terminais", () => {
    for (const destino of APPOINTMENT_STATUSES) {
      expect(canTransition("cancelled", destino)).toBe(false);
      expect(canTransition("completed", destino)).toBe(false);
    }
    expect(allowedTransitions("cancelled")).toEqual([]);
    expect(allowedTransitions("completed")).toEqual([]);
  });

  it("nunca volta para pendente", () => {
    for (const origem of APPOINTMENT_STATUSES) {
      expect(canTransition(origem, "pending")).toBe(false);
    }
  });

  it("não transiciona para o mesmo estado", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe("mensagem de recusa", () => {
  it("diz que já está no estado quando origem e destino são iguais", () => {
    expect(transitionError("confirmed", "confirmed")).toBe(
      "Este agendamento já está como confirmado.",
    );
  });

  it("explica que um estado terminal não muda mais", () => {
    expect(transitionError("cancelled", "confirmed")).toBe(
      "Um agendamento cancelado não muda mais de estado.",
    );
  });

  it("nomeia origem e destino nas demais recusas", () => {
    expect(transitionError("pending", "completed")).toBe(
      "Não dá para ir de pendente para concluído.",
    );
  });
});
