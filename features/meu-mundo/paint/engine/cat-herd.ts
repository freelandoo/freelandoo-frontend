// features/meu-mundo/paint/engine/cat-herd.ts — PAINT (mm3d-35g/h): os gatinhos.
//
// Leves (pedido do Alex): um gatinho ESTÁTICO por cor (pipeline/build_paint_cats.py
// — a pose do "idle" aplicada na malha, sem esqueleto) desenhado por
// instâncias; o movimento é por código. mm3d-35h: 5× menores, o rabo é peça
// própria (balança) e o corpo respira.
//
//  - No mapa: parados no lugar, com o anel dourado; pegou → pula e some.
//  - Na FILA atrás de quem pegou, como no Cat Demon (comitiva.gd): RASTRO DE
//    MIGALHAS, não perseguição. O dono deixa uma trilha de pontos medida em
//    METROS andados; o gatinho i fica a `FIRST + i × SPACING` metros atrás. Todos
//    leem a mesma trilha (ninguém herda erro de ninguém) e a fila passa por onde
//    ele passou.
//  - A ALTURA é de cada gato (mm3d-35h): gravidade e o chão de verdade embaixo
//    dele (`supportAt`). O dono pulou → cada gato pula também, um pouco depois do
//    da frente, e cai de volta (nunca fica parado no ar); degrau alto no caminho
//    → pula para subir; vão por onde o dono passou pulando → refaz o arco dele.
//  - Roubo (nocaute pelo vermelho): a fila de quem caiu some e a de quem
//    derrubou cresce.

import type { Scene } from "@babylonjs/core/scene"
import type { Camera } from "@babylonjs/core/Cameras/camera"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/instancedMesh"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { ensureLoaders } from "../../engine/avatars"
import type { PaintCat, Solid } from "../sim/map"
import { supportAt } from "../sim/collide"

export const CAT_ASSETS = "/meu-mundo/paint/v1/"
const CAT_FILES = ["gato-branco-m35h.glb", "gato-preto-m35h.glb"]
/** O modelo tem ~0,2 m; no jogo ~0,13 m (mm3d-35h: 5× menor que o 3,2 de antes). */
const CAT_SCALE = 0.64
/** Fila (comitiva.gd × a escala): distância entre gatos e do primeiro ao dono. */
const SPACING = 0.3
const FIRST = 0.6
const SAMPLE = 0.1
/** Mais que isto atrás de um jogador não é desenhado (o placar continua contando). */
const MAX_SHOWN = 24
const GRAVITY = 22
/** Subida sem pular e folga do "pé" do gato. */
const CAT_STEP = 0.06
const CAT_PAD = 0.04

/** Um gatinho desenhado: corpo + rabo (filho, gira na base). */
interface CatInst {
  body: InstancedMesh
  tail: InstancedMesh | null
}

interface CatSource {
  body: Mesh
  tail: Mesh | null
  /** Base do rabo no espaço do corpo (já na escala). */
  pivot: Vector3
}

interface MapCat {
  cat: PaintCat
  inst: CatInst | null
  ring: InstancedMesh
  /** 0 = no mapa; >0 = pego em (relógio); -1 = já estava pego ao entrar. */
  taken: number
}

interface Follower {
  inst: CatInst | null
  skin: 0 | 1
  x: number
  y: number
  z: number
  vy: number
  grounded: boolean
  /** Pulo marcado (relógio) e a força dele; 0 = nenhum. */
  jumpAt: number
  jumpV: number
  hop: number
  phase: number
}

/** A trilha de um dono e os gatos dele. `g` = último chão pisado, `o` = altura do dono. */
class Trail {
  private pts: { x: number; g: number; o: number; z: number }[] = []
  private dist: number[] = []
  private groundY = 0
  private wasGround = true
  private lastY = 0
  readonly cats: Follower[] = []
  private maxLen = 3

  constructor(private readonly herd: CatHerd) {}

  reset(x: number, y: number, z: number) {
    this.pts = [{ x, g: y, o: y, z }]
    this.dist = [0]
    this.groundY = y
    this.lastY = y
    for (const c of this.cats) {
      c.x = x
      c.z = z
      c.y = y
      c.vy = 0
      c.grounded = true
      c.jumpAt = 0
    }
  }

