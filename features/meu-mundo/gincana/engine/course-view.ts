// features/meu-mundo/gincana/engine/course-view.ts — GINCANA (mm3d-47): a prova desenhada.
//
// Tudo sai do percurso da fase (sim/courses.ts — a mesma lista que a física
// usa). O que não se mexe vira POUCAS malhas com cor por vértice (shapes.ts);
// o que se mexe (barras, pêndulos, luvas, ladrilhos, bolas, plataformas que
// andam, discos que giram, blocos, portas, esteiras) é atualizado a cada
// quadro pelo TEMPO DA PROVA — nada disso viaja na rede.
//
// mm3d-55 — steampunk; 2026-11-05 — estética da cidade (tampos no calçamento,
// céu e luz pelo relógio de Brasília, a cidade em volta: city-view.ts).
//
// Gincana 2.0 (2026-11-16): uma fase por Domínio. A paleta, o "mar" (água,
// pântano, abismo, vazio, lava, óleo, água gelada), o céu e o cenário em volta
// vêm do tema (phase-themes.ts + backdrops.ts). A fase "cidade" continua com a
// mesma cara de antes (cidade, faróis, boias, dirigíveis).

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
import { DECK, ballsAt, gloveAt, padRot, padShift, pendulumAt, pusherAt, sweeperAngle, type Course, type Pad } from "../sim/course"
import type { RunWorld } from "../sim/body"
import { SoftGeo, at, mix, stripesY, type RGB } from "./shapes"
import { AirshipFleet, SP, SteamStage, fleetRing, gearArch, place, tierOf } from "../../engine/steampunk/scenery"
import { postLantern, steamLamp } from "../../engine/steampunk/kit"
import { Sky, applyLights, brasiliaHour, nightFactor } from "../../engine/steampunk/atmosphere"
import { CITY } from "../../paint/engine/world-view"
import { buildCity, type GincanaCity } from "./city-view"
import { buildAurora, buildBackdrop } from "./backdrops"
import type { GincanaTheme } from "./phase-themes"

const IRON: RGB = [0.2, 0.2, 0.22]
const darker = (c: RGB, k = 0.72): RGB => [c[0] * k, c[1] * k, c[2] * k]

export class CourseView {
  private readonly toy: StandardMaterial
  private readonly glowMat: StandardMaterial
  private readonly meshes: Mesh[] = []
  private readonly sweepNodes: TransformNode[] = []
  private readonly swings: Mesh[] = []
  private readonly gloveMeshes: { glove: Mesh; rod: Mesh }[] = []
  private readonly tiles: InstancedMesh[] = []
  private readonly tileBases: Mesh[] = []
  private readonly ballPool: InstancedMesh[] = []
  private readonly ballBase: Mesh | null = null
  private readonly movers: { mesh: Mesh; p: Pad }[] = []
  private readonly pusherMeshes: Mesh[] = []
  private readonly doorMeshes: InstancedMesh[] = []
  private doorBase: Mesh | null = null
  private readonly doorShake: number[] = []
  private readonly belts: { tex: DynamicTexture; mat: StandardMaterial; mesh: Mesh; speed: number }[] = []
  private readonly bounceCaps: { mesh: Mesh; x: number; z: number }[] = []
  private readonly water: Mesh
  private readonly waterTex: DynamicTexture
  private readonly gate: Mesh
  private readonly logos: LogoView
  private readonly clouds: Mesh | null = null
  private readonly cloudMat: StandardMaterial
  private readonly waterMat: StandardMaterial
  private readonly aurora: Mesh | null = null
  private readonly auroraMat: StandardMaterial | null = null
  private readonly stage: SteamStage
  private readonly city: GincanaCity | null = null
  private readonly sky: Sky
  private readonly timer: ReturnType<typeof setInterval>
  private night = -1
  private forcedHour: number | null = null
  private readonly devHour = (h: number | null) => {
    this.forcedHour = h
    this.night = -1
    this.applyTime()
  }
  private readonly fleet: AirshipFleet | null = null
  private readonly balls: number[] = []
  private readonly q = new Quaternion()
  private readonly up = new Vector3(0, -1, 0)
  private readonly dir = new Vector3()
  private readonly C: readonly RGB[]
  private readonly lava: boolean

