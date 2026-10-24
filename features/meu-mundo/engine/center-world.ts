// features/meu-mundo/engine/center-world.ts
//
// Constrói o Centro da cidade (mm3d-17) a partir da planta que veio do
// servidor (freelandoo-backend/src/utils/meuMundoCenter.js). É a MESMA para
// todas as salas: a sala só muda quem está nela.
//
// O que é estático (chão, ruas, calçadas, praça, floreiras, bancos, postes,
// árvores, estacionamentos, portal) entra em DUAS malhas, como no bairro: a do
// mundo (cor por vértice) e a das placas (texto dos nomes, desenhado UMA vez
// no idioma de quem joga). Os prédios são os GLBs do pipeline (center-models);
// enquanto um não chega — ou se falhar — fica no lugar um bloco simples com a
// pegada, a porta e a placa do local, para nunca haver buraco nem atravessar
// fachada (a colisão é sempre a do servidor).
//
// Nada aqui carrega interior, animação de academia/luta ou casa de bairro.

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Scene } from "@babylonjs/core/scene"
import { GeoBuilder, frameOf, place, type RGB } from "./geometry"
import type { Box2 } from "./collision"
import { C, bench, flowerPatch, lamp, slab, tree, type PropCtx } from "./world"
import type { BuiltWorld } from "./world"
import { CenterModels } from "./center-models"
import type { CenterLayout, CenterPlace, HouseCatalog, Interactable } from "../types"

export interface CenterLabels {
  /** Nome do local já traduzido. */
  place: (p: CenterPlace) => string
  /** Letreiro do portal (volta para casa). */
  portal: string
}

// Cores próprias do centro (o resto é a paleta do bairro).
const K = {
  pave: [0.86, 0.84, 0.8],
  paveDark: [0.78, 0.76, 0.72],
  asphalt: [0.33, 0.34, 0.39],
  stripe: [0.97, 0.96, 0.9],
  planter: [0.72, 0.62, 0.52],
  soil: [0.42, 0.3, 0.22],
  water: [0.55, 0.78, 0.9],
  gold: [0.95, 0.76, 0.28],
  portal: [0.94, 0.62, 0.22],
  board: [0.17, 0.15, 0.13],
} satisfies Record<string, RGB>

// Blocos de reserva: um tom por zona (a identidade de verdade vem do modelo).
const ZONE: Record<CenterPlace["zone"], RGB> = {
  comercial: [0.98, 0.86, 0.66],
  educacional: [0.78, 0.86, 0.95],
  atividades: [0.84, 0.92, 0.78],
  civica: [0.93, 0.88, 0.92],
}

// ── Atlas dos letreiros: um local por linha e o portal na última ─────────────
// (12 células de 84 px cabem nos 1024: 11 locais + portal.)
const ATLAS_W = 1024
const ATLAS_H = 1024
const CELL_H = 84

function cellUV(i: number): [number, number, number, number] {
  return [0, 1 - ((i + 1) * CELL_H) / ATLAS_H, 1, 1 - (i * CELL_H) / ATLAS_H]
}

function drawLabels(tex: DynamicTexture, names: string[]) {
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  ctx.clearRect(0, 0, ATLAS_W, ATLAS_H)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  names.forEach((name, i) => {
    const y = i * CELL_H
    ctx.fillStyle = "#2B2620"
    ctx.fillRect(0, y, ATLAS_W, CELL_H)
    ctx.fillStyle = "#FFC600"
    ctx.fillRect(0, y + CELL_H - 8, ATLAS_W, 8)
    // Cabe na célula: diminui a fonte para nome longo (traduções).
    let size = 64
    ctx.font = `800 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`
    while (ctx.measureText(name.toUpperCase()).width > ATLAS_W - 60 && size > 30) {
      size -= 4
      ctx.font = `800 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`
    }
    ctx.fillStyle = "#FFF6DD"
    ctx.fillText(name.toUpperCase(), ATLAS_W / 2, y + CELL_H / 2 - 2)
  })
  tex.update(true)
}

/** Largura do letreiro na fachada (m). */
export function boardWidth(p: CenterPlace) {
  return Math.min(p.model.width * 0.62, 7.4)
}
/** Altura do centro do letreiro (m): a faixa entre a porta e o emblema, reservada nos modelos. */
export const BOARD_Y = 3.5
const BOARD_H = 0.9

