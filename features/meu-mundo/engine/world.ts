// features/meu-mundo/engine/world.ts
//
// Constrói o bairro "ring-20" a partir da definição que veio do servidor.
//
// Quem diz ONDE fica cada lote e para onde ele olha é o servidor; o que este
// arquivo sabe é o DESENHO do tipo de bairro: um anel de ruas com a praça no
// meio, quatro quadras de cinco casas por fora, o muro em volta e a saída
// para o Centro pela rua do canto nordeste.
//
// Desde o mm3d-51 o bairro é STEAMPUNK: o desenho mora em steampunk/ (paleta,
// materiais, kit, casa 01, efeitos, céu) e este arquivo monta as peças, a
// colisão, as casas que mudam de nível e o descarte. O estático entra em
// poucas malhas — uma por material (chão, rua, calçada, paralelepípedo, peças,
// luzes, placas) —, então o bairro inteiro segue custando um punhado de
// chamadas de desenho.
//
// As peças soltas do desenho ANTIGO (árvore, banco, poste, flores, cores `C`)
// continuam exportadas: o centro (center-world.ts) usa e não mudou.

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { GeoBuilder, frameOf, place, type RGB } from "./geometry"
import { rotY, type Box2 } from "./collision"
import { HouseModels } from "./houses"
import { CenterModels } from "./center-models"
import { loadStatues } from "./statues"
import { QUALITY, type QualityProfile, type QualityTier } from "./quality"
import { ChunkedGeo, SteamGeo } from "./steampunk/geo"
import { TILE, createSteamMaterials } from "./steampunk/materials"
import { SteamFx } from "./steampunk/fx"
import { Sky, applyLights, brasiliaHour, nightFactor } from "./steampunk/atmosphere"
import { house01 } from "./steampunk/house01"
import {
  steamBoundary,
  steamGround,
  steamLotPath,
  steamLotStatic,
  steamOutskirts,
  steamPlaza,
  steamSkyline,
  steamStreets,
  type NbCtx,
} from "./steampunk/neighborhood"
import type {
  House,
  HouseCatalog,
  HouseLevelDef,
  HouseVisual,
  Interactable,
  Lot,
  LotPlan,
  Neighborhood,
  NeighborhoodDims,
} from "../types"

// ── Medidas ──────────────────────────────────────────────────────────────────
// Vêm do SERVIDOR (payload: `dims` e `lotPlan`, de src/utils/meuMundoLayout.js):
// o cliente não guarda uma segunda cópia. A reserva abaixo é o desenho do
// mm3d-02, usada só se o payload vier de um backend anterior ao mm3d-03.
const LEGACY_DIMS: NeighborhoodDims = (() => {
  const out: NeighborhoodDims = {
    ring: 26,
    roadHalf: 3,
    sidewalk: 2,
    lotFront: 31,
    hedge: 47,
    gateX: 48,
    exitZ: 26,
    exitEnd: 70,
    innerWalk: 21,
    plazaTrees: [],
    plazaFlowers: [],
    cornerTrees: [],
    outerTrees: [
      [-55, 30, 1.3], [-58, -12, 1.4], [-52, -44, 1.2], [-20, -56, 1.4], [18, -55, 1.3],
      [50, -52, 1.2], [57, -15, 1.4], [57, 10, 1.2], [56, 40, 1.3], [30, 57, 1.4],
      [-10, 58, 1.3], [-45, 54, 1.2], [62, 33, 1.1], [64, 19, 1.2],
    ],
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.plazaTrees.push([14 * sx, 14 * sz, 1], [16.5 * sx, 5 * sz, 0.9], [5 * sx, 16.5 * sz, 0.9])
      out.plazaFlowers.push([11 * sx, 11 * sz])
      if (sx === 1 && sz === 1) continue
      out.cornerTrees.push([36 * sx, 36 * sz, 1.1], [42 * sx, 39 * sz, 0.95], [38.5 * sx, 43 * sz, 0.9])
    }
  }
  out.cornerTrees.push([36, 38, 1.1], [42, 42, 0.95])
  return out
})()

