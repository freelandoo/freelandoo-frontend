/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da VITRINE DE SERVIÇOS EM FILEIRA.
//
// A vitrine deixou de ser grade e virou um trilho horizontal de uma linha só,
// com setas para alcançar os serviços que não couberam na tela.
//
// ⚠️ `serviceColumns` ("Colunas") fica ÓRFÃ no dicionário, e de propósito: o
// controle continua existindo, mas o número agora diz quantos cards cabem POR
// TELA — numa fileira não há colunas, e sobrescrever o valor da chave antiga
// mudaria o texto sem mudar o nome, que é como se perde o rastro depois.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-site-services-rail-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY_SITE = {
  servicePerView: ["Por tela", "Per view", "Por pantalla"],
  serviceNoPhoto: [
    "Sem foto — adicione no cadastro do serviço",
    "No photo — add it in the service settings",
    "Sin foto — agrégala en los ajustes del servicio",
  ],
  servicePrev: ["Ver serviços anteriores", "See previous services", "Ver servicios anteriores"],
  serviceNext: ["Ver mais serviços", "See more services", "Ver más servicios"],
};

const NAMESPACES = { CommunitySite: COMMUNITY_SITE };

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
