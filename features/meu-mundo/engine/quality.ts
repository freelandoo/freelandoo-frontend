// features/meu-mundo/engine/quality.ts
//
// Qualidade gráfica (mm3d-19; visual premium E7, 2026-11-14 — o "GraphicsQualityManager"
// do prompt master §18–§20). O jogo é para público de massa: precisa rodar do celular de
// entrada ao computador. Peças:
//
//  - `QUALITY`: a TABELA dos três perfis (LOW/MEDIUM/HIGH = "low"/"mid"/"high"), num só
//    lugar: resolução, neblina e horizonte, céu, vegetação, partículas, bloom, sombras e LOD.
//    Cada sistema lê daqui (o céu em `sky/`, os efeitos em `fx/fx-core.ts`, o bairro e o
//    centro pelo `propCut`/`detail`, os Domínios pelo `lodScale`); valor novo entra AQUI.
//  - `detectTier`: palpite do aparelho (memória, núcleos, GPU, toque). Erra para baixo —
//    começar leve e subir é melhor que travar na entrada.
//  - `ResolutionGovernor`: mede o desempenho de verdade. Duas alavancas:
//     1. resolução de desenho (`setHardwareScalingLevel`), janelas de 1 s — a primeira e a
//        mais barata de trocar (celular fraco é limitado por pixel pintado);
//     2. no "Automático", o PERFIL inteiro, janelas de 5 s com p95 do tempo de quadro e
//        histerese: desce rápido em queda sustentada (2 janelas ruins, depois de a
//        resolução já ter cedido), sobe devagar (6 janelas folgadas, 60 s depois de uma
//        descida) e, se subir e cair de novo, não sobe mais naquela cena. Pausa na carga
//        da cena, nas trocas de ambiente (`hold`) e em luta (`lockTier`).
//    O perfil aprendido fica guardado (`mm-quality-auto`) e a próxima cena já nasce nele.
//
// O `SceneOptimizer` do Babylon não é usado: ele só desce, degrau por degrau, não volta a
// subir, não sabe de luta nem de carga e mexe em coisas que o jogo já controla (sombras,
// partículas, texturas). A alavanca dele que vale (a escala de hardware) já está aqui.
//
// A escolha do jogador ("Automática", "Baixa", "Média", "Alta") fica no navegador dele —
// é conveniência por aparelho, não estado do jogo. Nada disso passa pela rede.

import type { Engine } from "@babylonjs/core/Engines/engine"
import type { Observer } from "@babylonjs/core/Misc/observable"
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine"
import { markSceneStart, setQualityProbe, type QualityProbe } from "./scene-meter"

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
  /**
   * Bairro (V1 visual): lado do bloco de props (m) e o corte por distância
   * das peças pequenas — `[tamanho (m), distância (m)]`, ver `ChunkedGeo`.
   * A peça some com poucos pixels e já dentro da neblina.
   */
  propCell: number
  /** O bloco com a tela deitada (largura > 1,3 × altura): menos blocos no quadro largo. */
  propCellWide: number
  propCut: readonly (readonly [number, number])[]
  /**
   * Lado da pele dos personagens na rua e no centro. A multidão (26 robôs, monstros,
   * jogadores) usava ~21 peles de 1024 = ~111 MB de GPU, quase 80% da textura da cena,
   * e o iPhone matava a aba ao entrar no centro. Em 512 cai para ~28 MB; o personagem
   * na rua ocupa poucos pixels. A luta (de perto) segue com a de 1024.
   */
  avatarSkin: 512 | 1024
  /** Céu panorâmico (`sky/`): lado da arte, gomos do domo e o brilho/estrelas por cima. */
  sky: { tex: 1024 | 2048; segments: number; fx: boolean }
  /**
   * Densidade da vegetação e do miúdo decorativo (0–1): quem espalhar mato, flor, pedrinha,
   * cogumelo por instância multiplica a quantidade por isto. (O `detail` do kit steampunk,
   * espaçamento de trilho e rebite dos minijogos, segue 0,6/1 por conta própria.)
   */
  vegetation: number
  /** Partículas: multiplica quantidade e ritmo; teto de partículas vivas de AMBIENTE na cena. */
  particles: number
  maxParticles: number
  /** Efeitos de golpe/ambiente no ar ao mesmo tempo, e as camadas caras (tubos, transparências). */
  fxLive: number
  fxLayers: boolean
  /**
   * Bloom (§15): "off" nunca; "optional" só o que já é brilho localizado (GlowLayer de
   * efeito, sem pós-processo de tela inteira); "margin" (high) liga também o bloom SELETIVO do
   * cenário (`bloom-cena.ts`: só lava, cristais, painéis e janelas; a rua só de noite) — a folga é
   * o próprio perfil: o automático desce para o mid quando falta. Bloom de tela inteira, nunca.
   */
  bloom: "off" | "optional" | "margin"
  /**
   * Sombras (§14): "contact" = sombra falsa de contato nos personagens; `map` = lado do mapa da
   * sombra REAL dos personagens (`char-shadows.ts`: jogador + monstros perto lançam, o cenário só
   * recebe), que liga SÓ no high — o 512 do mid fica reservado (medido: +0,26 ms no bairro já no
   * computador, e o mid é o perfil do celular).
   */
  shadows: { contact: "few" | "players" | "all"; map: 0 | 512 | 1024 }
  /** LOD (§13): multiplica as distâncias de troca de detalhe (agressivo < 1 < qualidade). */
  lodScale: number
  /** Resolução (§19): "adaptive" desce cedo, "balanced", "high" segura a nitidez. */
  resolution: "adaptive" | "balanced" | "high"
}

