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

// ── G2: o ranking (cidade · estado · horas) ────────────────────────────────
Object.assign(NEW, {
  rankingTitle: ["Ranking", "Ranking", "Ranking"],
  scopeCity: ["Minha cidade", "My city", "Mi ciudad"],
  scopeState: ["Meu estado", "My state", "Mi estado"],
  scopeHours: ["Horas jogadas", "Hours played", "Horas jugadas"],
  rankingNoPlaceTitle: ["Diga em que cidade você está", "Tell us which city you are in", "Dinos en qué ciudad estás"],
  rankingNoPlaceDesc: [
    "A fila de games é por cidade e por estado. Complete a cidade no seu perfil para entrar nela.",
    "The games ranking is by city and by state. Add your city to your profile to join it.",
    "El ranking de games es por ciudad y por estado. Completa la ciudad en tu perfil para entrar.",
  ],
  rankingNoPlaceCta: ["Completar meu perfil", "Complete my profile", "Completar mi perfil"],
  rankingEmptyTitle: ["A fila ainda está vazia por aqui", "The ranking is still empty here", "El ranking todavía está vacío aquí"],
  rankingEmptyDesc: [
    "Ninguém pontuou ainda neste recorte. Publique no Games: curtida, comentário e compartilhamento dos outros viram pontos — e o tempo que você passa por aqui também conta.",
    "Nobody has scored in this scope yet. Publish in Games: other people's likes, comments and shares become points — and the time you spend here counts too.",
    "Nadie ha puntuado todavía en este recorte. Publica en Games: los likes, comentarios y compartidos de los demás se vuelven puntos — y el tiempo que pasas aquí también cuenta.",
  ],
  rankingEmptyCta: ["Ir para o feed", "Go to the feed", "Ir al feed"],
  rankingYou: ["Sua posição", "Your position", "Tu posición"],
  rankingMinutes: ["min online", "min online", "min en línea"],
  rankingLegend: ["Como pontua:", "How it scores:", "Cómo puntúa:"],
  rankingLegendLike: ["curtida", "like", "me gusta"],
  rankingLegendComment: ["comentário", "comment", "comentario"],
  rankingLegendShare: ["compartilhamento", "share", "compartido"],
  rankingLegendTime: ["{min} min no Games = 1 ponto", "{min} min in Games = 1 point", "{min} min en Games = 1 punto"],
  rankingLegendSelf: [
    "O que você mesmo curte no seu post não conta.",
    "Liking your own post doesn't count.",
    "Lo que tú mismo das me gusta en tu post no cuenta.",
  ],
  hoursLockedTitle: ["A Estante está desligada", "The Shelf is off", "La Estantería está apagada"],
  hoursLockedDesc: [
    "A fila de horas vem das plataformas conectadas (Steam), e a conexão está desligada no momento.",
    "The hours ranking comes from connected platforms (Steam), and the connection is currently off.",
    "El ranking de horas viene de las plataformas conectadas (Steam), y la conexión está apagada por ahora.",
  ],
  hoursEmptyTitle: ["Ninguém entrou na fila de horas ainda", "Nobody is in the hours ranking yet", "Nadie entró al ranking de horas todavía"],
  hoursEmptyDesc: [
    "Quem conecta a Steam com a estante pública entra aqui com as horas que a plataforma verifica.",
    "Whoever connects Steam with a public shelf enters here with the hours the platform verifies.",
    "Quien conecta Steam con la estantería pública entra aquí con las horas que la plataforma verifica.",
  ],
  hoursMeNone: [
    "Você ainda não está na fila: conecte uma plataforma com a estante pública para entrar.",
    "You are not in the ranking yet: connect a platform with a public shelf to join.",
    "Todavía no estás en el ranking: conecta una plataforma con la estantería pública para entrar.",
  ],
  hoursGames: ["{n} jogos", "{n} games", "{n} juegos"],
  hoursLabel: ["{h} h", "{h} h", "{h} h"],
});

// ── G3: o jogo atual e a vitrine de posts ──────────────────────────────────
Object.assign(NEW, {
  gameTitle: ["Jogo atual", "Now playing", "Juego actual"],
  gameOfTitle: ["O jogo de {who}", "{who}'s game", "El juego de {who}"],
  gameHint: [
    "Vale só dentro do Games e aparece para quem visita o seu",
    "Only lives inside Games and shows to whoever visits yours",
    "Vale solo dentro de Games y aparece para quien visita el tuyo",
  ],
  gameReadOnly: ["O que essa pessoa está jogando", "What this person is playing", "Lo que esta persona está jugando"],
  gameTitleLabel: ["Jogo", "Game", "Juego"],
  gameTitlePlaceholder: ["O que você está jogando agora?", "What are you playing right now?", "¿Qué estás jugando ahora?"],
  gamePlatformLabel: ["Plataforma", "Platform", "Plataforma"],
  gamePlatformNone: ["Escolha…", "Choose…", "Elige…"],
  gamertagLabel: ["Gamertag", "Gamertag", "Gamertag"],
  gamertagPlaceholder: ["Seu nome nas plataformas", "Your name on the platforms", "Tu nombre en las plataformas"],
  gameSave: ["Salvar", "Save", "Guardar"],
  gameSaved: ["Jogo atual salvo.", "Now playing saved.", "Juego actual guardado."],
  gameSaveError: ["Não deu para salvar.", "Couldn't save.", "No se pudo guardar."],
  gameEmptyOther: ["{who} ainda não disse o que está jogando.", "{who} hasn't said what they're playing yet.", "{who} todavía no dijo qué está jugando."],
  platformPc: ["PC", "PC", "PC"],
  platformPlaystation: ["PlayStation", "PlayStation", "PlayStation"],
  platformXbox: ["Xbox", "Xbox", "Xbox"],
  platformNintendo: ["Nintendo", "Nintendo", "Nintendo"],
  platformMobile: ["Celular", "Mobile", "Celular"],
  platformRetro: ["Retrô", "Retro", "Retro"],
  platformOther: ["Outra", "Other", "Otra"],
  seeMine: ["Ver o meu games", "See my games", "Ver mi games"],
  postsTitle: ["Posts de games", "Game posts", "Posts de games"],
  postsTitleOf: ["Posts de {who}", "{who}'s posts", "Posts de {who}"],
  postsEmptyMine: ["Você ainda não publicou nada no Games.", "You haven't published anything in Games yet.", "Todavía no publicaste nada en Games."],
  postsEmptyOther: ["{who} ainda não publicou nada aqui.", "{who} hasn't published anything here yet.", "{who} todavía no publicó nada aquí."],
});


// ── G4: as abas da raiz (Feed · Estante) ───────────────────────────────────
Object.assign(NEW, {
  tabFeed: ["Feed", "Feed", "Feed"],
  tabShelf: ["Estante", "Shelf", "Estantería"],
});
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
