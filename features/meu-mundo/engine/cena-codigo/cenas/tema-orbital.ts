// Tema da CIDADE ORBITAL (Íris) — as 3 cenas usam estas peças. Refs do Alex (11/11, trocam a
// fatia-cidade): `pipeline/pecas-codigo/ref/dominios/orbital-{1,2,3}.png` e `castelo-iris.png`.
//
// FICHA DO AMBIENTE
// Clima:       dia claríssimo, céu azul limpo; cidade de mármore branco com frisos de ouro, cristais
//              prismáticos (rosa, ciano, violeta) acesos, toldos listrados, verde redondo; alegre,
//              pastel e luminoso.
// Camadas:     (1) chão: lajes brancas com juntas de ouro, faixa de pedestre (1), arco-íris no
//              caminho (3); (2) relevo: prédios brancos com janelas em arco acesas e cúpulas, torres
//              de cristal com anéis de ouro; (3) água: cachoeiras das ilhas (2); (4) vegetação:
//              árvores redondas e canteiros com flores de cristal; (5) objetos: obeliscos de cristal,
//              arcos brancos, escadas sem chão e ilhas flutuantes (2); (6) fundo: torres de cristal e
//              ilhas na névoa clara.
// Proporções:  personagem 1,7 m; prédio 8–16 m; torre de cristal 20–40 m; obelisco 4–7 m;
//              canteiro 2,4 m; caminho 4,4 m.
// Cobertura:   ~45% lajes, 25% prédios, 10% caminho, 10% verde/canteiros, 10% cristais.
// Fora:        letreiros e marcas (os painéis acesos são abstratos), personagens.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { blob, face, mix, mul, rnd, strata, tree, tube, type Foliage } from "../kit-natureza"
import { cabe } from "./tema-fabrica"
import * as C from "../pecas/orbital"

export const CEU: RGB = [0.46, 0.7, 1]
export const NEVOA: RGB = [0.82, 0.9, 1]
// a sombra das refs é LILÁS-CLARO e o mármore é branco-creme: chão da luz claro (o cinza-azulado deixava tudo sujo)
export const LUZ = { hemi: 1, sol: 0.8, ceu: [1, 0.98, 0.95] as RGB, chao: [0.9, 0.86, 0.94] as RGB, solCor: [1, 0.96, 0.86] as RGB }
export const MARMORE: RGB = [0.93, 0.92, 0.94]
export const MARMORE_S: RGB = [0.78, 0.78, 0.86]
export const OURO: RGB = [0.92, 0.72, 0.32]
export const OURO_ESC: RGB = [0.66, 0.48, 0.2]
export const ROSA: RGB = [1, 0.5, 0.82]
export const CIANO: RGB = [0.45, 0.92, 1]
export const VIOLETA: RGB = [0.66, 0.5, 1]
export const AMARELO: RGB = [1, 0.86, 0.36]
export const BRANCO: RGB = [1, 1, 1]
export const LUZ_JANELA: RGB = [1, 0.86, 0.55]
export const VERDE: Foliage = { dark: [0.2, 0.46, 0.14], mid: [0.38, 0.68, 0.2], hi: [0.6, 0.86, 0.32] }
export const TOLDOS: [RGB, RGB][] = [[[0.32, 0.5, 0.92], BRANCO], [[0.96, 0.46, 0.6], BRANCO], [[0.5, 0.8, 0.7], BRANCO]]

export const PEDRA_ILHA = strata([[[0.62, 0.56, 0.62], 1.2], [[0.5, 0.44, 0.52], 0.8], [[0.7, 0.64, 0.68], 0.6]], 20, 4)

