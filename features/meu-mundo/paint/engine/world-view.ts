// features/meu-mundo/paint/engine/world-view.ts — PAINT (mm3d-35): o mundo desenhado.
//
// Tudo bege e sem cor (a cor do jogo é a tinta): o topo das ilhas em lajes
// (textura procedural de células, como as placas de pedra do vídeo), a
// pedra facetada embaixo, pilares com corda e caixotes, o mar de nuvens, os
// portais de cada time e o chefão PROVISÓRIO (um totem de pedra) na ilha dele.
//
// Poucas chamadas de desenho: os topos de todas as ilhas são UMA malha, a
// pedra + enfeites outra, as nuvens outra. A colisão NÃO sai daqui: é a lista
// de sólidos da regra (sim/map.ts) — o desenho só acompanha.
//
// mm3d-55 — STEAMPUNK: o topo continua claro (a tinta é a cor do jogo), mas
// cada ilha ganha a cinta de ferro e o aro de latão rebitado na borda,
// lanternas penduradas e, nas grandes, o MOTOR embaixo (engrenagem que gira e
// vapor); pilares de ferro com anéis de latão, caixotes de madeira com
// cantoneiras, portais com dentes de engrenagem e lanternas, nuvens douradas
// e dirigíveis em volta.
//
// mm3d-62 (pedido do Alex: redesenhar as ilhas) — a colisão é a MESMA (a
// regra não mudou), só o desenho: o topo ganhou um anel de lajes radiais em
// arenito na borda (lê de longe onde a ilha acaba) com um sulco, o miolo segue
// claro para a tinta aparecer; a pedra de baixo virou camadas (arenito,
// terracota, xisto) mais recortadas, com estalactites penduradas, cristais
// acesos de éter (turquesa e âmbar) brotando da rocha e cipós caindo da borda.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { GeoBuilder, place, type RGB } from "../../engine/geometry"
import { postLantern } from "../../engine/steampunk/kit"
import { AirshipFleet, SP, SteamStage, fleetRing, rivetRing, tierOf, xf } from "../../engine/steampunk/scenery"
import type { Island, PaintMap } from "../sim/map"
import { TUNING } from "../sim/tuning"

/** Pseudo-aleatório fixo (mesma cara a cada partida). */
function rnd(n: number) {
  let h = (n * 2654435761) >>> 0
  h ^= h >>> 15
  h = Math.imul(h, 2246822519) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 3266489917) >>> 0
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export const STONE = {
  top: [0.93, 0.89, 0.83] as RGB,
  // mm3d-55: borda = cinta de ferro; pedra mais quente e mais escura; latão e madeira.
  rim: [0.25, 0.24, 0.25] as RGB,
  rock: [0.66, 0.58, 0.48] as RGB,
  deep: [0.46, 0.4, 0.33] as RGB,
  rope: SP.brass,
  crate: [0.58, 0.4, 0.25] as RGB,
  crateEdge: SP.brassDark,
  // mm3d-62: borda de lajes e camadas da rocha
  slab: [0.98, 0.84, 0.62] as RGB,
  slabDark: [0.86, 0.68, 0.46] as RGB,
  groove: [0.52, 0.4, 0.3] as RGB,
  strata: [
    [0.94, 0.74, 0.5],
    [0.62, 0.3, 0.2],
    [0.88, 0.64, 0.42],
    [0.42, 0.26, 0.22],
    [0.74, 0.52, 0.36],
    [0.28, 0.22, 0.24],
  ] as RGB[],
  vine: [0.3, 0.52, 0.24] as RGB,
  vineDark: [0.2, 0.38, 0.18] as RGB,
}

/** Cristais de éter (mm3d-62): turquesa e âmbar, acesos. */
const CRYSTAL: RGB[] = [
  [0.2, 0.95, 0.88],
  [1, 0.72, 0.25],
]

/**
 * Lajes de pedra: células (uma semente por quadrado da grade, com repetição
 * nas bordas para emendar sem costura), junta escura e um leve chanfro claro.
 */
