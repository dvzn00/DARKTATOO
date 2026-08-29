import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";

const db = await PGlite.create({ extensions: { btree_gist } });
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { console.log("  FALHA " + m); process.exitCode = 1; };

// ── Stubs do que o Supabase fornece de fábrica ─────────────────────────────
await db.exec(`
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb
  );
  create or replace function auth.uid() returns uuid language sql stable
    as $$ select current_setting('request.jwt.claim.sub', true)::uuid $$;
  do $$ begin
    create role anon;          exception when duplicate_object then null; end $$;
  do $$ begin
    create role authenticated; exception when duplicate_object then null; end $$;
  do $$ begin
    create role service_role;  exception when duplicate_object then null; end $$;
`);
console.log("stubs criados\n");

// ── O arquivo real, sem edição ─────────────────────────────────────────────
const sql = readFileSync(process.argv[2], "utf8");
console.log("== executando setup.sql ==");
const res = await db.exec(sql);
const verificacao = res.at(-2)?.rows?.[0];
const agendamento = res.at(-1)?.rows?.[0];
console.log("  ", JSON.stringify(verificacao));
console.log("  ", JSON.stringify(agendamento));
console.log();

// ── Idempotência ───────────────────────────────────────────────────────────
console.log("== rodando de novo (idempotencia) ==");
const res2 = await db.exec(sql);
const v2 = res2.at(-2)?.rows?.[0];
JSON.stringify(v2) === JSON.stringify(verificacao)
  ? ok("segunda execucao nao duplicou nada")
  : bad("segunda execucao mudou os numeros: " + JSON.stringify(v2));
console.log();

// ── Comportamento ──────────────────────────────────────────────────────────
console.log("== regras de agenda ==");
const { rows: [ids] } = await db.query(`
  select (select id from services where display_order = 1) as servico60,
         (select id from services where display_order = 3) as servico120,
         (select id from tattoo_artists where display_order = 1) as iris,
         (select id from tattoo_artists where display_order = 2) as caio,
         ((now() at time zone 'America/Sao_Paulo')::date + 2) as dia
`);
const dia = ids.dia.toISOString ? ids.dia.toISOString().slice(0,10) : String(ids.dia).slice(0,10);

async function inserir(artista, servico, data, hora) {
  try {
    await db.query(
      `insert into appointments (client_name, client_email, client_phone,
         service_id, artist_id, "date", start_time)
       values ('Teste Silva','teste@exemplo.com','11999998888',$1,$2,$3,$4)`,
      [servico, artista, data, hora]);
    return { ok: true };
  } catch (e) { return { ok: false, code: e.code ?? null, msg: e.message }; }
}

// O agendamento do seed ocupa 14:00-16:00 com a Iris.
let r = await inserir(ids.iris, ids.servico60, dia, "15:00");
!r.ok && r.code === "23P01"
  ? ok("sobreposicao parcial (60min as 15h dentro de 14h-16h) recusada com 23P01")
  : bad("overbooking passou: " + JSON.stringify(r));

r = await inserir(ids.iris, ids.servico120, dia, "13:00");
!r.ok && r.code === "23P01"
  ? ok("sobreposicao pelo outro lado (13h-15h) recusada com 23P01")
  : bad("overbooking passou: " + JSON.stringify(r));

r = await inserir(ids.iris, ids.servico120, dia, "16:00");
r.ok ? ok("horario que apenas encosta (16h-18h) aceito") : bad("encoste recusado: " + JSON.stringify(r));

r = await inserir(ids.caio, ids.servico120, dia, "14:00");
r.ok ? ok("mesmo horario com o OUTRO artista aceito") : bad("recusou outro artista: " + JSON.stringify(r));

r = await inserir(ids.iris, ids.servico120, "2020-01-15", "14:00");
!r.ok && r.msg.includes("PAST_SLOT")
  ? ok("data no passado recusada pelo trigger")
  : bad("data passada passou: " + JSON.stringify(r));

r = await inserir(ids.caio, ids.servico120, dia, "19:00"); // 19h + 120min = 21h
!r.ok && r.code === "23514"
  ? ok("sessao que terminaria as 21h recusada pelo CHECK de expediente")
  : bad("fora de expediente passou: " + JSON.stringify(r));

r = await inserir(ids.caio, ids.servico60, dia, "10:30");
!r.ok && r.code === "23514"
  ? ok("horario fora da grade de 60min recusado")
  : bad("fora da grade passou: " + JSON.stringify(r));

// Cancelar devolve o horario
await db.query(`update appointments set status='cancelled'
                 where client_email='marina.demo@exemplo.com'`);
r = await inserir(ids.iris, ids.servico120, dia, "14:00");
r.ok ? ok("cancelar devolveu o horario para a agenda")
     : bad("horario cancelado continuou bloqueado: " + JSON.stringify(r));

console.log();
console.log("== derivacao por trigger ==");
const { rows: derivados } = await db.query(
  `select start_time, end_time, duration_minutes, price_snapshot
     from appointments where client_email='teste@exemplo.com'
      and start_time = time '16:00' limit 1`);
const d = derivados[0];
d && d.end_time === "18:00:00" && d.duration_minutes === 120 && Number(d.price_snapshot) === 1200
  ? ok("end_time, duracao e preco preenchidos a partir do servico: " + JSON.stringify(d))
  : bad("derivacao errada: " + JSON.stringify(d));

// Preco congelado
await db.query(`update services set price = 9999 where display_order = 3`);
const { rows: [pos] } = await db.query(
  `select price_snapshot from appointments where start_time = time '16:00' limit 1`);
Number(pos.price_snapshot) === 1200
  ? ok("mudar o preco do servico nao reescreve o historico")
  : bad("snapshot vazou: " + JSON.stringify(pos));

console.log();
console.log(process.exitCode ? "RESULTADO: HA FALHAS" : "RESULTADO: TUDO PASSOU");
