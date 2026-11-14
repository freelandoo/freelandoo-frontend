// features/meu-mundo/engine/cena-codigo/pecas/canion.ts — PEÇAS COPIADAS do CÂNION DAS TEMPESTADES (Zéphyra) pela
// cópia minuciosa (skill meu-mundo-cenario-codigo, `copia.md`). Inventário:
// `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/canion.json` (recortes das refs canion-1..3).
//
// A linguagem das refs: ARENITO vermelho em BLOCOS de faces planas e quinas chanfradas (tampa mais clara, o lado
// à sombra quase vinho), faixas CREME finas nos paredões, folhagem amarela e laranja feita de FOLHAS facetadas
// (losangos, não bolas lisas), tronco de bétula BRANCO com riscos escuros, capim verde-amarelado em lâminas,
// pedra creme lavrada nas ruínas e cristal CIANO aceso. Contrato: (c, x, z, ang, …, lod).

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { blob, face, LAJE_ESP, lajeEspessa, mix, mul, rnd, tube, type Foliage, type MesaOut } from "../kit-natureza"
import { quadro } from "./orbital"
import { arco, bloq, cx, poli, tronco } from "./fabrica"

// ── paleta (recortes do inventário; luz de dia — a tempestade escurece pela luz da cena) ──
export const VERM: RGB = [0.82, 0.37, 0.3]
export const VERM_CL: RGB = [0.94, 0.54, 0.44]
export const VERM_ESC: RGB = [0.56, 0.22, 0.2]
export const CREME: RGB = [0.95, 0.84, 0.7]
export const CREME_ESC: RGB = [0.78, 0.66, 0.54]
export const PEDRA: RGB = [0.9, 0.84, 0.76] // pedra creme lavrada (ruínas, lajes)
export const PEDRA_ESC: RGB = [0.7, 0.62, 0.56]
export const MADEIRA: RGB = [0.5, 0.32, 0.2]
export const MADEIRA_ESC: RGB = [0.34, 0.2, 0.13]
export const BETULA: RGB = [0.94, 0.92, 0.88]
export const CAPIM: RGB = [0.6, 0.72, 0.2]
export const CAPIM_ESC: RGB = [0.36, 0.5, 0.14]
export const PLUMA: RGB = [1, 0.97, 0.88]
export const CIANO: RGB = [0.4, 0.95, 1]
export const CIANO_CL: RGB = [0.86, 1, 1]
export const CIANO_ESC: RGB = [0.16, 0.6, 0.86]
export const AMARELO: Foliage = { dark: [0.86, 0.6, 0.06], mid: [1, 0.82, 0.14], hi: [1, 0.96, 0.46] }
export const LARANJA: Foliage = { dark: [0.86, 0.32, 0.04], mid: [1, 0.52, 0.08], hi: [1, 0.74, 0.26] }
export const OCRE: Foliage = { dark: [0.62, 0.36, 0.06], mid: [0.94, 0.62, 0.12], hi: [1, 0.84, 0.3] }

type G = ReturnType<Cena["geo"]>

/** Área jogável (±80 m): a chave do bloco nunca sai dela (a geometria fica onde está). */
const LIM = 79.5
const dentro = (v: number) => Math.max(-LIM, Math.min(LIM, v))
const geoEm = (c: Cena, x: number, z: number) => c.geo(dentro(x), dentro(z))
const luzEm = (c: Cena, x: number, z: number) => c.glow(dentro(x), dentro(z))

/** Folha facetada: losango de 2 triângulos (frente clara, quebra no meio) virado para fora do centro `ctr`. */
function folha(g: G, p: V3, ctr: V3, s: number, f: Foliage, seed: number) {
  const nx = p[0] - ctr[0], ny = p[1] - ctr[1], nz = p[2] - ctr[2]
  const L = Math.hypot(nx, ny, nz) || 1
  const n: V3 = [nx / L, ny / L, nz / L]
  // base perpendicular à normal
  const ref: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  let a: V3 = [n[1] * ref[2] - n[2] * ref[1], n[2] * ref[0] - n[0] * ref[2], n[0] * ref[1] - n[1] * ref[0]]
  const la = Math.hypot(...a)
  a = [a[0] / la, a[1] / la, a[2] / la]
  const b: V3 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]]
  const rot = rnd(seed, 1) * Math.PI
  const ca = Math.cos(rot), sa = Math.sin(rot)
  const u: V3 = [a[0] * ca + b[0] * sa, a[1] * ca + b[1] * sa, a[2] * ca + b[2] * sa]
  const v: V3 = [b[0] * ca - a[0] * sa, b[1] * ca - a[1] * sa, b[2] * ca - a[2] * sa]
  const P = (du: number, dv: number, dn = 0): V3 => [p[0] + u[0] * du * s + v[0] * dv * s + n[0] * dn * s, p[1] + u[1] * du * s + v[1] * dv * s + n[1] * dn * s, p[2] + u[2] * du * s + v[2] * dv * s + n[2] * dn * s]
  const up = Math.max(0, n[1]) * 0.5 + 0.5
  const t = up * 0.7 + rnd(seed, 2) * 0.4
  const cor = t < 0.4 ? mix(f.dark, f.mid, 0.5) : t < 0.78 ? f.mid : f.hi
  face(g, [P(-1, 0), P(0, 0.62, 0.25), P(0, -0.62, 0.25)], mix(cor, f.dark, 0.25), n)
  face(g, [P(1, 0), P(0, -0.62, 0.25), P(0, 0.62, 0.25)], cor, n)
}

