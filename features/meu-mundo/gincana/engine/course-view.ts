// features/meu-mundo/gincana/engine/course-view.ts — GINCANA (mm3d-47): a prova desenhada.
//
// Tudo sai de sim/course.ts (a mesma lista que a física usa). O que não se
// mexe vira POUCAS malhas com cor por vértice (shapes.ts); o que se mexe
// (barras, pêndulos, luvas, ladrilhos, bolas) é atualizado a cada quadro pelo
// TEMPO DA PROVA — nada disso viaja na rede.
//
// Estilo do pedido do Alex: cores vivas, tudo arredondado e inflável — borda
// de boia nos discos, contorno amarelo nas vigas, colunas de bala listradas,
// bolas de praia, arco de balões na largada e na chegada, mar turquesa com
// reflexo e nuvens fofas.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { buildLogos, type LogoView } from "../../corrida/engine/logos"
import {
  BALLS,
  CHECKPOINTS,
  DECK,
  FINISH_Y,
  FINISH_Z,
  GINCANA_COLORS,
  GLOVES,
  PADS,
  PENDULUMS,
  POSTS,
  SWEEPERS,
  TILES,
  TILE_TIME,
  ballsAt,
  gloveAt,
  pendulumAt,
  sweeperAngle,
  type Pad,
} from "../sim/course"
import { SoftGeo, at, hex, mix, stripesY, type RGB } from "./shapes"

const C = GINCANA_COLORS.map(hex)
const WHITE: RGB = [1, 1, 1]
const darker = (c: RGB, k = 0.72): RGB => [c[0] * k, c[1] * k, c[2] * k]
const YELLOW = C[1]
const ORANGE = C[0]
const PINK = C[2]
const TEAL = C[3]
const PURPLE = C[4]
const LIME = C[5]
const BLUE = C[6]

export class CourseView {
  private readonly toy: StandardMaterial
  private readonly meshes: Mesh[] = []
  private readonly sweepNodes: TransformNode[] = []
  private readonly swings: Mesh[] = []
  private readonly gloveMeshes: { glove: Mesh; rod: Mesh }[] = []
  private readonly tiles: InstancedMesh[] = []
  private readonly tileBases: Mesh[] = []
  private readonly ballPool: InstancedMesh[] = []
  private readonly ballBase: Mesh
  private readonly water: Mesh
  private readonly waterTex: DynamicTexture
  private readonly gate: Mesh
  private readonly logos: LogoView
  private readonly clouds: Mesh
  private readonly balls: number[] = []
  private readonly q = new Quaternion()
  private readonly up = new Vector3(0, -1, 0)
  private readonly dir = new Vector3()

  constructor(
    private readonly scene: Scene,
    private readonly seed: number,
    low: boolean,
  ) {
    const toy = new StandardMaterial("gincana-toy", scene)
    toy.diffuseColor = new Color3(1, 1, 1)
    toy.specularColor = new Color3(0.32, 0.32, 0.32)
    toy.specularPower = 42
    toy.emissiveColor = new Color3(0.16, 0.16, 0.16)
    this.toy = toy

    // ── céu (gradiente) e nuvens ──
    const skyG = new SoftGeo()
    const top = hex("#5FD3FF")
    const horizon = hex("#FFD9F2")
    skyG.sphere(1400, at(0, 0, 130), (_x, y) => mix(horizon, top, Math.max(0, Math.min(1, (y + 40) / 520))), 24)
    const sky = skyG.build("gincana-sky", scene, this.unlit("gincana-sky-mat"), true)
    sky.material!.backFaceCulling = false
    sky.infiniteDistance = true
    this.meshes.push(sky)
    const cloudG = new SoftGeo()
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + Math.sin(i * 7.1) * 0.2
      const dist = 190 + ((i * 53) % 110)
      const cx = Math.sin(a) * dist
      const cz = 130 + Math.cos(a) * dist
      const cy = 34 + ((i * 17) % 40)
      const n = 4 + (i % 4)
      for (let k = 0; k < n; k++) {
        const s = 14 + ((k * 13 + i * 5) % 12)
        cloudG.sphere(s, at(cx + (k - n / 2) * 8, cy + Math.sin(k * 2.1 + i) * 3, cz + Math.cos(k * 1.7) * 5), WHITE, 8, 1, 0.62, 1)
      }
    }
    this.clouds = cloudG.build("gincana-clouds", scene, this.unlit("gincana-cloud-mat", 0.94), false)
    this.meshes.push(this.clouds)