/** Prédio de mármore com friso de ouro, janelas em arco acesas, toldo listrado e cúpula ou cristal. */
export function predio(c: Cena, x: number, z: number, w: number, d: number, h: number, ang: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  const rot = -ang
  caixa(g, { x, z, y0: 0, y1: 0.6, w: w + 0.4, d: d + 0.4, rot, side: MARMORE_S, top: MARMORE_S })
  caixa(g, { x, z, y0: 0.6, y1: h, w, d, rot, side: MARMORE, top: MARMORE_S })
  caixa(g, { x, z, y0: h - 0.35, y1: h + 0.25, w: w + 0.5, d: d + 0.5, rot, side: OURO, top: OURO })
  caixa(g, { x, z, y0: 3.6, y1: 3.85, w: w + 0.2, d: d + 0.2, rot, side: OURO, top: OURO })
  c.block(x, z, w / 2, d / 2, h, rot)
  C.janelasLados(c, C.quadro(x, z, ang), w, d, h > 11 ? [4.8, 8.4] : h > 7 ? [4.8] : [], lod)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  // cobertura: cúpula de ouro ou cristal prismático
  if (rnd(seed, 1) < 0.5) {
    tube(g, [x, h + 0.25, z], [x, h + Math.min(w, d) * 0.32, z], Math.min(w, d) * 0.32, Math.min(w, d) * 0.2, lod ? 6 : 8, () => OURO, false)
    tube(g, [x, h + Math.min(w, d) * 0.32, z], [x, h + Math.min(w, d) * 0.6, z], Math.min(w, d) * 0.2, 0.05, lod ? 6 : 8, () => mix(OURO, BRANCO, 0.3), true)
  } else cristal(c, x, z, Math.min(w, d) * 0.5, seed, lod, h + 0.25)
  if (lod) return
  const G = c.glow(x, z)
  const n = Math.max(1, Math.floor(w / 2.8))
  for (let rr = 0; rr < (h > 8 ? 2 : 1); rr++)
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5 - n / 2) * (w / n)
      const y0 = 4.6 + rr * 3.6, y1 = y0 + 1.9
      const px = x + fx * (d / 2 + 0.06) + sx * u, pz = z + fz * (d / 2 + 0.06) + sz * u
      const P = (du: number, y: number): V3 => [px + sx * du, y, pz + sz * du]
      face(G, [P(-0.55, y0), P(0.55, y0), P(0.55, y1), P(0, y1 + 0.55), P(-0.55, y1)], LUZ_JANELA, [fx, 0, fz])
    }
  // térreo: vitrine acesa + toldo listrado inclinado
  const [ca, cb] = TOLDOS[Math.floor(rnd(seed, 2) * TOLDOS.length)]
  const vx = x + fx * (d / 2 + 0.06), vz = z + fz * (d / 2 + 0.06)
  const V = (du: number, y: number, out = 0): V3 => [vx + sx * du + fx * out, y, vz + sz * du + fz * out]
  face(G, [V(-w * 0.35, 0.7), V(w * 0.35, 0.7), V(w * 0.35, 2.7), V(-w * 0.35, 2.7)], mix(LUZ_JANELA, BRANCO, 0.3), [fx, 0, fz])
  const m = Math.max(3, Math.round(w * 0.9))
  for (let k = 0; k < m; k++) {
    const u0 = -w * 0.42 + (w * 0.84 * k) / m, u1 = -w * 0.42 + (w * 0.84 * (k + 1)) / m
    face(g, [V(u0, 3.3, 0.05), V(u1, 3.3, 0.05), V(u1, 2.6, 1.3), V(u0, 2.6, 1.3)], k % 2 ? ca : cb, [fx, 0.7, fz])
  }
}

