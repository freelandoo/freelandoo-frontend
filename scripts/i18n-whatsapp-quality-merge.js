/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do AVISO DE QUALIDADE do número (W6, mig 246).
//
// A Meta avisa quando o número de alguém é sinalizado, rebaixado, restringido
// ou banido. O aviso precisa chegar ao DONO — ele é o único que pode corrigir o
// comportamento —, e por isso vira notificação no sino.
//
// ⚠️ O TEXTO NÃO VEM DO BACKEND, de propósito. A notificação guarda o evento
// CRU da Meta (`FLAGGED`, `ACCOUNT_RESTRICTION`) e quem escreve a frase é a
// tela, que fala os três idiomas. Frase montada no backend nasceria em
// português para sempre — e o backend é pt por convenção.
//
// ⚠️ As quatro frases específicas NÃO cobrem tudo: a Meta inventa evento novo
// sem avisar, e o que não casar cai em `whatsappQuality`, genérica. Notificação
// que chega em branco é pior que notificação genérica.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-whatsapp-quality-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const NOTIFICATIONS = {
  whatsappFlagged: [
    "Seu número do WhatsApp foi sinalizado pela Meta",
    "Meta flagged your WhatsApp number",
    "Meta marcó tu número de WhatsApp",
  ],
  whatsappDowngrade: [
    "A qualidade do seu número do WhatsApp caiu",
    "Your WhatsApp number quality has dropped",
    "La calidad de tu número de WhatsApp bajó",
  ],
  whatsappBanned: [
    "Seu número do WhatsApp foi bloqueado pela Meta",
    "Meta banned your WhatsApp number",
    "Meta bloqueó tu número de WhatsApp",
  ],
  whatsappRestricted: [
    "Seu número do WhatsApp está com restrições",
    "Your WhatsApp number has restrictions",
    "Tu número de WhatsApp tiene restricciones",
  ],
  whatsappQuality: [
    "Há um aviso da Meta sobre o seu número do WhatsApp",
    "There's a notice from Meta about your WhatsApp number",
    "Hay un aviso de Meta sobre tu número de WhatsApp",
  ],
};

/**
 * A faixa de aviso DENTRO da aba (`whatsapp-list`).
 *
 * A notificação leva o dono até lá; se a aba não dissesse nada, ele chegaria e
 * não veria o problema. Só aparece em apuro — faixa permanente de "está tudo
 * bem" vira paisagem e ninguém a lê no dia em que ela mudar.
 */
const WHATSAPP = {
  qualityBanned: [
    "A Meta bloqueou este número. O atendimento por aqui parou.",
    "Meta banned this number. Support through here has stopped.",
    "Meta bloqueó este número. La atención por aquí se detuvo.",
  ],
  qualityRestricted: [
    "A Meta colocou restrições neste número.",
    "Meta placed restrictions on this number.",
    "Meta puso restricciones en este número.",
  ],
  qualityFlagged: [
    "A Meta sinalizou este número: clientes andaram bloqueando ou denunciando as mensagens.",
    "Meta flagged this number: customers have been blocking or reporting your messages.",
    "Meta marcó este número: los clientes han estado bloqueando o denunciando los mensajes.",
  ],
  qualityLow: [
    "A qualidade deste número caiu. Evite mandar mensagem para quem não escreveu primeiro.",
    "This number's quality has dropped. Avoid messaging people who didn't write first.",
    "La calidad de este número bajó. Evita escribir a quien no te escribió primero.",
  ],
};

const NAMESPACES = { Notifications: NOTIFICATIONS, Whatsapp: WHATSAPP };

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
