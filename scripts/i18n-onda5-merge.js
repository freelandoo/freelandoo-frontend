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

// Namespace "Wallet" — S3 (carteira: extrato + mercado + vida financeira).
const WALLET = {
  // Tipos de ganho / filtros
  kindStore: ["Loja", "Store", "Tienda"],
  kindService: ["Serviço", "Service", "Servicio"],
  kindCourse: ["Curso", "Course", "Curso"],
  kindAffiliate: ["Afiliado", "Affiliate", "Afiliado"],
  filterAll: ["Todos", "All", "Todos"],
  // Status de lançamento
  statusReceived: ["Recebido", "Received", "Recibido"],
  statusAvailable: ["Disponível", "Available", "Disponible"],
  statusPending: ["Aguardando", "Pending", "En espera"],
  statusReverted: ["Revertido", "Reverted", "Revertido"],
  // Intervalos
  range7d: ["7 dias", "7 days", "7 días"],
  range30d: ["30 dias", "30 days", "30 días"],
  range90d: ["90 dias", "90 days", "90 días"],
  // Hero / controles
  back: ["Voltar", "Back", "Volver"],
  heroEyebrow: ["a sua grana", "your money", "tu dinero"],
  heroTitle: ["Carteira", "Wallet", "Cartera"],
  period: ["Período", "Period", "Período"],
  allSubprofiles: ["Todos os subperfis", "All subprofiles", "Todos los subperfiles"],
  courseAffiliateNote: [
    "Curso e Afiliado são por conta — não filtram por subperfil.",
    "Course and Affiliate are account-wide — they don't filter by subprofile.",
    "Curso y Afiliado son por cuenta — no filtran por subperfil.",
  ],
  // KPIs / gráfico
  kpiReceived: ["Recebido", "Received", "Recibido"],
  kpiAvailable: ["Disponível", "Available", "Disponible"],
  kpiPending: ["Aguardando", "Pending", "En espera"],
  kpiEntries: ["Lançamentos", "Entries", "Movimientos"],
  earningsPerDay: ["Ganhos por dia", "Earnings per day", "Ganancias por día"],
  noMovement: ["Sem movimento neste período.", "No movement in this period.", "Sin movimiento en este período."],
  // Extrato
  statement: ["Extrato", "Statement", "Extracto"],
  loadStatementError: ["Falha ao carregar extrato", "Failed to load statement", "Error al cargar el extracto"],
  loadError: ["Erro ao carregar", "Loading error", "Error al cargar"],
  loadFailedTitle: ["Não deu pra carregar.", "Couldn't load.", "No se pudo cargar."],
  tryAgain: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  emptyTitle: ["Nenhum ganho ainda.", "No earnings yet.", "Aún no hay ganancias."],
  emptyDesc: [
    "Quando você vender na Loja, fechar um agendamento, vender um curso ou receber comissão de afiliado, aparece aqui.",
    "When you sell in the Store, close a booking, sell a course or receive affiliate commission, it shows up here.",
    "Cuando vendas en la Tienda, cierres una reserva, vendas un curso o recibas comisión de afiliado, aparecerá aquí.",
  ],
  loadMore: ["Carregar mais", "Load more", "Cargar más"],
  // Mercado
  market: ["Mercado", "Market", "Mercado"],
  close: ["Fechar", "Close", "Cerrar"],
  stocksUp: ["Ações em alta", "Stocks up", "Acciones en alza"],
  noStocks: ["Sem dados de ações no momento.", "No stock data right now.", "Sin datos de acciones por ahora."],
  quotes: ["Cotações", "Quotes", "Cotizaciones"],
  noQuotes: ["Cotações indisponíveis no momento.", "Quotes unavailable right now.", "Cotizaciones no disponibles por ahora."],
  marketPolitics: ["Mercado & política", "Market & politics", "Mercado y política"],
  noHeadlines: ["Sem manchetes por enquanto.", "No headlines for now.", "Sin titulares por ahora."],
  // Vida Financeira
  financeEyebrow: ["controle de verdade", "real control", "control de verdad"],
  financeTitle: ["Vida Financeira", "Financial Life", "Vida Financiera"],
  financeIntro: [
    "Some o que entra e sai fora da plataforma. Custos fixos entram sozinhos todo mês; o resto você lança no clique.",
    "Add up what comes in and goes out outside the platform. Fixed costs come in by themselves every month; the rest you log in one click.",
    "Suma lo que entra y sale fuera de la plataforma. Los costos fijos entran solos cada mes; el resto lo registras con un clic.",
  ],
  monthClose: ["Fechamento de {month}", "{month} closing", "Cierre de {month}"],
  monthPositive: [
    "Parabéns! Você gastou menos do que recebeu este mês. Continue assim.",
    "Congrats! You spent less than you earned this month. Keep it up.",
    "¡Felicidades! Gastaste menos de lo que recibiste este mes. Sigue así.",
  ],
  monthNegative: [
    "Você gastou mais do que recebeu este mês. Hora de ajustar.",
    "You spent more than you earned this month. Time to adjust.",
    "Gastaste más de lo que recibiste este mes. Hora de ajustar.",
  ],
  costControl: ["Controle de custos", "Cost control", "Control de costos"],
  costEmpty: [
    "Lance entradas e saídas para ver o panorama do mês aqui.",
    "Log income and expenses to see the month's overview here.",
    "Registra ingresos y gastos para ver el panorama del mes aquí.",
  ],
  inVsOut: ["Entradas × Saídas", "Income × Expenses", "Ingresos × Gastos"],
  cameIn: ["Entrou", "Came in", "Entró"],
  wentOut: ["Saiu", "Went out", "Salió"],
  whereItWent: ["Para onde foi", "Where it went", "A dónde fue"],
  noExpenses: ["Sem saídas neste mês.", "No expenses this month.", "Sin gastos este mes."],
  prevYear: ["Ano anterior", "Previous year", "Año anterior"],
  nextYear: ["Próximo ano", "Next year", "Año siguiente"],
  income: ["Entradas", "Income", "Ingresos"],
  expenses: ["Saídas", "Expenses", "Gastos"],
  receiveMonthly: ["Recebo todo mês", "I receive monthly", "Recibo cada mes"],
  spendMonthly: ["Gasto todo mês", "I spend monthly", "Gasto cada mes"],
  receivedToday: ["Recebi hoje", "Received today", "Recibí hoy"],
  spentToday: ["Gastei hoje", "Spent today", "Gasté hoy"],
  fixedMonthly: ["Fixos do mês", "Monthly fixed", "Fijos del mes"],
  onTheDay: ["No dia", "On the day", "En el día"],
  nothingYet: ["Nada lançado ainda. Use os botões acima.", "Nothing logged yet. Use the buttons above.", "Nada registrado aún. Usa los botones de arriba."],
  everyDay: ["todo dia {day}", "every day {day}", "cada día {day}"],
  onDay: ["dia {day}", "day {day}", "día {day}"],
  delete: ["Excluir", "Delete", "Eliminar"],
  category: ["Categoria", "Category", "Categoría"],
  newCategory: ["Nova", "New", "Nueva"],
  ok: ["ok", "ok", "ok"],
  entryTitlePlaceholder: ["Título do lançamento", "Entry title", "Título del movimiento"],
  amountBRL: ["Valor (R$)", "Amount (R$)", "Importe (R$)"],
  dayOfMonth: ["Dia do mês", "Day of month", "Día del mes"],
  date: ["Data", "Date", "Fecha"],
  saveFixed: ["Salvar fixo do mês", "Save monthly fixed", "Guardar fijo del mes"],
  post: ["Lançar", "Log", "Registrar"],
  errPickCategory: ["Escolha ou digite uma categoria.", "Pick or type a category.", "Elige o escribe una categoría."],
  errValidAmount: ["Informe um valor válido.", "Enter a valid amount.", "Ingresa un importe válido."],
  errCouldNotSave: ["Não deu pra salvar", "Couldn't save", "No se pudo guardar"],
  errSaving: ["Erro ao salvar", "Error saving", "Error al guardar"],
}

