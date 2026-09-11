// scripts/i18n-service-quote-merge.js
// Serviço por orçamento (mig 239) — o preço deixou de ser obrigatório.
//
// Três superfícies e três vocabulários diferentes, de propósito:
//   Account        o cadastro (a caixa que o profissional marca)
//   Profile        o card do perfil (só o selo — ali não há botão de orçamento)
//   Agenda         a lista de serviços do dono (troca o "R$ 0,00" pelo selo)
//   CommunitySite  a vitrine do site (selo + botão que abre o WhatsApp)
//
// Tudo MERGE (fill-if-absent): são chaves novas, nada muda de significado.
// Idempotente: rodar de novo não acrescenta nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] — só entram se a chave AINDA NÃO existir. */
const MERGE = {
  Account: {
    priceOnRequest: ["Serviço por orçamento", "Quote-based service", "Servicio por presupuesto"],
    priceOnRequestShort: ["Sob orçamento", "On request", "A presupuestar"],
    priceOnRequestHint: [
      "Sem preço: o cliente vê “Pedir orçamento” e fala com você pelo WhatsApp. Não entra no agendamento com pagamento online.",
      "No price: the client sees “Request a quote” and reaches you on WhatsApp. It stays out of online paid booking.",
      "Sin precio: el cliente ve “Pedir presupuesto” y te habla por WhatsApp. No entra en la reserva con pago en línea.",
    ],
  },
  Profile: {
    priceOnRequest: ["Sob orçamento", "On request", "A presupuestar"],
  },
  // O painel de Serviços da agenda — a lista do próprio dono. Sem isto ele
  // veria "R$ 0,00" no serviço que ele mesmo marcou como sob orçamento.
  Agenda: {
    priceOnRequest: ["Sob orçamento", "On request", "A presupuestar"],
  },
  CommunitySite: {
    serviceQuoteBadge: ["Sob orçamento", "On request", "A presupuestar"],
    serviceQuoteCta: ["Pedir orçamento", "Request a quote", "Pedir presupuesto"],
    // `{service}` é trocado pelo nome do serviço no clique — o provider do
    // i18n não interpola, então a troca é feita em JS.
    serviceQuoteMessage: [
      "Olá! Vim pelo site e queria um orçamento para: {service}",
      "Hi! I came from your website and I'd like a quote for: {service}",
      "¡Hola! Vengo del sitio y quisiera un presupuesto para: {service}",
    ],
  },
}

let added = 0

LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))

  for (const [ns, keys] of Object.entries(MERGE)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i]
        added++
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`, "utf8")
})

console.log(`i18n-service-quote-merge: ${added} chaves adicionadas`)
