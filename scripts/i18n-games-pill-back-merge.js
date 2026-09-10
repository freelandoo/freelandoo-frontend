/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do PILL ROXO DE GAMES no headcard (2026-09-09).
//
// Pedido do Alex: "coloca o pill dele roxo ali embaixo de academia". As duas
// chaves existiam até a demolição do front de games (`edcb00f`), que levou o
// namespace `Gamer` e as chaves de games do `Account` junto; voltam aqui com
// os MESMOS textos.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-games-pill-back-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  gamesPill: ["Games", "Games", "Games"],
  openGamesPlatformAria: [
    "Abrir a plataforma de games",
    "Open the games platform",
    "Abrir la plataforma de games",
  ],
};

let touched = 0;

LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Account = dict.Account || {};

  for (const [key, values] of Object.entries(NEW)) {
    if (dict.Account[key] === undefined) {
      dict.Account[key] = values[idx];
      touched++;
      console.log(`[${locale}] + Account.${key}`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(touched === 0 ? "nada a fazer (idempotente)" : `${touched} chave(s) gravada(s)`);
