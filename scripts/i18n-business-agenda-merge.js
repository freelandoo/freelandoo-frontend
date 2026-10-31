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
    // Vitrine (aba Produtos do negócio, repaginada N5).
    shopEyebrow: ["Vitrine", "Storefront", "Vitrina"],
    shopTitleOwner: ["Seus produtos", "Your products", "Tus productos"],
    shopTitlePublic: ["Produtos à venda", "Products for sale", "Productos en venta"],
    shopPickupNote: [
      "Compra pela Freelandoo, retirada com o vendedor.",
      "Buy through Freelandoo, pick up with the seller.",
      "Compra por Freelandoo, retiro con el vendedor.",
    ],
    // Salvamento automático do modo de edição (o "Salvar" do rodapé saiu).
    autoSaving: ["Salvando…", "Saving…", "Guardando…"],
    autoSaved: ["Salvo", "Saved", "Guardado"],
    autoSaveError: ["Não salvou", "Not saved", "No se guardó"],
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
    // Contagem até o próximo horário (repaginada N4).
    countNow: ["Acontecendo agora", "Happening now", "Ocurriendo ahora"],
    countMin: ["Em {m} min", "In {m} min", "En {m} min"],
    countHours: ["Em {h} h {m} min", "In {h} h {m} min", "En {h} h {m} min"],
    countTomorrow: ["Amanhã", "Tomorrow", "Mañana"],
    countDays: ["Em {d} dias", "In {d} days", "En {d} días"],
    // Intervalo de almoço na regra semanal (mig 316).
    lunchBreak: ["Almoço", "Lunch break", "Almuerzo"],
    lunchShort: ["Almoço", "Lunch", "Almuerzo"],
    lunchStart: ["Início do almoço", "Lunch starts", "Inicio del almuerzo"],
    lunchEnd: ["Fim do almoço", "Lunch ends", "Fin del almuerzo"],
    lunchClear: ["Tirar o almoço", "Remove lunch break", "Quitar el almuerzo"],
    // "Bloquear horário" (botão vermelho da agenda).
    blockTitle: ["Bloquear horário", "Block time", "Bloquear horario"],
    blockIntro: [
      "Toque nos horários que você não vai atender. Eles somem da página de agendar.",
      "Tap the times you won't be available. They disappear from the booking page.",
      "Toca los horarios que no vas a atender. Desaparecen de la página de reservas.",
    ],
    blockToday: ["Hoje", "Today", "Hoy"],
    blockTomorrow: ["Amanhã", "Tomorrow", "Mañana"],
    blockPickDate: ["Outra data", "Another date", "Otra fecha"],
    blockWholeDay: ["Fechar o dia inteiro", "Close the whole day", "Cerrar el día entero"],
    blockDayNote: ["Ninguém consegue agendar neste dia.", "Nobody can book on this day.", "Nadie puede reservar este día."],
    blockNoSlots: ["Não há horários livres neste dia.", "No free times on this day.", "No hay horarios libres este día."],
    blockSave: ["Salvar bloqueio", "Save block", "Guardar bloqueo"],
    blockSaved: [
      "Pronto: esses horários saíram da página de agendar.",
      "Done: those times are off the booking page.",
      "Listo: esos horarios salieron de la página de reservas.",
    ],
    blockDaySaved: ["Dia fechado para agendamento.", "Day closed for bookings.", "Día cerrado para reservas."],
    blockError: ["Não foi possível bloquear agora.", "Couldn't block right now.", "No se pudo bloquear ahora."],
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
