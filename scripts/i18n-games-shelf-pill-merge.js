/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — a ESTANTE vira pill amarelo e sala própria em
// `/games/estante`, e a grade de plataformas fica só com a Steam (2026-09-10).
//
// Pedido do Alex: "crie um pill amarelo, estante, e migre a estante para um
// pill no card da foto, e também deixe só a conexão com a steam. tire as
// outras".
//
// DUAS partes, com regimes DIFERENTES:
//   1. `Games.*` — chaves NOVAS (o pill e o título da sala), fill-if-absent.
//   2. `Gamer.intro` — OVERRIDE: a frase dizia "Conecte uma plataforma", e com
//      a grade reduzida à Steam ela prometeria uma escolha que a tela não
//      oferece. Dicionário vence fallback, então trocar só o fallback inline
//      não mudaria a tela — por isso o valor é sobrescrito.
//
// As chaves `Games.tabFeed`/`tabShelf` (as abas da raiz) e `Gamer.xboxReason`/
// `playstationReason`/`nintendoReason`/`statusPlanned`/`statusUnavailable`
// ficam órfãs, padrão da casa.
//
// Uso: node scripts/i18n-games-shelf-pill-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_GAMES = {
  shelfPill: ["Estante", "Shelf", "Estantería"],
  shelfPillAria: [
    "A sua estante de jogos, trazida da Steam",
    "Your game shelf, pulled from Steam",
    "Tu estantería de juegos, traída de Steam",
  ],
  shelfTitle: ["Estante", "Shelf", "Estantería"],
  shelfTitleOf: ["Estante de {who}", "{who}'s shelf", "Estantería de {who}"],
};

/** chave → [pt, en, es] — SOBRESCREVE o que está no dicionário. */
const OVERRIDE_GAMER = {
  intro: [
    "Conecte a sua conta da Steam e seus jogos, horas e conquistas entram aqui sozinhos, sem cadastrar nada na mão. Depois é só digitar o @ de alguém para ver o que vocês jogam em comum.",
    "Connect your Steam account and your games, hours and achievements show up here on their own, nothing to type in. Then just enter someone's @ to see what you both play.",
    "Conecta tu cuenta de Steam y tus juegos, horas y logros entran aquí solos, sin registrar nada a mano. Después basta escribir el @ de alguien para ver qué juegan en común.",
  ],
};

let touched = 0;

LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Games = dict.Games || {};
  dict.Gamer = dict.Gamer || {};

  for (const [key, values] of Object.entries(NEW_GAMES)) {
    if (dict.Games[key] === undefined) {
      dict.Games[key] = values[idx];
      touched++;
      console.log(`[${locale}] + Games.${key}`);
    }
  }

  for (const [key, values] of Object.entries(OVERRIDE_GAMER)) {
    if (dict.Gamer[key] !== values[idx]) {
      dict.Gamer[key] = values[idx];
      touched++;
      console.log(`[${locale}] ~ Gamer.${key}`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(touched === 0 ? "nada a fazer (idempotente)" : `${touched} chave(s) gravada(s)`);
