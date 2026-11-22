// features/meu-mundo/engine/cena-codigo/pecas/castelo-varkos.ts — a FORTALEZA DE VARKOS, o Leão da Guerra
// (cena 3 da Floresta Vermelha). Pedido do Alex: "um castelo como o da Fábrica, mas PRETO E VERMELHO".
//
// FICHA
// O que é:   a fortaleza de Aeryn (pecas/castelo-aeryn.ts, mesma pegada, mesma porta do guardião) vestida de
//            Varkos: a ardósia vira pedra PRETA puxada a vinho, as vigas e cúpulas de bronze viram FERRO
//            VERMELHO, a madeira da porta vira vermelho-sangue escuro, o âmbar aceso vira BRASA vermelha.
// Silhueta:  a mesma (menagem afunilada, torres de cúpula, chaminés, portal largo); a ÁGUIA do alto sai e no
//            lugar entra o BRASÃO DO LEÃO: medalhão de ouro com a juba em 14 pontas e os olhos em brasa.
// Paleta:    preto 0,1–0,2 · vermelho 0,5–0,9 · ouro velho só no brasão (o acento de 10%) · brasa.
// Fora:      a escultura de um leão de corpo inteiro (é Tripo, não código).
//
// Não copia o arquivo da Aeryn: chama `casteloAeryn` e RECOLORE os vértices que ele pôs (`recolorir`). Mudança
// lá (porta, guardião) vale aqui também.

import { type RGB, type V3 } from "../kit"
import type { Cena } from "../kit-cena"
import { face, mix, mul } from "../kit-natureza"
import type { CasteloPlanta } from "../dominio"
import { casteloAeryn } from "./castelo-aeryn"
import { BRASA, BRASA_CL, OURO_VELHO, SANGUE_ESC, recolorir } from "./floresta-vermelha"

/** Corpo: o que é quente e saturado (bronze, cobre, madeira, pano) vira vermelho; o resto (ardósia, rocha, ferro) vira preto. */
function corpoVarkos(r: number, g: number, b: number, porta: boolean): RGB {
  const L = 0.3 * r + 0.59 * g + 0.11 * b
  const sat = Math.max(r, g, b) - Math.min(r, g, b)
  if (r - b > 0.16 && sat > 0.18) {
    // a folha da porta: vermelho-sangue; o resto do bronze: ferro preto-vinho com o vermelho só onde o bronze era
    // claro (quinas, cúpulas ao sol, pináculos) — 70% preto, 20% vermelho
    if (porta) return [0.24 + L * 0.5, 0.025, 0.03]
    const t = Math.min(1, Math.max(0, (L - 0.62) / 0.2))
    return mix([0.13 + L * 0.12, 0.03, 0.035], [0.92, 0.1, 0.06], t * t)
  }
  return [L * 0.36 + 0.03, L * 0.27 + 0.015, L * 0.29 + 0.02]
}
/** Luz: âmbar e amarelo viram brasa vermelha (o miolo mais claro fica laranja). */
const luzVarkos = (r: number, g: number, b: number): RGB => [r, g * 0.32, b * 0.22]

/** Apaga (triângulo degenerado) o que foi desenhado acima de `y`, até `raio` em x e `fundo` em z de (x, z): a águia da Aeryn (é chata, no plano x-y). */
function apagar(c: Cena, antes: Map<object, number>, x: number, z: number, y: number, raio: number, fundo: number) {
  for (const g of [...c.cells.values(), ...c.glows.values()]) {
    for (let t = antes.get(g) ?? 0; t + 2 < g.i.length; t += 3) {
      let todos = true
      for (let j = 0; j < 3; j++) {
        const v = g.i[t + j] * 3
        if (g.p[v + 1] < y || Math.abs(g.p[v] - x) > raio || Math.abs(g.p[v + 2] - z) > fundo) {
          todos = false
          break
        }
      }
      if (todos) g.i[t + 1] = g.i[t + 2] = g.i[t]
    }
  }
}

