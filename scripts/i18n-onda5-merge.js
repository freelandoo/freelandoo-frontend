// Onda 5 do i18n (Dinheiro): merge de chaves novas em messages/{pt-BR,en,es}.json.
// Idempotente e não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve.
// Áreas: checkout, pagamentos, carteira (wallet), poléns, manifestação, premium.
// Placeholders {x} preservados (provider não interpola — montar em JS). Rodar:
//   node scripts/i18n-onda5-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// Namespace "Checkout" — chaves novas da S1 (checkout + páginas de retorno).
const CHECKOUT = {
  eyebrowPayment: ["Pagamento", "Payment", "Pago"],
  successHeading: ["CONFIRMADO.", "CONFIRMED.", "CONFIRMADO."],
  successDescription: [
    'Recebemos seu pagamento. Assim que o Stripe confirmar, seu perfil será ativado automaticamente nos classificados — em alguns segundos o status aparece em "Minha conta".',
    'We received your payment. As soon as Stripe confirms it, your profile will be activated automatically in the listings — within seconds the status will show in "My account".',
    'Recibimos tu pago. En cuanto Stripe lo confirme, tu perfil se activará automáticamente en los clasificados — en segundos el estado aparecerá en "Mi cuenta".',
  ],
  goToMyAccount: ["Ir para minha conta", "Go to my account", "Ir a mi cuenta"],
  backToHome: ["Voltar ao início", "Back to home", "Volver al inicio"],
  cancelledHeading: ["CANCELADO.", "CANCELLED.", "CANCELADO."],
  cancelledDescription: [
    "Nenhum valor foi cobrado. Você pode tentar novamente quando quiser.",
    "No charge was made. You can try again whenever you like.",
    "No se cobró nada. Puedes intentarlo de nuevo cuando quieras.",
  ],
  tryAgain: ["Tentar novamente", "Try again", "Intentar de nuevo"],
}

