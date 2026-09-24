/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do FEED DE CARROS (mig 259).
//
// O carro deixou de ser "uma comunidade por modelo" e virou "uma por carro do
// dono", como o pet. O que junta os donos do mesmo modelo passou a ser o feed
// da página de carro, com o recorte "todos os carros" × "mesmo carro que o meu".
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-car-feed-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  carFeedScopeAria: ["Filtrar o feed de carros", "Filter the car feed", "Filtrar el feed de autos"],
  carFeedAll: ["Todos os carros", "All cars", "Todos los autos"],
  carFeedSameModel: ["Mesmo carro que o meu", "Same car as mine", "Mismo auto que el mío"],
  carFeedNeedsModel: [
    "Escolha o modelo de um dos seus carros para ver quem tem o mesmo.",
    "Pick the model of one of your cars to see who has the same one.",
    "Elige el modelo de uno de tus autos para ver quién tiene el mismo.",
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
console.log(`i18n car feed: ${added} chaves adicionadas`);
