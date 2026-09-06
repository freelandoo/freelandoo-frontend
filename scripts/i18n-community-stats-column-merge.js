/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da COLUNA RETRÁTIL dos números da comunidade.
//
// Membros, nível e XP (que eram uma fita de três) e benchmark, destaque e
// ranking (que eram a barra lateral) viraram UMA coluna enfileirada atrás de um
// botão que abre e fecha. As chaves dos blocos já existiam — o que nasce aqui é
// a barra que os esconde: o título dela e o que ela diz a quem não vê a tela.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-community-stats-column-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  statsTitle: ["Números da comunidade", "Community numbers", "Números de la comunidad"],
  statsAria: [
    "Números da comunidade: membros, nível, XP, benchmark, destaque e ranking",
    "Community numbers: members, level, XP, benchmark, spotlight and ranking",
    "Números de la comunidad: miembros, nivel, XP, benchmark, destacado y ranking",
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
