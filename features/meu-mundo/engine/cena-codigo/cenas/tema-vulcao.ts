// Tema do VULCÃO DE KRAGOR — as 3 cenas usam estas peças. Refs do Alex:
// `pipeline/pecas-codigo/ref/dominios/vulcao-{1,2,3}.png` e `castelo-kragor.png`.
//
// FICHA DO AMBIENTE
// Clima:       fim de tarde vermelho sob o vulcão em erupção; basalto quase preto, lava laranja
//              acesa, madeira das minas, bandeiras vermelhas; quente e dramático.
// Camadas:     (1) chão: pedra cinza-escura em lajes + fissuras acesas no caminho; (2) relevo:
//              paredões e colunas hexagonais de basalto; (3) "água": rios de lava acesos;
//              (4) sem vegetação; (5) objetos: bocas de mina com escoras, trilhos e vagonetes com
//              minério aceso, cristais laranja (1), forjas, bigornas (2), martelos gigantes
//              acorrentados, braseiros, porta-armas (3), lanternas, caixotes; (6) fundo: o vulcão
//              e montanhas escuras na névoa vermelha.
// Proporções:  personagem 1,7 m; boca de mina 4 m; vagonete 1,6 m; coluna de basalto 2–7 m;
//              martelo gigante 7 m; caminho 4,4 m; rio de lava 5–7 m.
// Cobertura:   ~50% pedra, 25% basalto alto, 10% lava, 10% caminho, 5% objetos.
// Fora:        personagens; emblemas exatos das bandeiras.

import { type RGB, type V3 } from "../kit"
import type { Cena, XZ } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { block, face, mesa, mix, mul, rnd, strata, tube, type MesaOut } from "../kit-natureza"

export const CEU: RGB = [0.62, 0.27, 0.22]
export const NEVOA: RGB = [0.56, 0.3, 0.26]
export const LUZ = { hemi: 0.9, sol: 0.6, ceu: [1, 0.74, 0.62] as RGB, chao: [0.42, 0.24, 0.22] as RGB, solCor: [1, 0.62, 0.42] as RGB }
export const PEDRA: RGB = [0.36, 0.33, 0.36]
export const PEDRA_CL: RGB = [0.62, 0.57, 0.56]
export const PEDRA_ESC: RGB = [0.22, 0.2, 0.24]
export const BASALTO: RGB = [0.24, 0.22, 0.26]
export const BASALTO_CL: RGB = [0.36, 0.33, 0.38]
export const LAVA: RGB = [1, 0.46, 0.08]
export const LAVA_CL: RGB = [1, 0.82, 0.3]
export const LAVA_ESC: RGB = [0.86, 0.2, 0.04]
export const MADEIRA: RGB = [0.56, 0.34, 0.18]
export const MADEIRA_ESC: RGB = [0.36, 0.2, 0.1]
export const FERRO: RGB = [0.26, 0.25, 0.28]
export const BANDEIRA: RGB = [0.66, 0.1, 0.1]
export const OURO: RGB = [0.86, 0.6, 0.22]

export const ROCHA = strata([[BASALTO, 1.4], [BASALTO_CL, 0.5], [PEDRA_ESC, 1.1], [mix(BASALTO, LAVA_ESC, 0.12), 0.4], [BASALTO, 1.2]], 40, 9)

/** Paredão de basalto (mesa escura) com caixa. */
export function paredao(c: Cena, o: { x: number; z: number; rx: number; rz: number; h: number; seed: number; lod: number; y0?: number; solid?: boolean }): MesaOut {
  const m = mesa(c.geo(o.x, o.z), { x: o.x, z: o.z, rx: o.rx, rz: o.rz, h: o.h, y0: o.y0, strata: ROCHA, seed: o.seed, lod: o.lod, grass: PEDRA_ESC, rim: BASALTO_CL, seg: o.lod ? 9 : 12 })
  if (o.solid !== false) c.blockOval(o.x, o.z, o.rx * 1.08, o.rz * 1.08, o.h + (o.y0 ?? 0))
  return m
}

/** Grupo de colunas hexagonais de basalto (alturas variadas). */
export function colunas(c: Cena, x: number, z: number, r: number, hMax: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  const n = lod ? 3 : 5 + Math.floor(rnd(seed, 1) * 4)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2, d = r * Math.sqrt(rnd(seed, k, 3))
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d
    const h = hMax * (0.35 + rnd(seed, k, 4) * 0.65)
    tube(g, [px, -0.1, pz], [px, h, pz], 0.7, 0.66, 6, (j) => (j % 2 ? BASALTO : BASALTO_CL), true)
  }
  c.block(x, z, r + 0.6, r + 0.6, hMax)
}

