// features/meu-mundo/gincana/engine/backdrops.ts — GINCANA 2.0 (2026-11-16): o cenário em volta de cada Domínio.
//
// Só desenho, longe de quem corre (|x| ≥ 14): a regra e a colisão seguem em
// sim/courses.ts. Em código, sem Tripo (a regra dos minijogos desde 14/11):
// árvores gigantes, cogumelos acesos e a lua (Floresta); mesas listradas e
// pedras flutuando (Cânion); planeta com anel, torres de neon e estrelas
// (Orbital); vulcões com cratera acesa e chaminés (Forja); a fábrica do kit
// steampunk (Fábrica); icebergs, montanhas nevadas e aurora (Mar de Gelo).
// `lit` = malha com luz (cor por vértice); `glow` = malha sem luz (brilha).

import { SoftGeo, at, mix, stripesY, type RGB } from "./shapes"
import { SP, factorySkyline, smokestack, pipeRun, type SteamCtx } from "../../engine/steampunk/scenery"
import type { GincanaDeco } from "./phase-themes"

/** Pseudo-aleatório determinístico (o cenário é igual em todo aparelho). */
function rnd(i: number, k = 0) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Lados da prova: devolve x a `d` metros do eixo, alternando. */
const side = (i: number, d: number) => (i % 2 ? d : -d)

/** O meio da prova (z) e até onde o cenário vai. */
const Z0 = -40
const Z1 = 300

export function buildBackdrop(deco: GincanaDeco, lit: SoftGeo, glow: SoftGeo, ctx: SteamCtx, low: boolean) {
  const n = low ? 0.6 : 1
  switch (deco) {
    case "forest":
      return forest(lit, glow, n)
    case "canyon":
      return canyon(lit, glow, n)
    case "orbital":
      return orbital(lit, glow, n)
    case "forge":
      return forge(lit, glow, ctx, n)
    case "factory":
      return factory(lit, glow, ctx, n)
    case "ice":
      return ice(lit, glow, n)
    default:
      return
  }
}

// ── Floresta da Lua ──────────────────────────────────────────────────────────

function forest(lit: SoftGeo, glow: SoftGeo, n: number) {
  const bark: RGB = [0.24, 0.16, 0.12]
  const leaf: RGB = [0.1, 0.24, 0.16]
  const count = Math.round(34 * n)
  for (let i = 0; i < count; i++) {
    const x = side(i, 24 + rnd(i) * 46)
    const z = Z0 + (i / count) * (Z1 - Z0) + rnd(i, 1) * 8
    const h = 22 + rnd(i, 2) * 18
    const d = 2.4 + rnd(i, 3) * 2.2
    lit.cylinder(d, h, at(x, h / 2 - 2, z), stripesY(bark, mix(bark, [0, 0, 0], 0.3), 2.2, 0.6), 10, d * 0.7)
    // raízes que saem do pântano
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + i
      lit.capsule(0.45, 4, at(x + Math.sin(a) * d * 0.8, 0.6, z + Math.cos(a) * d * 0.8, a, 0.9, 0), bark, 6)
    }
    for (let k = 0; k < 3; k++) {
      const s = 10 + rnd(i, 4 + k) * 8
      lit.sphere(s, at(x + (rnd(i, 7 + k) - 0.5) * 6, h - 2 + k * 3, z + (rnd(i, 9 + k) - 0.5) * 6), mix(leaf, [0.2, 0.4, 0.3], rnd(i, k)), 8, 1, 0.7, 1)
    }
  }
  // cogumelos acesos nas ilhotas (rosa e ciano), longe do caminho
  const shrooms = Math.round(26 * n)
  for (let i = 0; i < shrooms; i++) {
    const x = side(i + 1, 15 + rnd(i, 11) * 10)
    const z = Z0 + 10 + (i / shrooms) * (Z1 - Z0 - 20)
    const h = 1.2 + rnd(i, 12) * 2.6
    const cap: RGB = i % 3 ? [0.95, 0.35, 0.75] : [0.3, 0.95, 0.9]
    lit.cylinder(2.6 + h, 0.8, at(x, 0.2, z), [0.16, 0.22, 0.16], 10)
    lit.cylinder(0.5 + h * 0.12, h, at(x, h / 2 + 0.5, z), [0.86, 0.84, 0.74], 8)
    glow.sphere(1.4 + h * 0.7, at(x, h + 0.6, z), cap, 8, 1, 0.5, 1)
  }
  // a lua (Floresta da Lua) e um anel de vaga-lumes grandes no céu
  glow.sphere(70, at(-150, 120, 360), [0.86, 0.92, 1], 16)
  for (let i = 0; i < Math.round(40 * n); i++) {
    glow.sphere(0.35, at(side(i, 8 + rnd(i, 20) * 18), 3 + rnd(i, 21) * 7, Z0 + rnd(i, 22) * (Z1 - Z0)), [0.8, 1, 0.5], 3)
  }
}

