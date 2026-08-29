import { afterEach, describe, expect, it } from "vitest";

import { supabaseHost, supabaseUrl } from "@/lib/env";

const ORIGINAL = process.env.NEXT_PUBLIC_SUPABASE_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL;
});

function comUrl(valor: string | undefined) {
  if (valor === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = valor;
}

const ESPERADO = "https://abcdefgh.supabase.co";

describe("leitura da URL do Supabase", () => {
  it("aceita o valor limpo", () => {
    comUrl(ESPERADO);
    expect(supabaseUrl()).toBe(ESPERADO);
  });

  /**
   * O bug que derrubou o primeiro deploy na Vercel.
   *
   * O valor era checado com `.trim()` mas devolvido sem trim, então uma quebra
   * de linha colada no painel virava `https://…supabase.co\n` — uma URL
   * inválida. O erro que chegava ao log era `TypeError: fetch failed`, sem
   * nenhuma pista da causa.
   */
  it("sobrevive a espaço e quebra de linha coladas junto", () => {
    for (const sujo of [
      `  ${ESPERADO}  `,
      `${ESPERADO}\n`,
      `\n${ESPERADO}`,
      `${ESPERADO}\r\n`,
      `\t${ESPERADO}`,
    ]) {
      comUrl(sujo);
      expect(supabaseUrl()).toBe(ESPERADO);
    }
  });

  it("sobrevive às aspas que vêm junto do copiar e colar", () => {
    comUrl(`"${ESPERADO}"`);
    expect(supabaseUrl()).toBe(ESPERADO);
    comUrl(`'${ESPERADO}'`);
    expect(supabaseUrl()).toBe(ESPERADO);
  });

  it("descarta barra final, caminho e query", () => {
    comUrl(`${ESPERADO}/`);
    expect(supabaseUrl()).toBe(ESPERADO);
    comUrl(`${ESPERADO}/rest/v1?apikey=x`);
    expect(supabaseUrl()).toBe(ESPERADO);
  });

  it("explica o que fazer quando a variável não existe", () => {
    comUrl(undefined);
    expect(() => supabaseUrl()).toThrow(/Variável de ambiente ausente/);
    comUrl("   ");
    expect(() => supabaseUrl()).toThrow(/Variável de ambiente ausente/);
  });

  it("recusa um valor que não é URL, dizendo o que veio", () => {
    comUrl("abcdefgh.supabase.co");
    expect(() => supabaseUrl()).toThrow(/não é uma URL válida/);
  });

  it("recusa http, que o Supabase não atende", () => {
    comUrl("http://abcdefgh.supabase.co");
    expect(() => supabaseUrl()).toThrow(/precisa usar https/);
  });

  it("supabaseHost devolve só o host, sem expor chave nenhuma", () => {
    comUrl(ESPERADO);
    expect(supabaseHost()).toBe("abcdefgh.supabase.co");
  });
});
