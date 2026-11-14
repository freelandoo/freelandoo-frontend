// features/meu-mundo/jetpack/engine/pecas/comuns.ts — formas de base do Jetpack em código.
//
// Caixa, cilindro e cristal com cor por vértice (quina clara, pé escuro: skill `meu-mundo-cenario-codigo`)
// e as peças dos OBSTÁCULOS, que toda fase usa com a sua paleta: galão, rocha e cristal que cobrem o disco
// da colisão (raio 1 no plano XY), engrenagem de dentes (raio da regra = pé dos dentes) e a moldura
// (pedaço de viga + canto) do `useFrameKit`.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { CreateIcoSphereVertexData } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder"
import { Geo, noise, TAU, type RGB, type V3 } from "../../../engine/cena-codigo/kit"
import { face, mix, mul, rnd } from "../../../engine/cena-codigo/kit-natureza"
import { engrenagemCopia } from "../../../engine/cena-codigo/pecas/fabrica"
import { moved, novaPeca, type Peca } from "./peca"

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]

/**
 * Caixa (centro c, tamanho s), girada `ry` em y: lados com degradê (pé `ao` × a cor → cor), tampa clara
 * com desgaste de quina (`wear`), fundo escuro (só se `fundo`).
 */
export function caixa(g: Geo, c: V3, s: V3, col: RGB, o: { top?: RGB; ao?: number; ry?: number; wear?: number; fundo?: boolean; frente?: RGB } = {}) {
  const ry = o.ry ?? 0, cr = Math.cos(ry), sr = Math.sin(ry)
  const P = (x: number, y: number, z: number): V3 => [c[0] + x * cr + z * sr, c[1] + y, c[2] - x * sr + z * cr]
  const N = (x: number, z: number): V3 => [x * cr + z * sr, 0, -x * sr + z * cr]
  const hx = s[0] / 2, hy = s[1] / 2, hz = s[2] / 2
  const ao = o.ao ?? 0.72
  const lo = mul(col, ao)
  const sides: [V3[], V3, RGB][] = [
    [[P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz)], N(0, -1), o.frente ?? col],
    [[P(hx, -hy, -hz), P(hx, -hy, hz), P(hx, hy, hz), P(hx, hy, -hz)], N(1, 0), col],
    [[P(hx, -hy, hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(hx, hy, hz)], N(0, 1), col],
    [[P(-hx, -hy, hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(-hx, hy, hz)], N(-1, 0), col],
  ]
  for (const [pts, n, cc] of sides) face(g, pts, [mul(cc, ao), mul(cc, ao), cc, cc], n, (o.wear ?? 0.3) * 0.5)
  face(g, [P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(-hx, hy, hz)], o.top ?? mix(col, [1, 1, 1], 0.12), [0, 1, 0], o.wear ?? 0.3)
  if (o.fundo) face(g, [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz)], mul(lo, 0.8), [0, -1, 0])
}

/** Cilindro (ou tronco de cone) de `a` a `b`, `n` lados, tampas planas; degradê do pé (`a`) para a ponta. */
export function cil(g: Geo, a: V3, b: V3, ra: number, rb: number, n: number, col: RGB, o: { colB?: RGB; tampa?: RGB | null; base?: boolean; ao?: number } = {}) {
  const ax = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]])
  const ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const u = norm(cross(ax, ref)), v = cross(ax, u)
  const ring = (p: V3, r: number) => Array.from({ length: n }, (_, k) => {
    const th = (k / n) * TAU
    return add(add(p, u, Math.cos(th) * r), v, Math.sin(th) * r)
  })
  const A = ring(a, ra), B = ring(b, rb)
  const cA = mul(col, o.ao ?? 0.75), cB = o.colB ?? col
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n, th = ((k + 0.5) / n) * TAU
    const out = add(add([0, 0, 0], u, Math.cos(th)), v, Math.sin(th))
    face(g, [A[k], A[j], B[j], B[k]], [cA, cA, cB, cB], out)
  }
  if (o.tampa !== null) face(g, B, o.tampa ?? mix(cB, [1, 1, 1], 0.12), ax, 0.4)
  if (o.base) face(g, A, mul(cA, 0.8), [-ax[0], -ax[1], -ax[2]])
}

