// features/meu-mundo/engine/cena-codigo/pecas/orbital.ts — PEÇAS COPIADAS da Cidade Orbital (cópia
// minuciosa, skill meu-mundo-cenario-codigo `copia.md`). Cada função copia UM elemento do inventário
// `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/orbital.json` (recorte, contagem e medidas da
// ficha). Paleta tirada dos recortes por `recorte.py` (valores lidos e ajustados à luz do jogo).
//
// Contrato: (c, x, z, ang, …, lod). A FRENTE da peça olha para (sin ang, cos ang); `u` = para a direita
// de quem olha a frente, `v` = para a frente, `y` = para cima. Cada peça põe as próprias caixas.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { blob, face, mix, mul, rnd, tube, type Foliage } from "../kit-natureza"

// ── paleta (recortes do inventário) ──
export const MARMORE: RGB = [0.97, 0.95, 0.92]
export const MARMORE_SOMBRA: RGB = [0.78, 0.8, 0.86]
export const MARMORE_ESC: RGB = [0.62, 0.64, 0.72]
export const OURO: RGB = [0.96, 0.76, 0.36]
export const OURO_ESC: RGB = [0.7, 0.5, 0.22]
export const VITRINE: RGB = [1, 0.84, 0.48]
export const VITRINE_FUNDO: RGB = [0.98, 0.7, 0.32]
export const MERCADORIA: RGB = [0.72, 0.46, 0.22]
export const AZUL_TOLDO: RGB = [0.24, 0.46, 0.9]
export const ROSA_TOLDO: RGB = [0.9, 0.36, 0.6]
export const BRANCO: RGB = [1, 1, 1]
export const MADEIRA: RGB = [0.5, 0.32, 0.2]
export const CRISTAL_ROSA: RGB = [1, 0.46, 0.8]
export const CRISTAL_ROSA_CL: RGB = [1, 0.82, 0.95]
export const CRISTAL_AZUL: RGB = [0.3, 0.72, 1]
export const CRISTAL_CIANO: RGB = [0.5, 0.94, 1]
export const CRISTAL_LILAS: RGB = [0.78, 0.6, 1]
export const VERDE_LIMAO: Foliage = { dark: [0.3, 0.52, 0.12], mid: [0.56, 0.78, 0.18], hi: [0.86, 0.94, 0.38] }
export const TERRA: RGB = [0.36, 0.42, 0.16]

/** Quadro local da peça: ponto (u, v, y) → mundo, e a normal local → mundo. */
function quadro(x: number, z: number, ang: number) {
  // Babylon é mão ESQUERDA: a direita de quem OLHA a frente (de fora, virado para −f) é (−cos, +sin)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = -Math.cos(ang), sz = Math.sin(ang)
  return {
    P: (u: number, v: number, y: number): V3 => [x + sx * u + fx * v, y, z + sz * u + fz * v],
    N: (nu: number, nv: number, ny = 0): V3 => [sx * nu + fx * nv, ny, sz * nu + fz * nv],
    rot: -ang,
    fx, fz, sx, sz,
  }
}

/** Retângulo de pé na fachada (plano v = cte), de (u0, y0) a (u1, y1), virado para a frente. */
function painel(g: ReturnType<Cena["geo"]>, Q: ReturnType<typeof quadro>, u0: number, u1: number, y0: number, y1: number, v: number, cor: RGB | RGB[]) {
  face(g, [Q.P(u0, v, y0), Q.P(u1, v, y0), Q.P(u1, v, y1), Q.P(u0, v, y1)], cor, Q.N(0, 1))
}

/** Caixa no quadro local (centro u, v; de y0 a y1). */
function bloco(g: ReturnType<Cena["geo"]>, Q: ReturnType<typeof quadro>, u: number, v: number, w: number, d: number, y0: number, y1: number, side: RGB, top?: RGB) {
  const p = Q.P(u, v, 0)
  caixa(g, { x: p[0], z: p[2], y0, y1, w, d, rot: Q.rot, side, top: top ?? mul(side, 1.08) })
}

/** Contorno de arco GÓTICO equilátero (lados retos + dois arcos de raio = vão que se cruzam na ponta),
 *  aumentado de `e` para fora. Pontos (u, y) em volta, começando no pé esquerdo. */
function ogiva(u: number, y0: number, hw: number, h: number, e: number, seg: number): [number, number][] {
  const W = 2 * (hw + e), a = u - hw - e, b = u + hw + e, yb = y0 + h
  const pts: [number, number][] = [[a, y0 - e], [b, y0 - e]]
  for (let k = 0; k <= seg; k++) { const t = (k / seg) * (Math.PI / 3); pts.push([a + W * Math.cos(t), yb + W * Math.sin(t)]) }
  for (let k = 1; k <= seg; k++) { const t = Math.PI * (2 / 3) + (k / seg) * (Math.PI / 3); pts.push([b + W * Math.cos(t), yb + W * Math.sin(t)]) }
  return pts
}

/** Janela GÓTICA acesa (inventário: o arco da loja): caixilho de mármore saliente com peitoril, moldura de
 *  ouro, vitral âmbar em facetas (mais claro para o meio, estrela branca no centro), montantes e rendilhado
 *  em Y de ouro. Base em (u, y0); `h` = altura dos lados retos (a ponta sobe mais 0,87 × vão). */
