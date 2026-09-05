/* eslint-disable @typescript-eslint/no-require-imports */
// "Perfil" morreu: não existe hierarquia de perfis (decisão do Alex,
// 2026-09-03). Só existe PERFIL — quem abre outro fica no MESMO grau, é uma
// réplica com conteúdo próprio.
//
// Duas partes, porque o dicionário VENCE o fallback inline:
//   1. fill-if-absent para a chave nova `Wallet.allProfiles`;
//   2. OVERRIDE explícito de `Wallet.courseAffiliateNote`, que já existia no
//      dicionário dizendo "por perfil" — sem sobrescrever, a tela
//      continuaria mostrando o termo antigo por mais que o fallback mude.
//
// `Wallet.allSubprofiles` fica órfã no dicionário de propósito (padrão da casa:
// não removemos chaves, só paramos de usá-las).
//
// Uso: node scripts/i18n-perfis-rename-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se estiver ausente */
const WALLET_FILL = {
  allProfiles: ["Todos os perfis", "All profiles", "Todos los perfiles"],
};

/** chave → [pt, en, es] — sobrescreve o que estiver lá */
const WALLET_OVERRIDE = {
  courseAffiliateNote: [
    "Curso e Afiliado são por conta — não filtram por perfil.",
    "Course and Affiliate are account-wide — they don't filter by profile.",
    "Curso y Afiliado son por cuenta — no filtran por perfil.",
  ],
};

let added = 0;
let overridden = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  if (!dict.Wallet) dict.Wallet = {};

  for (const [key, values] of Object.entries(WALLET_FILL)) {
    if (dict.Wallet[key] === undefined) {
      dict.Wallet[key] = values[i];
      added++;
    }
  }

  for (const [key, values] of Object.entries(WALLET_OVERRIDE)) {
    if (dict.Wallet[key] !== values[i]) {
      dict.Wallet[key] = values[i];
      overridden++;
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`[i18n] ${locale} atualizado`);
}

console.log(`[i18n] ${added} chave(s) adicionada(s), ${overridden} sobrescrita(s).`);
