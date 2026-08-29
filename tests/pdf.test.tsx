import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

import { DailyReport } from "@/lib/pdf/daily-report";
import type { AppointmentWithRelations } from "@/types/domain";

const AGENDAMENTO: AppointmentWithRelations = {
  id: "11111111-1111-4111-8111-111111111111",
  public_token: "55555555-5555-4555-8555-555555555555",
  client_name: "Marina Duarte",
  client_email: "marina.demo@exemplo.com",
  client_phone: "11912345678",
  date: "2026-09-11",
  start_time: "14:00:00",
  end_time: "16:00:00",
  duration_minutes: 120,
  price_snapshot: 1200,
  status: "confirmed",
  reference_image_url: null,
  notes: "Referência enviada por e-mail.",
  service: { id: "22222222-2222-4222-8222-222222222222", name: "Realismo" },
  artist: { id: "33333333-3333-4333-8333-333333333333", name: "Íris Bandeira" },
};

/** Um PDF de verdade começa com os bytes `%PDF`. */
function ehPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 4).toString("latin1") === "%PDF";
}

describe("relatório do dia em PDF", () => {
  it("gera um arquivo válido com agendamentos", async () => {
    const buffer = await renderToBuffer(
      <DailyReport
        date="2026-09-11"
        appointments={[AGENDAMENTO]}
        generatedAt="11/09/2026 09:30"
      />,
    );

    expect(ehPdf(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
  }, 30_000);

  /** A condição de contorno do briefing: dia sem nada não vira página em branco. */
  it("gera um arquivo válido quando não há nenhum agendamento", async () => {
    const buffer = await renderToBuffer(
      <DailyReport
        date="2026-09-12"
        appointments={[]}
        generatedAt="11/09/2026 09:30"
      />,
    );

    expect(ehPdf(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
  }, 30_000);

  it("aceita o filtro por tatuador", async () => {
    const buffer = await renderToBuffer(
      <DailyReport
        date="2026-09-11"
        appointments={[AGENDAMENTO]}
        artistName="Íris Bandeira"
        generatedAt="11/09/2026 09:30"
      />,
    );

    expect(ehPdf(buffer)).toBe(true);
  }, 30_000);
});
