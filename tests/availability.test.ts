import { describe, expect, it } from "vitest";

import {
  getAvailableSlots,
  hasAvailability,
  isSlotAvailable,
  toBusyIntervals,
  type BookedSlot,
} from "@/lib/domain/availability";
import type { StudioClock } from "@/lib/domain/time";

const ARTISTA_1 = "33333333-3333-4333-8333-333333333333";
const ARTISTA_2 = "44444444-4444-4444-8444-444444444444";

/** Relógio congelado: 10 de setembro de 2026, 09:00 — antes de abrir. */
const AGORA: StudioClock = { date: "2026-09-10", minutes: 9 * 60 };

const HOJE = "2026-09-10";
const AMANHA = "2026-09-11";
const ONTEM = "2026-09-09";

function agendamento(
  overrides: Partial<BookedSlot> & Pick<BookedSlot, "start_time" | "end_time">,
): BookedSlot {
  return {
    artist_id: ARTISTA_1,
    date: AMANHA,
    status: "confirmed",
    ...overrides,
  };
}

function horarios(
  duracao: number,
  agendamentos: BookedSlot[] = [],
  data = AMANHA,
  agora = AGORA,
): string[] {
  return getAvailableSlots({
    date: data,
    artistId: ARTISTA_1,
    serviceDurationMinutes: duracao,
    appointments: agendamentos,
    now: agora,
  }).map((slot) => slot.start);
}

describe("cenário 1 — dia sem nenhum agendamento", () => {
  it("oferece a grade inteira para um serviço de 60 min", () => {
    expect(horarios(60)).toEqual([
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
    ]);
  });

  it("devolve o intervalo completo, não só o início", () => {
    const [primeiro] = getAvailableSlots({
      date: AMANHA,
      artistId: ARTISTA_1,
      serviceDurationMinutes: 90,
      appointments: [],
      now: AGORA,
    });

    expect(primeiro).toMatchObject({ start: "10:00", end: "11:30" });
  });
});

describe("cenário 2 — dia com agendamentos", () => {
  it("remove as horas cobertas por uma sessão de 120 min", () => {
    const agenda = [agendamento({ start_time: "14:00", end_time: "16:00" })];

    expect(horarios(60, agenda)).toEqual([
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      // 14:00 e 15:00 estão ocupadas
      "16:00",
      "17:00",
      "18:00",
      "19:00",
    ]);
  });

  /**
   * O caso que derruba a unicidade simples `(artist_id, date, start_time)`.
   * Existe uma sessão de 60 min às 15:00. Um serviço de 120 min começando às
   * 14:00 tem `start_time` diferente — a unicidade deixaria passar, e o
   * estúdio ficaria com duas pessoas na mesma cadeira às 15h.
   */
  it("bloqueia sobreposição parcial entre durações diferentes", () => {
    const agenda = [agendamento({ start_time: "15:00", end_time: "16:00" })];
    const livres = horarios(120, agenda);

    expect(livres).not.toContain("14:00");
    expect(livres).not.toContain("15:00");
    expect(livres).toContain("16:00");
  });

  it("encosta sem sobrepor: uma sessão pode terminar quando a outra começa", () => {
    const agenda = [agendamento({ start_time: "16:00", end_time: "17:00" })];
    const livres = horarios(120, agenda);

    expect(livres).toContain("14:00"); // 14:00–16:00 encosta em 16:00
    expect(livres).not.toContain("15:00"); // 15:00–17:00 invade
  });

  it("conta agendamento pendente como ocupado", () => {
    const agenda = [
      agendamento({ start_time: "11:00", end_time: "12:00", status: "pending" }),
    ];

    expect(horarios(60, agenda)).not.toContain("11:00");
  });

  it("devolve o horário quando a sessão é cancelada", () => {
    const agenda = [
      agendamento({
        start_time: "11:00",
        end_time: "12:00",
        status: "cancelled",
      }),
    ];

    expect(horarios(60, agenda)).toContain("11:00");
  });

  it("não deixa a agenda de um artista bloquear a do outro", () => {
    const agenda = [
      agendamento({
        start_time: "11:00",
        end_time: "12:00",
        artist_id: ARTISTA_2,
      }),
    ];

    expect(horarios(60, agenda)).toContain("11:00");
  });

  it("ignora agendamento de outro dia", () => {
    const agenda = [
      agendamento({ start_time: "11:00", end_time: "12:00", date: HOJE }),
    ];

    expect(horarios(60, agenda)).toContain("11:00");
  });
});

