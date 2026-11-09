// features/meu-mundo/noturno/engine/biomes/floresta.ts — ROLÊ NOTURNO 2.0: FLORESTA BIOLUMINESCENTE.
//
// Referência: 01_floresta_bioluminescente.png. Perto: passarela de tábuas
// com filetes turquesa, moirões com corda e lanternas douradas, colunas de
// tronco descendo até a névoa. Médio: árvores colossais que sobem da névoa,
// cogumelos gigantes, cristais e plantas acesas ao lado da pista. Longe:
// ilhas da floresta com cachoeiras turquesa, arcos de raízes, céu noturno
// verde-azulado. A névoa fica EMBAIXO (o "mar"), nunca na frente do percurso.

import type { Scene } from "@babylonjs/core/scene"
import type { QualityTier } from "../../../engine/quality"
import { loadForestAssets } from "../../../jetpack/engine/canyon-assets"
import { rng, type Paint } from "./common"
import { LANES, deckU, makeBiome, paintSideOf, paintWallGlowOf, paintWallOf } from "./make"
import type { Biome } from "./types"

/** Tábuas atravessadas (30 cm), pregos, musgo nas bordas. */
const paintDeck: Paint = (c, W, H) => {
  const r = rng(13)
  const ux = deckU(W)
  c.fillStyle = "#2a1c14"
  c.fillRect(0, 0, W, H)
  const boards = 26
  const bh = H / boards
  for (let i = 0; i < boards; i++) {
    const y0 = i * bh
    const v = 0.85 + r() * 0.3
    c.fillStyle = `rgb(${Math.round(92 * v)},${Math.round(62 * v)},${Math.round(40 * v)})`
    c.fillRect(ux(-4.2), y0 + 1.5, ux(4.2) - ux(-4.2), bh - 3)
    // veios
    c.strokeStyle = "rgba(40,24,14,0.35)"
    c.lineWidth = 1
    for (let k = 0; k < 3; k++) {
      c.beginPath()
      const yy = y0 + 4 + r() * (bh - 8)
      c.moveTo(ux(-4.2), yy)
      c.bezierCurveTo(W * 0.3, yy + (r() - 0.5) * 6, W * 0.6, yy + (r() - 0.5) * 6, ux(4.2), yy)
      c.stroke()
    }
    c.fillStyle = "#1b120c"
    c.fillRect(ux(-4.2), y0 + bh - 2, ux(4.2) - ux(-4.2), 2)
    c.fillStyle = "#8a8a7a"
    for (const x of [-3.0, -0.6, 0.6, 3.0]) c.fillRect(ux(x) - 1.5, y0 + bh / 2 - 1.5, 3, 3)
  }
  // vigas mestras nas bordas (escuras) com musgo
  for (const [a, b] of [
    [-4.6, -4.2],
    [4.2, 4.6],
  ]) {
    c.fillStyle = "#24170f"
    c.fillRect(ux(a), 0, ux(b) - ux(a), H)
    for (let k = 0; k < 40; k++) {
      c.fillStyle = `rgba(${60 + r() * 40},${120 + r() * 60},${50 + r() * 30},0.55)`
      c.beginPath()
      c.ellipse(ux(a) + r() * (ux(b) - ux(a)), r() * H, 3 + r() * 8, 6 + r() * 16, 0, 0, Math.PI * 2)
      c.fill()
    }
  }
  void LANES
}

/** Filetes turquesa nas bordas das faixas e folhas acesas espalhadas. */
const paintDeckGlow: Paint = (c, W, H) => {
  const r = rng(21)
  const ux = deckU(W)
  c.fillStyle = "#000"
  c.fillRect(0, 0, W, H)
  c.fillStyle = "#33f0d0"
  for (const x of [-4.15, 4.15]) c.fillRect(ux(x) - 2, 0, 4, H)
  c.fillStyle = "rgba(60,230,255,0.6)"
  for (const x of [-1.25, 1.25]) c.fillRect(ux(x) - 1, 0, 2, H)
  for (let i = 0; i < 9; i++) {
    c.fillStyle = r() < 0.5 ? "rgba(140,255,120,0.85)" : "rgba(80,240,220,0.85)"
    c.beginPath()
    c.ellipse(ux(-3.6 + r() * 7.2), r() * H, 4, 8, r() * 3, 0, Math.PI * 2)
    c.fill()
  }
}

