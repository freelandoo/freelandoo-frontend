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
// mm3d-62e (pedido do Alex): o Paint ganha DIA E NOITE pelo relógio de
// Brasília (o mesmo céu, as mesmas luzes e a mesma virada do bairro/centro —
// atmosphere.ts), POSTES DE LUZ da cidade em cima das ilhas (acendem de
// noite, com poça de luz no chão), o chão das ilhas no calçamento da cidade
// (lajes no miolo e pedra portuguesa na borda, os materiais do bairro) e os
// pilares/caixotes no acabamento dos prédios (tijolo, cantaria, latão). Saem
// os cristais (o material deles saía preto: os "pontos pretos" nas ilhas) e
// as lanternas penduradas embaixo da borda.
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
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { GeoBuilder, place, type RGB } from "../../engine/geometry"
import { postLantern, steamLamp } from "../../engine/steampunk/kit"
import { Sky, applyLights, brasiliaHour, nightFactor } from "../../engine/steampunk/atmosphere"
import { AirshipFleet, SP, SteamStage, fleetRing, rivetRing, tierOf, xf } from "../../engine/steampunk/scenery"
import type { Island, PaintMap, Solid } from "../sim/map"
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

/** Chão das ilhas = o calçamento da cidade (center.ts/neighborhood.ts). */
export const CITY = {
  pave: [0.98, 0.93, 0.83] as RGB,
  cobble: [0.82, 0.74, 0.64] as RGB,
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

export type RockBuf = { p: number[]; c: number[]; i: number[] }

/**
 * Topo (mm3d-62): miolo claro em leque + anel de lajes radiais na borda
 * (arenito, uma laje sim outra não mais escura) com um sulco entre os dois.
 * Tudo na altura da colisão (o pé não afunda). Embaixo, pedra em camadas que
 * afina até a ponta, recortada, com estalactites.
 */
export function islandGeometry(isl: Pick<Island, "id" | "x" | "y" | "z" | "r" | "depth">, rock: RockBuf) {
  const seg = Math.max(18, Math.min(60, Math.round(isl.r * 5)))
  const wob = (k: number) => 1 + (rnd(isl.id * 977 + k) - 0.5) * 0.05
  const ring: [number, number][] = []
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2
    const r = isl.r * wob(k)
    ring.push([isl.x + Math.sin(a) * r, isl.z + Math.cos(a) * r])
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

export interface PaintWorldView {
  /** mm3d-77: peças altas de enfeite que a câmera não atravessa (não colidem com ninguém). */
  camBlockers?: Solid[]
  setPortalOpen(team: number, open: boolean): void
  tick(dt: number): void
  dispose(): void
}

export function buildPaintWorld(scene: Scene, map: PaintMap, lowEnd: boolean): PaintWorldView {
  const disposers: (() => void)[] = []

  // ── ilhas ──
  const rock: RockBuf = { p: [], c: [], i: [] }
  for (const isl of map.islands) islandGeometry(isl, rock)

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
    rockMesh.dispose()
    rockMat.dispose()
  })

  // ── mm3d-62: cipós caindo da borda ──
  const vg = new GeoBuilder()
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
  }
  const vines = vg.build("paint-vines", scene, rockMat)
  disposers.push(() => vines.dispose())

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
    // chão da cidade (mm3d-62e): pedra portuguesa na borda, lajes no miolo —
    // por cima da colisão só alguns milímetros (o pé não afunda)
    const sides = Math.max(18, Math.min(56, Math.round(isl.r * 5)))
    ctx.cobble.cylinder(isl.r * 2, 0.06, place(isl.x, isl.y - 0.025, isl.z), CITY.cobble, sides)
    const inner = Math.max(isl.r * 0.55, isl.r - Math.min(0.9, Math.max(0.45, isl.r * 0.14)))
    ctx.pavers.cylinder(inner * 2, 0.06, place(isl.x, isl.y - 0.02, isl.z), CITY.pave, sides)
    rivetRing(ctx.props, isl.x, isl.y + 0.03, isl.z, isl.r * 0.995, 0.16, 0, SP.brass)
    // postes de luz da cidade na borda de cima (sem colisão: é desenho)
    const nl = isl.r >= 7 ? 4 : isl.r >= 4.5 ? 2 : isl.r >= 2.4 ? 1 : 0
    for (let k = 0; k < nl; k++) {
      const a = (k / nl) * Math.PI * 2 + isl.id * 0.7 + Math.PI / 4
      const rr = isl.r - 0.55
      steamLamp(ctx, isl.x + Math.sin(a) * rr, isl.z + Math.cos(a) * rr, { y: isl.y, collide: false, gearSeed: isl.id * 7 + k })
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
    for (const s of [-1, 1]) postLantern(ctx, s * TUNING.portalR * 1.15, 0.3, 0, 0.8, f, p.y)
  })
  // pilares = colunas de prédio (base de cantaria, fuste de tijolo, cornija de
  // latão e uma lanterna em cima); caixotes de madeira com cantoneiras —
  // mesmas medidas da colisão (sim/map.ts)
  for (const p of map.props) {
    if (p.kind === "pillar") {
      const d = p.s * 2
      ctx.props.cylinder(d * 1.18, 0.34, place(p.x, p.y + 0.17, p.z), SP.masonryDark, 8)
      ctx.props.cylinder(d, p.h - 0.5, place(p.x, p.y + 0.34 + (p.h - 0.5) / 2, p.z), SP.brick, 8)
      for (const fy of [0.38, 0.7]) ctx.props.cylinder(d * 1.06, 0.1, place(p.x, p.y + p.h * fy, p.z), SP.masonry, 8)
      ctx.props.cylinder(d * 1.22, 0.16, place(p.x, p.y + p.h - 0.08, p.z), SP.brassDark, 8)
      postLantern(ctx, p.x, p.y + p.h, p.z, 0.7, undefined, p.y)
    } else {
      const sz = p.s * 2
      ctx.props.box(sz, p.h, sz, place(p.x, p.y + p.h / 2, p.z, p.rot), SP.woodLight)
      for (const sy of [0.06, p.h - 0.06]) ctx.props.box(sz + 0.04, 0.1, sz + 0.04, place(p.x, p.y + sy, p.z, p.rot), SP.brassDark)
      ctx.props.box(sz * 1.38, 0.08, 0.1, place(p.x, p.y + p.h / 2, p.z, p.rot + Math.PI / 4), SP.iron)
    }
  }
  // ── Projeto B 3f: o que a ref da Cidade tem e faltava — corrimão de latão
  // com lampião no lado de fora das ilhas grandes, estandartes azuis com a
  // engrenagem, a engrenagem dourada no chão do nascer e a TORRE DO RELÓGIO
  // ao longe atrás de cada base (mostrador aceso). Só desenho, sem colisão.
  {
    let mx = 0
    let mz = 0
    for (const isl of map.islands) {
      mx += isl.x
      mz += isl.z
    }
    mx /= Math.max(1, map.islands.length)
    mz /= Math.max(1, map.islands.length)
    const navy: RGB = [0.14, 0.2, 0.46]
    const warm: RGB = [1, 0.78, 0.42]
    const baseIds = new Set(map.bases.map((b) => b.island))
    for (const isl of map.islands) {
      const big = baseIds.has(isl.id) || isl.r >= 6
      if (!big) continue
      // arco de corrimão virado para fora do mapa (±70°), postes de latão a cada ~1,8 m
      const out = Math.atan2(isl.x - mx, isl.z - mz)
      const rr = isl.r - 0.3
      const span = 1.22
      const n = Math.max(3, Math.round((rr * span * 2) / 1.8))
      for (let k = 0; k <= n; k++) {
        const a = out - span + (k / n) * span * 2
        const x = isl.x + Math.sin(a) * rr
        const z = isl.z + Math.cos(a) * rr
        ctx.props.cylinder(0.12, 1.0, place(x, isl.y + 0.5, z), SP.brassDark, 6)
        ctx.props.cylinder(0.2, 0.1, place(x, isl.y + 1.02, z), SP.brass, 6)
        if (k % 3 === 0) ctx.glow.box(0.16, 0.2, 0.16, place(x, isl.y + 1.18, z), warm)
        if (k < n) {
          const a2 = out - span + ((k + 0.5) / n) * span * 2
          const seg = (rr * span * 2) / n + 0.06
          for (const [h, t] of [[0.98, 0.07], [0.55, 0.05]] as const) ctx.props.box(t, t, seg, place(isl.x + Math.sin(a2) * rr, isl.y + h, isl.z + Math.cos(a2) * rr, a2 + Math.PI / 2), SP.brass)
        }
      }
      if (!baseIds.has(isl.id)) continue
      // engrenagem de latão no chão do nascer (aro + 12 dentes), rente ao piso
      rivetRing(ctx.props, isl.x, isl.y + 0.035, isl.z, 2.3, 0.14, 0, SP.brass)
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        ctx.props.box(0.36, 0.05, 0.42, place(isl.x + Math.sin(a) * 2.55, isl.y + 0.03, isl.z + Math.cos(a) * 2.55, a), SP.brassDark)
      }
      // dois estandartes azuis com a engrenagem acesa, atrás do nascer
      for (const s of [-1, 1]) {
        const a = out + s * 0.55
        const x = isl.x + Math.sin(a) * (isl.r - 1.2)
        const z = isl.z + Math.cos(a) * (isl.r - 1.2)
        const face = a + Math.PI
        ctx.props.cylinder(0.12, 3.6, place(x, isl.y + 1.8, z), SP.iron, 6)
        ctx.props.box(1.2, 0.08, 0.08, place(x, isl.y + 3.5, z, face + Math.PI / 2), SP.brass)
        ctx.props.box(1.0, 1.8, 0.05, place(x, isl.y + 2.5, z, face + Math.PI / 2), navy)
        ctx.props.box(1.0, 0.12, 0.06, place(x, isl.y + 1.55, z, face + Math.PI / 2), SP.brass)
        ctx.glow.box(0.36, 0.36, 0.04, place(x + Math.sin(face) * 0.04, isl.y + 2.6, z + Math.cos(face) * 0.04, face + Math.PI / 2 + Math.PI / 4), [1, 0.76, 0.3])
      }
      // torre do relógio ao longe, do outro lado (quem nasce aqui vê a do outro time)
      const tx = isl.x + Math.sin(out) * 150
      const tz = isl.z + Math.cos(out) * 150
      const ty = isl.y - 30
      ctx.props.cylinder(40, 14, place(tx, ty, tz), SP.masonryDark, 12)
      ctx.props.box(16, 62, 16, place(tx, ty + 38, tz), SP.masonry)
      ctx.props.box(19, 3, 19, place(tx, ty + 70, tz), SP.brassDark)
      ctx.props.cylinder(14, 12, place(tx, ty + 78, tz), SP.brick, 8)
      ctx.props.cone(0, 17, 16, place(tx, ty + 92, tz), SP.copper, 8)
      const back = out + Math.PI
      for (const side of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const fa = back + side
        const fx = tx + Math.sin(fa) * 8.1
        const fz = tz + Math.cos(fa) * 8.1
        ctx.glow.cylinder(11, 0.3, xf(fx, ty + 56, fz, fa, undefined, Math.PI / 2), [1, 0.9, 0.64])
        ctx.props.box(0.4, 4.4, 0.5, place(fx + Math.sin(fa) * 0.3, ty + 57.6, fz + Math.cos(fa) * 0.3, fa), SP.iron)
      }
      for (const s of [-1, 1]) {
        const gx = tx + Math.sin(back + s * Math.PI / 2) * 13
        const gz = tz + Math.cos(back + s * Math.PI / 2) * 13
        ctx.gears.push({ m: xf(gx, ty + 46, gz, back, undefined, Math.PI / 2), r: 6, thick: 0.8, speed: s * 0.15 })
      }
    }
  }
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

  // ── dia e noite (mm3d-62e): relógio de Brasília, como no bairro e no centro ──
  const sky = new Sky(scene, 380)
  const cloudDay = new Color3(0.86, 0.8, 0.7)
  const cloudNight = new Color3(0.16, 0.18, 0.3)
  let night = -1
  let forcedHour: number | null = null
  const applyTime = () => {
    const n = nightFactor(forcedHour ?? brasiliaHour())
    if (Math.abs(n - night) < 0.005) return
    night = n
    applyLights(scene, n)
    sky.set(n)
    stage.setNight(n)
    Color3.LerpToRef(cloudDay, cloudNight, n, cloudMat.emissiveColor)
    const r = 1 - 0.75 * n
    rockMat.emissiveColor.set(0.16 * r, 0.15 * r, 0.13 * r)
  }
  const timer = setInterval(applyTime, 20000)
  const devHour = (h: number | null) => {
    forcedHour = h
    night = -1
    applyTime()
  }
  const w = window as unknown as { __mmSetHour?: typeof devHour }
  if (process.env.NODE_ENV !== "production") w.__mmSetHour = devHour
  applyTime()
  disposers.push(() => {
    clearInterval(timer)
    if (w.__mmSetHour === devHour) delete w.__mmSetHour
    sky.dispose()
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
