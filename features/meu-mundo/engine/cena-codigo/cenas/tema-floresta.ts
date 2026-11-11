// Tema da FLORESTA DA LUA (Noctis) — as 3 cenas usam estas peças. Refs do Alex:
// `pipeline/pecas-codigo/ref/dominios/floresta-{1,2,3}.png` e `castelo-noctis.png`.
//
// FICHA DO AMBIENTE (as três)
// Clima:       noite clara de lua cheia, azul-violeta; floresta de troncos colossais claros
//              (branco-lavanda) com copas verde-azuladas escuras; flores acesas ciano no chão;
//              calmo e mágico, saturado no azul.
// Camadas:     (1) chão: grama verde-azulada escura em manchas + trilha de terra clara (cena 3:
//              lajes violeta); (2) relevo: rochedos cinza-violeta com musgo no topo e paredões na
//              borda; (3) água: riacho azul (cena 2); (4) vegetação: árvores colossais em grupos,
//              árvores médias, arbustos, tufos claros; (5) objetos: pedras, troncos caídos,
//              cogumelos acesos (2), menires com runas (2), lanternas de cristal (3);
//              (6) fundo: silhuetas de copas e morros na névoa, a lua.
// Proporções:  personagem 1,7 m; árvore colossal 14–22 m (8–13 personagens), tronco 1,6–2,4 m;
//              árvore média 6–8 m; trilha 4,2 m; rochedo 2–5 m.
// Cobertura:   ~45% grama, 25% copa, 10% rocha, 10% trilha, 5% flores/arbustos, 5% clareiras.
// Fora:        personagens; a lua é desenhada pelo jogo (`meta.astro`), não pelo cenário.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { blob, block, bush, face, mix, mul, rnd, strata, tube, tuft, type Foliage, type Strata } from "../kit-natureza"

export const CEU: RGB = [0.1, 0.12, 0.33]
export const NEVOA: RGB = [0.17, 0.18, 0.42]
/** Luar: céu azulado forte, sol fraco e frio (o jogo lê `meta.luz`). */
export const LUZ = { hemi: 1.15, sol: 0.6, ceu: [0.62, 0.7, 1] as RGB, chao: [0.26, 0.22, 0.42] as RGB, solCor: [0.78, 0.82, 1] as RGB }
export const LUA = { dir: [0.25, 0.42, 1] as RGB, r: 0.09, cor: [0.93, 0.95, 1] as RGB }

export const GRAMA: RGB = [0.2, 0.44, 0.44]
export const GRAMA_CL: RGB = [0.28, 0.56, 0.5]
export const GRAMA_ESC: RGB = [0.13, 0.3, 0.36]
export const TERRA: RGB = [0.6, 0.48, 0.4]
export const TERRA_ESC: RGB = [0.42, 0.34, 0.32]
export const LAJE: RGB = [0.5, 0.46, 0.66]
export const LAJE_ESC: RGB = [0.36, 0.33, 0.52]
export const CASCA: RGB = [0.97, 0.96, 1]
export const CASCA_SOMBRA: RGB = [0.72, 0.7, 0.9]
export const COPA: Foliage = { dark: [0.06, 0.24, 0.3], mid: [0.12, 0.48, 0.5], hi: [0.3, 0.76, 0.72] }
export const COPA2: Foliage = { dark: [0.08, 0.2, 0.36], mid: [0.16, 0.38, 0.58], hi: [0.34, 0.6, 0.8] }
export const ARBUSTO: Foliage = { dark: [0.06, 0.22, 0.24], mid: [0.12, 0.4, 0.38], hi: [0.26, 0.58, 0.52] }
export const MUSGO: RGB = [0.46, 0.6, 0.3]
export const PEDRA: RGB = [0.56, 0.54, 0.7]
export const PEDRA_ESC: RGB = [0.38, 0.36, 0.52]
export const FLOR: RGB = [0.55, 1, 0.98]
export const FLOR_CL: RGB = [0.92, 1, 1]
export const AGUA_FUNDA: RGB = [0.08, 0.18, 0.48]
export const AGUA_RASA: RGB = [0.2, 0.42, 0.72]
export const ESPUMA: RGB = [0.6, 0.85, 1]

