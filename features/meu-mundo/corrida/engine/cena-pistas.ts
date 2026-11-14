// features/meu-mundo/corrida/engine/cena-pistas.ts — CORRIDA: o cenário das 6 pistas EM CÓDIGO (minigames em código, 14/11).
//
// Pedido do Alex: "substituir tudo 3D por feito por nós, como nos Domínios". O cenário antigo (track-env.ts) era
// caixa/cilindro/toro do Babylon com textura de canvas; agora é o kit dos Domínios (`engine/cena-codigo/`): cor e
// desgaste por vértice, as PEÇAS DOS DOMÍNIOS (penhasco, agulha e arco do Cânion; árvore, cogumelo e rochedo da
// Floresta da Lua; torre de cristal da Orbital; rocha e navio do Mar de Gelo; engrenagem, caldeira e chaminé da
// Fábrica) e peças próprias da Corrida (prédio de tijolo, torre de vidro, plataforma, coluna e viga da forja).
//
// Como cabe na escala da Corrida (mesas de 100 m, torres de 300 m, a pista 40–140 m acima do chão): cada peça é
// montada UMA vez na origem (um `Molde`, no tamanho de Domínio) e CARIMBADA em escala (`carimbo`) quantas vezes for
// preciso. Tudo vai para uma `Cena` com blocos largos (1 chamada de desenho por bloco, `finishCena`). Os lugares
// continuam os do cenário antigo (as mesmas regras de folga da pista), então nada novo encosta na pista.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Geo, noise, type RGB, type V3 } from "../../engine/cena-codigo/kit"
import { Cena, finishCena, ground } from "../../engine/cena-codigo/kit-cena"
import { caixa, paineis, sideOf } from "../../engine/cena-codigo/kit-cidade"
import { face, mix, mul, rnd, tube } from "../../engine/cena-codigo/kit-natureza"
import { agulhaBlocos, arcoNatural, arbustoAmarelo, penhasco, rochaVermelha } from "../../engine/cena-codigo/pecas/canion"
import { COPA, COPA_FUNDO, arvoreLua, cogumeloLua, florLua, rochedoMusgo, paredao } from "../../engine/cena-codigo/pecas/floresta-lua"
import { torreCristalAneis } from "../../engine/cena-codigo/pecas/orbital"
import { navio, rochaNeve } from "../../engine/cena-codigo/pecas/gelo"
import { chamineFarol, engrenagemEmPe, tanqueCaldeira } from "../../engine/cena-codigo/pecas/fabrica"
import type { ThemeId } from "./circuit-art"

/** O que o cenário sabe da pista (track-env.ts monta). */
export interface Lugar {
  scene: Scene
  low: boolean
  rand: () => number
  cx: number
  cz: number
  span: number
  gy: number
  /** Ponto sorteado em volta do circuito, longe da pista. */
  scatter(r0: number, r1: number, clear: number, tries?: number): { x: number; z: number; n: { d: number; y: number } } | null
  /** Ponto ao lado da pista. */
  beside(d0: number, d1: number): { x: number; z: number; y: number } | null
  near(x: number, z: number): { d: number; y: number }
  clear(x: number, z: number, r: number, y0: number, y1: number): boolean
  /** Topo e trilho da pista (forja: vigas por cima). */
  t: { n: number; x: Float32Array | number[]; y: Float32Array | number[]; z: Float32Array | number[]; yaw: Float32Array | number[]; flag: Uint8Array | number[]; width: number; bounds: { y1: number } }
}

// ═══════════════ molde e carimbo ═══════════════

/** Peça montada uma vez na origem: corpo + luz acesa, com a caixa que ocupa. */
export interface Molde {
  body: Geo
  glow: Geo
  x0: number
  x1: number
  z0: number
  z1: number
  y0: number
  y1: number
}

function juntar(dst: Geo, src: Geo, tint?: RGB) {
  const base = dst.count
  for (let k = 0; k < src.p.length; k++) dst.p.push(src.p[k])
  for (let k = 0; k < src.n.length; k++) dst.n.push(src.n[k])
  for (let k = 0; k < src.c.length; k += 4) {
    dst.c.push(src.c[k] * (tint ? tint[0] : 1), src.c[k + 1] * (tint ? tint[1] : 1), src.c[k + 2] * (tint ? tint[2] : 1), 1)
  }
  for (let k = 0; k < src.w.length; k++) dst.w.push(src.w[k])
  for (let k = 0; k < src.i.length; k++) dst.i.push(src.i[k] + base)
}

/** Monta a peça `fn` numa cena de rascunho e junta tudo num molde. `tint` multiplica a cor do corpo (noite, tempestade). */
export function molde(fn: (c: Cena) => void, lod = 0, tint?: RGB): Molde {
  const c = new Cena("molde", lod, 32, -16)
  fn(c)
  const body = new Geo(), glow = new Geo()
  for (const g of c.cells.values()) juntar(body, g, tint)
  juntar(body, c.fundo, tint)
  for (const g of c.glows.values()) juntar(glow, g)
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const g of [body, glow])
    for (let k = 0; k < g.p.length; k += 3) {
      const x = g.p[k], y = g.p[k + 1], z = g.p[k + 2]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      if (z < z0) z0 = z
      if (z > z1) z1 = z
    }
  return { body, glow, x0, x1, z0, z1, y0, y1 }
}

/** Largura (maior lado da planta) e altura do molde. */
export const largura = (m: Molde) => Math.max(m.x1 - m.x0, m.z1 - m.z0)
export const altura = (m: Molde) => m.y1 - Math.min(0, m.y0)

