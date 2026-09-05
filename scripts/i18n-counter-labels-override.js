/* eslint-disable @typescript-eslint/no-require-imports */
// OVERRIDE dos rótulos dos contadores do headcard.
//
// É override, e não o fill-if-absent padrão da casa, porque as chaves JÁ
// EXISTEM e o que precisa mudar é o valor delas:
//
//  1. `Profile.followingShort` em pt era "Acompanhando" por extenso e não cabia
//     ao lado dos outros dois (pedido do Alex: abreviar). "Acomp.do" segue a
//     abreviação portuguesa de sufixo elevado e fica distinta de "Acomp.",
//     que é o contador vizinho (acompanham).
//  2. BUG: `Profile.followersShort` em INGLÊS dizia "Following" — o mesmo texto
//     do contador de acompanhados. O leitor em inglês via "Following" duas
//     vezes e nenhuma dizia "Followers". Regra do escoteiro.
//
// Idempotente por construção: depois da primeira passada os valores já são os
// novos e nada casa (2ª execução = 0 alterações).
//
// Uso: node scripts/i18n-counter-labels-override.js

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "messages");

/** locale → ns → chave → [de, para] */
const CHANGES = {
  "pt-BR": { Profile: { followingShort: ["Acompanhando", "Acomp.do"] } },
  en: {
    Profile: {
      followersShort: ["Following", "Followers"],
    },
  },
  es: {},
};

let changed = 0;

for (const [locale, namespaces] of Object.entries(CHANGES)) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const [ns, keys] of Object.entries(namespaces)) {
    for (const [key, [from, to]] of Object.entries(keys)) {
      if (dict[ns]?.[key] === from) {
        dict[ns][key] = to;
        changed++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`[i18n] ${changed} valor(es) alterado(s).`);
