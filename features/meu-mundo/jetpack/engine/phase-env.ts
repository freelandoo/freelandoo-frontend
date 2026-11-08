// features/meu-mundo/jetpack/engine/phase-env.ts — JETPACK (mm3d-75): o cenário de cada fase.
//
// Fase 01 é o túnel steampunk de sempre (tunnel-view). As outras: um TRECHO
// de 24 m em três variantes, desenhado uma vez e repetido em instâncias que
// pulam para a frente (como o túnel original: ~12 chamadas de desenho para o
// cenário inteiro), mais o MARCO do trecho especial (a árvore oca, a
// fornalha, a caverna de gelo…) que vai para onde a regra gerou o trecho.
//
// A caixa do voo é a mesma em todas (x ∈ [−5, 5], y ∈ [0, 8]): nas fases
// abertas (cânion, cidade) ela fica marcada por pórticos e trilhos acesos nas
// quatro arestas — encostou neles, bateu, como na parede do túnel. Nada aqui
// colide; a colisão é a de sim/flight.ts.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import "@babylonjs/core/Meshes/instancedMesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { createTrimMaterials } from "../../engine/steampunk/materials"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { place, xf, rng, mix, type RGB } from "../../engine/steampunk/scenery"
import { TUNNEL } from "../sim/flight"
import type { PhaseId, SetPiece } from "../sim/phases"
import { buildTunnel, SEG } from "./tunnel-view"
import { JetGeo } from "./jet-geo"
import { buildCanyonEnv } from "./canyon-env"

const { W, H } = TUNNEL

/** Céu, névoa e luzes de cada fase. */
export interface PhaseLook {
  clear: RGB
  fog: RGB
  fogStart: number
  fogEnd: number
  hemi: RGB
  ground: RGB
  hemiK: number
  lamp: RGB
  lampK: number
  ambient: RGB
  /** Câmera da fase (Jetpack 2.0): mais alta, mais atrás e olhando para baixo nas fases abertas. */
  cam?: { up: number; back: number; down: number; ahead: number; maxY: number }
}

export const PHASE_LOOK: Record<PhaseId, PhaseLook> = {
  industrial: { clear: [0.075, 0.052, 0.04], fog: [0.075, 0.052, 0.04], fogStart: 45, fogEnd: 160, hemi: [1, 0.86, 0.68], ground: [0.32, 0.24, 0.2], hemiK: 0.7, lamp: [1, 0.78, 0.5], lampK: 0.9, ambient: [0.3, 0.26, 0.22] },
  canion: {
    clear: [0.45, 0.68, 0.95],
    fog: [0.7, 0.8, 0.92],
    fogStart: 70,
    fogEnd: 230,
    hemi: [1, 0.92, 0.78],
    ground: [0.85, 0.55, 0.38],
    hemiK: 1.05,
    lamp: [1, 0.9, 0.7],
    lampK: 0.2,
    ambient: [0.5, 0.42, 0.36],
    cam: { up: 1.7, back: -0.6, down: 1.3, ahead: 16, maxY: 11.5 },
  },
  orbital: { clear: [0.04, 0.04, 0.12], fog: [0.07, 0.05, 0.16], fogStart: 50, fogEnd: 200, hemi: [0.62, 0.7, 1], ground: [0.3, 0.12, 0.34], hemiK: 0.75, lamp: [0.5, 0.9, 1], lampK: 0.8, ambient: [0.22, 0.22, 0.34] },
  floresta: { clear: [0.03, 0.08, 0.1], fog: [0.04, 0.1, 0.12], fogStart: 35, fogEnd: 150, hemi: [0.55, 0.8, 0.95], ground: [0.22, 0.1, 0.3], hemiK: 0.7, lamp: [0.55, 1, 0.85], lampK: 0.85, ambient: [0.18, 0.24, 0.26] },
  forja: { clear: [0.16, 0.05, 0.03], fog: [0.2, 0.06, 0.03], fogStart: 40, fogEnd: 160, hemi: [1, 0.62, 0.4], ground: [0.6, 0.18, 0.05], hemiK: 0.75, lamp: [1, 0.55, 0.25], lampK: 0.9, ambient: [0.3, 0.18, 0.14] },
  artico: { clear: [0.6, 0.72, 0.84], fog: [0.66, 0.76, 0.86], fogStart: 30, fogEnd: 145, hemi: [0.88, 0.95, 1], ground: [0.45, 0.58, 0.72], hemiK: 0.95, lamp: [0.7, 0.92, 1], lampK: 0.55, ambient: [0.42, 0.48, 0.55] },
  vacuo: { clear: [0.01, 0.01, 0.03], fog: [0.02, 0.02, 0.05], fogStart: 50, fogEnd: 200, hemi: [0.7, 0.7, 1], ground: [0.2, 0.1, 0.3], hemiK: 0.7, lamp: [0.8, 0.7, 1], lampK: 0.8, ambient: [0.2, 0.2, 0.3] },
}