function poe(dst: Geo, src: Geo, x: number, y: number, z: number, sx: number, sy: number, sz: number, cs: number, sn: number) {
  const base = dst.count
  for (let k = 0; k < src.p.length; k += 3) {
    const lx = src.p[k] * sx, ly = src.p[k + 1] * sy, lz = src.p[k + 2] * sz
    dst.p.push(x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs)
    let nx = src.n[k] / sx, ny = src.n[k + 1] / sy, nz = src.n[k + 2] / sz
    const l = Math.hypot(nx, ny, nz) || 1
    nx /= l; ny /= l; nz /= l
    dst.n.push(nx * cs + nz * sn, ny, -nx * sn + nz * cs)
  }
  for (let k = 0; k < src.c.length; k++) dst.c.push(src.c[k])
  for (let k = 0; k < src.w.length; k++) dst.w.push(src.w[k])
  for (let k = 0; k < src.i.length; k++) dst.i.push(src.i[k] + base)
}

/**
 * Carimba o molde em (x, y, z) com escala (sx, sy, sz) e giro `yaw`. Vai para o bloco do pé (ou para o pano de
 * fundo com `fundo`); a luz acesa vai para a luz do bloco (continua 1 chamada pelo `fuseGlow`).
 */
export function carimbo(c: Cena, m: Molde, x: number, y: number, z: number, s: number | readonly [number, number, number], yaw = 0, fundo = false) {
  const [sx, sy, sz] = typeof s === "number" ? [s, s, s] : s
  const cs = Math.cos(yaw), sn = Math.sin(yaw)
  poe(fundo ? c.fundo : c.geo(x, z), m.body, x, y, z, sx, sy, sz, cs, sn)
  if (m.glow.count) poe(c.glow(x, z), m.glow, x, y, z, sx, sy, sz, cs, sn)
}

/** Moldes por CLASSE de tamanho (prédios): montados quando aparecem, para a janela não esticar. */
function porClasse(fn: (w: number, h: number) => Molde) {
  const cache = new Map<string, Molde>()
  return (w: number, h: number) => {
    const k = `${w}:${h}`
    let m = cache.get(k)
    if (!m) cache.set(k, (m = fn(w, h)))
    return m
  }
}
const classe = (v: number, passo: number, min: number) => Math.max(min, Math.round(v / passo) * passo)

/** Escolhe um molde da lista pelo sorteio. */
const um = <T>(xs: T[], r: number) => xs[Math.min(xs.length - 1, Math.floor(r * xs.length))]

/** Chão grande (pano de fundo) com manchas de cor por ruído; `cor(x, z, n)` com n = ruído largo 0–1. */
function chao(c: Cena, L: Lugar, cor: (x: number, z: number, n: number, m: number) => RGB, relevo = 0) {
  const S = L.span * 3.5
  ground(c, {
    x0: L.cx - S, z0: L.cz - S, x1: L.cx + S, z1: L.cz + S,
    step: Math.max(24, (S * 2) / (L.low ? 70 : 110)),
    fundo: true,
    y: L.gy,
    height: relevo ? (x, z) => (noise(x / 90, 3.1, z / 90) - 0.5) * relevo : undefined,
    color: (x, z) => cor(x, z, noise(x / 140, 0.7, z / 140), noise(x / 31, 5.3, z / 31)),
  })
}

// ═══════════════ peças próprias da Corrida (kit dos Domínios) ═══════════════

/** PRÉDIO DE TIJOLO À NOITE (Baía): corpo de tijolo com cornija clara, janelas acesas (luz) e apagadas, caixa d'água. */
function predioTijolo(c: Cena, w: number, d: number, h: number, seed: number, lod: number, tijolo: RGB) {
  const bay = lod ? 6 : 3.4, andar = lod ? 7 : 3.8
  const g = c.geo(0, 0), G = c.glow(0, 0)
  const F = caixa(g, { x: 0, z: 0, y0: 0, y1: h, w, d, side: tijolo, top: mul(tijolo, 0.7), ao: 0.6 })
  caixa(g, { x: 0, z: 0, y0: h, y1: h + 0.8, w: w + 0.6, d: d + 0.6, side: mix(tijolo, [0.75, 0.62, 0.5], 0.45), top: mul(tijolo, 0.6) })
  for (const t of [0.34, 0.67]) caixa(g, { x: 0, z: 0, y0: h * t, y1: h * t + 0.45, w: w + 0.3, d: d + 0.3, side: mix(tijolo, [0.7, 0.58, 0.46], 0.35) })
  const nf = Math.max(2, Math.round(h / andar))
  for (let s = 0; s < 4; s++) {
    const len = s % 2 ? d : w
    const nb = Math.max(1, Math.round(len / bay))
    // só a janela ACESA vira malha (a apagada é o tijolo escuro da noite)
    paineis(G, F, s, w, d, 1.2, h - 0.8, nb, nf, (i, j) => {
      if (rnd(i + s * 13, j, seed) >= (lod ? 0.26 : 0.34)) return null
      const k = rnd(i, j + s * 7, seed + 3)
      return k < 0.7 ? [[1, 0.62, 0.26], [1, 0.82, 0.48]] : k < 0.9 ? [[0.95, 0.8, 0.55], [1, 0.95, 0.78]] : [[0.4, 0.7, 1], [0.7, 0.9, 1]]
    }, lod ? 1.1 : 0.7, 0.06)
  }
  if (rnd(seed, 9) < 0.45) {
    tube(g, [w * 0.2, h + 0.8, d * 0.1], [w * 0.2, h + 3.4, d * 0.1], 1.2, 1.2, 6, () => mul(tijolo, 0.6), true)
    tube(g, [w * 0.2, h + 3.4, d * 0.1], [w * 0.2, h + 4.6, d * 0.1], 1.4, 0.2, 6, () => [0.12, 0.08, 0.07], true)
  }
}

