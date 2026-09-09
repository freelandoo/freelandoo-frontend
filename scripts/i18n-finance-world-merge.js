/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do FINANCEIRO como PLATAFORMA (2026-09-08).
//
// Pedido do Alex: "o financeiro não é uma comunidade (...) é como games (...) no
// financeiro vai ter feed e mercados" — a raiz da Carteira virou a silhueta da
// plataforma de games, com abas Feed e Mercado, e o "mural" virou "feed".
//
// ⚠️ `financePlatformTitle` É CHAVE NOVA, e não um override de `financeTitle`,
// porque as duas dizem coisas DIFERENTES que por acaso dividiam a mesma chave:
// no dicionário `financeTitle` vale "Vida Financeira" (o bloco de lançamentos
// dentro da Carteira, que continua se chamando assim), e era ELE que aparecia
// como título da plataforma — o fallback inline dizia "Financeiro", mas
// dicionário vence fallback, então a tela escrevia "VIDA FINANCEIRA" no lugar do
// nome da plataforma. Sobrescrever a chave consertaria o título e quebraria o
// bloco; separar conserta os dois.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no
// dicionário.
//
// Uso: node scripts/i18n-finance-world-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  // O NOME DA PLATAFORMA: o título do headcard e o chip do banner.
  financePlatformTitle: ["Financeiro", "Finance", "Financiero"],
  // O rótulo do selo no canto do banner. Em games ali fica "Nível"; aqui não há
  // nível a mostrar — a plataforma é de todo mundo e não acumula XP de grupo.
  financePlatformLabel: ["Plataforma", "Platform", "Plataforma"],
  // As duas abas — o par de games (Feed · Estante) aplicado ao dinheiro.
  tabFeed: ["Feed", "Feed", "Feed"],
  tabMarket: ["Mercado", "Market", "Mercado"],
};

let touched = 0;

LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Wallet = dict.Wallet || {};

  for (const [key, values] of Object.entries(NEW)) {
    if (dict.Wallet[key] === undefined) {
      dict.Wallet[key] = values[idx];
      touched++;
      console.log(`[${locale}] + Wallet.${key}`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(touched === 0 ? "nada a fazer (idempotente)" : `${touched} chave(s) gravada(s)`);