export interface PhaseEnv {
  /** Acabamento e brilho (a mochila e os obstáculos usam os mesmos). */
  mats: { trim: StandardMaterial; glow: StandardMaterial }
  update: (z: number, sets: readonly { z0: number; z1: number; kind: SetPiece }[], now: number) => void
  dispose: () => void
}

type Ctx = { body: JetGeo; glow: JetGeo; glass: JetGeo }

// ── paletas ─────────────────────────────────────────────────────────────────

const C = {
  rock: [0.78, 0.42, 0.22] as RGB,
  rockDark: [0.58, 0.28, 0.15] as RGB,
  sand: [0.88, 0.64, 0.4] as RGB,
  water: [0.18, 0.55, 0.66] as RGB,
  foam: [0.85, 0.95, 1] as RGB,
  metal: [0.42, 0.45, 0.5] as RGB,
  metalDark: [0.2, 0.22, 0.26] as RGB,
  yellow: [1, 0.78, 0.18] as RGB,
  cyan: [0.25, 0.9, 1] as RGB,
  magenta: [1, 0.25, 0.85] as RGB,
  navy: [0.08, 0.1, 0.18] as RGB,
  tower: [0.12, 0.14, 0.24] as RGB,
  moss: [0.08, 0.22, 0.15] as RGB,
  bark: [0.27, 0.17, 0.11] as RGB,
  barkDark: [0.17, 0.1, 0.07] as RGB,
  leaf: [0.06, 0.2, 0.16] as RGB,
  bioCyan: [0.2, 1, 0.85] as RGB,
  bioPurple: [0.75, 0.35, 1] as RGB,
  bioGreen: [0.45, 1, 0.4] as RGB,
  iron: [0.17, 0.14, 0.13] as RGB,
  ironHi: [0.32, 0.27, 0.24] as RGB,
  lava: [1, 0.42, 0.08] as RGB,
  lavaHot: [1, 0.75, 0.3] as RGB,
  crust: [0.12, 0.07, 0.05] as RGB,
  copper: [0.62, 0.34, 0.2] as RGB,
  hazard: [0.95, 0.62, 0.05] as RGB,
  ice: [0.62, 0.8, 0.92] as RGB,
  iceHi: [0.82, 0.92, 0.98] as RGB,
  snow: [0.9, 0.95, 1] as RGB,
  iceGlow: [0.55, 0.95, 1] as RGB,
}

// ── a caixa do voo marcada (pórticos e trilhos acesos) ──────────────────────

function boxMarks(g: Ctx, metal: RGB, light: RGB, every: number, roof = true) {
  for (const sx of [-1, 1]) {
    // trilhos nas quatro arestas
    g.glow.box(0.07, 0.07, SEG, place(sx * (W / 2 + 0.04), 0.03, SEG / 2), light)
    if (roof) g.glow.box(0.07, 0.07, SEG, place(sx * (W / 2 + 0.04), H + 0.04, SEG / 2), light)
  }
  for (let z = every / 2; z < SEG; z += every) {
    for (const sx of [-1, 1]) {
      g.body.box(0.3, H + 0.6, 0.4, place(sx * (W / 2 + 0.2), (H + 0.6) / 2 - 0.3, z), metal)
      g.glow.box(0.08, 0.5, 0.42, place(sx * (W / 2 + 0.05), H - 0.6, z), light)
      g.glow.box(0.08, 0.5, 0.42, place(sx * (W / 2 + 0.05), 0.8, z), light)
    }
    if (roof) {
      g.body.box(W + 0.7, 0.32, 0.4, place(0, H + 0.2, z), metal)
      for (let x = -W / 2 + 1; x < W / 2; x += 2) g.glow.box(0.3, 0.06, 0.3, place(x, H + 0.02, z), light)
    }
  }
}

