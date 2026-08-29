/**
 * Contrato de retorno das Server Actions.
 *
 * Uma Action não lança exceção para erro esperado: devolve uma união
 * discriminada, e quem chama trata os dois ramos. Exceção fica reservada para
 * o que é realmente inesperado.
 */

export interface ActionFailure {
  ok: false;
  /** Código de domínio, para a interface decidir o que fazer. */
  code: string;
  /** Frase pronta para exibir ao usuário, em português. */
  message: string;
  /** Erros por campo, quando a falha veio da validação de formulário. */
  fieldErrors?: Record<string, string[]>;
}

export interface ActionSuccess<T> {
  ok: true;
  data: T;
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;
