// features/meu-mundo/engine/steampunk/kit.ts
//
// Kit urbano steampunk (mm3d-51): poste de ferro fundido com lanterna âmbar,
// poste-relógio, banco de ferro e ripas, árvores (5 desenhos), canteiro de
// ferro, cerca de grade sobre mureta, muro com gradil, caldeira de praça,
// caixa de correio, medidor, válvula, bueiro e grelha.
//
// Regra das COLISÕES: a lista que vale é a do SERVIDOR (meuMundoLayout.js). Cada
// peça que já existia empurra EXATAMENTE a mesma caixa de antes (o modo de
// desenvolvimento do world.ts compara desenho × servidor); peça nova é
// ornamento baixo ou fica dentro de uma caixa que já existe (no poste, na
// cerca, no canteiro) — nunca uma parede invisível nem um vão a mais.
//
// Escala: personagem 1,75 m, porta 2,0 m, poste 3,6 m.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { place, type RGB } from "../geometry"
import type { Box2 } from "../collision"
import { SP, mix, shade, rng } from "./palette"
import { SteamGeo, facing, xf, type V3 } from "./geo"

/** Engrenagem que gira (fx.ts): matriz-base com o eixo no Y local. */
export interface GearSpec {
  m: Matrix
  r: number
  thick: number
  /** rad/s (sinal = sentido). */
  speed: number
}

export interface SteamCtx {
  props: SteamGeo
  glow: SteamGeo
  pavers: SteamGeo
  road: SteamGeo
  soil: SteamGeo
  cobble: SteamGeo
  boxes: Box2[]
  viewOnly: Box2[]
  gears: GearSpec[]
  /** Saídas de vapor [x, y, z] (chaminés, caldeiras). */
  vents: V3[]
  /** Densidade das peças repetidas (grade): 1 = normal, < 1 no perfil leve. */
  detail: number
  /** Poças de luz no chão embaixo das lanternas (a noite do bairro; mm3d-51). */
  pools: SteamGeo
}

/** Poça de luz âmbar no chão: quadrado deitado com a textura de brilho radial. */
export function lightPool(ctx: SteamCtx, x: number, z: number, r: number, y = 0.11) {
  ctx.pools.panel(2 * r, 2 * r, Matrix.RotationX(Math.PI / 2).multiply(place(x, y, z)), SP.amber)
}

// ── Postes ───────────────────────────────────────────────────────────────────

function lantern(ctx: SteamCtx, x: number, y: number, z: number, s = 1, frame?: Matrix) {
  const { props, glow } = ctx
  const at = (lx: number, ly: number, lz: number) => place(x + lx * s, y + ly * s, z + lz * s, 0, frame)
  const o = at(0, 0, 0).asArray()
  // Quanto mais alta a lanterna, maior a poça no chão.
  lightPool(ctx, o[12], o[14], Math.min(5.5, 1.2 + o[13] * 1.15))
  // Gaiola: base, 4 hastes, telhadinho em cone e o pináculo de latão.
  props.cone(0.36 * s, 0.22 * s, 0.1 * s, at(0, 0.05, 0), SP.iron, 8)
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    props.box(0.035 * s, 0.5 * s, 0.035 * s, at(dx * 0.15, 0.35, dz * 0.15), SP.iron)
  }
  glow.with("flat", () => glow.box(0.26 * s, 0.42 * s, 0.26 * s, at(0, 0.34, 0), SP.lampGlass))
  props.box(0.4 * s, 0.05 * s, 0.4 * s, at(0, 0.62, 0), SP.brassDark)
  props.cone(0.04 * s, 0.46 * s, 0.24 * s, at(0, 0.76, 0), SP.iron, 8)
  props.with("flat", () => props.sphere(0.1 * s, [1, 1, 1], at(0, 0.92, 0), SP.brass, 3))
}

/**
 * Poste de rua: base octogonal de ferro fundido, fuste com anéis de bronze,
 * engrenagem ornamental e lanterna âmbar. Colisão = a do poste antigo.
 */