/** TORRE DE VIDRO DE DIA (Neon): moldura de aço, painéis de vidro que clareiam no alto, faixas de telão acesas e coroa. */
function torreVidro(c: Cena, w: number, d: number, h: number, seed: number, lod: number, holo: RGB) {
  const g = c.geo(0, 0), G = c.glow(0, 0)
  const AÇO: RGB = [0.36, 0.4, 0.48]
  const F = caixa(g, { x: 0, z: 0, y0: 0, y1: h, w, d, side: AÇO, top: [0.5, 0.54, 0.6], ao: 0.7 })
  // perto: andar a andar (7 m); longe: faixas de 28 m (o vidro corrido que a névoa já embaça)
  const nf = Math.max(3, Math.round(h / (lod ? 28 : 7)))
  for (let s = 0; s < 4; s++) {
    const len = s % 2 ? d : w
    const nb = Math.max(2, Math.round(len / (lod ? 10 : 6)))
    paineis(g, F, s, w, d, 2.5, h - 1, nb, nf, (i, j) => {
      const up = j / Math.max(1, nf - 1), v = 0.86 + 0.28 * rnd(i + s * 31, j, seed)
      return [mul(mix([0.16, 0.24, 0.36], [0.5, 0.66, 0.84], up * 0.5), v), mul(mix([0.3, 0.42, 0.58], [0.78, 0.9, 1], 0.4 + up * 0.6), v)]
    }, lod ? 0.35 : 0.22)
  }
  // faixa de telão acesa numa face (o "holo" da referência), e um anel claro no alto
  const S = sideOf(rnd(seed, 4) < 0.5 ? 0 : 2, w, d)
  const ya = h * (0.35 + rnd(seed, 5) * 0.3), yb = ya + Math.min(h * 0.18, w * 0.9)
  const a = S.at(0.12, 0.25), b = S.at(0.88, 0.25)
  face(G, [F.P(a[0], a[1], ya), F.P(b[0], b[1], ya), F.P(b[0], b[1], yb), F.P(a[0], a[1], yb)], [mul(holo, 0.55), mul(holo, 0.55), holo, holo], F.N(S.n[0], S.n[1]))
  caixa(g, { x: 0, z: 0, y0: h, y1: h + 1.2, w: w * 0.8, d: d * 0.8, side: [0.62, 0.66, 0.72] })
  caixa(G, { x: 0, z: 0, y0: h + 1.2, y1: h + 1.6, w: w * 0.84, d: d * 0.84, side: [0.35, 0.92, 1], top: [0.7, 1, 1] })
  if (rnd(seed, 7) < 0.4) tube(g, [0, h + 1.6, 0], [0, h + 1.6 + w * 0.9, 0], w * 0.05, w * 0.02, 5, () => [0.7, 0.72, 0.78], true)
}

/** PASSARELA (Neon): viga de aço com corrimão e o fio aceso por baixo. Comprida em z (1 m), carimbada pelo comprimento. */
function passarelaNeon(c: Cena) {
  const g = c.geo(0, 0), G = c.glow(0, 0)
  caixa(g, { x: 0, z: 0, y0: -1.2, y1: 0, w: 6, d: 1, side: [0.46, 0.5, 0.58], top: [0.62, 0.66, 0.72] })
  for (const s of [-1, 1]) caixa(g, { x: s * 2.85, z: 0, y0: 0, y1: 1.1, w: 0.25, d: 1, side: [0.7, 0.74, 0.8] })
  caixa(G, { x: 0, z: 0, y0: -1.45, y1: -1.2, w: 1.2, d: 1, side: [0.25, 0.9, 1] })
}

/** PLATAFORMA NO MAR (Tempestade): 4 pernas, convés redondo, faixa de perigo, anel aceso e a torre com farol. */
function plataforma(c: Cena, lod: number, pernas = true) {
  const g = c.geo(0, 0), G = c.glow(0, 0)
  const AÇO: RGB = [0.34, 0.36, 0.38], AÇO_CL: RGB = [0.5, 0.52, 0.54]
  const n = lod ? 10 : 18
  if (pernas) for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    tube(g, [ox * 6, -6, oz * 6], [ox * 5.4, 9, oz * 5.4], 0.9, 0.75, 6, (k) => (k % 2 ? AÇO : AÇO_CL), false)
    if (!lod) tube(g, [ox * 6, 1, oz * 6], [-ox * 5.4, 6, oz * 5.4], 0.25, 0.25, 4, () => AÇO, false)
  }
  tube(g, [0, 9, 0], [0, 10.4, 0], 10, 10, n, (k) => (k % 2 ? AÇO : AÇO_CL), true)
  // faixa de perigo amarelo/preto na borda do convés
  for (let k = 0; k < n * 2; k++) {
    const a0 = (k / (n * 2)) * Math.PI * 2, a1 = ((k + 1) / (n * 2)) * Math.PI * 2
    const P = (a: number, y: number, r = 10.05): V3 => [Math.cos(a) * r, y, Math.sin(a) * r]
    face(g, [P(a0, 10.4), P(a1, 10.4), P(a1, 10.9), P(a0, 10.9)], k % 2 ? [0.9, 0.62, 0.08] : [0.04, 0.04, 0.05], [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)])
  }
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
    const P = (a: number, y: number): V3 => [Math.cos(a) * 10.3, y, Math.sin(a) * 10.3]
    face(G, [P(a0, 11), P(a1, 11), P(a1, 11.35), P(a0, 11.35)], [0.25, 0.9, 1], [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)])
  }
  caixa(g, { x: 3, z: 0, y0: 10.4, y1: 24, w: 2.6, d: 2.6, side: AÇO, top: AÇO_CL })
  caixa(g, { x: -3.5, z: -2, y0: 10.4, y1: 14.5, w: 6, d: 4.5, side: [0.62, 0.64, 0.66], top: [0.4, 0.42, 0.44] })
  caixa(G, { x: 3, z: 0, y0: 24, y1: 25.5, w: 1.8, d: 1.8, side: [1, 0.35, 0.2] })
  // heliponto
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2
    face(g, [[-3.5, 14.55, -2], [-3.5 + Math.cos(a0) * 2, 14.55, -2 + Math.sin(a0) * 2], [-3.5 + Math.cos(a1) * 2, 14.55, -2 + Math.sin(a1) * 2]], k % 2 ? [0.9, 0.9, 0.86] : [0.8, 0.8, 0.76], [0, 1, 0])
  }
}