/** Cristal prismático aceso (obelisco ou cobertura): prisma de 6 faces com degradê rosa → ciano → violeta. */
export function cristal(c: Cena, x: number, z: number, h: number, seed: number, lod: number, y0 = 0) {
  const G = c.glow(x, z)
  const r = h * 0.18
  const n = lod ? 4 : 6
  const cores = [ROSA, CIANO, VIOLETA, AMARELO]
  const ca = cores[Math.floor(rnd(seed, 3) * 3)], cb = cores[(Math.floor(rnd(seed, 3) * 3) + 1) % 3]
  const sh = y0 + h * 0.75, tip: V3 = [x, y0 + h, z]
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
    const p0: V3 = [x + Math.cos(a0) * r, y0, z + Math.sin(a0) * r], p1: V3 = [x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r]
    const q0: V3 = [x + Math.cos(a0) * r, sh, z + Math.sin(a0) * r], q1: V3 = [x + Math.cos(a1) * r, sh, z + Math.sin(a1) * r]
    const N: V3 = [Math.cos((a0 + a1) / 2), 0.1, Math.sin((a0 + a1) / 2)]
    const cc = k % 2 ? ca : mix(ca, cb, 0.5)
    face(G, [p0, p1, q1, q0], [mul(cc, 0.75), mul(cc, 0.75), mix(cc, BRANCO, 0.25), mix(cc, BRANCO, 0.25)], N)
    face(G, [q0, q1, tip], [mix(cc, BRANCO, 0.25), mix(cc, BRANCO, 0.25), BRANCO], [N[0], 0.6, N[2]])
  }
}

/** Obelisco: base de mármore e ouro com o cristal em cima (com caixa). */
export function obelisco(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0, y1: 0.5, w: 1.8, d: 1.8, side: MARMORE_S, top: MARMORE })
  caixa(g, { x, z, y0: 0.5, y1: 1.4, w: 1.3, d: 1.3, side: MARMORE, top: OURO })
  c.block(x, z, 0.9, 0.9, h)
  cristal(c, x, z, h - 1.4, seed, lod, 1.4)
}

/** Canteiro de mármore e ouro com arbusto verde e flores de cristal acesas. */
export function canteiro(c: Cena, x: number, z: number, w: number, d: number, rot: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0, y1: 0.6, w, d, rot, side: MARMORE, top: [0.3, 0.5, 0.2] })
  caixa(g, { x, z, y0: 0.55, y1: 0.68, w: w + 0.1, d: d + 0.1, rot, side: OURO, top: OURO })
  c.block(x, z, w / 2, d / 2, 0.7, rot)
  blob(g, [x, 0.9, z], [w * 0.38, 0.5, d * 0.38], VERDE, seed)
  if (lod) return
  const G = c.glow(x, z)
  for (let k = 0; k < 3; k++) {
    const px = x + (rnd(seed, k) - 0.5) * w * 0.6, pz = z + (rnd(seed, k, 2) - 0.5) * d * 0.6
    const cc = k % 2 ? ROSA : AMARELO
    const tip: V3 = [px, 1.75 + rnd(seed, k, 3) * 0.4, pz]
    for (let j = 0; j < 4; j++) {
      const a0 = (j / 4) * Math.PI * 2, a1 = ((j + 1) / 4) * Math.PI * 2
      face(G, [[px + Math.cos(a0) * 0.18, 1, pz + Math.sin(a0) * 0.18], [px + Math.cos(a1) * 0.18, 1, pz + Math.sin(a1) * 0.18], tip], [cc, cc, BRANCO], [Math.cos((a0 + a1) / 2), 0.3, Math.sin((a0 + a1) / 2)])
    }
  }
}

/** Árvore redonda verde em canteiro baixo. */
export function arvore(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: 0, y1: 0.4, w: 1.8, d: 1.8, side: MARMORE, top: [0.3, 0.5, 0.2] })
  tree(g, [x, 0.4, z], { h, r: h * 0.33, leaf: VERDE, bark: [0.5, 0.36, 0.26], seed, lod })
  c.block(x, z, 0.9, 0.9, h)
}