export function steamLamp(ctx: SteamCtx, x: number, z: number, opts: { collide?: boolean; clock?: boolean; gearSeed?: number } = {}) {
  const { props } = ctx
  props.cone(0.42, 0.62, 0.32, place(x, 0.16, z), SP.iron, 8)
  props.cylinder(0.5, 0.06, place(x, 0.34, z), SP.brassDark, 8)
  props.cone(0.16, 0.26, 0.5, place(x, 0.62, z), SP.ironHi, 8)
  props.cylinder(0.15, 2.3, place(x, 2.0, z), SP.iron, 8)
  for (const y of [0.9, 2.2]) props.cylinder(0.22, 0.08, place(x, y, z), SP.bronze, 8)
  if (opts.clock) {
    // Relógio de quatro faces a 2,7 m (o "relógio público" da praça).
    props.box(0.74, 0.74, 0.74, place(x, 2.75, z), SP.iron)
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2
      const f = (lx: number, ly: number, lz: number) => place(lx, ly, lz, a, place(x, 0, z))
      props.with("flat", () => props.cylinder(0.6, 0.04, facingY(f(0, 2.75, -0.38)), SP.board, 12))
      props.ring(0.62, 0.05, facingY(f(0, 2.75, -0.385)), SP.brass, 12, 3)
      const F = place(0, 0, 0, a, place(x, 0, z))
      props.box(0.03, 0.22, 0.02, xf(0.05, 2.83, -0.41, 0, F, 0, -0.6), SP.iron)
      props.box(0.025, 0.16, 0.02, xf(-0.04, 2.72, -0.41, 0, F, 0, 2.1), SP.iron)
    }
    props.cone(0.1, 0.9, 0.3, place(x, 3.27, z), SP.slate, 4)
    lantern(ctx, x, 3.42, z, 0.85)
  } else {
    // Braço curto com a lanterna pendurada no topo.
    lantern(ctx, x, 3.12, z, 1)
    const r = rng(opts.gearSeed ?? Math.round(x * 31 + z * 17))
    if (r() < 0.6) props.gear(0.2, 0.05, 8, facing(x, 1.55, z - 0.1, undefined, 0), SP.brass, SP.bronze)
  }
  if (opts.collide !== false) ctx.boxes.push({ x, z, hx: 0.2, hz: 0.2, rot: 0, h: 3.6 })
}

/** Gira um cilindro (eixo Y) para virar disco de frente para −Z do quadro. */
function facingY(m: Matrix): Matrix {
  return facing(0, 0, 0).multiply(m)
}

/** Lanterna de muro/pilar (sem poste). */
export function postLantern(ctx: SteamCtx, x: number, y: number, z: number, s = 0.8, frame?: Matrix) {
  lantern(ctx, x, y, z, s, frame)
}

// ── Banco ────────────────────────────────────────────────────────────────────

/** Banco de ripas de madeira em pés de ferro fundido. Colisão = a do banco antigo. */
export function steamBench(ctx: SteamCtx, x: number, z: number, rot: number) {
  const { props } = ctx
  const f = place(x, 0, z, rot)
  for (const sx of [-0.88, 0.88]) {
    // Pé lateral: perna da frente, de trás, assento e encosto curvo (caixas).
    props.box(0.08, 0.46, 0.08, place(sx, 0.23, -0.2, 0, f), SP.iron)
    props.box(0.08, 0.46, 0.08, place(sx, 0.23, 0.22, 0, f), SP.iron)
    props.box(0.08, 0.06, 0.6, place(sx, 0.44, 0, 0, f), SP.iron)
    props.box(0.07, 0.5, 0.07, xf(sx, 0.72, 0.27, 0, f, 0.18), SP.iron)
    props.box(0.08, 0.05, 0.42, place(sx, 0.66, -0.02, 0, f), SP.iron)
    props.box(0.1, 0.1, 0.1, place(sx, 0.69, -0.23, 0, f), SP.brass)
  }
  for (let k = 0; k < 3; k++) props.box(1.95, 0.05, 0.15, place(0, 0.48, -0.19 + k * 0.17, 0, f), k % 2 ? SP.woodLight : SP.wood)
  for (let k = 0; k < 3; k++) props.box(1.95, 0.11, 0.04, xf(0, 0.62 + k * 0.14, 0.26 + k * 0.025, 0, f, 0.18), k % 2 ? SP.wood : SP.woodLight)
  ctx.boxes.push({ x, z, hx: 1.05, hz: 0.38, rot, h: 1 })
}

// ── Árvores ──────────────────────────────────────────────────────────────────

type TreeKind = "round" | "column" | "ornamental" | "dry" | "shrub"
const TREE_KINDS: TreeKind[] = ["round", "round", "column", "ornamental", "round", "dry", "column", "ornamental"]

/**
 * Árvore estilizada (cinco desenhos, escolhidos pela posição: o mesmo bairro
 * desenha as mesmas árvores). Colisão e obstáculo de câmera = os da árvore
 * antiga, para qualquer desenho.
 */
