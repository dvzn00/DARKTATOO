import { describe, expect, it } from "vitest";

import type { BookedSlot } from "@/lib/domain/availability";
import {
  validateBooking,
  type BookingContext,
} from "@/lib/domain/booking-rules";
import type { StudioClock } from "@/lib/domain/time";
import { mapDatabaseError } from "@/lib/errors";

const SERVICO = "22222222-2222-4222-8222-222222222222";
const ARTISTA = "33333333-3333-4333-8333-333333333333";

const AGORA: StudioClock = { date: "2026-09-10", minutes: 9 * 60 };

function contexto(
  overrides: Partial<BookingContext> = {},
  agendamentos: BookedSlot[] = [],
): BookingContext {
  return {
    service: { id: SERVICO, duration_minutes: 120, is_active: true },
    artist: { id: ARTISTA, is_active: true },
    appointments: agendamentos,
    now: AGORA,
    ...overrides,
  };
}

function pedido(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: SERVICO,
    artistId: ARTISTA,
    date: "2026-09-11",
    startTime: "14:00",
    clientName: "Marina Alves",
    clientEmail: "Marina@Exemplo.com ",
    clientPhone: "(11) 91234-5678",
    ...overrides,
  };
}

describe("agendamento válido", () => {
  it("aceita e calcula o fim a partir da duração do serviço", () => {
    const resultado = validateBooking(pedido(), contexto());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.value.endTime).toBe("16:00");
    expect(resultado.value.durationMinutes).toBe(120);
  });

  it("normaliza e-mail e telefone", () => {
    const resultado = validateBooking(pedido(), contexto());

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.value.clientEmail).toBe("marina@exemplo.com");
    expect(resultado.value.clientPhone).toBe("11912345678");
  });

  it("transforma campos opcionais vazios em null, nunca em string vazia", () => {
    const resultado = validateBooking(
      pedido({ notes: "   ", referenceImageUrl: "" }),
      contexto(),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.value.notes).toBeNull();
    expect(resultado.value.referenceImageUrl).toBeNull();
  });
});

describe("forma dos dados", () => {
  it("aponta o campo errado, não um erro genérico", () => {
    const resultado = validateBooking(
      pedido({ clientEmail: "marina@", clientName: "M" }),
      contexto(),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;

    expect(resultado.code).toBe("INVALID_INPUT");
    expect(resultado.fieldErrors).toHaveProperty("clientEmail");
    expect(resultado.fieldErrors).toHaveProperty("clientName");
  });

  it("recusa telefone sem DDD", () => {
    const resultado = validateBooking(
      pedido({ clientPhone: "91234567" }),
      contexto(),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.fieldErrors).toHaveProperty("clientPhone");
  });

  it("recusa link de referência que não seja https", () => {
    const resultado = validateBooking(
      pedido({ referenceImageUrl: "http://exemplo.com/tattoo.jpg" }),
      contexto(),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("INVALID_INPUT");
  });

  it("nunca aceita um campo de senha — ele simplesmente não existe", () => {
    const resultado = validateBooking(
      pedido({ password: "hunter2" }),
      contexto(),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value).not.toHaveProperty("password");
  });
});

describe("catálogo", () => {
  it("recusa serviço fora do catálogo", () => {
    const resultado = validateBooking(pedido(), contexto({ service: undefined }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("SERVICE_NOT_FOUND");
  });

  it("recusa serviço desativado", () => {
    const resultado = validateBooking(
      pedido(),
      contexto({
        service: { id: SERVICO, duration_minutes: 120, is_active: false },
      }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("SERVICE_NOT_FOUND");
  });

  it("recusa artista desativado", () => {
    const resultado = validateBooking(
      pedido(),
      contexto({ artist: { id: ARTISTA, is_active: false } }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("ARTIST_NOT_FOUND");
  });
});

describe("calendário e expediente", () => {
  it("bloqueia data no passado", () => {
    const resultado = validateBooking(
      pedido({ date: "2026-09-09" }),
      contexto(),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("PAST_SLOT");
  });

  it("bloqueia horário de hoje que já passou", () => {
    const resultado = validateBooking(
      pedido({ date: "2026-09-10", startTime: "10:00" }),
      contexto({ now: { date: "2026-09-10", minutes: 15 * 60 } }),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("PAST_SLOT");
  });

  it("bloqueia data além do horizonte de 40 dias", () => {
    const resultado = validateBooking(
      pedido({ date: "2026-10-21" }),
      contexto(),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("OUTSIDE_HORIZON");
  });

  it("aceita exatamente o último dia do horizonte", () => {
    const resultado = validateBooking(
      pedido({ date: "2026-10-20" }),
      contexto(),
    );

    expect(resultado.ok).toBe(true);
  });

  it("bloqueia sessão que terminaria depois das 20h", () => {
    const resultado = validateBooking(
      pedido({ startTime: "19:00" }), // 19:00 + 120 min = 21:00
      contexto(),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("OUTSIDE_BUSINESS_HOURS");
  });

  it("bloqueia horário antes da abertura", () => {
    const resultado = validateBooking(
      pedido({ startTime: "09:00" }),
      contexto(),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("OUTSIDE_BUSINESS_HOURS");
  });

  it("bloqueia horário fora da grade", () => {
    const resultado = validateBooking(
      pedido({ startTime: "14:30" }),
      contexto(),
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("OFF_GRID");
  });
});

describe("conflito de agenda", () => {
  const ocupado: BookedSlot[] = [
    {
      artist_id: ARTISTA,
      date: "2026-09-11",
      start_time: "15:00",
      end_time: "16:00",
      status: "confirmed",
    },
  ];

  it("recusa horário que sobrepõe uma sessão existente", () => {
    // 14:00–16:00 invade a sessão de 15:00–16:00.
    const resultado = validateBooking(pedido(), contexto({}, ocupado));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.code).toBe("SLOT_TAKEN");
    expect(resultado.message).toContain("acabou de ser reservado");
  });

  it("aceita horário que apenas encosta no existente", () => {
    const resultado = validateBooking(
      pedido({ startTime: "16:00" }),
      contexto({}, ocupado),
    );

    expect(resultado.ok).toBe(true);
  });
});

describe("erros vindos do banco", () => {
  it("traduz a EXCLUDE constraint em conflito de horário", () => {
    expect(
      mapDatabaseError({
        code: "23P01",
        message: 'conflicting key value violates exclusion constraint',
        constraint: "appointments_no_overlap",
      }),
    ).toBe("SLOT_TAKEN");
  });

  it("reconhece o trigger de data passada", () => {
    expect(mapDatabaseError({ code: "23514", message: "PAST_SLOT" })).toBe(
      "PAST_SLOT",
    );
  });

  it("reconhece o CHECK de horário comercial", () => {
    expect(
      mapDatabaseError({ code: "23514", constraint: "chk_business_hours" }),
    ).toBe("OUTSIDE_BUSINESS_HOURS");
  });

  it("distingue artista de serviço na chave estrangeira", () => {
    expect(
      mapDatabaseError({
        code: "23503",
        constraint: "appointments_artist_id_fkey",
      }),
    ).toBe("ARTIST_NOT_FOUND");

    expect(
      mapDatabaseError({
        code: "23503",
        constraint: "appointments_service_id_fkey",
      }),
    ).toBe("SERVICE_NOT_FOUND");
  });

  it("não inventa causa para erro desconhecido", () => {
    expect(mapDatabaseError(new Error("boom"))).toBe("UNKNOWN");
    expect(mapDatabaseError(null)).toBe("UNKNOWN");
  });
});
