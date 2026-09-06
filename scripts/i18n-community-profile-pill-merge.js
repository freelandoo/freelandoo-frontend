/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do botão "Perfil" da comunidade.
//
// O que a comunidade É — enxame, privacidade, temporada e o texto do líder —
// saiu de quatro blocos empilhados no meio da página e foi para dentro de um
// botão retrátil atrás da foto, o mesmo mecanismo dos pills do headcard do
// perfil. As chaves novas são as do PAINEL e as das versões de LEITURA: os
// blocos antigos só existiam no modo de edição do líder, então nunca houve
// texto para "não há temporada" ou "o líder ainda não escreveu".
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-community-profile-pill-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  profilePill: ["Perfil", "Profile", "Perfil"],
  profilePillAria: [
    "Perfil da comunidade: enxame, privacidade, temporada e sobre",
    "Community profile: swarm, privacy, season and about",
    "Perfil de la comunidad: enjambre, privacidad, temporada y sobre",
  ],
  profilePanelTitle: ["Perfil da comunidade", "Community profile", "Perfil de la comunidad"],
  panelClose: ["Fechar", "Close", "Cerrar"],
  enxameNotSet: [
    "Ainda sem enxame escolhido.",
    "No swarm chosen yet.",
    "Todavía sin enjambre elegido.",
  ],
  privacyPublicRead: [
    "Qualquer pessoa entra de graça, e os posts daqui também aparecem no feed.",
    "Anyone can join for free, and posts from here also show up in the feed.",
    "Cualquiera entra gratis, y las publicaciones de aquí también aparecen en el feed.",
  ],
  privacyPrivateRead: [
    "Entrar aqui exige assinatura mensal, e o que se publica fica só dentro da comunidade.",
    "Joining requires a monthly subscription, and what is posted stays inside the community.",
    "Entrar exige una suscripción mensual, y lo que se publica queda solo dentro de la comunidad.",
  ],
  goalNoneRead: [
    "Nenhuma temporada em andamento.",
    "No season running.",
    "Ninguna temporada en curso.",
  ],
  bioEmptyRead: [
    "O líder ainda não escreveu sobre a comunidade.",
    "The leader hasn't written about the community yet.",
    "El líder aún no ha escrito sobre la comunidad.",
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
  console.log(`[i18n] ${locale} atualizado`);
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
