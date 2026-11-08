// features/meu-mundo/jetpack/engine/env-pool.ts — JETPACK 2.0: o "pool" de trechos do cenário.
//
// Cada fase declara MÓDULOS de 24 m (o paredão, a ponte, a cachoeira…), cada
// um desenhado UMA vez (uma malha por material). O pool põe cópias
// instanciadas onde o jogador vê: o trecho número `s` recebe o módulo que a
// fase escolhe para ele (`pick(s)`, determinístico — o mesmo em todo
// aparelho), e o cenário muda de composição com a distância. Trecho que fica
// para trás devolve as cópias ao pool do módulo dele; nada é criado de novo
// depois que o pool encheu.
//
// Peças que se mexem (pás do moinho, bandeiras) são "giradores": uma malha
// própria por tipo, instanciada no ponto que o módulo marcou, girada pelo
// pool a cada quadro.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import "@babylonjs/core/Meshes/instancedMesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"

/** Comprimento de um trecho (m) — o mesmo do túnel original. */
export const SEG = 24

/** Um ponto que gira: tipo do girador, posição no trecho, velocidade (rad/s) e balanço (0 = gira inteiro). */
export interface SpinSpot {
  kind: string
  x: number
  y: number
  z: number
  /** Giro em torno do eixo z (pás) ou balanço em torno de x (bandeira). */
  speed: number
  sway: number
  ry: number
}

/** Uma peça de modelo (GLB) no trecho: tipo, posição, escala por eixo e giro em y. Chega depois (provide). */
export interface PropSpot {
  kind: string
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  ry: number
}

export interface PoolModule {
  /** As malhas do módulo (uma por material), já montadas. */
  meshes: Mesh[]
  spins: SpinSpot[]
  props?: PropSpot[]
}

interface Live {
  m: number
  node: TransformNode
  insts: InstancedMesh[]
  spins: { inst: InstancedMesh; spot: SpinSpot; ph: number }[]
  /** Peças de modelo já postas (por índice em `props` do módulo). */
  props: (InstancedMesh | null)[]
}

export class SegmentPool {
  private readonly hold: TransformNode
  private readonly live = new Map<number, Live>()
  private readonly free: Live[][]
  private seq = 0
  /** Malhas das peças de modelo que já chegaram (tipo → malha). */
  private readonly propSrc = new Map<string, Mesh>()

  constructor(
    private readonly scene: Scene,
    private readonly name: string,
    private readonly modules: PoolModule[],
    private readonly spinners: Map<string, Mesh>,
    /** Quantos trechos à vista (atrás + à frente). */
    private readonly slots: number,
    /** Módulo do trecho s. */
    private readonly pick: (s: number) => number,
  ) {
    // os moldes ficam longe (fora da vista): as cópias é que aparecem
    this.hold = new TransformNode(`${name}-molds`, scene)
    this.hold.position.y = -5000
    for (const mod of modules) for (const m of mod.meshes) m.parent = this.hold
    for (const m of spinners.values()) m.parent = this.hold
    this.free = modules.map(() => [])
  }

  private make(m: number): Live {
    const id = ++this.seq
    const node = new TransformNode(`${this.name}-seg${id}`, this.scene)
    const insts = this.modules[m].meshes.map((src) => {
      const i = src.createInstance(`${src.name}-i${id}`)
      i.parent = node
      i.isPickable = false
      return i
    })
    const spins = this.modules[m].spins.map((spot, k) => {
      const inst = this.spinners.get(spot.kind)!.createInstance(`${this.name}-spin${id}-${k}`)
      inst.parent = node
      inst.isPickable = false
      inst.position.set(spot.x, spot.y, spot.z)
      inst.rotation.y = spot.ry
      return { inst, spot, ph: k * 1.7 + id }
    })
    const l: Live = { m, node, insts, spins, props: (this.modules[m].props ?? []).map(() => null) }
    this.fillProps(l)
    return l
  }

  /** Põe as peças de modelo que já chegaram e ainda faltam neste trecho. */
  private fillProps(l: Live) {
    const spots = this.modules[l.m].props ?? []
    for (let k = 0; k < spots.length; k++) {
      if (l.props[k]) continue
      const src = this.propSrc.get(spots[k].kind)
      if (!src) continue
      const p = spots[k]
      const inst = src.createInstance(`${src.name}-p${this.seq}-${k}`)
      inst.parent = l.node
      inst.isPickable = false
      inst.position.set(p.x, p.y, p.z)
      inst.scaling.set(p.sx, p.sy, p.sz)
      inst.rotation.y = p.ry
      l.props[k] = inst
    }
  }

  /** Chegou a malha de uma peça de modelo: entra em todos os trechos (vivos e guardados). */
  provide(kind: string, mesh: Mesh) {
    this.propSrc.set(kind, mesh)
    for (const l of this.live.values()) this.fillProps(l)
    for (const list of this.free) for (const l of list) this.fillProps(l)
  }

  /** Põe os trechos em volta de z; anima os giradores. */
  update(z: number, now: number) {
    const first = Math.floor(z / SEG) - 1
    for (const [s, l] of this.live) {
      if (s >= first && s < first + this.slots) continue
      l.node.setEnabled(false)
      this.free[l.m].push(l)
      this.live.delete(s)
    }
    for (let s = first; s < first + this.slots; s++) {
      if (this.live.has(s)) continue
      const m = this.pick(s)
      const l = this.free[m].pop() ?? this.make(m)
      l.node.setEnabled(true)
      l.node.position.z = s * SEG
      this.live.set(s, l)
    }
    for (const l of this.live.values()) {
      for (const sp of l.spins) {
        if (sp.spot.sway) sp.inst.rotation.x = Math.sin(now * sp.spot.speed + sp.ph) * sp.spot.sway
        else sp.inst.rotation.z = now * sp.spot.speed + sp.ph
      }
    }
  }

  /** Quantas cópias de trecho existem (para a sonda). */
  get built() {
    return this.seq
  }

  dispose() {
    const all = [...this.live.values(), ...this.free.flat()]
    for (const l of all) {
      for (const i of l.insts) i.dispose()
      for (const sp of l.spins) sp.inst.dispose()
      for (const p of l.props) p?.dispose()
      l.node.dispose()
    }
    this.live.clear()
    for (const mod of this.modules) for (const m of mod.meshes) m.dispose()
    for (const m of this.spinners.values()) m.dispose()
    this.hold.dispose()
  }
}

/** Sorteio determinístico de um inteiro (o mesmo em todo aparelho). */
export function hash32(a: number, b = 0) {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d) >>> 0
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39) >>> 0
  h ^= h >>> 15
  return h >>> 0
}

/** Escolha ponderada pelo sorteio `h` (0…2³²). */
export function weighted(h: number, weights: readonly number[]) {
  const total = weights.reduce((n, w) => n + w, 0)
  let u = (h / 4294967296) * total
  for (let i = 0; i < weights.length; i++) {
    u -= weights[i]
    if (u <= 0) return i
  }
  return weights.length - 1
}
