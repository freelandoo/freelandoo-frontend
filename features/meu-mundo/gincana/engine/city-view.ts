// features/meu-mundo/gincana/engine/city-view.ts — GINCANA: a cidade em volta da prova.
//
// Pedido do Alex (2026-11-05): mesma estética da cidade, com um pouco do Rolê Noturno
// e do Paint. A prova virou um canal: cais de cantaria com lampiões, fachadas de
// tijolo com janelas e lojas acesas e letreiros de latão (Rolê), viadutos, fábricas
// ao longe e ilhas flutuantes de pedra no céu (Paint). Tudo é desenho, fora do
// alcance de quem corre: a regra e a colisão seguem só em sim/course.ts.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { SteamCtx, RGB } from "../../engine/steampunk/scenery"
import { SP, facing, factorySkyline, place, rivetRing, rng } from "../../engine/steampunk/scenery"
import { steamLamp, xyzOf } from "../../engine/steampunk/kit"
import type { SteamGeo } from "../../engine/steampunk/geo"
import { CITY, islandGeometry, type RockBuf } from "../../paint/engine/world-view"

/** Borda do cais (|x|), altura do cais e até onde a cidade vai no canal (z). */
const QUAY_X = 76
const QUAY_Y = 5
const Z0 = -240
const Z1 = 520
const LAND = 340
/** O centro das distâncias (o meio da prova). */
const MID_Z = 130

/** Letreiros: latão e cobre acesos, os mesmos do Rolê. */
const SIGNS: RGB[] = [
  [1, 0.72, 0.3],
  [0.95, 0.5, 0.2],
  [1, 0.86, 0.52],
  [0.92, 0.4, 0.2],
]

type Ctx = SteamCtx & { wall: SteamGeo }

/** Sobrado com a frente para −Z do quadro `f`: loja acesa, janelas, cornija e mansarda. */
function townhouse(ctx: Ctx, f: Matrix, w: number, h: number, R: () => number, vent: boolean) {
  const { props, glow } = ctx
  const d = w
  const wallColor = [SP.brick, SP.brickDark, SP.masonry, SP.masonryDark][Math.floor(R() * 4)]
  const front = -d / 2 - 0.04
  props.box(w, h, d, place(0, h / 2, 0, 0, f), wallColor)
  props.box(w + 0.3, 0.5, d + 0.3, place(0, 4.3, 0, 0, f), SP.masonryLight)
  props.box(w + 0.5, 0.6, d + 0.5, place(0, h + 0.1, 0, 0, f), SP.brassDark)
  // loja no térreo, com toldo de cobre
  glow.box(w - 2.2, 2.5, 0.1, place(0, 1.8, front, 0, f), SP.windowGlow)
  props.box(w - 1.4, 0.24, 1.5, place(0, 3.4, front - 0.7, 0, f), SP.copperDark)
  // janelas: a maioria acesa, com peitoril
  const cols = Math.max(2, Math.floor(w / 3.3))
  const rows = Math.floor((h - 5) / 3.3)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * (w / cols)
      const y = 6.2 + r * 3.3
      const pane = R() < 0.68 ? glow : props
      pane.panel(1.15, 1.9, place(x, y, front - 0.02, 0, f), pane === glow ? SP.windowGlow : SP.glass)
      props.panel(1.5, 0.18, place(x, y - 1.05, front - 0.02, 0, f), SP.masonryLight)
    }
  }
  // letreiro em pé, preso na quina
  if (R() < 0.4) {
    const sh = 3.4 + R() * 2.6
    glow.box(0.3, sh, 1.1, place(w / 2 - 0.6, 5.6 + sh / 2, front - 0.6, 0, f), SIGNS[Math.floor(R() * SIGNS.length)])
  }
  props.cone(w * 0.72, w * 1.4, 3.4, place(0, h + 2.1, 0, Math.PI / 4, f), SP.slate, 4)
  const chim = place(w * 0.24, h + 3.8, d * 0.2, 0, f)
  props.box(1.1, 4, 1.1, chim, SP.brickDark)
  if (vent) {
    const [x, y, z] = xyzOf(chim)
    ctx.vents.push([x, y + 2.2, z])
  }
}

