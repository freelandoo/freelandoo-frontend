/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do RANKING no pill rosa da Carteira (2026-09-08).
//
// Pedido do Alex: "tira a vaquinha do pill rosa, coloca o ranking ali, o mesmo
// parâmetro do games — likes, comentários, tempo online apenas dentro da
// plataforma financeira". A Vaquinha virou um botão dentro da Carteira, ao lado
// da Vida Financeira, e reusa as chaves que já tinha (`vaquinhaPill` e
// `vaquinhaPillAria`) — o rótulo não mudou por ter mudado de lugar.
//
// Padrão da casa: fill-if-absent no bloco NEW — nunca sobrescreve o que já está
// no dicionário.
//
// ⚠️ `rankingEmptyDesc` é OVERRIDE, não fill-if-absent: o valor antigo listava
// as três formas de pontuar e o tempo online não era uma delas (a fila do
// Financeiro nasceu sem presença própria). Com a mig 230 ele passou a contar, e
// deixar o texto velho faria a tela ensinar uma conta incompleta justamente a
// quem ainda não pontuou — que é quem está lendo essa frase.
//
// Uso: node scripts/i18n-finance-ranking-pill-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  rankingPill: ["Ranking", "Ranking", "Ranking"],
  rankingPillAria: [
    "Ranking do Financeiro na sua cidade e no seu estado",
    "Finance ranking in your city and state",
    "Ranking de Finanzas en tu ciudad y tu estado",
  ],
  // O {min} é substituído pelo peso que vem do BACKEND — a legenda não guarda
  // número nenhum, senão prometeria uma conta que a fila não faz.
  rankingLegendTime: [
    "{min} min no Financeiro = 1 ponto",
    "{min} min in Finance = 1 point",
    "{min} min en Finanzas = 1 punto",
  ],
  rankingMinutes: ["min online", "min online", "min en línea"],
};

/** chave → [pt, en, es] — SEMPRE sobrescreve (o valor antigo virou mentira). */
const OVERRIDE = {
  rankingEmptyDesc: [
    "Ninguém pontuou ainda neste recorte. Publique no Financeiro: curtida, comentário e compartilhamento dos outros viram pontos — e o tempo que você passa por aqui também conta.",
    "Nobody has scored here yet. Post in Finance: likes, comments and shares from others become points — and the time you spend here counts too.",
    "Nadie ha puntuado aún en este recorte. Publica en Finanzas: me gusta, comentarios y compartidos de otros se vuelven puntos — y el tiempo que pasas aquí también cuenta.",
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
