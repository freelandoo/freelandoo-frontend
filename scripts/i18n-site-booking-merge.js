/* eslint-disable @typescript-eslint/no-require-imports */
// Merge das chaves do AGENDAMENTO pelo site da comunidade (mig 221).
//
// Namespace novo `SiteBooking` (a página de agendar, que é uma tela inteira) +
// chaves no `CommunitySite` já existente (o cartão de agenda viva e o painel da
// equipe, que vivem dentro do construtor).
//
// Padrão da casa: fill-if-absent. As duas exceções estão em OVERRIDES e são
// declaradas uma a uma — os dois campos de link agora aceitam o token
// `agendar`, e um placeholder que não diz isso esconde a única forma de apontar
// um botão para a página de agendamento do próprio site.
//
// Uso: node scripts/i18n-site-booking-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const SITE_BOOKING = {
  back: ["Voltar ao site", "Back to site", "Volver al sitio"],
  step1: ["O que e com quem", "What and with whom", "Qué y con quién"],
  step2: ["Quando", "When", "Cuándo"],
  step3: ["Confirmar", "Confirm", "Confirmar"],

  serviceTitle: ["Escolha o serviço", "Choose the service", "Elige el servicio"],
  noServices: [
    "Ainda não há serviços cadastrados para agendar.",
    "There are no services available to book yet.",
    "Todavía no hay servicios para agendar.",
  ],
  professionalTitle: ["Com quem", "With whom", "Con quién"],
  professionalFallback: ["Profissional", "Professional", "Profesional"],

  whenTitle: [
    "Escolha o dia e a hora",
    "Choose the day and time",
    "Elige el día y la hora",
  ],
  prevDays: ["Dias anteriores", "Previous days", "Días anteriores"],
  nextDays: ["Próximos dias", "Next days", "Próximos días"],
  loadingSlots: [
    "Consultando a agenda...",
    "Checking the calendar...",
    "Consultando la agenda...",
  ],
  noSlots: [
    "Sem horário livre neste dia. Tente outro.",
    "No free time on this day. Try another one.",
    "Sin horarios libres este día. Prueba otro.",
  ],

  confirmTitle: ["Confirme seu horário", "Confirm your time", "Confirma tu horario"],
  summaryService: ["Serviço", "Service", "Servicio"],
  summaryWhen: ["Quando", "When", "Cuándo"],
  summaryPrice: ["Valor", "Price", "Valor"],
  whatsappLabel: [
    "WhatsApp para contato (opcional)",
    "WhatsApp for contact (optional)",
    "WhatsApp de contacto (opcional)",
  ],
  depositNote: [
    "Ao confirmar, você paga o sinal que reserva o horário. O restante é combinado direto com quem atende.",
    "When you confirm, you pay the deposit that holds your slot. The rest is arranged directly with the professional.",
    "Al confirmar, pagas la señal que reserva el horario. El resto se acuerda directamente con quien atiende.",
  ],
  finishOnPlatform: [
    "Terminar na Freelandoo",
    "Finish on Freelandoo",
    "Terminar en Freelandoo",
  ],
  loginNeeded: [
    "Entre na sua conta para confirmar o horário.",
    "Sign in to confirm your time.",
    "Inicia sesión para confirmar el horario.",
  ],
  bookError: [
    "Não foi possível concluir o agendamento.",
    "We couldn't complete the booking.",
    "No fue posible completar la reserva.",
  ],

  previous: ["Voltar", "Back", "Volver"],
  next: ["Próximo", "Next", "Siguiente"],
  confirmCta: [
    "Confirmar agendamento",
    "Confirm booking",
    "Confirmar reserva",
  ],
  hour: ["h", "h", "h"],
  min: ["min", "min", "min"],
};

