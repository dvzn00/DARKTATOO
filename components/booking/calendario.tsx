import Link from "next/link";

import { TituloPasso } from "@/components/booking/passos";
import { href, type BookingParams } from "@/lib/booking-url";
import { addDays, weekdayOf } from "@/lib/domain/time";
import { cn } from "@/lib/utils";

const DIAS_DA_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

interface Mes {
  chave: string;
  rotulo: string;
  /** 42 posições: `null` onde não há dia neste mês. */
  celulas: (string | null)[];
}

/**
 * Monta os meses cobertos pelo intervalo, já alinhados ao dia da semana.
 *
 * Toda a aritmética passa por `addDays`, que usa `Date.UTC` — nenhuma data
 * aqui é construída a partir do horário local da máquina.
 */
function montarMeses(primeiroDia: string, ultimoDia: string): Mes[] {
  const meses = new Map<string, string[]>();

  for (let dia = primeiroDia; dia <= ultimoDia; dia = addDays(dia, 1)) {
    const chave = dia.slice(0, 7);
    const lista = meses.get(chave);
    if (lista) lista.push(dia);
    else meses.set(chave, [dia]);
  }

  return [...meses.entries()].map(([chave, dias]) => {
    const primeiroDoMes = `${chave}-01`;
    const deslocamento = weekdayOf(primeiroDoMes);
    const celulas: (string | null)[] = Array(42).fill(null);

    for (const dia of dias) {
      const numeroDoDia = Number(dia.slice(8, 10));
      celulas[deslocamento + numeroDoDia - 1] = dia;
    }

    const [ano, mes] = chave.split("-").map(Number);
    const rotulo = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(ano, mes - 1, 1)));

    return { chave, rotulo, celulas };
  });
}

export function PassoData({
  params,
  primeiroDia,
  ultimoDia,
  datasLivres,
}: {
  params: BookingParams;
  primeiroDia: string;
  ultimoDia: string;
  /** Dias com ao menos um horário livre para o serviço e o artista escolhidos. */
  datasLivres: ReadonlySet<string>;
}) {
  const meses = montarMeses(primeiroDia, ultimoDia);

  return (
    <>
      <TituloPasso
        numero={3}
        titulo="Que dia?"
        apoio="A agenda abre 40 dias à frente. Dias sem horário livre aparecem apagados."
      />

      {datasLivres.size === 0 ? (
        <div className="border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-xl text-ink">
            Este artista está sem agenda nos próximos 40 dias.
          </p>
          <Link
            href={href({ service: params.service })}
            className="mt-6 inline-block text-sm text-gold-ink underline underline-offset-4 hover:text-ink"
          >
            Escolher o outro artista →
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {meses.map((mes) => (
            <section key={mes.chave}>
              <h2 className="text-sm capitalize text-ink-muted">
                {mes.rotulo}
              </h2>

              <div
                className="mt-4 grid grid-cols-7 gap-1"
                role="grid"
                aria-label={mes.rotulo}
              >
                {DIAS_DA_SEMANA.map((letra, indice) => (
                  <div
                    key={`${mes.chave}-cabecalho-${indice}`}
                    className="pb-2 text-center text-xs text-ink-faint"
                    aria-hidden
                  >
                    {letra}
                  </div>
                ))}

                {mes.celulas.map((dia, indice) => {
                  if (!dia) {
                    return (
                      <div
                        key={`${mes.chave}-vazio-${indice}`}
                        aria-hidden
                        className="aspect-square"
                      />
                    );
                  }

                  const numero = Number(dia.slice(8, 10));
                  const livre = datasLivres.has(dia);
                  const selecionado = params.date === dia;

                  if (!livre) {
                    return (
                      <div
                        key={dia}
                        className="numeric flex aspect-square items-center justify-center border border-transparent text-sm text-ink-faint"
                        aria-disabled="true"
                        title="Sem horário livre"
                      >
                        {numero}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={dia}
                      href={href({ ...params, date: dia, time: undefined })}
                      aria-current={selecionado ? "date" : undefined}
                      className={cn(
                        "numeric flex aspect-square items-center justify-center border text-sm transition-colors",
                        selecionado
                          ? "border-gold-deep bg-gold-soft text-ink"
                          : "border-line text-ink hover:border-gold-deep hover:bg-raised",
                      )}
                    >
                      {numero}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
