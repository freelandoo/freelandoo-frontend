// features/meu-mundo/ui/kit/aether-tokens.ts — "OBSERVATÓRIO DE ÉTER" (mm3d-59).
//
// Direção de arte da reforma (Alex, 2026-11-02): ferro/aço escuro, dourado
// Freelandoo, bronze, vidro fumê pequeno, instrumentos de precisão e energia de
// éter. Superfícies RETAS/CHANFRADAS, sombra dura, tipografia industrial.
//
// mm3d-60i: a MOLDURA do modal (SteamFrame/AetherModal) ficou translúcida como o
// menu lateral (pedido do Alex). Os tokens abaixo seguem para os cards internos.
// REGRA antiga: toda superfície de card/modal é 100% OPACA — inclusive os cards
// laterais do carrossel e durante entrada/swipe/saída. Nada de `opacity` < 1
// no contêiner ou nos ancestrais; a animação mexe em transform e nos detalhes
// por cima da base sólida. Por isso aqui NÃO existe cor de superfície com alfa.
//
// Cor que é regra de jogo (tintas do Paint, sinais dos obstáculos) não vem daqui.

export const AE = {
  // ── superfícies (opacas) ──
  /** Fundo do modal/folha. */
  iron: "#14171C",
  /** Card. */
  steel: "#1D2229",
  /** Card ativo / em foco. */
  steelHi: "#262C35",
  /** Poço (slot de imagem, trilho de barra). */
  well: "#0D0F13",
  /** Vidro fumê (pequenas lentes) — opaco, só parece vidro pelo gradiente. */
  smoke: "linear-gradient(160deg, #2B3340 0%, #171B22 55%, #10141A 100%)",

  // ── metais ──
  gold: "#F2B705",
  goldSoft: "#E5BE70",
  brass: "#B8893B",
  bronze: "#8C5A2B",
  /** Filete de latão (borda). */
  brassLine: "#6E5426",
  /** Placa de latão escovado (cabeçalho, botão secundário). */
  brassPlate: "linear-gradient(180deg, #4A3A1C 0%, #2E2412 100%)",
  /** Botão principal: dourado aceso. */
  goldPlate: "linear-gradient(180deg, #FFCF3A 0%, #F2B705 55%, #B88400 100%)",

  // ── éter (magia, raridade, level up) ──
  aether: "#3FE6D2",
  violet: "#A05CFF",
  coral: "#FF7A59",

  // ── texto ──
  text: "#F3EFE6",
  muted: "#A9A397",
  dim: "#6F6A61",
  ink: "#17120A",

  // ── consequência ──
  good: "#4BE38A",
  bad: "#FF5A5A",

  // ── forma ──
  /** Chanfro dos cantos (px) — polygon no clip-path. */
  cut: { card: 12, modal: 18, button: 8, chip: 6 },
  /** Sombra dura (sem desfoque). */
  hard: "4px 4px 0 #000",
  hardSm: "2px 2px 0 #000",
  /** Fonte industrial (a mesma do STATUS: Teko para números, Archivo para texto). */
  dur: { press: 120, settle: 260, energize: 420 },
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const

/** Raridade → cor (raridade é a ÚNICA coisa que pinta a moldura do item). */
export const RARITY = {
  common: { color: "#A9A397", glow: "#A9A397", labelKey: "rarityCommon", label: "Comum" },
  uncommon: { color: "#4BE38A", glow: "#4BE38A", labelKey: "rarityUncommon", label: "Incomum" },
  rare: { color: "#3FA9FF", glow: "#3FA9FF", labelKey: "rarityRare", label: "Raro" },
  epic: { color: "#A05CFF", glow: "#A05CFF", labelKey: "rarityEpic", label: "Épico" },
  legendary: { color: "#F2B705", glow: "#FFD23F", labelKey: "rarityLegendary", label: "Lendário" },
  /** Trilha E1: Mítica (T6) — só peça de chefão e de desafio. */
  mythic: { color: "#FF3B5C", glow: "#FF6A82", labelKey: "rarityMythic", label: "Mítico" },
} as const
export type Rarity = keyof typeof RARITY

/**
 * CLASSE DE RARIDADE (decisão do Alex, 2026-11-17): a raridade que o jogador VÊ, em letras de gacha,
 * da mais fraca à mais forte. Quem decide a classe é o servidor (`rank` no catálogo e no recibo,
 * `src/utils/mmItems/rules/rank.js`); `rarity` (common…legendary) ficou só por dentro (orçamento e sorteio).
 * Divina ainda não tem item: fica pronta na escala.
 */
export const RANK = {
  E: { color: "#A9A397", glow: "#A9A397", labelKey: "rankE", label: "E" },
  D: { color: "#4BE38A", glow: "#4BE38A", labelKey: "rankD", label: "D" },
  C: { color: "#2FD6C8", glow: "#2FD6C8", labelKey: "rankC", label: "C" },
  B: { color: "#3FA9FF", glow: "#3FA9FF", labelKey: "rankB", label: "B" },
  A: { color: "#A05CFF", glow: "#A05CFF", labelKey: "rankA", label: "A" },
  S: { color: "#FF8A1F", glow: "#FFA54D", labelKey: "rankS", label: "S" },
  SS: { color: "#FF3B4E", glow: "#FF6B78", labelKey: "rankSS", label: "SS" },
  SSR: { color: "#FF4FD8", glow: "#FF8BE6", labelKey: "rankSSR", label: "SSR" },
  legendary: { color: "#F2B705", glow: "#FFD23F", labelKey: "rankLegendary", label: "Lendária" },
  divine: { color: "#EAF6FF", glow: "#9EE7FF", labelKey: "rankDivine", label: "Divina" },
} as const
export type Rank = keyof typeof RANK
/** Ordem da escala (0 = E … 9 = Divina). */
export const RANKS = Object.keys(RANK) as Rank[]
export const RANK_ORDER = Object.fromEntries(RANKS.map((r, i) => [r, i])) as Record<Rank, number>
/** Recibo antigo (sem `rank`): a classe pela raridade interna, igual ao servidor. */
const RANK_BY_RARITY: Record<string, Rank> = { common: "E", uncommon: "D", rare: "B", epic: "S", legendary: "legendary", mythic: "divine" }
/** Classe de um item ou linha de recibo: a que o servidor mandou; sem ela, pela raridade. */
export function rankOf(x: { rank?: string | null; rarity?: string | null } | null | undefined): Rank {
  if (x?.rank && x.rank in RANK) return x.rank as Rank
  return RANK_BY_RARITY[x?.rarity || ""] || "E"
}
/** Cor de moldura: aceita classe (E…Divina) ou raridade antiga (desenhos que não são item). */
export function toneOf(r: Rank | Rarity | null | undefined): { color: string; glow: string } {
  return (r && (RANK as Record<string, { color: string; glow: string }>)[r]) || (r && RARITY[r as Rarity]) || RANK.E
}

/** clip-path de canto chanfrado (os quatro cantos). */
export function chamfer(c: number): string {
  return `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, ${c}px 100%, 0 calc(100% - ${c}px), 0 ${c}px)`
}
