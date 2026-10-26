// features/meu-mundo/paint/engine/cat-herd.ts — PAINT (mm3d-35g/h): os gatinhos.
//
// Leves (pedido do Alex): um gatinho ESTÁTICO por cor (pipeline/build_paint_cats.py
// — a pose do "idle" aplicada na malha, sem esqueleto) desenhado por
// instâncias; o movimento é por código. mm3d-35h: menores, o rabo é peça
// própria (balança) e o corpo respira. mm3d-35i: 2× o tamanho da 35h e ANDAM —
// as 4 patas são peças próprias e balançam em passo diagonal, no ritmo dos
// metros andados (antes pareciam arrastados).
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
const CAT_FILES = ["gato-branco-m35i.glb", "gato-preto-m35i.glb"]
/** O modelo tem ~0,2 m; no jogo ~0,25 m (mm3d-35i: 2× a 35h, pedido do Alex). */
const CAT_SCALE = 1.28
/** Fila (comitiva.gd × a escala): distância entre gatos e do primeiro ao dono. */
const SPACING = 0.5
const FIRST = 0.8
const SAMPLE = 0.1
/** Mais que isto atrás de um jogador não é desenhado (o placar continua contando). */
const MAX_SHOWN = 24
const GRAVITY = 22
/** Subida sem pular e folga do "pé" do gato. */
const CAT_STEP = 0.1
const CAT_PAD = 0.06
/** Peças móveis do GLB (build_paint_cats.py): rabo + patas frente/trás × esq./dir. */
const PARTS = ["rabo", "pata_fe", "pata_fd", "pata_te", "pata_td"] as const
/** Fase do passo por metro andado (uma passada ≈ 0,22 m). */
const GAIT = (Math.PI * 2) / 0.22

/** Um gatinho desenhado: corpo + peças (filhas, giram na base), na ordem de PARTS. */
interface CatInst {
  body: InstancedMesh
  parts: (InstancedMesh | null)[]
}

interface CatSource {
  body: Mesh
  parts: (Mesh | null)[]
  /** Base de cada peça no espaço do corpo (já na escala). */
  pivots: Vector3[]
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
  /** 0 parado … 1 andando (suaviza o balanço das patas). */
  walk: number
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
      this.cats.push({ inst: this.herd.instance(skin), skin, x: tail.x, y: tail.g + 0.3, z: tail.z, vy: 0, grounded: false, jumpAt: 0, jumpV: 0, hop: Math.random() * 6, walk: 0, phase: Math.random() * 6 })
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
      c.hop += moved * GAIT
      const going = dt > 0 && moved / dt > 0.25 ? 1 : 0
      c.walk += (going - c.walk) * Math.min(1, dt * 10)
      const bounce = c.grounded ? Math.abs(Math.sin(c.hop)) * 0.012 * c.walk : 0
      if (!c.inst) c.inst = this.herd.instance(c.skin)
      if (!c.inst) return
      c.inst.body.position.set(c.x, c.y + bounce, c.z)
      const dx = ahead.x - p.x
      const dz = ahead.z - p.z
      if (Math.hypot(dx, dz) > 0.005) c.inst.body.rotation.y = Math.atan2(dx, dz)
      this.herd.alive(c.inst, c.phase, c.hop, c.walk, !c.grounded)
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
    this.ringBase = CreateTorus("paint-cat-ring", { diameter: 0.6, thickness: 0.04, tessellation: 24 }, scene)
    this.ringBase.material = this.ringMat
    this.ringBase.isPickable = false
    this.ringBase.position.y = -1000
    for (const c of cats) {
      const ring = this.ringBase.createInstance(`paint-cat-ring-${c.id}`)
      ring.position.set(c.x, c.y + 0.04, c.z)
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
        // peça de cada malha: o nome dela ou do nó pai (primitivas "rabo_primitive0")
        const partOf = (m: Mesh) => PARTS.findIndex((k) => m.name.startsWith(k) || (m.parent?.name ?? "").startsWith(k))
        const meshes = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0)
        // base de cada peça: a origem do nó dela (o pipeline põe no ombro/quadril/rabo)
        const pivots = PARTS.map((k) => {
          const node = [...c.meshes, ...c.transformNodes].find((n) => n.name === k)
          node?.computeWorldMatrix(true)
          return node ? node.getAbsolutePosition().clone() : Vector3.Zero()
        })
        const body = this.bake(meshes.filter((m) => partOf(m) < 0), Vector3.Zero())
        const parts = PARTS.map((k, j) => this.bake(meshes.filter((m) => partOf(m) === j), pivots[j]))
        for (const n of c.transformNodes) if (n.getChildMeshes().length === 0) n.dispose()
        if (!body) return
        body.name = `paint-cat-src-${i}`
        parts.forEach((m, j) => {
          if (m) m.name = `paint-cat-${PARTS[j]}-${i}`
        })
        this.sources[i] = { body, parts, pivots: pivots.map((v) => v.scale(CAT_SCALE)) }
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

  /** Um gatinho (corpo + rabo + patas) — null até carregar. */
  instance(skin: 0 | 1): CatInst | null {
    const src = this.sources[skin]
    if (!src) return null
    const body = src.body.createInstance(`paint-cat-${++this.seq}`)
    body.isPickable = false
    body.scaling.setAll(1)
    const parts = src.parts.map((m, j) => {
      if (!m) return null
      const p = m.createInstance(`paint-cat-${PARTS[j]}-${this.seq}`)
      p.isPickable = false
      p.parent = body
      p.position.copyFrom(src.pivots[j])
      return p
    })
    return { body, parts }
  }

  release(inst: CatInst | null) {
    if (!inst) return
    for (const p of inst.parts) p?.dispose()
    inst.body.dispose()
  }

  /**
   * Respira, balança o rabo e anda: `gait` é a fase do passo (metros andados),
   * `walk` 0…1 o quanto está andando; passo diagonal (frente-esq. com trás-dir.).
   * No ar, as patas esticam (frente para a frente, trás para trás).
   */
  alive(inst: CatInst, phase: number, gait = 0, walk = 0, air = false) {
    const b = Math.sin(this.clock * 2.4 + phase) * 0.035
    inst.body.scaling.set(1 - b * 0.5, 1 + b, 1 - b * 0.5)
    const [tail, fe, fd, te, td] = inst.parts
    if (tail) tail.rotation.y = Math.sin(this.clock * (walk > 0.5 ? 6 : 2.6) + phase) * 0.35
    const swing = Math.sin(gait) * 0.65 * walk
    const legs: [InstancedMesh | null, number][] = air
      ? [[fe, -0.7], [fd, -0.7], [te, 0.7], [td, 0.7]]
      : [[fe, swing], [td, swing], [fd, -swing], [te, -swing]]
    for (const [leg, a] of legs) if (leg) leg.rotation.x += (a - leg.rotation.x) * (air ? 0.25 : 1)
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
        if (v.inst) this.alive(v.inst, v.cat.id)
        continue
      }
      if (v.taken < 0 || !v.inst || !v.inst.body.isEnabled()) continue
      const t = this.clock - v.taken
      if (t > 0.5) {
        v.inst.body.setEnabled(false)
        continue
      }
      // pulinho de alegria e some (vai para a fila de quem pegou)
      v.inst.body.position.y = v.cat.y + Math.sin(Math.min(1, t / 0.5) * Math.PI) * 0.6
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
      for (const m of s.parts) m?.dispose()
    }
    this.ringBase.dispose()
    this.ringMat.dispose()
  }
}