/** Cristal: prisma de `n` lados de `base` na direção `dir`, raio r, corpo `len` e ponta de `tip`; faces em 3 tons. */
export function cristal(g: Geo, base: V3, dir: V3, r: number, len: number, tip: number, n: number, cols: readonly [RGB, RGB, RGB], seed = 0) {
  const ax = norm(dir)
  const ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const u = norm(cross(ax, ref)), v = cross(ax, u)
  const top = add(base, ax, len), apex = add(base, ax, len + tip)
  const ring = (p: V3, rr: number) => Array.from({ length: n }, (_, k) => {
    const th = (k / n) * TAU + seed
    return add(add(p, u, Math.cos(th) * rr), v, Math.sin(th) * rr)
  })
  const A = ring(base, r * 0.92), B = ring(top, r)
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n, th = ((k + 0.5) / n) * TAU + seed
    const out = add(add([0, 0, 0], u, Math.cos(th)), v, Math.sin(th))
    const t = rnd(k, seed, 3.1)
    const c = t < 0.33 ? cols[0] : t < 0.66 ? cols[1] : cols[2]
    face(g, [A[k], A[j], B[j], B[k]], [mul(cols[0], 0.8), mul(cols[0], 0.8), c, c], out)
    face(g, [B[k], B[j], apex], [c, c, cols[2]], add(out, ax, 0.6), 1)
  }
}

/** Icosfera facetada amassada pelo ruído (raio rx, ry, rz) e pintada por `paint(normal, y)`. */
export function bolha(g: Geo, c: V3, r: V3, sub: number, seed: number, amp: number, paint: (n: V3, y: number, k: number) => RGB, minR = 0) {
  const vd = CreateIcoSphereVertexData({ radius: 1, subdivisions: sub, flat: true })
  const p = vd.positions as number[]
  const idx = vd.indices as number[]
  const disp = (x: number, y: number, z: number) => {
    const k = 1 + amp * (noise(x * 1.7 + seed, y * 1.7 + seed * 0.3, z * 1.7) - 0.5) * 2
    return Math.max(k, minR)
  }
  for (let t = 0; t < idx.length; t += 3) {
    const q = [idx[t], idx[t + 1], idx[t + 2]].map((i): V3 => {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]
      const k = disp(x, y, z)
      return [c[0] + x * k * r[0], c[1] + y * k * r[1], c[2] + z * k * r[2]]
    })
    const m: V3 = [(q[0][0] + q[1][0] + q[2][0]) / 3 - c[0], (q[0][1] + q[1][1] + q[2][1]) / 3 - c[1], (q[0][2] + q[1][2] + q[2][2]) / 3 - c[2]]
    const nn = norm(cross([q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]], [q[2][0] - q[0][0], q[2][1] - q[0][1], q[2][2] - q[0][2]]))
    const n = nn[0] * m[0] + nn[1] * m[1] + nn[2] * m[2] < 0 ? ([-nn[0], -nn[1], -nn[2]] as V3) : nn
    face(g, q, paint(n, m[1] + c[1], t / 3), m)
  }
}

// ═══════════════ OBSTÁCULOS ═══════════════

export interface PalObst {
  /** Pedra: escura, meio, clara (topo). */
  pedra: readonly [RGB, RGB, RGB]
  /** Topo da pedra (neve, musgo, areia) — null = sem. */
  capa?: RGB | null
  /** Luz das rachas da pedra (null = sem). */
  racha?: RGB | null
  /** Cristal: fundo, meio, quina (acesos no miolo). */
  gema: readonly [RGB, RGB, RGB]
  gemaLuz: RGB
  /** Galão: corpo, faixa acesa. */
  galao: RGB
  galaoLuz: RGB
}

