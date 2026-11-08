/**
 * A7 — as duas moedas: GOLD (o antigo Pólen, 1 Gold = R$ 1) e VERDE ESMERALDA
 * (ganha engajando e no Meu Mundo; substitui as "moedas do jogo").
 *
 * 1) Chaves novas (fill-if-absent): namespace Moedas + extras.
 * 2) OVERRIDE de valores existentes (idempotente: depois de trocado não casa
 *    de novo):
 *    - "Pólen/Poléns/Pollens/Pólenes…" → "Gold" em toda a plataforma;
 *    - "moedas (do jogo)/coins/monedas" → "Esmeraldas" no MeuMundo (menos as
 *      moedas da corrida do Rolê Noturno, que são do minijogo);
 *    - textos que explicam a regra (MeuMundo.plRule/plCoins) reescritos.
 *
 * Uso: node scripts/i18n-moedas-a7-merge.js
 */
const fs = require("fs")
const path = require("path")

const LOCALES = ["pt-BR", "en", "es"]
const DIR = path.join(__dirname, "..", "messages")

const NEW = {
  Moedas: {
    walletTitle: ["Carteira", "Wallet", "Cartera"],
    goldTitle: ["Gold", "Gold", "Gold"],
    goldUnit: ["Gold", "Gold", "Gold"],
    goldHow: [
      "1 Gold = R$ 1. Só se obtém comprando (ou recebendo presente em live). Vale para manifestações, destaques, impulsionar e cupons de desconto.",
      "1 Gold = R$ 1. You only get it by buying (or receiving live gifts). Use it for manifestations, highlights, boosts and discount coupons.",
      "1 Gold = R$ 1. Solo se obtiene comprando (o recibiendo regalos en vivo). Sirve para manifestaciones, destacados, impulsar y cupones de descuento.",
    ],
    emeraldTitle: ["Verde Esmeralda", "Emerald Green", "Verde Esmeralda"],
    emeraldUnit: ["Esmeraldas", "Emeralds", "Esmeraldas"],
    emeraldHow: [
      "Ganhe curtindo, salvando, comentando e compartilhando, com o alcance dos seus posts, subindo de nível e no Meu Mundo. Vale para manifestações, destaques e itens do jogo. Não vira Gold.",
      "Earn it by liking, saving, commenting and sharing, from your posts' reach, by leveling up and in Meu Mundo. Use it for manifestations, highlights and game items. It never turns into Gold.",
      "Gánalas dando me gusta, guardando, comentando y compartiendo, con el alcance de tus posts, subiendo de nivel y en Meu Mundo. Sirven para manifestaciones, destacados y objetos del juego. No se convierten en Gold.",
    ],
    engagementToday: ["Engajamento hoje", "Engagement today", "Interacción hoy"],
    convertTitle: ["Converter Gold em Esmeralda", "Convert Gold to Emeralds", "Convertir Gold en Esmeraldas"],
    convertRule: [
      "1 Gold = {n} Esmeraldas. Só nessa direção: Esmeralda nunca volta a ser Gold.",
      "1 Gold = {n} Emeralds. One way only: Emeralds never turn back into Gold.",
      "1 Gold = {n} Esmeraldas. Solo en esa dirección: la Esmeralda nunca vuelve a ser Gold.",
    ],
    convertPlaceholder: ["Gold", "Gold", "Gold"],
    convertCta: ["Converter", "Convert", "Convertir"],
    convertDone: ["{g} Gold viraram {e} Esmeraldas.", "{g} Gold became {e} Emeralds.", "{g} Gold se convirtieron en {e} Esmeraldas."],
    couponTitle: ["Cupom de desconto", "Discount coupon", "Cupón de descuento"],
    couponRule: [
      "{g} Gold a cada R$ 10 de desconto. Vale em funções, destaques, manifestações e no booster de nível. Só com Gold, uso único.",
      "{g} Gold for every R$ 10 off. Works on features, highlights, manifestations and the level booster. Gold only, single use.",
      "{g} Gold por cada R$ 10 de descuento. Vale en funciones, destacados, manifestaciones y en el impulso de nivel. Solo con Gold, uso único.",
    ],
    couponValue: ["Valor do desconto", "Discount amount", "Valor del descuento"],
    couponCta: ["Comprar cupom", "Buy coupon", "Comprar cupón"],
    couponDone: ["Cupom {code} de {v} pronto para usar.", "Coupon {code} for {v} ready to use.", "Cupón {code} de {v} listo para usar."],
    couponReserved: ["em uma compra aberta", "in an open purchase", "en una compra abierta"],
    couponAvailable: ["disponível", "available", "disponible"],
    couponUse: ["Cupom Gold", "Gold coupon", "Cupón Gold"],
    couponNone: ["Sem cupom", "No coupon", "Sin cupón"],
    genericError: ["Não foi possível concluir.", "Could not complete.", "No se pudo completar."],
    historyGold: ["Histórico Gold", "Gold history", "Historial Gold"],
    historyEmerald: ["Histórico Esmeralda", "Emerald history", "Historial Esmeralda"],
    historyEmpty: ["Nenhuma movimentação ainda.", "No activity yet.", "Aún no hay movimientos."],
    oldUnit: ["em Pólens, antes do Gold", "in Pollens, before Gold", "en Pólenes, antes del Gold"],
    txPurchase: ["Compra de Gold", "Gold purchase", "Compra de Gold"],
    txLiveGift: ["Presente recebido em live", "Gift received in a live", "Regalo recibido en vivo"],
    txLiveGiftSent: ["Presente enviado em live", "Gift sent in a live", "Regalo enviado en vivo"],
    txAd: ["Anúncio assistido", "Rewarded ad", "Anuncio visto"],
    txLevel: ["Subiu de nível", "Level up", "Subió de nivel"],
    txGoal: ["Prêmio de meta da comunidade", "Community goal prize", "Premio de meta de la comunidad"],
    txEngagement: ["Engajamento", "Engagement", "Interacción"],
    txReach: ["Alcance dos seus posts", "Your posts' reach", "Alcance de tus posts"],
    txMeuMundo: ["Meu Mundo", "Meu Mundo", "Meu Mundo"],
    txWork: ["Trabalho no Meu Mundo", "Work in Meu Mundo", "Trabajo en Meu Mundo"],
    txCoinMigration: ["Moedas do jogo convertidas", "Game coins converted", "Monedas del juego convertidas"],
    txConvertIn: ["Conversão de Gold", "Gold conversion", "Conversión de Gold"],
    txConvertOut: ["Convertido em Esmeralda", "Converted to Emeralds", "Convertido en Esmeraldas"],
    txCoupon: ["Cupom de desconto", "Discount coupon", "Cupón de descuento"],
    txManifestation: ["Manifestação", "Manifestation", "Manifestación"],
    txHighlight: ["Destaque", "Highlight", "Destacado"],
    txBoost: ["Impulsionar", "Boost", "Impulsar"],
    txFunction: ["Loja de Funções", "Feature Store", "Tienda de Funciones"],
    txRedenomination: ["Saldo convertido em Gold (÷100)", "Balance converted to Gold (÷100)", "Saldo convertido en Gold (÷100)"],
    txReversal: ["Estorno", "Reversal", "Reverso"],
    txRefund: ["Reembolso", "Refund", "Reembolso"],
    txAdmin: ["Ajuste", "Adjustment", "Ajuste"],
    txOther: ["Movimentação", "Transaction", "Movimiento"],
  },
  Manifestation: {
    emeralds: ["Esmeraldas", "Emeralds", "Esmeraldas"],
  },
  Premium: {
    buyWithEmerald: ["Comprar com {n} Esmeraldas", "Buy with {n} Emeralds", "Comprar con {n} Esmeraldas"],
  },
}

