// CÉU DA CIDADE ORBITAL — peças da ref `orbital-2.png` (a praça de mármore suspensa num mar de nuvens):
// plataforma de andar com beirada que despenca, parapeito de mármore com friso de ouro (com caixa: é o
// que segura o jogador), mar de nuvens, pedestal de luz com cristal amarelo, ponte de cristal acesa,
// gazebo de cúpula, castelos flutuando na névoa e aqueduto quebrado no céu.
//
// O motor só tem chão PLANO em y = 0: a plataforma é o chão (0) e fora dela o chão desce para PROFUNDO
// (−16 m, visual) — por isso TODA a beirada leva parapeito com caixa. A plataforma = caminho (meia
// largura `W`) + praças (círculos). `beirada()` acha a borda sozinha (pedaço cujo lado de fora sai da
// plataforma) e põe o parapeito só ali.

import { type RGB, type V3 } from "../kit"
import { blocked, type Cena, type XZ } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { blob, face, mix, mul, rnd, tube, type Foliage } from "../kit-natureza"
import type { Planta } from "../dominio"
import * as O from "../pecas/orbital"
import * as T from "./tema-orbital"

export const PROFUNDO = -16
export const NUVEM: Foliage = { dark: [0.8, 0.84, 0.96], mid: [0.93, 0.95, 1], hi: [1, 1, 1] }
export const NUVEM_FUNDO: RGB = [0.86, 0.9, 1]
export const PEDRA: RGB = [0.7, 0.68, 0.8]
export const PEDRA_ESC: RGB = [0.52, 0.5, 0.64]
const AMARELO: RGB = [1, 0.84, 0.3]

export interface Plataforma {
  W: number
  /** meia largura do trecho `k` do caminho (a ponte é mais estreita) */
  largura: (k: number) => number
  pracas: { x: number; z: number; r: number }[]
  /** distância para DENTRO da plataforma (> 0 dentro, < 0 fora). */
  dentro: (x: number, z: number) => number
}

/** A plataforma de uma cena de céu: caminho com meia largura W + praças (clareiras, arena, pontas). */
/** Distância de (x, z) ao segmento a–b. */
function dSeg(x: number, z: number, a: XZ, b: XZ) {
  const vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz || 1
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / L2))
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t)
}

export function plataforma(P: Planta, W: number, extras: { x: number; z: number; r: number }[] = [], ponte?: { k: number; w: number }): Plataforma {
  const largura = (k: number) => (ponte && k === ponte.k ? ponte.w : W)
  const pracas = [
    ...P.clareiras.map((c) => ({ x: c.x, z: c.z, r: c.r + 3.5 })),
    { x: P.arena.x, z: P.arena.z, r: P.arena.r + 3.5 },
    { x: P.path[0][0], z: P.path[0][1], r: 9 },
    ...extras,
  ]
  const dentro = (x: number, z: number) => {
    let d = -Infinity
    for (let k = 0; k < P.path.length - 1; k++) d = Math.max(d, largura(k) - dSeg(x, z, P.path[k], P.path[k + 1]))
    for (const dv of P.desvios) for (let k = 0; k < dv.length - 1; k++) d = Math.max(d, W - dSeg(x, z, dv[k], dv[k + 1]))
    for (const p of pracas) d = Math.max(d, p.r - Math.hypot(x - p.x, z - p.z))
    return d
  }
  return { W, largura, pracas, dentro }
}

/** Altura do chão: 0 na plataforma, despenca para PROFUNDO logo fora (penhasco de 1–2 m de largura). */
export function alturaCeu(L: Plataforma, x: number, z: number) {
  const d = L.dentro(x, z)
  return d >= -0.2 ? 0 : PROFUNDO
}

/**
 * Parapeito de mármore com friso de ouro em TODA a beirada da plataforma: pedaços de `passo` m ao longo
 * dos dois lados de cada trecho do caminho e em volta de cada praça; só entra o pedaço cujo lado de fora
 * cai para fora da plataforma. Cada pedaço tem caixa (1,2 m de altura de colisão).
 */