const NEON: RGB = [1, 0.12, 0.08]

/** BRASÃO DO LEÃO: medalhão de ouro com a juba vermelha em pontas, focinho e olhos acesos; dos dois lados. */
function brasaoLeao(c: Cena, p: V3, R: number, lod: number) {
  const g = c.geo(p[0], p[2]), L = c.glow(p[0], p[2])
  const n = lod ? 10 : 14
  const P = (a: number, r: number, dz = 0): V3 => [p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, p[2] + dz]
  for (const s of [-1, 1]) {
    const dz = s * 0.12, nn: V3 = [0, 0, s]
    const tri = (a: V3, b: V3, d: V3, col: RGB | RGB[], G = g) => (s < 0 ? face(G, [a, b, d], col, nn) : face(G, [a, d, b], col, nn))
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2
      // juba: ponta vermelha com a base em ouro
      tri(P(a0, R * 0.95, dz * 0.5), P(am, R * (k % 2 ? 1.55 : 1.4), dz * 0.5), P(a1, R * 0.95, dz * 0.5), [mul(OURO_VELHO, 0.7), [0.8, 0.08, 0.05], mul(OURO_VELHO, 0.7)])
      // aro preto e rosto de ouro (claro no alto, escuro embaixo)
      const up = 0.75 + 0.25 * Math.sin(am)
      // aro de NEON vermelho (a luz da Gincana): lê de longe contra o céu
      tri(P(a0, R, dz), P(a1, R, dz), P(a1, R * 0.86, dz), NEON, L)
      tri(P(a0, R, dz), P(a1, R * 0.86, dz), P(a0, R * 0.86, dz), NEON, L)
      tri(P(a0, R * 0.86, dz * 1.4), P(a1, R * 0.86, dz * 1.4), [p[0], p[1], p[2] + dz * 1.4], mul([1, 0.74, 0.3], up))
    }
    if (lod) continue
    // focinho (losango escuro) e a boca
    const fz = p[2] + dz * 1.8
    tri([p[0], p[1] - R * 0.05, fz], [p[0] - R * 0.18, p[1] - R * 0.32, fz], [p[0] + R * 0.18, p[1] - R * 0.32, fz], mix(OURO_VELHO, SANGUE_ESC, 0.5))
    tri([p[0] - R * 0.18, p[1] - R * 0.5, fz], [p[0] + R * 0.18, p[1] - R * 0.5, fz], [p[0], p[1] - R * 0.62, fz], SANGUE_ESC)
    // olhos em brasa (na luz)
    for (const e of [-1, 1]) {
      const ex = p[0] + e * R * 0.3, ey = p[1] + R * 0.12, ez = p[2] + dz * 2.2
      const pts: V3[] = [[ex - R * 0.14, ey, ez], [ex + R * 0.14, ey + e * 0.02, ez], [ex, ey - R * 0.08, ez]]
      if (s < 0) face(L, pts, [BRASA, BRASA_CL, BRASA], nn)
      else face(L, [pts[0], pts[2], pts[1]], [BRASA, BRASA, BRASA_CL], nn)
    }
  }
}

/** O CASTELO INTEIRO (contrato `dominio.ts`, frente para −z). Devolve o arco da travessia e o brasão. */
export function casteloVarkos(c: Cena, K: CasteloPlanta, lod = 0) {
  const antesI = new Map<object, number>()
  for (const g of [...c.cells.values(), ...c.glows.values()]) antesI.set(g, g.i.length)
  let r: ReturnType<typeof casteloAeryn> | null = null
  recolorir(c, () => (r = casteloAeryn(c, K, lod)), corpoVarkos, luzVarkos)
  const { arco, aguia } = r!
  apagar(c, antesI, aguia[0], aguia[2], 14, 12.5, 2.6)
  const brasao: V3 = [aguia[0], 23, aguia[2]]
  brasaoLeao(c, brasao, 2.6, lod)
  return { arco, brasao }
}