function janelaOgival(g: ReturnType<Cena["geo"]>, G: ReturnType<Cena["glow"]>, Q: ReturnType<typeof quadro>, u: number, y0: number, w: number, h: number, v0: number, lod: number) {
  const hw = w / 2, seg = lod ? 2 : 4
  const ponta = w * 0.866
  const poli = (geo: ReturnType<Cena["geo"]>, e: number, v: number, cor: RGB) => face(geo, ogiva(u, y0, hw, h, e, seg).map(([pu, py]) => Q.P(pu, v, py)), cor, Q.N(0, 1))
  poli(g, 0.32, v0, mix(MARMORE, BRANCO, 0.5))
  bloco(g, Q, u, v0 + 0.08, w + 0.84, 0.3, y0 - 0.32, y0 - 0.12, MARMORE_SOMBRA, BRANCO)
  poli(g, 0.13, v0 + 0.05, OURO)
  const vv = v0 + 0.08
  const borda = ogiva(u, y0, hw, h, 0, seg)
  const cy = y0 + (h + ponta) * 0.5
  const centro = Q.P(u, vv, cy)
  for (let k = 0; k < borda.length; k++) {
    const [pa, pb] = [borda[k], borda[(k + 1) % borda.length]]
    // tom pela altura (fundo âmbar embaixo → claro em cima) e alternado por pano (o facetado do vitral)
    const tom = (py: number) => { const t = Math.min(1, Math.max(0, (py - y0) / (h + ponta))); return mul(t < 0.5 ? mix(VITRINE_FUNDO, VITRINE, t * 2) : mix(VITRINE, mix(VITRINE, BRANCO, 0.45), t * 2 - 1), k % 2 ? 0.93 : 1) }
    face(G, [Q.P(pa[0], vv, pa[1]), Q.P(pb[0], vv, pb[1]), centro], [tom(pa[1]), tom(pb[1]), mix(VITRINE, BRANCO, 0.75)], Q.N(0, 1))
  }
  if (lod) return
  // montantes (3) e travessa baixa, de ouro
  for (const du of [-hw / 3, 0, hw / 3]) bloco(g, Q, u + du, vv + 0.04, 0.07, 0.05, y0, du ? y0 + h : y0 + h + ponta * 0.92, OURO)
  bloco(g, Q, u, vv + 0.04, w, 0.05, y0 + h * 0.28, y0 + h * 0.28 + 0.07, OURO)
  // rendilhado em Y: dos montantes de lado até o central, e dos cantos até a ponta
  for (const sg of [-1, 1]) {
    tube(g, Q.P(u + (sg * hw) / 3, vv + 0.06, y0 + h), Q.P(u, vv + 0.06, y0 + h + ponta * 0.55), 0.035, 0.035, 3, () => OURO, false)
    tube(g, Q.P(u + sg * hw, vv + 0.06, y0 + h), Q.P(u + (sg * hw) / 3, vv + 0.06, y0 + h + ponta * 0.45), 0.03, 0.03, 3, () => OURO, false)
  }
  // a estrela de luz no meio (o brilho da ref): 4 pontas, branca, à frente dos montantes
  const r1 = Math.min(0.55, w * 0.28), r0 = r1 * 0.28, sv = vv + 0.1
  const estrela: V3[] = []
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, r = k % 2 ? r0 : r1; estrela.push(Q.P(u + Math.sin(a) * r * 0.75, sv, cy + Math.cos(a) * r)) }
  face(G, [Q.P(u, sv, cy), ...estrela, estrela[0]], BRANCO, Q.N(0, 1)) // leque a partir do centro (a estrela é côncava)
}

/** Toldo listrado inclinado com saia recortada em triângulos. `n` listras. */
function toldo(g: ReturnType<Cena["geo"]>, Q: ReturnType<typeof quadro>, u0: number, u1: number, yTop: number, yBot: number, v0: number, out: number, n: number, ca: RGB, cb: RGB, lod: number) {
  const nn = lod ? Math.ceil(n / 3) : n
  for (let k = 0; k < nn; k++) {
    const a = u0 + ((u1 - u0) * k) / nn, b = u0 + ((u1 - u0) * (k + 1)) / nn
    const col = lod ? mix(ca, cb, 0.35) : k % 2 ? cb : ca
    face(g, [Q.P(a, v0, yTop), Q.P(b, v0, yTop), Q.P(b, v0 + out, yBot), Q.P(a, v0 + out, yBot)], [col, col, mul(col, 0.92), mul(col, 0.92)], Q.N(0, 0.6, 0.8))
    // saia: um triângulo pendurado por listra, na cor da listra
    if (!lod) face(g, [Q.P(a, v0 + out, yBot), Q.P(b, v0 + out, yBot), Q.P((a + b) / 2, v0 + out, yBot - 0.28)], mul(col, 0.88), Q.N(0, 1))
    else face(g, [Q.P(a, v0 + out, yBot), Q.P(b, v0 + out, yBot), Q.P(b, v0 + out, yBot - 0.3), Q.P(a, v0 + out, yBot - 0.3)], mul(col, 0.88), Q.N(0, 1))
  }
  // laterais do toldo (fechamento)
  for (const u of [u0, u1]) face(g, [Q.P(u, v0, yTop), Q.P(u, v0 + out, yBot), Q.P(u, v0, yBot)], mul(ca, 0.8), Q.N(Math.sign(u - (u0 + u1) / 2), 0))
}

