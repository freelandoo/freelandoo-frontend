/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente do rótulo da porta de publicar DENTRO do feed da comunidade.
//
// O feed ganhou as duas caras da mesma porta: sem nenhuma publicação, um botão
// grande no lugar da caixa "ainda não há publicações"; com publicações, uma
// faixa fina no topo da lista. As duas são variantes do `PublishMenuButton`, e
// o rótulo é um só — "Postar" — porque é a mesma ação.
//
// `composeCta` ("Publicar") continua sendo o aria-label do botão do headcard e
// não foi reaproveitada aqui de propósito: ali ela nomeia um "+" sem texto, e
// aqui o texto é lido na tela.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-community-feed-publish-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  publishFeedCta: ["Postar", "Post", "Publicar"],
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
