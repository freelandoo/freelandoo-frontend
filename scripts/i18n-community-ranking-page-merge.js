/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do BOTÃO e da PÁGINA do ranking.
//
// O headcard da comunidade ganhou o terceiro pill (Ranking, roxo), abaixo do
// Mural, e ele abre uma página inteira de pódio — `/comunidades/<id>/ranking`.
// A academia ganhou o MESMO pill apontando para a página que ela já tinha, e
// por isso as duas chaves do botão nascem nos dois namespaces: a porta é a
// mesma, o texto é o mesmo, e é a superfície que muda.
//
// O que a página reusa (metricXp/metricPosts/metricShares, goalEnded,
// goalDaysLeft, goalDaysWord, membersEmpty, postsEngHint, roleMember, notFound)
// JÁ existe no ns Community — conferido antes de escrever isto. O que nasce
// aqui é só o vocabulário do pódio.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-community-ranking-page-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  rankingPill: ["Ranking", "Ranking", "Ranking"],
  rankingPillAria: [
    "Abrir o ranking completo da comunidade",
    "Open the community's full ranking",
    "Abrir el ranking completo de la comunidad",
  ],
  rankingSeeAll: ["Ver ranking completo", "See full ranking", "Ver ranking completo"],
  rankingHeading: ["O pódio.", "The podium.", "El podio."],
  rankingListHeading: ["A lista inteira", "The whole list", "La lista completa"],
  rankingEyebrowXp: ["o topo da comunidade", "the top of the community", "la cima de la comunidad"],
  rankingTabSeason: ["Temporada", "Season", "Temporada"],
  rankingTabXp: ["XP geral", "Overall XP", "XP general"],
  rankingLocked: [
    "Só quem é da comunidade vê o ranking.",
    "Only community members can see the ranking.",
    "Solo quien es de la comunidad ve el ranking.",
  ],
  rankingGoToCommunity: ["Ir para a comunidade", "Go to the community", "Ir a la comunidad"],
  rankingEmptySeason: [
    "Ninguém pontuou nesta temporada ainda.",
    "Nobody has scored this season yet.",
    "Nadie ha puntuado en esta temporada todavía.",
  ],
  rankingLoadError: [
    "Não deu para carregar o ranking agora.",
    "Couldn't load the ranking right now.",
    "No se pudo cargar el ranking ahora.",
  ],
};

const ACADEMIES = {
  rankingPill: ["Ranking", "Ranking", "Ranking"],
  rankingPillAria: [
    "Abrir o ranking completo da academia",
    "Open the gym's full ranking",
    "Abrir el ranking completo del gimnasio",
  ],
};

const NAMESPACES = { Community: COMMUNITY, Academies: ACADEMIES };

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
