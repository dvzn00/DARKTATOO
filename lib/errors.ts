/**
 * Erros de agendamento, com a mensagem que o cliente lê.
 *
 * Regra de escrita (skill de frontend): um erro diz o que aconteceu e o que
 * fazer a seguir. Não pede desculpas, não é vago, e não expõe nada do banco.
 */

export const BOOKING_ERROR_CODES = [
  "INVALID_INPUT",
  "SERVICE_NOT_FOUND",
  "ARTIST_NOT_FOUND",
  "PAST_SLOT",
  "OUTSIDE_HORIZON",
  "OUTSIDE_BUSINESS_HOURS",
  "OFF_GRID",
  "SLOT_TAKEN",
  "UNKNOWN",
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

export const BOOKING_ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  INVALID_INPUT: "Revise os campos destacados e envie de novo.",
  SERVICE_NOT_FOUND: "Este serviço saiu do catálogo. Escolha outro.",
  ARTIST_NOT_FOUND: "Este tatuador não está atendendo. Escolha o outro.",
  PAST_SLOT: "Este horário já passou. Escolha um horário à frente.",
  OUTSIDE_HORIZON: "A agenda ainda não abriu para esta data.",
  OUTSIDE_BUSINESS_HOURS: "O estúdio atende das 10h às 20h.",
  OFF_GRID: "Este horário não existe na agenda. Escolha um da lista.",
  SLOT_TAKEN: "Este horário acabou de ser reservado. Escolha outro.",
  UNKNOWN: "Não foi possível concluir o agendamento. Tente novamente.",
};

export function bookingErrorMessage(code: BookingErrorCode): string {
  return BOOKING_ERROR_MESSAGES[code];
}

/** Formato do erro que o PostgREST devolve. */
interface DatabaseErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  constraint?: string | null;
}

function readDatabaseError(error: unknown): DatabaseErrorLike | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as Record<string, unknown>;
  const pick = (key: string): string | null =>
    typeof candidate[key] === "string" ? (candidate[key] as string) : null;

  return {
    code: pick("code"),
    message: pick("message"),
    details: pick("details"),
    constraint: pick("constraint"),
  };
}

/**
 * Traduz o erro do Postgres em um código de domínio.
 *
 * É a última linha de defesa: mesmo que a checagem em TypeScript passe, o
 * banco pode recusar a gravação — e é exatamente isso que queremos quando dois
 * clientes disputam o mesmo horário no mesmo instante (BLOCO 0 §1.1).
 */
export function mapDatabaseError(error: unknown): BookingErrorCode {
  const database = readDatabaseError(error);
  if (!database) return "UNKNOWN";

  const context =
    `${database.constraint ?? ""} ${database.message ?? ""} ${database.details ?? ""}`.toLowerCase();

  switch (database.code) {
    // exclusion_violation — a EXCLUDE constraint pegou uma sobreposição.
    case "23P01":
      return "SLOT_TAKEN";

    // unique_violation — não deve acontecer na agenda, mas trate como conflito.
    case "23505":
      return "SLOT_TAKEN";

    // check_violation — qual CHECK falhou está no nome da constraint.
    case "23514":
      if (context.includes("past_slot")) return "PAST_SLOT";
      if (context.includes("business_hours")) return "OUTSIDE_BUSINESS_HOURS";
      if (context.includes("slot_grid")) return "OFF_GRID";
      return "INVALID_INPUT";

    // foreign_key_violation — serviço ou artista sumiu entre a escolha e o envio.
    case "23503":
      if (context.includes("artist")) return "ARTIST_NOT_FOUND";
      return "SERVICE_NOT_FOUND";

    default:
      return "UNKNOWN";
  }
}