  update(dt: number, x: number, y: number, z: number, ground: boolean, count: number, facing: number) {
    if (!this.pts.length) this.reset(x, y, z)
    const solids = this.herd.solids
    const clock = this.herd.clock
    // o dono saiu do chão subindo: cada gato pula também, em cascata
    if (this.wasGround && !ground && y > this.lastY && dt > 0) {
      const v = Math.min(7, Math.max(3.5, ((y - this.lastY) / dt) * 0.85))
      this.cats.forEach((c, i) => {
        c.jumpAt = clock + 0.04 + i * 0.05
        c.jumpV = v
      })
    }
    this.wasGround = ground
    this.lastY = y
    if (ground) this.groundY = y
    const last = this.pts[0]
    const d = Math.hypot(x - last.x, this.groundY - last.g, z - last.z)
    if (d > 8) this.reset(x, this.groundY, z) // renasceu / portal: a fila vem junto
    else if (d >= SAMPLE) {
      this.pts.unshift({ x, g: this.groundY, o: y, z })
      this.dist.unshift(0)
      for (let i = 1; i < this.pts.length; i++) this.dist[i] = this.dist[i - 1] + Math.hypot(this.pts[i - 1].x - this.pts[i].x, this.pts[i - 1].g - this.pts[i].g, this.pts[i - 1].z - this.pts[i].z)
      while (this.pts.length > 2 && this.dist[this.pts.length - 1] > this.maxLen) {
        this.pts.pop()
        this.dist.pop()
      }
    }
    // quantos gatos (até MAX_SHOWN)
    const want = Math.min(MAX_SHOWN, Math.max(0, count))
    while (this.cats.length < want) {
      const skin = (this.cats.length % 3 === 2 ? 1 : 0) as 0 | 1
      const tail = this.pointAt(FIRST + this.cats.length * SPACING)
      this.cats.push({ inst: this.herd.instance(skin), skin, x: tail.x, y: tail.g + 0.3, z: tail.z, vy: 0, grounded: false, jumpAt: 0, jumpV: 0, hop: Math.random() * 6, phase: Math.random() * 6 })
    }
    while (this.cats.length > want) this.herd.release(this.cats.pop()?.inst ?? null)
    this.maxLen = FIRST + want * SPACING + 1
    // trilha mais curta que a fila (acabou de ganhar gatinhos parado): estica
    // reto para trás do rabo, senão os gatos se empilham no pé do dono
    const need = FIRST + want * SPACING
    const n = this.pts.length
    if (want && this.dist[n - 1] < need) {
      const tail = this.pts[n - 1]
      const prev = n > 1 ? this.pts[n - 2] : null
      let dx = prev ? tail.x - prev.x : -Math.sin(facing)
      let dz = prev ? tail.z - prev.z : -Math.cos(facing)
      const l = Math.hypot(dx, dz) || 1
      dx /= l
      dz /= l
      const extra = need - this.dist[n - 1] + 0.3
      this.pts.push({ x: tail.x + dx * extra, g: tail.g, o: tail.g, z: tail.z + dz * extra })
      this.dist.push(this.dist[n - 1] + extra)
    }
    // cada gato no seu ponto da trilha; a altura é física dele
    this.cats.forEach((c, i) => {
      const p = this.pointAt(FIRST + i * SPACING)
      const ahead = this.pointAt(Math.max(0, FIRST + i * SPACING - 0.15))
      const moved = Math.hypot(p.x - c.x, p.z - c.z)
      c.x = p.x
      c.z = p.z
      let floor = solids ? supportAt(solids, c.x, c.z, c.y + CAT_STEP, CAT_PAD) : p.g
      // vão: o dono passou por cima pulando (ou pela ponte que já sumiu) — refaz o arco dele
      if (floor === -Infinity) floor = p.o
      if (c.grounded) {
        const ledge = solids ? supportAt(solids, c.x, c.z, Math.max(p.o, p.g) + 0.05, CAT_PAD) : -Infinity
        if (ledge > c.y + CAT_STEP) {
          // degrau alto no caminho: pula para subir
          c.vy = Math.sqrt(2 * GRAVITY * (ledge - c.y + 0.1))
          c.grounded = false
        } else if (c.jumpAt && clock >= c.jumpAt) {
          c.vy = c.jumpV
          c.grounded = false
        } else if (floor < c.y - 0.02) c.grounded = false // saiu da borda: cai
        else c.y = floor
      }
      if (c.jumpAt && clock >= c.jumpAt) c.jumpAt = 0
      if (!c.grounded) {
        c.vy -= GRAVITY * dt
        c.y += c.vy * dt
        if (c.vy <= 0 && c.y <= floor) {
          c.y = floor
          c.vy = 0
          c.grounded = true
        }
      }
      // longe demais da fila (caiu do mapa, teleporte): reaparece no rastro
      if (c.y < p.g - 4 || c.y > p.g + 6) {
        c.y = p.g
        c.vy = 0
        c.grounded = true
      }
      c.hop += moved * 14
      const bounce = c.grounded && moved > 0.002 ? Math.abs(Math.sin(c.hop)) * 0.035 : 0
      if (!c.inst) c.inst = this.herd.instance(c.skin)
      if (!c.inst) return
      c.inst.body.position.set(c.x, c.y + bounce, c.z)
      const dx = ahead.x - p.x
      const dz = ahead.z - p.z
      if (Math.hypot(dx, dz) > 0.005) c.inst.body.rotation.y = Math.atan2(dx, dz)
      this.herd.alive(c.inst, c.phase, moved > 0.002)
    })
  }

