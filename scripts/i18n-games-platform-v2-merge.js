/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente do namespace `Games` — a PLATAFORMA de games nos moldes do
// Financeiro (2026-09-10).
//
// Pedido do Alex: "eu pedi para demolir tudo e agora pedi para criar igual o
// financeiro, não uma comunidade, mas uma plataforma, nos moldes do
// financeiro". O namespace antigo (`Gamer`) e as chaves de games do `Community`
// saíram com a demolição; este é NOVO, e é o das telas de `/games`.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-games-platform-v2-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  // Headcard
  back: ["Voltar", "Back", "Volver"],
  platformTitle: ["Games", "Games", "Games"],
  platformLabel: ["Plataforma", "Platform", "Plataforma"],
  gamePill: ["Jogo atual", "Now playing", "Juego actual"],
  gamePillAria: [
    "O jogo que você está jogando agora",
    "The game you are playing right now",
    "El juego que estás jugando ahora",
  ],
  postsPill: ["Posts de games", "Game posts", "Posts de games"],
  postsPillAria: [
    "Os seus posts publicados em games",
    "Your posts published in Games",
    "Tus posts publicados en Games",
  ],
  rankingPill: ["Ranking", "Ranking", "Ranking"],
  rankingPillAria: [
    "Ranking de games na sua cidade, no seu estado e por horas jogadas",
    "Games ranking in your city, your state and by hours played",
    "Ranking de games en tu ciudad, tu estado y por horas jugadas",
  ],
  // Foto dentro da plataforma (mig 233)
  platformPhotoChange: ["Trocar a foto no Games", "Change your photo in Games", "Cambiar la foto en Games"],
  platformPhotoReset: ["Usar a minha foto de perfil", "Use my profile photo", "Usar mi foto de perfil"],
  platformPhotoHint: [
    "Vale só aqui dentro — a sua foto de perfil continua a mesma no resto do site.",
    "Only applies in here — your profile photo stays the same everywhere else.",
    "Vale solo aquí dentro: tu foto de perfil sigue igual en el resto del sitio.",
  ],
  platformPhotoError: [
    "Não deu para trocar a foto. Tente de novo.",
    "Couldn't change the photo. Try again.",
    "No se pudo cambiar la foto. Inténtalo de nuevo.",
  ],
  // Feed
  composeCta: ["Publicar", "Publish", "Publicar"],
  postLabel: ["Post", "Post", "Post"],
  curtoLabel: ["Curto", "Short", "Corto"],
  beeLabel: ["Bee", "Bee", "Bee"],
  recadoLabel: ["Recado", "Note", "Recado"],
  publishCta: ["Publicar no Games", "Publish in Games", "Publicar en Games"],
  loadError: ["Não deu pra abrir o Games.", "Couldn't open Games.", "No se pudo abrir Games."],
  loadFailedTitle: ["Não deu pra carregar.", "Couldn't load.", "No se pudo cargar."],
  loadMore: ["Carregar mais", "Load more", "Cargar más"],
};

let touched = 0;

LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Games = dict.Games || {};

  for (const [key, values] of Object.entries(NEW)) {
    if (dict.Games[key] === undefined) {
      dict.Games[key] = values[idx];
      touched++;
      console.log(`[${locale}] + Games.${key}`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(touched === 0 ? "nada a fazer (idempotente)" : `${touched} chave(s) gravada(s)`);
