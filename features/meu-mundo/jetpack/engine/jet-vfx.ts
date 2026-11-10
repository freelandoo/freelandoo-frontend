// features/meu-mundo/jetpack/engine/jet-vfx.ts — JETPACK 2.0: os efeitos do voo.
//
// Contínuos (ligados enquanto a fase roda):
//  - EXAUSTÃO: faíscas que saem dos bocais quando o propulsor acende e ficam
//    para trás (o jogador avança, elas não);
//  - AMBIENTE por fase: no Cânion, riscos de VENTO correndo para trás e poeira
//    dourada no ar (outras fases ganham o delas na próxima etapa).
// Disparos (pelo FxStage do jogo, montados no primeiro uso e reaproveitados):
//  - anel atravessado (aro de faíscas douradas), galão pego (verde), batida
//    (poeira e faíscas).
// Tudo escala pelo orçamento da qualidade (FX_BUDGET) e é decorativo: não
// decide nada do voo. Nunca na frente do caminho por muito tempo (as
// partículas do vento nascem fora do miolo da caixa e são finas).

import type { Scene } from "@babylonjs/core/scene"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { Constants } from "@babylonjs/core/Engines/constants"
import { FxStage, type FxBuilder, type FxBudget } from "../../engine/fx/fx-core"
import type { QualityTier } from "../../engine/quality"
import type { PhaseId } from "../sim/phases"

function dotTexture(scene: Scene, name: string, streak: boolean) {
  const W = streak ? 64 : 32
  const H = streak ? 8 : 32
  const tex = new DynamicTexture(name, { width: W, height: H }, scene, false)
  const c = tex.getContext() as CanvasRenderingContext2D
  const g = streak ? c.createLinearGradient(0, 0, W, 0) : c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2)
  if (streak) {
    g.addColorStop(0, "rgba(255,255,255,0)")
    g.addColorStop(0.5, "rgba(255,255,255,1)")
    g.addColorStop(1, "rgba(255,255,255,0)")
  } else {
    g.addColorStop(0, "rgba(255,255,255,1)")
    g.addColorStop(0.4, "rgba(255,255,255,0.6)")
    g.addColorStop(1, "rgba(255,255,255,0)")
  }
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  tex.hasAlpha = true
  tex.update()
  return tex
}

export interface JetVfx {
  /** Por quadro: posição do jogador (meio do corpo), propulsor e velocidade (m/s). */
  update: (x: number, y: number, z: number, thrust: boolean, v: number) => void
  ring: (x: number, y: number, z: number, r: number) => void
  fuel: (x: number, y: number, z: number) => void
  /** Os galões à vista (faíscas verdes subindo em volta deles). */
  cans: (pts: readonly Vector3[]) => void
  /** Pegou combustível: o jogador brilha e as faíscas entram nele. */
  absorb: () => void
  crash: (x: number, y: number, z: number) => void
  /** Partículas no ar (sonda). */
  stats: () => { live: number }
  dispose: () => void
}

/** Uma explosão curta de partículas (disparo do FxStage). */
function burst(
  dot: DynamicTexture,
  opts: { cap: number; c1: Color4; c2: Color4; size: [number, number]; life: [number, number]; power: [number, number]; gravity: number; ring?: boolean },
): FxBuilder<{ x: number; y: number; z: number; r?: number }> {
  return ({ scene, budget }: { scene: Scene; budget: FxBudget }) => {
    const n = Math.max(8, Math.round(opts.cap * budget.particles))
    const ps = new ParticleSystem("jt-burst", n, scene)
    ps.particleTexture = dot
    ps.blendMode = ParticleSystem.BLENDMODE_ADD
    ps.color1 = opts.c1
    ps.color2 = opts.c2
    ps.colorDead = new Color4(opts.c2.r, opts.c2.g, opts.c2.b, 0)
    ps.minSize = opts.size[0]
    ps.maxSize = opts.size[1]
    ps.minLifeTime = opts.life[0]
    ps.maxLifeTime = opts.life[1]
    ps.minEmitPower = opts.power[0]
    ps.maxEmitPower = opts.power[1]
    ps.gravity = new Vector3(0, opts.gravity, 0)
    ps.emitRate = 0
    ps.updateSpeed = 1 / 60
    const at = new Vector3()
    ps.emitter = at
    let t = 0
    let radius = 1
    if (opts.ring) {
      // o aro: as partículas nascem num círculo de frente para o jogador e saem para fora
      ps.startPositionFunction = (_m, pos) => {
        const a = Math.random() * Math.PI * 2
        pos.set(at.x + Math.cos(a) * radius, at.y + Math.sin(a) * radius, at.z)
      }
      ps.startDirectionFunction = (_m, dir, p) => {
        dir.set(p.position.x - at.x, p.position.y - at.y, -0.6).normalize()
      }
    } else {
      ps.createSphereEmitter(0.4)
    }
    return {
      play(a) {
        at.set(a.x, a.y, a.z)
        radius = a.r ?? 1
        t = 0
        ps.start()
        ps.manualEmitCount = n
      },
      step(dt) {
        t += dt
        if (t > 0.1) ps.stop()
        return t < opts.life[1] + 0.2
      },
      stop() {
        ps.stop()
        ps.reset()
      },
      dispose() {
        ps.dispose(false)
      },
    }
  }
}

