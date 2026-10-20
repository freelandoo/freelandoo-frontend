// features/meu-mundo/engine/interior.ts
//
// Desenha o interior de uma casa (mm3d-09) a partir da definição que veio do
// SERVIDOR (src/utils/meuMundoInteriors.js): cômodos, paredes já recortadas
// pelas portas, janelas, lajes com o vão da escada, escadas e móveis. O
// cliente não guarda medida própria — colisão e assentos são os do payload,
// os mesmos que a sala da casa usa.
//
// Mesmas regras do bairro: tudo de um andar entra em UMA malha com cor por
// vértice (um material para a casa inteira), sem textura, sem sombra, sem
// reflexo. Os móveis são peças simples montadas aqui por tipo — as MESMAS
// para os nove níveis; o que muda de um nível para outro é quantas e onde.
//
// Andares acima do personagem ficam escondidos (corte de "casa de bonecas"):
// a câmera vê o cômodo por cima, e não há teto para atravessar.

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Scene } from "@babylonjs/core/scene"
import { GeoBuilder, type RGB } from "./geometry"
import type { FloorMat, InteriorDef, InteriorFurniture } from "../types"

const C = {
  wood: [0.86, 0.71, 0.5],
  woodDark: [0.55, 0.37, 0.24],
  tile: [0.86, 0.9, 0.92],
  carpet: [0.8, 0.72, 0.84],
  stone: [0.86, 0.83, 0.78],
  outdoor: [0.78, 0.76, 0.72],
  wall: [0.97, 0.93, 0.85],
  wallBath: [0.86, 0.93, 0.95],
  base: [0.74, 0.66, 0.56],
  frame: [0.97, 0.96, 0.92],
  glass: [0.63, 0.83, 0.95],
  rail: [0.97, 0.96, 0.92],
  fabricA: [0.42, 0.55, 0.7],
  fabricB: [0.76, 0.42, 0.36],
  fabricC: [0.48, 0.62, 0.45],
  cushion: [0.93, 0.88, 0.76],
  white: [0.97, 0.97, 0.96],
  steel: [0.72, 0.74, 0.77],
  dark: [0.2, 0.21, 0.24],
  black: [0.12, 0.12, 0.14],
  leaf: [0.38, 0.64, 0.34],
  pot: [0.74, 0.45, 0.32],
  lampShade: [1, 0.93, 0.7],
  rugA: [0.83, 0.62, 0.5],
  rugB: [0.6, 0.66, 0.78],
  door: [0.48, 0.3, 0.2],
  knob: [0.92, 0.75, 0.3],
  step: [0.78, 0.6, 0.42],
} satisfies Record<string, RGB>

const MAT: Record<FloorMat, RGB> = { wood: C.wood, tile: C.tile, carpet: C.carpet, stone: C.stone }
const FABRICS: RGB[] = [C.fabricA, C.fabricB, C.fabricC]

/** Quadro de um móvel: giro em Y (graus) e posição, com a altura do andar. */
function frame(x: number, y: number, z: number, deg: number): Matrix {
  return Matrix.RotationY((deg * Math.PI) / 180).multiply(Matrix.Translation(x, y, z))
}

/** Caixa em coordenadas locais do móvel: centro (lx, lz), do chão ly0 até ly0+h. */
function B(g: GeoBuilder, f: Matrix, lx: number, ly0: number, lz: number, w: number, h: number, d: number, c: RGB) {
  g.box(w, h, d, Matrix.Translation(lx, ly0 + h / 2, lz).multiply(f), c)
}

function legs(g: GeoBuilder, f: Matrix, w: number, d: number, h: number, c: RGB, t = 0.06) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - t), 0, sz * (d / 2 - t), t, h, t, c)
}

