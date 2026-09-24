/* eslint-disable @typescript-eslint/no-require-imports */
// OVERRIDE (não fill-if-absent): o acento `crimson` do carro deixou de ser
// vermelho vivo e virou PASTEL (2026-09-24). A CHAVE do dicionário já existia
// dizendo "Vermelho escuro", e dicionário vence o fallback inline — sem este
// override a paleta mostraria o nome antigo sobre a cor nova.
//
// Uso: node scripts/i18n-car-pastel-override.js  (idempotente)

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** ns → chave → [pt, en, es] */
const OVERRIDES = {
  Community: {
    accentCrimson: ["Vermelho pastel", "Pastel red", "Rojo pastel"],
  },
};

let changed = 0;
for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);
  for (const [ns, keys] of Object.entries(OVERRIDES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i];
        changed++;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}
console.log(`i18n car pastel: ${changed} chave(s) sobrescrita(s)`);