export function beirada(c: Cena, P: Planta, L: Plataforma, lod: number, pula: (x: number, z: number) => boolean = () => false) {
  const passo = 3
  const peca = (x: number, z: number, nx: number, nz: number) => {
    // nx, nz = para FORA. Pedaço é borda se: está na plataforma (por pouco) e um pouco para fora já não
    if (L.dentro(x - nx * 0.5, z - nz * 0.5) < 0 || L.dentro(x + nx * 1.2, z + nz * 1.2) > 0 || P.beira(x, z) < 1.5 || pula(x, z) || blocked(c, x + nx * 0.6, z + nz * 0.6, 0.1)) return
    const ang = Math.atan2(nx, nz)
    const g = c.geo(x, z)
    caixa(g, { x, z, y0: 0, y1: 0.5, w: passo + 0.05, d: 0.7, rot: -ang, side: T.MARMORE, top: T.BRANCO })
    if (!lod) {
      caixa(g, { x: x - nx * 0.22, z: z - nz * 0.22, y0: 0.5, y1: 0.58, w: passo + 0.05, d: 0.18, rot: -ang, side: T.OURO, top: T.OURO })
      caixa(g, { x: x - nx * 1.3, z: z - nz * 1.3, y0: 0, y1: 0.03, w: passo + 0.05, d: 0.14, rot: -ang, side: T.OURO, top: T.OURO })
      // o penhasco de pedra logo abaixo (a "ilha" de baixo da praça)
      caixa(g, { x: x + nx * 0.2, z: z + nz * 0.2, y0: -2.2, y1: 0, w: passo + 0.1, d: 0.6, rot: -ang, side: PEDRA, top: PEDRA })
    }
    c.block(x, z, passo / 2, 0.35, 1.2, -ang)
  }
  for (let k = 0; k < P.path.length - 1; k++) {
    const [ax, az] = P.path[k], [bx, bz] = P.path[k + 1]
    const len = Math.hypot(bx - ax, bz - az)
    const dx = (bx - ax) / len, dz = (bz - az) / len
    for (const s of [-1, 1]) {
      const nx = dz * s, nz = -dx * s
      const w = L.largura(k)
      for (let t = passo / 2; t < len; t += passo) peca(ax + dx * t + nx * (w + 0.35), az + dz * t + nz * (w + 0.35), nx, nz)
    }
  }
  for (const p of L.pracas) {
    const n = Math.max(8, Math.round((2 * Math.PI * p.r) / passo))
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, nx = Math.cos(a), nz = Math.sin(a)
      peca(p.x + nx * (p.r + 0.35), p.z + nz * (p.r + 0.35), nx, nz)
    }
  }
}

/** Mar de nuvens: bolhas brancas achatadas no vazio, abaixo da plataforma (−3 a −9 m). */
export function marDeNuvens(c: Cena, L: Plataforma, H: number, lod: number, seed: number) {
  const passo = lod ? 12 : 8
  for (let x = -H + passo / 2; x < H; x += passo)
    for (let z = -H + passo / 2; z < H; z += passo) {
      const r = (q: number) => rnd(seed, x * 3 + z, q)
      const px = x + (r(1) - 0.5) * passo * 0.8, pz = z + (r(2) - 0.5) * passo * 0.8
      if (L.dentro(px, pz) > -4 || Math.abs(px) > H - 3 || Math.abs(pz) > H - 3) continue
      const R = 3.5 + r(3) * 3
      blob(c.geo(px, pz), [px, -3.5 - r(4) * 5, pz], [R, R * 0.45, R * 0.9], NUVEM, seed + x + z)
    }
}