function furniture(g: GeoBuilder, it: InteriorFurniture, y: number, seatTop: number, n: number, sizes: Record<string, { w: number; d: number; h: number }>) {
  const base = sizes[it.t] ?? { w: 0.5, d: 0.5, h: 0.5 }
  const w = it.w ?? base.w
  const d = it.d ?? base.d
  const h = it.h ?? base.h
  const f = frame(it.x, y, it.z, it.r)
  const fab = FABRICS[n % FABRICS.length]
  switch (it.t) {
    case "sofa2":
    case "sofa3":
    case "armchair": {
      const arm = 0.14
      B(g, f, 0, 0, 0, w, seatTop - 0.1, d, C.woodDark)
      B(g, f, 0, seatTop - 0.1, -0.05, w - 2 * arm, 0.1, d - 0.2, C.cushion)
      B(g, f, 0, seatTop - 0.1, d / 2 - 0.1, w, h - seatTop + 0.1, 0.2, fab)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - arm / 2), seatTop - 0.1, 0, arm, 0.32, d, fab)
      break
    }
    case "chair":
      legs(g, f, w * 0.9, d * 0.9, seatTop - 0.05, C.woodDark, 0.05)
      B(g, f, 0, seatTop - 0.05, 0, w, 0.05, d, C.wood)
      B(g, f, 0, seatTop, d / 2 - 0.03, w, h - seatTop, 0.06, C.wood)
      break
    case "table2":
    case "table4":
    case "table6":
    case "desk":
      legs(g, f, w, d, h - 0.05, C.woodDark)
      B(g, f, 0, h - 0.05, 0, w, 0.05, d, C.wood)
      if (it.t === "desk") B(g, f, w / 2 - 0.25, h - 0.3, 0, 0.42, 0.25, d - 0.06, C.woodDark)
      break
    case "coffee":
      legs(g, f, w, d, h - 0.05, C.woodDark, 0.05)
      B(g, f, 0, h - 0.05, 0, w, 0.05, d, C.woodDark)
      break
    case "tv":
      B(g, f, 0, 0, 0, w, h, d, C.woodDark)
      B(g, f, 0, h, d / 2 - 0.08, w * 0.9, 0.62, 0.05, C.black)
      break
    case "bed1":
    case "bed2":
      B(g, f, 0, 0, 0, w, 0.32, d, C.woodDark)
      B(g, f, 0, 0.32, 0, w - 0.06, 0.16, d - 0.06, C.white)
      B(g, f, 0, 0.47, -0.25, w - 0.04, 0.05, d * 0.62, fab)
      B(g, f, 0, 0.48, d / 2 - 0.28, w * 0.7, 0.1, 0.32, C.cushion)
      B(g, f, 0, 0, d / 2 - 0.04, w, 0.95, 0.08, C.woodDark)
      break
    case "nightstand":
      B(g, f, 0, 0, 0, w, h, d, C.wood)
      B(g, f, 0, h, 0, 0.16, 0.25, 0.16, C.lampShade)
      break
    case "wardrobe":
      B(g, f, 0, 0, 0, w, h, d, C.wood)
      B(g, f, 0, 0.05, -d / 2 - 0.005, 0.02, h - 0.1, 0.01, C.woodDark)
      for (const sx of [-0.08, 0.08]) B(g, f, sx, h / 2, -d / 2 - 0.02, 0.04, 0.12, 0.03, C.knob)
      break
    case "shelf":
      B(g, f, 0, 0, d / 2 - 0.03, w, h, 0.06, C.woodDark)
      for (const sx of [-1, 1]) B(g, f, sx * (w / 2 - 0.03), 0, 0, 0.06, h, d, C.woodDark)
      for (let k = 0; k < 4; k++) {
        B(g, f, 0, 0.05 + k * (h / 4), 0, w - 0.1, 0.04, d - 0.04, C.wood)
        B(g, f, -w / 4 + (k % 2) * 0.2, 0.09 + k * (h / 4), 0, 0.3, 0.24, d - 0.12, FABRICS[(n + k) % 3])
      }
      break
    case "counter":
    case "island":
      B(g, f, 0, 0, 0, w, h - 0.05, d, C.white)
      B(g, f, 0, h - 0.05, 0, w + 0.02, 0.05, d + 0.02, C.dark)
      break
    case "stove":
      B(g, f, 0, 0, 0, w, h - 0.03, d, C.steel)
      B(g, f, 0, h - 0.03, 0, w, 0.03, d, C.black)
      break
    case "fridge":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      B(g, f, w / 2 - 0.08, h * 0.45, -d / 2 - 0.02, 0.04, 0.5, 0.04, C.steel)
      B(g, f, 0, h * 0.62, -d / 2 - 0.005, w - 0.04, 0.02, 0.01, C.steel)
      break
    case "toilet":
      B(g, f, 0, 0, -0.08, w * 0.85, 0.42, d * 0.7, C.white)
      B(g, f, 0, 0, d / 2 - 0.1, w, h, 0.2, C.white)
      break
    case "basin":
      B(g, f, 0, 0, 0.05, 0.18, h - 0.15, 0.18, C.white)
      B(g, f, 0, h - 0.15, 0, w, 0.15, d, C.white)
      B(g, f, 0, h + 0.25, d / 2 - 0.02, w * 0.8, 0.5, 0.03, C.glass)
      break
    case "shower":
      B(g, f, 0, 0, 0, w, 0.08, d, C.white)
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, f, sx * (w / 2 - 0.02), 0.08, sz * (d / 2 - 0.02), 0.04, h - 0.08, 0.04, C.steel)
      B(g, f, 0, 0.08, -d / 2 + 0.01, w - 0.04, h * 0.85, 0.02, C.glass)
      B(g, f, 0, h - 0.1, d / 2 - 0.15, 0.2, 0.04, 0.2, C.steel)
      break
    case "bathtub":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      B(g, f, 0, h - 0.04, 0, w - 0.16, 0.05, d - 0.16, C.glass)
      break
    case "washer":
      B(g, f, 0, 0, 0, w, h, d, C.white)
      B(g, f, 0, h * 0.45, -d / 2 - 0.01, 0.34, 0.34, 0.02, C.dark)
      break
    case "plant":
      g.cylinder(0.36, 0.38, Matrix.Translation(0, 0.19, 0).multiply(f), C.pot, 8)
      g.sphere(0.62, [1, 1.15, 1], Matrix.Translation(0, 0.72, 0).multiply(f), C.leaf)
      g.sphere(0.4, [1, 1, 1], Matrix.Translation(0.12, 0.98, -0.05).multiply(f), C.leaf)
      break
    case "lamp":
      g.cylinder(0.05, h - 0.3, Matrix.Translation(0, (h - 0.3) / 2, 0).multiply(f), C.steel, 6)
      g.cylinder(0.34, 0.3, Matrix.Translation(0, h - 0.15, 0).multiply(f), C.lampShade, 8)
      break
    case "piano":
      B(g, f, 0, 0, 0.05, w, h, d - 0.1, C.black)
      B(g, f, 0, 0.7, -d / 2 + 0.08, w - 0.1, 0.05, 0.18, C.white)
      B(g, f, 0, 0.75, -d / 2 + 0.08, w - 0.1, 0.02, 0.06, C.black)
      break
    case "rug":
      B(g, f, 0, 0.005, 0, w, 0.015, d, n % 2 ? C.rugA : C.rugB)
      break
    default:
      B(g, f, 0, 0, 0, w, h, d, C.wood)
  }
}

