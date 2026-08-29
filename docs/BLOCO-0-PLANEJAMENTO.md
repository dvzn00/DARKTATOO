# Dark Ink Studio — BLOCO 0 · Planejamento

> Documento de aprovação. **Nenhum código de aplicação foi escrito.**
> Status: aguardando aprovação para iniciar o BLOCO 1.

---

## 0. Passo 0 — Skill de frontend

Instalada e lida integralmente:

- Origem: `anthropics/skills → skills/frontend-design`
- Destino: `~/.claude/skills/frontend-design/` (`SKILL.md` 8.260 bytes + `LICENSE.txt`)

**Tensão que a skill levanta e que precisa ser dita.** A skill lista três "defaults de IA" a evitar. O primeiro é literalmente: *fundo creme quente (~#F4F1EA) + serifada de alto contraste + acento terroso*. O briefing pede `#FAF7F2` + serifada + dourado — a mesma família.

A própria skill resolve isso: *"onde o briefing fixa uma direção visual, siga exatamente — as palavras do briefing sempre vencem"*. Então **a paleta e a tipografia do briefing são cumpridas à risca, sem negociação.** A diferenciação é gasta nos eixos que o briefing deixou livres: estrutura de layout, elemento-assinatura, densidade tipográfica, movimento e microcópia. É o que a seção 4 detalha.

---

## 1. Validação da modelagem de dados

A modelagem sugerida está correta na essência. Encontrei **6 pontos que causariam bugs ou retrabalho** e proponho correções. Cada um está marcado com o impacto.

### 1.1 CRÍTICO — A restrição de unicidade sugerida não impede overbooking

O briefing sugere: *"unicidade em (artist_id, date, start_time)"*.

Isso **não funciona** porque os serviços têm durações diferentes (60/90/120 min):

```
Tatuador A · 14:00 -> 16:00  (serviço de 120 min)   <- já existe
Tatuador A · 15:00 -> 16:00  (serviço de 60 min)    <- start_time DIFERENTE
                                                       -> unicidade PASSA
                                                       -> estúdio duplo-agendado
```

**Correção: `EXCLUDE` constraint com `btree_gist` sobre o intervalo de tempo.** É a única forma de tornar a sobreposição *impossível* no banco, de forma atômica, imune a corrida entre dois clientes simultâneos — sem transação explícita, sem lock manual, sem lógica de aplicação.

```sql
exclude using gist (
  artist_id with =,
  tsrange(date + start_time, date + end_time, '[)') with &&
) where (status in ('pending','confirmed'))
```

O `where` é essencial: um agendamento `cancelled` devolve o horário para a agenda.

Isso responde de forma definitiva à condição de contorno *"dois clientes tentam o mesmo horário simultaneamente"*: o segundo `INSERT` falha com `SQLSTATE 23P01`, que a Server Action traduz em "Este horário acabou de ser reservado. Escolha outro."

### 1.2 CRÍTICO — RLS não consegue validar o INSERT público sozinho

O briefing pede *"inserção pública em appointments, com validação rigorosa via RLS"*. Uma policy `WITH CHECK` consegue validar **valores de coluna** (horário comercial, formato de e-mail), mas **não consegue**:

- checar conflito de agenda de forma atômica;
- fazer isso sem conceder `SELECT` em `appointments` ao papel `anon` — o que **vazaria nome, e-mail e telefone de todos os clientes** para qualquer visitante com a chave pública.

**Correção (defesa em profundidade, 3 camadas):**

| Camada | Responsabilidade | Falha aqui significa |
|---|---|---|
| Zod (`lib/validations`) | formato e UX | erro de campo, amigável |
| Server Action + `getAvailableSlots` | regra de negócio, horário livre | erro de fluxo, amigável |
| Constraints + triggers do Postgres | verdade final, atômica | erro 23P01/23514, traduzido |

O `anon` **nunca** toca `appointments` diretamente. A escrita acontece server-side. Duas opções para isso:

- **(A · recomendada)** Server Action com cliente Supabase de `service_role` (chave nunca sai do servidor). Mantém a lógica em TypeScript puro e testável, como o BLOCO 2 exige.
- **(B · alternativa)** Função `SECURITY DEFINER` no banco (`create_appointment(...)`) com `EXECUTE` para `anon`. Mais "banco-cêntrico", porém a lógica de disponibilidade sai do TypeScript e fica difícil de testar unitariamente.

Sigo com **(A)**, e as constraints do banco continuam sendo a autoridade final mesmo que `service_role` ignore RLS.

### 1.3 `end_time` derivado, nunca informado pelo cliente

Se `end_time` chega no payload, ele pode divergir da duração do serviço. **Correção:** trigger `BEFORE INSERT` busca `services.duration_minutes` e calcula `end_time = start_time + duração`. O cliente envia apenas `service_id`, `date`, `start_time`.

### 1.4 Snapshot de preço e duração

Se o admin editar o preço de um serviço, todos os agendamentos históricos passariam a exibir o valor novo — inclusive no PDF já emitido. **Correção:** `duration_minutes` e `price_snapshot` gravados no agendamento no momento da reserva, pelo mesmo trigger.

### 1.5 "Data no passado" não pode ser `CHECK`

`CHECK (date >= CURRENT_DATE)` usa função não-imutável: quebra em restore/`VALIDATE` e não considera o horário. **Correção:** trigger `BEFORE INSERT` comparando `date + start_time` com `now() AT TIME ZONE 'America/Sao_Paulo'`.

### 1.6 Tabela `users` é redundante

O Supabase já mantém `auth.users`. Duplicar gera sincronização manual. **Correção:** tabela `profiles` com `id uuid PK references auth.users(id)`, preenchida por trigger em `auth.users`, servindo apenas para o papel (`role`) nas policies.

### 1.7 Página de confirmação sem login

O cliente precisa rever o agendamento sem conta. **Correção:** coluna `public_token uuid unique default gen_random_uuid()`; a URL é `/agendamento/{public_token}`. Não reutilizar o `id`, que circula em URLs e logs do admin.

---

## 2. SQL — Migrations e RLS

> Arquivos previstos: `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `supabase/seed.sql`.
> Escrito aqui para aprovação; será aplicado no **BLOCO 3**.

### 2.1 Extensões e tabelas

```sql
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";   -- exigido pela EXCLUDE constraint

-- ─────────────────────────────── profiles (admin)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  name       text,
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────── tatuadores (exatamente 2)
create table public.tattoo_artists (
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

-- trava o limite de 2 tatuadores no próprio banco
create unique index tattoo_artists_display_order_key
  on public.tattoo_artists (display_order);
alter table public.tattoo_artists
  add constraint chk_artist_slot check (display_order in (1, 2));

-- ─────────────────────────────── serviços
create table public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text not null,
  duration_minutes int not null check (duration_minutes in (60, 90, 120)),
  price            numeric(10,2) not null check (price >= 0),
  image_url        text,
  display_order    smallint not null,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ─────────────────────────────── agendamentos
create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  public_token        uuid not null unique default gen_random_uuid(),

  client_name         text not null check (char_length(btrim(client_name)) between 2 and 120),
  client_email        text not null check (client_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  client_phone        text not null check (char_length(regexp_replace(client_phone,'\D','','g')) between 10 and 13),

  service_id          uuid not null references public.services(id)       on delete restrict,
  artist_id           uuid not null references public.tattoo_artists(id) on delete restrict,

  date                date not null,
  start_time          time not null,
  end_time            time not null,
  duration_minutes    int  not null,          -- snapshot
  price_snapshot      numeric(10,2) not null, -- snapshot

  status              text not null default 'pending'
                        check (status in ('pending','confirmed','cancelled','completed')),
  reference_image_url text check (reference_image_url is null or reference_image_url ~* '^https://'),
  notes               text check (notes is null or char_length(notes) <= 1000),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint chk_time_order     check (end_time > start_time),
  constraint chk_business_hours check (start_time >= time '10:00' and end_time <= time '20:00'),
  constraint chk_slot_grid      check (date_part('minute', start_time) = 0
                                   and date_part('second', start_time) = 0)
);

create index appointments_date_artist_idx on public.appointments (date, artist_id);
create index appointments_status_idx      on public.appointments (status);
```

### 2.2 A trava anti-overbooking

```sql
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    artist_id with =,
    tsrange(date + start_time, date + end_time, '[)') with &&
  ) where (status in ('pending','confirmed'));
```

### 2.3 Triggers de integridade

```sql
-- deriva end_time / duração / preço a partir do serviço (INSERT)
create or replace function public.appointments_fill_derived()
returns trigger language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select duration_minutes, price into s from public.services
   where id = new.service_id and is_active;
  if not found then
    raise exception 'SERVICE_NOT_FOUND' using errcode = '23503';
  end if;
  new.duration_minutes := s.duration_minutes;
  new.price_snapshot   := s.price;
  new.end_time         := new.start_time + make_interval(mins => s.duration_minutes);
  return new;
end $$;

create trigger appointments_fill_derived_tg
  before insert on public.appointments
  for each row execute function public.appointments_fill_derived();

-- bloqueia agendamento no passado, no fuso do estúdio
create or replace function public.appointments_block_past()
returns trigger language plpgsql as $$
begin
  if (new.date + new.start_time) <= (now() at time zone 'America/Sao_Paulo') then
    raise exception 'PAST_SLOT' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger appointments_block_past_tg
  before insert on public.appointments
  for each row execute function public.appointments_block_past();

-- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger appointments_touch_tg
  before update on public.appointments
  for each row execute function public.touch_updated_at();
```

### 2.4 RLS

```sql
alter table public.profiles       enable row level security;
alter table public.tattoo_artists enable row level security;
alter table public.services       enable row level security;
alter table public.appointments   enable row level security;

-- helper (evita recursão: a policy de profiles NÃO o utiliza)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- profiles: cada admin lê o próprio registro
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());