/** Pedestal de luz (a ref, na boca da ponte): soco de mármore, painéis de cristal acesos, cristal amarelo no alto. */
export function pedestalLuz(c: Cena, x: number, z: number, lod: number) {
  const g = c.geo(x, z), G = c.glow(x, z)
  caixa(g, { x, z, y0: 0, y1: 0.3, w: 1.3, d: 1.3, side: T.MARMORE_S, top: T.MARMORE })
  caixa(g, { x, z, y0: 0.3, y1: 1.7, w: 1, d: 1, side: T.MARMORE, top: T.MARMORE })
  caixa(g, { x, z, y0: 1.7, y1: 1.85, w: 1.2, d: 1.2, side: T.OURO, top: T.OURO })
  if (!lod)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2, nx = Math.sin(a), nz = Math.cos(a), tx = nz, tz = -nx
      const P = (u: number, y: number): V3 => [x + nx * 0.52 + tx * u, y, z + nz * 0.52 + tz * u]
      face(G, [P(-0.32, 0.5), P(0.32, 0.5), P(0.32, 1.5), P(-0.32, 1.5)], [T.CIANO, O.CRISTAL_ROSA, mix(O.CRISTAL_LILAS, T.BRANCO, 0.4), mix(T.CIANO, T.BRANCO, 0.4)], [nx, 0, nz])
    }
  // cristal amarelo aceso no alto (6 lados, ponta dupla)
  tube(G, [x, 1.85, z], [x, 2.45, z], 0.22, 0.42, 6, (k) => (k % 2 ? AMARELO : mix(AMARELO, T.BRANCO, 0.5)), false)
  tube(G, [x, 2.45, z], [x, 3.05, z], 0.42, 0.02, 6, (k) => (k % 2 ? mix(AMARELO, T.BRANCO, 0.3) : AMARELO), false)
  c.block(x, z, 0.65, 0.65, 3)
}

/** Ponte de cristal: piso aceso ciano em facetas entre dois parapeitos de ouro, sobre o vazio (de a até b). */
export function ponteCristal(c: Cena, a: XZ, b: XZ, w: number, lod: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = dz, nz = -dx
  const n = Math.ceil(len / 3)
  for (let k = 0; k < n; k++) {
    const t0 = (k / n) * len, t1 = ((k + 1) / n) * len
    const P = (t: number, u: number, y: number): V3 => [a[0] + dx * t + nx * u, y, a[1] + dz * t + nz * u]
    const mx = a[0] + dx * (t0 + t1) / 2, mz = a[1] + dz * (t0 + t1) / 2
    const G = c.glow(mx, mz)
    // piso em 2 facetas por pedaço, tons alternados (vidro com reflexo)
    const c1 = k % 2 ? mix(T.CIANO, T.BRANCO, 0.35) : T.CIANO, c2 = mix(T.CIANO, O.CRISTAL_LILAS, 0.35)
    face(G, [P(t0, -w / 2, 0.04), P(t1, -w / 2, 0.04), P(t1, 0, 0.04), P(t0, 0, 0.04)], [c1, c2, mix(c1, T.BRANCO, 0.3), c1], [0, 1, 0])
    face(G, [P(t0, 0, 0.04), P(t1, 0, 0.04), P(t1, w / 2, 0.04), P(t0, w / 2, 0.04)], [c1, mix(c2, T.BRANCO, 0.4), c2, c1], [0, 1, 0])
    // laje de baixo (a ponte é uma fita sobre o nada) e guarda-corpo de ouro
    const g = c.geo(mx, mz)
    caixa(g, { x: mx, z: mz, y0: -0.6, y1: 0.02, w: w + 0.6, d: t1 - t0 + 0.02, rot: -Math.atan2(dx, dz), side: T.MARMORE_S, top: T.MARMORE })
    if (!lod)
      for (const s of [-1, 1]) {
        const px = mx + nx * s * (w / 2 + 0.15), pz = mz + nz * s * (w / 2 + 0.15)
        caixa(g, { x: px, z: pz, y0: 0, y1: 0.9, w: 0.12, d: t1 - t0, rot: -Math.atan2(dx, dz), side: mix(T.OURO, T.BRANCO, 0.2), top: T.OURO })
      }
  }
}

/**
 * ILHA DO CÉU (a ref: as ilhas com gazebo, árvores e escada): rocha BAIXA em dois degraus facetados (nada de
 * cone alto — na névoa vira seta branca), gramado, 2–3 árvores redondas e, se `casa`, um gazebo de cúpula.
 * Não colide (fica no alto). `y` = altura do gramado.
 */