/** Lanterna dourada de parede (inventário `lanterna-parede`): braço, gaiola de ouro e vidro âmbar aceso. */
export function lanternaParede(c: Cena, x: number, z: number, ang: number, y: number, lod: number) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), G = c.glow(x, z)
  bloco(g, Q, 0, 0.2, 0.08, 0.4, y + 0.95, y + 1.03, OURO_ESC)
  bloco(g, Q, 0, 0.42, 0.4, 0.4, y + 0.82, y + 0.92, OURO)
  bloco(g, Q, 0, 0.42, 0.34, 0.34, y - 0.02, y + 0.06, OURO)
  tube(g, Q.P(0, 0.42, y - 0.02), Q.P(0, 0.42, y - 0.22), 0.09, 0.01, 4, () => OURO, true)
  for (let k = 0; k < (lod ? 2 : 4); k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    const nu = Math.cos(a), nv = Math.sin(a)
    const cu = nu * 0.15, cv = 0.42 + nv * 0.15
    face(G, [Q.P(cu - nv * 0.13, cv + nu * 0.13, y + 0.06), Q.P(cu + nv * 0.13, cv - nu * 0.13, y + 0.06), Q.P(cu + nv * 0.13, cv - nu * 0.13, y + 0.82), Q.P(cu - nv * 0.13, cv + nu * 0.13, y + 0.82)], [VITRINE_FUNDO, VITRINE_FUNDO, VITRINE, VITRINE], Q.N(nu, nv))
  }
}

/**
 * LOJA DE MÁRMORE (inventário `loja-toldo-azul` / `loja-toldo-rosa`): 2 andares, pilastras com capitel de
 * ouro, cornijas de ouro, 2 janelas ogivais acesas no 2º andar, vitrine acesa com mercadoria em silhueta,
 * porta com moldura de ouro, toldo listrado (9 listras) com saia recortada, lanterna na pilastra,
 * 3 degraus na porta e platibanda com jardineiras. `w` × `d` × `h` (padrão 7,5 × 7 × 9,6 m).
 */
export function lojaToldo(c: Cena, x: number, z: number, ang: number, o: { w?: number; d?: number; h?: number; toldo?: RGB; listras?: number; seed?: number; outdoor?: boolean; portaEsq?: boolean; toldoTodo?: boolean; listraClara?: RGB } = {}, lod = 0) {
  const w = o.w ?? 7.5, d = o.d ?? 7, h = o.h ?? 9.6 // 9,6: a ponta do arco gótico cabe abaixo da cornija
  const ca = o.toldo ?? AZUL_TOLDO
  const seed = o.seed ?? 1
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), G = c.glow(x, z)
  const fv = d / 2
  const yA = 4.2, yB = h - 0.8
  // `portaEsq`: porta à esquerda e vitrine à direita (a loja rosa da ref) — espelha só o térreo
  const sg = o.portaEsq ? -1 : 1
  // corpo, embasamento e platibanda
  bloco(g, Q, 0, 0, w + 0.3, d + 0.3, 0, 0.5, MARMORE_SOMBRA, MARMORE_SOMBRA)
  bloco(g, Q, 0, 0, w, d, 0.5, h, MARMORE, MARMORE_SOMBRA)
  bloco(g, Q, 0, 0.05, w + 0.4, d + 0.5, yA - 0.05, yA + 0.22, mix(MARMORE, BRANCO, 0.3), MARMORE)
  bloco(g, Q, 0, 0.05, w + 0.4, d + 0.5, yB, yB + 0.25, OURO, OURO)
  bloco(g, Q, 0, 0, w + 0.1, d + 0.1, h - 0.15, h + 0.1, MARMORE_SOMBRA, MARMORE)
  c.block(x, z, w / 2, d / 2, h, Q.rot)
  // pilastras com capitel (nas quinas e entre vitrine e porta)
  const pil = lod ? [-w / 2 + 0.3, w / 2 - 0.3] : [-w / 2 + 0.3, w * 0.12 * sg, w / 2 - 0.3]
  for (const u of pil) {
    bloco(g, Q, u, fv + 0.1, 0.55, 0.25, 0.5, yB, mix(MARMORE, BRANCO, 0.4), MARMORE)
    if (!lod) {
      bloco(g, Q, u, fv + 0.16, 0.75, 0.35, yA - 0.45, yA - 0.05, OURO)
      bloco(g, Q, u, fv + 0.16, 0.75, 0.35, yB - 0.4, yB, OURO)
    }
  }
  // 2º andar: duas janelas ogivais (contagem do inventário)
  const jw = 2.0, jh = 1.9
  for (const u of [-w * 0.24, w * 0.3]) janelaOgival(g, G, Q, u, yA + 0.6, jw, jh, fv + 0.02, lod)
  // térreo: vitrine (à esquerda) com mercadoria em silhueta e porta (à direita)
  const [vu0, vu1] = sg > 0 ? [-w / 2 + 0.75, w * 0.12 - 0.45] : [-w * 0.12 + 0.45, w / 2 - 0.75]
  const BRONZE = mix(MADEIRA, OURO_ESC, 0.35)
  painel(g, Q, vu0 - 0.15, vu1 + 0.15, 0.55, 3.25, fv + 0.03, BRONZE)
  bloco(g, Q, (vu0 + vu1) / 2, fv + 0.12, vu1 - vu0 + 0.5, 0.3, 0.5, 0.72, MARMORE_SOMBRA, BRANCO)
  painel(G, Q, vu0, vu1, 0.7, 3.1, fv + 0.06, [VITRINE_FUNDO, VITRINE_FUNDO, VITRINE, VITRINE])
  if (!lod) {
    // mercadoria em SILHUETA alaranjada (a ref: pilhas de caixas e potes na metade de baixo, o vidro claro
    // em cima) — tom de laranja médio, nunca marrom escuro: a vitrine continua acesa
    const SIL = mix(MERCADORIA, VITRINE_FUNDO, 0.45)
    bloco(g, Q, (vu0 + vu1) / 2, fv + 0.1, vu1 - vu0 - 0.2, 0.05, 1.45, 1.5, mix(SIL, MERCADORIA, 0.5))
    for (const [p0, p1] of [[vu0 + 0.2, (vu0 + vu1) / 2 - 0.15], [(vu0 + vu1) / 2 + 0.15, vu1 - 0.2]]) {
      // pirâmide de caixas: 3 em baixo, 2 no meio, 1 em cima (com tamanho e tom variando)
      const cw = (p1 - p0) / 3.3
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 3 - r; k++) {
          const u = p0 + cw * (0.65 + k + r * 0.5) + (rnd(seed, r, k + p0) - 0.5) * 0.08
          const y = 0.72 + r * cw * 0.85
          bloco(g, Q, u, fv + 0.12, cw * (0.85 + rnd(seed, k, r) * 0.15), 0.05, y, y + cw * 0.8, mul(SIL, 0.92 + rnd(seed, r, k + 7) * 0.16))
        }
      // pote alto na prateleira
      bloco(g, Q, p1 - cw * 0.5, fv + 0.12, cw * 0.45, 0.05, 1.5, 1.5 + cw * 0.9, mul(SIL, 1.05))
    }
    // montante central e travessa de ouro (a vitrine da ref tem dois panos)
    bloco(g, Q, (vu0 + vu1) / 2, fv + 0.14, 0.14, 0.06, 0.7, 3.1, BRONZE)
    bloco(g, Q, (vu0 + vu1) / 2, fv + 0.14, vu1 - vu0, 0.06, 2.75, 2.83, BRONZE)
  }
  const pu = w * 0.32 * sg
  painel(g, Q, pu - 0.75, pu + 0.75, 0.5, 3.0, fv + 0.03, OURO)
  painel(g, Q, pu - 0.6, pu + 0.6, 0.5, 2.85, fv + 0.05, MADEIRA)
  if (!lod) {
    painel(G, Q, pu - 0.45, pu + 0.45, 1.9, 2.7, fv + 0.07, VITRINE)
    bloco(g, Q, pu + 0.38, fv + 0.1, 0.08, 0.08, 1.35, 1.55, OURO)
    // 3 degraus de mármore (contagem do inventário)
    for (let k = 0; k < 3; k++) bloco(g, Q, pu, fv + 0.35 + (2 - k) * 0.35, 1.9 - k * 0.15, 0.4 + (2 - k) * 0.7, 0, 0.17 * (k + 1), k % 2 ? MARMORE : MARMORE_SOMBRA, MARMORE)
  }
  // toldo listrado sobre a vitrine (9 listras)
  const [tu0, tu1] = o.toldoTodo ? [-w / 2 + 0.05, w / 2 - 0.05] : [vu0 - 0.55, vu1 + 0.55]
  toldo(g, Q, tu0, tu1, yA - 0.1, yA - 1.15, fv + 0.05, 1.8, o.listras ?? 9, ca, o.listraClara ?? BRANCO, lod)
  // lanterna na pilastra da esquerda
  if (!lod && !o.toldoTodo) lanternaParede(c, Q.P(-sg * (w / 2 - 0.3), fv + 0.2, 0)[0], Q.P(-sg * (w / 2 - 0.3), fv + 0.2, 0)[2], -Q.rot, 2.6, lod)
  // jardineiras na platibanda
  if (!lod)
    for (const u of [-w * 0.3, w * 0.3]) {
      bloco(g, Q, u, fv - 0.4, 1.6, 0.6, h + 0.1, h + 0.5, MARMORE_SOMBRA)
      const p = Q.P(u, fv - 0.4, h + 0.75)
      blob(g, p, [0.85, 0.35, 0.4], VERDE_LIMAO, seed + u)
    }
  // outdoor de cristal (loja da direita da ref)
  // outdoor GIRADO para a rua (encara quem vem pelo lado +u): a ponta de longe encosta na parede
  if (o.outdoor) {
    const ow = w * 0.9, yaw = 0.15, ov = fv + 0.1 + (ow / 2) * Math.sin(yaw)
    outdoorCristal(c, Q.P(0, ov, 0)[0], Q.P(0, ov, 0)[2], -Q.rot - yaw, yA + 0.4, ow, 3.8, lod)
  }
}

