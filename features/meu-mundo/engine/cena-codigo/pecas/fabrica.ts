// features/meu-mundo/engine/cena-codigo/pecas/fabrica.ts — PEÇAS COPIADAS da FÁBRICA DE BRONZE (Aeryn) pela
// cópia minuciosa (skill meu-mundo-cenario-codigo, `copia.md`). Inventário:
// `MEU MUNDO 3D/pipeline/pecas-codigo/copia/inventario/fabrica.json` (recortes das refs fabrica-1..3).
//
// A linguagem das refs, que toda peça repete: QUINA DE BRONZE grossa e clara em toda aresta (moldura que
// avança), REBITES em toda junta, ferro roxo-escuro chanfrado, madeira vermelha em tábuas, tijolo em fiadas
// com rejunte escuro, vidro ÂMBAR aceso (claro no meio, laranja na borda) sempre dentro de moldura escura,
// e o verde-azulado (pátina) só em aros e painéis da cena 2. Contrato: (c, x, z, ang, …, lod); a FRENTE
// olha para (sin ang, cos ang); quadro local `quadro(x, z, ang)`: u = direita de quem olha, v = para fora.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { blob, face, mix, mul, rnd, tube } from "../kit-natureza"
import { quadro } from "./orbital"

// ── paleta (recortes do inventário, ajustada à luz de tarde do jogo) ──
export const OURO: RGB = [0.94, 0.62, 0.22]
export const OURO_CL: RGB = [1, 0.82, 0.42]
export const OURO_ESC: RGB = [0.6, 0.36, 0.12]
export const FERRO: RGB = [0.34, 0.31, 0.4]
export const FERRO_CL: RGB = [0.5, 0.47, 0.56]
export const FERRO_ESC: RGB = [0.2, 0.18, 0.25]
export const MAD: RGB = [0.56, 0.27, 0.2]
export const MAD_CL: RGB = [0.68, 0.36, 0.25]
export const MAD_ESC: RGB = [0.36, 0.16, 0.13]
export const TIJ: RGB = [0.66, 0.32, 0.24]
export const TIJ_CL: RGB = [0.8, 0.44, 0.32]
export const TIJ_ESC: RGB = [0.48, 0.22, 0.18]
export const REJUNTE: RGB = [0.24, 0.13, 0.12]
export const COBRE: RGB = [0.74, 0.42, 0.24]
export const COBRE_CL: RGB = [0.9, 0.58, 0.32]
export const TEAL: RGB = [0.2, 0.6, 0.56]
export const TEAL_CL: RGB = [0.36, 0.78, 0.7]
export const AMB_CL: RGB = [1, 0.95, 0.55]
export const AMB: RGB = [1, 0.76, 0.2]
export const AMB_ESC: RGB = [1, 0.5, 0.1]
export const PANO: RGB = [0.5, 0.13, 0.12]
export const PANO_ESC: RGB = [0.36, 0.09, 0.09]

type G = ReturnType<Cena["geo"]>

/** Área jogável (±80 m): a chave do bloco nunca sai dela — a geometria fica onde está, só a malha é a do bloco de dentro. */
const LIM = 79.5
const dentro = (v: number) => Math.max(-LIM, Math.min(LIM, v))
const geoEm = (c: Cena, x: number, z: number) => c.geo(dentro(x), dentro(z))
const luzEm = (c: Cena, x: number, z: number) => c.glow(dentro(x), dentro(z))
type Q = ReturnType<typeof quadro>
type UV = [number, number]

// ═══════════════ ferramentas do quadro ═══════════════

/** Tronco de 4 lados no quadro (base w0×d0 → topo w1×d1), tampa no topo; frente opcional mais clara. */
export function tronco(g: G, Q: Q, u: number, v: number, y0: number, y1: number, w0: number, d0: number, w1: number, d1: number, side: RGB, top?: RGB, frente?: RGB, fundo = false) {
  const c0: V3[] = [Q.P(u - w0 / 2, v + d0 / 2, y0), Q.P(u + w0 / 2, v + d0 / 2, y0), Q.P(u + w0 / 2, v - d0 / 2, y0), Q.P(u - w0 / 2, v - d0 / 2, y0)]
  const c1: V3[] = [Q.P(u - w1 / 2, v + d1 / 2, y1), Q.P(u + w1 / 2, v + d1 / 2, y1), Q.P(u + w1 / 2, v - d1 / 2, y1), Q.P(u - w1 / 2, v - d1 / 2, y1)]
  const ns: V3[] = [Q.N(0, 1), Q.N(1, 0), Q.N(0, -1), Q.N(-1, 0)]
  for (let k = 0; k < 4; k++) {
    const j = (k + 1) % 4
    const cor = k === 0 ? (frente ?? side) : k === 2 ? mul(side, 0.85) : side
    face(g, [c0[k], c0[j], c1[j], c1[k]], [mul(cor, 0.8), mul(cor, 0.8), cor, cor], ns[k])
  }
  if (top) face(g, c1, top, [0, 1, 0])
  if (fundo) face(g, c0, mul(side, 0.6), [0, -1, 0])
}
/** Caixa no quadro (w ao longo de u, d ao longo de v). */
export const cx = (g: G, Q: Q, u: number, v: number, w: number, d: number, y0: number, y1: number, side: RGB, top?: RGB, frente?: RGB) => tronco(g, Q, u, v, y0, y1, w, d, w, d, side, top ?? mix(side, OURO_CL, 0.15), frente)
/**
 * Caixa de colisão no quadro. ATENÇÃO: a colisão (engine/collision.ts, convenção do Babylon) gira no sentido
 * CONTRÁRIO ao do `frame`/`caixa` do kit — a caixa leva −rot para ficar em cima do desenho.
 */
export function bloq(c: Cena, Q: Q, u: number, v: number, w: number, d: number, h: number) {
  const p = Q.P(u, v, 0)
  c.block(p[0], p[2], w / 2, d / 2, h, -Q.rot)
}
/** Polígono (u, y) de pé no plano v, virado para fora (+v) ou para dentro. */
export function poli(g: G, Q: Q, pts: UV[], v: number, cor: RGB | RGB[], dentro = false) {
  face(g, pts.map(([u, y]) => Q.P(u, v, y)), cor, Q.N(0, dentro ? -1 : 1))
}
/** Rebite: cabecinha de 5 lados saindo da face (normal n). */
export function rebite(g: G, p: V3, n: V3, r = 0.045, cor: RGB = OURO_CL) {
  tube(g, p, [p[0] + n[0] * r * 0.7, p[1] + n[1] * r * 0.7, p[2] + n[2] * r * 0.7], r, r * 0.55, 5, () => cor, true)
}
/** Arco (u, y) redondo: lados retos de y0 a yb e meia-volta em cima; pontos do pé esquerdo, sentido horário. */
export function arco(u: number, y0: number, yb: number, hw: number, seg: number): UV[] {
  const pts: UV[] = [[u - hw, y0], [u + hw, y0]]
  for (let k = 0; k <= seg; k++) {
    const a = (k / seg) * Math.PI
    pts.push([u + Math.cos(a) * hw, yb + Math.sin(a) * hw])
  }
  return pts
}
/** Tubo com aro de bronze nas pontas e de tanto em tanto (o cano das refs). */
export function cano(c: Cena, a: V3, b: V3, r: number, lod: number, cor: RGB = COBRE, aro: RGB = OURO) {
  const g = geoEm(c, (a[0] + b[0]) / 2, (a[2] + b[2]) / 2)
  const n = lod ? 6 : 10
  tube(g, a, b, r, r, n, (k) => (k % 2 ? cor : k % 4 === 0 ? mix(cor, COBRE_CL, 0.5) : mul(cor, 0.82)), false)
  if (lod) return
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const m = Math.max(2, Math.round(L / 2.6))
  for (let i = 0; i <= m; i++) {
    const t = Math.min(0.99, Math.max(0.01, i / m))
    const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    const d: V3 = [((b[0] - a[0]) / L) * 0.14, ((b[1] - a[1]) / L) * 0.14, ((b[2] - a[2]) / L) * 0.14]
    tube(g, [p[0] - d[0], p[1] - d[1], p[2] - d[2]], [p[0] + d[0], p[1] + d[1], p[2] + d[2]], r * 1.2, r * 1.2, 8, (k) => (k % 2 ? aro : OURO_CL), false)
  }
}
/** Curva de cano (cotovelo de 90°): de `a` saindo na direção da1, chegando a `b` na direção db; 3 gomos. */
export function cotovelo(c: Cena, a: V3, b: V3, mid: V3, r: number, lod: number, cor: RGB = COBRE) {
  const g = geoEm(c, mid[0], mid[2])
  const pts: V3[] = []
  const n = lod ? 2 : 4
  for (let k = 0; k <= n; k++) {
    const t = k / n
    // Bézier quadrática a → mid → b
    pts.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * mid[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * mid[1] + t * t * b[1], (1 - t) ** 2 * a[2] + 2 * (1 - t) * t * mid[2] + t * t * b[2]])
  }
  for (let k = 0; k < n; k++) tube(g, pts[k], pts[k + 1], r, r, lod ? 6 : 10, (j) => (j % 2 ? cor : mul(cor, 0.82)), false)
}

// ═══════════════ CAIXOTE, BARRIS, ENGRENAGEM ═══════════════

/**
 * CAIXOTE DE BRONZE (inventário `caixote-bronze`): tábuas vermelhas (3 por face, tons alternados), moldura de
 * bronze grossa nas 12 arestas, o X de bronze em cada face de lado, cantoneiras com rebite nos 8 cantos.
 * `s` = aresta; `y` = altura da base; `rot` = giro (rad).
 */
