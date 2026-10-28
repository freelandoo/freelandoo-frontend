// features/meu-mundo/noturno/engine/power-view.ts — ROLÊ NOTURNO (mm3d-42): o PODER do logo.
//
// Pedido do Alex: "o logo da Freelandoo vai aparecer a cada 700 m; pegou, o
// personagem ganha um contorno brilhoso com partículas e por 5 segundos, se
// bater num obstáculo, o obstáculo explode como no jetpack e ele ganha
// velocidade". Três peças:
//  - LOGOS na rua: o mesmo logo 3D da Antigravidade (abelha de hexágonos em
//    ouro + fresnel, halo macio que olha para a câmera), girando e flutuando;
//    ao pegar, chuva de purpurina.
//  - AURA: brilho dourado em volta do corpo e do veículo (GlowLayer só com as
//    malhas de quem tem poder — o jogador e os outros do grupo; o
//    HighlightLayer precisa do estêncil da tela, que o pós-processamento não
//    tem) + faíscas douradas saindo do corpo; nos últimos 1,2 s pisca para
//    avisar que vai acabar.
//  - EXPLOSÃO (o molde do jetpack: clarão, bola de fogo e estilhaços): clarão
//    somado que cresce e some, fogo e fumaça em partículas e pedaços da cor do
//    obstáculo (caixas em instância fina) voando com gravidade, girando e
//    quicando no asfalto.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import "@babylonjs/core/Particles/particleSystemComponent"
import "@babylonjs/core/Layers/effectLayerSceneComponent"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AssetContainer } from "@babylonjs/core/assetContainer"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"
import { ensureLoaders } from "../../engine/avatars"
import { CAR_PAINT_HEX } from "../../engine/cars"
import type { ObstacleKind, Run } from "../sim/run"

const LOGO_FILE = "/meu-mundo/corrida/logo-freelandoo-m41.glb"
const LOGO_SCALE = 0.62
const LOGOS = 4
const DEBRIS = 220
/** Pedaços por explosão (o celular fraco leva menos). */
const PIECES = 34

function softDot(scene: Scene, name: string, stops: [number, string][]): DynamicTexture {
  const tex = new DynamicTexture(name, { width: 128, height: 128 }, scene, true)
  const g = tex.getContext() as CanvasRenderingContext2D
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  for (const [o, c] of stops) grad.addColorStop(o, c)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  tex.hasAlpha = true
  tex.update(false)
  return tex
}

/** Cores dos estilhaços por obstáculo (o carro pela pintura sorteada). */
const PAINT_ORDER = ["vermelho", "azul", "branco", "amarelo", "preto"] as const
function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
function debrisColors(kind: ObstacleKind, tint: number): [number, number, number][] {
  switch (kind) {
    case "car": {
      const hex = (CAR_PAINT_HEX as Record<string, string>)[PAINT_ORDER[tint % PAINT_ORDER.length]] ?? "#c0202a"
      return [hexRgb(hex), hexRgb(hex), [0.12, 0.12, 0.14], [0.55, 0.75, 0.9]]
    }
    case "amb":
      return [[0.95, 0.95, 0.95], [0.95, 0.95, 0.95], [0.85, 0.1, 0.12], [0.2, 0.4, 1]]
    case "truck":
      return [[0.9, 0.9, 0.92], [0.78, 0.8, 0.84], [0.95, 0.55, 0.1], [0.15, 0.15, 0.18]]
    default:
      return [[1, 0.45, 0.05], [0.95, 0.95, 0.95], [1, 0.45, 0.05]]
  }
}

interface Piece {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  rx: number
  ry: number
  wx: number
  wy: number
  s: number
  t: number
  life: number
  c: [number, number, number]
}

interface Flash {
  mesh: Mesh
  t: number
  size: number
}

export interface PowerView {
  /** Logos na rua; `clock` = s (relógio da cena). */
  sync(run: Run, clock: number, dt: number): void
  /** Logo pego: purpurina. */
  take(x: number, y: number, z: number): void
  /** Quem está com poder agora: as malhas do corpo (e do veículo) e onde sai a faísca. `left` = s que faltam. */
  aura(list: { meshes: AbstractMesh[]; at: TransformNode; left: number }[], clock: number): void
  /** Obstáculo explodido; `push` = velocidade do jogador (fogo e fumaça vão junto, senão a câmera atravessa). */
  blast(kind: ObstacleKind, x: number, z: number, len: number, top: number, tint: number, push: number): void
  dispose(): void
}