function stoneTexture(scene: Scene, size: number) {
  const tex = new DynamicTexture("paint-stone", { width: size, height: size }, scene, true)
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const img = ctx.createImageData(size, size)
  const G = 5
  const cell = size / G
  const seeds: [number, number, number][] = []
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const i = gy * G + gx
    seeds.push([(gx + 0.15 + rnd(i * 3 + 1) * 0.7) * cell, (gy + 0.15 + rnd(i * 3 + 2) * 0.7) * cell, rnd(i * 3 + 3)])
  }
  const [br, bg, bb] = STONE.top
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.floor(x / cell)
      const cy = Math.floor(y / cell)
      let d1 = Infinity
      let d2 = Infinity
      let tint = 0
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const gx = cx + ox
        const gy = cy + oy
        const wx = ((gx % G) + G) % G
        const wy = ((gy % G) + G) % G
        const s = seeds[wy * G + wx]
        const sx = s[0] + (gx - wx) * cell
        const sy = s[1] + (gy - wy) * cell
        const d = Math.hypot(x - sx, y - sy)
        if (d < d1) {
          d2 = d1
          d1 = d
          tint = s[2]
        } else if (d < d2) d2 = d
      }
      const edge = d2 - d1
      let k = 0.965 + tint * 0.05
      if (edge < 2.2) k *= 0.8
      else if (edge < 4.5) k *= 0.8 + ((edge - 2.2) / 2.3) * 0.2
      else if (edge < 9) k *= 1.03
      // grão fino
      k *= 0.985 + rnd(x * 7919 + y * 104729) * 0.03
      const o = (y * size + x) * 4
      img.data[o] = Math.min(255, br * 255 * k)
      img.data[o + 1] = Math.min(255, bg * 255 * k)
      img.data[o + 2] = Math.min(255, bb * 255 * k)
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  tex.update(false)
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.anisotropicFilteringLevel = 4
  return tex
}

type TopBuf = { p: number[]; n: number[]; uv: number[]; c: number[]; i: number[] }
type RockBuf = { p: number[]; c: number[]; i: number[] }

/**
 * Topo (mm3d-62): miolo claro em leque + anel de lajes radiais na borda
 * (arenito, uma laje sim outra não mais escura) com um sulco entre os dois.
 * Tudo na altura da colisão (o pé não afunda). Embaixo, pedra em camadas que
 * afina até a ponta, recortada, com estalactites.
 */
