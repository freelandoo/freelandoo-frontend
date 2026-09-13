/**
 * Chave nova do painel de site pronto: o bloco de TEMA AUTORAL.
 *
 * Fill-if-absent, idempotente: rodar de novo não sobrescreve tradução revisada
 * à mão. Namespace `CommunitySite`, o mesmo de `readyReserve`.
 */
const fs = require("fs");
const path = require("path");

const NS = "CommunitySite";
const KEYS = {
  readyAuthored: ["Site autoral pronto", "Ready authored site", "Sitio de autor listo"],
};
const LOCALES = ["pt-BR", "en", "es"];

let added = 0;
LOCALES.forEach((loc, i) => {
  const file = path.join(__dirname, "..", "messages", `${loc}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict[NS] = dict[NS] || {};
  for (const [k, vals] of Object.entries(KEYS)) {
    if (dict[NS][k] === undefined) {
      dict[NS][k] = vals[i];
      added++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});
console.log(`chaves adicionadas: ${added}`);
