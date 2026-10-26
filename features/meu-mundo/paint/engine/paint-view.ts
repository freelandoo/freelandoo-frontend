// features/meu-mundo/paint/engine/paint-view.ts — PAINT (mm3d-35): a tinta desenhada.
//
// Mancha = cilindro da regra (ponte achatada, degrau alto), desenhada como
// uma bolha brilhante (esfera achatada) que CRESCE ao nascer e encolhe ao
// sumir. Uma malha base por cor com instâncias finas: centenas de manchas em
// 3 chamadas de desenho. Mais: respingo no chão (vermelho), gotas que voam no
// impacto e o rastro do tiro (bolinha da boca da arma até o alvo).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateLathe } from "@babylonjs/core/Meshes/Builders/latheBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import { PAINT_COLORS, type PaintColor } from "../sim/tuning"
import type { Vec3 } from "../sim/map"
import type { NewBlob } from "../sim/paint"

const GROW = 0.22
const SHRINK = 0.35

function hex(h: string) {
  return Color3.FromHexString(h)
}

interface Live {
  id: number
  blob: NewBlob
  born: number
  /** >0 = sumindo desde. */
  dying: number
  /** Quicaram nela (cama elástica) em; 0 = nunca. */
  squashAt: number
  /** Índice na lista da cor. */
  slot: number
}

export class PaintView {
  private readonly bases: Mesh[] = []
  private readonly mats: StandardMaterial[] = []
  /** Por cor: lista densa de manchas (índice = instância). */
  private readonly lists: Live[][] = [[], [], []]
  private readonly byId = new Map<number, { c: PaintColor; live: Live }>()
  private readonly animating = new Set<Live>()
  private readonly splatBase: Mesh
  private readonly splatMat: StandardMaterial
  private readonly splatTex: DynamicTexture
  private readonly splats: { born: number; m: Matrix }[] = []
  private readonly dropBase: Mesh
  private readonly dropMats: StandardMaterial[] = []
  private readonly drops: { p: Vector3; v: Vector3; life: number; c: PaintColor; s: number }[] = []
  private readonly dropMeshes: Mesh[] = []
  private readonly bolts: { from: Vector3; to: Vector3; t: number; c: PaintColor }[] = []
  private readonly boltMeshes: Mesh[] = []
  private clock = 0
  private dirty = [false, false, false]
  private splatDirty = false

  constructor(scene: Scene, lowEnd: boolean) {
    for (let c = 0; c < 3; c++) {
      const mat = new StandardMaterial(`paint-blob-${c}`, scene)
      const col = hex(PAINT_COLORS[c])
      mat.diffuseColor = col
      mat.diffuseColor = col.scale(0.66)
      mat.emissiveColor = col.scale(0.1)
      mat.specularColor = new Color3(0.9, 0.9, 0.9)
      mat.specularPower = 36
      this.mats.push(mat)
      const base = puck(`paint-blob-base-${c}`, scene, lowEnd ? 18 : 28)
      base.material = mat
      base.isPickable = false
      // Sem instância o Babylon desenharia a própria malha-base: desligada até a 1ª mancha.
      base.setEnabled(false)
      base.alwaysSelectAsActiveMesh = true
      this.bases.push(base)
      const dm = new StandardMaterial(`paint-drop-${c}`, scene)
      dm.diffuseColor = col
      dm.emissiveColor = col.scale(0.5)
      dm.specularColor = new Color3(0.6, 0.6, 0.6)
      this.dropMats.push(dm)
    }
    // Respingo: disco com textura de mancha (vermelho escuro).
    this.splatTex = new DynamicTexture("paint-splat", { width: 128, height: 128 }, scene, true)
    {
      const ctx = this.splatTex.getContext() as unknown as CanvasRenderingContext2D
      ctx.clearRect(0, 0, 128, 128)
      ctx.fillStyle = "#fff"
      const blobAt = (x: number, y: number, r: number) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      blobAt(64, 64, 30)
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.3
        const d = 30 + (i % 4) * 7
        blobAt(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 5 + (i % 3) * 3)
        blobAt(64 + Math.cos(a) * d * 0.7, 64 + Math.sin(a) * d * 0.7, 9)
      }
      this.splatTex.hasAlpha = true
      this.splatTex.update(false)
    }
    this.splatMat = new StandardMaterial("paint-splat", scene)
    this.splatMat.diffuseTexture = this.splatTex
    this.splatMat.opacityTexture = this.splatTex
    this.splatMat.diffuseColor = hex(PAINT_COLORS[1])
    this.splatMat.emissiveColor = hex(PAINT_COLORS[1]).scale(0.35)
    this.splatMat.specularColor = new Color3(0.4, 0.4, 0.4)
    this.splatMat.zOffset = -2
    this.splatMat.backFaceCulling = false
    this.splatBase = CreateDisc("paint-splat", { radius: 0.75, tessellation: 12 }, scene)
    this.splatBase.material = this.splatMat
    this.splatBase.isPickable = false
    this.splatBase.setEnabled(false)
    this.splatBase.alwaysSelectAsActiveMesh = true