    // ── mar: turquesa com reflexos que andam ──
    this.waterTex = new DynamicTexture("gincana-water", { width: 256, height: 256 }, scene, true)
    const g = this.waterTex.getContext() as CanvasRenderingContext2D
    g.fillStyle = "#16C2CF"
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = "rgba(255,255,255,0.55)"
    g.lineWidth = 3
    g.lineCap = "round"
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % 256
      const y = (i * 61) % 256
      g.beginPath()
      g.moveTo(x, y)
      g.bezierCurveTo(x + 14, y - 8, x + 26, y + 8, x + 38, y)
      g.stroke()
    }
    this.waterTex.update(false)
    this.waterTex.wrapU = Texture.WRAP_ADDRESSMODE
    this.waterTex.wrapV = Texture.WRAP_ADDRESSMODE
    this.waterTex.uScale = 70
    this.waterTex.vScale = 70
    const wm = new StandardMaterial("gincana-water-mat", scene)
    wm.diffuseTexture = this.waterTex
    wm.emissiveColor = new Color3(0.25, 0.32, 0.34)
    wm.specularColor = new Color3(0.5, 0.55, 0.6)
    wm.specularPower = 90
    this.water = CreateGround("gincana-sea", { width: 1100, height: 1100, subdivisions: 1 }, scene)
    this.water.position.set(0, 0, 130)
    this.water.material = wm
    this.water.isPickable = false
    this.water.freezeWorldMatrix()

    // ── o que não se mexe ──
    const st = new SoftGeo()
    for (const p of PADS) this.pad(st, p)
    for (const q of POSTS) {
      const col = C[q.c]
      const h = q.y1 - q.y0
      if (q.y0 < DECK - 0.1) {
        // poste da luva: sai da água, azul com anéis
        st.cylinder(q.r * 2, h, at(q.x, q.y0 + h / 2, q.z), stripesY(col, darker(col, 0.8), 0.8, 0), 20)
        st.sphere(q.r * 2.1, at(q.x, q.y1, q.z), col, 12, 1, 0.6, 1)
      } else if (q.r > 0.7) {
        // pilar do carrossel: bala listrada com topo redondo
        st.cylinder(q.r * 2, h, at(q.x, q.y0 + h / 2, q.z), stripesY(YELLOW, ORANGE, 0.45), 24)
        st.sphere(q.r * 2, at(q.x, q.y1, q.z), YELLOW, 14, 1, 0.7, 1)
      } else {
        // frade do campo: pino gordo de topo redondo
        st.capsule(q.r, h + q.r, at(q.x, q.y0 + (h + q.r) / 2 - q.r * 0.5, q.z), stripesY(col, WHITE, 0.32, 0), 12)
      }
    }
    // pórticos dos pêndulos (uma trave por fileira)
    const rows = [...new Set(PENDULUMS.map((p) => p.z))]
    for (const z of rows) {
      const py = PENDULUMS.find((p) => p.z === z)!.py
      for (const x of [-10.5, 10.5]) {
        st.cylinder(0.9, py + 1.5, at(x, (py + 1.5) / 2 - 1, z), stripesY(PURPLE, YELLOW, 1.1, 0), 16)
        st.sphere(1.3, at(x, py + 0.6, z), YELLOW, 12)
      }
      st.capsule(0.42, 22, at(0, py + 0.35, z, 0, 0, Math.PI / 2), PURPLE, 12)
    }
    // arcos de balões: largada (ciano/rosa) e chegada (amarelo/laranja)
    this.balloonArch(st, 8.4, DECK, 7.6, [TEAL, PINK, WHITE])
    this.balloonArch(st, FINISH_Z, FINISH_Y, 7.6, [YELLOW, ORANGE, PINK, WHITE])
    // faixa xadrez da chegada
    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 2; j++) {
        st.roundBox(1.2, 0.06, 0.6, 0.03, at(-8.4 + i * 1.3, FINISH_Y + 0.03, FINISH_Z - 0.3 + j * 0.62), (i + j) % 2 ? WHITE : [0.08, 0.08, 0.1], 4)
      }
    }
    // boias e argolas infláveis no mar (enfeite em volta)
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1
      const z = -10 + i * 11
      const x = side * (17 + ((i * 7) % 11))
      const col = [PINK, YELLOW, LIME, ORANGE, PURPLE][i % 5]
      if (i % 3 === 0) st.torus(3.2, 1.1, at(x, 0.15, z), stripesY(col, WHITE, 0.6, 1.1), 24)
      else st.sphere(1.6, at(x, 0.4, z), stripesY(col, WHITE, 0.5, 1.6), 10)
    }
    // torres de doce ao longe (silhueta divertida no horizonte)
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1
      const z = 20 + i * 28
      const x = side * (48 + ((i * 13) % 22))
      const h = 14 + ((i * 11) % 12)
      const col = [PINK, TEAL, PURPLE, ORANGE, LIME][i % 5]
      st.cylinder(6, h, at(x, h / 2 - 1, z), stripesY(col, WHITE, 2.2, 0.4), 18)
      st.sphere(7.4, at(x, h - 1, z), col, 14, 1, 1.3, 1)
      st.torus(6.8, 1.2, at(x, h * 0.55, z), YELLOW, 24)
    }
    const stat = st.build("gincana-course", scene, toy, true)
    this.meshes.push(stat)

    // portão da largada: cai no "vai"
    const gateG = new SoftGeo()
    gateG.capsule(0.35, 14.4, at(0, DECK + 1.0, 8.2, 0, 0, Math.PI / 2), stripesY(PINK, WHITE, 0.6, 0), 12)
    this.gate = gateG.build("gincana-gate", scene, toy, false)

    // ── barras que giram ──
    for (const s of SWEEPERS) {
      const node = new TransformNode("gincana-sweep", scene)
      node.position.set(s.x, s.y, s.z)
      const bg = new SoftGeo()
      const len = s.both ? s.len * 2 : s.len
      const off = s.both ? 0 : s.len / 2
      bg.capsule(s.r + 0.05, len, at(0, 0, off, 0, Math.PI / 2), stripesY(ORANGE, WHITE, 0.55, 0), 12)
      bg.sphere(1.2, at(0, 0, 0), YELLOW, 12)
      const m = bg.build("gincana-bar", scene, toy, false)
      m.parent = node
      this.sweepNodes.push(node)
      this.meshes.push(m)
    }

    // ── pêndulos: haste e bola de praia, pendurados no pivô ──
    for (const p of PENDULUMS) {
      const pg = new SoftGeo()
      pg.cylinder(0.16, p.len, at(0, -p.len / 2, 0), [0.85, 0.85, 0.9], 8)
      const ballPaint = (x: number, y: number, z: number): RGB => {
        if (Math.abs(y) < p.R * 0.18) return WHITE
        return y > 0 ? YELLOW : Math.atan2(x, z) > 0 ? PURPLE : PINK
      }
      pg.sphere(p.R * 2, at(0, -p.len, 0), ballPaint, 16)
      const m = pg.build("gincana-swing", scene, toy, false)
      m.position.set(p.x, p.py, p.z)
      m.rotationQuaternion = new Quaternion()
      this.swings.push(m)
    }

    // ── luvas: punho vermelho + dedão + punho branco e o braço do pistão ──
    for (const gv of GLOVES) {
      const gg = new SoftGeo()
      const red = hex("#E8232F")
      gg.sphere(gv.R * 2, at(0, 0, 0), red, 16, 1.05, 0.92, 1)
      gg.sphere(gv.R * 0.75, at(-gv.dir * 0.2, gv.R * 0.35, gv.R * 0.72), red, 10, 1, 0.8, 1.2)
      gg.cylinder(gv.R * 1.5, 0.7, at(-gv.dir * gv.R * 0.95, 0, 0, 0, 0, Math.PI / 2), WHITE, 18)
      gg.torus(gv.R * 1.5, 0.22, at(-gv.dir * gv.R * 1.25, 0, 0, 0, 0, Math.PI / 2), YELLOW, 18)
      const glove = gg.build("gincana-glove", scene, toy, false)
      glove.position.set(gv.x0, gv.y, gv.z)
      const rg = new SoftGeo()
      rg.capsule(0.28, 1, at(0, 0, 0, 0, 0, Math.PI / 2), [0.78, 0.8, 0.86], 10)
      const rod = rg.build("gincana-glove-rod", scene, toy, false)
      rod.position.set(gv.x0, gv.y, gv.z)
      this.gloveMeshes.push({ glove, rod })
    }

    // ── xadrez: duas bases (rosa e verde) e uma instância por ladrilho ──
    for (const col of [PINK, LIME]) {
      const tg = new SoftGeo()
      tg.roundBox(TILES[0].h * 2, 0.55, TILES[0].h * 2, 0.2, at(0, -0.275, 0), col, 8)
      tg.roundBox(TILES[0].h * 1.4, 0.06, TILES[0].h * 1.4, 0.03, at(0, 0.005, 0), mix(col, WHITE, 0.35), 4)
      const base = tg.build(`gincana-tile-${col === PINK ? "p" : "g"}`, scene, toy, false)
      base.setEnabled(true)
      base.isVisible = false
      this.tileBases.push(base)
    }
    for (let i = 0; i < TILES.length; i++) {
      const t = TILES[i]
      const inst = this.tileBases[t.c === 2 ? 0 : 1].createInstance(`gincana-tile-${i}`)
      inst.position.set(t.x, DECK, t.z)
      inst.isPickable = false
      this.tiles.push(inst)
    }

    // ── bolas da subida (bolas de praia gigantes) ──
    const bb = new SoftGeo()
    bb.sphere(BALLS.R * 2, at(0, 0, 0), (x, y, z) => {
      const a = Math.atan2(x, y) + Math.PI
      const k = Math.floor(a / (Math.PI / 3)) % 6
      return [PINK, WHITE, TEAL, WHITE, YELLOW, WHITE][k]
    }, 18)
    this.ballBase = bb.build("gincana-ball", scene, toy, false)
    this.ballBase.isVisible = false
    for (let i = 0; i < 16; i++) {
      const b = this.ballBase.createInstance(`gincana-ball-${i}`)
      b.isPickable = false
      b.setEnabled(false)
      this.ballPool.push(b)
    }

    // logo da Freelandoo girando sobre o arco da chegada
    this.logos = buildLogos(scene, [{ id: 1, at: new Vector3(0, FINISH_Y + 9.6, FINISH_Z) }], low, 1.6)
    void CHECKPOINTS
  }

  private unlit(name: string, k = 1) {
    const m = new StandardMaterial(name, this.scene)
    m.disableLighting = true
    m.emissiveColor = new Color3(k, k, k)
    m.diffuseColor = new Color3(0, 0, 0)
    m.specularColor = new Color3(0, 0, 0)
    m.fogEnabled = false
    return m
  }

  /** Plataforma inflável: tampo, borda de boia e corpo; colunas até a água. */
  private pad(g: SoftGeo, p: Pad) {
    const top = C[p.c]
    const rim = C[p.rim]
    const body = darker(top, 0.62)
    if (p.k === 0) {
      g.cylinder(p.r * 2, 0.5, at(p.x, p.y - 0.25, p.z), top, 48)
      // colchão inflável: anel claro e miolo um pouco mais escuro no tampo
      if (p.r > 3) {
        g.torus(p.r * 1.25, 0.16, at(p.x, p.y - 0.06, p.z), mix(top, WHITE, 0.32), 40)
        g.cylinder(p.r * 0.7, 0.04, at(p.x, p.y + 0.0, p.z), mix(top, [0, 0, 0], 0.08), 32)
      }
      g.torus(p.r * 2 + 0.1, 0.62, at(p.x, p.y - 0.12, p.z), rim, 48)
      g.cylinder(p.r * 1.84, p.d - 0.4, at(p.x, p.y - 0.4 - (p.d - 0.4) / 2, p.z), body, 32, p.r * 1.9)
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + p.x
        const rr = p.r * 0.55
        this.leg(g, p.x + Math.sin(a) * rr, p.z + Math.cos(a) * rr, p.y - p.d)
      }
      return
    }
    const rise = p.y2 - p.y
    const len = p.hz * 2
    const pitch = Math.atan2(rise, len)
    const L = Math.hypot(len, rise)
    const yc = (p.y + p.y2) / 2
    const r = Math.min(0.24, p.hx * 0.45)
    // tampo, contorno (borda um pouco abaixo e mais larga) e corpo
    const m = (dy: number) => at(p.x, yc + dy, p.z, p.rot, -pitch)
    g.roundBox(p.hx * 2, 0.5, L, r, m(-0.25), top, 12)
    // friso claro no meio do tampo (vigas e pisos parecem infláveis costurados)
    if (L > 3) g.roundBox(Math.max(0.3, p.hx * 0.5), 0.06, L - 1.2, 0.03, m(-0.015), mix(top, WHITE, 0.28), 4)
    g.roundBox(p.hx * 2 + 0.34, 0.5, L + 0.34, r + 0.12, m(-0.33), rim, 10)
    g.roundBox(Math.max(0.6, p.hx * 2 - 0.3), p.d - 0.3, Math.max(0.6, L - 0.3), Math.min(0.3, p.hx * 0.4), m(-0.4 - (p.d - 0.3) / 2), body, 8)
    // colunas: uma a cada ~8 m no comprimento
    const n = Math.max(1, Math.round(len / 8))
    const c = Math.cos(p.rot)
    const s = Math.sin(p.rot)
    for (let k = 0; k < n; k++) {
      const lz = -p.hz + ((k + 0.5) / n) * len
      const wx = p.x + lz * s
      const wz = p.z + lz * c
      const yTop = p.y + (rise * (lz + p.hz)) / len - p.d
      this.leg(g, wx, wz, yTop)
    }
  }

  /** Coluna redonda da plataforma até o fundo do mar. */
  private leg(g: SoftGeo, x: number, z: number, yTop: number) {
    const h = yTop + 1.2
    if (h <= 0.2) return
    g.cylinder(0.7, h, at(x, yTop - h / 2, z), stripesY(BLUE, WHITE, 0.9, 0), 14)
  }

  /** Arco de balões em z, de um lado ao outro (raio r), sobre o tampo y. */
  private balloonArch(g: SoftGeo, z: number, y: number, r: number, cols: RGB[]) {
    const n = Math.round(r * 3.4)
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI
      const x = Math.cos(a) * r
      const yy = y + Math.sin(a) * r * 1.05
      g.sphere(1.05, at(x, yy, z - 0.25), cols[i % cols.length], 10, 1, 1.15, 1)
      g.sphere(1.05, at(x, yy + 0.1, z + 0.35), cols[(i + 1) % cols.length], 10, 1, 1.15, 1)
    }
  }

  /** Um quadro: tudo o que se mexe no tempo da prova `t`; `tiles` = quando cada ladrilho foi pisado. */
  update(t: number, clock: number, tiles: Float64Array) {
    const tt = Math.max(0, t)
    this.gate.setEnabled(t < 0)
    for (let i = 0; i < SWEEPERS.length; i++) this.sweepNodes[i].rotation.y = sweeperAngle(SWEEPERS[i], tt)
    for (let i = 0; i < PENDULUMS.length; i++) {
      const p = PENDULUMS[i]
      const q = pendulumAt(p, tt)
      this.dir.set(q.x - p.x, q.y - p.py, 0).normalize()
      Quaternion.FromUnitVectorsToRef(this.up, this.dir, this.q)
      this.swings[i].rotationQuaternion!.copyFrom(this.q)
    }
    for (let i = 0; i < GLOVES.length; i++) {
      const gv = GLOVES[i]
      const q = gloveAt(gv, tt)
      const { glove, rod } = this.gloveMeshes[i]
      glove.position.x = q.x
      const len = Math.max(0.05, Math.abs(q.x - gv.x0))
      rod.position.x = (q.x + gv.x0) / 2
      rod.scaling.x = len
      rod.setEnabled(len > 0.3)
    }
    for (let i = 0; i < TILES.length; i++) {
      const s = tiles[i]
      const inst = this.tiles[i]
      const base = TILES[i]
      if (s < 0 || t < s) {
        inst.setEnabled(true)
        inst.position.set(base.x, DECK, base.z)
        inst.scaling.setAll(1)
        continue
      }
      const age = t - s
      if (age < TILE_TIME.warn) {
        // treme e afunda um pouquinho: vai cair
        const j = 0.05 * (age / TILE_TIME.warn)
        inst.setEnabled(true)
        inst.position.set(base.x + Math.sin(clock * 61 + i) * j, DECK - age * 0.08, base.z + Math.cos(clock * 53 + i) * j)
      } else if (age < TILE_TIME.warn + 0.8) {
        const k = age - TILE_TIME.warn
        inst.setEnabled(true)
        inst.position.set(base.x, DECK - 0.06 - 9 * k * k, base.z)
      } else if (age < TILE_TIME.warn + TILE_TIME.gone - 0.35) inst.setEnabled(false)
      else if (age < TILE_TIME.warn + TILE_TIME.gone) {
        // volta subindo e "estufando"
        const k = (age - (TILE_TIME.warn + TILE_TIME.gone - 0.35)) / 0.35
        inst.setEnabled(true)
        inst.position.set(base.x, DECK - (1 - k) * 1.2, base.z)
        inst.scaling.set(0.7 + 0.3 * k, 1, 0.7 + 0.3 * k)
      } else {
        inst.setEnabled(true)
        inst.position.set(base.x, DECK, base.z)
        inst.scaling.setAll(1)
      }
    }
    ballsAt(this.seed, t, this.balls)
    let used = 0
    for (let k = 0; k < this.balls.length && used < this.ballPool.length; k += 5) {
      const b = this.ballPool[used++]
      b.setEnabled(true)
      b.position.set(this.balls[k], this.balls[k + 1], this.balls[k + 2])
      b.rotation.x = -this.balls[k + 2] / BALLS.R
    }
    for (let i = used; i < this.ballPool.length; i++) this.ballPool[i].setEnabled(false)
    this.waterTex.uOffset = (clock * 0.012) % 1
    this.waterTex.vOffset = (clock * 0.02) % 1
    this.clouds.position.x = Math.sin(clock * 0.01) * 12
    this.logos.tick(clock)
  }

  dispose() {
    this.logos.dispose()
    for (const m of this.meshes) m.dispose(false, true)
    for (const n of this.sweepNodes) n.dispose()
    for (const m of this.swings) m.dispose()
    for (const g of this.gloveMeshes) {
      g.glove.dispose()
      g.rod.dispose()
    }
    for (const t of this.tiles) t.dispose()
    for (const b of this.tileBases) b.dispose()
    for (const b of this.ballPool) b.dispose()
    this.ballBase.dispose()
    this.gate.dispose()
    this.water.material?.dispose()
    this.waterTex.dispose()
    this.water.dispose()
    this.toy.dispose()
  }
}
