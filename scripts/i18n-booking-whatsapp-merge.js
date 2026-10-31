/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do agendamento com WHATSAPP obrigatório e
// e-mail opcional (mig 315 no back, 2026-10-31).
//
// Chaves NOVAS em vez de override: o texto antigo dizia o contrário ("WhatsApp
// (opcional)", "Seu e-mail" obrigatório, "paga o sinal"), e trocar o valor por
// baixo da mesma chave deixaria um dicionário velho mentindo. As antigas ficam
// órfãs (padrão da casa).
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-booking-whatsapp-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const SITE_BOOKING = {
  payNowDescMp: [
    "Pix ou cartão pelo Mercado Pago. O horário fica reservado na hora.",
    "Pix or card via Mercado Pago. The slot is booked right away.",
    "Pix o tarjeta por Mercado Pago. El horario queda reservado al instante.",
  ],
  payNowNoteMp: [
    "Ao confirmar, você vai para o Mercado Pago e paga o valor do serviço por Pix ou cartão. Aprovado o pagamento, o horário é seu.",
    "When you confirm, you go to Mercado Pago and pay for the service by Pix or card. Once the payment is approved, the slot is yours.",
    "Al confirmar, vas a Mercado Pago y pagas el servicio con Pix o tarjeta. Aprobado el pago, el horario es tuyo.",
  ],
  guestEmailLabelOptional: ["Seu e-mail (opcional)", "Your email (optional)", "Tu correo (opcional)"],
  guestNeededV2: [
    "Informe o seu nome (e, se quiser, um e-mail válido) para confirmar.",
    "Enter your name (and, if you like, a valid email) to confirm.",
    "Indica tu nombre (y, si quieres, un correo válido) para confirmar.",
  ],
  whatsappLabelRequired: ["Seu WhatsApp", "Your WhatsApp", "Tu WhatsApp"],
  whatsappNeeded: [
    "Informe o seu WhatsApp com DDD para confirmar.",
    "Enter your WhatsApp number with area code to confirm.",
    "Indica tu WhatsApp con código de área para confirmar.",
  ],
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
