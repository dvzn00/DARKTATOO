# Dark Ink Studio

Plataforma de agendamento para um estúdio de tatuagem de alto padrão.
Cliente marca sessão sem criar conta; o estúdio administra a agenda em um
painel privado.

> **Projeto de demonstração.** O Dark Ink Studio é fictício. Artistas,
> serviços, preços, depoimentos e endereço são conteúdo de exemplo e não
> descrevem pessoas ou negócios reais.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
shadcn/ui · Supabase (Postgres + Auth) · Zod 4 · @react-pdf/renderer · Vitest

## Como rodar

**1. Banco.** Crie um projeto no Supabase, abra o SQL Editor e execute
[`supabase/setup.sql`](supabase/setup.sql) inteiro. O arquivo é
re-executável e não apaga nada.

**2. Admin.** No painel do Supabase, em *Authentication → Users → Add user*,
crie o usuário do estúdio com e-mail e senha. O `profiles` é preenchido por
trigger.

**3. Variáveis de ambiente.** Copie `.env.example` para `.env.local` e
preencha com os valores de *Project Settings → API*:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

A `SUPABASE_SERVICE_ROLE_KEY` nunca chega ao navegador — só
`lib/supabase/admin.ts` a usa, e esse módulo importa `server-only`, o que faz
o build quebrar se alguém tentar importá-lo em um componente de cliente.

> A landing é gerada estaticamente e revalidada de hora em hora, então
> `npm run build` **precisa** das variáveis: sem elas o build falha em vez de
> publicar um site sem catálogo.

**4. Subir.**

```bash
npm install
npm run dev
```

## Comandos

| | |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | testes unitários (Vitest) |
| `npm run db:check` | executa `supabase/setup.sql` em um Postgres real (PGlite) e verifica constraints, triggers e idempotência |
| `npm run qa:a11y` | audita as páginas públicas com axe-core (WCAG 2.1 A/AA) contra um servidor já rodando |

### Auditoria de acessibilidade

```bash
npx playwright install chromium   # uma vez
npm run build && npm start        # em outro terminal
npm run qa:a11y                   # ou QA_BASE_URL=http://localhost:3333 npm run qa:a11y
```

## Como está organizado

```
app/            rotas — landing, agendamento, confirmação, painel, /api/export-pdf
components/     ui (shadcn), marketing, booking, admin, shared
lib/
  domain/       regras puras e testáveis: disponibilidade, validação, tempo, status
  validations/  schemas Zod
  data/         leituras de servidor (não são Server Actions)
  actions/      Server Actions — só o que o cliente precisa invocar
  supabase/     quatro clientes, um por responsabilidade
  pdf/          relatório do dia
supabase/       setup.sql — schema, RLS, triggers e seed
tests/          testes unitários
docs/           decisões de arquitetura
```

As decisões e o porquê de cada uma estão em
[`docs/BLOCO-0-PLANEJAMENTO.md`](docs/BLOCO-0-PLANEJAMENTO.md).

## Três decisões que valem a leitura

**Overbooking é impossível no banco, não no código.** Uma `EXCLUDE USING gist`
compara intervalos de tempo por artista. Dois clientes enviando o mesmo
horário no mesmo instante resultam em `23P01` para o segundo — sem lock, sem
transação manual. A unicidade simples em `(artist_id, date, start_time)` não
resolveria: serviços têm durações diferentes, e 14h–16h não colide com 15h–16h
pelo `start_time`.

**O papel `anon` não tem acesso nenhum a `appointments`.** Conceder `SELECT`
para validar disponibilidade exporia nome, e-mail e telefone de todos os
clientes. A reserva acontece no servidor, e a consulta de disponibilidade
devolve apenas horários.

**Nenhuma data passa por `new Date()`.** O servidor roda em UTC; às 22h de
Brasília ele já virou o dia. Todo "agora" vem de `studioNow()`, que lê o
instante no fuso `America/Sao_Paulo`.
