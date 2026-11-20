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
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { buildLogos, type LogoView } from "../../corrida/engine/logos"
import { DECK, drumAngle, memCall, memState, memSymbols, memTarget, memTile, riseAt, wallsAt, type WallWave, ballsAt, gloveAt, padRot, padShift, pendulumAt, pusherAt, sweeperAngle, type Course, type Pad } from "../sim/course"
import type { RunWorld } from "../sim/body"
import { SoftGeo, at, hex, mix, stripesY, type RGB } from "./shapes"
import { memSymbolGeo } from "./mem-symbols"
import { AirshipFleet, SP, SteamStage, fleetRing, gearArch, place, tierOf } from "../../engine/steampunk/scenery"
import { postLantern, steamLamp } from "../../engine/steampunk/kit"
import { Sky, applyLights, brasiliaHour, nightFactor } from "../../engine/steampunk/atmosphere"
import { CITY } from "../../paint/engine/world-view"
import { buildCity, type GincanaCity } from "./city-view"
import { buildAurora, buildBackdrop, buildTargets } from "./backdrops"
import { cannonGate, clareiraPost, clearingFloor, fallenLog, fruit, hollowLog, isClareiraCannon, isClareiraFloor, isClareiraLily, isClareiraLog, giantLily, isClareiraSlice, isClareiraStone, isClareiraStump, mossStone, spinSlice, spinStump } from "./clareira-view"
import { ComportasGates, comportasFloor, comportasPad, comportasPost } from "./comportas-view"
import type { GincanaTheme } from "./phase-themes"
import type { SkyRegionId } from "../../engine/sky/sky-registry"

