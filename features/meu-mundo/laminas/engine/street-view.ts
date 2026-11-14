// features/meu-mundo/laminas/engine/street-view.ts — o CENÁRIO DA RUA (mm3d-60l).
//
// Pedido do Alex: quando o monstro pega o jogador no bairro ou no centro, a
// luta não é mais no coliseu — é num cenário com ELEMENTOS do bairro / do
// centro. Não é o bairro vivo nem o centro de verdade (nada de payload, outros
// jogadores ou modelos do servidor): é um palco montado com as mesmas peças
// steampunk (casa 01 nas 5 linguagens, lampião, árvore, banco, cerca, rua,
// calçada, paralelepípedo, céu e a hora de Brasília).
//
//  • "bairro": rotatória de paralelepípedo no cruzamento (o círculo da luta),
//    ruas cinza para os 4 lados, calçadas, casas viradas para a rua com cerca,
//    árvores, caixas de correio, lampiões; o skyline do bairro ao fundo.
//  • "centro": praça de paralelepípedo, rua em volta, prédios de cantaria de
//    três andares com janelas acesas, mansarda e engrenagem; fábricas e
//    chaminés no horizonte.
// Nada colide (quem prende a luta no círculo é a regra, sim/fight.ts) e nada
// fica dentro do círculo. O estático é UMA malha por material (SteamStage).

import type { Scene } from "@babylonjs/core/scene"
import type { Matrix } from "@babylonjs/core/Maths/math.vector"
import { ARENA_R } from "../sim/fight"
import { frameOf, type RGB } from "../../engine/geometry"
import { house01 } from "../../engine/steampunk/house01"
import { ironFence, lightPool, mailbox, manhole, planter, steamBench, steamLamp, steamTree, grate, boiler } from "../../engine/steampunk/kit"
import { steamSkyline } from "../../engine/steampunk/neighborhood"
import { Sky, applyLights, brasiliaHour, nightFactor } from "../../engine/steampunk/atmosphere"
import { AirshipFleet, SP, SteamStage, factorySkyline, fleetRing, place, rivetRing, rng, shade, smokestack, tierOf, xf } from "../../engine/steampunk/scenery"
import type { ArenaView } from "./arena-view"

export type StreetKind = "bairro" | "centro"

// Tintas do chão (as do bairro: areia amarela, rua cinza claro).
const GROUND: RGB = [0.95, 0.9, 0.78]
const ROAD: RGB = [0.6, 0.6, 0.62]
const WALK: RGB = [0.96, 0.89, 0.77]
const COBBLE: RGB = [0.82, 0.74, 0.64]
const COBBLE_DARK: RGB = [0.56, 0.52, 0.48]

const ROAD_HALF = 4.5
const WALK_W = 2.6
/** A rotatória/praça onde a luta acontece (um pouco maior que o círculo). */
const PLAZA_R = ARENA_R + 1.6

const slab = (g: SteamStage["ctx"]["road"], cx: number, cz: number, w: number, d: number, top: number, color: RGB) =>
  g.box(w, 0.1, d, place(cx, top - 0.05, cz), color)

/** Marca do círculo da luta no chão: anel de latão rebitado + filete escuro. */
function fightRing(stage: SteamStage) {
  const { props, cobble } = stage.ctx
  cobble.cylinder(2 * PLAZA_R, 0.06, place(0, 0.02, 0), COBBLE, 48)
  cobble.cylinder(2 * (ARENA_R - 2.5), 0.062, place(0, 0.021, 0), shade(COBBLE, 0.92), 40)
  rivetRing(props, 0, 0.05, 0, ARENA_R + 0.35, 0.12, 48, SP.brass)
  rivetRing(props, 0, 0.05, 0, PLAZA_R, 0.1, 0, SP.iron)
}

// ═══ BAIRRO ═══════════════════════════════════════════════════════════════