/** Rocha da floresta: cinza-violeta em faixas suaves (não é arenito: faixas largas, pouco contraste). */
export const ROCHA: Strata = strata([[PEDRA, 1.6], [mix(PEDRA, PEDRA_ESC, 0.5), 0.9], [mul(PEDRA, 1.08), 1.2], [PEDRA_ESC, 0.7]], 30, 3)

/** ÁRVORE COLOSSAL: tronco claro grosso e torto, raízes abertas, 2 galhos e copa larga escura embaixo. */
export function arvoreLua(c: Cena, x: number, z: number, h: number, seed: number, lod: number, folha: Foliage = COPA) {
  const g = c.geo(x, z)
  const r = h * 0.065
  const n = lod ? 5 : 6
  const lx = (rnd(seed, 1) - 0.5) * h * 0.18, lz = (rnd(seed, 2) - 0.5) * h * 0.18
  const mid: V3 = [x + lx * 0.5, h * 0.32, z + lz * 0.5]
  const top: V3 = [x + lx, h * 0.6, z + lz]
  const bark = (k: number) => (k % 3 === 0 ? CASCA_SOMBRA : k % 2 ? CASCA : mix(CASCA, CASCA_SOMBRA, 0.35))
  tube(g, [x, -0.2, z], mid, r * 1.35, r * 0.95, n, bark, false)
  tube(g, mid, top, r * 0.95, r * 0.6, n, bark, false)
  // raízes: tubos do tronco para o chão, abertos
  const nr = lod ? 0 : 4
  for (let k = 0; k < nr; k++) {
    const a = (k / nr) * Math.PI * 2 + rnd(seed, k, 3) * 1.2
    const L = r * (2.6 + rnd(seed, k, 4) * 1.6)
    tube(g, [x + Math.cos(a) * r * 0.6, h * 0.05 + 0.6, z + Math.sin(a) * r * 0.6], [x + Math.cos(a) * L, -0.15, z + Math.sin(a) * L], r * 0.42, r * 0.12, 4, bark, false)
  }
  // galhos e copa
  const cr = h * 0.27
  const cy = h * 0.78
  const nb = lod ? 1 : 3
  for (let k = 0; k < nb; k++) {
    const a = rnd(seed, k, 5) * Math.PI * 2
    const d = k === 0 ? 0 : cr * (0.7 + rnd(seed, k, 6) * 0.3)
    const cx = top[0] + Math.cos(a) * d, cz = top[2] + Math.sin(a) * d
    if (k > 0 && !lod) tube(g, top, [cx, cy - cr * 0.3, cz], r * 0.45, r * 0.2, 4, bark, false)
    const rr = k === 0 ? cr : cr * (0.62 + rnd(seed, k, 7) * 0.2)
    blob(g, [cx, cy + (k === 0 ? cr * 0.15 : -cr * 0.1), cz], [rr * 1.15, rr * 0.62, rr * 1.15], folha, seed + k * 13)
  }
  c.block(x, z, r * 1.1, r * 1.1, h)
}

/** Árvore média de tronco claro e copa redonda (borda dos bosques). */
export function arvoreMedia(c: Cena, x: number, z: number, h: number, seed: number, lod: number, folha: Foliage = COPA2) {
  const g = c.geo(x, z)
  const r = h * 0.3
  tube(g, [x, -0.1, z], [x, h * 0.55, z], r * 0.17, r * 0.1, lod ? 4 : 5, (k) => (k % 2 ? CASCA : CASCA_SOMBRA), false)
  blob(g, [x, h - r * 0.8, z], [r, r * 0.8, r], folha, seed)
  if (!lod) blob(g, [x + r * 0.5, h - r * 1.25, z - r * 0.3], [r * 0.6, r * 0.5, r * 0.6], folha, seed + 3)
  c.block(x, z, 0.35, 0.35, h)
}

/** Rochedo com musgo em cima (bloco em faixas + tampa verde). */
export function rochedo(c: Cena, x: number, z: number, s: number, seed: number, solid = true) {
  const g = c.geo(x, z)
  const h = s * (0.8 + rnd(seed, 1) * 0.6)
  block(g, x, z, -0.1, h, s * (1.3 + rnd(seed, 2) * 0.6), s * (1.1 + rnd(seed, 3) * 0.5), { strata: ROCHA, seed, rot: rnd(seed, 4) * 3, taper: 0.8, tilt: 0.08, top: MUSGO, topHi: mix(MUSGO, [0.7, 0.85, 0.4], 0.4) })
  if (solid && s > 0.6) c.block(x, z, s * 0.75, s * 0.65, h, rnd(seed, 4) * 3)
  return h
}

