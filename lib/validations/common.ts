import { z } from "zod";

import { isDateString, isTimeString } from "@/lib/domain/time";

/**
 * Primitivas compartilhadas.
 *
 * As mensagens são as que o cliente lê na tela: escritas em português, em voz
 * ativa, dizendo o que fazer — não "campo inválido".
 */

export const uuidSchema = z.uuid("Identificador inválido.");

export const dateStringSchema = z
  .string()
  .refine(isDateString, "Escolha uma data válida.");

export const timeStringSchema = z
  .string()
  .refine(isTimeString, "Escolha um horário válido.");

export const personNameSchema = z
  .string()
  .trim()
  .min(2, "Informe seu nome completo.")
  .max(120, "Nome longo demais — use no máximo 120 caracteres.");

/**
 * Normaliza antes de validar, e não o contrário.
 *
 * Quem cola um e-mail de outro app quase sempre traz um espaço junto. Rejeitar
 * por causa disso é culpar o cliente por um detalhe que o sistema resolve
 * sozinho — então o `trim` vem primeiro, e o formato é checado no que sobrou.
 */
export const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .email("Informe um e-mail válido, como nome@exemplo.com.")
      .max(254, "E-mail longo demais."),
  );

/**
 * Telefone brasileiro. Guarda só os dígitos: a formatação é responsabilidade
 * da interface, não do banco. 10 dígitos (fixo com DDD) a 13 (+55 e celular).
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(
    (digits) => digits.length >= 10 && digits.length <= 13,
    "Informe DDD e número, como (11) 91234-5678.",
  );

export const httpsUrlSchema = z
  .url("Cole um link completo, começando com https://")
  .max(2048, "Link longo demais.")
  .refine(
    (value) => value.startsWith("https://"),
    "O link precisa começar com https://",
  );

/** Campo de texto opcional: string vazia vira `null`, não `""`. */
export function optionalText(max: number, tooLong: string) {
  return z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value.length === 0 ? null : value))
    .nullish()
    .transform((value) => value ?? null);
}

/** Link opcional: string vazia vira `null`; se houver algo, precisa ser https. */
export const optionalHttpsUrlSchema = z
  .union([z.literal(""), httpsUrlSchema])
  .nullish()
  .transform((value) => (value ? value : null));

/** `numeric` do Postgres pode chegar como string; normaliza para número. */
export const moneySchema = z.coerce
  .number("Valor inválido.")
  .nonnegative("O valor não pode ser negativo.");
