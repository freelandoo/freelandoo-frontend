// features/meu-mundo/gincana/engine/backdrops.ts — GINCANA 2.0 (2026-11-16): o cenário em volta de cada Domínio.
//
// Só desenho, longe de quem corre (|x| ≥ 14): a regra e a colisão seguem em
// sim/courses.ts. Em código, sem Tripo (a regra dos minijogos desde 14/11):
// árvores gigantes, cogumelos acesos e a lua (Floresta); mesas listradas e
// pedras flutuando (Cânion); planeta com anel, torres de neon e estrelas
// (Orbital); vulcões com cratera acesa e chaminés (Forja); a fábrica do kit
// steampunk (Fábrica); icebergs, montanhas nevadas e aurora (Mar de Gelo).
// `lit` = malha com luz (cor por vértice); `glow` = malha sem luz (brilha).

import { Vector3 } from "@babylonjs/core/Maths/math.vector"
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

/** Casca em sulcos verticais (escuro no sulco, claro na crista) com ilhas de líquen verde. */
function barkPaint(seed: number) {
  return (x: number, y: number, z: number): RGB => {
    const g = Math.sin(Math.atan2(z, x) * 9 + y * 0.35 + seed)
    const lichen = Math.sin(y * 0.7 + seed * 3) * Math.cos(x * 1.3 + z) > 0.62
    if (lichen) return [0.2, 0.32, 0.2]
    return g > 0.5 ? [0.13, 0.08, 0.07] : g < -0.55 ? [0.4, 0.27, 0.22] : [0.27, 0.17, 0.14]
  }
}

/** Copa: escura embaixo → verde-azulado claro em cima (o luar bate de cima). */
function canopyPaint(h: number) {
  return (x: number, y: number, z: number): RGB => {
    const k = Math.max(0, Math.min(1, y / h + 0.5))
    // tufos claros no topo (ruído) para a copa não virar uma bolacha lisa
    const tuft = Math.sin(x * 1.7 + z * 1.3) * Math.cos(z * 1.9 - x) > 0.3 ? 0.12 : 0
    return mix([0.03, 0.12, 0.11], [0.2, 0.5, 0.4], Math.min(1, k * k + tuft * k))
  }
}

/**
 * Árvore gigante retorcida (ref. v3 da Floresta): tronco em gomos que torcem, raízes-escora saindo do pântano,
 * 3–4 galhos com copa achatada em degradê, cipós pendurados com gota acesa e flores rosa/lilás na copa.
 */
