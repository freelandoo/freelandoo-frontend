// features/meu-mundo/noturno/engine/biomes/fabrica.ts — ROLÊ NOTURNO 2.0: FÁBRICA INDUSTRIAL.
//
// Referência: 05_fabrica_industrial.png. Diferente da Forja: mecânica, aço,
// motores e esteiras, sem lava. Perto: chapas de aço com bordas zebradas
// amarelo/preto, setas âmbar, guarda-corpo amarelo de segurança. Médio:
// turbinas, guindastes, pistões, engrenagens e tubulações sobre o piso da
// fábrica com as linhas de produção acesas. Longe: silhuetas de guindastes e
// turbinas gigantes sob o céu noturno.

import type { Scene } from "@babylonjs/core/scene"
import type { QualityTier } from "../../../engine/quality"
import { loadFactoryAssets } from "../../../jetpack/engine/canyon-assets"
import { rng, type Paint } from "./common"
import { LANES, deckU, makeBiome, paintChevrons, paintSideOf, paintWallGlowOf, paintWallOf } from "./make"
import type { Biome } from "./types"

/** Chapas de aço com rebites, grelhas e as bordas zebradas. */
const paintDeck: Paint = (c, W, H) => {
  const r = rng(37)
  const ux = deckU(W)
  c.fillStyle = "#1c1d20"
  c.fillRect(0, 0, W, H)
  for (let p = 0; p < 4; p++) {
    for (const [a, b] of LANES) {
      const x0 = ux(a)
      const x1 = ux(b)
      const y0 = (p * H) / 4
      const v = 58 + r() * 14
      c.fillStyle = `rgb(${v},${v + 2},${v + 6})`
      c.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, H / 4 - 4)
      c.fillStyle = "rgba(255,255,255,0.09)"
      c.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, 3)
      c.fillStyle = "rgba(0,0,0,0.35)"
      c.fillRect(x0 + 2, y0 + H / 4 - 6, x1 - x0 - 4, 4)
      c.fillStyle = "#9aa0a8"
      for (const [xx, yy] of [
        [x0 + 9, y0 + 9],
        [x1 - 11, y0 + 9],
        [x0 + 9, y0 + H / 4 - 11],
        [x1 - 11, y0 + H / 4 - 11],
      ])
        c.fillRect(xx, yy, 3, 3)
    }
  }
  const grate = (a: number, b: number) => {
    c.fillStyle = "#0c0c0e"
    c.fillRect(ux(a), 0, ux(b) - ux(a), H)
    c.fillStyle = "#43464c"
    for (let yy = 0; yy < H; yy += 8) c.fillRect(ux(a), yy, ux(b) - ux(a), 2)
  }
  grate(-1.5, -1.0)
  grate(1.0, 1.5)
  // zebrado amarelo/preto nas bordas
  for (const [a, b] of [
    [-4.6, -3.9],
    [3.9, 4.6],
  ]) {
    c.save()
    c.beginPath()
    c.rect(ux(a), 0, ux(b) - ux(a), H)
    c.clip()
    c.fillStyle = "#111"
    c.fillRect(ux(a), 0, ux(b) - ux(a), H)
    c.fillStyle = "#e8b90e"
    for (let y = -40; y < H + 40; y += 40) {
      c.beginPath()
      c.moveTo(ux(a), y)
      c.lineTo(ux(b), y - 20)
      c.lineTo(ux(b), y)
      c.lineTo(ux(a), y + 20)
      c.closePath()
      c.fill()
    }
    c.restore()
  }
}

