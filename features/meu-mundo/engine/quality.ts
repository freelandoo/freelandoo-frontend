// features/meu-mundo/engine/quality.ts
//
// Qualidade gráfica (mm3d-19). O jogo é para público de massa: precisa rodar
// do celular de entrada ao computador. Três peças:
//
//  - `detectTier`: palpite do aparelho (memória, núcleos, GPU, toque). Erra
//    para baixo — começar leve e subir é melhor que travar na entrada.
//  - `QUALITY`: o que cada nível muda. Só coisas baratas de trocar em tempo
//    de jogo: densidade de pixels, distância da neblina e do horizonte, e até
//    onde os outros jogadores aparecem em detalhe, animados e com nome.
//  - `ResolutionGovernor`: mede o FPS de verdade e ajusta a resolução de
//    desenho. Celular fraco é limitado por pixel pintado; baixar 15% da
//    resolução custa pouco na imagem e devolve o quadro.
//
// A escolha do jogador ("Automática", "Baixa", "Média", "Alta") fica no
// navegador dele — é conveniência por aparelho, não estado do jogo.

import type { Engine } from "@babylonjs/core/Engines/engine"

export type QualityTier = "low" | "mid" | "high"
export type QualityChoice = "auto" | QualityTier

export interface QualityProfile {
  tier: QualityTier
  /** Teto da densidade de pixels (o governador sobe até aqui). */
  maxRatio: number
  /** Piso da densidade de pixels (o governador desce até aqui). */
  minRatio: number
  fogStart: number
  fogEnd: number
  /** Horizonte da câmera (m): depois da neblina não há o que desenhar. */
  maxZ: number
  /** A partir daqui (m) o avatar alheio usa a malha leve. */
  avatarLod: number
  /** A partir daqui (m) o avatar alheio some e para de animar. */
  avatarCut: number
  /** A partir daqui (m) o nome some (ilegível de longe). */
  tagCut: number
}

export const QUALITY: Record<QualityTier, QualityProfile> = {
  low: { tier: "low", maxRatio: 1, minRatio: 0.5, fogStart: 45, fogEnd: 115, maxZ: 125, avatarLod: 10, avatarCut: 70, tagCut: 22 },
  mid: { tier: "mid", maxRatio: 1.25, minRatio: 0.6, fogStart: 60, fogEnd: 150, maxZ: 165, avatarLod: 16, avatarCut: 110, tagCut: 30 },
  high: { tier: "high", maxRatio: 1.5, minRatio: 0.75, fogStart: 70, fogEnd: 165, maxZ: 260, avatarLod: 24, avatarCut: 165, tagCut: 40 },
}

// GPUs de entrada (celular barato e computador velho) e renderizadores por
// software. Lista curta de propósito: o governador corrige o que escapar.
const WEAK_GPU =
  /Mali-(4\d\d|T\d|G(31|51|52|57|68))|Adreno \(TM\) ([34]\d\d|5[0-4]\d|6[01]\d)|PowerVR|SwiftShader|llvmpipe|Software|Intel.*HD Graphics ([2-5]\d{2,3}\b|$)/i
const STRONG_GPU = /NVIDIA|GeForce|Radeon|AMD|Apple M\d|Adreno \(TM\) [78]\d\d|Mali-G7[1-9]\d|Immortalis/i

function gpuName(): string {
  try {
    const c = document.createElement("canvas")
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null
    if (!gl) return ""
    const ext = gl.getExtension("WEBGL_debug_renderer_info")
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    gl.getExtension("WEBGL_lose_context")?.loseContext()
    return name
  } catch {
    return ""
  }
}

let cachedTier: QualityTier | null = null

/** Palpite do aparelho, calculado uma vez por página. */
export function detectTier(): QualityTier {
  if (cachedTier) return cachedTier
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mem = nav.deviceMemory ?? 8
  const cores = nav.hardwareConcurrency || 4
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false
  const gpu = gpuName()
  let tier: QualityTier
  if (WEAK_GPU.test(gpu) || mem <= 2 || (touch && cores <= 4)) tier = "low"
  // Celular fica no meio mesmo com GPU boa: a tela é pequena e a bateria conta.
  else if (touch || mem <= 4) tier = "mid"
  else tier = STRONG_GPU.test(gpu) ? "high" : "mid"
  cachedTier = tier
  return tier
}

