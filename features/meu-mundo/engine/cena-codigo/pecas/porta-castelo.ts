// A PORTA DOS CASTELOS dos Domínios (2026-11-22, pedido do Alex): a porta fica FECHADA até o guardião cair e
// depois some — ninguém atravessa vitral. A folha (vitral, tábuas, rendilhado) vai para `c.portaGeo`/`c.portaLuz`
// (uma malha própria, `cena-<nome>-porta`, que o jogo esconde); as placas de moldura que antes eram lancetas
// CHEIAS (tampavam o vão) viram ANÉIS (`anel`), para o arco continuar de pé com o vão aberto atrás.
// `marcarPorta` grava a caixa que fecha o vão (`c.portaCaixa`): o jogo a liga enquanto a porta está fechada.
import type { Geo, RGB } from "../kit"
import type { Cena } from "../kit-cena"
import { face } from "../kit-natureza"
import type { quadro } from "./orbital"

type Q = ReturnType<typeof quadro>
type UV = readonly [number, number]

/** Contorno ABERTO de `arco`/`lanceta` (pé direito → volta pelo alto → pé esquerdo). */
const contorno = (pts: readonly UV[]): UV[] => [pts[1], ...pts.slice(2), pts[0]]

/**
 * Anel entre duas curvas `arco`/`lanceta` com o MESMO `seg` (`fora` maior que `dentro`), de pé no plano `v`,
 * virado para fora (+v). `cor2` = o tom da beira de dentro (degradê).
 */
export function anel(g: Geo, Q: Q, fora: readonly UV[], dentro: readonly UV[], v: number, cor: RGB, cor2: RGB = cor) {
  const a = contorno(fora), b = contorno(dentro)
  const n = Math.min(a.length, b.length)
  for (let k = 0; k < n - 1; k++)
    face(g, [Q.P(a[k][0], v, a[k][1]), Q.P(a[k + 1][0], v, a[k + 1][1]), Q.P(b[k + 1][0], v, b[k + 1][1]), Q.P(b[k][0], v, b[k][1])], [cor, cor, cor2, cor2], Q.N(0, 1))
}

/**
 * A caixa que fecha o vão: `hw` = meia largura do vão (u), `v` = plano da folha, `h` = altura. A colisão gira no
 * sentido contrário ao do quadro (ver `bloq` em fabrica.ts). Fica um pouco ATRÁS da folha (quem chega para na frente).
 */
export function marcarPorta(c: Cena, Q: Q, hw: number, v: number, h: number) {
  const p = Q.P(0, v - 0.35, 0)
  c.portaCaixa = { x: p[0], z: p[2], hx: hw + 0.25, hz: 0.45, rot: -Q.rot, h }
}
