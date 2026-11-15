// Ferramentas das fachadas de loja do centro (Banco de Sangue, Açougue) — skill `meu-mundo-cenario-codigo`.
//
// Contrato do jogo (centro, `meuMundoCenter.js` + `center-world.ts`): origem no MEIO da fachada, no chão;
// fachada no plano z = 0 virada para −z (a rua); o prédio vai para +z (fundura). Largura útil = largura
// do terreno − 0,6. Faixa do letreiro do jogo: centro em y = 3,5, 0,9 de altura, até 7,4 m de largura —
// fica LISA (o jogo pendura a placa com o nome ali).
//
// Planos: um "plano" leva (u ao longo, y, off para fora) a um ponto do mundo. Tudo que é relevo
// (pilastra, moldura, cornija) sai do plano por `off`, então as quatro paredes usam as mesmas peças.

import { Geo, type RGB, type V3 } from "../kit"
import { face, mul, rnd, tube } from "../kit-natureza"

export interface Plano {
  P: (u: number, y: number, off: number) => V3
  n: V3
}
export const frente = (z = 0): Plano => ({ P: (u, y, off) => [u, y, z - off], n: [0, 0, -1] })
export const fundos = (z: number): Plano => ({ P: (u, y, off) => [-u, y, z + off], n: [0, 0, 1] })
/** Lado esquerdo (x−): u anda de trás (z grande) para a frente. */
export const esquerda = (x: number): Plano => ({ P: (u, y, off) => [x - off, y, u], n: [-1, 0, 0] })
/** Lado direito (x+): u anda da frente para trás. */
export const direita = (x: number): Plano => ({ P: (u, y, off) => [x + off, y, u], n: [1, 0, 0] })

/** O mesmo plano, `z0` para fora (para assentar janela e moldura POR CIMA do tijolo). */
export const sobre = (pl: Plano, z0: number): Plano => ({ P: (u, y, off) => pl.P(u, y, off + z0), n: pl.n })

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const neg = (a: V3): V3 => [-a[0], -a[1], -a[2]]

/** Retângulo no plano; `c` = uma cor ou 4 (baixo-esq, baixo-dir, cima-dir, cima-esq). */
export function ret(g: Geo, pl: Plano, u0: number, u1: number, y0: number, y1: number, off: number, c: RGB | RGB[], wear = 0) {
  face(g, [pl.P(u0, y0, off), pl.P(u1, y0, off), pl.P(u1, y1, off), pl.P(u0, y1, off)], c, pl.n, wear)
}
/** Retângulo com degradê vertical (baixo → cima). */
export const retV = (g: Geo, pl: Plano, u0: number, u1: number, y0: number, y1: number, off: number, lo: RGB, hi: RGB, wear = 0) =>
  ret(g, pl, u0, u1, y0, y1, off, [lo, lo, hi, hi], wear)

/**
 * Relevo: caixa que sai do plano de `o0` a `o1` (frente + topo + base + lados, sem costas).
 * O topo pega a luz (`hi`, quina lascada); a base escurece (sombra de contato).
 */
export function relevo(g: Geo, pl: Plano, u0: number, u1: number, y0: number, y1: number, o0: number, o1: number, cf: RGB, o: { cs?: RGB; hi?: RGB; wear?: number; base?: boolean } = {}) {
  const cs = o.cs ?? mul(cf, 0.8)
  const hi = o.hi ?? mul(cf, 1.35)
  const w = o.wear ?? 0.7
  const du = sub(pl.P(1, 0, 0), pl.P(0, 0, 0))
  ret(g, pl, u0, u1, y0, y1, o1, [mul(cf, 0.85), mul(cf, 0.85), cf, cf], 0.25)
  face(g, [pl.P(u0, y1, o0), pl.P(u1, y1, o0), pl.P(u1, y1, o1), pl.P(u0, y1, o1)], hi, [0, 1, 0], w)
  if (o.base !== false) face(g, [pl.P(u0, y0, o0), pl.P(u1, y0, o0), pl.P(u1, y0, o1), pl.P(u0, y0, o1)], mul(cs, 0.6), [0, -1, 0])
  face(g, [pl.P(u0, y0, o0), pl.P(u0, y1, o0), pl.P(u0, y1, o1), pl.P(u0, y0, o1)], cs, neg(du), w)
  face(g, [pl.P(u1, y0, o0), pl.P(u1, y1, o0), pl.P(u1, y1, o1), pl.P(u1, y0, o1)], cs, du, w)
}

export interface Tijolo {
  a: RGB
  b: RGB
  c: RGB
  junta: RGB
}
/**
 * Parede de tijolo: junta escura atrás e um tijolo por retângulo, fiadas desencontradas, cor variando
 * por tijolo (três tons + brilho) — o ruído do desgaste tem vértice em todo tijolo. `ao` escurece a base.
 */