/** COLUNA DA FORJA: pilar de chapas com quinas claras, rebites em faixa, FENDAS acesas nas duas faces e a base escurecida. Planta 1 × 1, altura 1. */
function colunaForja(c: Cena, seed: number, lod: number) {
  const g = c.geo(0, 0), G = c.glow(0, 0)
  const CHAPA: RGB = [0.32, 0.31, 0.33], CHAPA_CL: RGB = [0.52, 0.48, 0.46], FERRUGEM: RGB = [0.36, 0.18, 0.09]
  // em módulos verticais (cada módulo é um degrau com a borda clara)
  const mods = lod ? 4 : 8
  for (let k = 0; k < mods; k++) {
    const y0 = k / mods, y1 = (k + 1) / mods
    const w = 1 - (k % 2) * 0.04
    const side: RGB = k === 0 ? mul(CHAPA, 0.55) : mix(CHAPA, FERRUGEM, rnd(seed, k) * 0.35)
    caixa(g, { x: 0, z: 0, y0, y1: y1 - 0.004, w, d: w, side, top: CHAPA_CL })
    caixa(g, { x: 0, z: 0, y0: y1 - 0.004, y1, w: w + 0.03, d: w + 0.03, side: CHAPA_CL })
  }
  // fendas acesas: duas faces opostas, em faixas
  for (const s of [-1, 1])
    for (let k = 0; k < (lod ? 1 : 3); k++) {
      const u = lod ? 0 : (k - 1) * 0.22
      const ya = 0.1 + rnd(seed, k, s) * 0.05, yb = 0.84 - rnd(seed, k, s + 3) * 0.1
      const zz = s * 0.512
      face(G, [[u - 0.035, ya, zz], [u + 0.035, ya, zz], [u + 0.035, yb, zz], [u - 0.035, yb, zz]], [[1, 0.36, 0.06], [1, 0.36, 0.06], [1, 0.78, 0.3], [1, 0.78, 0.3]], [0, 0, s])
    }
}

/** VIGA DA FORJA (por cima da pista): perfil I de aço com rebites, faixa de perigo e a luminária acesa embaixo. Comprida em x (1 m). */
function vigaForja(c: Cena) {
  const g = c.geo(0, 0), G = c.glow(0, 0)
  const AÇO: RGB = [0.26, 0.26, 0.3], AÇO_CL: RGB = [0.42, 0.42, 0.46]
  caixa(g, { x: 0, z: 0, y0: 0, y1: 0.6, w: 1, d: 5, side: AÇO, top: AÇO_CL })
  caixa(g, { x: 0, z: 0, y0: 0.6, y1: 3.4, w: 1, d: 1.2, side: AÇO })
  caixa(g, { x: 0, z: 0, y0: 3.4, y1: 4, w: 1, d: 5, side: AÇO, top: [0.86, 0.6, 0.1] })
  caixa(G, { x: 0, z: 0, y0: -0.4, y1: 0, w: 0.21, d: 1.4, side: [1, 0.72, 0.32] })
}

/** ANEL do tubo de vidro (Forja): aro de 12 gomos em chapa com rebites claros. Raio 1, no plano xy. */
function aroTubo(c: Cena) {
  const g = c.geo(0, 0)
  const n = 14
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
    const P = (a: number, r: number, z: number): V3 => [Math.cos(a) * r, Math.sin(a) * r, z]
    const col: RGB = k % 2 ? [0.3, 0.3, 0.34] : [0.42, 0.4, 0.44]
    for (const [r0, r1, nz] of [[1, 1.12, 0]] as const) {
      face(g, [P(a0, r1, -0.12), P(a1, r1, -0.12), P(a1, r1, 0.12), P(a0, r1, 0.12)], col, [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), nz])
      face(g, [P(a0, r0, -0.12), P(a1, r0, -0.12), P(a1, r1, -0.12), P(a0, r1, -0.12)], mul(col, 0.8), [0, 0, -1])
      face(g, [P(a0, r0, 0.12), P(a1, r0, 0.12), P(a1, r1, 0.12), P(a0, r1, 0.12)], mul(col, 0.8), [0, 0, 1])
    }
  }
}

// ═══════════════ os temas ═══════════════

type Saida = { meshes: Mesh[]; dispose: () => void }

function fechar(L: Lugar, c: Cena, o: { grime?: number } = {}): Saida {
  const { meshes, material, glowMaterial } = finishCena(L.scene, c, { grime: o.grime ?? 0.2 })
  for (const m of meshes) {
    m.freezeWorldMatrix()
    m.doNotSyncBoundingInfo = true
  }
  return {
    meshes,
    dispose: () => {
      const mats = new Set([material, glowMaterial])
      for (const m of meshes) {
        if (m.material) mats.add(m.material as typeof material)
        m.dispose(false, false)
      }
      for (const mt of mats) mt.dispose()
    },
  }
}