  /** Ponto da trilha a `m` metros atrás da cabeça. */
  private pointAt(m: number) {
    const n = this.pts.length
    if (n === 1 || m <= 0) return this.pts[0]
    let i = 1
    while (i < n && this.dist[i] < m) i++
    if (i >= n) return this.pts[n - 1]
    const a = this.pts[i - 1]
    const b = this.pts[i]
    const k = (m - this.dist[i - 1]) / Math.max(1e-6, this.dist[i] - this.dist[i - 1])
    return { x: a.x + (b.x - a.x) * k, g: a.g + (b.g - a.g) * k, o: a.o + (b.o - a.o) * k, z: a.z + (b.z - a.z) * k }
  }

  dispose() {
    for (const c of this.cats) this.herd.release(c.inst)
    this.cats.length = 0
  }
}

export class CatHerd {
  clock = 0
  /** O mundo do quadro (ilhas + tinta): o chão embaixo de cada gato. */
  solids: readonly Solid[] | null = null
  private sources: (CatSource | null)[] = [null, null]
  private readonly map: MapCat[] = []
  private readonly byCat = new Map<number, MapCat>()
  private readonly trails = new Map<number, Trail>()
  private readonly ringBase: Mesh
  private readonly ringMat: StandardMaterial
  private disposed = false
  private seq = 0

  constructor(private readonly scene: Scene, cats: readonly PaintCat[]) {
    ensureLoaders()
    this.ringMat = new StandardMaterial("paint-cat-ring", scene)
    this.ringMat.emissiveColor = new Color3(0.95, 0.72, 0.2)
    this.ringMat.diffuseColor = new Color3(0.95, 0.75, 0.3)
    this.ringMat.disableLighting = true
    this.ringBase = CreateTorus("paint-cat-ring", { diameter: 0.36, thickness: 0.025, tessellation: 24 }, scene)
    this.ringBase.material = this.ringMat
    this.ringBase.isPickable = false
    this.ringBase.position.y = -1000
    for (const c of cats) {
      const ring = this.ringBase.createInstance(`paint-cat-ring-${c.id}`)
      ring.position.set(c.x, c.y + 0.03, c.z)
      ring.isPickable = false
      const v: MapCat = { cat: c, inst: null, ring, taken: 0 }
      this.map.push(v)
      this.byCat.set(c.id, v)
    }
    void this.load()
  }

