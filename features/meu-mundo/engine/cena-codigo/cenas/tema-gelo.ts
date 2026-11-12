// Tema do MAR DE GELO (Marú) — as 3 cenas usam estas peças. Refs do Alex:
// `pipeline/pecas-codigo/ref/dominios/gelo-{1,2,3}.png` e `castelo-maru.png`. As peças são COPIADAS peça a
// peça (pecas/gelo.ts, inventário `copia/inventario/gelo.json`); o castelo é pecas/castelo-maru.ts.
//
// FICHA DO AMBIENTE
// Clima:       cena 1 = dia claro e frio na costa nevada; cena 2 = caverna de gelo azul com corais
//              brancos e rosa; cena 3 = noite de aurora verde e violeta. Branco-azulado dominante,
//              ciano aceso, acento rosa-coral e madeira dos navios.
// Camadas:     (1) chão: neve batida + mar congelado ciano com placas; (2) relevo: rochas azul-ardósia
//              com tampa de neve, penhascos com pingentes, paredões e arcos de caverna; (3) água: o mar
//              congelado e as fendas acesas; (4) "vegetação": corais facetados, conchas, esponjas, capim
//              congelado, cristais; (5) objetos: navios presos no gelo, mourões com corda e lanterna,
//              poste com bandeira, torre de vigia (1), colunas de gelo (2), ruínas em arco (3);
//              (6) horizonte SEM névoa: montanhas de gelo e o aqueduto em ruína.
// Proporções:  personagem 1,7 m; navio 18–26 m; mourão 1,2–1,6 m; coral 2–6 m; penhasco 8–16 m.
// Cobertura:   ~45% neve, 25% gelo do mar, 15% rocha/gelo alto, 8% caminho, 7% corais/cristais.
// Fora:        personagens; o crescente da bandeira da ref (é de outro Domínio: ficou a onda de ouro).

import { noise, type RGB } from "../kit"
import type { Cena } from "../kit-cena"
import { mix, rnd } from "../kit-natureza"
import * as P from "../pecas/gelo"

export const CEU: RGB = [0.56, 0.76, 0.96]
export const NEVOA: RGB = [0.8, 0.88, 0.97]
export const NEVE: RGB = [0.9, 0.93, 0.98]
export const NEVE_SOMBRA: RGB = [0.72, 0.78, 0.94]
export const GELO: RGB = [0.5, 0.82, 0.92]
export const GELO_ESC: RGB = [0.26, 0.56, 0.74]
export const GELO_CL: RGB = [0.78, 0.95, 1]
export const MAR: RGB = [0.24, 0.8, 0.98]
export const MAR_CL: RGB = [0.62, 0.92, 1]
export const MAR_ESC: RGB = [0.08, 0.56, 0.86]
/** Luz da caverna (cena 2): clara e quase branca, para os corais não virarem cinza. */
export const LUZ_CAVERNA = { hemi: 1.1, sol: 0.45, ceu: [0.9, 0.96, 1] as RGB, chao: [0.42, 0.58, 0.7] as RGB, solCor: [0.88, 0.97, 1] as RGB }
/** Teto de triângulos das cenas do Mar de Gelo: FIDELIDADE acima do orçamento de celular (o Alex, 11/11). */
export const TRI_BLOCO = { perto: 20000, longe: 8000, fundo: 8000 }

/**
 * Chão do MAR CONGELADO (para o `color` do ground): ciano aceso com PLACAS mais claras (células) e
 * rachaduras finas brancas — o mar das refs 1 e 3.
 */
export function marGelo(x: number, z: number, n: (a: number, b: number, c: number) => number = noise): RGB {
  const cell = n(x * 0.12, 4.4, z * 0.12)
  const placa = cell > 0.6
  const crack = Math.abs(n(x * 0.3 + 3, 1.2, z * 0.3) - 0.5) < 0.025
  let col = mix(MAR_ESC, MAR, 0.35 + n(x * 0.05, 2, z * 0.05) * 0.65)
  if (placa) col = mix(MAR_CL, [0.86, 0.95, 1], (cell - 0.6) * 2)
  if (crack) col = [0.92, 0.98, 1]
  return col
}

// as peças copiadas que as cenas usam
export const rochaNeve = P.rochaNeve
export const cristalGelo = P.cristalGelo
export const capimGelo = P.capimGelo
export const mourao = P.mourao
export const corda = P.corda
export const posteBandeira = P.posteBandeira
export const torreVigia = P.torreVigia
export const placaGelo = P.placaGelo
export const iceberg = P.iceberg
export const navio = P.navio
export const coral = P.coral
export const conchaGigante = P.conchaGigante
export const esponjaTubo = P.esponjaTubo
export const colunaGelo = P.colunaGelo
export const arcoCaverna = P.arcoCaverna
export const beiralPingentes = P.beiralPingentes
export const ruinaArco = P.ruinaArco
export const pedestal = P.pedestal
export const placasCaminho = P.placasCaminho
export const penhasco = P.penhasco
export const CORAL_B = P.CORAL_B
export const CORAL_B_ESC = P.CORAL_B_ESC
export const CORAL_R = P.CORAL_R
export const CORAL_R_ESC = P.CORAL_R_ESC
export const AZUL_REAL = P.AZUL_REAL

/**
 * HORIZONTE do Mar de Gelo (malha SEM névoa: a névoa do jogo acaba em 115–150 m): anel de MONTANHAS DE GELO
 * a 175–255 m (picos facetados, brancos no alto e azuis na sombra) com um vão onde fica o marco da cena, e,
 * se pedido, o AQUEDUTO em ruína. `noite` escurece as faces (cena 3, aurora).
 */
export function horizonteGelo(c: Cena, o: { seed: number; nevoa: RGB; noite?: boolean; bruma?: number; aqueduto?: { x: number; z: number; ang: number }; vao?: number }) {
  const n = 9
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(o.seed, k) * 0.4
    if (o.vao !== undefined && Math.abs(Math.atan2(Math.sin(a - o.vao), Math.cos(a - o.vao))) < 0.35) continue
    const d = 175 + rnd(o.seed, k, 2) * 80
    const R = 34 + rnd(o.seed, k, 3) * 26, H = 22 + rnd(o.seed, k, 4) * 30
    P.montanhaGelo(c, Math.cos(a) * d, Math.sin(a) * d, R, H, o.seed * 10 + k, o.nevoa, o.bruma ?? 0.5, o.noite)
    // um ombro mais baixo do lado
    const a2 = a + 0.16
    P.montanhaGelo(c, Math.cos(a2) * (d - 20), Math.sin(a2) * (d - 20), R * 0.6, H * 0.5, o.seed * 10 + k + 50, o.nevoa, (o.bruma ?? 0.5) * 0.9, o.noite)
  }
  if (o.aqueduto) P.aqueduto(c, o.aqueduto.x, o.aqueduto.z, o.aqueduto.ang, 5, 13, 30, o.nevoa, o.noite ? 0.55 : 0.45)
}