// ── Peças ─────────────────────────────────────────────────────────────────────
/** Faixa de pista curva: anel de raio r0..r1 em volta de (cx, cz), de a0 a a1 (rad). */
function arc(g: GeoBuilder, cx: number, cz: number, r0: number, r1: number, a0: number, a1: number, top: number, color: RGB, n = 10) {
  const da = (a1 - a0) / n
  const rm = (r0 + r1) / 2
  const len = 2 * r1 * Math.tan(da / 2) + 0.08
  for (let i = 0; i < n; i++) {
    const a = a0 + da * (i + 0.5)
    const x = cx + Math.cos(a) * rm
    const z = cz + Math.sin(a) * rm
    // A caixa tem o comprimento no X local: girar até a tangente (−sen a, cos a).
    g.box(len, top, r1 - r0, place(x, top / 2, z, Math.PI / 2 - a), color)
  }
}

function roads(ctx: PropCtx, c: CenterLayout) {
  const { geo } = ctx
  const d = c.dims
  const k = d.ring - d.cornerR // centro das curvas
  const road = 2 * d.roadHalf
  // Calçadão: tudo até a linha das fachadas é pavimento (a pista vai por cima).
  slab(geo, 0, 0, 2 * d.front, 2 * d.front, 0.05, K.pave)
  // Anel: quatro retas + quatro curvas de raio d.cornerR no eixo.
  slab(geo, 0, d.ring, 2 * k, road, 0.065, K.asphalt)
  slab(geo, 0, -d.ring, 2 * k, road, 0.065, K.asphalt)
  slab(geo, d.ring, 0, road, 2 * k, 0.065, K.asphalt)
  slab(geo, -d.ring, 0, road, 2 * k, 0.065, K.asphalt)
  const corners: [number, number, number][] = [
    [k, k, 0],
    [-k, k, Math.PI / 2],
    [-k, -k, Math.PI],
    [k, -k, (3 * Math.PI) / 2],
  ]
  for (const [cx, cz, a0] of corners) {
    arc(geo, cx, cz, d.cornerR - d.roadHalf, d.cornerR + d.roadHalf, a0, a0 + Math.PI / 2, 0.065, K.asphalt)
    // Calçada de fora da curva (a de dentro é a borda da praça).
    arc(geo, cx, cz, d.cornerR + d.roadHalf, d.cornerR + d.roadHalf + d.sidewalk, a0, a0 + Math.PI / 2, 0.075, C.walk)
  }
  // Calçadas retas de fora do anel (a faixa clara junto à pista).
  const ow = d.ringOut + d.sidewalk / 2
  slab(geo, 0, ow, 2 * k, d.sidewalk, 0.075, C.walk)
  slab(geo, 0, -ow, 2 * k, d.sidewalk, 0.075, C.walk)
  slab(geo, ow, 0, d.sidewalk, 2 * k, 0.075, C.walk)
  slab(geo, -ow, 0, d.sidewalk, 2 * k, 0.075, C.walk)
  // Faixa tracejada no eixo das retas.
  for (let t = -k + 1.5; t <= k - 1.5; t += 3.2) {
    if (Math.abs(t) < 3.5) continue // travessias
    geo.box(1.4, 0.012, 0.16, place(t, 0.072, d.ring), C.roadLine)
    geo.box(1.4, 0.012, 0.16, place(t, 0.072, -d.ring), C.roadLine)
    geo.box(0.16, 0.012, 1.4, place(d.ring, 0.072, t), C.roadLine)
    geo.box(0.16, 0.012, 1.4, place(-d.ring, 0.072, t), C.roadLine)
  }
  // Avenida oeste até o portal, com calçadas dos dois lados.
  const av = d.avenue
  const avLen = av.x0 - av.x1
  slab(geo, (av.x0 + av.x1) / 2, av.z, avLen + 0.5, road, 0.065, K.asphalt)
  const outLen = -d.front - av.x1
  for (const s of [-1, 1]) slab(geo, (-d.front + av.x1) / 2, av.z + s * (av.half + d.sidewalk / 2), outLen, d.sidewalk, 0.075, C.walk)
  for (let t = av.x0 - 3; t >= av.x1 + 3; t -= 3.2) geo.box(1.4, 0.012, 0.16, place(t, 0.072, av.z), C.roadLine)
  // Faixas de pedestre (zebra) nas quatro saídas da praça.
  for (const cw of c.crosswalks) {
    for (let i = -2; i <= 2; i++) {
      if (cw.axis === "z") geo.box(0.55, 0.012, road - 0.6, place(cw.x + i * 1.05, 0.074, cw.z), K.stripe)
      else geo.box(road - 0.6, 0.012, 0.55, place(cw.x, 0.074, cw.z + i * 1.05), K.stripe)
    }
  }
  // Estacionamentos: asfalto e linhas das vagas (2,6 × 5 m).
  for (const lot of c.parking) {
    const [x0, x1, z0, z1] = lot.rect
    slab(geo, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0.06, K.asphalt)
    for (const s of lot.slots) {
      for (const side of [-1.3, 1.3]) geo.box(0.12, 0.012, 4.6, place(s.x + side, 0.068, s.z), K.stripe)
    }
  }
  // Acesso ao estacionamento do supermercado, a partir do canto do anel.
  const sup = c.parking.find((p) => p.id === "estacionamento-supermercado")
  if (sup) slab(geo, sup.rect[0] - 2.5, sup.rect[2] + 3, 6, 6, 0.06, K.asphalt)
  // Chão girado (hospital, mm3d-26). A pista fica acima da calçada do anel
  // (o rebaixo por onde a ambulância sai); a calçada nova, abaixo dela.
  for (const g of c.grounds ?? []) {
    const [top, color] = GROUND[g.kind]
    geo.box(g.w, top, g.d, place(0, top / 2, 0, 0, frameOf(g.x, g.z, g.rot)), color)
  }
}