const IRON: RGB = [0.2, 0.2, 0.22]
const darker = (c: RGB, k = 0.72): RGB => [c[0] * k, c[1] * k, c[2] * k]
/** A arte de céu (céu v2) de cada fase: a do Domínio. */
const SKY_OF: Record<GincanaTheme["deco"], SkyRegionId> = { city: "centro", forest: "noctis", canyon: "zephyra", orbital: "iris", forge: "kragor", factory: "aeryn", ice: "maru" }
/** Seta do chão (sem luz: lê de dia e de noite). */
const ARROW: RGB = [1, 0.84, 0.12]
/** Listra de perigo (amarelo e quase preto) do que machuca. */
const HAZ_Y: RGB = [0.98, 0.78, 0.08]
const HAZ_K: RGB = [0.07, 0.07, 0.08]

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
  /** Clareira da Lua: uma fruta por faixa (base e conjunto de instâncias por espécie). */
  private readonly fruitBases: Mesh[] = []
  private readonly fruitPools: InstancedMesh[][] = []
  private readonly movers: { mesh: Mesh; p: Pad }[] = []
  /** Comportas da Usina: as comportas que sobem e descem (instanciadas por tipo) e as luzes delas. */
  private readonly comportas: ComportasGates | null = null
  private readonly pusherMeshes: Mesh[] = []
  /** Gincana 3: pedaços das paredes de brasa (um conjunto por onda que cabe na arena) e as muretas. */
  private readonly wallSegs: InstancedMesh[] = []
  private readonly wallLows: InstancedMesh[] = []
  private readonly wallBases: Mesh[] = []
  private readonly wallTmp: WallWave[] = []
  /** Gincana 3: engrenagens da coleta (uma instância por ponto). */
  private readonly gemMeshes: InstancedMesh[] = []
  private readonly gemBases: Mesh[] = []
  /** Gincana 3: o anel aceso do topo (Rei do Iceberg). */
  private zoneRing: Mesh | null = null
  /** Coroa da Torre: a coroa que gira no alto do estrado (pular para pegar). */
  private crownMesh: Mesh | null = null
  /** Gincana 3: anéis do Rolo de Gelo (um nó por anel, gira em z). */
  private readonly drumNodes: { node: TransformNode; d: number; r: number }[] = []
  /** Gincana 3: Relógio da Praça — ladrilhos, símbolos [símbolo][ladrilho], o símbolo no mostrador e o ponteiro. */
  private readonly memTiles: InstancedMesh[] = []
  private readonly memSyms: InstancedMesh[][] = []
  private readonly memFace: Mesh[] = []
  private readonly memBases: Mesh[] = []
  private memHand: TransformNode | null = null
  private memCache: { seed: number; r: number; sym: Uint8Array } = { seed: -1, r: -1, sym: new Uint8Array(0) }
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
  /** Neon das bordas (a cor de destaque da fase). */
  private readonly neon: RGB

  constructor(
    private readonly scene: Scene,
    private readonly seed: number,
    low: boolean,
    private readonly course: Course,
    private readonly theme: GincanaTheme,
  ) {
    const C = theme.palette
    this.C = C
    this.neon = mix(hex(theme.accent), [1, 1, 1], 0.15)
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
    // v2: o céu de cada fase é a arte do Domínio dela (a cidade usa a do centro)
    this.sky = new Sky(scene, 900, { region: SKY_OF[theme.deco], tier: low ? "low" : "mid" })
    this.cloudMat = this.unlit("gincana-cloud-mat", 0.94)
    // V-Gelo: sem nuvens (noite polar limpa, a aurora no lugar)
    if (theme.deco === "city" || theme.deco === "canyon" || theme.deco === "factory") {
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
          // Cânion (ref. v3): nuvem de pôr do sol — rosada embaixo, quase branca em cima
          const cloudPaint = theme.deco === "canyon" ? (_x: number, y: number): RGB => mix([0.98, 0.68, 0.72], [1, 0.95, 0.9], Math.min(1, Math.max(0, y / s + 0.5))) : WHITE
          cloudG.sphere(s, at(cx + (k - n / 2) * 8, cy + Math.sin(k * 2.1 + i) * 3, cz + Math.cos(k * 1.7) * 5), cloudPaint, 8, 1, 0.62, 1)
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
    wm.specularColor = theme.fluid.kind === "water" || theme.fluid.kind === "swamp" || theme.fluid.kind === "ice" || theme.fluid.kind === "oil" ? new Color3(0.5, 0.55, 0.6) : new Color3(0, 0, 0)
    wm.specularPower = 90
    if (theme.fluid.glow > 0) wm.emissiveTexture = this.waterTex
    this.water = CreateGround("gincana-sea", { width: 1100, height: 1100, subdivisions: 1 }, scene)
    this.water.position.set(0, theme.fluid.kind === "void" ? -6 : 0, 130)
    this.water.material = wm
    this.water.isPickable = false
    // Gincana 3: o pântano que sobe anda (update); o resto fica parado
    if (!course.rise) this.water.freezeWorldMatrix()

    // ── o que não se mexe ──
    const st = new SoftGeo()
    const glow = new SoftGeo()
    for (const p of course.pads) if (p.mw === 0 && p.spin === 0 && p.gh === 0) this.pad(st, glow, p, false)
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
      } else if (theme.id === "clareira") {
        // Clareira da Lua: cogumelo do miolo das fatias, árvore gigante dos tocos
        clareiraPost(st, glow, q)
      } else if (theme.id === "comportas") {
        // Comportas da Usina: bobina de cobre
        comportasPost(st, glow, q)
      } else if (q.y0 < DECK - 0.1) {
        // poste da luva: sai da água, com anéis
        st.cylinder(q.r * 2, h, at(q.x, q.y0 + h / 2, q.z), stripesY(col, darker(col, 0.8), 0.8, 0), 20)
        if (!city) st.cylinder(q.r * 2 + 0.12, 0.9, at(q.x, DECK + 0.45, q.z), stripesY(HAZ_Y, HAZ_K, 0.5, 0.5), 20)
        st.sphere(q.r * 2.1, at(q.x, q.y1, q.z), col, 12, 1, 0.6, 1)
      } else if (q.r > 0.7 && theme.deco === "forest") {
        // Floresta (ref. v3): barril de perigo — faixas diagonais amarelo/preto, aros escuros e a tampa acesa
        st.cylinder(q.r * 2, h, at(q.x, q.y0 + h / 2, q.z), (x, y, z) => (Math.floor((Math.atan2(z, x) * 1.6 + y * 6) + 100) % 2 ? HAZ_Y : HAZ_K), 24)
        for (const yy of [0.3, h * 0.5, h - 0.25]) st.torus(q.r * 2 + 0.08, 0.12, at(q.x, q.y0 + yy, q.z), [0.1, 0.1, 0.12], 20)
        st.cylinder(q.r * 2.3, 0.04, at(q.x, q.y0 + 0.02, q.z), [0.03, 0.08, 0.07], 16)
        glow.cylinder(q.r * 1.6, 0.12, at(q.x, q.y1 + 0.05, q.z), [1, 0.9, 0.5], 18)
        glow.torus(q.r * 1.9, 0.08, at(q.x, q.y1 + 0.02, q.z), [1, 0.62, 0.2], 18)
      } else if (q.r > 0.7 && theme.deco === "orbital") {
        // V-Orbital (ref. v3): eixo de aço roxo em seis faces, base larga, anéis de neon ciano, filetes acesos
        // nas arestas e o topo em magenta
        const STEEL: RGB = [0.3, 0.26, 0.44]
        st.cylinder(q.r * 2.6, 0.5, at(q.x, q.y0 + 0.25, q.z), darker(STEEL, 0.7), 6)
        st.cylinder(q.r * 2, h, at(q.x, q.y0 + h / 2, q.z), (_x, y) => (y > h / 2 - 0.3 ? mix(STEEL, WHITE, 0.3) : STEEL), 6, q.r * 1.8)
        for (const yy of [0.7, h * 0.5, h - 0.45]) glow.cylinder(q.r * 2.12, 0.14, at(q.x, q.y0 + yy, q.z), this.neon, 6)
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2
          glow.box(0.08, h - 1.4, 0.08, at(q.x + Math.cos(a) * q.r * 0.98, q.y0 + h / 2, q.z + Math.sin(a) * q.r * 0.98), [1, 0.3, 0.8])
        }
        st.cylinder(q.r * 2.2, 0.3, at(q.x, q.y1 + 0.15, q.z), darker(STEEL, 0.8), 6)
        glow.cylinder(q.r * 1.3, 0.5, at(q.x, q.y1 + 0.5, q.z), [1, 0.35, 0.82], 6, q.r * 0.6)
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
      // Clareira: o pórtico fica fora da vitória-régia que gira (r 9) e da rampa
      const span = theme.id === "clareira" ? 10.5 : 5.5
      const x0 = Math.min(...row.map((p) => p.x)) - span
      const x1 = Math.max(...row.map((p) => p.x)) + span
      if (theme.deco === "forest") {
        // Floresta: dois troncos e um GALHO grosso de trave, com musgo, folhas e flores acesas penduradas
        const bark = (x: number, y: number, zz: number): RGB => {
          const g = Math.sin(Math.atan2(zz, x) * 8 + y * 0.6)
          return g > 0.5 ? [0.16, 0.1, 0.07] : g < -0.55 ? [0.42, 0.28, 0.2] : [0.28, 0.18, 0.13]
        }
        for (const x of [x0, x1]) {
          st.tube(new Vector3(x, -1, z), new Vector3(x + Math.sign((x0 + x1) / 2 - x) * 0.4, py + 0.6, z + 0.2), 0.55, bark, 9)
          st.sphere(1.6, at(x, py + 0.9, z), [0.14, 0.4, 0.24], 7, 1, 0.7, 1)
        }
        const N = 8
        for (let k = 0; k < N; k++) {
          const xa = x0 + ((x1 - x0) * k) / N
          const xb = x0 + ((x1 - x0) * (k + 1)) / N
          st.tube(new Vector3(xa, py + 0.35 + Math.sin(k) * 0.12, z), new Vector3(xb, py + 0.35 + Math.sin(k + 1) * 0.12, z), 0.42, bark, 8)
          st.sphere(1.1, at((xa + xb) / 2, py + 0.85, z + (k % 2 ? 0.2 : -0.2)), k % 2 ? [0.16, 0.44, 0.26] : [0.1, 0.32, 0.2], 6, 1.4, 0.5, 1)
          if (k % 2 === 1) {
            for (let f = 0; f < 5; f++) {
              const a = (f / 5) * Math.PI * 2
              glow.sphere(0.4, at((xa + xb) / 2 + Math.cos(a) * 0.26, py + 0.15 + Math.sin(a) * 0.26, z - 0.55), [1, 0.38, 0.84], 5, 1, 1, 0.45)
            }
            glow.sphere(0.22, at((xa + xb) / 2, py + 0.15, z - 0.62), [1, 0.92, 0.6], 4)
          }
        }
        continue
      }
      for (const x of [x0, x1]) {
        st.cylinder(0.9, py + 1.5, at(x, (py + 1.5) / 2 - 1, z), stripesY(IRON, YELLOW, 1.1, 0), 16)
        st.sphere(1.3, at(x, py + 0.6, z), YELLOW, 12)
      }
      st.capsule(0.42, x1 - x0 + 1, at((x0 + x1) / 2, py + 0.35, z, 0, 0, Math.PI / 2), IRON, 12)
      for (let x = x0 + 1.1; x < x1; x += 2.2) st.torus(1.0, 0.16, at(x, py + 0.35, z, 0, 0, Math.PI / 2), YELLOW, 16)
    }
    // pórticos da largada e da chegada (engrenagem na cidade, na forja e na fábrica; arco aceso nos outros)
    // Gincana 3: arena (sobrevivência, coleta, zona) não tem largada nem chegada
    const arena = course.mode !== "race"
    if (!arena) {
      this.arch(st, glow, 8.4, DECK)
      // Coroa da Torre: a linha fica 1,1 m acima do estrado (a coroa); o pórtico fica no chão
      this.arch(st, glow, course.finishZ, course.finishY - (course.crown ? 1.1 : 0))
    }
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
    for (let i = 0; i < (arena ? 0 : 14); i++) {
      for (let j = 0; j < 2; j++) {
        st.roundBox(1.2, 0.06, 0.6, 0.03, at(-8.4 + i * 1.3, course.finishY - (course.crown ? 1.1 : 0) + 0.03, course.finishZ - 0.3 + j * 0.62), (i + j) % 2 ? WHITE : [0.08, 0.08, 0.1], 4)
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
      if (!city) {
        // v2: moldura acesa — faixa na verga (frente e trás) e um filete em cada pilar
        for (const fz of [-0.47, 0.47]) glow.roundBox(xs[xs.length - 1] - xs[0], 0.16, 0.06, 0.03, at((xs[0] + xs[xs.length - 1]) / 2, DECK + h + 0.6, ds[0].z + fz), this.neon, 2)
        for (const x of xs) for (const fz of [-0.42, 0.42]) glow.roundBox(0.12, h - 0.2, 0.05, 0.03, at(x, DECK + h / 2 + 0.1, ds[0].z + fz), this.neon, 2)
      }
    }
    if (city) this.cityExtras(st)
    else buildBackdrop(theme.deco, st, glow, this.stage.ctx, low)
    if (theme.id === "clareira") cannonGate(st, glow)
    // alvos de programa de TV: fora da Floresta (a referência não tem)
    if (theme.deco !== "forest") buildTargets(st, glow, theme.deco, this.neon, low)
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
      if (theme.deco === "forest") {
        // Floresta (ref. v3): a barra é uma RAIZ retorcida (casca em sulcos, cipó enrolado, folhas) — mesma grossura da regra
        const bark = (x: number, y: number, z: number): RGB => {
          const g = Math.sin(Math.atan2(y, x) * 5 + z * 1.4)
          return g > 0.5 ? [0.2, 0.11, 0.07] : g < -0.5 ? [0.52, 0.33, 0.2] : [0.36, 0.22, 0.13]
        }
        const z0 = s.both ? -s.len : 0
        const N = Math.round(len / 0.9)
        const pt = (k: number) => new Vector3(Math.sin(k * 0.9) * 0.12, Math.cos(k * 1.3) * 0.1, z0 + (k / N) * len)
        for (let k = 0; k < N; k++) bg.tube(pt(k), pt(k + 1), s.r + 0.05 - (k % 2) * 0.03, bark, 9)
        for (let k = 1; k < N; k += 2) {
          const p = pt(k)
          bg.torus((s.r + 0.08) * 2, 0.06, at(p.x, p.y, p.z, 0, Math.PI / 2, k), [0.2, 0.5, 0.2], 10)
          if (k % 4 === 1) bg.sphere(0.5, at(p.x + 0.3, p.y + s.r + 0.1, p.z), [0.2, 0.55, 0.26], 5, 1, 0.3, 1.6)
        }
        for (const e of s.both ? [-s.len, s.len] : [s.len]) bg.sphere((s.r + 0.05) * 2.6, at(0, 0, e), bark, 9, 1, 0.9, 0.8)
        // o eixo: barril de perigo (faixas diagonais amarelo/preto, aros escuros, tampa acesa)
        bg.cylinder(1.9, 1.2, at(0, 0, 0), (x, y, z) => (Math.floor((Math.atan2(z, x) * 1.6 + y * 3.2) + 100) % 2 ? HAZ_Y : HAZ_K), 20)
        for (const yy of [-0.55, 0.55]) bg.torus(1.95, 0.1, at(0, yy, 0), [0.12, 0.12, 0.14], 20)
      } else {
        // V-Orbital: a barra ALTA (mergulhe) em magenta e branco, a baixa (pule) em amarelo e preto — lê de longe
        const high = theme.deco === "orbital" && s.y - DECK > 1
        bg.capsule(s.r + 0.05, len, at(0, 0, off, 0, Math.PI / 2), city ? stripesY(ORANGE, WHITE, 0.55, 0) : high ? stripesY([1, 0.25, 0.75], [1, 0.9, 1], 0.55, 0.5) : stripesY(HAZ_Y, HAZ_K, 0.55, 0.5), 12)
        bg.sphere(1.2, at(0, 0, 0), YELLOW, 12)
      }
      if (!city && theme.deco !== "forest") {
        // v2: o eixo é uma máquina (tambor com faixa de perigo e tampa) e cada ponta da barra tem um batente
        bg.cylinder(2.3, 0.9, at(0, -0.75, 0), stripesY(darker(C[4], 0.8), C[4], 0.3, 0), 20)
        bg.cylinder(2.5, 0.28, at(0, -0.3, 0), stripesY(HAZ_Y, HAZ_K, 0.5, 0.6), 20)
        bg.cylinder(1.5, 0.5, at(0, 0.55, 0), C[4], 16, 1.1)
        const cap = (z: number) => bg.sphere((s.r + 0.05) * 3.2, at(0, 0, z), PINK, 12, 1, 1, 0.7)
        cap(s.both ? s.len : s.len)
        if (s.both) cap(-s.len)
      }
      const m = bg.build("gincana-bar", scene, theme.deco === "orbital" ? this.glowMat : toy, false)
      m.parent = node
      this.sweepNodes.push(node)
      this.meshes.push(m)
    }

    // ── pêndulos: haste e a bola/martelo/estalactite do tema ──
    for (const p of course.pendulums) {
      const pg = new SoftGeo()
      if (city) pg.cylinder(0.16, p.len, at(0, -p.len / 2, 0), IRON, 8)
      else if (theme.deco === "forest") {
        // cipó trançado (dois fios que se cruzam) no lugar da corrente
        const n = Math.max(6, Math.round((p.len - p.R) / 0.5))
        for (const ph of [0, Math.PI]) {
          for (let k = 0; k < n; k++) {
            const y0 = -k * ((p.len - p.R) / n)
            const y1 = -(k + 1) * ((p.len - p.R) / n)
            pg.tube(new Vector3(Math.sin(k * 1.2 + ph) * 0.09, y0, Math.cos(k * 1.2 + ph) * 0.09), new Vector3(Math.sin((k + 1) * 1.2 + ph) * 0.09, y1, Math.cos((k + 1) * 1.2 + ph) * 0.09), 0.08, k % 3 ? [0.24, 0.34, 0.14] : [0.32, 0.24, 0.12], 5)
          }
        }
        for (let k = 1; k < n; k += 3) pg.sphere(0.45, at(0.15, -k * ((p.len - p.R) / n), 0.1, k), [0.2, 0.5, 0.24], 5, 1, 0.3, 1.6)
      } else {
        // v2: corrente de elos (alternando o giro) no lugar da haste lisa
        const n = Math.max(4, Math.round((p.len - p.R) / 0.42))
        for (let k = 0; k < n; k++) pg.torus(0.42, 0.11, at(0, -0.21 - k * 0.42, 0, k % 2 ? Math.PI / 2 : 0, 0, Math.PI / 2), k % 2 ? IRON : darker(IRON, 0.8), 6)
      }
      if (theme.deco !== "forest") pg.cylinder(0.5, 0.3, at(0, -p.len + p.R * 1.02, 0), YELLOW, 12)
      if (theme.deco === "forest") {
        // coco: fibra em faixas (escuro/claro), os três "olhos" e um tufo de folhas no nó do cipó
        pg.sphere(p.R * 2, at(0, -p.len, 0), (x, y, z) => {
          const f = Math.sin(Math.atan2(z, x) * 13 + y * 3)
          return f > 0.5 ? [0.26, 0.15, 0.08] : f < -0.5 ? [0.56, 0.38, 0.2] : [0.42, 0.26, 0.13]
        }, 16, 1, 1.08, 1)
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2
          pg.sphere(p.R * 0.3, at(Math.cos(a) * p.R * 0.28, -p.len - p.R * 0.98, Math.sin(a) * p.R * 0.28), [0.1, 0.05, 0.03], 6, 1, 0.5, 1)
        }
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2
          pg.sphere(p.R * 0.9, at(Math.cos(a) * p.R * 0.45, -p.len + p.R * 1.05, Math.sin(a) * p.R * 0.45, -a, 0, 0.5), [0.18, 0.46, 0.22], 6, 1.3, 0.25, 0.5)
        }
      } else if (theme.deco === "forge") {
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
      if (theme.deco === "forest") {
        // folha gigante (ref. v3): nervura central clara, veios em espinha, beira mais clara, pecíolo atrás;
        // duas cores (verde e verde-limão) pela cor do ladrilho
        const leaf: RGB = t.c === 1 ? [0.56, 0.66, 0.2] : [0.2, 0.54, 0.3]
        const W = t.h * 2.2
        tg.sphere(W, at(0, -0.12, 0), (x, y, z) => {
          if (y < -0.02) return darker(leaf, 0.55)
          const r = Math.hypot(x / (W / 2), z / (W * 0.58))
          if (Math.abs(x) < 0.06) return mix(leaf, [0.9, 1, 0.7], 0.55)
          const vein = Math.abs(Math.sin(z * 4.2 - Math.abs(x) * 3.2)) < 0.14
          const c = mix(leaf, [0.8, 0.95, 0.5], Math.max(0, r - 0.75) * 1.6)
          return vein ? mix(c, [0.85, 1, 0.6], 0.35) : c
        }, 16, 1, 0.16, 1.18)
        tg.cylinder(0.14, 0.9, at(0, -0.1, -W * 0.62, 0, Math.PI / 2, 0), [0.3, 0.42, 0.16], 5)
      } else if (t.k === 1 && theme.deco === "canyon") {
        // V-Cânion (ref. v3): pedra do caminho — laje de pedra cinza-areia em três lajotas (tons
        // diferentes, rejunte escuro entre elas), corpo de arenito terracota escurecendo embaixo
        // (sombra de contato) e um filete ciano na quina de cima, como a borda acesa da referência
        const D = t.h * 2.06
        const side: RGB = mix(col, [0.62, 0.3, 0.18], 0.6)
        tg.cylinder(D, 0.55, at(0, -0.3, 0, Math.PI / 6), (_x, y) => mix(darker(side, 0.55), side, Math.min(1, (y + 0.55) / 0.5)), 6, D * 0.9)
        tg.cylinder(D * 1.015, 0.05, at(0, -0.035, 0, Math.PI / 6), [0.32, 0.95, 0.9], 6)
        // laje de cima: cinza-areia, mais clara na beira (quina que pega luz), tom pela cor do ladrilho
        const STONE: RGB[] = [[0.74, 0.66, 0.56], [0.68, 0.6, 0.52], [0.8, 0.72, 0.6]]
        const st = mix(STONE[t.c % 3], col, 0.16)
        tg.cylinder(D * 0.95, 0.07, at(0, 0, 0, Math.PI / 6), (x, _y, z) => (Math.hypot(x, z) > D * 0.4 ? mix(st, WHITE, 0.3) : darker(st, 0.92)), 6)
        // rejunte: três linhas do centro a cantos alternados (a laje vira três lajotas)
        for (let q = 0; q < 3; q++) {
          const a = (q / 3) * Math.PI * 2 + Math.PI / 6
          tg.box(D * 0.47, 0.012, 0.045, at(Math.cos(a) * D * 0.24, 0.033, Math.sin(a) * D * 0.24, -a), [0.36, 0.28, 0.22])
        }
      } else if (t.k === 1) {
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
      if (theme.id === "clareira") {
        for (let kind = 0; kind < 4; kind++) {
          const fg = new SoftGeo()
          fruit(fg, kind, R)
          const base = fg.build(`gincana-fruit-${kind}`, scene, toy, false)
          base.isVisible = false
          this.fruitBases.push(base)
          const pool: InstancedMesh[] = []
          for (let i = 0; i < 6; i++) {
            const b = base.createInstance(`gincana-fruit-${kind}-${i}`)
            b.isPickable = false
            b.setEnabled(false)
            pool.push(b)
          }
          this.fruitPools.push(pool)
        }
        bb.sphere(0.01, at(0, 0, 0), WHITE, 4)
      } else if (theme.deco === "forest") {
        // Floresta (ref. v3): TRONCO rolando de lado (eixo em x, gira em x como a bola): casca em sulcos,
        // pontas de madeira clara com anéis e um aro listrado de perigo em cada ponta; nó e musgo na casca
        const Lg = 2.3
        bb.cylinder(R * 2, Lg, at(0, 0, 0, 0, 0, Math.PI / 2), (x, y, z) => {
          const g = Math.sin(Math.atan2(z, x) * 11 + y * 2)
          return g > 0.55 ? [0.18, 0.1, 0.06] : g < -0.6 ? [0.5, 0.32, 0.18] : [0.36, 0.22, 0.12]
        }, 16)
        for (const sx of [-1, 1]) {
          bb.cylinder(R * 1.9, 0.06, at(sx * (Lg / 2 + 0.02), 0, 0, 0, 0, Math.PI / 2), (x, _y, z) => {
            const r = Math.hypot(x, z)
            return Math.sin(r * 9) > 0.4 ? [0.66, 0.44, 0.24] : [0.86, 0.66, 0.4]
          }, 16)
          bb.torus(R * 2 + 0.04, 0.16, at(sx * (Lg / 2 - 0.12), 0, 0, 0, 0, Math.PI / 2), (x, y, z) => (Math.floor(Math.atan2(z, y) * 2.5 + 100) % 2 ? HAZ_Y : HAZ_K), 18)
        }
        bb.sphere(0.5, at(0.3, R * 0.92, 0.2), [0.24, 0.14, 0.08], 6, 1, 0.5, 1)
        bb.sphere(0.9, at(-0.4, 0.2, R * 0.9), [0.18, 0.46, 0.22], 6, 1.2, 0.6, 0.4)
      } else bb.sphere(R * 2, at(0, 0, 0), paint, 18)
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
      if (p.gh !== 0) continue
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

    if (theme.id === "comportas") this.comportas = new ComportasGates(scene, toy, this.glowMat, course)

    // ── blocos que empurram ──
    for (const q of course.pushers) {
      const pg = new SoftGeo()
      // o que empurra é perigo: listra diagonal amarela e preta (na cidade, as faixas de antes)
      if (theme.deco === "factory") {
        // V-Fábrica (ref. v3): prensa num carro — cabeça listrada de perigo, carcaça verde-petróleo com
        // friso de latão, engrenagem de latão nas duas faces e o pistão cromado subindo até o pórtico
        const TEAL: RGB = [0.14, 0.34, 0.34]
        const BRASS: RGB = [0.78, 0.56, 0.24]
        const W = q.hx * 2
        const D = q.hz * 2
        for (let k = 0; k < 6; k++) pg.box(W / 6, 0.8, D, at(-W / 2 + (k + 0.5) * (W / 6), 0.4, 0), k % 2 ? HAZ_K : HAZ_Y)
        pg.box(W + 0.12, 0.14, D + 0.12, at(0, 0.84, 0), BRASS)
        pg.box(W - 0.2, q.h - 0.9, D - 0.2, at(0, 0.9 + (q.h - 0.9) / 2, 0), (_x, y) => (y > (q.h - 0.9) / 2 - 0.12 ? mix(TEAL, WHITE, 0.3) : TEAL))
        for (const fz of [-1, 1]) {
          const gz = fz * (D / 2 - 0.05)
          pg.cylinder(1.3, 0.16, at(0, 0.9 + (q.h - 0.9) / 2, gz, 0, Math.PI / 2, 0), BRASS, 14)
          pg.cylinder(0.4, 0.22, at(0, 0.9 + (q.h - 0.9) / 2, gz, 0, Math.PI / 2, 0), [0.32, 0.22, 0.12], 8)
          for (let t = 0; t < 8; t++) {
            const a = (t / 8) * Math.PI * 2
            pg.box(0.26, 0.22, 0.16, at(Math.cos(a) * 0.72, 0.9 + (q.h - 0.9) / 2 + Math.sin(a) * 0.72, gz, 0, 0, a), BRASS)
          }
        }
        const rodH = 3.9
        pg.cylinder(0.72, rodH, at(0, q.h + rodH / 2, 0), (_x, y) => (Math.abs(y - rodH * 0.3) < 0.12 ? [0.3, 0.3, 0.32] : [0.78, 0.8, 0.84]), 12)
        pg.cylinder(1.1, 0.4, at(0, q.h + 0.2, 0), BRASS, 12)
        pg.box(1.4, 0.7, 1.2, at(0, q.h + rodH - 0.1, 0), TEAL)
        // o pórtico fixo por onde o carro corre (colunas FORA da arena: ninguém atravessa)
        const gg = new SoftGeo()
        const span = (q.ax + q.hx) * 2 + 6
        const by = q.y + q.h + rodH + 0.35
        gg.box(span, 0.7, 1.4, at(q.x, by, q.z), (_x, y) => (y > 0.2 ? mix(TEAL, WHITE, 0.25) : TEAL))
        gg.box(span, 0.12, 0.3, at(q.x, by - 0.4, q.z - 0.35), BRASS)
        gg.box(span, 0.12, 0.3, at(q.x, by - 0.4, q.z + 0.35), BRASS)
        for (const sx of [-1, 1]) {
          const px = q.x + sx * (span / 2 - 0.4)
          gg.box(1, by - q.y + 4, 1, at(px, q.y + (by - q.y) / 2 - 2, q.z), TEAL)
          for (let k = 0; k < 4; k++) gg.box(1.05, 0.5, 1.05, at(px, q.y + 0.25 + k * 1.2, q.z), k % 2 ? HAZ_K : HAZ_Y)
          gg.cylinder(1.4, 0.4, at(px, by + 0.5, q.z), BRASS, 10)
        }
        this.meshes.push(gg.build("gincana-press-gantry", scene, toy, true))
      } else {
        pg.roundBox(q.hx * 2, q.h, q.hz * 2, 0.25, at(0, q.h / 2, 0), city ? (x) => (Math.floor((x + q.hx) / 0.7) % 2 ? C[1] : darker(C[6], 0.7)) : (x, y, z) => (Math.floor((x + z + y) / 0.6 + 100) % 2 ? HAZ_Y : HAZ_K), 6)
        pg.roundBox(q.hx * 2 + 0.2, 0.3, q.hz * 2 + 0.2, 0.1, at(0, q.h, 0), C[0], 4)
      }
      const m = pg.build("gincana-pusher", scene, theme.deco === "orbital" ? this.glowMat : toy, false)
      m.position.set(q.x, q.y, q.z)
      this.pusherMeshes.push(m)
    }

    // ── Gincana 3: paredes de brasa (pedaços listrados de perigo com a borda acesa) ──
    if (course.walls) {
      const Wl = course.walls
      const n = Math.round((2 * Wl.hw) / Wl.seg)
      const sg = new SoftGeo()
      // brasa clara (o vão precisa se ler de longe): listras laranja e vermelho-escuro, borda amarela
      const EMBER: RGB = [1, 0.5, 0.12]
      const COAL: RGB = [0.42, 0.1, 0.05]
      // V-Forja (ref. v3): grade de ferro — miolo de brasa (amarelo no pé, vermelho no alto) atrás de barras
      // verticais, colunas e viga rebitada, faixa de perigo no pé. Tudo em box: o vão continua a ler de longe.
      const IRN: RGB = [0.13, 0.11, 0.11]
      const W2 = Wl.seg - 0.08
      const T = Wl.tall
      sg.box(W2 - 0.2, T - 0.7, 0.36, at(0, 0.45 + (T - 0.7) / 2, 0), (_x, y) => mix([1, 1, 0.6], [1, 0.32, 0.06], Math.min(1, Math.max(0, (y + (T - 0.7) / 2) / (T - 0.7)))))
      for (let b = 0; b < 4; b++) sg.box(0.13, T - 0.6, 0.86, at(-W2 / 2 + 0.2 + (b + 0.5) * ((W2 - 0.4) / 4), 0.45 + (T - 0.6) / 2, 0), (_x, y) => (y > (T - 0.6) / 2 - 0.08 ? [0.4, 0.34, 0.3] : IRN))
      for (const sx of [-1, 1]) sg.box(0.24, T, 0.96, at(sx * (W2 / 2 - 0.12), T / 2, 0), (_x, y) => (y > T / 2 - 0.1 ? [0.42, 0.36, 0.32] : IRN))
      sg.box(W2, 0.34, 1.02, at(0, T - 0.05, 0), (_x, y) => (y > 0.1 ? [0.38, 0.3, 0.26] : IRN))
      for (const rx of [-0.3, 0, 0.3]) for (const rz of [-0.52, 0.52]) sg.box(0.12, 0.12, 0.05, at(rx * W2, T - 0.05, rz), [0.72, 0.5, 0.22])
      for (let q = 0; q < 4; q++) sg.box(W2 / 4, 0.42, 1.0, at(-W2 / 2 + (q + 0.5) * (W2 / 4), 0.21, 0), q % 2 ? HAZ_K : HAZ_Y)
      void EMBER
      void COAL
      const segBase = sg.build("gincana-wall", scene, toy, false)
      const lg = new SoftGeo()
      lg.roundBox(Wl.hw * 2, Wl.low, 0.7, 0.12, at(0, Wl.low / 2, 0), (x) => (Math.floor((x + 50) / 1.1) % 2 ? HAZ_Y : HAZ_K), 4)
      lg.roundBox(Wl.hw * 2 + 0.2, 0.22, 0.9, 0.08, at(0, Wl.low, 0), EMBER, 4)
      const lowBase = lg.build("gincana-wall-low", scene, toy, false)
      for (const base of [segBase, lowBase]) {
        base.setEnabled(true)
        base.isVisible = false
        this.wallBases.push(base)
      }
      // ondas ao mesmo tempo na arena: o caminho inteiro na velocidade mais lenta, mais uma
      const waves = Math.ceil((Wl.z0 - Wl.z1) / Wl.v0 / (Wl.every * 0.55)) + 1
      for (let k = 0; k < waves * n; k++) {
        const m = segBase.createInstance(`gincana-wall-${k}`)
        m.isPickable = false
        m.setEnabled(false)
        this.wallSegs.push(m)
      }
      for (let k = 0; k < waves; k++) {
        const m = lowBase.createInstance(`gincana-wall-low-${k}`)
        m.isPickable = false
        m.setEnabled(false)
        this.wallLows.push(m)
      }
    }

    // ── Gincana 3: Rolo de Gelo — cada anel é uma casca de placas de gelo (sem as do buraco), com aros
    // escuros nas juntas, geada clara nas quinas e a boca do buraco acesa (aviso de perigo) ──
    // V-Gelo (ref. v3): pórtico de gelo em cada ponta do rolo — colunas de blocos de gelo com tampa de
    // neve, viga de madeira com cintas de ferro e pingentes grandes, lampião aceso no alto e friso magenta
    if (course.drums.length) {
      const pg = new SoftGeo()
      const pl = new SoftGeo()
      const d0 = course.drums[0]
      const len = d0.rings.reduce((a, r) => a + r.len, 0)
      const top = d0.y + d0.R + 6
      for (const gz of [d0.z0 - 2.2, d0.z0 + len + 2.2]) {
        for (const sx of [-1, 1]) {
          const x = sx * (d0.R + 2.6)
          // coluna em três blocos de gelo (um pouco desencontrados), base mais escura
          for (let b = 0; b < 3; b++) {
            const bh = (top + 0.6) / 3
            pg.box(2.4 - b * 0.15, bh - 0.08, 2.4 - b * 0.15, at(x + (b % 2 ? 0.08 : -0.06), bh * b + bh / 2, gz, b * 0.12), (_x, y) => mix([0.3, 0.58, 0.86], [0.62, 0.86, 1], (y + bh / 2) / bh * 0.7 + b * 0.1))
          }
          pg.box(2.8, 0.7, 2.8, at(x, top + 0.95, gz), (_x, y) => (y > 0 ? [0.96, 0.99, 1] : [0.8, 0.92, 1]))
          for (let k = 0; k < 4; k++) pg.cylinder(0.04, 1 + (k % 2) * 0.8, at(x - 1.1 + k * 0.72, top + 0.1 - (k % 2) * 0.4, gz - 1.35), [0.8, 0.95, 1], 4, 0.34)
          // lampião: gaiola escura e chama acesa
          pg.box(0.8, 0.1, 0.8, at(x, top + 1.35, gz), [0.14, 0.12, 0.12])
          pl.sphere(0.62, at(x, top + 1.8, gz), [1, 0.7, 0.3], 8)
          for (const c of [-0.32, 0.32]) for (const e of [-0.32, 0.32]) pg.box(0.07, 0.8, 0.07, at(x + c, top + 1.75, gz + e), [0.14, 0.12, 0.12])
          pg.cylinder(0.95, 0.4, at(x, top + 2.3, gz), [0.92, 0.97, 1], 4, 0.1)
          // friso magenta aceso no pé da coluna
          pl.box(2.6, 0.14, 2.6, at(x, 0.9, gz), [1, 0.3, 0.7])
        }
        // viga de madeira com cintas de ferro e pingentes grandes
        const span = (d0.R + 2.6) * 2
        pg.box(span, 1.1, 1.3, at(0, top - 0.3, gz), (_x, y) => (y > 0.3 ? [0.5, 0.33, 0.2] : [0.34, 0.2, 0.12]))
        for (let c = -2; c <= 2; c++) pg.box(0.25, 1.2, 1.4, at(c * span * 0.18, top - 0.3, gz), [0.2, 0.2, 0.24])
        pg.box(span, 0.35, 1.5, at(0, top + 0.35, gz), [0.95, 0.98, 1])
        for (let k = 0; k < 9; k++) {
          const ih = 1.2 + ((k * 7) % 5) * 0.5
          pg.cylinder(0.05, ih, at(-span / 2 + 1.5 + k * ((span - 3) / 8), top - 0.85 - ih / 2, gz), (_x, y) => mix([0.55, 0.85, 1], [0.92, 0.98, 1], y / ih + 0.5), 5, 0.55)
        }
      }
      this.meshes.push(pg.build("gincana-ice-gates", scene, toy, true))
      this.meshes.push(pl.build("gincana-ice-gates-lit", scene, this.glowMat, true))
    }

    course.drums.forEach((d, di) => {
      let z0 = d.z0
      d.rings.forEach((ring, ri) => {
        const node = new TransformNode(`gincana-drum-${di}-${ri}`, scene)
        node.position.set(d.x, d.y, z0 + ring.len / 2)
        const g = new SoftGeo()
        const gl = new SoftGeo()
        const N = 56
        const inHole = (m: number) =>
          ring.holes.some((h) => {
            let da = (m - h.a) % (Math.PI * 2)
            if (da > Math.PI) da -= Math.PI * 2
            if (da < -Math.PI) da += Math.PI * 2
            return Math.abs(da) < h.half
          })
        // gelo saturado (a luz da noite puxa para o cinza): base azul, placa sim placa não mais funda
        const ICE_A: RGB = [0.32, 0.66, 0.96]
        const ICE_B: RGB = [0.2, 0.5, 0.86]
        for (let k = 0; k < N; k++) {
          const m = ((k + 0.5) / N) * Math.PI * 2
          if (inHole(m)) continue
          const seg = ((Math.PI * 2) / N) * d.R
          // placa tangente ao cilindro (sin m em x, cos m em y): normal para fora
          const px = Math.sin(m) * (d.R - 0.3)
          const py = Math.cos(m) * (d.R - 0.3)
          g.box(seg + 0.02, 0.6, ring.len - 0.24, at(px, py, 0, 0, 0, -m), (k + ri) % 3 === 0 ? ICE_B : ICE_A)
          // geada clara por cima de cada placa (em listras finas)
          gl.box(seg * 0.5, 0.04, ring.len - 0.7, at(Math.sin(m) * d.R, Math.cos(m) * d.R, 0, 0, 0, -m), k % 2 ? [0.5, 0.78, 0.95] : [0.62, 0.86, 1])
          // boca do buraco: placa de perigo acesa nas duas beiras
          if (inHole(m + (Math.PI * 2) / N) || inHole(m - (Math.PI * 2) / N)) gl.box(seg * 0.9, 0.08, ring.len - 0.3, at(Math.sin(m) * (d.R + 0.04), Math.cos(m) * (d.R + 0.04), 0, 0, 0, -m), [1, 0.35, 0.55])
        }
        // aros escuros nas juntas (a costura dos anéis) e o miolo
        for (const ez of [-ring.len / 2, ring.len / 2]) g.torus(d.R * 2 + 0.1, 0.22, at(0, 0, ez, 0, Math.PI / 2, 0), [0.18, 0.3, 0.46], 48)
        g.cylinder(1.2, ring.len, at(0, 0, 0, 0, Math.PI / 2, 0), [0.2, 0.32, 0.5], 12)
        // setas de giro pintadas nas placas (para que lado o anel anda)
        const sgn = Math.sign(ring.w)
        for (let k = 0; k < 4; k++) {
          const m = (k / 4) * Math.PI * 2 + 0.4
          if (inHole(m)) continue
          gl.box(0.25, 0.04, 1.1, at(Math.sin(m) * (d.R + 0.03), Math.cos(m) * (d.R + 0.03), 0, sgn * 0.6, 0, -m), [1, 0.82, 0.2])
        }
        const mesh = g.build(`gincana-drum-m-${di}-${ri}`, scene, this.toy, false)
        mesh.parent = node
        this.meshes.push(mesh)
        if (gl.vertexCount) {
          const gm = gl.build(`gincana-drum-g-${di}-${ri}`, scene, this.glowMat, false)
          gm.parent = node
          this.meshes.push(gm)
        }
        this.drumNodes.push({ node, d: di, r: ri })
        z0 += ring.len
      })
    })

    // ── Gincana 3: Relógio da Praça — ladrilhos de ardósia com moldura de latão e o vidro escuro onde o
    // símbolo acende; atrás, a torre do relógio com o mostrador que chama o símbolo da rodada ──
    if (course.memory) {
      const M = course.memory
      const S = M.size
      const tg = new SoftGeo()
      const SLATE: RGB = [0.19, 0.17, 0.16]
      const BRASS: RGB = [0.66, 0.46, 0.16]
      tg.roundBox(S, 0.7, S, 0.12, at(0, -0.35, 0), (x, y, z) => (y < -0.25 ? darker(SLATE, 0.6) : mix(SLATE, [0.3, 0.27, 0.24], (Math.sin(x * 3.1) * Math.cos(z * 2.7) + 1) * 0.25)), 6)
      // V-Centro: o corpo do ladrilho em pedra de cantaria (clara em cima, escura no pé) com cinta de latão
      // e rebites — não uma chapa preta; embaixo, o "pião" curto de pedra
      tg.box(S - 0.04, 0.9, S - 0.04, at(0, -1.15, 0), (_x, y) => mix([0.24, 0.2, 0.17], [0.56, 0.5, 0.42], y + 0.45))
      tg.box(S + 0.02, 0.16, S + 0.02, at(0, -0.78, 0), BRASS)
      for (const sx of [-1, 1]) for (const u of [-0.3, 0, 0.3]) {
        tg.box(0.1, 0.1, 0.06, at(u * S, -0.78, sx * (S / 2 + 0.02)), [0.9, 0.74, 0.38])
        tg.box(0.06, 0.1, 0.1, at(sx * (S / 2 + 0.02), -0.78, u * S), [0.9, 0.74, 0.38])
      }
      tg.cylinder(S * 0.7, 1.1, at(0, -2.15, 0, Math.PI / 4), (_x, y) => mix([0.16, 0.13, 0.12], [0.36, 0.3, 0.26], y + 0.55), 4, S * 1.05)
      for (const s of [-1, 1]) {
        tg.roundBox(S - 0.1, 0.1, 0.2, 0.04, at(0, 0.03, s * (S / 2 - 0.12)), BRASS, 3)
        tg.roundBox(0.2, 0.1, S - 0.1, 0.04, at(s * (S / 2 - 0.12), 0.03, 0), BRASS, 3)
        for (const u of [-1, 1]) tg.cylinder(0.16, 0.08, at(s * (S / 2 - 0.12), 0.08, u * (S / 2 - 0.12)), [0.9, 0.74, 0.38], 8)
      }
      // vidro escuro com aro interno de cobre (o símbolo acende em cima dele)
      tg.roundBox(S * 0.74, 0.04, S * 0.74, 0.03, at(0, 0.01, 0), [0.06, 0.06, 0.08], 3)
      for (const s of [-1, 1]) {
        tg.roundBox(S * 0.78, 0.05, 0.06, 0.02, at(0, 0.02, s * S * 0.38), [0.55, 0.28, 0.16], 2)
        tg.roundBox(0.06, 0.05, S * 0.78, 0.02, at(s * S * 0.38, 0.02, 0), [0.55, 0.28, 0.16], 2)
      }
      const tileBase = tg.build("gincana-mem-tile", scene, toy, false)
      tileBase.isVisible = false
      this.memBases.push(tileBase)
      const N = M.n * M.n
      for (let i = 0; i < N; i++) {
        const q = memTile(M, i)
        const inst = tileBase.createInstance("gincana-mem-" + i)
        inst.position.set(q.x, M.y, q.z)
        inst.isPickable = false
        this.memTiles.push(inst)
      }
      for (let s = 0; s < 6; s++) {
        const sg = new SoftGeo()
        memSymbolGeo(sg, s, 1)
        const sb = sg.build("gincana-mem-sym-" + s, scene, this.glowMat, false)
        sb.isVisible = false
        this.memBases.push(sb)
        const row: InstancedMesh[] = []
        for (let i = 0; i < N; i++) {
          const q = memTile(M, i)
          const inst = sb.createInstance("gincana-mem-sym-" + s + "-" + i)
          inst.position.set(q.x, M.y + 0.07, q.z)
          inst.isPickable = false
          inst.setEnabled(false)
          row.push(inst)
        }
        this.memSyms.push(row)
        // o mesmo símbolo, grande, no mostrador (de pé, virado para a praça)
        const fg = new SoftGeo()
        memSymbolGeo(fg, s, 1.7)
        const face = fg.build("gincana-mem-face-" + s, scene, this.glowMat, false)
        face.rotation.x = -Math.PI / 2
        face.setEnabled(false)
        this.memFace.push(face)
      }
      // a torre do relógio (atrás da grade, sobre o canal)
      const TZ = M.z + (M.n * (S + M.gap)) / 2 + 5.5
      const FY = M.y + 12
      const tw = new SoftGeo()
      const BRICK: RGB = [0.42, 0.2, 0.14]
      tw.roundBox(6.4, 3.2, 6.4, 0.2, at(0, M.y - 1.6, TZ), [0.3, 0.28, 0.26], 4)
      // V-Centro: o fuste em FIADAS de tijolo de verdade (a pintura por vértice não aparecia: a caixa não
      // tem vértice no meio) — núcleo de argamassa escura e fiadas de 0,5 m em três tons, saltando 2 cm
      tw.box(4.92, 17, 4.92, at(0, M.y + 8.5, TZ), [0.2, 0.14, 0.12])
      const TONES: RGB[] = [BRICK, mix(BRICK, [0.62, 0.34, 0.22], 0.5), darker(BRICK, 0.82)]
      for (let r = 0; r < 34; r++) {
        const y = M.y + 0.25 + r * 0.5
        const stoneBand = r < 2 || r > 31
        tw.box(5 + (r % 2) * 0.04, 0.44, 5 + ((r + 1) % 2) * 0.04, at(0, y, TZ), stoneBand ? [0.62, 0.56, 0.48] : TONES[(r * 7) % 3])
      }
      // janelas em arco com caixilho de latão (três em cima, três embaixo) e a moldura escura
      for (const wy of [M.y + 5.4, M.y + 17.6]) {
        for (const wx of [-1.3, 0, 1.3]) {
          tw.box(0.86, 1.7, 0.1, at(wx, wy, TZ - 2.53), [0.16, 0.12, 0.1])
          tw.cylinder(0.86, 0.1, at(wx, wy + 0.85, TZ - 2.53, 0, Math.PI / 2, 0), [0.16, 0.12, 0.1], 10)
        }
      }
      // cintas de pedra clara, pilastras de latão nas quinas
      for (const y of [M.y + 3, M.y + 8.6, M.y + 16]) tw.roundBox(5.4, 0.4, 5.4, 0.1, at(0, y, TZ), [0.66, 0.6, 0.52], 3)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) tw.cylinder(0.34, 17, at(sx * 2.5, M.y + 8.5, TZ + sz * 2.5), BRASS, 8)
      // mostrador: aro de latão, fundo creme, 12 marcas
      tw.cylinder(5.6, 0.3, at(0, FY, TZ - 2.6, 0, Math.PI / 2, 0), BRASS, 32)
      tw.cylinder(5.0, 0.32, at(0, FY, TZ - 2.62, 0, Math.PI / 2, 0), (x, _y, z) => mix([0.93, 0.88, 0.74], [0.8, 0.72, 0.56], Math.hypot(x, z) / 2.5), 32)
      for (let h = 0; h < 12; h++) {
        const a = (h / 12) * Math.PI * 2
        tw.roundBox(h % 3 ? 0.12 : 0.22, h % 3 ? 0.4 : 0.6, 0.06, 0.02, at(Math.sin(a) * 2.15, FY + Math.cos(a) * 2.15, TZ - 2.8, 0, 0, -a), [0.12, 0.1, 0.08], 2)
      }
      // telhado de cobre esverdeado em pirâmide + agulha
      tw.cylinder(7.6, 4.2, at(0, M.y + 19.2, TZ, Math.PI / 4), [0.22, 0.5, 0.42], 4, 0)
      tw.cylinder(0.14, 2.6, at(0, M.y + 22.4, TZ), BRASS, 6)
      // janelas acesas (âmbar) em cima e embaixo do mostrador
      const tl = new SoftGeo()
      for (const y of [M.y + 5.4, M.y + 15]) for (const x of [-1.1, 0, 1.1]) tl.roundBox(0.6, 1.3, 0.06, 0.05, at(x, y, TZ - 2.53), [1, 0.66, 0.24], 2)
      for (let k = 0; k < 4; k++) tl.cylinder(0.3, 0.08, at(Math.sin(k * 1.57) * 2.45, FY + Math.cos(k * 1.57) * 2.45, TZ - 2.82, 0, Math.PI / 2, 0), [1, 0.8, 0.4], 8)
      this.meshes.push(tw.build("gincana-mem-tower", scene, toy, true))
      this.meshes.push(tl.build("gincana-mem-tower-lit", scene, this.glowMat, true))
      for (const f of this.memFace) f.position.set(0, FY, TZ - 2.85)
      // ponteiro (gira até o fim do chamado)
      const hand = new TransformNode("gincana-mem-hand", scene)
      hand.position.set(0, FY, TZ - 2.9)
      const hg = new SoftGeo()
      hg.roundBox(0.18, 2.2, 0.08, 0.04, at(0, 1.0, 0), [0.1, 0.08, 0.06], 2)
      hg.cylinder(0.4, 0.12, at(0, 0, 0, 0, Math.PI / 2, 0), BRASS, 10)
      const hm = hg.build("gincana-mem-hand-m", scene, toy, false)
      hm.parent = hand
      this.meshes.push(hm)
      this.memHand = hand
    }

    // ── Gincana 3: Feira Rolante — barracas dos dois lados (balcão de madeira, toldo listrado, frutas
    // empilhadas, lampião), em cima de estacas no canal; o toldo alterna vermelho e verde ──
    if (theme.id === "feira") {
      const bg = new SoftGeo()
      const lit = new SoftGeo()
      const WOOD: RGB = [0.42, 0.26, 0.14]
      const AWN: RGB[] = [[0.78, 0.16, 0.12], [0.16, 0.5, 0.26], [0.86, 0.56, 0.12]]
      const FRUIT: RGB[] = [[0.2, 0.52, 0.18], [1, 0.55, 0.1], [0.82, 0.12, 0.14], [0.95, 0.85, 0.2]]
      const stall = (sx: number, z: number, y: number, n: number) => {
        const x = sx * 9.6
        for (const dz of [-1.6, 1.6]) bg.cylinder(0.35, y + 0.6, at(x + sx * 0.6, (y - 0.6) / 2, z + dz), [0.3, 0.2, 0.12], 6)
        bg.roundBox(3.2, 0.3, 4.2, 0.06, at(x, y, z), [0.36, 0.3, 0.24], 3)
        // balcão virado para a pista, com tábuas
        bg.roundBox(1.2, 1.1, 3.8, 0.06, at(x - sx * 0.8, y + 0.7, z), (_x, yy) => (Math.floor((yy + 10) / 0.22) % 2 ? WOOD : darker(WOOD, 0.8)), 4)
        for (const dz of [-1.9, 1.9]) for (const dx of [-1.4, 1.4]) bg.cylinder(0.14, 2.8, at(x + dx, y + 1.55, z + dz), WOOD, 6)
        // toldo inclinado para a pista, listrado
        const c = AWN[n % AWN.length]
        // listras em FAIXAS (a pintura por vértice não aparecia: o toldo saía branco) e a franja recortada
        for (let q = 0; q < 8; q++) bg.box(3.6, 0.1, 4.6 / 8 + 0.01, at(x - sx * 0.2, y + 3.1, z - 2.3 + (q + 0.5) * (4.6 / 8), 0, 0, sx * 0.28), q % 2 ? c : [0.95, 0.92, 0.84])
        for (let q = 0; q < 8; q++) bg.box(0.06, 0.32, 4.6 / 8 - 0.06, at(x + sx * 1.55, y + 2.6, z - 2.3 + (q + 0.5) * (4.6 / 8)), q % 2 ? c : [0.95, 0.92, 0.84])
        // frutas no balcão (pilhas de 3 tipos)
        for (let i = 0; i < 9; i++) {
          const fz = z - 1.5 + (i % 3) * 1.5 + (Math.floor(i / 3) - 1) * 0.3
          const f = FRUIT[(i + n) % FRUIT.length]
          bg.sphere(i % 3 === 1 ? 0.55 : 0.36, at(x - sx * (0.7 + Math.floor(i / 3) * 0.25), y + 1.42 + Math.floor(i / 3) * 0.18, fz), f, 8)
        }
        // lampião na quina
        bg.cylinder(0.08, 1.2, at(x - sx * 1.5, y + 3.5, z + 2.1), [0.15, 0.13, 0.12], 5)
        lit.sphere(0.36, at(x - sx * 1.5, y + 2.9, z + 2.1), [1, 0.72, 0.3], 8)
      }
      const rampY = (z: number) => DECK + (3 * Math.max(0, Math.min(24.9, z - 15.1))) / 24.9
      let n = 0
      for (const z of [20, 28, 36]) for (const sx of [-1, 1]) stall(sx, z, rampY(z), n++)
      for (const z of [56, 70]) for (const sx of [-1, 1]) stall(sx, z, DECK + 3, n++)
      this.meshes.push(bg.build("gincana-feira-stalls", scene, toy, true))
      this.meshes.push(lit.build("gincana-feira-lit", scene, this.glowMat, true))
    }

    // ── Gincana 3: o topo que vale ponto (anel aceso na beira + coroa no meio) ──
    if (course.zone) {
      const Z = course.zone
      const zg = new SoftGeo()
      zg.torus(Z.r * 2, 0.16, at(0, 0, 0), [1, 0.82, 0.2], 64)
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        zg.cylinder(0.12, 0.5, at(Math.cos(a) * 0.5, 1.35, Math.sin(a) * 0.5, 0, 0, 0), [1, 0.86, 0.3], 6, 0.02)
      }
      // a coroa fica em cima do pilar do meio
      zg.torus(1.1, 0.14, at(0, 1.1, 0), [1, 0.86, 0.3], 24)
      this.zoneRing = zg.build("gincana-zone", scene, this.glowMat, false)
      this.zoneRing.position.set(Z.x, Z.y + 0.06, Z.z)
      this.zoneRing.isPickable = false
    }

    // ── Gincana 3: Coroa da Torre — a coroa no alto do estrado (aro, 5 pontas com pérola, faixa de
    // rubis) e o pedestal de latão embaixo; gira e sobe e desce devagar ──
    if (course.crown) {
      const GOLD: RGB = [1, 0.8, 0.18]
      const cg = new SoftGeo()
      cg.cylinder(1.5, 0.42, at(0, 0, 0), GOLD, 24)
      cg.torus(1.56, 0.08, at(0, -0.2, 0), mix(GOLD, WHITE, 0.3), 24)
      cg.torus(1.56, 0.08, at(0, 0.2, 0), mix(GOLD, WHITE, 0.3), 24)
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        cg.cylinder(0.34, 0.62, at(Math.cos(a) * 0.72, 0.5, Math.sin(a) * 0.72), GOLD, 6, 0.04)
        cg.sphere(0.26, at(Math.cos(a) * 0.72, 0.86, Math.sin(a) * 0.72), [1, 0.96, 0.86], 6)
        cg.sphere(0.22, at(Math.cos(a + 0.63) * 0.8, 0, Math.sin(a + 0.63) * 0.8), [0.9, 0.08, 0.16], 6)
      }
      this.crownMesh = cg.build("gincana-crown", scene, this.glowMat, false)
      this.crownMesh.position.set(0, course.finishY + 0.5, course.finishZ)
      this.crownMesh.isPickable = false
      // pedestal: coluna de latão com anel aceso
      const top = course.finishY - 1.1
      const pg = new SoftGeo()
      const pl = new SoftGeo()
      pg.cylinder(1.2, 0.5, at(0, top + 0.25, course.finishZ + 1.6), SP.brassDark, 10)
      pl.torus(2.8, 0.12, at(0, top + 0.06, course.finishZ), [1, 0.84, 0.3], 32)
      this.meshes.push(pg.build("gincana-crown-base", scene, toy, true))
      this.meshes.push(pl.build("gincana-crown-lit", scene, this.glowMat, true))
    }

    // ── Gincana 3: engrenagens (latão; a dourada, que vale 3, maior e amarela) ──
    if (course.gems.length) {
      const bases = new Map<number, Mesh>()
      for (const v of [...new Set(course.gems.map((g) => g.v))]) {
        const s = v >= 3 ? 1.35 : 1
        const col: RGB = v >= 3 ? [1, 0.82, 0.18] : [0.86, 0.6, 0.26]
        const gg = new SoftGeo()
        // de pé (o eixo em z): anel com 10 dentes e o miolo
        // V-Fábrica: aro vazado com quatro raios e miolo escuro (peça de latão, não um disco chapado)
        gg.torus(1.0 * s, 0.24 * s, at(0, 0, 0, 0, Math.PI / 2, 0), col, 20)
        gg.cylinder(0.4 * s, 0.34, at(0, 0, 0, 0, Math.PI / 2, 0), darker(col, 0.5), 10)
        gg.cylinder(0.18 * s, 0.4, at(0, 0, 0, 0, Math.PI / 2, 0), mix(col, WHITE, 0.5), 6)
        for (let r = 0; r < 4; r++) gg.box(0.14 * s, 0.62 * s, 0.16, at(Math.cos((r / 4) * Math.PI * 2) * 0.3 * s, Math.sin((r / 4) * Math.PI * 2) * 0.3 * s, 0, 0, 0, (r / 4) * Math.PI * 2 - Math.PI / 2), mix(col, WHITE, 0.15))
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2
          gg.roundBox(0.28 * s, 0.3 * s, 0.24, 0.05, at(Math.cos(a) * 0.62 * s, Math.sin(a) * 0.62 * s, 0, 0, 0, a), col, 3)
        }
        // acesa (é o alvo da prova: precisa ler no chão escuro); o vazado e o miolo escuro dão a forma de peça
        const base = gg.build(`gincana-gem-${v}`, scene, this.glowMat, false)
        base.setEnabled(true)
        base.isVisible = false
        bases.set(v, base)
        this.gemBases.push(base)
      }
      course.gems.forEach((g, i) => {
        const m = bases.get(g.v)!.createInstance(`gincana-gem-i${i}`)
        m.position.set(g.x, g.y, g.z)
        m.isPickable = false
        this.gemMeshes.push(m)
      })
    }

    // ── portas (todas iguais por fora: as de verdade tombam quando alguém passa) ──
    if (course.doors.length) {
      const d0 = course.doors[0]
      const dg = new SoftGeo()
      if (theme.deco === "city") {
        // Prefeitura (G3-11): porta dupla de madeira pintada de verde-garrafa, almofadas mais claras,
        // moldura e puxadores de latão e a janelinha redonda âmbar (as falsas são iguais por fora)
        const W = d0.hw * 2 - 0.12
        const H = d0.h
        const GREEN: RGB = [0.1, 0.27, 0.2]
        const PANEL: RGB = [0.15, 0.36, 0.27]
        dg.roundBox(W, H, 0.34, 0.06, at(0, H / 2, 0), (x, y) => {
          const ax = Math.abs(x)
          if (ax < 0.04) return [0.05, 0.12, 0.09]
          const inPanel = ax > 0.16 && ax < W / 2 - 0.2 && ((y > 0.3 && y < H * 0.42) || (y > H * 0.5 && y < H - 0.3))
          return inPanel ? PANEL : GREEN
        }, 6)
        for (const sz of [-1, 1]) {
          const z = sz * 0.19
          // V-Centro: almofadas em RELEVO (a pintura por vértice não aparecia) — quatro por folha, mais claras
          // em cima (quina que pega luz), e a fresta escura do meio
          for (const sx of [-1, 1]) {
            const px = sx * (W / 4 + 0.02)
            const pw = W / 2 - 0.42
            for (const [y0, y1] of [[0.32, H * 0.42], [H * 0.52, H - 0.32]] as [number, number][]) {
              const ph = y1 - y0
              dg.box(pw, ph, 0.05, at(px, y0 + ph / 2, z + sz * 0.005), (_x, y) => (y > ph / 2 - 0.05 ? mix(PANEL, [0.5, 0.7, 0.55], 0.35) : PANEL))
              dg.box(pw - 0.2, ph - 0.2, 0.05, at(px, y0 + ph / 2, z + sz * 0.03), darker(PANEL, 0.88))
            }
          }
          dg.box(0.05, H - 0.2, 0.03, at(0, H / 2, z + sz * 0.02), [0.04, 0.08, 0.06])
          dg.roundBox(W, 0.14, 0.08, 0.03, at(0, H - 0.07, z), [0.7, 0.5, 0.18], 2)
          dg.roundBox(0.12, H, 0.08, 0.03, at(-W / 2 + 0.06, H / 2, z), [0.7, 0.5, 0.18], 2)
          dg.roundBox(0.12, H, 0.08, 0.03, at(W / 2 - 0.06, H / 2, z), [0.7, 0.5, 0.18], 2)
          dg.cylinder(0.78, 0.08, at(0, H * 0.74, z, 0, Math.PI / 2, 0), [0.7, 0.5, 0.18], 16)
          dg.cylinder(0.6, 0.1, at(0, H * 0.74, z, 0, Math.PI / 2, 0), [1, 0.74, 0.32], 16)
          for (const sx of [-1, 1]) dg.sphere(0.16, at(sx * 0.2, H * 0.46, z * 1.25), [0.92, 0.72, 0.3], 8)
        }
      } else {
        dg.roundBox(d0.hw * 2 - 0.1, d0.h, 0.4, 0.12, at(0, d0.h / 2, 0), (x, y) => ((Math.abs(x) * 1.6 + y) % 1.2 < 0.6 ? C[2] : WHITE), 6)
        dg.sphere(0.5, at(-d0.hw * 0.5, d0.h * 0.82, -0.25), C[1], 8)
        dg.sphere(0.5, at(d0.hw * 0.5, d0.h * 0.82, -0.25), C[1], 8)
      }
      // a fileira ganha um pórtico: pilares de pedra nas pontas, viga de ferro com cinta de latão e o relógio no meio
      const rows = new Map<number, { z: number; x0: number; x1: number }>()
      for (const d of course.doors) {
        const r = rows.get(d.row) ?? { z: d.z, x0: Infinity, x1: -Infinity }
        r.x0 = Math.min(r.x0, d.x - d.hw)
        r.x1 = Math.max(r.x1, d.x + d.hw)
        rows.set(d.row, r)
      }
      const pg = new SoftGeo()
      const pl = new SoftGeo()
      for (const r of rows.values()) {
        const top = DECK + d0.h + 0.5
        for (const x of [r.x0 - 0.45, r.x1 + 0.45]) {
          pg.roundBox(0.8, top - DECK + 0.6, 0.9, 0.08, at(x, (top + DECK) / 2 - 0.2, r.z), [0.62, 0.56, 0.48], 4)
          pg.roundBox(1.0, 0.3, 1.1, 0.06, at(x, top + 0.25, r.z), [0.5, 0.44, 0.38], 3)
          pg.sphere(0.5, at(x, top + 0.62, r.z), [0.7, 0.5, 0.18], 10)
        }
        pg.roundBox(r.x1 - r.x0 + 0.4, 0.5, 0.5, 0.08, at((r.x0 + r.x1) / 2, top, r.z), (x) => (Math.abs(Math.sin(x * 1.3)) < 0.18 ? [0.7, 0.5, 0.18] : [0.12, 0.11, 0.12]), 4)
        pg.cylinder(1.5, 0.3, at((r.x0 + r.x1) / 2, top + 0.8, r.z, 0, Math.PI / 2, 0), [0.7, 0.5, 0.18], 20)
        pl.cylinder(1.2, 0.34, at((r.x0 + r.x1) / 2, top + 0.8, r.z, 0, Math.PI / 2, 0), [0.98, 0.9, 0.7], 20)
      }
      if (theme.deco === "city") {
        this.meshes.push(pg.build("gincana-door-arch", scene, toy, true))
        this.meshes.push(pl.build("gincana-door-arch-lit", scene, this.glowMat, true))
      }
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
      // rampa-esteira (Feira Rolante): o plano acompanha a subida
      const rise = p.k === 2 ? p.y2 - p.y : 0
      const h = p.bz !== 0 ? Math.hypot(p.hz * 2, rise) - 0.4 : p.hx * 2 - 0.4
      const mesh = CreateGround("gincana-belt-plane", { width: w, height: h }, scene)
      mesh.material = mat
      mesh.position.set(p.x, (p.y + p.y2) / 2 + 0.035, p.z)
      // a seta do desenho aponta para +v: gira o plano para a direção da esteira
      mesh.rotation.y = Math.atan2(p.bx, p.bz) + Math.PI
      if (rise) mesh.rotation.x = (p.bz < 0 ? -1 : 1) * Math.atan2(rise, p.hz * 2)
      mesh.isPickable = false
      this.belts.push({ tex, mat, mesh, speed: Math.hypot(p.bx, p.bz) / 2 })
    }

    // logo da Freelandoo girando sobre o arco da chegada
    // o logo grande: em cima da chegada; na arena, no alto, atrás do meio
    const topY = Math.max(DECK, ...course.tiles.map((q) => q.y), ...course.pads.map((p) => p.y))
    this.logos = buildLogos(scene, [{ id: 1, at: course.mode === "race" ? new Vector3(0, course.finishY + 9.6, course.finishZ) : new Vector3(0, topY + 12, 26) }], low, 1.6)

    // ── dia e noite: relógio de Brasília (ou a noite fixa do tema) ──
    this.timer = setInterval(() => this.applyTime(), 20000)
    if (process.env.NODE_ENV !== "production") (window as unknown as { __mmSetHour?: (h: number | null) => void }).__mmSetHour = this.devHour
    if (process.env.NODE_ENV !== "production") (window as unknown as { __gincanaScene?: Scene }).__gincanaScene = scene
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
    if (F.kind === "swamp") {
      // pântano aceso (Floresta, ref. v3): fundo esmeralda escuro, manchas que brilham, ondas claras em anel e algas escuras
      const blot = (x: number, y: number, r: number, c0: string) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r)
        gr.addColorStop(0, c0)
        gr.addColorStop(1, "rgba(0,0,0,0)")
        g.fillStyle = gr
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2)
      }
      for (let i = 0; i < 9; i++) blot((i * 89) % 256, (i * 151) % 256, 40 + (i % 3) * 18, "rgba(30,210,110,0.55)")
      for (let i = 0; i < 6; i++) blot((i * 113 + 40) % 256, (i * 71 + 90) % 256, 30 + (i % 2) * 14, "rgba(2,20,12,0.6)")
      g.strokeStyle = F.streak
      g.lineWidth = 0.9
      for (let i = 0; i < 12; i++) {
        const x = (i * 97 + 13) % 256
        const y = (i * 61 + 29) % 256
        const r = 4 + (i % 4) * 2.5
        // anéis concêntricos que esmaecem para fora (a onda de algo que caiu)
        for (let k = 0; k < 3; k++) {
          g.globalAlpha = (0.55 - k * 0.16) * (0.7 + (i % 3) * 0.15)
          g.beginPath()
          g.ellipse(x, y, r * (1 + k * 0.7), r * (1 + k * 0.7) * 0.8, 0, 0, Math.PI * 2)
          g.stroke()
        }
      }
      // brilho de superfície: traços curtos e finos
      g.globalAlpha = 0.4
      for (let i = 0; i < 40; i++) {
        const x = (i * 53 + 7) % 256
        const y = (i * 131 + 3) % 256
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + 5 + (i % 3) * 3, y)
        g.stroke()
      }
      g.globalAlpha = 1
    } else if (F.kind === "void") {
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
    tex.uScale = F.kind === "lava" ? 40 : F.kind === "swamp" ? 34 : 70
    tex.vScale = F.kind === "lava" ? 40 : F.kind === "swamp" ? 34 : 70
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
    // Feira Rolante: melancia (listras verde-escuro e verde-claro ao longo do eixo)
    if (this.theme.id === "feira") return (x, _y, z) => (Math.abs(Math.sin(Math.atan2(x, z) * 5)) < 0.42 ? [0.1, 0.36, 0.12] : [0.36, 0.66, 0.22])
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
    if (d === "forest") {
      this.forestArch(st, glow, z, y)
      return
    }
    const C = this.C
    for (const s of [-1, 1]) {
      st.cylinder(1.2, 7.6, at(s * 7.6, y + 3.8, z), stripesY(C[4], C[7], 0.8, 0), 12)
      glow.sphere(1.1, at(s * 7.6, y + 8, z), C[1], 8)
    }
    st.roundBox(16.4, 0.9, 1.2, 0.3, at(0, y + 7.4, z), C[4], 4)
    glow.roundBox(15, 0.3, 1.3, 0.1, at(0, y + 7.1, z), d === "orbital" ? [0.4, 0.9, 1] : d === "ice" ? [0.7, 0.95, 1] : [1, 0.7, 0.3], 2)
  }

  /**
   * Floresta (ref. v3): arco de cipó — dois troncos retorcidos (casca em gomos, raízes no pé), o cipó em
   * arco trançado (duas voltas), tufos de folha e flores acesas (rosa com miolo claro) com vaga-lumes.
   */
  private forestArch(st: SoftGeo, glow: SoftGeo, z: number, y: number) {
    const BARK = (x: number, yy: number, zz: number): RGB => {
      const n = Math.sin(Math.atan2(zz, x) * 7 + yy * 0.9)
      return n > 0.45 ? [0.17, 0.1, 0.08] : n < -0.6 ? [0.42, 0.28, 0.2] : [0.3, 0.19, 0.13]
    }
    const LEAF: RGB[] = [[0.08, 0.32, 0.2], [0.12, 0.42, 0.26], [0.2, 0.55, 0.3]]
    const R = 7.6
    for (const s of [-1, 1]) {
      // tronco em 4 gomos que torcem para dentro, mais largo no pé
      let px = s * R
      let pz = z
      for (let k = 0; k < 4; k++) {
        const nx = s * (R - 0.25 * k) + Math.sin(k * 2.1 + s) * 0.25
        const nz = z + Math.cos(k * 1.7 + s) * 0.3
        st.tube(new Vector3(px, y + k * 1.9 - 0.2, pz), new Vector3(nx, y + (k + 1) * 1.9, nz), 0.62 - k * 0.07, BARK, 9)
        px = nx
        pz = nz
      }
      // raízes abertas no chão
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4 * s
        st.tube(new Vector3(s * R, y + 1.2, z), new Vector3(s * R + Math.cos(a) * 1.5, y - 0.1, z + Math.sin(a) * 1.5), 0.24, BARK, 6)
      }
      st.cylinder(2.6, 0.02, at(s * R, y + 0.012, z), [0.04, 0.1, 0.08], 12)
    }
    // o cipó: duas tranças em arco (de tronco a tronco), com folhas e flores
    const arc = (u: number, ph: number, rr: number) => {
      const a = Math.PI * u
      return new Vector3(-Math.cos(a) * (R - 0.8) + Math.sin(u * 30 + ph) * rr, y + 7 + Math.sin(a) * 2.2 + Math.cos(u * 30 + ph) * rr, z + Math.sin(u * 30 + ph + 1) * rr)
    }
    const N = 28
    for (const ph of [0, Math.PI]) {
      for (let i = 0; i < N; i++) st.tube(arc(i / N, ph, 0.22), arc((i + 1) / N, ph, 0.22), 0.16, [0.22, 0.3, 0.14], 6)
    }
    for (let i = 0; i <= 16; i++) {
      const u = i / 16
      const c = arc(u, 0, 0)
      const leaf = LEAF[i % 3]
      st.sphere(1.1 + (i % 3) * 0.25, at(c.x, c.y + 0.1, c.z + ((i % 2) - 0.5) * 0.5), leaf, 7, 1, 0.55, 1)
      // folhas penduradas
      if (i % 2 === 0) st.sphere(0.55, at(c.x + 0.3, c.y - 0.45 - (i % 4) * 0.08, c.z - 0.2), LEAF[(i + 1) % 3], 5, 1, 1.3, 0.5)
      if (i % 3 === 1) {
        // flor acesa: 5 pétalas rosa + miolo claro (na frente do cipó)
        const fz = c.z - 0.75
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2
          glow.sphere(0.5, at(c.x + Math.cos(a) * 0.34, c.y + Math.sin(a) * 0.34, fz), [1, 0.36, 0.82], 5, 1, 1, 0.45)
        }
        glow.sphere(0.28, at(c.x, c.y, fz - 0.08), [1, 0.92, 0.6], 5)
      }
      if (i % 4 === 2) glow.sphere(0.13, at(c.x - 0.4, c.y - 1.1, c.z - 1), [1, 0.95, 0.4], 4)
    }
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
    // a prova é um programa de TV: de noite a luz baixa só até a metade (o céu escurece inteiro; o neon acende)
    // V-Gelo: a noite polar vai mais fundo (luz fria; na metade o sol ainda é de fim de tarde e o gelo sai bege)
    applyLights(this.scene, n * (this.theme.deco === "ice" ? 0.85 : 0.55))
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
    if (this.auroraMat) this.auroraMat.alpha = 0.1 + 0.3 * n
    const k = 0.14 - 0.08 * n + (this.lava ? 0.08 : 0)
    this.toy.emissiveColor.set(k, k * (this.lava ? 0.7 : 1), k * (this.lava ? 0.5 : 1))
    // V-Gelo: o gelo brilha sozinho na noite polar (o branco vira ciano-gelo, como na referência)
    if (this.theme.deco === "ice") this.toy.emissiveColor.set(0.12 + 0.08 * n, 0.22 + 0.14 * n, 0.32 + 0.16 * n)
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
    const city0 = this.theme.deco === "city"
    // largada e chegada: o palco do programa, na cor de destaque da fase (fora da cidade)
    const stage = !city0 && (p.s === 0 || p.s === 6) && p.c === 6
    const d0 = this.theme.deco
    // piso escuro onde o rejunte acende (Orbital = ardósia roxa, Forja = ferro), gelo puxado para o ciano
    const tint = (c: RGB): RGB => (d0 === "forest" ? mix(c, [0.1, 0.34, 0.32], 0.3) : d0 === "orbital" ? mix(c, [0.13, 0.11, 0.24], 0.6) : d0 === "forge" ? mix(c, [0.15, 0.13, 0.13], 0.62) : d0 === "ice" ? mix(c, [0.55, 0.82, 0.96], 0.35) : d0 === "factory" ? mix(c, [0.19, 0.2, 0.22], 0.78) : c)
    // Floresta: todo o chão no verde-azulado da referência (a cor da peça só puxa um pouco)
    const top = d0 === "forest" ? mix(C[5], C[p.c], stage ? 0 : 0.18) : stage ? mix(this.neon, C[6], 0.62) : tint(C[p.c])
    // Floresta (ref. v3): moldura magenta em toda a pista
    const rim: RGB = d0 === "forest" ? [0.78, 0.16, 0.56] : d0 === "orbital" ? [0.34, 0.27, 0.54] : C[p.rim]
    const body = darker(top, 0.62)
    const city = this.theme.deco === "city"
    const { pavers, cobble } = this.stage.ctx
    const ice = p.f < 0.7
    if (this.theme.id === "comportas") {
      if (comportasPad(g, glow, p)) return
      comportasFloor(g, glow, p)
    }
    if (p.k === 0 && dyn && p.mw > 0 && d0 === "forest") return this.lilyPad(g, glow, p)
    if (this.theme.id === "clareira" && isClareiraSlice(p)) return spinSlice(g, glow, p)
    if (this.theme.id === "clareira" && isClareiraStump(p)) return spinStump(g, glow, p)
    if (this.theme.id === "clareira" && isClareiraLily(p)) return giantLily(g, glow, p)
    if (this.theme.id === "clareira" && isClareiraLog(p)) return fallenLog(g, glow, p)
    if (this.theme.id === "clareira" && isClareiraStone(p)) return mossStone(g, p)
    if (this.theme.id === "clareira" && isClareiraCannon(p)) return hollowLog(g, glow, p)
    if (this.theme.id === "clareira" && isClareiraFloor(p)) {
      clearingFloor(g, glow, p, dyn)
      // largada e chegada: a cerca da Floresta
      if (!dyn && (p.s === 0 || p.s === 6) && p.y2 === p.y && p.hx >= 3) this.bollards(g, glow, p)
      return
    }
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
      } else if (d0 === "orbital" && p.r >= 5) {
        // V-Orbital (ref. v3): ladrilhos hexagonais de ardósia roxa sobre uma chapa de neon (o rejunte acende),
        // um em cada nove aceso em magenta; o anel de neon em volta do eixo mostra o giro
        glow.cylinder((p.r - 1.45) * 2, 0.02, at(p.x, p.y + 0.015, p.z), this.neon, 40)
        const R = 1.05
        const cw = 1.5 * R
        const rh = Math.sqrt(3) * R
        let i = 0
        for (let lx = -p.r; lx <= p.r; lx += cw, i++) {
          let j = 0
          for (let lz = -p.r + (i % 2 ? rh / 2 : 0); lz <= p.r; lz += rh, j++) {
            if (Math.hypot(lx, lz) > p.r - 1.6 || Math.hypot(lx, lz) < 1.6) continue
            const hsh = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1
            const at6 = at(p.x + lx, p.y + 0.06, p.z + lz)
            if (hsh < 0.08) glow.cylinder(R * 1.97, 0.08, at6, [1, 0.28, 0.8], 6, R * 1.86)
            else g.cylinder(R * 1.97, 0.08, at6, hsh < 0.5 ? top : hsh < 0.8 ? mix(top, [0.4, 0.34, 0.62], 0.35) : darker(top, 0.8), 6, R * 1.86)
          }
        }
        glow.torus(3.6, 0.16, at(p.x, p.y + 0.1, p.z), [1, 0.3, 0.8], 24)
      } else {
        // anel e raios no tampo (mostram o giro)
        g.torus((p.r - 0.6) * 2, 0.12, at(p.x, p.y + 0.02, p.z), mix(top, C[7], 0.5), 40)
        // v2: alvo aceso no miolo do disco (dois anéis de neon), como os discos das referências
        glow.torus(p.r * 1.1, 0.14, at(p.x, p.y + 0.04, p.z), this.neon, 18)
        glow.torus(p.r * 0.45, 0.14, at(p.x, p.y + 0.04, p.z), this.neon, 12)
        if (p.spin !== 0) for (let k = 0; k < 6; k++) g.roundBox(0.3, 0.05, p.r * 1.7, 0.02, at(p.x, p.y + 0.02, p.z, (k / 6) * Math.PI), mix(top, C[7], 0.35), 2)
        if (this.theme.deco === "factory" && p.spin !== 0) {
          // engrenagem: dentes na borda
          for (let k = 0; k < 24; k++) {
            const a = (k / 24) * Math.PI * 2
            g.roundBox(0.8, 0.6, 0.9, 0.1, at(p.x + Math.sin(a) * (p.r + 0.2), p.y - 0.3, p.z + Math.cos(a) * (p.r + 0.2), a), SP.brass, 2)
          }
          glow.torus(Math.min(2.4, p.r * 0.7), 0.22, at(p.x, p.y + 0.03, p.z), this.neon, 14)
        }
      }
      // boia de borda: gomos de duas cores (inflável de programa de TV) e a faixa de neon logo abaixo
      const segs = Math.max(12, Math.round(p.r * 3) * 2)
      g.torus(p.r * 2 + 0.1, 0.62, at(p.x, p.y - 0.12, p.z), (x, _y, z) => (Math.floor(((Math.atan2(z, x) / (Math.PI * 2)) + 1) * segs) % 2 ? rim : mix(rim, C[7], 0.55)), 48)
      glow.torus(p.r * 2 + 0.66, 0.18, at(p.x, p.y - 0.16, p.z), this.neon, 24)
      g.cylinder(p.r * 1.84, p.d - 0.4, at(p.x, p.y - 0.4 - (p.d - 0.4) / 2, p.z), this.skirt(body), 32, p.r * 1.9)
      if (!dyn) {
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + p.x
          const rr = p.r * 0.55
          this.leg(g, p.x + Math.sin(a) * rr, p.z + Math.cos(a) * rr, p.y - p.d)
        }
      }
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
      this.grout(g, glow, p, top, L, pitch, yc)
    }
    if (!dyn && (p.s === 0 || p.s === 6) && rise === 0 && p.hx >= 3) this.bollards(g, glow, p)
    // postes/enfeites nas bordas dos pisos largos
    if (!dyn && p.s > 0 && p.s < 6 && p.hx >= 5 && Math.abs(p.rot) < 0.01 && rise === 0) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const x = p.x + sx * (p.hx + 0.05)
          const z = p.z + sz * (p.hz - 0.5)
          this.edgeDeco(glow, g, x, z, p.y)
        }
      }
    }
    // borda acolchoada em gomos (de 1,2 m, alternando com o claro) e o neon embaixo dela
    const light = mix(rim, C[7], 0.55)
    g.roundBox(p.hx * 2 + 0.34, 0.5, L + 0.34, r + 0.12, m(-0.33), (x, _y, z) => (Math.floor((Math.abs(x) > p.hx ? z : x) / 1.2 + 100) % 2 ? rim : light), 10)
    glow.roundBox(p.hx * 2 + 0.5, 0.16, L + 0.5, 0.08, m(-0.42), this.neon, 2)
    g.roundBox(Math.max(0.6, p.hx * 2 - 0.3), p.d - 0.3, Math.max(0.6, L - 0.3), Math.min(0.3, p.hx * 0.4), m(-0.4 - (p.d - 0.3) / 2), this.skirt(body), 8)
    if (dyn) {
      if (this.theme.deco === "canyon") g.cylinder(Math.min(p.hx, p.hz) * 1.6, 2.2, at(p.x, p.y - p.d - 1, p.z), darker(body, 0.8), 7, 0.6)
      return
    }
    // setas amarelas no chão apontando o caminho (pisos compridos e largos o bastante)
    if (p.hx >= 1.4 && len >= 6 && p.bx === 0 && p.bz === 0) {
      const frame = at(p.x, yc, p.z, p.rot, -pitch)
      const w = Math.min(1.6, p.hx * 0.7)
      for (let lz = -p.hz + 2.5; lz <= p.hz - 2; lz += 6) {
        for (const sx of [-1, 1]) {
          const arm = Matrix.RotationY(-sx * Math.PI * 0.25).multiply(Matrix.Translation(sx * w * 0.36, 0.13, lz)).multiply(frame)
          glow.roundBox(0.34, 0.04, w, 0.02, arm, ARROW, 2)
        }
      }
    }
    if (this.theme.deco === "ice") {
      // pingentes de gelo pendurados na borda de baixo do piso (referência do Mar de Gelo)
      const frame = at(p.x, yc, p.z, p.rot, -pitch)
      for (const sx of [-1, 1]) {
        for (let lz = -p.hz + 0.6, k = 0; lz <= p.hz - 0.4; lz += 1.1, k++) {
          const h = 0.7 + ((k * 7 + (sx > 0 ? 3 : 0)) % 5) * 0.28
          g.cylinder(0.02, h, Matrix.Translation(sx * (p.hx + 0.05), -0.62 - h / 2, lz).multiply(frame), [0.78, 0.92, 1], 5, 0.42)
        }
      }
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

  /** Rejunte: linhas escuras a cada 2 m no tampo (ladrilhos grandes lidos de longe). */
  /**
   * v2 (17/11): o piso em LADRILHOS de verdade — tronco de pirâmide (chanfro que pega luz), três tons por
   * sorteio fixo e as frestas mostrando o fundo. Quadrados de 2 m (pedra, ferro, latão); hexágonos na Orbital
   * e no Gelo. Orbital, Forja e Gelo: o fundo é uma chapa ACESA (neon, brasa, gelo) que vaza pelas frestas.
   */
  private grout(g: SoftGeo, glow: SoftGeo, p: Pad, top: RGB, L: number, pitch: number, yc: number) {
    const d = this.theme.deco
    const lit = d === "orbital" ? this.neon : d === "forge" ? ([1, 0.42, 0.06] as RGB) : d === "ice" ? ([0.55, 0.92, 1] as RGB) : null
    const frame = at(p.x, yc, p.z, p.rot, -pitch)
    const W = p.hx * 2
    // o fundo das frestas
    if (lit) glow.roundBox(W - 0.3, 0.02, L - 0.3, 0.01, Matrix.Translation(0, 0.02, 0).multiply(frame), lit, 1)
    else g.roundBox(W - 0.3, 0.02, L - 0.3, 0.01, Matrix.Translation(0, 0.02, 0).multiply(frame), darker(top, 0.55), 1)
    const tone = (i: number, j: number): RGB => {
      const h = Math.abs(Math.sin(i * 12.9898 + j * 78.233 + p.z) * 43758.5453) % 1
      return h < 0.33 ? mix(top, this.C[7], 0.1) : h < 0.66 ? top : darker(top, 0.86)
    }
    const hgt = (i: number, j: number) => 0.06 + (Math.abs(Math.sin(i * 3.1 + j * 5.7 + p.x)) % 1) * 0.025
    if (d === "orbital" || d === "ice") {
      const R = 1.05
      const cw = 1.5 * R
      const rh = Math.sqrt(3) * R
      for (let i = 0, lx = -p.hx + R; lx <= p.hx - R * 0.85; lx += cw, i++) {
        for (let j = 0, lz = -L / 2 + rh / 2 + (i % 2 ? rh / 2 : 0); lz <= L / 2 - R * 0.8; lz += rh, j++) {
          const h = hgt(i, j)
          g.cylinder(R * 1.86, h, Matrix.Translation(lx, 0.03 + h / 2, lz).multiply(frame), tone(i, j), 6, R * 1.7)
        }
      }
      return
    }
    const T = 2
    for (let i = 0, lx = -p.hx + 0.15 + T / 2; lx <= p.hx - 0.15 - T / 2 + 0.01; lx += T, i++) {
      for (let j = 0, lz = -L / 2 + 0.15 + T / 2; lz <= L / 2 - 0.15 - T / 2 + 0.01; lz += T, j++) {
        const h = hgt(i, j)
        // quadrado = cilindro de 4 lados girado 45°: base (T-0,1)·√2, topo menor (chanfro)
        // V-Fábrica (ref. v3): chapa de aço em três tons, uma em cada sete de cobre, e rebites de latão nos cantos
        const copper = d === "factory" && Math.abs(Math.sin(i * 7.31 + j * 3.17 + p.z)) % 1 < 0.14
        g.cylinder((T - 0.1) * Math.SQRT2, h, Matrix.RotationY(Math.PI / 4).multiply(Matrix.Translation(lx, 0.03 + h / 2, lz)).multiply(frame), copper ? [0.56, 0.3, 0.18] : tone(i, j), 4, (T - 0.26) * Math.SQRT2)
        if (d === "factory") {
          for (const cx of [-1, 1]) for (const cz of [-1, 1]) g.cylinder(0.16, 0.06, Matrix.Translation(lx + cx * (T / 2 - 0.3), 0.03 + h + 0.02, lz + cz * (T / 2 - 0.3)).multiply(frame), [0.82, 0.62, 0.3], 5, 0.1)
        }
      }
    }
  }

  /** Frades acolchoados nas bordas da largada e da chegada: poste da cor da borda, gomo claro, chapéu amarelo aceso. */
  private bollards(g: SoftGeo, glow: SoftGeo, p: Pad) {
    if (this.theme.deco === "forest") return this.forestRails(g, glow, p)
    const C = this.C
    const post = C[p.rim]
    const band = mix(post, C[7], 0.6)
    const c = Math.cos(p.rot)
    const s = Math.sin(p.rot)
    const put = (lx: number, lz: number) => {
      const x = p.x + lx * c + lz * s
      const z = p.z - lx * s + lz * c
      g.cylinder(0.7, 0.95, at(x, p.y + 0.47, z), (_x, y) => (Math.abs(y) < 0.12 ? band : post), 14)
      g.torus(0.78, 0.16, at(x, p.y + 0.06, z), darker(post, 0.7), 10)
      glow.sphere(0.78, at(x, p.y + 1.02, z), this.C[1], 10, 1, 0.75, 1)
    }
    for (const sx of [-1, 1]) {
      const zs: number[] = []
      for (let lz = -p.hz + 0.6; lz <= p.hz - 0.5; lz += 3.2) {
        put(sx * (p.hx - 0.45), lz)
        zs.push(lz)
      }
      // corrimão de tubo aceso de frade a frade
      const lx = sx * (p.hx - 0.45)
      const z0 = zs[0]
      const z1 = zs[zs.length - 1]
      if (z1 > z0) glow.roundBox(0.2, 0.2, z1 - z0, 0.09, Matrix.Translation(lx, p.y + 0.72, (z0 + z1) / 2).multiply(at(p.x, 0, p.z, p.rot)), this.neon, 2)
    }
  }

  /**
   * Floresta (ref. v3): cerca de programa de TV — postes quadrados magenta com chapéu claro e filete aceso,
   * corrimão amarelo grosso (claro em cima, laranja embaixo) e um segundo tubo baixo; sombra no pé.
   */
  private forestRails(g: SoftGeo, glow: SoftGeo, p: Pad) {
    const MAG: RGB = [0.72, 0.1, 0.5]
    const MAG_HI: RGB = [0.95, 0.42, 0.78]
    const RAIL = (_x: number, y: number): RGB => (y > 0.04 ? [1, 0.84, 0.22] : [0.96, 0.52, 0.1])
    const frame = at(p.x, 0, p.z, p.rot)
    const L = (lx: number, y: number, lz: number) => Matrix.Translation(lx, y, lz).multiply(frame)
    for (const sx of [-1, 1]) {
      const lx = sx * (p.hx - 0.4)
      const zs: number[] = []
      for (let lz = -p.hz + 0.5; lz <= p.hz - 0.4; lz += 2.6) zs.push(lz)
      for (const lz of zs) {
        // sombra de contato, poste, cinta clara, chapéu
        g.cylinder(0.95, 0.02, L(lx, p.y + 0.012, lz), [0.05, 0.12, 0.1], 10)
        g.roundBox(0.46, 1.15, 0.46, 0.08, L(lx, p.y + 0.575, lz), (_x, y) => (y < -0.45 ? darker(MAG, 0.7) : Math.abs(y - 0.2) < 0.06 ? MAG_HI : MAG), 4)
        g.roundBox(0.58, 0.16, 0.58, 0.06, L(lx, p.y + 1.2, lz), MAG_HI, 3)
        g.sphere(0.36, L(lx, p.y + 1.33, lz), [1, 0.84, 0.3], 8, 1, 0.8, 1)
        glow.roundBox(0.04, 0.8, 0.48, 0.02, L(lx - sx * 0.24, p.y + 0.6, lz), [1, 0.45, 0.85], 1)
      }
      const z0 = zs[0]
      const z1 = zs[zs.length - 1]
      if (z1 <= z0) continue
      const mid = (z0 + z1) / 2
      g.roundBox(0.26, 0.26, z1 - z0, 0.12, L(lx, p.y + 1.02, mid), RAIL, 4)
      g.roundBox(0.14, 0.14, z1 - z0, 0.06, L(lx, p.y + 0.5, mid), [0.96, 0.6, 0.14], 3)
      glow.roundBox(0.06, 0.05, z1 - z0, 0.02, L(lx - sx * 0.13, p.y + 0.9, mid), [1, 0.5, 0.88], 1)
    }
    // cogumelos grandes nos quatro cantos (por fora da cerca)
    const c = Math.cos(p.rot)
    const s = Math.sin(p.rot)
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const lx = sx * (p.hx + 0.9)
        const lz = sz * (p.hz - 0.6)
        this.mushroom(g, glow, p.x + lx * c + lz * s, p.z - lx * s + lz * c, p.y - 0.3, 1.25)
      }
  }

  /**
   * Cogumelo-lanterna da Floresta (ref. v3): talo aceso (branco quente embaixo → amarelo em cima), lamelas
   * claras sob o chapéu, chapéu magenta em gradiente (borda clara) com pintas, e um broto ao lado.
   */
  private mushroom(g: SoftGeo, glow: SoftGeo, x: number, z: number, y: number, s: number) {
    const h = 1.3 * s
    g.cylinder(1.3 * s, 0.02, at(x, y + 0.012, z), [0.05, 0.12, 0.1], 10)
    glow.cylinder(0.42 * s, h, at(x, y + h / 2, z), (_x, yy) => mix([1, 0.9, 0.62], [1, 0.72, 0.28], (yy + h / 2) / h), 10, 0.3 * s)
    glow.cylinder(1.5 * s, 0.14 * s, at(x, y + h - 0.02, z), [1, 0.86, 0.66], 16, 0.5 * s)
    const R = 1.75 * s
    glow.sphere(R, at(x, y + h, z), (xx, yy, zz) => {
      const r = Math.hypot(xx, zz) / (R / 2)
      return yy < 0.05 * s ? [1, 0.84, 0.5] : mix([0.5, 0.05, 0.42], [1, 0.42, 0.8], Math.min(1, r * r * r))
    }, 14, 1, 0.48, 1)
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + x
      glow.sphere(0.26 * s, at(x + Math.cos(a) * 0.5 * s, y + h + 0.3 * s, z + Math.sin(a) * 0.5 * s), [1, 0.88, 0.95], 5, 1, 0.4, 1)
    }
    // broto
    const bx = x + 0.6 * s
    const bz = z + 0.35 * s
    glow.cylinder(0.16 * s, 0.45 * s, at(bx, y + 0.22 * s, bz), [1, 0.92, 0.75], 6)
    glow.sphere(0.5 * s, at(bx, y + 0.46 * s, bz), [0.92, 0.3, 0.72], 8, 1, 0.55, 1)
  }

  /**
   * Vitória-régia gigante (Floresta, ref. v3) — a plataforma que anda: folha verde com veios do miolo para a
   * borda, o corte em cunha, a borda virada para cima (mais clara por fora, avermelhada por baixo) e uma flor de
   * lótus acesa na beira de trás. Malha na origem (anda por update).
   */
  private lilyPad(g: SoftGeo, glow: SoftGeo, p: Pad) {
    const R = p.r
    const NOTCH = 0.22
    g.cylinder(R * 2, 0.36, at(0, p.y - 0.18, 0), (x, _y, z) => {
      const a = Math.atan2(z, x)
      const r = Math.hypot(x, z) / R
      if (Math.abs(a - Math.PI / 2) < NOTCH * (1 - r * 0.2) && r > 0.15) return [0.04, 0.2, 0.12]
      const vein = Math.abs(Math.sin(a * 7)) < 0.12 && r > 0.12
      const base = mix([0.16, 0.5, 0.26], [0.32, 0.68, 0.32], r)
      return vein ? mix(base, [0.6, 0.86, 0.5], 0.5) : base
    }, 36)
    // borda virada para cima: verde claro por cima, avermelhada embaixo
    g.torus(R * 2, 0.22, at(0, p.y + 0.04, 0), (_x, y): RGB => (y > 0 ? [0.4, 0.74, 0.34] : [0.56, 0.2, 0.22]), 36)
    // por baixo: o caule grosso que some no pântano
    g.cylinder(0.5, 2.4, at(0, p.y - 1.5, 0), [0.14, 0.3, 0.16], 8)
    // lótus aceso na beira de trás (fora do miolo de pisar)
    const fx = -R * 0.72
    const fz = R * 0.45
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      glow.sphere(0.5, at(fx + Math.cos(a) * 0.28, p.y + 0.3, fz + Math.sin(a) * 0.28, a, 0.7, 0), [1, 0.42, 0.86], 5, 0.5, 1, 1.4)
    }
    glow.sphere(0.3, at(fx, p.y + 0.35, fz), [1, 0.92, 0.5], 5)
    glow.torus(R * 2 + 0.6, 0.06, at(0, p.y - 0.05, 0), [0.6, 1, 0.75], 24)
  }

  /** Lateral do piso: listras diagonais largas de perigo, em dois tons do corpo. */
  private skirt(body: RGB) {
    const dark = darker(body, 0.7)
    return (x: number, y: number, z: number): RGB => (Math.floor((x + z + y * 1.4) / 0.9 + 1000) % 2 ? body : dark)
  }

  /** Enfeite do canto dos pisos largos, pelo tema. */
  private edgeDeco(glow: SoftGeo, g: SoftGeo, x: number, z: number, y: number) {
    switch (this.theme.deco) {
      case "city":
      case "factory":
        steamLamp(this.stage.ctx, x, z, { y, collide: false, gearSeed: Math.round(z) })
        return
      case "forest":
        this.mushroom(g, glow, x, z, y, 0.8 + (Math.abs(Math.round(z * 7)) % 3) * 0.15)
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
    if (C.rise) this.water.position.y = Math.max(0, riseAt(C, tt))
    this.gate.setEnabled(t < 0 && C.mode === "race")
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
      if (this.fruitPools.length) {
        // Clareira: a fruta da faixa (as do conjunto comum ficam escondidas)
        for (const b of this.ballPool) b.setEnabled(false)
        const usedK = [0, 0, 0, 0]
        for (let k = 0; k < this.balls.length; k += 5) {
          const kind = this.balls[k + 3] % this.fruitPools.length
          const b = this.fruitPools[kind][usedK[kind]++]
          if (!b) continue
          b.setEnabled(true)
          b.position.set(this.balls[k], this.balls[k + 1], this.balls[k + 2])
          b.rotation.x = -this.balls[k + 2] / C.balls.R
        }
        for (let kind = 0; kind < this.fruitPools.length; kind++) for (let i = usedK[kind]; i < this.fruitPools[kind].length; i++) this.fruitPools[kind][i].setEnabled(false)
      }
    }
    this.comportas?.update(tt)
    for (const m of this.movers) {
      const sh = padShift(m.p, tt)
      m.mesh.position.set(m.p.x + sh.dx, 0, m.p.z + sh.dz)
      m.mesh.rotation.y = m.p.k === 0 ? m.p.spin * tt : padRot(m.p, tt)
    }
    if (this.zoneRing) this.zoneRing.scaling.y = 1 + Math.sin(clock * 3) * 0.25
    if (this.crownMesh) {
      this.crownMesh.rotation.y = clock * 1.2
      this.crownMesh.position.y = this.course.finishY + 0.5 + Math.sin(clock * 2) * 0.12
    }
    // anéis do Rolo de Gelo: o material no ângulo m fica em θ = m + giro (rotation.z = −giro)
    for (const dn of this.drumNodes) dn.node.rotation.z = -drumAngle(C.drums[dn.d].rings[dn.r], tt)
    if (C.memory) this.updateMemory(t, clock, world)
    // engrenagens: some quando pega, volta crescendo; no ar gira e balança
    for (let i = 0; i < C.gems.length; i++) {
      const g = C.gems[i]
      const m = this.gemMeshes[i]
      const took = world.gems[i]
      const age = took < 0 ? tt - g.t0 : tt - took - g.back
      const on = tt >= g.t0 && (took < 0 || age >= 0)
      m.setEnabled(on)
      if (!on) continue
      const pop = Math.min(1, Math.max(0.2, age / 0.35))
      m.scaling.setAll(pop)
      m.position.y = g.y + Math.sin(clock * 2.4 + i) * 0.15
      m.rotation.y = clock * 1.8 + i
    }
    if (C.walls) {
      const Wl = C.walls
      const n = Math.round((2 * Wl.hw) / Wl.seg)
      let si = 0
      let li = 0
      for (const v of wallsAt(C, world.seed, t, this.wallTmp)) {
        if (v.kind === 1) {
          const m = this.wallLows[li++]
          if (m) {
            m.setEnabled(true)
            m.position.set(0, Wl.y, v.z)
          }
          continue
        }
        for (let j = 0; j < n; j++) {
          if (v.gaps.includes(j)) continue
          const m = this.wallSegs[si++]
          if (!m) break
          m.setEnabled(true)
          m.position.set(-Wl.hw + (j + 0.5) * Wl.seg, Wl.y, v.z)
        }
      }
      for (; si < this.wallSegs.length; si++) this.wallSegs[si].setEnabled(false)
      for (; li < this.wallLows.length; li++) this.wallLows[li].setEnabled(false)
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

  /** Relógio da Praça: símbolos acesos só no "decore"; na queda, os errados despencam e voltam no fim. */
  private updateMemory(t: number, clock: number, world: RunWorld) {
    const M = this.course.memory!
    const st = memState(M, Math.max(0, t))
    const mc = this.memCache
    if (mc.seed !== world.seed || mc.r !== st.r) {
      mc.seed = world.seed
      mc.r = st.r
      mc.sym = memSymbols(M, world.seed, st.r)
    }
    const tgt = memTarget(world.seed, st.r)
    for (let i = 0; i < this.memTiles.length; i++) {
      const inst = this.memTiles[i]
      const wrong = mc.sym[i] !== tgt
      let y = M.y
      let on = true
      if (st.ph === 4 && wrong) {
        const fall = 3 - st.left
        if (fall < 0.9) y = M.y - 9 * fall * fall
        else on = false
      } else if (st.ph === 5 && wrong) y = M.y - 2.4 * Math.min(1, st.left / 0.8)
      inst.setEnabled(on)
      inst.position.y = y
      for (let s = 0; s < 6; s++) {
        const show = (st.ph === 1 && mc.sym[i] === s) || (st.ph === 4 && !wrong && s === tgt)
        const si = this.memSyms[s][i]
        si.setEnabled(show)
        if (show) {
          si.position.y = y + 0.07
          si.scaling.setAll(st.ph === 4 ? 1 + Math.sin(clock * 8) * 0.06 : 1)
        }
      }
    }
    for (let s = 0; s < 6; s++) this.memFace[s].setEnabled((st.ph === 3 || st.ph === 4) && s === tgt)
    if (this.memHand) this.memHand.rotation.z = st.ph === 3 ? -Math.PI * 2 * (1 - st.left / memCall(st.r)) : -clock * 0.2
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
    for (const pool of this.fruitPools) for (const b of pool) b.dispose()
    for (const b of this.fruitBases) b.dispose()
    for (const m of this.movers) m.mesh.dispose()
    this.comportas?.dispose()
    for (const m of this.pusherMeshes) m.dispose()
    for (const m of this.wallSegs) m.dispose()
    for (const m of this.wallLows) m.dispose()
    for (const m of this.wallBases) m.dispose()
    for (const m of this.gemMeshes) m.dispose()
    for (const m of this.gemBases) m.dispose()
    this.zoneRing?.dispose()
    this.crownMesh?.dispose()
    for (const row of this.memSyms) for (const m of row) m.dispose()
    for (const m of this.memTiles) m.dispose()
    for (const m of this.memFace) m.dispose(false, true)
    for (const m of this.memBases) m.dispose(false, true)
    this.memHand?.dispose()
    for (const dn of this.drumNodes) dn.node.dispose()
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
