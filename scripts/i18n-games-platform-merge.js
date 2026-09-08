/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da PLATAFORMA DE GAMES.
//
// A comunidade de games deixou de ser comunidade com membros e virou uma
// plataforma dentro da Freelandoo (um espaço por pessoa, mig 210). A pilha do
// headcard mudou junto: saiu o pill azul de Perfil — enxame, privacidade e
// temporada são perguntas sobre um GRUPO — e entraram "Jogo atual" (o painel
// laranja, no lugar que era do Mural) e "Posts de games" (a vitrine). O pill
// roxo do Ranking continua igual e por isso NÃO aparece aqui: as chaves dele
// já nasceram no `i18n-community-ranking-page-merge.js`.
//
// O que já existia no ns Community e é reusado (conferido antes de escrever
// isto): platformMobile, platformRetro, platformOther, gameTitleLabel,
// gamertagLabel, subjectGameTitle e notFound.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-games-platform-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  gamePill: ["Jogo atual", "Now playing", "Jugando ahora"],
  gamePillAria: [
    "Jogo atual: plataforma, título e nick",
    "Now playing: platform, title and handle",
    "Jugando ahora: plataforma, título y nick",
  ],
  gameSaveHint: [
    "Vai junto do Salvar lá em cima, com o nome e a foto.",
    "Saved together with the name and photo, from the button above.",
    "Se guarda junto con el nombre y la foto, desde el botón de arriba.",
  ],
  gameNotSetRead: [
    "O jogo ainda não foi escolhido.",
    "No game picked yet.",
    "Todavía no se eligió el juego.",
  ],

  gamePostsPill: ["Posts de games", "Game posts", "Posts de juegos"],
  gamePostsPillAria: [
    "Vitrine com os posts de games",
    "Showcase with the game posts",
    "Vitrina con los posts de juegos",
  ],
  gamePostsTitle: ["Posts de games", "Game posts", "Posts de juegos"],
  gamePostsEmpty: [
    "Nenhum post de games ainda.",
    "No game posts yet.",
    "Todavía no hay posts de juegos.",
  ],
  gamePostsLocked: [
    "Esta comunidade é fechada — entre nela para ver os posts.",
    "This community is closed — join it to see the posts.",
    "Esta comunidad es cerrada — únete para ver los posts.",
  ],
  gamePostsMore: ["Ver mais", "Load more", "Ver más"],

  // O RANKING da plataforma. A régua deixou de ser XP de membros (não há
  // membros) e passou a ser hora jogada — a única medida que a plataforma
  // conectada VERIFICA. Digitado à mão, "3.000 horas" não valeria nada.
  rankingUnitHours: ["horas jogadas", "hours played", "horas jugadas"],
  rankingEyebrowGames: [
    "quem mais jogou na plataforma",
    "who played the most on the platform",
    "quién más jugó en la plataforma",
  ],
  rankingEmptyGames: [
    "Ninguém conectou uma plataforma com a estante pública ainda.",
    "Nobody has connected a platform with a public shelf yet.",
    "Nadie conectó una plataforma con la estantería pública todavía.",
  ],
  rankingYouLabel: ["Sua posição", "Your position", "Tu posición"],
  rankingYouOf: ["de", "of", "de"],
  rankingYouGames: ["jogos", "games", "juegos"],
  rankingYouAbsent: [
    "Você ainda não está na fila: conecte uma plataforma e deixe a estante pública.",
    "You are not on the board yet: connect a platform and make your shelf public.",
    "Todavía no estás en la lista: conecta una plataforma y deja la estantería pública.",
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
