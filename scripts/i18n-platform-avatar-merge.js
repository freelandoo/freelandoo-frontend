/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da FOTO DENTRO DA PLATAFORMA (mig 233, 2026-09-09).
//
// Pedido do Alex: "a foto de perfil você vai puxar do perfil principal, sempre.
// Mas, se a pessoa quiser alterar, ela altera e só altera o games. Assim também
// precisa ser no financeiro." — o headcard da Carteira ganhou o badge de câmera
// que troca a foto SÓ do Financeiro, e o caminho de volta ("usar a minha foto").
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-platform-avatar-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  platformPhotoChange: [
    "Trocar a foto no Financeiro",
    "Change your photo in Finance",
    "Cambiar la foto en Financiero",
  ],
  platformPhotoReset: [
    "Usar a minha foto de perfil",
    "Use my profile photo",
    "Usar mi foto de perfil",
  ],
  platformPhotoHint: [
    "Vale só aqui dentro — a sua foto de perfil continua a mesma no resto do site.",
    "Only applies in here — your profile photo stays the same everywhere else.",
    "Vale solo aquí dentro: tu foto de perfil sigue igual en el resto del sitio.",
  ],
  platformPhotoSending: ["Enviando…", "Uploading…", "Enviando…"],
  platformPhotoError: [
    "Não deu para trocar a foto. Tente de novo.",
    "Couldn't change the photo. Try again.",
    "No se pudo cambiar la foto. Inténtalo de nuevo.",
  ],
};

let touched = 0;

LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Wallet = dict.Wallet || {};

  for (const [key, values] of Object.entries(NEW)) {
    if (dict.Wallet[key] === undefined) {
      dict.Wallet[key] = values[idx];
      touched++;
      console.log(`[${locale}] + Wallet.${key}`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(touched === 0 ? "nada a fazer (idempotente)" : `${touched} chave(s) gravada(s)`);
