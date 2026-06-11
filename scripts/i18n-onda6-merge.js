// Onda 6 do i18n (Restos + QA): merge de chaves novas em messages/{pt-BR,en,es}.json.
// Idempotente e não-destrutivo: só ADICIONA chaves ausentes, nunca sobrescreve.
// Cobre os restos do fluxo de dinheiro achados pelo scripts/i18n-coverage.js:
// payment/taxa, payment/pending (ns Checkout) + order/[id_order], order/taxa (ns Order).
// Rodar: node scripts/i18n-onda6-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// Adições ao namespace "Checkout" — payment/taxa + payment/pending.
const CHECKOUT = {
  // payment/taxa (ativação de perfil)
  taxaEyebrow: ["Ativação de perfil", "Profile activation", "Activación de perfil"],
  taxaSubtitle: ["Pagamento único por perfil — sem renovação automática.", "One-time payment per profile — no auto-renewal.", "Pago único por perfil — sin renovación automática."],
  taxaActivationTitle: ["Ativação do perfil", "Profile activation", "Activación del perfil"],
  taxaActivatingProfile: ['Ativando o perfil "{name}"', 'Activating the profile "{name}"', 'Activando el perfil "{name}"'],
  taxaKeepActive: ["Mantenha seu perfil ativo nos classificados", "Keep your profile active in the listings", "Mantén tu perfil activo en los clasificados"],
  taxaOneTimePerProfile: ["Pagamento único por perfil", "One-time payment per profile", "Pago único por perfil"],
  taxaNoAutoRenew: ["Sem renovação automática. Cada perfil tem ativação própria.", "No auto-renewal. Each profile has its own activation.", "Sin renovación automática. Cada perfil tiene su propia activación."],
  taxaPerk1Title: ["Apareça nos Classificados", "Appear in the Listings", "Aparece en los Clasificados"],
  taxaPerk1Desc: ["Somente o perfil ativado aparece publicamente. Seus outros perfis seguem inativos.", "Only the activated profile appears publicly. Your other profiles stay inactive.", "Solo el perfil activado aparece públicamente. Tus otros perfiles siguen inactivos."],
  taxaPerk2Title: ["Ativação imediata", "Immediate activation", "Activación inmediata"],
  taxaPerk2Desc: ["Confirmação via Stripe ativa o perfil automaticamente.", "Stripe confirmation activates the profile automatically.", "La confirmación vía Stripe activa el perfil automáticamente."],
  taxaPerk3Title: ["Pagamento seguro", "Secure payment", "Pago seguro"],
  taxaPerk3Desc: ["Processado pelo Stripe com criptografia ponta a ponta.", "Processed by Stripe with end-to-end encryption.", "Procesado por Stripe con cifrado de extremo a extremo."],
  taxaFinishPayment: ["Finalizar pagamento", "Finish payment", "Finalizar pago"],
  taxaClanLabel: ["Clan", "Clan", "Clan"],
  taxaProfileLabel: ["Perfil", "Profile", "Perfil"],
  taxaRedirectStripe: ["Você será redirecionado ao Stripe para concluir", "You'll be redirected to Stripe to finish", "Serás redirigido a Stripe para concluir"],
  taxaCouponLabel: ["Cupom de desconto (opcional)", "Discount coupon (optional)", "Cupón de descuento (opcional)"],
  taxaCouponPlaceholder: ["Insira seu código", "Enter your code", "Ingresa tu código"],
  taxaRedirecting: ["Redirecionando...", "Redirecting...", "Redirigiendo..."],
  taxaPayWithStripe: ["Pagar com Stripe", "Pay with Stripe", "Pagar con Stripe"],
  taxaAgreePre: ["Ao continuar, você concorda com o", "By continuing, you agree to the", "Al continuar, aceptas el"],
  taxaActivationTerm: ["Termo de ativação", "Activation Terms", "Términos de activación"],
  taxaAgreeAnd: ["e os", "and the", "y los"],
  taxaTermsOfUse: ["Termos de Uso", "Terms of Use", "Términos de Uso"],
  taxaNoProfile: ["Nenhum perfil informado. Volte e clique em 'Ativar perfil' no card desejado.", "No profile provided. Go back and click 'Activate profile' on the desired card.", "Ningún perfil indicado. Vuelve y haz clic en 'Activar perfil' en la tarjeta deseada."],
  taxaValidateError: ["Não foi possível validar seu perfil", "Couldn't validate your profile", "No se pudo validar tu perfil"],
  taxaNotYours: ["Esse perfil não pertence à sua conta.", "This profile doesn't belong to your account.", "Este perfil no pertenece a tu cuenta."],
  taxaAlreadyActive: ["Este perfil já está ativado.", "This profile is already activated.", "Este perfil ya está activado."],
  taxaLoadProfileError: ["Erro ao carregar perfil", "Error loading profile", "Error al cargar el perfil"],
  taxaNeedLogin: ["Você precisa estar logado para ativar o perfil", "You must be logged in to activate the profile", "Debes iniciar sesión para activar el perfil"],
  taxaProfileMissing: ["Perfil não informado", "Profile not provided", "Perfil no indicado"],
  taxaInvalidResponse: ["Resposta inválida do servidor ({status})", "Invalid server response ({status})", "Respuesta inválida del servidor ({status})"],
  taxaStartPaymentError: ["Erro ao iniciar pagamento", "Error starting payment", "Error al iniciar el pago"],
  taxaNoCheckoutUrl: ["Resposta do servidor sem URL de checkout", "Server response without checkout URL", "Respuesta del servidor sin URL de checkout"],
  taxaUnexpectedError: ["Erro inesperado", "Unexpected error", "Error inesperado"],
  // payment/pending
  pendingHeading: ["EM ANÁLISE.", "UNDER REVIEW.", "EN ANÁLISIS."],
  pendingDescription: ["Sua transação está sendo analisada.", "Your transaction is being reviewed.", "Tu transacción está siendo analizada."],
  statusLabel: ["Status", "Status", "Estado"],
  pendingStatus: ["Pendente", "Pending", "Pendiente"],
  startedAt: ["Iniciado em", "Started at", "Iniciado a las"],
  trackOnProfile: ["Acompanhar no perfil", "Track on profile", "Seguir en el perfil"],
  backToHomeLong: ["Voltar para home", "Back to home", "Volver al inicio"],
  pendingSupportNote: ["Ainda com dúvidas? Verifique seus emails ou entre em contato com nosso suporte.", "Still have questions? Check your emails or contact our support.", "¿Aún con dudas? Revisa tus correos o contacta a nuestro soporte."],
}

