import Link from "next/link";

import { STATUS_LABELS } from "@/lib/domain/status";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types/domain";

/** Seção da landing: respiro generoso, largura de leitura controlada. */
export function Secao({
  id,
  className,
  fundo = "bg",
  children,
}: {
  id?: string;
  className?: string;
  fundo?: "bg" | "surface";
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "px-6 py-20 sm:px-8 md:py-28",
        fundo === "surface" && "bg-surface",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function TituloSecao({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("mt-5 text-2xl text-ink md:text-3xl", className)}>
      {children}
    </h2>
  );
}

const ESTILO_STATUS: Record<AppointmentStatus, string> = {
  pending: "border-gold-deep bg-gold-soft text-gold-ink",
  confirmed: "border-success/40 bg-success/10 text-success-ink",
  completed: "border-line bg-surface text-ink-muted",
  cancelled: "border-line bg-transparent text-ink-muted line-through",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
        ESTILO_STATUS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Estado vazio.
 *
 * Uma tela vazia é um convite para agir, não um aviso de que nada aconteceu —
 * por isso `acao` quase sempre vem preenchida.
 */
export function EstadoVazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-xl text-ink">{titulo}</p>
      {descricao ? (
        <p className="mt-3 max-w-sm text-sm text-ink-muted">{descricao}</p>
      ) : null}
      {acao ? (
        <Link
          href={acao.href}
          className="mt-6 text-sm text-gold-ink underline underline-offset-4 transition-colors hover:text-ink"
        >
          {acao.label}
        </Link>
      ) : null}
    </div>
  );
}

/** CTA principal. Tinta escura sobre ouro — branco daria 2,29:1. */
export function BotaoOuro({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-gold px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-gold-deep",
        className,
      )}
    >
      {children}
    </Link>
  );
}
