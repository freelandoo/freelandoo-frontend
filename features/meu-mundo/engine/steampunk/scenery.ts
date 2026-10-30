// features/meu-mundo/engine/steampunk/scenery.ts
//
// O "palco" steampunk dos minijogos e interiores (mm3d-55). O bairro e o centro
// montam o próprio SteamCtx; aqui fica o mesmo contexto pronto para qualquer
// cena — Lâminas, Boxe, Paint, Gincana, Corrida, Rolê Noturno — com as peças
// que só os minijogos usam:
//
//   SteamStage    materiais do bairro (createSteamMaterials) + acumuladores +
//                 SteamFx (engrenagens que giram e vapor). build() faz as
//                 malhas (uma por material), dispose() solta tudo.
//   airship       dirigível (balão com cintas de latão, gôndola, hélice,
//                 lanternas) — e AirshipFleet, uma frota que dá a volta no
//                 céu devagar (um nó girando: custo zero por quadro).
//   smokestack    chaminé de tijolo com anéis de ferro, boca de latão e vapor.
//   gearArch      pórtico de ferro com engrenagem (que gira) e lanternas.
//   pipeRun       cano de cobre com luvas e manômetro no meio.
//   rivetRing     aro de latão com rebites (borda de plataforma, ringue, ilha).
//
// Regra de sempre: nada aqui colide — é desenho. A colisão de cada jogo é a da
// regra (sim/) e fica onde está.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Observer } from "@babylonjs/core/Misc/observable"
import type { Scene } from "@babylonjs/core/scene"
import { place, type RGB } from "../geometry"
import type { QualityTier } from "../quality"
import { SP, mix, shade, rng } from "./palette"
import { SteamGeo, facing, xf, type V3 } from "./geo"
import { createSteamMaterials, TILE, type SteamMaterials } from "./materials"
import { gauge, postLantern, type SteamCtx } from "./kit"
import { SteamFx } from "./fx"

export { SP, mix, shade, rng, facing, xf, place }
export type { RGB, V3, SteamCtx }

/** `low` dos minijogos (celular fraco) → perfil do bairro. */
export const tierOf = (low: boolean): QualityTier => (low ? "low" : "mid")

export interface StageOptions {
  /** Cantaria nas paredes (malha `wall`). */
  wall?: boolean
  /** Engrenagens que giram e vapor (o perfil leve fica parado de qualquer jeito). */
  fx?: boolean
  /** Poças de luz das lanternas acesas (cenas de noite). */
  night?: number
}

export class SteamStage {
  readonly mats: SteamMaterials
  readonly ctx: SteamCtx & { wall: SteamGeo }
  readonly fx: SteamFx | null
  readonly meshes: Mesh[] = []
  private night: number

  constructor(
    private readonly scene: Scene,
    readonly tier: QualityTier,
    opts: StageOptions = {},
  ) {
    this.mats = createSteamMaterials(scene, tier, { wall: opts.wall })
    const geo = (uv: SteamGeo["uv"]) => {
      const g = new SteamGeo()
      g.uv = uv
      return g
    }
    this.ctx = {
      props: geo("face"),
      glow: geo("flat"),
      pools: geo("face"),
      pavers: geo(TILE.pavers),
      road: geo(TILE.road),
      soil: geo(TILE.soil),
      cobble: geo(TILE.cobble),
      wall: geo(TILE.wall),
      boxes: [],
      viewOnly: [],
      gears: [],
      vents: [],
      detail: tier === "low" ? 0.6 : 1,
    }
    this.fx = opts.fx === false ? null : new SteamFx(scene, this.mats, tier)
    this.night = opts.night ?? 0
  }

  /** Faz as malhas (uma por material não vazio), congela os materiais e liga engrenagens/vapor. */
  build(name: string): Mesh[] {
    const { ctx, mats } = this
    const layers = [
      [ctx.soil, mats.soil, "soil"],
      [ctx.road, mats.road, "road"],
      [ctx.pavers, mats.pavers, "pavers"],
      [ctx.cobble, mats.cobble, "cobble"],
      [ctx.wall, mats.wall ?? mats.trim, "wall"],
      [ctx.props, mats.trim, "props"],
      [ctx.glow, mats.glow, "glow"],
      [ctx.pools, mats.pool, "pools"],
    ] as const
    for (const [g, m, layer] of layers) {
      if (!g.vertexCount) continue
      const mesh = g.build(`${name}-${layer}`, this.scene, m)
      mesh.isPickable = false
      mesh.freezeWorldMatrix()
      this.meshes.push(mesh)
    }
    this.fx?.setStatic(ctx.gears, ctx.vents)
    mats.freeze()
    this.setNight(this.night)
    return this.meshes
  }