-- catálogo: leitura pública (dados institucionais, zero PII) · escrita só admin
create policy artists_public_read on public.tattoo_artists
  for select to anon, authenticated using (is_active);
create policy artists_admin_all on public.tattoo_artists
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy services_public_read on public.services
  for select to anon, authenticated using (is_active);
create policy services_admin_all on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- appointments: NENHUMA policy para anon -> negado por padrão (RLS deny-by-default).
-- A reserva pública passa pela Server Action com service_role; as constraints acima
-- continuam sendo a autoridade final.
create policy appointments_admin_all on public.appointments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```

**Ponto que precisa da sua decisão (D3, seção 6).** O briefing diz que `services` e `tattoo_artists` seriam legíveis *"apenas por autenticados"*. Deixei leitura pública porque são exatamente os dados que a landing page precisa mostrar a visitantes, não têm PII, e isso viabiliza cache/ISR. Se preferir a leitura estrita do briefing, removo as duas policies `*_public_read` e leio o catálogo server-side com `service_role` — funciona igual, só perde cacheabilidade.

### 2.5 Seed

- **2 tatuadores** (`display_order` 1 e 2 — o `CHECK` impede um terceiro).
- **4 serviços**: 60, 90, 120 e 120 min, com preços distintos.
- **1 agendamento de exemplo**, `confirmed`, em data futura relativa, para provar que o horário some da lista de disponíveis.

---

## 3. Paleta e tipografia — confirmadas, com 3 correções de acessibilidade

### 3.1 Contraste medido (WCAG 2.1, calculado — não estimado)

| Combinação | Razão | Veredito |
|---|---:|---|
| `#2D2A24` sobre `#FAF7F2` | 13,38:1 | AAA — ok |
| `#6B6770` sobre `#FAF7F2` | 5,17:1 | AA — ok |
| `#6B6770` sobre card `#F3EFE8` | 4,82:1 | AA — ok |
| `#2B7A4B` sucesso sobre fundo | 4,93:1 | AA — ok |
| `#B13A4A` erro sobre fundo | 5,50:1 | AA — ok |
| **`#A5A09A` sobre `#FAF7F2`** | **2,43:1** | **REPROVA** |
| **`#C9A75C` como texto sobre fundo** | **2,14:1** | **REPROVA** |
| **`#B8943C` como texto sobre fundo** | **2,68:1** | **REPROVA** |
| **Branco sobre botão `#C9A75C`** | **2,29:1** | **REPROVA** |
| `#2D2A24` sobre botão `#C9A75C` | 6,24:1 | AA — ok |
| `#2D2A24` sobre hover `#B8943C` | 5,00:1 | AA — ok |

