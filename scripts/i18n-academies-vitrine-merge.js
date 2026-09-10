/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — a vitrine `/academias` entra na casca da plataforma
// FITNESS (2026-09-10): cada academia vira um mini-headcard com a foto num
// cartão 2/3 sobreposto ao banner do card.
//
// Pedido do Alex: "a foto que está ali vira um card, igualzinho de os de
// perfil. Ele fica sobreposto ao card da academia (...) e deixa a identidade
// visual a mesma que você fez anterior ali da página do fitness".
//
// Só chaves NOVAS no ns `Academies`, fill-if-absent. `Academies.disabled`
// fica órfã (o aviso da flag agora é o da casca, `Fitness.disabled`).
//
// Uso: node scripts/i18n-academies-vitrine-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_ACADEMIES = {
  platformLabel: ["Plataforma", "Platform", "Plataforma"],
  loadFailedTitle: ["Não deu pra carregar.", "Couldn't load.", "No se pudo cargar."],
  openAcademy: ["Abrir", "Open", "Abrir"],
};

let totalAdded = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Academies = dict.Academies || {};
  let added = 0;
  for (const [key, values] of Object.entries(NEW_ACADEMIES)) {
    if (dict.Academies[key] === undefined) {
      dict.Academies[key] = values[idx];
      added += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${added} chaves adicionadas ao ns Academies`);
  totalAdded += added;
});
console.log(`total: ${totalAdded}`);
