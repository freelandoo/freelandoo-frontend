// features/meu-mundo/gincana/engine/canion-view.ts — Cânion, PEDRAS QUE CAEM (20/11): a pedra hexagonal de cada
// andar, apagada e acesa (peça por peça, skill meu-mundo-cenario-codigo).
//
// FICHA (pedido do Alex com a foto do jogo, 20/11)
// O que é:     a pedra flutuante do Cânion: corpo de arenito, tampo claro de lajotas e seis lâmpadas nos cantos.
//              Pisou: as lâmpadas dos cantos e a borda ACENDEM e o tampo fica na cor forte do andar; pouco antes
//              de cair as lâmpadas piscam.
// Silhueta:    hexágono de 2,6 m com 0,55 m de corpo; as lâmpadas saltam da quina (domos de 0,26 m).
// Paleta:      cada andar uma cor CLARA (céu, lilás, menta, pêssego, rosa, limão — de cima para baixo) que acende
//              forte (azul, violeta, verde, laranja, magenta, amarelo). Corpo terracota escurecendo embaixo.
// 70/20/10:    70 tampo claro, 20 corpo de arenito, 10 lâmpadas/borda.
// Fora:        nada do jogo de referência; só a ideia de "piso que acende quando pisa".
//
// PARTES
// 1. corpo de arenito (6 lados, mais escuro embaixo — sombra de contato) + friso escuro sob o tampo
// 2. tampo: três lajotas (rejunte do centro a cantos alternados), mais claro na beira (quina que pega luz)
// 3. lâmpadas dos cantos: base de latão + domo (apagado: vidro claro; aceso: brilho forte + halo)
// 4. borda: filete fino (apagado: claro; aceso: brilho da cor do andar)

import type { RGB } from "./shapes"
import { SoftGeo, at, mix } from "./shapes"

/** Cor clara (apagada), cor do tampo aceso e cor da luz — por andar, de cima para baixo. */
export const CANION_FLOORS: { idle: RGB; lit: RGB; light: RGB }[] = [
  { idle: [0.7, 0.84, 0.98], lit: [0.22, 0.56, 1], light: [0.55, 0.85, 1] },
  { idle: [0.82, 0.74, 0.96], lit: [0.58, 0.36, 1], light: [0.82, 0.66, 1] },
  { idle: [0.7, 0.92, 0.78], lit: [0.2, 0.86, 0.5], light: [0.6, 1, 0.74] },
  { idle: [0.98, 0.8, 0.64], lit: [1, 0.52, 0.2], light: [1, 0.8, 0.5] },
  { idle: [0.98, 0.76, 0.86], lit: [1, 0.32, 0.64], light: [1, 0.7, 0.86] },
  { idle: [0.97, 0.92, 0.6], lit: [1, 0.82, 0.12], light: [1, 0.95, 0.55] },
]

const SAND: RGB = [0.66, 0.36, 0.22]
const SAND_D: RGB = [0.34, 0.17, 0.11]
const GROUT: RGB = [0.36, 0.3, 0.26]
const BRASS: RGB = [0.62, 0.46, 0.2]
const GLASS: RGB = [0.92, 0.94, 0.96]
const WHITE: RGB = [1, 1, 1]
const HEX = Math.PI / 6

/** Os 6 cantos do hexágono de raio `r` (mesma orientação do cilindro girado π/6). */
function corners(r: number) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = HEX + (k * Math.PI) / 3
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number]
  })
}

/** 1 + 2: corpo e tampo (comum ao apagado e ao aceso; muda só a cor do tampo). */
function body(g: SoftGeo, h: number, top: RGB) {
  const D = h * 2.06
  // 1. corpo: arenito, escuro embaixo (sombra de contato), com friso escuro logo abaixo do tampo
  g.cylinder(D, 0.55, at(0, -0.3, 0, HEX), (_x, y) => mix(SAND_D, SAND, Math.min(1, (y + 0.55) / 0.5)), 6, D * 0.88)
  g.cylinder(D * 1.005, 0.05, at(0, -0.07, 0, HEX), SAND_D, 6)
  // 2. tampo: mais claro na beira; três lajotas com rejunte
  g.cylinder(D * 0.97, 0.08, at(0, -0.005, 0, HEX), (x, _y, z) => (Math.hypot(x, z) > D * 0.38 ? mix(top, WHITE, 0.12) : top), 6)
  for (let q = 0; q < 3; q++) {
    const a = (q / 3) * Math.PI * 2 + HEX
    g.box(D * 0.46, 0.012, 0.05, at(Math.cos(a) * D * 0.235, 0.04, Math.sin(a) * D * 0.235, -a), mix(GROUT, top, 0.25))
  }
  return D
}

/** Filete na beira do tampo: 6 réguas, uma por lado (um cilindro seria um disco cheio por cima do tampo). */
function rim(g: SoftGeo, D: number, w: number, c: RGB) {
  const R = D * 0.475
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 3
    const m = R * Math.cos(Math.PI / 6) - w / 2
    g.box(R, 0.035, w, at(Math.cos(a) * m, 0.045, Math.sin(a) * m, -(a + Math.PI / 2)), c)
  }
}

/** Pedra apagada (material comum): tampo claro do andar, lâmpadas de vidro claro e borda clara. */
export function canionTileIdle(g: SoftGeo, h: number, floor: number) {
  const F = CANION_FLOORS[floor % CANION_FLOORS.length]
  const D = body(g, h, F.idle)
  // 4. borda: filete claro
  rim(g, D, 0.08, mix(F.idle, WHITE, 0.45))
  // 3. lâmpadas apagadas: base de latão + domo de vidro (um pouco da cor do andar)
  for (const [x, z] of corners(D * 0.42)) {
    g.cylinder(0.3, 0.06, at(x, 0.05, z), BRASS, 8)
    g.sphere(0.24, at(x, 0.09, z), mix(GLASS, F.light, 0.25), 8, 1, 0.7, 1)
  }
}

/** Pedra acesa: corpo + tampo na cor forte (material comum) e as luzes (material aceso, `gl`). */
export function canionTileLit(g: SoftGeo, gl: SoftGeo, h: number, floor: number) {
  const F = CANION_FLOORS[floor % CANION_FLOORS.length]
  const D = body(g, h, mix(F.lit, WHITE, 0.12))
  for (const [x, z] of corners(D * 0.42)) {
    g.cylinder(0.3, 0.06, at(x, 0.05, z), BRASS, 8)
    // domo aceso (miolo quase branco) + halo largo e baixo da cor do andar
    gl.sphere(0.26, at(x, 0.1, z), mix(F.light, WHITE, 0.55), 8, 1, 0.75, 1)
    gl.cylinder(0.44, 0.015, at(x, 0.047, z), F.light, 10)
  }
  // borda acesa: filete da cor do andar, mais largo que o apagado
  rim(gl, D, 0.13, mix(F.light, WHITE, 0.2))
}
