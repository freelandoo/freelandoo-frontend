// features/meu-mundo/ui/portraits.ts — o retrato pré-renderizado de cada
// corpo/skin (pipeline/build_portraits.py). Uma imagem pequena por corpo: o
// STATUS e o balão dos avisos (mm3d-28) usam a mesma, sem renderizar 3D.

import type { BodyId } from "../types"

export const PORTRAIT: Record<BodyId, string> = {
  normal: "/meu-mundo/retratos/v1/normal.webp",
  slim: "/meu-mundo/retratos/v1/slim.webp",
  fat: "/meu-mundo/retratos/v1/fat.webp",
  strong: "/meu-mundo/retratos/v1/strong.webp",
  sergio: "/meu-mundo/retratos/v1/sergio.webp",
}
