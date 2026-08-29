/**
 * Auditoria de acessibilidade das páginas públicas, com axe-core.
 *
 *   npm run build && npm start          (em outro terminal)
 *   npm run qa:a11y
 *
 * Cobre landing, as cinco etapas do agendamento e o login — tudo que um
 * visitante alcança sem sessão. As páginas do painel ficam de fora porque
 * exigiriam criar um usuário no Supabase, e um script de QA não deveria
 * escrever no sistema de autenticação de ninguém.
 *
 * Requer o Chromium do Playwright:  npx playwright install chromium
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error(
    "playwright-core não está instalado. Rode: npm i -D playwright-core axe-core",
  );
  process.exit(1);
}

const axeFonte = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

let navegador;
try {
  navegador = await chromium.launch();
} catch {
  console.error(
    "não consegui abrir o Chromium. Rode: npx playwright install chromium",
  );
  process.exit(1);
}

const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

let violacoes = 0;

async function auditar(caminho, nome) {
  const resposta = await page.goto(`${BASE}${caminho}`, {
    waitUntil: "domcontentloaded",
  });

  if (!resposta || resposta.status() >= 400) {
    console.log(`  ${nome.padEnd(24)} HTTP ${resposta?.status() ?? "sem resposta"}`);
    violacoes += 1;
    return;
  }

  // A sequência de entrada do hero dura ~0,9s. Medir contraste no meio do
  // fade acusa falha onde não há: a cor final é a que vale.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const animacoes = document.getAnimations();
        Promise.allSettled(animacoes.map((a) => a.finished)).then(resolve);
        setTimeout(resolve, 2000);
      }),
  );
  await page.evaluate(() => document.fonts.ready);

  await page.addScriptTag({ content: axeFonte });
  const relatorio = await page.evaluate(
    async () =>
      await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      }),
  );

  const graves = relatorio.violations.filter((v) =>
    ["critical", "serious", "moderate"].includes(v.impact),
  );
  violacoes += graves.length;

  console.log(
    `  ${nome.padEnd(24)} ${graves.length === 0 ? "sem violações" : `${graves.length} violação(ões)`}`,
  );

  for (const v of graves) {
    console.log(`      [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}x)`);
    console.log(`        ex.: ${v.nodes[0]?.html?.slice(0, 120)}`);
  }
}

console.log(`\nauditando ${BASE}\n`);

await auditar("/", "landing");
await auditar("/login", "login");
await auditar("/agendar", "agendar · serviço");

// As etapas seguintes dependem do que a página anterior oferece, então o
// script segue os próprios links em vez de inventar ids.
const seguir = async (seletor, nome) => {
  const alvo = await page
    .locator(seletor)
    .first()
    .getAttribute("href")
    .catch(() => null);
  if (alvo) await auditar(alvo, nome);
  return alvo;
};

await page.goto(`${BASE}/agendar`, { waitUntil: "domcontentloaded" });
await seguir('a[href*="service="]', "agendar · artista");
await seguir('a[href*="artist="]', "agendar · data");
await seguir('a[href*="date="]', "agendar · horário");
await seguir('a[href*="time="]', "agendar · dados");

await ctx.close();
await navegador.close();

console.log(
  violacoes === 0
    ? "\nRESULTADO: nenhuma violação WCAG A/AA de impacto moderado ou maior\n"
    : `\nRESULTADO: ${violacoes} violação(ões)\n`,
);
process.exit(violacoes === 0 ? 0 : 1);
