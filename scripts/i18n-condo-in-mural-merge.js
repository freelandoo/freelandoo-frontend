/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do PRÉDIO dentro do pill Mural.
//
// Portaria, planta, disputas, avisos, enquetes, moradores e administração
// saíram do corpo da página do condomínio e foram para dentro do painel do
// pill MURAL (atrás da foto). O corpo passou a começar direto nas abas — feed
// e as duas vitrines.
//
// São três chaves e cada uma existe por um motivo:
//
//  · `condoPanelTitle` — o painel deixou de ser só "Mural do líder": com a
//    planta do prédio dentro, aquele título mentiria sobre o que está ali.
//  · `condoPillAria`  — o leitor de tela precisa ouvir o que o botão abre, e
//    no condomínio ele abre o prédio, não um quadro de recados.
//  · `condoPillDot`   — o que a BOLINHA está avisando. Ela é o único sinal de
//    que existe porta atrás do botão para quem ainda não confirmou o
//    apartamento (e sem confirmar não se publica, não se vota e não se vê os
//    vizinhos).
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-condo-in-mural-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  condoPanelTitle: ["O prédio", "The building", "El edificio"],
  condoPillAria: [
    "O prédio: portaria, planta, avisos, enquetes e moradores",
    "The building: front desk, floor plan, notices, polls and residents",
    "El edificio: portería, plano, avisos, encuestas y residentes",
  ],
  condoPillDot: [
    "Confirme seu apartamento",
    "Confirm your apartment",
    "Confirme su apartamento",
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