function buildBairro(stage: SteamStage, low: boolean) {
  const { ctx } = stage
  const { soil, road, pavers, props } = ctx
  const L = 90
  slab(soil, 0, 0, 2 * L + 120, 2 * L + 120, 0.002, GROUND)
  // ruas em cruz saindo da rotatória + calçadas dos dois lados
  for (const ax of [0, 1]) {
    const w = 2 * ROAD_HALF
    if (ax === 0) {
      slab(road, 0, 0, 2 * L, w, 0.03, ROAD)
      for (const s of [-1, 1]) slab(pavers, 0, s * (ROAD_HALF + WALK_W / 2), 2 * L, WALK_W, 0.06, WALK)
    } else {
      slab(road, 0, 0, w, 2 * L, 0.031, ROAD)
      for (const s of [-1, 1]) slab(pavers, s * (ROAD_HALF + WALK_W / 2), 0, WALK_W, 2 * L, 0.061, WALK)
    }
  }
  // faixas tracejadas (fora da rotatória)
  for (let t = PLAZA_R + 2; t < L; t += 3.2)
    for (const s of [-1, 1]) {
      props.box(1.4, 0.012, 0.14, place(s * t, 0.036, 0), SP.roadLine)
      props.box(0.14, 0.012, 1.4, place(0, 0.036, s * t), SP.roadLine)
    }
  fightRing(stage)

  // lampiões em volta da rotatória (entre as ruas) e ao longo das calçadas
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2
    const x = Math.cos(a) * (PLAZA_R + 0.9)
    const z = Math.sin(a) * (PLAZA_R + 0.9)
    steamLamp(ctx, x, z, { collide: false, clock: i % 4 === 1, gearSeed: i })
    lightPool(ctx, x, z, 3.2)
  }
  for (let t = PLAZA_R + 9; t < L - 10; t += 15)
    for (const s of [-1, 1]) {
      const e = ROAD_HALF + WALK_W - 0.5
      for (const [x, z] of [
        [t * s, e],
        [t * s, -e],
        [e, t * s],
        [-e, t * s],
      ]) {
        steamLamp(ctx, x, z, { collide: false })
        lightPool(ctx, x, z, 2.6)
      }
    }
  // bancos virados para a luta e árvores nos cantos da rotatória
  for (let i = 0; i < 4; i++) {
    const a = ((i + 0.5) / 4) * Math.PI * 2
    steamBench(ctx, Math.cos(a) * (PLAZA_R + 2.3), Math.sin(a) * (PLAZA_R + 2.3), -a - Math.PI / 2)
    steamTree(ctx, Math.cos(a) * 19.5, Math.sin(a) * 19.5, 1.15, false)
  }
  manhole(ctx, PLAZA_R + 6, 0.035, 1.6)
  manhole(ctx, -1.8, 0.035, -(PLAZA_R + 9))
  grate(ctx, ROAD_HALF - 0.4, 0.035, PLAZA_R + 4, 0)
  grate(ctx, -(ROAD_HALF - 0.4), 0.035, -(PLAZA_R + 12), 0)

  // casas: quintal na frente, cerca de ferro com o portão na porta, caixa de correio
  const step = { width: 1.6, depth: 0.6 }
  const FRONT = ROAD_HALF + WALK_W + 3
  const along = low ? [19, 30] : [19, 30, 41, 52]
  let variant = 0
  const house = (x: number, z: number, rot: number) => {
    const f = frameOf(x, z, rot)
    const fx = house01(ctx, f, 0, -1.6, variant++, step)
    ctx.gears.push(...fx.gears)
    ctx.vents.push(...fx.vents)
    // cerca na frente do lote, aberta no caminho da porta
    ironFence(ctx, [-4.4, -4.6], [-1, -4.6], 0.95, 0.06, f)
    ironFence(ctx, [1, -4.6], [4.4, -4.6], 0.95, 0.06, f)
    pavers.box(1.3, 0.05, 3, place(0, 0.05, -3.1, 0, f), WALK)
    mailbox(ctx, 1.6, -4.2, 0, f)
  }
  const treeAt = (x: number, z: number) => steamTree(ctx, x, z, 0.9, false)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      for (const t of along) {
        // ao longo da rua leste–oeste (frente para z = 0)
        house(sx * t, sz * (FRONT + 1.6), sz > 0 ? 0 : Math.PI)
        // ao longo da rua norte–sul (frente para x = 0)
        house(sx * (FRONT + 1.6), sz * (t + 3), sx > 0 ? -Math.PI / 2 : Math.PI / 2)
      }
      if (!low) for (const t of along) treeAt(sx * (t + 5.5), sz * (FRONT + 6.5))
    }
  steamSkyline(ctx, 52)
}

