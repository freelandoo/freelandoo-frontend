/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do modal de "arquivo muito grande" que passou a
// COMPRIMIR no lugar, em vez de mandar a pessoa para /comprimir em outra aba.
//
// `compressing` e `errGeneric` já existem no namespace (vieram da ferramenta
// /comprimir) e são reusadas — fill-if-absent não as toca.
//
// Uso: node scripts/i18n-compress-inline-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMPRESS = {
  compressNow: ["Comprimir agora", "Compress now", "Comprimir ahora"],
  oversizeBodyHere: [
    "O limite aqui é {limit}. Dá pra deixar esse arquivo mais leve agora mesmo.",
    "The limit here is {limit}. We can make this file lighter right now.",
    "El límite aquí es {limit}. Podemos dejar este archivo más liviano ahora mismo.",
  ],
};

const NAMESPACES = { Compress: COMPRESS };

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
