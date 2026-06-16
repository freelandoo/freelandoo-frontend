// Namespace "Shipping" — página explicativa /protocolo-de-envios.
// Idempotente, fill-if-absent. Cada chave = [pt-BR, en, es].
//   node scripts/i18n-protocolo-envios-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const SHIPPING = {
  badge: ["Compra protegida", "Protected purchase", "Compra protegida"],
  heroTitle: ["Protocolo de Envios Freelandoo", "Freelandoo Shipping Protocol", "Protocolo de Envíos Freelandoo"],
  heroSubtitle: [
    "Compra protegida de ponta a ponta. Seu dinheiro só vai para o vendedor depois que você recebe e confere o produto.",
    "End-to-end protected purchase. Your money only goes to the seller after you receive and check the product.",
    "Compra protegida de principio a fin. Tu dinero solo va al vendedor después de que recibes y revisas el producto.",
  ],
  howTitle: ["Como funciona", "How it works", "Cómo funciona"],
  step1Title: ["Você compra", "You buy", "Tú compras"],
  step1Body: [
    "Ao pagar, abrimos uma conversa de envio nas suas mensagens. É por ali que você acompanha tudo.",
    "When you pay, we open a shipping conversation in your messages. That's where you follow everything.",
    "Al pagar, abrimos una conversación de envío en tus mensajes. Ahí sigues todo.",
  ],
  step2Title: ["O vendedor mostra a embalagem", "The seller shows the packaging", "El vendedor muestra el empaque"],
  step2Body: [
    "O vendedor grava um vídeo embalando o seu produto, com o item e o lacre à vista.",
    "The seller records a video packing your product, with the item and the seal visible.",
    "El vendedor graba un video empacando tu producto, con el artículo y el precinto a la vista.",
  ],
  step3Title: ["Postagem comprovada", "Proof of posting", "Envío comprobado"],
  step3Body: [
    "Outro vídeo na agência dos Correios, junto do comprovante de postagem com o código de rastreio.",
    "Another video at the post office, along with the posting receipt and the tracking code.",
    "Otro video en la oficina de correos, junto con el comprobante de envío y el código de seguimiento.",
  ],
  step4Title: ["Rastreio narrado", "Narrated tracking", "Seguimiento narrado"],
  step4Body: [
    "O sistema acompanha o rastreio e te avisa a cada passo: postado, em trânsito, saiu para entrega e entregue.",
    "The system follows the tracking and notifies you at each step: posted, in transit, out for delivery and delivered.",
    "El sistema sigue el rastreo y te avisa en cada paso: enviado, en tránsito, en reparto y entregado.",
  ],
  step5Title: ["Chegou? Confira em 7 dias", "Arrived? Check within 7 days", "¿Llegó? Revisa en 7 días"],
  step5Body: [
    "Quando o produto é entregue, você tem 7 dias para conferir e confirmar o recebimento ou relatar um problema.",
    "When the product is delivered, you have 7 days to check and confirm receipt or report a problem.",
    "Cuando el producto se entrega, tienes 7 días para revisar y confirmar la recepción o reportar un problema.",
  ],
  step6Title: ["Compra aprovada", "Purchase approved", "Compra aprobada"],
  step6Body: [
    "Se estiver tudo certo (ou se você não responder em 7 dias), a compra é aprovada automaticamente.",
    "If everything is fine (or if you don't respond within 7 days), the purchase is approved automatically.",
    "Si todo está bien (o si no respondes en 7 días), la compra se aprueba automáticamente.",
  ],
  moneyTitle: ["Seu dinheiro fica protegido", "Your money stays protected", "Tu dinero queda protegido"],
  moneyBody: [
    "O valor da compra fica retido com a Freelandoo por 30 dias. O vendedor só recebe depois desse período e desde que não haja problema em aberto. É o que garante a sua proteção contra golpes.",
    "The purchase amount is held by Freelandoo for 30 days. The seller only gets paid after that period and as long as there's no open issue. That's what protects you from scams.",
    "El importe de la compra queda retenido por Freelandoo durante 30 días. El vendedor solo cobra después de ese plazo y siempre que no haya un problema abierto. Eso es lo que te protege de estafas.",
  ],
  returnTitle: [
    "Devoluções: quem paga o frete de volta",
    "Returns: who pays for return shipping",
    "Devoluciones: quién paga el envío de vuelta",
  ],
  returnIntro: [
    "O vendedor paga o frete de devolução sempre que o problema for culpa dele ou um direito seu por lei. Você só paga o frete de volta quando devolve por vontade própria fora desses casos.",
    "The seller pays for return shipping whenever the problem is their fault or a legal right of yours. You only pay for return shipping when you return by your own choice outside those cases.",
    "El vendedor paga el envío de devolución siempre que el problema sea su culpa o un derecho tuyo por ley. Tú solo pagas el envío de vuelta cuando devuelves por voluntad propia fuera de esos casos.",
  ],
  colReason: ["Situação", "Situation", "Situación"],
  colPayer: ["Quem paga a volta", "Who pays the return", "Quién paga la vuelta"],
  colRefund: ["Reembolso", "Refund", "Reembolso"],
  returnDefect: ["Produto com defeito ou quebrado", "Defective or broken product", "Producto defectuoso o roto"],
  returnWrong: [
    "Veio errado ou diferente do anúncio",
    "Wrong item or different from the listing",
    "Vino equivocado o distinto al anuncio",
  ],
  returnNotArrived: [
    "Não chegou (rastreio comprova)",
    "Didn't arrive (tracking proves it)",
    "No llegó (el rastreo lo comprueba)",
  ],
  returnRegret: [
    "Arrependimento em até 7 dias (direito por lei)",
    "Change of mind within 7 days (legal right)",
    "Arrepentimiento en hasta 7 días (derecho por ley)",
  ],
  returnVoluntary: [
    "Devolução por vontade própria após 7 dias",
    "Voluntary return after 7 days",
    "Devolución por voluntad propia después de 7 días",
  ],
  payerSeller: ["Vendedor", "Seller", "Vendedor"],
  payerBuyer: ["Comprador", "Buyer", "Comprador"],
  refundFull: ["Reembolso total", "Full refund", "Reembolso total"],
  refundMinusReturn: [
    "Produto, menos o frete da volta",
    "Product, minus the return shipping",
    "Producto, menos el envío de vuelta",
  ],
  scamTitle: ["Cuidado com golpes", "Watch out for scams", "Cuidado con las estafas"],
  scamBody: [
    "Nunca pague por fora da Freelandoo. Quem pede Pix ou pagamento direto “para sair mais barato” está tirando você da proteção — é o sinal nº 1 de golpe. Dentro do protocolo, seu dinheiro está garantido.",
    "Never pay outside Freelandoo. Anyone asking for a direct transfer “to make it cheaper” is taking you out of protection — it's the #1 scam sign. Inside the protocol, your money is guaranteed.",
    "Nunca pagues fuera de Freelandoo. Quien pide transferencia directa “para que salga más barato” te está sacando de la protección — es la señal nº 1 de estafa. Dentro del protocolo, tu dinero está garantizado.",
  ],
  ctaText: ["Pronto para comprar com segurança?", "Ready to buy safely?", "¿Listo para comprar con seguridad?"],
  ctaButton: ["Explorar a Loja", "Explore the Store", "Explorar la Tienda"],
}

const GROUPS = { Shipping: SHIPPING }

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
