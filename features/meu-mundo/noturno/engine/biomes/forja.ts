// features/meu-mundo/noturno/engine/biomes/forja.ts — ROLÊ NOTURNO 2.0: FORJA VULCÂNICA.
//
// Referência: 04_forja_vulcanica.png. Perto: placas antiderrapantes de grafite
// com grelhas hexagonais, costuras em brasa, setas ciano (o ciano é só para
// ler a pista), corrimão de ferro com fita laranja. Médio: fornalhas, caldeirões
// e prensas sobre o rio de lava, quedas de metal fundido. Longe: paredões de
// rocha vulcânica e o céu vermelho de fumaça com o brilho do vulcão.

import type { Scene } from "@babylonjs/core/scene"
import type { QualityTier } from "../../../engine/quality"
import { loadForgeAssets } from "../../../jetpack/engine/canyon-assets"
import { rng, type Paint } from "./common"
import { LANES, deckU, makeBiome, paintChevrons, paintSideOf, paintWallGlowOf, paintWallOf } from "./make"
import type { Biome } from "./types"

/** Grafite com antiderrapante, grade hexagonal entre as faixas e nas bordas. */
const paintDeck: Paint = (c, W, H) => {
  const r = rng(29)
  const ux = deckU(W)
  c.fillStyle = "#151313"
  c.fillRect(0, 0, W, H)
  for (let p = 0; p < 4; p++) {
    for (const [a, b] of LANES) {
      const x0 = ux(a)
      const x1 = ux(b)
      const y0 = (p * H) / 4
      const v = 34 + r() * 10
      c.fillStyle = `rgb(${v + 4},${v},${v - 2})`
      c.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, H / 4 - 4)
      c.fillStyle = "rgba(255,255,255,0.05)"
      for (let yy = y0 + 10; yy < y0 + H / 4 - 10; yy += 12) for (let xx = x0 + 8; xx < x1 - 8; xx += 12) c.fillRect(xx + ((yy / 12) % 2) * 6, yy, 5, 2)
      c.fillStyle = "rgba(255,120,40,0.08)"
      c.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, 3)
    }
  }
  const hex = (a: number, b: number) => {
    const x0 = ux(a)
    const x1 = ux(b)
    c.fillStyle = "#070606"
    c.fillRect(x0, 0, x1 - x0, H)
    c.strokeStyle = "#3a3330"
    c.lineWidth = 1.5
    const s = 7
    for (let y = 0; y < H + s; y += s * 1.5) {
      for (let x = x0; x < x1 + s; x += s * 1.732) {
        const ox = (Math.round(y / (s * 1.5)) % 2) * s * 0.866
        c.beginPath()
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2 + Math.PI / 6
          const px = x + ox + Math.cos(ang) * s * 0.6
          const py = y + Math.sin(ang) * s * 0.6
          if (k) c.lineTo(px, py)
          else c.moveTo(px, py)
        }
        c.closePath()
        c.stroke()
      }
    }
  }
  hex(-1.5, -1.0)
  hex(1.0, 1.5)
  hex(-4.6, -3.9)
  hex(3.9, 4.6)
}

