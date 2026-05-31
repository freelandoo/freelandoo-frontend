// lib/camera/types.ts
// Tipos compartilhados do módulo de câmera (Stories/Bees).

export type StoryKind = "trampo" | "rest"

export type FrameStyle = "none" | "classic" | "tabloide" | "polaroid"

/** Acessórios de rosto (face tracking) — desenhados proceduralmente. */
export type AccessoryType = "none" | "glasses" | "red-glasses" | "sunglasses" | "crown" | "hat"

/** Estado dos filtros de cor — vira uniforms do shader WebGL. */
export interface FilterState {
  brightness: number // -1..1 (0 neutro)
  contrast: number // -1..1
  saturation: number // -1..1
  temperature: number // -1..1 (+ quente)
  vignette: number // 0..1
  grain: number // 0..1
  mono: number // 0..1 (1 = P&B)
  tint: [number, number, number] // multiplicador RGB (papel/sépia)
  tintStrength: number // 0..1
}

/** Sobreposições desenhadas no compositor 2D (entram no vídeo final). */
export interface OverlayState {
  frame: FrameStyle
  watermark: boolean // marca d'água Freelandoo
  stickers: StickerInstance[]
  accessory: AccessoryType // acessório de rosto (face tracking)
}

/** Maquiagem básica (face tracking) — pele no shader, batom/blush no compositor.
 *  Batom e blush são controlados por réguas: cor (hue), opacidade e blur. */
export interface MakeupState {
  skinSmooth: number // 0..1 (suavização de pele)
  lipstick: number // opacidade 0..1 (0 = desligado)
  lipColor: string
  lipBlur: number // 0..1
  blush: number // opacidade 0..1 (0 = desligado)
  blushColor: string
  blushBlur: number // 0..1
}

export const NEUTRAL_MAKEUP: MakeupState = {
  skinSmooth: 0,
  lipstick: 0,
  lipColor: "#c2185b",
  lipBlur: 0.4,
  blush: 0,
  blushColor: "#f0708a",
  blushBlur: 0.5,
}

export interface StickerInstance {
  id: string
  char: string // emoji / glifo
  x: number // 0..1 (relativo)
  y: number // 0..1
  size: number // fração da menor dimensão
}

export interface Preset {
  id: string
  label: string
  filter: FilterState
  /** Gradiente CSS p/ o thumb do carrossel (sem assets binários). */
  swatch: string
}

/** Metadados não-biométricos enviados ao backend (filter_meta). */
export interface FilterMeta {
  preset: string
  filter: FilterState
  overlay: { frame: FrameStyle; watermark: boolean; sticker_count: number; accessory: AccessoryType }
  makeup: { skin_smooth: number; lipstick: number; blush: number }
  encoder: "webcodecs" | "mediarecorder"
}

export const NEUTRAL_FILTER: FilterState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  vignette: 0,
  grain: 0,
  mono: 0,
  tint: [1, 1, 1],
  tintStrength: 0,
}

export const NEUTRAL_OVERLAY: OverlayState = {
  frame: "none",
  watermark: false,
  stickers: [],
  accessory: "none",
}

/** Cor da marca (amarelo Freelandoo). */
export const BRAND_YELLOW = "#facc15"
