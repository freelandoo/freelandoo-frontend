// features/meu-mundo/paint/engine/cat-herd.ts — PAINT (mm3d-35g): os gatinhos.
//
// Leves (pedido do Alex): um gatinho ESTÁTICO por cor (pipeline/build_paint_cats.py
// — a pose do "idle" aplicada na malha, sem esqueleto) desenhado por
// instâncias; o movimento é por código (pulinho, balanço, queda).
//
//  - No mapa: parados no lugar, com o anel dourado; pegou → pula e some.
//  - Na FILA atrás de quem pegou, como no Cat Demon (comitiva.gd): RASTRO DE
//    MIGALHAS, não perseguição. O dono deixa uma trilha de pontos medida em
//    METROS andados; o gatinho i fica a `FIRST + i × SPACING` metros atrás. Todos
//    leem a mesma trilha (ninguém herda erro de ninguém) e a fila passa por onde
//    ele passou. A altura de cada ponto é a do último chão pisado (no pulo os
//    gatos ficam no chão); descer até ela é QUEDA, não deslize.
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
import { ensureLoaders } from "../../engine/avatars"
import type { PaintCat } from "../sim/map"

export const CAT_ASSETS = "/meu-mundo/paint/v1/"
const CAT_FILES = ["gato-branco-leve.glb", "gato-preto-leve.glb"]
/** O modelo tem ~0,2 m; no jogo ~0,65 m (dá para ver de longe). */
const CAT_SCALE = 3.2
/** Fila (comitiva.gd × a escala): distância entre gatos e do primeiro ao dono. */
const SPACING = 0.85
const FIRST = 1.15
const SAMPLE = 0.18
/** Mais que isto atrás de um jogador não é desenhado (o placar continua contando). */
const MAX_SHOWN = 24
const GRAVITY = 18

interface MapCat {
  cat: PaintCat
  inst: InstancedMesh | null
  ring: InstancedMesh
  /** 0 = no mapa; >0 = pego em (relógio); -1 = já estava pego ao entrar. */
  taken: number
}

interface Follower {
  inst: InstancedMesh | null
  skin: 0 | 1
  y: number
  vy: number
  x: number
  z: number
  hop: number
}

/** A trilha de um dono e os gatos dele. */
class Trail {
  private pts: { x: number; y: number; z: number }[] = []
  private dist: number[] = []
  private groundY = 0
  readonly cats: Follower[] = []
  private maxLen = 6

  constructor(private readonly herd: CatHerd) {}

  reset(x: number, y: number, z: number) {
    this.pts = [{ x, y, z }]
    this.dist = [0]
    this.groundY = y
    for (const c of this.cats) {
      c.x = x
      c.z = z
      c.y = y
      c.vy = 0
    }
  }

  update(dt: number, x: number, y: number, z: number, ground: boolean, count: number, facing: number) {
    if (!this.pts.length) this.reset(x, y, z)
    if (ground) this.groundY = y
    const last = this.pts[0]
    const d = Math.hypot(x - last.x, this.groundY - last.y, z - last.z)
    if (d > 8) this.reset(x, this.groundY, z) // renasceu / portal: a fila vem junto
    else if (d >= SAMPLE) {
      this.pts.unshift({ x, y: this.groundY, z })
      this.dist.unshift(0)
      for (let i = 1; i < this.pts.length; i++) this.dist[i] = this.dist[i - 1] + Math.hypot(this.pts[i - 1].x - this.pts[i].x, this.pts[i - 1].y - this.pts[i].y, this.pts[i - 1].z - this.pts[i].z)
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
      this.cats.push({ inst: this.herd.instance(skin), skin, x: tail.x, y: tail.y + 0.6, z: tail.z, vy: 0, hop: Math.random() * 6 })
    }
    while (this.cats.length > want) this.cats.pop()?.inst?.dispose()
    this.maxLen = FIRST + want * SPACING + 2
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
      const extra = need - this.dist[n - 1] + 0.5
      this.pts.push({ x: tail.x + dx * extra, y: tail.y, z: tail.z + dz * extra })
      this.dist.push(this.dist[n - 1] + extra)
    }
    // cada gato no seu ponto da trilha
    this.cats.forEach((c, i) => {
      const p = this.pointAt(FIRST + i * SPACING)
      const ahead = this.pointAt(Math.max(0, FIRST + i * SPACING - 0.4))
      const moved = Math.hypot(p.x - c.x, p.z - c.z)
      c.x = p.x
      c.z = p.z
      if (c.y > p.y + 0.02) {
        // ficou para trás num degrau: cai
        c.vy -= GRAVITY * dt
        c.y = Math.max(p.y, c.y + c.vy * dt)
        if (c.y === p.y) c.vy = 0
      } else {
        c.y = p.y
        c.vy = 0
      }
      c.hop += moved * 5
      const bounce = moved > 0.002 ? Math.abs(Math.sin(c.hop)) * 0.14 : Math.sin(this.herd.clock * 2 + i) * 0.015
      if (!c.inst) c.inst = this.herd.instance(c.skin)
      if (!c.inst) return
      c.inst.position.set(c.x, c.y + bounce, c.z)
      const dx = ahead.x - p.x
      const dz = ahead.z - p.z
      if (Math.hypot(dx, dz) > 0.01) c.inst.rotation.y = Math.atan2(dx, dz)
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
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }
  }

