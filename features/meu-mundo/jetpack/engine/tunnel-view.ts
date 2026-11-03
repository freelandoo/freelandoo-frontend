// features/meu-mundo/jetpack/engine/tunnel-view.ts — JETPACK (mm3d-63): o túnel.
//
// Galeria subterrânea steampunk, sem fim: um TRECHO de 24 m desenhado uma vez
// (duas variantes, alternadas) e repetido em instâncias que pulam para a
// frente quando ficam para trás — 8 chamadas de desenho para o túnel inteiro.
// Chão de pedra com trilhos de vagonete, paredes de cantaria, abóbada de
// tijolo, costelas de ferro com cintas de latão a cada 6 m, canos de cobre
// nos cantos, lampiões âmbar, engrenagens e manômetros nas paredes.
//
// As faces de dentro ficam EXATAMENTE onde a regra bate (x = ±W/2, y = 0 e
// y = H): o que sai delas (costela, cano, lampião) sai poucos centímetros.
// Nada aqui colide — a colisão é a de sim/flight.ts.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
// efeito colateral: liga Mesh.createInstance
import "@babylonjs/core/Meshes/instancedMesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { SteamStage, SP, mix, place, xf, facing, type SteamCtx, type RGB } from "../../engine/steampunk/scenery"
import { gauge, valveWheel } from "../../engine/steampunk/kit"
import { TUNNEL } from "../sim/flight"

const { W, H } = TUNNEL
/** Comprimento de um trecho (m). */
export const SEG = 24

export interface TunnelView {
  readonly stage: SteamStage
  /** Coloca os trechos em volta de z (a câmera vê até `ahead` m). */
  update: (z: number) => void
  dispose: () => void
}

/** Um trecho (variante 0 ou 1) nos acumuladores do palco, de z = 0 a SEG. */
function buildSegment(ctx: SteamCtx & { wall: SteamCtx["props"] }, variant: number) {
  const { props, glow, cobble, wall } = ctx
  // chão (pedra) e as faixas de pedra mais escura nas beiradas
  cobble.box(W + 1.6, 0.5, SEG, place(0, -0.25, SEG / 2), SP.stone)
  props.box(0.6, 0.06, SEG, place(-W / 2 + 0.3, 0.03, SEG / 2), SP.stoneDark)
  props.box(0.6, 0.06, SEG, place(W / 2 - 0.3, 0.03, SEG / 2), SP.stoneDark)
  // trilhos de vagonete com dormentes
  for (const rx of [-1.1, 1.1]) props.box(0.12, 0.12, SEG, place(rx, 0.11, SEG / 2), SP.steel)
  for (let z = 0.6; z < SEG; z += 1.2) props.box(3.2, 0.08, 0.36, place(0, 0.04, z), SP.woodDark)
  // paredes (cantaria) e abóbada (tijolo)
  for (const sx of [-1, 1]) wall.box(1, H + 1.4, SEG, place(sx * (W / 2 + 0.5), H / 2, SEG / 2), sx < 0 ? SP.masonry : SP.masonryDark)
  wall.box(W + 2, 0.8, SEG, place(0, H + 0.4, SEG / 2), SP.brickDark)
  // rodapé de ferro e barrado de tijolo nas paredes
  for (const sx of [-1, 1]) {
    props.box(0.08, 1.1, SEG, place(sx * (W / 2 + 0.02), 0.55, SEG / 2), SP.brick)
    props.box(0.1, 0.12, SEG, place(sx * (W / 2 + 0.02), 1.14, SEG / 2), SP.brassDark)
  }
  // costelas de ferro a cada 6 m (parede + teto), cintas de latão e rebites
  for (let z = 3; z < SEG; z += 6) {
    for (const sx of [-1, 1]) {
      props.box(0.22, H, 0.5, place(sx * (W / 2 + 0.04), H / 2, z), SP.iron)
      props.box(0.26, 0.14, 0.56, place(sx * (W / 2 + 0.05), 1.6, z), SP.brass)
      props.box(0.26, 0.14, 0.56, place(sx * (W / 2 + 0.05), H - 1.1, z), SP.brass)
      // mão-francesa no canto de cima
      props.box(0.2, 0.2, 0.46, xf(sx * (W / 2 - 0.35), H - 0.35, z, 0, undefined, 0, sx * Math.PI * 0.25), SP.ironHi)
    }
    props.box(W, 0.2, 0.5, place(0, H + 0.04, z), SP.iron)
    for (let x = -W / 2 + 1; x < W / 2; x += 2) props.box(0.12, 0.06, 0.6, place(x, H - 0.07, z), SP.brassDark)
  }
  // canos de cobre nos quatro cantos, com luvas
  for (const sx of [-1, 1]) {
    for (const [y, r, c] of [
      [0.75, 0.15, SP.copper],
      [H - 0.55, 0.13, SP.copperDark],
    ] as [number, number, RGB][]) {
      props.tube([sx * (W / 2 + 0.02), y, 0], [sx * (W / 2 + 0.02), y, SEG], r, c, 8)
      for (let z = 1.5; z < SEG; z += 6) props.box(r * 2.6, r * 2.6, 0.22, place(sx * (W / 2 + 0.02), y, z), SP.brassDark)
    }
  }
  // lampiões âmbar nas paredes a cada 12 m (desencontrados dos dois lados)
  for (const [sx, z] of [
    [-1, 6],
    [1, 12],
    [-1, 18],
    [1, 0.01],
  ] as [number, number][]) {
    const x = sx * (W / 2 - 0.06)
    props.box(0.12, 0.08, 0.22, place(x, H - 1.7, z), SP.ironHi)
    props.box(0.24, 0.04, 0.24, place(x - sx * 0.08, H - 1.48, z), SP.brassDark)
    glow.box(0.16, 0.3, 0.16, place(x - sx * 0.08, H - 1.68, z), SP.lampGlass)
    props.box(0.22, 0.04, 0.22, place(x - sx * 0.08, H - 1.86, z), SP.brassDark)
  }
  // variante: engrenagens grandes nas paredes ou manômetros e registros
  if (variant === 0) {
    for (const [sx, z, r] of [
      [-1, 9, 1.5],
      [1, 15, 1.2],
    ] as [number, number, number][]) {
      const m = xf(sx * (W / 2 + 0.06), 3.6, z, 0, undefined, 0, Math.PI / 2)
      props.gear(r, 0.16, 12, m, SP.brassDark, SP.iron)
      props.cylinder(0.34, 0.3, m, SP.brass, 10)
    }
    // grade de ventilação no teto
    props.box(2.4, 0.06, 1.2, place(0, H - 0.03, 12), SP.ironHi)
    for (let x = -1; x <= 1; x += 0.4) props.box(0.06, 0.08, 1.2, place(x, H - 0.06, 12), SP.iron)
  } else {
    for (const [sx, z] of [
      [1, 8],
      [-1, 14],
      [1, 20],
    ] as [number, number][]) {
      const f = place(sx * (W / 2 + 0.05), 0, z, sx > 0 ? Math.PI / 2 : -Math.PI / 2)
      gauge(ctx, 0, 2.4, 0, f, 1.3)
      valveWheel(ctx, 0.9, 1.6, 0, f, 1.4)
    }
    // caldeira embutida na parede (o corpo fica dentro da cantaria)
    props.cylinder(2.2, 3.2, facing(-W / 2 - 0.95, 3.4, 16), SP.copperDark, 14)
    for (const y of [2.2, 4.6]) props.box(0.12, 0.16, 2.4, place(-W / 2 + 0.05, y, 16), SP.brass)
    glow.box(0.06, 0.5, 0.5, place(-W / 2 + 0.04, 3.4, 16), mix(SP.amberDeep, SP.lampGlass, 0.4))
  }
}

