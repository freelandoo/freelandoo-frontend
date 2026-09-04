/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente do KPI "Total recebido" da Carteira (2026-09-04).
//
// Ele soma o que a plataforma pagou com o que a pessoa lançou como entrada na
// Vida Financeira. A legenda curta ("plataforma + suas entradas") existe porque
// o número é uma SOMA de dois lugares diferentes da mesma tela — sem ela, quem
// olha não sabe por que ele não bate com "Recebido".
//
// `manualInAccountNote` só aparece com um perfil selecionado: a Vida Financeira
// é da CONTA (não existe lançamento manual por perfil), então ali só a metade
// da plataforma encolhe.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no
// dicionário.
//
// Uso: node scripts/i18n-wallet-total-received-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const WALLET = {
  kpiTotalReceived: ["Total recebido", "Total received", "Total recibido"],
  kpiTotalReceivedHint: [
    "plataforma + suas entradas",
    "platform + your income",
    "plataforma + tus ingresos",
  ],
  manualInAccountNote: [
    "Suas entradas da Vida Financeira também são da conta e seguem no Total recebido.",
    "Your Financial Life income is account-wide too and stays in Total received.",
    "Tus ingresos de Vida Financiera también son de la cuenta y siguen en Total recibido.",
  ],
};

const NAMESPACES = { Wallet: WALLET };

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
