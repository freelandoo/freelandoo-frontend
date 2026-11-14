// features/meu-mundo/jetpack/engine/pecas/portal-pal.ts — as paletas do aro (portal) por fase.
//
// A forma é a dos dois testes da vitrine (portal-artico, portal-gelo); a fase só troca a cor.
// Regra da skill: metal com base escura (0,03–0,16), o claro vem da quina; luz acesa em degradê
// (borda → miolo) com algo escuro em volta.

import { NAVY, NAVY_DK, PLATE, SHELL, EDGE, DEEP, STEEL, BRASS, COPPER, HAZ_Y, HAZ_K, G_RED, G_OR, G_HOT, G_CORE, G_AMB, CYAN, type RGB } from "../../../engine/cena-codigo/kit"

export interface PalPortal {
  NAVY: RGB
  NAVY_DK: RGB
  PLATE: RGB
  SHELL: RGB
  EDGE: RGB
  DEEP: RGB
  STEEL: RGB
  BRASS: RGB
  COPPER: RGB
  HAZ_Y: RGB
  HAZ_K: RGB
  G_RED: RGB
  G_OR: RGB
  G_HOT: RGB
  G_CORE: RGB
  G_AMB: RGB
  CYAN: RGB
}

/** O teste original: azul-ardósia com luz laranja (Ártico). */
export const PAL_METAL: PalPortal = { NAVY, NAVY_DK, PLATE, SHELL, EDGE, DEEP, STEEL, BRASS, COPPER, HAZ_Y, HAZ_K, G_RED, G_OR, G_HOT, G_CORE, G_AMB, CYAN }

/** Cânion: bronze queimado (os anéis de metal sobre o rio), luz laranja do pôr do sol. */
export const PAL_CANION: PalPortal = {
  ...PAL_METAL,
  NAVY: [0.2, 0.11, 0.06],
  NAVY_DK: [0.11, 0.06, 0.035],
  PLATE: [0.3, 0.17, 0.08],
  SHELL: [0.42, 0.25, 0.11],
  EDGE: [0.78, 0.55, 0.28],
  DEEP: [0.04, 0.025, 0.015],
  STEEL: [0.34, 0.27, 0.2],
  BRASS: [0.8, 0.58, 0.22],
  CYAN: [0.45, 0.95, 1],
}

/** Cidade Orbital: grafite azulado com luz ciano e um toque magenta. */
export const PAL_ORBITAL: PalPortal = {
  ...PAL_METAL,
  NAVY: [0.09, 0.1, 0.16],
  NAVY_DK: [0.045, 0.05, 0.09],
  PLATE: [0.15, 0.17, 0.26],
  SHELL: [0.62, 0.66, 0.78],
  EDGE: [0.74, 0.82, 0.98],
  G_RED: [0.1, 0.42, 1],
  G_OR: [0.2, 0.75, 1],
  G_HOT: [0.62, 0.97, 1],
  G_CORE: [0.92, 1, 1],
  G_AMB: [0.3, 0.85, 1],
  CYAN: [1, 0.3, 0.86],
}

/** Floresta: madeira escura com veios acesos verde-água (bioluminescência). */
export const PAL_FLORESTA: PalPortal = {
  ...PAL_METAL,
  NAVY: [0.17, 0.11, 0.08],
  NAVY_DK: [0.09, 0.06, 0.045],
  PLATE: [0.24, 0.16, 0.1],
  SHELL: [0.14, 0.24, 0.17],
  EDGE: [0.42, 0.34, 0.22],
  DEEP: [0.03, 0.025, 0.02],
  STEEL: [0.22, 0.18, 0.13],
  BRASS: [0.36, 0.6, 0.3],
  HAZ_Y: [0.3, 0.85, 0.55],
  HAZ_K: [0.05, 0.07, 0.05],
  G_RED: [0.1, 0.6, 0.55],
  G_OR: [0.2, 0.9, 0.75],
  G_HOT: [0.62, 1, 0.82],
  G_CORE: [0.9, 1, 0.92],
  G_AMB: [0.4, 1, 0.7],
  CYAN: [0.75, 0.4, 1],
}
