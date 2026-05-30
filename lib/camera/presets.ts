// lib/camera/presets.ts
// Presets de cor 100% PROCEDURAIS (sem arquivos .cube/PNG) — zero risco de
// licença de assets e bundle menor. Cada preset define um FilterState base;
// os sliders ajustam por cima.

import { FilterState, Preset } from "./types"

function f(p: Partial<FilterState>): FilterState {
  return {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    vignette: 0,
    grain: 0,
    mono: 0,
    tint: [1, 1, 1],
    tintStrength: 0,
    ...p,
  }
}

export const PRESETS: Preset[] = [
  {
    id: "original",
    label: "Original",
    swatch: "linear-gradient(135deg,#9ca3af,#e5e7eb)",
    filter: f({}),
  },
  {
    id: "quente",
    label: "Quente",
    swatch: "linear-gradient(135deg,#fb923c,#fde68a)",
    filter: f({ temperature: 0.32, saturation: 0.1, brightness: 0.03 }),
  },
  {
    id: "frio",
    label: "Frio",
    swatch: "linear-gradient(135deg,#38bdf8,#a5b4fc)",
    filter: f({ temperature: -0.32, contrast: 0.06, saturation: 0.04 }),
  },
  {
    id: "pb",
    label: "P&B",
    swatch: "linear-gradient(135deg,#111827,#9ca3af)",
    filter: f({ mono: 1, contrast: 0.16, grain: 0.05 }),
  },
  {
    id: "vintage",
    label: "Vintage",
    swatch: "linear-gradient(135deg,#a16207,#d6c08a)",
    filter: f({
      temperature: 0.2,
      saturation: -0.2,
      vignette: 0.4,
      grain: 0.12,
      tint: [1.06, 0.98, 0.82],
      tintStrength: 0.5,
    }),
  },
  {
    id: "tabloide",
    label: "Tabloide",
    swatch: "linear-gradient(135deg,#facc15,#1c1917)",
    // Identidade Freelandoo: jornal — alto contraste, dessaturado, papel quente,
    // grão e vinheta. Combina bem com moldura "tabloide".
    filter: f({
      contrast: 0.38,
      saturation: -0.38,
      brightness: 0.02,
      vignette: 0.45,
      grain: 0.18,
      tint: [1.04, 0.99, 0.86],
      tintStrength: 0.6,
    }),
  },
  {
    id: "estudio",
    label: "Estúdio",
    swatch: "linear-gradient(135deg,#fef3c7,#fbbf24)",
    filter: f({ brightness: 0.08, contrast: 0.1, saturation: 0.08, vignette: 0.18 }),
  },
]

export const DEFAULT_PRESET_ID = "original"

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) || PRESETS[0]
}
