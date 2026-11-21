// features/meu-mundo/paint/engine/arenas/canion.ts — PAINT (2026-11-21): o desenho do CÂNION DAS TEMPESTADES (Zéphyra).
//
// FICHA
// O que é:   mesas de arenito flutuando num céu de fim de tarde com tempestade chegando; no meio, o PINÁCULO de
//            rocha em fiadas com saliências em volta; moinhos de vento e pontes de tábua (a gangorra da Gincana).
// Silhueta:  pináculo alto e torto de fiadas (quebra o céu), moinhos com pás em cruz, mesas-coluna no fundo em
//            três distâncias; nuvem de tempestade escura no alto com raio.
// Massas:    pináculo r 4,6 × 26 m; mesas da prova 3–10 m; mesas do fundo 12–30 m de largura.
// Paleta:    arenito 0,55–0,95 laranja-rosado em faixas; junta 0,3/0,14/0,1; grama 0,3–0,6 limão; madeira 0,35–0,62
//            marrom; acento: o azul-elétrico do raio e o branco da cachoeira (10%).
// Fora:      as gangorras e moinhos que MEXEM a regra (aqui tudo é parado; só as pás giram, sem colidir).
// Inventado: as escoras de madeira das saliências e a tempestade com raio.
//
// PARTES (ordem do plano: chão → embaixo → casco → meio → tags → base → topo → fundo)
// 1. chão de arenito (`tileTex("sand")`) + cor por tag (tábua marrom, saliência mais clara)
// 2. embaixo: nuvens (o comum) — o cânion fica no céu
// 3. casco: mesas e saliências = rocha comum (estratos do tema); tábua e pião = desenho daqui
// 4. o pináculo (prop `spire`): fiadas de blocos com junta escura, blocos que saltam, faixas de estrato
// 5. tags: tábua (pranchas + pivô de pedra embaixo + corda), pião (cone de faixas até a ponta), saliência
//    (escoras de madeira até o pináculo), moinho (torre, telhado, pás que giram)
// 6. base: moinho, cerca de tábua nas bordas mortas, tufos de capim, caixotes
// 7. topo: capa do pináculo (rocha que desce até a coluna), para-raios e a nuvem de tempestade com raio
// 8. fundo: mesas-coluna da Gincana em três anéis, piões soltos, tempestade
//
// Andamento (21/11, fotos no harness C:/wt/ph):
// 1–3 ok na 1ª. 4 pináculo: discos empilhados → blocos com junta (ok na 2ª). 5 saliência: rocha comum
// (cones enormes tapando o pináculo) → laje com barriga curta (ok na 2ª); moinho: telhado de ponta-cabeça
// → ok na 2ª; tufos: bolinhas verdes chapadas → touceiras de folhas (ok na 2ª). 6–8 ok na 1ª.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { SoftGeo, at } from "../../../gincana/engine/shapes"
import { mesaTower } from "../../../gincana/engine/backdrop-canion"
import type { RGB } from "../../../engine/geometry"
import type { Island, PaintProp } from "../../sim/map"
import { deadEdge, edgesOf } from "../arena-kit"
import type { ArenaCtx, ArenaDress } from "./types"
import { around, jit, meshes, mixc, mulc, rnd, tagOf, tileTex, v3, type Poly } from "./kit"

const SAND: RGB[] = [
  [0.88, 0.52, 0.34],
  [0.78, 0.42, 0.26],
  [0.94, 0.62, 0.4],
  [0.7, 0.36, 0.24],
]
const JOINT: RGB = [0.3, 0.14, 0.1]
const EDGE_HI: RGB = [1, 0.86, 0.66]
const WOOD: RGB = [0.56, 0.36, 0.22]
const WOOD_DK: RGB = [0.32, 0.2, 0.13]
const ROPE: RGB = [0.78, 0.66, 0.44]
const GRASS: RGB = [0.5, 0.68, 0.26]
const GRASS_DK: RGB = [0.3, 0.44, 0.16]
const BOLT: RGB = [0.62, 0.92, 1]

