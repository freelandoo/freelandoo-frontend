/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — LEADS: botão de atualizar a vitrine (2026-09-24).
//
// A primeira busca de uma categoria carrega a base em segundo plano e pode
// devolver zero; segundos depois ela está cheia. O botão "Atualizar" refaz a
// busca sem a pessoa ter que adivinhar que precisa apertar "Buscar" de novo.
//
// Namespace `Leads`, fill-if-absent. Uso: node scripts/i18n-leads-refresh-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const NEW = {
  refresh: ["Atualizar", "Refresh", "Actualizar"],
  refreshResults: ["Atualizar resultados", "Refresh results", "Actualizar resultados"],
  noResultsLoading: [
    "Primeira busca desta categoria? A base pode estar sendo carregada agora — atualize em alguns segundos.",
    "First search for this category? The base may be loading right now — refresh in a few seconds.",
    "¿Primera búsqueda de esta categoría? La base puede estar cargándose ahora — actualiza en unos segundos.",
  ],
};

let added = 0;
LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Leads = dict.Leads || {};
  for (const [k, vals] of Object.entries(NEW)) {
    if (dict.Leads[k] === undefined) {
      dict.Leads[k] = vals[i];
      added++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
});
console.log(`i18n leads refresh: ${added} chaves adicionadas`);
