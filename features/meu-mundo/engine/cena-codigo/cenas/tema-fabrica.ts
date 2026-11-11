// Tema da FÁBRICA DE BRONZE (Aeryn) — as 3 cenas usam estas peças. Refs do Alex:
// `pipeline/pecas-codigo/ref/dominios/fabrica-{1,2,3}.png` e `castelo-aeryn.png`.
//
// FICHA DO AMBIENTE
// Clima:       pátio industrial steampunk; cenas 1 e 3 no pôr do sol (laranja e rosa), cena 2 de dia
//              com fornos acesos. Tijolo, cobre e bronze quentes; luz âmbar nas janelas e fornalhas;
//              chão de chapas rebitadas roxo-acinzentado com faixas amarelas.
// Camadas:     (1) chão: chapas de metal em grade + faixas amarelas na beira do caminho; (2) relevo:
//              galpões de tijolo com janelas em arco acesas, chaminés com fumaça; (3) sem água;
//              (4) sem vegetação; (5) objetos: canos de cobre, esteiras com caixotes, barris com faixa
//              acesa, engrenagens gigantes (2), fornos (2), passarelas no alto (2), postes-lampião (3);
//              (6) fundo: silhuetas de galpões e chaminés na névoa.
// Proporções:  personagem 1,7 m; galpão 8–16 m de altura; chaminé 14–24 m; engrenagem 6–12 m;
//              caixote 1,2 m; barril 1 m; caminho 4,4 m.
// Cobertura:   ~55% chapa, 25% galpões, 10% caminho, 10% máquinas e cargas.
// Fora:        o emblema exato das bandeiras (fica uma engrenagem/águia simples), personagens.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { caixa } from "../kit-cidade"
import { blob, face, mix, mul, rnd, tube } from "../kit-natureza"

export const CEU_TARDE: RGB = [0.92, 0.62, 0.52]
export const NEVOA_TARDE: RGB = [0.88, 0.62, 0.56]
export const LUZ_TARDE = { hemi: 0.9, sol: 0.65, ceu: [1, 0.86, 0.74] as RGB, chao: [0.5, 0.4, 0.42] as RGB, solCor: [1, 0.78, 0.55] as RGB }
export const CHAPA: RGB = [0.46, 0.42, 0.5]
export const CHAPA_ESC: RGB = [0.32, 0.29, 0.36]
export const CHAPA_CL: RGB = [0.58, 0.54, 0.6]
export const AMARELO: RGB = [0.95, 0.7, 0.12]
export const TIJOLO: RGB = [0.6, 0.3, 0.22]
export const TIJOLO_ESC: RGB = [0.42, 0.2, 0.16]
export const COBRE: RGB = [0.78, 0.46, 0.24]
export const BRONZE: RGB = [0.72, 0.52, 0.24]
export const BRONZE_ESC: RGB = [0.44, 0.3, 0.14]
export const FERRO: RGB = [0.24, 0.24, 0.3]
export const MADEIRA: RGB = [0.62, 0.4, 0.22]
export const MADEIRA_ESC: RGB = [0.4, 0.25, 0.14]
export const TEAL: RGB = [0.2, 0.55, 0.5]
export const AMBAR: RGB = [1, 0.7, 0.25]
export const FOGO: RGB = [1, 0.5, 0.12]
export const FUMACA = { dark: [0.62, 0.58, 0.62] as RGB, mid: [0.82, 0.78, 0.8] as RGB, hi: [0.96, 0.94, 0.94] as RGB }
export const BANDEIRA: RGB = [0.56, 0.16, 0.14]

