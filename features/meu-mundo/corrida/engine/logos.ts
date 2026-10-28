// features/meu-mundo/corrida/engine/logos.ts — CORRIDA (mm3d-41c): as cápsulas viram o LOGO da Freelandoo.
//
// Pedido do Alex: o logo em 3D "igual o do WhatsApp da TENKA" no lugar das
// esferas com anel. O modelo é a abelha de hexágonos extrudada com chanfro
// (pipeline/corrida/build_logo_freelandoo.py, 1,9 mil triângulos, cor por
// vértice dourada). O brilho é o equivalente barato do verniz + luz de
// contorno do logo da TENKA: especular forte, emissivo dourado e FRESNEL
// claro na borda (sem mapa de ambiente, sem pós). Atrás de cada logo, um halo
// macio que sempre olha para a câmera; ao pegar, uma chuva de purpurina
// dourada (um sistema de partículas só, disparado no lugar).

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Particles/particleSystemComponent"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AssetContainer } from "@babylonjs/core/assetContainer"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"
import { ensureLoaders } from "../../engine/avatars"

const LOGO_FILE = "/meu-mundo/corrida/logo-freelandoo-m41.glb"

export interface LogoSpot {
  id: number
  at: Vector3
}

interface Logo {
  root: InstancedMesh | null
  halo: InstancedMesh
  at: Vector3
  on: boolean
}

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

export interface LogoView {
  setOn(id: number, on: boolean): void
  tick(clock: number): void
  dispose(): void
}

/** `scale` (mm3d-46): o Paint usa o mesmo logo, menor, como ícone que dá muros. */
export function buildLogos(scene: Scene, spots: LogoSpot[], low: boolean, scale = 1): LogoView {
  ensureLoaders()
  const logos = new Map<number, Logo>()
  let disposed = false
  let container: AssetContainer | null = null
  let lastClock = 0

  // ouro envernizado: o vértice dá o dourado, o emissivo segura de noite,
  // o fresnel claro corre pela borda quando o logo gira
  const gold = new StandardMaterial("corrida-logo", scene)
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

  const haloTex = softDot(scene, "corrida-logo-halo", [
    [0, "rgba(255,226,120,0.85)"],
    [0.35, "rgba(242,183,5,0.35)"],
    [1, "rgba(242,120,5,0)"],
  ])
  const haloMat = new StandardMaterial("corrida-logo-halo", scene)
  haloMat.diffuseColor = new Color3(0, 0, 0)
  haloMat.emissiveTexture = haloTex
  haloMat.opacityTexture = haloTex
  haloMat.disableLighting = true
  haloMat.alphaMode = Constants.ALPHA_ADD
  haloMat.disableDepthWrite = true
  haloMat.fogEnabled = false
  haloMat.backFaceCulling = false
  const haloBase = CreatePlane("corrida-logo-halo", { size: 5.2 }, scene)
  haloBase.material = haloMat
  haloBase.isPickable = false
  haloBase.setEnabled(false)

  for (const s of spots) {
    const halo = haloBase.createInstance(`corrida-logo-halo-${s.id}`)
    halo.position.copyFrom(s.at)
    halo.billboardMode = Mesh.BILLBOARDMODE_ALL
    halo.scaling.setAll(scale)
    halo.isPickable = false
    logos.set(s.id, { root: null, halo, at: s.at.clone(), on: true })
  }

  // purpurina ao pegar (um sistema só, disparado onde foi)
  const glitterTex = softDot(scene, "corrida-glitter", [
    [0, "rgba(255,255,230,1)"],
    [0.3, "rgba(255,210,60,0.9)"],
    [1, "rgba(255,150,0,0)"],
  ])
  const glitter = new ParticleSystem("corrida-glitter", low ? 90 : 220, scene)
  const glitterAt = new Vector3()
  glitter.particleTexture = glitterTex
  glitter.emitter = glitterAt
  glitter.minEmitBox = new Vector3(-1, -0.8, -0.3)
  glitter.maxEmitBox = new Vector3(1, 0.8, 0.3)
  glitter.color1 = new Color4(1, 0.9, 0.45, 1)
  glitter.color2 = new Color4(1, 0.7, 0.1, 1)
  glitter.colorDead = new Color4(1, 0.4, 0, 0)
  glitter.minSize = 0.12
  glitter.maxSize = 0.4
  glitter.minLifeTime = 0.4
  glitter.maxLifeTime = 0.9
  glitter.emitRate = 0
  glitter.manualEmitCount = 0
  glitter.blendMode = ParticleSystem.BLENDMODE_ADD
  glitter.gravity = new Vector3(0, -6, 0)
  glitter.direction1 = new Vector3(-4, 2, -4)
  glitter.direction2 = new Vector3(4, 7, 4)
  glitter.minEmitPower = 1
  glitter.maxEmitPower = 2.2
  glitter.updateSpeed = 1 / 60
  glitter.start()

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
      // a malha-fonte fica no container; cada logo é uma instância (1 chamada)
      // solta do __root__ guardando o lugar no mundo e grava a transformação
      // nos vértices: o gltfpack põe a escala de DESQUANTIZAÇÃO no nó (zerar
      // a transformação deixava o logo microscópico)
      c.addAllToScene()
      src.setParent(null)
      src.bakeCurrentTransformIntoVertices()
      src.setEnabled(false)
      for (const [id, l] of logos) {
        const inst = src.createInstance(`corrida-logo-${id}`)
        inst.position.copyFrom(l.at)
        inst.scaling.setAll(scale)
        inst.isPickable = false
        inst.setEnabled(l.on)
        l.root = inst
      }
    })
    .catch((err) => {
      if (!disposed) console.warn("[corrida] logo não carregou", err)
    })

  return {
    setOn(id, on) {
      const l = logos.get(id)
      if (!l || l.on === on) return
      l.on = on
      l.root?.setEnabled(on)
      l.halo.setEnabled(on)
      if (!on) {
        glitterAt.copyFrom(l.at)
        glitter.manualEmitCount = low ? 50 : 120
      }
    },
    tick(clock) {
      // passo real (a cena usa delta constante; a 30 FPS seria câmera lenta)
      glitter.updateSpeed = Math.max(0.001, Math.min(0.1, clock - lastClock))
      lastClock = clock
      let k = 0
      for (const l of logos.values()) {
        k++
        if (!l.on || !l.root) continue
        l.root.rotation.y = clock * 1.8 + k
        l.root.position.y = l.at.y + Math.sin(clock * 2.6 + k) * 0.22 * scale
        l.halo.position.y = l.root.position.y
      }
    },
    dispose() {
      disposed = true
      for (const l of logos.values()) {
        l.root?.dispose()
        l.halo.dispose()
      }
      container?.dispose()
      haloBase.dispose()
      glitter.dispose(false)
      for (const d of [gold, haloMat, haloTex, glitterTex]) d.dispose()
    },
  }
}
