import { renderToBuffer } from "@react-pdf/renderer";

import { getAdminSession } from "@/lib/auth";
import { getAppointmentsByDate } from "@/lib/data/appointments";
import { getArtistById } from "@/lib/data/catalog";
import { STUDIO_TIMEZONE } from "@/lib/domain/constants";
import { isDateString } from "@/lib/domain/time";
import { DailyReport } from "@/lib/pdf/daily-report";

/** @react-pdf/renderer precisa de Node, não do runtime Edge. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export-pdf?date=YYYY-MM-DD&artist=<uuid>
 *
 * Só o admin. A checagem vem antes de qualquer leitura: o PDF traz nome,
 * telefone e e-mail dos clientes, então esta rota é uma porta trancada, não
 * um relatório público com URL difícil de adivinhar.
 */
/** Header HTTP não aceita acento: "Íris" viraria lixo no nome do arquivo. */
function apenasAscii(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

export async function GET(request: Request): Promise<Response> {
  const session = await getAdminSession();

  if (!session) {
    return new Response("Não autorizado.", {
      status: 401,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const params = new URL(request.url).searchParams;
  const date = params.get("date");
  const artistId = params.get("artist");

  if (!date || !isDateString(date)) {
    return new Response("Informe uma data no formato AAAA-MM-DD.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const artist = artistId ? await getArtistById(artistId) : null;

  if (artistId && !artist) {
    return new Response("Tatuador não encontrado.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const appointments = await getAppointmentsByDate(date, artist?.id);

  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: STUDIO_TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  // Sem agendamentos o PDF não vem vazio: vem com a frase que explica.
  const buffer = await renderToBuffer(
    <DailyReport
      date={date}
      appointments={appointments}
      artistName={artist?.name}
      generatedAt={generatedAt}
    />,
  );

  const sufixo = artist ? `-${apenasAscii(artist.name.split(" ")[0])}` : "";
  const nomeArquivo = `dark-ink-agenda-${date}${sufixo}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${nomeArquivo}"`,
      "cache-control": "no-store",
    },
  });
}
