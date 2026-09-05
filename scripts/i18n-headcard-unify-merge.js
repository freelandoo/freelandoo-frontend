/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do headcard unificado (U2b).
//
// O ProfileHeadCard passou a desenhar o headcard das DUAS telas e ganhou o
// terceiro contador ("Acompanhando"), que só existia no /account. As traduções
// são as mesmas que o ns Account já usava — copiadas para o ns Profile, que é o
// que o componente lê.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-headcard-unify-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const PROFILE = {
  followingShort: ["Acompanhando", "Following", "Siguiendo"],
  seeFollowingAria: [
    "Ver quem este perfil acompanha",
    "See who this profile follows",
    "Ver a quién sigue este perfil",
  ],
};

const NAMESPACES = { Profile: PROFILE };

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