/** COPA de folhas facetadas: casca de folhas em volta de uma bolha (o miolo escuro tampa os buracos). */
function copa(g: G, ctr: V3, r: V3, f: Foliage, seed: number, lod: number, dens = 1) {
  blob(g, ctr, [r[0] * 0.9, r[1] * 0.9, r[2] * 0.9], { dark: f.dark, mid: f.mid, hi: f.hi }, seed)
  if (lod) return
  const n = Math.round((10 + (r[0] + r[1] + r[2]) * 5) * dens)
  for (let k = 0; k < n; k++) {
    // pontos espalhados na superfície (Fibonacci) com tremor
    const t = (k + 0.5) / n
    const yy = 1 - 2 * t, rr = Math.sqrt(1 - yy * yy), th = k * 2.39996 + rnd(seed, k)
    const p: V3 = [ctr[0] + Math.cos(th) * rr * r[0], ctr[1] + yy * r[1] * (yy < -0.3 ? 0.7 : 1), ctr[2] + Math.sin(th) * rr * r[2]]
    folha(g, p, ctr, Math.min(r[0], r[1]) * (0.5 + rnd(seed, k, 2) * 0.22), f, seed * 97 + k)
  }
}

// ═══════════════ ROCHA ═══════════════

/**
 * ROCHA VERMELHA (inventário `rocha-vermelha`): laje de arenito larga e baixa, de faces PLANAS, com a borda de cima
 * CHANFRADA (a faixa clara inclinada que a ref mostra em toda rocha) e a tampa plana; o lado à sombra vinho.
 * `s` = meia largura; `rot` = giro.
 */
export function rochaVermelha(c: Cena, x: number, z: number, s: number, rot: number, seed: number, lod = 0, caixaOn = true) {
  const g = geoEm(c, x, z)
  const n = lod ? 5 : 6 + Math.floor(rnd(seed, 1) * 3)
  const h = s * (0.55 + rnd(seed, 2) * 0.35)
  const ax = 1 + rnd(seed, 3) * 0.4 // alongada
  const ring = (r: number, y: number, j: number) => Array.from({ length: n }, (_, k): V3 => {
    const a = rot + ((k + (rnd(seed, k, 4) - 0.5) * 0.35) / n) * Math.PI * 2
    const rr = r * (0.9 + rnd(seed, k, 5 + j) * 0.18)
    return [x + Math.cos(a) * rr * ax, y + (j === 2 ? (rnd(seed, k, 9) - 0.5) * s * 0.08 : 0), z + Math.sin(a) * rr]
  })
  const r0 = ring(s, -0.05, 0), r1 = ring(s * 0.97, h * 0.66, 1), r2 = ring(s * 0.74, h, 2)
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n
    const mx = (r0[k][0] + r0[j][0]) / 2 - x, mz = (r0[k][2] + r0[j][2]) / 2 - z
    const luz = (-mx * 0.5 - mz * 0.7) / s
    const cor = luz > 0.3 ? VERM_CL : luz > -0.35 ? VERM : VERM_ESC
    face(g, [r0[k], r0[j], r1[j], r1[k]], [mul(cor, 0.85), mul(cor, 0.85), cor, cor], [mx, 0, mz])
    face(g, [r1[k], r1[j], r2[j], r2[k]], mix(cor, VERM_CL, 0.45), [mx, s * 0.8, mz])
  }
  face(g, [...r2].reverse(), mix(VERM_CL, CREME, 0.12), [0, 1, 0])
  if (!lod && rnd(seed, 30) < 0.6) {
    // uma rachadura escura na face da frente (o risco que a ref desenha)
    const k = Math.floor(rnd(seed, 31) * n), j = (k + 1) % n
    const a = r1[k], b = r1[j], m: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    const mx = m[0] - x, mz = m[2] - z, L = Math.hypot(mx, mz) || 1
    const o: V3 = [(mx / L) * 0.03, 0, (mz / L) * 0.03]
    face(g, [[m[0] + o[0], m[1] - 0.05, m[2] + o[2]], [m[0] + o[0] + (b[0] - a[0]) * 0.08, m[1] - h * 0.4, m[2] + o[2] + (b[2] - a[2]) * 0.08], [m[0] + o[0] + (b[0] - a[0]) * 0.05, m[1] - h * 0.4, m[2] + o[2] + (b[2] - a[2]) * 0.05]], VERM_ESC, [mx, 0, mz])
  }
  if (caixaOn && s > 0.6) c.block(x, z, s * 0.85 * ax, s * 0.85, h, -rot)
  return h
}

// ═══════════════ VEGETAÇÃO ═══════════════

/** ARBUSTO AMARELO (ref 1): 3–5 tufos de folhas facetadas amarelas, baixo e largo. `r` = raio. */
export function arbustoAmarelo(c: Cena, x: number, z: number, r: number, seed: number, lod = 0, f: Foliage = AMARELO) {
  const g = geoEm(c, x, z)
  const n = lod ? 1 : 3 + Math.floor(rnd(seed, 1) * 3)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2, d = k ? r * (0.45 + rnd(seed, k, 3) * 0.35) : 0
    const rr = r * (k ? 0.55 + rnd(seed, k, 4) * 0.25 : 0.7)
    copa(g, [x + Math.cos(a) * d, rr * 0.8, z + Math.sin(a) * d], [rr, rr * 0.82, rr], f, seed * 13 + k, lod, 0.9)
  }
}

/** CAPIM: tufo de lâminas finas (triângulos altos e inclinados para fora), 2 tons. */
export function capim(c: Cena, x: number, z: number, h: number, seed: number, n = 7) {
  const g = geoEm(c, x, z)
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(seed, k) * 0.8
    const hh = h * (0.6 + rnd(seed, k, 2) * 0.5), incl = 0.25 + rnd(seed, k, 3) * 0.35
    const bx = x + Math.cos(a) * h * 0.08, bz = z + Math.sin(a) * h * 0.08
    const px = -Math.sin(a) * h * 0.06, pz = Math.cos(a) * h * 0.06
    face(g, [[bx - px, 0, bz - pz], [bx + px, 0, bz + pz], [bx + Math.cos(a) * hh * incl, hh, bz + Math.sin(a) * hh * incl]], [CAPIM_ESC, CAPIM_ESC, k % 2 ? CAPIM : mix(CAPIM, [0.86, 0.86, 0.3], 0.4)], [Math.cos(a), 0.3, Math.sin(a)])
  }
}

