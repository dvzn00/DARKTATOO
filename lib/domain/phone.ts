/**
 * Formatação de telefone para exibição.
 *
 * O banco guarda só dígitos (10 a 13). A máscara é decidida aqui, na hora de
 * mostrar — e precisa cobrir os quatro comprimentos, não só os dois nacionais:
 * quem digita "+55 61 98320-7986" salva 13 dígitos, e sem este tratamento o
 * número aparecia cru na agenda do estúdio.
 */
export function formatPhone(valor: string): string {
  const d = valor.replace(/\D/g, "");

  // Fixo com DDD: (11) 3333-4444
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }

  // Celular com DDD: (11) 91234-5678
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  // Com código do país: +55 (11) 3333-4444
  if (d.length === 12) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }

  // Com código do país e celular: +55 (11) 91234-5678
  if (d.length === 13) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }

  // Comprimento que a validação não deveria ter deixado passar: mostra o que
  // veio, em vez de esconder o contato do cliente atrás de uma máscara errada.
  return valor;
}

/** Número no formato que `tel:` espera. */
export function telHref(valor: string): string {
  const d = valor.replace(/\D/g, "");
  return d.length > 11 ? `tel:+${d}` : `tel:${d}`;
}