// ═══ CENTRO ═══════════════════════════════════════════════════════════════

/** Prédio de cantaria de 3 andares, frente no −Z local do quadro. */
function townBlock(stage: SteamStage, f: Matrix, w: number, h: number, d: number, seed: number) {
  const { props, glow, wall } = stage.ctx
  const r = rng(seed)
  const body = [SP.masonry, SP.masonryLight, SP.brick, SP.stoneLight][Math.floor(r() * 4)]
  wall.box(w, h, d, place(0, h / 2, d / 2, 0, f), body)
  // embasamento de pedra e cornijas por andar
  props.box(w + 0.2, 0.9, d + 0.2, place(0, 0.45, d / 2, 0, f), SP.stoneDark)
  const floors = 3
  const fh = (h - 1) / floors
  for (let k = 1; k <= floors; k++) props.box(w + 0.3, 0.18, d + 0.3, place(0, 1 + k * fh - 0.1, d / 2, 0, f), SP.brassDark)
  // mansarda de ardósia
  props.prism(w + 0.2, d + 0.2, 2.6, place(0, h, d / 2, 0, f), SP.slate)
  // janelas acesas (algumas apagadas) em arco simples
  const cols = Math.max(2, Math.floor(w / 2.6))
  for (let k = 0; k < floors; k++)
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + (w / cols) * (c + 0.5)
      const y = 1 + k * fh + fh * 0.5
      props.box(1.25, 1.75, 0.12, place(x, y, -0.04, 0, f), SP.iron)
      if (r() > 0.25) glow.box(1.0, 1.5, 0.05, place(x, y, -0.1, 0, f), SP.windowGlow)
    }
  // porta no térreo com marquise
  props.box(1.8, 2.4, 0.15, place(0, 1.2, -0.06, 0, f), SP.woodDark)
  props.box(2.6, 0.12, 1.2, place(0, 2.7, -0.6, 0, f), SP.iron)
  // engrenagem na fachada de alguns
  if (r() > 0.45) props.gear(1.1, 0.18, 12, xf(0, h - 1.4, -0.14, 0, f, Math.PI / 2), SP.brass, SP.copperDark)
}