// Namespace "Payments" — S2 (faturamentos: assinaturas, vendas da loja, payouts de agenda).
const PAYMENTS = {
  // Status de assinatura
  statusRefundedMale: ["Reembolsado", "Refunded", "Reembolsado"],
  statusActive: ["Ativa", "Active", "Activa"],
  statusPending: ["Pendente", "Pending", "Pendiente"],
  statusPastDue: ["Pagamento atrasado", "Payment overdue", "Pago atrasado"],
  statusCanceled: ["Cancelada", "Canceled", "Cancelada"],
  statusRefundedFemale: ["Reembolsada", "Refunded", "Reembolsada"],
  statusFailed: ["Falhou", "Failed", "Falló"],
  statusIncomplete: ["Incompleta", "Incomplete", "Incompleta"],
  statusEnded: ["Encerrada", "Ended", "Finalizada"],
  // Header da página
  eyebrow: ["Ativação", "Activation", "Activación"],
  title: ["PAGAMENTOS.", "PAYMENTS.", "PAGOS."],
  subtitle: [
    "Assinaturas, ativações e saldo de vendas em um painel só.",
    "Subscriptions, activations and sales balance in a single panel.",
    "Suscripciones, activaciones y saldo de ventas en un solo panel.",
  ],
  // Geral
  copy: ["Copiar", "Copy", "Copiar"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  processing: ["Processando...", "Processing...", "Procesando..."],
  yes: ["Sim", "Yes", "Sí"],
  error: ["Erro", "Error", "Error"],
  loadError: ["Erro ao carregar pagamentos.", "Error loading payments.", "Error al cargar los pagos."],
  refundError: ["Erro ao processar reembolso", "Error processing refund", "Error al procesar el reembolso"],
  manifestation: ["Manifestação", "Manifestation", "Manifestación"],
  dateRangeTo: ["até", "to", "hasta"],
  polens: ["Poléns", "Polens", "Polens"],
  // Reembolso
  requestRefund: ["Solicitar reembolso", "Request refund", "Solicitar reembolso"],
  refundFullTitle: ["Solicitar reembolso integral?", "Request a full refund?", "¿Solicitar reembolso total?"],
  refundAmountPrefix: ["O valor de", "The amount of", "El importe de"],
  refundAmountSuffix: [
    "será devolvido ao seu método de pagamento. Seu perfil será desativado imediatamente.",
    "will be returned to your payment method. Your profile will be deactivated immediately.",
    "se devolverá a tu método de pago. Tu perfil se desactivará de inmediato.",
  ],
  refundAvailableNote: [
    "Disponível por 7 dias após o pagamento. Esta ação não pode ser desfeita.",
    "Available for 7 days after payment. This action cannot be undone.",
    "Disponible durante 7 días tras el pago. Esta acción no se puede deshacer.",
  ],
  confirmRefund: ["Confirmar reembolso", "Confirm refund", "Confirmar reembolso"],
  refundIdsNote: [
    "Use estes IDs em qualquer suporte com a Stripe para rastrear o reembolso. O valor pode levar de 5 a 10 dias úteis para aparecer na fatura.",
    "Use these IDs with any Stripe support to track the refund. The amount may take 5 to 10 business days to appear on your statement.",
    "Usa estos IDs en cualquier soporte de Stripe para rastrear el reembolso. El importe puede tardar de 5 a 10 días hábiles en aparecer en tu factura.",
  ],
  refundAvailableUntil: ["Reembolso disponível até", "Refund available until", "Reembolso disponible hasta"],
  // Estado vazio
  emptyTitle: ["Nenhuma ativação ativa", "No active activation", "Ninguna activación activa"],
  emptyDescription: [
    "Ative seu perfil para aparecer nas buscas e receber propostas de trabalho.",
    "Activate your profile to appear in searches and receive job offers.",
    "Activa tu perfil para aparecer en las búsquedas y recibir propuestas de trabajo.",
  ],
  activateProfile: ["Ativar perfil", "Activate profile", "Activar perfil"],
  // Cartão de assinatura
  profileActivation: ["Ativação do perfil", "Profile activation", "Activación del perfil"],
  oneTime: ["único", "one-time", "único"],
  activeSince: ["Ativo desde:", "Active since:", "Activo desde:"],
  couponApplied: ["Cupom aplicado:", "Coupon applied:", "Cupón aplicado:"],
  pendingProcessingNote: [
    "Pagamento em processamento. Não concluiu? Finalize abaixo.",
    "Payment processing. Didn't finish? Complete it below.",
    "Pago en proceso. ¿No terminaste? Finalízalo abajo.",
  ],
  finishActivation: ["Finalizar ativação", "Finish activation", "Finalizar activación"],
  noConfirmedPayments: ["Nenhum pagamento confirmado ainda.", "No confirmed payments yet.", "Aún no hay pagos confirmados."],
  yourActivations: ["Suas ativações", "Your activations", "Tus activaciones"],
  // Saldo de vendas (loja)
  balanceWaiting: ["Aguardando (8d)", "Pending (8d)", "En espera (8d)"],
  balanceReleased: ["Liberado", "Released", "Liberado"],
  balancePaidSeller: ["Pago ao vendedor", "Paid to seller", "Pagado al vendedor"],
  balancePaid: ["Pago", "Paid", "Pagado"],
  balanceReverted: ["Revertido", "Reverted", "Revertido"],
  labelGenError: [
    "Não foi possível gerar a etiqueta agora — tente novamente em alguns minutos.",
    "Couldn't generate the label right now — try again in a few minutes.",
    "No se pudo generar la etiqueta ahora — inténtalo de nuevo en unos minutos.",
  ],
  labelConnError: ["Erro de conexão ao gerar etiqueta.", "Connection error while generating label.", "Error de conexión al generar la etiqueta."],
  storeSales: ["Vendas da Loja", "Store sales", "Ventas de la Tienda"],
  summaryWaiting: ["Aguardando", "Pending", "En espera"],
  summaryReleased: ["Liberado", "Released", "Liberado"],
  summaryPaid: ["Pago", "Paid", "Pagado"],
  summaryGross: ["Total bruto", "Gross total", "Total bruto"],
  summaryNet: ["Total líquido", "Net total", "Total neto"],
  order: ["Pedido", "Order", "Pedido"],
  releasesOn: ["Libera em", "Releases on", "Se libera el"],
  paidOn: ["Pago em", "Paid on", "Pagado el"],
  revertedOn: ["Revertido em", "Reverted on", "Revertido el"],
  tracking: ["Rastreio:", "Tracking:", "Seguimiento:"],
  labelPending: ["Etiqueta pendente", "Label pending", "Etiqueta pendiente"],
  reprintLabel: ["Reimprimir etiqueta", "Reprint label", "Reimprimir etiqueta"],
  printLabel: ["Imprimir etiqueta", "Print label", "Imprimir etiqueta"],
  gross: ["Bruto", "Gross", "Bruto"],
  shipping: ["frete", "shipping", "envío"],
  withheld: ["retido", "withheld", "retenido"],
  saleSingular: ["venda", "sale", "venta"],
  salePlural: ["vendas", "sales", "ventas"],
  // Saldo de agendamentos
  bookingBalance: ["Saldo de agendamentos", "Booking balance", "Saldo de reservas"],
  booking: ["Agendamento", "Booking", "Reserva"],
  bookingShort: ["Agend.", "Bkg.", "Res."],
  clientPaid: ["Cliente pagou", "Client paid", "El cliente pagó"],
  fee: ["taxa", "fee", "tarifa"],
  itemSingular: ["item", "item", "ítem"],
  itemPlural: ["itens", "items", "ítems"],
}

const GROUPS = { Checkout: CHECKOUT, Payments: PAYMENTS }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
function fill(target, ns, key, val) {
  if (!target[ns]) target[ns] = {}
  if (!(key in target[ns])) {
    target[ns][key] = val
    return 1
  }
  return 0
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, group] of Object.entries(GROUPS)) {
    for (const [k, vals] of Object.entries(group)) added += fill(d, ns, k, vals[idx])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