export function caixote(c: Cena, x: number, z: number, s = 1.2, rot = 0, y = 0, lod = 0, caixaOn = true) {
  const Q = quadro(x, z, rot)
  const g = geoEm(c, x, z)
  const h = s, e = s * 0.11
  // corpo de tábuas: cada face em 3 tábuas verticais
  const tons: RGB[] = [MAD, mix(MAD, MAD_ESC, 0.25), mix(MAD, MAD_CL, 0.3)]
  for (const [nu, nv] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
    for (let i = 0; i < 3; i++) {
      const a = -s / 2 + (s / 3) * i, b = a + s / 3
      const P = (t: number, yy: number): V3 => (nv ? Q.P(nv > 0 ? t : -t, nv * s / 2, yy) : Q.P(nu * s / 2, nu > 0 ? -t : t, yy))
      face(g, [P(a, y), P(b, y), P(b, y + h), P(a, y + h)], [mul(tons[i], 0.8), mul(tons[i], 0.8), tons[(i + 1) % 3], tons[(i + 1) % 3]], Q.N(nu, nv))
      if (lod) break
    }
  }
  face(g, [Q.P(-s / 2, s / 2, y + h), Q.P(s / 2, s / 2, y + h), Q.P(s / 2, -s / 2, y + h), Q.P(-s / 2, -s / 2, y + h)], MAD_CL, [0, 1, 0])
  // moldura: 4 montantes + 8 travessas (caixas de bronze que saem 1 cm da face)
  const o = s / 2 - e / 2 + 0.01
  for (const [su, sv] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) cx(g, Q, su * o, sv * o, e + 0.02, e + 0.02, y, y + h, OURO, OURO_CL)
  for (const yy of [y, y + h - e]) {
    for (const sv of [-1, 1]) cx(g, Q, 0, sv * o, s + 0.02, e + 0.02, yy, yy + e, OURO, OURO_CL)
    for (const su of [-1, 1]) cx(g, Q, su * o, 0, e + 0.02, s + 0.02, yy, yy + e, OURO, OURO_CL)
  }
  if (lod) {
    if (caixaOn && y === 0) bloq(c, Q, 0, 0, s, s, h)
    return
  }
  // o X em cada face de lado (as 4) — duas réguas diagonais de bronze por face
  for (const [nu, nv] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
    const P = (t: number, yy: number): V3 => (nv ? Q.P(t, nv * (s / 2 + 0.015), yy) : Q.P(nu * (s / 2 + 0.015), t, yy))
    const m = s / 2 - e, bw = e * 0.62
    // tábua diagonal: faixa chata de largura 2·bw (o X da ref é largo), a de baixo um pouco mais escura
    for (const sg of [-1, 1]) {
      const A = P(-m * sg - bw, y + e), B = P(-m * sg + bw, y + e), C = P(m * sg + bw, y + h - e), D = P(m * sg - bw, y + h - e)
      face(g, sg > 0 ? [A, B, C, D] : [B, A, D, C], sg > 0 ? OURO : mix(OURO, OURO_CL, 0.4), Q.N(nu, nv))
    }
  }
  // cantoneiras com rebite (os 8 cantos, na face da frente e de lado)
  for (const [su, sv] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const)
    for (const yy of [y + e * 1.6, y + h - e * 1.6]) {
      cx(g, Q, su * (s / 2 - e * 1.1), sv * (s / 2 - e * 1.1), e * 3, e * 3, yy - e * 1.5, yy + e * 1.5, OURO_CL, OURO_CL)
      rebite(g, Q.P(su * (s / 2 - e * 0.8), sv * (s / 2 + 0.005), yy), Q.N(0, sv), e * 0.35, FERRO_ESC)
    }
  if (caixaOn && y === 0) bloq(c, Q, 0, 0, s, s, h)
}

/** Anel de `n` lados entre y0 e y1 (raio r0 → r1), cores por face. Para barril, tanque, chaminé. */
function anel(g: G, x: number, z: number, y0: number, y1: number, r0: number, r1: number, n: number, cor: (k: number) => RGB, rot = 0) {
  for (let k = 0; k < n; k++) {
    const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2
    face(g, [[x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0], [x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0], [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1]], cor(k), [Math.cos(am), (r0 - r1) / Math.max(0.01, y1 - y0), Math.sin(am)])
  }
}
/** Tampa de `n` lados (disco) em y, raio r. */
function tampa(g: G, x: number, z: number, y: number, r: number, n: number, cor: RGB, rot = 0, baixo = false) {
  face(g, Array.from({ length: n }, (_, k): V3 => [x + Math.cos(rot + (k / n) * Math.PI * 2) * r, y, z + Math.sin(rot + (k / n) * Math.PI * 2) * r]), cor, [0, baixo ? -1 : 1, 0])
}

/**
 * BARRIL ACESO (inventário `barril-aceso`): ferro de 10 faces, aros de bronze, a FAIXA ÂMBAR acesa no meio
 * (com as divisões escuras entre as faces) e a tampa com borda chanfrada. `h` = altura.
 */
export function barrilAceso(c: Cena, x: number, z: number, h = 1.15, lod = 0, caixaOn = true) {
  const g = geoEm(c, x, z), GL = luzEm(c, x, z)
  const n = lod ? 6 : 12, r = h * 0.42
  const f = (k: number) => (k % 2 ? FERRO : mix(FERRO, FERRO_CL, 0.35))
  anel(g, x, z, 0, h * 0.1, r * 0.96, r, n, () => OURO_ESC)
  anel(g, x, z, h * 0.1, h * 0.28, r, r * 1.03, n, f)
  anel(g, x, z, h * 0.28, h * 0.35, r * 1.08, r * 1.08, n, (k) => (k % 2 ? OURO : OURO_CL))
  // faixa acesa (no glow, rente à face) — claro no meio da altura
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2 + 0.03, a1 = ((k + 1) / n) * Math.PI * 2 - 0.03, R = r * 1.035
    const nn: V3 = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]
    const P = (a: number, y: number): V3 => [x + Math.cos(a) * R, y, z + Math.sin(a) * R]
    face(GL, [P(a0, h * 0.35), P(a1, h * 0.35), P(a1, h * 0.52), P(a0, h * 0.52)], [AMB, AMB, AMB_CL, AMB_CL], nn)
    face(GL, [P(a0, h * 0.52), P(a1, h * 0.52), P(a1, h * 0.68), P(a0, h * 0.68)], [AMB_CL, AMB_CL, AMB, AMB], nn)
  }
  anel(g, x, z, h * 0.35, h * 0.68, r * 1.0, r * 1.0, n, () => FERRO_ESC) // o miolo atrás da faixa
  anel(g, x, z, h * 0.68, h * 0.75, r * 1.08, r * 1.08, n, (k) => (k % 2 ? OURO : OURO_CL))
  anel(g, x, z, h * 0.75, h * 0.92, r * 1.03, r, n, f)
  anel(g, x, z, h * 0.92, h, r, r * 0.9, n, () => FERRO_CL)
  tampa(g, x, z, h - 0.02, r * 0.9, n, mix(FERRO, FERRO_CL, 0.5))
  if (!lod) {
    anel(g, x, z, h - 0.05, h + 0.02, r * 0.7, r * 0.7, n, () => FERRO_ESC)
    tampa(g, x, z, h + 0.02, r * 0.7, n, FERRO)
    rebite(g, [x, h + 0.02, z], [0, 1, 0], 0.05, FERRO_ESC)
  }
  if (caixaOn) c.block(x, z, r, r, h)
}

/** BARRIL DE MADEIRA da cena 2 (inventário `barril-teal`): aduelas em 2 tons, barriga, aros de pátina e de bronze. */
export function barrilMadeira(c: Cena, x: number, z: number, h = 1.1, lod = 0, aroCor: RGB = TEAL, caixaOn = true) {
  const g = geoEm(c, x, z)
  const n = lod ? 6 : 12, r = h * 0.4
  const f = (k: number) => (k % 2 ? MAD : MAD_CL)
  const perf: [number, number][] = [[0, 0.9], [0.5, 1.06], [1, 0.9]]
  for (let i = 0; i < perf.length - 1; i++) anel(g, x, z, h * perf[i][0], h * perf[i + 1][0], r * perf[i][1], r * perf[i + 1][1], n, f)
  tampa(g, x, z, h, r * 0.9, n, MAD_ESC)
  for (const [y0, y1, cor, rr] of [[0.02, 0.14, aroCor, 0.95], [0.86, 0.98, aroCor, 0.95], [0.3, 0.37, OURO, 1.05], [0.63, 0.7, OURO, 1.05]] as const)
    anel(g, x, z, h * y0, h * y1, r * (rr + 0.04), r * (rr + 0.04), n, (k) => (k % 2 ? cor : mix(cor, OURO_CL, 0.25)))
  if (caixaOn) c.block(x, z, r, r, h)
}

/**
 * ENGRENAGEM (inventário `engrenagem`, `engrenagem-gigante`): aro dentado de bronze com os dentes em
 * trapézio, `raios` raios largos, o cubo com aro e o eixo escuro, rebites no aro. Plano definido por
 * (centro, e1, e2) — e1/e2 unitários; a espessura sai pela normal. Funciona de pé (na parede) e deitada.
 */