const LEGACY_PLAN: LotPlan = {
  width: 9,
  depth: 12,
  setbacks: { front: 0, side: 0, back: 0 },
  houseFront: { x: 0, z: -1.6 },
  access: { x: 0, z: -6 },
  sign: { x: 2.5, z: -5.35 },
  hedge: { thickness: 0.3, height: 0.7, frontGap: 3.1 },
  tree: { x: 2.8, z: 4.3, scale: 0.85 },
  flowers: { x: -2.6, z: -4.6 },
  house: { width: 5.4, depth: 4.8, height: 4.6, pathWidth: 1.3, stepDepth: 0.6, stepWidth: 1.6 },
  buildable: { minX: -4.5, maxX: 4.5, minZ: -6, maxZ: 6 },
}

// ── Paleta ───────────────────────────────────────────────────────────────────
// Exportada: o centro (center-world.ts) usa os mesmos números.
export const C = {
  grassOut: [0.47, 0.67, 0.37],
  grass: [0.56, 0.77, 0.43],
  lawn: [0.6, 0.81, 0.46],
  lotLawn: [0.53, 0.75, 0.41],
  road: [0.36, 0.37, 0.42],
  roadLine: [0.97, 0.95, 0.86],
  walk: [0.84, 0.82, 0.78],
  plaza: [0.91, 0.85, 0.72],
  plazaEdge: [0.78, 0.7, 0.58],
  path: [0.86, 0.83, 0.76],
  stone: [0.7, 0.68, 0.64],
  hedge: [0.31, 0.54, 0.3],
  hedgeLot: [0.38, 0.61, 0.34],
  trunk: [0.5, 0.34, 0.22],
  leafA: [0.36, 0.63, 0.32],
  leafB: [0.44, 0.7, 0.37],
  wood: [0.66, 0.46, 0.3],
  woodDark: [0.48, 0.32, 0.21],
  metal: [0.26, 0.27, 0.31],
  bulb: [1, 0.93, 0.62],
  glass: [0.63, 0.83, 0.95],
  frame: [0.97, 0.96, 0.92],
  board: [0.97, 0.94, 0.85],
  knob: [0.92, 0.75, 0.3],
  spawn: [0.98, 0.78, 0.2],
  barrierA: [0.86, 0.24, 0.22],
  barrierB: [0.97, 0.96, 0.92],
  mineBoard: [1, 0.78, 0.18],
  mineMat: [0.95, 0.72, 0.16],
} satisfies Record<string, RGB>

const FLOWERS: RGB[] = [
  [0.96, 0.45, 0.55],
  [0.98, 0.84, 0.3],
  [0.95, 0.95, 0.98],
  [0.62, 0.5, 0.9],
]

// ── Atlas de texto das placas (01–20 + Centro da cidade) ─────────────────────
const ATLAS_W = 1024
const ATLAS_H = 512
const CELL_W = 204
const CELL_H = 100
const WIDE_Y = 400
const WIDE_H = 112

function numberCell(n: number): [number, number, number, number] {
  const i = n - 1
  const col = i % 5
  const row = Math.floor(i / 5)
  return uvRect(col * CELL_W, row * CELL_H, CELL_W, CELL_H)
}

// Textura com invertY: o topo do canvas é o v=1.
function uvRect(x: number, y: number, w: number, h: number): [number, number, number, number] {
  return [x / ATLAS_W, 1 - (y + h) / ATLAS_H, (x + w) / ATLAS_W, 1 - y / ATLAS_H]
}

function drawAtlas(tex: DynamicTexture, exitLabel: string) {
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  ctx.fillStyle = "#F7F0D9"
  ctx.fillRect(0, 0, ATLAS_W, ATLAS_H)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#2B2620"
  ctx.font = "800 70px system-ui, -apple-system, Segoe UI, sans-serif"
  for (let n = 1; n <= 20; n++) {
    const i = n - 1
    const cx = (i % 5) * CELL_W + CELL_W / 2
    const cy = Math.floor(i / 5) * CELL_H + CELL_H / 2 + 4
    ctx.fillText(String(n).padStart(2, "0"), cx, cy)
  }
  ctx.fillStyle = "#2B2620"
  ctx.fillRect(0, WIDE_Y, ATLAS_W, WIDE_H)
  ctx.fillStyle = "#FFC600"
  ctx.font = "800 64px system-ui, -apple-system, Segoe UI, sans-serif"
  ctx.fillText(exitLabel.toUpperCase(), ATLAS_W / 2, WIDE_Y + WIDE_H / 2 + 3)
  tex.update(true)
}