const novaCena = (L: Lugar, nome: string) => new Cena(`corrida-${nome}`, L.low ? 1 : 0, Math.max(300, Math.round(L.span * 0.55)), 0)

/** BAÍA: prédios de tijolo com janelas acesas, chaminés-farol, morros escuros ao longe. */
function baia(L: Lugar, tooClose: (x: number, z: number, r: number) => boolean): Saida {
  const c = novaCena(L, "baia")
  const { rand, span, cx, cz, gy, low } = L
  const TIJ: RGB[] = [[0.42, 0.22, 0.17], [0.5, 0.28, 0.2], [0.34, 0.24, 0.2], [0.55, 0.36, 0.26], [0.4, 0.3, 0.26]]
  const lod = low ? 1 : 0
  const perto = porClasse((w, h) => molde((cc) => predioTijolo(cc, w, w * 0.85, h, w * 3 + h, lod, TIJ[(w + h) % 5]), lod))
  const longe = porClasse((w, h) => molde((cc) => predioTijolo(cc, w, w * 0.85, h, w * 5 + h, 1, TIJ[(w * 3 + h) % 5]), 1))
  const chamine = molde((cc) => chamineFarol(cc, 0, 0, 18, 1.5, 1, false), 1, [0.6, 0.5, 0.5])
  const want = low ? 120 : 230
  for (let k = 0, tries = 0; k < want && tries < want * 6; tries++) {
    const x = cx + (rand() - 0.5) * span * 2.2
    const z = cz + (rand() - 0.5) * span * 2.2
    const w = 10 + rand() * 18
    if (tooClose(x, z, w + 16)) continue
    const inside = Math.abs(x - cx) < span * 0.6 && Math.abs(z - cz) < span * 0.6
    const h = (inside ? 30 : 50) + rand() * (inside ? 70 : 150)
    const wc = classe(w, 8, 12), hc = classe(h, 25, 25)
    const m = (inside && !low ? perto : longe)(wc, hc)
    carimbo(c, m, x, gy, z, [w / wc, h / hc, (w / wc) * (0.75 + rand() * 0.4)], rand() * Math.PI)
    if (rand() < 0.22) carimbo(c, chamine, x + (rand() - 0.5) * w * 0.4, gy + h, z + (rand() - 0.5) * w * 0.4, 0.6 + rand() * 0.6, rand() * 6)
    k++
  }
  // morros escuros ao longe (penhasco do Cânion tingido de noite), no pano de fundo
  const morro = [1, 2, 3].map((s) => molde((cc) => penhasco(cc, 0, 0, 12, 9, 10, s * 13, 1, true, false), 1, [0.16, 0.13, 0.15]))
  for (let k = 0; k < 14; k++) {
    const ang = (k / 14) * Math.PI * 2 + rand() * 0.3
    const r = span * (1.5 + rand() * 0.6)
    const size = 160 + rand() * 260
    const m = um(morro, rand())
    carimbo(c, m, cx + Math.sin(ang) * r, gy, cz + Math.cos(ang) * r, [size / largura(m), (size * (0.45 + rand() * 0.35)) / altura(m), size / largura(m)], rand() * 6, true)
  }
  return fechar(L, c, { grime: 0.3 })
}

/** ABISMO: chão de areia vermelha, penhascos em andares, agulhas de blocos, paredões e arcos do Cânion, pedras e arbustos amarelos no pé. */
function abismo(L: Lugar): Saida {
  const c = novaCena(L, "abismo")
  const { rand, gy, low, span, cx, cz, t } = L
  const lod = low ? 1 : 0
  chao(c, L, (_x, _z, n, m) => {
    const a: RGB = [0.66, 0.33, 0.22], b: RGB = [0.8, 0.46, 0.3], cr: RGB = [0.86, 0.66, 0.48]
    let col = mix(a, b, n)
    if (m > 0.66) col = mix(col, cr, (m - 0.66) * 1.6)
    if (n < 0.3) col = mix(col, [0.6, 0.6, 0.24], (0.3 - n) * 1.2)
    return col
  }, 6)
  // a luz do Cânion é de tempestade; o sol da Corrida é cheio: o arenito sobe um pouco e esquenta
  const SOL: RGB = [1.14, 1.06, 1]
  const mesas = [1, 2, 3].map((s) => molde((cc) => penhasco(cc, 0, 0, 10, 8 + s, 14, s * 17, lod, true, false), lod, SOL))
  const mesasLonge = [1, 2].map((s) => molde((cc) => penhasco(cc, 0, 0, 10, 9, 14, s * 29, 1, s === 1, false), 1, SOL))
  const agulhas = [1, 2].map((s) => molde((cc) => agulhaBlocos(cc, 0, 0, 30, s * 11, lod, false), lod, SOL))
  const pedras = [1, 2, 3].map((s) => molde((cc) => rochaVermelha(cc, 0, 0, 2, 0, s * 7, lod, false), lod))
  const arbusto = molde((cc) => arbustoAmarelo(cc, 0, 0, 2, 5, 1), 1)
  for (let k = 0; k < (low ? 40 : 85); k++) {
    const r = 18 + rand() * 70
    const p = L.scatter(0.08, 1.3, r + 18)
    if (!p) continue
    const top = p.n.y + (rand() < 0.45 ? -12 - rand() * 50 : 8 + rand() * 60)
    const far = Math.hypot(p.x - cx, p.z - cz) > span * 0.9
    const m = um(far || low ? mesasLonge : mesas, rand())
    const s = (r * 2) / largura(m)
    carimbo(c, m, p.x, gy, p.z, [s, (top - gy) / altura(m), s * (0.7 + rand() * 0.6)], rand() * 6)
    // pé da mesa: pedras soltas e um arbusto (só perto)
    if (!low && !far)
      for (let j = 0; j < 3; j++) {
        const a = rand() * Math.PI * 2, rr = r * (1.05 + rand() * 0.3)
        carimbo(c, um(pedras, rand()), p.x + Math.cos(a) * rr, gy, p.z + Math.sin(a) * rr, 3 + rand() * 5, rand() * 6)
        if (j === 0) carimbo(c, arbusto, p.x + Math.cos(a + 0.4) * rr, gy, p.z + Math.sin(a + 0.4) * rr, 4 + rand() * 3, rand() * 6)
      }
  }
  for (let k = 0; k < (low ? 22 : 50); k++) {
    const r = 4 + rand() * 9
    const p = L.scatter(0.05, 1.1, r + 14)
    if (!p) continue
    const m = um(agulhas, rand())
    const hh = p.n.y + 20 + rand() * 70 - gy
    const s = (r * 2) / largura(m)
    carimbo(c, m, p.x, gy, p.z, [s, hh / altura(m), s], rand() * 6)
  }
  // paredões do cânion no horizonte (pano de fundo)
  const hTop = t.bounds.y1 - gy
  const parede = [1, 2].map((s) => molde((cc) => penhasco(cc, 0, 0, 24, 9, 14, s * 41, 1, true, false), 1))
  for (let k = 0; k < 30; k++) {
    const a = (k / 30) * Math.PI * 2 + rand() * 0.15
    const R = span * (1.3 + rand() * 0.35)
    const m = um(parede, rand())
    const W = 220 + rand() * 260
    carimbo(c, m, cx + Math.sin(a) * R, gy, cz + Math.cos(a) * R, [W / (m.x1 - m.x0), (hTop + 30 + rand() * 140) / altura(m), 140 / (m.z1 - m.z0)], a + Math.PI / 2, true)
  }
  // arcos naturais (o marco da referência), meio enterrados
  const arco = molde((cc) => arcoNatural(cc, 0, 0, 0, 10, 7, lod), lod)
  for (let k = 0; k < 5; k++) {
    const sz = 130 + rand() * 120
    const p = L.scatter(0.55, 1.2, sz * 0.6)
    if (!p) continue
    carimbo(c, arco, p.x, gy - sz * 0.04, p.z, sz / largura(arco), rand() * 6)
  }
  return fechar(L, c)
}

