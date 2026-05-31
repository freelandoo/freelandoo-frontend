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
  onClose: () => void
  onPosted?: () => void
}

export type { FilterState }