export function createJetVfx(scene: Scene, tier: QualityTier, phase: PhaseId): JetVfx {
  const stage = new FxStage(scene, tier)
  const k = stage.budget.particles
  const dot = dotTexture(scene, "jt-vfx-dot", false)
  const streak = dotTexture(scene, "jt-vfx-streak", true)
  const systems: ParticleSystem[] = []

  // ── exaustão: faíscas dos bocais ──
  const exAt = new Vector3()
  const ex = new ParticleSystem("jt-exhaust", Math.round(140 * k) + 20, scene)
  ex.particleTexture = dot
  ex.blendMode = ParticleSystem.BLENDMODE_ADD
  ex.emitter = exAt
  ex.minEmitBox = new Vector3(-0.18, -0.05, -0.05)
  ex.maxEmitBox = new Vector3(0.18, 0.05, 0.05)
  ex.direction1 = new Vector3(-0.4, -1, -0.6)
  ex.direction2 = new Vector3(0.4, -1.6, -1.2)
  ex.color1 = new Color4(1, 0.85, 0.4, 1)
  ex.color2 = new Color4(1, 0.45, 0.1, 1)
  ex.colorDead = new Color4(0.6, 0.2, 0.05, 0)
  ex.minSize = 0.04
  ex.maxSize = 0.11
  ex.minLifeTime = 0.18
  ex.maxLifeTime = 0.45
  ex.minEmitPower = 2.5
  ex.maxEmitPower = 5
  ex.gravity = new Vector3(0, -6, 0)
  ex.updateSpeed = 1 / 60
  ex.emitRate = 0
  ex.start()
  systems.push(ex)

  // ── vento do cânion: riscos finos que passam pelos lados e por cima ──
  let wind: ParticleSystem | null = null
  let dust: ParticleSystem | null = null
  const windAt = new Vector3()
  if (phase === "canion") {
    wind = new ParticleSystem("jt-wind", Math.round(90 * k) + 10, scene)
    wind.particleTexture = streak
    wind.blendMode = ParticleSystem.BLENDMODE_STANDARD
    wind.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED
    wind.emitter = windAt
    // nasce à frente, numa faixa larga; o miolo do caminho (|x| < 2,5 e y 2–6) fica livre
    wind.startPositionFunction = (_m, pos) => {
      const side = Math.random() < 0.5 ? -1 : 1
      const x = Math.random() < 0.65 ? side * (2.5 + Math.random() * 9) : (Math.random() - 0.5) * 5
      const y = Math.abs(x) < 2.5 ? (Math.random() < 0.5 ? 0.3 + Math.random() * 1.4 : 6.5 + Math.random() * 3) : Math.random() * 10
      pos.set(windAt.x + x, y, windAt.z + Math.random() * 30)
    }
    wind.direction1 = new Vector3(-0.15, 0, -1)
    wind.direction2 = new Vector3(0.15, 0.05, -1)
    wind.minEmitPower = 30
    wind.maxEmitPower = 48
    wind.minLifeTime = 0.7
    wind.maxLifeTime = 1.3
    wind.minSize = 0.05
    wind.maxSize = 0.09
    wind.minScaleX = 22
    wind.maxScaleX = 40
    wind.color1 = new Color4(1, 1, 1, 0.42)
    wind.color2 = new Color4(1, 0.96, 0.9, 0.3)
    wind.colorDead = new Color4(1, 1, 1, 0)
    wind.emitRate = 40 * k + 6
    wind.updateSpeed = 1 / 60
    wind.start()
    systems.push(wind)
    // poeira dourada flutuando (bem leve)
    dust = new ParticleSystem("jt-dust", Math.round(70 * k) + 10, scene)
    dust.particleTexture = dot
    dust.blendMode = ParticleSystem.BLENDMODE_ADD
    dust.emitter = windAt
    dust.minEmitBox = new Vector3(-14, 0, 0)
    dust.maxEmitBox = new Vector3(14, 12, 60)
    dust.direction1 = new Vector3(-0.3, 0.1, -0.4)
    dust.direction2 = new Vector3(0.3, 0.3, 0.2)
    dust.minEmitPower = 0.3
    dust.maxEmitPower = 1
    dust.minLifeTime = 2
    dust.maxLifeTime = 4
    dust.minSize = 0.05
    dust.maxSize = 0.12
    dust.color1 = new Color4(1, 0.85, 0.5, 0.5)
    dust.color2 = new Color4(1, 0.75, 0.4, 0.3)
    dust.colorDead = new Color4(1, 0.7, 0.3, 0)
    dust.emitRate = 14 * k + 2
    dust.updateSpeed = 1 / 60
    if (stage.budget.layers) dust.start()
    systems.push(dust)
  }

  // neve soprando na Tempestade Ártica (fina, contra o voo)
  if (phase === "artico") {
    const sn = new ParticleSystem("jt-snow", Math.round(160 * k) + 20, scene)
    sn.particleTexture = dot
    sn.blendMode = ParticleSystem.BLENDMODE_STANDARD
    sn.emitter = windAt
    sn.minEmitBox = new Vector3(-18, -1, 0)
    sn.maxEmitBox = new Vector3(18, 16, 50)
    sn.direction1 = new Vector3(-0.6, -0.5, -1)
    sn.direction2 = new Vector3(0.6, -0.2, -0.6)
    sn.minEmitPower = 6
    sn.maxEmitPower = 14
    sn.minLifeTime = 1.2
    sn.maxLifeTime = 2.4
    sn.minSize = 0.05
    sn.maxSize = 0.12
    sn.color1 = new Color4(1, 1, 1, 0.85)
    sn.color2 = new Color4(0.85, 0.95, 1, 0.7)
    sn.colorDead = new Color4(1, 1, 1, 0)
    sn.emitRate = 70 * k + 10
    sn.updateSpeed = 1 / 60
    sn.start()
    systems.push(sn)
  }
  // brasas da Forja subindo do rio de lava (fora do miolo do caminho)
  if (phase === "forja") {
    const em = new ParticleSystem("jt-embers", Math.round(90 * k) + 10, scene)
    em.particleTexture = dot
    em.blendMode = ParticleSystem.BLENDMODE_ADD
    em.emitter = windAt
    em.minEmitBox = new Vector3(-16, -6, 0)
    em.maxEmitBox = new Vector3(16, 0, 60)
    em.direction1 = new Vector3(-0.3, 1, -0.3)
    em.direction2 = new Vector3(0.3, 1.6, 0.3)
    em.minEmitPower = 1.5
    em.maxEmitPower = 4
    em.minLifeTime = 2
    em.maxLifeTime = 4
    em.minSize = 0.06
    em.maxSize = 0.16
    em.color1 = new Color4(1, 0.7, 0.25, 1)
    em.color2 = new Color4(1, 0.4, 0.1, 0.9)
    em.colorDead = new Color4(0.6, 0.15, 0.05, 0)
    em.emitRate = 30 * k + 4
    em.updateSpeed = 1 / 60
    em.start()
    systems.push(em)
  }
  // vaga-lumes e esporos da Floresta: pontos ciano e violeta flutuando devagar (o miolo do caminho fica livre)
  if (phase === "floresta") {
    const ff = new ParticleSystem("jt-fireflies", Math.round(110 * k) + 12, scene)
    ff.particleTexture = dot
    ff.blendMode = ParticleSystem.BLENDMODE_ADD
    ff.emitter = windAt
    ff.startPositionFunction = (_m, pos) => {
      const side = Math.random() < 0.5 ? -1 : 1
      const x = Math.random() < 0.75 ? side * (3 + Math.random() * 12) : (Math.random() - 0.5) * 6
      const y = Math.abs(x) < 3 ? (Math.random() < 0.5 ? Math.random() * 1.2 : 7 + Math.random() * 5) : Math.random() * 12
      pos.set(windAt.x + x, y, windAt.z + Math.random() * 60)
    }
    ff.direction1 = new Vector3(-0.4, -0.2, -0.4)
    ff.direction2 = new Vector3(0.4, 0.5, 0.3)
    ff.minEmitPower = 0.3
    ff.maxEmitPower = 1.2
    ff.minLifeTime = 2.5
    ff.maxLifeTime = 5
    ff.minSize = 0.07
    ff.maxSize = 0.18
    ff.color1 = new Color4(0.35, 1, 0.9, 1)
    ff.color2 = new Color4(0.8, 0.45, 1, 0.9)
    ff.colorDead = new Color4(0.3, 0.6, 1, 0)
    ff.emitRate = 26 * k + 4
    ff.updateSpeed = 1 / 60
    ff.start()
    systems.push(ff)
  }
  // ── faíscas em volta dos galões: UM sistema para todos (nasce perto de um galão sorteado)
  let canList: readonly Vector3[] = []
  const sp = new ParticleSystem("jt-can-sparks", Math.round(70 * k) + 12, scene)
  sp.particleTexture = dot
  sp.blendMode = ParticleSystem.BLENDMODE_ADD
  sp.color1 = new Color4(0.45, 1, 0.7, 1)
  sp.color2 = new Color4(0.75, 1, 0.55, 1)
  sp.colorDead = new Color4(0.3, 1, 0.6, 0)
  sp.minSize = 0.05
  sp.maxSize = 0.13
  sp.minLifeTime = 0.6
  sp.maxLifeTime = 1.1
  sp.minEmitPower = 0.3
  sp.maxEmitPower = 0.8
  sp.gravity = new Vector3(0, 0.9, 0)
  sp.updateSpeed = 1 / 60
  sp.emitter = new Vector3(0, -5000, 0)
  sp.startPositionFunction = (_m, pos) => {
    const c = canList[Math.floor(Math.random() * canList.length)]
    if (!c) return pos.set(0, -5000, 0)
    const a = Math.random() * Math.PI * 2
    const r = 0.45 + Math.random() * 0.4
    pos.set(c.x + Math.cos(a) * r, c.y - 0.4 + Math.random() * 0.8, c.z + Math.sin(a) * r)
  }
  sp.startDirectionFunction = (_m, dir) => dir.set((Math.random() - 0.5) * 0.4, 1, (Math.random() - 0.5) * 0.4)
  sp.emitRate = 0
  sp.start()
  systems.push(sp)

  // ── "absorvi": halo verde que cresce e some em volta do jogador + faíscas que CONVERGEM para ele
  const aura = CreatePlane("jt-absorb-aura", { size: 1 }, scene)
  const auraMat = new StandardMaterial("jt-absorb-aura", scene)
  auraMat.disableLighting = true
  auraMat.emissiveColor = new Color3(0.35, 1, 0.65)
  auraMat.diffuseColor = new Color3(0, 0, 0)
  auraMat.specularColor = new Color3(0, 0, 0)
  auraMat.opacityTexture = dot
  auraMat.alphaMode = Constants.ALPHA_ADD
  auraMat.disableDepthWrite = true
  auraMat.backFaceCulling = false
  aura.material = auraMat
  aura.billboardMode = TransformNode.BILLBOARDMODE_ALL
  aura.isPickable = false
  aura.setEnabled(false)
  const me = new Vector3()
  const ab = new ParticleSystem("jt-absorb", Math.round(60 * k) + 12, scene)
  ab.particleTexture = dot
  ab.blendMode = ParticleSystem.BLENDMODE_ADD
  ab.color1 = new Color4(0.5, 1, 0.75, 1)
  ab.color2 = new Color4(0.85, 1, 0.6, 1)
  ab.colorDead = new Color4(0.4, 1, 0.7, 0)
  ab.minSize = 0.07
  ab.maxSize = 0.17
  ab.minLifeTime = 0.28
  ab.maxLifeTime = 0.38
  ab.minEmitPower = 3
  ab.maxEmitPower = 4
  ab.gravity = new Vector3(0, 0, 0)
  ab.updateSpeed = 1 / 60
  ab.emitter = me
  // nascem numa esfera de 1,2 m em volta do corpo e vão para o centro
  ab.startPositionFunction = (_m, pos) => {
    const u = Math.random() * 2 - 1
    const a = Math.random() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    pos.set(me.x + s * Math.cos(a) * 1.2, me.y + u * 1.2, me.z + s * Math.sin(a) * 1.2)
  }
  ab.startDirectionFunction = (_m, dir, p) => dir.set(me.x - p.position.x, me.y - p.position.y, me.z - p.position.z).normalize()
  ab.emitRate = 0
  ab.start()
  systems.push(ab)
  let absorbT = -1
  const ABSORB = 0.75

  const RING = burst(dot, { cap: 90, c1: new Color4(1, 0.88, 0.35, 1), c2: new Color4(1, 0.6, 0.15, 1), size: [0.08, 0.2], life: [0.35, 0.7], power: [3, 7], gravity: 0, ring: true })
  const FUEL = burst(dot, { cap: 50, c1: new Color4(0.4, 1, 0.7, 1), c2: new Color4(0.2, 0.9, 1, 1), size: [0.06, 0.16], life: [0.3, 0.6], power: [2, 5], gravity: 2 })
  const CRASH = burst(dot, { cap: 80, c1: new Color4(1, 0.7, 0.3, 1), c2: new Color4(0.7, 0.55, 0.45, 1), size: [0.1, 0.35], life: [0.4, 0.9], power: [3, 9], gravity: -9 })

  return {
    update(x, y, z, thrust, v) {
      // a boca dos bocais fica nas costas, um pouco abaixo do meio do corpo
      exAt.set(x, y - 0.1, z - 0.4)
      ex.emitRate = thrust ? 160 * k + 20 : 0
      windAt.set(x * 0.5, 0, z + 18)
      me.set(x, y, z)
      sp.emitRate = canList.length ? Math.min(6, canList.length) * 7 * k + 2 : 0
      if (absorbT >= 0) {
        // pelo relógio (o celular desenha a 30 quadros: contar quadros dobraria a duração)
        const u = Math.min(1, (performance.now() - absorbT) / 1000 / ABSORB)
        aura.position.set(x, y, z + 0.05)
        aura.scaling.setAll(1.4 + u * 1.8)
        auraMat.alpha = (1 - u) * 0.95
        ab.emitRate = u < 0.45 ? 240 * k + 30 : 0
        if (u >= 1) {
          absorbT = -1
          aura.setEnabled(false)
          ab.emitRate = 0
        }
      }
      if (wind) wind.emitRate = (30 + v * 1.2) * k + 6
    },
    ring(x, y, z, r) {
      stage.play("ring", RING, { x, y, z, r }, 2)
    },
    fuel(x, y, z) {
      stage.play("fuel", FUEL, { x, y, z }, 3)
    },
    cans(pts) {
      canList = pts
    },
    absorb() {
      absorbT = performance.now()
      aura.setEnabled(true)
    },
    crash(x, y, z) {
      stage.play("crash", CRASH, { x, y, z }, 1)
    },
    stats() {
      let live = 0
      for (const ps of scene.particleSystems) live += ps.getActiveCount()
      return { live }
    },
    dispose() {
      stage.dispose()
      for (const s of systems) s.dispose(false)
      aura.dispose()
      auraMat.dispose()
      dot.dispose()
      streak.dispose()
    },
  }
}