// ── um trecho de cada fase ──────────────────────────────────────────────────

function orbital(g: Ctx, v: number) {
  const r = rng(202 + v * 31)
  // o deque do corredor de vidro
  g.body.box(W + 0.8, 0.3, SEG, place(0, -0.15, SEG / 2), C.navy)
  for (const sx of [-1, 1]) g.glow.box(0.12, 0.03, SEG, place(sx * (W / 2 - 0.15), 0.01, SEG / 2), C.cyan)
  for (let z = 1; z < SEG; z += 4) g.glow.box(0.12, 0.02, 1.6, place(0, 0.01, z), mix(C.cyan, C.navy, 0.4))
  // vidro (paredes e teto) e as costelas do corredor
  for (const sx of [-1, 1]) g.glass.box(0.04, H, SEG, place(sx * (W / 2 + 0.06), H / 2, SEG / 2), C.cyan)
  g.glass.box(W + 0.2, 0.04, SEG, place(0, H + 0.06, SEG / 2), C.cyan)
  for (let z = 3; z < SEG; z += 6) {
    for (const sx of [-1, 1]) g.body.box(0.22, H + 0.4, 0.3, place(sx * (W / 2 + 0.16), H / 2, z), C.metalDark)
    g.body.box(W + 0.6, 0.26, 0.3, place(0, H + 0.18, z), C.metalDark)
    g.glow.box(W, 0.05, 0.12, place(0, H + 0.03, z), z % 12 < 6 ? C.magenta : C.cyan)
  }
  for (const sx of [-1, 1]) {
    g.glow.box(0.06, 0.06, SEG, place(sx * (W / 2 + 0.04), 0.03, SEG / 2), C.cyan)
    g.glow.box(0.06, 0.06, SEG, place(sx * (W / 2 + 0.04), H + 0.04, SEG / 2), C.magenta)
  }
  // os pilares que seguram o corredor e a cidade lá embaixo e dos lados
  g.body.box(1.2, 40, 1.2, place(0, -20.3, 12), C.metalDark)
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const w = 6 + r() * 10
      const x = sx * (14 + k * 16 + r() * 8)
      const top = -10 + r() * 70
      const bottom = -90
      const h = top - bottom
      const z = r() * SEG
      g.body.box(w, h, w, place(x, bottom + h / 2, z), mix(C.tower, C.navy, r()))
      for (let y = top - 3; y > Math.max(bottom, -40); y -= 3.2) {
        if (r() < 0.55) g.glow.box(w + 0.05, 0.25, 0.1, place(x, y, z - w / 2 - 0.02), r() < 0.5 ? C.cyan : r() < 0.5 ? C.magenta : C.yellow)
      }
      if (r() < 0.35) g.glow.box(w * 0.7, w * 0.45, 0.1, place(x - sx * 0, top - 6, z - w / 2 - 0.1), mix(C.magenta, C.cyan, r()))
    }
    // tráfego: luzes que cruzam ao longe
    for (let i = 0; i < 4; i++) g.glow.box(0.6, 0.3, 1.4, place(sx * (9 + r() * 30), -6 + r() * 26, r() * SEG), r() < 0.5 ? C.yellow : C.magenta)
  }
}

