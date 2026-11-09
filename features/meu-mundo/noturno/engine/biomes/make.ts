// features/meu-mundo/noturno/engine/biomes/make.ts — ROLÊ NOTURNO 2.0: o molde das fases.
//
// Cada fase entrega só o que é dela: texturas pintadas da pista (piso, acesos,
// laterais, aro do loop), céu, o "mar" lá embaixo, a luz, as peças do Blender
// (rn2-<fase>-*.glb: nervura do loop, portal, poste, coluna, mão-francesa,
// placa) e o cenário perto/longe com as peças esculpidas do Jetpack da mesma
// fase. A seção da pista e onde cada peça vai (postes a cada 3 m, colunas,
// nervuras no loop, portal na boca da descida, placa antes do loop) são as
// mesmas em todas — a leitura do jogo não muda de uma fase para outra.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { QualityTier } from "../../../engine/quality"
import type { PieceAssets } from "../../../jetpack/engine/canyon-assets"
import type { RunPhase, TrackSeg } from "../../sim/track"
import type { AlongDef, DressDef, StripDef, TrackLook } from "../track-mesh"
import { buildFall, buildSea, buildSky, canvasTexture, glow, lit, rnKit, type Paint, type SeaOpts, type SkyOpts } from "./common"
import type { Biome, BiomeLight } from "./types"

export const RN2_BASE = "/meu-mundo/noturno/v3/"

export interface BiomeCfg {
  phase: Exclude<RunPhase, "classica">
  paint: { deck: Paint; deckGlow: Paint; side: Paint; wall: Paint; wallGlow: Paint }
  colors: { deckEm: string; sideEm: string; under: string; underEm: string; rail: string; railEm: string; edge: string; wallEm: string }
  sky: SkyOpts
  sea: SeaOpts | null
  /** Cachoeira/queda (topo, base, filetes) — null sem. */
  fall: [string, string, string] | null
  light: BiomeLight
  /** Chão do mundo (as colunas descem até ele). */
  groundY: number
  /** Colunas da pista a cada tanto (m). */
  towerEvery: number
  pieces: (scene: Scene, isAlive: () => boolean) => Promise<PieceAssets<string>>
  dress: (A: Map<string, Mesh>, L: Map<string, Mesh>, fall: Mesh | null, low: boolean) => { dress: DressDef[]; far: DressDef[] }
  /** Animações próprias (drones, fumaça…). */
  extra?: (scene: Scene, low: boolean) => { update(dt: number, cam: Vector3, s: number, time: number): void; dispose(): void }
}

const isLoop = (seg: TrackSeg) => seg.kind === "loop"

/** A seção da pista (igual em todas as fases; sentido anti-horário = normal para fora). */
export function trackStrips(m: { deck: ReturnType<typeof lit>; side: ReturnType<typeof lit>; under: ReturnType<typeof lit>; rail: ReturnType<typeof lit>; edge: ReturnType<typeof glow>; wall: ReturnType<typeof lit> }): StripDef[] {
  const oct = (cx: number, cy: number, r: number) => Array.from({ length: 6 }, (_, i) => [cx + r * Math.cos((i / 6) * Math.PI * 2), cy + r * Math.sin((i / 6) * Math.PI * 2)] as const)
  return [
    { pts: [[4.6, 0], [-4.6, 0]], u: [1, 0], vLen: 8, mat: m.deck },
    { pts: [[5.0, -0.75], [5.0, 0.3], [4.6, 0.3], [4.6, 0]], uLen: 1, vLen: 4, mat: m.side },
    { pts: [[-4.6, 0], [-4.6, 0.3], [-5.0, 0.3], [-5.0, -0.75]], uLen: 1, vLen: 4, mat: m.side },
    { pts: [[-5.0, -0.75], [5.0, -0.75]], uLen: 2, vLen: 4, mat: m.under },
    { pts: [[5.02, -0.52], [5.02, -0.26]], uLen: 1, vLen: 4, mat: m.edge },
    { pts: [[-5.02, -0.26], [-5.02, -0.52]], uLen: 1, vLen: 4, mat: m.edge },
    { pts: [[4.58, 0.25], [4.58, 0.12]], uLen: 1, vLen: 4, mat: m.edge },
    { pts: [[-4.58, 0.12], [-4.58, 0.25]], uLen: 1, vLen: 4, mat: m.edge },
    { pts: oct(4.75, 1.1, 0.07), closed: true, center: [4.75, 1.1], uLen: 1, vLen: 4, mat: m.rail },
    { pts: oct(-4.75, 1.1, 0.07), closed: true, center: [-4.75, 1.1], uLen: 1, vLen: 4, mat: m.rail },
    { pts: oct(4.75, 0.62, 0.045), closed: true, center: [4.75, 0.62], uLen: 1, vLen: 4, mat: m.rail },
    { pts: oct(-4.75, 0.62, 0.045), closed: true, center: [-4.75, 0.62], uLen: 1, vLen: 4, mat: m.rail },
    { pts: [[5.3, -0.75], [5.3, 1.7], [4.98, 1.7], [4.98, 0.3]], uLen: 1.2, vLen: 8, mat: m.wall, when: isLoop },
    { pts: [[-4.98, 0.3], [-4.98, 1.7], [-5.3, 1.7], [-5.3, -0.75]], uLen: 1.2, vLen: 8, mat: m.wall, when: isLoop },
  ]
}

