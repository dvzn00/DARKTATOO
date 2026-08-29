/**
 * Tempo, sem armadilha de fuso.
 *
 * Convenções do projeto (BLOCO 0, decisão D7):
 *  - data é sempre a string `YYYY-MM-DD`;
 *  - hora é sempre a string `HH:MM` (ou `HH:MM:SS`, como o Postgres devolve);
 *  - o "agora" do estúdio vem SEMPRE de `studioNow()`, nunca de `new Date()`.
 *
 * Motivo: a aplicação roda em UTC. Às 22h de Brasília o servidor já virou o
 * dia, e um cliente veria a agenda de amanhã ao pedir a de hoje.
 *
 * Nenhuma função aqui constrói `Date` a partir de horário local — toda
 * aritmética de calendário passa por `Date.UTC`, que é imune ao fuso da
 * máquina que executa o código.
 */

import { STUDIO_TIMEZONE } from "./constants";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_DAY = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `true` se a string é uma data de calendário real (rejeita 2026-02-30). */
export function isDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** `true` se a string é `HH:MM` ou `HH:MM:SS` dentro de um dia. */
export function isTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** `"14:30"` ou `"14:30:00"` → `870`. */
export function toMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    throw new RangeError(`Hora inválida: ${time}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/** `870` → `"14:30"`. Rejeita valores fora de um dia. */
export function toTimeString(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > MINUTES_PER_DAY) {
    throw new RangeError(`Minutos fora de um dia: ${minutes}`);
  }
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Soma minutos a uma hora. Não atravessa a meia-noite — lança se passar. */
export function addMinutes(time: string, minutes: number): string {
  return toTimeString(toMinutes(time) + minutes);
}

/** Soma dias a uma data de calendário, sem tocar em fuso. */
export function addDays(date: string, days: number): string {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new RangeError(`Data inválida: ${date}`);
  }

  const [, year, month, day] = match.map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);

  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`;
}

/** Dias inteiros de `from` até `to`. Negativo se `to` for anterior. */
export function daysBetween(from: string, to: string): number {
  const parse = (value: string) => {
    const match = DATE_PATTERN.exec(value);
    if (!match) throw new RangeError(`Data inválida: ${value}`);
    const [, year, month, day] = match.map(Number);
    return Date.UTC(year, month - 1, day);
  };

  return Math.round((parse(to) - parse(from)) / MS_PER_DAY);
}

/** Dia da semana, 0 = domingo. */
export function weekdayOf(date: string): number {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Data inválida: ${date}`);
  const [, year, month, day] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export interface StudioClock {
  /** Data de hoje no fuso do estúdio, `YYYY-MM-DD`. */
  date: string;
  /** Minutos desde a meia-noite no fuso do estúdio. */
  minutes: number;
}

/**
 * O relógio do estúdio.
 *
 * Recebe o instante por parâmetro para que os testes possam congelá-lo —
 * é isso que mantém `getAvailableSlots` uma função pura.
 */
export function studioNow(instant: Date = new Date()): StudioClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDIO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((candidate) => candidate.type === type);
    if (!part) throw new Error(`Intl não devolveu "${type}"`);
    return part.value;
  };

  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    minutes: Number(read("hour")) * 60 + Number(read("minute")),
  };
}

/** `"2026-08-29"` → `"sábado, 29 de agosto de 2026"`. */
export function formatDateLong(date: string): string {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Data inválida: ${date}`);
  const [, year, month, day] = match.map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** `"2026-08-29"` → `"29 ago"`. */
export function formatDateShort(date: string): string {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Data inválida: ${date}`);
  const [, year, month, day] = match.map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Normaliza `HH:MM:SS` do Postgres para o `HH:MM` que a interface mostra. */
export function trimSeconds(time: string): string {
  return toTimeString(toMinutes(time));
}

/** `"14:00" + "16:00"` → `"14:00 – 16:00"` (travessão, não hífen). */
export function formatTimeRange(start: string, end: string): string {
  return `${trimSeconds(start)} – ${trimSeconds(end)}`;
}