export function buildPower(scene: Scene, low: boolean): PowerView {
  ensureLoaders()
  let disposed = false
  let container: AssetContainer | null = null
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(x: T) => {
    owned.push(x)
    return x
  }

  // ── logos ──────────────────────────────────────────────────────────────────
  const gold = own(new StandardMaterial("noturno-logo", scene))
  gold.diffuseColor = new Color3(1, 1, 1)
  gold.specularColor = new Color3(1, 0.92, 0.7)
  gold.specularPower = 72
  gold.emissiveColor = new Color3(1, 1, 1)
  gold.emissiveFresnelParameters = new FresnelParameters({
    leftColor: new Color3(1, 0.93, 0.62),
    rightColor: new Color3(0.42, 0.27, 0.02),
    power: 1.6,
    bias: 0.08,
  })
  gold.backFaceCulling = false
  const haloTex = own(
    softDot(scene, "noturno-logo-halo", [
      [0, "rgba(255,226,120,0.85)"],
      [0.35, "rgba(242,183,5,0.35)"],
      [1, "rgba(242,120,5,0)"],
    ]),
  )
  const haloMat = own(new StandardMaterial("noturno-logo-halo", scene))
  haloMat.diffuseColor = new Color3(0, 0, 0)
  haloMat.emissiveTexture = haloTex
  haloMat.opacityTexture = haloTex
  haloMat.disableLighting = true
  haloMat.alphaMode = Constants.ALPHA_ADD
  haloMat.disableDepthWrite = true
  haloMat.backFaceCulling = false
  const haloBase = own(CreatePlane("noturno-logo-halo", { size: 3.6 }, scene))
  haloBase.material = haloMat
  haloBase.isPickable = false
  haloBase.setEnabled(false)
  // feixe de luz do chão até o logo (dá para ver de longe em que faixa ele está)
  const beamTex = own(new DynamicTexture("noturno-logo-beam", { width: 32, height: 128 }, scene, true))
  {
    const g = beamTex.getContext() as CanvasRenderingContext2D
    const grad = g.createLinearGradient(0, 128, 0, 0)
    grad.addColorStop(0, "rgba(255,210,80,0.75)")
    grad.addColorStop(1, "rgba(255,170,20,0)")
    g.fillStyle = grad
    g.fillRect(0, 0, 32, 128)
    const side = g.createLinearGradient(0, 0, 32, 0)
    side.addColorStop(0, "rgba(0,0,0,1)")
    side.addColorStop(0.5, "rgba(0,0,0,0)")
    side.addColorStop(1, "rgba(0,0,0,1)")
    g.globalCompositeOperation = "destination-out"
    g.fillStyle = side
    g.fillRect(0, 0, 32, 128)
    beamTex.hasAlpha = true
    beamTex.update(false)
  }
  const beamMat = own(new StandardMaterial("noturno-logo-beam", scene))
  beamMat.diffuseColor = new Color3(0, 0, 0)
  beamMat.emissiveTexture = beamTex
  beamMat.opacityTexture = beamTex
  beamMat.disableLighting = true
  beamMat.alphaMode = Constants.ALPHA_ADD
  beamMat.disableDepthWrite = true
  beamMat.backFaceCulling = false
  const beamBase = own(CreatePlane("noturno-logo-beam", { width: 1.6, height: 7 }, scene))
  beamBase.bakeTransformIntoVertices(Matrix.Translation(0, 3.5, 0))
  beamBase.material = beamMat
  beamBase.isPickable = false
  beamBase.setEnabled(false)

  const slots: { logo: InstancedMesh | null; halo: InstancedMesh; beam: InstancedMesh }[] = []
  for (let i = 0; i < LOGOS; i++) {
    const halo = haloBase.createInstance(`noturno-logo-halo-${i}`)
    halo.billboardMode = Mesh.BILLBOARDMODE_ALL
    halo.isPickable = false
    halo.setEnabled(false)
    const beam = beamBase.createInstance(`noturno-logo-beam-${i}`)
    beam.billboardMode = Mesh.BILLBOARDMODE_Y
    beam.isPickable = false
    beam.setEnabled(false)
    slots.push({ logo: null, halo, beam })
  }
  void LoadAssetContainerAsync(LOGO_FILE, scene)
    .then((c) => {
      if (disposed) {
        c.dispose()
        return
      }
      container = c
      const src = c.meshes.find((m) => m.getTotalVertices() > 0) as Mesh | undefined
      if (!src) return
      src.material = gold
      src.useVertexColors = true
      src.hasVertexAlpha = false
      src.isPickable = false
      // o gltfpack põe a desquantização no nó: grava a transformação nos vértices (mm3d-41c)
      c.addAllToScene()
      src.setParent(null)
      src.bakeCurrentTransformIntoVertices()
      src.setEnabled(false)
      slots.forEach((s, i) => {
        const inst = src.createInstance(`noturno-logo-${i}`)
        inst.scaling.setAll(LOGO_SCALE)
        inst.isPickable = false
        inst.setEnabled(false)
        s.logo = inst
      })
    })
    .catch((err) => {
      if (!disposed) console.warn("[noturno] logo não carregou", err)
    })

  // purpurina (ao pegar) e faíscas da aura: o mesmo desenho de ponto
  const sparkTex = own(
    softDot(scene, "noturno-spark", [
      [0, "rgba(255,255,230,1)"],
      [0.3, "rgba(255,210,60,0.9)"],
      [1, "rgba(255,150,0,0)"],
    ]),
  )
  const glitterAt = new Vector3()
  const glitter = new ParticleSystem("noturno-glitter", low ? 90 : 220, scene)
  glitter.particleTexture = sparkTex
  glitter.emitter = glitterAt
  glitter.minEmitBox = new Vector3(-0.8, -0.6, -0.3)
  glitter.maxEmitBox = new Vector3(0.8, 0.6, 0.3)
  glitter.color1 = new Color4(1, 0.9, 0.45, 1)
  glitter.color2 = new Color4(1, 0.7, 0.1, 1)
  glitter.colorDead = new Color4(1, 0.4, 0, 0)
  glitter.minSize = 0.1
  glitter.maxSize = 0.34
  glitter.minLifeTime = 0.4
  glitter.maxLifeTime = 0.9
  glitter.emitRate = 0
  glitter.manualEmitCount = 0
  glitter.blendMode = ParticleSystem.BLENDMODE_ADD
  glitter.gravity = new Vector3(0, -6, 0)
  glitter.direction1 = new Vector3(-4, 2, -2)
  glitter.direction2 = new Vector3(4, 7, 6)
  glitter.minEmitPower = 1
  glitter.maxEmitPower = 2.2
  glitter.updateSpeed = 1 / 60
  glitter.start()
  own({ dispose: () => glitter.dispose(false) })

  // ── aura ───────────────────────────────────────────────────────────────────
  // só as malhas incluídas brilham (lista vazia = TODAS: por isso desliga quando ninguém tem poder)
  const hl = new GlowLayer("noturno-aura", scene, { mainTextureRatio: low ? 0.35 : 0.5, blurKernelSize: low ? 40 : 72 })
  hl.customEmissiveColorSelector = (_m, _s, _mat, out) => out.set(1, 0.84, 0.32, 1)
  hl.isEnabled = false
  own(hl)
  const lit = new Set<AbstractMesh>()
  const sparks: ParticleSystem[] = []
  const sparkFor = (i: number) => {
    let ps = sparks[i]
    if (ps) return ps
    ps = new ParticleSystem(`noturno-aura-spark-${i}`, low ? 60 : 140, scene)
    ps.particleTexture = sparkTex
    ps.minEmitBox = new Vector3(-0.35, 0.1, -0.3)
    ps.maxEmitBox = new Vector3(0.35, 1.7, 0.3)
    ps.color1 = new Color4(1, 0.92, 0.5, 1)
    ps.color2 = new Color4(1, 0.65, 0.12, 1)
    ps.colorDead = new Color4(1, 0.35, 0, 0)
    ps.minSize = 0.05
    ps.maxSize = 0.16
    ps.minLifeTime = 0.2
    ps.maxLifeTime = 0.45
    ps.emitRate = low ? 70 : 160
    ps.blendMode = ParticleSystem.BLENDMODE_ADD
    ps.gravity = new Vector3(0, 2.5, 0)
    // para trás (o jogador anda para +z): o rastro fica
    ps.direction1 = new Vector3(-0.8, 0.4, -2)
    ps.direction2 = new Vector3(0.8, 1.6, -0.6)
    ps.minEmitPower = 0.6
    ps.maxEmitPower = 1.6
    ps.isLocal = false
    ps.updateSpeed = 1 / 60
    sparks[i] = ps
    return ps
  }
  own({ dispose: () => sparks.forEach((p) => p.dispose(false)) })

  // ── explosão ───────────────────────────────────────────────────────────────
  const flashTex = own(
    softDot(scene, "noturno-flash", [
      [0, "rgba(255,255,240,1)"],
      [0.25, "rgba(255,200,90,0.9)"],
      [0.6, "rgba(255,90,20,0.35)"],
      [1, "rgba(120,20,0,0)"],
    ]),
  )
  const flashMat = own(new StandardMaterial("noturno-flash", scene))
  flashMat.diffuseColor = new Color3(0, 0, 0)
  flashMat.emissiveTexture = flashTex
  flashMat.opacityTexture = flashTex
  flashMat.disableLighting = true
  flashMat.alphaMode = Constants.ALPHA_ADD
  flashMat.disableDepthWrite = true
  flashMat.backFaceCulling = false
  flashMat.fogEnabled = false
  const flashes: Flash[] = []
  for (let i = 0; i < 4; i++) {
    const m = own(CreatePlane(`noturno-flash-${i}`, { size: 1 }, scene))
    m.material = flashMat
    m.billboardMode = Mesh.BILLBOARDMODE_ALL
    m.isPickable = false
    m.setEnabled(false)
    flashes.push({ mesh: m, t: 9, size: 1 })
  }
  const fireAt = new Vector3()
  const fire = new ParticleSystem("noturno-fire", low ? 120 : 320, scene)
  fire.particleTexture = flashTex
  fire.emitter = fireAt
  fire.color1 = new Color4(1, 0.85, 0.4, 1)
  fire.color2 = new Color4(1, 0.4, 0.08, 1)
  fire.colorDead = new Color4(0.3, 0.05, 0, 0)
  fire.minSize = 0.45
  fire.maxSize = 1.25
  fire.minLifeTime = 0.4
  fire.maxLifeTime = 0.8
  fire.emitRate = 0
  fire.manualEmitCount = 0
  fire.blendMode = ParticleSystem.BLENDMODE_ADD
  fire.gravity = new Vector3(0, 3, 0)
  fire.direction1 = new Vector3(-5, 1, -4)
  fire.direction2 = new Vector3(5, 8, 8)
  fire.minEmitPower = 1
  fire.maxEmitPower = 3
  fire.updateSpeed = 1 / 60
  fire.start()
  own({ dispose: () => fire.dispose(false) })
  const smokeTex = own(
    softDot(scene, "noturno-smoke", [
      [0, "rgba(90,86,96,0.75)"],
      [0.6, "rgba(50,48,58,0.35)"],
      [1, "rgba(30,30,36,0)"],
    ]),
  )
  const smoke = new ParticleSystem("noturno-smoke", low ? 50 : 120, scene)
  smoke.particleTexture = smokeTex
  smoke.emitter = fireAt
  smoke.color1 = new Color4(0.5, 0.48, 0.55, 0.6)
  smoke.color2 = new Color4(0.3, 0.3, 0.36, 0.5)
  smoke.colorDead = new Color4(0.1, 0.1, 0.12, 0)
  smoke.minSize = 0.7
  smoke.maxSize = 1.7
  smoke.minLifeTime = 0.45
  smoke.maxLifeTime = 0.9
  smoke.emitRate = 0
  smoke.manualEmitCount = 0
  smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD
  smoke.gravity = new Vector3(0, 2, 0)
  smoke.direction1 = new Vector3(-2, 1, -1)
  smoke.direction2 = new Vector3(2, 3.5, 4)
  smoke.minEmitPower = 0.5
  smoke.maxEmitPower = 1.5
  smoke.updateSpeed = 1 / 60
  smoke.start()
  own({ dispose: () => smoke.dispose(false) })

  const pieceMat = own(new StandardMaterial("noturno-debris", scene))
  pieceMat.diffuseColor = new Color3(1, 1, 1)
  pieceMat.emissiveColor = new Color3(0.25, 0.25, 0.28)
  pieceMat.specularColor = new Color3(0.3, 0.3, 0.3)
  const piece = own(CreateBox("noturno-debris", { size: 1 }, scene))
  piece.material = pieceMat
  piece.isPickable = false
  piece.alwaysSelectAsActiveMesh = true
  const pieceM = new Float32Array(DEBRIS * 16)
  const pieceC = new Float32Array(DEBRIS * 4).fill(1)
  piece.thinInstanceSetBuffer("matrix", pieceM, 16, false)
  piece.thinInstanceSetBuffer("color", pieceC, 4, false)
  piece.thinInstanceCount = 0
  const pieces: Piece[] = []
  const mtx = new Matrix()
  const q = new Quaternion()
  const at = new Vector3()
  const sc = new Vector3()

  const step = (dt: number) => {
    for (const f of flashes) {
      if (f.t > 0.32) {
        if (f.mesh.isEnabled()) f.mesh.setEnabled(false)
        continue
      }
      f.t += dt
      const k = Math.min(1, f.t / 0.32)
      f.mesh.scaling.setAll(f.size * (0.5 + k * 1.3))
      f.mesh.visibility = 1 - k * k
    }
    let n = 0
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i]
      p.t += dt
      if (p.t > p.life) {
        pieces.splice(i, 1)
        continue
      }
      p.vy -= 22 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      if (p.y < p.s * 0.5) {
        // quica no asfalto e perde força
        p.y = p.s * 0.5
        p.vy = Math.abs(p.vy) * 0.32
        p.vx *= 0.6
        p.vz *= 0.6
        p.wx *= 0.6
        p.wy *= 0.6
      }
      p.rx += p.wx * dt
      p.ry += p.wy * dt
      const fade = Math.min(1, (p.life - p.t) / 0.35)
      Quaternion.RotationYawPitchRollToRef(p.ry, p.rx, 0, q)
      at.set(p.x, p.y, p.z)
      sc.set(p.s * fade, p.s * 0.55 * fade, p.s * 0.8 * fade)
      Matrix.ComposeToRef(sc, q, at, mtx)
      mtx.copyToArray(pieceM, n * 16)
      pieceC.set([p.c[0], p.c[1], p.c[2], 1], n * 4)
      n++
    }
    piece.thinInstanceCount = n
    if (n) {
      piece.thinInstanceBufferUpdated("matrix")
      piece.thinInstanceBufferUpdated("color")
    }
  }

  return {
    sync(run, clock, dt) {
      // as partículas andam em 1/60 × a razão do quadro (o Babylon já escala pelo tempo real
      // nesta cena, que não usa passo constante): nada a ajustar por quadro
      let i = 0
      for (const p of run.powers) {
        if (p.taken || p.z < run.z - 4 || p.z > run.z + 380) continue
        if (i >= slots.length) break
        const s = slots[i++]
        const y = p.y + 0.35 + Math.sin(clock * 2.6 + p.id) * 0.18
        if (s.logo) {
          s.logo.setEnabled(true)
          s.logo.position.set(p.x, y, p.z)
          s.logo.rotation.y = clock * 2.2 + p.id
        }
        s.halo.setEnabled(true)
        s.halo.position.set(p.x, y, p.z + 0.05)
        s.beam.setEnabled(true)
        s.beam.position.set(p.x, 0, p.z)
      }
      for (; i < slots.length; i++) {
        const s = slots[i]
        s.logo?.setEnabled(false)
        s.halo.setEnabled(false)
        s.beam.setEnabled(false)
      }
      step(dt)
    },
    take(x, y, z) {
      glitterAt.set(x, y + 0.6, z)
      glitter.manualEmitCount = low ? 60 : 150
    },
    aura(list, clock) {
      const want = new Set<AbstractMesh>()
      for (const a of list) for (const m of a.meshes) want.add(m)
      for (const m of lit) {
        if (want.has(m) && !m.isDisposed()) continue
        if (!m.isDisposed()) hl.removeIncludedOnlyMesh(m as Mesh)
        lit.delete(m)
      }
      for (const m of want) {
        if (lit.has(m) || m.isDisposed() || !(m instanceof Mesh)) continue
        hl.addIncludedOnlyMesh(m)
        lit.add(m)
      }
      // pulsa; nos últimos 1,2 s pisca (vai acabar)
      const ending = list.some((a) => a.left < 1.2)
      const blink = ending ? (Math.sin(clock * 26) > 0 ? 1 : 0.2) : 1
      hl.intensity = (0.8 + Math.sin(clock * 9) * 0.18) * blink
      hl.isEnabled = lit.size > 0
      list.forEach((a, k) => {
        const ps = sparkFor(k)
        ps.emitter = a.at.getAbsolutePosition()
        if (!ps.isStarted()) ps.start()
        ps.emitRate = (low ? 70 : 160) * blink
      })
      for (let k = list.length; k < sparks.length; k++) if (sparks[k].isStarted()) sparks[k].stop()
    },
    blast(kind, x, z, len, top, tint, push) {
      const cz = z + len / 2
      const cy = Math.min(top, 2.2) * 0.6
      const f = flashes.find((g) => g.t > 0.32) ?? flashes[0]
      f.t = 0
      f.size = 3 + Math.min(len, 9) * 0.55
      f.mesh.position.set(x, cy, cz)
      f.mesh.setEnabled(true)
      fireAt.set(x, cy, cz)
      fire.minEmitBox = new Vector3(-0.9, -0.4, -len / 2)
      fire.maxEmitBox = new Vector3(0.9, 0.6, len / 2)
      smoke.minEmitBox = fire.minEmitBox
      smoke.maxEmitBox = fire.maxEmitBox
      // a direção é multiplicada pela força (1–3 no fogo, 0,5–1,5 na fumaça): o z leva o jogador junto
      const pf = push * 0.85
      fire.direction1.set(-4, 1, pf / 2 - 3)
      fire.direction2.set(4, 7, pf / 2 + 4)
      smoke.direction1.set(-1.5, 1, pf - 1)
      smoke.direction2.set(1.5, 3, pf + 2)
      fire.manualEmitCount = low ? 40 : 90
      smoke.manualEmitCount = low ? 10 : 22
      const cols = debrisColors(kind, tint)
      const n = low ? Math.round(PIECES * 0.6) : PIECES
      for (let i = 0; i < n; i++) {
        if (pieces.length >= DEBRIS) pieces.shift()
        const a = Math.random() * Math.PI * 2
        const s = 4 + Math.random() * 7
        pieces.push({
          x: x + (Math.random() - 0.5) * 1.6,
          y: Math.random() * Math.min(top, 3),
          z: z + Math.random() * len,
          vx: Math.cos(a) * s * 0.7,
          vy: 5 + Math.random() * 9,
          // para a frente: o jogador vem rápido e "empurra" o que explode
          vz: 6 + Math.random() * 14 + Math.sin(a) * s * 0.4,
          rx: Math.random() * 6,
          ry: Math.random() * 6,
          wx: (Math.random() - 0.5) * 18,
          wy: (Math.random() - 0.5) * 18,
          s: 0.1 + Math.random() * (kind === "barrier" ? 0.16 : 0.3),
          t: 0,
          life: 1.1 + Math.random() * 0.8,
          c: cols[i % cols.length],
        })
      }
    },
    dispose() {
      disposed = true
      for (const s of slots) {
        s.logo?.dispose()
        s.halo.dispose()
        s.beam.dispose()
      }
      container?.dispose()
      for (const o of owned.reverse()) o.dispose()
    },
  }
}