function gnarledTree(lit: SoftGeo, glow: SoftGeo, x: number, z: number, h: number, d: number, i: number) {
  const bark = barkPaint(i)
  const segs = 5
  const pts: Vector3[] = []
  for (let k = 0; k <= segs; k++) {
    const u = k / segs
    const lean = Math.sin(u * 2.4 + i) * d * 0.5
    pts.push(new Vector3(x + lean, -2 + u * h, z + Math.cos(u * 2 + i * 1.3) * d * 0.4))
  }
  for (let k = 0; k < segs; k++) lit.tube(pts[k], pts[k + 1], (d / 2) * (1 - (k / segs) * 0.55), bark, 10)
  // raízes-escora: sobem do pântano e encostam no tronco (com joelho)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + i
    const knee = new Vector3(x + Math.cos(a) * d * 1.1, 1.6 + rnd(i, 30 + k) * 1.2, z + Math.sin(a) * d * 1.1)
    lit.tube(new Vector3(x + Math.cos(a) * d * 0.3, 4.5, z + Math.sin(a) * d * 0.3), knee, d * 0.2, bark, 7)
    lit.tube(knee, new Vector3(x + Math.cos(a) * d * 2, -0.6, z + Math.sin(a) * d * 2), d * 0.15, bark, 7)
  }
  // galhos e copas
  const top = pts[segs]
  const nb = 3 + (i % 2)
  for (let b = 0; b < nb; b++) {
    const a = (b / nb) * Math.PI * 2 + i * 0.7
    const from = pts[segs - 1 - (b % 2)]
    const len = h * (0.22 + rnd(i, 40 + b) * 0.12)
    const end = new Vector3(from.x + Math.cos(a) * len, from.y + len * 0.45, from.z + Math.sin(a) * len)
    lit.tube(from, end, d * 0.16, bark, 7)
    const cs = 7 + rnd(i, 50 + b) * 5
    for (let c = 0; c < 3; c++) {
      const cx = end.x + (rnd(i, 60 + b * 3 + c) - 0.5) * cs * 0.9
      const cz = end.z + (rnd(i, 70 + b * 3 + c) - 0.5) * cs * 0.9
      const cy = end.y + 0.8 + c * 0.9
      lit.sphere(cs * (1 - c * 0.18), at(cx, cy, cz), canopyPaint(cs * 0.6), 9, 1, 0.68, 1)
    }
    // cipós pendurados com uma gota acesa na ponta
    for (let v = 0; v < 3; v++) {
      const vx = end.x + (rnd(i, 80 + b * 3 + v) - 0.5) * cs
      const vz = end.z + (rnd(i, 90 + b * 3 + v) - 0.5) * cs
      const vl = 4 + rnd(i, 100 + b * 3 + v) * 6
      lit.tube(new Vector3(vx, end.y, vz), new Vector3(vx + 0.3, end.y - vl, vz), 0.09, [0.12, 0.26, 0.14], 4)
      glow.sphere(0.3, at(vx + 0.3, end.y - vl - 0.15, vz), v % 2 ? [0.6, 1, 0.75] : [1, 0.5, 0.88], 4)
    }
    // flores na beira da copa
    for (let f = 0; f < 3; f++) {
      const fa = a + (f - 1) * 0.7
      const fx = end.x + Math.cos(fa) * cs * 0.48
      const fz = end.z + Math.sin(fa) * cs * 0.48
      const col: RGB = (b + f) % 3 ? [1, 0.38, 0.84] : [0.72, 0.5, 1]
      for (let k = 0; k < 5; k++) {
        const pa = (k / 5) * Math.PI * 2
        glow.sphere(0.9, at(fx + Math.cos(pa) * 0.5, end.y + 0.6 + Math.sin(pa) * 0.5, fz), col, 5, 1, 1, 0.5)
      }
      glow.sphere(0.5, at(fx, end.y + 0.6, fz), [1, 0.92, 0.6], 5)
    }
  }
  lit.sphere(d * 2.2, at(top.x, top.y + 1, top.z), canopyPaint(d), 8, 1, 0.6, 1)
}

