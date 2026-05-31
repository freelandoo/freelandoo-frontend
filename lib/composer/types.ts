// lib/composer/types.ts
// Tipos do editor de criação unificado (Post · Bee · Story).
// Reusa FilterState/FilterMeta do módulo de câmera p/ manter a mesma "cara" de cor.

import type { FilterState } from "@/lib/camera/types"
import type { StoryKind } from "@/lib/camera/types"

export type { StoryKind }

/** Superfície que está usando o editor. Decide proporção, canal e destino. */
export type ComposerMode = "post" | "bee" | "story"

/** Tipo da mídia escolhida. */
export type MediaKind = "image" | "video"

/** Proporção de saída (largura/altura). */
export interface AspectOption {
  id: string
  label: string
  ratio: number // w/h
}

export const ASPECTS: Record<string, AspectOption> = {
  "4:5": { id: "4:5", label: "4:5", ratio: 4 / 5 },
  "1:1": { id: "1:1", label: "1:1", ratio: 1 },
  "16:9": { id: "16:9", label: "16:9", ratio: 16 / 9 },
  "9:16": { id: "9:16", label: "9:16", ratio: 9 / 16 },
}

/** Estado de corte/zoom. `aspect` é w/h; zoom>=1; pan em -1..1. */
export interface CropState {
  aspect: number
  zoom: number
  panX: number
  panY: number
}

export const NEUTRAL_CROP: CropState = { aspect: 9 / 16, zoom: 1, panX: 0, panY: 0 }

/** Rascunho da mídia selecionada (antes de exportar). */
export interface MediaDraft {
  file: File
  kind: MediaKind
  url: string // object URL (preview)
  width: number
  height: number
  durationSec?: number // só vídeo
}

/** Estilo da caixa do texto sobreposto. */
export type TextBoxStyle = "rounded" | "transparent"

/** Fontes disponíveis p/ texto (mapeadas p/ CSS var + família canvas). */
export type TextFontId = "display" | "sans" | "marker"

export const TEXT_FONTS: Record<TextFontId, { label: string; cssVar: string; canvas: string }> = {
  display: { label: "Manchete", cssVar: "var(--font-anton)", canvas: "Anton, 'Arial Narrow', sans-serif" },
  sans: { label: "Corpo", cssVar: "var(--font-archivo)", canvas: "Archivo, system-ui, sans-serif" },
  marker: { label: "Manuscrito", cssVar: "var(--font-caveat)", canvas: "Caveat, cursive" },
}

/** Cores disponíveis p/ texto/caixa (paleta tabloide). */
export const TEXT_COLORS = ["#F2B705", "#0B0B0D", "#F1EDE2", "#1d4ed8", "#c2371f"] as const

/** Camada de texto sobreposto (queimada no canvas). Posição/tamanho relativos (0..1). */
export interface TextLayer {
  id: string
  text: string
  font: TextFontId
  color: string
  box: TextBoxStyle
  boxColor: string
  x: number // centro 0..1
  y: number // centro 0..1
  size: number // fração da menor dimensão (altura da fonte)
}

/** Sobreposição PiP (imagem ou vídeo colado por cima da mídia principal).
 *  Queimada no export. v1: 1 overlay por vez. */
export interface OverlayLayer {
  id: string
  kind: MediaKind
  url: string // object URL
  x: number // centro 0..1
  y: number // centro 0..1
  scale: number // largura do overlay como fração da largura do canvas
}

/** Música anexada (metadado — não é queimada). Preenchido no slice 5. */
export interface AudioPick {
  trackId: string
  title: string
  artist: string | null
  startMs: number
}

/** Resultado do export local pronto p/ upload. */
export interface ComposedResult {
  blob: Blob
  kind: MediaKind
  width: number
  height: number
  durationSec: number
  posterBlob: Blob | null
  encoder: "webcodecs" | "mediarecorder" | "image"
  mimeType: string
}

/** Resolução-alvo de saída por modo (largura base; altura = largura/aspect). */
export function targetWidthFor(mode: ComposerMode, kind: MediaKind): number {
  // Vídeo: 720 (bate com o recorder/capability check da câmera). Foto: 1080.
  if (kind === "video") return 720
  return 1080
}

export interface ComposerProps {
  open: boolean
  mode: ComposerMode
  /** Só story: canal herdado do lugar (feed→rest / enxame→trampo). */
  initialKind?: StoryKind
  initialProfileId?: string | null
  onClose: () => void
  onPosted?: () => void
}

export type { FilterState }
