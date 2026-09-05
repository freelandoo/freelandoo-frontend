/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente do rótulo da fila de redes sociais do headcard.
//
// O Mural saiu da fila de chips (virou item do menu da engrenagem / da toolbar
// retrátil), então sobrou o "+" pontilhado sozinho — sem dizer de que era. O
// rótulo nomeia a fila nas DUAS superfícies: `Profile.mySocials` no headcard do
// perfil e `Account.mySocialsLabel` no do /account (chaves separadas porque os
// dois arquivos leem namespaces diferentes).
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-my-socials-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const PROFILE = {
  mySocials: ["Minhas redes", "My socials", "Mis redes"],
};

const ACCOUNT = {
  mySocialsLabel: ["Minhas redes", "My socials", "Mis redes"],
};

const NAMESPACES = { Profile: PROFILE, Account: ACCOUNT };

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
  console.log(`[i18n] ${locale} atualizado`);
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