### 3.2 As três regras que saem daí

1. **Botão dourado leva texto `#2D2A24`, nunca branco.** Branco sobre dourado dá 2,29:1 — ilegível ao sol, no celular, para quem tem baixa visão. E, esteticamente, tinta escura sobre ouro é mais caro que branco sobre ouro. A regra vira lei no design system.
2. **`#A5A09A` é cor de traço, não de leitura.** Uso permitido: ícones decorativos, estados `disabled`, placeholders. **Proibido** em qualquer texto que o usuário precise ler.
3. **Adição de 1 token — `--gold-ink: #7A5F1E`** (5,64:1 no fundo, 5,26:1 no card). É o dourado quando ele precisa ser *texto* — link, eyebrow, preço em destaque, número da etapa. **Não substitui nada**: `#C9A75C`, `#B8943C` e `#F2ECD8` seguem exatamente como especificados nos seus papéis (preenchimento, hover/borda, badge). É a mesma família cromática, apenas o grau legível dela.

Todos os demais HEX do briefing ficam **exatamente como escritos**.

### 3.3 Tokens finais

```
--bg          #FAF7F2   fundo dominante
--bg-card     #F3EFE8   cards, seções alternadas
--bg-raised   #EBE5DA   hover, elementos elevados
--gold        #C9A75C   preenchimento de CTA, ícone de seleção
--gold-deep   #B8943C   hover de CTA, borda ativa
--gold-soft   #F2ECD8   badge, background sutil
--gold-ink    #7A5F1E   ADIÇÃO — dourado legível como texto
--ink         #2D2A24   texto principal · texto sobre dourado
--ink-muted   #6B6770   texto secundário
--ink-faint   #A5A09A   apenas traço/disabled — nunca leitura
--line        #E3DCD2   bordas e divisores
--success     #2B7A4B
--danger      #B13A4A
```