export function engrenagemCopia(g: G, ctr: V3, e1: V3, e2: V3, R: number, esp: number, lod: number, o: { dentes?: number; raios?: number; cor?: RGB; furo?: boolean; aro?: number } = {}) {
  const nrm: V3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
  const P = (u: number, v: number, w: number): V3 => [ctr[0] + e1[0] * u + e2[0] * v + nrm[0] * w, ctr[1] + e1[1] * u + e2[1] * v + nrm[1] * w, ctr[2] + e1[2] * u + e2[2] * v + nrm[2] * w]
  const T = o.dentes ?? (lod ? 10 : 14), RA = o.raios ?? 6
  const cor = o.cor ?? OURO
  const cl = mix(cor, OURO_CL, 0.5), esc = mix(cor, OURO_ESC, 0.5)
  const Ri = R * 0.86, Rh = R * (o.aro ?? 0.66) // pé dos dentes; borda de dentro do aro
  // contorno de fora (dentes): por dente 4 pontos (pé, topo, topo, pé)
  const out: UV[] = []
  for (let k = 0; k < T; k++) {
    const a = (k / T) * Math.PI * 2, s = (Math.PI * 2) / T
    for (const [da, rr] of [[-0.5, Ri], [-0.28, R], [0.28, R], [0.5, Ri]] as const) out.push([Math.cos(a + da * s * 0.5) * rr, Math.sin(a + da * s * 0.5) * rr])
    out.push([Math.cos(a + s * 0.5) * Ri, Math.sin(a + s * 0.5) * Ri])
  }
  const inn = out.map(([u, v]): UV => { const L = Math.hypot(u, v); return [(u / L) * Rh, (v / L) * Rh] })
  const m = out.length
  for (const s of [1, -1]) {
    const w = (esp / 2) * s
    const nn: V3 = [nrm[0] * s, nrm[1] * s, nrm[2] * s]
    for (let k = 0; k < m; k++) {
      const j = (k + 1) % m
      face(g, [P(out[k][0], out[k][1], w), P(out[j][0], out[j][1], w), P(inn[j][0], inn[j][1], w), P(inn[k][0], inn[k][1], w)], k % 5 < 3 ? cl : cor, nn)
    }
    // aro interno saliente (a moldura que a ref mostra entre os dentes e os raios)
    if (!lod) for (let k = 0; k < m; k += 1) {
      const j = (k + 1) % m
      const a = inn[k], b = inn[j]
      face(g, [P(a[0] * 1.08, a[1] * 1.08, w + 0.04 * s), P(b[0] * 1.08, b[1] * 1.08, w + 0.04 * s), P(b[0], b[1], w + 0.04 * s), P(a[0], a[1], w + 0.04 * s)], esc, nn)
    }
  }
  // laterais: dentes (fora) e aro (dentro)
  for (let k = 0; k < m; k++) {
    const j = (k + 1) % m
    const a = out[k], b = out[j]
    face(g, [P(a[0], a[1], -esp / 2), P(b[0], b[1], -esp / 2), P(b[0], b[1], esp / 2), P(a[0], a[1], esp / 2)], k % 5 === 1 || k % 5 === 2 ? cl : esc, P(a[0] + b[0], a[1] + b[1], 0).map((q, i) => q - ctr[i]) as V3)
    if (o.furo !== false) {
      const c0 = inn[k], c1 = inn[j]
      face(g, [P(c0[0], c0[1], -esp / 2), P(c1[0], c1[1], -esp / 2), P(c1[0], c1[1], esp / 2), P(c0[0], c0[1], esp / 2)], mul(esc, 0.8), P(-(c0[0] + c1[0]), -(c0[1] + c1[1]), 0).map((q, i) => q - ctr[i]) as V3)
    }
  }
  // raios (caixas) e cubo
  for (let k = 0; k < RA; k++) {
    const a = (k / RA) * Math.PI * 2 + 0.3
    const cu = Math.cos(a), cv = Math.sin(a), pu = -cv, pv = cu
    const wR = R * (RA <= 4 ? 0.2 : 0.15), e = esp * 0.7
    const A = (r: number, s: number, w: number) => P(cu * r + pu * wR * s, cv * r + pv * wR * s, w)
    for (const s of [1, -1]) face(g, [A(R * 0.22, -1, (e / 2) * s), A(Rh, -1, (e / 2) * s), A(Rh, 1, (e / 2) * s), A(R * 0.22, 1, (e / 2) * s)], s > 0 ? cor : esc, [nrm[0] * s, nrm[1] * s, nrm[2] * s])
    for (const s of [1, -1]) face(g, [A(R * 0.22, s, -e / 2), A(Rh, s, -e / 2), A(Rh, s, e / 2), A(R * 0.22, s, e / 2)], esc, P(pu * s, pv * s, 0).map((q, i) => q - ctr[i]) as V3)
  }
  const nh = lod ? 6 : 10
  const hub = (r: number, w0: number, w1: number, cc: RGB) => {
    for (let k = 0; k < nh; k++) {
      const a0 = (k / nh) * Math.PI * 2, a1 = ((k + 1) / nh) * Math.PI * 2
      face(g, [P(Math.cos(a0) * r, Math.sin(a0) * r, w0), P(Math.cos(a1) * r, Math.sin(a1) * r, w0), P(Math.cos(a1) * r, Math.sin(a1) * r, w1), P(Math.cos(a0) * r, Math.sin(a0) * r, w1)], k % 2 ? cc : mul(cc, 0.85), P(Math.cos(a0 + 0.3), Math.sin(a0 + 0.3), 0).map((q, i) => q - ctr[i]) as V3)
    }
    face(g, Array.from({ length: nh }, (_, k) => P(Math.cos((k / nh) * Math.PI * 2) * r, Math.sin((k / nh) * Math.PI * 2) * r, w1)), mix(cc, OURO_CL, 0.2), nrm)
    face(g, Array.from({ length: nh }, (_, k) => P(Math.cos((k / nh) * Math.PI * 2) * r, Math.sin((k / nh) * Math.PI * 2) * r, -w1)), mix(cc, OURO_CL, 0.2), [-nrm[0], -nrm[1], -nrm[2]])
  }
  hub(R * 0.27, -esp * 0.6, esp * 0.6, cor)
  hub(R * 0.12, -esp * 0.75, esp * 0.75, FERRO_ESC)
  // rebites no aro
  if (!lod) for (let k = 0; k < RA * 2; k++) {
    const a = (k / (RA * 2)) * Math.PI * 2
    rebite(g, P(Math.cos(a) * R * 0.76, Math.sin(a) * R * 0.76, esp / 2 + 0.04), nrm, Math.max(0.04, R * 0.035), OURO_CL)
  }
}
/** Engrenagem em pé virada para `ang` (centro a `y`). */
export function engrenagemEmPe(c: Cena, x: number, y: number, z: number, R: number, ang: number, lod = 0, esp = 0.5, o: { dentes?: number; raios?: number; cor?: RGB } = {}) {
  const Q = quadro(x, z, ang)
  engrenagemCopia(geoEm(c, x, z), [x, y, z], [Q.sx, 0, Q.sz], [0, 1, 0], R, esp, lod, o)
}
/** Engrenagem deitada no chão (a de bronze caída da ref 1), encostada num cano. */
export function engrenagemDeitada(c: Cena, x: number, z: number, R: number, rot: number, lod = 0, incl = 0) {
  const ci = Math.cos(incl), si = Math.sin(incl)
  engrenagemCopia(geoEm(c, x, z), [x, R * si + 0.12, z], [Math.cos(rot), 0, Math.sin(rot)], [-Math.sin(rot) * ci, si, Math.cos(rot) * ci], R, R * 0.3, lod, { raios: 4, dentes: 9, aro: 0.6 })
  c.block(x, z, R * 0.8, R * 0.8, 0.5 + R * si)
}

// ═══════════════ LUZ ═══════════════

/**
 * LÂMPADA HEXAGONAL (o vidro aceso que a ref põe em cano, poste e pilar): 6 faces de vidro âmbar (claro no
 * meio, laranja nas pontas) com os montantes escuros nas quinas e os dois aros de bronze largos em cima e
 * embaixo. Centro (x, y0..y0+h, z), raio r.
 */
export function lampadaHex(c: Cena, x: number, y0: number, z: number, r: number, h: number, lod = 0, aro: RGB = OURO) {
  const g = geoEm(c, x, z), GL = luzEm(c, x, z)
  const n = 6
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2
    const P = (a: number, y: number, rr = r): V3 => [x + Math.cos(a) * rr, y, z + Math.sin(a) * rr]
    const nn: V3 = [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)]
    face(GL, [P(a0, y0), P(a1, y0), P(a1, y0 + h * 0.5), P(a0, y0 + h * 0.5)], [AMB_ESC, AMB_ESC, AMB_CL, AMB_CL], nn)
    face(GL, [P(a0, y0 + h * 0.5), P(a1, y0 + h * 0.5), P(a1, y0 + h), P(a0, y0 + h)], [AMB_CL, AMB_CL, AMB, AMB], nn)
    if (!lod) tube(g, P(a0, y0, r * 1.02), P(a0, y0 + h, r * 1.02), r * 0.08, r * 0.08, 4, () => FERRO_ESC, false)
  }
  anel(g, x, z, y0 - h * 0.16, y0, r * 1.22, r * 1.22, n, (k) => (k % 2 ? aro : mix(aro, OURO_CL, 0.4)), Math.PI / 6)
  anel(g, x, z, y0 + h, y0 + h * 1.16, r * 1.22, r * 1.22, n, (k) => (k % 2 ? aro : mix(aro, OURO_CL, 0.4)), Math.PI / 6)
  tampa(g, x, z, y0 + h * 1.16, r * 1.22, n, mix(aro, OURO_CL, 0.3), Math.PI / 6)
  tampa(g, x, z, y0 - h * 0.16, r * 1.22, n, mul(aro, 0.7), Math.PI / 6, true)
  if (!lod) for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.PI / 6 + Math.PI / n
    const ap = Math.cos(Math.PI / n) * r * 1.22
    for (const yy of [y0 - h * 0.08, y0 + h * 1.08]) rebite(g, [x + Math.cos(a) * ap, yy, z + Math.sin(a) * ap], [Math.cos(a), 0, Math.sin(a)], r * 0.07, OURO_CL)
  }
}

/** POSTE-LANTERNA baixo (ref 1, beira do caminho): pé quadrado de ferro, haste, lâmpada hexagonal e telhadinho pontudo. */
export function posteLanterna(c: Cena, x: number, z: number, h = 2.2, lod = 0) {
  const Q = quadro(x, z, 0)
  const g = geoEm(c, x, z)
  tronco(g, Q, 0, 0, 0, 0.35, 0.62, 0.62, 0.5, 0.5, FERRO_ESC, FERRO)
  tronco(g, Q, 0, 0, 0.35, h * 0.55, 0.26, 0.26, 0.2, 0.2, FERRO, FERRO_CL)
  cx(g, Q, 0, 0, 0.42, 0.42, h * 0.55 - 0.08, h * 0.55, OURO, OURO_CL)
  lampadaHex(c, x, h * 0.58, z, 0.22, h * 0.24, lod)
  const yt = h * 0.58 + h * 0.24 * 1.16
  tube(g, [x, yt, z], [x, yt + h * 0.12, z], 0.3, 0.06, 6, (k) => (k % 2 ? OURO : OURO_CL), true)
  if (!lod) tube(g, [x, yt + h * 0.1, z], [x, yt + h * 0.2, z], 0.05, 0.02, 5, () => FERRO_ESC, true)
  c.block(x, z, 0.32, 0.32, h)
}

/**
 * PILAR-LANTERNA da praça (ref 3): base larga de ferro com moldura de bronze e placa, fuste com DUAS lâmpadas
 * hexagonais (a de cima maior), aros e capitel rebitado; ganchos para os cabos. Devolve o ponto do cabo.
 */