export function tijolos(g: Geo, pl: Plano, u0: number, u1: number, y0: number, y1: number, t: Tijolo, seed: number, bl = 0.62, bh = 0.22, ao = 0.7) {
  ret(g, pl, u0, u1, y0, y1, 0, t.junta)
  const rows = Math.max(1, Math.round((y1 - y0) / bh))
  const h = (y1 - y0) / rows
  for (let r = 0; r < rows; r++) {
    const ya = y0 + r * h + 0.022, yb = y0 + (r + 1) * h - 0.022
    const dark = ao + (1 - ao) * Math.min(1, (r + 0.5) / 4)
    for (let u = u0 - (r % 2) * bl * 0.5, k = 0; u < u1; u += bl, k++) {
      const a = Math.max(u0, u) + 0.022, b = Math.min(u1, u + bl) - 0.022
      if (b - a < 0.08) continue
      const q = rnd(r + seed, k, seed * 3 + 1)
      const col = q < 0.5 ? t.a : q < 0.86 ? t.b : t.c
      const v = (0.86 + 0.28 * rnd(k, r, seed + 7)) * dark
      ret(g, pl, a, b, ya, yb, 0.016, mul(col, v), q > 0.93 ? 0.6 : 0.12)
    }
  }
}

/** Polígono em arco (meia-lua) no plano: centro (uc, yc), raio r, de `a0` a `a1` (radianos, 0 = direita). */
export function arco(g: Geo, pl: Plano, uc: number, yc: number, r: number, off: number, c: RGB | RGB[], a0 = 0, a1 = Math.PI, seg = 10) {
  const pts: V3[] = [pl.P(uc, yc, off)]
  for (let k = 0; k <= seg; k++) {
    const a = a0 + ((a1 - a0) * k) / seg
    pts.push(pl.P(uc + Math.cos(a) * r, yc + Math.sin(a) * r, off))
  }
  const many = Array.isArray(c[0])
  face(g, pts, many ? (c as RGB[]) : (c as RGB), pl.n)
}

/** Anel em gomos no plano (moldura de arco, medalhão): de r0 a r1, só a frente (em `off`) + borda de fora. */
export function anel(g: Geo, pl: Plano, uc: number, yc: number, r0: number, r1: number, off: number, c: RGB, a0 = 0, a1 = Math.PI, seg = 10, wear = 0.8) {
  for (let k = 0; k < seg; k++) {
    const a = a0 + ((a1 - a0) * k) / seg, b = a0 + ((a1 - a0) * (k + 1)) / seg
    const P = (ang: number, r: number, o = off) => pl.P(uc + Math.cos(ang) * r, yc + Math.sin(ang) * r, o)
    const v = 0.9 + 0.2 * rnd(k, uc, yc)
    face(g, [P(a, r0), P(b, r0), P(b, r1), P(a, r1)], mul(c, v), pl.n, wear)
    const mid = (a + b) / 2
    face(g, [P(a, r1, 0), P(b, r1, 0), P(b, r1), P(a, r1)], mul(c, 0.7), sub(P(mid, 1, 0), P(mid, 0, 0)), wear)
  }
}

/** Janela com arco: luz de dentro em degradê (G), caixilho, moldura com fecho, peitoril. */
export function janelaArco(g: Geo, G: Geo, base: Plano, uc: number, w: number, y0: number, y1: number, o: { moldura: RGB; caixilho: RGB; peitoril: RGB; lo: RGB; hi: RGB; fundo: RGB; z0?: number }) {
  const pl = sobre(base, o.z0 ?? 0.02)
  const hw = w / 2, ys = y1 - hw
  // fundo (vão) e luz de dentro
  ret(g, pl, uc - hw, uc + hw, y0, ys, 0.004, o.fundo)
  arco(g, pl, uc, ys, hw, 0.004, o.fundo)
  retV(G, pl, uc - hw + 0.04, uc + hw - 0.04, y0 + 0.04, ys, 0.012, o.lo, o.hi)
  arco(G, pl, uc, ys, hw - 0.04, 0.012, o.hi)
  // caixilho: travessa, montante e raios do arco
  relevo(g, pl, uc - 0.03, uc + 0.03, y0, ys + hw - 0.04, 0.012, 0.05, o.caixilho, { wear: 0.3 })
  relevo(g, pl, uc - hw, uc + hw, ys - 0.03, ys + 0.03, 0.012, 0.05, o.caixilho, { wear: 0.3 })
  relevo(g, pl, uc - hw, uc + hw, (y0 + ys) / 2 - 0.025, (y0 + ys) / 2 + 0.025, 0.012, 0.05, o.caixilho, { wear: 0.3 })
  // moldura: ombreiras + arco + fecho
  relevo(g, pl, uc - hw - 0.16, uc - hw, y0, ys, 0, 0.1, o.moldura)
  relevo(g, pl, uc + hw, uc + hw + 0.16, y0, ys, 0, 0.1, o.moldura)
  anel(g, pl, uc, ys, hw, hw + 0.16, 0.1, o.moldura, 0, Math.PI, 9)
  relevo(g, pl, uc - 0.12, uc + 0.12, y1 - 0.06, y1 + 0.2, 0, 0.15, mul(o.moldura, 1.15))
  relevo(g, pl, uc - hw - 0.28, uc + hw + 0.28, y0 - 0.14, y0, 0, 0.2, o.peitoril, { wear: 1 })
}