function floresta(g: Ctx, v: number) {
  const r = rng(303 + v * 13)
  g.body.box(W + 40, 0.5, SEG, place(0, -0.25, SEG / 2), C.moss)
  // musgo aceso rente ao chão (nunca dentro da caixa)
  for (let i = 0; i < 10; i++) g.glow.box(0.5 + r(), 0.03, 0.5 + r(), place(-W / 2 + r() * W, 0.015, r() * SEG), mix(C.bioCyan, C.moss, 0.55))
  // troncos gigantes dos lados, com anéis de musgo
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const d = 3 + r() * 3.5
      const x = sx * (W / 2 + 1.2 + d / 2 + r() * 4)
      const z = (k + r() * 0.6) * (SEG / 2)
      g.body.cylinder(d, 34, place(x, 16, z), r() < 0.5 ? C.bark : C.barkDark, 10)
      g.glow.cylinder(d * 1.03, 0.25, place(x, 2 + r() * 4, z), r() < 0.5 ? C.bioCyan : C.bioPurple, 10)
      // raízes no chão
      for (let j = 0; j < 3; j++) g.body.box(0.6, 0.5, d * 1.2, xf(x - sx * d * 0.5, 0.2, z + (j - 1) * 0.9, sx * (0.6 + j * 0.3)), C.barkDark)
    }
  }
  // galhos atravessados no alto marcam o teto; copas acima
  for (let z = 4; z < SEG; z += 8) {
    g.body.cylinder(0.9, W + 3, xf(0, H + 0.55, z, 0, undefined, 0, Math.PI / 2), C.bark, 8)
    for (let x = -W / 2 + 0.8; x < W / 2; x += 1.6) g.glow.sphere(0.22, [1, 1, 1], place(x, H + 0.12, z + 0.3), r() < 0.5 ? C.bioCyan : C.bioGreen, 4)
  }
  for (let i = 0; i < 5; i++) g.body.sphere(9 + r() * 6, [1, 0.45, 1], place(-14 + r() * 28, 13 + r() * 4, r() * SEG), C.leaf, 6)
  for (const sx of [-1, 1]) {
    g.glow.box(0.06, 0.06, SEG, place(sx * (W / 2 + 0.04), 0.03, SEG / 2), mix(C.bioCyan, C.moss, 0.3))
  }
  // cogumelos gigantes ao longe e cristais
  for (const sx of [-1, 1]) {
    const x = sx * (16 + r() * 22)
    const h = 6 + r() * 12
    const d = 6 + r() * 8
    const z = r() * SEG
    g.body.cylinder(d * 0.22, h, place(x, h / 2, z), [0.75, 0.72, 0.85], 8)
    g.body.sphere(d, [1, 0.38, 1], place(x, h, z), r() < 0.5 ? [0.45, 0.18, 0.6] : [0.12, 0.35, 0.55], 8)
    g.glow.cylinder(d * 0.86, 0.2, place(x, h - d * 0.12, z), r() < 0.5 ? C.bioPurple : C.bioCyan, 12)
    for (let j = 0; j < 2; j++) g.glow.cone(0, 0.6 + r() * 0.6, 1.5 + r() * 2, place(sx * (W / 2 + 2 + r() * 6), 0.8, r() * SEG), r() < 0.5 ? C.bioPurple : C.bioCyan, 5)
  }
}

