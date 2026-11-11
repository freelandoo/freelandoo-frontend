// features/meu-mundo/engine/cena-codigo/kit-cidade.ts — CONSTRUÇÃO e rua (skill `meu-mundo-cenario-codigo`).
//
// Caixa de pé, torre de vidro (painel por painel, com reflexo do céu em degradê), térreo de loja com
// toldo e letreiro aceso, coroa (laje, máquinas, antena, recuo), outdoor aceso com desenho abstrato,
// rua em retângulos pintados (asfalto, calçada, guia, faixa de pedestre, linha), poste, semáforo,
// pilarete e canteiro. `g` = corpo do bloco (`cena.geo`), `G` = luz acesa do bloco (`cena.glow`).

import type { Geo, RGB, V3 } from "./kit"
import { face, mix, mul, rnd, tube } from "./kit-natureza"

/** Quadro local de uma construção: (u ao longo da largura, v ao longo da fundura, y) → mundo. */
export function frame(x: number, z: number, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot)
  const P = (u: number, v: number, y: number): V3 => [x + u * c - v * s, y, z + u * s + v * c]
  const N = (u: number, v: number): V3 => [u * c - v * s, 0, u * s + v * c]
  return { P, N, x, z, rot }
}
type Frame = ReturnType<typeof frame>

/** Lado `s` de uma planta w × d: 0 = frente (v−), 1 = direita (u+), 2 = fundos (v+), 3 = esquerda (u−). */
export function sideOf(s: number, w: number, d: number) {
  const hw = w / 2, hd = d / 2
  const A: [number, number][] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]
  const a = A[s % 4], b = A[(s + 1) % 4]
  const n: [number, number] = [[0, -1], [1, 0], [0, 1], [-1, 0]][s % 4] as [number, number]
  const len = s % 2 ? d : w
  /** Ponto no lado: `t` 0..1 ao longo, `off` para fora. */
  const at = (t: number, off = 0): [number, number] => [a[0] + (b[0] - a[0]) * t + n[0] * off, a[1] + (b[1] - a[1]) * t + n[1] * off]
  return { len, at, n }
}

/** Caixa de pé (4 lados + tampa), base escurecida (sombra de contato). */
export function caixa(g: Geo, o: { x: number; z: number; y0: number; y1: number; w: number; d: number; rot?: number; side: RGB; top?: RGB; ao?: number }) {
  const F = frame(o.x, o.z, o.rot ?? 0)
  const ao = o.ao ?? 0.8
  for (let s = 0; s < 4; s++) {
    const S = sideOf(s, o.w, o.d)
    const [a, b] = [S.at(0), S.at(1)]
    face(g, [F.P(a[0], a[1], o.y0), F.P(b[0], b[1], o.y0), F.P(b[0], b[1], o.y1), F.P(a[0], a[1], o.y1)], [mul(o.side, ao), mul(o.side, ao), o.side, o.side], F.N(S.n[0], S.n[1]))
  }
  const hw = o.w / 2, hd = o.d / 2
  face(g, [F.P(-hw, -hd, o.y1), F.P(hw, -hd, o.y1), F.P(hw, hd, o.y1), F.P(-hw, hd, o.y1)], o.top ?? mul(o.side, 1.1), [0, 1, 0])
  return F
}

export interface Glass {
  /** Vidro embaixo do painel (escuro) e em cima (reflexo do céu). */
  lo: RGB
  hi: RGB
}

/**
 * Painéis de fachada num lado: `nb` vãos × `nf` andares entre yA e yB, cada painel um retângulo
 * recuado da moldura (a moldura é a parede escura atrás), com degradê e um tom próprio.
 * `pick(i, j)` devolve o par [baixo, cima] do painel (ou null para pular).
 */