  /** 0 = dia (poças apagadas), 1 = noite (lanternas mais fortes, vapor mais escuro). */
  setNight(n: number) {
    this.night = n
    const k = 0.72 + 0.28 * n
    this.mats.glow.emissiveColor.set(k, k, k)
    this.mats.pool.emissiveColor.set(n, n, n)
    for (const m of this.meshes) if (m.material === this.mats.pool) m.setEnabled(n > 0.02)
    this.fx?.setNight(n)
  }

  dispose() {
    this.fx?.dispose()
    for (const m of this.meshes) m.dispose()
    this.meshes.length = 0
    this.mats.dispose()
  }
}

// ── Dirigível ────────────────────────────────────────────────────────────────

/**
 * Dirigível ao longo do X local do quadro `f` (proa no +X), comprimento `len`.
 * `props` = corpo (material de acabamento), `glow` = lanternas.
 */
export function airship(props: SteamGeo, glow: SteamGeo, f: Matrix, len: number, seed = 1) {
  const r = rng(seed)
  const d = len * 0.3
  const canvas = r() < 0.5 ? mix(SP.board, SP.masonry, 0.4) : mix(SP.copper, SP.board, 0.55)
  props.with("flat", () => props.sphere(1, [len, d, d], f, canvas, 10))
  // Cintas de latão em volta do balão (aros no plano YZ).
  const ringAt = (x: number, k: number) => props.ring(d * k, len * 0.012, xf(x, 0, 0, 0, f, 0, Math.PI / 2), SP.brassDark, 16, 3)
  ringAt(0, 1.0)
  ringAt(len * 0.25, 0.86)
  ringAt(-len * 0.25, 0.86)
  // Lemes em cruz na popa.
  for (const rx of [0, Math.PI / 2]) {
    props.box(len * 0.16, d * 0.62, len * 0.012, xf(-len * 0.44, 0, 0, 0, f, rx, 0), shade(canvas, 0.82))
  }
  // Gôndola de madeira com balaústre de latão, presa por cabos.
  const gy = -d * 0.62
  props.box(len * 0.3, d * 0.16, d * 0.24, xf(0, gy, 0, 0, f), SP.wood)
  props.box(len * 0.31, d * 0.025, d * 0.25, xf(0, gy + d * 0.09, 0, 0, f), SP.brass)
  for (const x of [-0.12, 0.12]) for (const z of [-0.1, 0.1]) props.tube([x * len, gy + d * 0.08, z * d], [x * len * 1.2, -d * 0.3, z * d * 1.4], len * 0.004, SP.iron, 3, f)
  // Hélice na popa da gôndola (duas pás) e o motor de cobre.
  props.cylinder(d * 0.12, len * 0.08, xf(-len * 0.17, gy, 0, 0, f, 0, Math.PI / 2), SP.copper, 8)
  props.box(len * 0.01, d * 0.5, d * 0.06, xf(-len * 0.215, gy, 0, 0, f, 0.4, 0), SP.woodDark)
  // Lanternas âmbar nas pontas da gôndola.
  for (const x of [-0.15, 0.15]) glow.box(d * 0.06, d * 0.06, d * 0.06, xf(x * len, gy - d * 0.04, 0, 0, f), SP.lampGlass)
}

export interface FleetShip {
  /** Raio da volta (m), altura, comprimento e o ângulo inicial (rad). */
  r: number
  y: number
  len: number
  a: number
}

/**
 * Frota de dirigíveis numa malha só, dando a volta no céu em torno de (cx, cz):
 * cada um na própria órbita, todos no mesmo nó que gira devagar.
 */
export class AirshipFleet {
  private readonly node: TransformNode
  private readonly meshes: Mesh[] = []
  private readonly obs: Observer<Scene>