/** FLORESTA: chão de musgo, árvores da Lua gigantes, cogumelos acesos, flores, rochedos com musgo e paredões das cachoeiras. */
function floresta(L: Lugar): { saida: Saida; quedas: { x: number; z: number; yaw: number; top: number }[] } {
  const c = novaCena(L, "floresta")
  const { rand, gy, low } = L
  const lod = low ? 1 : 0
  chao(c, L, (_x, _z, n, m) => {
    let col = mix([0.05, 0.16, 0.14], [0.1, 0.28, 0.22], n)
    if (m > 0.7) col = mix(col, [0.16, 0.38, 0.4], (m - 0.7) * 2)
    return col
  }, 5)
  const arvores = [1, 2, 3].map((s) => molde((cc) => arvoreLua(cc, 0, 0, 12, s * 5, lod, s === 3 ? COPA_FUNDO : COPA, !low), lod))
  const arvoresLonge = [1, 2].map((s) => molde((cc) => arvoreLua(cc, 0, 0, 12, s * 9, 1, COPA_FUNDO, false), 1))
  const cogumelos = [1, 2].map((s) => molde((cc) => cogumeloLua(cc, 0, 0, 1.6, s * 3, lod), lod))
  const flor = molde((cc) => florLua(cc, 0, 0, 1, 4, lod, 3), lod)
  const rochedo = [1, 2].map((s) => molde((cc) => rochedoMusgo(cc, 0, 0, 4, 2.4, s * 7, lod, false), lod))
  const tree = (x: number, z: number, y: number, r: number, nearTrack: boolean) => {
    const m = um(nearTrack && !low ? arvores : arvoresLonge, rand())
    // a copa do molde ocupa ~largura/2 de raio; a escala sai da altura (como antes: topo 30–90 m acima da pista)
    let top = y + 30 + rand() * 60
    let s = (top - gy) / altura(m)
    let R = (largura(m) / 2) * s * 0.72
    const cy = (k: number) => gy + altura(m) * k * s
    for (let k = 0; k < 3 && !L.clear(x, z, R + 6, cy(0.35) - 10, top + 6); k++) {
      top -= 16
      s = (top - gy) / altura(m)
      R = (largura(m) / 2) * s * 0.72
    }
    if (!L.clear(x, z, R + 6, cy(0.35) - 10, top + 6) || top - gy < 20) return
    carimbo(c, m, x, gy, z, [s * 0.72, s, s * 0.72], rand() * 6)
    if (!nearTrack) return
    // cogumelos acesos agarrados no tronco, na altura da pista (o brilho ciano/violeta da referência)
    const rt = largura(m) * 0.07 * s
    for (let k = 0; k < 3; k++) {
      const a = rand() * Math.PI * 2
      carimbo(c, um(cogumelos, rand()), x + Math.sin(a) * rt, y - 6 + rand() * 14, z + Math.cos(a) * rt, 2.2 + rand() * 2.2, a)
    }
    carimbo(c, um(cogumelos, rand()), x + r * 1.6, gy, z, 3 + rand() * 3, rand() * 6)
    if (!low) {
      const a = rand() * Math.PI * 2
      carimbo(c, flor, x + Math.sin(a) * r * 2, gy, z + Math.cos(a) * r * 2, 3 + rand() * 2, a)
    }
  }
  for (let k = 0; k < (low ? 36 : 70); k++) {
    const r = 3 + rand() * 5
    const p = L.beside(r + 6, r + 80)
    if (p) tree(p.x, p.z, p.y, r, true)
  }
  for (let k = 0; k < (low ? 30 : 60); k++) {
    const r = 4 + rand() * 6
    const p = L.scatter(0.2, 1.4, r + 30)
    if (p) tree(p.x, p.z, p.n.y, r, false)
  }
  // cogumelos gigantes acesos no meio do circuito
  for (let k = 0; k < (low ? 18 : 40); k++) {
    const p = L.scatter(0.02, 0.9, 16)
    if (!p) continue
    const m = um(cogumelos, rand())
    const h = Math.max(8, Math.min(p.n.y - gy - 4, 10 + rand() * 30))
    const s = h / altura(m)
    const R = (largura(m) / 2) * s
    if (!L.clear(p.x, p.z, R + 4, gy, gy + h + 4)) continue
    carimbo(c, m, p.x, gy, p.z, s, rand() * 6)
  }
  for (let k = 0; k < (low ? 10 : 24); k++) {
    const p = L.scatter(0.1, 1.2, 30)
    if (p) carimbo(c, um(rochedo, rand()), p.x, gy, p.z, 3 + rand() * 4, rand() * 6)
  }
  // paredões das cachoeiras: o lugar sai daqui e o véu de água (efeito) fica no track-env
  const muro = molde((cc) => paredao(cc, 0, 0, 10, 5, 12, 3, lod, 79), lod)
  const quedas: { x: number; z: number; yaw: number; top: number }[] = []
  for (let k = 0; k < 5; k++) {
    const p = L.scatter(0.25, 0.85, 50)
    if (!p) continue
    const top = p.n.y + 28 + rand() * 30
    const yaw = Math.atan2(L.cx - p.x, L.cz - p.z)
    carimbo(c, muro, p.x, gy, p.z, [46 / (muro.x1 - muro.x0), (top - gy) / altura(muro), 22 / (muro.z1 - muro.z0)], yaw)
    quedas.push({ x: p.x, z: p.z, yaw, top })
  }
  return { saida: fechar(L, c, { grime: 0.15 }), quedas }
}

