import { describe, expect, it } from "vitest";

import { formatPhone, telHref } from "@/lib/domain/phone";
import { phoneSchema } from "@/lib/validations/common";

describe("formatação de telefone", () => {
  it("formata fixo com DDD", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("formata celular com DDD", () => {
    expect(formatPhone("11912345678")).toBe("(11) 91234-5678");
  });

  /**
   * O caso que apareceu na agenda do estúdio: quem digita "+55 61 98320-7986"
   * grava 13 dígitos, e o número aparecia cru porque só 10 e 11 eram tratados.
   */
  it("formata número com código do país", () => {
    expect(formatPhone("5561983207986")).toBe("+55 (61) 98320-7986");
    expect(formatPhone("551133334444")).toBe("+55 (11) 3333-4444");
  });

  it("ignora a máscara que vier junto", () => {
    expect(formatPhone("(11) 91234-5678")).toBe("(11) 91234-5678");
    expect(formatPhone("+55 61 98320-7986")).toBe("+55 (61) 98320-7986");
  });

  it("devolve o valor cru em vez de aplicar máscara errada", () => {
    expect(formatPhone("123")).toBe("123");
  });

  it("cobre todo comprimento que a validação aceita", () => {
    // 10 a 13 dígitos é exatamente a faixa do phoneSchema e do CHECK no banco.
    for (const tamanho of [10, 11, 12, 13]) {
      const digitos = "9".repeat(tamanho);
      expect(phoneSchema.safeParse(digitos).success).toBe(true);
      expect(formatPhone(digitos)).not.toBe(digitos);
    }
  });

  it("monta o link tel: com + quando há código do país", () => {
    expect(telHref("11912345678")).toBe("tel:11912345678");
    expect(telHref("5561983207986")).toBe("tel:+5561983207986");
  });
});