// Namespace "Polens" — S4 (loja de poléns pública).
const POLENS = {
  eyebrow: ["Pacotes de Poléns", "Polen packages", "Paquetes de Polen"],
  storeTitle: ["Loja de Polén", "Polen Store", "Tienda de Polen"],
  storeIntro: [
    "Compre Poléns para usar dentro da Freelandoo: ative perfis, destaque-se na vitrine e adquira recursos exclusivos.",
    "Buy Polens to use inside Freelandoo: activate profiles, stand out in the showcase and unlock exclusive features.",
    "Compra Polens para usar dentro de Freelandoo: activa perfiles, destácate en la vitrina y adquiere recursos exclusivos.",
  ],
  currentBalance: ["Saldo atual", "Current balance", "Saldo actual"],
  polens: ["Poléns", "Polens", "Polens"],
  activePackages: ["Pacotes ativos", "Active packages", "Paquetes activos"],
  availableNow: ["Disponíveis para compra agora.", "Available to buy now.", "Disponibles para comprar ahora."],
  featuredPackage: ["Pacote em destaque", "Featured package", "Paquete destacado"],
  totalPolens: ["{n} Poléns no total", "{n} Polens in total", "{n} Polens en total"],
  selectPackage: ["Selecione um pacote", "Select a package", "Selecciona un paquete"],
  featuredDesc: [
    "Pague com cartão e receba os Poléns na carteira em segundos.",
    "Pay by card and get the Polens in your wallet in seconds.",
    "Paga con tarjeta y recibe los Polens en tu cartera en segundos.",
  ],
  noPackagesNow: ["Sem pacotes no momento", "No packages right now", "Sin paquetes por ahora"],
  noPackagesNowDesc: [
    "Volte em breve. Novos pacotes aparecem aqui assim que forem cadastrados.",
    "Check back soon. New packages show up here as soon as they're created.",
    "Vuelve pronto. Los nuevos paquetes aparecen aquí en cuanto se registren.",
  ],
  searchPackage: ["Buscar pacote", "Search package", "Buscar paquete"],
  securePaymentNote: [
    "Pagamento seguro via Stripe. Os Poléns são creditados automaticamente após a confirmação.",
    "Secure payment via Stripe. Polens are credited automatically after confirmation.",
    "Pago seguro vía Stripe. Los Polens se acreditan automáticamente tras la confirmación.",
  ],
  noPackagesYet: ["Sem pacotes ainda", "No packages yet", "Aún sin paquetes"],
  nothingFound: ["Nada encontrado", "Nothing found", "Nada encontrado"],
  noPackagesYetDesc: ["Nenhum pacote disponível ainda. Volte em breve.", "No packages available yet. Check back soon.", "Aún no hay paquetes disponibles. Vuelve pronto."],
  noMatch: ["Nenhum pacote corresponde à busca.", "No package matches your search.", "Ningún paquete coincide con la búsqueda."],
  bonus: ["bônus", "bonus", "bono"],
  cardDefaultDesc: ["Receba os Poléns direto na sua carteira.", "Get the Polens straight to your wallet.", "Recibe los Polens directo en tu cartera."],
  buy: ["Comprar", "Buy", "Comprar"],
  gotIt: ["Entendi", "Got it", "Entendido"],
  paymentConfirmed: ["Pagamento confirmado", "Payment confirmed", "Pago confirmado"],
  paymentConfirmedMsg: [
    "Seus Poléns foram creditados na sua carteira. O saldo aparece em instantes.",
    "Your Polens have been credited to your wallet. The balance appears in moments.",
    "Tus Polens se acreditaron en tu cartera. El saldo aparece en instantes.",
  ],
  purchaseCanceled: ["Compra cancelada", "Purchase canceled", "Compra cancelada"],
  purchaseCanceledMsg: [
    "Você voltou sem concluir o pagamento. Tente novamente quando quiser.",
    "You came back without finishing the payment. Try again whenever you like.",
    "Volviste sin completar el pago. Inténtalo de nuevo cuando quieras.",
  ],
  purchaseNotCompleted: ["Compra não concluída", "Purchase not completed", "Compra no completada"],
  openCheckoutError: ["Não foi possível abrir o checkout", "Couldn't open checkout", "No se pudo abrir el checkout"],
  openCheckoutErrorShort: ["Erro ao abrir checkout", "Error opening checkout", "Error al abrir el checkout"],
  loadStoreError: ["Não foi possível carregar a loja", "Couldn't load the store", "No se pudo cargar la tienda"],
  loadError: ["Erro ao carregar", "Loading error", "Error al cargar"],
}

