// Alterações de monetização de 2026-09-27 (bolsa no cartão, vitrine em grade,
// aba Produtos do negócio, delivery por peso). Idempotente, fill-if-absent.
//   node scripts/i18n-monetization-0927-merge.js
const fs = require("fs")
const path = require("path")
const dir = path.join(__dirname, "..", "messages")

const NS = {
  Notifications: {
    deliveryOpened: ["{who} abriu um delivery na sua comunidade", "{who} opened a delivery in your community", "{who} abrió un delivery en tu comunidad"],
    deliveryAccepted: [
      "{who} aceitou o seu delivery — pague para a corrida começar",
      "{who} accepted your delivery — pay for the run to start",
      "{who} aceptó tu delivery — paga para que empiece el viaje",
    ],
    deliveryDelivered: [
      "{who} marcou o seu delivery como entregue — confirme o recebimento",
      "{who} marked your delivery as delivered — confirm you received it",
      "{who} marcó tu delivery como entregado — confirma la recepción",
    ],
    deliveryConfirmed: [
      "Entrega confirmada — o valor foi para a sua carteira",
      "Delivery confirmed — the amount went to your wallet",
      "Entrega confirmada — el valor fue a tu billetera",
    ],
    deliveryCanceled: [
      "Quem ia levar o seu delivery desistiu — o chamado voltou a ficar aberto",
      "Your courier gave up — the request is open again",
      "Quien iba a llevar tu delivery desistió — la solicitud volvió a estar abierta",
    ],
    deliveryProposal: ["{who} fez uma proposta no seu delivery", "{who} made a proposal on your delivery", "{who} hizo una propuesta en tu delivery"],
  },
  Community: {
    listSlotFree: ["Espaço livre", "Free spot", "Espacio libre"],
    listSlotRent: ["Alugue por 1 mês", "Rent it for 1 month", "Alquílalo por 1 mes"],
    shopEmpty: [
      "Este negócio ainda não tem produtos à venda.",
      "This business has no products for sale yet.",
      "Este negocio aún no tiene productos a la venta.",
    ],
    // ── delivery por peso (mig 266) ──
    delDirSend: ["Quero enviar", "I want to send", "Quiero enviar"],
    delDirReceive: ["Quero receber", "I want to receive", "Quiero recibir"],
    delDirSendShort: ["Enviar", "Send", "Enviar"],
    delDirReceiveShort: ["Receber", "Receive", "Recibir"],
    delCourierTake: ["Levar", "Take it", "Llevarlo"],
    delCourierFetch: ["Buscar", "Pick it up", "Buscarlo"],
    delWeightTitle: ["Quanto pesa?", "How heavy is it?", "¿Cuánto pesa?"],
    delBand_w1: ["Até 1 kg", "Up to 1 kg", "Hasta 1 kg"],
    delBand_w3: ["De 1 a 3 kg", "1 to 3 kg", "De 1 a 3 kg"],
    delBand_w6: ["De 3 a 6 kg", "3 to 6 kg", "De 3 a 6 kg"],
    delBand_w10: ["De 6 a 10 kg", "6 to 10 kg", "De 6 a 10 kg"],
    delBand_w10p: ["Mais de 10 kg", "Over 10 kg", "Más de 10 kg"],
    delBandFrom: ["Mínimo {v}", "Minimum {v}", "Mínimo {v}"],
    delBandNegotiable: ["A partir de {v} · negociável", "From {v} · negotiable", "Desde {v} · negociable"],
    delOfferLabel: ["Quanto você oferece (R$)", "How much you offer (R$)", "Cuánto ofreces (R$)"],
    delOfferHint: [
      "Mínimo de {v} para esse peso. Se ninguém aceitar, você pode oferecer mais depois.",
      "Minimum of {v} for this weight. If nobody accepts, you can offer more later.",
      "Mínimo de {v} para este peso. Si nadie acepta, puedes ofrecer más después.",
    ],
    delOfferHintNegotiable: [
      "Acima de 10 kg os vizinhos podem aceitar sua oferta ou propor outro valor. Você escolhe.",
      "Over 10 kg, neighbors can accept your offer or propose another amount. You choose.",
      "Más de 10 kg, los vecinos pueden aceptar tu oferta o proponer otro valor. Tú eliges.",
    ],
    delOfferTooLow: [
      "A oferta precisa ser de pelo menos {v}.",
      "The offer must be at least {v}.",
      "La oferta debe ser de al menos {v}.",
    ],
    delOfferRaised: [
      "Oferta aumentada. Os vizinhos foram avisados de novo.",
      "Offer raised. Neighbors were notified again.",
      "Oferta aumentada. Los vecinos fueron avisados de nuevo.",
    ],
    delProposalSent: [
      "Proposta enviada. Quem pediu vai escolher.",
      "Proposal sent. The requester will choose.",
      "Propuesta enviada. Quien pidió va a elegir.",
    ],
    delAcceptTake: ["Eu levo", "I'll take it", "Yo lo llevo"],
    delAcceptFetch: ["Eu busco", "I'll pick it up", "Yo lo busco"],
    delRaiseCta: ["Oferecer mais", "Offer more", "Ofrecer más"],
    delRaiseSend: ["Aumentar", "Raise", "Aumentar"],
    delProposeCta: ["Propor outro valor", "Propose another amount", "Proponer otro valor"],
    delProposeSend: ["Enviar proposta", "Send proposal", "Enviar propuesta"],
    delMyProposal: ["Sua proposta: {v}", "Your proposal: {v}", "Tu propuesta: {v}"],
    delWithdrawProposal: ["Retirar", "Withdraw", "Retirar"],
    delProposalsTitle: ["Propostas dos vizinhos", "Neighbors' proposals", "Propuestas de los vecinos"],
    delProposalAccept: ["Aceitar", "Accept", "Aceptar"],
    delProposalAccepted: [
      "Proposta aceita. Pague para a corrida começar.",
      "Proposal accepted. Pay for the run to start.",
      "Propuesta aceptada. Paga para que empiece el viaje.",
    ],
    delSomeone: ["Um vizinho", "A neighbor", "Un vecino"],
    delModalSend: ["{name} quer enviar uma encomenda", "{name} wants to send a package", "{name} quiere enviar un paquete"],
    delModalReceive: ["{name} quer receber uma encomenda", "{name} wants to receive a package", "{name} quiere recibir un paquete"],
    delModalCanTake: ["Você pode levar?", "Can you take it?", "¿Puedes llevarlo?"],
    delModalCanFetch: ["Você pode buscar?", "Can you pick it up?", "¿Puedes buscarlo?"],
    delModalEyebrow: ["Delivery · {c}", "Delivery · {c}", "Delivery · {c}"],
    delModalRaised: ["Oferta maior · {c}", "Higher offer · {c}", "Oferta mayor · {c}"],
    delModalOffer: ["Oferta", "Offer", "Oferta"],
    delModalSeeBoard: ["Ver no quadro", "See on the board", "Ver en el tablero"],
    delModalLater: ["Agora não", "Not now", "Ahora no"],
  },
  Vaquinha: {
    sponsorCardNote: [
      "Pagamento recorrente no cartão de crédito: o valor é cobrado automaticamente todo mês, até você cancelar.",
      "Recurring credit card payment: the amount is charged automatically every month until you cancel.",
      "Pago recurrente con tarjeta de crédito: el monto se cobra automáticamente cada mes hasta que canceles.",
    ],
    sponsorPayCard: ["Assinar no cartão", "Subscribe with card", "Suscribirse con tarjeta"],
    sponsorCardChip: ["Cartão", "Card", "Tarjeta"],
  },
}

function load(f) { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) }
function save(f, o) { fs.writeFileSync(path.join(dir, f), JSON.stringify(o, null, 2) + "\n", "utf8") }
for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, keys] of Object.entries(NS)) {
    if (!d[ns]) d[ns] = {}
    for (const [k, vals] of Object.entries(keys)) if (!(k in d[ns])) { d[ns][k] = vals[idx]; added++ }
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