// A tabela do §19. As colunas de cima são as de sempre (mm3d-19, V1); as de baixo
// (E7) trazem para cá o que cada sistema decidia sozinho com `tier === "low"`.
// Baked lighting, AO pré-calculado e neblina simples valem nos TRÊS (estão na malha).
export const QUALITY: Record<QualityTier, QualityProfile> = {
  low: {
    tier: "low", maxRatio: 1, minRatio: 0.5, fogStart: 45, fogEnd: 115, maxZ: 125, avatarLod: 10, avatarCut: 70, tagCut: 22, propCell: 32, propCellWide: 48, propCut: [[0.12, 25], [0.3, 45], [0.6, 70]], avatarSkin: 512,
    sky: { tex: 1024, segments: 32, fx: false }, vegetation: 0.6, particles: 0.3, maxParticles: 250, fxLive: 6, fxLayers: false,
    bloom: "off", shadows: { contact: "few", map: 0 }, lodScale: 0.77, resolution: "adaptive",
  },
  mid: {
    tier: "mid", maxRatio: 1.25, minRatio: 0.6, fogStart: 60, fogEnd: 150, maxZ: 165, avatarLod: 16, avatarCut: 110, tagCut: 30, propCell: 32, propCellWide: 32, propCut: [[0.08, 40], [0.2, 65], [0.45, 105]], avatarSkin: 512,
    sky: { tex: 2048, segments: 48, fx: true }, vegetation: 0.8, particles: 0.6, maxParticles: 700, fxLive: 12, fxLayers: true,
    bloom: "optional", shadows: { contact: "players", map: 512 }, lodScale: 1, resolution: "balanced",
  },
  high: {
    tier: "high", maxRatio: 1.5, minRatio: 0.75, fogStart: 70, fogEnd: 165, maxZ: 260, avatarLod: 24, avatarCut: 165, tagCut: 40, propCell: 32, propCellWide: 32, propCut: [[0.08, 55], [0.2, 90]], avatarSkin: 1024,
    sky: { tex: 2048, segments: 48, fx: true }, vegetation: 1, particles: 1, maxParticles: 1500, fxLive: 20, fxLayers: true,
    bloom: "margin", shadows: { contact: "all", map: 1024 }, lodScale: 1.25, resolution: "high",
  },
}

/** Ordem dos perfis (o automático anda um degrau por vez). */
export const TIERS: readonly QualityTier[] = ["low", "mid", "high"]

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