/**
 * OUTDOOR DE CRISTAL (inventário `loja-toldo-rosa`): moldura OCTOGONAL grossa de ouro (retângulo de cantos
 * cortados) e uma GEMA que enche a moldura: facetas que descem de uma CRISTA na diagonal (de baixo-esquerda
 * a cima-direita), ciano à esquerda → azul → magenta à direita, uma faceta quase branca (o reflexo da ref).
 * Base em y0, largura w, altura h; a frente olha para (sin ang, cos ang). Suportes até a parede atrás.
 */
export function outdoorCristal(c: Cena, x: number, z: number, ang: number, y0: number, w: number, h: number, lod: number) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), G = c.glow(x, z)
  const hw = w / 2, ch = Math.min(w, h) * 0.22, ym = y0 + h / 2
  const oct = (e: number): [number, number][] => [[-hw - e + ch, y0 - e], [hw + e - ch, y0 - e], [hw + e, y0 - e + ch], [hw + e, y0 + h + e - ch], [hw + e - ch, y0 + h + e], [-hw - e + ch, y0 + h + e], [-hw - e, y0 + h + e - ch], [-hw - e, y0 - e + ch]]
  const nrm = Q.N(0, 1)
  // costas (placa de ouro escuro) + braços até a parede
  face(g, oct(0.35).map(([u, y]) => Q.P(u, -0.12, y)), OURO_ESC, Q.N(0, -1))
  face(g, oct(0.35).map(([u, y]) => Q.P(u, 0, y)), OURO, nrm)
  for (const sy of [y0 + 0.5, y0 + h - 0.5]) tube(g, Q.P(hw * 0.7, -0.1, sy), Q.P(hw * 0.7, -2.4, sy), 0.08, 0.08, 4, () => OURO_ESC, false)
  // friso grosso de ouro (8 barras) — a moldura é a coisa mais pesada da peça na ref
  const ring = oct(0.2)
  if (!lod) for (let k = 0; k < 8; k++) { const [a, b] = [ring[k], ring[(k + 1) % 8]]; tube(g, Q.P(a[0], 0.14, a[1]), Q.P(b[0], 0.14, b[1]), 0.22, 0.22, 4, () => k === 4 || k === 3 ? mix(OURO, BRANCO, 0.25) : OURO, false) }
  // cores SATURADAS da ref (ciano → azul royal fundo → magenta); o claro vem só das facetas de brilho
  const CI: RGB = [0.22, 0.86, 1], AZ: RGB = [0.2, 0.32, 0.95], MG: RGB = [1, 0.28, 0.86]
  const cor = (u: number) => { const t = (u + hw) / w; return t < 0.3 ? CI : t < 0.5 ? mix(CI, AZ, (t - 0.3) / 0.2) : mix(AZ, MG, Math.min(1, (t - 0.5) / 0.3)) }
  // contorno com o meio de cada aresta (16 facetas: mais quebra, como o cristal da ref)
  const oc = oct(0)
  const cont: [number, number][] = []
  for (let k = 0; k < 8; k++) { const a = oc[k], b = oc[(k + 1) % 8]; cont.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]) }
  if (lod) {
    // o octógono puro: o contorno de 16 começa com 3 pontos ALINHADOS e a normal da face sairia zero
    face(G, oc.map(([u, y]) => Q.P(u, 0.08, y)), oc.map(([u]) => mix(cor(u), BRANCO, 0.15)), nrm)
    return
  }
  // crista (3 pontos saltados) na diagonal; cada aresta do contorno desce até o ponto da crista mais perto
  const crista: [number, number][] = [[-hw * 0.62, ym - h * 0.22], [0, ym], [hw * 0.62, ym + h * 0.22]]
  const alto = 0.65
  const perto = (u: number, y: number) => { let b = 0, bd = Infinity; crista.forEach(([cu, cy], k) => { const d = Math.hypot(u - cu, (y - cy) * 1.6); if (d < bd) { bd = d; b = k } }); return b }
  const P = ([u, y]: [number, number], dv: number) => Q.P(u, dv, y)
  // brilho (+ = mistura com branco) e fundo (− = escurece) por faceta: alternado, com 2 reflexos fortes
  const brilho = [0.2, -0.15, 0.45, 0.1, -0.1, 0.25, 0.75, 0.3, 0.1, -0.2, 0.2, 0.35, -0.05, 0.6, 0.15, -0.1]
  for (let k = 0; k < cont.length; k++) {
    const a = cont[k], b = cont[(k + 1) % cont.length]
    const ka = perto(a[0], a[1]), kb = perto(b[0], b[1])
    const t = brilho[k]
    const tom = (c: RGB, d = 0) => (t + d >= 0 ? mix(c, BRANCO, t + d) : mul(c, 1 + t + d))
    face(G, [P(a, 0.08), P(b, 0.08), P(crista[kb], alto)], [tom(cor(a[0])), tom(cor(b[0])), tom(cor(crista[kb][0]), 0.15)], nrm)
    if (ka !== kb) face(G, [P(a, 0.08), P(crista[kb], alto), P(crista[ka], alto)], [mul(cor(a[0]), 0.8), mix(cor(crista[kb][0]), BRANCO, 0.4), mix(cor(crista[ka][0]), BRANCO, 0.2)], nrm)
  }
  // fios claros na crista e nas arestas que descem dela
  for (let k = 0; k < 2; k++) tube(g, P(crista[k], alto + 0.03), P(crista[k + 1], alto + 0.03), 0.03, 0.03, 3, () => mix(OURO, BRANCO, 0.5), false)
}