// Textos que explicam a regra antiga: reescritos por inteiro.
const OVERRIDE = {
  MeuMundo: {
    plCoins: ["Esmeraldas", "Emeralds", "Esmeraldas"],
    plRule: [
      "Gold é a moeda comprada da Freelandoo e vale aqui e no resto da plataforma. Gold vira Esmeralda (1 Gold = 1.000), mas Esmeralda nunca vira Gold.",
      "Gold is Freelandoo's paid currency and works here and across the platform. Gold can become Emeralds (1 Gold = 1,000), but Emeralds never become Gold.",
      "Gold es la moneda comprada de Freelandoo y vale aquí y en el resto de la plataforma. Gold se convierte en Esmeralda (1 Gold = 1.000), pero la Esmeralda nunca vuelve a ser Gold.",
    ],
  },
}

// Pólen → Gold (toda a plataforma). Ordem importa: frases antes das palavras.
const GOLD_RULES = {
  "pt-BR": [
    [/\bSeus P[óo]l[eé]ns\b/g, "Seu Gold"], [/\bseus P[óo]l[eé]ns\b/g, "seu Gold"],
    [/\bOs P[óo]l[eé]ns\b/g, "O Gold"], [/\bos [Pp][óo]l[eé]ns\b/g, "o Gold"],
    [/\bdos P[óo]l[eé]ns\b/g, "do Gold"], [/\bnos P[óo]l[eé]ns\b/g, "no Gold"],
    [/P[óo]l[eé]ns/g, "Gold"], [/p[óo]lens/g, "Gold"], [/P[óo]l[eé]n\b/g, "Gold"], [/p[óo]len\b/g, "Gold"],
    // Gold é singular: concordância depois da troca.
    [/\bseus Gold\b/g, "seu Gold"], [/\bGold desbloqueiam\b/g, "Gold desbloqueia"],
    [/\bGold são creditados\b/g, "Gold é creditado"], [/\bGold foram creditados\b/g, "Gold foi creditado"],
    [/^Gold creditados$/g, "Gold creditado"], [/\b([oO]) Gold entram\b/g, "$1 Gold entra"],
  ],
  en: [
    [/\b[Pp]ollens\b/g, "Gold"], [/\bPollen\b/g, "Gold"], [/P[óo]l[eé]ns/g, "Gold"], [/\bPolens\b/g, "Gold"], [/\bPolen\b/g, "Gold"],
    [/\bGold are\b/g, "Gold is"], [/\bGold have been\b/g, "Gold has been"], [/\bGold unlock\b/g, "Gold unlocks"],
  ],
  es: [
    [/\b[Pp]ólenes\b/g, "Gold"], [/P[óo]l[eé]ns/g, "Gold"], [/\bPolens\b/g, "Gold"], [/\bPol[eé]n\b/g, "Gold"],
    [/\bTus Gold\b/g, "Tu Gold"], [/\btus Gold\b/g, "tu Gold"], [/\bLos Gold\b/g, "El Gold"], [/\blos Gold\b/g, "el Gold"],
    [/\b([eE]l) Gold entran\b/g, "$1 Gold entra"], [/^Gold acreditados$/g, "Gold acreditado"],
    [/\bGold son acreditados\b/g, "Gold se acredita"], [/\bGold fueron acreditados\b/g, "Gold fue acreditado"],
    [/\bGold se acreditan\b/g, "Gold se acredita"], [/\bGold se acreditaron\b/g, "Gold se acreditó"],
  ],
}

