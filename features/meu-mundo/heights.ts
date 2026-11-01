// features/meu-mundo/heights.ts — altura de cada corpo (chão → topo da cabeça,
// sem chapéu, orelhas e chifres). Regra do Alex (2026-11-01): jovens das
// classes 1,70 m (menino) / 1,65 m (menina), adultos 2,00 m / 1,90 m, deuses
// 2,40 m. A escala mora no GLB (raiz do esqueleto, pipeline/build_deuses.py);
// aqui só o que fica SOBRE a cabeça (nome, balão, destaque) acompanha.
import type { BodyId } from "./types"

const HEIGHT: Partial<Record<BodyId, number>> = {
  raposa: 1.7,
  vampiro: 1.7,
  raposa_f: 1.65,
  vampira: 1.65,
  raposa_adulto: 2.0,
  vampiro_adulto: 2.0,
  raposa_adulta: 1.9,
  vampira_adulta: 1.9,
  aurion: 2.4,
  morkhan: 2.4,
  kragor: 2.4,
  zephyra: 2.4,
  maru: 2.4,
  iris: 2.4,
  noctis: 2.4,
  aeryn: 2.4,
  ciborgue: 2.0,
  cavaleiro: 2.0,
  golem: 2.0,
  garras: 2.0,
}

/** Altura do corpo em metros (os avatares do bairro e as skins antigas ≈ 1,8). */
export const bodyHeight = (b: BodyId): number => HEIGHT[b] ?? 1.8
