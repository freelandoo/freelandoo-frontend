// features/meu-mundo/engine/center-world.ts
//
// Constrói o Centro da cidade (mm3d-17) a partir da planta que veio do
// servidor (freelandoo-backend/src/utils/meuMundoCenter.js). É a MESMA para
// todas as salas: a sala só muda quem está nela.
//
// Desde o mm3d-53 o centro é STEAMPUNK, como os bairros: o desenho do chão,
// da praça, do pedestal, da cerca e do portal mora em steampunk/center.ts (com
// o kit do bairro); aqui só se monta. O estático vai em poucas malhas, uma por
// material (lajes, rua, areia, paralelepípedo, acabamento, luz, poças), em
// blocos de 110 m para a câmera recortar o que está atrás. Os prédios são os
// GLBs do pipeline (center-models: acabamento, cantaria, emblema e luz);
// enquanto um não chega — ou se falhar — fica no lugar um bloco simples com a
// pegada, a porta e a placa do local, para nunca haver buraco nem atravessar
// fachada (a colisão é sempre a do servidor).
//
// O que mexe (engrenagens de praça, portal e prédios; vapor das chaminés) é um
// SteamFx só: uma malha de engrenagem com thin instances e um sistema de
// partículas, com alcance pela distância e nada no perfil leve. Dia e noite
// pelo relógio de Brasília, igual ao bairro.
//
// Nada aqui carrega interior, animação de academia/luta ou casa de bairro.

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Scene } from "@babylonjs/core/scene"
import { GeoBuilder, frameOf, place, type RGB } from "./geometry"
import type { Box2 } from "./collision"
import type { BuiltWorld } from "./world"
import { CenterModels } from "./center-models"
import { loadStatues } from "./statues"
import { QUALITY, type QualityTier } from "./quality"
import { ChunkedGeo, SteamGeo } from "./steampunk/geo"
import { TILE, createSteamMaterials } from "./steampunk/materials"
import { SteamFx } from "./steampunk/fx"
import { Sky, applyLights, brasiliaHour, nightFactor } from "./steampunk/atmosphere"
import { steamSkyline } from "./steampunk/neighborhood"
import { SP } from "./steampunk/palette"
import type { GearSpec } from "./steampunk/kit"
import type { V3 } from "./steampunk/geo"
import { centerBoundary, centerFronts, centerGround, centerPlaza, centerPortal, centerStreets, type CenterCtx } from "./steampunk/center"
import type { CenterLayout, CenterPlace, HouseCatalog, Interactable } from "../types"

export interface CenterLabels {
  /** Nome do local já traduzido. */
  place: (p: CenterPlace) => string
  /** Letreiro do portal (volta para casa). */
  portal: string
}

// Blocos de reserva: alvenaria com um tom por zona (a identidade vem do modelo).
const ZONE: Record<CenterPlace["zone"], RGB> = {
  comercial: SP.masonry,
  educacional: SP.masonryLight,
  atividades: SP.masonryDark,
  civica: SP.stoneLight,
}

// ── Atlas dos letreiros: um local por linha e o portal na última ─────────────
// (12 células de 84 px cabem nos 1024: 11 locais + portal; com os 18 de hoje
// a célula encolhe para caber todos.)
const ATLAS_W = 1024
const ATLAS_H = 2048

function cellH(n: number) {
  return Math.floor(ATLAS_H / n)
}

/**
 * Placa vitoriana: fundo grafite, filete duplo de latão, rebites nas pontas e
 * o nome em creme — cabe na célula diminuindo a fonte (traduções longas).
 */
