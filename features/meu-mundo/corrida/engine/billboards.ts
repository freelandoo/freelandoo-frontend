// features/meu-mundo/corrida/engine/billboards.ts — CORRIDA (mm3d-41c): OUTDOORS na beira da pista.
//
// Como no vídeo de referência do Alex: painéis grandes e acesos do lado de
// fora do guarda-corpo, virados para quem vem (inclinados para dentro), sobre
// dois postes, com moldura de neon. Três artes desenhadas em canvas (só a
// marca, sem frase para traduzir): o logo da Freelandoo no amarelo da marca,
// "MEU MUNDO" em neon e um painel de setas de velocidade. Cada arte é uma
// malha-fonte; os outdoors são instâncias (uma chamada por arte), os postes e
// as molduras instâncias finas.
//
// mm3d-55 — STEAMPUNK: moldura de latão aceso no lugar do neon rosa; as artes
// viram madeira escura com letras de lampião e moldura rebitada (a da marca
// fica no amarelo da Freelandoo).

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"

/** Onde vai um outdoor: base no chão da pista, rumo do painel (yaw), lado. */
export interface BillboardSpot {
  at: Vector3
  yaw: number
  /** Altura do pé dos postes abaixo de `at` (até a laje). */
  drop: number
}

const PANEL_W = 12
const PANEL_H = 6
/** Altura da base do painel acima da pista. */
const LIFT = 3

export type BillboardArt = (g: CanvasRenderingContext2D, w: number, h: number, logo: HTMLImageElement | null) => void

/** As artes (o Rolê Noturno usa as mesmas nos outdoors dele, mm3d-42). */
export const ARTS: BillboardArt[] = [
  // 1) marca: amarelo, abelha e o nome
  (g, w, h, logo) => {
    g.fillStyle = "#F2B705"
    g.fillRect(0, 0, w, h)
    if (logo) g.drawImage(logo, 28, 28, h - 56, h - 56)
    g.fillStyle = "#0b0b0f"
    g.font = "900 92px Arial Black, Arial, sans-serif"
    g.textBaseline = "middle"
    g.fillText("FREELANDOO", h - 6, h / 2 + 4, w - h - 10)
  },
  // 2) Meu Mundo em letras de lampião (mm3d-55: madeira escura e moldura de latão rebitada)
  (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, "#2a1a0e")
    bg.addColorStop(1, "#3b2412")
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.font = "900 120px Arial Black, Arial, sans-serif"
    g.shadowColor = "#ffb347"
    g.shadowBlur = 28
    g.fillStyle = "#ffe8c0"
    g.fillText("MEU MUNDO", w / 2, h / 2 + 6, w - 60)
    g.shadowBlur = 0
    g.strokeStyle = "#c69a37"
    g.lineWidth = 10
    g.strokeRect(20, 20, w - 40, h - 40)
    g.lineWidth = 3
    g.strokeRect(40, 40, w - 80, h - 80)
    g.fillStyle = "#e0b552"
    for (let k = 0; k < 12; k++) for (const y of [20, h - 20]) {
      g.beginPath()
      g.arc(20 + (k * (w - 40)) / 11, y, 7, 0, Math.PI * 2)
      g.fill()
    }
  },
  // 3) setas de velocidade
  (g, w, h) => {
    g.fillStyle = "#1c120a"
    g.fillRect(0, 0, w, h)
    g.shadowColor = "#ffb347"
    g.shadowBlur = 22
    for (let k = 0; k < 5; k++) {
      const x = 90 + k * 175
      g.fillStyle = k % 2 ? "#ffb347" : "#ffe8c0"
      g.beginPath()
      g.moveTo(x, 50)
      g.lineTo(x + 95, h / 2)
      g.lineTo(x, h - 50)
      g.lineTo(x + 45, h - 50)
      g.lineTo(x + 140, h / 2)
      g.lineTo(x + 45, 50)
      g.closePath()
      g.fill()
    }
  },
]

export interface BillboardView {
  dispose(): void
}