const GROUND: Record<NonNullable<CenterLayout["grounds"]>[number]["kind"], [number, RGB]> = {
  pave: [0.058, K.pave],
  asphalt: [0.08, K.asphalt],
  walk: [0.07, C.walk],
  mark: [0.083, K.gold],
}

function plaza(ctx: PropCtx, c: CenterLayout) {
  const { geo } = ctx
  const P = c.plaza
  slab(geo, 0, 0, 2 * (P.half + 1), 2 * (P.half + 1), 0.06, K.paveDark)
  slab(geo, 0, 0, 2 * P.half, 2 * P.half, 0.065, C.plaza)
  // Caminhos em cruz até as travessias.
  slab(geo, 0, 0, 3.2, 2 * P.half, 0.068, C.path)
  slab(geo, 0, 0, 2 * P.half, 3.2, 0.068, C.path)
  // Fonte estática no meio: bacia, espelho d'água (cor lisa, sem reflexo), coluna e taça.
  const m = P.monument
  geo.cylinder(2 * m.radius, 0.55, place(m.x, 0.275, m.z), C.stone, 8)
  geo.cylinder(2 * m.radius - 0.5, 0.04, place(m.x, 0.55, m.z), K.water, 8)
  geo.cylinder(0.8, 2.2, place(m.x, 1.1, m.z), C.stone, 8)
  geo.cylinder(1.9, 0.28, place(m.x, 2.2, m.z), C.stone, 8)
  geo.cylinder(1.5, 0.05, place(m.x, 2.36, m.z), K.water, 8)
  geo.cylinder(0.32, 1.1, place(m.x, 2.9, m.z), C.stone, 6)
  geo.sphere(0.7, [1, 1, 1], place(m.x, 3.7, m.z), K.gold, 8)
  // Floreiras na borda (fecham a praça para carros) e frades nas travessias.
  for (const p of P.planters) {
    const f = frameOf(p.x, p.z, p.rot)
    geo.box(2 * p.hx, c.dims.planter.h, 2 * p.hz, place(0, c.dims.planter.h / 2, 0, 0, f), K.planter)
    geo.box(2 * p.hx - 0.2, 0.06, 2 * p.hz - 0.2, place(0, c.dims.planter.h + 0.01, 0, 0, f), K.soil)
    const n = Math.max(1, Math.round((2 * Math.max(p.hx, p.hz)) / 1.6))
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5
      const lx = p.hx >= p.hz ? t * 2 * p.hx : 0
      const lz = p.hx >= p.hz ? 0 : t * 2 * p.hz
      geo.sphere(0.85, [1, 0.7, 1], place(lx, c.dims.planter.h + 0.22, lz, 0, f), i % 2 ? C.hedge : C.hedgeLot, 3)
    }
  }
  for (const [x, z] of P.bollards) geo.cylinder(2 * c.dims.bollard, 0.9, place(x, 0.45, z), C.metal, 8)
  for (const [x, z, rot] of P.benches) bench(ctx, x, z, rot)
  for (const [x, z] of P.lamps) lamp(ctx, x, z)
  for (const [x, z, s] of P.trees) tree(ctx, x, z, s)
  P.flowers.forEach(([x, z], i) => flowerPatch(ctx, x, z, i))
}

