/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves das PÁGINAS dos botões da Carteira (2026-09-08).
//
// Os três pills deixaram de abrir painéis da própria /wallet e passaram a
// navegar para /wallet/vaquinha, /wallet/cupom e /wallet/mercado. Cada página
// tem headcard próprio, então precisa do eyebrow dela (o título reusa chave que
// já existia: `vaquinhaPill`, `couponPill` e `market`).
//
// Padrão da casa: fill-if-absent no bloco NEW — nunca sobrescreve o que já está
// no dicionário.
//
// ⚠️ `couponPillAria` é OVERRIDE, não fill-if-absent: o valor antigo prometia
// "Meu cupom, extrato e painel do afiliado", e o extrato geral FICOU na raiz da
// Carteira (ele sai do mesmo /me/earnings dos KPIs e do gráfico). Deixar o
// texto velho faria o botão anunciar uma tela que ele não abre mais.
//
// Uso: node scripts/i18n-wallet-pages-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  vaquinhaEyebrow: ["o seu objetivo", "your goal", "tu objetivo"],
  couponEyebrow: ["quem você indicou", "who you referred", "a quién referiste"],
  marketEyebrow: ["o mundo lá fora", "the world out there", "el mundo ahí fuera"],
  couponSalesTitle: [
    "Vendas com o seu cupom",
    "Sales with your coupon",
    "Ventas con tu cupón",
  ],
};

/** chave → [pt, en, es] — SEMPRE sobrescreve (o valor antigo virou mentira). */
const OVERRIDE = {
  couponPillAria: [
    "Meu cupom, vendas com ele e painel do afiliado",
    "My coupon, sales made with it and affiliate panel",
    "Mi cupón, ventas con él y panel de afiliado",
  ],
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
  for (const [key, values] of Object.entries(OVERRIDE)) {
    if (dict.Wallet[key] !== values[idx]) {
      dict.Wallet[key] = values[idx];
      touched++;
      console.log(`[${locale}] ~ Wallet.${key} (override)`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(touched === 0 ? "nada a fazer (idempotente)" : `${touched} chave(s) gravada(s)`);
