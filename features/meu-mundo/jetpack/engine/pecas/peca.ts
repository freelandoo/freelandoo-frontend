// features/meu-mundo/jetpack/engine/pecas/peca.ts — JETPACK EM CÓDIGO (14/11): a peça feita por nós.
//
// O Jetpack trocou TODO o cenário do Tripo (kits `temas/*/v2`, `public/meu-mundo/jetpack/*2`) por
// peças em código, como os Domínios (skill `meu-mundo-cenario-codigo`): cor e desgaste por vértice,
// sem textura, sem download. Cada peça sai com AS MESMAS MEDIDAS do modelo que substitui (1 m de
// altura, origem e eixo iguais; `MEDIDAS` de cada fase), então os módulos dos trechos, as caixas
// da regra e as escalas dos obstáculos não mudam: a jogabilidade é a mesma.
//
// Uma `Peca` é só geometria (corpo + luz acesa). Dois destinos:
// - CENÁRIO: o pool carimba as peças de cada módulo numa malha só (`SegmentPool.bakeCode`): o módulo
//   inteiro custa 2 chamadas (acabamento do trecho + peças), com instâncias no resto dos trechos.
// - OBSTÁCULO/GIRADOR: `pecaMesh` vira uma malha (corpo + luz = 1 chamada, `fuseGlow`).
// As peças dos Domínios (`engine/cena-codigo/pecas/*`, que desenham numa `Cena`) entram por
// `daCena`: desenha numa cena de um bloco só e encaixa na caixa do modelo antigo.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Geo, finish, type RGB, type V3 } from "../../../engine/cena-codigo/kit"
import { Cena } from "../../../engine/cena-codigo/kit-cena"

export interface Peca {
  body: Geo
  glow: Geo
}
export const novaPeca = (): Peca => ({ body: new Geo(), glow: new Geo() })

/** Desgaste e reflexo de uma fase (natureza: sem ferrugem; metal: com). */
export interface Acabamento {
  weather: { grime?: number; rustAmt?: number; rust?: RGB; bare?: RGB }
  spec?: RGB
  power?: number
  self?: RGB
}

/** Caixa de encaixe (min/max por eixo), nas medidas do modelo antigo. */
export interface Caixa {
  x: readonly [number, number]
  y: readonly [number, number]
  z: readonly [number, number]
}

const tmpV = new Vector3()
const tmpN = new Vector3()
/** Copia `src` para `dst` pela matriz `M` (normais pela inversa transposta; `flip` = espelhou → vira as faces). */
export function appendGeo(dst: Geo, src: Geo, M: Matrix, flip = false) {
  const N = M.clone()
  N.setTranslationFromFloats(0, 0, 0)
  N.invert().transpose()
  const base = dst.count
  for (let k = 0; k < src.count; k++) {
    Vector3.TransformCoordinatesFromFloatsToRef(src.p[k * 3], src.p[k * 3 + 1], src.p[k * 3 + 2], M, tmpV)
    Vector3.TransformNormalFromFloatsToRef(src.n[k * 3], src.n[k * 3 + 1], src.n[k * 3 + 2], N, tmpN)
    tmpN.normalize()
    dst.p.push(tmpV.x, tmpV.y, tmpV.z)
    dst.n.push(tmpN.x, tmpN.y, tmpN.z)
    dst.c.push(src.c[k * 4], src.c[k * 4 + 1], src.c[k * 4 + 2], src.c[k * 4 + 3])
    dst.w.push(src.w[k])
  }
  for (let k = 0; k < src.i.length; k += 3) {
    if (flip) dst.i.push(src.i[k] + base, src.i[k + 2] + base, src.i[k + 1] + base)
    else dst.i.push(src.i[k] + base, src.i[k + 1] + base, src.i[k + 2] + base)
  }
}

/** Matriz do lugar de uma peça no trecho (a mesma convenção da instância: escala → giro em y → posição). */
export function spotMatrix(p: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number }) {
  return Matrix.Scaling(p.sx, p.sy, p.sz).multiply(Matrix.RotationY(p.ry)).multiply(Matrix.Translation(p.x, p.y, p.z))
}

/** Carimba `src` em `dst` no lugar `p`. */
export function stamp(dst: Peca, src: Peca, p: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number }) {
  const M = spotMatrix(p)
  const flip = p.sx * p.sy * p.sz < 0
  appendGeo(dst.body, src.body, M, flip)
  appendGeo(dst.glow, src.glow, M, flip)
}

/** Copia a peça levada por `M`. */
export function moved(src: Peca, M: Matrix): Peca {
  const out = novaPeca()
  const det = M.determinant()
  appendGeo(out.body, src.body, M, det < 0)
  appendGeo(out.glow, src.glow, M, det < 0)
  return out
}