function forja(g: Ctx, v: number) {
  const r = rng(404 + v * 19)
  // lava lá embaixo, com crosta
  g.glow.box(W + 60, 0.2, SEG, place(0, -2.6, SEG / 2), C.lava)
  for (let i = 0; i < 10; i++) g.body.box(1 + r() * 4, 0.2, 1 + r() * 4, place(-25 + r() * 50, -2.4, r() * SEG), C.crust)
  // a grade do piso (o topo em y = 0) e as vigas laterais
  for (let x = -W / 2; x <= W / 2 + 0.01; x += 0.62) g.body.box(0.12, 0.3, SEG, place(x, -0.15, SEG / 2), C.iron)
  for (let z = 0.5; z < SEG; z += 1.5) g.body.box(W, 0.18, 0.12, place(0, -0.2, z), C.ironHi)
  // colunas com faixa de perigo, treliça do teto e canos
  for (let z = 3; z < SEG; z += 6) {
    for (const sx of [-1, 1]) {
      g.body.box(0.5, H + 3, 0.5, place(sx * (W / 2 + 0.3), (H + 3) / 2 - 2.5, z), C.iron)
      for (let y = 0.4; y < 2; y += 0.5) g.body.box(0.52, 0.22, 0.52, place(sx * (W / 2 + 0.3), y, z), y % 1 < 0.5 ? C.hazard : C.crust)
      g.glow.box(0.1, 0.3, 0.3, place(sx * (W / 2 + 0.03), H - 1, z), C.lavaHot)
    }
    g.body.box(W + 1.2, 0.5, 0.4, place(0, H + 0.3, z), C.iron)
    g.body.box(0.3, 0.3, 6, place(-W / 4, H + 0.6, z + 3), C.ironHi)
    g.body.box(0.3, 0.3, 6, place(W / 4, H + 0.6, z + 3), C.ironHi)
  }
  g.body.tube([-W / 2 + 0.8, H + 0.9, 0], [-W / 2 + 0.8, H + 0.9, SEG], 0.3, C.copper, 8)
  g.body.tube([W / 2 - 1.4, H + 1, 0], [W / 2 - 1.4, H + 1, SEG], 0.22, C.copper, 8)
  for (const sx of [-1, 1]) g.glow.box(0.06, 0.06, SEG, place(sx * (W / 2 + 0.04), 0.03, SEG / 2), C.lavaHot)
  // ao longe: cascatas de lava, chaminés e engrenagens gigantes
  for (const sx of [-1, 1]) {
    const x = sx * (20 + r() * 18)
    g.body.box(14, 50, 12, place(sx * 48, 20, SEG / 2), C.crust)
    if (r() < 0.8) g.glow.box(2 + r() * 3, 34, 0.5, place(x, 14, r() * SEG), C.lava)
    const cx = sx * (14 + r() * 10)
    const ch = 14 + r() * 18
    g.body.cylinder(2.4, ch, place(cx, ch / 2 - 2, r() * SEG), C.ironHi, 10)
    g.glow.cylinder(2.5, 0.5, place(cx, ch - 2, r() * SEG), C.lavaHot, 10)
    if (v !== 1) g.body.gear(4 + r() * 3, 0.8, 14, xf(sx * 15, 10 + r() * 6, r() * SEG, 0, undefined, 0, Math.PI / 2), C.ironHi, C.copper)
  }
}

function artico(g: Ctx, v: number) {
  const r = rng(505 + v * 23)
  g.body.box(W + 4, 0.5, SEG, place(0, -0.25, SEG / 2), C.snow)
  // paredes de gelo em blocos
  for (const sx of [-1, 1]) {
    let z = 0
    while (z < SEG) {
      const len = 2 + r() * 4
      const w = 1.2 + r() * 2.5
      const h = H + 1.5 + r() * 2
      g.body.box(w, h, len, place(sx * (W / 2 + 0.06 + w / 2), h / 2 - 0.4, z + len / 2), r() < 0.5 ? C.ice : C.iceHi)
      z += len
    }
    for (let i = 0; i < 3; i++) g.glow.box(0.05, 0.4 + r(), 0.6 + r(), place(sx * (W / 2 + 0.05), 1 + r() * (H - 2), r() * SEG), C.iceGlow)
  }
  // teto de gelo com pingentes (as pontas ficam acima da caixa)
  g.body.box(W + 4, 0.8, SEG, place(0, H + 0.45, SEG / 2), C.ice)
  for (let i = 0; i < 12; i++) {
    const l = 0.4 + r() * 0.9
    g.body.cone(0.35 + r() * 0.3, 0, l, place(-W / 2 + 0.4 + r() * (W - 0.8), H + 0.08 + l / 2, r() * SEG), C.iceHi, 5)
  }
  // costelas de metal com luz ciano a cada 12 m
  for (let z = 6; z < SEG; z += 12) {
    for (const sx of [-1, 1]) {
      g.body.box(0.3, H + 0.4, 0.4, place(sx * (W / 2 + 0.17), H / 2, z), C.metal)
      g.glow.box(0.08, H - 1, 0.1, place(sx * (W / 2 + 0.03), H / 2, z), C.cyan)
    }
    g.body.box(W + 0.6, 0.3, 0.4, place(0, H + 0.17, z), C.metal)
  }
  for (const sx of [-1, 1]) {
    g.glow.box(0.06, 0.06, SEG, place(sx * (W / 2 + 0.04), 0.03, SEG / 2), C.iceGlow)
    g.glow.box(0.06, 0.06, SEG, place(sx * (W / 2 + 0.04), H + 0.04, SEG / 2), C.iceGlow)
  }
  // flocos (a tempestade): pontos claros parados no ar fora da caixa
  for (let i = 0; i < 6; i++) g.glow.box(0.08, 0.08, 0.08, place((r() < 0.5 ? -1 : 1) * (W / 2 + 0.5 + r()), r() * H, r() * SEG), C.snow)
}

