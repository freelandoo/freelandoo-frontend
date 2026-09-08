/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente do RANKING DE ATIVIDADE da plataforma de games (mig 226).
//
// Pedido do Alex (2026-09-07): o ranking de games passa a usar as métricas que
// já existem no resto da plataforma — curtida, comentário e compartilhamento —
// contadas SÓ pelo que acontece dentro da plataforma de games, mais o tempo
// online lá dentro, e comparadas por CIDADE e por ESTADO.
//
// A fila de horas da Steam (mig 220) continua, como terceira aba: são duas
// perguntas diferentes ("quem joga mais" × "quem está mais presente aqui"), e
// por isso as chaves dela NÃO aparecem aqui — já existem no
// `i18n-games-platform-merge.js` e no `i18n-community-ranking-page-merge.js`.
//
// O que já existia no ns Community e é reusado (conferido antes de escrever
// isto): rankingYouLabel, rankingYouOf, rankingHeading, rankingLoadError,
// rankingGoToCommunity, rankingEmptyGames, rankingTabSeason e rankingTabXp.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-games-ranking-city-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  // ─── As três abas ─────────────────────────────────────────────────────────
  rankingTabCity: ["Minha cidade", "My city", "Mi ciudad"],
  rankingTabState: ["Meu estado", "My state", "Mi estado"],
  rankingTabPlaytime: ["Horas jogadas", "Hours played", "Horas jugadas"],

  // ─── Cabeçalho do pódio ───────────────────────────────────────────────────
  rankingUnitPoints: ["pontos de atividade", "activity points", "puntos de actividad"],
  rankingEyebrowCity: [
    "quem mais aparece na sua cidade",
    "who shows up the most in your city",
    "quién aparece más en tu ciudad",
  ],
  rankingEyebrowState: [
    "quem mais aparece no seu estado",
    "who shows up the most in your state",
    "quién aparece más en tu estado",
  ],

  // ─── Vazio: "ninguém pontuou" e "você não disse onde mora" são DIFERENTES ──
  rankingEmptyCity: [
    "Ninguém da sua cidade pontuou na plataforma de games ainda.",
    "Nobody from your city has scored on the games platform yet.",
    "Nadie de tu ciudad ha puntuado en la plataforma de games todavía.",
  ],
  rankingEmptyState: [
    "Ninguém do seu estado pontuou na plataforma de games ainda.",
    "Nobody from your state has scored on the games platform yet.",
    "Nadie de tu estado ha puntuado en la plataforma de games todavía.",
  ],
  rankingNoCity: [
    "Este ranking compara quem é da sua cidade — e a sua ainda não está declarada.",
    "This board compares people from your city — and yours is not set yet.",
    "Este ranking compara a quien es de tu ciudad — y la tuya aún no está definida.",
  ],
  rankingSetCity: ["Declarar minha cidade", "Set my city", "Definir mi ciudad"],

  // ─── A linha "sua posição", com a conta aberta ────────────────────────────
  rankingPointsShort: ["pts", "pts", "pts"],
  rankingYouLikes: ["curtidas", "likes", "me gusta"],
  rankingYouComments: ["comentários", "comments", "comentarios"],
  rankingYouShares: ["compart.", "shares", "compart."],
  rankingYouMinutes: ["min online", "min online", "min en línea"],
  rankingYouAbsentActivity: [
    "Você ainda não pontuou aqui: publique na plataforma de games e apareça.",
    "You have not scored here yet: post on the games platform and show up.",
    "Todavía no has puntuado aquí: publica en la plataforma de games y aparece.",
  ],
  rankingGoPublish: ["Publicar", "Post", "Publicar"],

  // Os NÚMEROS desta frase vêm do backend (a resposta carrega os pesos): o
  // texto só tem os lugares onde eles entram. Copiá-los para cá faria a legenda
  // prometer uma conta que a fila não faz no dia em que um peso mudasse.
  rankingActivityHint: [
    "Curtida {like} · comentário {comment} · compartilhamento {share} · {min} min online = 1 ponto",
    "Like {like} · comment {comment} · share {share} · {min} min online = 1 point",
    "Me gusta {like} · comentario {comment} · compartir {share} · {min} min en línea = 1 punto",
  ],
};

const NAMESPACES = { Community: COMMUNITY };

let added = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