const islandOf = (ctx: ArenaCtx, p: PaintProp): Island | undefined => {
  let best: Island | undefined
  let bd = Infinity
  for (const isl of ctx.map.islands) {
    if (Math.abs(isl.y - p.y) > 0.5) continue
    const d = Math.hypot(isl.x - p.x, isl.z - p.z)
    if (d < bd) {
      bd = d
      best = isl
    }
  }
  return best
}

/** Parte 4 — o pináculo: fiadas de blocos de arenito com junta, blocos que saltam e faixas de estrato. */
function spire(poly: Poly, p: PaintProp) {
  const R = p.s
  const y0 = p.y - 1.2
  const y1 = p.y + p.h
  const bh = 2.3
  const n = 9
  // miolo escuro (só aparece nas juntas entre os blocos)
  const core: [number, number][] = []
  for (let i = 0; i < 16; i++) core.push([p.x + Math.sin((i / 16) * Math.PI * 2) * R * 0.9, p.z + Math.cos((i / 16) * Math.PI * 2) * R * 0.9])
  poly.stack(core, p.x, p.z, [
    { y: y1, k: 1, c: mixc(SAND[1], JOINT, 0.6) },
    { y: y0, k: 1, c: JOINT },
  ])
  let k = 0
  for (let y = y1; y > y0; y -= bh, k++) {
    const yb = Math.max(y0, y - bh)
    const h = y - yb - 0.16
    const rot = (k % 2) * (Math.PI / n) + rnd(k * 7 + 1) * 0.12
    const half = R * Math.tan(Math.PI / n) - 0.12
    for (let b = 0; b < n; b++) {
      const a = rot + (b / n) * Math.PI * 2
      // bloco: quina de cima clara, pé escuro; 1 em 6 salta para fora (silhueta quebrada)
      const pop = rnd(k * 31 + b) > 0.83 ? 0.45 : 0
      const r = R - 0.55 + pop + rnd(k * 17 + b) * 0.08
      const c = jit(SAND[(k + b * 3) % SAND.length], k * 13 + b, 0.07)
      poly.box(p.x + Math.sin(a) * r, yb + 0.08 + h / 2, p.z + Math.cos(a) * r, half + pop * 0.3, h / 2, 0.62, -a + Math.PI / 2, mixc(c, EDGE_HI, 0.45), c, mixc(c, JOINT, 0.5))
    }
  }
}

