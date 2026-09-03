/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente da chave do botão da Carteira no headcard.
//
// A Carteira saiu da Loja de Funções (mig 216) e virou nativa de todo perfil:
// ganhou botão próprio no headcard, ao lado da foto. O rótulo é curto de
// propósito — "Minha Carteira" (chave `myWallet`, do menu de ferramentas) não
// cabe no pill sem empurrar os contadores.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-wallet-pill-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const ACCOUNT = {
  walletPill: ["Carteira", "Wallet", "Cartera"],
};

const NAMESPACES = { Account: ACCOUNT };

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