function forest(lit: SoftGeo, glow: SoftGeo, n: number) {
  const count = Math.round(26 * n)
  for (let i = 0; i < count; i++) {
    const x = side(i, 26 + rnd(i) * 44)
    const z = Z0 + (i / count) * (Z1 - Z0) + rnd(i, 1) * 8
    const h = 24 + rnd(i, 2) * 18
    const d = 3 + rnd(i, 3) * 2.4
    gnarledTree(lit, glow, x, z, h, d, i)
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
    mossRock(lit, glow, x, z, 11 + rnd(i, 71) * 8, 10 + rnd(i, 72) * 12, i)
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
  // a lua no fim da subida (aparece por cima da pista), com o mar da lua mais escuro
  const craters: [number, number, number][] = [[-14, 10, 9], [8, 18, 6], [12, -8, 11], [-6, -16, 7], [20, 4, 4]]
  glow.sphere(84, at(-40, 92, 430), (x, y): RGB => {
    let k = 0
    for (const [cx, cy, r] of craters) k = Math.max(k, 1 - Math.hypot(x - cx, y - cy) / r)
    return mix([0.94, 0.96, 1], [0.7, 0.76, 0.9], Math.min(1, k * 1.6))
  }, 28)
  for (let i = 0; i < Math.round(40 * n); i++) {
    glow.sphere(0.35, at(side(i, 8 + rnd(i, 20) * 18), 3 + rnd(i, 21) * 7, Z0 + rnd(i, 22) * (Z1 - Z0)), [0.8, 1, 0.5], 3)
  }
}

/**
 * Ilha de pedra da Floresta (ref. v3): 3 blocos de pedra azul-arroxeada empilhados e girados (estratos, quina
 * de cima clara, pé escuro), tampa de musgo que transborda com tufos caídos, e a cachoeira acesa na face que
 * olha a pista (filetes claros/escuros, branca em cima → verde embaixo) com espuma em anéis no pé.
 */
function mossRock(lit: SoftGeo, glow: SoftGeo, x: number, z: number, w: number, h: number, i: number) {
  const stone = (base: number) => (_x: number, y: number): RGB => {
    const band = Math.sin((y + base) * 2.1 + i) > 0.55
    const k = Math.max(0, Math.min(1, (y + base) / h))
    const c = mix([0.2, 0.19, 0.34], [0.5, 0.47, 0.7], 0.35 + k * 0.65)
    return band ? mix(c, [0.05, 0.05, 0.1], 0.35) : c
  }
  let y = -1.5
  const parts = 3
  let ww = w
  for (let p = 0; p < parts; p++) {
    const ph = (h + 1.5) / parts
    lit.cylinder(ww, ph, at(x + Math.sin(p * 2.3 + i) * 0.5, y + ph / 2, z + Math.cos(p * 1.7 + i) * 0.5, p * 0.6 + i), stone(y + ph / 2), 7, ww * 0.92)
    // quina clara em cima de cada bloco
    lit.torus(ww * 0.92, 0.12, at(x + Math.sin(p * 2.3 + i) * 0.5, y + ph - 0.05, z + Math.cos(p * 1.7 + i) * 0.5), [0.42, 0.4, 0.58], 7)
    y += ph
    ww *= 0.9
  }
  // musgo: tampa que transborda + tufos caídos
  lit.cylinder(ww * 1.12, 0.9, at(x, y + 0.2, z), (_x, yy): RGB => (yy > 0.2 ? [0.26, 0.58, 0.3] : [0.12, 0.36, 0.2]), 9, ww * 1.02)
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + i
    lit.sphere(1.4 + (k % 3) * 0.4, at(x + Math.cos(a) * ww * 0.55, y - 0.3 - (k % 2) * 0.5, z + Math.sin(a) * ww * 0.55), [0.14, 0.4, 0.22], 6, 1, 1.4, 1)
  }
  // a cachoeira na face que olha a pista
  const s = -Math.sign(x)
  const fx = x + s * ww * 0.5
  const fall = y + 0.1
  glow.roundBox(0.5, fall, 2.6, 0.2, at(fx, fall / 2 - 0.2, z), (_xx, yy, zz): RGB => {
    const streak = Math.sin(zz * 9) > 0.2
    const k = (yy + fall / 2) / fall
    // verde-neon; só a boca de cima clareia
    const c = mix([0.2, 0.95, 0.5], [0.85, 1, 0.9], k > 0.9 ? (k - 0.9) * 10 : 0)
    return streak ? c : mix(c, [0.05, 0.5, 0.3], 0.45)
  }, 2)
  for (let r = 0; r < 3; r++) glow.torus(3 + r * 1.6, 0.14, at(fx + s * 1.2, 0.12, z), [0.7, 1, 0.8], 14)
  glow.cylinder(3.2, 0.1, at(fx + s * 0.9, 0.1, z), [0.75, 1, 0.82], 12)
}

// ── Cânion ───────────────────────────────────────────────────────────────────

/**
 * V-Cânion (ref. v3): ilha de arenito flutuando. Camadas de blocos (cada camada um bloco grande + dois
 * que saltam, girados), estratos escuros finos, quina de cima clara e base de cada bloco escura;
 * tampa de grama, acácia de copa chata em dois andares, e embaixo o "pião" de rocha que some nas nuvens.
 * Numa a cada duas, a cachoeira acesa cai da beira virada para a prova.
 */