export function pilarLanterna(c: Cena, x: number, z: number, h = 5, lod = 0): V3 {
  const Q = quadro(x, z, 0)
  const g = geoEm(c, x, z)
  const b = h * 0.24
  tronco(g, Q, 0, 0, 0, b * 0.18, b * 1.1, b * 1.1, b, b, FERRO_ESC, FERRO)
  tronco(g, Q, 0, 0, b * 0.18, b * 1.1, b * 0.92, b * 0.92, b * 0.8, b * 0.8, FERRO, FERRO_CL)
  // moldura de bronze da base (4 quinas) e a placa da frente
  for (const [su, sv] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) tronco(g, Q, su * b * 0.43, sv * b * 0.43, b * 0.18, b * 1.1, b * 0.12, b * 0.12, b * 0.1, b * 0.1, OURO, OURO_CL)
  cx(g, Q, 0, 0, b * 0.95, b * 0.95, b * 1.05, b * 1.2, OURO, OURO_CL)
  const r1 = b * 0.3, r2 = b * 0.36
  lampadaHex(c, x, b * 1.35, z, r1, h * 0.17, lod)
  tronco(g, Q, 0, 0, b * 1.35 + h * 0.2, h * 0.58, b * 0.62, b * 0.62, b * 0.56, b * 0.56, FERRO, OURO_CL)
  lampadaHex(c, x, h * 0.62, z, r2, h * 0.24, lod)
  const yt = h * 0.62 + h * 0.24 * 1.16
  tronco(g, Q, 0, 0, yt, yt + h * 0.06, b * 0.95, b * 0.95, b * 0.95, b * 0.95, OURO, OURO_CL)
  tronco(g, Q, 0, 0, yt + h * 0.06, yt + h * 0.1, b * 0.7, b * 0.7, b * 0.5, b * 0.5, FERRO, FERRO_CL)
  if (!lod) for (const [su, sv] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) rebite(g, Q.P(su * b * 0.4, sv * (b * 0.48), yt + h * 0.03), Q.N(0, sv), 0.06)
  c.block(x, z, b * 0.55, b * 0.55, h)
  return [x, yt - h * 0.02, z]
}
/** CABO grosso caído entre dois ganchos (catenária de 6 trechos), preto com reflexo. */
export function cabo(c: Cena, a: V3, b: V3, flecha = 1.2, r = 0.07, lod = 0) {
  const g = geoEm(c, (a[0] + b[0]) / 2, (a[2] + b[2]) / 2)
  const n = lod ? 3 : 7
  let prev = a
  for (let k = 1; k <= n; k++) {
    const t = k / n
    const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - flecha * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]
    tube(g, prev, p, r, r, 5, (j) => (j === 1 ? [0.36, 0.34, 0.4] : [0.1, 0.09, 0.12]), false)
    prev = p
  }
}

/** LANTERNA DE PAREDE (ref 1): mão-francesa de ferro, lanterna de 4 faces com telhado e argola. (x, z) = ponto na parede; y = meio do vidro. */
export function lanternaParede(c: Cena, x: number, z: number, ang: number, y: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z), GL = luzEm(c, x, z)
  const v = 0.55
  tube(g, Q.P(0, 0, y + 0.55), Q.P(0, v, y + 0.55), 0.05, 0.05, 4, () => FERRO_ESC, false)
  tube(g, Q.P(0, 0, y - 0.1), Q.P(0, v * 0.8, y + 0.5), 0.04, 0.04, 4, () => FERRO_ESC, false)
  const r = 0.2, h = 0.5
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    const P = (aa: number, yy: number): V3 => { const p = Q.P(Math.cos(aa) * r, v + Math.sin(aa) * r, yy); return p }
    const a1 = a + Math.PI / 2
    face(GL, [P(a, y - h / 2), P(a1, y - h / 2), P(a1, y + h / 2), P(a, y + h / 2)], [AMB, AMB, AMB_CL, AMB_CL], Q.N(Math.cos(a + Math.PI / 4), Math.sin(a + Math.PI / 4)))
    if (!lod) tube(g, P(a, y - h / 2), P(a, y + h / 2), 0.025, 0.025, 4, () => FERRO_ESC, false)
  }
  const p0 = Q.P(0, v, 0)
  tube(g, [p0[0], y - h / 2 - 0.08, p0[2]], [p0[0], y - h / 2, p0[2]], r * 1.5, r * 1.5, 4, () => OURO, false)
  tube(g, [p0[0], y + h / 2, p0[2]], [p0[0], y + h / 2 + 0.22, p0[2]], r * 1.6, 0.03, 4, (k) => (k % 2 ? OURO : OURO_CL), true)
}

// ═══════════════ MÁQUINAS ═══════════════

/**
 * ESTEIRA (inventário `esteira`): duas longarinas de ferro com a fita de bronze em cima, TAMBOR redondo nas
 * pontas com tampa de bronze, a lona escura por cima, pernas de ferro a cada 2,2 m com o X de travamento e
 * as tampas de bronze dos parafusos; em cima, LINGOTES cinza com a face de cima acesa e caixotes. Ao longo de
 * `ang` (eixo u da esteira = direção ang). Altura 1,1.
 */
export function esteiraCopia(c: Cena, x: number, z: number, L: number, ang: number, seed: number, lod = 0) {
  const Q = quadro(x, z, ang + Math.PI / 2) // u = ao longo da esteira
  const g = geoEm(c, x, z), GL = luzEm(c, x, z)
  const W = 1.5, yT = 1.1, R = 0.5
  // longarinas (as duas) e a fita de bronze
  for (const sv of [-1, 1]) {
    cx(g, Q, 0, sv * (W / 2 + 0.06), L - R * 2, 0.18, yT - 0.42, yT, FERRO, FERRO_CL)
    cx(g, Q, 0, sv * (W / 2 + 0.16), L - R * 2, 0.04, yT - 0.32, yT - 0.12, OURO, OURO_CL)
  }
  // lona por cima e por baixo
  face(g, [Q.P(-L / 2 + R, W / 2, yT + 0.02), Q.P(L / 2 - R, W / 2, yT + 0.02), Q.P(L / 2 - R, -W / 2, yT + 0.02), Q.P(-L / 2 + R, -W / 2, yT + 0.02)], [0.16, 0.14, 0.18], [0, 1, 0])
  // tambores das pontas (cilindro deitado + tampas de bronze)
  for (const su of [-1, 1]) {
    const cu = su * (L / 2 - R)
    const a = Q.P(cu, -W / 2 - 0.1, yT - R + 0.02), b = Q.P(cu, W / 2 + 0.1, yT - R + 0.02)
    tube(g, a, b, R, R, lod ? 6 : 12, (k) => (k % 2 ? [0.2, 0.18, 0.22] : [0.28, 0.26, 0.3]), false)
    for (const sv of [-1, 1]) {
      const p = Q.P(cu, sv * (W / 2 + 0.12), yT - R + 0.02)
      const q = Q.P(cu, sv * (W / 2 + 0.24), yT - R + 0.02)
      tube(g, p, q, R * 0.98, R * 0.98, lod ? 6 : 12, (k) => (k % 2 ? OURO : OURO_CL), true)
      if (!lod) tube(g, q, Q.P(cu, sv * (W / 2 + 0.34), yT - R + 0.02), R * 0.32, R * 0.25, 8, () => FERRO_ESC, true)
    }
  }
  // pernas com X
  const nP = Math.max(2, Math.round((L - R * 2) / 2.2) + 1)
  for (let i = 0; i < nP; i++) {
    const u = -L / 2 + R + ((L - R * 2) * i) / (nP - 1)
    for (const sv of [-1, 1]) {
      cx(g, Q, u, sv * (W / 2 + 0.06), 0.22, 0.22, 0, yT - 0.42, FERRO_ESC, FERRO)
      cx(g, Q, u, sv * (W / 2 + 0.06), 0.4, 0.4, 0, 0.1, FERRO, FERRO_CL)
      if (!lod) {
        const p = Q.P(u, sv * (W / 2 + 0.17), yT - 0.27)
        tube(g, p, Q.P(u, sv * (W / 2 + 0.27), yT - 0.27), 0.12, 0.1, 8, () => OURO_CL, true)
      }
    }
    if (!lod) {
      tube(g, Q.P(u, -W / 2, 0.15), Q.P(u, W / 2, yT - 0.5), 0.05, 0.05, 4, () => FERRO_ESC, false)
      tube(g, Q.P(u, W / 2, 0.15), Q.P(u, -W / 2, yT - 0.5), 0.05, 0.05, 4, () => FERRO_ESC, false)
    }
  }
  // carga: lingotes acesos e caixotes
  const nC = Math.floor((L - R * 2) / 1.7)
  for (let i = 0; i < nC; i++) {
    const u = -L / 2 + R + 0.85 + i * 1.7
    const r = rnd(seed, i)
    if (r < 0.62) {
      cx(g, Q, u, 0, 0.95, 0.62, yT + 0.02, yT + 0.36, FERRO_CL, undefined, mix(FERRO, FERRO_CL, 0.5))
      tronco(g, Q, u, 0, yT + 0.36, yT + 0.44, 0.95, 0.62, 0.82, 0.5, FERRO_CL)
      face(GL, [Q.P(u - 0.36, 0.2, yT + 0.445), Q.P(u + 0.36, 0.2, yT + 0.445), Q.P(u + 0.36, -0.2, yT + 0.445), Q.P(u - 0.36, -0.2, yT + 0.445)], [AMB, AMB_CL, AMB, AMB_ESC], [0, 1, 0])
    } else if (r < 0.82) {
      const p = Q.P(u, 0, 0)
      caixote(c, p[0], p[2], 0.8, Q.rot * -1 + rnd(seed, i, 2) * 0.4, yT + 0.02, lod, false)
    }
  }
  bloq(c, Q, 0, 0, L, W + 0.6, yT + 0.3)
}

/**
 * GARRA (inventário `garra-guindaste`): pórtico de ferro (coluna presa à parede), a VIGA TRELIÇADA amarela
 * (banzos + X), o carrinho e a PINÇA de 4 dedos curvos de ferro com juntas de bronze. Em (x, z) fica a
 * coluna; a viga sai para a frente (`ang`) por `L` m, a pinça pendurada na ponta a `yPinca`.
 */
