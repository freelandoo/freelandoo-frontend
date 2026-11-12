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
import { blob, bush, mix, mul, rnd, strata, tube, type Foliage, type Strata } from "../kit-natureza"
import * as P from "../pecas/floresta-lua"

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
export const ARBUSTO: Foliage = { dark: [0.12, 0.42, 0.46], mid: [0.16, 0.56, 0.6], hi: [0.4, 0.8, 0.8] }
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

/** ÁRVORE COLOSSAL da lua — a peça copiada (`pecas/floresta-lua.ts`, cópia minuciosa) na altura pedida. */
export function arvoreLua(c: Cena, x: number, z: number, h: number, seed: number, lod: number, folha: Foliage = COPA) {
  P.arvoreLua(c, x, z, h, Math.floor(seed * 7) + 1, lod, folha === COPA2 ? P.COPA_FUNDO : P.COPA, pertoDe(x, z))
}

/** Quem está perto do caminho (a cena registra; sem registro, tudo é perto): só ali vai a minúcia completa. */
let pertoDe: (x: number, z: number) => boolean = () => true
export function minucia(fn: (x: number, z: number) => boolean) {
  pertoDe = fn
}

/** Árvore média (borda dos bosques): a mesma árvore da lua, menor. */
export function arvoreMedia(c: Cena, x: number, z: number, h: number, seed: number, lod: number, folha: Foliage = COPA2) {
  P.arvoreLua(c, x, z, h * 1.25, Math.floor(seed * 7) + 3, lod, folha === COPA ? P.COPA : P.COPA_FUNDO, pertoDe(x, z))
}

/** Rochedo com musgo — o matacão copiado. `s` ≈ meia largura; devolve a altura. */
export function rochedo(c: Cena, x: number, z: number, s: number, seed: number, solid = true) {
  const h = s * (1 + rnd(seed, 1) * 0.5)
  P.rochedoMusgo(c, x, z, s * 2.4, h, Math.floor(seed * 13) + 1, pertoDe(x, z) ? 0 : 1, solid && s > 0.6)
  return h
}

/** Lírio aceso: a flor da lua copiada, sozinha. */
export function lirio(c: Cena, x: number, z: number, s: number, seed: number, cor: RGB = FLOR) {
  P.florLua(c, x, z, s * 1.7, Math.floor(seed * 11) + 1, 0, 1)
  void cor
}

/** Buquê: a flor da lua copiada em grupo de 3 (como a ref agrupa). */
export function buque(c: Cena, x: number, z: number, s: number, seed: number) {
  P.florLua(c, x, z, s * 1.9, Math.floor(seed * 11) + 1, pertoDe(x, z) ? 0 : 1, 3)
}

/** Tufo prateado copiado (só perto). */
export function capim(c: Cena, x: number, z: number, h: number, seed: number) {
  P.tufoPrata(c, x, z, h * 1.4, Math.floor(seed * 5) + 1, pertoDe(x, z) ? 0 : 1)
}

/** Arbusto da floresta (verde-azulado). */
export function moita(c: Cena, x: number, z: number, r: number, seed: number, lod: number) {
  bush(c.geo(x, z), [x, 0, z], r, ARBUSTO, seed, lod)
}

/** Tronco caído copiado (com caixa). */
export function troncoCaido(c: Cena, x: number, z: number, L: number, ang: number, seed: number, lod: number) {
  P.troncoCaidoLua(c, x, z, L, ang, Math.floor(seed * 3) + 1, lod)
}

/** Cogumelo aceso copiado (grupo de 3). */
export function cogumelo(c: Cena, x: number, z: number, h: number, seed: number, lod: number) {
  P.cogumeloLua(c, x, z, h, Math.floor(seed * 3) + 1, lod)
}

/** Menir com runa copiado. */
export function menir(c: Cena, x: number, z: number, h: number, ang: number, seed: number, lod: number) {
  P.menirRuna(c, x, z, h, ang, Math.floor(seed) + 1, lod)
}

/** Lanterna-casulo copiada, pendurada por um fio. */
export function lanterna(c: Cena, x: number, z: number, y: number, s: number, seed: number) {
  P.lanternaCasulo(c, x, z, y, s * 1.6, s * 2.6, Math.floor(seed * 7) + 1)
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

/** Paredão de matacões copiados (substitui a mesa em listras na borda das 3 cenas). */
export function paredao(c: Cena, x: number, z: number, rx: number, rz: number, h: number, seed: number, lod: number) {
  return P.paredao(c, x, z, rx, rz, h, Math.floor(seed) + 1, lod)
}

/** Platô com o trio de árvores (marco da cena 1) e arco de pedras — as peças copiadas. */
export function trioPlato(c: Cena, x: number, z: number, rot: number, seed: number, lod: number) {
  P.trioPlato(c, x, z, rot, seed, lod)
}
export function arcoPedras(c: Cena, x: number, z: number, ang: number, seed: number, lod: number) {
  P.arcoPedras(c, x, z, ang, seed, lod)
}

/** Teto de triângulos das cenas da Floresta da Lua: o caminho de lajes soltas nas três cenas (o Alex, 12/11) passa um
 *  pouco do orçamento padrão (4500/2000); FIDELIDADE acima do celular, como nos outros Domínios. */
export const TRI_BLOCO = { perto: 6000, longe: 3000, fundo: 3500 }