const SAND: RGB[] = [
  [0.86, 0.48, 0.3],
  [0.74, 0.36, 0.22],
  [0.92, 0.6, 0.38],
  [0.8, 0.42, 0.28],
]
function sandPaint(base: RGB, lh: number, seed: number) {
  return (x: number, y: number, z: number): RGB => {
    const t = (y + lh / 2) / lh
    const strata = Math.abs(Math.sin(y * 2.6 + seed + Math.sin(x * 0.3 + z * 0.2) * 0.6)) < 0.08
    let c = mix(mix(base, [0, 0, 0], 0.4), base, Math.min(1, t * 1.6))
    if (t > 0.92) c = mix(c, [1, 0.86, 0.66], 0.45)
    if (strata) c = mix(c, [0.3, 0.14, 0.1], 0.5)
    return c
  }
}
function rockIsland(lit: SoftGeo, glow: SoftGeo, x: number, yTop: number, z: number, w: number, layers: number, seed: number, fall: boolean, tree = true) {
  const lh = Math.min(4 + rnd(seed, 1) * 3, w * 0.55)
  let y = yTop
  for (let k = 0; k < layers; k++) {
    const sc = 1 - k * 0.1
    const base = SAND[(seed + k) % SAND.length]
    const yaw = rnd(seed, 10 + k) * 0.6
    lit.box(w * sc, lh, w * sc * 0.82, at(x, y - lh / 2, z, yaw), sandPaint(base, lh, seed + k))
    // estrato: friso de pedra mais escura que sai um palmo do bloco, e duas rachaduras verticais
    lit.box(w * sc + 0.5, 0.35, w * sc * 0.82 + 0.5, at(x, y - lh * 0.55, z, yaw), mix(base, [0.25, 0.1, 0.08], 0.45))
    for (let c = 0; c < 2; c++) {
      const cx = (rnd(seed, 90 + k * 2 + c) - 0.5) * w * sc * 0.8
      lit.box(0.3, lh * 0.7, 0.3, at(x + Math.cos(yaw) * cx, y - lh * 0.45, z - w * sc * 0.41 * (c ? 1 : -1) - Math.sin(yaw) * cx, yaw), [0.32, 0.14, 0.1])
    }
    // dois blocos que saltam do contorno (silhueta quebrada)
    for (let b = 0; b < 2; b++) {
      const a = rnd(seed, 20 + k * 3 + b) * Math.PI * 2
      const bw = w * sc * (0.3 + rnd(seed, 30 + k + b) * 0.2)
      const bh = lh * (0.6 + rnd(seed, 40 + k + b) * 0.35)
      lit.box(bw, bh, bw * 0.9, at(x + Math.cos(a) * w * sc * 0.45, y - lh + bh / 2, z + Math.sin(a) * w * sc * 0.38, a), sandPaint(SAND[(seed + k + b + 1) % SAND.length], bh, seed + 7 * b))
    }
    y -= lh
  }
  // o pião embaixo: afina até a ponta, escurecendo
  const deep = w * 0.9
  lit.cylinder(w * 0.12, deep, at(x, y - deep / 2, z, rnd(seed, 5)), (_x, yy) => mix([0.28, 0.12, 0.1], [0.66, 0.32, 0.22], Math.min(1, (yy + deep / 2) / deep + 0.2)), 7, w * 0.72)
  // tampa de grama (beira mais clara) e tufos
  const gw = w * 0.96
  lit.box(gw, 0.7, gw * 0.8, at(x, yTop + 0.2, z, rnd(seed, 10) * 0.6), (_x, yy) => (yy > 0.2 ? [0.5, 0.66, 0.24] : [0.3, 0.42, 0.16]))
  for (let t = 0; t < 4; t++) {
    const a = rnd(seed, 50 + t) * Math.PI * 2
    const r = gw * 0.38 * rnd(seed, 60 + t)
    lit.sphere(1.6 + rnd(seed, 70 + t), at(x + Math.cos(a) * r, yTop + 0.7, z + Math.sin(a) * r), [0.34, 0.5, 0.18], 5, 1, 0.6, 1)
  }
  if (!tree) return
  // acácia: tronco que entorta, copa chata em dois andares (escura embaixo, clara em cima)
  const ta = rnd(seed, 80) * Math.PI * 2
  const tx = x + Math.cos(ta) * gw * 0.18
  const tz = z + Math.sin(ta) * gw * 0.18
  const lean = (rnd(seed, 81) - 0.5) * 0.5
  lit.cylinder(1.1, 5, at(tx, yTop + 2.9, tz, 0, 0, lean), [0.3, 0.2, 0.13], 6, 0.7)
  const cx = tx - Math.sin(lean) * 5
  const cw = gw * 0.6
  lit.sphere(cw, at(cx, yTop + 5.6, tz), [0.22, 0.38, 0.14], 9, 1, 0.22, 0.9)
  lit.sphere(cw * 0.78, at(cx + 0.6, yTop + 6.5, tz - 0.4), [0.42, 0.62, 0.22], 9, 1, 0.2, 0.9)
  if (fall) {
    // a cachoeira acesa da beira virada para a prova, mais clara no meio, com névoa no pé
    const fx = x - Math.sign(x) * gw * 0.47
    const fh = yTop - y + deep * 0.5
    glow.box(3.6, fh, 1, at(fx, yTop - fh / 2, z), (xx, yy) => mix([0.55, 0.85, 0.95], [1, 1, 1], Math.abs(Math.sin(yy * 0.9 + xx * 2)) > 0.6 ? 0.7 : 0.15))
    glow.sphere(6, at(fx, yTop - fh, z), [0.95, 0.92, 1], 6, 1, 0.5, 1)
    for (const dz of [-1.2, 1.2]) glow.box(0.5, fh * 0.9, 0.3, at(fx - Math.sign(x) * 0.5, yTop - fh * 0.45, z + dz), [1, 1, 1])
    glow.box(2.8, 0.25, 1.4, at(fx + Math.sign(x) * 0.6, yTop + 0.45, z), [0.6, 0.9, 1])
  }
}