export function garra(c: Cena, x: number, z: number, ang: number, L = 4.5, h = 5.6, yPinca = 2.6, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z)
  cx(g, Q, 0, 0, 0.6, 0.6, 0, h + 0.4, FERRO, FERRO_CL)
  cx(g, Q, 0, 0, 0.75, 0.75, 0, 0.3, FERRO_ESC, FERRO)
  for (const yy of [h * 0.35, h * 0.7]) cx(g, Q, 0, 0, 0.7, 0.7, yy, yy + 0.16, OURO, OURO_CL)
  // viga treliçada: banzos de cima e de baixo e as diagonais (as duas faces)
  const y0 = h - 0.55, y1 = h + 0.05
  for (const sw of [-0.22, 0.22]) {
    tube(g, Q.P(sw, 0.2, y1), Q.P(sw, L, y1), 0.09, 0.09, 4, (k) => (k % 2 ? OURO : OURO_CL), false)
    tube(g, Q.P(sw, 0.2, y0), Q.P(sw, L, y0), 0.09, 0.09, 4, (k) => (k % 2 ? OURO : OURO_CL), false)
    if (!lod) {
      const n = Math.round(L / 0.6)
      for (let i = 0; i < n; i++) {
        const v0 = 0.2 + ((L - 0.2) * i) / n, v1 = 0.2 + ((L - 0.2) * (i + 1)) / n
        tube(g, Q.P(sw, v0, i % 2 ? y0 : y1), Q.P(sw, v1, i % 2 ? y1 : y0), 0.05, 0.05, 4, () => mix(OURO, OURO_ESC, 0.2), false)
      }
    }
  }
  // mão-francesa da coluna até a viga e a tampa da ponta
  tube(g, Q.P(0, 0.3, h - 1.6), Q.P(0, 1.3, y0), 0.08, 0.08, 4, () => FERRO, false)
  cx(g, Q, 0, L, 0.7, 0.3, y0 - 0.05, y1 + 0.1, OURO, OURO_CL)
  // carrinho e cabo
  const vC = L - 0.6
  cx(g, Q, 0, vC, 0.7, 0.8, y0 - 0.4, y0 - 0.02, FERRO_ESC, OURO)
  tube(g, Q.P(0, vC, y0 - 0.4), Q.P(0, vC, yPinca + 0.7), 0.04, 0.04, 4, () => FERRO_ESC, false)
  // pinça: cubo de bronze + 4 dedos de 2 gomos curvados para dentro
  const k5 = 1.6
  cx(g, Q, 0, vC, 0.56 * k5, 0.56 * k5, yPinca + 0.25 * k5, yPinca + 0.75 * k5, OURO, OURO_CL)
  cx(g, Q, 0, vC, 0.36 * k5, 0.36 * k5, yPinca + 0.75 * k5, yPinca + 0.9 * k5, FERRO_ESC, FERRO)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    const du = Math.cos(a), dv = Math.sin(a)
    const p0 = Q.P(du * 0.28 * k5, vC + dv * 0.28 * k5, yPinca + 0.3 * k5)
    const p1 = Q.P(du * 0.6 * k5, vC + dv * 0.6 * k5, yPinca - 0.15 * k5)
    const p2 = Q.P(du * 0.34 * k5, vC + dv * 0.34 * k5, yPinca - 0.7 * k5)
    tube(g, p0, p1, 0.1 * k5, 0.08 * k5, 4, () => FERRO, false)
    tube(g, p1, p2, 0.08 * k5, 0.02, 4, () => FERRO_CL, true)
    if (!lod) tube(g, [p1[0], p1[1] - 0.1, p1[2]], [p1[0], p1[1] + 0.1, p1[2]], 0.13, 0.13, 6, () => OURO_CL, true)
  }
  c.block(x, z, 0.4, 0.4, h)
}

/**
 * FORNALHA (inventário `fornalha`): carcaça de ferro em ARCO CHANFRADO (8 lados) com moldura de bronze e
 * rebites, a BOCA acesa (fogo amarelo embaixo → laranja, a borda das chamas em dente) com a GRADE de barras no
 * alto, a soleira de brasas; atrás, a torre com janela acesa, o cano grosso em cotovelo e o volante de bronze.
 * Frente para `ang`. Ocupa ~4,4 × 3 m; 4,6 m de altura (sem o cano).
 */
export function fornalha(c: Cena, x: number, z: number, ang: number, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z), GL = luzEm(c, x, z)
  const hw = 2.2, H = 3.2, ch = 0.8, D = 2.6
  // contorno em arco chanfrado (u, y)
  const out: UV[] = [[-hw, 0], [hw, 0], [hw, H - ch], [hw - ch, H], [-hw + ch, H], [-hw, H - ch]]
  const mw = 1.35, mH = 2.05, mch = 0.5
  const boca: UV[] = [[-mw, 0.35], [mw, 0.35], [mw, mH - mch], [mw - mch, mH], [-mw + mch, mH], [-mw, mH - mch]]
  // corpo: prisma do contorno (frente, trás, lados)
  for (const [v, dentro] of [[0, false], [-D, true]] as const) {
    // frente com a boca vazada: faixas entre o contorno de fora e o da boca
    if (!dentro) {
      const pares: [UV, UV][] = [[out[0], [-mw, 0]], [out[5], boca[5]], [out[4], boca[4]], [out[3], boca[3]], [out[2], boca[2]], [out[1], [mw, 0]]]
      for (let k = 0; k < pares.length - 1; k++) poli(g, Q, [pares[k][0], pares[k + 1][0], pares[k + 1][1], pares[k][1]], v, FERRO)
    } else poli(g, Q, out, v, FERRO_ESC, true)
  }
  for (let k = 0; k < out.length; k++) {
    const a = out[k], b = out[(k + 1) % out.length]
    if (k === 0) continue
    face(g, [Q.P(a[0], 0, a[1]), Q.P(b[0], 0, b[1]), Q.P(b[0], -D, b[1]), Q.P(a[0], -D, a[1])], k === 3 ? FERRO_CL : FERRO, Q.N(a[0] + b[0], 0, a[1] + b[1] - H))
  }
  // moldura de bronze saliente (fita no contorno de fora e na boca) com rebites
  const fita = (pts: UV[], v: number, w: number, fechado: boolean) => {
    const n = fechado ? pts.length : pts.length - 1
    for (let k = 0; k < n; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length]
      tube(g, Q.P(a[0], v, a[1]), Q.P(b[0], v, b[1]), w, w, 4, (j) => (j % 2 ? OURO : OURO_CL), false)
      if (!lod) for (const t of [0.25, 0.75]) rebite(g, Q.P(a[0] + (b[0] - a[0]) * t, v + w, a[1] + (b[1] - a[1]) * t), Q.N(0, 1), 0.05)
    }
  }
  fita([out[0], out[5], out[4], out[3], out[2], out[1]].map(([u, y]): UV => [u * 0.94, y === 0 ? 0 : y * 0.96]), 0.05, 0.11, false)
  fita([[-mw - 0.12, 0.3], ...boca.slice(2).reverse().map(([u, y]): UV => [u + Math.sign(u) * 0.12, y + 0.1]), [mw + 0.12, 0.3]].reverse() as UV[], 0.05, 0.09, false)
  // o fundo da boca: fogo (degradê), as chamas em dente na frente e a grade
  const vb = -0.7
  poli(GL, Q, boca, vb, boca.map(([, y]): RGB => (y < 1 ? AMB_CL : y < 1.6 ? AMB : AMB_ESC)))
  for (const s of [-1, 1]) face(g, [Q.P(s * mw, 0, 0.35), Q.P(s * mw, vb, 0.35), Q.P(s * mw, vb, mH - mch), Q.P(s * mw, 0, mH - mch)], FERRO_ESC, Q.N(-s, 0))
  if (!lod) {
    const nC = 7
    for (let k = 0; k < nC; k++) {
      const u0 = -mw + (2 * mw * k) / nC, u1 = u0 + (2 * mw) / nC
      const top = 1.05 + rnd(k, 3) * 0.35
      poli(GL, Q, [[u0, 0.36], [u1, 0.36], [(u0 + u1) / 2 + 0.05, top]], vb + 0.2, [AMB, AMB, AMB_CL])
      poli(GL, Q, [[u0 + 0.05, 0.36], [u1 - 0.05, 0.36], [(u0 + u1) / 2 - 0.04, top * 0.7]], vb + 0.3, [AMB_CL, AMB_CL, [1, 1, 0.8]])
    }
    // grade: barras verticais no terço de cima da boca, com a travessa
    for (let k = 1; k < 7; k++) {
      const u = -mw + (2 * mw * k) / 7
      cx(g, Q, u, -0.08, 0.14, 0.14, 1.45, mH - (Math.abs(u) > mw - mch ? mch * 0.8 : 0.05), FERRO_ESC, FERRO)
    }
    cx(g, Q, 0, -0.08, 2 * mw, 0.16, 1.38, 1.5, FERRO, OURO)
    // soleira com brasas (dentes escuros sobre o laranja)
    cx(g, Q, 0, 0.2, 2 * mw + 0.4, 0.5, 0, 0.32, FERRO_ESC, FERRO)
    for (let k = 0; k < 6; k++) cx(g, Q, -mw + 0.25 + k * ((2 * mw - 0.5) / 5), 0.42, 0.28, 0.14, 0.32, 0.42, FERRO_ESC, FERRO)
    poli(GL, Q, [[-mw, 0.33], [mw, 0.33], [mw, 0.4], [-mw, 0.4]], 0.46, AMB_ESC)
  }
  // atrás: torre com janela acesa, cano grosso em cotovelo e volante
  const tv = -D - 0.9
  cx(g, Q, 0.4, tv, 1.9, 1.8, 0, H + 2.2, FERRO, FERRO_CL, FERRO_CL)
  tronco(g, Q, 0.4, tv, H + 2.2, H + 2.6, 2.1, 2, 1.6, 1.5, OURO, OURO_CL)
  poli(GL, Q, arco(0.4, H + 0.6, H + 1.4, 0.32, lod ? 2 : 5), tv + 0.92, [AMB_ESC, AMB_ESC, AMB, AMB, AMB_CL, AMB, AMB, AMB_ESC].slice(0, lod ? 5 : 8))
  for (let k = 0; k < 3; k++) cx(g, Q, 0.4 - 0.2 + k * 0.2, tv + 0.92, 0.04, 0.03, H + 0.6, H + 1.6, FERRO_ESC)
  const p0 = Q.P(-1.3, tv + 0.5, H + 1.2)
  cano(c, Q.P(-1.3, tv + 0.5, 0), p0, 0.42, lod)
  cotovelo(c, p0, Q.P(-0.3, tv + 0.5, H + 2.2), Q.P(-1.3, tv + 0.5, H + 2.2), 0.42, lod)
  // volante (roda de 8 raios de bronze) no cano, de lado
  if (!lod) {
    const ctr = Q.P(-1.3, tv + 1.05, 2.1)
    engrenagemCopia(g, ctr, [Q.sx, 0, Q.sz], [0, 1, 0], 0.55, 0.08, lod, { dentes: 16, raios: 8, cor: OURO, furo: true })
  }
  bloq(c, Q, 0, -D / 2, 2 * hw, D, H)
  bloq(c, Q, 0.2, tv, 2.6, 1.9, H + 2.6)
}