// Namespace "Order" — order/[id_order] (detalhe do pedido) + order/taxa (stub).
const ORDER = {
  statusPendingPayment: ["Aguardando pagamento", "Awaiting payment", "Esperando pago"],
  statusPaid: ["Pago", "Paid", "Pagado"],
  statusCompleted: ["Concluído", "Completed", "Completado"],
  statusCancelled: ["Cancelado", "Cancelled", "Cancelado"],
  loadError: ["Erro ao carregar pedido", "Error loading order", "Error al cargar el pedido"],
  loadErrorRetry: ["Erro ao carregar pedido. Tente novamente.", "Error loading order. Try again.", "Error al cargar el pedido. Inténtalo de nuevo."],
  loadingOrder: ["Carregando pedido...", "Loading order...", "Cargando pedido..."],
  notFound: ["Pedido não encontrado", "Order not found", "Pedido no encontrado"],
  notFoundDesc: ["Não foi possível carregar este pedido.", "Couldn't load this order.", "No se pudo cargar este pedido."],
  backToHome: ["Voltar ao início", "Back to home", "Volver al inicio"],
  eyebrow: ["Compra", "Purchase", "Compra"],
  reference: ["Referência #{ref}", "Reference #{ref}", "Referencia #{ref}"],
  orderNumber: ["Pedido #{ref}", "Order #{ref}", "Pedido #{ref}"],
  orderDetails: ["Detalhes do pedido", "Order details", "Detalles del pedido"],
  item: ["Item", "Item", "Ítem"],
  quantity: ["Quantidade", "Quantity", "Cantidad"],
  subtotal: ["Subtotal", "Subtotal", "Subtotal"],
  discount: ["Desconto", "Discount", "Descuento"],
  total: ["Total", "Total", "Total"],
  orderDate: ["Data do pedido", "Order date", "Fecha del pedido"],
  paidOn: ["Pago em", "Paid on", "Pagado el"],
  paymentTitle: ["Pagamento", "Payment", "Pago"],
  awaitingConfirmation: ["Aguardando confirmação", "Awaiting confirmation", "Esperando confirmación"],
  pendingPaymentNote: ["Este pedido está aguardando processamento de pagamento. Entre em contato com o suporte caso tenha dúvidas.", "This order is awaiting payment processing. Contact support if you have questions.", "Este pedido está esperando el procesamiento del pago. Contacta al soporte si tienes dudas."],
  // order/taxa (stub de ativação)
  taxaEyebrow: ["Ativação de perfil", "Profile activation", "Activación de perfil"],
  taxaSubtitle: ["Ative seu perfil realizando o pagamento da taxa.", "Activate your profile by paying the fee.", "Activa tu perfil realizando el pago de la tarifa."],
  back: ["Voltar", "Back", "Volver"],
  profileToActivate: ["Perfil a ser ativado", "Profile to activate", "Perfil a activar"],
  creatorProfile: ["Perfil de criador", "Creator profile", "Perfil de creador"],
  profileNotFound: ["Perfil não encontrado.", "Profile not found.", "Perfil no encontrado."],
  orderSummary: ["Resumo do pedido", "Order summary", "Resumen del pedido"],
  activationFee: ["Taxa de ativação de perfil", "Profile activation fee", "Tarifa de activación de perfil"],
  couponTitle: ["Cupom de desconto", "Discount coupon", "Cupón de descuento"],
  couponPrefix: ["Cupom", "Coupon", "Cupón"],
  couponAppliedSuffix: ["aplicado!", "applied!", "¡aplicado!"],
  couponAppliedSuccess: ["Cupom aplicado com sucesso!", "Coupon applied successfully!", "¡Cupón aplicado con éxito!"],
  couponPlaceholder: ["Digite seu cupom", "Enter your coupon", "Escribe tu cupón"],
  remove: ["Remover", "Remove", "Quitar"],
  apply: ["Aplicar", "Apply", "Aplicar"],
  processing: ["Processando...", "Processing...", "Procesando..."],
  pay: ["Pagar", "Pay", "Pagar"],
  payActivateNote: ["Ao pagar, seu perfil será ativado e ficará visível na plataforma.", "Once you pay, your profile will be activated and visible on the platform.", "Al pagar, tu perfil se activará y será visible en la plataforma."],
  paymentInDev: ["Integração de pagamento em desenvolvimento. Em breve você poderá realizar o pagamento.", "Payment integration under development. You'll be able to pay soon.", "Integración de pago en desarrollo. Pronto podrás realizar el pago."],
}

const GROUPS = { Checkout: CHECKOUT, Order: ORDER }

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