export function paineis(g: Geo, F: Frame, s: number, w: number, d: number, yA: number, yB: number, nb: number, nf: number, pick: (i: number, j: number) => readonly [RGB, RGB] | null, gap = 0.14, off = 0.04) {
  const S = sideOf(s, w, d)
  const fh = (yB - yA) / nf
  const gu = gap / S.len
  for (let j = 0; j < nf; j++)
    for (let i = 0; i < nb; i++) {
      const c = pick(i, j)
      if (!c) continue
      const t0 = i / nb + gu, t1 = (i + 1) / nb - gu
      const y0 = yA + j * fh + gap * 1.6, y1 = yA + (j + 1) * fh - gap
      const a = S.at(t0, off), b = S.at(t1, off)
      face(g, [F.P(a[0], a[1], y0), F.P(b[0], b[1], y0), F.P(b[0], b[1], y1), F.P(a[0], a[1], y1)], [c[0], c[0], c[1], c[1]], F.N(S.n[0], S.n[1]))
    }
}

export interface TorreOut {
  F: Frame
  h: number
  /** Ponto e direção num lado (para pendurar outdoor): `t` 0..1 ao longo, `y`, `off` para fora. */
  onSide: (s: number, t: number, y: number, off?: number) => { p: V3; ang: number }
}

/**
 * TORRE DE VIDRO: parede-moldura + painéis nos 4 lados (mais claros no alto: céu refletido; alguns
 * com luz quente de dentro), térreo de loja opcional (vitrine, toldo, letreiro aceso no lado
 * `frente`) e coroa. ~600–900 triângulos perto; `lod` 1 = faixas largas por andar (~150).
 */
