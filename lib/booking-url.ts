/**
 * Estado do agendamento na URL.
 *
 * Não há Context nem store: cada escolha é um link que acrescenta um parâmetro.
 * Isso dá de graça o que um wizard com estado em memória custa a implementar —
 * recarregar não perde nada, o botão voltar do navegador funciona, e o link
 * pode ser compartilhado ou reaberto depois.
 */

export interface BookingParams {
  service?: string;
  artist?: string;
  date?: string;
  time?: string;
}

export const PASSOS = [
  { numero: 1, rotulo: "Serviço" },
  { numero: 2, rotulo: "Artista" },
  { numero: 3, rotulo: "Data" },
  { numero: 4, rotulo: "Horário" },
  { numero: 5, rotulo: "Seus dados" },
] as const;

/** Em que etapa a URL atual está. */
export function passoAtual(params: BookingParams): number {
  if (!params.service) return 1;
  if (!params.artist) return 2;
  if (!params.date) return 3;
  if (!params.time) return 4;
  return 5;
}

export function href(params: BookingParams): string {
  const busca = new URLSearchParams();
  if (params.service) busca.set("service", params.service);
  if (params.artist) busca.set("artist", params.artist);
  if (params.date) busca.set("date", params.date);
  if (params.time) busca.set("time", params.time);

  const query = busca.toString();
  return query ? `/agendar?${query}` : "/agendar";
}

/**
 * Link para voltar a uma etapa.
 *
 * Voltar limpa tudo que veio depois: trocar de serviço com um horário já
 * escolhido deixaria na URL um horário calculado para outra duração.
 */
export function hrefDoPasso(params: BookingParams, passo: number): string {
  if (passo <= 1) return href({});
  if (passo === 2) return href({ service: params.service });
  if (passo === 3) return href({ service: params.service, artist: params.artist });
  if (passo === 4) {
    return href({
      service: params.service,
      artist: params.artist,
      date: params.date,
    });
  }
  return href(params);
}