  dispose() {
    for (const c of this.cats) c.inst?.dispose()
    this.cats.length = 0
  }
}

export class CatHerd {
  clock = 0
  private sources: (Mesh | null)[] = [null, null]
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
    this.ringBase = CreateTorus("paint-cat-ring", { diameter: 1.1, thickness: 0.07, tessellation: 28 }, scene)
    this.ringBase.material = this.ringMat
    this.ringBase.isPickable = false
    this.ringBase.position.y = -1000
    for (const c of cats) {
      const ring = this.ringBase.createInstance(`paint-cat-ring-${c.id}`)
      ring.position.set(c.x, c.y + 0.05, c.z)
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
        const parts = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0)
        const merged = parts.length === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true, undefined, false, true)
        if (!merged) return
        merged.setParent(null)
        merged.bakeCurrentTransformIntoVertices()
        // a escala vai NA malha: instância não herda a escala da fonte
        merged.scaling.setAll(CAT_SCALE)
        merged.bakeCurrentTransformIntoVertices()
        merged.position.y = -1000 // a fonte fica escondida embaixo; só as instâncias aparecem
        merged.isPickable = false
        if (merged.material) merged.material.backFaceCulling = false
        merged.name = `paint-cat-src-${i}`
        for (const n of c.transformNodes) if (n.getChildMeshes().length === 0) n.dispose()
        this.sources[i] = merged
      })
    } catch (err) {
      if (!this.disposed) console.warn("[paint] gatinhos não carregaram", err)
      return
    }
    for (const v of this.map) {
      if (v.taken < 0) continue
      v.inst = this.instance(v.cat.skin)
      if (!v.inst) continue
      v.inst.position.set(v.cat.x, v.cat.y, v.cat.z)
      v.inst.rotation.y = v.cat.facing
      if (v.taken > 0) v.inst.setEnabled(false)
    }
  }

  /** Uma instância do gatinho (null até carregar). */
  instance(skin: 0 | 1): InstancedMesh | null {
    const src = this.sources[skin]
    if (!src) return null
    const inst = src.createInstance(`paint-cat-${++this.seq}`)
    inst.isPickable = false
    inst.scaling.setAll(1)
    return inst
  }

  /** Gatinho do mapa pego: pula e some (instant = já estava pego ao entrar). */
  take(id: number, instant = false) {
    const v = this.byCat.get(id)
    if (!v || v.taken) return
    v.taken = instant ? -1 : this.clock
    v.ring.setEnabled(false)
    if (instant) v.inst?.setEnabled(false)
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
        if (v.inst) v.inst.position.y = v.cat.y + Math.max(0, Math.sin(this.clock * 2.2 + v.cat.id)) * 0.05
        continue
      }
      if (v.taken < 0 || !v.inst || !v.inst.isEnabled()) continue
      const t = this.clock - v.taken
      if (t > 0.5) {
        v.inst.setEnabled(false)
        continue
      }
      // pulinho de alegria e some (vai para a fila de quem pegou)
      v.inst.position.y = v.cat.y + Math.sin(Math.min(1, t / 0.5) * Math.PI) * 0.9
      v.inst.rotation.y = v.cat.facing + t * 10
      v.inst.scaling.setAll(Math.max(0.05, 1 - t / 0.5))
    }
  }

  dispose() {
    this.disposed = true
    for (const t of this.trails.values()) t.dispose()
    this.trails.clear()
    for (const v of this.map) {
      v.inst?.dispose()
      v.ring.dispose()
    }
    for (const s of this.sources) {
      if (!s) continue
      s.material?.dispose(true, true)
      s.dispose()
    }
    this.ringBase.dispose()
    this.ringMat.dispose()
  }
}