/**
 * TANQUE-CALDEIRA (ref 1, direita): tanque de cobre de 12 faces com aros de bronze rebitados, janela oval acesa,
 * cúpula em 2 anéis com a tampa, fundo em funil e as 4 pernas de ferro com o X. (x, z) = centro.
 */
export function tanqueCaldeira(c: Cena, x: number, z: number, R = 2, lod = 0) {
  const g = geoEm(c, x, z), GL = luzEm(c, x, z)
  const n = lod ? 8 : 12, y0 = 2.4, H = 3.2
  const cob = (k: number) => (k % 2 ? COBRE : mix(COBRE, COBRE_CL, 0.4))
  anel(g, x, z, y0 - 1.1, y0, R * 0.25, R, n, (k) => mul(cob(k), 0.8))
  anel(g, x, z, y0, y0 + H, R, R, n, cob)
  for (const yy of [y0 + 0.2, y0 + H * 0.5, y0 + H - 0.25]) anel(g, x, z, yy - 0.15, yy + 0.15, R * 1.05, R * 1.05, n, (k) => (k % 2 ? OURO : OURO_CL))
  anel(g, x, z, y0 + H, y0 + H + 0.6, R, R * 0.78, n, cob)
  anel(g, x, z, y0 + H + 0.6, y0 + H + 1, R * 0.78, R * 0.4, n, (k) => (k % 2 ? FERRO_CL : FERRO))
  anel(g, x, z, y0 + H + 1, y0 + H + 1.25, R * 0.42, R * 0.42, n, () => OURO)
  tampa(g, x, z, y0 + H + 1.25, R * 0.42, n, OURO_CL)
  // janela oval acesa (virada para −z e +z: os dois lados que o caminho vê)
  for (const s of [-1, 1]) {
    const pts: V3[] = Array.from({ length: lod ? 6 : 12 }, (_, k): V3 => { const a = (k / (lod ? 6 : 12)) * Math.PI * 2; return [x + Math.cos(a) * 0.32, y0 + H * 0.72 + Math.sin(a) * 0.62, z + s * (R + 0.04)] })
    face(GL, pts, pts.map((p): RGB => (p[1] > y0 + H * 0.72 ? AMB_CL : AMB)), [0, 0, s])
    if (!lod) for (let k = 0; k < pts.length; k++) tube(g, pts[k], pts[(k + 1) % pts.length], 0.07, 0.07, 4, () => OURO, false)
  }
  // pernas e X
  const pr = R * 0.8
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    const px = x + Math.cos(a) * pr, pz = z + Math.sin(a) * pr
    tube(g, [px, 0, pz], [px, y0 + 0.3, pz], 0.16, 0.16, 4, (j) => (j % 2 ? FERRO : FERRO_CL), false)
    if (!lod) {
      const b = (k + 1) % 4, ab = (b / 4) * Math.PI * 2 + Math.PI / 4
      const qx = x + Math.cos(ab) * pr, qz = z + Math.sin(ab) * pr
      tube(g, [px, 0.2, pz], [qx, y0 - 0.2, qz], 0.06, 0.06, 4, () => FERRO_ESC, false)
      tube(g, [qx, 0.2, qz], [px, y0 - 0.2, pz], 0.06, 0.06, 4, () => FERRO_ESC, false)
    }
  }
  c.block(x, z, R * 0.8, R * 0.8, y0 + H + 1.2)
}

/**
 * CHAMINÉ-FAROL (ref 1, fundo): torre de ferro de 8 faces que afina, aros de bronze, a LANTERNA acesa no alto
 * (8 janelas com montantes), o capitel e a fumaça. `h` = altura até o capitel.
 */
export function chamineFarol(c: Cena, x: number, z: number, h = 18, r = 1.5, lod = 0, fumaca = true, g0?: G, GL0?: G) {
  const g = g0 ?? geoEm(c, x, z), GL = GL0 ?? luzEm(c, x, z)
  const n = lod ? 6 : 8
  const f = (k: number) => (k % 2 ? FERRO : mix(FERRO, FERRO_CL, 0.4))
  anel(g, x, z, 0, h * 0.72, r * 1.2, r, n, f)
  for (const t of [0.2, 0.45, 0.7]) anel(g, x, z, h * t - 0.25, h * t + 0.25, r * (1.2 - t * 0.28) * 1.08, r * (1.2 - t * 0.28) * 1.08, n, (k) => (k % 2 ? OURO : OURO_CL))
  // lanterna acesa
  const y0 = h * 0.74, y1 = h * 0.92
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2 + 0.06, a1 = ((k + 1) / n) * Math.PI * 2 - 0.06
    const R = r * 1.01
    face(GL, [[x + Math.cos(a0) * R, y0, z + Math.sin(a0) * R], [x + Math.cos(a1) * R, y0, z + Math.sin(a1) * R], [x + Math.cos(a1) * R, y1, z + Math.sin(a1) * R], [x + Math.cos(a0) * R, y1, z + Math.sin(a0) * R]], [AMB_ESC, AMB_ESC, AMB_CL, AMB_CL], [Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)])
  }
  anel(g, x, z, y0, y1, r * 0.98, r * 0.98, n, () => FERRO_ESC)
  anel(g, x, z, y1, y1 + 0.35, r * 1.18, r * 1.18, n, (k) => (k % 2 ? OURO : OURO_CL))
  anel(g, x, z, y1 + 0.35, h, r * 1.05, r * 0.9, n, f)
  anel(g, x, z, h, h + 0.4, r * 1.15, r * 1.15, n, (k) => (k % 2 ? OURO : OURO_CL))
  tampa(g, x, z, h + 0.4, r * 1.15, n, FERRO_ESC)
  if (fumaca && !lod) {
    const FUM = { dark: [0.76, 0.68, 0.72] as RGB, mid: [0.9, 0.84, 0.84] as RGB, hi: [1, 0.97, 0.95] as RGB }
    for (let k = 0; k < 4; k++) blob(GL, [x + k * 0.7, h + 1.4 + k * 1.5, z + k * 0.2], [r * (0.8 + k * 0.35), r * (0.6 + k * 0.25), r * (0.8 + k * 0.35)], FUM, Math.round(x * 7 + z) + k)
  }
}

// ═══════════════ PAREDES, PORTÕES, PASSARELA ═══════════════

/**
 * ESTANDARTE (o da ref 1 com a ENGRENAGEM, o da ref 3 com a ÁGUIA): pano bordô com borda dourada, a ponta em V
 * com o losango, a barra de bronze em cima e o emblema de ouro. (u, yTopo) no plano v de um quadro.
 */
export function estandarte(g: G, GL: G, Q: Q, u: number, v: number, yT: number, w: number, h: number, emblema: "engrenagem" | "aguia" = "engrenagem") {
  const hw = w / 2
  poli(g, Q, [[u - hw, yT], [u + hw, yT], [u + hw, yT - h * 0.78], [u, yT - h], [u - hw, yT - h * 0.78]], v, [PANO, PANO, PANO_ESC, mul(PANO_ESC, 0.9), PANO_ESC])
  // borda dourada (fita) nas laterais e no V
  const b = 0.07
  for (const s of [-1, 1]) {
    poli(g, Q, [[u + s * hw, yT], [u + s * (hw - b), yT], [u + s * (hw - b), yT - h * 0.77], [u + s * hw, yT - h * 0.78]], v + 0.01, OURO)
    poli(g, Q, [[u + s * hw, yT - h * 0.78], [u + s * (hw - b * 1.4), yT - h * 0.78], [u, yT - h + b * 2], [u, yT - h]], v + 0.01, OURO)
  }
  poli(GL, Q, [[u, yT - h * 0.86], [u + 0.08, yT - h * 0.82], [u, yT - h * 0.78], [u - 0.08, yT - h * 0.82]], v + 0.02, OURO_CL)
  tube(g, Q.P(u - hw - 0.25, v + 0.06, yT + 0.06), Q.P(u + hw + 0.25, v + 0.06, yT + 0.06), 0.06, 0.06, 6, () => OURO, false)
  for (const s of [-1, 1]) tube(g, Q.P(u + s * (hw + 0.2), v + 0.06, yT + 0.06), Q.P(u + s * (hw + 0.36), v + 0.06, yT + 0.06), 0.1, 0.03, 6, () => OURO_CL, true)
  const ey = yT - h * 0.38, er = hw * 0.6
  if (emblema === "engrenagem") {
    // engrenagem chapada: 8 dentes + o furo escuro
    const pts: UV[] = []
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      const rr = k % 2 ? er * 0.78 : er
      pts.push([u + Math.cos(a) * rr, ey + Math.sin(a) * rr])
    }
    for (let k = 0; k < 16; k++) poli(g, Q, [[u, ey], pts[k], pts[(k + 1) % 16]], v + 0.02, k % 2 ? OURO : OURO_CL)
    poli(g, Q, Array.from({ length: 8 }, (_, k): UV => [u + Math.cos((k / 8) * Math.PI * 2) * er * 0.36, ey + Math.sin((k / 8) * Math.PI * 2) * er * 0.36]), v + 0.03, PANO_ESC)
  } else {
    // águia de asas abertas: corpo, cabeça, asas em 3 penas de cada lado, cauda
    poli(g, Q, [[u, ey + er * 0.75], [u + er * 0.18, ey + er * 0.4], [u + er * 0.14, ey - er * 0.5], [u, ey - er * 0.8], [u - er * 0.14, ey - er * 0.5], [u - er * 0.18, ey + er * 0.4]], v + 0.02, OURO_CL)
    for (const s of [-1, 1])
      for (let k = 0; k < 3; k++) {
        const y0 = ey + er * (0.35 - k * 0.22)
        poli(g, Q, [[u + s * er * 0.15, y0], [u + s * er * (1.1 - k * 0.18), y0 + er * (0.4 - k * 0.12)], [u + s * er * (1 - k * 0.2), y0 + er * (0.18 - k * 0.12)], [u + s * er * 0.15, y0 - er * 0.18]], v + 0.02, k % 2 ? OURO : OURO_CL)
      }
    poli(g, Q, [[u - er * 0.3, ey - er * 0.7], [u + er * 0.3, ey - er * 0.7], [u, ey - er * 1.05]], v + 0.02, OURO)
  }
}