### 3.4 Tipografia — escolha justificada

| Papel | Face | Por quê esta, e não a outra opção do briefing |
|---|---|---|
| Display | **Cormorant Garamond** (300/400, itálico no acento) | Playfair Display é a serifada "elegante" mais usada da web — chega lendo como template. A Cormorant tem contraste de traço muito mais alto: hastes grossas que afinam até quase sumir. É literalmente a lógica do **fine line**, o traço da agulha. Escolha ancorada no assunto, não no gosto. |
| Corpo | **Plus Jakarta Sans** (400/500/600) | Inter é *a* fonte padrão de interface — invisível de tão usada. A Jakarta tem terminais levemente mais humanistas e um `a` de dois andares mais aberto, que assenta melhor sobre creme quente. |
| Utilitário | **Plus Jakarta Sans + `tabular-nums`** | Não entra uma terceira família. Horários e preços alinham em coluna via `font-variant-numeric`, com `letter-spacing` aumentado. *(Regra Chanel: tirar um acessório antes de sair.)* |

**Escala** (razão 1.25, base 16px): 12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 · 61.
Display sempre com `letter-spacing: -0.02em`; corpo em `1.6` de entrelinha; olho tipográfico máximo de 68 caracteres.

---

## 4. Plano de design — e o elemento-assinatura

### 4.1 O risco deliberado: **a Ficha do Estúdio**

Um estúdio de tatuagem sério trabalha com um artefato físico: a **ficha de sessão** — papel com o nome do cliente, o desenho, o artista, a data, a hora, e o carimbo do estúdio. É o objeto que o cliente leva para casa.

Esse artefato é o elemento-assinatura, e **aparece em três superfícies, unificando o produto inteiro**:

1. **No agendamento** — um card fixo (sticky à direita no desktop, barra inferior expansível no mobile) que **vai sendo preenchido a cada etapa**, linha por linha, como uma ficha sendo escrita à mão. Não é um "resumo do carrinho": é o objeto que o cliente está construindo.
2. **No admin** — cada agendamento na agenda é a mesma ficha, em versão compacta.
3. **No PDF** — o relatório do dia é a mesma ficha, impressa. O que se vê na tela é o que sai na impressora.

Detalhes que fazem a ficha ser um objeto e não um `div`: borda superior serrilhada (picote, em CSS `mask`), numeração `#DK-0000` em `tabular-nums`, e um **selo dourado** que só aparece quando o status vira `confirmed` — a única vez que o dourado é usado em área grande no produto todo.

**Toda a ousadia é gasta aqui.** Todo o resto — grid, botões, formulários — é quieto, espaçado e disciplinado, exatamente como a skill manda.

### 4.2 Estrutura secundária: a *flash sheet*

