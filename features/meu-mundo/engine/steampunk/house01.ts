// features/meu-mundo/engine/steampunk/house01.ts
//
// A casa nível 01 em steampunk (mm3d-51). Mesma pegada, mesma porta, mesmo
// degrau e a mesma caixa de colisão de sempre (5,4 × 4,8 m, 4,6 m — vem do
// catálogo do servidor); muda a ARQUITETURA: embasamento de pedra, rodapé de
// tijolo, cantoneiras de ferro, cornija, telhado de ardósia em placas com
// cumeeira de ferro e pináculos, janelas de moldura de latão acesas por
// dentro, porta de madeira com ferragens e marquise, lanterna, calha de cobre
// e chaminé de tijolo com vapor.
//
// Cinco linguagens, escolhidas pela VARIAÇÃO da casa (vem do servidor, não
// muda entre sessões nem entre jogadores):
//   0 Engenheiro  — bege, empena frontal com engrenagens, mãos-francesas de bronze
//   1 Caldeira    — tijolo, reservatório de cobre no telhado, canos e manômetros
//   2 Vitoriana   — pedra cinza, telhado alto, água-furtada, cumeeira rendada
//   3 Inventor    — alvenaria escura, torre de exaustão que gira, para-raios de bobina
//   4 Relojoeiro  — bege claro, empena com relógio e engrenagens que giram

import type { Matrix } from "@babylonjs/core/Maths/math.vector"
import { place, type RGB } from "../geometry"
import { SP, shade } from "./palette"
import { facing, xf, type V3 } from "./geo"
import { gauge, postLantern, valveWheel, xyzOf, type GearSpec, type SteamCtx } from "./kit"

export const LANGUAGES = ["engineer", "boiler", "victorian", "inventor", "clockmaker"] as const
export type Language = (typeof LANGUAGES)[number]

const WALLS: Record<Language, [RGB, RGB]> = {
  engineer: [SP.masonry, SP.masonryLight],
  boiler: [SP.brick, SP.brickDark],
  victorian: [SP.stoneLight, SP.stone],
  inventor: [SP.masonryDark, shade(SP.woodLight, 1.1)],
  clockmaker: [SP.masonryLight, SP.masonry],
}

export function languageOf(variant: number): Language {
  return LANGUAGES[((variant % 5) + 5) % 5]
}

/** Peças que mexem (fx.ts): engrenagens que giram e saídas de vapor da casa. */
export interface HouseFx {
  gears: GearSpec[]
  vents: V3[]
}

/**
 * Desenha a casa 01. `f` = quadro do lote; (hx, hf) = meio da fachada (o
 * mesmo `plan.houseFront` de sempre). Frente no −Z local.
 */