/** Lírio aceso: 5 pétalas ciano em estrela, rente ao chão (vai no `glow`). */
export function lirio(c: Cena, x: number, z: number, s: number, seed: number, cor: RGB = FLOR) {
  const G = c.glow(x, z)
  const y = 0.18 + s * 0.25
  const a0 = rnd(seed, 1) * 6
  for (let k = 0; k < 5; k++) {
    const a = a0 + (k / 5) * Math.PI * 2
    const tip: V3 = [x + Math.cos(a) * s * 0.8, y + s * 0.75, z + Math.sin(a) * s * 0.8]
    const l: V3 = [x + Math.cos(a - 0.5) * s * 0.3, y, z + Math.sin(a - 0.5) * s * 0.3]
    const r: V3 = [x + Math.cos(a + 0.5) * s * 0.3, y, z + Math.sin(a + 0.5) * s * 0.3]
    face(G, [l, tip, r], [cor, FLOR_CL, cor], [Math.cos(a), 0.4, Math.sin(a)])
    face(G, [r, tip, l], [cor, FLOR_CL, cor], [-Math.cos(a), 0.4, -Math.sin(a)])
  }
  // haste e folhas escuras embaixo (corpo)
  const g = c.geo(x, z)
  face(g, [[x - s * 0.5, 0.04, z], [x, 0.04, z - s * 0.5], [x + s * 0.5, 0.04, z], [x, 0.04, z + s * 0.5]], GRAMA_ESC, [0, 1, 0])
}

/** Buquê de lírios acesos (3–5 juntos, tamanhos diferentes) — é como a referência agrupa as flores. */
export function buque(c: Cena, x: number, z: number, s: number, seed: number) {
  const n = 3 + Math.floor(rnd(seed, 7) * 3)
  for (let k = 0; k < n; k++) {
    const a = rnd(seed, k, 8) * Math.PI * 2, d = k ? s * (0.8 + rnd(seed, k, 9) * 0.9) : 0
    lirio(c, x + Math.cos(a) * d, z + Math.sin(a) * d, s * (k ? 0.6 + rnd(seed, k, 10) * 0.4 : 1), seed + k, k % 3 === 2 ? FLOR_CL : FLOR)
  }
}

/** Tufo claro de capim (só perto). */
export function capim(c: Cena, x: number, z: number, h: number, seed: number) {
  tuft(c.geo(x, z), [x, 0, z], 6, h, seed, mix(GRAMA_ESC, CASCA, 0.3), [0.86, 0.94, 1])
}

/** Arbusto da floresta (verde-azulado). */
export function moita(c: Cena, x: number, z: number, r: number, seed: number, lod: number) {
  bush(c.geo(x, z), [x, 0, z], r, ARBUSTO, seed, lod)
}

/** Tronco caído claro, deitado (com caixa). */
export function troncoCaido(c: Cena, x: number, z: number, L: number, ang: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  const dx = Math.sin(ang) * L / 2, dz = Math.cos(ang) * L / 2
  const r = 0.45 + rnd(seed, 1) * 0.2
  tube(g, [x - dx, r * 0.8, z - dz], [x + dx, r * 0.7, z + dz], r, r * 0.85, lod ? 4 : 6, (k) => (k % 2 ? CASCA : CASCA_SOMBRA), true)
  c.block(x, z, 0.5, L / 2, 1.2, ang)
}

/** Cogumelo aceso: haste clara e chapéu ciano (o chapéu vai no `glow`). */
export function cogumelo(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  tube(g, [x, -0.05, z], [x, h * 0.75, z], h * 0.09, h * 0.07, lod ? 4 : 5, () => CASCA, false)
  const G = c.glow(x, z)
  const r = h * 0.42
  const n = lod ? 5 : 7
  const ring: V3[] = Array.from({ length: n }, (_, k) => [x + Math.cos((k / n) * Math.PI * 2) * r, h * 0.7, z + Math.sin((k / n) * Math.PI * 2) * r])
  const top: V3 = [x, h * 1.02, z]
  for (let k = 0; k < n; k++) face(G, [ring[k], ring[(k + 1) % n], top], [mul(FLOR, 0.7), mul(FLOR, 0.7), FLOR_CL], [Math.cos(((k + 0.5) / n) * Math.PI * 2), 0.6, Math.sin(((k + 0.5) / n) * Math.PI * 2)])
  if (h > 1.2) c.block(x, z, 0.3, 0.3, h)
  void seed
}