/** Caixa da peça (corpo + luz). */
export function caixaDe(p: Peca): Caixa {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
  for (const g of [p.body, p.glow])
    for (let k = 0; k < g.count; k++)
      for (let a = 0; a < 3; a++) {
        const v = g.p[k * 3 + a]
        if (v < lo[a]) lo[a] = v
        if (v > hi[a]) hi[a] = v
      }
  return { x: [lo[0], hi[0]], y: [lo[1], hi[1]], z: [lo[2], hi[2]] }
}

/**
 * Encaixa a peça na caixa `alvo` com escala UNIFORME (a maior que cabe nos três eixos): centro em x e
 * z, pé no chão da caixa (`ancora` "baixo") ou centro em y ("meio") ou topo ("cima"). Nunca passa da
 * caixa do modelo antigo — o que ficava fora da caixa do voo continua fora.
 */
export function encaixa(p: Peca, alvo: Caixa, ancora: "baixo" | "meio" | "cima" = "baixo"): Peca {
  const b = caixaDe(p)
  const s = Math.min((alvo.x[1] - alvo.x[0]) / (b.x[1] - b.x[0] || 1), (alvo.y[1] - alvo.y[0]) / (b.y[1] - b.y[0] || 1), (alvo.z[1] - alvo.z[0]) / (b.z[1] - b.z[0] || 1))
  const cx = (b.x[0] + b.x[1]) / 2, cz = (b.z[0] + b.z[1]) / 2
  const tx = (alvo.x[0] + alvo.x[1]) / 2, tz = (alvo.z[0] + alvo.z[1]) / 2
  const ty = ancora === "baixo" ? alvo.y[0] - b.y[0] * s : ancora === "cima" ? alvo.y[1] - b.y[1] * s : (alvo.y[0] + alvo.y[1]) / 2 - ((b.y[0] + b.y[1]) / 2) * s
  return moved(p, Matrix.Scaling(s, s, s).multiply(Matrix.Translation(tx - cx * s, ty, tz - cz * s)))
}

/** Peça dos Domínios (desenha numa `Cena`) → `Peca` (um bloco só; as caixas de colisão de andar não servem aqui). */
export function daCena(lod: number, fn: (c: Cena) => void): Peca {
  const c = new Cena("jt-peca", lod, 1e5, -5e4)
  fn(c)
  const out = novaPeca()
  const I = Matrix.Identity()
  for (const g of c.cells.values()) appendGeo(out.body, g, I)
  for (const g of c.glows.values()) appendGeo(out.glow, g, I)
  appendGeo(out.body, c.fundo, I)
  return out
}

/** Junta várias peças numa. */
export function junta(...ps: Peca[]): Peca {
  const out = novaPeca()
  const I = Matrix.Identity()
  for (const p of ps) {
    appendGeo(out.body, p.body, I)
    appendGeo(out.glow, p.glow, I)
  }
  return out
}

/** Triângulos da peça. */
export const trisDe = (p: Peca) => (p.body.i.length + p.glow.i.length) / 3

/**
 * Malha de UMA peça (obstáculo, girador): desgaste da fase, corpo + luz numa chamada.
 * O desgaste é por posição: a peça de 1 m é lida em `escala` metros (a do jogo) para o ruído bater.
 */
export function pecaMesh(scene: Scene, name: string, p: Peca, ac: Acabamento, escala = 1): Mesh {
  const body = new Geo()
  appendGeo(body, p.body, Matrix.Scaling(escala, escala, escala))
  body.weather(ac.weather)
  // volta para a medida da peça (o ruído já ficou na cor)
  const back = new Geo()
  appendGeo(back, body, Matrix.Scaling(1 / escala, 1 / escala, 1 / escala))
  const glow = new Geo()
  appendGeo(glow, p.glow, Matrix.Identity())
  const m = finish(scene, name, back, glow, { weather: false, spec: ac.spec ?? [0.06, 0.06, 0.07], power: ac.power ?? 12, self: ac.self ?? [0.03, 0.03, 0.04] })
  m.isPickable = false
  return m
}

/** Kit de uma fase: as peças pelo nome e o acabamento. As peças são feitas só quando alguém pede (`get`). */
export class KitCodigo<P extends string = string> {
  private readonly made = new Map<P, Peca>()
  constructor(
    readonly fase: string,
    readonly acabamento: Acabamento,
    private readonly receitas: Partial<Record<P, () => Peca>>,
  ) {}
  has(name: string): name is P {
    return name in this.receitas
  }
  get(name: P): Peca | null {
    let p = this.made.get(name)
    if (p) return p
    const r = this.receitas[name]
    if (!r) return null
    p = r()
    this.made.set(name, p)
    return p
  }
  /** Malha de uma peça (obstáculo, girador, ilha); `escala` = tamanho no jogo (para o desgaste). */
  mesh(scene: Scene, name: P, escala = 1): Mesh | null {
    const p = this.get(name)
    return p ? pecaMesh(scene, `jt-code-${this.fase}-${name}`, p, this.acabamento, escala) : null
  }
}

/** Atalhos de cor. */
export const cor = {
  mul: (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f],
  mix: (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
}
export type { RGB, V3 }