export function torre(g: Geo, G: Geo | null, o: { x: number; z: number; w: number; d: number; h: number; rot?: number; glass: Glass; wall: RGB; seed: number; lod?: number; floor?: number; bay?: number; lit?: number; podium?: { h: number; color: RGB; awning: RGB; sign?: RGB; frente?: number; frentes?: number[] }; crown?: "laje" | "recuo" | "antena" }): TorreOut {
  const { x, z, w, d, h, rot = 0, glass, wall, seed, lod = 0, floor = 3.4, bay = 2.6, lit = 0.08 } = o
  const ph = o.podium?.h ?? 0
  const F = caixa(g, { x, z, y0: ph, y1: h, w, d, rot, side: wall, top: mul(wall, 0.9), ao: ph ? 1 : 0.75 })
  const nf = Math.max(1, Math.round((h - ph) / floor))
  for (let s = 0; s < 4; s++) {
    const len = s % 2 ? d : w
    const nb = Math.max(1, Math.round(len / (lod ? bay * 3 : bay)))
    paineis(g, F, s, w, d, ph, h - 0.5, nb, nf, (i, j) => {
      const up = j / Math.max(1, nf - 1) // mais alto = mais céu no vidro
      const v = 0.82 + 0.36 * rnd(i + s * 31, j, seed)
      if (!lod && rnd(i, j + s * 17, seed + 5) < lit) return [[0.75, 0.56, 0.3], [1, 0.84, 0.52]]
      const lo = mul(mix(glass.lo, glass.hi, up * 0.35), v), hi = mul(mix(glass.lo, glass.hi, 0.45 + up * 0.55), v)
      return [lo, hi]
    }, lod ? 0.2 : 0.14)
  }
  // térreo de loja: é o que o jogador vê (a câmera fica a 2,6 m) — 70% do detalhe da cidade mora aqui
  if (o.podium) {
    const p = o.podium
    const fronts = p.frentes ?? [p.frente ?? 0]
    const PW = w + 0.5, PD = d + 0.5
    const PF = caixa(g, { x, z, y0: 0, y1: ph, w: PW, d: PD, rot, side: p.color, top: mul(p.color, 0.9) })
    for (let s = 0; s < 4; s++) {
      const S = sideOf(s, PW, PD)
      const isFront = fronts.includes(s) && !lod
      const nb = Math.max(1, Math.round(S.len / (lod ? 9 : isFront ? 3.6 : 4.4)))
      const n = PF.N(S.n[0], S.n[1])
      const q = (t: number, y: number, off: number) => {
        const a = S.at(t, off)
        return PF.P(a[0], a[1], y)
      }
      const door = Math.floor(nb / 2)
      for (let i = 0; i < nb; i++) {
        const t0 = i / nb + 0.35 / S.len, t1 = (i + 1) / nb - 0.35 / S.len // a pilastra é a parede entre os vãos
        const yb = 0.45, yt = ph - 1.35
        if (!isFront || !G) {
          face(g, [q(t0, 0.2, 0.04), q(t1, 0.2, 0.04), q(t1, yt, 0.04), q(t0, yt, 0.04)], [mul(glass.lo, 0.6), mul(glass.lo, 0.6), mul(glass.hi, 0.8), mul(glass.hi, 0.8)], n)
          continue
        }
        if (i === door) {
          // porta: vidro escuro de duas folhas, batente claro, puxadores e bandeira acesa em cima
          face(g, [q(t0, 0.05, 0.04), q(t1, 0.05, 0.04), q(t1, yt, 0.04), q(t0, yt, 0.04)], [mul(glass.lo, 0.5), mul(glass.lo, 0.5), mul(glass.hi, 0.7), mul(glass.hi, 0.7)], n)
          const tm = (t0 + t1) / 2, e = 0.05 / S.len
          face(g, [q(tm - e, 0.05, 0.06), q(tm + e, 0.05, 0.06), q(tm + e, yt, 0.06), q(tm - e, yt, 0.06)], [0.85, 0.86, 0.9], n)
          for (const sg of [-1, 1]) face(g, [q(tm + sg * 4 * e, 1.0, 0.07), q(tm + sg * 6 * e, 1.0, 0.07), q(tm + sg * 6 * e, 1.5, 0.07), q(tm + sg * 4 * e, 1.5, 0.07)], [0.9, 0.8, 0.4], n)
          face(G, [q(t0, yt + 0.08, 0.05), q(t1, yt + 0.08, 0.05), q(t1, yt + 0.5, 0.05), q(t0, yt + 0.5, 0.05)], [1, 0.95, 0.8], n)
          continue
        }
        // vitrine acesa: mureta, luz quente/fria em degradê e "mercadoria" em silhueta escura na frente
        const cool = rnd(i, s, seed + 3) > 0.6
        const lo: RGB = cool ? [0.45, 0.7, 0.85] : [0.85, 0.6, 0.32], hi: RGB = cool ? [0.85, 0.97, 1] : [1, 0.93, 0.72]
        face(G, [q(t0, yb, 0.04), q(t1, yb, 0.04), q(t1, yt, 0.04), q(t0, yt, 0.04)], [lo, lo, hi, hi], n)
        const k = 2 + Math.floor(rnd(i, s, seed + 4) * 2)
        for (let m = 0; m < k; m++) {
          const u0 = t0 + ((t1 - t0) * (m + 0.2)) / k, u1 = t0 + ((t1 - t0) * (m + 0.8)) / k
          const hh = yb + (yt - yb) * (0.3 + 0.45 * rnd(i * 7 + m, s, seed + 6))
          const dk: RGB = mul(cool ? [0.1, 0.2, 0.3] : [0.3, 0.16, 0.08], 0.8 + 0.6 * rnd(m, i, seed))
          face(g, [q(u0, yb, 0.07), q(u1, yb, 0.07), q(u1, hh, 0.07), q(u0, hh, 0.07)], dk, n)
        }
      }
      if (!isFront) continue
      // toldo com saia, e o letreiro aceso em cima dele
      const y0 = ph - 1.15, y1 = ph - 0.9, out = 1.6
      face(g, [q(0.04, y1, 0), q(0.96, y1, 0), q(0.96, y1 - 0.1, out), q(0.04, y1 - 0.1, out)], p.awning, [n[0], 1, n[2]])
      face(g, [q(0.04, y0, 0), q(0.96, y0, 0), q(0.96, y0 - 0.1, out), q(0.04, y0 - 0.1, out)], mul(p.awning, 0.5), [0, -1, 0])
      face(g, [q(0.04, y0 - 0.38, out), q(0.96, y0 - 0.38, out), q(0.96, y1 - 0.1, out), q(0.04, y1 - 0.1, out)], mul(p.awning, 1.15), n)
      if (G && p.sign) {
        face(g, [q(0.12, ph - 0.82, 0.05), q(0.88, ph - 0.82, 0.05), q(0.88, ph - 0.08, 0.05), q(0.12, ph - 0.08, 0.05)], [0.08, 0.09, 0.11], n)
        face(G, [q(0.16, ph - 0.7, 0.09), q(0.6, ph - 0.7, 0.09), q(0.6, ph - 0.2, 0.09), q(0.16, ph - 0.2, 0.09)], [mul(p.sign, 0.75), mul(p.sign, 0.75), p.sign, p.sign], n)
        face(G, [q(0.64, ph - 0.6, 0.09), q(0.84, ph - 0.6, 0.09), q(0.84, ph - 0.3, 0.09), q(0.64, ph - 0.3, 0.09)], [1, 1, 1], n)
        // placa em bandeira (perpendicular à fachada, duas faces): marca a loja para quem vem pela calçada
        const side: V3 = PF.N(S.n[1], -S.n[0])
        for (const sg of [1, -1]) face(G, [q(0.08, 3.0, 0.15), q(0.08, 3.0, 1.0), q(0.08, 4.0, 1.0), q(0.08, 4.0, 0.15)], [p.sign, p.sign, mul(p.sign, 0.8), mul(p.sign, 0.8)], [side[0] * sg, 0, side[2] * sg])
      }
    }
  }
  // coroa
  const crown = o.crown ?? "laje"
  caixa(g, { x, z, y0: h, y1: h + 0.45, w: w + 0.35, d: d + 0.35, rot, side: mul(wall, 1.25), top: mul(wall, 0.8), ao: 1 })
  if (!lod) {
    for (let k = 0; k < 3; k++) {
      const u = (rnd(k, seed, 21) - 0.5) * w * 0.6, v = (rnd(k, seed, 22) - 0.5) * d * 0.6
      const p = F.P(u, v, 0)
      caixa(g, { x: p[0], z: p[2], y0: h + 0.45, y1: h + 1.2 + rnd(k, seed, 23) * 1.4, w: 1.6 + rnd(k, seed, 24) * 2, d: 1.4 + rnd(k, seed, 25) * 1.6, rot, side: [0.58, 0.6, 0.63], ao: 0.85 })
    }
  }
  if (crown === "antena") {
    const p = F.P(w * 0.2, -d * 0.15, 0)
    tube(g, [p[0], h + 0.4, p[2]], [p[0], h + Math.max(6, h * 0.22), p[2]], 0.22, 0.05, 5, () => [0.7, 0.72, 0.75])
    if (G) caixa(G, { x: p[0], z: p[2], y0: h + Math.max(6, h * 0.22), y1: h + Math.max(6, h * 0.22) + 0.3, w: 0.3, d: 0.3, side: [1, 0.25, 0.2], ao: 1 })
  }
  if (crown === "recuo") torre(g, G, { x, z, w: w * 0.62, d: d * 0.62, h: h + 0.45 + h * 0.28, rot, glass, wall, seed: seed + 9, lod, floor, bay, lit, crown: "antena" }).h
  return {
    F, h,
    onSide: (s, t, y, off = 0.15) => {
      const S = sideOf(s, w, d)
      const a = S.at(t, off)
      const n = F.N(S.n[0], S.n[1])
      return { p: F.P(a[0], a[1], y), ang: Math.atan2(n[2], n[0]) }
    },
  }
}