export interface BuiltInterior {
  floors: Mesh[]
  /** Mostra só os andares até o do personagem (corte da casa de bonecas). */
  showUpTo: (floor: number) => void
  dispose: () => void
}

function stairSteps(g: GeoBuilder, def: InteriorDef, si: number) {
  const st = def.stairs[si]
  const y0 = def.floors[st.from].y
  const rise = def.floors[st.to].y - y0
  const alongZ = st.dir === "+z" || st.dir === "-z"
  const len = alongZ ? st.z1 - st.z0 : st.x1 - st.x0
  const width = alongZ ? st.x1 - st.x0 : st.z1 - st.z0
  const n = Math.max(8, Math.round(rise / 0.19))
  const run = len / n
  for (let k = 0; k < n; k++) {
    const top = y0 + (rise * (k + 1)) / n
    // Posição ao longo da subida (do pé para o alto).
    const a = run * (k + 0.5)
    let cx: number
    let cz: number
    if (st.dir === "+z") [cx, cz] = [(st.x0 + st.x1) / 2, st.z0 + a]
    else if (st.dir === "-z") [cx, cz] = [(st.x0 + st.x1) / 2, st.z1 - a]
    else if (st.dir === "+x") [cx, cz] = [st.x0 + a, (st.z0 + st.z1) / 2]
    else [cx, cz] = [st.x1 - a, (st.z0 + st.z1) / 2]
    const h = top - y0
    const [w, d] = alongZ ? [width, run] : [run, width]
    g.box(w, h, d, Matrix.Translation(cx, y0 + h / 2, cz), k % 2 ? C.step : C.wood)
  }
}

