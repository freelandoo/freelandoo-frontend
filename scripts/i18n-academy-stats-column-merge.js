/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da GAVETA dos números da academia.
//
// A academia ganhou o mesmo sidebar da comunidade: a pontinha da seta na borda
// direita abre vinculados, professores, destaque e ranking do mês. Professores
// e Ranking saíram do menu "+" (que volta a ser só publicar), então as chaves
// deles já existiam — o que nasce aqui é o título da gaveta, o destaque do mês
// e os estados do ranking.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-academy-stats-column-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const ACADEMIES = {
  statsTitle: ["Números da academia", "Gym numbers", "Números del gimnasio"],
  statsAria: [
    "Números da academia: vinculados, professores, destaque e ranking do mês",
    "Gym numbers: members, trainers, spotlight and monthly ranking",
    "Números del gimnasio: vinculados, profesores, destacado y ranking del mes",
  ],
  spotlightTitle: ["Destaque", "Spotlight", "Destacado"],
  spotlightSub: ["Mais frequente do mês", "Most frequent this month", "Más frecuente del mes"],
  rankFreqDays: ["{n} dias", "{n} days", "{n} días"],
  rankingEmpty: [
    "Ninguém treinou este mês ainda.",
    "Nobody has trained this month yet.",
    "Nadie ha entrenado este mes todavía.",
  ],
  rankingError: [
    "Não deu para carregar o ranking agora.",
    "Couldn't load the ranking right now.",
    "No se pudo cargar el ranking ahora.",
  ],
  rankingSeeAll: ["Ver ranking completo", "See full ranking", "Ver ranking completo"],
};

const NAMESPACES = { Academies: ACADEMIES };

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