/** Parte 5 — moinho: torre de pedra e madeira, telhado de cone, pás em cruz (malha que gira). */
function windmill(ctx: ArenaCtx, lit: SoftGeo, poly: Poly, p: PaintProp, out: { x: number; z: number }, spin: { blades: Mesh[] }) {
  const r = p.s
  const ys = p.y
  const H = p.h
  const n = 8
  const O: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 8
    O.push([p.x + Math.sin(a) * r * 1.25, p.z + Math.cos(a) * r * 1.25])
  }
  // pé de pedra (2 fiadas) e corpo de tábua que afina
  poly.stack(O, p.x, p.z, [
    { y: ys + 1.6, k: 1, c: SAND[0] },
    { y: ys + 0.1, k: 1.06, c: mixc(SAND[1], JOINT, 0.4) },
    { y: ys - 0.3, k: 1.06, c: JOINT },
  ], 3)
  poly.stack(O, p.x, p.z, [
    { y: ys + H - 0.4, k: 0.72, c: (i) => (i % 2 ? WOOD : mixc(WOOD, [0.8, 0.62, 0.4], 0.3)) },
    { y: ys + 1.6, k: 0.98, c: (i) => (i % 2 ? WOOD_DK : WOOD) },
  ], 5)
  // janela acesa e porta
  const ox = out.x
  const oz = out.z
  const fa = Math.atan2(ox, oz)
  lit.box(0.7, 1.4, 0.12, at(p.x + ox * r * 1.2, ys + 0.8, p.z + oz * r * 1.2, fa), WOOD_DK)
  ctx.glow.box(0.42, 0.5, 0.05, Matrix.RotationY(fa).multiply(Matrix.Translation(p.x + ox * r * 0.98, ys + H * 0.6, p.z + oz * r * 0.98)), [1, 0.8, 0.42])
  // telhado: cone de telha com beiral
  lit.cylinder(r * 2.3, 0.25, at(p.x, ys + H - 0.3, p.z), [0.4, 0.2, 0.14], 8)
  lit.cylinder(r * 2.1, 2.2, at(p.x, ys + H + 0.8, p.z), (_x, y): RGB => mixc([0.75, 0.36, 0.22], [0.5, 0.22, 0.14], y + 0.5), 8, 0.12)
  // eixo e pás (a malha que gira em volta do eixo, de frente para fora)
  const hx = p.x + ox * (r + 0.5)
  const hz = p.z + oz * (r + 0.5)
  const hy = ys + H - 0.9
  lit.cylinder(0.32, r + 0.8, at(p.x + ox * (r * 0.5 + 0.2), hy, p.z + oz * (r * 0.5 + 0.2), fa, Math.PI / 2), WOOD_DK, 8)
  const bg = new SoftGeo()
  const L = Math.min(3.4, H * 0.46)
  for (let b = 0; b < 4; b++) {
    const m = Matrix.Translation(0, L / 2 + 0.3, 0).multiply(Matrix.RotationZ((b * Math.PI) / 2))
    bg.box(0.16, L, 0.1, m, WOOD_DK)
    // a vela de pano em grade (ripas)
    bg.box(0.9, L - 0.8, 0.04, Matrix.Translation(0.55, L / 2 + 0.6, 0.05).multiply(Matrix.RotationZ((b * Math.PI) / 2)), (x, y): RGB => (Math.abs(Math.sin(y * 4.4)) < 0.2 || Math.abs(x) > 0.36 ? WOOD : [0.95, 0.9, 0.78]))
  }
  bg.cylinder(0.5, 0.4, Matrix.RotationX(Math.PI / 2), [0.7, 0.5, 0.26], 8)
  const mesh = bg.build(`paint-canion-blades-${p.x | 0}-${p.z | 0}`, ctx.scene, ctx.solidMat, false)
  mesh.position.set(hx, hy, hz)
  mesh.rotation.y = fa
  ctx.add(mesh)
  spin.blades.push(mesh)
}