  constructor(scene: Scene, mats: SteamMaterials, ships: FleetShip[], cx = 0, cz = 0, speed = 0.012) {
    this.node = new TransformNode("sp-fleet", scene)
    this.node.position.set(cx, 0, cz)
    const body = new SteamGeo()
    const glow = new SteamGeo()
    glow.uv = "flat"
    ships.forEach((s, i) => {
      // Proa na tangente da órbita (anda no sentido do giro do nó).
      const f = Matrix.RotationY(s.a + Math.PI).multiply(Matrix.Translation(Math.sin(s.a) * s.r, s.y, Math.cos(s.a) * s.r))
      airship(body, glow, f, s.len, i * 7 + 3)
    })
    for (const [g, m, n] of [[body, mats.trim, "body"], [glow, mats.glow, "glow"]] as const) {
      if (!g.vertexCount) continue
      const mesh = g.build(`sp-fleet-${n}`, scene, m)
      mesh.isPickable = false
      mesh.parent = this.node
      mesh.alwaysSelectAsActiveMesh = true
      this.meshes.push(mesh)
    }
    this.obs = scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime() / 1000, 0.1)
      this.node.rotation.y -= dt * speed
    })
  }

  dispose() {
    this.node.getScene().onBeforeRenderObservable.remove(this.obs)
    for (const m of this.meshes) m.dispose()
    this.node.dispose()
  }
}

/** Frota padrão: `n` dirigíveis espalhados num anel de raio r0–r1 entre y0 e y1. */
export function fleetRing(n: number, r0: number, r1: number, y0: number, y1: number, len: number, seed = 5): FleetShip[] {
  const r = rng(seed)
  return Array.from({ length: n }, (_, i) => ({
    a: (i / n) * Math.PI * 2 + r() * 0.6,
    r: r0 + (r1 - r0) * r(),
    y: y0 + (y1 - y0) * r(),
    len: len * (0.7 + r() * 0.6),
  }))
}

// ── Chaminé, pórtico, cano, aro ──────────────────────────────────────────────

/** Chaminé de tijolo (base em y0) com anéis de ferro, boca de latão e saída de vapor no topo. */
export function smokestack(ctx: SteamCtx, x: number, z: number, h: number, r: number, y0 = 0) {
  const { props } = ctx
  props.cylinder(r * 2.5, h * 0.08, place(x, y0 + h * 0.04, z), SP.stoneDark, 10)
  props.cone(r * 1.7, r * 2.1, h, place(x, y0 + h / 2, z), SP.brick, 10)
  const rings = Math.max(2, Math.round(h / 3))
  for (let i = 1; i <= rings; i++) props.cylinder(r * (2.1 - (0.4 * i) / (rings + 1)) + 0.06, Math.max(0.08, r * 0.12), place(x, y0 + (h * i) / (rings + 1), z), SP.iron, 10)
  props.cone(r * 2.2, r * 1.7, r * 0.5, place(x, y0 + h + r * 0.25, z), SP.brassDark, 10)
  ctx.vents.push([x, y0 + h + r * 0.55, z])
}

/**
 * Pórtico de ferro com engrenagem no meio da trave: largura `w` (entre os
 * pilares), altura `h` da trave, de frente para −Z do quadro (x, y, z, ry).
 * A engrenagem gira (SteamFx); lanternas âmbar no alto dos pilares.
 */
export function gearArch(ctx: SteamCtx, x: number, y: number, z: number, ry: number, w: number, h: number, s = 1) {
  const { props } = ctx
  const f = place(x, y, z, ry)
  const t = 0.42 * s
  for (const sx of [-1, 1]) {
    const px = sx * (w / 2 + t / 2)
    props.box(t * 1.5, 0.3 * s, t * 1.5, place(px, 0.15 * s, 0, 0, f), SP.stoneDark)
    props.box(t, h, t, place(px, h / 2, 0, 0, f), SP.iron)
    for (const k of [0.25, 0.6]) props.box(t * 1.18, 0.1 * s, t * 1.18, place(px, h * k, 0, 0, f), SP.brass)
    props.box(t * 1.4, 0.18 * s, t * 1.4, place(px, h + 0.09 * s, 0, 0, f), SP.brassDark)
    postLantern(ctx, px, h + 0.2 * s, 0, 0.8 * s, f)
  }
  props.box(w + t * 2.4, 0.42 * s, t * 0.9, place(0, h + 0.2 * s, 0, 0, f), SP.ironHi)
  props.box(w + t * 2.5, 0.08 * s, t * 0.95, place(0, h + 0.02 * s, 0, 0, f), SP.brass)
  const gr = Math.min(w * 0.22, 1.6 * s)
  // Disco de fundo fixo + a engrenagem que gira por cima.
  props.cylinder(gr * 2.4, 0.12 * s, facing(0, h + gr * 0.9, 0.1 * s, f), SP.ironWarm, 16)
  ctx.gears.push({ m: facing(0, h + gr * 0.9, -0.05 * s, f), r: gr, thick: 0.16 * s, speed: 0.6 })
}

