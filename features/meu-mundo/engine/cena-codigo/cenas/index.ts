// Registro das cenas em código aprovadas (Domínios v2, plano `MEU MUNDO 3D/planos/2026-11-11-dominios-v2.md`).
// Fonte ÚNICA: o jogo e a vitrine `MEU MUNDO 3D/pipeline/pecas-codigo` importam daqui. Fatia de teste
// ainda não aprovada fica só na vitrine (`pipeline/pecas-codigo/cenas/`); aprovada, muda para cá.
import type { RGB } from "../kit"
import type { Cena } from "../kit-cena"
import * as fatiaOutono from "./fatia-outono"
import * as fatiaCidade from "./fatia-cidade"
import * as floresta1 from "./floresta-1"
import * as floresta2 from "./floresta-2"
import * as floresta3 from "./floresta-3"
import * as canion1 from "./canion-1"
import * as canion2 from "./canion-2"
import * as canion3 from "./canion-3"
import * as gelo1 from "./gelo-1"
import * as gelo2 from "./gelo-2"
import * as gelo3 from "./gelo-3"
import * as fabrica1 from "./fabrica-1"
import * as fabrica2 from "./fabrica-2"
import * as fabrica3 from "./fabrica-3"

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
  /** Luz da cena no jogo (padrão = a do bairro: céu 0,78 + sol 0,55). Noite = céu baixo e azulado. */
  luz?: { hemi?: number; sol?: number; ceu?: RGB; chao?: RGB; solCor?: RGB }
  /** Lua/sol desenhado no céu (disco aceso, sem névoa): direção (para onde olhar), raio angular, cor. */
  astro?: { dir: RGB; r: number; cor: RGB }
  /** Aurora no céu (cortinas de luz sem névoa). */
  aurora?: boolean
}

export interface CenaModulo {
  montar: (lod?: number) => Cena
  meta: CenaMeta
}

export const CENAS: Record<string, CenaModulo> = {
  "fatia-outono": fatiaOutono,
  "fatia-cidade": fatiaCidade,
  "floresta-1": floresta1,
  "floresta-2": floresta2,
  "floresta-3": floresta3,
  "canion-1": canion1,
  "canion-2": canion2,
  "canion-3": canion3,
  "gelo-1": gelo1,
  "gelo-2": gelo2,
  "gelo-3": gelo3,
  "fabrica-1": fabrica1,
  "fabrica-2": fabrica2,
  "fabrica-3": fabrica3,
}
