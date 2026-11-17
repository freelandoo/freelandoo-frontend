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
  // ilhas de pedra com musgo e cachoeira verde acesa (perto o bastante para ler)
  for (let i = 0; i < Math.round(12 * n); i++) {
    const x = side(i, 22 + rnd(i, 70) * 18)
    const z = Z0 + 15 + i * 28
    const w = 8 + rnd(i, 71) * 8
    const h = 4 + rnd(i, 72) * 6
    lit.cylinder(w, h, at(x, h / 2 - 1, z, rnd(i, 73) * 3), stripesY([0.32, 0.3, 0.42], [0.26, 0.24, 0.36], 1.6, 0.4), 7, w * 0.86)
    lit.cylinder(w * 0.9, 0.7, at(x, h - 0.6, z), [0.16, 0.42, 0.22], 7)
    const fx = x - Math.sign(x) * w * 0.44
    glow.roundBox(2.2, h, 0.8, 0.4, at(fx, h / 2 - 0.6, z), [0.45, 1, 0.6], 2)
    glow.cylinder(5, 0.2, at(fx - Math.sign(x) * 1.2, 0.15, z), [0.6, 1, 0.7], 10)
  }
  // vitórias-régias com flor de lótus acesa no pântano
  for (let i = 0; i < Math.round(60 * n); i++) {
    const x = side(i + 1, 13 + rnd(i, 90) * 22)
    const z = Z0 + rnd(i, 91) * (Z1 - Z0)
    const r = 1.2 + rnd(i, 92) * 1.6
    lit.cylinder(r * 2, 0.12, at(x, 0.1, z), [0.18, 0.5, 0.24], 9)
    if (i % 3 === 0) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        glow.sphere(0.6, at(x + Math.cos(a) * 0.3, 0.45, z + Math.sin(a) * 0.3, a, 0.6, 0), [0.95, 0.5, 0.95], 5, 0.5, 1, 1.4)
      }
      glow.sphere(0.35, at(x, 0.55, z), [1, 0.9, 0.4], 5)
    }
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
    const topW = w * (1 - layers * 0.12)
    lit.cylinder(topW, 1.2, at(x, y + 0.6, z), [0.5, 0.42, 0.24], 7)
    // uma árvore de copa chata no topo (acácia) e, numa a cada duas, a cachoeira que cai do lado da prova
    const tx = x + (rnd(i, 12) - 0.5) * topW * 0.4
    lit.cylinder(0.9, 4, at(tx, y + 3, z), [0.36, 0.24, 0.14], 6, 0.6)
    lit.sphere(topW * 0.32, at(tx, y + 5.2, z), [0.42, 0.56, 0.2], 8, 1, 0.32, 1)
    if (i % 2 === 0) {
      const fx = x - Math.sign(x) * topW * 0.46
      glow.roundBox(2.6, y + 30, 1.2, 0.5, at(fx, (y - 30) / 2 + 0.4, z), (_x, yy) => mix([0.7, 0.92, 1], [1, 1, 1], ((yy * 0.35) % 1 + 1) % 1 > 0.5 ? 0.6 : 0), 3)
    }
  }
  // mar de nuvens embaixo da prova (o abismo some nas nuvens, como na referência)
  for (let i = 0; i < Math.round(70 * n); i++) {
    const x = side(i, 4 + rnd(i, 80) * 90)
    const z = Z0 + rnd(i, 81) * (Z1 - Z0 + 60)
    const s = 12 + rnd(i, 82) * 16
    lit.sphere(s, at(x, -4.5 + rnd(i, 83) * 3, z), mix([1, 0.86, 0.86], [0.98, 0.96, 1], rnd(i, 84)), 6, 1, 0.42, 1)
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
  // ilhas-cidade flutuando: disco com torres, a ponta embaixo e o anel aceso (referência da Orbital)
  for (let i = 0; i < Math.round(7 * n); i++) {
    const x = side(i + 1, 34 + rnd(i, 120) * 40)
    const z = Z0 + 30 + i * 45
    const y = 6 + rnd(i, 121) * 22
    const r = 7 + rnd(i, 122) * 5
    lit.cylinder(r * 2, 1.6, at(x, y, z), [0.36, 0.34, 0.5], 24)
    lit.cylinder(0.3, r * 1.6, at(x, y - 0.8 - r * 0.8, z), [0.26, 0.24, 0.38], 12, r * 1.7)
    glow.torus(r * 2 + 0.4, 0.3, at(x, y - 0.3, z), i % 2 ? [1, 0.35, 0.8] : [0.35, 0.9, 1], 18)
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3 + i
      const tr = r * (0.2 + rnd(i, 123 + k) * 0.5)
      const th = 4 + rnd(i, 130 + k) * 12
      const tx = x + Math.cos(a) * tr
      const tz = z + Math.sin(a) * tr
      lit.roundBox(1.8, th, 1.8, 0.3, at(tx, y + 0.8 + th / 2, tz), [0.78, 0.8, 0.92], 3)
      glow.roundBox(1.9, 0.25, 1.9, 0.08, at(tx, y + 0.8 + th * 0.7, tz), k % 2 ? [1, 0.35, 0.8] : [0.35, 0.9, 1], 2)
      lit.cylinder(0.05, 2.2, at(tx, y + 0.8 + th + 1.1, tz), [0.78, 0.8, 0.92], 5, 0.9)
    }
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
  // muralhas de ferro com janelas acesas dos dois lados (a fortaleza da forja, como na referência)
  for (let i = 0; i < Math.round(9 * n); i++) {
    const x = side(i, 32 + rnd(i, 140) * 16)
    const z = Z0 + 20 + i * 36
    const w = 14 + rnd(i, 141) * 10
    const h = 12 + rnd(i, 142) * 14
    lit.roundBox(6, h, w, 0.4, at(x, h / 2 - 1, z), stripesY([0.2, 0.17, 0.17], [0.26, 0.2, 0.18], 3, 0), 3)
    for (let k = 0; k < 3; k++) lit.roundBox(7, 2.4, 2.2, 0.2, at(x, h + 0.6, z - w / 2 + 1.5 + k * ((w - 3) / 2)), [0.24, 0.2, 0.19], 2)
    for (let r2 = 0; r2 < 2; r2++) {
      for (let k = 0; k < 3; k++) {
        glow.roundBox(6.2, 2.2, 1.1, 0.3, at(x, h * (0.35 + r2 * 0.32), z - w / 3 + (k * w) / 3), [1, 0.5, 0.1], 2)
      }
    }
    glow.roundBox(2, h + 4, 1.4, 0.6, at(x - Math.sign(x) * 3.4, h / 2 - 2, z + w * 0.3), [1, 0.45, 0.06], 2)
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
  // lampiões de latão ao longo do canal (luz quente que se lê de longe) e engrenagens gigantes no alto
  for (const sx of [-1, 1]) {
    for (let z = Z0 + 6; z < Z1; z += 12) {
      const x = sx * 16.5
      lit.cylinder(0.36, 4.2, at(x, 2.1, z), stripesY(SP.brassDark, SP.copper, 1.4, 0), 8)
      lit.roundBox(0.9, 1.1, 0.9, 0.12, at(x, 4.6, z), SP.brass, 2)
      glow.roundBox(0.62, 0.8, 0.62, 0.1, at(x, 4.6, z), [1, 0.72, 0.3], 2)
    }
  }
  for (let i = 0; i < Math.round(6 * n); i++) {
    const x = side(i, 40 + rnd(i, 60) * 30)
    const z = Z0 + 30 + i * 52
    const r = 9 + rnd(i, 61) * 6
    lit.cylinder(r * 2, 1.6, at(x, 22 + rnd(i, 62) * 10, z, 0, 0, Math.PI / 2), (yy, _x, zz) => (Math.hypot(yy, zz) > r * 0.8 ? SP.brass : SP.copper), 20)
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
  // paredões de gelo com pingentes (referência do Mar de Gelo)
  for (let i = 0; i < Math.round(10 * n); i++) {
    const x = side(i, 34 + rnd(i, 150) * 18)
    const z = Z0 + 15 + i * 33
    const w = 16 + rnd(i, 151) * 10
    const h = 10 + rnd(i, 152) * 14
    lit.roundBox(8, h, w, 1.2, at(x, h / 2 - 1, z, rnd(i, 153) * 0.3), (_x, y) => (y > h / 2 - 1.6 ? white : mix(blue, [0.5, 0.8, 0.98], 0.4)), 4)
    for (let k = 0; k < 9; k++) {
      const ih = 1.5 + rnd(i, 160 + k) * 3.5
      lit.cylinder(0.02, ih, at(x - Math.sign(x) * 4.2, h - 1.6 - ih / 2, z - w / 2 + 1 + (k * (w - 2)) / 8), [0.82, 0.94, 1], 5, 1.1)
    }
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

/**
 * Alvos flutuantes (todas as fases, 17/11): discos de anéis concêntricos com o neon da fase por baixo e a
 * ponta embaixo — o enfeite de programa de TV que as 7 referências repetem dos dois lados da prova.
 */
export function buildTargets(lit: SoftGeo, glow: SoftGeo, deco: GincanaDeco, neon: RGB, low: boolean) {
  const ringA: RGB = deco === "forge" ? [0.85, 0.16, 0.1] : [0.95, 0.36, 0.58]
  const ringB: RGB = deco === "forge" ? [1, 0.78, 0.4] : [1, 0.92, 0.86]
  const base: RGB = deco === "orbital" ? [0.3, 0.28, 0.44] : deco === "ice" ? [0.62, 0.78, 0.92] : deco === "forge" ? [0.18, 0.15, 0.15] : [0.62, 0.38, 0.2]
  const count = low ? 8 : 14
  for (let i = 0; i < count; i++) {
    const x = side(i, 15.5 + rnd(i, 100) * 9)
    const z = Z0 + 50 + (i / count) * (Z1 - Z0 - 60) + rnd(i, 101) * 10
    const y = 2 + rnd(i, 102) * 5
    const r = 2 + rnd(i, 103) * 1.4
    // anéis concêntricos = discos empilhados (a tampa do cilindro não tem vértice no meio para pintar anel)
    lit.cylinder(r * 2, 0.7, at(x, y, z), base, 20)
    lit.cylinder(r * 1.86, 0.06, at(x, y + 0.37, z), ringA, 20)
    lit.cylinder(r * 1.36, 0.06, at(x, y + 0.39, z), ringB, 18)
    lit.cylinder(r * 0.86, 0.06, at(x, y + 0.41, z), ringA, 16)
    lit.cylinder(r * 0.4, 0.06, at(x, y + 0.43, z), ringB, 12)
    lit.torus(r * 2 + 0.2, 0.32, at(x, y - 0.05, z), base, 18)
    glow.torus(r * 2 - 0.2, 0.14, at(x, y - 0.42, z), neon, 16)
    lit.cylinder(0.1, r * 1.3, at(x, y - 0.35 - r * 0.65, z), base, 10, r * 1.2)
    glow.cylinder(0.02, r * 0.9, at(x, y - 0.6 - r * 1.3, z), neon, 6, 0.4)
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