  constructor(
    private readonly scene: Scene,
    private readonly seed: number,
    low: boolean,
    private readonly course: Course,
    private readonly theme: GincanaTheme,
  ) {
    const C = theme.palette
    this.C = C
    const WHITE = C[7]
    const YELLOW = C[1]
    const ORANGE = C[0]
    const PINK = C[2]
    const city = theme.deco === "city"
    this.lava = theme.fluid.kind === "lava"
    const toy = new StandardMaterial("gincana-toy", scene)
    toy.diffuseColor = new Color3(1, 1, 1)
    toy.specularColor = new Color3(0.32, 0.32, 0.32)
    toy.specularPower = 42
    this.toy = toy
    this.glowMat = this.unlit("gincana-glow", 1)
    this.stage = new SteamStage(scene, tierOf(low), { wall: city })

    // ── céu e nuvens (não há nuvens no espaço nem na floresta à noite) ──
    this.sky = new Sky(scene, 900)
    this.cloudMat = this.unlit("gincana-cloud-mat", 0.94)
    if (theme.deco === "city" || theme.deco === "canyon" || theme.deco === "factory" || theme.deco === "ice") {
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
      this.clouds = cloudG.build("gincana-clouds", scene, this.cloudMat, false)
      this.meshes.push(this.clouds)
    }

    // ── o que fica embaixo: água, pântano, abismo, vazio, lava, óleo, água gelada ──
    this.waterTex = this.fluidTexture()
    const wm = new StandardMaterial("gincana-water-mat", scene)
    wm.diffuseTexture = this.waterTex
    this.waterMat = wm
    wm.specularColor = theme.fluid.kind === "water" || theme.fluid.kind === "ice" || theme.fluid.kind === "oil" ? new Color3(0.5, 0.55, 0.6) : new Color3(0, 0, 0)
    wm.specularPower = 90
    if (theme.fluid.glow > 0) wm.emissiveTexture = this.waterTex
    this.water = CreateGround("gincana-sea", { width: 1100, height: 1100, subdivisions: 1 }, scene)
    this.water.position.set(0, theme.fluid.kind === "void" ? -6 : 0, 130)
    this.water.material = wm
    this.water.isPickable = false
    this.water.freezeWorldMatrix()

    // ── o que não se mexe ──
    const st = new SoftGeo()
    const glow = new SoftGeo()
    for (const p of course.pads) if (p.mw === 0 && p.spin === 0) this.pad(st, glow, p, false)
    for (const q of course.posts) {
      const col = C[q.c]
      const h = q.y1 - q.y0
      if (q.b > 0) {
        // cogumelo que lança: talo claro, chapéu aceso com pintas (o chapéu pulsa: malha à parte)
        st.cylinder(q.r * 0.9, h, at(q.x, q.y0 + h / 2, q.z), [0.86, 0.84, 0.74], 12, q.r * 0.7)
        const cap = new SoftGeo()
        cap.sphere(q.r * 2.25, at(0, 0, 0), col, 14, 1, 0.42, 1)
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2
          cap.sphere(q.r * 0.38, at(Math.cos(a) * q.r * 0.6, q.r * 0.36, Math.sin(a) * q.r * 0.6), mix(col, [1, 1, 1], 0.7), 6, 1, 0.5, 1)
        }
        const m = cap.build("gincana-shroom", scene, this.glowMat, false)
        m.position.set(q.x, q.y1 - 0.12, q.z)
        this.bounceCaps.push({ mesh: m, x: q.x, z: q.z })
        this.meshes.push(m)
      } else if (q.y0 < DECK - 0.1) {
        // poste da luva: sai da água, com anéis
        st.cylinder(q.r * 2, h, at(q.x, q.y0 + h / 2, q.z), stripesY(col, darker(col, 0.8), 0.8, 0), 20)
        st.sphere(q.r * 2.1, at(q.x, q.y1, q.z), col, 12, 1, 0.6, 1)
      } else if (q.r > 0.7) {
        // pilar do carrossel: bala listrada com topo redondo
        st.cylinder(q.r * 2, h, at(q.x, q.y0 + h / 2, q.z), stripesY(YELLOW, ORANGE, 0.45), 24)
        st.sphere(q.r * 2, at(q.x, q.y1, q.z), YELLOW, 14, 1, 0.7, 1)
      } else {
        // frade, caixa ou cristal
        st.capsule(q.r, h + q.r, at(q.x, q.y0 + (h + q.r) / 2 - q.r * 0.5, q.z), stripesY(col, WHITE, 0.32, 0), 12)
      }
    }
    // pórticos dos pêndulos (uma trave por fileira, larga o bastante para todos daquela fileira)
    const rows = [...new Set(course.pendulums.map((p) => p.z))]
    for (const z of rows) {
      const row = course.pendulums.filter((p) => p.z === z)
      const py = row[0].py
      const x0 = Math.min(...row.map((p) => p.x)) - 5.5
      const x1 = Math.max(...row.map((p) => p.x)) + 5.5
      for (const x of [x0, x1]) {
        st.cylinder(0.9, py + 1.5, at(x, (py + 1.5) / 2 - 1, z), stripesY(IRON, YELLOW, 1.1, 0), 16)
        st.sphere(1.3, at(x, py + 0.6, z), YELLOW, 12)
      }
      st.capsule(0.42, x1 - x0 + 1, at((x0 + x1) / 2, py + 0.35, z, 0, 0, Math.PI / 2), IRON, 12)
      for (let x = x0 + 1.1; x < x1; x += 2.2) st.torus(1.0, 0.16, at(x, py + 0.35, z, 0, 0, Math.PI / 2), YELLOW, 16)
    }
    // pórticos da largada e da chegada (engrenagem na cidade, na forja e na fábrica; arco aceso nos outros)
    this.arch(st, glow, 8.4, DECK)
    this.arch(st, glow, course.finishZ, course.finishY)
    if (city) {
      // rebites de latão na borda de cada disco
      for (const p of course.pads) {
        if (p.k !== 0) continue
        const n = Math.max(10, Math.round(p.r * 5))
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2
          this.stage.ctx.props.with("flat", () =>
            this.stage.ctx.props.sphere(0.18, [1, 0.6, 1], place(p.x + Math.cos(a) * (p.r + 0.06), p.y + 0.18, p.z + Math.sin(a) * (p.r + 0.06)), SP.brassDark, 4),
          )
        }
      }
    }
    // faixa xadrez da chegada
    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 2; j++) {
        st.roundBox(1.2, 0.06, 0.6, 0.03, at(-8.4 + i * 1.3, course.finishY + 0.03, course.finishZ - 0.3 + j * 0.62), (i + j) % 2 ? WHITE : [0.08, 0.08, 0.1], 4)
      }
    }
    // marcos das portas: pilares entre elas (só desenho; a fileira inteira é a regra)
    const doorRows = [...new Set(course.doors.map((d) => d.row))]
    for (const row of doorRows) {
      const ds = course.doors.filter((d) => d.row === row)
      const xs = ds.map((d) => d.x - d.hw).concat([ds[ds.length - 1].x + ds[ds.length - 1].hw])
      const h = ds[0].h
      for (const x of xs) st.roundBox(0.5, h + 0.6, 0.8, 0.12, at(x, DECK + (h + 0.6) / 2, ds[0].z), C[4], 4)
      st.roundBox(xs[xs.length - 1] - xs[0] + 0.6, 0.6, 0.9, 0.15, at((xs[0] + xs[xs.length - 1]) / 2, DECK + h + 0.6, ds[0].z), C[1], 4)
    }
    if (city) this.cityExtras(st)
    else buildBackdrop(theme.deco, st, glow, this.stage.ctx, low)
    const stat = st.build("gincana-course", scene, toy, true)
    this.meshes.push(stat)
    if (glow.vertexCount) {
      const g = glow.build("gincana-glow-static", scene, this.glowMat, true)
      this.meshes.push(g)
    }
    if (city) this.city = buildCity(scene, this.stage.ctx, low)
    this.stage.build("gincana-steam")
    if (city && !low) this.fleet = new AirshipFleet(scene, this.stage.mats, fleetRing(6, 150, 240, 40, 80, 34, 47), 0, 130)
    if (theme.deco === "ice") {
      const ag = new SoftGeo()
      buildAurora(ag)
      const am = this.unlit("gincana-aurora-mat", 1)
      am.alpha = 0.32
      am.alphaMode = 1
      am.backFaceCulling = false
      this.auroraMat = am
      this.aurora = ag.build("gincana-aurora", scene, am, true)
      this.meshes.push(this.aurora)
    }

    // portão da largada: cai no "vai"
    const gateG = new SoftGeo()
    gateG.capsule(0.35, 14.4, at(0, DECK + 1.0, 8.2, 0, 0, Math.PI / 2), stripesY(PINK, WHITE, 0.6, 0), 12)
    this.gate = gateG.build("gincana-gate", scene, toy, false)

    // ── barras que giram ──
    for (const s of course.sweepers) {
      const node = new TransformNode("gincana-sweep", scene)
      node.position.set(s.x, s.y, s.z)
      const bg = new SoftGeo()
      const len = s.both ? s.len * 2 : s.len
      const off = s.both ? 0 : s.len / 2
      bg.capsule(s.r + 0.05, len, at(0, 0, off, 0, Math.PI / 2), stripesY(ORANGE, WHITE, 0.55, 0), 12)
      bg.sphere(1.2, at(0, 0, 0), YELLOW, 12)
      const m = bg.build("gincana-bar", scene, theme.deco === "orbital" ? this.glowMat : toy, false)
      m.parent = node
      this.sweepNodes.push(node)
      this.meshes.push(m)
    }

    // ── pêndulos: haste e a bola/martelo/estalactite do tema ──
    for (const p of course.pendulums) {
      const pg = new SoftGeo()
      pg.cylinder(0.16, p.len, at(0, -p.len / 2, 0), IRON, 8)
      pg.cylinder(0.5, 0.3, at(0, -p.len + p.R * 1.02, 0), YELLOW, 12)
      if (theme.deco === "forge") {
        // martelo: cabeça de ferro com faixa de brasa
        pg.roundBox(p.R * 2.6, p.R * 1.6, p.R * 1.6, 0.2, at(0, -p.len, 0), (x) => (Math.abs(x) > p.R * 1.05 ? [0.75, 0.3, 0.08] : SP.iron), 6)
      } else if (theme.deco === "ice") {
        pg.cylinder(p.R * 2, p.R * 2.4, at(0, -p.len, 0), (_x, y) => (y < 0 ? [0.85, 0.95, 1] : [0.6, 0.8, 0.95]), 7, p.R * 0.3)
      } else if (theme.deco === "canyon") {
        pg.sphere(p.R * 2, at(0, -p.len, 0), (x, y) => mix(C[0], C[2], (Math.sin(x * 3) + Math.cos(y * 4)) * 0.25 + 0.5), 8, 1.1, 0.9, 1)
      } else {
        const ballPaint = (_x: number, y: number): RGB => (Math.abs(y) < p.R * 0.16 ? SP.brass : y > 0 ? SP.steel : SP.copper)
        pg.sphere(p.R * 2, at(0, -p.len, 0), ballPaint, 16)
      }
      const m = pg.build("gincana-swing", scene, toy, false)
      m.position.set(p.x, p.py, p.z)
      m.rotationQuaternion = new Quaternion()
      this.swings.push(m)
    }

    // ── luvas/pistões: punho + punho de ferro e o braço ──
    for (const gv of course.gloves) {
      const gg = new SoftGeo()
      if (theme.deco === "city") {
        gg.sphere(gv.R * 2, at(0, 0, 0), PINK, 16, 1.05, 0.92, 1)
        gg.sphere(gv.R * 0.75, at(-gv.dir * 0.2, gv.R * 0.35, gv.R * 0.72), PINK, 10, 1, 0.8, 1.2)
      } else {
        // pistão: cabeça chata do tema
        gg.cylinder(gv.R * 2, gv.R * 1.2, at(0, 0, 0, 0, 0, Math.PI / 2), stripesY(C[2], darker(C[2], 0.6), 0.3, 0), 18)
      }
      gg.cylinder(gv.R * 1.5, 0.7, at(-gv.dir * gv.R * 0.95, 0, 0, 0, 0, Math.PI / 2), SP.iron, 18)
      gg.torus(gv.R * 1.5, 0.22, at(-gv.dir * gv.R * 1.25, 0, 0, 0, 0, Math.PI / 2), YELLOW, 18)
      const g = gg.build("gincana-glove", scene, toy, false)
      g.position.set(gv.x0, gv.y, gv.z)
      const rg = new SoftGeo()
      rg.capsule(0.28, 1, at(0, 0, 0, 0, 0, Math.PI / 2), YELLOW, 10)
      const rod = rg.build("gincana-glove-rod", scene, toy, false)
      rod.position.set(gv.x0, gv.y, gv.z)
      this.gloveMeshes.push({ glove: g, rod })
    }

    // ── ladrilhos: uma base por (cor, forma) e uma instância por ladrilho ──
    const baseKey = new Map<string, Mesh>()
    for (const t of course.tiles) {
      const key = `${t.c}-${t.k}-${t.h}`
      if (baseKey.has(key)) continue
      const col = C[t.c]
      const tg = new SoftGeo()
      if (t.k === 1) {
        tg.cylinder(t.h * 2.06, 0.55, at(0, -0.275, 0, Math.PI / 6), col, 6)
        tg.cylinder(t.h * 1.5, 0.06, at(0, 0.005, 0, Math.PI / 6), mix(col, WHITE, 0.35), 6)
      } else {
        tg.roundBox(t.h * 2, 0.55, t.h * 2, 0.2, at(0, -0.275, 0), col, 8)
        tg.roundBox(t.h * 1.4, 0.06, t.h * 1.4, 0.03, at(0, 0.005, 0), mix(col, WHITE, 0.35), 4)
      }
      const base = tg.build(`gincana-tile-${key}`, scene, theme.deco === "orbital" ? this.glowMat : toy, false)
      base.setEnabled(true)
      base.isVisible = false
      baseKey.set(key, base)
      this.tileBases.push(base)
    }
    for (let i = 0; i < course.tiles.length; i++) {
      const t = course.tiles[i]
      const inst = baseKey.get(`${t.c}-${t.k}-${t.h}`)!.createInstance(`gincana-tile-${i}`)
      inst.position.set(t.x, t.y, t.z)
      inst.isPickable = false
      this.tiles.push(inst)
    }

    // ── bolas da subida (do tema) ──
    if (course.balls) {
      const R = course.balls.R
      const bb = new SoftGeo()
      const paint = this.ballPaint()
      bb.sphere(R * 2, at(0, 0, 0), paint, 18)
      const glowing = theme.deco === "orbital" || theme.deco === "forge"
      this.ballBase = bb.build("gincana-ball", scene, glowing ? this.glowMat : toy, false)
      this.ballBase.isVisible = false
      for (let i = 0; i < 16; i++) {
        const b = this.ballBase.createInstance(`gincana-ball-${i}`)
        b.isPickable = false
        b.setEnabled(false)
        this.ballPool.push(b)
      }
    }

    // ── plataformas que andam e discos que giram (malha própria, posta a cada quadro) ──
    for (const p of course.pads) {
      if (p.mw === 0 && p.spin === 0) continue
      const g = new SoftGeo()
      const gl = new SoftGeo()
      this.pad(g, gl, { ...p, x: 0, z: 0, rot: 0 }, true)
      const mesh = g.build("gincana-mover", scene, toy, false)
      if (gl.vertexCount) {
        const gm = gl.build("gincana-mover-glow", scene, this.glowMat, false)
        gm.parent = mesh
        this.meshes.push(gm)
      }
      mesh.position.set(p.x, 0, p.z)
      this.movers.push({ mesh, p })
    }

    // ── blocos que empurram ──
    for (const q of course.pushers) {
      const pg = new SoftGeo()
      pg.roundBox(q.hx * 2, q.h, q.hz * 2, 0.25, at(0, q.h / 2, 0), (x) => (Math.floor((x + q.hx) / 0.7) % 2 ? C[1] : darker(C[6], 0.7)), 6)
      pg.roundBox(q.hx * 2 + 0.2, 0.3, q.hz * 2 + 0.2, 0.1, at(0, q.h, 0), C[0], 4)
      const m = pg.build("gincana-pusher", scene, theme.deco === "orbital" ? this.glowMat : toy, false)
      m.position.set(q.x, q.y, q.z)
      this.pusherMeshes.push(m)
    }

    // ── portas (todas iguais por fora: as de verdade tombam quando alguém passa) ──
    if (course.doors.length) {
      const d0 = course.doors[0]
      const dg = new SoftGeo()
      dg.roundBox(d0.hw * 2 - 0.1, d0.h, 0.4, 0.12, at(0, d0.h / 2, 0), (x, y) => ((Math.abs(x) * 1.6 + y) % 1.2 < 0.6 ? C[2] : WHITE), 6)
      dg.sphere(0.5, at(-d0.hw * 0.5, d0.h * 0.82, -0.25), C[1], 8)
      dg.sphere(0.5, at(d0.hw * 0.5, d0.h * 0.82, -0.25), C[1], 8)
      const base = dg.build("gincana-door", scene, toy, false)
      base.isVisible = false
      this.doorBase = base
      for (let i = 0; i < course.doors.length; i++) {
        const d = course.doors[i]
        const m = base.createInstance(`gincana-door-${i}`)
        m.isPickable = false
        m.position.set(d.x, DECK, d.z)
        this.doorMeshes.push(m)
        this.doorShake.push(-9)
      }
    }

    // ── esteiras: setas que andam no sentido da esteira ──
    for (const p of course.pads) {
      if (p.bx === 0 && p.bz === 0) continue
      const tex = new DynamicTexture("gincana-belt", { width: 64, height: 64 }, scene, true)
      const g = tex.getContext() as CanvasRenderingContext2D
      g.fillStyle = "#1a1c22"
      g.fillRect(0, 0, 64, 64)
      g.fillStyle = theme.accent
      g.beginPath()
      g.moveTo(10, 44)
      g.lineTo(32, 18)
      g.lineTo(54, 44)
      g.lineTo(44, 44)
      g.lineTo(32, 30)
      g.lineTo(20, 44)
      g.closePath()
      g.fill()
      tex.update(false)
      tex.wrapU = Texture.WRAP_ADDRESSMODE
      tex.wrapV = Texture.WRAP_ADDRESSMODE
      const along = p.bz !== 0 ? p.hz : p.hx
      const across = p.bz !== 0 ? p.hx : p.hz
      tex.uScale = Math.round(across)
      tex.vScale = Math.round(along)
      const mat = new StandardMaterial("gincana-belt-mat", scene)
      mat.diffuseTexture = tex
      mat.emissiveColor = new Color3(0.35, 0.35, 0.35)
      mat.specularColor = new Color3(0, 0, 0)
      const w = p.bz !== 0 ? p.hx * 2 - 0.6 : p.hz * 2 - 0.6
      const h = p.bz !== 0 ? p.hz * 2 - 0.4 : p.hx * 2 - 0.4
      const mesh = CreateGround("gincana-belt-plane", { width: w, height: h }, scene)
      mesh.material = mat
      mesh.position.set(p.x, p.y + 0.035, p.z)
      // a seta do desenho aponta para +v: gira o plano para a direção da esteira
      mesh.rotation.y = Math.atan2(p.bx, p.bz) + Math.PI
      mesh.isPickable = false
      this.belts.push({ tex, mat, mesh, speed: Math.hypot(p.bx, p.bz) / 2 })
    }

    // logo da Freelandoo girando sobre o arco da chegada
    this.logos = buildLogos(scene, [{ id: 1, at: new Vector3(0, course.finishY + 9.6, course.finishZ) }], low, 1.6)

    // ── dia e noite: relógio de Brasília (ou a noite fixa do tema) ──
    this.timer = setInterval(() => this.applyTime(), 20000)
    if (process.env.NODE_ENV !== "production") (window as unknown as { __mmSetHour?: (h: number | null) => void }).__mmSetHour = this.devHour
    this.applyTime()
  }

  /** Textura do "mar" pelo tipo. */
  private fluidTexture() {
    const F = this.theme.fluid
    const tex = new DynamicTexture("gincana-water", { width: 256, height: 256 }, this.scene, true)
    const g = tex.getContext() as CanvasRenderingContext2D
    g.fillStyle = F.day
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = F.streak
    g.fillStyle = F.streak
    g.lineCap = "round"
    if (F.kind === "void") {
      // estrelas / poeira
      for (let i = 0; i < 70; i++) {
        const r = i % 9 === 0 ? 1.6 : 0.8
        g.beginPath()
        g.arc((i * 97) % 256, (i * 61 + i * i) % 256, r, 0, Math.PI * 2)
        g.fill()
      }
    } else if (F.kind === "ice") {
      // placas de gelo boiando
      for (let i = 0; i < 14; i++) {
        const x = (i * 97) % 256
        const y = (i * 61) % 256
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + 18 + (i % 4) * 4, y + 4)
        g.lineTo(x + 14, y + 16 + (i % 3) * 4)
        g.lineTo(x - 4, y + 12)
        g.closePath()
        g.fill()
      }
    } else {
      g.lineWidth = F.kind === "lava" ? 5 : 3
      for (let i = 0; i < 26; i++) {
        const x = (i * 97) % 256
        const y = (i * 61) % 256
        g.beginPath()
        g.moveTo(x, y)
        g.bezierCurveTo(x + 14, y - 8, x + 26, y + 8, x + 38, y)
        g.stroke()
      }
    }
    tex.update(false)
    tex.wrapU = Texture.WRAP_ADDRESSMODE
    tex.wrapV = Texture.WRAP_ADDRESSMODE
    tex.uScale = F.kind === "lava" ? 40 : 70
    tex.vScale = F.kind === "lava" ? 40 : 70
    return tex
  }

  private ballPaint(): (x: number, y: number, z: number) => RGB {
    const d = this.theme.deco
    const C = this.C
    if (d === "forest")
      return (x, y) => {
        const a = Math.atan2(x, y)
        return Math.floor((a + Math.PI) / (Math.PI / 5)) % 2 ? [0.42, 0.27, 0.15] : [0.32, 0.2, 0.11]
      }
    if (d === "canyon") return (x, y, z) => mix(C[0], C[2], (Math.sin(x * 2.3 + z) + Math.cos(y * 3.1)) * 0.25 + 0.5)
    if (d === "orbital") return (_x, y) => (Math.abs(y) < 0.25 ? [1, 1, 1] : [0.3, 0.85, 1])
    if (d === "forge") return (x, y, z) => ((Math.sin(x * 5) + Math.sin(y * 4 + z * 3)) > 0.6 ? [1, 0.8, 0.3] : [0.85, 0.25, 0.05])
    if (d === "factory") return (_x, y) => (Math.abs(y) % 0.8 < 0.18 ? SP.iron : [0.72, 0.2, 0.14])
    if (d === "ice") return () => [0.94, 0.97, 1]
    return (x, y) => {
      const a = Math.atan2(x, y) + Math.PI
      const k = Math.floor(a / (Math.PI / 3)) % 6
      return [SP.copper, SP.iron, SP.brass, SP.iron, SP.copperDark, SP.iron][k]
    }
  }

  /** Pórtico de largada/chegada do tema. */
  private arch(st: SoftGeo, glow: SoftGeo, z: number, y: number) {
    const d = this.theme.deco
    if (d === "city" || d === "forge" || d === "factory") {
      gearArch(this.stage.ctx, 0, y, z, 0, 15.2, 7.4, 1.15)
      return
    }
    const C = this.C
    for (const s of [-1, 1]) {
      st.cylinder(1.2, 7.6, at(s * 7.6, y + 3.8, z), stripesY(C[4], C[7], 0.8, 0), 12)
      glow.sphere(1.1, at(s * 7.6, y + 8, z), C[1], 8)
    }
    st.roundBox(16.4, 0.9, 1.2, 0.3, at(0, y + 7.4, z), C[4], 4)
    glow.roundBox(15, 0.3, 1.3, 0.1, at(0, y + 7.1, z), d === "orbital" ? [0.4, 0.9, 1] : d === "ice" ? [0.7, 0.95, 1] : d === "forest" ? [0.5, 1, 0.7] : [1, 0.7, 0.3], 2)
  }

  /** Boias, faróis e o resto do canal da cidade (a cara de antes). */
  private cityExtras(st: SoftGeo) {
    const C = this.C
    const PINK = C[2]
    const ORANGE = C[0]
    const PURPLE = C[4]
    const BLUE = C[6]
    const LIME = C[5]
    for (let i = 0; i < 26; i++) {
      const s = i % 2 ? 1 : -1
      const z = -10 + i * 11
      const x = s * (17 + ((i * 7) % 11))
      const col = [PINK, ORANGE, PURPLE][i % 3]
      st.cylinder(2.6, 1.2, at(x, 0.5, z), stripesY(col, SP.iron, 0.4, 0), 12)
      st.sphere(1.4, at(x, 1.2, z), SP.iron, 10, 1, 0.7, 1)
      postLantern(this.stage.ctx, x, 1.55, z, 1.2)
    }
    const { props, glow } = this.stage.ctx
    for (let i = 0; i < 10; i++) {
      const s = i % 2 ? 1 : -1
      const z = 20 + i * 28
      const x = s * (48 + ((i * 13) % 22))
      const h = 14 + ((i * 11) % 12)
      const band = [PINK, ORANGE, PURPLE, BLUE, LIME][i % 5]
      props.cylinder(9, 1.6, place(x, 0.2, z), SP.stoneDark, 12)
      props.cone(4.6, 6.4, h, place(x, h / 2, z), SP.brick, 12)
      for (const k of [0.3, 0.62]) props.cylinder(5.9 - k * 1.6, 0.9, place(x, h * k, z), band, 12)
      props.cylinder(6, 0.5, place(x, h + 0.25, z), SP.iron, 12)
      glow.cylinder(3.6, 2.6, place(x, h + 1.8, z), SP.lampGlass, 12)
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2
        props.box(0.2, 2.6, 0.2, place(x + Math.cos(a) * 1.85, h + 1.8, z + Math.sin(a) * 1.85), SP.iron)
      }
      props.cone(0.3, 4.6, 2.2, place(x, h + 4.2, z), SP.brass, 12)
      props.with("flat", () => props.sphere(0.8, [1, 1, 1], place(x, h + 5.5, z), SP.brass, 6))
      this.stage.ctx.gears.push({ m: place(x, h + 0.7, z), r: 3.1, thick: 0.25, speed: s * 0.3 })
    }
  }

  private applyTime() {
    const forced = this.theme.night
    const n = forced ?? nightFactor(this.forcedHour ?? brasiliaHour())
    if (Math.abs(n - this.night) < 0.005) return
    this.night = n
    applyLights(this.scene, n)
    this.sky.set(n)
    this.stage.setNight(n)
    this.city?.setNight(n)
    Color3.LerpToRef(new Color3(0.94, 0.88, 0.8), new Color3(0.16, 0.18, 0.3), n, this.cloudMat.emissiveColor)
    const F = this.theme.fluid
    if (F.glow > 0) {
      // lava e vazio brilham sozinhos
      const k = F.glow
      this.waterMat.emissiveColor.set(k, k, k)
      this.waterMat.diffuseColor.set(1 - k * 0.5, 1 - k * 0.5, 1 - k * 0.5)
    } else {
      Color3.LerpToRef(new Color3(0.25, 0.32, 0.34), new Color3(0.01, 0.05, 0.08), n, this.waterMat.emissiveColor)
      Color3.LerpToRef(new Color3(1, 1, 1), new Color3(0.2, 0.32, 0.38), n, this.waterMat.diffuseColor)
    }
    if (this.aurora) this.aurora.setEnabled(n > 0.3)
    if (this.auroraMat) this.auroraMat.alpha = 0.1 + 0.25 * n
    const k = 0.14 - 0.08 * n + (this.lava ? 0.08 : 0)
    this.toy.emissiveColor.set(k, k * (this.lava ? 0.7 : 1), k * (this.lava ? 0.5 : 1))
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

  /**
   * Plataforma: tampo, borda e corpo; colunas até o fundo. `dyn` = plataforma
   * que anda/gira (malha própria na origem: sem colunas, tampo dentro de `g`).
   */
  private pad(g: SoftGeo, glow: SoftGeo, p: Pad, dyn: boolean) {
    const C = this.C
    const top = C[p.c]
    const rim = C[p.rim]
    const body = darker(top, 0.62)
    const city = this.theme.deco === "city"
    const { pavers, cobble } = this.stage.ctx
    const ice = p.f < 0.7
    if (p.k === 0) {
      g.cylinder(p.r * 2, 0.5, at(p.x, p.y - 0.25, p.z), top, 48)
      if (city && !dyn) {
        // tampo no calçamento da cidade: pedra portuguesa na borda, lajes no miolo
        cobble.cylinder(p.r * 2, 0.05, place(p.x, p.y - 0.02, p.z), CITY.cobble, 32)
        if (p.r > 2.5) pavers.cylinder((p.r - 0.5) * 2, 0.05, place(p.x, p.y - 0.015, p.z), CITY.pave, 32)
        if (p.r >= 5) {
          for (let k = 0; k < 3; k++) {
            const a = (k / 3) * Math.PI * 2 + p.z
            steamLamp(this.stage.ctx, p.x + Math.sin(a) * (p.r - 0.25), p.z + Math.cos(a) * (p.r - 0.25), { y: p.y, collide: false, gearSeed: Math.round(p.z) + k })
          }
        }
      } else {
        // anel e raios no tampo (mostram o giro)
        g.torus((p.r - 0.6) * 2, 0.12, at(p.x, p.y + 0.02, p.z), mix(top, C[7], 0.5), 40)
        if (p.spin !== 0) for (let k = 0; k < 6; k++) g.roundBox(0.3, 0.05, p.r * 1.7, 0.02, at(p.x, p.y + 0.02, p.z, (k / 6) * Math.PI), mix(top, C[7], 0.35), 2)
        if (this.theme.deco === "factory" && p.spin !== 0) {
          // engrenagem: dentes na borda
          for (let k = 0; k < 24; k++) {
            const a = (k / 24) * Math.PI * 2
            g.roundBox(0.8, 0.6, 0.9, 0.1, at(p.x + Math.sin(a) * (p.r + 0.2), p.y - 0.3, p.z + Math.cos(a) * (p.r + 0.2), a), SP.iron, 2)
          }
        }
      }
      g.torus(p.r * 2 + 0.1, 0.62, at(p.x, p.y - 0.12, p.z), rim, 48)
      g.cylinder(p.r * 1.84, p.d - 0.4, at(p.x, p.y - 0.4 - (p.d - 0.4) / 2, p.z), body, 32, p.r * 1.9)
      if (!dyn) {
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + p.x
          const rr = p.r * 0.55
          this.leg(g, p.x + Math.sin(a) * rr, p.z + Math.cos(a) * rr, p.y - p.d)
        }
      } else if (this.theme.deco === "orbital") glow.torus(p.r * 2 + 0.3, 0.18, at(p.x, p.y - 0.5, p.z), [0.3, 0.9, 1], 40)
      return
    }
    const rise = p.y2 - p.y
    const len = p.hz * 2
    const pitch = Math.atan2(rise, len)
    const L = Math.hypot(len, rise)
    const yc = (p.y + p.y2) / 2
    const r = Math.min(0.24, p.hx * 0.45)
    const m = (dy: number) => at(p.x, yc + dy, p.z, p.rot, -pitch)
    g.roundBox(p.hx * 2, 0.5, L, r, m(-0.25), top, 12)
    if (city && !dyn) {
      ;(p.hx >= 2 ? pavers : cobble).box(p.hx * 2, 0.05, L, m(-0.015), p.hx >= 2 ? CITY.pave : CITY.cobble)
    } else if (ice) {
      // gelo: tampo brilhante com rachaduras
      g.roundBox(p.hx * 2 - 0.2, 0.04, L - 0.2, 0.02, m(0.005), mix(top, [1, 1, 1], 0.45), 2)
    } else if (!dyn) {
      // tampo do tema: faixas largas de duas cores
      g.roundBox(p.hx * 2 - 0.3, 0.03, L - 0.3, 0.02, m(0.002), (x, _y, z) => (Math.floor((x + z * 0.3) / 1.6) % 2 ? mix(top, C[7], 0.12) : top), 2)
    }
    // postes/enfeites nas bordas dos pisos largos
    if (!dyn && p.hx >= 5 && Math.abs(p.rot) < 0.01 && rise === 0) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const x = p.x + sx * (p.hx + 0.05)
          const z = p.z + sz * (p.hz - 0.5)
          this.edgeDeco(glow, g, x, z, p.y)
        }
      }
    }
    g.roundBox(p.hx * 2 + 0.34, 0.5, L + 0.34, r + 0.12, m(-0.33), rim, 10)
    g.roundBox(Math.max(0.6, p.hx * 2 - 0.3), p.d - 0.3, Math.max(0.6, L - 0.3), Math.min(0.3, p.hx * 0.4), m(-0.4 - (p.d - 0.3) / 2), body, 8)
    if (dyn) {
      if (this.theme.deco === "canyon") g.cylinder(Math.min(p.hx, p.hz) * 1.6, 2.2, at(p.x, p.y - p.d - 1, p.z), darker(body, 0.8), 7, 0.6)
      if (this.theme.deco === "orbital") glow.roundBox(p.hx * 2 + 0.4, 0.16, L + 0.4, 0.05, m(-0.6), [0.3, 0.9, 1], 2)
      return
    }
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

  /** Enfeite do canto dos pisos largos, pelo tema. */
  private edgeDeco(glow: SoftGeo, g: SoftGeo, x: number, z: number, y: number) {
    switch (this.theme.deco) {
      case "city":
      case "factory":
        steamLamp(this.stage.ctx, x, z, { y, collide: false, gearSeed: Math.round(z) })
        return
      case "forest":
        g.cylinder(0.25, 0.9, at(x, y + 0.45, z), [0.86, 0.84, 0.74], 6)
        glow.sphere(0.9, at(x, y + 1, z), z % 2 > 1 ? [0.3, 0.95, 0.9] : [0.95, 0.35, 0.75], 8, 1, 0.5, 1)
        return
      case "canyon":
        for (let k = 0; k < 3; k++) g.sphere(0.7 - k * 0.15, at(x, y + 0.3 + k * 0.5, z), this.C[(k + 2) % 3], 6, 1, 0.7, 1)
        return
      case "orbital":
        glow.cylinder(0.25, 1.4, at(x, y + 0.7, z), [0.4, 0.9, 1], 6)
        return
      case "forge":
        g.cylinder(0.9, 0.8, at(x, y + 0.4, z), SP.iron, 8, 1.2)
        glow.sphere(0.8, at(x, y + 0.9, z), [1, 0.5, 0.1], 6, 1, 0.6, 1)
        return
      case "ice":
        glow.cylinder(0.5, 1.6, at(x, y + 0.8, z), [0.6, 0.9, 1], 5, 0.05)
        return
    }
  }

  /** Coluna redonda da plataforma até o fundo. */
  private leg(g: SoftGeo, x: number, z: number, yTop: number) {
    const h = yTop + 1.2
    if (h <= 0.2) return
    const col: RGB = this.theme.deco === "forest" ? [0.24, 0.16, 0.12] : this.theme.deco === "ice" ? [0.7, 0.85, 0.95] : IRON
    g.cylinder(0.7, h, at(x, yTop - h / 2, z), stripesY(col, this.C[1], 0.9, 0), 14)
  }

  /** Um quadro: tudo o que se mexe no tempo da prova `t`. */
  update(t: number, clock: number, world: RunWorld) {
    const C = this.course
    const tt = Math.max(0, t)
    this.gate.setEnabled(t < 0)
    for (let i = 0; i < C.sweepers.length; i++) this.sweepNodes[i].rotation.y = sweeperAngle(C.sweepers[i], tt)
    for (let i = 0; i < C.pendulums.length; i++) {
      const p = C.pendulums[i]
      const q = pendulumAt(p, tt)
      this.dir.set(q.x - p.x, q.y - p.py, 0).normalize()
      Quaternion.FromUnitVectorsToRef(this.up, this.dir, this.q)
      this.swings[i].rotationQuaternion!.copyFrom(this.q)
    }
    for (let i = 0; i < C.gloves.length; i++) {
      const gv = C.gloves[i]
      const q = gloveAt(gv, tt)
      const { glove, rod } = this.gloveMeshes[i]
      glove.position.x = q.x
      const len = Math.max(0.05, Math.abs(q.x - gv.x0))
      rod.position.x = (q.x + gv.x0) / 2
      rod.scaling.x = len
      rod.setEnabled(len > 0.3)
    }
    const TT = C.tileTime
    for (let i = 0; i < C.tiles.length; i++) {
      const s = world.tiles[i]
      const inst = this.tiles[i]
      const base = C.tiles[i]
      if (s < 0 || t < s) {
        inst.setEnabled(true)
        inst.position.set(base.x, base.y, base.z)
        inst.scaling.setAll(1)
        continue
      }
      const age = t - s
      if (age < TT.warn) {
        // treme e afunda um pouquinho: vai cair
        const j = 0.05 * (age / TT.warn)
        inst.setEnabled(true)
        inst.position.set(base.x + Math.sin(clock * 61 + i) * j, base.y - age * 0.08, base.z + Math.cos(clock * 53 + i) * j)
      } else if (age < TT.warn + 0.8) {
        const k = age - TT.warn
        inst.setEnabled(true)
        inst.position.set(base.x, base.y - 0.06 - 9 * k * k, base.z)
      } else if (age < TT.warn + TT.gone - 0.35) inst.setEnabled(false)
      else if (age < TT.warn + TT.gone) {
        // volta subindo e "estufando"
        const k = (age - (TT.warn + TT.gone - 0.35)) / 0.35
        inst.setEnabled(true)
        inst.position.set(base.x, base.y - (1 - k) * 1.2, base.z)
        inst.scaling.set(0.7 + 0.3 * k, 1, 0.7 + 0.3 * k)
      } else {
        inst.setEnabled(true)
        inst.position.set(base.x, base.y, base.z)
        inst.scaling.setAll(1)
      }
    }
    if (C.balls && C.ramp) {
      ballsAt(C, this.seed, t, this.balls)
      let used = 0
      for (let k = 0; k < this.balls.length && used < this.ballPool.length; k += 5) {
        const b = this.ballPool[used++]
        b.setEnabled(true)
        b.position.set(this.balls[k], this.balls[k + 1], this.balls[k + 2])
        b.rotation.x = -this.balls[k + 2] / C.balls.R
      }
      for (let i = used; i < this.ballPool.length; i++) this.ballPool[i].setEnabled(false)
    }
    for (const m of this.movers) {
      const sh = padShift(m.p, tt)
      m.mesh.position.set(m.p.x + sh.dx, 0, m.p.z + sh.dz)
      m.mesh.rotation.y = m.p.k === 0 ? m.p.spin * tt : padRot(m.p, tt)
    }
    for (let i = 0; i < C.pushers.length; i++) {
      const P = pusherAt(C.pushers[i], tt)
      this.pusherMeshes[i].position.x = P.x
      this.pusherMeshes[i].position.z = P.z
    }
    for (let i = 0; i < C.doors.length; i++) {
      const m = this.doorMeshes[i]
      const s = world.doors[i]
      if (s >= 0) {
        // tomba para a frente (a de verdade)
        const k = Math.min(1, Math.max(0, (t - s) / 0.35))
        m.rotation.x = k * k * (Math.PI / 2)
      } else {
        m.rotation.x = 0
        if (s === -2 && this.doorShake[i] < -1) this.doorShake[i] = clock
        const age = clock - this.doorShake[i]
        m.position.x = C.doors[i].x + (age >= 0 && age < 0.35 ? Math.sin(age * 60) * 0.08 * (1 - age / 0.35) : 0)
      }
    }
    // a seta anda no sentido da esteira (para onde ela aponta)
    for (const b of this.belts) b.tex.vOffset = (b.tex.vOffset + b.speed * (1 / 60)) % 1
    for (const c of this.bounceCaps) {
      const k = 1 + Math.sin(clock * 3 + c.x + c.z) * 0.04
      c.mesh.scaling.set(k, 2 - k, k)
    }
    const F = this.theme.fluid
    const sp = F.kind === "lava" ? 0.4 : 1
    this.waterTex.uOffset = (clock * 0.012 * sp) % 1
    this.waterTex.vOffset = (clock * 0.02 * sp) % 1
    if (this.clouds) this.clouds.position.x = Math.sin(clock * 0.01) * 12
    this.logos.tick(clock)
  }

  dispose() {
    clearInterval(this.timer)
    const w = window as unknown as { __mmSetHour?: (h: number | null) => void }
    if (w.__mmSetHour === this.devHour) delete w.__mmSetHour
    this.sky.dispose()
    this.city?.dispose()
    this.logos.dispose()
    this.fleet?.dispose()
    this.stage.dispose()
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
    this.ballBase?.dispose()
    for (const m of this.movers) m.mesh.dispose()
    for (const m of this.pusherMeshes) m.dispose()
    for (const m of this.doorMeshes) m.dispose()
    this.doorBase?.dispose()
    for (const b of this.belts) {
      b.mesh.dispose()
      b.mat.dispose()
      b.tex.dispose()
    }
    this.gate.dispose()
    this.water.material?.dispose()
    this.waterTex.dispose()
    this.water.dispose()
    this.auroraMat?.dispose()
    this.glowMat.dispose()
    this.cloudMat.dispose()
    this.toy.dispose()
  }
}
