// O RELÓGIO DE MOVIMENTO (nasceu no Esportes, 2026-10-27; compartilhado com o
// Business desde 2026-10-31) — fonte ÚNICA de durações, curvas, molas e
// cascatas (spec `docs/superpowers/specs/2026-10-27-esportes-redesign-motion.md`).
// Componente novo de /esportes ou /academias importa daqui; nada de valor
// solto em componente.
//
// ⚠️ Só transform e opacity (e pathLength em SVG pequeno: anel, ✓, linha de
// peso). O fundo da casca é estático; nada anima do tamanho da janela.
//
// A linguagem é IMPRESSA, não glassmorphism: PRENSA (o corpo desce sobre a
// própria sombra dura), CARIMBO (cai grande e torto e assenta), PLACAR (número
// conta/vira sem empurrar o layout), RECORTE (bloco entra de baixo, levemente
// torto) e FOLHA (o mês vira em torno das presilhas).

type Bezier = [number, number, number, number]

/** Durações em SEGUNDOS (framer). */
export const DUR = {
  instant: 0.08,
  quick: 0.14,
  base: 0.22,
  enter: 0.32,
  sheet: 0.38,
  count: 0.9,
  countLong: 1.2,
  draw: 0.7,
} as const

export const EASE = {
  /** Entrada de papel: sai rápido, assenta firme. */
  paper: [0.16, 1, 0.3, 1] as Bezier,
  /** Saída: acelera para fora, sem cauda. */
  exit: [0.4, 0, 1, 1] as Bezier,
  /** Placar: desacelera longo no fim — o número "freia". */
  score: [0.25, 1, 0.5, 1] as Bezier,
  /** Traço/anel desenhando. */
  ink: [0.65, 0, 0.35, 1] as Bezier,
  /** Folha: começa pesada, termina solta. */
  sheet: [0.55, 0, 0.1, 1] as Bezier,
}

export const SPRING = {
  /** O MESMO dos pills do headcard (headcard-pills.tsx) — não divergir. */
  pill: { type: "spring", stiffness: 320, damping: 24 },
  /** Prensa: volta seca. */
  press: { type: "spring", stiffness: 900, damping: 38, mass: 0.6 },
  /** Carimbo: bate e acomoda (~8% de passagem). */
  stamp: { type: "spring", stiffness: 700, damping: 22, mass: 0.7 },
  /** Soltura do check: estala (~18% de passagem). */
  pop: { type: "spring", stiffness: 520, damping: 14, mass: 0.8 },
  /** Virada do placar (~6%). */
  flip: { type: "spring", stiffness: 420, damping: 26, mass: 0.7 },
  /** Inclinação: segue o cursor com atraso de mão (useSpring). */
  tilt: { stiffness: 180, damping: 22, mass: 0.6 },
} as const

/** Cascatas (s entre irmãos) e o TETO total — o teto vence o passo. */
export const STAGGER = {
  tiles: 0.05,
  rows: 0.035,
  stamps: 0.022,
  bars: 0.02,
  maxTotal: 0.6,
} as const

export const DIST = {
  cutY: 18,
  cutRotate: -1.5,
  press: 3,
  shadow: 8,
  tiltMax: 6,
  tiltShadow: 4,
  stampFrom: 1.6,
} as const

/** Passo de cascata com teto: `stepFor(n, STAGGER.stamps)`. */
export const stepFor = (n: number, step: number, maxTotal: number = STAGGER.maxTotal) =>
  n <= 1 ? 0 : Math.min(step, maxTotal / (n - 1))

/** Rotação "aleatória" ESTÁVEL por chave (o carimbo do dia 12 cai sempre igual). */
export function stampAngle(key: string, range = 14): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range
}

/** Vibração curta, com intervalo mínimo (toques metralhados não viram zumbido). */
let lastBuzz = 0
export function buzz(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof performance === "undefined") return
  const now = performance.now()
  if (now - lastBuzz < 60) return
  lastBuzz = now
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* sem suporte: silêncio */
  }
}