/** CAPIM-DOS-PAMPAS (ref 1, beira do caminho): o tufo de lâminas e 3–5 hastes com a PLUMA creme em gomos. */
export function pampa(c: Cena, x: number, z: number, h: number, seed: number, lod = 0) {
  capim(c, x, z, h * 0.55, seed, lod ? 4 : 8)
  if (lod) return
  const g = geoEm(c, x, z)
  const n = 3 + Math.floor(rnd(seed, 9) * 3)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 10) * Math.PI * 2, incl = 0.08 + rnd(seed, k, 11) * 0.14
    const hh = h * (0.8 + rnd(seed, k, 12) * 0.35)
    const top: V3 = [x + Math.cos(a) * hh * incl, hh, z + Math.sin(a) * hh * incl]
    tube(g, [x, 0, z], [top[0], top[1] - h * 0.22, top[2]], 0.012 * h + 0.008, 0.008, 3, () => CAPIM_ESC, false)
    // pluma: 3 gomos em losango empilhados
    for (let q = 0; q < 3; q++) {
      const yy = top[1] - h * 0.22 + q * h * 0.08
      const r = h * (0.085 - q * 0.015)
      tube(g, [top[0], yy, top[2]], [top[0], yy + h * 0.09, top[2]], r, r * 0.5, 4, (j) => (j % 2 ? PLUMA : mix(PLUMA, CREME_ESC, 0.4)), q === 2)
    }
  }
}

/**
 * ÁRVORE DE OUTONO (refs 1 e 2). `tipo`: "redonda" (tronco marrom, copa redonda em 3–4 cachos — a maioria),
 * "betula" (tronco BRANCO com riscos, galhos que abrem, copa laranja grande), "vento" (tronco curvo e a copa
 * varrida para o lado, ref 2). `h` = altura.
 */
export function arvore(c: Cena, x: number, z: number, h: number, seed: number, lod = 0, tipo: "redonda" | "betula" | "vento" = "redonda", f?: Foliage) {
  const g = geoEm(c, x, z)
  const fol = f ?? (rnd(seed, 1) < 0.55 ? AMARELO : rnd(seed, 2) < 0.5 ? LARANJA : OCRE)
  const casca = tipo === "betula" || tipo === "vento" ? BETULA : MADEIRA
  const vento = tipo === "vento" ? 1 : 0
  const va = rnd(seed, 3) * Math.PI * 2, vx = Math.cos(va), vz = Math.sin(va)
  // tronco em 3 gomos (curva no "vento")
  const pts: V3[] = [[x, -0.1, z]]
  for (let k = 1; k <= 3; k++) {
    const t = k / 3
    const curva = vento ? Math.sin(t * Math.PI * 0.8) * h * 0.25 : (rnd(seed, k, 4) - 0.5) * h * 0.05
    pts.push([x + vx * curva, h * 0.55 * t, z + vz * curva])
  }
  const r0 = h * (tipo === "betula" ? 0.055 : 0.045)
  for (let k = 0; k < 3; k++) {
    tube(g, pts[k], pts[k + 1], r0 * (1 - k * 0.22), r0 * (1 - (k + 1) * 0.22), lod ? 4 : 6, (j) => (j % 3 === 0 ? mul(casca, 0.82) : casca), false)
    if (!lod && casca === BETULA) {
      // os riscos escuros da bétula
      const m: V3 = [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2, (pts[k][2] + pts[k + 1][2]) / 2]
      tube(g, [m[0], m[1] - 0.04, m[2]], [m[0], m[1] + 0.04, m[2]], r0 * (1.02 - k * 0.22), r0 * (1.02 - k * 0.22), 6, (j) => (j % 2 ? [0.3, 0.26, 0.24] : casca), false)
    }
  }
  const topo = pts[3]
  // galhos (2–3) abrindo do alto do tronco
  const nG = lod ? 0 : tipo === "betula" ? 3 : 2
  for (let k = 0; k < nG; k++) {
    const a = va + (k / nG) * Math.PI * 2 + 0.5
    tube(g, pts[2], [topo[0] + Math.cos(a) * h * 0.18, topo[1] + h * 0.12, topo[2] + Math.sin(a) * h * 0.18], r0 * 0.4, r0 * 0.15, 4, () => casca, false)
  }
  // copa: cachos de folhas
  const R = h * (tipo === "betula" ? 0.34 : 0.32)
  const cachos: [number, number, number, number][] = vento
    ? [[0.15, 0.15, 0.1, 1], [0.7, 0.05, -0.2, 0.85], [1.25, -0.05, 0.25, 0.7], [1.75, -0.12, 0, 0.5]]
    : [[0, 0.28, 0, 1], [0.55, 0, 0.3, 0.8], [-0.5, 0.05, -0.35, 0.78], [0.1, -0.05, -0.55, 0.7]]
  const nC = lod ? 1 : cachos.length
  for (let k = 0; k < nC; k++) {
    const [du, dy, dw, s] = cachos[k]
    const ctr: V3 = vento ? [topo[0] + vx * du * R, topo[1] + R * 0.55 + dy * R, topo[2] + vz * du * R + dw * R * 0.3] : [topo[0] + du * R, topo[1] + R * 0.6 + dy * R, topo[2] + dw * R]
    copa(g, ctr, [R * s * (vento ? 1.2 : 1), R * s * (vento ? 0.62 : 0.85), R * s], fol, seed * 7 + k, lod)
  }
  c.block(x, z, Math.max(0.25, r0 * 1.4), Math.max(0.25, r0 * 1.4), 3)
}

