// features/meu-mundo/paint/engine/arenas/types.ts — PAINT (2026-11-21): o GANCHO de desenho por mapa.
//
// Os 5 mapas dos Domínios (Cânion, Gelo, Orbital, Lua, Usina) desenham o que é
// deles num arquivo próprio (`arenas/<id>.ts`, com FICHA + PARTES no topo, pela
// skill `meu-mundo-cenario-codigo`). `arena-view.ts` continua dono do que é de
// todos — chão de cada ilha no contorno exato, rocha de baixo, moldura,
// pórtico, portais — e pergunta ao mapa o que muda: textura do chão, cor de
// cada ilha, o que vai embaixo dela (rocha, chapa ou nada: o mapa desenha),
// enfeites que colidem com desenho próprio, e o resto (detalhes por `tag`,
// base, topo, o que fica lá embaixo e o fundo) no `build`.
//
// Regra de todos: nada aqui colide (a colisão é a da regra, `sim/maps.ts`),
// nada fica em cima de gatinho/cápsula/nascimento/portal (`clear.free`), e o
// que é alto e pode tapar a câmera entra em `camBlockers`.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import type { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import type { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import type { RGB } from "../../../engine/geometry"
import type { Island, PaintMap, PaintProp, Solid } from "../../sim/map"
import type { ArenaGeo, Clearance, FrameStyle } from "../arena-kit"
import type { PaintTheme } from "../paint-map-art"

/** O que vai embaixo da ilha: rocha esculpida, chapa (metal), folha, degrau ou NADA (o mapa desenha). */
export type UnderKind = "rock" | "metal" | "leaf" | "stair" | "none"

export interface ArenaCtx {
  scene: Scene
  map: PaintMap
  th: PaintTheme
  lowEnd: boolean
  high: boolean
  /** Buffers da cena (cor por vértice): aceso pela luz, sem luz, chão de pedra, chão de metal. */
  deco: ArenaGeo
  glow: ArenaGeo
  tops: ArenaGeo
  metal: ArenaGeo
  /** Longe SEM neblina (a cor já vem misturada no ar por `air`). */
  far: ArenaGeo
  farGlow: ArenaGeo
  air: (c: RGB, k?: number) => RGB
  /** Cachoeiras (planos que rolam): ponto na borda, comprimento, largura e para onde olha. */
  falls: { x: number; z: number; y: number; len: number; w: number; a: number }[]
  camBlockers: Solid[]
  clear: Clearance
  edgePoint: (isl: Island, a: number, inset: number) => { x: number; z: number }
  outlineOf: (isl: Island, maxSeg?: number) => [number, number][]
  /** Materiais da cena (para malhas próprias do mapa). */
  solidMat: StandardMaterial
  glowMat: StandardMaterial
  hemi: HemisphericLight | null
  sun: DirectionalLight | null
  /** Malha própria do mapa (é solta junto com a cena). */
  add: (m: Mesh) => void
  /** Qualquer coisa com dispose (textura, material) solta junto com a cena. */
  own: <T extends { dispose(): void }>(x: T) => T
  /** Densidade pela qualidade (low 0,5 · mid 1 · high 1,3). */
  n: number
}

export interface ArenaDress {
  /** Textura do chão das ilhas de pedra (canvas que repete; o vértice tinge). */
  topTex?: (scene: Scene, th: PaintTheme) => DynamicTexture
  /** O que vai embaixo da ilha (sem: rocha; a ilha do Guardião é sempre rocha). */
  under?: (isl: Island) => UnderKind | undefined
  /** Perfil da rocha (0–0,3 mesa reta · 0,3–0,6 degraus · 0,6–1 torta); sem = sorteio. */
  rockPick?: (isl: Island) => number | undefined
  /** Cor do chão e da borda (e se a borda é listrada). */
  colors?: (isl: Island) => { top: RGB; rim: RGB; stripes?: boolean } | null
  /** Desenha um enfeite que colide (true = desenhado; false = o desenho comum). */
  prop?: (p: PaintProp, ctx: ArenaCtx) => boolean
  /** Moldura da borda e pedra do pórtico. */
  frame?: FrameStyle
  gate?: { stone: RGB; tech: boolean }
  /** O resto: detalhes por tag, base, topo, o que fica embaixo de tudo e o fundo. */
  build: (ctx: ArenaCtx) => { tick?: (dt: number, clock: number) => void } | void
}