/** Galpão de tijolo virado para `ang` (frente), com janelas em arco acesas, cornija de cobre e chaminé. */
export function galpao(c: Cena, x: number, z: number, w: number, d: number, h: number, ang: number, seed: number, lod: number, chamine = true) {
  const g = c.geo(x, z)
  const rot = -ang
  caixa(g, { x, z, y0: 0, y1: 1, w: w + 0.4, d: d + 0.4, rot, side: TIJOLO_ESC, top: TIJOLO_ESC })
  caixa(g, { x, z, y0: 1, y1: h, w, d, rot, side: TIJOLO, top: mix(TIJOLO, FERRO, 0.4) })
  caixa(g, { x, z, y0: h - 0.3, y1: h + 0.3, w: w + 0.5, d: d + 0.5, rot, side: COBRE, top: BRONZE })
  c.block(x, z, w / 2, d / 2, h, rot)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  // janelas em arco acesas na frente (duas fileiras se for alto)
  if (!lod) {
    const G = c.glow(x, z)
    const n = Math.max(1, Math.floor(w / 3.2))
    const rows = h > 9 ? 2 : 1
    for (let rr = 0; rr < rows; rr++)
      for (let i = 0; i < n; i++) {
        if (rnd(seed, i, rr) < 0.15) continue
        const u = (i + 0.5 - n / 2) * (w / n)
        const y0 = 2 + rr * 4.2, y1 = y0 + 2.4
        const px = x + fx * (d / 2 + 0.06) + sx * u, pz = z + fz * (d / 2 + 0.06) + sz * u
        const P = (du: number, y: number): V3 => [px + sx * du, y, pz + sz * du]
        face(G, [P(-0.65, y0), P(0.65, y0), P(0.65, y1), P(0, y1 + 0.6), P(-0.65, y1)], AMBAR, [fx, 0, fz])
        // moldura escura (corpo, por trás)
        face(g, [[P(-0.85, y0 - 0.2)[0] - fx * 0.03, y0 - 0.2, P(-0.85, y0 - 0.2)[2] - fz * 0.03], [P(0.85, y0 - 0.2)[0] - fx * 0.03, y0 - 0.2, P(0.85, y0 - 0.2)[2] - fz * 0.03], [P(0.85, y1)[0] - fx * 0.03, y1, P(0.85, y1)[2] - fz * 0.03], [P(0, y1 + 0.85)[0] - fx * 0.03, y1 + 0.85, P(0, y1 + 0.85)[2] - fz * 0.03], [P(-0.85, y1)[0] - fx * 0.03, y1, P(-0.85, y1)[2] - fz * 0.03]], FERRO, [fx, 0, fz])
      }
  }
  if (!lod) {
    const fy = (u: number, y: number): V3 => [x + fx * (d / 2 + 0.45) + sx * u, y, z + fz * (d / 2 + 0.45) + sz * u]
    cano(c, fy(-w / 2 + 0.7, 0), fy(-w / 2 + 0.7, h - 0.6), 0.32, lod)
    cano(c, fy(w / 2 - 0.7, 0), fy(w / 2 - 0.7, h - 0.6), 0.32, lod)
    cano(c, fy(-w / 2 + 0.7, h - 1.4), fy(w / 2 - 0.7, h - 1.4), 0.26, lod, BRONZE)
    if (rnd(seed, 13) < 0.5) bandeira(c, fy(0, 0)[0] + fx * 0.05, h - 1.8, fy(0, 0)[2] + fz * 0.05, ang, 0.9)
  }
  if (chamine) {
    const cx = x - fx * d * 0.2 + sx * w * 0.3 * (rnd(seed, 9) > 0.5 ? 1 : -1), cz = z - fz * d * 0.2 + sz * w * 0.3
    chamineFumaca(c, cx, cz, h, h + 6 + rnd(seed, 3) * 6, seed, lod)
  }
}

/** Chaminé de tijolo com anel de cobre e fumaça (bolhas claras) no alto. */
export function chamineFumaca(c: Cena, x: number, z: number, y0: number, y1: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  tube(g, [x, y0 - 0.5, z], [x, y1, z], 1, 0.85, lod ? 5 : 7, (k) => (k % 2 ? TIJOLO : TIJOLO_ESC), false)
  tube(g, [x, y1 - 0.6, z], [x, y1 + 0.1, z], 1.1, 1.1, lod ? 5 : 7, () => COBRE, false)
  if (!lod) for (let k = 0; k < 3; k++) blob(g, [x + k * 0.9, y1 + 1.2 + k * 1.6, z + k * 0.3], [1.1 + k * 0.5, 0.9 + k * 0.3, 1.1 + k * 0.5], FUMACA, seed + k)
}