  private async load() {
    try {
      const got = await Promise.all(CAT_FILES.map((f) => LoadAssetContainerAsync(CAT_ASSETS + f, this.scene)))
      if (this.disposed) {
        got.forEach((c) => c.dispose())
        return
      }
      got.forEach((c, i) => {
        c.addAllToScene()
        const isTail = (m: { name: string; parent: unknown }) => m.name.startsWith("rabo") || ((m.parent as { name?: string } | null)?.name ?? "").startsWith("rabo")
        const parts = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0)
        // base do rabo: a origem do nó "rabo" (o pipeline põe na base do Tail.001)
        const tailNode = [...c.meshes, ...c.transformNodes].find((n) => n.name === "rabo")
        tailNode?.computeWorldMatrix(true)
        const pivot = tailNode ? tailNode.getAbsolutePosition().clone() : Vector3.Zero()
        const body = this.bake(parts.filter((m) => !isTail(m)), Vector3.Zero())
        const tail = this.bake(parts.filter((m) => isTail(m)), pivot)
        for (const n of c.transformNodes) if (n.getChildMeshes().length === 0) n.dispose()
        if (!body) return
        body.name = `paint-cat-src-${i}`
        if (tail) tail.name = `paint-cat-tail-${i}`
        this.sources[i] = { body, tail, pivot: pivot.scale(CAT_SCALE) }
      })
    } catch (err) {
      if (!this.disposed) console.warn("[paint] gatinhos não carregaram", err)
      return
    }
    for (const v of this.map) {
      if (v.taken < 0) continue
      v.inst = this.instance(v.cat.skin)
      if (!v.inst) continue
      v.inst.body.position.set(v.cat.x, v.cat.y, v.cat.z)
      v.inst.body.rotation.y = v.cat.facing
      if (v.taken > 0) v.inst.body.setEnabled(false)
    }
  }

  /** Junta as partes numa malha-fonte no mundo, com a origem em `origin` e já na escala. */
  private bake(parts: Mesh[], origin: Vector3): Mesh | null {
    if (!parts.length) return null
    const merged = parts.length === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true, undefined, false, true)
    if (!merged) return null
    merged.setParent(null)
    merged.bakeCurrentTransformIntoVertices()
    merged.position.copyFrom(origin.scale(-1))
    merged.bakeCurrentTransformIntoVertices()
    // a escala vai NA malha: instância não herda a escala da fonte
    merged.scaling.setAll(CAT_SCALE)
    merged.bakeCurrentTransformIntoVertices()
    merged.position.y = -1000 // a fonte fica escondida embaixo; só as instâncias aparecem
    merged.isPickable = false
    if (merged.material) merged.material.backFaceCulling = false
    return merged
  }

  /** Um gatinho (corpo + rabo) — null até carregar. */
  instance(skin: 0 | 1): CatInst | null {
    const src = this.sources[skin]
    if (!src) return null
    const body = src.body.createInstance(`paint-cat-${++this.seq}`)
    body.isPickable = false
    body.scaling.setAll(1)
    let tail: InstancedMesh | null = null
    if (src.tail) {
      tail = src.tail.createInstance(`paint-cat-tail-${this.seq}`)
      tail.isPickable = false
      tail.parent = body
      tail.position.copyFrom(src.pivot)
    }
    return { body, tail }
  }

  release(inst: CatInst | null) {
    inst?.tail?.dispose()
    inst?.body.dispose()
  }

  /** Respira (o peito sobe e desce) e balança o rabo; andando, o rabo vai mais rápido. */
  alive(inst: CatInst, phase: number, moving: boolean) {
    const b = Math.sin(this.clock * 2.4 + phase) * 0.035
    inst.body.scaling.set(1 - b * 0.5, 1 + b, 1 - b * 0.5)
    if (inst.tail) inst.tail.rotation.y = Math.sin(this.clock * (moving ? 6 : 2.6) + phase) * 0.35
  }

  /** O mundo do quadro (antes das filas). */
  setSolids(solids: readonly Solid[]) {
    this.solids = solids
  }

  /** Gatinho do mapa pego: pula e some (instant = já estava pego ao entrar). */
  take(id: number, instant = false) {
    const v = this.byCat.get(id)
    if (!v || v.taken) return
    v.taken = instant ? -1 : this.clock
    v.ring.setEnabled(false)
    if (instant) v.inst?.body.setEnabled(false)
  }

  /** A fila de um jogador (posição do dono, chão e quantos gatos ele tem). */
  follow(slot: number, dt: number, x: number, y: number, z: number, ground: boolean, count: number, facing = 0) {
    let t = this.trails.get(slot)
    if (!t) {
      t = new Trail(this)
      this.trails.set(slot, t)
    }
    t.update(dt, x, y, z, ground, count, facing)
  }

  /** Jogador saiu: a fila some. */
  drop(slot: number) {
    this.trails.get(slot)?.dispose()
    this.trails.delete(slot)
  }

  tick(dt: number, _cam: Camera | null) {
    this.clock += dt
    for (const v of this.map) {
      if (!v.taken) {
        v.ring.rotation.y = this.clock * 0.8
        const pulse = 1 + Math.sin(this.clock * 3 + v.cat.id) * 0.08
        v.ring.scaling.set(pulse, 1, pulse)
        if (v.inst) this.alive(v.inst, v.cat.id, false)
        continue
      }
      if (v.taken < 0 || !v.inst || !v.inst.body.isEnabled()) continue
      const t = this.clock - v.taken
      if (t > 0.5) {
        v.inst.body.setEnabled(false)
        continue
      }
      // pulinho de alegria e some (vai para a fila de quem pegou)
      v.inst.body.position.y = v.cat.y + Math.sin(Math.min(1, t / 0.5) * Math.PI) * 0.4
      v.inst.body.rotation.y = v.cat.facing + t * 10
      v.inst.body.scaling.setAll(Math.max(0.05, 1 - t / 0.5))
    }
  }

  dispose() {
    this.disposed = true
    for (const t of this.trails.values()) t.dispose()
    this.trails.clear()
    for (const v of this.map) {
      this.release(v.inst)
      v.ring.dispose()
    }
    for (const s of this.sources) {
      if (!s) continue
      s.body.material?.dispose(true, true)
      s.body.dispose()
      s.tail?.dispose()
    }
    this.ringBase.dispose()
    this.ringMat.dispose()
  }
}
