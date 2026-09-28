/* eslint-disable @typescript-eslint/no-require-imports */
// Mig 264 — perfil/pet/carro adicional por R$ 9,99 vitalício e a Loja só com
// RETIRADA combinada com o vendedor.
//
// Duas tabelas:
//  • ADD  — chaves novas, fill-if-absent (padrão da casa);
//  • OVERRIDE — chaves que JÁ existem anunciando o preço antigo (R$ 300 /
//    "perfil profissional ativado"). Dicionário vence fallback inline, então
//    trocar só o componente não mudaria nada na tela.
//
// Uso: node scripts/i18n-extra-space-pickup-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** ns → chave → [pt, en, es] */
const ADD = {
  Community: {
    extraPetEyebrow: ["Pet adicional", "Extra pet", "Mascota adicional"],
    extraCarEyebrow: ["Carro adicional", "Extra car", "Coche adicional"],
    extraSpaceOnce: ["Pagamento único, vitalício", "One-time payment, for life", "Pago único, de por vida"],
    extraPetBody: [
      "Seu primeiro pet é grátis. Para cadastrar mais um, é {price} uma vez só — o pet novo já nasce assim que o pagamento cair.",
      "Your first pet is free. To add another one it's {price}, just once — the new pet is created as soon as the payment clears.",
      "Tu primera mascota es gratis. Para añadir otra son {price}, una sola vez: la nueva mascota se crea en cuanto se confirme el pago.",
    ],
    extraCarBody: [
      "Seu primeiro carro é grátis. Para cadastrar mais um, é {price} uma vez só — o carro novo já nasce assim que o pagamento cair.",
      "Your first car is free. To add another one it's {price}, just once — the new car is created as soon as the payment clears.",
      "Tu primer coche es gratis. Para añadir otro son {price}, una sola vez: el nuevo coche se crea en cuanto se confirme el pago.",
    ],
    extraSpacePay: ["Pagar {price}", "Pay {price}", "Pagar {price}"],
    extraSpaceNotNow: ["Agora não", "Not now", "Ahora no"],
    extraSpacePayError: [
      "Não foi possível abrir o pagamento agora.",
      "Could not open the payment right now.",
      "No se pudo abrir el pago ahora.",
    ],
    extraSpaceWaitingTitle: ["Confirmando o pagamento", "Confirming the payment", "Confirmando el pago"],
    extraSpaceWaiting: [
      "Assim que o pagamento cair, abrimos a página nova para você editar.",
      "As soon as the payment clears, we'll open the new page for you to edit.",
      "En cuanto se confirme el pago, abrimos la nueva página para que la edites.",
    ],
    extraSpaceSlow: [
      "Está demorando mais que o normal. Se você pagou por Pix, pode levar alguns minutos — assim que cair, o espaço aparece no menu da sua foto de perfil.",
      "This is taking longer than usual. If you paid by Pix it may take a few minutes — once it clears, the space shows up in your profile photo menu.",
      "Está tardando más de lo normal. Si pagaste por Pix puede tardar unos minutos: en cuanto se confirme, el espacio aparece en el menú de tu foto de perfil.",
    ],
    extraSpaceExpiredTitle: ["Pagamento não concluído", "Payment not completed", "Pago no completado"],
    extraSpaceExpired: [
      "Nada foi cobrado. Você pode tentar de novo pelo \"+\" da foto.",
      "Nothing was charged. You can try again from the photo's \"+\".",
      "No se cobró nada. Puedes intentarlo de nuevo desde el \"+\" de la foto.",
    ],
    extraSpaceErrorTitle: ["Não encontramos este pagamento", "We couldn't find this payment", "No encontramos este pago"],
    extraSpaceError: [
      "Se você pagou, o espaço aparece no menu da sua foto de perfil assim que o pagamento cair.",
      "If you paid, the space shows up in your profile photo menu as soon as the payment clears.",
      "Si pagaste, el espacio aparece en el menú de tu foto de perfil en cuanto se confirme el pago.",
    ],
  },
  Product: {
    pickupNotice: [
      "Retirada com o vendedor. Depois do pagamento abrimos uma conversa entre vocês para combinar onde e quando retirar.",
      "Pickup with the seller. After payment we open a conversation between you to agree on where and when to pick it up.",
      "Retiro con el vendedor. Tras el pago abrimos una conversación entre ustedes para acordar dónde y cuándo retirarlo.",
    ],
    pickupLineLabel: ["Retirada", "Pickup", "Retiro"],
    pickupFree: ["sem frete", "no shipping", "sin envío"],
    pickupContactTitle: [
      "Seus dados (opcional — usamos os da sua conta)",
      "Your details (optional — we use your account's)",
      "Tus datos (opcional: usamos los de tu cuenta)",
    ],
    pickupOnlyDesc: [
      "Sem frete: você paga pela Freelandoo e, assim que o pagamento cair, abrimos uma conversa com o vendedor para combinar onde e quando retirar.",
      "No shipping: you pay through Freelandoo and, once the payment clears, we open a conversation with the seller to agree on where and when to pick it up.",
      "Sin envío: pagas por Freelandoo y, en cuanto se confirme el pago, abrimos una conversación con el vendedor para acordar dónde y cuándo retirarlo.",
    ],
    localPickupTitle: [
      "Retirada combinada com o vendedor",
      "Pickup arranged with the seller",
      "Retiro acordado con el vendedor",
    ],
    talkToSeller: ["Falar com vendedor", "Talk to seller", "Hablar con el vendedor"],
  },
  Payments: {
    pickupMark: ["Marcar como retirado", "Mark as picked up", "Marcar como retirado"],
    pickupDone: ["Retirado", "Picked up", "Retirado"],
    pickupChat: ["Combinar retirada", "Arrange pickup", "Acordar retiro"],
    pickupMarkError: [
      "Não foi possível marcar a retirada agora.",
      "Could not mark the pickup right now.",
      "No se pudo marcar el retiro ahora.",
    ],
  },
  Account: {
    pickupWithSeller: ["Retirada com o vendedor", "Pickup with the seller", "Retiro con el vendedor"],
    pickupCombine: ["Combinar na conversa", "Arrange it in the chat", "Acordarlo en la conversación"],
    pickupOnlyInfo: [
      "Toda venda na Loja é retirada com você, sem frete. O comprador paga pela Freelandoo e, assim que o pagamento cai, abrimos uma conversa entre vocês para combinar onde e quando retirar.",
      "Every Store sale is picked up from you, with no shipping. The buyer pays through Freelandoo and, once the payment clears, we open a conversation between you to agree on where and when.",
      "Toda venta en la Tienda se retira contigo, sin envío. El comprador paga por Freelandoo y, en cuanto se confirma el pago, abrimos una conversación entre ustedes para acordar dónde y cuándo.",
    ],
  },
}