/** Cano de cobre de `a` a `b` com flanges. */
export function cano(c: Cena, a: V3, b: V3, r: number, lod: number, cor: RGB = COBRE) {
  // o pé do cano decide o bloco: fora da área (galpão de quina) não desenha
  if (Math.max(Math.abs(a[0] + b[0]), Math.abs(a[2] + b[2])) / 2 > 79.5) return
  const g = c.geo((a[0] + b[0]) / 2, (a[2] + b[2]) / 2)
  tube(g, a, b, r, r, lod ? 5 : 7, (k) => (k % 2 ? cor : mul(cor, 0.82)), false)
  if (!lod) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const n = Math.max(1, Math.floor(L / 3))
    for (let i = 1; i < n; i++) {
      const t = i / n
      const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
      const q: V3 = [p[0] + ((b[0] - a[0]) / L) * 0.25, p[1] + ((b[1] - a[1]) / L) * 0.25, p[2] + ((b[2] - a[2]) / L) * 0.25]
      tube(g, p, q, r * 1.3, r * 1.3, 6, () => BRONZE, false)
    }
  }
}

/** Caixote de madeira com moldura (com caixa se não estiver em cima de algo). */
export function caixote(c: Cena, x: number, z: number, s: number, rot: number, y = 0, solid = true) {
  const g = c.geo(x, z)
  caixa(g, { x, z, y0: y, y1: y + s, w: s, d: s, rot, side: MADEIRA, top: mix(MADEIRA, [1, 0.9, 0.7], 0.15) })
  caixa(g, { x, z, y0: y + s * 0.42, y1: y + s * 0.58, w: s + 0.06, d: s + 0.06, rot, side: MADEIRA_ESC, top: MADEIRA_ESC })
  if (solid && y === 0) c.block(x, z, s / 2, s / 2, s, rot)
}

/** Barril de ferro com faixa âmbar acesa. */
export function barril(c: Cena, x: number, z: number, s: number, lod: number) {
  const g = c.geo(x, z)
  tube(g, [x, 0, z], [x, s * 1.15, z], s * 0.5, s * 0.5, lod ? 6 : 8, (k) => (k % 2 ? BRONZE_ESC : mul(BRONZE_ESC, 0.85)), true)
  if (!lod) {
    const G = c.glow(x, z)
    const n = 8
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
      const R = s * 0.51
      face(G, [[x + Math.cos(a0) * R, s * 0.45, z + Math.sin(a0) * R], [x + Math.cos(a1) * R, s * 0.45, z + Math.sin(a1) * R], [x + Math.cos(a1) * R, s * 0.68, z + Math.sin(a1) * R], [x + Math.cos(a0) * R, s * 0.68, z + Math.sin(a0) * R]], AMBAR, [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)])
    }
  }
  c.block(x, z, s * 0.5, s * 0.5, s)
}

/** Engrenagem gigante em pé (disco dentado de bronze, dois lados + aro), virada para `ang`. */
export function engrenagem(c: Cena, x: number, y: number, z: number, R: number, ang: number, lod: number, esp = 0.6) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  const teeth = lod ? 10 : 16
  const pts: [number, number][] = []
  for (let k = 0; k < teeth * 2; k++) {
    const a = (k / (teeth * 2)) * Math.PI * 2
    const r = k % 2 ? R : R * 1.14
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  const P = (u: number, v: number, w: number): V3 => [x + sx * u + fx * w, y + v, z + sz * u + fz * w]
  for (const s of [-1, 1]) {
    const w = (esp / 2) * s
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length]
      face(g, [P(0, 0, w), P(a[0], a[1], w), P(b[0], b[1], w)], k % 4 < 2 ? BRONZE : mix(BRONZE, BRONZE_ESC, 0.3), [fx * s, 0, fz * s])
    }
    // miolo escuro
    face(g, Array.from({ length: 6 }, (_, k) => P(Math.cos((k / 6) * Math.PI * 2) * R * 0.22, Math.sin((k / 6) * Math.PI * 2) * R * 0.22, w + 0.04 * s)), FERRO, [fx * s, 0, fz * s])
  }
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length]
    face(g, [P(a[0], a[1], -esp / 2), P(b[0], b[1], -esp / 2), P(b[0], b[1], esp / 2), P(a[0], a[1], esp / 2)], BRONZE_ESC, [sx * (a[0] + b[0]), (a[1] + b[1]) * 0.5, sz * (a[0] + b[0])])
  }
}