const AUTO_KEY = "mm-quality-auto"
/** Evento do `window` quando o automático grava um perfil novo (`detail` = o perfil). */
export const QUALITY_EVENT = "mm-quality-tier"
/** O perfil aprendido vale 3 dias: depois o aparelho (ou o navegador) pode ter mudado. */
const AUTO_TTL = 3 * 24 * 3600 * 1000

/** O perfil que o "Automático" aprendeu medindo (null = ainda não mediu neste aparelho). */
export function loadAutoTier(): QualityTier | null {
  try {
    const raw = localStorage.getItem(AUTO_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { t?: string; at?: number }
    if ((v.t === "low" || v.t === "mid" || v.t === "high") && typeof v.at === "number" && Date.now() - v.at < AUTO_TTL) return v.t
  } catch {}
  return null
}

export function saveAutoTier(t: QualityTier) {
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify({ t, at: Date.now() }))
  } catch {}
  // a gaveta ("Automática · Média") acompanha sem ler nada por quadro
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(QUALITY_EVENT, { detail: t }))
}

/** O perfil do "Automático": o que já mediu, senão o palpite do aparelho. */
export function autoTier(): QualityTier {
  return loadAutoTier() ?? detectTier()
}

/** Perfil em uso: a escolha do jogador ou, no automático, o medido (ou o palpite). */
export function resolveQuality(choice: QualityChoice = loadQualityChoice()): QualityProfile {
  return QUALITY[choice === "auto" ? autoTier() : choice]
}

/**
 * Teto de quadros (ms entre quadros; 0 = sem teto). Celular desenha a 30: é o
 * que segura a temperatura numa partida de 10–20 min (desenhar a 60 sem teto
 * em tela de alta densidade é o que mais esquenta). Computador fica livre.
 * Com o teto, o governador mede ~30 FPS: a meta dele no celular é 30 (desce abaixo de 25).
 */
export function frameCapMs(): number {
  if (typeof window === "undefined") return 0
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false
  return touch ? 1000 / 30 : 0
}

/** Meta de quadros (§20): celular 30 (é o teto dele), computador 60. */
function targetFps(): number {
  if (typeof window === "undefined") return 60
  return window.matchMedia?.("(pointer: coarse)").matches ? 30 : 60
}

function pct(a: number[], q: number): number {
  if (!a.length) return 0
  const s = a.slice().sort((x, y) => x - y)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]
}

const debugOn = () => typeof window !== "undefined" && /[?&]mmscene=1/.test(window.location.search)
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())

/** O que o governador sabe agora (quadrinho do `?mmscene=1` e `__mmScene().quality`). */
export interface QualityStats {
  choice: QualityChoice
  tier: QualityTier
  /** O perfil anda sozinho nesta cena? (escolha "auto" e cena que aprende/troca) */
  auto: boolean
  ratio: number
  targetFps: number
  /** Última janela de 5 s: FPS médio, p95 do intervalo entre quadros, CPU por quadro média e p95 (ms). */
  fpsAvg: number
  p95Ms: number
  cpuMs: number
  cpuP95Ms: number
  /** "medindo", "carga" (início/soluço), "pausa" (troca de ambiente), "luta", "fixo" (escolha manual ou cena sem automático). */
  state: "medindo" | "carga" | "pausa" | "luta" | "fixo"
  /** Janelas seguidas ruins / folgadas (a histerese). */
  bad: number
  good: number
  /** Trocas de perfil nesta cena, a última ("mid→low 12,3 s") e se o subir travou por oscilar. */
  changes: number
  last: string | null
  upLocked: boolean
}

