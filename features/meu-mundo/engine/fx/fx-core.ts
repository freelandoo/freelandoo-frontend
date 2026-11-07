// features/meu-mundo/engine/fx/fx-core.ts — núcleo dos efeitos (prompt de VFX, 2026-11-07).
//
// Um FxStage por palco (bairro, centro, prédio, luta, minijogo): nasce e morre com a cena,
// então trocar de ambiente não deixa nada para trás. Regras:
//  - nada é criado antes do primeiro uso (o efeito é montado no primeiro `play`);
//  - efeito é reaproveitado: disparar 100 vezes não cria 100 malhas;
//  - sem efeito no ar não há custo: a escuta do quadro só existe enquanto algo vive;
//  - sem Engine nem laço próprios: anda no quadro da cena;
//  - decorativo: nunca decide dano, atributo ou recarga, e erro aqui não derruba o jogo.

import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import type { QualityTier } from "../quality"

/** O que cada qualidade permite. HIGH nunca é o padrão: quem escolhe é `resolveQuality`. */
export interface FxBudget {
  /** Multiplica quantidade e ritmo das partículas. */
  particles: number
  /** Efeitos no ar ao mesmo tempo, no palco inteiro. */
  maxLive: number
  /** Camadas caras (tubos e transparências grandes). */
  layers: boolean
}

export const FX_BUDGET: Record<QualityTier, FxBudget> = {
  low: { particles: 0.3, maxLive: 6, layers: false },
  mid: { particles: 0.6, maxLive: 12, layers: true },
  high: { particles: 1, maxLive: 20, layers: true },
}

export interface FxEffect<A> {
  play: (args: A) => void
  /** Um quadro; devolve false quando acabou de vez. */
  step: (dt: number) => boolean
  /** Corta na hora (sem partícula viva e sem emissor ligado). */
  stop: () => void
  dispose: () => void
}

export interface FxContext {
  scene: Scene
  budget: FxBudget
}

export type FxBuilder<A> = (ctx: FxContext) => FxEffect<A>

interface Slot {
  id: string
  fx: FxEffect<never>
  live: boolean
  /** Ordem do último disparo: o mais velho cede a vaga. */
  order: number
}

export interface FxStats {
  /** Efeitos montados (ficam guardados, parados). */
  built: number
  live: number
  peakLive: number
  plays: number
  /** Disparos que tomaram a vaga de outro por causa do limite. */
  evicted: number
  listening: boolean
}

export class FxStage {
  readonly budget: FxBudget
  private readonly slots: Slot[] = []
  private obs: Observer<Scene> | null = null
  private order = 0
  private disposed = false
  private peakLive = 0
  private plays = 0
  private evicted = 0

  constructor(
    private readonly scene: Scene,
    tier: QualityTier,
  ) {
    this.budget = FX_BUDGET[tier]
  }

  private liveCount() {
    return this.slots.reduce((n, s) => n + (s.live ? 1 : 0), 0)
  }

  /** Dispara `id`. `perId` = quantos desse efeito existem no máximo. */
  play<A>(id: string, build: FxBuilder<A>, args: A, perId = 1) {
    if (this.disposed) return
    try {
      const mine = this.slots.filter((s) => s.id === id)
      let slot = mine.find((s) => !s.live)
      if (!slot && mine.length < perId) {
        slot = { id, fx: build({ scene: this.scene, budget: this.budget }) as FxEffect<never>, live: false, order: 0 }
        this.slots.push(slot)
      }
      // todos deste efeito ocupados: o mais velho recomeça
      slot ??= mine.reduce((a, b) => (a.order < b.order ? a : b))
      if (!slot.live && this.liveCount() >= this.budget.maxLive) {
        const oldest = this.slots.filter((s) => s.live).reduce((a, b) => (a.order < b.order ? a : b))
        oldest.fx.stop()
        oldest.live = false
        this.evicted++
      }
      ;(slot.fx as unknown as FxEffect<A>).play(args)
      slot.live = true
      slot.order = ++this.order
      this.plays++
      this.peakLive = Math.max(this.peakLive, this.liveCount())
      this.listen()
    } catch (err) {
      console.warn("[meu-mundo] efeito não abriu", id, err)
    }
  }

  private listen() {
    if (this.obs) return
    this.obs = this.scene.onBeforeRenderObservable.add(() => this.tick())
  }

  private tick() {
    const dt = Math.min(0.05, this.scene.getEngine().getDeltaTime() / 1000)
    let any = false
    for (const s of this.slots) {
      if (!s.live) continue
      try {
        s.live = s.fx.step(dt)
      } catch (err) {
        console.warn("[meu-mundo] efeito parou", s.id, err)
        s.live = false
        s.fx.stop()
      }
      any ||= s.live
    }
    if (!any && this.obs) {
      this.scene.onBeforeRenderObservable.remove(this.obs)
      this.obs = null
    }
  }

  stats(): FxStats {
    return { built: this.slots.length, live: this.liveCount(), peakLive: this.peakLive, plays: this.plays, evicted: this.evicted, listening: !!this.obs }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.obs) this.scene.onBeforeRenderObservable.remove(this.obs)
    this.obs = null
    for (const s of this.slots) s.fx.dispose()
    this.slots.length = 0
  }
}
