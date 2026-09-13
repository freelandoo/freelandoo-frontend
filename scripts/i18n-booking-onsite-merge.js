/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do agendamento SEM CONTA e do PAGAR NO BALCÃO
// (mig 244).
//
// Duas mudanças de fluxo, e as duas precisam de palavra na tela:
//
//  1. agendar deixou de exigir conta — quem não tem informa nome e e-mail ali
//     mesmo. A chave `loginNeeded` fica ÓRFÃ de propósito (padrão da casa:
//     chave que sai de uso não é apagada do dicionário).
//
//  2. "pagar no balcão" é um caminho novo, e ele TERMINA NESTA TELA: não há
//     checkout para onde redirecionar, então existe um estado de "deu certo"
//     que antes não precisava existir.
//
// ⚠️ `finishOnPlatform` MUDOU DE PAPEL mas NÃO de texto: era a única saída de
// quem estava no domínio próprio sem sessão, e virou preferência de quem já
// tem conta. O texto continua verdadeiro, então não há override aqui.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-booking-onsite-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const SITE_BOOKING = {
  // ─── Como pagar ───────────────────────────────────────────────────────────
  payModeLabel: ["Como você prefere pagar", "How would you like to pay", "Cómo prefieres pagar"],
  payNowTitle: ["Pagar agora", "Pay now", "Pagar ahora"],
  payNowDesc: [
    "Você paga o sinal e o horário fica reservado na hora.",
    "You pay the deposit and the slot is booked right away.",
    "Pagas la señal y el horario queda reservado al instante.",
  ],
  payOnSiteTitle: ["Pagar no balcão", "Pay on site", "Pagar en el local"],
  payOnSiteDesc: [
    "O horário fica marcado e você paga no atendimento.",
    "The slot is booked and you pay at your appointment.",
    "El horario queda agendado y pagas en la atención.",
  ],
  onSiteNote: [
    "Ao confirmar, o horário fica marcado e quem atende é avisado na hora. O pagamento é feito no atendimento.",
    "Once you confirm, the slot is booked and the professional is notified right away. Payment happens at your appointment.",
    "Al confirmar, el horario queda agendado y quien atiende recibe el aviso al instante. El pago se hace en la atención.",
  ],

  // ─── Quem está agendando (sem conta) ──────────────────────────────────────
  guestIntro: [
    "Não precisa criar conta. Só precisamos saber quem vai ser atendido.",
    "No account needed. We just need to know who's being served.",
    "No necesitas crear una cuenta. Solo necesitamos saber a quién se atenderá.",
  ],
  guestNameLabel: ["Seu nome", "Your name", "Tu nombre"],
  guestNamePlaceholder: ["Nome e sobrenome", "First and last name", "Nombre y apellido"],
  guestEmailLabel: ["Seu e-mail", "Your email", "Tu correo"],
  guestNeeded: [
    "Informe o seu nome e um e-mail válido para confirmar.",
    "Enter your name and a valid email to confirm.",
    "Ingresa tu nombre y un correo válido para confirmar.",
  ],
  hasAccountPrefix: [
    "Já tem conta na Freelandoo?",
    "Already have a Freelandoo account?",
    "¿Ya tienes cuenta en Freelandoo?",
  ],

  // ─── Balcão: o fim da linha ───────────────────────────────────────────────
  doneTitle: ["Horário marcado", "You're booked", "Horario agendado"],
  doneOnSiteNote: [
    "Quem atende já foi avisado. O pagamento é feito no atendimento.",
    "The professional has been notified. Payment happens at your appointment.",
    "Quien atiende ya fue avisado. El pago se hace en la atención.",
  ],
  doneBack: ["Voltar ao site", "Back to the site", "Volver al sitio"],
};

const NAMESPACES = { SiteBooking: SITE_BOOKING };

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