/** Parte 5 — tábua: pranchas de lado a lado, viga embaixo, pivô de pedra (a gangorra parada) e corda nos cantos. */
function plank(ctx: ArenaCtx, poly: Poly, lit: SoftGeo, isl: Island) {
  const E = edgesOf(isl)
  // eixo comprido = o maior lado
  let L = E[0]
  for (const e of E) if (e.len > L.len) L = e
  const ux = (L.bx - L.ax) / L.len
  const uz = (L.bz - L.az) / L.len
  let W = 0
  for (const e of E) if (e !== L && Math.abs((e.bx - e.ax) * ux + (e.bz - e.az) * uz) < 0.1) W = Math.max(W, e.len)
  W = W || 2.6
  const rot = Math.atan2(uz, ux)
  const along = L.len
  const nb = Math.round(along / 0.5)
  for (let b = 0; b < nb; b++) {
    const t = -along / 2 + (b + 0.5) * (along / nb)
    const c = jit(mixc(WOOD, [0.78, 0.58, 0.38], rnd(b * 3 + isl.id) * 0.5), b + isl.id * 11, 0.1)
    // prancha (por cima do chão: cobre a textura de arenito), junta escura entre elas
    poly.box(isl.x + ux * t, isl.y - 0.11, isl.z + uz * t, 0.22, 0.125, W / 2 + (b % 3 === 1 ? 0.12 : 0.02), -rot, mixc(c, [0.92, 0.78, 0.56], 0.2), c, WOOD_DK)
  }
  // duas vigas por baixo e o pivô (cunha de pedra) no meio
  for (const s of [-1, 1]) poly.box(isl.x + -uz * s * (W / 2 - 0.35), isl.y - 0.45, isl.z + ux * s * (W / 2 - 0.35), along / 2 + 0.2, 0.2, 0.18, -rot, WOOD_DK)
  const px = isl.x
  const pz = isl.z
  const O: [number, number][] = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    O.push([px + Math.sin(a) * 1.4, pz + Math.cos(a) * 1.4])
  }
  poly.stack(O, px, pz, [
    { y: isl.y - 0.6, k: 0.5, c: SAND[2] },
    { y: isl.y - 1.4, k: 1, c: SAND[0] },
    { y: isl.y - 2.6, k: 1.1, c: SAND[1], j: 0.15 },
    { y: isl.y - 4.6, k: 0.6, c: SAND[3], j: 0.2 },
    { y: isl.y - 7, k: 0.08, c: JOINT },
  ], isl.id)
  // postes nos quatro cantos com corda baixa ao longo (só desenho)
  for (const s of [-1, 1])
    for (const e of [-1, 1]) {
      const x = isl.x + ux * e * (along / 2 - 0.2) + -uz * s * (W / 2 + 0.05)
      const z = isl.z + uz * e * (along / 2 - 0.2) + ux * s * (W / 2 + 0.05)
      if (!ctx.clear.free(x, isl.y, z, 0.3)) continue
      lit.cylinder(0.16, 1.1, at(x, isl.y + 0.45, z), WOOD_DK, 6)
    }
  for (const s of [-1, 1]) {
    const a = v3(isl.x - ux * (along / 2 - 0.2) + -uz * s * (W / 2 + 0.05), isl.y + 0.85, isl.z - uz * (along / 2 - 0.2) + ux * s * (W / 2 + 0.05))
    const b = v3(isl.x + ux * (along / 2 - 0.2) + -uz * s * (W / 2 + 0.05), isl.y + 0.85, isl.z + uz * (along / 2 - 0.2) + ux * s * (W / 2 + 0.05))
    const mid = a.add(b).scale(0.5)
    mid.y -= 0.25
    lit.tube(a, mid, 0.035, ROPE, 4)
    lit.tube(mid, b, 0.035, ROPE, 4)
  }
}

/** Parte 5 — pião de pedra: disco da borda e cone de faixas até a ponta. */
function spintop(poly: Poly, ctx: ArenaCtx, isl: Island) {
  const O = ctx.outlineOf(isl, 0.8)
  const rings = [
    { y: isl.y, k: 1, c: GRASS_DK },
    { y: isl.y - 0.35, k: 1.06, c: SAND[2] },
    { y: isl.y - 0.9, k: 1.08, c: SAND[0] },
    { y: isl.y - 1.1, k: 1.0, c: mixc(SAND[0], JOINT, 0.5) },
    { y: isl.y - 2.2, k: 0.78, c: SAND[1] },
    { y: isl.y - 2.5, k: 0.7, c: mixc(SAND[1], JOINT, 0.5) },
    { y: isl.y - 3.8, k: 0.42, c: SAND[3] },
    { y: isl.y - 5.6, k: 0.06, c: JOINT },
  ]
  poly.stack(O, isl.x, isl.z, rings, isl.id)
}

/** Parte 5 — saliência: laje de arenito em faixas e barriga curta que afina (não esconde o pináculo). */
function shelf(poly: Poly, ctx: ArenaCtx, isl: Island) {
  const O = ctx.outlineOf(isl, 1)
  poly.stack(O, isl.x, isl.z, [
    { y: isl.y, k: 1, c: [0.72, 0.46, 0.3] },
    { y: isl.y - 0.3, k: 1.02, c: EDGE_HI },
    { y: isl.y - 0.4, k: 1.02, c: SAND[2] },
    { y: isl.y - 1.1, k: 1.0, c: SAND[0] },
    { y: isl.y - 1.3, k: 0.94, c: mixc(SAND[0], JOINT, 0.6) },
    { y: isl.y - 2.3, k: 0.7, c: SAND[1], j: 0.08 },
    { y: isl.y - 2.5, k: 0.62, c: mixc(SAND[1], JOINT, 0.5), j: 0.08 },
    { y: isl.y - 3.8, k: 0.18, c: SAND[3], j: 0.2 },
  ], isl.id)
}