// ═══════════════ PAREDÕES ═══════════════

/**
 * PENHASCO EM ANDARES (refs 1 e 2): paredão de arenito feito de COLUNAS verticais de faces planas (cada uma um
 * pouco para dentro ou para fora), duas FAIXAS CREME perto do alto, a tampa de capim com a borda e um segundo
 * andar recuado. Planta oval rx × rz; `h` = altura do 1º andar.
 */
export function penhasco(c: Cena, x: number, z: number, rx: number, rz: number, h: number, seed: number, lod = 0, andar2 = true, caixaOn = true, y0 = 0) {
  const g = geoEm(c, x, z)
  const faixas: [number, number, RGB][] = [[0, 0.6, VERM], [0.6, 0.65, CREME], [0.65, 0.76, VERM], [0.76, 0.84, CREME], [0.84, 1, VERM]]
  const parede = (cx0: number, cz0: number, ax: number, az: number, y0: number, hh: number, sd: number) => {
    // a borda em COLUNAS: cada coluna é um prisma de 4 lados (face de fora + 2 laterais + tampa) com o seu
    // recuo e o seu topo — a ref nunca tem um anel liso; o miolo é um prisma escondido
    const n = lod ? 7 : Math.max(9, Math.round((ax + az) * 0.85))
    const ang = Array.from({ length: n + 1 }, (_, k) => (k / n) * Math.PI * 2 + rnd(sd, 1) * 0.3 + (k > 0 && k < n ? (rnd(sd, k, 7) - 0.5) * (Math.PI * 2 / n) * 0.35 : 0))
    const P = (a: number, r: number, y: number): V3 => [cx0 + Math.cos(a) * ax * r, y, cz0 + Math.sin(a) * az * r]
    // miolo (para não ver através entre colunas)
    const mio = 0.8
    for (let k = 0; k < n; k++) face(g, [P(ang[k], mio, y0), P(ang[k + 1], mio, y0), P(ang[k + 1], mio, y0 + hh * 0.97), P(ang[k], mio, y0 + hh * 0.97)], VERM_ESC, [Math.cos((ang[k] + ang[k + 1]) / 2), 0, Math.sin((ang[k] + ang[k + 1]) / 2)])
    face(g, [P(0, 0, y0 + hh * 0.97), ...Array.from({ length: n }, (_, k) => P(ang[k], mio, y0 + hh * 0.97))].map((p, i) => (i === 0 ? [cx0, y0 + hh * 0.97, cz0] : p) as V3), CAPIM, [0, 1, 0])
    for (let k = 0; k < n; k++) {
      const a0 = ang[k], a1 = ang[k + 1], am = (a0 + a1) / 2
      const r = 0.92 + rnd(sd, k, 2) * 0.22 // recuo da coluna
      const ht = hh * (0.9 + rnd(sd, k, 3) * 0.14) // topo desencontrado
      const nx = Math.cos(am) * az, nz = Math.sin(am) * ax
      const luz = (-nx * 0.45 - nz * 0.7) / Math.max(ax, az) / Math.max(ax, az) * Math.max(ax, az)
      const tom = luz > 0.25 ? 1.1 : luz > -0.3 ? 1 : 0.72
      // face de fora em faixas (a creme acompanha o topo desta coluna)
      for (const [f0, f1, cor0] of lod ? [[0, 1, VERM] as [number, number, RGB]] : faixas) {
        const cor = mul(cor0, tom * (0.94 + rnd(sd, k, 4) * 0.1))
        const y_0 = y0 + ht * f0, y_1 = y0 + ht * f1
        face(g, [P(a0, r, y_0), P(a1, r, y_0), P(a1, r, y_1), P(a0, r, y_1)], [mul(cor, f0 === 0 ? 0.78 : 1), mul(cor, f0 === 0 ? 0.78 : 1), cor, cor], [nx, 0, nz])
      }
      // laterais (do recuo até o miolo) — as quinas que dão as colunas
      for (const [aa, sg] of [[a0, -1], [a1, 1]] as const) {
        const tn: V3 = [-Math.sin(aa) * sg * ax, 0, Math.cos(aa) * sg * az]
        face(g, [P(aa, mio, y0), P(aa, r, y0), P(aa, r, y0 + ht), P(aa, mio, y0 + ht)], mul(VERM, tom * 0.86), tn)
      }
      // tampa da coluna: chanfro claro e capim
      const ch = 0.94
      face(g, [P(a0, r, y0 + ht), P(a1, r, y0 + ht), P(a1, r * ch, y0 + ht + 0.3), P(a0, r * ch, y0 + ht + 0.3)], mix(VERM_CL, CREME, 0.15), [nx, 1.2, nz])
      face(g, [P(a0, r * ch, y0 + ht + 0.3), P(a1, r * ch, y0 + ht + 0.3), P(a1, mio, y0 + ht + 0.3), P(a0, mio, y0 + ht + 0.3)], CAPIM, [0, 1, 0])
    }
  }
  parede(x, z, rx, rz, y0, h, seed)
  if (andar2) parede(x - rx * 0.12, z + rz * 0.15, rx * 0.55, rz * 0.5, y0 + h + 0.25, h * 0.6, seed + 5)
  if (caixaOn) c.blockOval(x, z, rx * 1.02, rz * 1.02, y0 + h * (andar2 ? 1.6 : 1))
  const topY = y0 + h + (andar2 ? h * 0.6 : 0)
  const out: MesaOut = {
    x, z, rx, rz, topY,
    top: (u, v) => [x + u * rx * 0.6, y0 + h + 0.3, z + v * rz * 0.6],
    inside: (px, pz, k = 1) => ((px - x) / (rx * 1.14 * k)) ** 2 + ((pz - z) / (rz * 1.14 * k)) ** 2 < 1,
  }
  return out
}