function islandGeometry(isl: Island, top: TopBuf, rock: RockBuf) {
  const seg = Math.max(18, Math.min(60, Math.round(isl.r * 5)))
  const wob = (k: number) => 1 + (rnd(isl.id * 977 + k) - 0.5) * 0.05
  const ring: [number, number][] = []
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2
    const r = isl.r * wob(k)
    ring.push([isl.x + Math.sin(a) * r, isl.z + Math.cos(a) * r])
  }
  const at = (k: number, f: number): [number, number] => [isl.x + (ring[k][0] - isl.x) * f, isl.z + (ring[k][1] - isl.z) * f]
  const band = Math.min(0.85, Math.max(0.42, isl.r * 0.13))
  const fIn = Math.max(0.35, 1 - band / isl.r)
  const fGroove = Math.max(0.3, fIn - 0.06 / isl.r)
  const vtx = (x: number, z: number, c: RGB) => {
    top.p.push(x, isl.y, z)
    top.n.push(0, 1, 0)
    top.uv.push(x / 7, z / 7)
    top.c.push(c[0], c[1], c[2], 1)
    return top.p.length / 3 - 1
  }
  // miolo: leque até o sulco
  const center = vtx(isl.x, isl.z, [1, 1, 1])
  const inner: number[] = []
  for (let k = 0; k < seg; k++) inner.push(vtx(...at(k, fGroove), [1, 1, 1]))
  for (let k = 0; k < seg; k++) top.i.push(center, inner[(k + 1) % seg], inner[k])
  // sulco (faixa fina escura) e lajes (quadriláteros próprios: cor por laje)
  for (let k = 0; k < seg; k++) {
    const k2 = (k + 1) % seg
    const g0 = vtx(...at(k, fGroove), STONE.groove)
    const g1 = vtx(...at(k2, fGroove), STONE.groove)
    const g2 = vtx(...at(k2, fIn), STONE.groove)
    const g3 = vtx(...at(k, fIn), STONE.groove)
    top.i.push(g0, g1, g2, g0, g2, g3)
    const c = k % 2 ? STONE.slab : STONE.slabDark
    const sh = 0.95 + rnd(isl.id * 211 + k) * 0.08
    const cc: RGB = [c[0] * sh, c[1] * sh, c[2] * sh]
    // junta entre as lajes: 4% de cada lado mais escura
    const s0 = vtx(...at(k, fIn), cc)
    const s1 = vtx(...at(k2, fIn), cc)
    const s2 = vtx(...at(k2, 1), cc)
    const s3 = vtx(...at(k, 1), cc)
    top.i.push(s0, s1, s2, s0, s2, s3)
  }

  // pedra em camadas: anéis descendo até a ponta (facetada depois)
  const D = isl.depth
  const rings: { f: number; dy: number; c: RGB }[] = [
    { f: 1, dy: 0, c: STONE.rim },
    { f: 1.02, dy: 0.24, c: STONE.rim },
    { f: 0.99, dy: 0.5, c: STONE.strata[0] },
    { f: 0.93, dy: D * 0.16, c: STONE.strata[1] },
    { f: 0.84, dy: D * 0.3, c: STONE.strata[2] },
    { f: 0.7, dy: D * 0.46, c: STONE.strata[3] },
    { f: 0.52, dy: D * 0.62, c: STONE.strata[4] },
    { f: 0.3, dy: D * 0.8, c: STONE.strata[5] },
  ]
  const base = rock.p.length / 3
  for (let ri = 0; ri < rings.length; ri++) {
    const R = rings[ri]
    for (let k = 0; k < seg; k++) {
      const [x, z] = ring[k]
      // camadas: cada uma salta para fora/dentro um pouco (ressalto de rocha)
      const jit = ri >= 3 ? 1 + (rnd(isl.id * 131 + ri * 17 + k) - 0.5) * 0.3 : 1
      const dyj = ri >= 3 ? (rnd(isl.id * 71 + ri * 5 + k) - 0.5) * D * 0.07 : 0
      rock.p.push(isl.x + (x - isl.x) * R.f * jit, isl.y - R.dy + dyj, isl.z + (z - isl.z) * R.f * jit)
      const shade = 0.9 + rnd(isl.id * 53 + ri * 11 + k) * 0.14
      rock.c.push(R.c[0] * shade, R.c[1] * shade, R.c[2] * shade, 1)
    }
  }
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let k = 0; k < seg; k++) {
      const a = base + ri * seg + k
      const b2 = base + ri * seg + ((k + 1) % seg)
      const c = a + seg
      const d = b2 + seg
      rock.i.push(a, b2, c, b2, d, c)
    }
  }
  const tip = rock.p.length / 3
  rock.p.push(isl.x + (rnd(isl.id) - 0.5) * isl.r * 0.2, isl.y - D, isl.z + (rnd(isl.id + 9) - 0.5) * isl.r * 0.2)
  const dc = STONE.strata[5]
  rock.c.push(dc[0] * 0.85, dc[1] * 0.85, dc[2] * 0.85, 1)
  const last = base + (rings.length - 1) * seg
  for (let k = 0; k < seg; k++) rock.i.push(last + k, last + ((k + 1) % seg), tip)

  // estalactites: cones de pedra pendurados no meio da rocha
  const nSt = isl.r >= 6 ? 6 : isl.r >= 3.5 ? 3 : 1
  for (let n = 0; n < nSt; n++) {
    const a = rnd(isl.id * 19 + n * 7) * Math.PI * 2
    const rr = isl.r * (0.25 + rnd(isl.id * 23 + n) * 0.4)
    const cx = isl.x + Math.sin(a) * rr
    const cz = isl.z + Math.cos(a) * rr
    const y0 = isl.y - D * (0.3 + (rr / isl.r) * -0.1 + 0.2)
    const len = D * (0.25 + rnd(isl.id * 29 + n) * 0.35)
    const w = Math.max(0.25, isl.r * 0.09)
    const b0 = rock.p.length / 3
    for (let k = 0; k < 5; k++) {
      const t = (k / 5) * Math.PI * 2
      rock.p.push(cx + Math.sin(t) * w, y0, cz + Math.cos(t) * w)
      const c = STONE.strata[3 + (n % 3)]
      rock.c.push(c[0], c[1], c[2], 1)
    }
    rock.p.push(cx, y0 - len, cz)
    rock.c.push(dc[0] * 0.8, dc[1] * 0.8, dc[2] * 0.8, 1)
    for (let k = 0; k < 5; k++) rock.i.push(b0 + k, b0 + ((k + 1) % 5), b0 + 5)
  }
}