/** Parte 5 — escoras de madeira das saliências do anel de dentro até o pináculo. */
function braces(lit: SoftGeo, isl: Island, spireR: number) {
  const a = Math.atan2(isl.x, isl.z)
  for (const da of [-0.16, 0.16]) {
    const aa = a + da
    const top = v3(Math.sin(aa) * (spireR + 2.6), isl.y - 0.5, Math.cos(aa) * (spireR + 2.6))
    const foot = v3(Math.sin(aa) * (spireR + 0.2), isl.y - 3.6, Math.cos(aa) * (spireR + 0.2))
    lit.tube(foot, top, 0.16, WOOD_DK, 5)
    lit.box(0.5, 0.5, 0.5, at(foot.x, foot.y, foot.z, aa), [0.24, 0.22, 0.22])
  }
}

/** Parte 6 — tufos de capim junto das bordas (onde não tapa nada). */
function tufts(ctx: ArenaCtx, lit: SoftGeo, isl: Island, n: number) {
  for (let k = 0; k < n; k++) {
    const a = rnd(isl.id * 53 + k) * Math.PI * 2
    const pt = ctx.edgePoint(isl, a, 0)
    const x = isl.x + (pt.x - isl.x) * 0.86
    const z = isl.z + (pt.z - isl.z) * 0.86
    if (!ctx.clear.free(x, isl.y, z, 0.6)) continue
    const s = 0.5 + rnd(k * 3 + isl.id) * 0.4
    for (let b = 0; b < 4; b++) {
      const ba = rnd(k * 7 + b + isl.id) * Math.PI * 2
      lit.cylinder(0.16, s * (0.7 + b * 0.12), at(x + Math.sin(ba) * 0.16, isl.y + s * 0.3, z + Math.cos(ba) * 0.16, ba, 0.25 * (b % 2 ? 1 : -1)), (_x, y): RGB => (y > 0 ? GRASS : GRASS_DK), 4, 0.01)
    }
  }
}

/** Parte 6 — cerca de tábua nas bordas mortas da base (onde não se faz ponte). */
function fence(ctx: ArenaCtx, lit: SoftGeo, isl: Island) {
  for (const e of edgesOf(isl)) {
    const mx = (e.ax + e.bx) / 2
    const mz = (e.az + e.bz) / 2
    if (e.len < 2 || !deadEdge(ctx.map, isl, mx, mz, e.nx, e.nz)) continue
    const steps = Math.max(1, Math.round(e.len / 1.4))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = e.ax + (e.bx - e.ax) * t - e.nx * 0.25
      const z = e.az + (e.bz - e.az) * t - e.nz * 0.25
      if (!ctx.clear.free(x, isl.y, z, 0.4)) continue
      lit.box(0.16, 1 + (s % 2) * 0.15, 0.16, at(x, isl.y + 0.5, z, s * 0.3), jit(WOOD, s + isl.id * 7))
    }
    const ang = Math.atan2(e.bx - e.ax, e.bz - e.az)
    if (ctx.clear.free(mx - e.nx * 0.25, isl.y, mz - e.nz * 0.25, e.len / 2 - 0.4)) {
      lit.box(0.08, 0.14, e.len, at(mx - e.nx * 0.25, isl.y + 0.78, mz - e.nz * 0.25, ang), WOOD)
      lit.box(0.08, 0.12, e.len, at(mx - e.nx * 0.25, isl.y + 0.4, mz - e.nz * 0.25, ang), WOOD_DK)
    }
  }
}

/** Parte 6 — acácia pequena (só onde cabe). */
function acacia(ctx: ArenaCtx, lit: SoftGeo, isl: Island, seed: number) {
  for (let tries = 0; tries < 6; tries++) {
    const a = rnd(seed * 13 + tries) * Math.PI * 2
    const d = isl.r * (0.35 + rnd(seed * 7 + tries) * 0.35)
    const x = isl.x + Math.sin(a) * d
    const z = isl.z + Math.cos(a) * d
    if (!ctx.clear.free(x, isl.y, z, 1.6)) continue
    const h = 2.6 + rnd(seed) * 1.4
    const top = v3(x + (rnd(seed + 1) - 0.5) * 1.2, isl.y + h, z + (rnd(seed + 2) - 0.5) * 1.2)
    lit.tube(v3(x, isl.y - 0.1, z), top, 0.2, [0.34, 0.22, 0.14], 6)
    lit.sphere(3.2, at(top.x, top.y, top.z), [0.22, 0.38, 0.14], 7, 1, 0.24, 0.9)
    lit.sphere(2.6, at(top.x + 0.3, top.y + 0.45, top.z - 0.2), [0.46, 0.66, 0.24], 7, 1, 0.22, 0.9)
    return
  }
}

