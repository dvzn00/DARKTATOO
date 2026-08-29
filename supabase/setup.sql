-- ═══════════════════════════════════════════════════════════════════════════
--  DARK INK STUDIO — setup completo do banco
--  BLOCO 3 · Cole tudo no SQL Editor do Supabase e execute de uma vez.
--
--  Este arquivo é a fonte única da verdade do schema. É seguro rodar mais de
--  uma vez: tabelas, constraints, policies e triggers são criados só se ainda
--  não existirem, e o seed usa ON CONFLICT DO NOTHING.
--
--  NÃO apaga nada. Nenhum DROP TABLE, nenhum TRUNCATE.
--
--  Índice:
--    1. Extensões
--    2. Tabelas
--    3. Constraints de integridade
--    4. Trava anti-overbooking (EXCLUDE USING gist)
--    5. Triggers
--    6. RLS: grants, helper e policies
--    7. Seed
--    8. Verificação
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. EXTENSÕES
-- ───────────────────────────────────────────────────────────────────────────

-- gen_random_uuid() é nativo do Postgres desde a versão 13, e o Supabase roda
-- 15 ou mais nova — por isso pgcrypto não aparece aqui.
--
-- btree_gist permite combinar igualdade (artist_id) com sobreposição de
-- intervalo (&&) na mesma EXCLUDE constraint. Sem ela, a seção 4 não compila.
create extension if not exists "btree_gist";


-- ───────────────────────────────────────────────────────────────────────────
-- 2. TABELAS
-- ───────────────────────────────────────────────────────────────────────────

-- 2.1 profiles — só o admin. Espelha auth.users; não guarda senha.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  name       text,
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil do administrador. A autenticação vive em auth.users; aqui fica só o papel.';


-- 2.2 tattoo_artists — exatamente 2 registros, garantido pela seção 3.
create table if not exists public.tattoo_artists (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  specialty           text not null,
  bio                 text not null,
  profile_picture_url text not null,
  instagram_url       text,
  display_order       smallint not null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);


-- 2.3 services
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text not null,
  duration_minutes int not null,
  price            numeric(10, 2) not null,
  image_url        text,
  display_order    smallint not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);


-- 2.4 appointments
--
-- "date" é palavra com significado especial no parser do Postgres, então
-- aparece sempre entre aspas nas expressões abaixo. O nome vem do briefing.
--
-- Nenhuma coluna de senha existe aqui, e nunca vai existir: clientes são
-- visitantes. Guardamos nome, e-mail e telefone — nada mais.
create table if not exists public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  -- URL da página de confirmação do cliente: /agendamento/{public_token}.
  -- Separado do id, que circula em URLs e logs do admin.
  public_token        uuid not null unique default gen_random_uuid(),

  client_name         text not null,
  client_email        text not null,
  client_phone        text not null,

  service_id          uuid not null references public.services (id)       on delete restrict,
  artist_id           uuid not null references public.tattoo_artists (id) on delete restrict,

  "date"              date not null,
  start_time          time not null,
  -- Derivadas por trigger a partir do serviço. O cliente não as envia.
  end_time            time not null,
  duration_minutes    int not null,
  price_snapshot      numeric(10, 2) not null,

  status              text not null default 'pending',
  reference_image_url text,
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on column public.appointments.price_snapshot is
  'Preço no momento da reserva. Editar o serviço não reescreve o histórico nem o PDF já emitido.';

create index if not exists appointments_date_artist_idx
  on public.appointments ("date", artist_id);

create index if not exists appointments_status_idx
  on public.appointments (status);


-- ───────────────────────────────────────────────────────────────────────────
-- 3. CONSTRAINTS DE INTEGRIDADE
--
-- Postgres não tem ADD CONSTRAINT IF NOT EXISTS, então cada uma é envolvida
-- por uma checagem em pg_constraint para o arquivo continuar re-executável.
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare
  c record;