export function house01(ctx: SteamCtx, f: Matrix, hx: number, hf: number, variant: number, door: { width: number; depth: number }): HouseFx {
  const { props, glow } = ctx
  const lang = languageOf(variant)
  const wall = WALLS[lang][Math.floor(variant / 5) % 2]
  const brickLang = lang === "boiler"
  const fx: HouseFx = { gears: [], vents: [] }
  // Local: x lateral (0 = eixo da porta), z a partir da frente da base (a parede fica em 0,2).
  const P = (x: number, y: number, z: number, ry = 0) => place(hx + x, y, hf + z, ry, f)
  const X = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => xf(hx + x, y, hf + z, ry, f, rx, rz)
  const F = (x: number, y: number, z: number) => facing(hx + x, y, hf + z, f)

  const W = 5
  const D = 4.4
  const Z0 = 0.2
  const ZC = Z0 + D / 2
  const TOP = 2.9
  const roofH = lang === "victorian" ? 2.4 : 1.9

  // ── Corpo ──
  props.box(5.4, 0.3, 4.8, P(0, 0.15, 2.4), SP.stoneDark)
  props.box(5.5, 0.05, 4.9, P(0, 0.32, 2.4), SP.stoneLight)
  props.box(W, TOP - 0.3, D, P(0, (TOP + 0.3) / 2, ZC), wall)
  props.box(W + 0.06, 0.62, D + 0.06, P(0, 0.64, ZC), brickLang ? SP.stone : SP.brick)
  props.box(W + 0.1, 0.06, D + 0.1, P(0, 0.97, ZC), SP.stoneLight)
  // Cantoneiras de ferro com capa de latão.
  for (const sx of [-1, 1]) {
    for (const sz of [Z0, Z0 + D]) {
      props.box(0.17, TOP - 0.3, 0.17, P(sx * (W / 2), (TOP + 0.3) / 2, sz), SP.iron)
      props.box(0.22, 0.08, 0.22, P(sx * (W / 2), TOP - 0.02, sz), SP.brass)
      for (const y of [1.2, 1.9, 2.5]) props.box(0.2, 0.04, 0.2, P(sx * (W / 2), y, sz), SP.ironHi)
    }
  }
  // Cornija: friso de madeira e banda de ferro.
  props.box(W + 0.16, 0.12, D + 0.16, P(0, TOP - 0.1, ZC), SP.wood)
  props.box(W + 0.26, 0.12, D + 0.26, P(0, TOP + 0.02, ZC), SP.iron)

  // ── Telhado de ardósia em duas águas (cumeeira em X, como a 01 de sempre) ──
  const eave = TOP + 0.02
  const ridgeY = eave + roofH
  const over = 0.38
  props.prism(W, D, roofH, P(0, eave + 0.06, ZC), wall)
  for (const s of [-1, 1]) {
    const zE = ZC + s * (D / 2 + over)
    const yE = eave - 0.06
    const dz = ZC - zE
    const dy = ridgeY + 0.08 - yE
    const len = Math.hypot(dz, dy)
    props.box(W + 0.7, 0.13, len, X(0, (yE + ridgeY + 0.08) / 2, (zE + ZC) / 2, 0, -Math.atan2(dy, dz)), lang === "victorian" ? SP.slateWarm : SP.slate)
    // Calha de cobre na beirada.
    props.tube([hx - (W + 0.7) / 2, yE - 0.02, hf + zE], [hx + (W + 0.7) / 2, yE - 0.02, hf + zE], 0.06, SP.copper, 6, f)
  }
  // Tubo de queda no canto da frente.
  props.tube([hx - W / 2 - 0.05, eave - 0.1, hf + Z0 - over + 0.05], [hx - W / 2 - 0.05, 0.3, hf + Z0 - 0.1], 0.05, SP.copperDark, 6, f)
  // Barras de madeira nas empenas e cumeeira de ferro com pináculos.
  for (const sx of [-1, 1]) {
    for (const s of [-1, 1]) {
      props.tube([hx + sx * (W / 2 + 0.36), eave, hf + ZC + s * (D / 2 + over)], [hx + sx * (W / 2 + 0.36), ridgeY + 0.08, hf + ZC], 0.07, SP.woodDark, 5, f)
    }
    props.with("flat", () => props.sphere(0.2, [1, 1.3, 1], P(sx * (W / 2 + 0.36), ridgeY + 0.3, ZC), SP.brass, 6))
    props.cone(0, 0.08, 0.35, P(sx * (W / 2 + 0.36), ridgeY + 0.55, ZC), SP.iron, 4)
  }
  props.box(W + 0.8, 0.12, 0.22, P(0, ridgeY + 0.12, ZC), SP.iron)
  if (lang === "victorian" || lang === "clockmaker") {
    for (let x = -W / 2; x <= W / 2 + 1e-3; x += 0.42) props.cone(0, 0.1, 0.24, P(x, ridgeY + 0.3, ZC), SP.ironHi, 4)
  }

  // ── Janelas: verga de pedra com fecho, moldura de latão, vidro aceso e caixilho ──
  const win = (cx: number, cy: number, onSide: 0 | -1 | 1, tall = 1) => {
    const h = 1.15 * tall
    if (onSide === 0) {
      const z = Z0
      props.box(1.12, h + 0.14, 0.08, P(cx, cy, z - 0.03), SP.brassDark)
      glow.with("flat", () => glow.box(0.86, h - 0.1, 0.04, P(cx, cy, z - 0.06), SP.windowGlow))
      props.box(0.05, h - 0.1, 0.05, P(cx, cy, z - 0.09), SP.iron)
      props.box(0.86, 0.05, 0.05, P(cx, cy + 0.1, z - 0.09), SP.iron)
      props.box(1.32, 0.08, 0.22, P(cx, cy - h / 2 - 0.1, z - 0.08), SP.stoneLight)
      props.box(1.36, 0.17, 0.14, P(cx, cy + h / 2 + 0.16, z - 0.05), SP.stone)
      props.box(0.22, 0.26, 0.16, P(cx, cy + h / 2 + 0.2, z - 0.07), SP.stoneLight)
    } else {
      const x = onSide * (W / 2)
      const r = onSide * Math.PI / 2
      const L = (dx: number, y: number, dz: number) => place(x + onSide * dz, y, ZC + dx, r, place(hx, 0, hf, 0, f))
      props.box(1.12, h + 0.14, 0.08, L(0, cy, 0.03), SP.brassDark)
      glow.with("flat", () => glow.box(0.86, h - 0.1, 0.04, L(0, cy, 0.06), SP.windowGlow))
      props.box(0.05, h - 0.1, 0.05, L(0, cy, 0.09), SP.iron)
      props.box(0.86, 0.05, 0.05, L(0, cy + 0.1, 0.09), SP.iron)
      props.box(1.32, 0.08, 0.22, L(0, cy - h / 2 - 0.1, 0.08), SP.stoneLight)
      props.box(1.36, 0.17, 0.14, L(0, cy + h / 2 + 0.16, 0.05), SP.stone)
    }
  }
  const tall = lang === "victorian" ? 1.22 : 1
  if (lang === "inventor") {
    win(-1.55, 1.75, 0)
    // Janela de escotilha redonda à direita (assimetria do inventor).
    props.cylinder(1.0, 0.1, F(1.55, 1.85, Z0 - 0.04), SP.brass, 14)
    glow.with("flat", () => glow.cylinder(0.78, 0.04, F(1.55, 1.85, Z0 - 0.1), SP.windowGlow, 14))
    props.ring(0.84, 0.06, F(1.55, 1.85, Z0 - 0.11), SP.iron, 14)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      props.box(0.05, 0.05, 0.05, P(1.55 + Math.cos(a) * 0.45, 1.85 + Math.sin(a) * 0.45, Z0 - 0.1), SP.brass)
    }
  } else {
    win(-1.55, 1.75 + (tall - 1) * 0.3, 0, tall)
    win(1.55, 1.75 + (tall - 1) * 0.3, 0, tall)
  }
  win(0, 1.75, -1)
  win(0, 1.75, 1)

  // ── Porta: madeira com cintas de ferro, escotilha, marquise e degraus ──
  const dz = 0.15
  props.box(1.32, 2.2, 0.1, P(0, 1.2, dz - 0.0), SP.iron)
  props.box(1.0, 1.9, 0.1, P(0, 1.27, dz - 0.04), SP.wood)
  for (const y of [0.6, 1.95]) {
    props.box(0.9, 0.07, 0.03, P(0, y, dz - 0.1), SP.iron)
    for (const x of [-0.36, -0.12, 0.12, 0.36]) props.box(0.04, 0.04, 0.02, P(x, y, dz - 0.12), SP.brass)
  }
  props.cylinder(0.34, 0.05, F(0, 1.55, dz - 0.1), SP.brass, 12)
  glow.with("flat", () => glow.cylinder(0.24, 0.03, F(0, 1.55, dz - 0.12), SP.windowGlow, 12))
  props.with("flat", () => props.sphere(0.09, [1, 1, 1], P(0.34, 1.12, dz - 0.12), SP.brass, 5))
  props.box(door.width, 0.12, door.depth, P(0, 0.06, -0.15), SP.stone)
  props.box(door.width + 0.2, 0.06, door.depth + 0.1, P(0, 0.15, -0.1), SP.stoneLight)
  // Marquise de ardósia sobre mãos-francesas de ferro.
  props.box(1.7, 0.08, 0.85, X(0, 2.62, -0.2, 0, -0.18), SP.slate)
  props.box(1.76, 0.06, 0.06, P(0, 2.55, -0.62), SP.brassDark)
  for (const sx of [-0.7, 0.7]) props.tube([hx + sx, 2.0, hf + Z0], [hx + sx, 2.55, hf - 0.45], 0.035, SP.iron, 5, f)
  // Lanterna ao lado da porta.
  props.box(0.08, 0.08, 0.32, P(0.98, 2.15, Z0 - 0.16), SP.iron)
  postLantern(ctx, hx + 0.98, 1.75, hf + Z0 - 0.3, 0.55, f)

  // ── Chaminé de tijolo com cintas de ferro e pote de cobre ──
  const chimX = lang === "boiler" ? -1.4 : lang === "inventor" ? -2.0 : 1.5
  const chimZ = ZC + 1.0
  props.box(0.68, 2.6, 0.68, P(chimX, ridgeY - 0.6, chimZ), SP.brickDark)
  for (const y of [ridgeY - 0.1, ridgeY + 0.45]) props.box(0.74, 0.07, 0.74, P(chimX, y, chimZ), SP.iron)
  props.box(0.82, 0.12, 0.82, P(chimX, ridgeY + 0.74, chimZ), SP.stoneLight)
  props.cylinder(0.3, 0.42, P(chimX, ridgeY + 0.98, chimZ), SP.copper, 8)
  fx.vents.push(xyzOf(P(chimX, ridgeY + 1.22, chimZ)))

  // ── O que cada linguagem acrescenta ──
  const crossGable = (withFace: "gear" | "clock") => {
    // Empena frontal sobre a porta (cumeeira em Z), com o rosto da casa.
    const gw = 2.2
    const gh = 1.55
    const gz0 = -0.05
    const gz1 = ZC
    props.prism(gz1 - gz0, gw, gh, P(0, eave + 0.06, (gz0 + gz1) / 2, Math.PI / 2), wall)
    for (const s of [-1, 1]) {
      const len = Math.hypot(gw / 2 + 0.25, gh + 0.08)
      props.box(len, 0.12, gz1 - gz0 + 0.3, X(s * (gw / 4 + 0.06), eave + gh / 2 + 0.06, (gz0 + gz1) / 2 - 0.15, 0, 0, -s * Math.atan2(gh + 0.08, gw / 2 + 0.25)), SP.slate)
    }
    props.box(0.16, 0.14, gz1 - gz0 + 0.3, P(0, eave + gh + 0.12, (gz0 + gz1) / 2 - 0.15), SP.iron)
    const cy = eave + 0.62
    if (withFace === "gear") {
      props.gear(0.5, 0.08, 12, F(0, cy, gz0 - 0.05), SP.brass, SP.bronze)
      props.gear(0.26, 0.07, 9, F(0.62, cy - 0.32, gz0 - 0.04), SP.bronze, SP.brassDark)
      fx.gears.push({ m: F(0, cy, gz0 - 0.1), r: 0.5, thick: 0.06, speed: 0.5 })
    } else {
      props.cylinder(1.06, 0.08, F(0, cy, gz0 - 0.04), SP.bronze, 18)
      props.with("flat", () => props.cylinder(0.9, 0.09, F(0, cy, gz0 - 0.05), SP.board, 18))
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        props.box(0.04, 0.1, 0.02, xf(hx + Math.sin(a) * 0.36, cy + Math.cos(a) * 0.36, hf + gz0 - 0.1, 0, f, 0, -a), SP.iron)
      }
      props.box(0.04, 0.32, 0.02, xf(hx + 0.08, cy + 0.12, hf + gz0 - 0.11, 0, f, 0, -0.5), SP.iron)
      props.box(0.05, 0.22, 0.02, xf(hx - 0.09, cy - 0.05, hf + gz0 - 0.11, 0, f, 0, 2.2), SP.iron)
      fx.gears.push({ m: F(-0.78, cy - 0.25, gz0 - 0.02), r: 0.24, thick: 0.05, speed: -0.9 })
      fx.gears.push({ m: F(0.8, cy - 0.3, gz0 - 0.02), r: 0.2, thick: 0.05, speed: 1.1 })
    }
  }

  if (lang === "engineer") {
    crossGable("gear")
    // Mãos-francesas de bronze em X nas laterais.
    for (const sx of [-1, 1]) {
      const x = hx + sx * (W / 2 + 0.03)
      props.tube([x, 1.05, hf + Z0 + 0.3], [x, TOP - 0.2, hf + Z0 + D - 0.3], 0.04, SP.bronze, 5, f)
      props.tube([x, TOP - 0.2, hf + Z0 + 0.3], [x, 1.05, hf + Z0 + D - 0.3], 0.04, SP.bronze, 5, f)
    }
  } else if (lang === "boiler") {
    // Reservatório de cobre deitado sobre a cumeeira, em berço de ferro.
    const ty = ridgeY + 0.6
    props.cylinder(0.95, 2.4, X(0.6, ty, ZC + 0.4, 0, 0, Math.PI / 2), SP.copper, 12)
    for (const x of [-0.4, 0.6, 1.6]) props.cylinder(1.0, 0.07, X(x, ty, ZC + 0.4, 0, 0, Math.PI / 2), SP.brass, 12)
    for (const s of [-1, 1]) props.with("flat", () => props.sphere(0.95, [0.45, 1, 1], P(0.6 + s * 1.2, ty, ZC + 0.4), SP.copperDark, 8))
    for (const x of [-0.2, 1.4]) props.box(0.1, 0.62, 0.9, P(x, ridgeY + 0.1, ZC + 0.4), SP.iron)
    // Cano do reservatório descendo pela frente até os manômetros.
    props.pipe(
      [[hx - 0.6, ty, hf + ZC + 0.4], [hx - 2.0, ty, hf + ZC + 0.4], [hx - 2.0, ty, hf + Z0 - 0.5], [hx - 2.0, 0.9, hf + Z0 - 0.12]],
      0.06,
      SP.brassDark,
      SP.bronze,
      f,
    )
    gauge(ctx, hx - 1.9, 1.55, hf + Z0 - 0.06, f, 1.1)
    gauge(ctx, hx - 2.15, 1.2, hf + Z0 - 0.06, f, 0.8)
    valveWheel(ctx, hx - 1.7, 1.05, hf + Z0 - 0.08, f, 0.9)
    fx.vents.push(xyzOf(P(1.9, ty + 0.5, ZC + 0.4)))
    props.cylinder(0.12, 0.5, P(1.9, ty + 0.3, ZC + 0.4), SP.iron, 6)
  } else if (lang === "victorian") {
    // Água-furtada no meio da água da frente.
    const dy0 = eave + 0.55
    props.box(1.3, 1.0, 1.0, P(0, dy0 + 0.35, ZC - 1.2), wall)
    props.prism(1.6, 1.3, 0.6, P(0, dy0 + 0.85, ZC - 1.2, Math.PI / 2), SP.slateWarm)
    props.box(0.96, 0.82, 0.06, P(0, dy0 + 0.35, ZC - 1.72), SP.brassDark)
    glow.with("flat", () => glow.box(0.72, 0.62, 0.04, P(0, dy0 + 0.35, ZC - 1.76), SP.windowGlow))
    props.box(0.05, 0.62, 0.05, P(0, dy0 + 0.35, ZC - 1.8), SP.iron)
    for (const sx of [-0.85, 0.85]) postLantern(ctx, hx + sx * 1.0, 1.45, hf + Z0 - 0.3, 0.5, f)
  } else if (lang === "inventor") {
    // Torre de exaustão com rotor que gira e para-raios de bobinas.
    const tx = 1.35
    props.cylinder(0.9, 1.3, P(tx, ridgeY + 0.1, ZC + 0.9), SP.steel, 10)
    props.cylinder(1.0, 0.1, P(tx, ridgeY + 0.78, ZC + 0.9), SP.brass, 10)
    fx.gears.push({ m: P(tx, ridgeY + 0.86, ZC + 0.9), r: 0.42, thick: 0.08, speed: 3.2 })
    fx.vents.push(xyzOf(P(tx, ridgeY + 0.95, ZC + 0.9)))
    props.cylinder(0.06, 2.2, P(-1.4, ridgeY + 1.0, ZC), SP.iron, 5)
    for (let i = 0; i < 4; i++) props.ring(0.32 - i * 0.04, 0.05, P(-1.4, ridgeY + 0.9 + i * 0.22, ZC), SP.copper, 10)
    props.with("flat", () => props.sphere(0.2, [1, 1, 1], P(-1.4, ridgeY + 2.15, ZC), SP.brass, 6))
    // Motorzinho de pistões na água de trás.
    props.box(1.1, 0.5, 0.7, X(-0.6, ridgeY - 0.55, ZC + 1.45, 0, 0.7), SP.ironHi)
    for (const x of [-0.95, -0.6, -0.25]) props.cylinder(0.18, 0.5, X(x, ridgeY - 0.2, ZC + 1.3, 0, 0.7), SP.brass, 6)
    // Canos em zigue-zague pela fachada até um manômetro.
    props.pipe([[hx - 2.1, 2.7, hf + Z0 - 0.1], [hx - 2.1, 2.3, hf + Z0 - 0.1], [hx - 0.9, 2.3, hf + Z0 - 0.1], [hx - 0.9, 2.55, hf + Z0 - 0.1]], 0.05, SP.copper, SP.brass, f)
    gauge(ctx, hx - 2.1, 2.05, hf + Z0 - 0.06, f, 0.9)
  } else {
    crossGable("clock")
  }
  return fx
}