/**
 * PLACA DE CRISTAL pendurada (inventário `placa-cristal`): braço de ouro saindo da parede, duas correntes
 * e o losango alongado de cristal azul-rosa em 8 facetas com moldura de ouro. `y` = altura do braço.
 */
export function placaCristal(c: Cena, x: number, z: number, ang: number, y: number, lod: number) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), G = c.glow(x, z)
  // braço (sai da parede para a frente) e o enfeite da ponta
  tube(g, Q.P(0, 0, y), Q.P(0, 1.9, y), 0.07, 0.07, 5, () => OURO, false)
  tube(g, Q.P(0, 0, y - 0.6), Q.P(0, 0.9, y), 0.05, 0.05, 4, () => OURO, false)
  tube(g, Q.P(0, 1.9, y), Q.P(0, 2.05, y + 0.12), 0.09, 0.02, 4, () => OURO, true)
  const cy = y - 1.85, H = 1.55, Wd = 0.7
  for (const dv of [0.95, 1.75]) tube(g, Q.P(0, dv, y), Q.P(0, dv, cy + H + 0.05), 0.02, 0.02, 3, () => OURO_ESC, false)
  // o losango: 8 facetas (4 em cima, 4 embaixo), duas faces (os dois lados da rua)
  const C = (vv: number): V3 => Q.P(0, 1.35 + vv, cy)
  const pts = [Q.P(0, 1.35 - Wd, cy), Q.P(0, 1.35, cy + H), Q.P(0, 1.35 + Wd, cy), Q.P(0, 1.35, cy - H)]
  const cols = [CRISTAL_AZUL, CRISTAL_CIANO, CRISTAL_ROSA, CRISTAL_LILAS]
  for (const side of [1, -1]) {
    const mid: V3 = [C(0)[0] + Q.N(side * 0.12, 0)[0], cy, C(0)[2] + Q.N(side * 0.12, 0)[2]]
    for (let k = 0; k < 4; k++) {
      const a = pts[k], b = pts[(k + 1) % 4]
      const am: V3 = [(a[0] + b[0]) / 2 + Q.N(side * 0.06, 0)[0], (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + Q.N(side * 0.06, 0)[2]]
      face(G, [a, am, mid], [cols[k], mix(cols[k], BRANCO, 0.35), BRANCO], Q.N(side, 0))
      face(G, [am, b, mid], [mix(cols[k], cols[(k + 1) % 4], 0.5), cols[(k + 1) % 4], mix(BRANCO, cols[k], 0.2)], Q.N(side, 0))
    }
  }
  // moldura de ouro em volta do losango
  if (!lod) for (let k = 0; k < 4; k++) tube(g, pts[k], pts[(k + 1) % 4], 0.06, 0.06, 4, () => OURO, false)
}

