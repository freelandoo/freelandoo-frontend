/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — INDICADORES DO NEGÓCIO (mig 235, 2026-09-10).
//
// Pedido do Alex: "preciso de indicadores no meu negócio (...) tudo que recebe
// de mensagem no zap e no O.S. vira indicador de lead (...) visualizações do
// site e cliques no botão de agendamento. E faturamento. Queria um pill
// Indicadores e coloca tudo lá."
//
// Namespace `Community` (é uma tela da comunidade, como o ranking), prefixo
// `ind*`. Fill-if-absent: nunca sobrescreve o que já existe.
//
// Uso: node scripts/i18n-business-indicators-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_COMMUNITY = {
  indPill: ["Indicadores", "Insights", "Indicadores"],
  indPillAria: [
    "Abrir os indicadores do negócio: leads, site e faturamento",
    "Open business insights: leads, site and revenue",
    "Abrir los indicadores del negocio: leads, sitio y facturación",
  ],
  indTitle: ["Indicadores", "Insights", "Indicadores"],
  indRangeDays: ["{n} dias", "{n} days", "{n} días"],
  indLoadError: [
    "Não deu para carregar os indicadores agora.",
    "Couldn't load the insights right now.",
    "No se pudieron cargar los indicadores ahora.",
  ],

  // ── leads ────────────────────────────────────────────────────────────────
  indLeadsTitle: ["Leads", "Leads", "Leads"],
  indLeadsPeople: [
    "pessoas te procuraram",
    "people reached out to you",
    "personas te contactaron",
  ],
  indLeadsMessages: ["{n} mensagens", "{n} messages", "{n} mensajes"],
  indLeadsWhatsapp: ["WhatsApp", "WhatsApp", "WhatsApp"],
  indLeadsOs: ["Solicitações", "Requests", "Solicitudes"],
  // ⚠️ A frase que impede a tela de mentir: leads são do TELEFONE e da CAIXA da
  // pessoa (migs 223/023), não desta comunidade. Ver o cabeçalho do
  // BusinessIndicatorsService.
  indLeadsScopeNote: [
    "Estes números são do seu WhatsApp e da sua caixa de solicitações — eles são da sua CONTA, não deste negócio. Se você tem mais de um negócio, o mesmo total aparece nos dois. Conversas em grupo não contam.",
    "These numbers come from your WhatsApp and your requests inbox — they belong to your ACCOUNT, not to this business. If you run more than one business, the same total shows up in both. Group chats don't count.",
    "Estos números vienen de tu WhatsApp y de tu bandeja de solicitudes — son de tu CUENTA, no de este negocio. Si tienes más de un negocio, el mismo total aparece en los dos. Los grupos no cuentan.",
  ],
  indWhatsappConnect: [
    "Conectar meu WhatsApp",
    "Connect my WhatsApp",
    "Conectar mi WhatsApp",
  ],

  // ── o site ───────────────────────────────────────────────────────────────
  indSiteTitle: ["O site", "The site", "El sitio"],
  indSiteViews: ["Visitas", "Visits", "Visitas"],
  indSiteBookingClicks: [
    "Cliques em agendar",
    "Booking clicks",
    "Clics en agendar",
  ],
  indSiteWhatsappClicks: [
    "Cliques no WhatsApp",
    "WhatsApp clicks",
    "Clics en WhatsApp",
  ],
  indSiteBookings: ["Agendamentos", "Bookings", "Reservas"],
  indPaidOf: ["{paid} pagos", "{paid} paid", "{paid} pagados"],
  indSiteConversion: [
    "De cada 100 visitas, {n} apertaram agendar.",
    "Out of every 100 visits, {n} tapped to book.",
    "De cada 100 visitas, {n} tocaron agendar.",
  ],
  indSiteNoSite: [
    "Você ainda não publicou o site deste negócio — por isso não há visitas para contar.",
    "You haven't published this business's site yet — that's why there are no visits to count.",
    "Todavía no publicaste el sitio de este negocio — por eso no hay visitas que contar.",
  ],
  indSitePublish: ["Montar o site", "Build the site", "Crear el sitio"],

  // ── faturamento ──────────────────────────────────────────────────────────
  indRevenueTitle: ["Faturamento", "Revenue", "Facturación"],
  indRevenueBookings: [
    "Sinais de agendamento",
    "Booking deposits",
    "Señas de reserva",
  ],
  indRevenueMemberships: ["Mensalidades", "Memberships", "Mensualidades"],
  indPaidCount: ["{n} pagos", "{n} paid", "{n} pagados"],
  indPaymentCount: ["{n} pagamentos", "{n} payments", "{n} pagos"],
  // ⚠️ A outra frase de honestidade: o sinal é uma PARTE do preço, e o que é
  // vendido fora da plataforma não passa por aqui.
  indRevenueNote: [
    "É o que passou pela Freelandoo, já descontada a taxa: o sinal do agendamento (o resto o cliente paga com você) e as mensalidades. O que for vendido fora daqui não entra nesta conta.",
    "This is what went through Freelandoo, net of fees: the booking deposit (the rest the client pays you directly) and memberships. Anything sold outside doesn't show up here.",
    "Es lo que pasó por Freelandoo, ya descontada la tarifa: la seña de la reserva (el resto te lo paga el cliente a ti) y las mensualidades. Lo que se venda fuera no entra en esta cuenta.",
  ],

  // ── a série ──────────────────────────────────────────────────────────────
  indChartTitle: ["Por dia", "By day", "Por día"],
  indChartVisits: ["Visitas", "Visits", "Visitas"],
  indChartLeads: ["Leads", "Leads", "Leads"],
  indEmpty: [
    "Ainda não houve movimento no período.",
    "No activity in this period yet.",
    "Todavía no hubo movimiento en el período.",
  ],
};

let totalAdded = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Community = dict.Community || {};
  let added = 0;
  for (const [key, values] of Object.entries(NEW_COMMUNITY)) {
    if (dict.Community[key] === undefined) {
      dict.Community[key] = values[idx];
      added += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${added} chaves adicionadas ao ns Community`);
  totalAdded += added;
});
console.log(`total: ${totalAdded}`);
