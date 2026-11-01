// features/meu-mundo/heights.ts — altura de cada corpo (chão → topo da cabeça,
// sem chapéu, orelhas e chifres). Regra do Alex (2026-11-01): jovens das
// classes 1,70 m (menino) / 1,65 m (menina), adultos 2,70 m, deuses 3,20 m,
// Golem e Ciborgue 4 m (2ª regra do Alex, 2026-11-01). A escala mora no GLB (raiz do esqueleto, pipeline/build_deuses.py);
// aqui só o que fica SOBRE a cabeça (nome, balão, destaque) acompanha.
import type { BodyId } from "./types"

const HEIGHT: Partial<Record<BodyId, number>> = {
  raposa: 1.7,
  vampiro: 1.7,
  raposa_f: 1.65,
  vampira: 1.65,
  raposa_adulto: 2.7,
  vampiro_adulto: 2.7,
  raposa_adulta: 2.7,
  vampira_adulta: 2.7,
  aurion: 3.2,
  morkhan: 3.2,
  kragor: 3.2,
  zephyra: 3.2,
  maru: 3.2,
  iris: 3.2,
  noctis: 3.2,
  aeryn: 3.2,
  ciborgue: 4.0,
  cavaleiro: 2.0,
  golem: 4.0,
  garras: 2.0,
}

/** Altura do corpo em metros (os avatares do bairro e as skins antigas ≈ 1,8). */
export const bodyHeight = (b: BodyId): number => HEIGHT[b] ?? 1.8