/**
 * OUTDOOR ACESO com desenho ABSTRATO (nunca rosto, marca ou texto de verdade): moldura escura,
 * fundo em degradê de duas cores, faixa diagonal, bloco e "linhas de texto" claras. `ang` = para
 * onde olha (atan2(nz, nx)). `legs` > 0 = pernas até o apoio (outdoor de telhado).
 */
export function outdoor(g: Geo, G: Geo, o: { p: V3; ang: number; w: number; h: number; cols: readonly [RGB, RGB, RGB]; seed: number; legs?: number }) {
  const { p, ang, w, h, cols, seed } = o
  const n: V3 = [Math.cos(ang), 0, Math.sin(ang)]
  const r: V3 = [-n[2], 0, n[0]]
  const Q = (a: number, b: number, off: number): V3 => [p[0] + r[0] * a + n[0] * off, p[1] + b, p[2] + r[2] * a + n[2] * off]
  const quad = (geo: Geo, a0: number, b0: number, a1: number, b1: number, off: number, c: RGB | RGB[], skew = 0) => face(geo, [Q(a0, b0, off), Q(a1, b0, off), Q(a1 + skew, b1, off), Q(a0 + skew, b1, off)], c, n)
  const hw = w / 2, hh = h / 2
  // moldura: frente e costas escuras (visível dos dois lados)
  quad(g, -hw - 0.25, -hh - 0.25, hw + 0.25, hh + 0.25, 0.02, [0.07, 0.08, 0.1])
  face(g, [Q(-hw - 0.25, -hh - 0.25, -0.12), Q(hw + 0.25, -hh - 0.25, -0.12), Q(hw + 0.25, hh + 0.25, -0.12), Q(-hw - 0.25, hh + 0.25, -0.12)], [0.12, 0.13, 0.15], [-n[0], 0, -n[2]])
  // tela
  quad(G, -hw, -hh, hw, hh, 0.08, [cols[1], cols[1], cols[0], cols[0]])
  const sk = h * 0.35 * (rnd(seed, 1) > 0.5 ? 1 : -1)
  const bx = -hw + w * (0.15 + 0.3 * rnd(seed, 2))
  quad(G, bx, -hh, bx + w * 0.22, hh, 0.11, [mul(cols[2], 0.85), mul(cols[2], 0.85), cols[2], cols[2]], Math.max(-w * 0.2, Math.min(w * 0.2, sk)))
  const cx = hw - w * (0.2 + 0.15 * rnd(seed, 3))
  quad(G, cx - h * 0.2, -h * 0.05, cx + h * 0.2, h * 0.32, 0.12, [1, 1, 1])
  for (let k = 0; k < 2; k++) quad(G, -hw + w * 0.08, -hh + h * (0.1 + k * 0.11), -hw + w * (0.5 - k * 0.14), -hh + h * (0.16 + k * 0.11), 0.12, [0.96, 0.97, 1])
  if (o.legs) for (const a of [-hw * 0.6, hw * 0.6]) tube(g, Q(a, -hh - 0.25 - o.legs, -0.05), Q(a, -hh - 0.2, -0.05), 0.12, 0.12, 4, () => [0.2, 0.21, 0.24], false)
}