/** Menir com runas verdes acesas (cena 2). */
export function menir(c: Cena, x: number, z: number, h: number, ang: number, seed: number, lod: number) {
  const g = c.geo(x, z)
  block(g, x, z, -0.1, h, 1.3, 0.75, { strata: ROCHA, seed, rot: ang, taper: 0.78, tilt: 0.05, top: MUSGO })
  c.block(x, z, 0.7, 0.45, h, ang)
  if (lod) return
  const G = c.glow(x, z)
  // runa: três traços na face da frente
  const fx = Math.sin(ang), fz = Math.cos(ang)
  const sx = Math.cos(ang), sz = -Math.sin(ang)
  const off = 0.42
  const P = (u: number, v: number): V3 => [x + fx * off + sx * u, v, z + fz * off + sz * u]
  const verde: RGB = [0.45, 1, 0.55]
  face(G, [P(-0.06, h * 0.25), P(0.06, h * 0.25), P(0.06, h * 0.72), P(-0.06, h * 0.72)], verde, [fx, 0, fz])
  face(G, [P(-0.28, h * 0.5), P(0.28, h * 0.56), P(0.28, h * 0.6), P(-0.28, h * 0.54)], verde, [fx, 0, fz])
  face(G, [P(-0.22, h * 0.34), P(0.18, h * 0.42), P(0.18, h * 0.46), P(-0.22, h * 0.38)], verde, [fx, 0, fz])
}

/** Lanterna de cristal pendurada num galho (cena 3): fio + losango aceso. */
export function lanterna(c: Cena, x: number, z: number, y: number, s: number, seed: number) {
  const g = c.geo(x, z)
  tube(g, [x, y + s * 1.6, z], [x, y + s * 4, z], 0.03, 0.03, 3, () => CASCA_SOMBRA, false)
  const G = c.glow(x, z)
  const top: V3 = [x, y + s * 1.6, z], bot: V3 = [x, y - s * 1.2, z]
  const cor: RGB = [0.86, 0.78, 1]
  const n = 5
  const a0 = rnd(seed, 1)
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2, b = a0 + ((k + 1) / n) * Math.PI * 2
    const pa: V3 = [x + Math.cos(a) * s * 0.6, y, z + Math.sin(a) * s * 0.6]
    const pb: V3 = [x + Math.cos(b) * s * 0.6, y, z + Math.sin(b) * s * 0.6]
    const nn: V3 = [Math.cos((a + b) / 2), 0.3, Math.sin((a + b) / 2)]
    face(G, [pa, pb, top], [cor, cor, [1, 1, 1]], nn)
    face(G, [pb, pa, bot], [cor, cor, [0.6, 0.5, 0.95]], [nn[0], -0.3, nn[2]])
  }
}

/** Pano de fundo da floresta: copas colossais e morros na névoa, fora da área. */
export function fundoFloresta(c: Cena, seed: number) {
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2 + rnd(seed, k) * 0.2
    const d = 100 + rnd(seed, k, 2) * 40
    const x = Math.cos(a) * d, z = Math.sin(a) * d
    const h = 26 + rnd(seed, k, 3) * 18
    tube(c.fundo, [x, 0, z], [x, h * 0.6, z], 1.6, 1.1, 4, () => CASCA_SOMBRA, false)
    blob(c.fundo, [x, h * 0.8, z], [h * 0.36, h * 0.2, h * 0.36], COPA, seed + k)
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.4
    const d = 150
    blob(c.fundo, [Math.cos(a) * d, -4, Math.sin(a) * d], [48, 22 + rnd(seed, k, 9) * 14, 30], { dark: [0.07, 0.12, 0.26], mid: [0.1, 0.16, 0.34], hi: [0.14, 0.22, 0.42] }, seed + 40 + k)
  }
}
