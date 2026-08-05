// i18n da Loja de Funções (/funcoes e /funcoes/[key]) + integração no menu.
// Namespace novo "FunctionStore". Idempotente e não-destrutivo (fill-if-absent).
// Conteúdo dos produtos (textos/preços) vem do catálogo do admin e NÃO traduz.
// Rodar com: node scripts/i18n-function-store-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FUNCTION_STORE = {
  storeName: ["Loja de Funções", "Function Store", "Tienda de Funciones"],
  // Vitrine tabloide (redesign 2026-08-05): sobrancelha + manchete + linha fina.
  eyebrow: ["Loja", "Store", "Tienda"],
  pageTitle: ["FUNÇÕES.", "FUNCTIONS.", "FUNCIONES."],
  pageSubtitle: [
    "Cada função é uma parte da Freelandoo que você liga na sua conta. Pagamento único, sua pra sempre.",
    "Each function is a part of Freelandoo you switch on in your account. One-time payment, yours forever.",
    "Cada función es una parte de Freelandoo que activas en tu cuenta. Pago único, tuya para siempre.",
  ],
  backToAccount: ["Voltar pra minha conta", "Back to my account", "Volver a mi cuenta"],
  navAria: ["Funções", "Functions", "Funciones"],
  indicatorsAria: ["Indicadores de função", "Function indicators", "Indicadores de función"],
  viewFunction: ["Ver função", "View function", "Ver función"],
  ownedBadge: ["Sua", "Yours", "Tuya"],
  ownedLine: ["Você já tem esta função", "You already own this function", "Ya tienes esta función"],
  lifetimeShort: ["pagamento único", "one-time payment", "pago único"],
  prevAria: ["Função anterior", "Previous function", "Función anterior"],
  nextAria: ["Próxima função", "Next function", "Siguiente función"],
  counterAria: ["Função {n} de {total}", "Function {n} of {total}", "Función {n} de {total}"],
  goToAria: ["Ir para {name}", "Go to {name}", "Ir a {name}"],
  activeAria: ["Função ativa: {name}", "Active function: {name}", "Función activa: {name}"],
  ctaBuy: ["Comprar", "Buy", "Comprar"],
  ctaOwned: ["Ver função", "View function", "Ver función"],
  loading: ["Carregando…", "Loading…", "Cargando…"],
  empty: [
    "Nenhuma função à venda no momento.",
    "No functions for sale right now.",
    "No hay funciones a la venta por ahora.",
  ],
  loadError: [
    "Erro ao carregar a loja. Tente de novo em instantes.",
    "Error loading the store. Try again in a moment.",
    "Error al cargar la tienda. Inténtalo de nuevo en un momento.",
  ],
  notFound: ["Função não encontrada", "Function not found", "Función no encontrada"],
  allFunctions: ["Todas as funções", "All functions", "Todas las funciones"],
  buy: ["Comprar função", "Buy function", "Comprar función"],
  loginToBuy: ["Entrar pra comprar", "Sign in to buy", "Inicia sesión para comprar"],
  buyError: ["Erro ao iniciar a compra", "Error starting the purchase", "Error al iniciar la compra"],
  lifetime: [
    "Pagamento único — sua pra sempre.",
    "One-time payment — yours forever.",
    "Pago único — tuya para siempre.",
  ],
  aboutTitle: ["O que você leva", "What you get", "Qué te llevas"],
  ownedTitle: ["Você já tem esta função", "You already own this function", "Ya tienes esta función"],
  ownedHint: [
    "Ative ou desative quando quiser na seção Funções do menu lateral.",
    "Turn it on or off anytime in the Functions section of the side menu.",
    "Actívala o desactívala cuando quieras en la sección Funciones del menú lateral.",
  ],
  goAccount: ["Ir pra minha conta", "Go to my account", "Ir a mi cuenta"],
  successTitle: ["Compra confirmada!", "Purchase confirmed!", "¡Compra confirmada!"],
  successPendingTitle: ["Pagamento recebido", "Payment received", "Pago recibido"],
  successBody: [
    "Função liberada na sua conta. Ela já aparece na seção Funções do menu lateral, pronta pra ativar ou desativar.",
    "Function unlocked on your account. It now shows in the Functions section of the side menu, ready to turn on or off.",
    "Función desbloqueada en tu cuenta. Ya aparece en la sección Funciones del menú lateral, lista para activar o desactivar.",
  ],
  successPending: [
    "Estamos confirmando o pagamento — a função libera automaticamente em instantes.",
    "We are confirming the payment — the function unlocks automatically in a moment.",
    "Estamos confirmando el pago — la función se desbloquea automáticamente en un momento.",
  ],
  cancelNotice: [
    "Compra cancelada. Você pode tentar de novo quando quiser.",
    "Purchase canceled. You can try again anytime.",
    "Compra cancelada. Puedes intentarlo de nuevo cuando quieras.",
  ],
}

// Integração no menu lateral (ns Account, seção Funções).
const ACCOUNT = {
  functionsStoreCta: ["Loja de Funções", "Function Store", "Tienda de Funciones"],
  functionsStoreHint: [
    "Compre novas funções pra sua conta.",
    "Buy new functions for your account.",
    "Compra nuevas funciones para tu cuenta.",
  ],
  functionsEmptyOwned: [
    "Você ainda não tem funções. Visite a Loja de Funções.",
    "You do not own any functions yet. Visit the Function Store.",
    "Todavía no tienes funciones. Visita la Tienda de Funciones.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]

function mergeNamespace(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let added = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] === undefined) {
      json[ns][key] = values[localeIndex]
      added++
    }
  }
  return added
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  added += mergeNamespace(json, "FunctionStore", FUNCTION_STORE, i)
  added += mergeNamespace(json, "Account", ACCOUNT, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