/** Retângulo pintado no chão (alinhado aos eixos), em y (0,01–0,04 acima do asfalto). `col`: 1 cor ou 4. */
export function rect(g: Geo, x0: number, z0: number, x1: number, z1: number, y: number, col: RGB | RGB[]) {
  face(g, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], col, [0, 1, 0])
}

/** Faixa de pedestre: listras empilhadas no sentido de quem atravessa. `alongX` = o pedestre atravessa andando em x. */
export function faixa(g: Geo, x0: number, z0: number, x1: number, z1: number, alongX: boolean, col: RGB = [0.9, 0.9, 0.9]) {
  const L = alongX ? x1 - x0 : z1 - z0
  const n = Math.max(2, Math.round(L / 1.1))
  for (let k = 0; k < n; k++) {
    const a = (k + 0.2) / n, b = (k + 0.75) / n
    if (alongX) rect(g, x0 + L * a, z0, x0 + L * b, z1, 0.03, col)
    else rect(g, x0, z0 + L * a, x1, z0 + L * b, 0.03, col)
  }
}

/** Linha tracejada de pista entre dois pontos (alinhada a um eixo). */
export function tracejado(g: Geo, x0: number, z0: number, x1: number, z1: number, col: RGB = [0.85, 0.85, 0.85], w = 0.16) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 6)
  for (let k = 0; k < n; k++) {
    const a = (k + 0.2) / n, b = (k + 0.7) / n
    const ax = x0 + (x1 - x0) * a, az = z0 + (z1 - z0) * a, bx = x0 + (x1 - x0) * b, bz = z0 + (z1 - z0) * b
    if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) rect(g, ax, az - w, bx, az + w, 0.03, col)
    else rect(g, ax - w, az, ax + w, bz, 0.03, col)
  }
}