function canyon(lit: SoftGeo, glow: SoftGeo, n: number) {
  const count = Math.round(22 * n)
  for (let i = 0; i < count; i++) {
    const x = side(i, 34 + rnd(i) * 70)
    const z = Z0 + (i / count) * (Z1 - Z0) + rnd(i, 1) * 10
    const w = 14 + rnd(i, 2) * 18
    const yTop = 4 + rnd(i, 3) * 26
    rockIsland(lit, glow, x, yTop, z, w, 2 + Math.floor(rnd(i, 4) * 3), i, i % 2 === 0)
  }
  // o sol do fim de tarde, grande e baixo à frente da prova (miolo amarelo, borda laranja, halo rosado)
  glow.sphere(90, at(0, 18, 560), (x, y) => mix([1, 0.62, 0.3], [1, 0.92, 0.5], Math.max(0, 1 - Math.hypot(x, y) / 45)), 16, 1, 1, 0.2)
  glow.torus(118, 6, at(0, 18, 566, 0, Math.PI / 2, 0), [1, 0.7, 0.62], 40)
  // mar de nuvens embaixo da prova (o abismo some nas nuvens, como na referência)
  for (let i = 0; i < Math.round(70 * n); i++) {
    const x = side(i, 4 + rnd(i, 80) * 90)
    const z = Z0 + rnd(i, 81) * (Z1 - Z0 + 60)
    const s = 12 + rnd(i, 82) * 16
    lit.sphere(s, at(x, -4.5 + rnd(i, 83) * 3, z), (_x, y) => mix([0.96, 0.7, 0.74], [1, 0.95, 0.92], Math.min(1, Math.max(0, y / (s * 0.42) + 0.5 + rnd(i, 84) * 0.2))), 6, 1, 0.42, 1)
  }
  // ilhotas flutuando sobre o abismo (a mesma pedra das ilhas, pequena; uma a cada três com acácia)
  for (let i = 0; i < Math.round(26 * n); i++) {
    const x = side(i + 1, 16 + rnd(i, 30) * 40)
    const z = Z0 + rnd(i, 31) * (Z1 - Z0)
    const y = 8 + rnd(i, 32) * 30
    const s = 3 + rnd(i, 33) * 6
    rockIsland(lit, glow, x, y, z, s, 1, i + 100, false, i % 3 === 0)
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
  // V-Gelo (ref. v3): placas de gelo hexagonais boiando, tampa de neve com beira azulada, lado ciano
  // escurecendo para baixo e pingentes embaixo da beira (o que dá a cara de "gelo que pinga")
  for (let i = 0; i < Math.round(46 * n); i++) {
    // metade fica em volta do rolo (onde a câmera olha), o resto ao longe
    const x = side(i, 11 + rnd(i, 200) * (i % 2 ? 22 : 40))
    const z = i % 2 ? -24 + rnd(i, 201) * 90 : Z0 + 20 + rnd(i, 201) * (Z1 - Z0 - 40)
    if (Math.abs(x) < 13 && z > -6 && z < 40) continue
    const d = 4 + rnd(i, 202) * 6
    const y = 0.25 + rnd(i, 203) * 0.5
    const yaw = rnd(i, 204) * 3
    lit.cylinder(d, 1, at(x, y, z, yaw), (_x, yy) => mix([0.18, 0.5, 0.78], [0.55, 0.85, 1], yy + 0.5), 6, d * 1.04)
    lit.cylinder(d * 1.02, 0.3, at(x, y + 0.6, z, yaw), (xx, _yy, zz) => (Math.hypot(xx, zz) > d * 0.42 ? [0.72, 0.9, 1] : [0.94, 0.98, 1]), 6)
    // rachadura funda (uma placa em cada três)
    if (i % 3 === 0) lit.box(d * 0.8, 0.05, 0.12, at(x, y + 0.76, z, yaw + 0.7), [0.3, 0.6, 0.85])
    for (let k = 0; k < 6; k++) {
      const a = yaw + (k / 6) * Math.PI * 2 + 0.5
      const ih = 0.6 + rnd(i, 210 + k) * 1.4
      lit.cylinder(0.02, ih, at(x + Math.cos(a) * d * 0.44, y - 0.5 - ih / 2, z + Math.sin(a) * d * 0.44), [0.7, 0.92, 1], 4, 0.36)
    }
  }
  // icebergs no mar
  for (let i = 0; i < Math.round(16 * n); i++) {
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
  // V-Gelo (ref. v3): três cortinas onduladas no céu ao fundo, cada uma de faixas finas lado a lado.
  // O material é aditivo (preto some): verde aceso embaixo → magenta em cima, sumindo nas duas pontas.
  const curtain = (zc: number, y0: number, h: number, ph: number, amp: number) => {
    for (let k = 0; k < 64; k++) {
      const x = -280 + k * 8.8
      const z = zc + Math.sin(k * 0.21 + ph) * amp + Math.sin(k * 0.07 + ph * 2) * amp * 0.6
      const hh = h * (0.75 + 0.25 * Math.sin(k * 0.33 + ph))
      const edge = Math.min(1, k / 10, (63 - k) / 10)
      const yaw = Math.atan2(Math.cos(k * 0.21 + ph) * amp * 0.21, 8.2)
      // a caixa só tem vértice em cima e embaixo: quatro pedaços empilhados para o degradê aparecer
      const colorAt = (t: number): RGB => {
        const fade = Math.min(1, t / 0.12) * Math.min(1, (1 - t) / 0.35) * edge
        const c = mix([0.1, 0.9, 0.4], [0.75, 0.15, 0.9], Math.min(1, Math.max(0, (t - 0.2) / 0.55)))
        return [c[0] * fade, c[1] * fade, c[2] * fade]
      }
      const T = [0, 0.12, 0.4, 0.65, 1]
      for (let q = 0; q < 4; q++) {
        const sh = hh * (T[q + 1] - T[q])
        g.box(9.2, sh, 0.3, at(x, y0 + hh * T[q] + sh / 2, z, -yaw), (_x, y) => colorAt(T[q] + ((y + sh / 2) / sh) * (T[q + 1] - T[q])))
      }
    }
  }
  curtain(520, 95, 90, 0, 40)
  curtain(640, 120, 100, 2.1, 50)
  curtain(440, 130, 60, 4.2, 30)
}