export function ilhaCeu(c: Cena, x: number, y: number, z: number, r: number, seed: number, lod: number, casa = false) {
  const g = c.geo(x, z)
  const lados = lod ? 6 : 9
  tube(g, [x, y, z], [x, y - r * 0.35, z], r, r * 0.7, lados, (j) => (j % 2 ? PEDRA : mix(PEDRA, PEDRA_ESC, 0.5)), false)
  tube(g, [x, y - r * 0.35, z], [x, y - r * 0.75, z], r * 0.7, r * 0.15, lados, (j) => (j % 2 ? PEDRA_ESC : mul(PEDRA_ESC, 0.85)), false)
  tube(g, [x, y, z], [x, y + 0.35, z], r * 1.02, r * 0.98, lados, () => [0.46, 0.74, 0.26], false)
  if (lod) return
  const VERDE: Foliage = { dark: [0.3, 0.52, 0.12], mid: [0.56, 0.78, 0.18], hi: [0.86, 0.94, 0.38] }
  for (let k = 0; k < 3; k++) {
    const a = rnd(seed, k) * Math.PI * 2, d = r * (0.45 + rnd(seed, k, 2) * 0.35)
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d
    tube(g, [px, y + 0.3, pz], [px, y + 1.6, pz], 0.2, 0.15, 4, () => O.MADEIRA, false)
    blob(g, [px, y + 2.4, pz], [1.3, 1.1, 1.3], VERDE, seed + k)
  }
  if (casa) gazebo(c, x, z, r * 0.38, lod, y + 0.35)
}

/** Gazebo de cúpula (a ilha da direita da ref): 6 colunas, friso de ouro, cúpula de vidro facetado. */
export function gazebo(c: Cena, x: number, z: number, r: number, lod: number, y0 = 0) {
  const g = c.geo(x, z), G = c.glow(x, z)
  tube(g, [x, y0, z], [x, y0 + 0.4, z], r * 1.1, r * 1.1, 8, () => T.MARMORE_S, false)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    tube(g, [x + Math.cos(a) * r, y0 + 0.4, z + Math.sin(a) * r], [x + Math.cos(a) * r, y0 + r * 1.5, z + Math.sin(a) * r], 0.18, 0.15, lod ? 4 : 6, () => T.MARMORE, false)
  }
  tube(g, [x, y0 + r * 1.5, z], [x, y0 + r * 1.62, z], r * 1.08, r * 1.08, 8, () => T.OURO, false)
  tube(G, [x, y0 + r * 1.62, z], [x, y0 + r * 2.3, z], r * 1.02, r * 0.55, 8, (k) => (k % 2 ? mix(T.CIANO, T.BRANCO, 0.4) : mix(O.CRISTAL_LILAS, T.BRANCO, 0.3)), false)
  tube(G, [x, y0 + r * 2.3, z], [x, y0 + r * 2.75, z], r * 0.55, 0.05, 8, (k) => (k % 2 ? mix(O.CRISTAL_ROSA, T.BRANCO, 0.4) : T.BRANCO), false)
}

/** Palácio flutuante no pano de fundo (o destino da ponte): rocha em cone virado, praça, torre de cristal com anéis. */
export function palacioFlutuante(c: Cena, x: number, z: number, r: number, seed: number) {
  const g = c.fundo
  // rocha ACHATADA em 2 degraus (cone alto vira seta branca na névoa)
  tube(g, [x, 0, z], [x, -r * 0.4, z], r, r * 0.55, 8, (k) => (k % 2 ? PEDRA : PEDRA_ESC), false)
  tube(g, [x, -r * 0.4, z], [x, -r * 0.85, z], r * 0.55, 1, 8, (k) => (k % 2 ? PEDRA_ESC : PEDRA), false)
  tube(g, [x, 0, z], [x, 0.6, z], r * 1.03, r, 8, () => T.MARMORE, false)
  O.torreCristalAneis(c, x, z, r * 2.8, seed, 1, true)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.4
    const px = x + Math.cos(a) * r * 0.75, pz = z + Math.sin(a) * r * 0.75
    tube(g, [px, 0.5, pz], [px, 0.5 + r * (0.5 + rnd(seed, k) * 0.5), pz], r * 0.08, 0.05, 6, (j) => (j % 2 ? O.CRISTAL_ROSA : O.CRISTAL_LILAS), false)
  }
  // cachoeiras caindo da beira (2 fitas claras)
  for (const a of [0.9, 2.4]) {
    const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r
    face(g, [[px - 1.5, 0, pz], [px + 1.5, 0, pz], [px + 2, -r * 1.3, pz], [px - 2, -r * 1.3, pz]], [mix(T.CIANO, T.BRANCO, 0.6), mix(T.CIANO, T.BRANCO, 0.6), mix(T.CIANO, T.BRANCO, 0.2), mix(T.CIANO, T.BRANCO, 0.2)], [Math.cos(a), 0, Math.sin(a)])
  }
}

