/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — o "aviãozinho" de CONVITE dos headcards de comunidade
// e academia (2026-09-10): compartilha o link da página para prospectar
// membros (compartilhar nativo, WhatsApp, copiar link).
//
// Pedido do Alex: "crie um botão aviãozinho de compartilhamento que servirá
// como convite para as comunidades, para compartilhar o link da comunidade
// para prospectar membros, inclusive meu negócio, e academias, condomínio".
//
// Namespace NOVO `Invite` (a peça serve Community e Academies de uma vez),
// fill-if-absent. Uso: node scripts/i18n-invite-share-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_INVITE = {
  cta: ["Convidar pessoas", "Invite people", "Invitar personas"],
  menuTitle: ["Convidar para {name}", "Invite to {name}", "Invitar a {name}"],
  share: ["Compartilhar", "Share", "Compartir"],
  whatsapp: ["WhatsApp", "WhatsApp", "WhatsApp"],
  copy: ["Copiar link", "Copy link", "Copiar enlace"],
  copied: ["Link copiado!", "Link copied!", "¡Enlace copiado!"],
  copyFailed: ["Não deu pra copiar o link.", "Couldn't copy the link.", "No se pudo copiar el enlace."],
  message: [
    "Vem fazer parte de {name} na Freelandoo!",
    "Come join {name} on Freelandoo!",
    "¡Ven a formar parte de {name} en Freelandoo!",
  ],
};

let totalAdded = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Invite = dict.Invite || {};
  let added = 0;
  for (const [key, values] of Object.entries(NEW_INVITE)) {
    if (dict.Invite[key] === undefined) {
      dict.Invite[key] = values[idx];
      added += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${added} chaves adicionadas ao ns Invite`);
  totalAdded += added;
});
console.log(`total: ${totalAdded}`);
