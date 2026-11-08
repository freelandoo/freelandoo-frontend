// features/meu-mundo/corrida/sim/circuits.ts — CORRIDA (mm3d-74): o CATÁLOGO de circuitos.
//
// Pedido do Alex (prompt da expansão + referências em Downloads/PISTAS): 6
// pistas — a Baía Suspensa de sempre e mais 5, com quedas grandes, loops,
// túneis holográficos, espirais e saltos. Aqui só a REGRA de cada uma (peças
// da tartaruga de track.ts); nome, ambiente, cores e cartão ficam no desenho
// (engine/circuit-art.ts). O servidor roda este mesmo arquivo (gerado por
// scripts/build-corrida-sim.js no back): mudou → regerar e commitar os dois.
//
// Todas com 18 m de largura e as mesmas regras de nave. Curvas com raio ≥ ~55
// m onde se passa rápido; loop sempre depois de reta (a nave entra alinhada).

import { BAIA, buildTrack, type Track, type TrackDef } from "./track"

/** Abismo Vermelho — cânion: curvas na borda, túnel suspenso, a grande descida e o salto. */
export const ABISMO: TrackDef = {
  id: "abismo-vermelho",
  width: 18,
  startY: 70,
  startS: 40,
  pieces: [
    { len: 170, pads: [[110, 0]], gates: [40], orbs: [[75, -5], [75, 5]] },
    { len: 270, turn: 117 },
    { len: 70, turn: -48, orbs: [[35, -4]] },
    { len: 120, turn: 95, orbs: [[60, 4]] },
    { len: 120, tunnel: true, pads: [[60, 0]] },
    { len: 100, tunnel: true, gates: [50] },
    { len: 230, dy: -62, kind: "drop", orbs: [[120, 0]] },
    { len: 90, pads: [[20, -1], [20, 1]] },
    { len: 55, dy: 9, kind: "ramp" },
    { len: 125, dy: -14, kind: "gap" },
    { len: 90, gates: [45] },
    { len: 155, turn: 125, dy: 30, pads: [[110, 0]] },
    { len: 310, dy: 26, orbs: [[150, -5], [150, 5]] },
    { len: 360, turn: 71, dy: 12 },
  ],
}

/** Floresta Espectral — túnel largo entre as árvores, pontes no alto e a espiral que desce. */
export const FLORESTA: TrackDef = {
  id: "floresta-espectral",
  width: 18,
  startY: 46,
  startS: 40,
  pieces: [
    { len: 160, pads: [[100, 0]], gates: [40], orbs: [[70, -5], [70, 5]] },
    { len: 116, turn: -92 },
    { len: 170, tunnel: true, orbs: [[85, 0]] },
    { len: 72, tunnel: true, turn: -49 },
    { len: 140, dy: 18, gates: [70] },
    { len: 85, turn: 5, orbs: [[40, 4]] },
    // a espiral: uma volta inteira descendo (a pista passa por baixo dela mesma)
    { len: 480, turn: -360, dy: -44, kind: "drop", pads: [[240, 0]] },
    { len: 110, orbs: [[55, -4], [55, 4]] },
    { len: 170, dy: -26, kind: "drop" },
    { len: 217, turn: -115, pads: [[120, -1]] },
    { len: 324, dy: 22, orbs: [[160, 0]] },
    { len: 426, turn: -109, dy: 30 },
  ],
}

/** Neon Overdrive — megacidade: o loop entre os prédios, túnel e a descida rumo ao centro. */
export const NEON: TrackDef = {
  id: "neon-overdrive",
  width: 18,
  startY: 80,
  startS: 40,
  pieces: [
    { len: 190, pads: [[120, 0]], gates: [40], orbs: [[80, -5], [80, 5]] },
    { len: 170, turn: 85 },
    { len: 110, pads: [[30, 0]] },
    { len: 150, kind: "loop", side: 22 },
    { len: 110, tunnel: true, orbs: [[55, 0]] },
    { len: 160, turn: 80, tunnel: true },
    { len: 240, dy: -58, kind: "drop", pads: [[170, 0]] },
    { len: 140, gates: [70], orbs: [[60, -5], [60, 5]] },
    { len: 160, turn: 90 },
    { len: 230, dy: 48, orbs: [[110, 0]] },
    { len: 200, turn: 95, dy: 10 },
  ],
}

/** Tempestade Oceânica — longas curvas sobre o mar, plataformas ligadas por saltos, túnel. */
export const TEMPESTADE: TrackDef = {
  id: "tempestade-oceanica",
  width: 18,
  startY: 26,
  startS: 40,
  pieces: [
    { len: 170, pads: [[110, 0]], gates: [40], orbs: [[75, -5], [75, 5]] },
    // a grande curva inclinada exposta ao mar
    { len: 330, turn: 175, dy: 8, orbs: [[165, 4]] },
    { len: 140, tunnel: true, pads: [[70, 0]] },
    { len: 120, turn: -50 },
    { len: 120, turn: 50, orbs: [[60, -4]] },
    { len: 70, pads: [[10, -1], [10, 1]] },
    { len: 45, dy: 6, kind: "ramp" },
    { len: 75, dy: -10, kind: "gap" },
    { len: 90, gates: [45] },
    { len: 180, turn: 90, dy: -4 },
    { len: 150, tunnel: true, orbs: [[75, 0]] },
    { len: 180, turn: 92 },
  ],
}

/** Forja Infinita — dentro da máquina: túnel interno, o loop gigante, subida e a queda. */
export const FORJA: TrackDef = {
  id: "forja-infinita",
  width: 18,
  startY: 56,
  startS: 40,
  pieces: [
    { len: 160, pads: [[100, 0]], gates: [40], orbs: [[70, -5], [70, 5]] },
    { len: 160, turn: -85, tunnel: true },
    { len: 130, tunnel: true, pads: [[90, 0]] },
    { len: 200, kind: "loop", side: -24 },
    { len: 100, gates: [50], orbs: [[50, 0]] },
    { len: 180, dy: 40 },
    { len: 170, turn: -90 },
    { len: 210, dy: -66, kind: "drop", pads: [[150, 0]] },
    { len: 110, orbs: [[55, -5], [55, 5]] },
    { len: 170, turn: -85, tunnel: true },
    { len: 60, pads: [[10, 0]] },
    { len: 50, dy: 8, kind: "ramp" },
    { len: 90, dy: -12, kind: "gap" },
    { len: 200, turn: -95, dy: 10 },
  ],
}

/** As 6 pistas na ordem do cardápio. A primeira é a padrão (a Baía Suspensa). */
export const TRACK_DEFS: readonly TrackDef[] = [BAIA, ABISMO, FLORESTA, NEON, TEMPESTADE, FORJA]
export const DEFAULT_TRACK = BAIA.id

/** Definição pelo id (desconhecido = a padrão). */
export function trackDefOf(id: string | null | undefined): TrackDef {
  return TRACK_DEFS.find((d) => d.id === id) ?? BAIA
}

const builtTracks = new Map<string, Track>()
/** Pista montada (uma vez por id). */
export function trackOf(id: string | null | undefined): Track {
  const def = trackDefOf(id)
  let t = builtTracks.get(def.id)
  if (!t) {
    t = buildTrack(def)
    builtTracks.set(def.id, t)
  }
  return t
}