/** Janela reta com luz (G), caixilho em cruz e moldura. `luz: false` = vidro escuro com reflexo. */
export function janelaReta(g: Geo, G: Geo | null, base: Plano, uc: number, w: number, y0: number, y1: number, o: { moldura: RGB; caixilho: RGB; lo: RGB; hi: RGB; peitoril?: RGB; z0?: number }) {
  const pl = sobre(base, o.z0 ?? 0.02)
  const hw = w / 2
  retV(G ?? g, pl, uc - hw, uc + hw, y0, y1, 0.008, o.lo, o.hi)
  relevo(g, pl, uc - 0.025, uc + 0.025, y0, y1, 0.008, 0.04, o.caixilho, { wear: 0.3 })
  relevo(g, pl, uc - hw, uc + hw, (y0 + y1) / 2 - 0.025, (y0 + y1) / 2 + 0.025, 0.008, 0.04, o.caixilho, { wear: 0.3 })
  relevo(g, pl, uc - hw - 0.12, uc - hw, y0, y1, 0, 0.08, o.moldura)
  relevo(g, pl, uc + hw, uc + hw + 0.12, y0, y1, 0, 0.08, o.moldura)
  relevo(g, pl, uc - hw - 0.12, uc + hw + 0.12, y1, y1 + 0.14, 0, 0.1, o.moldura, { wear: 1 })
  relevo(g, pl, uc - hw - 0.2, uc + hw + 0.2, y0 - 0.12, y0, 0, 0.16, o.peitoril ?? o.moldura, { wear: 1 })
}

/** Lampião de parede: braço, gaiola com vidro aceso em degradê (G), chapéu e pingente. */
export function lampiao(g: Geo, G: Geo, pl: Plano, u: number, y: number, metal: RGB, luz: { core: RGB; edge: RGB }, s = 1) {
  const P = (dy: number, off: number) => pl.P(u, y + dy * s, off * s)
  relevo(g, pl, u - 0.09 * s, u + 0.09 * s, y - 0.18 * s, y + 0.18 * s, 0, 0.04 * s, metal, { wear: 1 })
  tube(g, P(0.05, 0.04), P(0.12, 0.42), 0.025 * s, 0.025 * s, 5, () => metal)
  // vidro aceso: 6 lados, miolo claro na frente, borda âmbar
  tube(G, P(-0.38, 0.45), P(0.02, 0.45), 0.11 * s, 0.14 * s, 6, (k) => (k % 3 === 0 ? luz.core : luz.edge))
  // gaiola: 3 barras + aros
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5
    const d = (x: number) => [Math.cos(a) * x, Math.sin(a) * x]
    const [ox, oz] = d(0.16 * s)
    const base = P(-0.4, 0.45), top = P(0.04, 0.45)
    tube(g, [base[0] + ox, base[1], base[2] + oz], [top[0] + ox, top[1], top[2] + oz], 0.012 * s, 0.012 * s, 4, () => metal, false)
  }
  tube(g, P(-0.44, 0.45), P(-0.38, 0.45), 0.13 * s, 0.15 * s, 8, () => mul(metal, 0.8))
  tube(g, P(0.02, 0.45), P(0.18, 0.45), 0.19 * s, 0.03 * s, 8, (k) => (k % 2 ? metal : mul(metal, 1.25)))
  tube(g, P(-0.58, 0.45), P(-0.44, 0.45), 0.015 * s, 0.05 * s, 6, () => metal)
}

/**
 * Toldo na fachada: caimento de y para y − drop, saindo `out`; faixas de cor (`cor(i)`), saia recortada
 * em bicos e friso de metal. Por baixo, sombra.
 */