const SEGMENTS: Partial<Record<PhaseId, (g: Ctx, v: number) => void>> = { orbital, floresta, forja, artico, vacuo: orbital }

// ── o marco do trecho especial ──────────────────────────────────────────────

/** Desenha o marco de z = 0 a z = len (é posto onde a regra gerou o trecho). */
function landmark(g: Ctx, id: PhaseId, len: number) {
  const r = rng(909)
  // um tubo de aduelas em volta da caixa (de dentro se vê a face interna)
  const staves = (rad: number, color: RGB, alt: RGB, light: RGB | null) => {
    const n = 22
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const x = Math.cos(a) * rad
      const y = H / 2 + Math.sin(a) * rad
      if (y < -1) continue
      g.body.box((2 * Math.PI * rad) / n + 0.05, 0.8, len, xf(x, y, len / 2, 0, undefined, 0, a + Math.PI / 2), i % 2 ? color : alt)
      if (light && i % 3 === 0) g.glow.box(0.25, 0.12, len, xf(x * 0.94, H / 2 + (y - H / 2) * 0.94, len / 2, 0, undefined, 0, a + Math.PI / 2), light)
    }
  }
  switch (id) {
    case "canion":
      // a grande cachoeira atrás dos três anéis, entre dois paredões
      for (const sx of [-1, 1]) g.body.box(16, 60, 18, place(sx * 22, 26, len * 0.8), C.rockDark)
      g.body.box(60, 20, 14, place(0, 58, len * 0.8 + 10), C.rock)
      g.glow.box(26, 52, 0.6, place(0, 22, len + 18), mix(C.foam, C.water, 0.2))
      for (let i = 0; i < 8; i++) g.glow.box(1 + r() * 2, 0.4, 1 + r() * 2, place(-12 + r() * 24, 0.05, len + 10 + r() * 8), C.foam)
      break
    case "orbital":
      // o portal holográfico na entrada e a fila de painéis
      g.glow.box(0.4, H + 6, 0.4, place(-W / 2 - 1.5, (H + 6) / 2, 0), C.magenta)
      g.glow.box(0.4, H + 6, 0.4, place(W / 2 + 1.5, (H + 6) / 2, 0), C.magenta)
      g.glow.box(W + 3.4, 0.4, 0.4, place(0, H + 6, 0), C.cyan)
      for (let z = 8; z < len; z += 16) for (const sx of [-1, 1]) g.glow.box(0.1, 3, 6, place(sx * 9, H / 2, z), mix(C.cyan, C.magenta, r()))
      break
    case "floresta":
      // por dentro da árvore gigante: casca, veios acesos e a saída
      staves(7.6, C.bark, C.barkDark, C.bioCyan)
      break
    case "forja":
      // a fornalha: tijolo escuro com brasa nas juntas e a boca acesa
      staves(7.4, C.crust, C.iron, C.lava)
      g.glow.box(W + 6, 1.2, 1, place(0, H + 2, 0), C.lavaHot)
      break
    case "artico":
      // a caverna de gelo e o grande arco congelado no fim
      staves(8, C.ice, C.iceHi, C.iceGlow)
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (i / 8)
        g.body.box(2.2, 2.2, 2.2, xf(Math.cos(a) * 7.2, H / 2 + Math.sin(a) * 7.2, len, 0, undefined, 0, a), C.iceHi)
      }
      break
    default:
      break
  }
}

// ── montar ──────────────────────────────────────────────────────────────────