export function buildForest(scene: Scene, tier: QualityTier, isAlive: () => boolean): Biome {
  return makeBiome(scene, tier, isAlive, {
    phase: "floresta",
    paint: {
      deck: paintDeck,
      deckGlow: paintDeckGlow,
      side: paintSideOf([70, 48, 32], "#9a8a6a"),
      wall: paintWallOf([46, 34, 26]),
      wallGlow: paintWallGlowOf("#3ff2c4", "#b06aff"),
    },
    colors: { deckEm: "#141008", sideEm: "#0c0a08", under: "#21160f", underEm: "#080604", rail: "#6b4a2e", railEm: "#1a1006", edge: "#3ff2c4", wallEm: "#0a0a08" },
    sky: {
      stops: [
        [0, "#1d7a72"],
        [0.14, "#155a62"],
        [0.4, "#1a2a58"],
        [0.75, "#0f1236"],
        [1, "#05061a"],
      ],
      stars: 320,
      moon: { color: "#dff6ff", size: 18, at: [0.28, 0.12] },
      horizon: { color: "rgba(80,255,210,0.4)", at: 0.65, spread: 0.3 },
    },
    sea: {
      y: -52,
      tile: 520,
      color: "#3a6a74",
      emissive: "#0d3a40",
      paint: (c, w, h) => {
        c.fillStyle = "#1c3a44"
        c.fillRect(0, 0, w, h)
        const r = rng(41)
        for (let i = 0; i < 160; i++) {
          const x = r() * w
          const y = r() * h
          const rad = 30 + r() * 100
          const g = c.createRadialGradient(x, y, 0, x, y, rad)
          g.addColorStop(0, r() < 0.7 ? "rgba(120,220,210,0.45)" : "rgba(150,120,255,0.35)")
          g.addColorStop(1, "rgba(0,0,0,0)")
          c.fillStyle = g
          c.fillRect(x - rad, y - rad, rad * 2, rad * 2)
        }
        for (let i = 0; i < 260; i++) {
          c.fillStyle = `rgba(160,255,230,${0.4 + r() * 0.5})`
          c.fillRect(r() * w, r() * h, 2, 2)
        }
      },
      flow: [0.6, 0.3],
    },
    fall: ["#e8fff8", "#3fd6c8", "#ffffff"],
    light: {
      clear: "#0a1a24",
      fog: "#1f4a52",
      fogStart: 120,
      fogEnd: 1000,
      hemi: { dir: [0.1, 1, -0.2], sky: "#a8f0e8", ground: "#4a3a6a", k: 0.9 },
      sun: { dir: [0.5, -0.7, 0.4], color: "#c8f0ff", k: 0.55 },
      bloom: { threshold: 0.55, weight: 0.7 },
      contrast: 1.14,
      exposure: 1.08,
    },
    groundY: -55,
    towerEvery: 36,
    pieces: (sc, alive) => loadForestAssets(sc, alive),
    dress: (A, L, fall, low) => {
      const fromIsland = fall ? [{ mesh: fall, at: [0.4, -0.1, 0] as const, scale: 1, size: [0.13, 3.0] as const, yaw: -Math.PI / 2, p: 0.6 }] : []
      return {
        dress: [
          // árvores colossais subindo da névoa ao lado da pista
          ...(A.get("arvore") ? [{ mesh: A.get("arvore")!, per: low ? 1.2 : 2, lateral: [75, 170] as const, base: "ground" as const, y: [0, 0] as const, scale: [70, 105] as const, clear: 0.62, loopClear: 140 }] : []),
          // cogumelos gigantes e cristais na altura da pista (fora da faixa)
          ...(A.get("cogumelo") ? [{ mesh: A.get("cogumelo")!, per: low ? 1 : 1.8, lateral: [14, 45] as const, base: "track" as const, y: [-9, -4] as const, scale: [8, 13] as const, clear: 0.6, loopClear: 45 }] : []),
          ...(A.get("cristais") ? [{ mesh: A.get("cristais")!, per: low ? 0.8 : 1.4, lateral: [11, 30] as const, base: "track" as const, y: [-6, -2] as const, scale: [5, 9] as const, clear: 0.7, loopClear: 30 }] : []),
          ...(A.get("planta") ? [{ mesh: A.get("planta")!, per: low ? 1 : 2, lateral: [9, 22] as const, base: "track" as const, y: [-4, -1.5] as const, scale: [4, 7] as const, clear: 0.8, loopClear: 25 }] : []),
        ],
        far: [
          ...(A.get("ilha") ? [{ mesh: A.get("ilha")!, per: low ? 0.8 : 1.4, lateral: [140, 420] as const, base: "track" as const, y: [-10, 50] as const, scale: [60, 110] as const, clear: 0.5, riders: fromIsland }] : []),
          ...(L.get("arvore") ?? A.get("arvore") ? [{ mesh: (L.get("arvore") ?? A.get("arvore"))!, per: low ? 3 : 5, lateral: [190, 520] as const, base: "ground" as const, y: [0, 0] as const, scale: [120, 200] as const, clear: 0.62 }] : []),
          ...(A.get("arco") ? [{ mesh: A.get("arco")!, per: low ? 0.3 : 0.6, lateral: [200, 450] as const, base: "ground" as const, y: [20, 40] as const, scale: [150, 240] as const, clear: 0.5, face: true }] : []),
        ],
      }
    },
  })
}