/** Arco branco com friso de ouro por cima do caminho (pilares com caixa). */
export function arco(c: Cena, x: number, z: number, ang: number, vao: number, h: number, lod: number) {
  const sx = Math.cos(ang), sz = -Math.sin(ang)
  for (const s of [-1, 1]) {
    const px = x + sx * (vao / 2 + 0.8) * s, pz = z + sz * (vao / 2 + 0.8) * s
    caixa(c.geo(px, pz), { x: px, z: pz, y0: 0, y1: h, w: 1.6, d: 1.6, rot: -ang, side: MARMORE, top: OURO })
    c.block(px, pz, 0.8, 0.8, h, -ang)
  }
  const g = c.geo(x, z)
  const n = lod ? 6 : 12
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n
    const P = (t: number, r: number): V3 => {
      const a = Math.PI * t
      return [x + sx * Math.cos(a) * r, h + Math.sin(a) * r * 0.7, z + sz * Math.cos(a) * r]
    }
    const R = vao / 2 + 0.8
    for (const w of [-0.7, 0.7]) {
      const o: V3 = [Math.sin(ang) * w, 0, Math.cos(ang) * w]
      const A = P(t0, R + 0.8), B = P(t1, R + 0.8), C = P(t1, R - 0.6), D = P(t0, R - 0.6)
      face(g, [[A[0] + o[0], A[1], A[2] + o[2]], [B[0] + o[0], B[1], B[2] + o[2]], [C[0] + o[0], C[1], C[2] + o[2]], [D[0] + o[0], D[1], D[2] + o[2]]], k % 2 ? MARMORE : MARMORE_S, [Math.sin(ang) * Math.sign(w), 0, Math.cos(ang) * Math.sign(w)])
    }
  }
}

/** Torre de cristal gigante com anéis de ouro acesos (marco do horizonte). */
export function torreCristal(c: Cena, x: number, z: number, h: number, seed: number, lod: number, fundo = false) {
  const g = fundo ? c.fundo : c.geo(x, z)
  tube(g, [x, 0, z], [x, h * 0.25, z], h * 0.12, h * 0.1, 8, () => MARMORE, false)
  if (fundo) {
    tube(g, [x, h * 0.25, z], [x, h, z], h * 0.08, 0.2, 6, (k) => (k % 2 ? [0.7, 0.85, 1] : [0.86, 0.75, 1]), true)
    return
  }
  cristal(c, x, z, h * 0.75, seed, lod, h * 0.25)
  const G = c.glow(x, z)
  for (const [y, R] of [[h * 0.55, h * 0.2], [h * 0.68, h * 0.16]] as const) {
    const n = lod ? 10 : 18
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
      face(G, [[x + Math.cos(a0) * R, y, z + Math.sin(a0) * R], [x + Math.cos(a1) * R, y, z + Math.sin(a1) * R], [x + Math.cos(a1) * R, y + 0.45, z + Math.sin(a1) * R], [x + Math.cos(a0) * R, y + 0.45, z + Math.sin(a0) * R]], AMARELO, [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)])
      face(G, [[x + Math.cos(a1) * R, y, z + Math.sin(a1) * R], [x + Math.cos(a0) * R, y, z + Math.sin(a0) * R], [x + Math.cos(a0) * R, y + 0.45, z + Math.sin(a0) * R], [x + Math.cos(a1) * R, y + 0.45, z + Math.sin(a1) * R]], AMARELO, [-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)])
    }
  }
  c.block(x, z, h * 0.12, h * 0.12, h)
}