export function steamTree(ctx: SteamCtx, x: number, z: number, s = 1, collide = true, kind?: TreeKind, pit = true) {
  const { props } = ctx
  const r = rng(Math.round(x * 97.3 + z * 13.1 + 7))
  const k = kind ?? TREE_KINDS[Math.floor(r() * TREE_KINDS.length)]
  const leaves = [SP.leafOlive, SP.leafSage, SP.leafDeep]
  const pick = () => leaves[Math.floor(r() * leaves.length)]
  // Canteiro de terra com aro de ferro (contato no chão sem sombra dinâmica).
  if (pit) {
    props.with("flat", () => props.cylinder(1.5 * s, 0.03, place(x, 0.016, z), shade(SP.earth, 0.7), 10))
    props.ring(1.5 * s, 0.06, place(x, 0.035, z), SP.iron, 10)
  }
  const trunk = (h: number, d: number) => props.cone(d * 0.62 * s, d * s, h * s, place(x, (h * s) / 2, z), SP.trunk, 6)
  props.with("flat", () => {
    if (k === "round") {
      trunk(1.9, 0.36)
      // Facetas poucas (copa estilizada, "flat"): árvore é a peça mais repetida da cena.
      props.sphere(2.3 * s, [1, 0.78, 1], place(x, 2.35 * s, z), shade(pick(), 0.9), 4)
      props.sphere(1.7 * s, [1, 0.85, 1], place(x + 0.5 * s, 2.95 * s, z - 0.25 * s), pick(), 4)
      props.sphere(1.45 * s, [1, 0.85, 1], place(x - 0.55 * s, 2.8 * s, z + 0.35 * s), pick(), 3)
      props.sphere(1.1 * s, [1, 0.9, 1], place(x + 0.05 * s, 3.45 * s, z + 0.1 * s), mix(pick(), SP.leafRust, 0.15), 3)
    } else if (k === "column") {
      trunk(1.2, 0.3)
      props.sphere(1.5 * s, [1, 1.35, 1], place(x, 1.9 * s, z), SP.leafDeep, 4)
      props.sphere(1.3 * s, [1, 1.4, 1], place(x, 2.9 * s, z), pick(), 4)
      props.sphere(0.9 * s, [1, 1.5, 1], place(x, 3.75 * s, z), SP.leafSage, 3)
    } else if (k === "ornamental") {
      trunk(1.3, 0.24)
      props.tube([x, 1.1 * s, z], [x + 0.6 * s, 2.0 * s, z - 0.2 * s], 0.06 * s, SP.trunk)
      props.tube([x, 1.0 * s, z], [x - 0.5 * s, 1.9 * s, z + 0.3 * s], 0.06 * s, SP.trunk)
      props.sphere(1.25 * s, [1, 0.8, 1], place(x + 0.6 * s, 2.15 * s, z - 0.2 * s), mix(SP.leafRust, SP.leafOlive, 0.4), 4)
      props.sphere(1.1 * s, [1, 0.8, 1], place(x - 0.5 * s, 2.05 * s, z + 0.3 * s), SP.leafRust, 4)
      props.sphere(1.3 * s, [1, 0.8, 1], place(x, 2.5 * s, z), SP.leafOlive, 4)
    } else if (k === "dry") {
      trunk(2.2, 0.34)
      const top: V3 = [x, 2.1 * s, z]
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + r()
        const end: V3 = [x + Math.cos(a) * 1.1 * s, (2.7 + r() * 0.9) * s, z + Math.sin(a) * 1.1 * s]
        props.tube(top, end, 0.05 * s, SP.trunk, 5)
        props.sphere(0.55 * s, [1, 0.7, 1], place(end[0], end[1], end[2]), SP.leafDry, 4)
      }
    } else {
      props.sphere(1.6 * s, [1, 0.7, 1], place(x, 0.55 * s, z), SP.hedge, 4)
      props.sphere(1.1 * s, [1, 0.75, 1], place(x + 0.35 * s, 0.85 * s, z), SP.leafSage, 3)
    }
  })
  if (collide) ctx.boxes.push({ x, z, hx: 0.35 * s, hz: 0.35 * s, rot: 0, h: 3.4 * s })
  ctx.viewOnly.push({ x, z, hx: 1.05 * s, hz: 1.05 * s, rot: 0, h: 3.4 * s })
}