// Moedas do jogo → Esmeraldas (só MeuMundo, menos o Rolê Noturno).
const COIN_RULES = {
  "pt-BR": [
    [/[Mm]oedas do jogo/g, "Esmeraldas"], [/Moedas insuficientes/g, "Esmeraldas insuficientes"],
    [/\bmoedas\b/g, "Esmeraldas"], [/\bMoedas\b/g, "Esmeraldas"],
  ],
  en: [[/\b[Gg]ame coins\b/g, "Emeralds"], [/\bNot enough coins\b/g, "Not enough Emeralds"], [/\bcoins\b/g, "Emeralds"], [/\bCoins\b/g, "Emeralds"]],
  es: [[/\b[Mm]onedas del juego\b/g, "Esmeraldas"], [/\bmonedas\b/g, "Esmeraldas"], [/\bMonedas\b/g, "Esmeraldas"]],
}

const SKIP_NS = new Set(["Legal", "PolensTerms", "Terms", "Moedas"])
const coinKey = (k) => !/^noturno/i.test(k)

function rewrite(value, rules) {
  let out = value
  for (const [re, to] of rules) out = out.replace(re, to)
  return out
}

let added = 0
let changed = 0
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))

  for (const [ns, keys] of Object.entries(NEW)) {
    dict[ns] = dict[ns] || {}
    for (const [k, v] of Object.entries(keys)) {
      if (dict[ns][k] === undefined) {
        dict[ns][k] = v[idx]
        added += 1
      }
    }
  }

  for (const [ns, obj] of Object.entries(dict)) {
    if (SKIP_NS.has(ns) || !obj || typeof obj !== "object") continue
    ;(function walk(o, keyPath) {
      for (const [k, v] of Object.entries(o)) {
        if (v && typeof v === "object") {
          walk(v, `${keyPath}.${k}`)
          continue
        }
        if (typeof v !== "string") continue
        let next = rewrite(v, GOLD_RULES[locale])
        if ((ns === "MeuMundo" && coinKey(k)) || ns === "MeuMundoServer") next = rewrite(next, COIN_RULES[locale])
        if (next !== v) {
          o[k] = next
          changed += 1
        }
      }
    })(obj, ns)
  }

  for (const [ns, keys] of Object.entries(OVERRIDE)) {
    dict[ns] = dict[ns] || {}
    for (const [k, v] of Object.entries(keys)) {
      if (dict[ns][k] !== v[idx]) {
        dict[ns][k] = v[idx]
        changed += 1
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`)
})

console.log(`i18n moedas A7: ${added} chave(s) nova(s), ${changed} valor(es) reescrito(s).`)