/** Cristal (bipirâmide de 6 lados) apontando na direção `dir`. */
function crystal(g: GeoBuilder, x: number, y: number, z: number, h: number, w: number, tiltX: number, tiltZ: number, color: RGB) {
  const m = Matrix.RotationYawPitchRoll(rnd(x * 13 + z) * Math.PI, tiltX, tiltZ).multiply(Matrix.Translation(x, y, z))
  g.cylinder(w, h * 0.55, Matrix.Translation(0, h * 0.27, 0).multiply(m), color, 6)
  g.sphere(w * 1.02, [1, (h * 0.9) / w, 1], Matrix.Translation(0, h * 0.55, 0).multiply(m), color, 4)
}

export interface PaintWorldView {
  setPortalOpen(team: number, open: boolean): void
  tick(dt: number): void
  dispose(): void
}

export function buildPaintWorld(scene: Scene, map: PaintMap, lowEnd: boolean): PaintWorldView {
  const disposers: (() => void)[] = []

  // ── ilhas ──
  const top: TopBuf = { p: [], n: [], uv: [], c: [], i: [] }
  const rock: RockBuf = { p: [], c: [], i: [] }
  for (const isl of map.islands) islandGeometry(isl, top, rock)

  const stone = stoneTexture(scene, lowEnd ? 256 : 512)
  const topMat = new StandardMaterial("paint-top", scene)
  topMat.diffuseTexture = stone
  topMat.specularColor = new Color3(0.04, 0.04, 0.04)
  topMat.emissiveColor = new Color3(0.2, 0.19, 0.17)
  const topMesh = new Mesh("paint-tops", scene)
  const vdTop = new VertexData()
  vdTop.positions = top.p
  vdTop.normals = top.n
  vdTop.uvs = top.uv
  vdTop.colors = top.c
  vdTop.indices = top.i
  vdTop.applyToMesh(topMesh, false)
  topMesh.material = topMat
  topMesh.isPickable = false
  topMesh.freezeWorldMatrix()

  const rockMat = new StandardMaterial("paint-rock", scene)
  rockMat.diffuseColor = new Color3(1, 1, 1)
  rockMat.specularColor = new Color3(0.03, 0.03, 0.03)
  rockMat.emissiveColor = new Color3(0.16, 0.15, 0.13)
  const rockMesh = new Mesh("paint-rock", scene)
  const vdRock = new VertexData()
  vdRock.positions = rock.p
  vdRock.colors = rock.c
  vdRock.indices = rock.i
  const rn: number[] = []
  VertexData.ComputeNormals(rock.p, rock.i, rn)
  vdRock.normals = rn
  vdRock.applyToMesh(rockMesh, true)
  rockMesh.convertToFlatShadedMesh()
  rockMesh.material = rockMat
  rockMesh.isPickable = false
  rockMesh.freezeWorldMatrix()
  disposers.push(() => {
    topMesh.dispose()
    rockMesh.dispose()
    topMat.dispose()
    rockMat.dispose()
    stone.dispose()
  })

  // ── enfeites (mesmos sólidos da regra) ──
  const g = new GeoBuilder()
  for (const p of map.props) {
    if (p.kind === "pillar") {
      g.cylinder(p.s * 2, p.h, place(p.x, p.y + p.h / 2, p.z), SP.ironHi, 10)
      g.cylinder(p.s * 2.4, 0.16, place(p.x, p.y + p.h - 0.08, p.z), SP.brassDark, 10)
      g.cylinder(p.s * 2.4, 0.2, place(p.x, p.y + 0.1, p.z), SP.iron, 10)
      for (const fy of [0.45, 0.62]) g.cylinder(p.s * 2.12, 0.07, place(p.x, p.y + p.h * fy, p.z), STONE.rope, 10)
    } else {
      const s = p.s * 2
      g.box(s, p.h, s, place(p.x, p.y + p.h / 2, p.z, p.rot), STONE.crate)
      for (const sy of [0.06, p.h - 0.06]) g.box(s + 0.04, 0.1, s + 0.04, place(p.x, p.y + sy, p.z, p.rot), STONE.crateEdge)
      g.box(s * 1.38, 0.08, 0.1, place(p.x, p.y + p.h / 2, p.z, p.rot + Math.PI / 4), STONE.crateEdge)
    }
  }
  const propsMesh = g.build("paint-props", scene, rockMat)
  disposers.push(() => propsMesh.dispose())

  // ── mm3d-62: cipós caindo da borda e cristais de éter na rocha ──
  const vg = new GeoBuilder()
  const xg = new GeoBuilder()
  for (const isl of map.islands) {
    const nv = Math.round(isl.r * (lowEnd ? 0.8 : 1.6))
    for (let n = 0; n < nv; n++) {
      const a = rnd(isl.id * 41 + n * 3) * Math.PI * 2
      const len = 0.6 + rnd(isl.id * 43 + n) * Math.min(3, isl.depth * 0.3)
      const r = isl.r * 1.0
      const x = isl.x + Math.sin(a) * r
      const z = isl.z + Math.cos(a) * r
      vg.box(0.09, len, 0.09, place(x, isl.y - 0.2 - len / 2, z, a), n % 2 ? STONE.vine : STONE.vineDark)
      // folhinhas
      for (let k = 1; k <= 2; k++) vg.box(0.26, 0.05, 0.16, place(x, isl.y - 0.2 - len * (k / 3), z, a + k), STONE.vine)
    }
    const nc = isl.r >= 6 ? (lowEnd ? 2 : 4) : isl.r >= 3.5 ? (lowEnd ? 1 : 2) : 0
    for (let n = 0; n < nc; n++) {
      const a = rnd(isl.id * 61 + n * 5) * Math.PI * 2
      const dy = isl.depth * (0.12 + rnd(isl.id * 67 + n) * 0.3)
      const f = 0.95 - (dy / isl.depth) * 0.7
      const x = isl.x + Math.sin(a) * isl.r * f
      const z = isl.z + Math.cos(a) * isl.r * f
      const color = CRYSTAL[(isl.id + n) % 2]
      // cachinho de 3: o maior para fora, dois menores tortos
      const h = 1.4 + rnd(isl.id * 71 + n) * 1.3
      crystal(xg, x, isl.y - dy, z, h, h * 0.36, Math.cos(a) * 1.1, -Math.sin(a) * 1.1, color)
      crystal(xg, x + Math.cos(a) * 0.35, isl.y - dy - 0.15, z - Math.sin(a) * 0.35, h * 0.6, h * 0.24, Math.cos(a) * 1.4 + 0.3, -Math.sin(a) * 1.4, color)
      crystal(xg, x - Math.cos(a) * 0.35, isl.y - dy - 0.1, z + Math.sin(a) * 0.35, h * 0.5, h * 0.2, Math.cos(a) * 0.8 - 0.3, -Math.sin(a) * 0.8, color)
    }
  }
  const vines = vg.build("paint-vines", scene, rockMat)
  const crystalMat = new StandardMaterial("paint-crystal", scene)
  // acesos: sem luz, a cor por vértice inteira (o éter brilha no escuro da rocha)
  crystalMat.disableLighting = true
  crystalMat.diffuseColor = new Color3(1, 1, 1)
  crystalMat.emissiveColor = new Color3(0, 0, 0)
  const crystals = xg.build("paint-crystals", scene, crystalMat)
  disposers.push(() => {
    vines.dispose()
    crystals.dispose()
    crystalMat.dispose()
  })

  // ── nuvens (embaixo e no horizonte) ──
  const cg = new GeoBuilder()
  const puffs = lowEnd ? 70 : 130
  for (let i = 0; i < puffs; i++) {
    const a = rnd(i * 3 + 101) * Math.PI * 2
    const far = i % 3 === 0
    const d = far ? 120 + rnd(i * 5 + 7) * 90 : rnd(i * 5 + 7) * 95
    const x = Math.sin(a) * d
    const z = Math.cos(a) * d * 0.7
    const y = far ? -12 + rnd(i + 3) * 18 : -22 + rnd(i + 3) * 10
    const s = (far ? 26 : 14) * (0.6 + rnd(i * 7 + 2) * 0.8)
    for (let k = 0; k < 4; k++) {
      const ox = (rnd(i * 31 + k) - 0.5) * s * 0.9
      const oz = (rnd(i * 37 + k) - 0.5) * s * 0.5
      const ks = s * (0.55 + rnd(i * 41 + k) * 0.4)
      cg.sphere(ks, [1, 0.42, 0.8], place(x + ox, y + rnd(i * 43 + k) * s * 0.12, z + oz), [1, 1, 1], 8)
    }
  }
  // um "chão" de nuvem para nunca mostrar vazio embaixo
  cg.cylinder(520, 0.5, place(0, -26, 0), [0.97, 0.98, 1], 32)
  // o mesmo em volta da ilha do chefão
  const bi = map.islands[map.boss.island]
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const d = 30 + rnd(i + 900) * 40
    cg.sphere(18 + rnd(i + 950) * 14, [1, 0.42, 0.8], place(bi.x + Math.sin(a) * d, bi.y - 18 - rnd(i + 990) * 8, bi.z + Math.cos(a) * d), [1, 1, 1], 8)
  }
  cg.cylinder(260, 0.5, place(bi.x, bi.y - 26, bi.z), [0.97, 0.98, 1], 32)
  const cloudMat = new StandardMaterial("paint-cloud", scene)
  cloudMat.diffuseColor = new Color3(0.35, 0.36, 0.4)
  cloudMat.emissiveColor = new Color3(0.86, 0.8, 0.7)
  cloudMat.specularColor = new Color3(0, 0, 0)
  const clouds = cg.build("paint-clouds", scene, cloudMat)
  disposers.push(() => {
    clouds.dispose()
    cloudMat.dispose()
  })

  // ── portais (um por time, no topo) ──
  const portalNodes: { root: TransformNode; ring: StandardMaterial; swirl: Mesh; swirlMat: StandardMaterial; open: boolean }[] = []
  const swirlTex = new DynamicTexture("paint-swirl", { width: 256, height: 256 }, scene, true)
  {
    const ctx = swirlTex.getContext() as unknown as CanvasRenderingContext2D
    const grd = ctx.createRadialGradient(128, 128, 8, 128, 128, 128)
    grd.addColorStop(0, "rgba(255,255,255,1)")
    grd.addColorStop(0.45, "rgba(255,240,200,0.9)")
    grd.addColorStop(1, "rgba(255,200,120,0)")
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 256, 256)
    ctx.strokeStyle = "rgba(255,255,255,0.65)"
    ctx.lineWidth = 6
    for (let k = 0; k < 5; k++) {
      ctx.beginPath()
      for (let t = 0; t < 1; t += 0.02) {
        const a = k * 1.256 + t * 5
        const r = 12 + t * 110
        const x = 128 + Math.cos(a) * r
        const y = 128 + Math.sin(a) * r
        if (t === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    swirlTex.hasAlpha = true
    swirlTex.update(false)
  }
  map.portals.forEach((p, team) => {
    const root = new TransformNode(`paint-portal-${team}`, scene)
    root.position.set(p.x, p.y, p.z)
    // de frente para o meio do mapa
    root.rotation.y = Math.atan2(-p.x, 0)
    const ringMat = new StandardMaterial(`paint-portal-ring-${team}`, scene)
    ringMat.diffuseColor = new Color3(0.78, 0.6, 0.22)
    ringMat.specularColor = new Color3(0.4, 0.34, 0.2)
    const ring = CreateTorus(`paint-portal-ring-${team}`, { diameter: TUNING.portalR * 2, thickness: 0.34, tessellation: 40 }, scene)
    ring.rotation.x = Math.PI / 2
    ring.position.y = TUNING.portalR + 0.15
    ring.parent = root
    ring.material = ringMat
    ring.isPickable = false
    const swirlMat = new StandardMaterial(`paint-portal-swirl-${team}`, scene)
    swirlMat.diffuseTexture = swirlTex
    swirlMat.opacityTexture = swirlTex
    swirlMat.emissiveColor = new Color3(1, 0.85, 0.5)
    swirlMat.disableLighting = true
    swirlMat.backFaceCulling = false
    const swirl = CreateDisc(`paint-portal-swirl-${team}`, { radius: TUNING.portalR - 0.12, tessellation: 36 }, scene)
    swirl.position.y = TUNING.portalR + 0.15
    swirl.parent = root
    swirl.material = swirlMat
    swirl.isPickable = false
    swirl.setEnabled(false)
    // base de pedra
    const pg = new GeoBuilder()
    pg.cylinder(TUNING.portalR * 2.6, 0.3, place(0, 0.15, 0), STONE.rim, 24)
    const pedestal = pg.build(`paint-portal-base-${team}`, scene, rockMat, false)
    pedestal.parent = root
    portalNodes.push({ root, ring: ringMat, swirl, swirlMat, open: false })
    disposers.push(() => {
      root.dispose(false, true)
      ringMat.dispose()
      swirlMat.dispose()
    })
  })
  disposers.push(() => swirlTex.dispose())

  // ── steampunk: aros, cintas, lanternas, motores, dentes dos portais, dirigíveis ──
  const stage = new SteamStage(scene, tierOf(lowEnd))
  const { ctx } = stage
  for (const isl of map.islands) {
    rivetRing(ctx.props, isl.x, isl.y + 0.03, isl.z, isl.r * 0.995, 0.16, 0, SP.brass)
    const nl = isl.r >= 6 ? 4 : isl.r >= 3.5 ? 2 : 0
    for (let k = 0; k < nl; k++) {
      const a = (k / nl) * Math.PI * 2 + isl.id
      postLantern(ctx, isl.x + Math.sin(a) * isl.r * 1.03, isl.y - 0.75, isl.z + Math.cos(a) * isl.r * 1.03, 0.6)
    }
    if (isl.r < 5) continue
    // motor embaixo: eixo de ferro, a engrenagem girando e o vapor saindo do bico
    const by = isl.y - isl.depth * 0.9
    ctx.props.cylinder(isl.r * 0.2, isl.depth * 0.35, place(isl.x, by + isl.depth * 0.1, isl.z), SP.iron, 8)
    ctx.props.cylinder(isl.r * 0.32, 0.2, place(isl.x, by - 0.2, isl.z), SP.copperDark, 12)
    ctx.gears.push({ m: place(isl.x, by - 0.45, isl.z), r: isl.r * 0.22, thick: 0.22, speed: isl.id % 2 ? 0.5 : -0.5 })
    ctx.vents.push([isl.x + isl.r * 0.62, isl.y - 0.5, isl.z])
    // dois canos de cobre descendo pela pedra
    for (const s of [-1, 1]) {
      const px = isl.x + s * isl.r * 0.7
      ctx.props.pipe([[px, isl.y - 0.4, isl.z + isl.r * 0.72], [px, isl.y - isl.depth * 0.35, isl.z + isl.r * 0.52], [isl.x + s * isl.r * 0.18, by + isl.depth * 0.12, isl.z]], 0.12, SP.copper, SP.brassDark)
    }
  }
  map.portals.forEach((p) => {
    const f = place(p.x, p.y, p.z, Math.atan2(-p.x, 0))
    const R = TUNING.portalR + 0.18
    const cy = TUNING.portalR + 0.15
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2
      ctx.props.box(0.3, 0.34, 0.26, xf(Math.cos(a) * R, cy + Math.sin(a) * R, 0, 0, f, 0, a), SP.brassDark)
    }
    for (const s of [-1, 1]) postLantern(ctx, s * TUNING.portalR * 1.15, 0.3, 0, 0.8, f)
  })
  stage.build("paint-steam")
  let cx = 0
  let cz = 0
  for (const isl of map.islands) {
    cx += isl.x
    cz += isl.z
  }
  cx /= Math.max(1, map.islands.length)
  cz /= Math.max(1, map.islands.length)
  const fleet = lowEnd ? null : new AirshipFleet(scene, stage.mats, fleetRing(5, 95, 150, 22, 48, 22, 35), cx, cz)
  disposers.push(() => {
    fleet?.dispose()
    stage.dispose()
  })

  let clock = 0
  return {
    setPortalOpen(team, open) {
      const p = portalNodes[team]
      if (!p || p.open === open) return
      p.open = open
      p.swirl.setEnabled(open)
      p.ring.emissiveColor = open ? new Color3(0.85, 0.62, 0.2) : new Color3(0, 0, 0)
      p.ring.diffuseColor = open ? new Color3(0.95, 0.76, 0.3) : new Color3(0.78, 0.6, 0.22)
    },
    tick(dt) {
      clock += dt
      for (const p of portalNodes) if (p.open) p.swirl.rotation.z = -clock * 1.6
    },
    dispose() {
      for (const d of disposers.splice(0)) d()
    },
  }
}