function surroundings(ctx: PropCtx, c: CenterLayout) {
  const { geo } = ctx
  const B = c.dims.bound
  const hedge = (x: number, z: number, w: number, d: number) => geo.box(w, 1.5, d, place(x, 0.75, z), C.hedge)
  const L = 2 * B + 1
  hedge(0, B, L, 1)
  hedge(0, -B, L, 1)
  hedge(B, 0, 1, L)
  hedge(-B, (B + 6) / 2 + 0.25, 1, B - 6 + 0.5)
  hedge(-B, -(B + 6) / 2 - 0.25, 1, B - 6 + 0.5)
  // Portão fechado atrás do portal (a volta é pelo portal, não pela estrada).
  for (let i = 0; i < 6; i++) geo.box(0.3, 0.5, 2, place(-B, 0.85, -5 + i * 2 + 1), i % 2 ? C.barrierB : C.barrierA)
  for (const [x, z] of c.streetLamps) lamp(ctx, x, z)
  for (const [x, z, s] of c.streetTrees) tree(ctx, x, z, s)
  // Árvores de fora da cerca: só desenho (profundidade sem caminho falso).
  for (const [x, z, s] of [[-72, 30, 1.3], [-70, -60, 1.2], [30, -73, 1.3], [74, 10, 1.4], [30, 74, 1.4], [-30, 73, 1.3]] as const) {
    tree(ctx, x, z, s, false)
  }
}

/** Portal "Bairros": arco sobre a avenida, com o letreiro virado para o centro. */
function portal(ctx: PropCtx, signs: GeoBuilder, c: CenterLayout) {
  const { geo } = ctx
  const x = c.dims.portalX - 1
  for (const z of [-5.6, 5.6]) {
    geo.box(1, 6, 1, place(x, 3, z), K.portal)
    geo.box(1.3, 0.4, 1.3, place(x, 0.2, z), C.stone)
  }
  geo.box(1, 1.2, 12.4, place(x, 6.4, 0), K.portal)
  geo.box(0.2, 1.1, 8.2, place(x + 0.6, 6.4, 0), K.board)
  // Casinha no topo: a volta é para os bairros.
  geo.box(1.6, 1.2, 1.8, place(x, 7.6, 0), C.board)
  geo.prism(2, 2.3, 0.9, place(x, 8.2, 0, Math.PI / 2), C.barrierA)
  signs.quad(7.8, BOARD_H, cellUV(c.places.length), place(x + 0.72, 6.4, 0, -Math.PI / 2))
}

/** Bloco de reserva de um local: pegada, telhado, porta e a faixa do letreiro. */
function fallbackBlock(g: GeoBuilder, p: CenterPlace) {
  const f = frameOf(p.origin.x, p.origin.z, p.rotationY)
  const w = p.model.width - 0.6
  const d = p.model.depth - 0.6
  const h = p.size.h
  g.box(w, h, d, place(0, h / 2, d / 2 + 0.3, 0, f), ZONE[p.zone])
  g.box(w + 0.4, 0.3, d + 0.4, place(0, h + 0.15, d / 2 + 0.3, 0, f), C.stone)
  g.box(p.door.width, 2.5, 0.14, place(p.model.doorX, 1.25, 0.25, 0, f), C.woodDark)
  for (const sx of [-0.32, 0.32]) {
    const wx = p.model.doorX + sx * w
    if (Math.abs(wx) + 1 > w / 2) continue
    g.box(1.6, 1.3, 0.12, place(wx, 1.8, 0.26, 0, f), C.glass)
  }
}

