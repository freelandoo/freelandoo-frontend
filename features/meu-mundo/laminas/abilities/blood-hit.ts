// features/meu-mundo/laminas/abilities/blood-hit.ts — o acerto dos vampiros (2026-11-07).
//
// Linguagem de jogo de luta, na gravação do Alex: curto, duro e no ponto exato do golpe.
//  - estrela de recorte duro, em faixas chapadas, que troca de forma a cada 2 quadros
//    (quadro a quadro, como desenho, sem brilho embaçado);
//  - um corte curto da lua na diagonal, alternando o lado a cada golpe do combo;
//  - lascas retas espirrando, em mistura normal para não virar névoa de luz.
// Só desenho: quem decide o acerto é a regra. Anda em tempo real, então segue no ar durante a
// pausa de impacto. Sem nada no ar não custa nada (FxStage).

import type { Scene } from "@babylonjs/core/scene"
import { Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import type { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"
import type { FxBuilder, FxEffect, FxStage } from "../../engine/fx/fx-core"
import { moonMesh, shaderOf } from "./blood-cut"

const SLOTS = 4
/** Quanto dura a estrela e o corte, por força do golpe (s). */
const LIFE = [0.13, 0.15, 0.18, 0.22]
const SIZE = [1.25, 1.55, 2, 2.7]
/** Quadros entre uma forma e outra da estrela. */
const STEP = 2 / 60

interface Slot {
  star: Mesh
  starMat: ShaderMaterial
  node: TransformNode
  roll: TransformNode
  slash: Mesh
  slashMat: ShaderMaterial
  on: boolean
  t: number
  life: number
  size: number
  nextShape: number
}

export interface HitArgs {
  at: Vector3
  /** 0 a 3: golpe leve até o mais forte. */
  power: number
  /** Passo do combo: alterna o lado do corte. */
  chain: number
}

function buildHits(scene: Scene, density: number): FxEffect<HitArgs> {
  const noise = new Texture("/meu-mundo/laminas/abilities/fx/noise.webp", scene)
  const slots: Slot[] = []
  for (let i = 0; i < SLOTS; i++) {
    const star = CreatePlane(`bh-star-${i}`, { size: 2 }, scene)
    star.billboardMode = Mesh.BILLBOARDMODE_ALL
    const starMat = shaderOf(scene, `bh-star-mat-${i}`, "STAR", noise)
    star.material = starMat
    // o nó vira de frente para a câmera; dentro dele a lua gira no próprio plano
    const node = new TransformNode(`bh-node-${i}`, scene)
    node.billboardMode = TransformNode.BILLBOARDMODE_ALL
    const roll = new TransformNode(`bh-roll-${i}`, scene)
    roll.parent = node
    const slash = moonMesh(scene, `bh-slash-${i}`)
    const slashMat = shaderOf(scene, `bh-slash-mat-${i}`, "MOON", noise)
    slash.material = slashMat
    slash.parent = roll
    slash.rotation.x = -Math.PI / 2
    // sempre por cima: o golpe acontece dentro do corpo do monstro
    slashMat.setFloat("uGain", 0.62)
    for (const m of [star, slash]) {
      m.renderingGroupId = 1
      m.isPickable = false
      m.alwaysSelectAsActiveMesh = true
      m.setEnabled(false)
    }
    slots.push({ star, starMat, node, roll, slash, slashMat, on: false, t: 0, life: 1, size: 1, nextShape: 0 })
  }

  const chip = new DynamicTexture("bh-chip", { width: 8, height: 8 }, scene, false)
  {
    const g = chip.getContext() as CanvasRenderingContext2D
    g.fillStyle = "#fff"
    g.fillRect(0, 0, 8, 8)
    chip.update()
  }
  const shards = new ParticleSystem("bh-shards", Math.max(40, Math.round(180 * density)), scene)
  shards.particleTexture = chip
  shards.renderingGroupId = 1
  shards.blendMode = ParticleSystem.BLENDMODE_STANDARD
  shards.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED
  shards.color1 = new Color4(1, 0.95, 0.97, 1)
  shards.color2 = new Color4(0.86, 0.1, 0.3, 1)
  shards.colorDead = new Color4(0.55, 0.2, 1, 0)
  shards.minSize = 0.018
  shards.maxSize = 0.05
  shards.minScaleY = 3
  shards.maxScaleY = 9
  shards.minLifeTime = 0.12
  shards.maxLifeTime = 0.32
  shards.minEmitPower = 5
  shards.maxEmitPower = 15
  shards.gravity = new Vector3(0, -7, 0)
  shards.emitRate = 0
  shards.updateSpeed = 1 / 60
  shards.emitter = Vector3.Zero()
  shards.createSphereEmitter(0.2, 1)
  shards.start()

  const hideSlot = (s: Slot) => {
    s.on = false
    s.star.setEnabled(false)
    s.slash.setEnabled(false)
  }

  let clock = 0
  return {
    play({ at, power, chain }) {
      const s = slots.find((x) => !x.on) ?? slots.reduce((a, b) => (a.t > b.t ? a : b))
      const p = Math.max(0, Math.min(3, power))
      s.on = true
      s.t = 0
      s.life = LIFE[p]
      s.size = SIZE[p]
      s.nextShape = 0
      s.star.position.copyFrom(at)
      s.star.setEnabled(true)
      s.node.position.copyFrom(at)
      s.roll.rotation.z = (chain % 2 ? -1 : 1) * (0.7 + Math.random() * 0.3)
      const r = 0.95 + p * 0.26
      // o bojo do arco passa pelo ponto do golpe
      s.slash.position.set(0, -r, 0)
      s.slash.scaling.setAll(r)
      s.slash.setEnabled(true)
      shards.emitter = at.clone()
      shards.manualEmitCount = Math.round((26 + p * 30) * density)
    },
    step(dt) {
      clock += dt
      let any = false
      for (const s of slots) {
        if (!s.on) continue
        s.t += dt
        const u = s.t / s.life
        if (u >= 1) {
          hideSlot(s)
          continue
        }
        any = true
        // a estrela não desliza: pula de forma, como desenho
        if (s.t >= s.nextShape) {
          s.nextShape = s.t + STEP
          s.starMat.setFloat("uSeed", Math.random())
          s.star.rotation.z = Math.random() * 6.28
          s.star.scaling.setAll(s.size * (0.72 + 0.5 * Math.min(1, u * 2.4)))
        }
        s.starMat.setFloat("uR", 1 - u * u)
        s.slashMat.setFloat("uTime", clock)
        s.slashMat.setFloat("uCut", u * u * 1.05)
      }
      return any
    },
    stop() {
      for (const s of slots) hideSlot(s)
    },
    warm() {
      for (const s of slots) {
        for (const m of [s.star, s.slash]) {
          m.setEnabled(true)
          m.material?.forceCompilation(m)
          m.setEnabled(false)
        }
      }
    },
    dispose() {
      shards.dispose()
      for (const s of slots) {
        s.star.dispose()
        s.slash.dispose()
        s.starMat.dispose()
        s.slashMat.dispose()
        s.roll.dispose()
        s.node.dispose()
      }
      chip.dispose()
      noise.dispose()
    },
  }
}

export interface BloodHits {
  hit: (at: Vector3, power: number, chain: number) => void
  warm: () => void
}

export function bloodHits(stage: FxStage): BloodHits {
  const build: FxBuilder<HitArgs> = ({ scene, budget }) => buildHits(scene, budget.particles)
  return {
    warm: () => stage.warm("blood-hit", build),
    hit: (at, power, chain) => stage.play("blood-hit", build, { at, power, chain }),
  }
}