export function buildForge(scene: Scene, tier: QualityTier, isAlive: () => boolean): Biome {
  const chev = paintChevrons(["#bff8ff", "#2ab8ff"], "rgba(255,120,30,0.65)")
  return makeBiome(scene, tier, isAlive, {
    phase: "forja",
    paint: {
      deck: paintDeck,
      deckGlow: (c, W, H) => {
        chev(c, W, H)
        // costuras em brasa entre as placas
        const ux = deckU(W)
        c.fillStyle = "rgba(255,110,20,0.75)"
        for (let p = 0; p <= 4; p++) c.fillRect(ux(-3.9), (p * H) / 4 - 1, ux(3.9) - ux(-3.9), 2)
      },
      side: paintSideOf([58, 46, 40], "#b07040"),
      wall: paintWallOf([40, 30, 26]),
      wallGlow: paintWallGlowOf("#ff8a2a", "#ff3a14"),
    },
    colors: { deckEm: "#1a0c06", sideEm: "#1a0804", under: "#120c0a", underEm: "#140602", rail: "#5a4a40", railEm: "#2a1006", edge: "#ff8a2a", wallEm: "#140604" },
    sky: {
      stops: [
        [0, "#d2451a"],
        [0.12, "#8a2412"],
        [0.4, "#3a0e10"],
        [0.75, "#170608"],
        [1, "#080305"],
      ],
      stars: 60,
      horizon: { color: "rgba(255,110,30,0.7)", at: 0.42, spread: 0.22 },
    },
    sea: {
      y: -30,
      tile: 220,
      color: "#ff7a2a",
      emissive: "#d0400a",
      paint: (c, w, h) => {
        // crosta escura com rachaduras de lava
        c.fillStyle = "#ff6a14"
        c.fillRect(0, 0, w, h)
        const r = rng(51)
        for (let i = 0; i < 140; i++) {
          const x = r() * w
          const y = r() * h
          const rad = 14 + r() * 50
          c.fillStyle = `rgba(${40 + r() * 30},${12 + r() * 10},${8},${0.75 + r() * 0.2})`
          c.beginPath()
          c.ellipse(x, y, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2)
          c.fill()
        }
        for (let i = 0; i < 160; i++) {
          c.fillStyle = `rgba(255,${200 + r() * 55},120,${0.5 + r() * 0.5})`
          c.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3)
        }
      },
      flow: [0.0, 1.6],
    },
    fall: ["#fff2a0", "#ff4a08", "#ffd060"],
    light: {
      clear: "#1a0606",
      fog: "#5a1a10",
      fogStart: 110,
      fogEnd: 900,
      hemi: { dir: [0.1, 1, -0.2], sky: "#ffb08a", ground: "#ff4a10", k: 0.62 },
      sun: { dir: [0.2, 0.8, 0.3], color: "#ff7a3a", k: 0.6 },
      bloom: { threshold: 0.55, weight: 0.75 },
      contrast: 1.16,
      exposure: 1.02,
    },
    groundY: -30,
    towerEvery: 36,
    pieces: (sc, alive) => loadForgeAssets(sc, alive),
    dress: (A, L, fall, low) => {
      const lavaFall = fall ? [{ mesh: fall, at: [0.5, 0.95, 0] as const, scale: 1, size: [0.22, 1.2] as const, yaw: -Math.PI / 2, p: 0.5 }] : []
      return {
        dress: [
          ...(A.get("rocha") ? [{ mesh: A.get("rocha")!, per: low ? 1.2 : 2.2, lateral: [20, 80] as const, base: "ground" as const, y: [-4, 0] as const, scale: [18, 34] as const, clear: 0.7, loopClear: 35 }] : []),
          ...(A.get("fornalha") ? [{ mesh: A.get("fornalha")!, per: low ? 0.5 : 0.9, lateral: [30, 90] as const, base: "ground" as const, y: [0, 0] as const, scale: [26, 40] as const, clear: 0.7, face: true, loopClear: 45, riders: lavaFall }] : []),
          ...(A.get("caldeirao") ? [{ mesh: A.get("caldeirao")!, per: low ? 0.4 : 0.8, lateral: [26, 80] as const, base: "ground" as const, y: [0, 0] as const, scale: [16, 26] as const, clear: 0.6, loopClear: 40 }] : []),
          ...(A.get("prensa") ? [{ mesh: A.get("prensa")!, per: low ? 0.4 : 0.8, lateral: [26, 80] as const, base: "ground" as const, y: [0, 0] as const, scale: [22, 34] as const, clear: 0.6, face: true, loopClear: 40 }] : []),
        ],
        far: [
          ...((L.get("rocha") ?? A.get("rocha")) ? [{ mesh: (L.get("rocha") ?? A.get("rocha"))!, per: low ? 4 : 7, lateral: [150, 520] as const, base: "ground" as const, y: [-10, 0] as const, scale: [70, 170] as const, clear: 0.6 }] : []),
          ...(A.get("fornalha") ? [{ mesh: A.get("fornalha")!, per: low ? 0.5 : 1, lateral: [160, 400] as const, base: "ground" as const, y: [0, 0] as const, scale: [60, 100] as const, clear: 0.6, face: true, riders: lavaFall }] : []),
        ],
      }
    },
  })
}