const COMMUNITY_SITE = {
  // ─── Cartão de chamada: agenda viva ──────────────────────────────────────
  ctaLiveTitle: [
    "Próximo horário disponível",
    "Next available time",
    "Próximo horario disponible",
  ],
  ctaLiveDate: ["Data", "Date", "Fecha"],
  ctaLiveTime: ["Horário", "Time", "Horario"],
  ctaLiveWho: ["Profissional", "Professional", "Profesional"],
  ctaLiveToday: ["Hoje", "Today", "Hoy"],
  ctaLiveTomorrow: ["Amanhã", "Tomorrow", "Mañana"],
  ctaLiveNote: [
    "Próximo horário: {when} às {time} com {who}",
    "Next time: {when} at {time} with {who}",
    "Próximo horario: {when} a las {time} con {who}",
  ],
  ctaLiveHint: [
    "Data, horário e profissional vêm da agenda de quem atende — não são texto. Quem visita vê o próximo horário livre de verdade.",
    "Date, time and professional come from the calendar of whoever attends — they are not text. Visitors see the real next free slot.",
    "Fecha, horario y profesional vienen de la agenda de quien atiende — no son texto. Quien visita ve el próximo horario libre real.",
  ],
  ctaLiveFallback: [
    "Aparece quando não houver horário livre",
    "Shown when there is no free time",
    "Aparece cuando no haya horario libre",
  ],

  // ─── Vitrine ─────────────────────────────────────────────────────────────
  serviceBook: ["Agendar", "Book", "Agendar"],

  // ─── Painel da equipe ────────────────────────────────────────────────────
  teamButton: ["Equipe", "Team", "Equipo"],
  teamTitle: [
    "Quem atende pelo site",
    "Who serves through the site",
    "Quién atiende por el sitio",
  ],
  teamHint: [
    "Quem entra aqui aparece na página de agendamento com os próprios serviços e a própria agenda. Só entra quem já é membro da comunidade — e isto não dá nenhum poder dentro dela.",
    "Anyone added here shows up on the booking page with their own services and calendar. Only existing community members can be added — and this grants no power inside the community.",
    "Quien entra aquí aparece en la página de reservas con sus propios servicios y su agenda. Solo entra quien ya es miembro de la comunidad — y esto no da ningún poder dentro de ella.",
  ],
  teamAdd: ["Adicionar", "Add", "Añadir"],
  teamAddPlaceholder: [
    "@username do membro",
    "member's @username",
    "@username del miembro",
  ],
  teamRemove: ["Tirar da equipe", "Remove from team", "Quitar del equipo"],
  teamNoProfession: [
    "Sem profissão declarada",
    "No profession declared",
    "Sin profesión declarada",
  ],
  teamOneService: ["1 serviço", "1 service", "1 servicio"],
  teamManyServices: ["{n} serviços", "{n} services", "{n} servicios"],
  teamLoadError: [
    "Não foi possível carregar a equipe.",
    "We couldn't load the team.",
    "No fue posible cargar el equipo.",
  ],
  teamAddError: [
    "Não foi possível adicionar.",
    "We couldn't add this person.",
    "No fue posible añadir.",
  ],
  teamRemoveError: [
    "Não foi possível remover.",
    "We couldn't remove this person.",
    "No fue posible quitar.",
  ],
};

/**
 * OVERRIDE, e não fill-if-absent: estas duas chaves já existem no dicionário
 * dizendo só "https://...". Depois desta entrega o campo também aceita o token
 * `agendar`, e o placeholder antigo esconderia a única forma de apontar um
 * botão para a página de agendamento do próprio site — dicionário vence
 * fallback, então trocar só o texto no código não mudaria a tela.
 */
const OVERRIDES = {
  CommunitySite: {
    heroCtaUrl: [
      "Link do botão (https://... ou agendar)",
      "Button link (https://... or agendar)",
      "Enlace del botón (https://... o agendar)",
    ],
    ctaButtonUrl: [
      "Link do botão (https://... ou agendar)",
      "Button link (https://... or agendar)",
      "Enlace del botón (https://... o agendar)",
    ],
  },
};

const NAMESPACES = { SiteBooking: SITE_BOOKING, CommunitySite: COMMUNITY_SITE };

let added = 0;
let replaced = 0;

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

  for (const [ns, keys] of Object.entries(OVERRIDES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i];
        replaced++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added} · sobrescritas: ${replaced}`);
