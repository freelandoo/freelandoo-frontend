/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — botão "Jogo" do headcard (só administrador) que abre a
// Freelandoo Arena em /arena (2026-10-17). Chaves no ns `Profile`, fill-if-absent.
//
// Uso: node scripts/i18n-arena-game-button-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

const NEW_PROFILE = {
  game: ["Jogo", "Game", "Juego"],
  gameAria: ["Abrir a Freelandoo Arena", "Open Freelandoo Arena", "Abrir Freelandoo Arena"],
};

let total = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Profile = dict.Profile || {};
  let added = 0;
  for (const [key, values] of Object.entries(NEW_PROFILE)) {
    if (dict.Profile[key] === undefined) {
      dict.Profile[key] = values[idx];
      added += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  total += added;
  console.log(`${locale}: +${added}`);
});
console.log(`total: ${total}`);
