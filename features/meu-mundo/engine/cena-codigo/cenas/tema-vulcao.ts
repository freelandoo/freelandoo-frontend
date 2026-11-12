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
import { face, mesa, mix, mul, rnd, strata, tube } from "../kit-natureza"
import * as P from "../pecas/vulcao"

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

/**
 * Paredão de ROCHA ANGULOSA empilhada (as peças copiadas): um bloco grande no meio, 5–7 em volta com alturas
 * desencontradas e 1–2 pousados em cima — a ref fecha a borda assim (nada de mesa em listras).
 */
export function paredao(c: Cena, o: { x: number; z: number; rx: number; rz: number; h: number; seed: number; lod: number; y0?: number; solid?: boolean }): { inside: (x: number, z: number, k?: number) => boolean } {
  const pecas: { x: number; z: number; s: number }[] = []
  const n = o.lod ? 3 : 7
  const lim = 78
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(o.seed, k) * 0.7, d = k === 0 ? 0 : 0.5 + rnd(o.seed, k, 2) * 0.35
    const s = (o.rx + o.rz) * (k === 0 ? 0.42 : 0.24 + rnd(o.seed, k, 3) * 0.12)
    const x = Math.max(-lim + s, Math.min(lim - s, o.x + Math.cos(a) * o.rx * d)), z = Math.max(-lim + s, Math.min(lim - s, o.z + Math.sin(a) * o.rz * d))
    const h = P.rocha(c, x, z, s, Math.floor(o.seed * 13) + k, o.lod, false)
    pecas.push({ x, z, s })
    // um bloco pousado em cima dos maiores (prateleira)
    if (!o.lod && k < 2) {
      const g = c.geo(x, z), G2 = c.glow(x, z), n0 = g.p.length, m0 = G2.p.length
      P.rocha(c, x + s * 0.15, z - s * 0.1, s * 0.6, Math.floor(o.seed * 13) + k + 50, o.lod, false)
      for (let i = n0 + 1; i < g.p.length; i += 3) g.p[i] += h * 0.8
      for (let i = m0 + 1; i < G2.p.length; i += 3) G2.p[i] += h * 0.8
    }
  }
  if (o.solid !== false) c.blockOval(o.x, o.z, o.rx * 1.05, o.rz * 1.05, o.h)
  return { inside: (qx: number, qz: number, k = 1) => pecas.some((q) => Math.hypot(qx - q.x, qz - q.z) < q.s * k) }
}

/** Colunas hexagonais de basalto (peça copiada). */
export function colunas(c: Cena, x: number, z: number, r: number, hMax: number, seed: number, lod: number) {
  P.colunasHex(c, x, z, r, hMax, Math.floor(seed * 7) + 1, lod)
}