/** Ilha flutuante: rocha em cone virado + gramado + prédio pequeno, com cachoeira acesa. */
export function ilha(c: Cena, x: number, y: number, z: number, r: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  tube(g, [x, y, z], [x, y - r * 1.4, z], r, 0.3, lod ? 6 : 8, (k) => (k % 2 ? [0.62, 0.56, 0.62] : [0.5, 0.44, 0.52]), true)
  tube(g, [x, y, z], [x, y + 0.4, z], r * 1.02, r * 0.98, lod ? 6 : 8, () => [0.4, 0.68, 0.24], true)
  if (!lod) {
    caixa(g, { x: x + r * 0.2, z, y0: y + 0.4, y1: y + 0.4 + r * 0.7, w: r * 0.6, d: r * 0.5, side: MARMORE, top: OURO })
    tube(g, [x + r * 0.2, y + 0.4 + r * 0.7, z], [x + r * 0.2, y + 0.4 + r * 1.1, z], r * 0.25, 0.05, 6, () => OURO, true)
    blob(g, [x - r * 0.45, y + 1, z + r * 0.3], [r * 0.3, r * 0.3, r * 0.3], VERDE, seed)
    const G = c.glow(x, z)
    const wx = x - r * 0.9, wz = z
    face(G, [[wx, y + 0.3, wz - 0.6], [wx, y + 0.3, wz + 0.6], [wx - 0.4, y - r * 2.2, wz + 0.9], [wx - 0.4, y - r * 2.2, wz - 0.9]], [mix(CIANO, BRANCO, 0.5), mix(CIANO, BRANCO, 0.5), CIANO, CIANO], [-1, 0, 0])
    face(G, [[wx, y + 0.3, wz + 0.6], [wx, y + 0.3, wz - 0.6], [wx - 0.4, y - r * 2.2, wz - 0.9], [wx - 0.4, y - r * 2.2, wz + 0.9]], [mix(CIANO, BRANCO, 0.5), mix(CIANO, BRANCO, 0.5), CIANO, CIANO], [1, 0, 0])
  }
}

/** Escada de mármore que sobe para o nada (cena 2), virada para `ang`. Com caixa no pé. */
export function escadaSemChao(c: Cena, x: number, z: number, ang: number, n: number, lod: number) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang)
  for (let k = 0; k < n; k++) {
    caixa(g, { x: x + fx * k * 0.9, z: z + fz * k * 0.9, y0: k * 0.45, y1: k * 0.45 + 0.4, w: 2.4, d: 0.9, rot: -ang, side: k % 2 ? MARMORE : MARMORE_S, top: MARMORE })
    if (!lod && k % 3 === 0) caixa(g, { x: x + fx * k * 0.9, z: z + fz * k * 0.9, y0: k * 0.45 + 0.4, y1: k * 0.45 + 0.5, w: 2.5, d: 0.2, rot: -ang, side: OURO, top: OURO })
  }
  c.block(x + fx * n * 0.45, z + fz * n * 0.45, 1.3, n * 0.47, n * 0.45, -ang)
}

/** Fundo: torres de cristal e prédios brancos na névoa clara. */
export function fundoOrbital(c: Cena, seed: number) {
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + rnd(seed, k) * 0.2
    const d = 100 + rnd(seed, k, 2) * 50
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    if (k % 3 === 0) torreCristal(c, x, z, 40 + rnd(seed, k, 3) * 30, seed + k, 1, true)
    else caixa(c.fundo, { x, z, y0: 0, y1: 12 + rnd(seed, k, 4) * 16, w: 16, d: 12, rot: -a, side: MARMORE_S, top: OURO })
  }
}

/** Prédios brancos ao longo do caminho, dos dois lados, virados para ele (sem se sobrepor). */
export function ruaDePredios(c: Cena, at: (t: number) => { x: number; z: number; dx: number; dz: number }, livre: (x: number, z: number, pad?: number) => boolean, lod: number, seed: number, passo = 0.05, recuo = 5) {
  const feitos: { x: number; z: number; r: number }[] = []
  let n = 0
  for (let t = 0.03; t < 0.97; t += passo) {
    const p = at(t)
    for (const s of [-1, 1]) {
      const w = 9 + rnd(seed, t * 100, s) * 6, d = 8 + rnd(seed, t * 100, s + 3) * 4, h = 7 + rnd(seed, t * 100, s + 5) * 8
      const off = recuo + d / 2 + rnd(seed, t * 100, s + 7) * 2.5
      const x = p.x + p.dz * off * s, z = p.z - p.dx * off * s
      const ang = Math.atan2(p.x - x, p.z - z)
      const r = Math.max(w, d) * 0.55
      if (!cabe(livre, x, z, w, d + 3, ang) || feitos.some((f) => Math.hypot(f.x - x, f.z - z) < f.r + r)) continue
      feitos.push({ x, z, r })
      predio(c, x, z, w, d, h, ang, seed + n, lod)
      n++
    }
  }
  return n
}