/**
 * Mede o desempenho de verdade e ajusta, nesta ordem:
 *
 * 1. Resolução (janelas de 1 s; vale em toda cena e em qualquer escolha):
 *    - abaixo de 83% da meta (25 FPS no celular, 50 no PC) em duas janelas seguidas,
 *      desce 15% (até `minRatio`), com 2 s de espera entre descidas para o efeito
 *      aparecer na medida. No celular não é 30: aparelho com teto de 30 (iPhone em
 *      economia de bateria) mede 27–29 por oscilação e perderia resolução sem estar pesado;
 *    - folgado por 4 janelas seguidas (acima de 93% da meta e, com meta 30, a CPU
 *      abaixo de 45% do quadro — com teto o FPS não sobe), sobe 0,1 (até `maxRatio`).
 *    Janela com um quadro enorme (carregamento de modelo, aba que volta) não conta.
 *    Teto externo de 30 no PC (economia de bateria do navegador): quadros cravados em
 *    33 ms, sem variação e com CPU folgada, não são peso — a meta vira 30.
 *
 * 2. Perfil (janelas de 5 s; só no "Automático" e na cena que aprende):
 *    - ruim = FPS médio < 80% da meta ou p95 > 1,6 × o quadro da meta. Duas ruins
 *      seguidas (10 s) depois de a resolução já ter cedido, ou três seguidas de qualquer
 *      jeito (gargalo de CPU, que resolução não resolve) → um degrau abaixo;
 *    - folgada = FPS ≥ 92% da meta, p95 ≤ 1,3 × o quadro e CPU p95 ≤ metade do quadro.
 *      Seis seguidas (30 s), resolução no teto e 60 s desde a última descida → um degrau
 *      acima. Subiu e caiu de novo em 90 s: não sobe mais nesta cena (não oscila);
 *    - nada conta nos primeiros 8 s (carga), 4 s depois de cada troca, durante `hold`
 *      (troca de ambiente, cena de história) e com `lockTier` (luta).
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
  private profile: QualityProfile
  private choice: QualityChoice
  private readonly target = targetFps()
  private capped30 = false
  // CPU por quadro: do começo ao fim do quadro do motor (lógica do jogo + envio do desenho)
  private frameT0 = 0
  private lastCpu = 0
  private cpu1: number[] = []
  // janela de 5 s do perfil
  private iv5: number[] = []
  private cpu5: number[] = []
  private t5 = 0
  private spiky5 = false
  private bad5 = 0
  private good5 = 0
  private holdUntil: number
  private locked = false
  /** Cena que só aprende: depois de gravar um degrau, para de decidir (a imagem não mudou). */
  private learned = false
  private lastDownAt = -Infinity
  private lastUpAt = -Infinity
  private upLocked = false
  private changes = 0
  private lastChange: string | null = null
  private readonly born = now()
  private snap = { fpsAvg: 0, p95Ms: 0, cpuMs: 0, cpuP95Ms: 0 }
  private readonly onTier: ((p: QualityProfile) => void) | null
  private readonly learn: boolean
  private obs: Observer<AbstractEngine>[] = []

  constructor(
    private readonly engine: Engine,
    profile: QualityProfile,
    /** Teto da tela (devicePixelRatio e o limite de quem chamou). */
    private readonly screenCap: number,
    /**
     * `onTier`: a cena troca de perfil AO VIVO (bairro, centro, casa) — o automático chama
     * isto com o perfil novo. `learn`: a cena não troca ao vivo (Domínio), mas o perfil
     * medido fica gravado e vale a partir da próxima cena. Sem nenhum dos dois (minijogos,
     * luta) só a resolução se mexe — luta nunca troca de perfil.
     */
    opts: { onTier?: (p: QualityProfile) => void; learn?: boolean } = {},
  ) {
    this.profile = profile
    this.choice = loadQualityChoice()
    this.onTier = opts.onTier ?? null
    this.learn = opts.learn ?? false
    this.max = Math.min(profile.maxRatio, screenCap)
    this.min = Math.min(profile.minRatio, this.max)
    this.ratio = this.max
    this.holdUntil = this.born + 8000
    engine.setHardwareScalingLevel(1 / this.ratio)
    const lag = debugOn()
    const begin = engine.onBeginFrameObservable.add(() => {
      this.frameT0 = now()
      // `?mmscene=1` + `window.__mmLag = ms`: atraso artificial por quadro (prova do automático).
      const l = lag ? Number((window as unknown as { __mmLag?: number }).__mmLag) || 0 : 0
      if (l > 0) {
        const end = this.frameT0 + l
        while (now() < end) {
          /* espera ocupada de propósito: simula CPU lenta */
        }
      }
    })
    const end = engine.onEndFrameObservable.add(() => {
      this.lastCpu = now() - this.frameT0
    })
    this.obs = [begin, end]
    engine.onDisposeObservable.addOnce(() => this.dispose())
    // Toda cena do jogo cria um governador: é aqui que o medidor único nasce.
    markSceneStart(engine)
    const probe: QualityProbe = () => this.stats()
    setQualityProbe(engine, probe)
  }

  private get autoOn() {
    return this.choice === "auto" && (this.onTier !== null || this.learn) && !this.learned
  }

  /** Troca de perfil pelo jogador (gaveta "Gráficos"): lê a escolha gravada de novo. */
  setProfile(profile: QualityProfile) {
    this.choice = loadQualityChoice()
    this.useProfile(profile, false)
    this.bad5 = 0
    this.good5 = 0
    this.upLocked = false
    this.hold(4000)
  }

  private useProfile(profile: QualityProfile, keepRatio: boolean) {
    this.profile = profile
    this.max = Math.min(profile.maxRatio, this.screenCap)
    this.min = Math.min(profile.minRatio, this.max)
    this.apply(keepRatio ? this.ratio : this.max)
    this.good = 0
    this.bad = 0
    this.cooldown = 2
  }

  /** Não mede o perfil por `ms` (troca de ambiente, cena de história, carga de peça grande). */
  hold(ms: number) {
    this.holdUntil = Math.max(this.holdUntil, now() + ms)
    this.resetWindow()
  }

  /** Luta (ou momento em que trocar o perfil atrapalha): só a resolução se mexe. */
  lockTier(on: boolean) {
    this.locked = on
    this.bad5 = 0
    this.good5 = 0
    this.resetWindow()
  }

  get tier(): QualityTier {
    return this.profile.tier
  }

  stats(): QualityStats {
    const t = now()
    return {
      choice: this.choice,
      tier: this.profile.tier,
      auto: this.autoOn,
      ratio: this.ratio,
      targetFps: this.capped30 ? 30 : this.target,
      ...this.snap,
      state: !this.autoOn ? "fixo" : this.locked ? "luta" : t < this.holdUntil ? (t - this.born < 8000 ? "carga" : "pausa") : "medindo",
      bad: this.bad5,
      good: this.good5,
      changes: this.changes,
      last: this.lastChange,
      upLocked: this.upLocked,
    }
  }

  dispose() {
    for (const o of this.obs) o.remove()
    this.obs = []
  }

  private apply(r: number) {
    const next = Math.round(Math.max(this.min, Math.min(this.max, r)) * 100) / 100
    if (next === this.ratio) return
    this.ratio = next
    this.engine.setHardwareScalingLevel(1 / next)
  }

  private resetWindow() {
    this.iv5 = []
    this.cpu5 = []
    this.t5 = 0
    this.spiky5 = false
  }

  /** Um quadro; `dtMs` é o tempo real do quadro. */
  tick(dtMs: number) {
    if (typeof document !== "undefined" && document.hidden) {
      this.resetWindow()
      return
    }
    const cpu = this.lastCpu
    this.tierSample(dtMs, cpu)
    this.frames++
    this.elapsed += dtMs
    this.cpu1.push(cpu)
    if (dtMs > this.worst) this.worst = dtMs
    if (this.elapsed < 1000) return
    const fps = (this.frames * 1000) / this.elapsed
    const cpuP = pct(this.cpu1, 0.95)
    const spiky = this.worst > 250
    this.frames = 0
    this.elapsed = 0
    this.worst = 0
    this.cpu1 = []
    if (this.cooldown > 0) {
      this.cooldown--
      return
    }
    if (spiky) return
    const T = this.capped30 ? 30 : this.target
    const budget = 1000 / T
    if (fps < T * 0.83) {
      this.good = 0
      if (++this.bad >= 2 && this.ratio > this.min) {
        this.apply(this.ratio * 0.85)
        this.bad = 0
        this.cooldown = 2
      }
      return
    }
    this.bad = 0
    const roomy = fps > T * 0.93 && (T > 30 || cpuP < budget * 0.45)
    if (roomy) {
      if (++this.good >= 4 && this.ratio < this.max) {
        this.apply(this.ratio + 0.1)
        this.good = 0
        this.cooldown = 1
      }
    } else this.good = 0
  }

  private tierSample(dtMs: number, cpu: number) {
    const t = now()
    if (t < this.holdUntil) return
    this.iv5.push(dtMs)
    this.cpu5.push(cpu)
    this.t5 += dtMs
    if (dtMs > 250) this.spiky5 = true
    if (this.t5 < 5000) return
    const iv = this.iv5
    const cp = this.cpu5
    const spiky = this.spiky5
    this.resetWindow()
    const fpsAvg = (iv.length * 1000) / iv.reduce((a, b) => a + b, 0)
    const p95 = pct(iv, 0.95)
    const cpuAvg = cp.reduce((a, b) => a + b, 0) / Math.max(1, cp.length)
    const cpuP95 = pct(cp, 0.95)
    const r1 = (x: number) => Math.round(x * 10) / 10
    this.snap = { fpsAvg: r1(fpsAvg), p95Ms: r1(p95), cpuMs: r1(cpuAvg), cpuP95Ms: r1(cpuP95) }
    // soluço de carga (peça chegando, aba que volta): a janela não vale e espera mais 3 s
    if (spiky) {
      this.hold(3000)
      return
    }
    // teto externo de 30 no PC: quadros cravados em ~33 ms, sem variação e com CPU folgada
    if (this.target > 30 && !this.capped30) {
      const mean = 1000 / fpsAvg
      const sd = Math.sqrt(iv.reduce((a, b) => a + (b - mean) * (b - mean), 0) / iv.length)
      if (Math.abs(fpsAvg - 30) < 1.5 && sd < 1.5 && cpuP95 < 12) this.capped30 = true
    }
    if (!this.autoOn || this.locked) return
    const T = this.capped30 ? 30 : this.target
    const budget = 1000 / T
    const bad = fpsAvg < T * 0.8 || p95 > budget * 1.6
    const good = fpsAvg >= T * 0.92 && p95 <= budget * 1.3 && cpuP95 <= budget * 0.5
    const i = TIERS.indexOf(this.profile.tier)
    if (bad) {
      this.good5 = 0
      this.bad5++
      const resGaveWay = this.ratio <= this.max - 0.05 || this.max - this.min < 0.05
      if (i > 0 && ((this.bad5 >= 2 && resGaveWay) || this.bad5 >= 3)) {
        if (t - this.lastUpAt < 90000) this.upLocked = true
        this.lastDownAt = t
        this.switchTier(TIERS[i - 1], t)
      }
      return
    }
    this.bad5 = 0
    if (!good) {
      this.good5 = 0
      return
    }
    this.good5++
    if (i < TIERS.length - 1 && !this.upLocked && this.good5 >= 6 && this.ratio >= this.max - 0.01 && t - this.lastDownAt > 60000) {
      this.lastUpAt = t
      this.switchTier(TIERS[i + 1], t)
    }
  }

  private switchTier(next: QualityTier, t: number) {
    const from = this.profile.tier
    this.changes++
    this.lastChange = `${from}→${next} ${((t - this.born) / 1000).toFixed(1)} s`
    this.bad5 = 0
    this.good5 = 0
    saveAutoTier(next)
    // A cena que não troca ao vivo só aprende: vale na próxima. A que troca muda agora,
    // e a resolução já cedida não volta ao teto (o perfil novo começa de onde ela estava).
    if (this.onTier) this.useProfile(QUALITY[next], true)
    else this.learned = true
    this.holdUntil = Math.max(this.holdUntil, t + 4000)
    this.resetWindow()
    if (debugOn()) console.info(`[mm-quality] ${this.lastChange}${this.onTier ? "" : " (vale na próxima cena)"}`)
    try {
      this.onTier?.(QUALITY[next])
    } catch (e) {
      console.warn("[mm-quality] troca de perfil", e)
    }
  }
}