/** NEON: chão de placas claras, torres de vidro com telões, torres de cristal da Orbital, passarelas acesas. */
function neon(L: Lugar): Saida {
  const c = novaCena(L, "neon")
  const { rand, gy, low } = L
  const lod = low ? 1 : 0
  chao(c, L, (x, z, n) => {
    const lin = Math.abs(((x / 64) % 1 + 1) % 1 - 0.5) > 0.47 || Math.abs(((z / 64) % 1 + 1) % 1 - 0.5) > 0.47
    return lin ? [0.5, 0.54, 0.6] : mix([0.3, 0.33, 0.38], [0.4, 0.43, 0.48], n)
  })
  const HOLO: RGB[] = [[1, 0.3, 0.85], [0.3, 0.85, 1], [0.65, 0.4, 1], [1, 0.55, 0.3]]
  const torresPerto = porClasse((w, h) => molde((cc) => torreVidro(cc, w, w * 0.8, h, w + h, lod, HOLO[Math.round(w / 10 + h / 40) % 4]), lod))
  const torresLonge = porClasse((w, h) => molde((cc) => torreVidro(cc, w, w * 0.8, h, w * 3 + h, 1, HOLO[Math.round(w / 10 + h / 40) % 4]), 1))
  const cristal = [7, 11].map((s) => molde((cc) => torreCristalAneis(cc, 0, 0, 40, s, lod), lod))
  const ponte = molde(passarelaNeon, 0)
  const towers: { x: number; z: number; w: number; top: number }[] = []
  for (let k = 0; k < (low ? 110 : 220); k++) {
    const w = 18 + rand() * 32
    const p = L.scatter(0.04, 1.5, w * 0.75 + 20)
    if (!p) continue
    const top = Math.max(p.n.y + 30, gy + 80) + rand() * 260
    const yaw = rand() * Math.PI
    if (rand() < 0.14 && top - gy < 170) {
      // torre de cristal da Orbital (o anel aceso da referência)
      const m = um(cristal, rand())
      const s = (top - gy) / altura(m)
      if (L.clear(p.x, p.z, (largura(m) / 2) * s + 4, gy, top)) {
        carimbo(c, m, p.x, gy, p.z, s, yaw)
        towers.push({ x: p.x, z: p.z, w, top })
        continue
      }
    }
    const wc = classe(w, 10, 20), hc = classe(top - gy, 40, 80)
    const m = (p.n.d < 170 && !low ? torresPerto : torresLonge)(wc, hc)
    carimbo(c, m, p.x, gy, p.z, [w / wc, (top - gy) / hc, (w / wc) * (0.8 + rand() * 0.35)], yaw)
    towers.push({ x: p.x, z: p.z, w, top })
  }
  let made = 0
  for (let a = 0; a < towers.length && made < (low ? 14 : 30); a++) {
    const A = towers[a]
    const B = towers.find((b) => b !== A && Math.hypot(b.x - A.x, b.z - A.z) < 140 && Math.hypot(b.x - A.x, b.z - A.z) > 50)
    if (!B) continue
    const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2
    if (L.near(mx, mz).d < 28) continue
    const y = Math.min(A.top, B.top) - 20 - rand() * 60
    const len = Math.hypot(B.x - A.x, B.z - A.z)
    carimbo(c, ponte, mx, y, mz, [1, 1, len], Math.atan2(B.x - A.x, B.z - A.z))
    made++
  }
  return fechar(L, c, { grime: 0.12 })
}

