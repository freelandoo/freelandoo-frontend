// Registro das cenas em código aprovadas (Domínios v2, plano `MEU MUNDO 3D/planos/2026-11-11-dominios-v2.md`).
// Fonte ÚNICA: o jogo e a vitrine `MEU MUNDO 3D/pipeline/pecas-codigo` importam daqui. Fatia de teste
// ainda não aprovada fica só na vitrine (`pipeline/pecas-codigo/cenas/`); aprovada, muda para cá.
import type { RGB } from "../kit"
import type { Cena } from "../kit-cena"
import * as fatiaOutono from "./fatia-outono"
import * as fatiaCidade from "./fatia-cidade"

export interface CenaMeta {
  ceu: RGB
  nevoa: RGB
  /** Área jogável em metros (múltipla de 32, centrada na origem). */
  area: readonly [number, number]
  /** Orçamento de triângulos por bloco de 32 m (a vitrine cobra). */
  triBloco?: { perto: number; longe: number; fundo: number }
  /** Cena de Domínio: pontos que o jogo lê (`entrada`, `saida`, `chefe`…) e setores com zona de monstro. */
  pontos?: readonly string[]
  setores?: readonly number[]
}

export interface CenaModulo {
  montar: (lod?: number) => Cena
  meta: CenaMeta
}

export const CENAS: Record<string, CenaModulo> = {
  "fatia-outono": fatiaOutono,
  "fatia-cidade": fatiaCidade,
}
