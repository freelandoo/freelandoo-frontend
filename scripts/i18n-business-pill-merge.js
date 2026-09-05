/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do pill "Business".
//
// A comunidade da pessoa saiu do menu da foto de perfil e virou o quarto pill
// retrátil do headcard (rosa, ícone de estrela). O rótulo é curto de propósito:
// pill aberto que não cabe empurra o conteúdo à direita da foto.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-business-pill-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const ACCOUNT = {
  businessPill: ["Business", "Business", "Business"],
  openCommunityAria: [
    "Abrir minha comunidade",
    "Open my community",
    "Abrir mi comunidad",
  ],
};

const NAMESPACES = { Account: ACCOUNT };

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
