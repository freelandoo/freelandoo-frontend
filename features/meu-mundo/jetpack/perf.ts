// Desempenho do jetpack: sai da mesma qualidade do Meu Mundo (item "Gráficos"
// da gaveta, ou o palpite do aparelho). No original era um detector próprio.

import { resolveQuality } from "../engine/quality"

export interface PerfProfile {
  tier: "high" | "medium"
  reducedMotion: boolean
  mobile: boolean
  maxDpr: number
  /** Brilho (bloom) das luzes; ainda desliga sozinho se o FPS cair. */
  bloom: boolean
}

export function jetpackPerf(): PerfProfile {
  const q = resolveQuality()
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  const mobile = (window.matchMedia?.("(pointer: coarse)").matches ?? false) || Math.min(screen.width, screen.height) < 700
  return {
    tier: q.tier === "high" ? "high" : "medium",
    reducedMotion,
    mobile,
    maxDpr: q.maxRatio,
    bloom: q.tier !== "low" && !reducedMotion,
  }
}

/** WebGL 2 disponível (o jogo não roda sem). */
export function hasWebGL2(): boolean {
  try {
    const c = document.createElement("canvas")
    const gl = c.getContext("webgl2")
    const ok = !!gl
    gl?.getExtension("WEBGL_lose_context")?.loseContext()
    return ok
  } catch {
    return false
  }
}