// ── Canteiros ────────────────────────────────────────────────────────────────

const BLOOM: RGB[] = [
  [0.72, 0.28, 0.24],
  [0.9, 0.66, 0.24],
  [0.88, 0.84, 0.74],
  [0.52, 0.38, 0.55],
]

/** Canteiro baixo de ferro com terra, flores foscas e um arbusto (ornamento: sem colisão, 25 cm). */
export function planter(ctx: SteamCtx, x: number, z: number, seed: number, rot = 0, w = 1.5, d = 0.9) {
  const { props } = ctx
  const f = place(x, 0, z, rot)
  props.box(w, 0.22, d, place(0, 0.11, 0, 0, f), SP.iron)
  props.box(w + 0.08, 0.04, d + 0.08, place(0, 0.24, 0, 0, f), SP.brassDark)
  const r = rng(seed * 7 + 3)
  props.with("flat", () => {
    props.box(w - 0.14, 0.02, d - 0.14, place(0, 0.265, 0, 0, f), shade(SP.earth, 0.62))
    props.sphere(0.6, [1, 0.8, 1], place(-w * 0.28, 0.42, 0, 0, f), SP.hedge, 4)
    for (let i = 0; i < 6; i++) {
      const fx = (r() - 0.3) * (w - 0.4) * 0.8
      const fz = (r() - 0.5) * (d - 0.3)
      props.sphere(0.18, [1, 0.8, 1], place(fx, 0.34 + r() * 0.08, fz, 0, f), BLOOM[(((seed + i) % BLOOM.length) + BLOOM.length) % BLOOM.length], 3)
    }
  })
}

// ── Cercas e muros ───────────────────────────────────────────────────────────

/**
 * Cerca de grade de ferro sobre mureta de pedra, de A até B no quadro dado,
 * com pilares de tijolo e capa de latão. Altura total `h` (a da caixa que o
 * servidor já usa), espessura `t`.
 */
export function ironFence(ctx: SteamCtx, a: [number, number], b: [number, number], h: number, t: number, frame: Matrix, opts: { pillarEvery?: number; capColor?: RGB } = {}) {
  const { props } = ctx
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const L = Math.hypot(dx, dz)
  const ry = Math.atan2(dx, dz) - Math.PI / 2
  const along = (u: number, y: number, side = 0) =>
    place(a[0] + (dx * u) / L + (side * dz) / L, y, a[1] + (dz * u) / L - (side * dx) / L, ry, frame)
  const curb = Math.min(0.24, h * 0.34)
  props.box(L, curb, t, along(L / 2, curb / 2), SP.stone)
  props.box(L + 0.02, 0.04, t + 0.06, along(L / 2, curb + 0.02), SP.stoneLight)
  const top = h - 0.04
  props.box(L, 0.05, 0.05, along(L / 2, top), SP.iron)
  props.box(L, 0.04, 0.04, along(L / 2, curb + 0.1), SP.iron)
  const gap = 0.24 / Math.max(0.4, ctx.detail)
  const n = Math.max(2, Math.floor(L / gap))
  const ph = top - curb - 0.04
  for (let i = 1; i < n; i++) props.panel(0.035, ph, along((L * i) / n, curb + 0.04 + ph / 2), SP.iron)
  // Pontas de lança a cada 2 hastes (losango plano: 4 vértices).
  const tip = Matrix.RotationZ(Math.PI / 4)
  for (let i = 3; i < n; i += 3) props.panel(0.07, 0.07, tip.multiply(along((L * i) / n, top + 0.05)), SP.ironHi)
  const every = opts.pillarEvery ?? 5.2
  const np = Math.max(1, Math.round(L / every))
  for (let i = 0; i <= np; i++) {
    const u = (L * i) / np
    props.box(0.34, h + 0.2, 0.34, along(u, (h + 0.2) / 2), i % 2 ? SP.brick : SP.brickDark)
    props.box(0.42, 0.07, 0.42, along(u, h + 0.235), SP.stoneLight)
    props.cone(0.02, 0.2, 0.18, along(u, h + 0.36), opts.capColor ?? SP.brass, 4)
  }
}

/**
 * Muro do bairro (a cerca viva de 1,5 m): embasamento de pedra, gradil de
 * ferro em cima, pilar de tijolo a cada ~8 m e lanterna em pilar alternado.
 */