/** AGULHA DE ARENITO (refs 2 e 3): 3 blocos empilhados que afinam, cada um com faixa creme e tampa de capim; `cristais` = a crista ciana da ref 2. */
export function agulhaBlocos(c: Cena, x: number, z: number, h: number, seed: number, lod = 0, cristais = false) {
  let y = 0, w = h * 0.24
  const alturas = [0.42, 0.34, 0.24]
  for (let k = 0; k < 3; k++) {
    const hh = h * alturas[k]
    penhasco(c, x + (rnd(seed, k) - 0.5) * w * 0.2, z + (rnd(seed, k, 2) - 0.5) * w * 0.2, w, w * 0.85, hh, seed + k * 3, lod, false, false, y)
    y += hh
    w *= 0.68
  }
  c.block(x, z, h * 0.12, h * 0.11, h)
  if (cristais && !lod) for (let k = 0; k < 5; k++) cristalCiano(c, x + (rnd(seed, k, 9) - 0.5) * h * 0.1, z - h * 0.1, h * (0.08 + rnd(seed, k, 8) * 0.05), seed + k, lod, h * (0.45 + k * 0.08))
}

/** CRISTAL CIANO (refs 2 e 3): 3–5 prismas de 6 faces com ponta, facetas alternando fundo e reflexo. `y` = pé. */
export function cristalCiano(c: Cena, x: number, z: number, s: number, seed: number, lod = 0, y = 0) {
  const GL = luzEm(c, x, z)
  const n = lod ? 2 : 3 + Math.floor(rnd(seed, 1) * 3)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 2) * Math.PI * 2, tilt = k ? 0.3 + rnd(seed, k, 3) * 0.35 : 0.06
    const hh = s * (k ? 0.55 + rnd(seed, k, 4) * 0.35 : 1), r = s * 0.2 * (k ? 0.72 : 1)
    const bx = x + Math.cos(a) * r * (k ? 1.4 : 0), bz = z + Math.sin(a) * r * (k ? 1.4 : 0)
    const sh: V3 = [bx + Math.cos(a) * hh * tilt * 0.8, y + hh * 0.78, bz + Math.sin(a) * hh * tilt * 0.8]
    const tip: V3 = [bx + Math.cos(a) * hh * tilt, y + hh, bz + Math.sin(a) * hh * tilt]
    const m = 6
    for (let j = 0; j < m; j++) {
      const t0 = (j / m) * Math.PI * 2, t1 = ((j + 1) / m) * Math.PI * 2
      const p0: V3 = [bx + Math.cos(t0) * r, y - 0.05, bz + Math.sin(t0) * r], p1: V3 = [bx + Math.cos(t1) * r, y - 0.05, bz + Math.sin(t1) * r]
      const q0: V3 = [sh[0] + Math.cos(t0) * r, sh[1], sh[2] + Math.sin(t0) * r], q1: V3 = [sh[0] + Math.cos(t1) * r, sh[1], sh[2] + Math.sin(t1) * r]
      const N: V3 = [Math.cos((t0 + t1) / 2), 0.2, Math.sin((t0 + t1) / 2)]
      const cor = j % 3 === 0 ? CIANO_CL : j % 3 === 1 ? CIANO : CIANO_ESC
      face(GL, [p0, p1, q1, q0], [mul(cor, 0.7), mul(cor, 0.7), cor, cor], N)
      face(GL, [q0, q1, tip], [cor, cor, CIANO_CL], [N[0], 0.7, N[2]])
    }
  }
  if (s > 0.9 && y === 0) c.block(x, z, s * 0.3, s * 0.3, s)
}

/**
 * ARCO NATURAL (ref 1, o marco ao fundo): duas pernas de BLOCOS empilhados (penhascos) e o LINTEL grosso de faces
 * planas com a faixa creme, tampa de capim. Vão `vao` (m), altura `h` do vão; atravessado na direção `ang`.
 */
export function arcoNatural(c: Cena, x: number, z: number, ang: number, vao: number, h: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const pw = vao * 0.62, D = vao * 0.6
  for (const s of [-1, 1]) {
    const p = Q.P(s * (vao / 2 + pw / 2), 0, 0)
    penhasco(c, p[0], p[2], pw * 0.62, D * 0.55, h + vao * 0.35, Math.round(x + z) + s * 7, lod, false)
  }
  // o lintel: uma "ponte" de faces planas, com a barriga em arco por baixo (6 gomos)
  const g = geoEm(c, x, z)
  const yb = h, R = vao / 2, esp = vao * 0.5
  const seg = lod ? 4 : 8
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI, a1 = ((k + 1) / seg) * Math.PI
    const P = (a: number, r: number, v: number) => Q.P(Math.cos(a) * r, v, yb - R * 0.25 + Math.sin(a) * r * 0.55)
    const cor = k % 2 ? VERM : mix(VERM, VERM_ESC, 0.3)
    for (const sv of [-1, 1]) face(g, [P(a0, R, (sv * D) / 2), P(a1, R, (sv * D) / 2), [P(a1, R, (sv * D) / 2)[0], yb + esp, P(a1, R, (sv * D) / 2)[2]], [P(a0, R, (sv * D) / 2)[0], yb + esp, P(a0, R, (sv * D) / 2)[2]]], sv > 0 ? cor : mul(cor, 0.8), Q.N(0, sv))
    face(g, [P(a0, R, -D / 2), P(a1, R, -D / 2), P(a1, R, D / 2), P(a0, R, D / 2)], VERM_ESC, Q.N(-Math.cos((a0 + a1) / 2), 0, -1))
  }
  tronco(g, Q, 0, 0, yb + esp - 0.6, yb + esp - 0.3, vao + pw * 0.8, D, vao + pw * 0.8, D, CREME, undefined, CREME)
  tronco(g, Q, 0, 0, yb + esp - 0.3, yb + esp + 0.5, vao + pw * 0.8, D, vao + pw * 0.6, D * 0.85, VERM, CAPIM, VERM_CL)
}