/** Viaduto de pedra de um cais ao outro, com lampiões e pilares no canal. */
function viaduct(ctx: Ctx, z: number) {
  const top = 15
  const half = QUAY_X + 2
  ctx.wall.box(half * 2, 2, 9, place(0, top - 1, z), SP.masonryDark)
  ctx.cobble.box(half * 2, 0.08, 8, place(0, top + 0.04, z), CITY.cobble)
  for (const s of [-1, 1]) ctx.props.box(half * 2, 0.9, 0.22, place(0, top + 0.5, z + s * 4.2), SP.iron)
  for (let x = -QUAY_X + 19; x < QUAY_X; x += 19) {
    ctx.wall.box(4, top - 2, 7, place(x, (top - 2) / 2, z), SP.masonry)
    ctx.props.box(4.5, 0.6, 7.5, place(x, top - 2.6, z), SP.brassDark)
    steamLamp(ctx, x, z - 3.6, { y: top, collide: false, gearSeed: Math.round(x) })
    ctx.gears.push({ m: facing(x, 6, z - 3.6), r: 1.5, thick: 0.2, speed: x > 0 ? 0.35 : -0.35 })
  }
}

/** Ilhas de pedra no céu, como as do Paint: x, y, z, raio. Longe do alcance do pulo. */
const ISLANDS: [number, number, number, number][] = [
  [-46, 44, 30, 13],
  [58, 56, 70, 16],
  [-92, 66, 128, 19],
  [38, 40, 150, 11],
  [104, 72, 214, 20],
  [-40, 52, 236, 14],
  [24, 62, 322, 18],
  [-122, 78, 20, 17],
  [132, 60, -10, 15],
  [-108, 58, 330, 16],
  [-18, 74, 96, 10],
  [70, 46, 290, 12],
]

export interface GincanaCity {
  setNight(n: number): void
  dispose(): void
}