/** TEMPESTADE: rochas do Mar de Gelo (sem neve) saindo do mar, plataformas e o navio encalhado. */
function tempestade(L: Lugar): Saida {
  const c = novaCena(L, "tempestade")
  const { rand, gy, low } = L
  const lod = low ? 1 : 0
  // a ardósia azul do Mar de Gelo vira pedra molhada cinza (o mar da tempestade é verde-azulado)
  const TOM: RGB = [1.5, 1.32, 0.86]
  const rochas = [1, 2, 3].map((s) => molde((cc) => rochaNeve(cc, 0, 0, 3, s * 5, lod, false, s === 2), lod, TOM))
  for (let k = 0; k < (low ? 16 : 32); k++) {
    const r = 10 + rand() * 30
    const p = L.scatter(0.1, 1.3, r + 20)
    if (!p) continue
    const m = um(rochas, rand())
    const s = (r * 2) / largura(m)
    carimbo(c, m, p.x, gy - 4, p.z, [s, (25 + rand() * 80) / altura(m), s * (0.6 + rand() * 0.6)], rand() * 6)
  }
  const plat = molde((cc) => plataforma(cc, lod), lod)
  for (let k = 0; k < 7; k++) {
    const sz = 40 + rand() * 30
    const p = L.scatter(0.15, 1.0, sz * 0.7 + 25)
    if (!p) continue
    const s = sz / 20
    carimbo(c, plat, p.x, gy + (14 + rand() * 16) - 9 * s, p.z, s, rand() * 6)
  }
  // plataformas no ar (as de antes): só convés + torre
  const platAr = molde((cc) => plataforma(cc, lod, false), lod)
  for (let k = 0; k < 5; k++) {
    const sz = 30 + rand() * 25
    const p = L.scatter(0.3, 1.1, sz + 30)
    if (!p) continue
    const s = sz / 20
    const fy = p.n.y + 30 + rand() * 50
    if (!L.clear(p.x, p.z, sz * 0.6, fy - 4, fy + 30 * s)) continue
    carimbo(c, platAr, p.x, fy - 9 * s, p.z, s, rand() * 6)
  }
  const barco = molde((cc) => navio(cc, 0, 0, 0, 22, { adorna: 0.25, empina: 0.12, quebrado: true, seed: 4 }, lod), lod, [0.8, 0.8, 0.82])
  for (let k = 0; k < 2; k++) {
    const p = L.scatter(0.5, 1.15, 70)
    if (p) carimbo(c, barco, p.x, gy - 2, p.z, 3.2, rand() * 6)
  }
  return fechar(L, c, { grime: 0.3 })
}

/** FORJA: colunas de chapa com fendas acesas, engrenagens e caldeiras da Fábrica, vigas por cima da pista e os aros do tubo. */
function forja(L: Lugar, tubos: { path: V3[] }[]): Saida {
  const c = novaCena(L, "forja")
  const { rand, gy, low, t } = L
  const lod = low ? 1 : 0
  const colunas = [1, 2, 3].map((s) => molde((cc) => colunaForja(cc, s * 7, lod), lod))
  const hTop = t.bounds.y1
  for (let k = 0; k < (low ? 26 : 55); k++) {
    const w = 16 + rand() * 26
    const p = L.scatter(0.03, 1.25, w * 0.75 + 16)
    if (!p) continue
    const top = hTop + 40 + rand() * 140
    carimbo(c, um(colunas, rand()), p.x, gy, p.z, [w, top - gy, w], rand() * Math.PI)
  }
  // engrenagens gigantes em pé e caldeiras (a "máquina" da referência), longe da pista
  const roda = [1, 2].map((s) => molde((cc) => engrenagemEmPe(cc, 0, 6, 0, 6, 0, lod, 0.8, { dentes: 12 + s * 4, raios: 4 + s }), lod, [0.7, 0.66, 0.66]))
  for (let k = 0; k < (low ? 5 : 10); k++) {
    const R = 30 + rand() * 40
    const p = L.scatter(0.3, 1.2, R + 20)
    if (!p) continue
    if (!L.clear(p.x, p.z, R + 6, gy, gy + R * 2.2)) continue
    const m = um(roda, rand())
    carimbo(c, m, p.x, gy - R * 0.3, p.z, (R * 2) / altura(m), rand() * 6)
  }
  const caldeira = molde((cc) => tanqueCaldeira(cc, 0, 0, 2, lod), lod, [0.75, 0.7, 0.7])
  for (let k = 0; k < (low ? 4 : 8); k++) {
    const p = L.scatter(0.2, 1.1, 50)
    if (p && L.clear(p.x, p.z, 40, gy, gy + 50)) carimbo(c, caldeira, p.x, gy, p.z, 7 + rand() * 4, rand() * 6)
  }
  const viga = molde(vigaForja, 0)
  const every = Math.max(1, Math.floor(t.n / (low ? 14 : 28)))
  for (let i = 0; i < t.n; i += every) {
    if (t.flag[i] === 3 || t.flag[(i + 10) % t.n] === 3) continue
    const y = t.y[i] + 24 + rand() * 18
    carimbo(c, viga, t.x[i], y, t.z[i], [140, 1, 1], t.yaw[i] + Math.PI / 2)
  }
  const aro = molde(aroTubo, 0)
  for (const tb of tubos)
    for (let k = 0; k < tb.path.length - 1; k += 3) {
      const a = tb.path[k], b = tb.path[k + 1]
      carimbo(c, aro, a[0], a[1], a[2], 3.6, Math.atan2(b[0] - a[0], b[2] - a[2]))
    }
  return fechar(L, c, { grime: 0.35 })
}

export const CENARIO = { baia, abismo, floresta, neon, tempestade, forja } as const
export type CenarioId = ThemeId
