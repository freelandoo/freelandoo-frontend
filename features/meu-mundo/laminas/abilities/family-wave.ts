// features/meu-mundo/laminas/abilities/family-wave.ts — o Corte Mágico por família (lv2-B1, 2026-11-11).
//
// A onda é a mesma regra para todos (sim/fight.ts: anda reto, atravessa, some no fim). Aqui
// só o que voa:
//  - lâmina: a lua do poder, pequena, na paleta de quem joga (como era);
//  - garras: três luas finas em diagonal, um rasgo de três dedos;
//  - martelo: a lua deitada e larga, rente ao chão, cuspindo lascas;
//  - maga: um selo de runas girando de frente, com núcleo aceso e brasas atrás;
//  - arco: flecha de luz comprida, reta, com ponta acesa;
//  - arma de fogo: traçante curto e quente, reto, com clarão na boca;
//  - pedra: as três pedras do Golem girando juntas, o raio verde estalando entre elas.
// Tudo nasce aqui, uma vez, e é reaproveitado (pool de 2, como a regra: no máximo 2 ondas).
// Partícula pela qualidade: `low` corta para um terço (engine/quality.ts decide o `low`).

import type { Scene } from "@babylonjs/core/scene"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { Material } from "@babylonjs/core/Materials/material"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import "@babylonjs/core/Particles/particleSystemComponent"
import { Constants } from "@babylonjs/core/Engines/constants"
import type { Vfx, VfxColor } from "../../engine/vfx"
import { moonMesh, shaderOf } from "./signature-fx"
import type { Signature } from "./signatures"
import type { StrikeStyle } from "./families"
import { loadGolemStones } from "../engine/float-stones"

export interface SlashWave {
  start: (id: number, at: Vector3, facing: number) => void
  move: (id: number, at: Vector3) => void
  end: (id: number) => void
  dispose: () => void
}

function canvas(scene: Scene, name: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const t = new DynamicTexture(name, { width: size, height: size }, scene, true)
  const g = t.getContext() as CanvasRenderingContext2D
  g.clearRect(0, 0, size, size)
  draw(g, size)
  t.hasAlpha = true
  t.update()
  return t
}