// ── Peças reaproveitadas ─────────────────────────────────────────────────────
// `boxes` param o personagem; `viewOnly` só a câmera (a copa das árvores:
// o personagem passa rente a ela, a câmera não pode entrar nela). As peças
// soltas (árvore, banco, poste, flores) servem também ao centro (mm3d-17).
export type PropCtx = {
  geo: GeoBuilder
  boxes: Box2[]
  viewOnly: Box2[]
}

/** Placa de chão: caixa fina do y=0 até `top`. */
export function slab(g: GeoBuilder, cx: number, cz: number, w: number, d: number, top: number, color: RGB) {
  g.box(w, top, d, place(cx, top / 2, cz), color)
}

export function tree(ctx: PropCtx, x: number, z: number, s = 1, collide = true) {
  const { geo } = ctx
  geo.cylinder(0.34 * s, 1.6 * s, place(x, 0.8 * s, z), C.trunk, 6)
  geo.sphere(2.2 * s, [1, 0.85, 1], place(x, 2.15 * s, z), C.leafA)
  geo.sphere(1.6 * s, [1, 0.9, 1], place(x + 0.45 * s, 2.8 * s, z - 0.2 * s), C.leafB)
  geo.sphere(1.3 * s, [1, 0.9, 1], place(x - 0.5 * s, 2.65 * s, z + 0.35 * s), C.leafB)
  if (collide) ctx.boxes.push({ x, z, hx: 0.35 * s, hz: 0.35 * s, rot: 0, h: 3.4 * s })
  ctx.viewOnly.push({ x, z, hx: 1.05 * s, hz: 1.05 * s, rot: 0, h: 3.4 * s })
}

export function bench(ctx: PropCtx, x: number, z: number, rot: number) {
  const { geo } = ctx
  const f = frameOf(x, z, rot)
  geo.box(2, 0.12, 0.55, place(0, 0.45, 0, 0, f), C.wood)
  geo.box(2, 0.45, 0.1, place(0, 0.78, 0.27, 0, f), C.wood)
  for (const sx of [-0.85, 0.85]) geo.box(0.1, 0.45, 0.5, place(sx, 0.22, 0, 0, f), C.metal)
  ctx.boxes.push({ x, z, hx: 1.05, hz: 0.38, rot, h: 1 })
}

export function lamp(ctx: PropCtx, x: number, z: number) {
  const { geo } = ctx
  geo.cylinder(0.16, 3.2, place(x, 1.6, z), C.metal, 6)
  geo.box(0.42, 0.42, 0.42, place(x, 3.35, z), C.bulb)
  geo.box(0.56, 0.08, 0.56, place(x, 3.6, z), C.metal)
  ctx.boxes.push({ x, z, hx: 0.2, hz: 0.2, rot: 0, h: 3.6 })
}

export function flowerPatch(ctx: PropCtx, x: number, z: number, seed: number) {
  for (let k = 0; k < 6; k++) {
    const a = seed * 1.7 + k * 1.05
    const r = 0.25 + (k % 3) * 0.22
    const n = FLOWERS.length
    ctx.geo.box(0.16, 0.22, 0.16, place(x + Math.cos(a) * r, 0.13, z + Math.sin(a) * r), FLOWERS[(((seed + k) % n) + n) % n])
  }
}

/** Uma caixa de obstáculo posicionada no quadro de um lote. */
function lotBox(lot: Lot, lx: number, lz: number, hx: number, hz: number, h: number): Box2 {
  const o = rotY(lx, lz, lot.rotationY)
  return { x: lot.position.x + o.x, z: lot.position.z + o.z, hx, hz, rot: lot.rotationY, h }
}