export function toldo(g: Geo, x0: number, x1: number, y: number, out: number, drop: number, n: number, cor: (i: number) => RGB, friso: RGB) {
  const sw = (x1 - x0) / n
  for (let i = 0; i < n; i++) {
    const a = x0 + i * sw, b = a + sw
    const c = cor(i)
    // pano em dois gomos (barriga): mais escuro junto da parede, claro na dobra
    const ym = y - drop * 0.55, zm = -out * 0.6
    face(g, [[a, y, 0], [b, y, 0], [b, ym, zm], [a, ym, zm]], [mul(c, 0.72), mul(c, 0.72), c, c], [0, 1, -0.6])
    face(g, [[a, ym, zm], [b, ym, zm], [b, y - drop, -out], [a, y - drop, -out]], [c, c, mul(c, 1.12), mul(c, 1.12)], [0, 1, -1.4])
    // saia em bico
    const yb = y - drop, ys = yb - 0.3
    face(g, [[a, yb, -out], [b, yb, -out], [b, ys, -out], [(a + b) / 2, ys - 0.14, -out], [a, ys, -out]], mul(c, 0.95), [0, 0, -1])
    // por baixo
    face(g, [[a, y - 0.04, 0], [b, y - 0.04, 0], [b, yb - 0.04, -out], [a, yb - 0.04, -out]], mul(c, 0.35), [0, -1, 0.3])
  }
  // friso de metal na borda e no encosto
  tube(g, [x0, y - drop, -out - 0.02], [x1, y - drop, -out - 0.02], 0.035, 0.035, 6, (k) => (k % 2 ? friso : mul(friso, 1.3)))
  tube(g, [x0, y + 0.02, -0.03], [x1, y + 0.02, -0.03], 0.045, 0.045, 6, () => mul(friso, 0.8))
  // mãos-francesas
  for (const x of [x0 + 0.1, x1 - 0.1]) tube(g, [x, y - drop - 0.55, -0.02], [x, y - drop, -out + 0.05], 0.025, 0.025, 5, () => friso)
}

/**
 * Telhado de duas águas com a cumeeira ao longo de z (a empena olha a rua): fiadas de telha em faixas
 * paralelas à cumeeira (alternando tom), beiral saindo `over`, cumeeira de metal.
 */
export function telhado(g: Geo, x0: number, x1: number, yE: number, yR: number, z0: number, z1: number, t: { a: RGB; b: RGB; cume: RGB }, fiadas: number, over = 0.4) {
  const xm = (x0 + x1) / 2
  for (const side of [-1, 1]) {
    const xe = side < 0 ? x0 - over : x1 + over
    const ye = yE - (over * (yR - yE)) / ((x1 - x0) / 2)
    const want: V3 = [side * (yR - ye), Math.abs(xe - xm), 0]
    for (let k = 0; k < fiadas; k++) {
      const t0 = k / fiadas, t1 = (k + 1) / fiadas
      const xa = xe + (xm - xe) * t0, xb = xe + (xm - xe) * t1
      const ya = ye + (yR - ye) * t0, yb = ye + (yR - ye) * t1
      // cada fiada sobe 3 cm na borda de baixo (a telha de cima cobre a de baixo)
      const lift = 0.04
      const segs = 6
      for (let s = 0; s < segs; s++) {
        const za = z0 - over + ((z1 - z0 + 2 * over) * s) / segs, zb = z0 - over + ((z1 - z0 + 2 * over) * (s + 1)) / segs
        const c = mul(k % 2 ? t.a : t.b, 0.85 + 0.3 * rnd(k, s, side + 3))
        face(g, [[xa, ya + lift, za], [xa, ya + lift, zb], [xb, yb, zb], [xb, yb, za]], [mul(c, 0.8), mul(c, 0.8), c, c], want, 0.35)
      }
      // testa da fiada (degrau) na frente e nos fundos
      face(g, [[xa, ya, z0 - over], [xb, yb, z0 - over], [xb, yb + lift, z0 - over], [xa, ya + lift, z0 - over]], mul(t.a, 0.6), [0, 0, -1])
    }
    // forro do beiral
    face(g, [[xe, ye, z0 - over], [xe, ye, z1 + over], [xm, yR - 0.25, z1 + over], [xm, yR - 0.25, z0 - over]], mul(t.a, 0.3), [0, -1, 0])
  }
  tube(g, [xm, yR + 0.04, z0 - over - 0.05], [xm, yR + 0.04, z1 + over + 0.05], 0.09, 0.09, 6, (k) => (k % 3 === 0 ? mul(t.cume, 1.35) : t.cume))
}

/** Empena (triângulo da frente/fundos) com moldura inclinada nas bordas. */
export function empena(g: Geo, x0: number, x1: number, yE: number, yR: number, z: number, cor: RGB, borda: RGB, n: V3 = [0, 0, -1]) {
  const xm = (x0 + x1) / 2
  face(g, [[x0, yE, z], [x1, yE, z], [xm, yR, z]], [cor, cor, mul(cor, 1.1)], n)
  const dz = n[2] * 0.12
  for (const side of [-1, 1]) {
    const xe = side < 0 ? x0 : x1
    face(g, [[xe, yE, z + dz], [xm, yR, z + dz], [xm, yR + 0.16, z + dz], [xe + side * 0.1, yE + 0.12, z + dz]], borda, n, 1)
  }
}