/** Castelos e aquedutos flutuando na névoa (pano de fundo): silhuetas azuladas em volta da cena. */
export function ceuDeFundo(c: Cena, seed: number) {
  const AZ: RGB = [0.66, 0.76, 0.96]
  // castelos na linha das nuvens (a ref: silhuetas azuladas no horizonte, baixas): disco FINO de rocha e o
  // castelo em cima. Nada de cone para baixo — na névoa branca vira uma seta enorme (pago em 11/11)
  const ROCHA: RGB = mix(PEDRA_ESC, AZ, 0.5)
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + rnd(seed, k) * 0.35, d = 112 + rnd(seed, k, 2) * 26
    const x = Math.cos(a) * d, z = Math.sin(a) * d, y = -4 + rnd(seed, k, 3) * 10, r = 8 + rnd(seed, k, 4) * 6
    const cor = mix(AZ, T.BRANCO, 0.1 + rnd(seed, k, 5) * 0.2)
    tube(c.fundo, [x, y, z], [x, y - 2, z], r, r * 0.8, 7, (j) => (j % 2 ? ROCHA : mul(ROCHA, 0.88)), false)
    for (let j = 0; j < 5; j++) {
      const px = x + (rnd(seed, k, j + 6) - 0.5) * r * 1.1, pz = z + (rnd(seed, k, j + 9) - 0.5) * r * 1.1, h = 6 + rnd(seed, k, j + 12) * 14
      const w = 3 + rnd(seed, k, j + 15) * 2.5
      caixa(c.fundo, { x: px, z: pz, y0: y, y1: y + h, w, d: w, side: cor, top: mix(cor, T.BRANCO, 0.3) })
      tube(c.fundo, [px, y + h, pz], [px, y + h + w * 1.3, pz], w * 0.5, 0.05, 5, () => mix(cor, j % 2 ? [0.95, 0.7, 1] : [0.7, 0.9, 1], 0.55), false)
    }
  }
  // aqueduto quebrado no céu (a ref, no alto da direita): viga + 3 arcos, inclinado
  for (let k = 0; k < 3; k++) {
    const x = 60 + k * 18, z = 70 - k * 30, y = 30 + k * 4
    caixa(c.fundo, { x, z, y0: y, y1: y + 1.2, w: 14, d: 2, rot: 0.5, side: T.MARMORE, top: T.BRANCO })
    for (let j = -1; j <= 1; j++) caixa(c.fundo, { x: x + Math.cos(0.5) * j * 5, z: z - Math.sin(0.5) * j * 5, y0: y - 4, y1: y, w: 1, d: 1.6, rot: 0.5, side: T.MARMORE_S, top: T.MARMORE })
  }
}

/** Floreira de cristal pendurada PARA FORA da beirada (a ref, à direita): canteiro sobre um dente de pedra. */
export function floreiraBalanco(c: Cena, x: number, z: number, ang: number, seed: number, lod: number) {
  if (blocked(c, x, z, 0.2)) return
  O.canteiroCristal(c, x, z, ang, { seed, cristal: rnd(seed, 2) < 0.5 ? O.CRISTAL_ROSA : AMARELO }, lod)
  tube(c.geo(x, z), [x, 0, z], [x, -2.6, z], 1.3, 0.2, 5, (k) => (k % 2 ? PEDRA : PEDRA_ESC), false)
}