/** ROCHA do voo: cobre o disco de raio 1 no plano XY (nunca menor que a colisão), fundo ±0,8. Só balança. */
export function rochaVoo(P: PalObst, seed = 3): Peca {
  const out = novaPeca()
  const [esc, meio, cl] = P.pedra
  bolha(out.body, [0, 0, 0], [1.12, 1.1, 0.82], 2, seed, 0.14, (n, y, k) => {
    const up = n[1]
    if (P.capa && up > 0.3 && y > 0.05) return mix(P.capa, [1, 1, 1], rnd(k, seed) * 0.12)
    const t = 0.5 + 0.5 * up + (rnd(k, seed, 2) - 0.5) * 0.35
    return t < 0.5 ? mix(esc, meio, t * 2) : mix(meio, cl, t * 2 - 1)
  }, 0.94 / 1.1)
  if (P.racha) {
    // rachas acesas: veios finos na frente (−z), quentes no meio
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + rnd(k, seed) * 0.8
      let x = Math.cos(a) * 0.15, y = Math.sin(a) * 0.15
      for (let j = 0; j < 4; j++) {
        const nx = x + Math.cos(a + (rnd(j, k, seed) - 0.5) * 1.2) * 0.2, ny = y + Math.sin(a + (rnd(j, k, seed) - 0.5) * 1.2) * 0.2
        const w = 0.035 * (1 - j * 0.18), px = -(ny - y), py = nx - x, l = Math.hypot(px, py) || 1
        const z0 = -Math.sqrt(Math.max(0.05, 1 - (x * x + y * y) / 1.25)) * 0.82 - 0.03
        const z1 = -Math.sqrt(Math.max(0.05, 1 - (nx * nx + ny * ny) / 1.25)) * 0.82 - 0.03
        out.glow.quad([x - (px / l) * w, y - (py / l) * w, z0], [x + (px / l) * w, y + (py / l) * w, z0], [nx + (px / l) * w, ny + (py / l) * w, z1], [nx - (px / l) * w, ny - (py / l) * w, z1], j < 2 ? P.racha : mul(P.racha, 0.7))
        x = nx
        y = ny
      }
    }
  }
  return out
}

/** CRISTAL do voo: gema de 8 lados que cobre o disco (raio 1,06) + pontas em leque no plano XY; miolo aceso. */
export function cristalVoo(P: PalObst, seed = 5): Peca {
  const out = novaPeca()
  const [f, m, q] = P.gema
  // o miolo: bipirâmide de 8 lados, raio 1,06 (cobre o disco), pontas em ±z
  const R = 1.06, n = 8
  const ring: V3[] = Array.from({ length: n }, (_, k) => [Math.cos(((k + 0.5) / n) * TAU) * R, Math.sin(((k + 0.5) / n) * TAU) * R, 0])
  for (const tz of [-0.85, 0.85]) {
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n
      const mid: V3 = [(ring[k][0] + ring[j][0]) / 2, (ring[k][1] + ring[j][1]) / 2, tz]
      face(out.body, [ring[k], ring[j], [0, 0, tz]], [k % 2 ? m : f, k % 2 ? m : f, q], mid, 0.6)
    }
  }
  // o miolo aceso visto pela frente (losango interno)
  const ins = ring.map((p): V3 => [p[0] * 0.42, p[1] * 0.42, -0.86 * 0.58])
  for (let k = 0; k < n; k++) out.glow.quad(ins[k], ins[(k + 1) % n], [0, 0, -0.86 * 0.6], [0, 0, -0.86 * 0.6], P.gemaLuz)
  // pontas em leque (saem da borda, no plano)
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + rnd(k, seed) * 0.5
    const d: V3 = [Math.cos(a), Math.sin(a), (rnd(k, seed, 2) - 0.5) * 0.4]
    cristal(out.body, [d[0] * 0.75, d[1] * 0.75, d[2] * 0.3], d, 0.2 + rnd(k, seed, 3) * 0.1, 0.35 + rnd(k, seed, 4) * 0.3, 0.25, 5, [f, m, q], k)
  }
  return out
}