/** Bloco de rocha escura solto. */
export function pedraEsc(c: Cena, x: number, z: number, s: number, seed: number, solid = true) {
  const h = s * (0.6 + rnd(seed, 1) * 0.6)
  block(c.geo(x, z), x, z, -0.05, h, s * (1.3 + rnd(seed, 2) * 0.6), s * (1.1 + rnd(seed, 3) * 0.5), { strata: ROCHA, seed, rot: rnd(seed, 4) * 3, taper: 0.8, tilt: 0.08, top: BASALTO_CL })
  if (solid && s > 0.6) c.block(x, z, s * 0.75, s * 0.62, h, rnd(seed, 4) * 3)
}

/** Rio de LAVA: fita acesa (no `glow`) com margem escura, abaixo do chão, com caixas. */
export function rioLava(c: Cena, pts: readonly XZ[], w: number) {
  const across: [number, RGB][] = [[-0.5, LAVA_ESC], [-0.3, LAVA], [0, LAVA_CL], [0.3, LAVA], [0.5, LAVA_ESC]]
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1]
    const L = Math.hypot(bx - ax, bz - az)
    const n = Math.max(1, Math.round(L / 4))
    const side = (i: number): XZ => {
      const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)]
      const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1
      return [-dz / l, dx / l]
    }
    const sa = side(k), sb = side(k + 1)
    for (let s = 0; s < n; s++) {
      const t0 = s / n, t1 = (s + 1) / n
      const G = c.glow(ax + (bx - ax) * (t0 + t1) * 0.5, az + (bz - az) * (t0 + t1) * 0.5)
      const base = G.count
      for (const t of [t0, t1]) {
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t
        const sx = sa[0] + (sb[0] - sa[0]) * t, sz = sa[1] + (sb[1] - sa[1]) * t
        const wob = 0.85 + 0.3 * Math.sin((k + t) * 3.1)
        for (const [u, col] of across) G.v([px + sx * u * w, -0.35, pz + sz * u * w], [0, 1, 0], mul(col, wob > 1 ? 1 : wob))
      }
      for (let j = 0; j < across.length - 1; j++) {
        const a = base + j, b = a + 1, d = a + across.length, e = d + 1
        G.i.push(a, d, b, b, d, e, a, b, d, b, e, d)
      }
    }
    c.block((ax + bx) / 2, (az + bz) / 2, L / 2 + w * 0.2, w * 0.5, 2, Math.atan2(bx - ax, bz - az) - Math.PI / 2)
  }
}

/** Fissuras acesas no chão do caminho (tracinhos em zigue-zague, 3 cm acima). */
export function fissuras(c: Cena, at: (t: number) => { x: number; z: number; dx: number; dz: number }, n: number, seed: number) {
  for (let i = 0; i < n; i++) {
    const p = at((i + rnd(seed, i)) / n)
    const ox = (rnd(seed, i, 2) - 0.5) * 3.2
    let x = p.x + p.dz * ox, z = p.z - p.dx * ox
    const G = c.glow(x, z)
    let a = rnd(seed, i, 3) * Math.PI * 2
    for (let k = 0; k < 4; k++) {
      const L = 0.5 + rnd(seed, i, k + 4) * 0.7
      const nx = x + Math.cos(a) * L, nz = z + Math.sin(a) * L
      const wx = -Math.sin(a) * 0.05, wz = Math.cos(a) * 0.05
      face(G, [[x - wx, 0.03, z - wz], [nx - wx, 0.03, nz - wz], [nx + wx, 0.03, nz + wz], [x + wx, 0.03, z + wz]], LAVA, [0, 1, 0])
      x = nx
      z = nz
      a += (rnd(seed, i, k + 9) - 0.5) * 1.8
    }
  }
}