export function buildInterior(scene: Scene, def: InteriorDef): BuiltInterior {
  const mat = new StandardMaterial("mm-interior", scene)
  mat.diffuseColor = new Color3(1, 1, 1)
  mat.specularColor = new Color3(0, 0, 0)
  mat.backFaceCulling = false
  const meshes: Mesh[] = []
  let n = 0
  def.floors.forEach((fl, fi) => {
    const g = new GeoBuilder()
    const y = fl.y
    // Piso: no térreo uma placa por cômodo; acima, a laje (sem o vão da escada).
    if (fi === 0) {
      for (const r of fl.rooms) g.box(r.x1 - r.x0, 0.06, r.z1 - r.z0, Matrix.Translation((r.x0 + r.x1) / 2, y - 0.03, (r.z0 + r.z1) / 2), r.outdoor ? C.outdoor : MAT[r.mat])
    } else {
      for (const s of fl.slabs ?? []) g.box(s.x1 - s.x0, 0.14, s.z1 - s.z0, Matrix.Translation((s.x0 + s.x1) / 2, y - 0.07, (s.z0 + s.z1) / 2), MAT[s.mat] ?? C.wood)
      for (const r of fl.rooms) if (r.outdoor) g.box(r.x1 - r.x0, 0.15, r.z1 - r.z0, Matrix.Translation((r.x0 + r.x1) / 2, y - 0.07, (r.z0 + r.z1) / 2), C.outdoor)
    }
    const bathIds = new Set(fl.rooms.filter((r) => r.mat === "tile").map((r) => r.id))
    for (const w of fl.walls) {
      const rail = w.kind === "rail"
      const inBath = fl.rooms.some(
        (r) => bathIds.has(r.id) && w.x >= r.x0 - 0.2 && w.x <= r.x1 + 0.2 && w.z >= r.z0 - 0.2 && w.z <= r.z1 + 0.2 && w.kind !== "int",
      )
      const color = rail ? C.rail : inBath ? C.wallBath : C.wall
      if (rail) {
        g.box(w.hx * 2, 0.08, w.hz * 2, Matrix.Translation(w.x, y + w.h - 0.04, w.z), C.rail)
        g.box(w.hx * 2 * 0.98, 0.1, w.hz * 2 * 0.98, Matrix.Translation(w.x, y + 0.05, w.z), C.rail)
        const len = Math.max(w.hx, w.hz) * 2
        const k = Math.max(2, Math.floor(len / 0.45))
        for (let i = 0; i <= k; i++) {
          const t = -len / 2 + (len * i) / k
          const [px, pz] = w.hx > w.hz ? [w.x + t, w.z] : [w.x, w.z + t]
          g.box(0.06, w.h, 0.06, Matrix.Translation(px, y + w.h / 2, pz), C.rail)
        }
        continue
      }
      g.box(w.hx * 2, w.h, w.hz * 2, Matrix.Translation(w.x, y + w.h / 2, w.z), color)
      // Rodapé.
      g.box(w.hx * 2 + 0.02, 0.1, w.hz * 2 + 0.02, Matrix.Translation(w.x, y + 0.05, w.z), C.base)
    }
    for (const win of fl.windows) {
      const out = win.inward * 0.09
      const [fw, fd] = win.axis === "x" ? [1.15, 0.03] : [0.03, 1.15]
      const [gw, gd] = win.axis === "x" ? [0.95, 0.04] : [0.04, 0.95]
      const px = win.axis === "z" ? win.x + out : win.x
      const pz = win.axis === "x" ? win.z + out : win.z
      g.box(fw, 1.05, fd, Matrix.Translation(px, y + 1.5, pz), C.frame)
      g.box(gw, 0.85, gd, Matrix.Translation(px + (win.axis === "z" ? win.inward * 0.01 : 0), y + 1.5, pz + (win.axis === "x" ? win.inward * 0.01 : 0)), C.glass)
    }
    if (fi === 0) {
      // Porta da rua (fechada: sair é pela ação "Sair").
      const d = def.door
      g.box(d.w - 0.08, 2.05, 0.06, Matrix.Translation(d.x, y + 1.03, d.z + 0.04), C.door)
      g.box(0.08, 0.08, 0.05, Matrix.Translation(d.x + d.w / 2 - 0.22, y + 1.0, d.z + 0.1), C.knob)
    }
    def.stairs.forEach((st, si) => {
      if (st.from === fi) stairSteps(g, def, si)
    })
    for (const it of fl.furniture) furniture(g, it, y, def.seatTop, n++, def.furnitureTypes)
    const mesh = g.build(`mm-interior-f${fi}`, scene, mat)
    meshes.push(mesh)
  })
  mat.freeze()
  let shown = -1
  return {
    floors: meshes,
    showUpTo(floor) {
      if (floor === shown) return
      shown = floor
      meshes.forEach((m, i) => m.setEnabled(i <= floor))
    },
    dispose() {
      for (const m of meshes) m.dispose()
      mat.dispose()
    },
  }
}
