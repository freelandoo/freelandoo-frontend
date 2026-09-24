/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — a aba Site vira pill rosa no headcard (2026-09-24).
// Namespace `Community`, fill-if-absent. Uso: node scripts/i18n-site-pill-merge.js
const fs = require("fs");
const path = require("path");
const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");
const NEW = {
  sitePillAria: [
    "Abrir o construtor do site do negócio",
    "Open the business website builder",
    "Abrir el constructor del sitio del negocio",
  ],
};
let added = 0;
LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Community = dict.Community || {};
  for (const [k, vals] of Object.entries(NEW)) {
    if (dict.Community[k] === undefined) { dict.Community[k] = vals[i]; added++; }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
});
console.log(`i18n site pill: ${added} chaves adicionadas`);
