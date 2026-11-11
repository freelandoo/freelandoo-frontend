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
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/instancedMesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Engine } from "@babylonjs/core/Engines/engine"
import { SteamGeo } from "../../engine/steampunk/geo"
import { SP, place, xf } from "../../engine/steampunk/scenery"
import { fuseGlow } from "../../engine/steampunk/glow-fuse"

/** Altura do corpo no jetpack (m). */
export const PILOT_H = 1.7
/** Bocais (no quadro do personagem: pés na origem, frente +z). */
const NOZZLES = [
  [-0.125, 0.8, -0.36],
  [0.125, 0.8, -0.36],
] as const

export interface PackKit {
  /** Corpo com o brilho dentro (`fuseGlow`: 1 chamada). */
  body: Mesh
  flameOuter: Mesh
  flameInner: Mesh
  dispose: () => void
}

/** Os moldes (uma vez por cena). */
export function buildPackKit(scene: Scene, mats: { trim: StandardMaterial; glow: StandardMaterial }): PackKit {
  const g = new SteamGeo()
  const l = new SteamGeo()
  l.uv = "flat"
  // Jetpack 2.0 (referências do Alex): dois TANQUES dourados quadradões, lado a lado,
  // com janela ciano acesa nas costas, faixas escuras, tampa e o bocal largo embaixo
  const GOLD: [number, number, number] = [0.86, 0.6, 0.26]
  const GOLD_HI: [number, number, number] = [0.98, 0.76, 0.36]
  const BRONZE: [number, number, number] = [0.42, 0.26, 0.12]
  const CYAN: [number, number, number] = [0.3, 1, 0.95]
  // placa presa às costas e as alças
  g.box(0.42, 0.5, 0.06, place(0, 1.24, -0.19), BRONZE)
  for (const x of [-0.15, 0.15]) g.box(0.07, 0.06, 0.24, place(x, 1.5, -0.1), BRONZE)
  for (const [x] of NOZZLES) {
    // corpo do tanque (chanfro pela textura de acabamento) e as quinas mais claras
    g.box(0.23, 0.56, 0.26, place(x, 1.2, -0.36), GOLD)
    g.box(0.25, 0.06, 0.28, place(x, 1.46, -0.36), GOLD_HI)
    g.box(0.25, 0.06, 0.28, place(x, 0.95, -0.36), GOLD_HI)
    g.box(0.24, 0.04, 0.27, place(x, 1.2, -0.36), BRONZE)
    // tampa
    g.box(0.16, 0.06, 0.18, place(x, 1.51, -0.36), BRONZE)
    // janela ciano nas costas (o que a câmera vê) com moldura escura
    g.box(0.11, 0.3, 0.02, place(x, 1.2, -0.495), BRONZE)
    l.box(0.07, 0.25, 0.02, place(x, 1.2, -0.505), CYAN)
    // bocal: cilindro largo escuro com boca de cobre
    g.cylinder(0.2, 0.12, place(x, 0.87, -0.36), BRONZE, 10)
    g.cone(0.17, 0.12, 0.1, place(x, 0.78, -0.36), SP.copperDark, 10)
  }
  // emblema aceso no meio, entre os tanques
  l.box(0.05, 0.05, 0.04, xf(0, 1.36, -0.5, 0, undefined, 0, Math.PI / 4), [1, 0.85, 0.4])
  const body = fuseGlow(g.build("jt-pack", scene, mats.trim, false), l.build("jt-pack-glow", scene, mats.glow, false))
  // V3 chamadas: os moldes ficam ligados e longe da vista; cada jogador é INSTÂNCIA deles
  // (eram clones: 6 chamadas por jogador — mochila, brilho e 2×2 chamas — e agora são 4 no total)
  const hold = new TransformNode("jt-pack-molds", scene)
  hold.position.y = -5000
  body.parent = hold

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
    m.parent = hold
    return m
  }
  const flameOuter = fire("jt-flame-o", 0.18, new Color3(1, 0.55, 0.12), 0.8)
  const flameInner = fire("jt-flame-i", 0.09, new Color3(1, 0.95, 0.7), 0.95)
  return {
    body,
    flameOuter,
    flameInner,
    dispose() {
      for (const m of [body, flameOuter, flameInner]) {
        m.material && m.material !== mats.trim && m.material !== mats.glow && m.material.dispose()
        m.dispose()
      }
      hold.dispose()
    },
  }
}

/** A mochila de UM personagem (presa ao nó dele). */
export class PackRig {
  private readonly root: TransformNode
  private readonly parts: InstancedMesh[] = []
  private readonly flames: { node: TransformNode; outer: InstancedMesh; inner: InstancedMesh }[] = []
  private len = 0.3
  private seed = Math.random() * 100

  constructor(kit: PackKit, parent: TransformNode, name: string) {
    this.root = new TransformNode(`${name}-pack`, parent.getScene())
    this.root.parent = parent
    for (const src of [kit.body]) {
      const m = src.createInstance(`${name}-${src.name}`)
      m.parent = this.root
      m.isPickable = false
      this.parts.push(m)
    }
    for (const [x, y, z] of NOZZLES) {
      const node = new TransformNode(`${name}-nozzle`, parent.getScene())
      node.parent = this.root
      node.position.set(x, y - 0.06, z)
      const outer = kit.flameOuter.createInstance(`${name}-fo`)
      const inner = kit.flameInner.createInstance(`${name}-fi`)
      outer.parent = node
      inner.parent = node
      outer.isPickable = inner.isPickable = false
      this.flames.push({ node, outer, inner })
    }
  }

  /** Por quadro: `thrust` = propulsor aceso; `empty` = sem combustível. */
  update(dt: number, now: number, thrust: boolean, empty: boolean, visible = true) {
    this.root.setEnabled(visible)
    if (!visible) return
    // chama longa como nas referências (o fogo é só desenho)
    const want = empty ? 0.06 : thrust ? 2.1 : 0.32
    this.len += (want - this.len) * Math.min(1, dt * (thrust ? 18 : 9))
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i]
      const flick = 1 + Math.sin(now * 47 + this.seed + i * 1.7) * 0.12 + Math.sin(now * 83 + i) * 0.08
      const l = this.len * flick * (empty ? (Math.sin(now * 31 + i) > 0.6 ? 1 : 0.2) : 1)
      const w = 0.9 + this.len * 0.22
      f.outer.scaling.set(w, l, w)
      f.inner.scaling.set(w * 0.9, l * 0.62, w * 0.9)
    }
  }

  dispose() {
    this.root.dispose()
  }
}