/** Onde cada peça de pista vai (igual em todas as fases). */
export function trackAlong(
  p: Record<"rib" | "portal" | "post" | "truss" | "bracket" | "sign", { body: Mesh | null; glow: Mesh | null }>,
  groundY: number,
  every: number,
): AlongDef[] {
  const along: AlongDef[] = []
  const both = (piece: { body: Mesh | null; glow: Mesh | null }, d: Omit<AlongDef, "mesh">) => {
    for (const m of [piece.body, piece.glow]) if (m) along.push({ mesh: m, ...d })
  }
  const towerOk = (seg: TrackSeg) => seg.kind !== "loop"
  both(p.post, { every: 4, xs: [4.75, -4.75], mirror: true, when: (seg) => !isLoop(seg) })
  both(p.bracket, { every, phase: 20, xs: [0], when: towerOk })
  both(p.truss, { every, phase: 20, xs: [0], toGround: groundY, stack: 12, below: 1.9, when: towerOk })
  both(p.rib, { at: (seg) => (isLoop(seg) ? Array.from({ length: Math.floor(seg.len / 4) }, (_, i) => seg.s0 + 2 + i * 4) : []), xs: [0] })
  both(p.truss, { at: (seg) => (isLoop(seg) ? [seg.s0 + 2, seg.s0 + seg.len - 2] : []), xs: [0], toGround: groundY, stack: 12, below: 1.9 })
  both(p.portal, { at: (seg) => (seg.tag === "portal" && seg.climb === 0 ? [seg.s0 + seg.len - 4] : []), xs: [0] })
  both(p.sign, { at: (seg) => (seg.tag === "hero" && seg.kind === "straight" ? [seg.s0 + 6] : []), xs: [6.4, -6.4] })
  return along
}

/** Peças do Jetpack para instâncias finas: na origem e sem LOD (a versão leve vai à parte, para o longe). */
export function splitLod(meshes: Map<string, Mesh>) {
  const A = new Map<string, Mesh>()
  const L = new Map<string, Mesh>()
  for (const [k, m] of meshes) {
    const lod = m.getLODLevels()[0]?.mesh as Mesh | null | undefined
    for (const l of [...m.getLODLevels()]) m.removeLODLevel(l.mesh)
    m.position.setAll(0)
    A.set(k, m)
    if (lod) {
      lod.position.setAll(0)
      L.set(k, lod)
    }
  }
  return { A, L }
}

export function makeBiome(scene: Scene, tier: QualityTier, isAlive: () => boolean, cfg: BiomeCfg): Biome {
  const low = tier === "low"
  const dir = `${RN2_BASE}${cfg.phase}/`
  const id = `rn2-${cfg.phase}`
  const kit = rnKit(scene, tier)
  const tex = {
    deck: canvasTexture(scene, `${id}-deck`, 512, 1024, cfg.paint.deck),
    deckGlow: canvasTexture(scene, `${id}-deckglow`, 256, 512, cfg.paint.deckGlow),
    side: canvasTexture(scene, `${id}-side`, 128, 256, cfg.paint.side),
    wall: canvasTexture(scene, `${id}-wall`, 64, 256, cfg.paint.wall),
    wallGlow: canvasTexture(scene, `${id}-wallglow`, 64, 256, cfg.paint.wallGlow),
  }
  const C = cfg.colors
  const mats = {
    deck: lit(scene, `${id}-deck`, { tex: tex.deck, emissiveTex: tex.deckGlow, spec: 0.35, emissive: C.deckEm }),
    side: lit(scene, `${id}-side`, { tex: tex.side, emissive: C.sideEm, spec: 0.2 }),
    under: lit(scene, `${id}-under`, { color: C.under, emissive: C.underEm }),
    rail: lit(scene, `${id}-rail`, { color: C.rail, emissive: C.railEm, spec: 0.6 }),
    edge: glow(scene, `${id}-edge`, C.edge),
    wall: lit(scene, `${id}-wall`, { tex: tex.wall, emissiveTex: tex.wallGlow, spec: 0.3, emissive: C.wallEm }),
  }
  const sky = buildSky(scene, id, cfg.sky)
  const sea = cfg.sea ? buildSea(scene, id, cfg.sea) : null
  const falls = cfg.fall ? buildFall(scene, id, ...cfg.fall) : null
  const extra = cfg.extra?.(scene, low) ?? null
  const disposers: (() => void)[] = []

  const ready = (async (): Promise<TrackLook> => {
    const names = ["rib", "portal", "post", "truss", "bracket", "sign"] as const
    const [assets, ...pieces] = await Promise.all([cfg.pieces(scene, isAlive), ...names.map((n) => kit.load(`${dir}${id}-${n}.glb`, `${id}-${n}`).catch(() => ({ body: null, glow: null })))])
    disposers.push(() => assets.dispose())
    const p = Object.fromEntries(names.map((n, i) => [n, pieces[i]])) as Record<(typeof names)[number], { body: Mesh | null; glow: Mesh | null }>
    const { A, L } = splitLod(assets.meshes as Map<string, Mesh>)
    const { dress, far } = cfg.dress(A, L, falls?.mesh ?? null, low)
    return { strips: trackStrips(mats), along: trackAlong(p, cfg.groundY, cfg.towerEvery), dress, far, groundY: cfg.groundY }
  })()

  return {
    phase: cfg.phase,
    obstacleDir: dir,
    light: cfg.light,
    ready,
    update(dt, cam, s, time) {
      sea?.update(dt, cam)
      falls?.update(dt)
      extra?.update(dt, cam, s, time)
    },
    dispose() {
      for (const d of disposers) d()
      sky.dispose()
      sea?.dispose()
      falls?.dispose()
      extra?.dispose()
      kit.dispose()
      for (const m of Object.values(mats)) m.dispose()
      for (const t of Object.values(tex)) t.dispose()
    },
  }
}