Estúdios exibem **flash sheets**: uma folha em grade com desenhos prontos, cada um **numerado**. Por isso, e só por isso, a seção de Serviços usa numeração `01–04` — porque numerar itens de flash é o vernáculo real do assunto, não decoração. Nenhuma outra seção do site usa marcadores numerados.

### 4.3 Movimento

Uma sequência orquestrada na entrada do hero (linha do título revelada por máscara, de baixo para cima, escalonada) e micro-interações de hover discretas. Nada de parallax, contadores animados ou reveals em cascata a cada scroll. `prefers-reduced-motion` respeitado desde o primeiro commit.

---

## 5. Layout das telas

### 5.1 Landing (`/`)

```
┌───────────────────────────────────────────────────────────────┐
│  DARK INK               Estúdio  Artistas  Serviços  [Agendar]│  header transparente,
├───────────────────────────────────────────────────────────────┤  vira sólido no scroll
│                                                               │
│   ─── são paulo · desde 2016 ───                              │  eyebrow --gold-ink
│                                                               │
│   Cada linha                                                  │  Cormorant 300, ~110px
│   é permanente.                                               │  itálico só em "permanente"
│                                                               │
│   Duas cadeiras. Agenda aberta com 40 dias.                   │  Jakarta, --ink-muted
│                                                               │
│   [ Agendar sessão ]   Ver os artistas ->                     │  botão --gold + --ink
│                                                               │
│   ══════════════════════════════════════════ (fio dourado 1px)│
└───────────────────────────────────────────────────────────────┘
```

Hero **conduzido por tipografia**, sem imagem de fundo, sem gradiente, sem número gigante. O off-white domina; a única cor é o botão e o fio.

```
SOBRE      texto em 2 colunas assimétricas (5/12 · 6/12), muito respiro

ARTISTAS   ┌──────────────┐  ┌──────────────┐   exatamente 2 cards, lado a lado
           │ [retrato]    │  │ [retrato]    │   hover: borda --gold-deep
           │ Nome         │  │ Nome         │
           │ especialidade│  │ especialidade│   --gold-ink
           │ bio · IG ->  │  │ bio · IG ->  │
           └──────────────┘  └──────────────┘

SERVIÇOS   fundo --bg-card · grade de flash sheet
           ┌────────┬────────┬────────┬────────┐
           │ 01     │ 02     │ 03     │ 04     │  <- numeração justificada
           │ Nome   │        │        │        │
           │ 90 min │        │        │        │  tabular-nums
           │ R$ 000 │        │        │        │  --gold-ink
           └────────┴────────┴────────┴────────┘

DEPOIMENTOS  3 citações em Cormorant itálico, sem card, sem aspas gigantes,
             separadas por fio --line. Nome + inicial apenas.

CONTATO      endereço · horário 10h–20h · mapa estático · CTA final
RODAPÉ       nota de conteúdo demonstrativo (ver D5)
```

### 5.2 Agendamento (`/agendar`) — 5 etapas + confirmação

Estado na **URL** (`?step=2&service=…&artist=…&date=…`): recarregar não perde nada, voltar no navegador funciona, e o link é compartilhável. Sem Context Provider.

```
┌────────────────────────────────────────────────────────────────┐
│ <- voltar                                       DARK INK       │
│ ●───●───○───○───○   serviço · artista · data · hora · dados     │  trilha fina,
├──────────────────────────────────────┬─────────────────────────┤  bolinha --gold
│                                      │  ╭─ ˅˅˅˅˅˅˅˅˅˅ ─╮       │  <- A FICHA
│   ETAPA ATIVA                        │  │  #DK-0000     │       │     (sticky)
│                                      │  │               │       │
│   Escolha o serviço                  │  │  Serviço  >   │       │  vai preenchendo
│   ┌───────────┐ ┌───────────┐        │  │  Artista  —   │       │  linha a linha
│   │ imagem    │ │           │        │  │  Data     —   │       │
│   │ Nome      │ │           │        │  │  Hora     —   │       │
│   │ 90 min    │ │           │        │  │  ─────────    │       │
│   │ R$ 000  ○ │ │         ○ │        │  │  Total    —   │       │
│   └───────────┘ └───────────┘        │  ╰───────────────╯       │
│                    ^ selecionado:    │                          │
│                    borda --gold-deep │  [ Continuar ]           │
└──────────────────────────────────────┴─────────────────────────┘
```