/** Cristal laranja aceso (minas). */
export function cristalFogo(c: Cena, x: number, z: number, s: number, seed: number, lod: number) {
  const G = c.glow(x, z)
  const n = lod ? 2 : 3 + Math.floor(rnd(seed, 1) * 2)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2, tilt = k ? 0.4 : 0.1
    const h = s * (k ? 0.55 + rnd(seed, k, 3) * 0.4 : 1), r = s * 0.16
    const bx = x + Math.cos(a) * r * (k ? 1.4 : 0), bz = z + Math.sin(a) * r * (k ? 1.4 : 0)
    const tip: V3 = [bx + Math.cos(a) * h * tilt, h, bz + Math.sin(a) * h * tilt]
    for (let j = 0; j < 4; j++) {
      const t0 = (j / 4) * Math.PI * 2 + a, t1 = ((j + 1) / 4) * Math.PI * 2 + a
      face(G, [[bx + Math.cos(t0) * r, -0.05, bz + Math.sin(t0) * r], [bx + Math.cos(t1) * r, -0.05, bz + Math.sin(t1) * r], tip], [LAVA_ESC, LAVA_ESC, LAVA_CL], [Math.cos((t0 + t1) / 2), 0.25, Math.sin((t0 + t1) / 2)])
    }
  }
}

/** Boca de mina: escoras de madeira (dois pés e a viga) com o buraco escuro atrás, encostada numa rocha. */
export function bocaMina(c: Cena, x: number, z: number, ang: number, lod: number) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  // rochedo atrás
  block(g, x - fx * 2.6, z - fz * 2.6, -0.1, 6, 8, 5, { strata: ROCHA, seed: x + z, rot: -ang, taper: 0.8, tilt: 0.06, top: BASALTO_CL })
  c.block(x - fx * 2.6, z - fz * 2.6, 4, 2.5, 6, -ang)
  // buraco escuro
  const P = (u: number, y: number, w = 0): V3 => [x + sx * u + fx * w, y, z + sz * u + fz * w]
  face(g, [P(-1.6, 0, -0.1), P(1.6, 0, -0.1), P(1.6, 3.4, -0.1), P(-1.6, 3.4, -0.1)], [0.05, 0.03, 0.03], [fx, 0, fz])
  for (const s of [-1, 1]) caixa(g, { x: P(s * 1.85, 0)[0], z: P(s * 1.85, 0)[2], y0: 0, y1: 3.8, w: 0.45, d: 0.45, rot: -ang, side: MADEIRA, top: MADEIRA_ESC })
  caixa(g, { x, z, y0: 3.6, y1: 4.1, w: 4.6, d: 0.55, rot: -ang, side: MADEIRA, top: MADEIRA_ESC })
  if (!lod) {
    // trilho saindo da mina
    for (const s of [-1, 1]) caixa(g, { x: P(s * 0.55, 0, 3)[0], z: P(s * 0.55, 0, 3)[2], y0: 0, y1: 0.1, w: 0.12, d: 6, rot: -ang, side: FERRO, top: FERRO })
    const G = c.glow(x, z)
    face(G, [P(-0.25, 2.6, 0.05), P(0.25, 2.6, 0.05), P(0.25, 3.1, 0.05), P(-0.25, 3.1, 0.05)], LAVA_CL, [fx, 0, fz])
  }
}

/** Vagonete com minério aceso (com caixa). */
export function vagonete(c: Cena, x: number, z: number, ang: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0.35, y1: 1.2, w: 1.1, d: 1.7, rot: -ang, side: FERRO, top: FERRO })
  caixa(g, { x, z, y0: 1.1, y1: 1.2, w: 1.2, d: 1.8, rot: -ang, side: MADEIRA_ESC, top: MADEIRA_ESC })
  c.block(x, z, 0.6, 0.9, 1.2, -ang)
  if (!lod) {
    const G = c.glow(x, z)
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3
      const px = x + Math.cos(a) * 0.3, pz = z + Math.sin(a) * 0.5
      face(G, [[px - 0.22, 1.2, pz - 0.2], [px + 0.22, 1.2, pz - 0.2], [px, 1.5, pz]], LAVA_CL, [0, 0.4, -1])
      face(G, [[px + 0.22, 1.2, pz + 0.2], [px - 0.22, 1.2, pz + 0.2], [px, 1.5, pz]], LAVA, [0, 0.4, 1])
    }
  }
}

/** Bigorna de ferro sobre um toco. */
export function bigorna(c: Cena, x: number, z: number, ang: number) {
  const g = c.geo(x, z)
  tube(g, [x, -0.05, z], [x, 0.7, z], 0.45, 0.42, 6, () => MADEIRA, true)
  caixa(g, { x, z, y0: 0.7, y1: 0.95, w: 0.5, d: 0.35, rot: -ang, side: FERRO, top: FERRO })
  caixa(g, { x, z, y0: 0.95, y1: 1.25, w: 1.2, d: 0.5, rot: -ang, side: FERRO, top: mix(FERRO, [0.7, 0.7, 0.75], 0.3) })
  c.block(x, z, 0.6, 0.5, 1.3, -ang)
}

