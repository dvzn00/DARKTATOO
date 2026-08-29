import {
  Ficha,
  FichaCabecalho,
  FichaLinha,
  FichaPicote,
} from "@/components/shared/ficha";
import { addMinutes, formatDateShort } from "@/lib/domain/time";
import type { ServiceRow, TattooArtistRow } from "@/types/database";

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/**
 * A ficha que se preenche.
 *
 * Não é um resumo do carrinho: é o objeto que o cliente está construindo. Cada
 * linha existe desde a primeira etapa, vazia, e vai sendo escrita — como uma
 * ficha de papel na bancada do estúdio.
 */
export function FichaAgendamento({
  servico,
  artista,
  data,
  horario,
}: {
  servico: ServiceRow | null;
  artista: TattooArtistRow | null;
  data?: string;
  horario?: string;
}) {
  const intervalo =
    horario && servico
      ? `${horario} – ${addMinutes(horario, servico.duration_minutes)}`
      : null;

  return (
    <Ficha className="[--bg-ambiente:var(--surface)]">
      <FichaCabecalho titulo="Ficha de sessão" numero="Dark Ink Studio" />
      <FichaPicote />

      <dl className="space-y-4 px-6 py-7">
        <FichaLinha rotulo="Serviço" valor={servico?.name} />
        <FichaLinha
          rotulo="Duração"
          valor={servico ? `${servico.duration_minutes} min` : null}
          numerico
        />
        <FichaLinha rotulo="Artista" valor={artista?.name} />
        <FichaLinha
          rotulo="Data"
          valor={data ? formatDateShort(data) : null}
          numerico
        />
        <FichaLinha rotulo="Horário" valor={intervalo} numerico />
      </dl>

      <div className="border-t border-line px-6 py-5">
        <div className="ficha-linha">
          <dt className="text-ink">A partir de</dt>
          <span className="preenchimento" aria-hidden />
          <dd className="numeric text-lg text-gold-ink">
            {servico ? MOEDA.format(Number(servico.price)) : "—"}
          </dd>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          O valor final é fechado na conversa, conforme tamanho e região.
        </p>
      </div>
    </Ficha>
  );
}