- **Etapa 3 · data** — calendário de 40 dias. Dia sem nenhum horário livre fica desabilitado e visualmente apagado (`--ink-faint`), não clicável. Datas passadas nunca são renderizadas.
- **Etapa 4 · hora** — grade de horários de 10h a 19h. Cada botão mostra `14:00 – 16:00` (o cliente vê quanto tempo ocupa). **Vazio:** "Nenhum horário livre neste dia." + atalho para o próximo dia com vaga — um empty state que *convida a agir*, como a skill pede.
- **Etapa 5 · dados** — nome, e-mail, telefone, link de referência (opcional), observações (opcional). Zod no submit e no blur. Nenhum campo de senha existe no schema.
- **Confirmação** (`/agendamento/{public_token}`) — a ficha, agora em tamanho real, com o selo dourado. Único momento de dourado em área grande.

### 5.3 Admin

**Login** (`/login`) — página centrada, mínima, mesma tipografia. E-mail + senha, Supabase Auth. Erro em `--danger`, texto específico ("E-mail ou senha incorretos"), nunca "algo deu errado".

**Dashboard** (`/admin`)

```
┌────────────────────────────────────────────────────────────────┐
│ DARK INK · painel        28 ago 2026        admin@…  [ sair ]  │
├────────────────────────────────────────────────────────────────┤
│  Hoje                                                          │
│  ┌────────┬────────┬────────┬────────┐                         │
│  │   7    │   5    │   2    │   3    │  números em Cormorant,  │
│  │ sessões│confirm.│pendent.│ livres │  rótulo em Jakarta 12px │
│  └────────┴────────┴────────┴────────┘  card pendente>0:       │
│                                          borda --gold          │
│  Próxima sessão · 14:00 · Nome · Fine line · Artista           │
└────────────────────────────────────────────────────────────────┘
```

**Agenda** (`/admin/agenda?date=…&artist=…`)

```
┌──────────────┬─────────────────────────────────────────────────┐
│  ‹ ago 2026 ›│ quinta, 28 de agosto     [ Exportar PDF do dia ] │
│  S T Q Q S S │ ─────────────────────────────────────────────── │
│  · · · 1 2 3 │ Todos │ Artista 1 │ Artista 2      <- filtro     │
│  4 5 6 7 8 9 │                                                 │
│  ●= tem      │ 10:00 ╭─ ˅˅˅˅˅˅ ─╮  Nome do cliente             │
│    sessão    │       │ pendente │  Fine line · 90 min           │
│              │       ╰──────────╯  [Confirmar][Cancelar]        │
│              │ 11:00   —— livre ——                              │
│              │ 12:00 ╭──────────╮  ...                          │
└──────────────┴─────────────────────────────────────────────────┘
```

Coluna de horas contínua das 10h às 20h: **os buracos vazios são informação** — o admin vê a agenda respirar. Status por badge: `pending` → `--gold-soft`; `confirmed` → `--success`; `completed` → `--ink-faint`; `cancelled` → riscado.

Ações otimistas com `useOptimistic` + `revalidatePath`. Cancelar pede confirmação (é irreversível para o cliente).

**PDF do dia** — mesma ficha, papel A4, cabeçalho com o nome do estúdio e a data por extenso, tabela `tabular-nums`, rodapé com total de sessões. Sem agendamentos: *"Nenhuma sessão agendada para esta data."* centralizado — não uma página em branco.

---

## 6. Decisões que precisam do seu aval

| # | Decisão | Recomendação |
|---|---|---|
| **D1** | `EXCLUDE` constraint no lugar da unicidade simples | **Adotar.** É o que realmente impede overbooking (§1.1). |
| **D2** | Reserva pública via Server Action `service_role`, sem policy de INSERT para `anon` | **Adotar.** Evita vazar PII de clientes (§1.2). |
| **D3** | Leitura pública de `services` / `tattoo_artists` | **Adotar** — a landing precisa. Diverge da letra do briefing; digo "não" se preferir. |
| **D4** | Token `--gold-ink: #7A5F1E` | **Adotar.** Sem ele, dourado como texto reprova em WCAG (§3.2). |
| **D5** | Conteúdo demonstrativo | Estúdio, artistas e depoimentos são fictícios. Proposta: **retratos ilustrados/monograma**, nunca foto de pessoa real; depoimentos com primeiro nome + inicial; nota no rodapé e no README marcando tudo como conteúdo de demonstração. Zero prêmio, logo de imprensa ou métrica inventada. |
| **D6** | Grade de horários de **60 min** (10:00…19:00), duração vinda do serviço | **Adotar.** Cumpre "intervalo fixo de 60 minutos" como passo da grade. Constante `SLOT_STEP_MINUTES` — trocar para 30 é uma linha. |
| **D7** | Fuso `America/Sao_Paulo` explícito via `Intl`, nunca `new Date()` cru | **Adotar.** Na Vercel o servidor roda em UTC: às 22h de Brasília, `new Date()` já é o dia seguinte. Causa nº 1 de bug de agenda. |
| **D8** | Referência visual = **campo de URL**, sem upload | **Adotar no MVP.** Storage + policy de upload anônimo é vetor de abuso e escopo extra. |

