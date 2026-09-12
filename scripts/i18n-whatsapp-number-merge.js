/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do CADASTRO DE NÚMERO da Cloud API (W3).
//
// A Cloud API não pareia por QR: o número é cadastrado no WABA e confirmado por
// um código que a Meta manda por SMS. São dois passos e um vocabulário novo —
// número, nome de exibição, código — que o modal do QR não tinha.
//
// Namespace `Whatsapp`, o mesmo da aba: é a mesma superfície, com outro
// caminho de conexão.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no
// dicionário.
//
// Uso: node scripts/i18n-whatsapp-number-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const MESSAGES = {
  numberHint: [
    "Informe o número comercial que vai atender pela Freelandoo.",
    "Enter the business number that will handle chats through Freelandoo.",
    "Indica el número comercial que atenderá por Freelandoo.",
  ],
  phoneLabel: ["Número com DDD", "Number with area code", "Número con código de área"],
  displayNameLabel: [
    "Nome que o cliente vê",
    "Name customers see",
    "Nombre que ve el cliente",
  ],
  displayNamePlaceholder: ["Barbearia do João", "John's Barbershop", "Barbería de Juan"],
  displayNameHelp: [
    "Aparece no topo da conversa. A Meta analisa esse nome e recusa o que não corresponder ao negócio.",
    "Shown at the top of the chat. Meta reviews this name and rejects anything that doesn't match the business.",
    "Aparece arriba de la conversación. Meta revisa ese nombre y rechaza lo que no corresponda al negocio.",
  ],
  // ⚠️ O aviso mais importante da tela: número que já tem WhatsApp exige
  // migração, e quem descobre isso depois de tentar perde o passo inteiro.
  numberWarning: [
    "Use um número que ainda NÃO tenha WhatsApp. Depois de conectado, ele passa a funcionar apenas aqui — não volta para o aplicativo do celular.",
    "Use a number that does NOT have WhatsApp yet. Once connected, it works only here — it won't go back to the phone app.",
    "Usa un número que aún NO tenga WhatsApp. Una vez conectado, funciona solo aquí — no vuelve a la aplicación del teléfono.",
  ],
  sendCode: [
    "Receber código por SMS",
    "Get code by SMS",
    "Recibir código por SMS",
  ],
  numberError: [
    "Não foi possível cadastrar o número.",
    "We couldn't register the number.",
    "No fue posible registrar el número.",
  ],
  codeSentTo: [
    "Enviamos um código por SMS para",
    "We sent a code by SMS to",
    "Enviamos un código por SMS a",
  ],
  codeLabel: ["Código recebido", "Code received", "Código recibido"],
  confirmCode: ["Confirmar código", "Confirm code", "Confirmar código"],
  codeError: ["Código inválido.", "Invalid code.", "Código inválido."],
  resend: ["Reenviar código", "Resend code", "Reenviar código"],
  resendSent: [
    "Enviamos um código novo.",
    "We sent a new code.",
    "Enviamos un código nuevo.",
  ],
  resendError: [
    "Não foi possível reenviar o código.",
    "We couldn't resend the code.",
    "No fue posible reenviar el código.",
  ],
  changeNumber: ["Usar outro número", "Use another number", "Usar otro número"],
};

let added = 0;

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(DIR, `${LOCALES[i]}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Whatsapp = dict.Whatsapp || {};

  for (const [key, values] of Object.entries(MESSAGES)) {
    if (dict.Whatsapp[key] === undefined) {
      dict.Whatsapp[key] = values[i];
      added++;
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`, "utf8");
}

console.log(`i18n-whatsapp-number-merge: ${added} chaves adicionadas`);