function buildCentro(stage: SteamStage, low: boolean) {
  const { ctx } = stage
  const { soil, road, pavers, cobble, props } = ctx
  const SQ = 27
  slab(soil, 0, 0, 260, 260, 0.002, shade(GROUND, 0.97))
  // praça de paralelepípedo quadrada + rua em volta + calçada dos prédios
  slab(cobble, 0, 0, 2 * SQ, 2 * SQ, 0.012, COBBLE_DARK)
  for (const s of [-1, 1]) {
    slab(road, 0, s * (SQ + ROAD_HALF), 2 * (SQ + 2 * ROAD_HALF), 2 * ROAD_HALF, 0.03, ROAD)
    slab(road, s * (SQ + ROAD_HALF), 0, 2 * ROAD_HALF, 2 * SQ, 0.031, ROAD)
    slab(pavers, 0, s * (SQ + 2 * ROAD_HALF + WALK_W / 2), 2 * (SQ + 2 * ROAD_HALF + WALK_W), WALK_W, 0.06, WALK)
    slab(pavers, s * (SQ + 2 * ROAD_HALF + WALK_W / 2), 0, WALK_W, 2 * (SQ + 2 * ROAD_HALF), 0.061, WALK)
  }
  fightRing(stage)
  // canteiros, árvores e bancos na praça (fora do círculo)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const x = Math.cos(a) * 20
    const z = Math.sin(a) * 20
    if (i % 2 === 0) steamTree(ctx, x, z, 1.2, false, "column")
    else planter(ctx, x, z, i, a, 2.2, 1.1)
    const b = a + Math.PI / 8
    steamBench(ctx, Math.cos(b) * (PLAZA_R + 2.4), Math.sin(b) * (PLAZA_R + 2.4), -b - Math.PI / 2)
  }
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2
    const x = Math.cos(a) * (PLAZA_R + 0.9)
    const z = Math.sin(a) * (PLAZA_R + 0.9)
    steamLamp(ctx, x, z, { collide: false, clock: i === 2, gearSeed: i })
    lightPool(ctx, x, z, 3.2)
  }
  // lampiões nos cantos e no meio de cada lado da praça
  for (const sx of [-1, 0, 1])
    for (const sz of [-1, 0, 1]) {
      if (!sx && !sz) continue
      const x = sx * (SQ - 1)
      const z = sz * (SQ - 1)
      steamLamp(ctx, x, z, { collide: false })
      lightPool(ctx, x, z, 2.8)
    }
  // prédios em volta (frente para a praça)
  const B = SQ + 2 * ROAD_HALF + WALK_W
  const n = low ? 3 : 4
  let seed = 11
  for (let side = 0; side < 4; side++) {
    const rot = [0, Math.PI, -Math.PI / 2, Math.PI / 2][side]
    for (let i = 0; i < n; i++) {
      const t = -SQ + 4 + ((2 * SQ - 8) / (n - 1)) * i
      const [x, z] = side === 0 ? [t, B] : side === 1 ? [t, -B] : side === 2 ? [B, t] : [-B, t]
      const w = 11 + ((seed * 7) % 4)
      townBlock(stage, frameOf(x, z, rot), w, 11 + ((seed * 13) % 5), 9, seed)
      seed += 3
    }
  }
  // caldeira e chaminés atrás dos prédios, fábricas no horizonte
  boiler(ctx, B + 14, 8, -Math.PI / 2, 1.4)
  for (const [x, z, h] of [
    [B + 16, -12, 20],
    [-B - 15, 18, 17],
    [10, B + 17, 22],
    [-14, -B - 16, 18],
  ] as const)
    smokestack(ctx, x, z, h, 1)
  factorySkyline(ctx, 0, 0, 92, low ? 8 : 16, 0, 61, 1.4)
}

/** Monta o palco da rua (bairro/centro) na cena da luta. Luzes: "mm-hemi"/"mm-sun". */
export function buildStreet(scene: Scene, low: boolean, kind: StreetKind): ArenaView {
  const n = nightFactor(brasiliaHour())
  const stage = new SteamStage(scene, tierOf(low), { wall: kind === "centro", night: n })
  if (kind === "centro") buildCentro(stage, low)
  else buildBairro(stage, low)
  stage.build(`laminas-${kind}`)
  applyLights(scene, n)
  scene.fogStart = 45
  scene.fogEnd = 170
  // céu do lugar (engine/sky): bairro ou centro, com o mesmo dia/noite da rua
  const sky = new Sky(scene, 200, { region: kind, tier: low ? "low" : "mid" })
  sky.set(n)
  const fleet = low ? null : new AirshipFleet(scene, stage.mats, fleetRing(3, 60, 80, 30, 42, 16, 61))
  return {
    cheer() {
      /* rua não tem plateia */
    },
    update() {
      /* engrenagens e vapor se viram sozinhos (SteamFx) */
    },
    dispose() {
      fleet?.dispose()
      sky.dispose()
      stage.dispose()
    },
  }
}
