// features/meu-mundo/engine/aether-fountain.ts — gacha-v1b (24/11/2026): a ÁGUA da Fonte do Éter (praça do centro).
// Um ParticleSystem só (gotas translúcidas, sem sombra): o jato do meio sobe do cristal e cai na taça/bacia, e as quatro
// bicas da borda jogam arcos para o meio. Gotas pequenas e azuladas, com brilho de éter. Perfil baixo = metade.
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Color4 } from "@babylonjs/core/Maths/math.color"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { CustomParticleEmitter } from "@babylonjs/core/Particles/EmitterTypes/customParticleEmitter"
import type { Scene } from "@babylonjs/core/scene"

export interface FountainSpec {
  x: number
  z: number
  r: number
  h: number
}

export class AetherFountain {
  private ps: ParticleSystem
  private tex: DynamicTexture

  constructor(scene: Scene, f: FountainSpec, low: boolean) {
    const tex = new DynamicTexture("mm-fonte-tex", { width: 32, height: 32 }, scene, true)
    const c = tex.getContext() as unknown as CanvasRenderingContext2D
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, "rgba(255,255,255,0.9)")
    g.addColorStop(0.5, "rgba(220,240,255,0.5)")
    g.addColorStop(1, "rgba(120,200,255,0)")
    c.fillStyle = g
    c.fillRect(0, 0, 32, 32)
    tex.hasAlpha = true
    tex.update(false)
    this.tex = tex

    const rate = low ? 120 : 260
    const ps = new ParticleSystem("mm-fonte", Math.round(rate * 1.6), scene)
    ps.particleTexture = tex
    ps.emitter = new Vector3(0, 0, 0)
    const top = f.h + 2.25
    const em = new CustomParticleEmitter()
    // 45% jato do meio, 55% as quatro bicas
    const spout = new Array<number>(4).fill(0).map((_, k) => (k / 4) * Math.PI * 2 + Math.PI / 4)
    em.particlePositionGenerator = (_i, _p, out) => {
      if (Math.random() < 0.45) out.set(f.x + (Math.random() - 0.5) * 0.06, top, f.z + (Math.random() - 0.5) * 0.06)
      else {
        const a = spout[(Math.random() * 4) | 0]
        out.set(f.x + Math.cos(a) * (f.r - 0.45), f.h + 0.3, f.z + Math.sin(a) * (f.r - 0.45))
      }
    }
    // a direção sai da posição já sorteada (o jato do meio nasce lá no alto, as bicas na borda)
    em.particleDirectionGenerator = (_i, p, out) => {
      const pos = (p as unknown as { position: Vector3 }).position
      if (pos.y > f.h + 1) {
        const a = Math.random() * Math.PI * 2
        const s = 0.15 + Math.random() * 0.3
        out.set(Math.cos(a) * s, 3.4 + Math.random() * 0.9, Math.sin(a) * s)
      } else {
        // da bica para o meio: um arco que cai perto da coluna
        const dx = f.x - pos.x
        const dz = f.z - pos.z
        const d = Math.hypot(dx, dz) || 1
        const v = 1.25 + Math.random() * 0.25
        out.set((dx / d) * v, 2.1 + Math.random() * 0.35, (dz / d) * v)
      }
    }
    ps.particleEmitterType = em
    ps.minEmitPower = 1
    ps.maxEmitPower = 1
    ps.minLifeTime = 0.9
    ps.maxLifeTime = 1.25
    ps.emitRate = rate
    ps.minSize = 0.045
    ps.maxSize = 0.09
    ps.addSizeGradient(0, 1)
    ps.addSizeGradient(1, 0.55)
    // abaixo do limiar do brilho da cena (senão o bloom borra o jato numa nuvem)
    ps.addColorGradient(0, new Color4(0.62, 0.8, 0.9, 0.8))
    ps.addColorGradient(0.6, new Color4(0.38, 0.62, 0.85, 0.6))
    ps.addColorGradient(1, new Color4(0.3, 0.5, 0.8, 0))
    ps.gravity = new Vector3(0, -7.5, 0)
    // mistura normal: somadas, as gotas viram uma nuvem branca (a cena ainda tem brilho por cima)
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD
    ps.updateSpeed = 1 / 60
    ps.start()
    this.ps = ps
  }

  dispose() {
    this.ps.dispose()
    this.tex.dispose()
  }
}