// ═══════════════ RUÍNAS (cena 3) ═══════════════

/**
 * MOINHO EM RUÍNA (ref 3): torre redonda de PEDRA CREME em fiadas (8 faces, alternando tons), porta em arco escura,
 * a coroa QUEBRADA (ameias desiguais), o CUBO de madeira com o aro de raios e as 4 PÁS: viga de madeira e a
 * VELA de pano creme rasgada (com furos). Frente para `ang`; as pás no lado da frente.
 */
export function moinhoRuina(c: Cena, x: number, z: number, h: number, ang: number, seed: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z)
  const R = h * 0.2, n = lod ? 6 : 8
  // fiadas de pedra (5) com tom alternado e o leve afunilar
  const nf = lod ? 2 : 6
  for (let f = 0; f < nf; f++) {
    const y0 = (h * f) / nf, y1 = (h * (f + 1)) / nf
    const r0 = R * (1 - (f / nf) * 0.12), r1 = R * (1 - ((f + 1) / nf) * 0.12)
    tube(g, [x, y0, z], [x, y1, z], r0, r1, n, (k) => ((k + f) % 2 ? PEDRA : mix(PEDRA, PEDRA_ESC, 0.35)), false)
  }
  // coroa quebrada: ameias de alturas diferentes (umas faltando)
  for (let k = 0; k < n; k++) {
    if (rnd(seed, k, 3) < 0.3) continue
    const a = (k / n) * Math.PI * 2
    const hh = 0.4 + rnd(seed, k, 4) * 0.9
    const px = x + Math.cos(a) * R * 0.86, pz = z + Math.sin(a) * R * 0.86
    tube(g, [px, h, pz], [px, h + hh, pz], R * 0.26, R * 0.24, 4, (j) => (j % 2 ? PEDRA : PEDRA_ESC), true)
  }
  // porta em arco (escura) e o batente de pedra
  poli(g, Q, arco(0, 0, h * 0.24, R * 0.32, lod ? 3 : 6), R * 0.98, [0.24, 0.2, 0.2])
  if (!lod) {
    const am = arco(0, 0, h * 0.24, R * 0.42, 6).slice(2)
    for (let k = 0; k < am.length - 1; k++) tube(g, Q.P(am[k][0], R * 0.97, am[k][1]), Q.P(am[k + 1][0], R * 0.97, am[k + 1][1]), 0.12, 0.12, 4, (j) => (j % 2 ? PEDRA : PEDRA_ESC), false)
  }
  // cubo, aro e pás
  const hub = Q.P(0, R + 0.35, h * 0.78)
  tube(g, Q.P(0, R * 0.7, h * 0.78), hub, 0.28, 0.24, 6, () => MADEIRA_ESC, true)
  const giro = rnd(seed, 5) * Math.PI
  const PR = (a: number, r: number, dv = 0): V3 => Q.P(Math.cos(a) * r, R + 0.4 + dv, h * 0.78 + Math.sin(a) * r)
  // aro de raios (perto do cubo)
  const ra = h * 0.16, na = lod ? 6 : 12
  for (let k = 0; k < na; k++) tube(g, PR((k / na) * Math.PI * 2, ra), PR(((k + 1) / na) * Math.PI * 2, ra), 0.06, 0.06, 4, () => MADEIRA, false)
  for (let k = 0; k < 4; k++) {
    const a = giro + (k / 4) * Math.PI * 2
    const L = h * 0.62
    tube(g, PR(a, 0), PR(a, L), 0.09, 0.07, 4, (j) => (j % 2 ? MADEIRA : MADEIRA_ESC), false)
    // vela de pano (do lado do giro), rasgada: 2 triângulos + recortes
    const pa = a + 0.18
    const A = PR(a, L * 0.3, 0.05), B = PR(a, L * 0.98, 0.05), C = PR(pa + 0.06, L * 0.95, 0.05), D = PR(pa, L * 0.32, 0.05)
    face(g, [A, B, C, D], [PLUMA, PLUMA, CREME_ESC, CREME], Q.N(0, 1))
    face(g, [A, B, C, D], CREME_ESC, Q.N(0, -1))
    if (!lod) {
      // furos: losangos escuros "por cima" (o pano rasgado)
      for (let q = 0; q < 2; q++) {
        const t = 0.45 + q * 0.28 + rnd(seed, k, q) * 0.06
        const m = PR(a + 0.1, L * t, 0.07)
        const s = h * 0.03
        face(g, [[m[0], m[1] - s, m[2]], [m[0] + s * Q.sx, m[1], m[2] + s * Q.sz], [m[0], m[1] + s, m[2]], [m[0] - s * Q.sx, m[1], m[2] - s * Q.sz]], [0.4, 0.36, 0.4], Q.N(0, 1))
      }
    }
  }
  c.block(x, z, R, R, h)
}

/**
 * PEDESTAL DE CRISTAL (ref 3, a fila do caminho): base de pedra creme em degrau, o corpo com os 4 MONTANTES de
 * madeira nas quinas e o CHEVRON lavrado na frente, a COROA de pedra (4 dentes) segurando o cristal ciano.
 */