/** Caixas de colisão da casa (catálogo, coordenadas do lote) no mundo. */
function houseBoxesFor(lot: Lot, def: HouseLevelDef): Box2[] {
  return (def.colliders ?? []).map(([lx, lz, hx, hz, h]) => ({ ...lotBox(lot, lx, lz, hx, hz, h), lot: lot.number }))
}

/** Origem do modelo no lote (frente dos degraus), em coordenadas locais. */
function originOf(plan: LotPlan, def: HouseLevelDef) {
  return def.origin ?? { x: plan.houseFront.x, z: plan.houseFront.z - (plan.house.stepDepth - 0.15) }
}

export interface BuiltWorld {
  meshes: Mesh[]
  /** Colisão do personagem. Mutada NO LUGAR quando o nível de uma casa muda. */
  boxes: Box2[]
  /** Obstáculos da câmera: os do personagem mais as copas (idem). */
  viewBoxes: Box2[]
  interactables: Interactable[]
  catalog: HouseCatalog
  /**
   * Nível CONFIRMADO pelo servidor para a casa do lote. Só vale revisão maior
   * que a atual (a última confirmada vence). Troca colisores e porta na hora;
   * o modelo troca quando terminar de carregar — até lá a casa anterior fica.
   */
  applyLevel: (lot: number, level: number, rev: number) => boolean
  /** Carrega de novo o modelo que falhou (o confirmado não muda). */
  retryVisual: (lot: number) => void
  visual: (lot: number) => HouseVisual | null
  /** Níveis com modelo carregado na GPU (painel técnico). */
  loadedLevels: () => number[]
  /** Perfil de qualidade trocado em jogo (efeitos e céu; o bairro não é refeito). */
  setQuality?: (q: QualityProfile) => void
  dispose: () => void
}

/** Catálogo de reserva para backend anterior ao mm3d-06: só o nível 01. */
function legacyCatalog(): HouseCatalog {
  return {
    assetVersion: "builtin",
    basePath: "/meu-mundo/casas/",
    levels: [{ level: 1, id: "level-01", available: true, kind: "builtin", asset: null, thumb: null }],
  }
}

