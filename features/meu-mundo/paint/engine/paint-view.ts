// features/meu-mundo/paint/engine/paint-view.ts — PAINT (mm3d-35): a tinta desenhada.
//
// Mancha = cilindro da regra (ponte achatada, degrau alto), desenhada como
// uma bolha brilhante (esfera achatada) que CRESCE ao nascer e encolhe ao
// sumir. Uma malha base por cor com instâncias finas: centenas de manchas em
// 3 chamadas de desenho. Mais: respingo no chão (vermelho), gotas que voam no
// impacto e o rastro do tiro (bolinha da boca da arma até o alvo).
//
// mm3d-46: o MURO sobe do chão ao nascer. O dano virou preto: o respingo do
// tiro é preto e o sangue tem respingo e gotas próprios, vermelhos.
// mm3d-62 (pedido do Alex): o muro deixou de ser holograma — é uma placa de
// GELATINA turquesa, o mesmo material da cama elástica, que treme ao nascer e
// balança quando alguém bate nela (e é empurrado para trás).

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import { PAINT, PAINT_COLORS, TUNING, type PaintColor } from "../sim/tuning"
import type { Vec3 } from "../sim/map"
import type { NewBlob } from "../sim/paint"

const GROW = 0.22
const SHRINK = 0.35
/** Muro sobe do chão mais devagar que a mancha cresce. */
const WALL_GROW = 0.32
/** Cor das gotas/respingo de sangue (o índice depois das tintas). */
const BLOOD = 4
const BLOOD_HEX = "#B3121F"

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
  private readonly lists: Live[][] = [[], [], [], []]
  private readonly byId = new Map<number, { c: PaintColor; live: Live }>()
  private readonly animating = new Set<Live>()
  /** Respingo: 0 = tinta preta, 1 = sangue. */
  private readonly splatBases: Mesh[] = []
  private readonly splatMats: StandardMaterial[] = []
  private readonly splatTex: DynamicTexture
  private readonly splats: { born: number; m: Matrix }[][] = [[], []]
  private readonly dropBase: Mesh
  private readonly dropMats: StandardMaterial[] = []
  private readonly drops: { p: Vector3; v: Vector3; life: number; c: number; s: number }[] = []
  private readonly dropMeshes: Mesh[] = []
  private readonly bolts: { from: Vector3; to: Vector3; t: number; c: PaintColor }[] = []
  private readonly boltMeshes: Mesh[] = []
  private clock = 0
  private dirty = [false, false, false, false]
  private splatDirty = [false, false]

  constructor(scene: Scene, lowEnd: boolean) {
    for (let c = 0; c < 4; c++) {
      const mat = new StandardMaterial(`paint-blob-${c}`, scene)
      const col = hex(PAINT_COLORS[c])
      if (c === PAINT.WALL) {
        // mm3d-62: gelatina turquesa, o MESMO material da cama elástica
        // (pedido do Alex: "igualzinha à vermelha de pular, mas turquesa"),
        // um pouco mais acesa para ler de longe
        mat.diffuseColor = col.scale(0.7)
        mat.emissiveColor = col.scale(0.16)
        mat.specularColor = new Color3(1, 1, 1)
        mat.specularPower = 40
      } else if (c === PAINT.HARM) {
        // preto envernizado: o brilho é o que mostra a forma
        mat.diffuseColor = col
        mat.emissiveColor = new Color3(0.03, 0.025, 0.035)
        mat.specularColor = new Color3(1, 1, 1)
        mat.specularPower = 48
      } else {
        mat.diffuseColor = col.scale(0.66)
        mat.emissiveColor = col.scale(0.1)
        mat.specularColor = new Color3(0.9, 0.9, 0.9)
        mat.specularPower = 36
      }
      this.mats.push(mat)
      // mm3d-62c: ponte, cama elástica e muro = a mesma placa quadrada de gelatina
      const base = jellySlab(`paint-blob-base-${c}`, scene, lowEnd ? 10 : 16)
      base.material = mat
      base.isPickable = false
      // Sem instância o Babylon desenharia a própria malha-base: desligada até a 1ª mancha.
      base.setEnabled(false)
      base.alwaysSelectAsActiveMesh = true
      this.bases.push(base)
      this.dropMats.push(dropMat(`paint-drop-${c}`, scene, col))
    }
    this.dropMats.push(dropMat("paint-drop-blood", scene, hex(BLOOD_HEX)))
    // Respingo: disco com textura de mancha (tinta preta e sangue).
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
    for (const [k, hx] of [PAINT_COLORS[PAINT.HARM], BLOOD_HEX].entries()) {
      const mat = new StandardMaterial(`paint-splat-${k}`, scene)
      mat.diffuseTexture = this.splatTex
      mat.opacityTexture = this.splatTex
      mat.diffuseColor = hex(hx)
      mat.emissiveColor = hex(hx).scale(0.35)
      mat.specularColor = new Color3(0.4, 0.4, 0.4)
      mat.zOffset = -2
      mat.backFaceCulling = false
      const base = CreateDisc(`paint-splat-${k}`, { radius: 0.75, tessellation: 12 }, scene)
      base.material = mat
      base.isPickable = false
      base.setEnabled(false)
      base.alwaysSelectAsActiveMesh = true
      this.splatMats.push(mat)
      this.splatBases.push(base)
    }

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
    const wall = b.c === PAINT.WALL
    // mm3d-62c: tudo placa quadrada de gelatina (cantos arredondados), girada
    // para a mira; nasce estufando a partir do centro e encolhe ao sumir
    const t = Math.min(1, (this.clock - l.born) / (wall ? WALL_GROW : GROW))
    let k = t < 1 ? 1 - (1 - t) ** 3 + Math.sin(t * Math.PI) * 0.1 : 1
    if (l.dying) k *= Math.max(0, 1 - (this.clock - l.dying) / SHRINK)
    k = Math.max(0.02, k)
    // treme ao nascer; quicou/bateu: afunda e balança amortecendo
    let wob = 1 + Math.sin((this.clock - l.born) * 18) * 0.06 * Math.max(0, 1 - (this.clock - l.born) / 0.6)
    if (l.squashAt) {
      const st = this.clock - l.squashAt
      wob *= 1 + Math.exp(-5.5 * st) * Math.cos(st * 19) * (wall ? 0.35 : 0.45)
    }
    Quaternion.RotationYawPitchRollToRef(b.a ?? 0, 0, 0, TMPQ)
    if (wall) {
      // em pé, no ar onde a mira apontou: engorda quando encolhe na altura
      TMPV.set(b.r * 2 * k * wob, h * k / Math.sqrt(wob), TUNING.wallT * k * wob * wob)
      TMPP.set(b.x, (b.y0 + b.y1) / 2, b.z)
    } else {
      // deitada: a base fica no lugar e o topo na altura da colisão (o pé não afunda)
      const side = b.r * 2 * k * wob
      const hs = Math.max(0.03, (h + 0.02) * Math.max(0.2, k) / wob)
      TMPV.set(side, hs, side)
      TMPP.set(b.x, b.y0 + hs / 2, b.z)
    }
    Matrix.ComposeToRef(TMPV, TMPQ, TMPP, TMP).copyToArray(out, o)
  }

  // ── efeitos ───────────────────────────────────────────────────────────────

  /** Respingo no ponto: tinta preta, ou sangue (`blood`). */
  splat(p: Vec3, n: Vec3, blood = false) {
    const kind = blood ? 1 : 0
    const up = new Vector3(n.x, n.y, n.z).normalize()
    const rot = Quaternion.FromUnitVectorsToRef(new Vector3(0, 0, -1), up, new Quaternion())
    const spin = Quaternion.RotationAxis(up, Math.random() * Math.PI * 2)
    const m = Matrix.Compose(Vector3.One().scale(0.8 + Math.random() * 0.6), spin.multiply(rot), new Vector3(p.x + up.x * 0.03, p.y + up.y * 0.03, p.z + up.z * 0.03))
    const list = this.splats[kind]
    list.push({ born: this.clock, m })
    if (list.length > 64) list.shift()
    this.splatDirty[kind] = true
    this.burst(p, blood ? BLOOD : PAINT.HARM, 5, 2)
  }

  /**
   * Sangue (mm3d-35g): o vermelho acertou alguém — gotas voando do peito e uma
   * mancha no chão embaixo dele. `big` = nocaute.
   */
  blood(chest: Vec3, groundY: number, big: boolean) {
    this.burst(chest, BLOOD, big ? 22 : 12, big ? 4.2 : 3.2)
    if (Number.isFinite(groundY)) this.splat({ x: chest.x + (Math.random() - 0.5) * 0.4, y: groundY + 0.02, z: chest.z + (Math.random() - 0.5) * 0.4 }, { x: 0, y: 1, z: 0 }, true)
  }

  /** Gotas que voam de um ponto (`c` = cor da tinta, ou BLOOD). */
  burst(p: Vec3, c: number, n: number, speed: number) {
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

  /** O que a GlowLayer da cena acende (mm3d-62: nada — o muro virou gelatina). */
  get glowMeshes(): Mesh[] {
    return []
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
    for (let c = 0; c < 4; c++) {
      if (!this.dirty[c]) continue
      this.dirty[c] = false
      const list = this.lists[c]
      const buf = new Float32Array(list.length * 16)
      for (let i = 0; i < list.length; i++) this.matrixOf(list[i], buf, i * 16)
      this.bases[c].setEnabled(list.length > 0)
      if (list.length) this.bases[c].thinInstanceSetBuffer("matrix", buf, 16, false)
    }
    // respingos somem em 12 s
    for (let k = 0; k < 2; k++) {
      const list = this.splats[k]
      while (list.length && this.clock - list[0].born > 12) {
        list.shift()
        this.splatDirty[k] = true
      }
      if (!this.splatDirty[k]) continue
      this.splatDirty[k] = false
      const buf = new Float32Array(list.length * 16)
      list.forEach((s, i) => s.m.copyToArray(buf, i * 16))
      this.splatBases[k].setEnabled(list.length > 0)
      if (list.length) this.splatBases[k].thinInstanceSetBuffer("matrix", buf, 16, false)
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
    for (const b of this.splatBases) b.dispose()
    for (const m of this.splatMats) m.dispose()
    this.splatTex.dispose()
  }
}

const TMP = new Matrix()
const TMPQ = new Quaternion()
const TMPV = new Vector3()
const TMPP = new Vector3()

function dropMat(name: string, scene: Scene, col: Color3) {
  const dm = new StandardMaterial(name, scene)
  dm.diffuseColor = col
  dm.emissiveColor = col.scale(0.5)
  dm.specularColor = new Color3(0.6, 0.6, 0.6)
  return dm
}

/**
 * Placa de gelatina (mm3d-62): caixa de 1 × 1 × 1 com cantos bem arredondados
 * (superelipsoide); a instância estica para o tamanho do muro. Mesma "bala de
 * goma" da cama elástica, em pé.
 */
function jellySlab(name: string, scene: Scene, seg: number) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const e = 0.28 // perto de 0 = caixa; 1 = esfera
  const sp = (v: number) => Math.sign(v) * Math.abs(v) ** e
  for (let i = 0; i <= seg; i++) {
    const th = -Math.PI / 2 + (i / seg) * Math.PI
    for (let j = 0; j <= seg * 2; j++) {
      const ph = -Math.PI + (j / (seg * 2)) * Math.PI * 2
      const ct = Math.cos(th)
      pos.push(0.5 * sp(ct) * sp(Math.cos(ph)), 0.5 * sp(Math.sin(th)), 0.5 * sp(ct) * sp(Math.sin(ph)))
      uv.push(j / (seg * 2), i / seg)
    }
  }
  const row = seg * 2 + 1
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < seg * 2; j++) {
      const a = i * row + j
      const b = a + row
      idx.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  const nrm: number[] = []
  VertexData.ComputeNormals(pos, idx, nrm)
  const mesh = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = pos
  vd.normals = nrm
  vd.uvs = uv
  vd.indices = idx
  vd.applyToMesh(mesh, false)
  return mesh
}