/** Esteira baixa com rolos e caixotes em cima (com caixa), ao longo de `ang`. */
export function esteira(c: Cena, x: number, z: number, L: number, ang: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  const rot = -ang + Math.PI / 2
  caixa(g, { x, z, y0: 0, y1: 0.9, w: L, d: 1.6, rot, side: FERRO, top: mix(FERRO, CHAPA_ESC, 0.5) })
  caixa(g, { x, z, y0: 0.9, y1: 1.05, w: L, d: 1.3, rot, side: [0.16, 0.15, 0.18], top: [0.2, 0.19, 0.22] })
  c.block(x, z, L / 2, 0.85, 1.1, rot)
  const fx = Math.sin(ang), fz = Math.cos(ang)
  const n = Math.floor(L / 2.6)
  for (let i = 0; i < n; i++) {
    if (rnd(seed, i) < 0.35) continue
    const u = (i + 0.5 - n / 2) * (L / n)
    caixote(c, x + fx * u, z + fz * u, 0.9 + rnd(seed, i, 2) * 0.3, rot + rnd(seed, i, 3) * 0.3, 1.05, false)
  }
  void lod
}

/** Forno com a boca em arco acesa (cena 2). */
export function forno(c: Cena, x: number, z: number, s: number, ang: number, lod: number) {
  const g = c.geo(x, z)
  const rot = -ang
  caixa(g, { x, z, y0: 0, y1: s * 1.6, w: s * 2, d: s * 1.6, rot, side: FERRO, top: BRONZE_ESC })
  caixa(g, { x, z, y0: s * 1.6, y1: s * 1.9, w: s * 2.2, d: s * 1.8, rot, side: COBRE, top: BRONZE })
  c.block(x, z, s, s * 0.8, s * 1.9, rot)
  chamineFumaca(c, x, z, s * 1.9, s * 1.9 + 5, Math.round(x + z), lod)
  const G = c.glow(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  const px = x + fx * (s * 0.8 + 0.06), pz = z + fz * (s * 0.8 + 0.06)
  const P = (u: number, y: number): V3 => [px + sx * u, y, pz + sz * u]
  face(G, [P(-s * 0.55, 0.2), P(s * 0.55, 0.2), P(s * 0.55, s * 0.8), P(0, s * 1.15), P(-s * 0.55, s * 0.8)], [FOGO, FOGO, AMBAR, [1, 0.95, 0.6], AMBAR], [fx, 0, fz])
}

/** Poste-lampião de ferro (cena 3) com a lanterna âmbar. */
export function lampiao(c: Cena, x: number, z: number, h: number, lod: number) {
  const g = c.geo(x, z)
  tube(g, [x, 0, z], [x, h, z], 0.18, 0.12, lod ? 4 : 6, () => FERRO, false)
  caixa(g, { x, z, y0: 0, y1: 0.4, w: 0.6, d: 0.6, side: BRONZE_ESC, top: BRONZE })
  caixa(g, { x, z, y0: h, y1: h + 0.15, w: 0.8, d: 0.8, side: BRONZE, top: BRONZE })
  if (!lod) {
    const G = c.glow(x, z)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2
      const dx = Math.cos(a) * 0.32, dz = Math.sin(a) * 0.32
      face(G, [[x + dx - dz, h - 1, z + dz + dx], [x + dx + dz, h - 1, z + dz - dx], [x + dx + dz, h, z + dz - dx], [x + dx - dz, h, z + dz + dx]].map((p) => [x + (p[0] - x) * 0.5 + dx * 0.5, p[1], z + (p[2] - z) * 0.5 + dz * 0.5]) as V3[], AMBAR, [Math.cos(a), 0, Math.sin(a)])
    }
  }
  c.block(x, z, 0.3, 0.3, h)
}

/** Bandeira vermelha pendurada numa parede (com um círculo de bronze no meio). */
export function bandeira(c: Cena, x: number, y: number, z: number, ang: number, s = 1) {
  const g = c.geo(x, z)
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  const P = (u: number, v: number, w = 0): V3 => [x + sx * u + fx * w, y + v, z + sz * u + fz * w]
  face(g, [P(-0.8 * s, 0), P(0.8 * s, 0), P(0.8 * s, -3.6 * s), P(0, -4.3 * s), P(-0.8 * s, -3.6 * s)], BANDEIRA, [fx, 0, fz])
  face(g, Array.from({ length: 8 }, (_, k) => P(Math.cos((k / 8) * Math.PI * 2) * 0.45 * s, -1.6 * s + Math.sin((k / 8) * Math.PI * 2) * 0.45 * s, 0.03)), BRONZE, [fx, 0, fz])
}