/** Braseiro: tripé de ferro com a bacia e a chama acesa. */
export function braseiro(c: Cena, x: number, z: number, h: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0, y1: h, w: 0.5, d: 0.5, side: PEDRA_ESC, top: PEDRA })
  tube(g, [x, h, z], [x, h + 0.45, z], 0.45, 0.65, 6, () => FERRO, false)
  c.block(x, z, 0.4, 0.4, h)
  const G = c.glow(x, z)
  const n = lod ? 3 : 5
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    const bx = x + Math.cos(a) * 0.3, bz = z + Math.sin(a) * 0.3
    for (const s of [1, -1]) face(G, [[bx - 0.2 * s, h + 0.4, bz], [bx + 0.2 * s, h + 0.4, bz], [bx, h + 1.2 + (k % 2) * 0.4, bz]], [LAVA_ESC, LAVA_ESC, LAVA_CL], [0, 0, s])
  }
}

/** Martelo gigante de pedra sobre pedestal, preso por correntes (cena 3). */
export function marteloGigante(c: Cena, x: number, z: number, ang: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0, y1: 1, w: 3.4, d: 3.4, rot: -ang, side: PEDRA_ESC, top: PEDRA })
  caixa(g, { x, z, y0: 1, y1: 1.6, w: 2.6, d: 2.6, rot: -ang, side: PEDRA, top: PEDRA_CL })
  c.block(x, z, 1.7, 1.7, 7, -ang)
  const tilt = 0.25
  const top: V3 = [x + Math.sin(ang + 1.2) * tilt * 4, 6.2, z + Math.cos(ang + 1.2) * tilt * 4]
  tube(g, [x, 1.6, z], top, 0.28, 0.24, lod ? 4 : 6, () => MADEIRA, false)
  caixa(g, { x: top[0], z: top[2], y0: 5.4, y1: 7.4, w: 3.2, d: 1.8, rot: -ang + 0.3, side: PEDRA_CL, top: mix(PEDRA_CL, [1, 1, 1], 0.2) })
  caixa(g, { x: top[0], z: top[2], y0: 6.1, y1: 6.7, w: 3.3, d: 1.9, rot: -ang + 0.3, side: OURO, top: OURO })
  if (!lod)
    for (const s of [-1, 1]) {
      const end: V3 = [x + Math.cos(-ang) * 3.4 * s, 0, z + Math.sin(-ang) * 3.4 * s]
      tube(g, top, end, 0.08, 0.08, 4, () => FERRO, false)
    }
}

/** Pano de fundo: o vulcão em erupção (cone com a boca clara) e montanhas escuras. */
export function fundoVulcao(c: Cena, seed: number, vulcao: XZ = [30, 170]) {
  const [vx, vz] = vulcao
  tube(c.fundo, [vx, -2, vz], [vx, 60, vz], 70, 14, 9, (k) => (k % 2 ? [0.3, 0.2, 0.22] : [0.24, 0.16, 0.18]), false)
  tube(c.fundo, [vx, 59, vz], [vx, 61, vz], 14, 10, 9, () => [1, 0.55, 0.2], true)
  // filetes de lava descendo (claros: a névoa vermelha os mistura)
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k - 1.5) * 0.35
    const top: V3 = [vx + Math.cos(a) * 13, 58, vz + Math.sin(a) * 13], bot: V3 = [vx + Math.cos(a) * 52, 10, vz + Math.sin(a) * 52]
    face(c.fundo, [[top[0] - 2, top[1], top[2]], [top[0] + 2, top[1], top[2]], [bot[0] + 4, bot[1], bot[2]], [bot[0] - 4, bot[1], bot[2]]], [1, 0.5, 0.15], [0, 0.3, -1])
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + rnd(seed, k)
    const d = 120 + rnd(seed, k, 2) * 30
    mesa(c.fundo, { x: Math.cos(a) * d, z: Math.sin(a) * d, rx: 26, rz: 18, h: 18 + rnd(seed, k, 3) * 16, strata: ROCHA, seed: seed + k, lod: 1, grass: PEDRA_ESC, seg: 6 })
  }
}
