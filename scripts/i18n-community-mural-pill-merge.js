/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do botão "Mural" da comunidade.
//
// O mural do líder saiu do meio da página e virou o segundo botão retrátil
// atrás da foto (laranja, embaixo do azul "Perfil"), em TODA comunidade. O
// rótulo do pill é curto de propósito — "Mural do líder" (chave `muralTitle`,
// que segue sendo o título do painel) não cabe sem empurrar o nome da
// comunidade. A chave de recusa é nova: o bloco antigo simplesmente não
// aparecia para quem não é membro, e botão que abre o nada parece quebrado.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-community-mural-pill-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  muralPill: ["Mural", "Board", "Muro"],
  muralPillAria: [
    "Mural do líder: recados da comunidade",
    "Leader's board: community notices",
    "Muro del líder: recados de la comunidad",
  ],
  muralMembersOnly: [
    "Só quem é da comunidade lê o mural.",
    "Only community members can read the board.",
    "Solo quien es de la comunidad lee el muro.",
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