/**
 * FACHADA DE TIJOLO (inventário `fachada-tijolo`, ref 1 esquerda): parede em FIADAS de tijolo (dois tons e
 * rejunte), embasamento de pedra, PILASTRAS de ferro com aros de bronze e rebites a cada `vao` m, entre elas
 * a JANELA EM ARCO acesa (grade de 3 × 4 + soleira de pedra + aduela de bronze), lanternas de parede, um
 * ESTANDARTE de engrenagem a cada 3 vãos e o CANO GROSSO de cobre correndo no alto com aros e cotovelos.
 * Plano v = 0 (frente para `ang`), de u = −w/2 a w/2, altura h. Só a frente — o corpo é de quem chama.
 */
export function fachadaTijolo(c: Cena, x: number, z: number, ang: number, w: number, h: number, seed: number, lod = 0, o: { cano?: boolean; vao?: number; detalhe?: boolean } = {}) {
  const Q = quadro(x, z, ang)
  const vao = o.vao ?? 4.4
  const n = Math.max(1, Math.round(w / vao))
  const pv = w / n
  // fiadas de tijolo por vão (o pé do vão decide o bloco)
  for (let i = 0; i < n; i++) {
    const u0 = -w / 2 + i * pv, u1 = u0 + pv, um = (u0 + u1) / 2
    const pm = Q.P(um, 0, 0)
    const g = geoEm(c, pm[0], pm[2]), GL = luzEm(c, pm[0], pm[2])
    // embasamento de pedra (1 m) com cornija
    cx(g, Q, um, 0.12, pv, 0.24, 0, 1, FERRO, FERRO_CL)
    // tijolos: fiadas de 0,32 m, tijolos de 0,7 m deslocados meio tijolo a cada fiada
    const fy = 0.32, tw = 0.7
    if (lod) poli(g, Q, [[u0, 1], [u1, 1], [u1, h], [u0, h]], 0, [TIJ_ESC, TIJ_ESC, TIJ, TIJ])
    else {
      poli(g, Q, [[u0, 1], [u1, 1], [u1, h], [u0, h]], -0.005, REJUNTE)
      const yTij = o.detalhe === false ? 1 : Math.min(h, 6.1)
      for (let r = 0, y = 1; y < h - 0.01; r++, y += fy) {
        if (y >= yTij) {
          // fiada em faixa: o tom alterna e o rejunte aparece entre as fiadas (barato, lido de longe)
          const t = rnd(seed + i, r, 5)
          const cor = r % 2 ? (t < 0.5 ? TIJ : TIJ_CL) : t < 0.5 ? TIJ_ESC : TIJ
          poli(g, Q, [[u0, y + 0.025], [u1, y + 0.025], [u1, Math.min(h, y + fy - 0.025)], [u0, Math.min(h, y + fy - 0.025)]], 0.012, [mul(cor, 0.9), mul(cor, 0.9), cor, cor])
          continue
        }
        const off = (r % 2) * tw * 0.5
        for (let uu = u0 - off; uu < u1; uu += tw) {
          const a = Math.max(u0, uu + 0.025), b = Math.min(u1, uu + tw - 0.025)
          if (b - a < 0.1) continue
          const t = rnd(seed + i, Math.round(uu * 10), r)
          const cor = t < 0.33 ? TIJ_ESC : t < 0.8 ? TIJ : TIJ_CL
          poli(g, Q, [[a, y + 0.025], [b, y + 0.025], [b, Math.min(h, y + fy - 0.025)], [a, Math.min(h, y + fy - 0.025)]], 0.012, [mul(cor, 0.88), mul(cor, 0.88), cor, cor])
        }
      }
    }
    // janela em arco acesa no meio do vão
    const jw = Math.min(1.25, pv * 0.3), jy0 = 2.2, jyb = Math.min(h - jw - 1.2, 4.6)
    if (jyb > jy0 + 0.8) {
      poli(g, Q, arco(um, jy0 - 0.15, jyb, jw + 0.28, lod ? 3 : 8), 0.03, TIJ_ESC)
      const ar = arco(um, jy0, jyb, jw, lod ? 3 : 8)
      poli(GL, Q, ar, 0.05, ar.map(([, y]): RGB => (y < jy0 + 0.6 ? AMB : y < jyb ? AMB_CL : AMB)))
      if (!lod) {
        // grade: 2 montantes e 3 travessas + o raio do arco
        for (const du of [-jw / 3, jw / 3]) cx(g, Q, um + du, 0.08, 0.07, 0.05, jy0, jyb + Math.sqrt(Math.max(0, jw * jw - du * du)), FERRO_ESC)
        for (const yy of [jy0 + (jyb - jy0) * 0.33, jy0 + (jyb - jy0) * 0.66, jyb]) cx(g, Q, um, 0.08, 2 * jw, 0.05, yy - 0.035, yy + 0.035, FERRO_ESC)
        // soleira de pedra e aduela (pedra-chave) de bronze
        cx(g, Q, um, 0.14, 2 * jw + 0.5, 0.28, jy0 - 0.35, jy0 - 0.12, FERRO_CL, mix(FERRO_CL, OURO_CL, 0.2))
        tronco(g, Q, um, 0.1, jyb + jw + 0.05, jyb + jw + 0.5, 0.26, 0.2, 0.4, 0.2, OURO, OURO_CL)
        // moldura de tijolo saliente no arco
        const am = arco(um, jy0 - 0.1, jyb, jw + 0.18, 8).slice(2)
        for (let k = 0; k < am.length - 1; k++) tube(g, Q.P(am[k][0], 0.06, am[k][1]), Q.P(am[k + 1][0], 0.06, am[k + 1][1]), 0.1, 0.1, 4, (j) => (j % 2 ? TIJ_ESC : TIJ), false)
      }
    }
    // estandarte (1 a cada 3 vãos) entre a janela e a pilastra
    if (!lod && i % 3 === 1 && h > 7) estandarte(g, GL, Q, u0 + pv * 0.18, 0.06, h - 1.3, 1, 3.6, "engrenagem")
    if (!lod && i % 3 === 2) lanternaParede(c, Q.P(u0 + pv * 0.16, 0, 0)[0], Q.P(u0 + pv * 0.16, 0, 0)[2], ang, 4.6, lod)
  }
  // pilastras de ferro nas juntas dos vãos (com aros e rebites)
  for (let i = 0; i <= n; i++) {
    const u = -w / 2 + i * pv
    const pp = Q.P(u, 0, 0)
    const g = geoEm(c, pp[0], pp[2])
    cx(g, Q, u, 0.2, 0.75, 0.4, 0, h + 0.2, FERRO, FERRO_CL, mix(FERRO, FERRO_CL, 0.25))
    if (!lod) {
      cx(g, Q, u, 0.3, 0.5, 0.25, 0.4, h, FERRO_ESC)
      for (const yy of [1.2, h * 0.5, h - 0.6]) {
        cx(g, Q, u, 0.22, 0.9, 0.5, yy, yy + 0.25, OURO, OURO_CL)
        for (const s of [-1, 1]) rebite(g, Q.P(u + s * 0.3, 0.48, yy + 0.125), Q.N(0, 1), 0.05)
      }
    }
  }
  // cornija de cima
  for (let i = 0; i < n; i++) {
    const um = -w / 2 + (i + 0.5) * pv, pm = Q.P(um, 0, 0)
    cx(geoEm(c, pm[0], pm[2]), Q, um, 0.15, pv + 0.02, 0.5, h - 0.25, h + 0.1, FERRO_CL, OURO)
  }
  // o cano grosso de cobre correndo no alto (com cotovelo descendo numa ponta)
  if (o.cano !== false && !lod) {
    const yC = h - 1.2
    const a = Q.P(-w / 2 + 0.6, 0.85, yC), b = Q.P(w / 2 - 0.6, 0.85, yC)
    cano(c, a, b, 0.42, lod)
    if (rnd(seed, 77) < 0.6) {
      const s = rnd(seed, 78) < 0.5 ? -1 : 1
      const e = Q.P(s * (w / 2 - 0.6), 0.85, yC), dn = Q.P(s * (w / 2 - 0.6), 0.85 + 1.1, yC - 1.1)
      cotovelo(c, e, dn, Q.P(s * (w / 2 - 0.6), 0.85, yC - 1.1), 0.42, lod)
      cano(c, dn, Q.P(s * (w / 2 - 0.6), 1.95, 0), 0.42, lod)
    }
  }
}

/**
 * GALPÃO DE TIJOLO (substitui o galpão genérico): corpo de tijolo com a FACHADA copiada virada para `ang`, os
 * lados em tijolo liso com pilastras, telhado de chapa e, se `chamine`, a CHAMINÉ-FAROL atrás. (x, z) = centro.
 */
export function galpaoTijolo(c: Cena, x: number, z: number, w: number, d: number, h: number, ang: number, seed: number, lod = 0, chamine = true, detalhe = true) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z)
  cx(g, Q, 0, 0, w, d, 0, h, TIJ_ESC, mix(FERRO, FERRO_CL, 0.4), TIJ)
  // lados: pilastras de ferro (sem tijolo um a um: só a frente leva a fiada)
  if (!lod)
    for (const su of [-1, 1])
      for (let k = 0; k <= Math.floor(d / 4); k++) cx(g, Q, su * (w / 2 + 0.15), d / 2 - 0.4 - k * 4, 0.3, 0.6, 0, h, FERRO, FERRO_CL)
  fachadaTijolo(c, Q.P(0, d / 2, 0)[0], Q.P(0, d / 2, 0)[2], ang, w, h, seed, lod, { detalhe })
  // telhado de duas águas em chapa (ao longo de u), baixo
  const yr = h + 0.1, yc = h + Math.min(2.2, d * 0.18)
  for (const sv of [-1, 1]) face(g, [Q.P(-w / 2 - 0.3, sv * (d / 2 + 0.3), yr), Q.P(w / 2 + 0.3, sv * (d / 2 + 0.3), yr), Q.P(w / 2 + 0.3, 0, yc), Q.P(-w / 2 - 0.3, 0, yc)], sv > 0 ? FERRO_CL : FERRO, Q.N(0, sv, 1.5))
  for (const su of [-1, 1]) face(g, [Q.P(su * (w / 2), d / 2, yr), Q.P(su * (w / 2), -d / 2, yr), Q.P(su * (w / 2), 0, yc)], TIJ_ESC, Q.N(su, 0))
  bloq(c, Q, 0, 0, w, d, h)
  if (chamine) {
    const su = rnd(seed, 9) > 0.5 ? 1 : -1
    const p = Q.P(su * w * 0.28, -d * 0.18, 0)
    chamineFarol(c, p[0], p[2], h + 6 + rnd(seed, 3) * 8, 1.1, lod, true, g, luzEm(c, x, z))
  }
}