/**
 * CANTEIRO DE CRISTAL (inventário `canteiro-cristal`): caixa de mármore com friso de ouro e quina
 * chanfrada, terra, 5 bolhas verde-limão e o buquê de 9 cristais rosa em leque (o maior no meio).
 */
export function canteiroCristal(c: Cena, x: number, z: number, ang: number, o: { w?: number; d?: number; cristal?: RGB; seed?: number } = {}, lod = 0) {
  const w = o.w ?? 2.6, d = o.d ?? 1.6
  const cc = o.cristal ?? CRISTAL_ROSA
  const seed = o.seed ?? 3
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), G = c.glow(x, z)
  bloco(g, Q, 0, 0, w, d, 0, 0.62, MARMORE, TERRA)
  bloco(g, Q, 0, 0, w + 0.12, d + 0.12, 0.52, 0.64, OURO, OURO)
  bloco(g, Q, 0, 0, w + 0.06, d + 0.06, 0, 0.12, MARMORE_SOMBRA, MARMORE_SOMBRA)
  c.block(x, z, w / 2, d / 2, 0.8, Q.rot)
  // bolhas verdes (5) na borda, cristais no meio
  const nb = lod ? 2 : 5
  for (let k = 0; k < nb; k++) {
    const t = (k + 0.5) / nb
    const p = Q.P((t - 0.5) * w * 0.85, (k % 2 ? 0.25 : -0.25) * d, 0.75)
    blob(g, p, [0.42 + rnd(seed, k) * 0.12, 0.3, 0.38], VERDE_LIMAO, seed + k * 5)
  }
  const n = lod ? 4 : 9
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1) - 0.5
    const lean = t * 1.3
    const hh = (k === (n - 1) / 2 ? 1.45 : 0.85 + (1 - Math.abs(t) * 2) * 0.45) * (0.9 + rnd(seed, k, 2) * 0.2)
    const r = 0.13 + (1 - Math.abs(t) * 2) * 0.05
    const bu = t * w * 0.35, bv = (rnd(seed, k, 3) - 0.5) * 0.3
    const base = Q.P(bu, bv, 0.62)
    const tip = Q.P(bu + Math.sin(lean) * hh * 0.6, bv + (rnd(seed, k, 4) - 0.5) * 0.25, 0.62 + Math.cos(lean * 0.6) * hh)
    const sh: V3 = [base[0] + (tip[0] - base[0]) * 0.72, base[1] + (tip[1] - base[1]) * 0.72, base[2] + (tip[2] - base[2]) * 0.72]
    const m = lod ? 3 : 5
    for (let j = 0; j < m; j++) {
      const a0 = (j / m) * Math.PI * 2, a1 = ((j + 1) / m) * Math.PI * 2
      const o0 = Q.N(Math.cos(a0) * r, Math.sin(a0) * r), o1 = Q.N(Math.cos(a1) * r, Math.sin(a1) * r)
      const nn = Q.N(Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0.2)
      const q0: V3 = [sh[0] + o0[0], sh[1], sh[2] + o0[2]], q1: V3 = [sh[0] + o1[0], sh[1], sh[2] + o1[2]]
      face(G, [[base[0] + o0[0], base[1], base[2] + o0[2]], [base[0] + o1[0], base[1], base[2] + o1[2]], q1, q0], [mul(cc, 0.7), mul(cc, 0.7), cc, cc], nn)
      face(G, [q0, q1, tip], [cc, mix(cc, CRISTAL_ROSA_CL, 0.6), BRANCO], [nn[0], 0.7, nn[2]])
    }
  }
}

/**
 * ÁRVORE REDONDA (inventário `arvore-redonda`): tronco marrom que abre em Y (3 galhos) e copa de 6 bolhas
 * verde-limão em 3 camadas (a de cima mais clara), sobre o canteirinho de mármore.
 */
