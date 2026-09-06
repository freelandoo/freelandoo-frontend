/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente da chave do PAYWALL DE PUBLICAÇÃO no seletor de perfil.
//
// A conta publica de graça; perfil adicional só com assinatura ativa. O
// seletor esmaece o perfil bloqueado e escreve o motivo embaixo do nome — é o
// aviso que faltava: antes o post era aceito e sumia do feed geral em silêncio.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-publish-paywall-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

// ⚠️ As chaves do dicionário são PLANAS com ponto no nome ("profile.clan"), não
// objetos aninhados: o `MessageDict` do provider é um mapa de string para
// string, e gravar um objeto aqui quebra o type check do build (quebrou).
/** chave → [pt, en, es] */
const COMPOSER = {
  "profile.needsSubscription": [
    "Precisa de assinatura para publicar",
    "Needs a subscription to publish",
    "Necesita suscripción para publicar",
  ],
};

let added = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  if (!dict.Composer) dict.Composer = {};
  // Limpa o aninhado que a 1ª versão deste script criou por engano.
  if (dict.Composer.profile && typeof dict.Composer.profile === "object") {
    delete dict.Composer.profile;
  }
  for (const [key, values] of Object.entries(COMPOSER)) {
    if (dict.Composer[key] === undefined) {
      dict.Composer[key] = values[i];
      added++;
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