// ── Cânion ───────────────────────────────────────────────────────────────────

function canyon(lit: SoftGeo, glow: SoftGeo, n: number) {
  const bands: RGB[] = [
    [0.7, 0.36, 0.2],
    [0.82, 0.52, 0.3],
    [0.6, 0.28, 0.18],
    [0.88, 0.66, 0.42],
  ]
  const count = Math.round(22 * n)
  for (let i = 0; i < count; i++) {
    const x = side(i, 34 + rnd(i) * 70)
    const z = Z0 + (i / count) * (Z1 - Z0) + rnd(i, 1) * 10
    const w = 14 + rnd(i, 2) * 22
    const h = 26 + rnd(i, 3) * 40
    const layers = 3 + Math.floor(rnd(i, 4) * 3)
    let y = -30
    for (let k = 0; k < layers; k++) {
      const lh = (h + 30) / layers
      const sc = 1 - k * 0.12
      lit.cylinder(w * sc, lh, at(x, y + lh / 2, z, rnd(i, 5 + k) * 3), bands[(i + k) % bands.length], 7, w * sc * 0.92)
      y += lh
    }
    lit.cylinder(w * (1 - layers * 0.12), 1.2, at(x, y + 0.6, z), [0.5, 0.42, 0.24], 7)
  }
  // pedras flutuando sobre o abismo
  for (let i = 0; i < Math.round(26 * n); i++) {
    const x = side(i + 1, 16 + rnd(i, 30) * 40)
    const z = Z0 + rnd(i, 31) * (Z1 - Z0)
    const y = 8 + rnd(i, 32) * 30
    const s = 3 + rnd(i, 33) * 7
    lit.sphere(s, at(x, y, z, rnd(i, 34) * 6), bands[i % 4], 6, 1.2, 0.55, 1)
    lit.cylinder(s * 0.5, s * 0.6, at(x, y - s * 0.35, z), mix(bands[i % 4], [0, 0, 0], 0.3), 6, s * 0.9)
  }
  // brasas de sol no fundo do abismo
  for (let i = 0; i < Math.round(30 * n); i++) glow.sphere(0.5, at(side(i, 6 + rnd(i, 40) * 20), -6 - rnd(i, 41) * 10, Z0 + rnd(i, 42) * (Z1 - Z0)), [1, 0.6, 0.3], 3)
}

// ── Cidade Orbital ───────────────────────────────────────────────────────────

