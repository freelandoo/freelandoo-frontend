// features/meu-mundo/noturno/engine/biomes/orbital.ts — ROLÊ NOTURNO 2.0: CIDADE ORBITAL.
//
// Referência: 03_cidade_orbital.png. Perto: pista de VIDRO estrutural — placas
// com moldura de prata e juntas, a cidade acesa lá embaixo vista através
// (pintada no próprio piso: nada de centenas de placas transparentes
// empilhadas), setas ciano, corrimão prateado. Médio: torres que sobem das
// nuvens, plataformas-jardim, painéis de holograma, drones. Longe: torres
// monumentais e o planeta com anel no céu.

import type { Scene } from "@babylonjs/core/scene"
import type { QualityTier } from "../../../engine/quality"
import { loadOrbitalAssets } from "../../../jetpack/engine/canyon-assets"
import { paintClouds, rng, type Paint } from "./common"
import { deckU, makeBiome, paintChevrons, paintSideOf, paintWallGlowOf, paintWallOf } from "./make"
import type { Biome } from "./types"

/** Vidro: placas azul-escuras com a cidade acesa "lá embaixo", molduras de prata e juntas. */
const paintDeck: Paint = (c, W, H) => {
  const r = rng(17)
  const ux = deckU(W)
  c.fillStyle = "#0b1230"
  c.fillRect(0, 0, W, H)
  // a cidade vista através do vidro: grade de ruas e janelas
  for (let i = 0; i < 900; i++) {
    const warm = r() < 0.6
    c.fillStyle = warm ? `rgba(255,${180 + r() * 60},${90 + r() * 60},${0.25 + r() * 0.4})` : `rgba(90,${180 + r() * 60},255,${0.2 + r() * 0.35})`
    c.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2)
  }
  // reflexo diagonal
  const g = c.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, "rgba(160,200,255,0.0)")
  g.addColorStop(0.45, "rgba(160,200,255,0.10)")
  g.addColorStop(0.55, "rgba(160,200,255,0.0)")
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  // molduras: placas de 2 m por faixa
  c.fillStyle = "#b8c2d4"
  for (let p = 0; p <= 4; p++) c.fillRect(0, (p * H) / 4 - 2, W, 4)
  for (const x of [-4.2, -1.25, 1.25, 4.2]) c.fillRect(ux(x) - 3, 0, 6, H)
  c.fillStyle = "#5a6478"
  for (const [a, b] of [
    [-4.6, -4.2],
    [4.2, 4.6],
  ])
    c.fillRect(ux(a), 0, ux(b) - ux(a), H)
}

export function buildOrbital(scene: Scene, tier: QualityTier, isAlive: () => boolean): Biome {
  const chev = paintChevrons(["#bff8ff", "#2ab8ff"], "rgba(90,220,255,0.7)")
  return makeBiome(scene, tier, isAlive, {
    phase: "orbital",
    paint: {
      deck: paintDeck,
      deckGlow: (c, W, H) => {
        chev(c, W, H)
        // filete das molduras aceso de leve
        const ux = deckU(W)
        c.fillStyle = "rgba(120,200,255,0.25)"
        for (const x of [-4.2, 4.2]) c.fillRect(ux(x) - 1, 0, 2, H)
      },
      side: paintSideOf([150, 158, 176], "#e8eef8"),
      wall: paintWallOf([40, 46, 74]),
      wallGlow: paintWallGlowOf("#3fe3ff", "#ff4fd8"),
    },
    colors: { deckEm: "#1a2240", sideEm: "#10121c", under: "#1a1f33", underEm: "#06081a", rail: "#d8e0ee", railEm: "#202838", edge: "#5fe1ff", wallEm: "#0a0c18" },
    sky: {
      stops: [
        [0, "#6a3a9a"],
        [0.18, "#3a2c88"],
        [0.5, "#141c56"],
        [1, "#03061a"],
      ],
      stars: 700,
      planet: { color: "#3a7ad0", ring: "rgba(200,220,255,0.45)", size: 120, at: [0.64, 0.24] },
    },
    sea: {
      y: -75,
      tile: 640,
      color: "#9a8ad8",
      emissive: "#3a2c6a",
      paint: paintClouds("#5c5aa8", "rgba(210,200,255,0.55)", "rgba(120,80,200,0.35)"),
      flow: [1.0, 0.4],
    },
    fall: ["#f0f8ff", "#7ac8ff", "#ffffff"],
    light: {
      clear: "#0a0c2a",
      fog: "#3a3478",
      fogStart: 150,
      fogEnd: 1400,
      hemi: { dir: [0.1, 1, -0.2], sky: "#b8c8ff", ground: "#4a2a7a", k: 0.8 },
      sun: { dir: [-0.4, -0.6, 0.5], color: "#d8e8ff", k: 0.7 },
      bloom: { threshold: 0.55, weight: 0.68 },
      contrast: 1.12,
      exposure: 1.06,
    },
    groundY: -80,
    towerEvery: 48,
    pieces: (sc, alive) => loadOrbitalAssets(sc, alive),
    dress: (A, L, fall, low) => {
      const torre = A.get("torre")
      const torreFar = L.get("torre") ?? torre
      const fromGarden = fall ? [{ mesh: fall, at: [0.42, 0.0, 0] as const, scale: 1, size: [0.1, 2.4] as const, yaw: -Math.PI / 2, p: 0.5 }] : []
      return {
        dress: [
          ...(torre ? [{ mesh: torre, per: low ? 1.4 : 2.4, lateral: [30, 120] as const, base: "ground" as const, y: [0, 0] as const, scale: [120, 200] as const, clear: 0.6, loopClear: 40 }] : []),
          ...(A.get("jardineira") ? [{ mesh: A.get("jardineira")!, per: low ? 0.5 : 0.9, lateral: [40, 130] as const, base: "track" as const, y: [-18, 6] as const, scale: [18, 34] as const, clear: 0.6, loopClear: 50, riders: fromGarden }] : []),
          ...(A.get("painel") ? [{ mesh: A.get("painel")!, per: low ? 0.6 : 1.1, lateral: [16, 40] as const, base: "track" as const, y: [-2, 4] as const, scale: [7, 11] as const, clear: 1, face: true, loopClear: 30 }] : []),
          ...(A.get("drone") ? [{ mesh: A.get("drone")!, per: low ? 0.6 : 1.2, lateral: [20, 90] as const, base: "track" as const, y: [8, 30] as const, scale: [3, 5] as const, clear: 2 }] : []),
        ],
        far: [
          ...(torreFar ? [{ mesh: torreFar, per: low ? 5 : 9, lateral: [140, 600] as const, base: "ground" as const, y: [0, 0] as const, scale: [200, 420] as const, clear: 0.6 }] : []),
          ...(A.get("elevador") ? [{ mesh: A.get("elevador")!, per: low ? 0.8 : 1.5, lateral: [160, 450] as const, base: "ground" as const, y: [0, 0] as const, scale: [160, 260] as const, clear: 0.6 }] : []),
          ...(A.get("jardineira") ? [{ mesh: A.get("jardineira")!, per: low ? 0.6 : 1.2, lateral: [180, 480] as const, base: "track" as const, y: [-30, 60] as const, scale: [40, 80] as const, clear: 0.6, riders: fromGarden }] : []),
        ],
      }
    },
  })
}