/**
 * PORTÃO DE ARCO (ref 1 ao fundo; ref 2 com a engrenagem no arco): pilares de tijolo com pilastras de ferro, o
 * ARCO de aduelas de tijolo com a moldura de bronze, a ENGRENAGEM de ouro em cima e o frontão de ferro.
 * Vão `vao` (m) centrado em (x, z), atravessado na direção `ang`.
 */
export function portaoArco(c: Cena, x: number, z: number, ang: number, vao = 8, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z), GL = luzEm(c, x, z)
  const hw = vao / 2, pw = 2.2, H = 7.2, D = 2.4
  for (const s of [-1, 1]) {
    cx(g, Q, s * (hw + pw / 2), 0, pw, D, 0, H + hw * 0.4 + 1.6, TIJ, OURO, TIJ)
    for (const ds of [-1, 1]) cx(g, Q, s * (hw + pw / 2) + ds * (pw / 2 - 0.2), D / 2 + 0.05, 0.5, 0.3, 0, H + hw * 0.4 + 1.6, FERRO, FERRO_CL)
    if (!lod) for (const yy of [1.5, H - 1]) cx(g, Q, s * (hw + pw / 2), D / 2 + 0.1, pw + 0.2, 0.3, yy, yy + 0.3, OURO, OURO_CL)
    bloq(c, Q, s * (hw + pw / 2), 0, pw, D, H + 2)
  }
  // arco: aduelas (caixas giradas não: faixas de tijolo entre dois semicírculos), frente e trás + intradorso
  const seg = lod ? 5 : 11, R0 = hw, R1 = hw + 1.3, yb = H - hw * 0.3
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI, a1 = ((k + 1) / seg) * Math.PI
    const P = (a: number, r: number, v: number) => Q.P(Math.cos(a) * r, v, yb + Math.sin(a) * r)
    const cor = k % 2 ? TIJ : TIJ_CL
    for (const sv of [-1, 1]) face(g, [P(a0, R0, (sv * D) / 2), P(a1, R0, (sv * D) / 2), P(a1, R1, (sv * D) / 2), P(a0, R1, (sv * D) / 2)], cor, Q.N(0, sv))
    face(g, [P(a0, R0, -D / 2), P(a1, R0, -D / 2), P(a1, R0, D / 2), P(a0, R0, D / 2)], TIJ_ESC, Q.N(-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)))
    if (!lod) tube(g, P(a0, R1 + 0.08, D / 2 + 0.05), P(a1, R1 + 0.08, D / 2 + 0.05), 0.12, 0.12, 4, (j) => (j % 2 ? OURO : OURO_CL), false)
  }
  // os cantos acima do arco até o frontão (tímpanos de tijolo) e a viga de ferro em cima
  const yT = yb + R1 + 0.4
  for (const sv of [-1, 1])
    for (const s of [-1, 1]) {
      const arcoPts: UV[] = Array.from({ length: 5 }, (_, k): UV => { const a = s > 0 ? (k / 4) * (Math.PI / 2) : Math.PI - (k / 4) * (Math.PI / 2); return [Math.cos(a) * R1, yb + Math.sin(a) * R1] })
      for (let k = 0; k < arcoPts.length - 1; k++) poli(g, Q, [arcoPts[k], arcoPts[k + 1], [arcoPts[k + 1][0], yT], [arcoPts[k][0], yT]], (sv * D) / 2, TIJ_ESC, sv < 0)
    }
  cx(g, Q, 0, 0, vao + pw * 2 + 0.4, D + 0.3, yT, yT + 0.9, FERRO, OURO, FERRO_CL)
  // a engrenagem de ouro no topo do arco, com a luz atrás
  engrenagemCopia(g, Q.P(0, D / 2 + 0.2, yT + 0.2), [Q.sx, 0, Q.sz], [0, 1, 0], 1.35, 0.3, lod, { dentes: 10, raios: 5 })
  if (!lod) poli(GL, Q, Array.from({ length: 10 }, (_, k): UV => [Math.cos((k / 10) * Math.PI * 2) * 0.5, yT + 0.2 + Math.sin((k / 10) * Math.PI * 2) * 0.5]), D / 2 + 0.36, AMB)
}

/**
 * PASSARELA (ref 2): tabuleiro de ferro com a viga de bronze na borda, guarda-corpo dourado (montantes e 2
 * corrimãos), postes-lampião a cada 7 m, a treliça embaixo e os pilares de ferro nas pontas. De `a` a `b` a `y`.
 */
export function passarela(c: Cena, a: readonly [number, number], b: readonly [number, number], y = 8, lod = 0, pilares = true) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  const ang = Math.atan2(b[0] - a[0], b[1] - a[1])
  const n = Math.max(1, Math.ceil(L / 14))
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n
    const sx0 = a[0] + (b[0] - a[0]) * t0, sz0 = a[1] + (b[1] - a[1]) * t0, sx1 = a[0] + (b[0] - a[0]) * t1, sz1 = a[1] + (b[1] - a[1]) * t1
    const cxm = (sx0 + sx1) / 2, czm = (sz0 + sz1) / 2
    const Q = quadro(cxm, czm, ang) // v = ao longo
    const g = geoEm(c, cxm, czm)
    const Ls = L / n, W = 2.6
    cx(g, Q, 0, 0, W, Ls + 0.02, y - 0.5, y, FERRO, FERRO_CL)
    for (const su of [-1, 1]) cx(g, Q, su * (W / 2 + 0.05), 0, 0.14, Ls + 0.02, y - 0.75, y - 0.1, OURO, OURO_CL)
    if (!lod) {
      for (const su of [-1, 1]) {
        for (const yy of [y + 0.55, y + 1.05]) tube(g, Q.P(su * (W / 2 - 0.08), -Ls / 2, yy), Q.P(su * (W / 2 - 0.08), Ls / 2, yy), 0.05, 0.05, 4, (k) => (k % 2 ? OURO : OURO_CL), false)
        const m = Math.round(Ls / 1.4)
        for (let k = 0; k <= m; k++) cx(g, Q, su * (W / 2 - 0.08), -Ls / 2 + (Ls * k) / m, 0.1, 0.1, y, y + 1.1, OURO, OURO_CL)
        // treliça embaixo (X)
        const q = Math.round(Ls / 2)
        for (let k = 0; k < q; k++) {
          const v0 = -Ls / 2 + (Ls * k) / q, v1 = v0 + Ls / q
          tube(g, Q.P(su * (W / 2 - 0.1), v0, y - 0.5), Q.P(su * (W / 2 - 0.1), v1, y - 1.6), 0.06, 0.06, 4, () => FERRO_ESC, false)
          tube(g, Q.P(su * (W / 2 - 0.1), v1, y - 0.5), Q.P(su * (W / 2 - 0.1), v0, y - 1.6), 0.06, 0.06, 4, () => FERRO_ESC, false)
        }
        tube(g, Q.P(su * (W / 2 - 0.1), -Ls / 2, y - 1.6), Q.P(su * (W / 2 - 0.1), Ls / 2, y - 1.6), 0.08, 0.08, 4, () => FERRO, false)
      }
      // lampiões
      const pl = Q.P(i % 2 ? W / 2 - 0.1 : -W / 2 + 0.1, 0, 0)
      tube(g, [pl[0], y, pl[2]], [pl[0], y + 1.6, pl[2]], 0.05, 0.05, 4, () => FERRO_ESC, false)
      lampadaHex(c, pl[0], y + 1.6, pl[2], 0.16, 0.34, lod)
    }
  }
  if (pilares)
    for (const [px, pz] of [a, b]) {
      const Q = quadro(px, pz, ang)
      const g = geoEm(c, px, pz)
      cx(g, Q, 0, 0, 1, 1, 0, y - 0.5, FERRO, FERRO_CL)
      if (!lod) for (const yy of [1, y * 0.5, y - 1.2]) cx(g, Q, 0, 0, 1.2, 1.2, yy, yy + 0.25, OURO, OURO_CL)
      c.block(px, pz, 0.6, 0.6, y)
    }
}

/** MURETA ACESA da praça (ref 3): mureta de ferro com tampo de bronze e as fendas âmbar acesas em fila. De u −L/2 a L/2. */
export function muretaAcesa(c: Cena, x: number, z: number, ang: number, L = 4, lod = 0) {
  const Q = quadro(x, z, ang)
  const g = geoEm(c, x, z), GL = luzEm(c, x, z)
  const H = 0.95, D = 0.7
  cx(g, Q, 0, 0, L, D, 0, H, FERRO, OURO, FERRO)
  cx(g, Q, 0, 0, L + 0.12, D + 0.12, H - 0.12, H + 0.04, OURO, OURO_CL)
  cx(g, Q, 0, 0, L + 0.1, D + 0.1, 0, 0.14, FERRO_ESC, FERRO)
  const n = Math.max(2, Math.round(L / 0.55))
  for (const sv of [1, -1]) {
    if (lod && sv < 0) continue
    for (let k = 0; k < n; k++) {
      const u0 = -L / 2 + 0.18 + (k * (L - 0.36)) / n, u1 = u0 + (L - 0.36) / n - 0.08
      poli(GL, Q, [[u0, 0.3], [u1, 0.3], [u1, 0.68], [u0, 0.68]].map(([uu, yy]) => (sv > 0 ? [uu, yy] : [-uu, yy])) as UV[], sv * (D / 2 + 0.02), [AMB_ESC, AMB_ESC, AMB_CL, AMB_CL], sv < 0)
    }
  }
  bloq(c, Q, 0, 0, L, D, H)
}

/** LAMPIÃO NO CAIXOTE (ref 2, beira do caminho): caixote baixo de madeira e a lâmpada hexagonal com telhadinho. */
export function lampiaoCaixote(c: Cena, x: number, z: number, lod = 0) {
  caixote(c, x, z, 0.9, 0.2, 0, lod)
  lampadaHex(c, x, 1.05, z, 0.24, 0.5, lod)
  const g = geoEm(c, x, z)
  tube(g, [x, 1.05 + 0.58, z], [x, 1.95, z], 0.32, 0.05, 6, (k) => (k % 2 ? FERRO : FERRO_CL), true)
}