/** ENGRENAGEM do voo: plano XY, frente −z; o pé dos dentes fica no raio 1 (a colisão), disco de fundo fechado. */
export function engrenagemVoo(cor: RGB, fundo: RGB, luz: RGB | null = null): Peca {
  const out = novaPeca()
  engrenagemCopia(out.body, [0, 0, 0], [1, 0, 0], [0, -1, 0], 1.0 / 0.86, 0.36, 0, { dentes: 12, raios: 5, cor })
  // disco de fundo (o vão entre os raios não deixa ver através: a colisão é o disco inteiro)
  const n = 18
  const disco: V3[] = Array.from({ length: n }, (_, k) => [Math.cos((k / n) * TAU) * 0.8, Math.sin((k / n) * TAU) * 0.8, 0.02])
  face(out.body, disco, fundo, [0, 0, -1])
  face(out.body, disco.map((p): V3 => [p[0], p[1], 0.04]), fundo, [0, 0, 1])
  if (luz) {
    // o miolo aceso entre os raios (brasa/energia), atrás dos raios
    const m: V3[] = Array.from({ length: n }, (_, k) => [Math.cos((k / n) * TAU) * 0.74, Math.sin((k / n) * TAU) * 0.74, 0.0])
    for (let k = 0; k < n; k++) out.glow.quad(m[k], m[(k + 1) % n], [m[(k + 1) % n][0] * 0.3, m[(k + 1) % n][1] * 0.3, 0], [m[k][0] * 0.3, m[k][1] * 0.3, 0], luz)
  }
  return out
}

/** O galão de toda fase: verde de combustível com a faixa acesa (a coleta se reconhece de longe). */
export const GALAO: RGB = [0.16, 0.62, 0.3]
export const GALAO_LUZ: RGB = [0.75, 1, 0.45]

/**
 * GALÃO (a coleta): bombona de 0,8 de diâmetro × 0,9 com aros em relevo, tampa com alça e bico, e as duas
 * faixas ACESAS (é a cor da coleta, de longe). Centro na origem. O jogo assa 1,15×.
 */
export function galaoVoo(P: PalObst): Peca {
  const out = novaPeca()
  const B = out.body, G = out.glow
  const c = P.galao, esc = mul(c, 0.5), cl = mix(c, [1, 1, 1], 0.3)
  const n = 14
  cil(B, [0, -0.45, 0], [0, 0.36, 0], 0.39, 0.39, n, c, { colB: cl, tampa: null, base: true, ao: 0.6 })
  // ombro e tampa
  cil(B, [0, 0.36, 0], [0, 0.43, 0], 0.39, 0.3, n, cl, { tampa: mix(cl, [1, 1, 1], 0.2) })
  cil(B, [0, 0.43, 0], [0, 0.47, 0], 0.13, 0.13, 10, [0.12, 0.12, 0.14])
  // alça em arco em cima e o bico na frente
  caixa(B, [0, 0.52, 0.12], [0.05, 0.1, 0.05], esc)
  caixa(B, [0, 0.52, -0.12], [0.05, 0.1, 0.05], esc)
  caixa(B, [0, 0.58, 0], [0.06, 0.04, 0.3], cl, { wear: 1 })
  cil(B, [0.2, 0.42, -0.1], [0.27, 0.5, -0.17], 0.045, 0.04, 6, esc, { tampa: [0.1, 0.1, 0.1] })
  // aros em relevo (anéis escuros) e as faixas acesas entre eles
  for (const y of [-0.38, 0.28]) cil(B, [0, y - 0.03, 0], [0, y + 0.03, 0], 0.405, 0.405, n, esc, { tampa: null })
  for (const [y0, y1] of [[-0.2, -0.12], [0.06, 0.14]] as const) cil(G, [0, y0, 0], [0, y1, 0], 0.397, 0.397, n, P.galaoLuz, { tampa: null, ao: 1 })
  return out
}

/** Peça da moldura do jogo: de frente para −z, pé da frente em z = 0, indo para +z. O `useFrameKit` desvira meia-volta: aqui ela já vai virada. */
const virada = (p: Peca) => moved(p, Matrix.RotationY(Math.PI))

export interface PalViga {
  corpo: RGB
  quina: RGB
  fundo: RGB
  faixa: RGB | null
  luz: RGB | null
}
/** Medidas da moldura em código (as que o `useFrameKit` recebe). */
export const MOLDURA = { len: 2.4, arm: 0.5, armLen: 0.9 } as const

