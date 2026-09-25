/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — INDICADORES REFORMULADOS (mig 261, 2026-09-25).
//
// Pedido do Alex: painel mais sólido e com contraste, com visitas, conversões,
// agendamentos, melhores horários, membros, membros ativos e receita × custo ×
// lucro puxando os custos lançados no Financeiro.
//
// ns `Community` (prefixo `ind*`) + ns `Wallet` (o seletor "de qual negócio é"
// na Vida Financeira). Fill-if-absent: nunca sobrescreve o que já existe.
//
// Uso: node scripts/i18n-business-indicators-v2-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** namespace → chave → [pt, en, es] */
const NEW = {
  Community: {
    // ── resultado ──
    indResultTitle: ["Resultado do negócio", "Business results", "Resultado del negocio"],
    indProfit: ["Lucro", "Profit", "Ganancia"],
    indLoss: ["Prejuízo", "Loss", "Pérdida"],
    indRevenue: ["Receita", "Revenue", "Ingresos"],
    indCosts: ["Custos", "Costs", "Costos"],
    indMargin: ["Margem", "Margin", "Margen"],
    indVsPrev: ["vs. {n} dias anteriores", "vs. previous {n} days", "vs. {n} días anteriores"],
    indDeltaNew: ["novo", "new", "nuevo"],
    indDeltaSame: ["igual", "same", "igual"],
    indRevenuePlatform: ["Recebido pela Freelandoo", "Received through Freelandoo", "Recibido por Freelandoo"],
    indRevenueManual: ["Receitas lançadas por você", "Income you logged", "Ingresos que registraste"],
    indFixedCost: ["Custo fixo por mês", "Fixed cost per month", "Costo fijo por mes"],
    indMoneyChart: ["Entrou × saiu, por dia", "In × out, by day", "Entró × salió, por día"],
    indTopCosts: ["Para onde o dinheiro vai", "Where the money goes", "A dónde va el dinero"],
    indFinanceEmpty: [
      "Você ainda não lançou nenhum custo deste negócio. Lance aqui (aluguel, material, equipe…) ou marque o lançamento com este negócio na sua Vida Financeira — só assim o lucro é de verdade.",
      "You haven't logged any cost for this business yet. Log it here (rent, supplies, staff…) or tag the entry with this business in your Financial Life — only then is the profit real.",
      "Todavía no registraste ningún costo de este negocio. Regístralo aquí (alquiler, materiales, equipo…) o marca el registro con este negocio en tu Vida Financiera — solo así la ganancia es real.",
    ],
    indAddCost: ["Lançar custo", "Log cost", "Registrar costo"],
    indAddIncome: ["Lançar receita", "Log income", "Registrar ingreso"],
    indOpenFinance: ["Ver na Vida Financeira", "See in Financial Life", "Ver en Vida Financiera"],
    indFinanceNote: [
      "Receita = o que passou pela Freelandoo (sinais e mensalidades, já sem a taxa) + as receitas que você lançou neste negócio. Custos = só os lançamentos marcados com este negócio; os gastos pessoais da Vida Financeira não entram.",
      "Revenue = what went through Freelandoo (deposits and memberships, net of fees) + the income you logged for this business. Costs = only entries tagged with this business; personal expenses from Financial Life are left out.",
      "Ingresos = lo que pasó por Freelandoo (señas y mensualidades, sin la comisión) + los ingresos que registraste en este negocio. Costos = solo los registros marcados con este negocio; los gastos personales de la Vida Financiera no entran.",
    ],
    // ── KPIs ──
    indKpiVisits: ["Visitas no site", "Site visits", "Visitas al sitio"],
    indKpiConversion: ["Conversão", "Conversion", "Conversión"],
    indKpiConversionHint: [
      "das visitas viraram agendamento",
      "of visits became a booking",
      "de las visitas se convirtieron en reserva",
    ],
    indKpiBookings: ["Agendamentos", "Bookings", "Reservas"],
    indKpiActive: ["Membros ativos", "Active members", "Miembros activos"],
    indKpiActiveOf: ["de {n} membros", "of {n} members", "de {n} miembros"],
    // ── funil ──
    indFunnelTitle: ["Funil do site", "Site funnel", "Embudo del sitio"],
    indFunnelViews: ["Entraram no site", "Visited the site", "Entraron al sitio"],
    indFunnelClicks: ["Clicaram em agendar", "Clicked book", "Hicieron clic en reservar"],
    indFunnelBooked: ["Agendaram", "Booked", "Reservaron"],
    indFunnelPaid: ["Pagaram o sinal", "Paid the deposit", "Pagaron la seña"],
    indFunnelStep: ["{n}% seguiram", "{n}% moved on", "{n}% siguieron"],
    indFunnelWhatsapp: [
      "{n} cliques no botão do WhatsApp",
      "{n} clicks on the WhatsApp button",
      "{n} clics en el botón de WhatsApp",
    ],
    // ── agenda ──
    indAgendaTitle: ["Agenda", "Schedule", "Agenda"],
    indAgendaValid: ["Agendamentos", "Bookings", "Reservas"],
    indAgendaCanceled: ["Cancelados", "Canceled", "Canceladas"],
    indAgendaNoShow: ["Faltas", "No-shows", "Ausencias"],
    indAgendaCancelRate: ["{n}% do total", "{n}% of total", "{n}% del total"],
    indBestTimes: ["Melhores horários", "Busiest times", "Mejores horarios"],
    indBestWeekday: ["Dia mais cheio", "Busiest day", "Día más lleno"],
    indBestHour: ["Horário mais cheio", "Busiest hour", "Hora más llena"],
    indHeatTitle: ["Quando a agenda enche", "When the schedule fills up", "Cuándo se llena la agenda"],
    indHeatEmpty: [
      "Ainda não há agendamentos no período para mostrar os melhores horários.",
      "No bookings in this period yet to show the busiest times.",
      "Todavía no hay reservas en el período para mostrar los mejores horarios.",
    ],
    indSlotLabel: ["{day} às {hour}h", "{day} at {hour}h", "{day} a las {hour}h"],
    indAgendaScopeNote: [
      "Conta a agenda de toda a equipe ({n} pessoas), pelo site ou pelo perfil — pela hora marcada. Checkouts abandonados não entram.",
      "Counts the schedule of the whole team ({n} people), booked through the site or the profile — by appointment time. Abandoned checkouts are left out.",
      "Cuenta la agenda de todo el equipo ({n} personas), por el sitio o por el perfil — por la hora reservada. Los pagos abandonados no entran.",
    ],
    // ── comunidade ──
    indMembersTitle: ["Comunidade", "Community", "Comunidad"],
    indMembersTotal: ["Membros", "Members", "Miembros"],
    indMembersNew: ["Novos no período", "New in period", "Nuevos en el período"],
    indMembersActive: ["Ativos", "Active", "Activos"],
    indMembersParticipants: ["Publicaram no mural", "Posted on the wall", "Publicaron en el mural"],
    indMembersActiveShare: [
      "{n}% dos membros apareceram na Freelandoo no período",
      "{n}% of members showed up on Freelandoo in this period",
      "{n}% de los miembros aparecieron en Freelandoo en el período",
    ],
    // ── série ──
    indChartBookings: ["Agendamentos", "Bookings", "Reservas"],
    indChartRevenue: ["Receita", "Revenue", "Ingresos"],
    indChartMembers: ["Novos membros", "New members", "Nuevos miembros"],
    indChartTotal: ["Total no período: {v}", "Total in period: {v}", "Total en el período: {v}"],
    // ── lançar ──
    indEntryTitleCost: ["Novo custo do negócio", "New business cost", "Nuevo costo del negocio"],
    indEntryTitleIncome: ["Nova receita do negócio", "New business income", "Nuevo ingreso del negocio"],
    indEntryNote: [
      "Ele também aparece na sua Vida Financeira, marcado como deste negócio.",
      "It also shows up in your Financial Life, tagged with this business.",
      "También aparece en tu Vida Financiera, marcado como de este negocio.",
    ],
    indEntryName: ["Descrição", "Description", "Descripción"],
    indEntryNamePhCost: ["Ex.: aluguel do salão", "e.g. shop rent", "Ej.: alquiler del local"],
    indEntryNamePhIncome: ["Ex.: vendas no balcão", "e.g. walk-in sales", "Ej.: ventas en mostrador"],
    indEntryAmount: ["Valor (R$)", "Amount (R$)", "Valor (R$)"],
    indEntryOnce: ["Só esta vez", "One time", "Solo esta vez"],
    indEntryMonthly: ["Todo mês", "Every month", "Todos los meses"],
    indEntryDate: ["Data", "Date", "Fecha"],
    indEntryDueDay: ["Dia do vencimento", "Due day", "Día de vencimiento"],
    indEntrySave: ["Salvar", "Save", "Guardar"],
    indEntryCancel: ["Cancelar", "Cancel", "Cancelar"],
    indEntryErrName: ["Informe uma descrição.", "Enter a description.", "Ingresa una descripción."],
    indEntryErrAmount: ["Informe um valor válido.", "Enter a valid amount.", "Ingresa un valor válido."],
    indEntryErrSave: ["Não deu para salvar agora.", "Couldn't save right now.", "No se pudo guardar ahora."],
  },
  Wallet: {
    bizTag: ["Negócio", "Business", "Negocio"],
    bizLabel: ["De qual negócio é?", "Which business is it for?", "¿De qué negocio es?"],
    bizPersonal: ["Pessoal (não é de negócio)", "Personal (not a business)", "Personal (no es de negocio)"],
    bizHint: [
      "Marcado com um negócio, entra no lucro dos Indicadores dele.",
      "Tagged with a business, it counts toward that business's profit in Insights.",
      "Marcado con un negocio, entra en la ganancia de sus Indicadores.",
    ],
  },
};

let totalAdded = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  let added = 0;
  for (const [ns, keys] of Object.entries(NEW)) {
    dict[ns] = dict[ns] || {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[idx];
        added += 1;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`${locale}: ${added} chaves adicionadas`);
  totalAdded += added;
});
console.log(`total: ${totalAdded}`);