export function boundaryWall(ctx: SteamCtx, x: number, z: number, w: number, d: number) {
  const { props } = ctx
  const alongX = w >= d
  const L = alongX ? w : d
  const T = alongX ? d : w
  const at = (u: number, y: number) => (alongX ? place(x - L / 2 + u, y, z) : place(x, y, z - L / 2 + u))
  const sz = (l: number, hh: number, t: number): [number, number, number] => (alongX ? [l, hh, t] : [t, hh, l])
  const [bw, bh, bd] = sz(L, 0.85, T * 0.9)
  props.box(bw, bh, bd, at(L / 2, 0.425), SP.stoneDark)
  const [cw, ch, cd] = sz(L, 0.08, T)
  props.box(cw, ch, cd, at(L / 2, 0.89), SP.stoneLight)
  const [rw, rh, rd] = sz(L, 0.06, 0.07)
  props.box(rw, rh, rd, at(L / 2, 1.48), SP.iron)
  const n = Math.floor(L / (0.3 / Math.max(0.4, ctx.detail)))
  for (let i = 1; i < n; i++) {
    const u = (L * i) / n
    props.panel(0.04, 0.55, alongX ? place(x - L / 2 + u, 1.2, z) : place(x, 1.2, z - L / 2 + u, Math.PI / 2), SP.iron)
  }
  const np = Math.max(1, Math.round(L / 10.5))
  for (let i = 0; i <= np; i++) {
    const u = (L * i) / np
    const [pw, ph, pd] = sz(0.95, 1.9, Math.max(1.05, T + 0.1))
    props.box(pw, ph, pd, at(u, 0.95), i % 2 ? SP.brick : SP.brickDark)
    props.box(pw + 0.12, 0.1, pd + 0.12, at(u, 1.95), SP.stoneLight)
    if (i % 3 === 0) postLantern(ctx, alongX ? x - L / 2 + u : x, 2.0, alongX ? z : z - L / 2 + u, 0.75)
    else props.cone(0.04, 0.5, 0.36, at(u, 2.18), SP.brassDark, 4)
  }
}

// ── Máquinas pequenas ────────────────────────────────────────────────────────

/** Manômetro de mostrador (de frente para −Z do quadro). */
export function gauge(ctx: SteamCtx, x: number, y: number, z: number, frame?: Matrix, s = 1) {
  const { props } = ctx
  props.cylinder(0.26 * s, 0.07 * s, facing(x, y, z, frame), SP.brass, 10)
  props.with("flat", () => props.cylinder(0.2 * s, 0.075 * s, facing(x, y, z - 0.005, frame), SP.board, 10))
  props.box(0.015 * s, 0.09 * s, 0.01, xf(x + 0.02 * s, y + 0.02 * s, z - 0.045 * s, 0, frame, 0, -0.7), SP.iron)
}

/** Volante de válvula (de frente para −Z). */
export function valveWheel(ctx: SteamCtx, x: number, y: number, z: number, frame?: Matrix, s = 1) {
  const { props } = ctx
  props.ring(0.3 * s, 0.035 * s, facing(x, y, z, frame), SP.bronze, 10)
  props.box(0.28 * s, 0.03 * s, 0.03 * s, xf(x, y, z, 0, frame), SP.bronze)
  props.box(0.03 * s, 0.28 * s, 0.03 * s, xf(x, y, z, 0, frame), SP.bronze)
}

/** Caixa de correio de cobre num poste de ferro. */
export function mailbox(ctx: SteamCtx, x: number, z: number, rot: number, frame?: Matrix) {
  const { props } = ctx
  const f = place(x, 0, z, rot, frame)
  props.box(0.08, 1.0, 0.08, place(0, 0.5, 0, 0, f), SP.iron)
  props.box(0.3, 0.28, 0.46, place(0, 1.12, 0, 0, f), SP.copper)
  props.with("flat", () => props.cylinder(0.3, 0.46, xf(0, 1.26, 0, 0, f, Math.PI / 2), SP.copper, 10))
  props.box(0.32, 0.03, 0.03, place(0, 1.0, -0.23, 0, f), SP.brassDark)
  props.box(0.03, 0.22, 0.05, place(0.17, 1.24, 0.06, 0, f), SP.brass)
}

/**
 * Caldeira de praça: base de pedra, tanque de cobre com cintas de latão e
 * domo, chaminé com vapor, manômetros, volante e um volante de inércia que
 * gira. Cabe na caixa do canteiro antigo (raio ~0,93 m).
 */