function orbital(lit: SoftGeo, glow: SoftGeo, n: number) {
  // planeta com faixas e o anel
  lit.sphere(170, at(170, 40, 420), stripesY([0.42, 0.3, 0.7], [0.66, 0.42, 0.78], 18, 0.1), 20)
  glow.torus(300, 4, at(170, 40, 420, 0.3, 0.35, 0.2), [0.5, 0.8, 1], 48)
  glow.sphere(30, at(-160, 90, 260), [1, 0.86, 0.6], 12)
  // torres com faixas de neon
  const count = Math.round(20 * n)
  for (let i = 0; i < count; i++) {
    const x = side(i, 30 + rnd(i) * 50)
    const z = Z0 + (i / count) * (Z1 - Z0) + rnd(i, 1) * 8
    const w = 5 + rnd(i, 2) * 7
    const h = 18 + rnd(i, 3) * 40
    const y0 = -10 - rnd(i, 4) * 10
    lit.roundBox(w, h, w, 0.6, at(x, y0 + h / 2, z, rnd(i, 5)), [0.82, 0.86, 0.94], 4)
    const neon: RGB = i % 3 === 0 ? [1, 0.3, 0.75] : i % 3 === 1 ? [0.3, 0.9, 1] : [0.7, 0.5, 1]
    for (let k = 1; k <= 3; k++) glow.roundBox(w + 0.3, 0.35, w + 0.3, 0.1, at(x, y0 + (h * k) / 4, z, rnd(i, 5)), neon, 2)
    glow.sphere(1.2, at(x, y0 + h + 1, z), neon, 6)
  }
  // anéis de tráfego (aros acesos) e discos flutuantes
  for (let i = 0; i < Math.round(8 * n); i++) {
    glow.torus(10 + rnd(i, 50) * 8, 0.4, at(side(i, 22 + rnd(i, 51) * 20), 12 + rnd(i, 52) * 18, Z0 + 20 + i * 38, 0, Math.PI / 2, 0), [0.4, 0.9, 1], 24)
  }
  // estrelas
  for (let i = 0; i < Math.round(160 * n); i++) {
    const a = rnd(i, 60) * Math.PI * 2
    const e = 0.08 + rnd(i, 61) * 1.3
    const r = 520
    glow.sphere(1.2 + rnd(i, 62) * 1.6, at(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r - 40, 130 + Math.sin(a) * Math.cos(e) * r), [1, 1, 1], 3)
  }
}

// ── Forja ────────────────────────────────────────────────────────────────────

function forge(lit: SoftGeo, glow: SoftGeo, ctx: SteamCtx, n: number) {
  const rock: RGB = [0.16, 0.12, 0.11]
  const count = Math.round(8 * n)
  for (let i = 0; i < count; i++) {
    const x = side(i, 70 + rnd(i) * 70)
    const z = Z0 + (i / count) * (Z1 - Z0) + 20
    const d = 60 + rnd(i, 2) * 40
    const h = 40 + rnd(i, 3) * 30
    lit.cylinder(d, h, at(x, h / 2 - 2, z), stripesY(rock, [0.24, 0.16, 0.12], 6, 0.2), 12, d * 0.22)
    glow.cylinder(d * 0.2, 1.2, at(x, h - 1.4, z), [1, 0.5, 0.1], 12)
    // rios de lava descendo
    for (let k = 0; k < 2; k++) {
      const a = (k ? 0.6 : -0.6) + (x > 0 ? Math.PI : 0)
      const len = h * 0.9
      glow.capsule(0.9, len, at(x + Math.sin(a) * d * 0.25, h * 0.5, z + Math.cos(a) * d * 0.25, a, 0.85, 0), [1, 0.4, 0.05], 6)
    }
  }
  // chaminés da forja, rochas e braseiros perto do caminho
  for (let i = 0; i < Math.round(10 * n); i++) smokestack(ctx, side(i, 26 + rnd(i, 10) * 18), Z0 + 20 + i * 32, 18 + rnd(i, 11) * 14, 1.4 + rnd(i, 12), 0)
  for (let i = 0; i < Math.round(24 * n); i++) {
    const x = side(i + 1, 15 + rnd(i, 20) * 12)
    const z = Z0 + rnd(i, 21) * (Z1 - Z0)
    const s = 2 + rnd(i, 22) * 4
    lit.sphere(s, at(x, 0.2, z, rnd(i, 23) * 5), rock, 6, 1.2, 0.7, 1)
    if (i % 3 === 0) glow.sphere(s * 0.35, at(x, s * 0.4, z), [1, 0.55, 0.1], 5)
  }
  // brasas no ar
  for (let i = 0; i < Math.round(60 * n); i++) glow.sphere(0.22, at(side(i, 4 + rnd(i, 30) * 30), 2 + rnd(i, 31) * 22, Z0 + rnd(i, 32) * (Z1 - Z0)), [1, 0.62, 0.2], 3)
}

// ── Fábrica ──────────────────────────────────────────────────────────────────

