// Esportes — repaginada da "Minha academia" (2026-10-27): calendário de
// frequência, histórico de mensalidades em talões e o "Pagar pela Freelandoo".
// Namespace "Fitness". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-esportes-academia-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FITNESS = {
  retry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  calPrev: ["Mês anterior", "Previous month", "Mes anterior"],
  calNext: ["Próximo mês", "Next month", "Mes siguiente"],
  calLoading: ["Carregando o mês…", "Loading the month…", "Cargando el mes…"],
  calError: ["Não deu pra carregar este mês.", "Couldn't load this month.", "No se pudo cargar este mes."],
  calOfDays: ["de {n} dias", "of {n} days", "de {n} días"],
  calStreak: ["dias seguidos", "days in a row", "días seguidos"],
  calLegendIn: ["entrou", "checked in", "entró"],
  calLegendMiss: ["faltou", "missed", "faltó"],
  calLegendToday: ["hoje", "today", "hoy"],
  calAriaIn: ["entrada registrada", "check-in recorded", "entrada registrada"],
  calAriaMiss: ["sem entrada", "no check-in", "sin entrada"],
  calAriaTodayIn: ["hoje, entrada registrada", "today, check-in recorded", "hoy, entrada registrada"],
  calAriaToday: ["hoje", "today", "hoy"],
  calAriaBefore: ["antes do vínculo", "before you linked", "antes del vínculo"],
  calAriaFuture: ["ainda não chegou", "not yet", "todavía no llegó"],
  duesTitle: ["Histórico de mensalidades", "Membership fee history", "Historial de mensualidades"],
  duesOverdueOne: ["1 mensalidade vencida", "1 overdue fee", "1 mensualidad vencida"],
  duesOverdueMany: ["{n} mensalidades vencidas", "{n} overdue fees", "{n} mensualidades vencidas"],
  duesOpenOne: ["1 mensalidade em aberto", "1 open fee", "1 mensualidad pendiente"],
  duesOpenMany: ["{n} mensalidades em aberto", "{n} open fees", "{n} mensualidades pendientes"],
  duesEmpty: ["Nenhuma mensalidade registrada ainda.", "No fees recorded yet.", "Aún no hay mensualidades registradas."],
  duesShowLess: ["Mostrar menos", "Show less", "Mostrar menos"],
  duesShowAll: ["Ver todas ({n})", "See all ({n})", "Ver todas ({n})"],
  duesDue: ["Vencimento", "Due", "Vencimiento"],
  duesPaidOn: ["pago em", "paid on", "pagado el"],
  payNow: ["Pagar", "Pay", "Pagar"],
  payOpening: ["Abrindo…", "Opening…", "Abriendo…"],
  payResume: ["Continuar pagamento", "Resume payment", "Continuar pago"],
  payAtDesk: ["Pague na recepção", "Pay at the front desk", "Paga en la recepción"],
  payOverdueStamp: ["Vencida", "Overdue", "Vencida"],
  payViaFreelandoo: ["Pago via Freelandoo", "Paid via Freelandoo", "Pagado vía Freelandoo"],
  payPaidChip: ["Paga", "Paid", "Pagada"],
  payCanceledToast: ["Pagamento não concluído.", "Payment not completed.", "Pago no completado."],
  paySuccessToast: [
    "Mensalidade paga! A academia já foi avisada.",
    "Fee paid! The gym has been notified.",
    "¡Mensualidad pagada! El gimnasio ya fue avisado.",
  ],
  payProcessingToast: [
    "Pagamento em processamento — confirmamos assim que o Mercado Pago avisar.",
    "Payment processing — we'll confirm as soon as Mercado Pago lets us know.",
    "Pago en proceso — confirmamos apenas Mercado Pago avise.",
  ],
  payError: [
    "Não foi possível iniciar o pagamento.",
    "Couldn't start the payment.",
    "No se pudo iniciar el pago.",
  ],
  methodPix: ["PIX", "PIX", "PIX"],
  methodBoleto: ["Boleto", "Bank slip", "Boleto"],
  methodCredit: ["Cartão de crédito", "Credit card", "Tarjeta de crédito"],
  methodDebit: ["Cartão de débito", "Debit card", "Tarjeta de débito"],
  methodCash: ["Dinheiro", "Cash", "Efectivo"],
  methodFreelandoo: ["Freelandoo", "Freelandoo", "Freelandoo"],
  methodAcademy: ["Na academia", "At the gym", "En el gimnasio"],
  gymMetricMonth: ["no mês", "this month", "en el mes"],
  gymMetricStreak: ["seguidos", "in a row", "seguidos"],
  gymMetric30: ["dias / 30d", "days / 30d", "días / 30d"],
  gymLinkedSince: ["vinculado desde {d}", "linked since {d}", "vinculado desde {d}"],
  gymConnectTitle: ["Conecte sua academia", "Connect your gym", "Conecta tu gimnasio"],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.Fitness = json.Fitness || {}
  for (const [key, vals] of Object.entries(FITNESS)) {
    if (json.Fitness[key] === undefined) {
      json.Fitness[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n esportes academia: ${added} chaves adicionadas`)
