// features/meu-mundo/jetpack/engine/pack-view.ts — JETPACK (mm3d-63): a mochila e o fogo.
//
// O jetpack de latão nas costas de cada personagem (dois tanques, armação de
// ferro, manômetro, bocais de cobre) preso ao nó do personagem, e o FOGO dos
// dois bocais: dois cones somados (borda laranja, miolo claro) que esticam
// com o propulsor e tremem. Propulsor solto = chama-piloto curta; sem
// combustível = só uma fagulha que pisca.
//
// O corpo do jogo tem sempre 1,70 m aqui (a caixa da regra é a mesma para
// todos), então a mochila tem um lugar fixo nas costas.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Engine } from "@babylonjs/core/Engines/engine"
import { SteamGeo } from "../../engine/steampunk/geo"
import { SP, place, facing } from "../../engine/steampunk/scenery"

/** Altura do corpo no jetpack (m). */
export const PILOT_H = 1.7
/** Bocais (no quadro do personagem: pés na origem, frente +z). */
const NOZZLES = [
  [-0.12, 0.86, -0.33],
  [0.12, 0.86, -0.33],
] as const

export interface PackKit {
  body: Mesh
  glow: Mesh
  flameOuter: Mesh
  flameInner: Mesh
  dispose: () => void
}

/** Os moldes (uma vez por cena). */
export function buildPackKit(scene: Scene, mats: { trim: StandardMaterial; glow: StandardMaterial }): PackKit {
  const g = new SteamGeo()
  const l = new SteamGeo()
  l.uv = "flat"
  // armação e placa das costas
  g.box(0.4, 0.5, 0.08, place(0, 1.24, -0.2), SP.iron)
  g.box(0.44, 0.06, 0.12, place(0, 1.5, -0.22), SP.brassDark)
  g.box(0.44, 0.06, 0.12, place(0, 0.98, -0.22), SP.brassDark)
  // dois tanques de latão com tampa de cobre e janela verde do combustível
  for (const [x] of NOZZLES) {
    g.cylinder(0.2, 0.56, place(x, 1.22, -0.33), SP.brass, 12)
    g.cylinder(0.14, 0.08, place(x, 1.54, -0.33), SP.copper, 10)
    g.cylinder(0.22, 0.05, place(x, 1.38, -0.33), SP.bronze, 12)
    g.cylinder(0.22, 0.05, place(x, 1.04, -0.33), SP.bronze, 12)
    // bocal: funil de cobre virado para baixo
    g.cone(0.13, 0.08, 0.14, place(x, 0.89, -0.33), SP.copperDark, 10)
    l.box(0.05, 0.16, 0.05, place(x, 1.22, -0.43), [0.29, 0.98, 0.64])
  }
  // manômetro entre os tanques e as presilhas dos ombros
  g.cylinder(0.12, 0.04, facing(0, 1.42, -0.42), SP.brass, 10)
  l.cylinder(0.09, 0.045, facing(0, 1.42, -0.425), [1, 0.83, 0.48], 10)
  for (const x of [-0.16, 0.16]) g.box(0.06, 0.05, 0.2, place(x, 1.52, -0.12), SP.ironHi)
  const body = g.build("jt-pack", scene, mats.trim, false)
  const glow = l.build("jt-pack-glow", scene, mats.glow, false)
  body.setEnabled(false)
  glow.setEnabled(false)

  // fogo: cone com a ponta para baixo (origem na boca do bocal)
  const fire = (name: string, d: number, color: Color3, alpha: number) => {
    const m = CreateCylinder(name, { height: 1, diameterTop: d, diameterBottom: 0, tessellation: 10, cap: Mesh.NO_CAP }, scene)
    m.bakeTransformIntoVertices(place(0, -0.5, 0))
    const mat = new StandardMaterial(`${name}-mat`, scene)
    mat.disableLighting = true
    mat.emissiveColor = color
    mat.diffuseColor = Color3.Black()
    mat.specularColor = Color3.Black()
    mat.alpha = alpha
    mat.alphaMode = Engine.ALPHA_ADD
    mat.backFaceCulling = false
    mat.disableDepthWrite = true
    m.material = mat
    m.isPickable = false
    m.setEnabled(false)
    return m
  }
  const flameOuter = fire("jt-flame-o", 0.2, new Color3(1, 0.42, 0.08), 0.85)
  const flameInner = fire("jt-flame-i", 0.1, new Color3(1, 0.9, 0.62), 0.95)
  return {
    body,
    glow,
    flameOuter,
    flameInner,
    dispose() {
      for (const m of [body, glow, flameOuter, flameInner]) {
        m.material && m.material !== mats.trim && m.material !== mats.glow && m.material.dispose()
        m.dispose()
      }
    },
  }
}

/** A mochila de UM personagem (presa ao nó dele). */
export class PackRig {
  private readonly root: TransformNode
  private readonly parts: Mesh[] = []
  private readonly flames: { node: TransformNode; outer: Mesh; inner: Mesh }[] = []
  private len = 0.3
  private seed = Math.random() * 100

  constructor(kit: PackKit, parent: TransformNode, name: string) {
    this.root = new TransformNode(`${name}-pack`, parent.getScene())
    this.root.parent = parent
    for (const src of [kit.body, kit.glow]) {
      const m = src.clone(`${name}-${src.name}`, this.root, true)!
      m.setEnabled(true)
      this.parts.push(m)
    }
    for (const [x, y, z] of NOZZLES) {
      const node = new TransformNode(`${name}-nozzle`, parent.getScene())
      node.parent = this.root
      node.position.set(x, y - 0.06, z)
      const outer = kit.flameOuter.clone(`${name}-fo`, node, true)!
      const inner = kit.flameInner.clone(`${name}-fi`, node, true)!
      outer.setEnabled(true)
      inner.setEnabled(true)
      this.flames.push({ node, outer, inner })
    }
  }

  /** Por quadro: `thrust` = propulsor aceso; `empty` = sem combustível. */
  update(dt: number, now: number, thrust: boolean, empty: boolean, visible = true) {
    this.root.setEnabled(visible)
    if (!visible) return
    const want = empty ? 0.06 : thrust ? 1.25 : 0.28
    this.len += (want - this.len) * Math.min(1, dt * (thrust ? 18 : 9))
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i]
      const flick = 1 + Math.sin(now * 47 + this.seed + i * 1.7) * 0.12 + Math.sin(now * 83 + i) * 0.08
      const l = this.len * flick * (empty ? (Math.sin(now * 31 + i) > 0.6 ? 1 : 0.2) : 1)
      const w = 0.75 + this.len * 0.35
      f.outer.scaling.set(w, l, w)
      f.inner.scaling.set(w * 0.9, l * 0.62, w * 0.9)
    }
  }

  dispose() {
    this.root.dispose()
  }
}
