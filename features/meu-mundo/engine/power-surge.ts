// ═══ PODER TRANSBORDANDO (Alex, 2026-11-18) ═══
//
// Quem passou do teto da faixa de Poder do nível (power/power.ts powerBand/isOverpowered — o servidor
// decide e manda `ov` no jogador da sala) anda soltando faíscas pelo chão: vermelhas no Vampiro (ov 1),
// verdes na Raposa (ov 2). As faíscas nascem nos pés em coordenadas do MUNDO, então ficam para trás e
// desenham o rastro por onde a pessoa anda; parada, só um fiozinho em volta.
//
// Um ParticleSystem por personagem marcado (ninguém marcado = nada criado). Textura única, aditiva,
// tamanho e quantidade pelo `particles` da qualidade (engine/quality.ts). Mistura NORMAL, não aditiva: sobre a
// areia clara do bairro a soma lavava o vermelho para laranja (foto de 2026-11-18).

import type { Scene } from "@babylonjs/core/scene"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"

/** 0 = normal; 1 = Vampiro (vermelho); 2 = Raposa (verde). */
export type SurgeKind = 0 | 1 | 2

const PALETTE: Record<1 | 2, { hot: Color4; deep: Color4; dead: Color4 }> = {
  1: { hot: new Color4(1, 0.12, 0.08, 1), deep: new Color4(0.72, 0, 0.04, 0.9), dead: new Color4(0.3, 0, 0, 0) },
  2: { hot: new Color4(0.35, 1, 0.3, 1), deep: new Color4(0.02, 0.7, 0.2, 0.9), dead: new Color4(0, 0.25, 0.05, 0) },
}
/** Faíscas por segundo andando e parado (multiplicadas pelo `particles` da qualidade). */
const RATE = { walk: 90, idle: 6 }
/** Acima disto (m/s) conta como andando. */
const MOVING = 0.4

interface Trail {
  kind: 1 | 2
  holder: TransformNode
  ps: ParticleSystem
  at: Vector3
  last: Vector3
  speed: number
}

export class PowerSurge {
  private readonly trails = new Map<string, Trail>()
  private tex: DynamicTexture | null = null

  constructor(
    private readonly scene: Scene,
    /** `particles` da qualidade (0,3 baixo · 0,6 médio · 1 alto). */
    private readonly budget: number
  ) {}

  /** Marca (ou desmarca) quem transborda. Chamado a cada atualização da sala; barato se nada mudou. */
  set(key: string, kind: number | undefined, holder: TransformNode) {
    const k = (kind === 1 || kind === 2 ? kind : 0) as SurgeKind
    const cur = this.trails.get(key)
    if (!k) return void (cur && this.drop(key))
    if (cur && cur.kind === k && cur.holder === holder) return
    if (cur) this.drop(key)
    this.trails.set(key, this.make(k, holder))
  }

  drop(key: string) {
    const t = this.trails.get(key)
    if (!t) return
    t.ps.stop()
    t.ps.dispose(false)
    this.trails.delete(key)
  }

  step(dt: number) {
    if (dt <= 0) return
    for (const t of this.trails.values()) {
      const p = t.holder.getAbsolutePosition()
      const v = Math.hypot(p.x - t.last.x, p.z - t.last.z) / dt
      // média curta: a rede chega em degraus, o rastro não pode piscar
      t.speed += (Math.min(v, 20) - t.speed) * Math.min(1, dt * 8)
      t.last.copyFrom(p)
      t.at.set(p.x, p.y + 0.05, p.z)
      const visible = t.holder.isEnabled()
      t.ps.emitRate = !visible ? 0 : (t.speed > MOVING ? RATE.walk : RATE.idle) * this.budget
    }
  }

  dispose() {
    for (const key of [...this.trails.keys()]) this.drop(key)
    this.tex?.dispose()
    this.tex = null
  }

  /** Faísca redonda de borda macia (gerada uma vez). */
  private texture(): DynamicTexture {
    if (this.tex) return this.tex
    const size = 64
    const tex = new DynamicTexture("mm-surge-spark", { width: size, height: size }, this.scene, false)
    const ctx = tex.getContext() as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, "rgba(255,255,255,1)")
    g.addColorStop(0.35, "rgba(255,255,255,0.75)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    tex.hasAlpha = true
    tex.update()
    this.tex = tex
    return tex
  }

  private make(kind: 1 | 2, holder: TransformNode): Trail {
    const at = holder.getAbsolutePosition().clone()
    const ps = new ParticleSystem(`mm-surge-${kind}`, Math.max(32, Math.round(220 * this.budget)), this.scene)
    ps.particleTexture = this.texture()
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD
    ps.updateSpeed = 1 / 60
    ps.emitter = at
    // nascem num disco em volta dos pés e sobem devagar, como brasa saindo do chão
    ps.createCylinderEmitter(0.35, 0.05, 0.25, 0.15)
    const c = PALETTE[kind]
    ps.color1 = c.hot
    ps.color2 = c.deep
    ps.colorDead = c.dead
    ps.minSize = 0.08
    ps.maxSize = 0.2
    ps.minLifeTime = 1
    ps.maxLifeTime = 2
    ps.minEmitPower = 0.1
    ps.maxEmitPower = 0.45
    ps.gravity.set(0, 0.3, 0)
    ps.minAngularSpeed = -2
    ps.maxAngularSpeed = 2
    ps.emitRate = 0
    ps.start()
    return { kind, holder, ps, at, last: at.clone(), speed: 0 }
  }
}