/** Fundo da fábrica: silhuetas de galpões e chaminés na névoa. */
export function fundoFabrica(c: Cena, seed: number) {
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + rnd(seed, k) * 0.2
    const d = 105 + rnd(seed, k, 2) * 40
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    const h = 14 + rnd(seed, k, 3) * 18
    caixa(c.fundo, { x, z, y0: 0, y1: h, w: 18 + rnd(seed, k, 4) * 14, d: 14, rot: -a + Math.PI / 2, side: mix(TIJOLO_ESC, FERRO, 0.5), top: FERRO })
    if (k % 2 === 0) tube(c.fundo, [x, h, z], [x, h + 14 + rnd(seed, k, 5) * 10, z], 1.4, 1.2, 5, () => TIJOLO_ESC, false)
  }
}

/** A caixa (w × d, virada para `ang`) cabe sem encostar no caminho, clareira, arena ou castelo? */
export function cabe(livre: (x: number, z: number, pad?: number) => boolean, x: number, z: number, w: number, d: number, ang: number) {
  const fx = Math.sin(ang), fz = Math.cos(ang), sx = Math.cos(ang), sz = -Math.sin(ang)
  for (const [u, v] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    const px = x + sx * u * (w / 2) + fx * v * (d / 2), pz = z + sz * u * (w / 2) + fz * v * (d / 2)
    if (!livre(px, pz, 0.4)) return false
  }
  return true
}

/**
 * Galpões ao longo do caminho, dos dois lados, virados para ele (as "paredes" da rua da fábrica).
 * Devolve quantos entraram.
 */
export function ruaDeGalpoes(c: Cena, at: (t: number) => { x: number; z: number; dx: number; dz: number }, livre: (x: number, z: number, pad?: number) => boolean, lod: number, seed: number, passo = 0.05) {
  let n = 0
  const feitos: { x: number; z: number; r: number }[] = []
  for (let t = 0.03; t < 0.97; t += passo) {
    const p = at(t)
    for (const s of [-1, 1]) {
      const w = 10 + rnd(seed, t * 100, s) * 6, d = 9 + rnd(seed, t * 100, s + 3) * 4, h = 7 + rnd(seed, t * 100, s + 5) * 8
      const off = 4.6 + d / 2 + rnd(seed, t * 100, s + 7) * 3
      const x = p.x + p.dz * off * s, z = p.z - p.dx * off * s
      const ang = Math.atan2(p.x - x, p.z - z)
      const r = Math.max(w, d) * 0.55
      if (!cabe(livre, x, z, w, d, ang) || feitos.some((f) => Math.hypot(f.x - x, f.z - z) < f.r + r)) continue
      feitos.push({ x, z, r })
      galpao(c, x, z, w, d, h, ang, seed + n, lod, rnd(seed, n, 11) < 0.55)
      n++
    }
  }
  return n
}

/** Faixas amarelas pintadas dos dois lados do caminho (geometria fina, 3 cm acima do chão). */
export function faixasCaminho(c: Cena, path: readonly (readonly [number, number])[], off = 2.35, w = 0.22, cor: RGB = AMARELO) {
  for (let k = 0; k < path.length - 1; k++) {
    const [ax, az] = path[k], [bx, bz] = path[k + 1]
    const L = Math.hypot(bx - ax, bz - az) || 1
    const n = Math.max(1, Math.ceil(L / 8))
    const sx = -(bz - az) / L, sz = (bx - ax) / L
    for (let i = 0; i < n; i++) {
      // tracejado: 3 de cada 4 pedaços
      const t0 = i / n, t1 = (i + 0.78) / n
      const p0x = ax + (bx - ax) * t0, p0z = az + (bz - az) * t0, p1x = ax + (bx - ax) * t1, p1z = az + (bz - az) * t1
      const g = c.geo((p0x + p1x) / 2, (p0z + p1z) / 2)
      for (const s of [-1, 1]) {
        const o0 = off * s, o1 = (off + w) * s
        face(g, [[p0x + sx * o0, 0.03, p0z + sz * o0], [p1x + sx * o0, 0.03, p1z + sz * o0], [p1x + sx * o1, 0.03, p1z + sz * o1], [p0x + sx * o1, 0.03, p0z + sz * o1]], cor, [0, 1, 0])
      }
    }
  }
}