/** Põe a cidade em `ctx` (antes do `stage.build`) e faz a malha de pedra das ilhas. */
export function buildCity(scene: Scene, ctx: Ctx, low: boolean): GincanaCity {
  const R = rng(4701)
  const len = Z1 - Z0
  const cz = (Z0 + Z1) / 2
  let vents = low ? 3 : 10

  for (const s of [-1, 1]) {
    const edge = s * QUAY_X
    // cais de cantaria, calçada à beira d'água, rua de pedra e a calçada dos prédios
    ctx.wall.box(LAND, QUAY_Y + 1, len, place(s * (QUAY_X + LAND / 2), QUAY_Y / 2 - 0.5, cz), SP.masonryDark)
    ctx.cobble.box(9, 0.08, len, place(s * (QUAY_X + 4.5), QUAY_Y + 0.04, cz), CITY.cobble)
    ctx.road.box(9, 0.08, len, place(s * (QUAY_X + 13.5), QUAY_Y + 0.04, cz), SP.stone)
    ctx.pavers.box(LAND - 18, 0.08, len, place(s * (QUAY_X + 18 + (LAND - 18) / 2), QUAY_Y + 0.04, cz), CITY.pave)
    ctx.props.box(0.5, 0.5, len, place(s * (QUAY_X - 0.1), QUAY_Y - 0.1, cz), SP.brassDark)
    ctx.props.box(0.14, 0.14, len, place(s * (QUAY_X + 0.5), QUAY_Y + 1.05, cz), SP.brass)
    ctx.props.pipe([[edge - s * 0.3, 2.6, Z0], [edge - s * 0.3, 2.6, Z1]], 0.32, SP.copper, SP.brassDark)
    // lampiões na beira, com o reflexo comprido na água à noite
    const step = low ? 34 : 17
    for (let z = Z0 + 40; z < Z1 - 40; z += step) {
      const x = s * (QUAY_X + 1.1)
      steamLamp(ctx, x, z, { y: QUAY_Y, collide: false, gearSeed: Math.round(z) })
      ctx.props.box(0.12, 1.1, 0.12, place(s * (QUAY_X + 0.5), QUAY_Y + 0.55, z), SP.iron)
      ctx.pools.panel(20, 3, Matrix.RotationX(Math.PI / 2).multiply(place(s * (QUAY_X - 11), 0.12, z)), SP.amber)
    }
    // fileiras de sobrados de frente para o canal
    const rows = low ? 1 : 2
    for (let row = 0; row < rows; row++) {
      const x = s * (QUAY_X + 28 + row * 24)
      for (let z = Z0 + 30; z < Z1 - 20; ) {
        const w = 13 + R() * 6
        const h = 11 + Math.floor(R() * 4) * 3.3 + row * 8
        const vent = vents > 0 && R() < 0.12
        if (vent) vents--
        townhouse(ctx, place(x, QUAY_Y, z + w / 2, (s * Math.PI) / 2), w, h, R, vent)
        z += w + 1.5
      }
    }
  }
  // a cidade fecha o canal nas duas pontas
  for (const z of [Z1 + 60, Z0 - 60]) {
    ctx.wall.box(QUAY_X * 2 + 2, QUAY_Y + 1, 120, place(0, QUAY_Y / 2 - 0.5, z), SP.masonryDark)
    ctx.pavers.box(QUAY_X * 2 + 2, 0.08, 120, place(0, QUAY_Y + 0.04, z), CITY.pave)
  }
  viaduct(ctx, 332)
  viaduct(ctx, -58)
  factorySkyline(ctx, 0, MID_Z, 395, low ? 12 : 26, QUAY_Y, 9, 2.2)

  // ── ilhas ──
  const rock: RockBuf = { p: [], c: [], i: [] }
  const list = low ? ISLANDS.slice(0, 5) : ISLANDS
  list.forEach(([x, y, z, r], id) => {
    islandGeometry({ id: id + 1, x, y, z, r, depth: r * 1.5 }, rock)
    const sides = Math.max(18, Math.round(r * 3))
    ctx.cobble.cylinder(r * 2, 0.06, place(x, y - 0.025, z), CITY.cobble, sides)
    ctx.pavers.cylinder((r - 0.9) * 2, 0.06, place(x, y - 0.02, z), CITY.pave, sides)
    rivetRing(ctx.props, x, y + 0.03, z, r * 0.995, 0.16, 0, SP.brass)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + id
      steamLamp(ctx, x + Math.sin(a) * (r - 0.8), z + Math.cos(a) * (r - 0.8), { y, collide: false, gearSeed: id * 3 + k })
    }
    townhouse(ctx, place(x, y, z, id), r * 0.8, 9, R, false)
    ctx.gears.push({ m: place(x, y - r * 1.3, z), r: r * 0.24, thick: 0.25, speed: id % 2 ? 0.5 : -0.5 })
  })
  const rockMat = new StandardMaterial("gincana-rock", scene)
  rockMat.diffuseColor = new Color3(1, 1, 1)
  rockMat.specularColor = new Color3(0.03, 0.03, 0.03)
  const mesh = new Mesh("gincana-rock", scene)
  const vd = new VertexData()
  vd.positions = rock.p
  vd.colors = rock.c
  vd.indices = rock.i
  const normals: number[] = []
  VertexData.ComputeNormals(rock.p, rock.i, normals)
  vd.normals = normals
  vd.applyToMesh(mesh, true)
  mesh.convertToFlatShadedMesh()
  mesh.material = rockMat
  mesh.isPickable = false
  mesh.freezeWorldMatrix()

  return {
    setNight(n) {
      const k = 1 - 0.75 * n
      rockMat.emissiveColor.set(0.16 * k, 0.15 * k, 0.13 * k)
    },
    dispose() {
      mesh.dispose()
      rockMat.dispose()
    },
  }
}