export function buildBillboards(scene: Scene, spots: BillboardSpot[]): BillboardView {
  const disposables: { dispose(): void }[] = []
  const W = 1024
  const H = 512
  const textures: DynamicTexture[] = []
  const bases: Mesh[] = []
  ARTS.forEach((art, k) => {
    const tex = new DynamicTexture(`corrida-outdoor-${k}`, { width: W, height: H }, scene, true)
    const g = tex.getContext() as CanvasRenderingContext2D
    art(g, W, H, null)
    tex.update(true)
    textures.push(tex)
    const mat = new StandardMaterial(`corrida-outdoor-${k}`, scene)
    mat.diffuseColor = new Color3(0, 0, 0)
    mat.specularColor = new Color3(0, 0, 0)
    mat.emissiveTexture = tex
    mat.disableLighting = true
    mat.fogEnabled = true
    const base = CreatePlane(`corrida-outdoor-${k}`, { width: PANEL_W, height: PANEL_H }, scene)
    base.material = mat
    base.isPickable = false
    base.setEnabled(false)
    bases.push(base)
    disposables.push(tex, mat, base)
  })
  // a arte da marca redesenha quando a imagem do logo chega
  if (typeof Image !== "undefined") {
    const img = new Image()
    img.onload = () => {
      const tex = textures[0]
      if (!tex || !tex.getScene()) return
      ARTS[0](tex.getContext() as CanvasRenderingContext2D, W, H, img)
      tex.update(true)
    }
    img.src = "/freelandoo-logo.png"
  }

  // moldura de neon (atrás do painel) e postes: instâncias finas
  const frameMat = new StandardMaterial("corrida-outdoor-frame", scene)
  frameMat.diffuseColor = new Color3(0, 0, 0)
  frameMat.emissiveColor = new Color3(0.85, 0.55, 0.2)
  frameMat.disableLighting = true
  const frame = CreatePlane("corrida-outdoor-frame", { width: PANEL_W + 0.7, height: PANEL_H + 0.7 }, scene)
  frame.material = frameMat
  frame.isPickable = false
  const postMat = new StandardMaterial("corrida-outdoor-post", scene)
  postMat.diffuseColor = new Color3(0.16, 0.13, 0.11)
  postMat.specularColor = new Color3(0.05, 0.05, 0.05)
  const post = CreateBox("corrida-outdoor-post", { size: 1 }, scene)
  post.bakeTransformIntoVertices(Matrix.Translation(0, 0.5, 0))
  post.material = postMat
  post.isPickable = false
  disposables.push(frameMat, frame, postMat, post)

  const panels: InstancedMesh[] = []
  const frames: number[] = []
  const posts: number[] = []
  const q = new Quaternion()
  spots.forEach((s, i) => {
    Quaternion.RotationYawPitchRollToRef(s.yaw, 0, 0, q)
    const c = s.at.add(new Vector3(0, LIFT + PANEL_H / 2, 0))
    const inst = bases[i % bases.length].createInstance(`corrida-outdoor-${i}`)
    inst.position.copyFrom(c)
    inst.rotationQuaternion = q.clone()
    inst.isPickable = false
    inst.freezeWorldMatrix()
    panels.push(inst)
    // moldura 5 cm atrás (o painel olha para −z local)
    const back = Vector3.TransformNormal(new Vector3(0, 0, 0.06), Matrix.FromQuaternionToRef(q, new Matrix()))
    frames.push(...Matrix.Compose(Vector3.One(), q, c.add(back)).asArray())
    for (const side of [-1, 1]) {
      const off = Vector3.TransformNormal(new Vector3(side * PANEL_W * 0.36, 0, 0.12), Matrix.FromQuaternionToRef(q, new Matrix()))
      const foot = s.at.add(off).add(new Vector3(0, -s.drop, 0))
      posts.push(...Matrix.Compose(new Vector3(0.35, s.drop + LIFT + 0.2, 0.35), q, foot).asArray())
    }
  })
  frame.thinInstanceSetBuffer("matrix", new Float32Array(frames), 16, true)
  post.thinInstanceSetBuffer("matrix", new Float32Array(posts), 16, true)
  if (!spots.length) {
    frame.setEnabled(false)
    post.setEnabled(false)
  }

  return {
    dispose() {
      for (const p of panels) p.dispose()
      for (const d of disposables) d.dispose()
    },
  }
}