export function pedestalCristal(c: Cena, x: number, z: number, ang: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z)
  tronco(g, Q, 0, 0, 0, 0.25, 1.2, 1.2, 1.1, 1.1, PEDRA, PEDRA)
  tronco(g, Q, 0, 0, 0.25, 0.42, 1.05, 1.05, 0.98, 0.98, MADEIRA, MADEIRA_ESC)
  cx(g, Q, 0, 0, 0.85, 0.85, 0.42, 1.35, CREME, CREME, CREME)
  for (const [su, sv] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) cx(g, Q, su * 0.4, sv * 0.4, 0.16, 0.16, 0.25, 1.4, MADEIRA, MADEIRA_ESC)
  cx(g, Q, 0, 0, 1, 1, 1.35, 1.5, MADEIRA, MADEIRA_ESC)
  if (!lod) for (const sv of [1, -1]) poli(g, Q, [[-0.32, 1.05], [0, 0.72], [0.32, 1.05], [0.32, 0.88], [0, 0.55], [-0.32, 0.88]].map(([u, y]) => [sv > 0 ? u : -u, y]) as [number, number][], sv * 0.435, CREME_ESC, sv < 0)
  // coroa com 4 dentes
  tronco(g, Q, 0, 0, 1.5, 1.72, 0.75, 0.75, 0.82, 0.82, PEDRA, PEDRA_ESC)
  if (!lod) for (const [su, sv] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) tronco(g, Q, su * 0.3, sv * 0.3, 1.72, 2, 0.2, 0.2, 0.06, 0.06, PEDRA)
  cristalCiano(c, x, z, 0.75, Math.round(x * 3 + z), lod, 1.6)
  bloq(c, Q, 0, 0, 1.1, 1.1, 2)
}

/** BLOQUETE de pedra creme (ref 3, a beira das lajes): bloco lavrado chanfrado, às vezes dois empilhados. */
export function bloquete(c: Cena, x: number, z: number, w: number, ang: number, seed: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z)
  const h = 0.42 + rnd(seed, 1) * 0.2, d = 0.7
  tronco(g, Q, 0, 0, 0, h, w, d, w * 0.93, d * 0.86, PEDRA, mix(PEDRA, CREME, 0.5), CREME)
  if (!lod && rnd(seed, 2) < 0.3) tronco(g, Q, (rnd(seed, 3) - 0.5) * w * 0.3, 0, h, h * 1.9, w * 0.6, d * 0.8, w * 0.55, d * 0.72, PEDRA, mix(PEDRA, CREME, 0.5), CREME)
  bloq(c, Q, 0, 0, w, d, h)
}

/** ARCO EM RUÍNA (ref 3, direita): dois pilares de pedra creme em fiadas e o arco redondo de aduelas, um lado mais baixo. */
export function arcoRuina(c: Cena, x: number, z: number, ang: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z)
  const hw = 1.3, pw = 0.9, H = 3.2, D = 1.1
  for (const s of [-1, 1]) {
    const nf = lod ? 1 : 5
    for (let f = 0; f < nf; f++) cx(g, Q, s * (hw + pw / 2) + (f % 2 ? 0.03 : -0.03), 0, pw, D, (H * f) / nf, (H * (f + 1)) / nf, f % 2 ? PEDRA : mix(PEDRA, PEDRA_ESC, 0.3), PEDRA)
    bloq(c, Q, s * (hw + pw / 2), 0, pw, D, H)
  }
  const seg = lod ? 4 : 7
  for (let k = 0; k < seg; k++) {
    if (k === seg - 1 && rnd(Math.round(x), 4) < 0.5) continue // uma aduela caída
    const a0 = (k / seg) * Math.PI, a1 = ((k + 1) / seg) * Math.PI
    const P = (a: number, r: number, v: number) => Q.P(Math.cos(a) * r, v, H + Math.sin(a) * r)
    for (const sv of [-1, 1]) face(g, [P(a0, hw, (sv * D) / 2), P(a1, hw, (sv * D) / 2), P(a1, hw + pw, (sv * D) / 2), P(a0, hw + pw, (sv * D) / 2)], k % 2 ? PEDRA : mix(PEDRA, PEDRA_ESC, 0.3), Q.N(0, sv))
    face(g, [P(a0, hw + pw, -D / 2), P(a1, hw + pw, -D / 2), P(a1, hw + pw, D / 2), P(a0, hw + pw, D / 2)], PEDRA, Q.N(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)))
    face(g, [P(a0, hw, -D / 2), P(a1, hw, -D / 2), P(a1, hw, D / 2), P(a0, hw, D / 2)], PEDRA_ESC, Q.N(-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)))
  }
}

/**
 * HORIZONTE DO CÂNION (malha SEM névoa): o mar de MESAS em andares e as AGULHAS das refs, em dois anéis
 * (170–200 m e 230–270 m), azulados pela distância (perspectiva aérea das refs). `tempestade` = as torres com a
 * crista de cristal e os raios fixos.
 */