const KEY = "mm-quality"

export function loadQualityChoice(): QualityChoice {
  try {
    const v = localStorage.getItem(KEY)
    if (v === "low" || v === "mid" || v === "high" || v === "auto") return v
  } catch {}
  return "auto"
}

export function saveQualityChoice(c: QualityChoice) {
  try {
    if (c === "auto") localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, c)
  } catch {}
}

/** Perfil em uso: a escolha do jogador ou o palpite do aparelho. */
export function resolveQuality(choice: QualityChoice = loadQualityChoice()): QualityProfile {
  return QUALITY[choice === "auto" ? detectTier() : choice]
}

/**
 * Teto de quadros (ms entre quadros; 0 = sem teto). Celular desenha a 30: é o
 * que segura a temperatura numa partida de 10–20 min (desenhar a 60 sem teto
 * em tela de alta densidade é o que mais esquenta). Computador fica livre.
 * Com o teto, o governador mede ~30 FPS: não desce (limite 25) nem sobe (50).
 */
export function frameCapMs(): number {
  if (typeof window === "undefined") return 0
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false
  return touch ? 1000 / 30 : 0
}

/**
 * Ajusta a resolução de desenho pelo FPS medido, em janelas de 1 s:
 *  - abaixo de 25 FPS em duas janelas seguidas, desce 15% (até `minRatio`),
 *    com 2 s de espera entre descidas para o efeito aparecer na medida. Não
 *    é 30: aparelho com teto de 30 FPS (iPhone em economia de bateria) mede
 *    27–29 por oscilação e perderia resolução sem estar pesado;
 *  - acima de 50 FPS por 4 janelas seguidas, sobe 0,1 (até `maxRatio`).
 * Janela com um quadro enorme (carregamento de modelo, aba que volta) não
 * conta — seria punir a resolução por um soluço que não é de desenho.
 */
export class ResolutionGovernor {
  ratio: number
  private frames = 0
  private elapsed = 0
  private worst = 0
  private good = 0
  private bad = 0
  private cooldown = 3
  private max: number
  private min: number

  constructor(
    private readonly engine: Engine,
    profile: QualityProfile,
    /** Teto da tela (devicePixelRatio e o limite de quem chamou). */
    private readonly screenCap: number,
  ) {
    this.max = Math.min(profile.maxRatio, screenCap)
    this.min = Math.min(profile.minRatio, this.max)
    this.ratio = this.max
    engine.setHardwareScalingLevel(1 / this.ratio)
  }

  /** Troca de perfil (o jogador escolheu outra qualidade). */
  setProfile(profile: QualityProfile) {
    this.max = Math.min(profile.maxRatio, this.screenCap)
    this.min = Math.min(profile.minRatio, this.max)
    this.apply(this.max)
    this.good = 0
    this.bad = 0
    this.cooldown = 2
  }

  private apply(r: number) {
    const next = Math.round(Math.max(this.min, Math.min(this.max, r)) * 100) / 100
    if (next === this.ratio) return
    this.ratio = next
    this.engine.setHardwareScalingLevel(1 / next)
  }

  /** Um quadro; `dtMs` é o tempo real do quadro. */
  tick(dtMs: number) {
    if (typeof document !== "undefined" && document.hidden) return
    this.frames++
    this.elapsed += dtMs
    if (dtMs > this.worst) this.worst = dtMs
    if (this.elapsed < 1000) return
    const fps = (this.frames * 1000) / this.elapsed
    const spiky = this.worst > 250
    this.frames = 0
    this.elapsed = 0
    this.worst = 0
    if (this.cooldown > 0) {
      this.cooldown--
      return
    }
    if (spiky) return
    if (fps < 25) {
      this.good = 0
      if (++this.bad >= 2 && this.ratio > this.min) {
        this.apply(this.ratio * 0.85)
        this.bad = 0
        this.cooldown = 2
      }
      return
    }
    this.bad = 0
    if (fps > 50) {
      if (++this.good >= 4 && this.ratio < this.max) {
        this.apply(this.ratio + 0.1)
        this.good = 0
        this.cooldown = 1
      }
    } else this.good = 0
  }
}
