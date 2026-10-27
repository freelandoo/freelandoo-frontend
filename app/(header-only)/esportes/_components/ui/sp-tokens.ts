// OS TOKENS DA REPAGINADA "PLACAR BRASA" (spec visual de 2026-10-27): o
// caderno de esportes de um tabloide impresso por cima de um placar de
// estádio aceso. Reexporta o que já existe em `fitness-ui.ts` (nunca copia) e
// acrescenta luz, significado e PAPEL. Tela nova do ambiente importa daqui.

import { EMBER, EMBER_DEEP, EMBER_GLOW, HEADER_BG, INK, PILL } from "../fitness-ui"

export const SP = {
  canvas: "#0c0503",
  panel: "#15120E",
  inner: "#1D1810",
  raise: "#241d12",
  band: HEADER_BG,
  ink: "#FFF1E6",
  mute: "#F4A574",
  dim: "#9A938A",
  ember: EMBER,
  emberDeep: EMBER_DEEP,
  glow: EMBER_GLOW,
  /** O "branco quente" do LED — topo do degradê do número herói. */
  hot: "#FFD2A6",
  flare: "#E11D48",
  black: INK,
  // significado (não seguem a pele)
  ok: "#22C55E",
  okPaper: "#16A34A",
  okDeep: "#15803D",
  bad: "#FF5A44",
  badPaper: "#D7261E",
  warn: "#F2B705",
  water: "#16C8E8",
  // papel (objetos impressos: calendário, talão, recibo)
  paper: "#F6EEE3",
  paperInk: "#1A0A05",
  paperMute: "#8A6A55",
  room: {
    academy: PILL.academy.bg,
    workout: PILL.workout.bg,
    history: PILL.history.bg,
    indicators: PILL.indicators.bg,
  },
} as const

/** Número herói: degradê do LED + brilho de brasa. Use com `fl-display`. */
export const HERO_NUMBER_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(180deg, ${SP.hot} 0%, ${SP.glow} 100%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter: "drop-shadow(0 0 18px rgba(249,115,22,.45))",
  fontVariantNumeric: "tabular-nums",
}

/** Card do placar: borda 2 px, chanfro de luz no topo, sombra dura da sala. */
export function cardStyle(room: string, offset = 6): React.CSSProperties {
  return {
    boxShadow: `inset 0 1px 0 rgba(255,210,166,.12), ${offset}px ${offset}px 0 0 ${room}`,
  }
}

/** Texturas estáticas (sempre DENTRO de card, nunca do tamanho da janela). */
export const TX = {
  halftone: "radial-gradient(rgba(251,146,60,.10) 1px, transparent 1.5px) 0 0/6px 6px",
  speed: "repeating-linear-gradient(135deg, rgba(255,140,43,.16) 0 6px, transparent 6px 16px)",
  hatch: "repeating-linear-gradient(135deg, rgba(26,10,5,.16) 0 1px, transparent 1px 6px)",
  paperGrain:
    "radial-gradient(rgba(26,10,5,.05) 1px, transparent 1.2px) 0 0/5px 5px, radial-gradient(rgba(26,10,5,.035) 1px, transparent 1.2px) 2px 3px/7px 7px",
} as const

/** Faixa de cabeçalho em paralelogramo (o corte diagonal sem arredondar). */
export const BAND_CLIP = "polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)"