// ── pinturas comuns (por cor) ────────────────────────────────────────────────

/** Faixas (x em metros, −4,6…4,6) para pintar o piso. */
export const deckU = (W: number) => (x: number) => ((x + 4.6) / 9.2) * W
export const LANES: [number, number][] = [
  [-3.9, -1.5],
  [-1.0, 1.0],
  [1.5, 3.9],
]

/** Lateral: chapas com frisos e rebites na cor dada. */
export function paintSideOf(base: [number, number, number], rivet: string): Paint {
  return (c, W, H) => {
    c.fillStyle = `rgb(${base[0] * 0.7},${base[1] * 0.7},${base[2] * 0.7})`
    c.fillRect(0, 0, W, H)
    for (let i = 0; i < 4; i++) {
      const y0 = (i * H) / 4
      const k = 0.92 + (i % 2) * 0.12
      c.fillStyle = `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`
      c.fillRect(3, y0 + 3, W - 6, H / 4 - 6)
      c.fillStyle = "rgba(255,255,255,0.1)"
      c.fillRect(3, y0 + 3, W - 6, 2)
      c.fillStyle = rivet
      for (const x of [8, W - 11]) for (const y of [y0 + 8, y0 + H / 4 - 11]) c.fillRect(x, y, 3, 3)
    }
  }
}

/** Parede do aro do loop: chapas escuras. */
export function paintWallOf(base: [number, number, number]): Paint {
  return (c, W, H) => {
    c.fillStyle = `rgb(${base[0] * 0.75},${base[1] * 0.75},${base[2] * 0.75})`
    c.fillRect(0, 0, W, H)
    for (let i = 0; i < 4; i++) {
      const y0 = (i * H) / 4
      c.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`
      c.fillRect(4, y0 + 4, W - 8, H / 4 - 8)
    }
  }
}

/** Janelas acesas do aro (duas cores alternadas). */
export function paintWallGlowOf(a: string, b: string): Paint {
  return (c, W, H) => {
    c.fillStyle = "#000"
    c.fillRect(0, 0, W, H)
    for (let i = 0; i < 4; i++) {
      const y0 = (i * H) / 4
      c.fillStyle = i % 2 ? a : b
      c.fillRect(W * 0.3, y0 + H * 0.06, W * 0.4, H * 0.1)
    }
  }
}

/** Setas "^" (para a frente) no meio da pista, na cor dada; filetes nas bordas das faixas. */
export function paintChevrons(col: [string, string], lines: string, n = 2): Paint {
  return (c, W, H) => {
    c.fillStyle = "#000"
    c.fillRect(0, 0, W, H)
    const ux = deckU(W)
    const cx = ux(0)
    const s = W / 256
    for (let i = 0; i < n; i++) {
      const y0 = H * (0.18 + i * 0.16)
      const g = c.createLinearGradient(0, y0 - 40 * s, 0, y0 + 60 * s)
      g.addColorStop(0, col[0])
      g.addColorStop(1, col[1])
      c.fillStyle = g
      c.beginPath()
      c.moveTo(cx, y0 - 36 * s)
      c.lineTo(cx + 92 * s, y0 + 34 * s)
      c.lineTo(cx + 64 * s, y0 + 52 * s)
      c.lineTo(cx, y0 + 4 * s)
      c.lineTo(cx - 64 * s, y0 + 52 * s)
      c.lineTo(cx - 92 * s, y0 + 34 * s)
      c.closePath()
      c.fill()
    }
    c.fillStyle = lines
    for (const x of [-1.5, -1.0, 1.0, 1.5]) c.fillRect(ux(x) - s, 0, 2 * s, H)
  }
}
