// features/meu-mundo/engine/statues.ts — as estátuas dos deuses (mm3d-50):
// só Aurion (meio dos bairros) e Morkhan (praça do centro), 10 m cada.
//
// A planta (bairro e centro) diz onde fica cada uma (StatueDef); aqui a BASE
// entra no buffer estático do mundo (pedestal octogonal de pedra ou púlpito) e
// o MODELO (pedra cinza com cor por vértice, 1 m de altura, pipeline/
// build_estatuas.py) é baixado pelo CenterModels, que assa o lugar e a escala
// nos vértices (estático, uma chamada de desenho por estátua). Sem o catálogo
// ou se o arquivo falhar, ficam só as bases — a colisão vem do servidor.

import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { place, type RGB } from "./geometry"
import type { CenterModels } from "./center-models"
import type { PropCtx } from "./world"
import type { StatueAssets, StatueDef } from "../types"

const STONE: RGB = [0.62, 0.6, 0.57]
const STONE_LIGHT: RGB = [0.78, 0.76, 0.72]
// Morkhan fica numa base de basalto (o Sem-Nome não divide a pedra dos Sete).
const BASALT: RGB = [0.27, 0.26, 0.29]
const BASALT_LIGHT: RGB = [0.4, 0.38, 0.42]
const GOLD: RGB = [0.86, 0.66, 0.22]
const VIOLET: RGB = [0.45, 0.22, 0.7]
/** O modelo sai do glTF com a frente no +Z do Babylon; a planta usa −Z. */
const MODEL_TURN = Math.PI

/** Base de uma estátua no buffer do mundo (e a mesma caixa que o servidor usa). */
export function statueBase(ctx: PropCtx, s: StatueDef) {
  const { geo } = ctx
  const b = s.base
  if (b.kind === "pedestal") {
    const dark = s.id === "morkhan"
    const [body, cap, trim] = dark ? [BASALT, BASALT_LIGHT, VIOLET] : [STONE, STONE_LIGHT, GOLD]
    const d = 2 * b.r
    // Três degraus em octógono: largo embaixo, corpo, tampo com friso.
    geo.cylinder(d * 1.06, 0.32, place(s.x, 0.16, s.z, Math.PI / 8), cap, 8)
    geo.cylinder(d * 0.92, b.h - 0.52, place(s.x, 0.32 + (b.h - 0.52) / 2, s.z, Math.PI / 8), body, 8)
    geo.cylinder(d * 0.94, 0.06, place(s.x, b.h - 0.22, s.z, Math.PI / 8), trim, 8)
    geo.cylinder(d * 0.98, 0.2, place(s.x, b.h - 0.1, s.z, Math.PI / 8), cap, 8)
    const hx = b.r * 0.93
    ctx.boxes.push({ x: s.x, z: s.z, hx, hz: hx, rot: 0, h: b.h })
    ctx.boxes.push({ x: s.x, z: s.z, hx, hz: hx, rot: Math.PI / 4, h: b.h })
  } else if (b.kind === "pulpit") {
    const w = 2 * b.r
    geo.box(w + 0.3, 0.18, w + 0.3, place(s.x, 0.09, s.z, s.rot), STONE_LIGHT)
    geo.box(w, b.h - 0.32, w, place(s.x, 0.18 + (b.h - 0.32) / 2, s.z, s.rot), STONE)
    geo.box(w + 0.18, 0.14, w + 0.18, place(s.x, b.h - 0.07, s.z, s.rot), STONE_LIGHT)
    // Placa dourada na frente (−Z local).
    const fx = s.x - Math.sin(s.rot) * (b.r + 0.01)
    const fz = s.z - Math.cos(s.rot) * (b.r + 0.01)
    geo.box(w * 0.6, 0.26, 0.04, place(fx, b.h * 0.55, fz, s.rot), GOLD)
    ctx.boxes.push({
      x: s.x,
      z: s.z,
      hx: b.r,
      hz: b.r,
      rot: s.rot,
      h: b.h + s.height,
    })
  }
}

/** Baixa e assenta os modelos (falha de um não derruba os outros). */
export function loadStatues(models: CenterModels, list: StatueDef[], assets: StatueAssets | null | undefined, isLive: () => boolean) {
  if (!assets) return
  for (const s of list) {
    const file = assets.models[s.id]
    if (!file) continue
    const m = Matrix.Scaling(s.height, s.height, s.height)
      .multiply(Matrix.RotationY(s.rot + MODEL_TURN))
      .multiply(Matrix.Translation(s.x, s.base.h, s.z))
    models.load(`statue-${s.id}-${s.x}-${s.z}`, assets.basePath + file, m).catch((err) => {
      if (isLive()) console.warn("[meu-mundo] estátua", s.id, err)
    })
  }
}