function drawLabels(tex: DynamicTexture, names: string[]) {
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const H = cellH(names.length)
  ctx.clearRect(0, 0, ATLAS_W, ATLAS_H)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  names.forEach((name, i) => {
    const y = i * H
    ctx.fillStyle = "#24272B"
    ctx.fillRect(0, y, ATLAS_W, H)
    ctx.strokeStyle = "#C69A37"
    ctx.lineWidth = 5
    ctx.strokeRect(8, y + 8, ATLAS_W - 16, H - 16)
    ctx.strokeStyle = "#7E5E22"
    ctx.lineWidth = 2
    ctx.strokeRect(17, y + 17, ATLAS_W - 34, H - 34)
    ctx.fillStyle = "#C69A37"
    for (const x of [30, ATLAS_W - 30]) {
      for (const yy of [y + 30, y + H - 30]) {
        ctx.beginPath()
        ctx.arc(x, yy, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    let size = Math.round(H * 0.56)
    const font = (s: number) => `800 ${s}px Georgia, "Times New Roman", serif`
    ctx.font = font(size)
    const text = name.toUpperCase()
    while (ctx.measureText(text).width > ATLAS_W - 110 && size > 26) {
      size -= 3
      ctx.font = font(size)
    }
    ctx.fillStyle = "#F3E6C8"
    ctx.fillText(text, ATLAS_W / 2, y + H / 2 + 2)
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

/** Bloco de reserva de um local: pegada, cornija, porta e janelas acesas. */
function fallbackBlock(g: SteamGeo, glow: SteamGeo, p: CenterPlace) {
  const f = frameOf(p.origin.x, p.origin.z, p.rotationY)
  const w = p.model.width - 0.6
  const d = p.model.depth - 0.6
  const h = p.size.h
  g.box(w, h, d, place(0, h / 2, d / 2 + 0.3, 0, f), ZONE[p.zone])
  g.box(w + 0.4, 0.3, d + 0.4, place(0, h + 0.15, d / 2 + 0.3, 0, f), SP.stoneLight)
  g.box(p.door.width, 2.5, 0.14, place(p.model.doorX, 1.25, 0.25, 0, f), SP.wood)
  for (const sx of [-0.32, 0.32]) {
    const wx = p.model.doorX + sx * w
    if (Math.abs(wx) + 1 > w / 2) continue
    glow.with("flat", () => glow.box(1.4, 1.3, 0.12, place(wx, 1.8, 0.26, 0, f), SP.windowGlow))
  }
}

/** Engrenagem do fx.json de um prédio: eixo (0 x, 1 y, 2 z) e posição no quadro do modelo → mundo. */
function gearOf([x, y, z, r, thick, speed, axis]: number[], placement: Matrix): GearSpec {
  const turn = axis === 0 ? Matrix.RotationZ(Math.PI / 2) : axis === 2 ? Matrix.RotationX(Math.PI / 2) : Matrix.Identity()
  return { m: turn.multiply(Matrix.Translation(x, y, z)).multiply(placement), r, thick, speed }
}

function ventOf([x, y, z]: number[], placement: Matrix): V3 {
  const a = Matrix.Translation(x, y, z).multiply(placement).asArray()
  return [a[12], a[13], a[14]]
}

export function buildCenterWorld(scene: Scene, c: CenterLayout, labels: CenterLabels, tier: QualityTier = "mid"): BuiltWorld {
  const mats = createSteamMaterials(scene, tier, { wall: true })

  const names = [...c.places.map((p) => labels.place(p)), labels.portal]
  const atlas = new DynamicTexture("mm-center-labels", { width: ATLAS_W, height: ATLAS_H }, scene, true)
  drawLabels(atlas, names)
  const H = cellH(names.length)
  const cellUV = (i: number): [number, number, number, number] => [0, 1 - ((i + 1) * H) / ATLAS_H, 1, 1 - (i * H) / ATLAS_H]
  const signMat = new StandardMaterial("mm-center-signs", scene)
  signMat.diffuseTexture = atlas
  signMat.specularColor = new Color3(0, 0, 0)
  signMat.emissiveColor = new Color3(0.42, 0.42, 0.42)
  signMat.backFaceCulling = false

  const geo = (uv: SteamGeo["uv"]) => {
    const g = new SteamGeo()
    g.uv = uv
    return g
  }
  const chunked = (uv: SteamGeo["uv"]) => {
    const g = new ChunkedGeo(110)
    g.uv = uv
    return g
  }
  const ctx: CenterCtx = {
    props: chunked("face"),
    glow: geo("flat"),
    pools: geo("face"),
    pavers: chunked(TILE.pavers),
    road: chunked(TILE.road),
    soil: geo(TILE.soil),
    cobble: geo(TILE.cobble),
    signs: new GeoBuilder(),
    boxes: [],
    viewOnly: [],
    gears: [],
    vents: [],
    detail: tier === "low" ? 0.6 : 1,
    c,
  }
  centerGround(ctx)
  centerStreets(ctx)
  centerPlaza(ctx)
  centerBoundary(ctx)
  centerPortal(ctx, cellUV(c.places.length), BOARD_H)
  centerFronts(ctx, cellUV, BOARD_Y, BOARD_H, boardWidth)
  steamSkyline(ctx, c.dims.bound)

  const meshes: Mesh[] = []
  const layers = [
    [ctx.soil, mats.soil, "soil"],
    [ctx.road, mats.road, "road"],
    [ctx.pavers, mats.pavers, "pavers"],
    [ctx.cobble, mats.cobble, "cobble"],
    [ctx.props, mats.trim, "props"],
    [ctx.glow, mats.glow, "glow"],
    [ctx.pools, mats.pool, "pools"],
  ] as const
  for (const [g, m, name] of layers) {
    if (g instanceof ChunkedGeo) meshes.push(...g.buildChunks(`mm-center-${name}`, scene, m))
    else if (g.vertexCount) meshes.push(g.build(`mm-center-${name}`, scene, m))
  }
  meshes.push(ctx.signs.build("mm-center-signs", scene, signMat))
  mats.freeze()
  signMat.freeze()

  // ── Céu, dia e noite, o que mexe ───────────────────────────────────────────
  const sky = new Sky(scene, QUALITY[tier].maxZ * 0.9)
  const fx = new SteamFx(scene, mats, tier)
  const staticGears = ctx.gears
  const staticVents = ctx.vents
  const buildingGears: GearSpec[] = []
  const buildingVents: V3[] = []
  const refreshFx = () => fx.setStatic([...staticGears, ...buildingGears], [...staticVents, ...buildingVents])
  refreshFx()

  let night = -1
  let forcedHour: number | null = null
  const pools = meshes.filter((m) => m.material === mats.pool)
  const applyTime = () => {
    const n = nightFactor(forcedHour ?? brasiliaHour())
    if (Math.abs(n - night) < 0.005) return
    night = n
    applyLights(scene, n)
    sky.set(n)
    fx.setNight(n)
    mats.glow.emissiveColor.set(0.72 + 0.28 * n, 0.72 + 0.28 * n, 0.72 + 0.28 * n)
    mats.pool.emissiveColor.set(n, n, n)
    for (const m of pools) m.setEnabled(n > 0.02)
  }
  const clock = setInterval(applyTime, 20000)
  const devHour = (h: number | null) => {
    forcedHour = h
    night = -1
    applyTime()
  }
  if (process.env.NODE_ENV !== "production") (window as unknown as { __mmSetHour?: typeof devHour }).__mmSetHour = devHour
  applyTime()

  // ── Prédios: bloco de reserva até o modelo chegar ──────────────────────────
  const blocks = new Map<string, Mesh[]>()
  for (const p of c.places) {
    const g = geo("face")
    const gl = geo("flat")
    fallbackBlock(g, gl, p)
    const list = [g.build(`mm-center-block-${p.id}`, scene, mats.trim)]
    if (gl.vertexCount) list.push(gl.build(`mm-center-block-${p.id}-glow`, scene, mats.glow))
    blocks.set(p.id, list)
  }
  const models = new CenterModels(scene, { trim: mats.trim, wall: mats.wall, lamp: mats.glow })
  let disposed = false
  const assets = c.assets
  if (c.plaza.statues?.length) loadStatues(models, c.plaza.statues, c.statueAssets, () => !disposed)
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
      const placement = frameOf(p.origin.x, p.origin.z, p.rotationY)
      models
        .load(p.id, assets.basePath + file, placement)
        .then(() => {
          if (disposed) return
          for (const m of blocks.get(p.id) ?? []) m.dispose()
          blocks.delete(p.id)
          // Engrenagens e vapor do prédio só junto com o modelo (sem ele ficariam soltos no ar).
          const pf = assets.fx?.[p.id]
          if (pf) {
            buildingGears.push(...pf.gears.map((g) => gearOf(g, placement)))
            buildingVents.push(...pf.vents.map((v) => ventOf(v, placement)))
            refreshFx()
          }
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
    fx: fx.stats,
  })

  return {
    meshes,
    boxes,
    viewBoxes,
    interactables,
    catalog: noCatalog,
    applyLevel: () => false,
    retryVisual: () => {},
    visual: () => null,
    loadedLevels: () => [],
    setQuality(q) {
      fx.setTier(q.tier)
      sky.setRadius(q.maxZ * 0.9)
    },
    dispose: () => {
      disposed = true
      clearInterval(clock)
      const w = window as unknown as { __mmCenter?: unknown; __mmSetHour?: typeof devHour }
      delete w.__mmCenter
      if (w.__mmSetHour === devHour) delete w.__mmSetHour
      fx.dispose()
      models.dispose()
      for (const list of blocks.values()) for (const m of list) m.dispose()
      blocks.clear()
      for (const m of meshes) m.dispose()
      sky.dispose()
      mats.dispose()
      signMat.dispose()
      atlas.dispose()
    },
  }
}
