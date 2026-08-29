/**
 * Executa supabase/setup.sql contra um Postgres real (PGlite/WASM) e verifica
 * o comportamento das constraints e triggers.
 *
 *   npm run db:check
 *
 * Não substitui rodar no Supabase — o que este script NÃO cobre é a camada de
 * RLS, porque PGlite não tem os papéis anon/authenticated nem o `auth.uid()`
 * de verdade. O que ele cobre é tudo que é Postgres puro: sintaxe, a EXCLUDE
 * constraint, os CHECKs, os triggers e a idempotência do arquivo.
 */

import { readFileSync } from "node:fs";

import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const arquivo = process.argv[2] ?? "supabase/setup.sql";

let falhas = 0;

function conferir(condicao, descricao, detalhe) {
  if (condicao) {
    console.log(`  ok    ${descricao}`);
    return;
  }
  falhas += 1;
  console.log(`  FALHA ${descricao}`);
  if (detalhe !== undefined) {
    console.log(`        ${JSON.stringify(detalhe)}`);
  }
}

const db = await PGlite.create({ extensions: { btree_gist } });

// O que o Supabase já fornece de fábrica e o PGlite não tem.
await db.exec(`
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb
  );
  create or replace function auth.uid() returns uuid language sql stable
    as $$ select current_setting('request.jwt.claim.sub', true)::uuid $$;
  do $$ begin create role anon;          exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role;  exception when duplicate_object then null; end $$;
`);

const sql = readFileSync(arquivo, "utf8");

console.log(`\n== executando ${arquivo} ==`);
const resultado = await db.exec(sql);
const resumo = resultado.at(-2)?.rows?.[0];
const exemplo = resultado.at(-1)?.rows?.[0];
console.log("  ", JSON.stringify(resumo));
console.log("  ", JSON.stringify(exemplo));

conferir(resumo?.artistas === 2, "seed criou exatamente 2 tatuadores", resumo);
conferir(resumo?.servicos === 4, "seed criou 4 serviços", resumo);
conferir(
  Number(resumo?.trava_overbooking) === 1,
  "EXCLUDE constraint existe",
  resumo,
);
conferir(Number(resumo?.policies) === 6, "6 policies de RLS criadas", resumo);

console.log("\n== idempotência ==");
const segunda = await db.exec(sql);
conferir(
  JSON.stringify(segunda.at(-2)?.rows?.[0]) === JSON.stringify(resumo),
  "segunda execução não duplicou nada",
  segunda.at(-2)?.rows?.[0],
);

const {
  rows: [ref],
} = await db.query(`
  select (select id from services       where display_order = 1) as servico60,
         (select id from services       where display_order = 3) as servico120,
         (select id from tattoo_artists where display_order = 1) as iris,
         (select id from tattoo_artists where display_order = 2) as caio,
         ((now() at time zone 'America/Sao_Paulo')::date + 2)    as dia
`);

const dia =
  ref.dia instanceof Date ? ref.dia.toISOString().slice(0, 10) : String(ref.dia);

async function agendar(artista, servico, data, hora) {
  try {
    await db.query(
      `insert into appointments (client_name, client_email, client_phone,
         service_id, artist_id, "date", start_time)
       values ('Teste Silva', 'teste@exemplo.com', '11999998888', $1, $2, $3, $4)`,
      [servico, artista, data, hora],
    );
    return { aceito: true };
  } catch (erro) {
    return { aceito: false, code: erro.code ?? null, msg: erro.message };
  }
}

console.log("\n== regras de agenda ==");
// O seed ocupa 14:00–16:00 com a Íris.

let r = await agendar(ref.iris, ref.servico60, dia, "15:00");
conferir(
  !r.aceito && r.code === "23P01",
  "sessão de 60 min às 15h dentro de 14h–16h recusada com 23P01",
  r,
);

r = await agendar(ref.iris, ref.servico120, dia, "13:00");
conferir(
  !r.aceito && r.code === "23P01",
  "sobreposição pelo outro lado (13h–15h) recusada com 23P01",
  r,
);

r = await agendar(ref.iris, ref.servico120, dia, "16:00");
conferir(r.aceito, "horário que apenas encosta (16h–18h) aceito", r);

r = await agendar(ref.caio, ref.servico120, dia, "14:00");
conferir(r.aceito, "mesmo horário com o outro artista aceito", r);

r = await agendar(ref.iris, ref.servico120, "2020-01-15", "14:00");
conferir(
  !r.aceito && r.msg.includes("PAST_SLOT"),
  "data no passado recusada pelo trigger",
  r,
);

r = await agendar(ref.caio, ref.servico120, dia, "19:00"); // terminaria 21h
conferir(
  !r.aceito && r.code === "23514",
  "sessão que terminaria às 21h recusada pelo CHECK de expediente",
  r,
);

r = await agendar(ref.caio, ref.servico60, dia, "10:30");
conferir(!r.aceito && r.code === "23514", "horário fora da grade recusado", r);

await db.query(
  `update appointments set status = 'cancelled'
    where client_email = 'marina.demo@exemplo.com'`,
);
r = await agendar(ref.iris, ref.servico120, dia, "14:00");
conferir(r.aceito, "cancelar devolveu o horário para a agenda", r);

console.log("\n== derivação por trigger ==");
const {
  rows: [derivado],
} = await db.query(
  `select start_time, end_time, duration_minutes, price_snapshot
     from appointments
    where client_email = 'teste@exemplo.com' and start_time = time '16:00'
    limit 1`,
);
conferir(
  derivado?.end_time === "18:00:00" &&
    derivado?.duration_minutes === 120 &&
    Number(derivado?.price_snapshot) === 1200,
  "end_time, duração e preço preenchidos a partir do serviço",
  derivado,
);

await db.query(`update services set price = 9999 where display_order = 3`);
const {
  rows: [congelado],
} = await db.query(
  `select price_snapshot from appointments where start_time = time '16:00' limit 1`,
);
conferir(
  Number(congelado?.price_snapshot) === 1200,
  "mudar o preço do serviço não reescreve o histórico",
  congelado,
);

console.log(
  falhas === 0
    ? "\nRESULTADO: tudo passou\n"
    : `\nRESULTADO: ${falhas} falha(s)\n`,
);
process.exit(falhas === 0 ? 0 : 1);