---

## 7. Estrutura de pastas

```
dark-ink-studio/
├─ app/
│  ├─ layout.tsx                    fontes, metadata, skip-link
│  ├─ globals.css                   design tokens (§3.3)
│  ├─ page.tsx                      landing
│  ├─ (booking)/
│  │  ├─ agendar/page.tsx           shell do wizard (URL state)
│  │  └─ agendamento/[token]/page.tsx  confirmação pública
│  ├─ (admin)/
│  │  ├─ login/page.tsx
│  │  └─ admin/
│  │     ├─ layout.tsx              guarda de sessão + shell
│  │     ├─ page.tsx                dashboard
│  │     └─ agenda/page.tsx
│  └─ api/export-pdf/route.ts       GET · auth · PDF · attachment
│
├─ components/
│  ├─ ui/                           shadcn (button, calendar, dialog, …)
│  ├─ marketing/                    hero, artists, services, testimonials
│  ├─ booking/                      step-service, step-artist, step-date,
│  │                                step-time, step-details, studio-ticket
│  ├─ admin/                        stat-cards, day-agenda, appointment-card,
│  │                                artist-filter, status-actions
│  └─ shared/                       section, eyebrow, empty-state, skeletons
│
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts                  browser (anon)
│  │  ├─ server.ts                  RSC/Action (anon + cookies)
│  │  ├─ admin.ts                   service_role · "server-only"
│  │  └─ middleware.ts              refresh de sessão
│  ├─ domain/
│  │  ├─ constants.ts               OPEN=10:00 CLOSE=20:00 STEP=60 TZ=…
│  │  ├─ time.ts                    todayInStudioTz, toMinutes, addMinutes
│  │  ├─ availability.ts            getAvailableSlots  <- puro, testado
│  │  └─ booking-rules.ts           validateBooking    <- puro, testado
│  ├─ validations/                  service · artist · appointment · booking (Zod)
│  ├─ actions/                      catalog · booking · admin (Server Actions)
│  ├─ errors.ts                     23P01/23514 -> mensagem em português
│  └─ pdf/daily-report.tsx          @react-pdf/renderer
│
├─ types/
│  ├─ database.ts                   gerado via supabase gen types
│  └─ domain.ts                     tipos derivados dos schemas Zod
│
├─ supabase/
│  ├─ migrations/0001_init.sql · 0002_rls.sql
│  └─ seed.sql
│
├─ tests/
│  ├─ availability.test.ts          >= 3 cenários (BLOCO 2)
│  └─ booking-rules.test.ts
│
├─ docs/BLOCO-0-PLANEJAMENTO.md     este documento
├─ middleware.ts                    protege /admin/*
└─ .env.example
```

**Regras estruturais:** zero `any`; zero regra de negócio dentro de componente React; nenhum arquivo acima de 500 linhas; `lib/supabase/admin.ts` marcado com `import "server-only"` para que a chave `service_role` **jamais** possa ser importada por engano em um client component.

---

## 8. Aprovação

Preciso de:

1. **OK geral** no plano; e
2. Confirmação de **D1–D8** (§6) — ou "aprovado" para tudo.

Com o aval, sigo para o **BLOCO 1 — Fundação**: `create-next-app` (TS strict, App Router), Tailwind, shadcn/ui, Zod, `@react-pdf/renderer`, Vitest, cliente Supabase, tokens em `globals.css`, e `lint` + `typecheck` + `build` verdes antes de qualquer outra coisa.