const css = (c: Color3, a = 1) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`

/** Selo de runas: dois aros, marcas em volta e uma estrela de seis pontas. */
function drawRunes(g: CanvasRenderingContext2D, s: number) {
  const c = s / 2
  g.strokeStyle = "rgba(255,255,255,1)"
  g.shadowColor = "rgba(255,255,255,1)"
  g.shadowBlur = s * 0.03
  g.lineWidth = s * 0.022
  for (const r of [0.46, 0.36]) {
    g.beginPath()
    g.arc(c, c, s * r, 0, Math.PI * 2)
    g.stroke()
  }
  g.lineWidth = s * 0.016
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r0 = s * 0.37
    const r1 = s * 0.45
    g.beginPath()
    g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0)
    g.lineTo(c + Math.cos(a + 0.12) * r1, c + Math.sin(a + 0.12) * r1)
    g.stroke()
  }
  for (const off of [0, Math.PI / 3]) {
    g.beginPath()
    for (let k = 0; k <= 3; k++) {
      const a = off + (k / 3) * Math.PI * 2 - Math.PI / 2
      const x = c + Math.cos(a) * s * 0.33
      const y = c + Math.sin(a) * s * 0.33
      if (k === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
}

/** Fita de flecha/traçante: acesa na cabeça (u=1), some na cauda, miolo branco. */
function drawStreak(g: CanvasRenderingContext2D, s: number, core: number) {
  const lg = g.createLinearGradient(0, 0, s, 0)
  lg.addColorStop(0, "rgba(255,255,255,0)")
  lg.addColorStop(0.75, "rgba(255,255,255,0.55)")
  lg.addColorStop(0.97, "rgba(255,255,255,1)")
  lg.addColorStop(1, "rgba(255,255,255,0)")
  const vg = g.createLinearGradient(0, 0, 0, s)
  vg.addColorStop(0, "rgba(0,0,0,1)")
  vg.addColorStop(0.5 - core, "rgba(0,0,0,0)")
  vg.addColorStop(0.5 + core, "rgba(0,0,0,0)")
  vg.addColorStop(1, "rgba(0,0,0,1)")
  g.fillStyle = lg
  g.fillRect(0, 0, s, s)
  g.globalCompositeOperation = "destination-out"
  g.fillStyle = vg
  g.fillRect(0, 0, s, s)
  g.globalCompositeOperation = "source-over"
}

function drawSpark(g: CanvasRenderingContext2D, s: number) {
  const c = s / 2
  const gr = g.createRadialGradient(c, c, 0, c, c, c)
  gr.addColorStop(0, "rgba(255,255,255,1)")
  gr.addColorStop(0.3, "rgba(255,255,255,0.6)")
  gr.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = gr
  g.fillRect(0, 0, s, s)
}

/** Lasca: um caco anguloso, chapado (mistura normal, não vira névoa de luz). */
function drawChip(g: CanvasRenderingContext2D, s: number) {
  g.fillStyle = "rgba(255,255,255,1)"
  g.beginPath()
  g.moveTo(s * 0.2, s * 0.15)
  g.lineTo(s * 0.85, s * 0.35)
  g.lineTo(s * 0.7, s * 0.85)
  g.lineTo(s * 0.15, s * 0.7)
  g.closePath()
  g.fill()
}

function drawBolt(g: CanvasRenderingContext2D, s: number) {
  g.strokeStyle = "rgba(255,255,255,1)"
  g.shadowColor = "rgba(255,255,255,1)"
  g.shadowBlur = s * 0.1
  g.lineWidth = s * 0.05
  g.beginPath()
  g.moveTo(s * 0.1, s * 0.5)
  for (let x = 0.22; x <= 0.9; x += 0.12) g.lineTo(s * x, s * (0.5 + (Math.round(x * 100) % 24 < 12 ? -0.2 : 0.2)))
  g.stroke()
}

interface Entry {
  id: number
  node: TransformNode
  /** Peças que giram/pulsam (cada família usa as suas). */
  spin: TransformNode | null
  parts: Mesh[]
  /** Pedras do Golem (família pedra), quando o arquivo chega. */
  rocks: TransformNode[]
  ps: ParticleSystem | null
  at: Vector3
  t: number
}

/**
 * `C` = paleta do Corte de quem joga (abilities/signatures → laminas-game).
 * `heroH` = altura (m) de quem joga: a onda cresce um pouco nos grandes.
 */
export function familyWave(scene: Scene, sig: Signature, style: StrikeStyle, C: VfxColor, vfx: Vfx, low: boolean, heroH: () => number): SlashWave {
  const owned: { dispose: () => void }[] = []
  const mats: { mesh: Mesh; mat: Material }[] = []
  const k = low ? 1 / 3 : 1
  const R = 1.5
  const moonStyle = style === "blade" || style === "claws" || style === "hammer"
  const noise = moonStyle ? new Texture("/meu-mundo/laminas/abilities/fx/noise.webp", scene) : null
  if (noise) owned.push(noise)
  const glowMat = (name: string, tex: DynamicTexture | null, color: Color3) => {
    const m = new StandardMaterial(name, scene)
    m.disableLighting = true
    m.diffuseColor = new Color3(0, 0, 0)
    m.specularColor = new Color3(0, 0, 0)
    m.emissiveColor = color.clone()
    if (tex) {
      m.emissiveTexture = tex
      m.opacityTexture = tex
    }
    m.backFaceCulling = false
    m.alphaMode = Constants.ALPHA_ADD
    m.disableDepthWrite = true
    owned.push(m)
    return m
  }
  const sparkTex = canvas(scene, "fw-spark", 64, drawSpark)
  owned.push(sparkTex)
  const particles = (name: string, cap: number, tex: DynamicTexture, c: VfxColor, add = true) => {
    const p = new ParticleSystem(name, Math.max(4, Math.ceil(cap * k)), scene)
    p.particleTexture = tex
    p.emitRate = 0
    p.blendMode = add ? ParticleSystem.BLENDMODE_ADD : ParticleSystem.BLENDMODE_STANDARD
    p.updateSpeed = 1 / 60
    p.emitter = Vector3.Zero()
    p.color1 = new Color4(c.main.r, c.main.g, c.main.b, 1)
    p.color2 = new Color4(c.edge.r, c.edge.g, c.edge.b, 1)
    p.colorDead = new Color4(c.main.r, c.main.g, c.main.b, 0)
    p.start()
    owned.push(p)
    return p
  }

  // texturas e materiais da família (só os dela)
  let moonMat: ReturnType<typeof shaderOf> | null = null
  let runeMat: StandardMaterial | null = null
  let streakMat: StandardMaterial | null = null
  let coreMat: StandardMaterial | null = null
  let chipTex: DynamicTexture | null = null
  let boltTex: DynamicTexture | null = null
  if (moonStyle && noise) moonMat = shaderOf(scene, "fw-moon-mat", "MOON", noise, sig)
  if (moonMat) owned.push(moonMat)
  if (style === "mage") {
    const t = canvas(scene, "fw-runes", 256, drawRunes)
    owned.push(t)
    runeMat = glowMat("fw-rune-mat", t, C.main.scale(0.85))
  }
  if (style === "bow" || style === "gun") {
    const t = canvas(scene, "fw-streak", 128, (g, s) => drawStreak(g, s, style === "gun" ? 0.12 : 0.06))
    owned.push(t)
    // flecha de luz clara; traçante quente, na cor do corpo da paleta
    streakMat = glowMat("fw-streak-mat", t, style === "gun" ? C.main : C.edge)
  }
  if (style === "mage" || style === "bow" || style === "gun") coreMat = glowMat("fw-core-mat", sparkTex, style === "gun" ? C.edge : C.edge.add(new Color3(0.3, 0.3, 0.3)))
  if (style === "hammer" || style === "stone") {
    chipTex = canvas(scene, "fw-chip", 32, drawChip)
    owned.push(chipTex)
  }
  if (style === "stone") {
    boltTex = canvas(scene, "fw-bolt", 64, drawBolt)
    owned.push(boltTex)
  }
  let gone = false
  const stoneParts: TransformNode[][] = []

  const pool: Entry[] = [0, 1].map((i) => {
    const node = new TransformNode(`fw-node-${i}`, scene)
    node.setEnabled(false)
    owned.push(node)
    const parts: Mesh[] = []
    let spin: TransformNode | null = null
    let ps: ParticleSystem | null = null
    const keep = (m: Mesh, mat: Material) => {
      m.material = mat
      m.isPickable = false
      m.alwaysSelectAsActiveMesh = true
      parts.push(m)
      mats.push({ mesh: m, mat })
      owned.push(m)
      return m
    }
    const moon = (name: string, scale: number, parent: TransformNode) => {
      const m = keep(moonMesh(scene, name), moonMat!)
      m.parent = parent
      m.rotation.x = -Math.PI / 2
      m.position.y = -R * scale
      m.scaling.setAll(R * scale)
      return m
    }
    if (style === "blade") moon(`fw-moon-${i}`, 1, node)
    else if (style === "claws") {
      // três dedos: luas finas lado a lado, na diagonal (o node já vem inclinado)
      spin = new TransformNode(`fw-claw-${i}`, scene)
      spin.parent = node
      owned.push(spin)
      for (let j = 0; j < 3; j++) {
        const sub = new TransformNode(`fw-claw-${i}-${j}`, scene)
        sub.parent = spin
        sub.position.set((j - 1) * 0.42, (j - 1) * 0.12, (1 - Math.abs(j - 1)) * 0.18)
        owned.push(sub)
        const m = moon(`fw-claw-moon-${i}-${j}`, 0.62, sub)
        m.scaling.x *= 0.7
      }
    } else if (style === "hammer") {
      // deitada e larga: uma onda que rola rente ao chão
      spin = new TransformNode(`fw-ham-${i}`, scene)
      spin.parent = node
      owned.push(spin)
      moon(`fw-ham-moon-${i}`, 1.35, spin)
      ps = particles(`fw-chips-${i}`, 90, chipTex!, { main: new Color3(0.22, 0.2, 0.18), edge: C.main.scale(0.6) }, false)
      ps.minSize = 0.08
      ps.maxSize = 0.2
      ps.minLifeTime = 0.35
      ps.maxLifeTime = 0.7
      ps.minEmitPower = 2
      ps.maxEmitPower = 4.5
      ps.gravity = new Vector3(0, -12, 0)
      ps.minAngularSpeed = -10
      ps.maxAngularSpeed = 10
      ps.createConeEmitter(0.8, Math.PI / 3)
    } else if (style === "mage") {
      spin = new TransformNode(`fw-seal-${i}`, scene)
      spin.parent = node
      owned.push(spin)
      const seal = keep(CreatePlane(`fw-seal-plane-${i}`, { size: 1.9 }, scene), runeMat!)
      seal.parent = spin
      const core = keep(CreatePlane(`fw-seal-core-${i}`, { size: 1 }, scene), coreMat!)
      core.parent = node
      core.billboardMode = Mesh.BILLBOARDMODE_ALL
      vfx.addGlow(seal)
      ps = particles(`fw-embers-${i}`, 120, sparkTex, C)
      ps.minSize = 0.06
      ps.maxSize = 0.16
      ps.minLifeTime = 0.3
      ps.maxLifeTime = 0.6
      ps.minEmitPower = 0.3
      ps.maxEmitPower = 1.2
      ps.gravity = new Vector3(0, 1.4, 0)
      ps.createSphereEmitter(0.7, 1)
    } else if (style === "bow" || style === "gun") {
      // fita em cruz (vista de lado e de cima), deitada no sentido do voo; a cabeça no ponto da onda
      const len = style === "bow" ? 3.4 : 2.2
      const wid = style === "bow" ? 0.55 : 0.5
      for (const roll of [0, Math.PI / 2]) {
        const p = keep(CreatePlane(`fw-streak-${i}-${roll}`, { width: len, height: wid }, scene), streakMat!)
        p.parent = node
        p.rotation.set(roll, -Math.PI / 2, 0)
        p.position.z = -len / 2
        vfx.addGlow(p)
      }
      const tip = keep(CreatePlane(`fw-tip-${i}`, { size: 1 }, scene), coreMat!)
      tip.parent = node
      tip.billboardMode = Mesh.BILLBOARDMODE_ALL
      tip.scaling.setAll(style === "bow" ? 1.1 : 0.95)
      ps = particles(`fw-tail-${i}`, 80, sparkTex, C)
      ps.minSize = 0.04
      ps.maxSize = 0.1
      ps.minLifeTime = 0.15
      ps.maxLifeTime = 0.35
      ps.minEmitPower = 0.2
      ps.maxEmitPower = 0.8
      ps.createSphereEmitter(0.12, 1)
    } else {
      // pedra: as pedras do Golem (o mesmo GLB das costas dele) girando juntas e o raio
      // estalando entre elas; chegam quando o arquivo carrega (a cena já tem em memória)
      spin = new TransformNode(`fw-stones-${i}`, scene)
      spin.parent = node
      owned.push(spin)
      const holder = spin
      const rocks: TransformNode[] = []
      stoneParts.push(rocks)
      loadGolemStones(scene, 3, `fw-stone-${i}`, (m) => vfx.addGlow(m))
        .then((list) => {
          if (gone) return list.forEach((n) => n.dispose(false, false))
          list.forEach((r, j) => {
            r.parent = holder
            const a = (j / 3) * Math.PI * 2
            r.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0)
            r.rotation.set(j, j * 2, j * 0.5)
            r.scaling.setAll(0.75 - j * 0.08)
            r.setEnabled(true)
            rocks.push(r)
            owned.push(r)
          })
        })
        .catch(() => {})
      ps = particles(`fw-zap-${i}`, 90, boltTex!, C)
      ps.minSize = 0.25
      ps.maxSize = 0.55
      ps.minLifeTime = 0.06
      ps.maxLifeTime = 0.14
      ps.minEmitPower = 0
      ps.maxEmitPower = 0.3
      ps.minAngularSpeed = -6
      ps.maxAngularSpeed = 6
      ps.createSphereEmitter(0.55, 0.4)
    }
    return { id: -1, node, spin, parts, rocks: stoneParts[i] ?? [], ps, at: new Vector3(), t: 0 }
  })

  // compila antes da primeira onda (o quadro do golpe não pode engasgar)
  for (const { mesh, mat } of mats) mat.forceCompilation(mesh)

  const grow = () => Math.max(1, Math.min(1.6, heroH() / 2))
  const pose = (w: Entry) => {
    const t = w.t
    const g = grow()
    if (style === "claws" && w.spin) w.spin.scaling.setAll(g * (0.85 + 0.15 * Math.min(1, t / 0.08)))
    else if (style === "hammer" && w.spin) {
      // rente ao chão: a onda vem na altura da regra (~1 m); a lua deita (frente acesa no
      // ponto da onda, as pontas para trás) e desce para lamber o chão — lê de qualquer ângulo
      w.spin.rotation.x = Math.PI / 2
      w.spin.position.y = -w.at.y + 0.18
      w.spin.scaling.set(g * (1 + 0.08 * Math.sin(t * 24)), g, g)
    } else if (style === "mage" && w.spin) {
      w.spin.rotation.z = t * 7
      w.spin.scaling.setAll(g * (0.6 + 0.4 * Math.min(1, t / 0.1)))
      const core = w.parts[1]
      core.scaling.setAll(g * (0.75 + 0.12 * Math.sin(t * 40)))
    } else if (style === "stone" && w.spin) {
      w.spin.rotation.z = t * 9
      w.spin.scaling.setAll(g)
      for (let j = 0; j < w.rocks.length; j++) w.rocks[j].rotation.y = t * (3 + j)
    } else if ((style === "bow" || style === "gun") && w.parts.length) {
      const stretch = Math.min(1, t / 0.06)
      w.parts[0].scaling.x = stretch
      w.parts[1].scaling.x = stretch
      w.parts[0].position.z = w.parts[1].position.z = (-(style === "bow" ? 3.4 : 2.2) / 2) * stretch
    }
    if (moonMat) moonMat.setFloat("uTime", t)
  }

  return {
    start(id, at, facing) {
      const w = pool.find((x) => x.id < 0) ?? pool[0]
      w.id = id
      w.t = 0
      w.at.copyFrom(at)
      w.node.position.copyFrom(at)
      // lâmina alterna o lado; garras sempre na diagonal forte; o resto reto (todo tiro é reto)
      const tilt = style === "blade" ? (id % 2 ? 0.62 : -0.62) : style === "claws" ? (id % 2 ? 0.95 : -0.95) : 0
      w.node.rotation.set(0, facing, tilt)
      w.node.setEnabled(true)
      if (w.ps) {
        w.ps.emitter = at.clone()
        w.ps.emitRate = (style === "hammer" ? 110 : style === "stone" ? 70 : style === "mage" ? 90 : 120) * k
      }
      pose(w)
      // a boca do tiro e o pé do martelo: um clarão / poeira no começo
      if (style === "gun") vfx.impact(at, C, false, 0.7)
      else if (style === "hammer") vfx.dust(new Vector3(at.x, 0, at.z), low ? 4 : 8)
      else if (style === "mage") vfx.ground(new Vector3(at.x, 0, at.z), C, 0.9, 0.45, false, false)
    },
    move(id, at) {
      const w = pool.find((x) => x.id === id)
      if (!w) return
      w.t += 1 / 60
      w.at.copyFrom(at)
      w.node.position.copyFrom(at)
      if (w.ps) w.ps.emitter = style === "hammer" ? new Vector3(at.x, 0.1, at.z) : at.clone()
      pose(w)
    },
    end(id) {
      const w = pool.find((x) => x.id === id)
      if (!w) return
      w.id = -1
      w.node.setEnabled(false)
      if (w.ps) {
        w.ps.emitRate = 0
        w.ps.manualEmitCount = Math.round((style === "hammer" ? 24 : 14) * k)
      }
      const at = w.at
      if (style === "hammer") {
        vfx.ground(new Vector3(at.x, 0, at.z), C, 1.6, 0.5, false, false)
        vfx.dust(new Vector3(at.x, 0, at.z), low ? 5 : 10)
      } else if (style === "stone") vfx.burst(at, C)
      else if (style === "mage") vfx.impact(at, C, true, 1.1)
      else if (style === "bow" || style === "gun") vfx.impact(at, C, false, style === "gun" ? 0.8 : 0.9)
    },
    dispose() {
      gone = true
      for (const o of owned) o.dispose()
    },
  }
}