describe("cenário 3 — fim de expediente", () => {
  it("o que precisa caber é o FIM da sessão, não o início", () => {
    // 19:00 é um horário válido para 60 min, mas não para 90 nem 120.
    expect(horarios(60).at(-1)).toBe("19:00");
    expect(horarios(90).at(-1)).toBe("18:00");
    expect(horarios(120).at(-1)).toBe("18:00");
  });

  it("a última sessão de 120 min termina exatamente às 20:00", () => {
    const ultimo = getAvailableSlots({
      date: AMANHA,
      artistId: ARTISTA_1,
      serviceDurationMinutes: 120,
      appointments: [],
      now: AGORA,
    }).at(-1);

    expect(ultimo).toMatchObject({ start: "18:00", end: "20:00" });
  });

  it("fica sem horário nenhum quando o dia inteiro está tomado", () => {
    const agenda = [agendamento({ start_time: "10:00", end_time: "20:00" })];

    expect(horarios(60, agenda)).toEqual([]);
    expect(
      hasAvailability({
        date: AMANHA,
        artistId: ARTISTA_1,
        serviceDurationMinutes: 60,
        appointments: agenda,
        now: AGORA,
      }),
    ).toBe(false);
  });
});

describe("cenário 4 — passado", () => {
  it("dia que já passou não tem horário nenhum", () => {
    expect(horarios(60, [], ONTEM)).toEqual([]);
  });

  it("hoje, só oferece o que ainda não começou", () => {
    const agoraTarde: StudioClock = { date: HOJE, minutes: 14 * 60 + 30 };

    expect(horarios(60, [], HOJE, agoraTarde)).toEqual([
      "15:00",
      "16:00",
      "17:00",
      "18:00",
      "19:00",
    ]);
  });

  it("a hora em curso não conta como disponível", () => {
    const agoraEmPonto: StudioClock = { date: HOJE, minutes: 15 * 60 };

    expect(horarios(60, [], HOJE, agoraEmPonto)).not.toContain("15:00");
  });

  it("no fim do expediente de hoje, sobra nada", () => {
    const agoraTarde: StudioClock = { date: HOJE, minutes: 19 * 60 + 30 };

    expect(horarios(60, [], HOJE, agoraTarde)).toEqual([]);
  });
});

describe("helpers", () => {
  it("toBusyIntervals recorta exatamente como o WHERE da EXCLUDE constraint", () => {
    const agenda: BookedSlot[] = [
      agendamento({ start_time: "10:00", end_time: "11:00" }),
      agendamento({ start_time: "11:00", end_time: "12:00", status: "pending" }),
      agendamento({
        start_time: "12:00",
        end_time: "13:00",
        status: "cancelled",
      }),
      agendamento({
        start_time: "13:00",
        end_time: "14:00",
        status: "completed",
      }),
    ];

    expect(toBusyIntervals(agenda, ARTISTA_1, AMANHA)).toEqual([
      { start: 600, end: 660 },
      { start: 660, end: 720 },
    ]);
  });

  it("isSlotAvailable concorda com a lista", () => {
    const agenda = [agendamento({ start_time: "14:00", end_time: "16:00" })];
    const entrada = {
      date: AMANHA,
      artistId: ARTISTA_1,
      serviceDurationMinutes: 60,
      appointments: agenda,
      now: AGORA,
    };

    expect(isSlotAvailable(entrada, "13:00")).toBe(true);
    expect(isSlotAvailable(entrada, "14:00")).toBe(false);
    expect(isSlotAvailable(entrada, "10:30")).toBe(false); // fora da grade
  });

  it("recusa duração de serviço absurda", () => {
    expect(() => horarios(0)).toThrow(RangeError);
    expect(() => horarios(-60)).toThrow(RangeError);
  });
});
