"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { createAppointment } from "@/lib/actions/booking";
import { cn } from "@/lib/utils";

interface Props {
  serviceId: string;
  artistId: string;
  date: string;
  startTime: string;
}

type ErrosPorCampo = Record<string, string[]>;

/**
 * A única parte do fluxo que precisa de JavaScript.
 *
 * As quatro etapas anteriores são links renderizados no servidor. Aqui há
 * texto para digitar, então o formulário é de cliente — mas a validação de
 * verdade continua no servidor: o que roda aqui serve para o erro aparecer
 * rápido, não para autorizar nada.
 */
export function FormularioDados({
  serviceId,
  artistId,
  date,
  startTime,
}: Props) {
  const router = useRouter();
  const [enviando, iniciarEnvio] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosPorCampo>({});
  const idBase = useId();

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);

    setErroGeral(null);
    setErros({});

    iniciarEnvio(async () => {
      const resultado = await createAppointment({
        serviceId,
        artistId,
        date,
        startTime,
        clientName: String(dados.get("clientName") ?? ""),
        clientEmail: String(dados.get("clientEmail") ?? ""),
        clientPhone: String(dados.get("clientPhone") ?? ""),
        referenceImageUrl: String(dados.get("referenceImageUrl") ?? ""),
        notes: String(dados.get("notes") ?? ""),
      });

      if (resultado.ok) {
        router.push(`/agendamento/${resultado.data.token}`);
        return;
      }

      setErroGeral(resultado.message);
      setErros(resultado.fieldErrors ?? {});
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      {erroGeral ? (
        <p
          role="alert"
          className="border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {erroGeral}
        </p>
      ) : null}

      <Campo
        id={`${idBase}-nome`}
        nome="clientName"
        rotulo="Nome completo"
        autoComplete="name"
        erros={erros.clientName}
        obrigatorio
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Campo
          id={`${idBase}-email`}
          nome="clientEmail"
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          erros={erros.clientEmail}
          obrigatorio
        />
        <Campo
          id={`${idBase}-telefone`}
          nome="clientPhone"
          rotulo="Telefone"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          erros={erros.clientPhone}
          obrigatorio
        />
      </div>

      <Campo
        id={`${idBase}-referencia`}
        nome="referenceImageUrl"
        rotulo="Link de referência"
        type="url"
        placeholder="https://…"
        ajuda="Opcional. Um post, uma pasta do Pinterest, qualquer coisa que mostre a ideia."
        erros={erros.referenceImageUrl}
      />

      <Campo
        id={`${idBase}-observacoes`}
        nome="notes"
        rotulo="Observações"
        multilinha
        ajuda="Opcional. Região do corpo, tamanho aproximado, o que mais ajudar."
        erros={erros.notes}
      />

      <p className="text-xs leading-relaxed text-ink-muted">
        Guardamos apenas nome, e-mail e telefone, para confirmar a sessão. Você
        não cria conta nem senha.
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-gold px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {enviando ? "Reservando…" : "Reservar horário"}
      </button>
    </form>
  );
}

function Campo({
  id,
  nome,
  rotulo,
  type = "text",
  autoComplete,
  placeholder,
  ajuda,
  erros,
  obrigatorio = false,
  multilinha = false,
}: {
  id: string;
  nome: string;
  rotulo: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  ajuda?: string;
  erros?: string[];
  obrigatorio?: boolean;
  multilinha?: boolean;
}) {
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const temErro = Boolean(erros?.length);

  const classes = cn(
    "w-full border bg-bg px-4 py-3 text-sm text-ink transition-colors placeholder:text-ink-muted",
    temErro ? "border-danger" : "border-line focus:border-gold-deep",
  );

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-ink">
        {rotulo}
        {!obrigatorio ? (
          <span className="ml-2 text-xs text-ink-muted">opcional</span>
        ) : null}
      </label>

      <div className="mt-2">
        {multilinha ? (
          <textarea
            id={id}
            name={nome}
            rows={4}
            placeholder={placeholder}
            aria-describedby={cn(ajuda && idAjuda, temErro && idErro)}
            aria-invalid={temErro || undefined}
            className={cn(classes, "resize-y")}
          />
        ) : (
          <input
            id={id}
            name={nome}
            type={type}
            autoComplete={autoComplete}
            placeholder={placeholder}
            aria-describedby={cn(ajuda && idAjuda, temErro && idErro)}
            aria-invalid={temErro || undefined}
            className={classes}
          />
        )}
      </div>

      {ajuda ? (
        <p id={idAjuda} className="mt-2 text-xs text-ink-muted">
          {ajuda}
        </p>
      ) : null}

      {temErro ? (
        <p id={idErro} role="alert" className="mt-2 text-xs text-danger">
          {erros?.[0]}
        </p>
      ) : null}
    </div>
  );
}