// Namespace "Manifestation" — S5 (loja pública de manifestações + badge).
const MANIFESTATION = {
  badge: ["Manifestação", "Manifestation", "Manifestación"],
  eyebrow: ["Manifestação", "Manifestation", "Manifestación"],
  storeTitle: ["Loja de Manifestações", "Manifestations Store", "Tienda de Manifestaciones"],
  subtitle: [
    "Desbloqueie banners de manifestação com Poléns ou cartão e aplique um deles no headcard do seu perfil. Depois de desbloqueada, ela fica sua para sempre.",
    "Unlock manifestation banners with Polens or card and apply one to your profile's headcard. Once unlocked, it's yours forever.",
    "Desbloquea banners de manifestación con Polens o tarjeta y aplica uno en el headcard de tu perfil. Una vez desbloqueado, es tuyo para siempre.",
  ],
  polens: ["Poléns", "Polens", "Polens"],
  buyLink: ["comprar", "buy", "comprar"],
  shareTitle: ["Loja de Manifestações no Freelandoo", "Manifestations Store on Freelandoo", "Tienda de Manifestaciones en Freelandoo"],
  searchPlaceholder: ["Buscar por nome ou estado", "Search by name or state", "Buscar por nombre o estado"],
  filterAll: ["Todos", "All", "Todos"],
  filterMotivational: ["Motivacionais", "Motivational", "Motivacionales"],
  filterEmotion: ["Emoções", "Emotions", "Emociones"],
  filterOwned: ["Comprados", "Owned", "Comprados"],
  filterNotOwned: ["Não comprados", "Not owned", "No comprados"],
  typeMotivational: ["Motivacional", "Motivational", "Motivacional"],
  typeEmotion: ["Emoção", "Emotion", "Emoción"],
  typeDefault: ["Manifestação", "Manifestation", "Manifestación"],
  owned: ["Comprados", "Owned", "Comprados"],
  ownedHint: [
    "Aplique uma no headcard ou remova a que está em uso.",
    "Apply one to your headcard or remove the one in use.",
    "Aplica una en tu headcard o quita la que está en uso.",
  ],
  onProfile: ["No perfil", "On profile", "En el perfil"],
  remove: ["Remover", "Remove", "Quitar"],
  apply: ["Aplicar", "Apply", "Aplicar"],
  active: ["Ativo", "Active", "Activo"],
  free: ["Grátis", "Free", "Gratis"],
  ownedTag: ["Comprado", "Owned", "Comprado"],
  noManifestations: ["Sem manifestações", "No manifestations", "Sin manifestaciones"],
  nothingFound: ["Nada encontrado", "Nothing found", "Nada encontrado"],
  noManifestationsDesc: ["Nenhuma manifestação disponível no momento.", "No manifestations available right now.", "Ninguna manifestación disponible por ahora."],
  noMatchDesc: ["Nenhuma manifestação encontrada para esse filtro.", "No manifestation matches this filter.", "Ninguna manifestación coincide con este filtro."],
  previewOf: ["Preview de {name}", "Preview of {name}", "Vista previa de {name}"],
  close: ["Fechar", "Close", "Cerrar"],
  or: ["ou", "or", "o"],
  appliedOnProfile: ["Aplicada no seu perfil", "Applied to your profile", "Aplicada en tu perfil"],
  removeFromProfile: ["Remover do perfil", "Remove from profile", "Quitar del perfil"],
  useOnProfile: ["Usar no perfil", "Use on profile", "Usar en el perfil"],
  buy: ["Comprar", "Buy", "Comprar"],
  redeemFree: ["Resgatar grátis", "Redeem free", "Canjear gratis"],
  buyPolens: ["Comprar Poléns", "Buy Polens", "Comprar Polens"],
  gotIt: ["Entendi", "Got it", "Entendido"],
  loadStoreError: ["Não foi possível carregar a loja", "Couldn't load the store", "No se pudo cargar la tienda"],
  loadError: ["Erro ao carregar", "Loading error", "Error al cargar"],
  paymentConfirmed: ["Pagamento confirmado", "Payment confirmed", "Pago confirmado"],
  paymentConfirmedMsg: [
    'Sua manifestação foi desbloqueada. Clique em "Usar no perfil" para aplicá-la.',
    'Your manifestation has been unlocked. Click "Use on profile" to apply it.',
    'Tu manifestación se desbloqueó. Haz clic en "Usar en el perfil" para aplicarla.',
  ],
  purchaseNotCompleted: ["Compra não concluída", "Purchase not completed", "Compra no completada"],
  allSet: ["Tudo certo!", "All set!", "¡Todo listo!"],
  unlockedSuccess: ["Manifestação desbloqueada com sucesso.", "Manifestation unlocked successfully.", "Manifestación desbloqueada con éxito."],
  purchaseError: ["Erro na compra", "Purchase error", "Error en la compra"],
  insufficientBalance: ["Saldo insuficiente", "Insufficient balance", "Saldo insuficiente"],
  startPaymentError: ["Não foi possível iniciar o pagamento", "Couldn't start the payment", "No se pudo iniciar el pago"],
  checkoutUnavailable: ["Checkout indisponível", "Checkout unavailable", "Checkout no disponible"],
  paymentNotStarted: ["Pagamento não iniciado", "Payment not started", "Pago no iniciado"],
  checkoutError: ["Erro no checkout", "Checkout error", "Error en el checkout"],
  applyError: ["Não foi possível aplicar", "Couldn't apply", "No se pudo aplicar"],
  applied: ["Manifestação aplicada", "Manifestation applied", "Manifestación aplicada"],
  appliedMsg: ["Pronto, ela já aparece no headcard do seu perfil.", "Done, it now shows on your profile's headcard.", "Listo, ya aparece en el headcard de tu perfil."],
  applyErrorShort: ["Erro ao aplicar", "Error applying", "Error al aplicar"],
  removeError: ["Não foi possível remover", "Couldn't remove", "No se pudo quitar"],
  removed: ["Removida do perfil", "Removed from profile", "Quitada del perfil"],
  removedMsg: [
    "Sua manifestação saiu do headcard. Ela continua na sua lista de comprados.",
    "Your manifestation left the headcard. It stays in your owned list.",
    "Tu manifestación salió del headcard. Sigue en tu lista de comprados.",
  ],
  removeErrorShort: ["Erro ao remover", "Error removing", "Error al quitar"],
}