    this.dropBase = CreateSphere("paint-drop", { diameter: 1, segments: 4 }, scene)
    this.dropBase.setEnabled(false)
    for (let i = 0; i < (lowEnd ? 24 : 48); i++) {
      const m = this.dropBase.clone(`paint-drop-${i}`) as Mesh
      m.isPickable = false
      m.setEnabled(false)
      this.dropMeshes.push(m)
    }
    for (let i = 0; i < 12; i++) {
      const m = this.dropBase.clone(`paint-bolt-${i}`) as Mesh
      m.isPickable = false
      m.setEnabled(false)
      this.boltMeshes.push(m)
    }
  }

  // ── manchas ───────────────────────────────────────────────────────────────

  add(id: number, blob: NewBlob) {
    if (this.byId.has(id)) return
    const c = blob.c
    const live: Live = { id, blob, born: this.clock, dying: 0, squashAt: 0, slot: this.lists[c].length }
    this.lists[c].push(live)
    this.byId.set(id, { c, live })
    this.animating.add(live)
    this.dirty[c] = true
    this.burst({ x: blob.x, y: blob.y1, z: blob.z }, c, 6, 2.5)
  }

  /** A mancha prevista no aparelho virou a confirmada (id e lugar da sala). */
  rename(from: number, to: number, blob: NewBlob) {
    const e = this.byId.get(from)
    if (!e || this.byId.has(to)) return
    this.byId.delete(from)
    e.live.id = to
    e.live.blob = blob
    this.byId.set(to, e)
    this.dirty[e.c] = true
  }

  remove(id: number, instant = false) {
    const e = this.byId.get(id)
    if (!e) return
    if (instant) return this.drop(e.c, e.live)
    if (!e.live.dying) {
      e.live.dying = this.clock
      this.animating.add(e.live)
    }
  }

  has(id: number) {
    return this.byId.has(id)
  }

  /** Alguém quicou nela (cama elástica, mm3d-35e): afunda e balança como gelatina. */
  squash(id: number) {
    const e = this.byId.get(id)
    if (!e) return
    e.live.squashAt = this.clock
    this.animating.add(e.live)
    this.burst({ x: e.live.blob.x, y: e.live.blob.y1, z: e.live.blob.z }, e.c, 5, 2)
  }

  private drop(c: PaintColor, live: Live) {
    const list = this.lists[c]
    const last = list.pop()!
    if (last !== live) {
      list[live.slot] = last
      last.slot = live.slot
    }
    this.byId.delete(live.id)
    this.animating.delete(live)
    this.dirty[c] = true
  }

  private matrixOf(l: Live, out: Float32Array, o: number) {
    const b = l.blob
    const h = b.y1 - b.y0
    let k = Math.min(1, (this.clock - l.born) / GROW)
    k = 1 - (1 - k) * (1 - k) * (1 - k)
    if (l.dying) k *= Math.max(0, 1 - (this.clock - l.dying) / SHRINK)
    // disco arredondado: topo plano na altura da colisão (o pé não afunda)
    const sx = b.r * 1.04 * k
    const sy = (h * 0.5 + 0.025) * Math.max(0.15, k)
    const cy = b.y0 + h * 0.5
    // leve "respiração" ao nascer
    let wob = 1 + Math.sin((this.clock - l.born) * 18) * 0.06 * Math.max(0, 1 - (this.clock - l.born) / 0.6)
    // quique: afunda forte e balança amortecendo (a base fica no lugar)
    let base = 0
    if (l.squashAt) {
      const t = this.clock - l.squashAt
      const amp = Math.exp(-5.5 * t) * Math.cos(t * 19)
      const k2 = 1 + amp * 0.45
      wob *= k2
      base = -(sy - sy / k2)
    }
    Matrix.ComposeToRef(new Vector3(sx * wob, sy / wob, sx * wob), Quaternion.Identity(), new Vector3(b.x, cy + base, b.z), TMP).copyToArray(out, o)
  }

  // ── efeitos ───────────────────────────────────────────────────────────────

  splat(p: Vec3, n: Vec3) {
    const up = new Vector3(n.x, n.y, n.z).normalize()
    const rot = Quaternion.FromUnitVectorsToRef(new Vector3(0, 0, -1), up, new Quaternion())
    const spin = Quaternion.RotationAxis(up, Math.random() * Math.PI * 2)
    const m = Matrix.Compose(Vector3.One().scale(0.8 + Math.random() * 0.6), spin.multiply(rot), new Vector3(p.x + up.x * 0.03, p.y + up.y * 0.03, p.z + up.z * 0.03))
    this.splats.push({ born: this.clock, m })
    if (this.splats.length > 64) this.splats.shift()
    this.splatDirty = true
    this.burst(p, 1, 5, 2)
  }

  /** Gotas que voam de um ponto. */
  burst(p: Vec3, c: PaintColor, n: number, speed: number) {
    for (let i = 0; i < n; i++) {
      if (this.drops.length >= this.dropMeshes.length) this.drops.shift()
      const a = Math.random() * Math.PI * 2
      const up = 0.5 + Math.random()
      this.drops.push({
        p: new Vector3(p.x, p.y + 0.1, p.z),
        v: new Vector3(Math.cos(a) * speed * Math.random(), up * speed, Math.sin(a) * speed * Math.random()),
        life: 0.5 + Math.random() * 0.4,
        c,
        s: 0.08 + Math.random() * 0.1,
      })
    }
  }

  /** Rastro do tiro: bolinha da boca até o alvo (0,12 s). */
  bolt(from: Vec3, to: Vec3, c: PaintColor) {
    if (this.bolts.length >= this.boltMeshes.length) this.bolts.shift()
    this.bolts.push({ from: new Vector3(from.x, from.y, from.z), to: new Vector3(to.x, to.y, to.z), t: 0, c })
  }

  tick(dt: number) {
    this.clock += dt
    // manchas: as que estão crescendo/sumindo pedem a matriz de novo
    for (const l of [...this.animating]) {
      const c = l.blob.c
      if (l.dying && this.clock - l.dying >= SHRINK) {
        this.drop(c, l)
        continue
      }
      this.dirty[c] = true
      if (!l.dying && this.clock - l.born > 0.6 && (!l.squashAt || this.clock - l.squashAt > 1)) this.animating.delete(l)
    }
    for (let c = 0; c < 3; c++) {
      if (!this.dirty[c]) continue
      this.dirty[c] = false
      const list = this.lists[c]
      const buf = new Float32Array(list.length * 16)
      for (let i = 0; i < list.length; i++) this.matrixOf(list[i], buf, i * 16)
      this.bases[c].setEnabled(list.length > 0)
      if (list.length) this.bases[c].thinInstanceSetBuffer("matrix", buf, 16, false)
    }
    // respingos somem em 12 s
    while (this.splats.length && this.clock - this.splats[0].born > 12) {
      this.splats.shift()
      this.splatDirty = true
    }
    if (this.splatDirty) {
      this.splatDirty = false
      const buf = new Float32Array(this.splats.length * 16)
      this.splats.forEach((s, i) => s.m.copyToArray(buf, i * 16))
      this.splatBase.setEnabled(this.splats.length > 0)
      if (this.splats.length) this.splatBase.thinInstanceSetBuffer("matrix", buf, 16, false)
    }
    // gotas
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      d.life -= dt
      if (d.life <= 0) {
        this.drops.splice(i, 1)
        continue
      }
      d.v.y -= 16 * dt
      d.p.addInPlace(d.v.scale(dt))
    }
    this.dropMeshes.forEach((m, i) => {
      const d = this.drops[i]
      if (!d) return m.setEnabled(false)
      m.setEnabled(true)
      m.material = this.dropMats[d.c]
      m.position.copyFrom(d.p)
      m.scaling.setAll(d.s * Math.min(1, d.life * 3))
    })
    // rastros
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].t += dt / 0.12
      if (this.bolts[i].t >= 1) this.bolts.splice(i, 1)
    }
    this.boltMeshes.forEach((m, i) => {
      const b = this.bolts[i]
      if (!b) return m.setEnabled(false)
      m.setEnabled(true)
      m.material = this.dropMats[b.c]
      Vector3.LerpToRef(b.from, b.to, b.t, m.position)
      m.scaling.setAll(0.22)
    })
  }

  /** Quantas manchas vivas (conferência). */
  get count() {
    return this.byId.size
  }

  /** Ids desenhados agora (conferência). */
  ids() {
    return [...this.byId.keys()]
  }

  dispose() {
    for (const b of this.bases) b.dispose()
    for (const m of this.mats) m.dispose()
    for (const m of this.dropMats) m.dispose()
    for (const m of this.dropMeshes) m.dispose()
    for (const m of this.boltMeshes) m.dispose()
    this.dropBase.dispose()
    this.splatBase.dispose()
    this.splatMat.dispose()
    this.splatTex.dispose()
  }
}

const TMP = new Matrix()

/**
 * Disco de bordas arredondadas (raio 1, meia-altura 1): perfil superelíptico
 * girado em volta de Y. Topo e base quase planos, lado bojudo — a "bala de
 * goma" do vídeo, com o topo onde o pé pisa.
 */
function puck(name: string, scene: Scene, tess: number) {
  const shape: Vector3[] = []
  const N = 14
  const e = 2 / 4.5
  for (let i = 0; i <= N; i++) {
    const t = -Math.PI / 2 + (i / N) * Math.PI
    const c = Math.cos(t)
    const s = Math.sin(t)
    shape.push(new Vector3(Math.sign(c) * Math.abs(c) ** e, Math.sign(s) * Math.abs(s) ** e, 0))
  }
  shape[0].x = 0
  shape[N].x = 0
  return CreateLathe(name, { shape, tessellation: tess, sideOrientation: 0 }, scene)
}