const OVERRIDE = {
  Pricing: {
    "plan.name": ["Perfil adicional", "Extra profile", "Perfil adicional"],
    "plan.description": [
      "Seu primeiro perfil é grátis. Cada perfil a mais — inclusive pet e carro — custa R$ 9,99, uma vez só.",
      "Your first profile is free. Each extra profile — pets and cars included — costs R$ 9.99, just once.",
      "Tu primer perfil es gratis. Cada perfil extra — incluidas mascotas y coches — cuesta R$ 9,99, una sola vez.",
    ],
  },
  AdvertiseServices: {
    "activation.description": [
      "Seu primeiro perfil é grátis. Cada perfil adicional — inclusive pet e carro — custa R$ 9,99 em pagamento único e participa da vitrine pública, de acordo com as regras e categorias disponíveis.",
      "Your first profile is free. Each extra profile — pets and cars included — costs R$ 9.99 as a one-time payment and appears in the public showcase, according to the available rules and categories.",
      "Tu primer perfil es gratis. Cada perfil adicional — incluidas mascotas y coches — cuesta R$ 9,99 en un pago único y aparece en la vitrina pública, según las reglas y categorías disponibles.",
    ],
  },
}

let added = 0
let overridden = 0
for (const [li, locale] of LOCALES.entries()) {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, keys] of Object.entries(ADD)) {
    dict[ns] = dict[ns] || {}
    for (const [k, vals] of Object.entries(keys)) {
      if (dict[ns][k] === undefined) {
        dict[ns][k] = vals[li]
        added++
      }
    }
  }
  for (const [ns, keys] of Object.entries(OVERRIDE)) {
    dict[ns] = dict[ns] || {}
    for (const [k, vals] of Object.entries(keys)) {
      if (dict[ns][k] !== vals[li]) {
        dict[ns][k] = vals[li]
        overridden++
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
console.log(`i18n extra-space/pickup: +${added} chaves, ${overridden} sobrescritas`)
