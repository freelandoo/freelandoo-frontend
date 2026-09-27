/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — o vermelho claro TRAVADO do "Meu carro" no estilo gamers
// (2026-09-27). ns `Community`, fill-if-absent.
// Uso: node scripts/i18n-car-scarlet-merge.js
const fs = require("fs");
const path = require("path");
const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");
const NEW = { accentScarlet: ["Vermelho claro", "Light red", "Rojo claro"] };
let total = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Community = dict.Community || {};
  let added = 0;
  for (const [k, v] of Object.entries(NEW)) {
    if (dict.Community[k] === undefined) { dict.Community[k] = v[idx]; added += 1 }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${added}`);
  total += added;
});
console.log(`total: ${total}`);
