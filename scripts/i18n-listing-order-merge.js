/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da VENDA NA VITRINE DO VIZINHO (mig 249).
//
// São três telas novas de texto: o modal de compra (dentro da vitrine), a
// página "meus pedidos" (onde a venda TERMINA — quem vendeu marca "entreguei",
// quem comprou confirma ou contesta) e a porta que leva até ela.
//
// ⚠️ OS 7 `ordStatus_*` SÃO OBRIGATÓRIOS e chegam por INDIREÇÃO
// (`t(\`ordStatus_${o.status}\`, o.status)`), então um grep de `t("chave",
// "fallback")` NÃO os encontra. O fallback deles é o valor CRU do banco: sem
// estas linhas, a tela mostra "disputed" e "refunded" em inglês de banco de
// dados para o vizinho, nos TRÊS idiomas, sem erro nenhum aparecer.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no
// dicionário. (Não há OVERRIDE aqui: todas as chaves são novas.)
//
// Uso: node scripts/i18n-listing-order-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  // ─── O modal de compra, dentro da vitrine ────────────────────────────────
  buyTitle: ["Comprar do vizinho", "Buy from your neighbor", "Comprar del vecino"],
  buyTotal: ["Total", "Total", "Total"],
  buyCta: ["Pagar {v}", "Pay {v}", "Pagar {v}"],
  buyError: [
    "Não foi possível iniciar o pagamento.",
    "We couldn't start the payment.",
    "No fue posible iniciar el pago.",
  ],
  // A promessa que faz a pessoa clicar: o dinheiro não vai embora na hora.
  buyHoldbackNote: [
    "O pagamento fica retido até você confirmar que recebeu. Se algo der errado, dá para contestar.",
    "Your payment is held until you confirm you received it. If something goes wrong, you can dispute it.",
    "El pago queda retenido hasta que confirmes que lo recibiste. Si algo sale mal, puedes reclamar.",
  ],

  // ─── O add-on de entrega (o "+R$3" do pedido do Alex) ────────────────────
  buyDeliveryTitle: [
    "Precisa que alguém traga?",
    "Need someone to bring it?",
    "¿Necesitas que alguien lo traiga?",
  ],
  buyDeliveryHint: [
    "A gente soma ao seu pagamento e abre um chamado aqui na comunidade. Qualquer vizinho pode pegar e receber por isso.",
    "We add it to your payment and open a request in the community. Any neighbor can take it and get paid for it.",
    "Lo sumamos a tu pago y abrimos una solicitud en la comunidad. Cualquier vecino puede tomarla y cobrar por ello.",
  ],
  buyNoDelivery: ["Eu busco", "I'll pick it up", "Yo lo busco"],

  // ─── A porta para "meus pedidos" ─────────────────────────────────────────
  myOrdersCta: [
    "Minhas compras e vendas",
    "My purchases and sales",
    "Mis compras y ventas",
  ],

  // ─── A página: cabeçalho e abas ──────────────────────────────────────────
  ordEyebrow: ["Vitrine do vizinho", "Neighbor marketplace", "Vitrina del vecino"],
  ordTitle: ["Meus pedidos", "My orders", "Mis pedidos"],
  ordTabBought: ["Comprei", "Bought", "Compré"],
  ordTabSold: ["Vendi", "Sold", "Vendí"],
  ordEmptyBought: [
    "Você ainda não comprou nada por aqui.",
    "You haven't bought anything here yet.",
    "Todavía no compraste nada por aquí.",
  ],
  ordEmptySold: [
    "Você ainda não vendeu nada por aqui.",
    "You haven't sold anything here yet.",
    "Todavía no vendiste nada por aquí.",
  ],
  ordLoadError: [
    "Não deu para carregar os pedidos.",
    "We couldn't load your orders.",
    "No se pudieron cargar los pedidos.",
  ],
  ordActionError: ["Não deu certo.", "That didn't work.", "No funcionó."],

  // ─── Os gestos que fecham a venda ────────────────────────────────────────
  ordPayCta: ["Pagar {v}", "Pay {v}", "Pagar {v}"],
  ordDeliveredCta: ["Entreguei", "I delivered it", "Lo entregué"],
  ordConfirmCta: ["Recebi", "I got it", "Lo recibí"],
  ordConfirmDue: [
    "Se você não confirmar até {v}, a gente considera entregue.",
    "If you don't confirm by {v}, we'll consider it delivered.",
    "Si no confirmas hasta {v}, lo consideramos entregado.",
  ],
  ordWithDelivery: ["· com entrega ({v})", "· with delivery ({v})", "· con entrega ({v})"],

  // ─── O dinheiro de quem vendeu: a retenção DITA EM VOZ ALTA ──────────────
  // Retenção silenciosa parece defeito, e esta é a tela em que o vendedor vem
  // procurar o dinheiro.
  ordHeldTitle: ["Retido", "Held", "Retenido"],
  ordHeldHint: [
    "Fica retido por alguns dias depois da entrega — é o prazo em que quem comprou ainda pode contestar.",
    "It's held for a few days after delivery — that's the window in which the buyer can still dispute.",
    "Queda retenido unos días después de la entrega: es el plazo en que quien compró aún puede reclamar.",
  ],
  ordAvailableTitle: ["Liberado", "Released", "Liberado"],
  ordAvailableAt: ["Disponível em {v}", "Available on {v}", "Disponible el {v}"],
  ordYouGet: ["Você recebe {v}", "You get {v}", "Recibes {v}"],

  // ─── A contestação ───────────────────────────────────────────────────────
  ordDisputeCta: ["Tive um problema", "Something went wrong", "Tuve un problema"],
  ordDisputeTitle: ["O que aconteceu?", "What happened?", "¿Qué pasó?"],
  ordDisputeDetail: [
    "Conte o que houve (opcional)",
    "Tell us what happened (optional)",
    "Cuéntanos qué pasó (opcional)",
  ],
  ordDisputeSend: ["Abrir contestação", "Open a dispute", "Abrir reclamación"],
  ordDisputeNote: [
    "O pagamento fica congelado enquanto a Freelandoo analisa.",
    "The payment is frozen while Freelandoo reviews it.",
    "El pago queda congelado mientras Freelandoo lo analiza.",
  ],
  ordDisputeOpen: [
    "Em análise. A gente avisa quando decidir.",
    "Under review. We'll let you know once it's decided.",
    "En análisis. Te avisamos cuando se decida.",
  ],
  ordReasonNotReceived: ["Não chegou", "It never arrived", "No llegó"],
  ordReasonNotAsDescribed: [
    "Não era isso",
    "Not what was described",
    "No era lo descrito",
  ],
  ordReasonOther: ["Outro", "Other", "Otro"],

  // ─── ⚠️ OS ESTADOS DO PEDIDO — chegam por INDIREÇÃO (ver cabeçalho) ──────
  ordStatus_pending: ["Aguardando pagamento", "Awaiting payment", "Esperando pago"],
  ordStatus_paid: ["Pago", "Paid", "Pagado"],
  ordStatus_delivered: ["Entregue", "Delivered", "Entregado"],
  ordStatus_completed: ["Concluído", "Completed", "Concluido"],
  ordStatus_disputed: ["Em contestação", "Disputed", "En reclamación"],
  ordStatus_canceled: ["Cancelado", "Canceled", "Cancelado"],
  ordStatus_refunded: ["Estornado", "Refunded", "Reembolsado"],
};

const NAMESPACES = { Community: COMMUNITY };

let added = 0;

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

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