export function arvoreRedonda(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0, y1: 0.35, w: 1.5, d: 1.5, side: MARMORE, top: TERRA })
  caixa(g, { x, z, y0: 0.3, y1: 0.38, w: 1.58, d: 1.58, side: OURO, top: OURO })
  const forkY = h * 0.42
  tube(g, [x, 0.3, z], [x, forkY, z], h * 0.06, h * 0.045, lod ? 4 : 6, (k) => (k % 2 ? MADEIRA : mul(MADEIRA, 0.8)), false)
  const tips: V3[] = []
  for (let k = 0; k < (lod ? 1 : 3); k++) {
    const a = (k / 3) * Math.PI * 2 + rnd(seed, 1) * 2
    const tp: V3 = [x + Math.cos(a) * h * 0.18, h * 0.66, z + Math.sin(a) * h * 0.18]
    tube(g, [x, forkY, z], tp, h * 0.035, h * 0.02, 4, () => MADEIRA, false)
    tips.push(tp)
  }
  const R = h * 0.36
  if (lod) {
    blob(g, [x, h * 0.72, z], [R * 1.1, R * 0.8, R * 1.1], VERDE_LIMAO, seed)
    c.block(x, z, 0.8, 0.8, h)
    return
  }
  // camada de baixo (3 bolhas largas), meio (2), topo (1, mais clara)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + rnd(seed, 2)
    blob(g, [x + Math.cos(a) * R * 0.62, h * 0.6, z + Math.sin(a) * R * 0.62], [R * 0.62, R * 0.45, R * 0.62], VERDE_LIMAO, seed + k)
  }
  for (let k = 0; k < 2; k++) {
    const a = k * Math.PI + rnd(seed, 3)
    blob(g, [x + Math.cos(a) * R * 0.35, h * 0.76, z + Math.sin(a) * R * 0.35], [R * 0.6, R * 0.45, R * 0.6], VERDE_LIMAO, seed + 10 + k)
  }
  blob(g, [x, h * 0.9, z], [R * 0.5, R * 0.38, R * 0.5], { dark: VERDE_LIMAO.mid, mid: VERDE_LIMAO.hi, hi: [0.95, 1, 0.6] }, seed + 20)
  c.block(x, z, 0.8, 0.8, h)
}

/**
 * PORTAL EM ARCO (inventário `portal-arco`): dois pilares de mármore com base e capitel de ouro, o arco
 * de volta inteira em aduelas, friso de ouro por dentro e por fora, e 4 estandartes de cristal
 * pendurados (2 de cada lado, na frente dos pilares). `vao` livre entre os pilares (padrão 9 m).
 */
export function portalArco(c: Cena, x: number, z: number, ang: number, vao = 9, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = c.geo(x, z), G = c.glow(x, z)
  const pw = 2.2, hP = 6.5, R = vao / 2
  for (const s of [-1, 1]) {
    const u = s * (R + pw / 2)
    bloco(g, Q, u, 0, pw + 0.4, pw + 0.4, 0, 0.6, MARMORE_SOMBRA)
    bloco(g, Q, u, 0, pw, pw, 0.6, hP, MARMORE, MARMORE_SOMBRA)
    bloco(g, Q, u, 0, pw + 0.3, pw + 0.3, hP - 0.4, hP, OURO, OURO)
    const p = Q.P(u, 0, 0)
    c.block(p[0], p[2], pw / 2, pw / 2, hP + R, Q.rot)
    // estandartes de cristal na frente do pilar (2 por lado: um alto, um baixo)
    if (!lod)
      for (const [du, y0, hh] of [[-0.45, 3.4, 2.4], [0.45, 2.6, 2.2]] as const) {
        const cu = u + du * s
        bloco(g, Q, cu, pw / 2 + 0.12, 0.9, 0.08, y0 + hh, y0 + hh + 0.12, OURO)
        face(G, [Q.P(cu - 0.38, pw / 2 + 0.16, y0 + hh), Q.P(cu + 0.38, pw / 2 + 0.16, y0 + hh), Q.P(cu + 0.38, pw / 2 + 0.16, y0 + 0.5), Q.P(cu, pw / 2 + 0.16, y0), Q.P(cu - 0.38, pw / 2 + 0.16, y0 + 0.5)], [CRISTAL_CIANO, CRISTAL_ROSA, CRISTAL_LILAS, BRANCO, CRISTAL_AZUL], Q.N(0, 1))
      }
  }
  // o arco em aduelas (meia volta), espessura = pw
  const n = lod ? 7 : 13
  const t0 = 1.1
  for (let k = 0; k < n; k++) {
    const a0 = Math.PI * (k / n), a1 = Math.PI * ((k + 1) / n)
    const P = (a: number, r: number, v: number): V3 => Q.P(Math.cos(a) * r, v, hP + Math.sin(a) * r)
    const ri = R, ro = R + t0
    for (const v of [-pw / 2, pw / 2]) face(g, [P(a0, ri, v), P(a1, ri, v), P(a1, ro, v), P(a0, ro, v)], k % 2 ? MARMORE : mix(MARMORE, MARMORE_SOMBRA, 0.4), Q.N(0, Math.sign(v)))
    face(g, [P(a0, ri, -pw / 2), P(a0, ri, pw / 2), P(a1, ri, pw / 2), P(a1, ri, -pw / 2)], MARMORE_SOMBRA, Q.N(-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)))
    face(g, [P(a0, ro, -pw / 2), P(a1, ro, -pw / 2), P(a1, ro, pw / 2), P(a0, ro, pw / 2)], MARMORE, Q.N(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)))
    if (!lod) for (const r of [ri + 0.12, ro - 0.14]) face(g, [P(a0, r, pw / 2 + 0.03), P(a1, r, pw / 2 + 0.03), P(a1, r + 0.12, pw / 2 + 0.03), P(a0, r + 0.12, pw / 2 + 0.03)], OURO, Q.N(0, 1))
  }
  // fecho (pedra-chave) de ouro com um cristal
  bloco(g, Q, 0, 0, 0.9, pw + 0.2, hP + R + 0.1, hP + R + t0 + 0.2, OURO)
  if (!lod) face(G, [Q.P(-0.3, pw / 2 + 0.12, hP + R + 0.5), Q.P(0, pw / 2 + 0.12, hP + R + 0.15), Q.P(0.3, pw / 2 + 0.12, hP + R + 0.5), Q.P(0, pw / 2 + 0.12, hP + R + 1)], [CRISTAL_CIANO, CRISTAL_AZUL, CRISTAL_ROSA, BRANCO], Q.N(0, 1))
}