export function buildFactory(scene: Scene, tier: QualityTier, isAlive: () => boolean): Biome {
  const chev = paintChevrons(["#fff2b0", "#ffa514"], "rgba(80,220,255,0.6)")
  return makeBiome(scene, tier, isAlive, {
    phase: "fabrica",
    paint: {
      deck: paintDeck,
      deckGlow: chev,
      side: paintSideOf([70, 74, 82], "#c8ccd4"),
      wall: paintWallOf([36, 38, 44]),
      wallGlow: paintWallGlowOf("#3fe3ff", "#ffb02a"),
    },
    colors: { deckEm: "#141518", sideEm: "#0c0c10", under: "#18191c", underEm: "#06060a", rail: "#e8b90e", railEm: "#2a2004", edge: "#ffb02a", wallEm: "#0a0a0e" },
    sky: {
      stops: [
        [0, "#40507a"],
        [0.18, "#28345a"],
        [0.55, "#121a34"],
        [1, "#050812"],
      ],
      stars: 220,
      moon: { color: "#e6ecff", size: 20, at: [0.78, 0.16] },
      horizon: { color: "rgba(255,170,60,0.35)", at: 0.4, spread: 0.3 },
    },
    sea: {
      y: -28,
      tile: 160,
      color: "#2a2c34",
      emissive: "#101218",
      paint: (c, w, h) => {
        // piso da fábrica: placas, faixas de circulação e as linhas de produção acesas
        c.fillStyle = "#26282e"
        c.fillRect(0, 0, w, h)
        const r = rng(61)
        c.strokeStyle = "#1a1b20"
        c.lineWidth = 2
        for (let i = 0; i <= 8; i++) {
          c.beginPath()
          c.moveTo((i * w) / 8, 0)
          c.lineTo((i * w) / 8, h)
          c.moveTo(0, (i * h) / 8)
          c.lineTo(w, (i * h) / 8)
          c.stroke()
        }
        c.fillStyle = "#e8b90e"
        c.fillRect(w * 0.18, 0, 6, h)
        c.fillRect(w * 0.72, 0, 6, h)
        c.fillStyle = "rgba(80,220,255,0.9)"
        c.fillRect(w * 0.45, 0, 3, h)
        for (let i = 0; i < 60; i++) {
          c.fillStyle = `rgba(255,${160 + r() * 60},60,${0.6 + r() * 0.4})`
          c.fillRect(r() * w, r() * h, 4, 4)
        }
      },
      flow: [0, 0],
    },
    fall: null,
    light: {
      clear: "#070a14",
      fog: "#1e2638",
      fogStart: 120,
      fogEnd: 1000,
      hemi: { dir: [0.1, 1, -0.2], sky: "#b8c8e8", ground: "#5a4a2a", k: 0.78 },
      sun: { dir: [-0.5, -0.6, 0.4], color: "#ffd8a0", k: 0.7 },
      bloom: { threshold: 0.58, weight: 0.62 },
      contrast: 1.12,
      exposure: 1.05,
    },
    groundY: -28,
    towerEvery: 30,
    pieces: (sc, alive) => loadFactoryAssets(sc, alive),
    dress: (A, _L, _fall, low) => {
      const g = (k: string) => A.get(k)
      return {
        dress: [
          ...(g("turbina") ? [{ mesh: g("turbina")!, per: low ? 0.6 : 1.1, lateral: [24, 80] as const, base: "ground" as const, y: [0, 0] as const, scale: [22, 34] as const, clear: 0.7, face: true, loopClear: 40 }] : []),
          ...(g("guindaste") ? [{ mesh: g("guindaste")!, per: low ? 0.5 : 0.9, lateral: [26, 90] as const, base: "ground" as const, y: [0, 0] as const, scale: [40, 60] as const, clear: 0.5, face: true, loopClear: 40 }] : []),
          ...(g("pistao") ? [{ mesh: g("pistao")!, per: low ? 0.6 : 1.2, lateral: [16, 60] as const, base: "ground" as const, y: [0, 0] as const, scale: [18, 28] as const, clear: 0.6, loopClear: 35 }] : []),
          ...(g("engrenagem") ? [{ mesh: g("engrenagem")!, per: low ? 0.4 : 0.8, lateral: [20, 70] as const, base: "ground" as const, y: [0, 8] as const, scale: [16, 28] as const, clear: 0.6, face: true, loopClear: 35 }] : []),
          ...(g("cano") ? [{ mesh: g("cano")!, per: low ? 0.6 : 1.2, lateral: [14, 50] as const, base: "ground" as const, y: [0, 0] as const, scale: [12, 20] as const, clear: 0.8, loopClear: 30 }] : []),
        ],
        far: [
          ...(g("guindaste") ? [{ mesh: g("guindaste")!, per: low ? 1.5 : 3, lateral: [150, 480] as const, base: "ground" as const, y: [0, 0] as const, scale: [90, 160] as const, clear: 0.5, face: true }] : []),
          ...(g("turbina") ? [{ mesh: g("turbina")!, per: low ? 1.5 : 3, lateral: [150, 500] as const, base: "ground" as const, y: [0, 0] as const, scale: [70, 130] as const, clear: 0.6, face: true }] : []),
          ...(g("viga") ? [{ mesh: g("viga")!, per: low ? 0.8 : 1.5, lateral: [120, 380] as const, base: "ground" as const, y: [0, 0] as const, scale: [50, 90] as const, clear: 0.6 }] : []),
        ],
      }
    },
  })
}