/** Rocha basáltica angulosa (peça copiada). */
export function pedraEsc(c: Cena, x: number, z: number, s: number, seed: number, solid = true) {
  P.rocha(c, x, z, s, Math.floor(seed * 13) + 1, 0, solid)
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

/** Cacho de cristais de fogo (peça copiada). */
export function cristalFogo(c: Cena, x: number, z: number, s: number, seed: number, lod: number) {
  P.cristalFogo(c, x, z, s, Math.floor(seed * 7) + 1, lod)
}

/** Boca de mina (peça copiada). */
export function bocaMina(c: Cena, x: number, z: number, ang: number, lod: number) {
  P.bocaMina(c, x, z, ang, lod)
}

/** Vagonete com minério (peça copiada), sobre um trecho de trilho. */
export function vagonete(c: Cena, x: number, z: number, ang: number, lod: number) {
  P.vagonete(c, x, z, ang, lod)
  const dx = Math.sin(ang) * 2.4, dz = Math.cos(ang) * 2.4
  P.trilho(c, [x - dx, z - dz], [x + dx, z + dz], lod)
}

/** Bigorna (peça copiada). */
export function bigorna(c: Cena, x: number, z: number, ang: number, lod = 0) {
  P.bigorna(c, x, z, ang, lod)
}

/** Braseiro em pedestal (peça copiada). */
export function braseiro(c: Cena, x: number, z: number, h: number, lod: number) {
  P.braseiro(c, x, z, h, lod)
}

/** Martelo gigante acorrentado (peça copiada). */
export function marteloGigante(c: Cena, x: number, z: number, ang: number, lod: number) {
  P.marteloGigante(c, x, z, ang, lod)
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

/** Peças copiadas que as cenas usam direto (caixote ferrado, poste-lanterna, cerca, forja, etc.). */
export const caixote = (c: Cena, x: number, z: number, s: number, rot: number, lod = 0) => P.caixote(c, x, z, s, rot, 0, lod)
export const posteLanterna = P.posteLanterna
export const lanternaPedestal = P.lanternaPedestal
export const forjaArco = P.forjaArco
export const barril = P.barril
export const cerca = P.cerca
export const guindaste = P.guindaste
export const rackLancas = P.rackLancas
export const trilho = P.trilho
/** Teto de triângulos das cenas da Forja: o Alex quer FIDELIDADE acima do orçamento de celular (11/11). */
export const TRI_BLOCO = { perto: 16000, longe: 6000, fundo: 6000 }

/**
 * CORREDOR de rocha ao longo do caminho (a ref inteira é assim: o caminho passa entre paredões de rocha
 * angulosa, com objetos na beira). Para cada lado: rochas grandes coladas a 8–13 m do eixo a cada ~3,5 m
 * (o "paredão" de perto), e na faixa de 4–7 m os objetos da cena (`beira`). `pula(x, z)` = onde abrir
 * (boca de mina, forja, lava). Respeita `ok` (clareiras, arena, outras caixas).
 */
export function corredor(c: Cena, path: readonly XZ[], ok: (x: number, z: number, pad: number) => boolean, lod: number, seed: number, beira: (x: number, z: number, ang: number, k: number) => void, pula: (x: number, z: number) => boolean = () => false, colunas = false) {
  let k = 0
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1]
    const L = Math.hypot(bx - ax, bz - az)
    if (L < 1) continue
    const dx = (bx - ax) / L, dz = (bz - az) / L
    for (let t = 1.5; t < L; t += 3.4) {
      for (const s of [-1, 1]) {
        k++
        const nx = dz * s, nz = -dx * s
        const r = (q: number) => rnd(seed, k, q)
        // paredão: 1–2 rochas por passo, a de trás maior
        // 3 fileiras: a da frente média, as de trás cada vez MAIORES (a ref: paredão alto e maciço)
        for (const [off, sz] of [[8.6 + r(1) * 2, 1.8 + r(2) * 1.4], [12 + r(3) * 2, 3 + r(4) * 2], [16.5 + r(7) * 3, 4.5 + r(8) * 2.5]] as const) {
          const x = ax + dx * (t + r(5)) + nx * off, z = az + dz * (t + r(5)) + nz * off
          if (pula(x, z) || !ok(x, z, sz * 0.85)) continue // a caixa da rocha tem meia largura 0,8 s
          // refs 2 e 3: o paredão é de COLUNAS hexagonais de basalto; ref 1: rocha angulosa
          if (colunas) P.colunasHex(c, x, z, sz * 0.7, sz * 2.4, seed * 1000 + k * 3 + Math.round(off), lod)
          else P.rocha(c, x, z, sz, seed * 1000 + k * 3 + Math.round(off), lod, true)
        }
        // beira: 1 objeto a cada 2 passos, a 4,5–6,5 m
        if (k % 2 === 0) {
          const off = 4.5 + r(6) * 2
          const x = ax + dx * (t + 1) + nx * off, z = az + dz * (t + 1) + nz * off
          if (!pula(x, z) && ok(x, z, 0.2)) beira(x, z, Math.atan2(-nx, -nz), k)
        }
      }
    }
  }
}

export const lajesPoligonais = P.lajesPoligonais