// Namespace "Premium" — S5 (modal de destaque do perfil).
const PREMIUM = {
  title: ["Quer dar destaque nesse perfil?", "Want to feature this profile?", "¿Quieres destacar este perfil?"],
  subtitleNamed: ["Premium para {name}", "Premium for {name}", "Premium para {name}"],
  subtitle: ["Coloque seu perfil em destaque na vitrine.", "Put your profile in the spotlight of the showcase.", "Pon tu perfil en destaque en la vitrina."],
  premiumActive: ["Premium ativo", "Premium active", "Premium activo"],
  activeUntilPre: ["Este perfil está em destaque até", "This profile is featured until", "Este perfil está destacado hasta"],
  activeUntilPost: ["Volte para comprar de novo quando expirar.", "Come back to buy again when it expires.", "Vuelve para comprar de nuevo cuando expire."],
  perk1Bold: ["Primeiras posições", "Top positions", "Primeras posiciones"],
  perk1Rest: ["nas vitrines de enxame e profissão na sua cidade.", "in the swarm and profession showcases in your city.", "en las vitrinas de enjambre y profesión en tu ciudad."],
  perk2Pre: ["Tag", "Tag", "Etiqueta"],
  perk2Rest: ["aparece no card e dentro do perfil.", "appears on the card and inside the profile.", "aparece en la tarjeta y dentro del perfil."],
  perk3: [
    "Card com fundo e borda da cor do seu enxame, com brilho e botão preto destacado.",
    "Card with background and border in your swarm's color, with glow and a standout black button.",
    "Tarjeta con fondo y borde del color de tu enjambre, con brillo y botón negro destacado.",
  ],
  highlightForDays: ["Destaque por {days} dias", "Featured for {days} days", "Destaque por {days} días"],
  card: ["Cartão", "Card", "Tarjeta"],
  polens: ["Poléns", "Polens", "Polens"],
  slotsIn: ["Vagas em", "Slots in", "Cupos en"],
  slotsCount: ["{available} de {total}", "{available} of {total}", "{available} de {total}"],
  slotSingular: ["disponível", "available", "disponible"],
  slotPlural: ["disponíveis", "available", "disponibles"],
  buyWithCard: ["Comprar com cartão", "Buy with card", "Comprar con tarjeta"],
  buyWithPolens: ["Comprar com Poléns", "Buy with Polens", "Comprar con Polens"],
  loadError: ["Não foi possível carregar", "Couldn't load", "No se pudo cargar"],
  loadErrorShort: ["Erro ao carregar", "Loading error", "Error al cargar"],
  purchaseError: ["Erro ao processar compra", "Error processing purchase", "Error al procesar la compra"],
}

const GROUPS = { Checkout: CHECKOUT, Payments: PAYMENTS, Wallet: WALLET, Polens: POLENS, Manifestation: MANIFESTATION, Premium: PREMIUM }

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
