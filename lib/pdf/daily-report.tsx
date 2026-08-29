import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { formatPhone } from "@/lib/domain/phone";
import { formatDateLong, trimSeconds } from "@/lib/domain/time";
import { STATUS_LABELS } from "@/lib/domain/status";
import type { AppointmentWithRelations } from "@/types/domain";

/**
 * O relatório do dia — a mesma ficha do estúdio, impressa.
 *
 * Usa Times-Roman e Helvetica, as faces embutidas no PDF. Cormorant e Plus
 * Jakarta só entrariam aqui como arquivos TTF empacotados no repositório; para
 * o MVP, uma serifada clássica no título guarda o mesmo gesto sem somar peso
 * nem uma busca de rede no meio da geração do arquivo.
 */

const cor = {
  ink: "#2D2A24",
  inkMuted: "#6B6770",
  inkFaint: "#A5A09A",
  gold: "#C9A75C",
  goldInk: "#7A5F1E",
  line: "#E3DCD2",
  surface: "#F3EFE8",
} as const;

const estilos = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: cor.ink,
    backgroundColor: "#FFFFFF",
  },

  eyebrow: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    letterSpacing: 2,
    color: cor.goldInk,
    marginBottom: 10,
  },
  titulo: {
    fontFamily: "Times-Roman",
    fontSize: 26,
    color: cor.ink,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 10,
    color: cor.inkMuted,
    marginBottom: 2,
  },
  regraOuro: {
    marginTop: 18,
    marginBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: cor.gold,
  },

  cabecalhoTabela: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: cor.ink,
    paddingBottom: 6,
    marginBottom: 2,
  },
  rotulo: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: cor.inkMuted,
  },

  linha: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: cor.line,
  },

  colHora: { width: "20%", paddingRight: 8 },
  colCliente: { width: "28%", paddingRight: 8 },
  colServico: { width: "24%", paddingRight: 8 },
  colArtista: { width: "18%", paddingRight: 8 },
  colStatus: { width: "10%", textAlign: "right" },

  hora: { fontSize: 11, color: cor.ink },
  duracao: { fontSize: 8, color: cor.inkFaint, marginTop: 2 },
  nome: { fontSize: 10.5, color: cor.ink },
  contato: { fontSize: 8, color: cor.inkMuted, marginTop: 2 },
  celula: { fontSize: 9.5, color: cor.inkMuted },
  status: { fontSize: 8, color: cor.goldInk },
  cancelado: { fontSize: 8, color: cor.inkFaint },

  observacao: {
    marginTop: 4,
    fontSize: 8,
    color: cor.inkMuted,
  },

  vazio: {
    marginTop: 90,
    textAlign: "center",
  },
  vazioTitulo: {
    fontFamily: "Times-Roman",
    fontSize: 15,
    color: cor.inkMuted,
  },
  vazioApoio: {
    marginTop: 8,
    fontSize: 9.5,
    color: cor.inkFaint,
  },

  rodape: {
    position: "absolute",
    bottom: 30,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: cor.line,
    paddingTop: 8,
  },
  rodapeTexto: { fontSize: 7.5, color: cor.inkFaint },
});

export interface DailyReportProps {
  date: string;
  appointments: readonly AppointmentWithRelations[];
  /** Nome do tatuador, quando a agenda está filtrada. */
  artistName?: string;
  /** Momento da emissão, já formatado no fuso do estúdio. */
  generatedAt: string;
}

export function DailyReport({
  date,
  appointments,
  artistName,
  generatedAt,
}: DailyReportProps) {
  const ativos = appointments.filter((item) => item.status !== "cancelled");

  return (
    <Document
      title={`Dark Ink Studio — agenda de ${date}`}
      author="Dark Ink Studio"
    >
      <Page size="A4" style={estilos.page}>
        <Text style={estilos.eyebrow}>DARK INK STUDIO</Text>
        <Text style={estilos.titulo}>Agenda do dia</Text>
        <Text style={estilos.subtitulo}>{formatDateLong(date)}</Text>
        {artistName ? (
          <Text style={estilos.subtitulo}>Tatuador: {artistName}</Text>
        ) : null}

        <View style={estilos.regraOuro} />

        {appointments.length === 0 ? (
          <View style={estilos.vazio}>
            <Text style={estilos.vazioTitulo}>
              Nenhuma sessão agendada para esta data.
            </Text>
            <Text style={estilos.vazioApoio}>
              As duas cadeiras ficam livres das 10h às 20h.
            </Text>
          </View>
        ) : (
          <View>
            <View style={estilos.cabecalhoTabela}>
              <Text style={[estilos.rotulo, estilos.colHora]}>HORÁRIO</Text>
              <Text style={[estilos.rotulo, estilos.colCliente]}>CLIENTE</Text>
              <Text style={[estilos.rotulo, estilos.colServico]}>SERVIÇO</Text>
              <Text style={[estilos.rotulo, estilos.colArtista]}>TATUADOR</Text>
              <Text style={[estilos.rotulo, estilos.colStatus]}>STATUS</Text>
            </View>

            {appointments.map((item) => (
              <View key={item.id} style={estilos.linha} wrap={false}>
                <View style={estilos.colHora}>
                  <Text style={estilos.hora}>
                    {trimSeconds(item.start_time)} –{" "}
                    {trimSeconds(item.end_time)}
                  </Text>
                  <Text style={estilos.duracao}>
                    {item.duration_minutes} min
                  </Text>
                </View>

                <View style={estilos.colCliente}>
                  <Text style={estilos.nome}>{item.client_name}</Text>
                  <Text style={estilos.contato}>
                    {formatPhone(item.client_phone)}
                  </Text>
                  <Text style={estilos.contato}>{item.client_email}</Text>
                  {item.notes ? (
                    <Text style={estilos.observacao}>{item.notes}</Text>
                  ) : null}
                </View>

                <Text style={[estilos.celula, estilos.colServico]}>
                  {item.service.name}
                </Text>
                <Text style={[estilos.celula, estilos.colArtista]}>
                  {item.artist.name}
                </Text>
                <Text
                  style={[
                    item.status === "cancelled"
                      ? estilos.cancelado
                      : estilos.status,
                    estilos.colStatus,
                  ]}
                >
                  {STATUS_LABELS[item.status].toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={estilos.rodape} fixed>
          <Text style={estilos.rodapeTexto}>
            {ativos.length === 1
              ? "1 sessão agendada"
              : `${ativos.length} sessões agendadas`}
            {appointments.length !== ativos.length
              ? ` · ${appointments.length - ativos.length} cancelada(s)`
              : ""}
          </Text>
          <Text
            style={estilos.rodapeTexto}
            render={({ pageNumber, totalPages }) =>
              `Emitido em ${generatedAt} · página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