export function buildPhaseEnv(scene: Scene, id: PhaseId, low: boolean, slots: number, seed = 1): PhaseEnv {
  // Jetpack 2.0: o Cânion é a primeira fase no cenário novo (módulos variados pela semente)
  if (id === "canion") {
    const c = buildCanyonEnv(scene, low, slots, seed)
    return { mats: c.mats, update: (z, _sets, now) => c.update(z, now), dispose: () => c.dispose() }
  }
  if (id === "industrial" || !SEGMENTS[id]) {
    const t = buildTunnel(scene, low, slots)
    return { mats: { trim: t.stage.mats.trim, glow: t.stage.mats.glow }, update: (z) => t.update(z), dispose: () => t.dispose() }
  }
  const mats = createTrimMaterials(scene, low ? "low" : "mid")
  const glassMat = new StandardMaterial("jt-glass", scene)
  glassMat.diffuseColor = new Color3(0.1, 0.2, 0.3)
  glassMat.emissiveColor = new Color3(0.05, 0.25, 0.35)
  glassMat.specularColor = new Color3(0.4, 0.5, 0.6)
  glassMat.alpha = 0.13
  glassMat.backFaceCulling = false
  glassMat.disableDepthWrite = true
  const fill = SEGMENTS[id]!
  const VARIANTS = 3
  const sources: Mesh[][] = []
  const all: Mesh[] = []
  const make = (name: string, fn: (g: Ctx) => void): Mesh[] => {
    const g: Ctx = { body: new JetGeo(), glow: new JetGeo(), glass: new JetGeo() }
    g.glow.uv = "flat"
    g.glass.uv = "flat"
    fn(g)
    const list: Mesh[] = []
    for (const [geo, mat, layer] of [
      [g.body, mats.trim, "body"],
      [g.glow, mats.glow, "glow"],
      [g.glass, glassMat, "glass"],
    ] as const) {
      if (!geo.vertexCount) continue
      const m = geo.build(`${name}-${layer}`, scene, mat, false)
      m.isPickable = false
      list.push(m)
      all.push(m)
    }
    return list
  }
  for (let v = 0; v < VARIANTS; v++) sources.push(make(`jt-${id}-seg${v}`, (g) => fill(g, v)))
  const LM = 100
  const marks = make(`jt-${id}-landmark`, (g) => landmark(g, id, LM))
  const markNode = new TransformNode(`jt-${id}-landmark`, scene)
  for (const m of marks) m.parent = markNode
  markNode.setEnabled(false)
  mats.glow.emissiveColor.set(1.05, 1.05, 1.05)
  mats.freeze()

  const n = Math.ceil(slots / VARIANTS) * VARIANTS
  const nodes: TransformNode[] = []
  const insts: InstancedMesh[] = []
  for (let k = 0; k < n; k++) {
    const node = new TransformNode(`jt-slot-${k}`, scene)
    nodes.push(node)
    for (const src of sources[k % VARIANTS]) {
      if (k < VARIANTS) src.parent = node
      else {
        const inst = src.createInstance(`${src.name}-i${k}`)
        inst.parent = node
        inst.isPickable = false
        insts.push(inst)
      }
    }
    node.position.z = k * SEG
  }

  let markAt = NaN
  return {
    mats,
    update(z, sets) {
      const first = Math.floor(z / SEG) - 1
      for (let k = 0; k < n; k++) {
        const s = first + ((((k - first) % n) + n) % n)
        nodes[k].position.z = s * SEG
      }
      // o marco do trecho especial mais próximo (à frente ou em que se está)
      let want = NaN
      let len = LM
      for (const s of sets) {
        if (s.z1 < z - 20) continue
        if (s.z0 > z + 260) break
        want = s.z0
        len = s.z1 - s.z0
        break
      }
      if (want !== markAt) {
        markAt = want
        markNode.setEnabled(Number.isFinite(want))
        if (Number.isFinite(want)) {
          markNode.position.z = want
          markNode.scaling.z = Math.max(0.6, len / LM)
        }
      }
    },
    dispose() {
      for (const i of insts) i.dispose()
      for (const m of all) m.dispose()
      for (const node of nodes) node.dispose()
      markNode.dispose()
      glassMat.dispose()
      mats.dispose()
    },
  }
}

