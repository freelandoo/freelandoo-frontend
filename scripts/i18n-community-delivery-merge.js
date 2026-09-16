/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — DELIVERY ENTRE VIZINHOS (mig 248, 2026-09-16).
//
// Pedido do Alex: "qualquer pessoa da comunidade pode chamar um delivery mesmo
// sem ter comprado — por exemplo, buscar na portaria algo que chegou de iFood"
// e "qualquer um da comunidade pode pegar o chamado e receber".
//
// Namespace `Community` (é uma tela da comunidade, como o ranking e a vitrine),
// prefixo `del*`. Fill-if-absent: nunca sobrescreve o que já existe.
//
// ⚠️ NENHUM VALOR EM REAIS ENTRA AQUI. Os textos têm `{v}` e o número vem
// formatado pelo locale, do backend — cravar "R$ 3,00" numa string de tradução
// criaria um preço que a tela de admin não governa, e foi exatamente isso que a
// mig 244 teve de desfazer no agendamento.
//
// Uso: node scripts/i18n-community-delivery-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW_COMMUNITY = {
  // ── o pill ───────────────────────────────────────────────────────────────
  delPill: ["Delivery", "Delivery", "Delivery"],
  delPillAria: [
    "Abrir o delivery entre vizinhos: chamados de entrega da comunidade",
    "Open neighbour delivery: the community's delivery calls",
    "Abrir el delivery entre vecinos: pedidos de entrega de la comunidad",
  ],

  // ── a página ─────────────────────────────────────────────────────────────
  delEyebrow: ["Entre vizinhos", "Between neighbours", "Entre vecinos"],
  delTitle: ["Delivery", "Delivery", "Delivery"],
  delIntro: [
    "Peça para alguém buscar na portaria ou levar de um apartamento ao outro. Qualquer vizinho pode pegar o chamado e receber por isso.",
    "Ask someone to pick it up at the front desk or carry it from one flat to another. Any neighbour can take the call and get paid for it.",
    "Pide que alguien lo busque en la portería o lo lleve de un departamento a otro. Cualquier vecino puede tomar el pedido y cobrar por eso.",
  ],
  delLoadError: [
    "Não deu para carregar os chamados.",
    "Couldn't load the delivery calls.",
    "No se pudieron cargar los pedidos.",
  ],
  delOpenError: [
    "Não deu para abrir o chamado.",
    "Couldn't open the call.",
    "No se pudo abrir el pedido.",
  ],
  delActionError: ["Não deu certo.", "That didn't work.", "No funcionó."],

  // ── "me chame" (é disponibilidade, não papel) ────────────────────────────
  delAvailableTitle: ["Me chame", "Ping me", "Avísame"],
  delAvailableHint: [
    "Ligado, você recebe um aviso quando alguém abrir um chamado aqui. Aceitar já é seu direito de morador — isto é só o aviso.",
    "When on, you get a heads-up whenever someone opens a call here. Taking a call is already your right as a resident — this is just the heads-up.",
    "Activado, recibes un aviso cuando alguien abre un pedido aquí. Aceptar ya es tu derecho como residente — esto es solo el aviso.",
  ],
  delAvailableOn: ["Disponível agora", "Available now", "Disponible ahora"],
  delAvailableOff: ["Ficar disponível", "Become available", "Quedar disponible"],

  // ── abrir ────────────────────────────────────────────────────────────────
  delNewTitle: ["Chamar alguém", "Call someone", "Llamar a alguien"],
  delOpenCta: ["Abrir chamado", "Open call", "Abrir pedido"],
  delPickupPlaceholder: [
    "Buscar onde? (portaria, apto 32…)",
    "Pick up where? (front desk, flat 32…)",
    "¿Buscar dónde? (portería, depto 32…)",
  ],
  delDropoffPlaceholder: ["Levar aonde?", "Deliver where?", "¿Llevar adónde?"],
  delNotePlaceholder: ["Detalhes (opcional)", "Details (optional)", "Detalles (opcional)"],
  // ⚠️ A promessa central do desenho: cobra-se no ACEITE, e quem abre precisa
  // saber disso ANTES de abrir.
  delChargeWhen: [
    "Você só é cobrado quando alguém aceitar. Se ninguém pegar, o chamado expira e não custa nada.",
    "You're only charged once someone takes it. If nobody does, the call expires at no cost.",
    "Solo te cobramos cuando alguien acepte. Si nadie lo toma, el pedido vence sin costo.",
  ],

  // ── as filas ─────────────────────────────────────────────────────────────
  delTabOpen: ["Abertos", "Open", "Abiertos"],
  delTabMine: ["Meus", "Mine", "Míos"],
  delEmptyOpen: [
    "Nenhum chamado aberto agora.",
    "No open calls right now.",
    "Ningún pedido abierto ahora.",
  ],
  delEmptyMine: [
    "Você ainda não pediu nem entregou nada por aqui.",
    "You haven't asked for or delivered anything here yet.",
    "Todavía no pediste ni entregaste nada por aquí.",
  ],

  // ── dinheiro (o LÍQUIDO primeiro) ────────────────────────────────────────
  delYouPay: ["Você paga {v}", "You pay {v}", "Pagas {v}"],
  delYouGet: ["Você recebe {v}", "You get {v}", "Recibes {v}"],
  delNeighborPays: [
    "· o vizinho paga {v}",
    "· the neighbour pays {v}",
    "· el vecino paga {v}",
  ],
  delPayCta: ["Pagar {v}", "Pay {v}", "Pagar {v}"],
  delWaitingPayment: [
    "Esperando o vizinho pagar. O repasse só sai depois que o pagamento cair.",
    "Waiting on the neighbour's payment. The payout only goes out once it clears.",
    "Esperando que el vecino pague. El pago solo sale cuando se acredite.",
  ],

  // ── ações ────────────────────────────────────────────────────────────────
  delAcceptCta: ["Eu busco", "I'll get it", "Yo lo busco"],
  delAccepted: ["Corrida aceita.", "Call taken.", "Pedido aceptado."],
  delDeliveredCta: ["Entreguei", "Delivered", "Entregué"],
  delDelivered: ["Entrega marcada.", "Delivery marked.", "Entrega marcada."],
  delConfirmCta: ["Recebi", "Got it", "Lo recibí"],
  delConfirmed: ["Entrega confirmada.", "Delivery confirmed.", "Entrega confirmada."],
  delReleaseCta: ["Não vou conseguir", "I can't make it", "No voy a poder"],
  delReleased: ["Corrida devolvida.", "Call handed back.", "Pedido devuelto."],
  delCancelCta: ["Cancelar", "Cancel", "Cancelar"],
  delCanceled: ["Chamado cancelado.", "Call canceled.", "Pedido cancelado."],

  // ── prazos e freios ──────────────────────────────────────────────────────
  delExpiresAt: ["Vale até {v}", "Good until {v}", "Vale hasta {v}"],
  delConfirmDue: [
    "Se você não confirmar até {v}, a gente libera o pagamento sozinho.",
    "If you don't confirm by {v}, we release the payment on our own.",
    "Si no confirmas antes de {v}, liberamos el pago por nuestra cuenta.",
  ],
  // O freio precisa ser DITO: bloqueio silencioso parece defeito.
  delBlocked: [
    "Você cancelou corridas demais nos últimos dias. Espere um pouco para aceitar outra.",
    "You've canceled too many calls in the past few days. Wait a bit before taking another.",
    "Cancelaste demasiados pedidos en los últimos días. Espera un poco para aceptar otro.",
  ],

  // ── estados (a chave é montada como `delStatus_<status>`) ────────────────
  delStatus_open: ["Aberto", "Open", "Abierto"],
  delStatus_accepted: ["Aceito", "Taken", "Aceptado"],
  delStatus_delivered: ["Entregue", "Delivered", "Entregado"],
  delStatus_completed: ["Concluído", "Completed", "Completado"],
  delStatus_canceled: ["Cancelado", "Canceled", "Cancelado"],
  delStatus_expired: ["Expirado", "Expired", "Vencido"],
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