export function buildCenterWorld(scene: Scene, c: CenterLayout, labels: CenterLabels): BuiltWorld {
  const worldMat = new StandardMaterial("mm-world", scene)
  worldMat.diffuseColor = new Color3(1, 1, 1)
  worldMat.specularColor = new Color3(0, 0, 0)
  worldMat.backFaceCulling = false

  const atlas = new DynamicTexture("mm-center-labels", { width: ATLAS_W, height: ATLAS_H }, scene, true)
  drawLabels(atlas, [...c.places.map((p) => labels.place(p)), labels.portal])
  const signMat = new StandardMaterial("mm-center-signs", scene)
  signMat.diffuseTexture = atlas
  signMat.specularColor = new Color3(0, 0, 0)
  signMat.emissiveColor = new Color3(0.45, 0.45, 0.45)
  signMat.backFaceCulling = false

  const ctx: PropCtx = { geo: new GeoBuilder(), boxes: [], viewOnly: [] }
  const signs = new GeoBuilder()
  const ground = 2 * (c.limit + 60)
  slab(ctx.geo, 0, 0, ground, ground, 0.002, C.grassOut)
  slab(ctx.geo, 0, 0, 2 * c.dims.bound, 2 * c.dims.bound, 0.008, C.grass)
  roads(ctx, c)
  plaza(ctx, c)
  surroundings(ctx, c)
  portal(ctx, signs, c)

  // Calçada na frente de cada prédio (os que passam da linha do calçadão) e o letreiro.
  c.places.forEach((p, i) => {
    const f = frameOf(p.origin.x, p.origin.z, p.rotationY)
    ctx.geo.box(p.model.width + 2, 0.055, 3.2, place(0, 0.0275, -1.6, 0, f), K.pave)
    // Tapete de entrada: mostra onde é a porta.
    ctx.geo.box(Math.max(1.6, p.door.width + 0.6), 0.03, 1.4, place(p.model.doorX, 0.066, -0.75, 0, f), K.gold)
    const bw = boardWidth(p)
    ctx.geo.box(bw + 0.3, BOARD_H + 0.3, 0.16, place(p.model.doorX, BOARD_Y, -0.1, 0, f), K.board)
    signs.quad(bw, BOARD_H, cellUV(i), place(p.model.doorX, BOARD_Y, -0.2, 0, f))
  })

  const world = ctx.geo.build("mm-world", scene, worldMat)
  const signMesh = signs.build("mm-center-signs", scene, signMat)
  worldMat.freeze()
  signMat.freeze()

  // ── Prédios: bloco de reserva até o modelo chegar ──────────────────────────
  const blocks = new Map<string, Mesh>()
  for (const p of c.places) {
    const g = new GeoBuilder()
    fallbackBlock(g, p)
    blocks.set(p.id, g.build(`mm-center-block-${p.id}`, scene, worldMat))
  }
  const models = new CenterModels(scene)
  let disposed = false
  const assets = c.assets
  // Objetos parados (ambulância): só aparecem com o modelo — a caixa de colisão
  // é do servidor e vale mesmo sem ele.
  for (const o of c.props ?? []) {
    const file = assets?.props?.[o.id]
    if (!file) continue
    models.load(`prop-${o.id}`, assets!.basePath + file, frameOf(o.x, o.z, o.facing + Math.PI)).catch((err) => {
      if (!disposed && process.env.NODE_ENV !== "production") console.warn("[meu-mundo] modelo do centro falhou", o.id, err)
    })
  }
  if (assets) {
    for (const p of c.places) {
      const file = assets.places[p.id]
      if (!file) continue
      models
        .load(p.id, assets.basePath + file, frameOf(p.origin.x, p.origin.z, p.rotationY))
        .then(() => {
          if (disposed) return
          blocks.get(p.id)?.dispose()
          blocks.delete(p.id)
        })
        .catch((err) => {
          // O bloco fica (a colisão e a entrada não dependem do modelo).
          if (!disposed && process.env.NODE_ENV !== "production") console.warn("[meu-mundo] modelo do centro falhou", p.id, err)
        })
    }
  }

  // Colisão: a lista do SERVIDOR (a mesma que a sala usa). Câmera: + copas.
  const boxes: Box2[] = c.obstacles.map((b) => ({ ...b }))
  const viewBoxes = [...boxes, ...ctx.viewOnly]

  const interactables: Interactable[] = c.places.map((p) => ({
    kind: "place" as const,
    id: `place-${p.id}`,
    x: p.interact.x,
    z: p.interact.z,
    radius: p.interact.radius,
    place: p,
  }))
  interactables.push({ kind: "portal", id: c.portal.id, x: c.portal.x + 1.5, z: c.portal.z, radius: c.portal.radius })

  const noCatalog: HouseCatalog = { assetVersion: "centro", basePath: "", levels: [] }
  ;(window as unknown as { __mmCenter?: () => unknown }).__mmCenter = () => ({
    models: models.count,
    modelTriangles: models.triangles,
    blocks: [...blocks.keys()],
    meshes: scene.meshes.length,
  })

  return {
    meshes: [world, signMesh],
    boxes,
    viewBoxes,
    interactables,
    catalog: noCatalog,
    applyLevel: () => false,
    retryVisual: () => {},
    visual: () => null,
    loadedLevels: () => [],
    dispose: () => {
      disposed = true
      const w = window as unknown as { __mmCenter?: unknown }
      delete w.__mmCenter
      models.dispose()
      for (const b of blocks.values()) b.dispose()
      blocks.clear()
      world.dispose()
      signMesh.dispose()
      worldMat.dispose()
      signMat.dispose()
      atlas.dispose()
    },
  }
}