export function buildTunnel(scene: Scene, low: boolean, slots: number): TunnelView {
  const stage = new SteamStage(scene, low ? "low" : "mid", { wall: true, fx: false })
  const ctx = stage.ctx
  const layers = [
    [ctx.cobble, stage.mats.cobble, "cobble"],
    [ctx.wall, stage.mats.wall ?? stage.mats.trim, "wall"],
    [ctx.props, stage.mats.trim, "props"],
    [ctx.glow, stage.mats.glow, "glow"],
  ] as const
  // as duas variantes, cada uma em 4 malhas (uma por material)
  const sources: Mesh[][] = []
  for (const v of [0, 1]) {
    buildSegment(ctx, v)
    const list: Mesh[] = []
    for (const [g, mat, name] of layers) {
      if (!g.vertexCount) continue
      list.push(g.build(`jt-seg${v}-${name}`, scene, mat, false))
    }
    sources.push(list)
  }
  stage.mats.freeze()
  // o brilho dos lampiões um pouco acima do normal: a galeria é escura
  stage.mats.glow.emissiveColor.set(1.15, 1.1, 1)

  // vagas: a vaga k mostra os trechos k, k+N, k+2N…; variante pela paridade
  const n = slots % 2 ? slots + 1 : slots
  const nodes: TransformNode[] = []
  const insts: InstancedMesh[] = []
  for (let k = 0; k < n; k++) {
    const node = new TransformNode(`jt-slot-${k}`, scene)
    nodes.push(node)
    const list = sources[k % 2]
    for (const src of list) {
      if (k < 2) src.parent = node
      else {
        const inst = src.createInstance(`${src.name}-i${k}`)
        inst.parent = node
        inst.isPickable = false
        insts.push(inst)
      }
    }
    node.position.z = k * SEG
  }

  return {
    stage,
    update(z: number) {
      // o trecho de trás começa a ~1 trecho antes do jogador
      const first = Math.floor(z / SEG) - 1
      for (let k = 0; k < n; k++) {
        // menor índice s ≥ first com s ≡ k (mod n)
        const s = first + ((((k - first) % n) + n) % n)
        nodes[k].position.z = s * SEG
      }
    },
    dispose() {
      for (const i of insts) i.dispose()
      for (const list of sources) for (const m of list) m.dispose()
      for (const node of nodes) node.dispose()
      stage.dispose()
    },
  }
}
