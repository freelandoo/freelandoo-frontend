/* eslint-disable @typescript-eslint/no-require-imports */
// A Evolution saiu (2026-09-16) e com ela o QR Code. O texto que prometia "leia
// o QR" precisa sair junto.
//
// ⚠️ ESTE SCRIPT É **OVERRIDE**, e não o fill-if-absent de sempre. A chave já
// existe nos três dicionários com o texto antigo, e **dicionário vence fallback
// inline**: trocar só a string no componente não mudaria uma vírgula na tela.
// Foi exatamente assim que a linha "dá para voltar a editá-lo quando quiser"
// sobreviveu a uma entrega inteira antes.
//
// A chave `idleDisconnected` (e `reconnectCta`) fica ÓRFÃ de propósito: padrão
// da casa é não apagar chave que saiu de uso — ela não aparece mais porque
// ninguém é desconectado por inatividade desde que o sweeper saiu.
//
// Uso: node scripts/i18n-whatsapp-no-qr-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — SOBRESCREVE o que estiver lá. */
const OVERRIDES = {
  Whatsapp: {
    emptyDisconnectedHint: [
      "Conecte o seu número e atenda as suas conversas aqui dentro.",
      "Connect your number and handle your conversations right here.",
      "Conecta tu número y atiende tus conversaciones aquí dentro.",
    ],
    connectHint: [
      "Conecte o seu número e atenda as conversas do WhatsApp sem sair da Freelandoo.",
      "Connect your number and handle WhatsApp conversations without leaving Freelandoo.",
      "Conecta tu número y atiende las conversaciones de WhatsApp sin salir de Freelandoo.",
    ],
  },
};

let changed = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  for (const [ns, keys] of Object.entries(OVERRIDES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i];
        changed++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`[i18n] ${changed} chave(s) sobrescrita(s).`);