/**
 * TORRE DE CRISTAL COM ANÉIS (inventário `torre-cristal-aneis`): base de mármore com vitrais de moldura
 * dourada, 5 agulhas de cristal azul (a do meio bem mais alta) e 2 anéis de ouro inclinados em volta.
 * `h` = altura total (padrão 40 m).
 */
export function torreCristalAneis(c: Cena, x: number, z: number, h = 40, seed = 7, lod = 0, fundo = false) {
  // `fundo`: vai inteira para o pano de fundo (fora da área, sem caixa) — na ref a torre fica LONGE, atrás
  // do arco, e só o alto aparece; perto da rua o tambor da base enche o vão do arco
  const g = fundo ? c.fundo : c.geo(x, z), G = fundo ? c.fundo : c.glow(x, z)
  const rb = h * 0.16
  // base: tambor de mármore com cornija de ouro e vitrais
  tube(g, [x, 0, z], [x, h * 0.18, z], rb * 1.08, rb, lod ? 8 : 12, (k) => (k % 2 ? MARMORE : MARMORE_SOMBRA), false)
  tube(g, [x, h * 0.18 - 0.4, z], [x, h * 0.18 + 0.3, z], rb * 1.14, rb * 1.14, lod ? 8 : 12, () => OURO, false)
  if (!fundo) c.block(x, z, rb, rb, h)
  if (!lod)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const nx = Math.cos(a), nz = Math.sin(a), tx = -nz, tz = nx
      const R = rb * 1.03, y0 = h * 0.05, y1 = h * 0.15
      const P = (t: number, y: number): V3 => [x + nx * R + tx * t, y, z + nz * R + tz * t]
      face(g, [P(-0.9, y0 - 0.15), P(0.9, y0 - 0.15), P(0.9, y1), P(0, y1 + 0.9), P(-0.9, y1)], OURO, [nx, 0, nz])
      const Pg = (t: number, y: number): V3 => [x + nx * (R + 0.05) + tx * t, y, z + nz * (R + 0.05) + tz * t]
      face(G, [Pg(-0.75, y0), Pg(0.75, y0), Pg(0.75, y1), Pg(0, y1 + 0.7), Pg(-0.75, y1)], [CRISTAL_AZUL, CRISTAL_AZUL, CRISTAL_CIANO, BRANCO, CRISTAL_CIANO], [nx, 0, nz])
    }
  // as 5 agulhas: a central alta, 4 menores em volta, inclinadas para fora
  const agulha = (cx: number, cz: number, y0: number, hh: number, r: number, lean: number, a: number, cols: [RGB, RGB]) => {
    const tip: V3 = [cx + Math.cos(a) * lean, y0 + hh, cz + Math.sin(a) * lean]
    const sh: V3 = [cx + Math.cos(a) * lean * 0.75, y0 + hh * 0.8, cz + Math.sin(a) * lean * 0.75]
    const m = lod ? 4 : 6
    for (let j = 0; j < m; j++) {
      const a0 = (j / m) * Math.PI * 2, a1 = ((j + 1) / m) * Math.PI * 2
      const p0: V3 = [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], p1: V3 = [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r]
      const q0: V3 = [sh[0] + Math.cos(a0) * r * 0.85, sh[1], sh[2] + Math.sin(a0) * r * 0.85], q1: V3 = [sh[0] + Math.cos(a1) * r * 0.85, sh[1], sh[2] + Math.sin(a1) * r * 0.85]
      const nn: V3 = [Math.cos((a0 + a1) / 2), 0.1, Math.sin((a0 + a1) / 2)]
      const cc = j % 2 ? cols[0] : mix(cols[0], cols[1], 0.5)
      face(G, [p0, p1, q1, q0], [mul(cc, 0.75), mul(cc, 0.75), mix(cc, BRANCO, 0.2), mix(cc, BRANCO, 0.2)], nn)
      face(G, [q0, q1, tip], [mix(cc, BRANCO, 0.2), mix(cc, BRANCO, 0.2), BRANCO], [nn[0], 0.6, nn[2]])
    }
  }
  const y0 = h * 0.18
  agulha(x, z, y0, h * 0.82, rb * 0.55, 0, 0, [CRISTAL_AZUL, CRISTAL_CIANO])
  for (let k = 0; k < (lod ? 2 : 4); k++) {
    const a = (k / 4) * Math.PI * 2 + rnd(seed, k) * 0.5
    agulha(x + Math.cos(a) * rb * 0.6, z + Math.sin(a) * rb * 0.6, y0, h * (0.36 + rnd(seed, k, 2) * 0.18), rb * 0.32, h * 0.03, a, [CRISTAL_AZUL, CRISTAL_LILAS])
  }
  // 2 anéis de ouro inclinados (fita dupla face)
  for (const [yy, R, tilt, dir] of [[h * 0.55, h * 0.24, 0.16, 0.4], [h * 0.68, h * 0.2, -0.12, 1.6]] as const) {
    const n = lod ? 14 : 28
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
      const P = (a: number, dy: number): V3 => {
        const lx = Math.cos(a) * R, lz = Math.sin(a) * R
        const ty = Math.cos(a - dir) * R * tilt
        return [x + lx, yy + ty + dy, z + lz]
      }
      const nn: V3 = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]
      const fita = h * 0.014
      face(G, [P(a0, 0), P(a1, 0), P(a1, fita), P(a0, fita)], [OURO, OURO, mix(OURO, BRANCO, 0.4), mix(OURO, BRANCO, 0.4)], nn)
      face(G, [P(a1, 0), P(a0, 0), P(a0, fita), P(a1, fita)], [OURO, OURO, mix(OURO, BRANCO, 0.4), mix(OURO, BRANCO, 0.4)], [-nn[0], 0, -nn[2]])
    }
  }
}