/** Pedaço de viga: x ∈ ±len/2, y ∈ ±0,5, z ∈ 0..0,9 (frente em z = 0). Chapas, quina clara, faixa e filete aceso. */
export function vigaVoo(P: PalViga, estilo: "metal" | "pedra" | "madeira" | "gelo"): Peca {
  const out = novaPeca()
  const B = out.body, G = out.glow
  const L = MOLDURA.len
  if (estilo === "pedra" || estilo === "gelo") {
    // blocos assentados (3 por pedaço), cada um com quina clara e junta escura
    for (let k = 0; k < 3; k++) {
      const x = -L / 2 + (k + 0.5) * (L / 3)
      const j = (rnd(k, 7) - 0.5) * 0.06
      caixa(B, [x, j, 0.45], [L / 3 - 0.05, 0.94, 0.86], k % 2 ? P.corpo : mix(P.corpo, P.quina, 0.18), { top: P.quina, wear: 1, frente: k % 2 ? mix(P.corpo, P.quina, 0.1) : P.corpo })
    }
    caixa(B, [0, 0, 0.47], [L, 0.86, 0.8], P.fundo, { top: P.fundo })
  } else if (estilo === "madeira") {
    cil(B, [-L / 2, 0, 0.45], [L / 2, 0, 0.45], 0.47, 0.47, 9, P.corpo, { colB: mix(P.corpo, P.quina, 0.25), tampa: P.quina })
    for (const x of [-0.7, 0.55]) cil(B, [x - 0.05, 0, 0.45], [x + 0.05, 0, 0.45], 0.5, 0.5, 9, P.fundo, { tampa: P.fundo })
  } else {
    // viga I: duas mesas e a alma, com chapas e rebites
    caixa(B, [0, 0.4, 0.45], [L, 0.2, 0.9], P.corpo, { top: P.quina, wear: 1 })
    caixa(B, [0, -0.4, 0.45], [L, 0.2, 0.9], P.corpo, { top: P.quina, wear: 1 })
    caixa(B, [0, 0, 0.5], [L, 0.62, 0.36], P.fundo)
    for (let k = 0; k < 4; k++) caixa(B, [-L / 2 + 0.3 + k * ((L - 0.6) / 3), 0, 0.31], [0.06, 0.62, 0.05], P.quina, { wear: 1 })
  }
  if (P.faixa) {
    // listras de perigo na frente
    const n = 8
    for (let k = 0; k < n; k++) {
      const x0 = -L / 2 + (k / n) * L, x1 = x0 + L / n
      B.quad([x0, -0.12, -0.012], [x1, -0.12, -0.012], [x1 + 0.12, 0.12, -0.012], [x0 + 0.12, 0.12, -0.012], k % 2 ? [0.04, 0.04, 0.05] : P.faixa, 0.5)
    }
  }
  if (P.luz) G.quad([-L / 2, 0.3, -0.02], [L / 2, 0.3, -0.02], [L / 2, 0.36, -0.02], [-L / 2, 0.36, -0.02], P.luz)
  return virada(out)
}

/** Canto "┐" (de cima à direita): braços de espessura `arm` e comprimento `armLen` indo para −x e −y; frente em z = 0. */
export function cantoVoo(P: PalViga, estilo: "metal" | "pedra" | "madeira" | "gelo"): Peca {
  const out = novaPeca()
  const B = out.body, G = out.glow
  const { arm, armLen } = MOLDURA
  const d = 0.9
  // os dois braços e o bloco do canto (mais saliente, com a quina clara)
  caixa(B, [-armLen / 2, -arm / 2, d / 2], [armLen, arm, d], P.corpo, { top: P.quina, wear: 1 })
  caixa(B, [-arm / 2, -armLen / 2, d / 2], [arm, armLen, d], P.corpo, { top: P.quina, wear: 1 })
  caixa(B, [-arm / 2, -arm / 2, d / 2 - 0.06], [arm * 1.18, arm * 1.18, d + 0.12], estilo === "madeira" ? P.fundo : mix(P.corpo, P.quina, 0.25), { top: P.quina, wear: 1 })
  if (estilo === "metal") {
    for (const [x, y] of [[-0.12, -0.12], [-0.38, -0.12], [-0.12, -0.38], [-0.38, -0.38]] as const) cil(B, [x, y, -0.06], [x, y, -0.1], 0.04, 0.04, 6, P.quina)
  }
  if (P.luz) cil(G, [-arm / 2, -arm / 2, -0.07], [-arm / 2, -arm / 2, -0.1], 0.1, 0.1, 10, P.luz)
  return virada(out)
}