export function horizonteCanion(c: Cena, seed: number, nevoa: RGB, tempestade = false) {
  const g = c.horizonte, GL = c.horizonteLuz
  const i0 = g.count, j0 = GL.count
  const lod = 1
  const mesaH = (x: number, z: number, rx: number, rz: number, h: number, sd: number) => {
    const gg = c.horizonte
    const n = 9
    const pts = Array.from({ length: n }, (_, k): [number, number] => {
      const a = (k / n) * Math.PI * 2 + rnd(sd, k) * 0.3
      const r = 0.85 + rnd(sd, k, 2) * 0.25
      return [x + Math.cos(a) * rx * r, z + Math.sin(a) * rz * r]
    })
    const faixas: [number, number, RGB][] = [[0, 0.62, VERM], [0.62, 0.68, CREME], [0.68, 1, VERM]]
    for (let k = 0; k < n; k++) {
      const A = pts[k], B = pts[(k + 1) % n]
      const mx = (A[0] + B[0]) / 2 - x, mz = (A[1] + B[1]) / 2 - z
      const tom = (-mx * 0.45 - mz * 0.7) / Math.max(rx, rz) > 0 ? 1.05 : 0.78
      for (const [f0, f1, cc] of faixas) face(gg, [[A[0], h * f0 - 2, A[1]], [B[0], h * f0 - 2, B[1]], [B[0], h * f1, B[1]], [A[0], h * f1, A[1]]], mul(cc, tom), [mx, 0, mz])
    }
    face(gg, pts.map(([px, pz]): V3 => [px, h, pz]), mix(CAPIM, VERM, 0.3), [0, 1, 0])
  }
  for (const [d0, dd, nK] of [[175, 25, 9], [235, 35, 12]] as const)
    for (let k = 0; k < nK; k++) {
      const a = (k / nK) * Math.PI * 2 + rnd(seed, k, d0) * 0.4
      const d = d0 + rnd(seed, k, d0 + 1) * dd
      const x = Math.cos(a) * d, z = Math.sin(a) * d
      const rx = 12 + rnd(seed, k, d0 + 2) * 18, h = 14 + rnd(seed, k, d0 + 3) * 22
      mesaH(x, z, rx, rx * (0.6 + rnd(seed, k, d0 + 4) * 0.4), h, seed + k + d0)
      if (k % 2 === 0) mesaH(x + rx * 0.15, z, rx * 0.5, rx * 0.4, h + 8 + rnd(seed, k, 9) * 10, seed + k + d0 + 50)
      if (k % 3 === 1) {
        // agulha alta ao lado (3 andares)
        const ax = x + Math.cos(a + 1.6) * rx * 1.1, az = z + Math.sin(a + 1.6) * rx * 1.1
        let w = 5 + rnd(seed, k, 11) * 3, y = 0
        const H = 30 + rnd(seed, k, 12) * 30
        for (let q = 0; q < 3; q++) {
          const hh = H * [0.42, 0.34, 0.24][q]
          tube(g, [ax, y - 2, az], [ax, y + hh, az], w, w * 0.9, 6, (j) => (j % 3 === 0 ? VERM_CL : j % 3 === 1 ? VERM : VERM_ESC), true)
          tube(g, [ax, y + hh * 0.7, az], [ax, y + hh * 0.76, az], w * 0.97, w * 0.95, 6, () => CREME, false)
          y += hh
          w *= 0.68
        }
        if (tempestade)
          for (let q = 0; q < 4; q++) {
            const by = H * (0.42 + q * 0.09), bx = ax + Math.cos(a + 3.1) * 5.5, bz = az + Math.sin(a + 3.1) * 5.5
            tube(GL, [bx + (q - 1.5) * 1.6, by, bz], [bx + (q - 1.5) * 2.2, by + 6 + q, bz], 0.9, 0.05, 5, (j) => (j % 2 ? CIANO : CIANO_CL), true)
          }
      }
    }
  void lod
  // bruma pintada (azulada) pela distância
  for (const [geo, ini] of [[g, i0], [GL, j0]] as const)
    for (let v = ini; v < geo.count; v++) {
      const t = Math.min(1, Math.max(0, (Math.hypot(geo.p[v * 3], geo.p[v * 3 + 2]) - 120) / 180)) * 0.62
      for (let q = 0; q < 3; q++) geo.c[v * 4 + q] = geo.c[v * 4 + q] * (1 - t) + nevoa[q] * t
    }
}

/**
 * ESTRADA DE LAJES (ref 3): lajes retangulares de pedra creme em fiadas atravessadas (2–3 por fiada, larguras
 * desencontradas), junta escura (o chão aparece entre elas), uma ou outra mais escura/rachada. 2 cm de
 * espessura (lateral escura), só onde `dentro(x, z)`. Ao longo da polilinha `path`, largura `w`.
 */
export function estradaLajes(c: Cena, path: readonly (readonly [number, number])[], w: number, seed: number, dentroOk: (x: number, z: number) => boolean, lod = 0) {
  if (lod) return
  let fi = 0
  for (let k = 0; k < path.length - 1; k++) {
    const [ax, az] = path[k], [bx, bz] = path[k + 1]
    const L = Math.hypot(bx - ax, bz - az)
    if (L < 0.5) continue
    const dx = (bx - ax) / L, dz = (bz - az) / L, nx = dz, nz = -dx
    const fy = 1.2
    for (let t = 0; t < L; t += fy, fi++) {
      // fiada: corta a largura em 2–3 lajes
      const cortes = [-w / 2]
      let u = -w / 2
      while (u < w / 2 - 0.6) {
        u += 1.2 + rnd(seed, fi, cortes.length) * 1.4
        cortes.push(Math.min(w / 2, u))
      }
      cortes[cortes.length - 1] = w / 2
      for (let q = 0; q < cortes.length - 1; q++) {
        const u0 = cortes[q] + 0.05, u1 = cortes[q + 1] - 0.05, t0 = t + 0.05, t1 = Math.min(L, t + fy) - 0.05
        if (u1 - u0 < 0.3 || t1 - t0 < 0.3) continue
        const cxp = ax + dx * (t0 + t1) / 2 + nx * (u0 + u1) / 2, czp = az + dz * (t0 + t1) / 2 + nz * (u0 + u1) / 2
        if (!dentroOk(cxp, czp)) continue
        const r = rnd(seed, fi, q + 10)
        const cor = r < 0.15 ? PEDRA_ESC : r < 0.6 ? PEDRA : mix(PEDRA, CREME, 0.6)
        const y = LAJE_ESP
        const Pt = (tt: number, uu: number): V3 => [ax + dx * tt + nx * uu, y, az + dz * tt + nz * uu]
        const g = geoEm(c, cxp, czp)
        lajeEspessa(g, [Pt(t0, u0), Pt(t1, u0), Pt(t1, u1), Pt(t0, u1)], [cor, mix(cor, CREME, 0.25), cor, mul(cor, 0.94)], mul(cor, 0.6))
      }
    }
  }
}