export const CANION_DRESS: ArenaDress = {
  topTex: (scene) => tileTex(scene, "sand"),
  under: (isl) => {
    const t = tagOf(isl)
    return t === "plank" || t === "spintop" || t === "spiretop" || t === "ledge" ? "none" : undefined
  },
  rockPick: (isl) => (tagOf(isl) === "ledge" ? 0.15 : tagOf(isl) === "mesa" ? 0.2 + rnd(isl.id) * 0.3 : undefined),
  colors: (isl) => {
    const t = tagOf(isl)
    if (t === "plank") return { top: WOOD, rim: WOOD_DK }
    if (t === "spintop") return { top: [0.86, 0.6, 0.42], rim: GRASS_DK }
    if (t === "ledge" || t === "spiretop") return { top: [0.94, 0.7, 0.5], rim: [0.72, 0.46, 0.3] }
    return null
  },
  frame: { band: [0.62, 0.4, 0.26], corbel: [0.5, 0.3, 0.2] },
  gate: { stone: [0.8, 0.56, 0.38], tech: false },
  prop: (p) => p.tag === "spire" || p.tag === "windmill",
  build(ctx) {
    const { lit, glow, poly, done } = meshes(ctx, "canion")
    const spin = { blades: [] as Mesh[] }
    // 4. o pináculo e 5. os moinhos (desenhados aqui; a colisão é a do pilar)
    for (const p of ctx.map.props) {
      if (p.tag === "spire") spire(poly, p)
      if (p.tag === "windmill") {
        const isl = islandOf(ctx, p)
        let ox = isl ? p.x - isl.x : -1
        let oz = isl ? p.z - isl.z : 0
        const l = Math.hypot(ox, oz) || 1
        ox /= l
        oz /= l
        windmill(ctx, lit, poly, p, { x: ox, z: oz }, spin)
      }
    }
    const spireP = ctx.map.props.find((p) => p.tag === "spire")
    for (const isl of ctx.map.islands) {
      const t = tagOf(isl)
      if (t === "plank") plank(ctx, poly, lit, isl)
      else if (t === "spintop") {
        spintop(poly, ctx, isl)
        tufts(ctx, lit, isl, 4)
      } else if (t === "ledge") {
        shelf(poly, ctx, isl)
        if (spireP && Math.hypot(isl.x, isl.z) < 10) braces(lit, isl, spireP.s)
      }
      else if (t === "mesa" && isl.kind === "wing") acacia(ctx, lit, isl, isl.id)
      if (t === "mesa" || t === "mill") tufts(ctx, lit, isl, Math.round(isl.r * 1.6))
      if (isl.kind === "base") fence(ctx, lit, isl)
    }
    // 7. topo: a capa do pináculo desce até a coluna; para-raios nas bordas
    const top = ctx.map.islands.find((i) => tagOf(i) === "spiretop")
    if (top && spireP) {
      const O = ctx.outlineOf(top, 1)
      const kc = (spireP.s * 1.02) / top.r
      poly.stack(O, top.x, top.z, [
        { y: top.y, k: 1, c: [0.72, 0.46, 0.3] },
        { y: top.y - 0.5, k: 1.06, c: SAND[2], j: 0.04 },
        { y: top.y - 1.4, k: 1.0, c: SAND[0], j: 0.05 },
        { y: top.y - 1.7, k: 0.92, c: mixc(SAND[0], JOINT, 0.6) },
        { y: spireP.y + spireP.h - 0.2, k: kc, c: SAND[1] },
        { y: spireP.y + spireP.h - 1.2, k: kc * 0.98, c: SAND[3] },
      ], top.id)
      for (const s of [-1, 1]) {
        const x = 0
        const z = s * (top.r - 0.7)
        if (!ctx.clear.free(x, top.y, z, 0.4)) continue
        lit.cylinder(0.2, 3.4, at(x, top.y + 1.7, z), [0.36, 0.34, 0.36], 6, 0.06)
        glow.sphere(0.36, at(x, top.y + 3.5, z), BOLT, 6)
      }
    }
    // 8. fundo: mesas-coluna em três anéis (perto/meio/longe), sem tapar o caminho do Guardião (norte)
    const skipN = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.22
    const n = ctx.n
    for (const s of around(Math.round(14 * Math.min(1, n)), 86, 120, 1, skipN)) mesaTower(lit, glow, s.x, -2 + rnd(s.i * 3) * 14, s.z, 12 + rnd(s.i * 5) * 8, 4 + Math.floor(rnd(s.i * 7) * 3), s.i, s.i % 3 === 0)
    for (const s of around(Math.round(16 * Math.min(1, n)), 140, 180, 2, skipN)) mesaTower(lit, glow, s.x, 6 + rnd(s.i * 3 + 1) * 22, s.z, 18 + rnd(s.i * 5 + 1) * 10, 5 + Math.floor(rnd(s.i * 7 + 1) * 3), s.i + 40, s.i % 4 === 0, true)
    for (const s of around(Math.round(12 * n), 60, 150, 3, skipN)) {
      // piões soltos no ar (pedra com tampa de grama)
      const r = 1.6 + rnd(s.i * 11) * 2.2
      const y = -8 + rnd(s.i * 13) * 30
      if (Math.hypot(s.x, s.z) < 66) continue
      lit.cylinder(r * 2, 0.5, at(s.x, y + 0.25, s.z), GRASS, 9)
      lit.cylinder(0.2, r * 2.4, at(s.x, y - r * 1.2, s.z, s.a), (_x, yy): RGB => mixc(JOINT, SAND[(s.i % 3) + 1], Math.min(1, yy / (r * 2.4) + 0.6)), 7, r * 2)
    }
    // tempestade de Zéphyra: nuvem escura alta com raios que piscam (malha própria)
    const storm = new SoftGeo()
    for (const s of around(9, 70, 150, 4, skipN)) {
      const y = 62 + rnd(s.i * 3) * 14
      for (let k = 0; k < 4; k++) lit.sphere(22 + rnd(s.i * 7 + k) * 14, at(s.x + (rnd(s.i + k * 5) - 0.5) * 30, y + rnd(k + s.i) * 5, s.z + (rnd(s.i * 9 + k) - 0.5) * 20), (_x, yy): RGB => (yy < 0 ? [0.3, 0.3, 0.42] : [0.56, 0.52, 0.64]), 6, 1, 0.38, 1)
      // o raio: zigue-zague de caixas finas até as mesas
      let x = s.x
      let z = s.z
      let yb = y - 6
      for (let k = 0; k < 7; k++) {
        const nx = x + (rnd(s.i * 31 + k) - 0.5) * 9
        const nz = z + (rnd(s.i * 37 + k) - 0.5) * 9
        const ny = yb - 7
        storm.tube(v3(x, yb, z), v3(nx, ny, nz), 0.35, BOLT, 4)
        x = nx
        z = nz
        yb = ny
      }
    }
    const bolts = storm.build("paint-canion-bolts", ctx.scene, ctx.glowMat)
    ctx.add(bolts)
    bolts.isVisible = false
    done()
    let next = 3
    let on = 0
    return {
      tick(dt, clock) {
        for (const b of spin.blades) b.rotation.z = clock * 0.9
        // raio: pisca duas vezes a cada 5–9 s
        if (on > 0) {
          on -= dt
          bolts.isVisible = on > 0 && Math.floor(on * 14) % 3 !== 1
        } else if (clock > next) {
          on = 0.32
          next = clock + 5 + ((clock * 7.3) % 4)
        }
      },
    }
  },
}
