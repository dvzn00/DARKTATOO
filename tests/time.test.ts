import { describe, expect, it } from "vitest";

import {
  addDays,
  addMinutes,
  daysBetween,
  formatDateLong,
  isDateString,
  isTimeString,
  studioNow,
  toMinutes,
  toTimeString,
  trimSeconds,
  weekdayOf,
} from "@/lib/domain/time";

describe("conversão de horas", () => {
  it("lê HH:MM e HH:MM:SS do Postgres", () => {
    expect(toMinutes("10:00")).toBe(600);
    expect(toMinutes("14:30")).toBe(870);
    expect(toMinutes("14:30:00")).toBe(870);
    expect(toMinutes("20:00")).toBe(1200);
  });

  it("recusa hora impossível", () => {
    expect(() => toMinutes("24:00")).toThrow(RangeError);
    expect(() => toMinutes("10:60")).toThrow(RangeError);
    expect(() => toMinutes("banana")).toThrow(RangeError);
  });

  it("faz o caminho de volta", () => {
    expect(toTimeString(600)).toBe("10:00");
    expect(toTimeString(1200)).toBe("20:00");
    expect(addMinutes("18:00", 120)).toBe("20:00");
  });

  it("normaliza os segundos que o banco devolve", () => {
    expect(trimSeconds("09:05:00")).toBe("09:05");
  });
});

describe("aritmética de calendário", () => {
  it("atravessa fim de mês e fim de ano", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("acerta ano bissexto", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2028-02-29")).toBe(true);
  });

  it("conta dias com sinal", () => {
    expect(daysBetween("2026-08-29", "2026-10-08")).toBe(40);
    expect(daysBetween("2026-08-29", "2026-08-28")).toBe(-1);
  });

  it("sabe o dia da semana", () => {
    expect(weekdayOf("2026-08-29")).toBe(6); // sábado
  });

  it("valida formato de data e hora", () => {
    expect(isDateString("2026-8-29")).toBe(false);
    expect(isTimeString("9:00")).toBe(false);
    expect(isTimeString("09:00")).toBe(true);
  });
});

describe("relógio do estúdio", () => {
  /**
   * A razão de existir deste módulo. Em UTC o instante abaixo já é dia 29;
   * em São Paulo ainda é a noite do dia 28. Se a agenda usasse `new Date()`,
   * quem abrisse o site às 22h veria os horários do dia seguinte.
   */
  it("não vira o dia junto com o UTC", () => {
    const instante = new Date("2026-08-29T02:30:00Z");
    expect(studioNow(instante)).toEqual({
      date: "2026-08-28",
      minutes: 23 * 60 + 30,
    });
  });

  it("trata meia-noite como 00:00, nunca como 24:00", () => {
    const instante = new Date("2026-08-29T03:00:00Z"); // 00:00 em São Paulo
    expect(studioNow(instante)).toEqual({ date: "2026-08-29", minutes: 0 });
  });

  it("devolve a hora local no meio do expediente", () => {
    const instante = new Date("2026-08-29T17:45:00Z"); // 14:45 em São Paulo
    expect(studioNow(instante)).toEqual({
      date: "2026-08-29",
      minutes: 14 * 60 + 45,
    });
  });
});

describe("formatação", () => {
  it("escreve a data por extenso em português", () => {
    expect(formatDateLong("2026-08-29")).toContain("29 de agosto de 2026");
  });

  it("não desloca a data ao formatar", () => {
    // Um `new Date("2026-08-29")` local em fuso negativo cairia no dia 28.
    expect(formatDateLong("2026-08-29")).toContain("29");
  });
});