export function boiler(ctx: SteamCtx, cx: number, cz: number, face: number, baseD: number, y = 0) {
  const { props, soil } = ctx
  const f = place(cx, y, cz, face)
  props.cylinder(baseD + 0.3, 0.5, place(0, 0.25, 0, Math.PI / 8, f), SP.stone, 8)
  props.cylinder(baseD + 0.36, 0.06, place(0, 0.52, 0, Math.PI / 8, f), SP.stoneLight, 8)
  soil.cylinder(baseD, 0.04, place(0, 0.53, 0, Math.PI / 8, f), shade(SP.earth, 0.75), 8)
  // Tanque.
  props.cylinder(1.15, 1.5, place(0, 1.3, 0, 0, f), SP.copper, 14)
  for (const y of [0.7, 1.3, 1.9]) props.cylinder(1.2, 0.07, place(0, y, 0, 0, f), SP.brass, 14)
  props.with("flat", () => props.sphere(1.15, [1, 0.6, 1], place(0, 2.05, 0, 0, f), SP.copperDark, 6))
  // Rebites nas cintas.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    for (const y of [0.7, 1.9]) props.box(0.05, 0.05, 0.05, place(Math.cos(a) * 0.61, y, Math.sin(a) * 0.61, 0, f), SP.brassDark)
  }
  // Chaminé, com saída de vapor.
  props.cylinder(0.24, 1.3, place(0.18, 2.75, 0.1, 0, f), SP.iron, 8)
  props.cone(0.36, 0.26, 0.18, place(0.18, 3.45, 0.1, 0, f), SP.ironHi, 8)
  const tip = xyzOf(place(0.18, 3.55, 0.1, 0, f))
  ctx.vents.push(tip)
  // Canos que descem para a base e voltam.
  props.pipe([[0.45, 1.6, -0.35], [0.85, 1.6, -0.35], [0.85, 0.6, -0.35]], 0.06, SP.brassDark, SP.bronze, f)
  props.pipe([[-0.5, 1.0, 0.3], [-0.85, 1.0, 0.3], [-0.85, 0.6, 0.3]], 0.06, SP.copperDark, SP.bronze, f)
  gauge(ctx, 0, 1.55, -0.6, f, 1.1)
  gauge(ctx, -0.32, 1.05, -0.55, f, 0.8)
  valveWheel(ctx, 0.3, 1.0, -0.6, f, 1)
  // Volante de inércia na lateral (gira).
  const fly = xf(0.62, 1.15, 0.25, 0, f, 0, Math.PI / 2)
  ctx.gears.push({ m: fly, r: 0.34, thick: 0.06, speed: 1.6 })
  props.box(0.1, 0.1, 0.1, xf(0.6, 1.15, 0.25, 0, f), SP.iron)
}

/** Posição do ponto de origem de uma matriz. */
export function xyzOf(m: Matrix): V3 {
  const a = m.asArray()
  return [a[12], a[13], a[14]]
}

// ── Chão: bueiros e grelhas ──────────────────────────────────────────────────

/** Tampa de bueiro de ferro com engrenagem em relevo (rente ao chão). */
export function manhole(ctx: SteamCtx, x: number, y: number, z: number, s = 1) {
  const { props } = ctx
  props.cylinder(1.0 * s, 0.014, place(x, y + 0.007, z), SP.ironWarm, 12)
  props.ring(0.94 * s, 0.05, Matrix.Scaling(1, 0.3, 1).multiply(place(x, y + 0.012, z)), SP.bronze, 12, 3)
  props.cylinder(0.3 * s, 0.02, place(x, y + 0.012, z), SP.ironHi, 8)
  for (const a of [0, Math.PI / 2]) props.box(0.8 * s, 0.016, 0.06, place(x, y + 0.012, z, a), SP.ironHi)
}

/** Grelha de drenagem retangular com moldura de latão. */
export function grate(ctx: SteamCtx, x: number, y: number, z: number, ry: number, w = 0.9, d = 0.45) {
  const { props } = ctx
  const f = place(x, y, z, ry)
  props.box(w, 0.012, d, place(0, 0.006, 0, 0, f), SP.iron)
  props.box(w + 0.08, 0.016, 0.05, place(0, 0.008, -d / 2, 0, f), SP.brassDark)
  props.box(w + 0.08, 0.016, 0.05, place(0, 0.008, d / 2, 0, f), SP.brassDark)
  for (let i = 1; i < 5; i++) props.box(0.04, 0.02, d - 0.04, place(-w / 2 + (w * i) / 5, 0.012, 0, 0, f), SP.ironHi)
}