/** Poste de luz: haste, braço para `ang` e luminária acesa. */
export function poste(g: Geo, G: Geo | null, p: V3, ang: number, h = 6.5) {
  const c: RGB = [0.22, 0.24, 0.28]
  tube(g, [p[0], 0, p[2]], [p[0], h, p[2]], 0.11, 0.07, 5, () => c, false)
  const e: V3 = [p[0] + Math.cos(ang) * 1.6, h + 0.15, p[2] + Math.sin(ang) * 1.6]
  tube(g, [p[0], h - 0.1, p[2]], e, 0.06, 0.05, 4, () => c, false)
  caixa(g, { x: e[0], z: e[2], y0: h + 0.05, y1: h + 0.25, w: 0.7, d: 0.35, rot: ang, side: c, ao: 1 })
  if (G) face(G, [[e[0] - 0.3, h + 0.04, e[2] - 0.15], [e[0] + 0.3, h + 0.04, e[2] - 0.15], [e[0] + 0.3, h + 0.04, e[2] + 0.15], [e[0] - 0.3, h + 0.04, e[2] + 0.15]], [1, 0.95, 0.75], [0, -1, 0])
}

/** Semáforo: haste, braço sobre a pista e a caixa com as três luzes (uma acesa forte) olhando para `ang + π`. */
export function semaforo(g: Geo, G: Geo | null, p: V3, ang: number, seed = 0) {
  const c: RGB = [0.16, 0.17, 0.2]
  tube(g, [p[0], 0, p[2]], [p[0], 5.6, p[2]], 0.1, 0.08, 5, () => c, false)
  const e: V3 = [p[0] + Math.cos(ang) * 3, 5.5, p[2] + Math.sin(ang) * 3]
  tube(g, [p[0], 5.4, p[2]], e, 0.07, 0.06, 4, () => c, false)
  const back = ang + Math.PI / 2
  caixa(g, { x: e[0], z: e[2], y0: 4.5, y1: 5.7, w: 0.42, d: 0.3, rot: back, side: c, ao: 1 })
  if (!G) return
  const n: V3 = [Math.cos(back - Math.PI / 2), 0, Math.sin(back - Math.PI / 2)]
  const on = Math.floor(rnd(seed, 3) * 3)
  const cols: RGB[] = [[1, 0.15, 0.1], [1, 0.75, 0.1], [0.2, 1, 0.4]]
  for (const sgn of [1, -1])
    for (let k = 0; k < 3; k++) {
      const y = 5.42 - k * 0.36
      const o = 0.16 * sgn
      const r: V3 = [-n[2], 0, n[0]]
      const q = (a: number, b: number): V3 => [e[0] + n[0] * o + r[0] * a, y + b, e[2] + n[2] * o + r[2] * a]
      face(G, [q(-0.12, -0.12), q(0.12, -0.12), q(0.12, 0.12), q(-0.12, 0.12)], mul(cols[k], k === on ? 1 : 0.22), [n[0] * sgn, 0, n[2] * sgn])
    }
}

/** Pilarete (com faixa clara). */
export function pilarete(g: Geo, p: V3) {
  tube(g, [p[0], 0, p[2]], [p[0], 0.85, p[2]], 0.09, 0.09, 5, (k) => (k % 2 ? [0.85, 0.85, 0.88] : [0.3, 0.32, 0.36]))
}

/** Canteiro: caixa baixa de concreto com terra em cima (a árvore é do `kit-natureza`). */
export function canteiro(g: Geo, x: number, z: number, w = 1.8, d = 1.8) {
  caixa(g, { x, z, y0: 0, y1: 0.45, w, d, side: [0.7, 0.7, 0.72], top: [0.3, 0.24, 0.16] })
}
