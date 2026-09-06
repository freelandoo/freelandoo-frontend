/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente do seletor de DESTINO do composer (último passo), que só
// aparece quando se publica de dentro de uma comunidade.
//
// O padrão é "Feed geral", que significa os DOIS lugares — comunidade e feed
// geral —, porque publicar dentro do grupo nunca deixou de ser publicar. A
// opção "Só na comunidade" é que tira o post do resto do site. Onde a
// comunidade é fechada (privada, condomínio, bairro) não há escolha: o rótulo
// vira aviso, e é a chave `destinationLocked`.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-composer-destination-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMPOSER = {
  "details.destinationLabel": [
    "Onde este post aparece",
    "Where this post shows up",
    "Dónde aparece esta publicación",
  ],
  "details.destinationGlobal": ["Feed geral", "Main feed", "Feed general"],
  "details.destinationCommunity": ["Só na comunidade", "Community only", "Solo en la comunidad"],
  "details.destinationGlobalHint": [
    "Aparece no feed geral e no feed da comunidade.",
    "Shows up in the main feed and in the community feed.",
    "Aparece en el feed general y en el feed de la comunidad.",
  ],
  "details.destinationCommunityHint": [
    "Fica só no feed da comunidade — não vai para o feed geral nem para o seu perfil.",
    "Stays in the community feed only — it won't go to the main feed or your profile.",
    "Queda solo en el feed de la comunidad — no va al feed general ni a tu perfil.",
  ],
  "details.destinationLocked": [
    "Esta comunidade é fechada: o post fica só aqui dentro.",
    "This community is closed: the post stays in here only.",
    "Esta comunidad es cerrada: la publicación queda solo aquí dentro.",
  ],
};

const NAMESPACES = { Composer: COMPOSER };

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