export function buildWorld(
  scene: Scene,
  nb: Neighborhood,
  exitLabel: string,
  onHouseVisual?: (v: HouseVisual) => void,
  tier: QualityTier = "mid",
): BuiltWorld {
  const mats = createSteamMaterials(scene, tier)

  const atlas = new DynamicTexture("mm-atlas", { width: ATLAS_W, height: ATLAS_H }, scene, true)
  drawAtlas(atlas, exitLabel)
  const signMat = new StandardMaterial("mm-signs", scene)
  signMat.diffuseTexture = atlas
  signMat.specularColor = new Color3(0, 0, 0)
  signMat.emissiveColor = new Color3(0.35, 0.35, 0.35)
  signMat.backFaceCulling = false

  const d = nb.dims ?? LEGACY_DIMS
  const plan = nb.lotPlan ?? LEGACY_PLAN
  type Layers = Pick<NbCtx, "props" | "glow" | "pavers" | "road" | "soil" | "cobble" | "pools">
  const geo = (uv: SteamGeo["uv"]) => {
    const g = new SteamGeo()
    g.uv = uv
    return g
  }
  // Um acumulador por material: o que cai em cada um vira uma malha só — as
  // peças em blocos de 110 m, para a câmera recortar o que está atrás.
  const chunked = (uv: SteamGeo["uv"]) => {
    const g = new ChunkedGeo(110)
    g.uv = uv
    return g
  }
  const layers = (): Layers => ({
    props: chunked("face"),
    glow: geo("flat"),
    pools: geo("face"),
    pavers: geo(TILE.pavers),
    road: geo(TILE.road),
    soil: geo(TILE.soil),
    cobble: geo(TILE.cobble),
  })
  const ctx: NbCtx = {
    ...layers(),
    signs: new GeoBuilder(),
    boxes: [],
    viewOnly: [],
    gears: [],
    vents: [],
    detail: tier === "low" ? 0.6 : 1,
    d,
    plan,
    numberUV: numberCell,
    wideUV: uvRect(0, WIDE_Y, ATLAS_W, WIDE_H),
  }

  steamGround(ctx, nb.limit ?? 70)
  steamStreets(ctx)
  steamPlaza(ctx, nb.spawn)
  steamBoundary(ctx)
  steamOutskirts(ctx)
  steamSkyline(ctx, d.hedge)

  // ── Lotes ─────────────────────────────────────────────────────────────────
  const catalog = nb.houseCatalog ?? legacyCatalog()
  const fallback = catalog.levels.find((l) => l.level === 1) ?? legacyCatalog().levels[0]
  const defOf = (level: number) => catalog.levels.find((l) => l.level === level && l.available) ?? fallback

  type Slot = {
    lot: Lot
    house: House
    rev: number
    /** Nível que está NA TELA (pode ficar atrás do confirmado enquanto carrega ou se falhar). */
    shown: number
    token: number
    status: HouseVisual["status"]
    progress?: number
    door: Interactable
  }
  const housesById = new Map(nb.houses.map((h) => [h.id, h]))
  const interactables: Interactable[] = []
  const slots = new Map<number, Slot>()
  for (const lot of nb.lots) {
    const h = housesById.get(lot.houseId)
    if (!h) continue
    h.level = defOf(h.level).level
    steamLotStatic(ctx, lot, h)
    // Dois pontos de interação por casa: a placa (alcança a calçada) e a
    // porta (na frente dos degraus — nunca atrás da casa). Os vizinhos ficam
    // a 22 m.
    const o = rotY(plan.sign.x - 1.3, plan.access.z + 1.2, lot.rotationY)
    interactables.push({ kind: "house", id: h.id, x: lot.position.x + o.x, z: lot.position.z + o.z, radius: 3.6, lot, house: h })
    const door: Interactable = { kind: "house", id: h.id, x: 0, z: 0, radius: 3.0, lot, house: h }
    interactables.push(door)
    slots.set(lot.number, { lot, house: h, rev: h.levelRev ?? 0, shown: 1, token: 0, status: "ok", door })
  }
  interactables.push({
    kind: "exit",
    id: nb.exit.id,
    x: nb.exit.x,
    z: nb.exit.z,
    radius: 3.6,
    label: nb.exit.label,
  })

  const buildLayers = (c: Layers, prefix: string) => {
    const out: Mesh[] = []
    const pairs = [
      [c.soil, mats.soil, "soil"],
      [c.road, mats.road, "road"],
      [c.pavers, mats.pavers, "pavers"],
      [c.cobble, mats.cobble, "cobble"],
      [c.props, mats.trim, "props"],
      [c.glow, mats.glow, "glow"],
      [c.pools, mats.pool, "pools"],
    ] as const
    for (const [g, m, name] of pairs) {
      if (g instanceof ChunkedGeo) out.push(...g.buildChunks(`${prefix}-${name}`, scene, m))
      else if (g.vertexCount) out.push(g.build(`${prefix}-${name}`, scene, m))
    }
    return out
  }
  const meshes: Mesh[] = buildLayers(ctx, "mm-world")
  meshes.push(ctx.signs.build("mm-signs", scene, signMat))
  mats.freeze()
  signMat.freeze()

  // Céu e o que mexe (engrenagens, vapor).
  const sky = new Sky(scene, QUALITY[tier].maxZ * 0.9)
  const fx = new SteamFx(scene, mats, tier)
  fx.setStatic(ctx.gears, ctx.vents)

  // Dia e noite pelo relógio de Brasília: noite das 18h às 6h (meia hora de
  // virada). Conferido a cada 20 s; só cores e intensidades mudam.
  let night = -1
  let forcedHour: number | null = null
  const applyTime = () => {
    const n = nightFactor(forcedHour ?? brasiliaHour())
    if (Math.abs(n - night) < 0.005) return
    night = n
    applyLights(scene, n)
    sky.set(n)
    fx.setNight(n)
    mats.glow.emissiveColor.set(0.72 + 0.28 * n, 0.72 + 0.28 * n, 0.72 + 0.28 * n)
    mats.pool.emissiveColor.set(n, n, n)
    for (const m of [...meshes, ...housesMeshes]) if (m.material === mats.pool) m.setEnabled(n > 0.02)
  }
  const clock = setInterval(applyTime, 20000)
  // Conferência (harness, só fora de produção): fixa a hora.
  const devHour = (h: number | null) => {
    forcedHour = h
    night = -1
    applyTime()
  }
  if (process.env.NODE_ENV !== "production") (window as unknown as { __mmSetHour?: typeof devHour }).__mmSetHour = devHour

  // ── Casas (mudam com o nível) ─────────────────────────────────────────────
  // O caminho, o tapete e a casa 01 de todos os lotes vão para as malhas
  // "mm-houses-*", refeitas a cada troca (o resto do bairro não é tocado).
  const models = new HouseModels(scene, catalog, mats.trimTexture, mats.glow)
  let housesMeshes: Mesh[] = []
  let disposed = false
  const rebuildHouses = () => {
    const hc: NbCtx = { ...ctx, ...layers(), boxes: [], viewOnly: [], gears: [], vents: [] }
    for (const sl of slots.values()) {
      const def = defOf(sl.shown)
      steamLotPath(hc, sl.lot, sl.house, def.pathEnd ?? originOf(plan, def), plan.house.pathWidth)
      const f = frameOf(sl.lot.position.x, sl.lot.position.z, sl.lot.rotationY)
      if (def.kind === "builtin") {
        const step = { width: plan.house.stepWidth, depth: plan.house.stepDepth }
        fx.setLot(sl.lot.number, house01(hc, f, plan.houseFront.x, plan.houseFront.z, sl.house.variant, step))
      } else {
        // Saídas de vapor do modelo (catálogo, coordenadas do lote).
        const vents = (def.vents ?? []).map(([x, y, z]): [number, number, number] => {
          const a = place(x, y, z, 0, f).asArray()
          return [a[12], a[13], a[14]]
        })
        fx.setLot(sl.lot.number, vents.length ? { gears: [], vents } : null)
      }
    }
    const next = buildLayers(hc, "mm-houses")
    for (const m of housesMeshes) m.dispose()
    housesMeshes = next
    for (const m of next) if (m.material === mats.pool) m.setEnabled(night > 0.02)
  }
  const placeDoor = (sl: Slot) => {
    const def = defOf(sl.house.level)
    const o = originOf(plan, def)
    const p = rotY((def.door ?? o).x + 0.8, o.z - 1.35, sl.lot.rotationY)
    sl.door.x = sl.lot.position.x + p.x
    sl.door.z = sl.lot.position.z + p.z
  }
  const emit = (sl: Slot) =>
    onHouseVisual?.({ lot: sl.lot.number, confirmed: sl.house.level, shown: sl.shown, status: sl.status, progress: sl.progress })

  /** Troca a casa na tela de uma vez: nunca duas casas sobrepostas. */
  const setShown = (sl: Slot, level: number): boolean => {
    const def = defOf(level)
    const f = frameOf(sl.lot.position.x, sl.lot.position.z, sl.lot.rotationY)
    const o = originOf(plan, def)
    if (!models.show(sl.lot.number, def.kind === "glb" ? def.level : null, place(o.x, 0, o.z, 0, f))) return false
    sl.shown = def.level
    sl.status = "ok"
    sl.progress = undefined
    rebuildHouses()
    emit(sl)
    return true
  }
  const requestVisual = (sl: Slot) => {
    const token = ++sl.token
    const def = defOf(sl.house.level)
    if (def.kind !== "glb") {
      setShown(sl, def.level)
      return
    }
    sl.status = "loading"
    sl.progress = 0
    emit(sl)
    models
      .load(def.level, (p) => {
        if (token !== sl.token || disposed) return
        sl.progress = p
        emit(sl)
      })
      .then(() => {
        if (token !== sl.token || disposed) return
        if (!setShown(sl, def.level)) requestVisual(sl)
      })
      .catch(() => {
        if (token !== sl.token || disposed) return
        // A casa anterior continua na tela; o confirmado segue sendo o novo.
        sl.status = "error"
        sl.progress = undefined
        emit(sl)
      })
  }

  // Colisão: a lista que veio do SERVIDOR é a mesma que a sala usa para
  // validar o movimento (as caixas de cada casa vêm marcadas com o lote). A
  // desenhada aqui só serve de reserva (payload antigo).
  const boxes: Box2[] = nb.obstacles?.length ? [...nb.obstacles] : [...ctx.boxes]
  if (!nb.obstacles?.length) {
    for (const sl of slots.values()) boxes.push(...houseBoxesFor(sl.lot, defOf(sl.house.level)))
  }
  // Em desenvolvimento: confere se o desenho e a colisão do servidor batem
  // (fora as casas, que vêm do catálogo e são conferidas na suíte do backend).
  if (process.env.NODE_ENV !== "production" && nb.obstacles?.length) {
    const key = (b: Box2) => [b.x, b.z, b.hx, b.hz, b.h].map((n) => (Math.round(n * 100) / 100 || 0).toFixed(2)).join("|")
    const server = new Set(nb.obstacles.filter((b) => b.lot === undefined).map(key))
    const drawn = new Set(ctx.boxes.map(key))
    const onlyDrawn = [...drawn].filter((k) => !server.has(k))
    const onlyServer = [...server].filter((k) => !drawn.has(k))
    ;(window as unknown as { __mmLayoutCheck?: unknown }).__mmLayoutCheck = { onlyDrawn, onlyServer }
    if (onlyDrawn.length || onlyServer.length) console.warn("[meu-mundo] desenho × colisão divergem", { onlyDrawn, onlyServer })
  }
  const viewBoxes = [...boxes, ...ctx.viewOnly]
  const replaceLotBoxes = (list: Box2[], lot: number, next: Box2[]) => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i].lot === lot) list.splice(i, 1)
    list.push(...next)
  }

  for (const sl of slots.values()) placeDoor(sl)
  rebuildHouses()
  applyTime()
  for (const sl of slots.values()) if (sl.house.level !== 1) requestVisual(sl)

  // Estátuas dos deuses (mm3d-50): as bases já estão no buffer do mundo.
  const statueModels = d.statues?.length && nb.statueAssets ? new CenterModels(scene) : null
  if (statueModels) loadStatues(statueModels, d.statues!, nb.statueAssets, () => !disposed)

  return {
    meshes,
    boxes,
    viewBoxes,
    interactables,
    catalog,
    applyLevel(lot, level, rev) {
      const sl = slots.get(lot)
      if (!sl || rev <= sl.rev) return false
      const def = defOf(level)
      sl.rev = rev
      sl.house.levelRev = rev
      if (def.level === sl.house.level) return true
      sl.house.level = def.level
      const next = houseBoxesFor(sl.lot, def)
      replaceLotBoxes(boxes, lot, next)
      replaceLotBoxes(viewBoxes, lot, next)
      placeDoor(sl)
      requestVisual(sl)
      return true
    },
    retryVisual(lot) {
      const sl = slots.get(lot)
      if (sl && sl.shown !== sl.house.level) requestVisual(sl)
    },
    visual(lot) {
      const sl = slots.get(lot)
      return sl ? { lot, confirmed: sl.house.level, shown: sl.shown, status: sl.status, progress: sl.progress } : null
    },
    loadedLevels: () => models.loadedLevels,
    setQuality(q) {
      fx.setTier(q.tier)
      sky.setRadius(q.maxZ * 0.9)
    },
    dispose: () => {
      disposed = true
      fx.dispose()
      models.dispose()
      statueModels?.dispose()
      for (const m of housesMeshes) m.dispose()
      for (const m of meshes) m.dispose()
      clearInterval(clock)
      const w = window as unknown as { __mmSetHour?: typeof devHour }
      if (w.__mmSetHour === devHour) delete w.__mmSetHour
      sky.dispose()
      mats.dispose()
      signMat.dispose()
      atlas.dispose()
    },
  }
}