/** Cano de cobre por pontos (com luvas) e um manômetro no meio do primeiro trecho. */
export function pipeRun(ctx: SteamCtx, pts: V3[], r: number, color: RGB = SP.copper, frame?: Matrix) {
  ctx.props.pipe(pts, r, color, SP.brassDark, frame)
  if (pts.length < 2) return
  const [a, b] = pts
  gauge(ctx, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + r * 2.2, (a[2] + b[2]) / 2 - r * 1.2, frame, Math.max(0.7, r * 6))
}

/** Aro de latão (raio r, em y) com rebites em volta — borda de plataforma redonda. */
export function rivetRing(g: SteamGeo, x: number, y: number, z: number, r: number, thick: number, n = 0, color: RGB = SP.brass) {
  g.ring(r * 2, thick, place(x, y, z), color, Math.max(16, Math.min(48, Math.round(r * 6))), 4)
  const k = n || Math.max(8, Math.round(r * 4))
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2
    g.box(thick * 0.5, thick * 0.5, thick * 0.5, place(x + Math.cos(a) * r, y + thick * 0.45, z + Math.sin(a) * r, -a), SP.brassDark)
  }
}

/** Silhueta de fábricas no horizonte (anel de raio r): galpões, chaminés com vapor e torres de relógio. */
export function factorySkyline(ctx: SteamCtx, cx: number, cz: number, r: number, n: number, y0 = 0, seed = 9, scale = 1) {
  const R = rng(seed)
  const { props, glow } = ctx
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.2
    const rr = r * (0.92 + R() * 0.16)
    const x = cx + Math.sin(a) * rr
    const z = cz + Math.cos(a) * rr
    const k = R()
    const s = scale * (0.8 + R() * 0.5)
    const f = place(x, y0, z, a + Math.PI)
    if (k < 0.45) {
      // Galpão com telhado em serra e janelas acesas.
      const w = 14 * s
      const h = 7 * s
      props.box(w, h, 9 * s, place(0, h / 2, 0, 0, f), R() < 0.5 ? SP.brick : SP.brickDark)
      for (let j = 0; j < 3; j++) props.box(w / 3, 1.6 * s, 9 * s, xf(-w / 3 + (j * w) / 3, h + 0.7 * s, 0, 0, f, 0, 0.35), SP.slate)
      for (let j = 0; j < 4; j++) glow.box(1.2 * s, 1.6 * s, 0.1, place(-w * 0.36 + (j * w * 0.72) / 3, h * 0.55, -4.55 * s, 0, f), SP.windowGlow)
      smokestack(ctx, x + Math.cos(a) * 3 * s, z - Math.sin(a) * 3 * s, 12 * s, 0.9 * s, y0)
    } else if (k < 0.75) {
      // Torre de relógio.
      const h = 18 * s
      props.box(4 * s, h, 4 * s, place(0, h / 2, 0, 0, f), SP.masonryDark)
      props.box(4.6 * s, 0.4 * s, 4.6 * s, place(0, h, 0, 0, f), SP.brassDark)
      props.cone(0.2, 5.4 * s, 4 * s, place(0, h + 2.2 * s, 0, Math.PI / 4, f), SP.slate, 4)
      glow.with("flat", () => glow.cylinder(2.6 * s, 0.1, facing(0, h * 0.8, -2.06 * s, f), SP.lampGlass, 16))
      props.ring(2.7 * s, 0.22 * s, facing(0, h * 0.8, -2.08 * s, f), SP.brass, 16, 3)
    } else {
      // Gasômetro: tanque de cobre com cintas.
      const h = 10 * s
      props.cylinder(9 * s, h, place(0, h / 2, 0, 0, f), SP.copperDark, 14)
      for (const y of [0.3, 0.65, 0.98]) props.cylinder(9.3 * s, 0.4 * s, place(0, h * y, 0, 0, f), SP.iron, 14)
      props.with("flat", () => props.sphere(9 * s, [1, 0.3, 1], place(0, h, 0, 0, f), SP.copper, 8))
    }
  }
}