begin
  for c in
    select *
    from (values
      -- ── tattoo_artists: o estúdio tem duas cadeiras, e ponto.
      ('tattoo_artists', 'chk_artist_slot',
       'check (display_order in (1, 2))'),

      -- ── services
      ('services', 'chk_service_duration',
       'check (duration_minutes in (60, 90, 120))'),
      ('services', 'chk_service_price',
       'check (price >= 0)'),

      -- ── appointments: forma dos dados
      ('appointments', 'chk_client_name',
       'check (char_length(btrim(client_name)) between 2 and 120)'),
      ('appointments', 'chk_client_email',
       'check (client_email ~* ''^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'')'),
      ('appointments', 'chk_client_phone',
       'check (char_length(regexp_replace(client_phone, ''\D'', '''', ''g'')) between 10 and 13)'),
      ('appointments', 'chk_status',
       'check (status in (''pending'', ''confirmed'', ''cancelled'', ''completed''))'),
      ('appointments', 'chk_reference_url',
       'check (reference_image_url is null or reference_image_url ~* ''^https://'')'),
      ('appointments', 'chk_notes_length',
       'check (notes is null or char_length(notes) <= 1000)'),

      -- ── appointments: regras de agenda
      ('appointments', 'chk_time_order',
       'check (end_time > start_time)'),
      -- O expediente limita o FIM da sessão, não o início: às 19h ainda cabe
      -- 60 min, mas não 120. Espelha CLOSING_TIME em lib/domain/constants.ts.
      ('appointments', 'chk_business_hours',
       'check (start_time >= time ''10:00'' and end_time <= time ''20:00'')'),
      -- Grade de 60 min. Espelha SLOT_STEP_MINUTES.
      ('appointments', 'chk_slot_grid',
       'check (date_part(''minute'', start_time) = 0 and date_part(''second'', start_time) = 0)')
    ) as t(tabela, nome, definicao)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = c.nome
        and conrelid = format('public.%I', c.tabela)::regclass
    ) then
      execute format('alter table public.%I add constraint %I %s',
                     c.tabela, c.nome, c.definicao);
    end if;
  end loop;
end $$;

-- display_order único: reforça o limite de 2 artistas e dá uma chave natural
-- para o seed poder rodar de novo sem duplicar.
create unique index if not exists tattoo_artists_display_order_key
  on public.tattoo_artists (display_order);

create unique index if not exists services_display_order_key
  on public.services (display_order);


-- ───────────────────────────────────────────────────────────────────────────
-- 4. TRAVA ANTI-OVERBOOKING
--
-- A restrição de unicidade em (artist_id, date, start_time) NÃO resolve isto:
-- com durações diferentes, uma sessão de 14h–16h e outra de 15h–16h têm
-- start_time distintos e a unicidade deixaria as duas passarem.
--
-- A EXCLUDE constraint compara INTERVALOS. É atômica: se dois clientes
-- enviarem o mesmo horário no mesmo instante, o segundo INSERT falha com
-- SQLSTATE 23P01, que a aplicação traduz em "este horário acabou de ser
-- reservado". Sem lock manual, sem transação explícita, sem race.
--
-- O WHERE é essencial: um agendamento cancelado devolve o horário à agenda.
-- ───────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_no_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_overlap
      exclude using gist (
        artist_id with =,
        tsrange("date" + start_time, "date" + end_time, '[)') with &&
      ) where (status in ('pending', 'confirmed'));
  end if;
end $$;


-- ───────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS
-- ───────────────────────────────────────────────────────────────────────────

-- 5.1 Deriva end_time, duração e preço a partir do serviço escolhido.
--     O cliente envia apenas service_id, date e start_time — assim ninguém
--     reserva 120 minutos pagando o preço de 60.
create or replace function public.appointments_fill_derived()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s record;
begin
  select duration_minutes, price
    into s
    from public.services
   where id = new.service_id
     and is_active;

  if not found then
    raise exception 'SERVICE_NOT_FOUND' using errcode = '23503';
  end if;

  new.duration_minutes := s.duration_minutes;
  new.price_snapshot   := s.price;
  new.end_time         := new.start_time + make_interval(mins => s.duration_minutes);

  return new;
end $$;

drop trigger if exists appointments_fill_derived_tg on public.appointments;
create trigger appointments_fill_derived_tg
  before insert on public.appointments
  for each row execute function public.appointments_fill_derived();


-- 5.2 Bloqueia agendamento no passado, no fuso do estúdio.
--     Não dá para ser um CHECK: CURRENT_DATE não é imutável e quebraria em
--     restore. E precisa ser no fuso de São Paulo, não em UTC — às 22h de
--     Brasília o servidor já virou o dia.
create or replace function public.appointments_block_past()
returns trigger
language plpgsql
as $$
begin
  if (new."date" + new.start_time) <= (now() at time zone 'America/Sao_Paulo') then
    raise exception 'PAST_SLOT' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists appointments_block_past_tg on public.appointments;
create trigger appointments_block_past_tg
  before insert on public.appointments
  for each row execute function public.appointments_block_past();


-- 5.3 updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists appointments_touch_tg on public.appointments;
create trigger appointments_touch_tg
  before update on public.appointments
  for each row execute function public.touch_updated_at();


-- 5.4 Cria o profile assim que um usuário nasce em auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: se você já criou o admin em Authentication > Users antes de rodar
-- este script, o trigger acima não pegou. Esta linha resolve.
insert into public.profiles (id, email, name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'name', u.email)
  from auth.users u
 where u.email is not null
on conflict (id) do nothing;


-- ───────────────────────────────────────────────────────────────────────────
-- 6. RLS
--
-- Modelo aprovado no BLOCO 0:
--   · services e tattoo_artists — leitura pública (a landing precisa), escrita
--     só do admin. São dados institucionais, sem nenhum dado pessoal.
--   · appointments — NENHUMA policy para anon. Conceder SELECT ao papel
--     público exporia nome, e-mail e telefone de todos os clientes. O
--     agendamento público acontece no servidor, com service_role, e as
--     constraints acima continuam valendo inclusive para ele.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.tattoo_artists enable row level security;
alter table public.services       enable row level security;
alter table public.appointments   enable row level security;

-- 6.1 Grants. RLS filtra linhas; GRANT decide quem pode sequer tentar.
--     Sem o grant, o erro é "permission denied", e não uma lista vazia.
grant usage on schema public to anon, authenticated;

grant select on public.services       to anon, authenticated;
grant select on public.tattoo_artists to anon, authenticated;
grant insert, update, delete on public.services       to authenticated;
grant insert, update, delete on public.tattoo_artists to authenticated;

-- O Supabase concede privilegios amplos por padrao a anon em tabelas novas do
-- schema public. Sem este revoke, uma tentativa de escrita do papel publico e
-- barrada apenas pela RLS -- que recusa em silencio, com "0 linhas afetadas".
-- Retirando o privilegio, a mesma tentativa falha alto, com 42501.
revoke insert, update, delete on public.services       from anon;
revoke insert, update, delete on public.tattoo_artists from anon;

grant select on public.profiles to authenticated;

-- appointments: o papel público não recebe absolutamente nada.
revoke all on public.appointments from anon;
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;


-- 6.2 Helper. SECURITY DEFINER para poder ler profiles sem cair na própria
--     policy. A policy de profiles não o usa — isso evitaria recursão.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.role = 'admin'
  );
$$;


-- 6.3 Policies
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists artists_public_read on public.tattoo_artists;
create policy artists_public_read on public.tattoo_artists
  for select to anon, authenticated
  using (is_active);

drop policy if exists artists_admin_all on public.tattoo_artists;
create policy artists_admin_all on public.tattoo_artists
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon, authenticated
  using (is_active);

drop policy if exists services_admin_all on public.services;
create policy services_admin_all on public.services
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists appointments_admin_all on public.appointments;
create policy appointments_admin_all on public.appointments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ───────────────────────────────────────────────────────────────────────────
-- 7. SEED
--
-- Conteúdo de demonstração. O Dark Ink Studio é um estúdio fictício: artistas,
-- serviços e o agendamento de exemplo abaixo não descrevem pessoas, preços ou
-- clientes reais.
-- ───────────────────────────────────────────────────────────────────────────

-- 7.1 Os dois tatuadores
insert into public.tattoo_artists
  (name, specialty, bio, profile_picture_url, instagram_url, display_order)
values
  ('Íris Bandeira',
   'Fine line e botânico',
   'Trabalha com traço contínuo e composições de folhagem. Prefere sessões longas e projetos fechados, desenhados sob medida a partir de uma conversa antes da agulha.',
   '/artistas/iris-bandeira.svg',
   'https://instagram.com/darkink.iris',
   1),
  ('Caio Veríssimo',
   'Realismo em preto e cinza',
   'Retrato e textura. Constrói volume em camadas de cinza, sem contorno, e costuma dividir peças grandes em duas ou três sessões.',
   '/artistas/caio-verissimo.svg',
   'https://instagram.com/darkink.caio',
   2)
on conflict (display_order) do nothing;


-- 7.2 Os quatro serviços
insert into public.services
  (name, description, duration_minutes, price, display_order)
values
  ('Sessão fine line',
   'Traço fino em peça pequena ou média. Ideal para primeira tatuagem.',
   60, 450.00, 1),
  ('Blackwork',
   'Preenchimento sólido em preto, com desenho fechado antes da sessão.',
   90, 780.00, 2),
  ('Realismo preto e cinza',
   'Retrato ou textura em escala de cinza, construído em camadas.',
   120, 1200.00, 3),
  ('Cover-up',
   'Cobertura de tatuagem existente. Inclui estudo do desenho anterior.',
   120, 1450.00, 4)
on conflict (display_order) do nothing;


-- 7.3 Um agendamento de exemplo, para provar que a disponibilidade responde.
--
-- Cai daqui a 2 dias às 14:00 com a Íris, no serviço de 120 minutos — ou seja,
-- ocupa 14:00–16:00. Depois de rodar, a agenda dela nesse dia deve deixar de
-- oferecer 14:00 e 15:00 para serviços de 60 min.
--
-- end_time, duração e preço não aparecem aqui: quem preenche é o trigger 5.1.
insert into public.appointments
  (client_name, client_email, client_phone, service_id, artist_id,
   "date", start_time, status, notes)
select
  'Marina Duarte',
  'marina.demo@exemplo.com',
  '11912345678',
  (select id from public.services       where display_order = 3),
  (select id from public.tattoo_artists where display_order = 1),
  ((now() at time zone 'America/Sao_Paulo')::date + 2),
  time '14:00',
  'confirmed',
  'Agendamento de demonstração criado pelo seed.'
where not exists (
  select 1 from public.appointments
   where client_email = 'marina.demo@exemplo.com'
);


-- ───────────────────────────────────────────────────────────────────────────
-- 8. VERIFICAÇÃO
--
-- Deve sair: 2 artistas, 4 serviços, 1 agendamento com end_time 16:00:00,
-- duração 120, preço 1200.00 — todos preenchidos pelo trigger.
-- ───────────────────────────────────────────────────────────────────────────

select
  (select count(*) from public.tattoo_artists) as artistas,
  (select count(*) from public.services)       as servicos,
  (select count(*) from public.appointments)   as agendamentos,
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'services', 'tattoo_artists', 'appointments')
  ) as policies,
  (select count(*) from pg_constraint
    where conname = 'appointments_no_overlap') as trava_overbooking;

select
  a."date",
  a.start_time,
  a.end_time,          -- derivado pelo trigger
  a.duration_minutes,  -- derivado pelo trigger
  a.price_snapshot,    -- derivado pelo trigger
  a.status,
  s.name as servico,
  t.name as tatuador
from public.appointments a
join public.services s       on s.id = a.service_id
join public.tattoo_artists t on t.id = a.artist_id
order by a."date", a.start_time;
