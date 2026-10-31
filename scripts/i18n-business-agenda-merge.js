/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente da AGENDA DO NEGÓCIO (aba da comunidade de negócio,
// 2026-10-31): a aba "Agenda" depois de "Produtos" e a seção "Próximos
// agendamentos" do `components/agenda/BusinessAgenda.tsx`, e o modal
// "Novo agendamento" (`components/agenda/new-booking-modal.tsx`).
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-business-agenda-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** namespace → chave → [pt, en, es] */
const NAMESPACES = {
  Community: {
    tabAgenda: ["Agenda", "Schedule", "Agenda"],
  },
  Agenda: {
    upcomingEyebrow: ["Próximos agendamentos", "Upcoming bookings", "Próximas reservas"],
    upcomingNone: ["Nenhum horário marcado", "No bookings yet", "Ningún horario reservado"],
    upcomingOne: ["1 horário marcado", "1 booking", "1 horario reservado"],
    upcomingMany: ["{n} horários marcados", "{n} bookings", "{n} horarios reservados"],
    upcomingEmptyDesc: [
      "Quando alguém marcar pelo seu site ou pelo seu perfil, aparece aqui na hora.",
      "When someone books through your site or profile, it shows up here right away.",
      "Cuando alguien reserve por tu sitio o tu perfil, aparece aquí al instante.",
    ],
    payPaid: ["Pago", "Paid", "Pagado"],
    payOnSite: ["Paga no balcão", "Pays on site", "Paga en el local"],
    payPending: ["Aguardando pagamento", "Awaiting payment", "Esperando el pago"],
    // Valor acumulado do mês (faixa da 1ª seção).
    totalMonth: ["Acumulado no mês", "This month so far", "Acumulado del mes"],
    totalCountOne: ["1 atendimento", "1 appointment", "1 atención"],
    totalCountMany: ["{n} atendimentos", "{n} appointments", "{n} atenciones"],
    totalPaid: ["Pago pelo site", "Paid online", "Pagado en línea"],
    totalOnSite: ["No balcão", "On site", "En el local"],
    totalPending: ["Aguardando pagamento", "Awaiting payment", "Esperando el pago"],
    totalNetNote: [
      "Valores do site já sem a tarifa do Mercado Pago e a taxa da Freelandoo. No balcão o valor é cheio: o pagamento é feito direto com você.",
      "Online amounts are already net of the Mercado Pago fee and the Freelandoo fee. On-site amounts are in full: the client pays you directly.",
      "Los valores en línea ya descuentan la tarifa de Mercado Pago y la de Freelandoo. En el local el valor es completo: el cliente te paga directamente.",
    ],
    nextEyebrow: ["Próximo agendamento", "Next booking", "Próxima reserva"],
    nextMore: ["+{n} marcados depois deste", "+{n} more after this one", "+{n} más después de esta"],
    // Modal "Novo agendamento" (components/agenda/new-booking-modal.tsx).
    newBookingTitle: ["Novo agendamento!", "New booking!", "¡Nueva reserva!"],
    newBookingsTitle: ["{n} novos agendamentos!", "{n} new bookings!", "¡{n} nuevas reservas!"],
    newBookingEyebrow: ["Agenda", "Schedule", "Agenda"],
    newBookingClose: ["Fechar", "Close", "Cerrar"],
    newBookingSomeone: ["Um cliente", "A client", "Un cliente"],
    newBookingCta: ["Acessar agenda", "Open schedule", "Abrir agenda"],
  },
};

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
