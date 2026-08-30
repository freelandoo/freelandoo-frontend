/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do botão "+" de publicar no headcard.
//
// A barra "Poste ou escreva um recado" do mural virou um quadrado amarelo com
// "+" dentro do headcard, em TODA superfície de comunidade (comunidade comum,
// condomínio, bairro e academia). A academia não tinha as chaves do botão —
// só a comunidade tinha.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-publish-plus-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const ACADEMIES = {
  composeCta: ["Publicar", "Publish", "Publicar"],
  composeHint: ["Publicar no mural", "Post on the wall", "Publicar en el muro"],
  joinToPost: [
    "Vincule sua matrícula para publicar.",
    "Link your membership to publish.",
    "Vincula tu matrícula para publicar.",
  ],
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
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added}`);
