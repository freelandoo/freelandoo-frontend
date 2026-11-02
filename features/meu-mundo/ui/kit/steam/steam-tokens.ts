// features/meu-mundo/ui/kit/steam/steam-tokens.ts — "STEAMPUNK UI" (mm3d-60, 2026-11-02).
//
// Redesign pedido pelo Alex (referências: STATUS, VITÓRIA, menu do centro e os
// números flutuantes): metal negro + bronze/cobre escovado + ouro envelhecido,
// filetes de energia CIANO, rebites e engrenagens discretas nos cantos.
//
// Continua valendo a regra do mm3d-59: toda SUPERFÍCIE de card/modal é opaca.
// O "vidro fumê" é um gradiente opaco; brilho, reflexo e halo são CAMADAS por
// cima (essas sim podem ter alfa e animar opacidade — não são superfície).
//
// Cor que é regra de jogo (tintas do Paint etc.) não vem daqui.

export const SP = {
  // ── superfícies (opacas) ──
  bg: "#10151B",
  bg2: "#1B222A",
  /** "Vidro fumê" opaco do miolo dos painéis. */
  smoke: "linear-gradient(165deg, #1E2630 0%, #141A21 46%, #0D1116 100%)",
  /** Peça metálica (item do menu, card). */
  plate: "linear-gradient(180deg, #222A34 0%, #181E26 55%, #12171D 100%)",
  plateHi: "linear-gradient(180deg, #2C3541 0%, #1E252E 55%, #161B22 100%)",
  well: "#0A0D11",

  // ── metais ──
  bronze: "#B67A31",
  copper: "#9A5B2A",
  gold: "#E8B65B",
  goldHi: "#FFD68A",
  goldDeep: "#7A5220",
  /** Aro de ouro envelhecido (borda dos painéis grandes). */
  rim: "linear-gradient(180deg, #FFE3A3 0%, #E8B65B 14%, #9A6424 46%, #C8913F 70%, #5E3B12 100%)",
  /** Aro de bronze (cards internos). */
  rimSoft: "linear-gradient(180deg, #A97C3C 0%, #6A4A1E 45%, #4A3314 70%, #8A6430 100%)",
  /** Botão principal: ouro aceso. */
  goldPlate: "linear-gradient(180deg, #FFE7A8 0%, #F2C35C 30%, #C98A2E 72%, #8E5A16 100%)",

  // ── energia ──
  cyan: "#20D9E9",
  cyanSoft: "rgba(32, 217, 233, 0.38)",
  violet: "#B75AFF",
  green: "#43E6AC",
  red: "#FF526A",

  // ── texto ──
  text: "#F4EEDF",
  muted: "#A9A397",
  ink: "#1A1206",

  // ── movimento ──
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const

/**
 * Cor de cada recurso nos NÚMEROS FLUTUANTES (só o número aparece — a cor é a
 * única identificação, então a mesma categoria tem SEMPRE a mesma cor, suba ou
 * desça). Distintas entre si de propósito.
 */
export const FLOAT_COLOR = {
  xp: "#FFD23F",
  strength: "#FF6A1F",
  dexterity: "#20E3F0",
  intelligence: "#4F8BFF",
  speed: "#C6FF4D",
  energy: "#B75AFF",
  health: "#2BE08A",
  stress: "#FF4D6D",
  satiety: "#FFB347",
  mood: "#FF7AD9",
} as const
export type FloatKind = keyof typeof FLOAT_COLOR