function factory(lit: SoftGeo, glow: SoftGeo, ctx: SteamCtx, n: number) {
  // a silhueta de fábricas do kit steampunk dos dois lados
  factorySkyline(ctx, -95, 130, 50, Math.round(12 * n), -2, 21, 1.4)
  factorySkyline(ctx, 95, 130, 50, Math.round(12 * n), -2, 37, 1.4)
  for (let i = 0; i < Math.round(8 * n); i++) smokestack(ctx, side(i, 34 + rnd(i, 3) * 16), Z0 + 30 + i * 40, 26 + rnd(i, 4) * 16, 2 + rnd(i, 5), -2)
  // canos ao longo do canal de óleo
  for (const s of [-1, 1]) {
    pipeRun(ctx, [[s * 18, 1.5, Z0], [s * 18, 1.5, Z1]], 0.8, SP.copper)
    pipeRun(ctx, [[s * 20, 3.2, Z0], [s * 20, 3.2, Z1]], 0.55, SP.brass)
  }
  // engrenagens gigantes paradas e placas de perigo
  for (let i = 0; i < Math.round(10 * n); i++) {
    const x = side(i, 24 + rnd(i, 7) * 10)
    const z = Z0 + 15 + i * 30
    const r = 4 + rnd(i, 8) * 5
    lit.cylinder(r * 2, 1, at(x, r + 1, z, 0, 0, Math.PI / 2), stripesY(SP.iron, SP.steel, 1.4, 0), 18)
    glow.sphere(0.8, at(x, r * 2 + 2, z), [1, 0.75, 0.2], 5)
  }
  for (let i = 0; i < Math.round(30 * n); i++) lit.roundBox(2, 2, 2, 0.15, at(side(i + 1, 14 + rnd(i, 9) * 6), 0.4, Z0 + rnd(i, 10) * (Z1 - Z0), rnd(i, 11)), stripesY([0.9, 0.7, 0.1], [0.12, 0.12, 0.12], 0.5, 1), 2)
}

// ── Mar de Gelo ──────────────────────────────────────────────────────────────

function ice(lit: SoftGeo, glow: SoftGeo, n: number) {
  const white: RGB = [0.92, 0.96, 1]
  const blue: RGB = [0.6, 0.78, 0.94]
  // montanhas nevadas ao longe
  for (let i = 0; i < Math.round(10 * n); i++) {
    const x = side(i, 110 + rnd(i) * 60)
    const z = Z0 + i * 36
    const d = 70 + rnd(i, 2) * 50
    const h = 50 + rnd(i, 3) * 40
    lit.cylinder(d, h, at(x, h / 2 - 4, z), (_x, y) => (y > h * 0.1 ? white : [0.4, 0.48, 0.58]), 9, 2)
  }
  // icebergs no mar
  for (let i = 0; i < Math.round(30 * n); i++) {
    const x = side(i + 1, 18 + rnd(i, 10) * 50)
    const z = Z0 + rnd(i, 11) * (Z1 - Z0)
    const w = 4 + rnd(i, 12) * 10
    const h = 3 + rnd(i, 13) * 12
    lit.cylinder(w, h, at(x, h / 2 - 0.5, z, rnd(i, 14) * 3), mix(white, blue, rnd(i, 15) * 0.6), 5 + (i % 3), w * (0.3 + rnd(i, 16) * 0.4))
  }
  // cristais acesos perto do caminho
  for (let i = 0; i < Math.round(20 * n); i++) {
    const x = side(i, 14 + rnd(i, 20) * 6)
    const z = Z0 + 10 + rnd(i, 21) * (Z1 - Z0 - 20)
    const h = 2 + rnd(i, 22) * 4
    glow.cylinder(0.9, h, at(x, h / 2, z, 0, (rnd(i, 23) - 0.5) * 0.5, (rnd(i, 24) - 0.5) * 0.5), [0.6, 0.9, 1], 5, 0.05)
  }
}

/** Aurora (só no Mar de Gelo, à noite): faixas acesas no alto. */
export function buildAurora(g: SoftGeo) {
  for (let i = 0; i < 5; i++) {
    const z = 60 + i * 60
    for (let k = 0; k < 9; k++) {
      const x = -120 + k * 30
      const h = 26 + Math.sin(k * 1.3 + i) * 8
      g.roundBox(28, h, 0.4, 0.1, at(x, 70 + h / 2 + Math.sin(k + i) * 6, z + Math.sin(k * 0.7 + i) * 18, Math.sin(k + i * 2) * 0.4), k % 2 ? [0.3, 1, 0.6] : [0.3, 0.8, 1], 2)
    }
  }
}
