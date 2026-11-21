// features/meu-mundo/gincana/engine/backdrop-muros.ts — as laterais CONTÍNUAS dos fundos (pedido do Alex, 21/11:
// "algo mais sólido no background, como dos lados [da Cidade]: muros, prédios, tudo certinho, sem espaços").
// Floresta (barranco) e Cânion (paredão) estão nos arquivos deles; aqui ficam a fileira de galpões das Comportas
// e o paredão de geleira do Mar de Gelo. Trechos que se tocam, de Z0 até depois da chegada, 1 chamada por malha.

import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { at, mix, type RGB, type SoftGeo } from "./shapes"
import { rnd } from "./backdrop-base"

const BRICK: RGB[] = [
  [0.46, 0.2, 0.13],
  [0.38, 0.17, 0.12],
  [0.52, 0.26, 0.16],
  [0.3, 0.16, 0.13],
]

/** Tijolo de galpão: escurece no pé, faixa de fuligem no alto (y LOCAL da peça). */
function wallPaint(base: RGB, h: number) {
  return (_x: number, yl: number): RGB => {
    const t = (yl + h / 2) / h
    let c = mix(mix(base, [0.08, 0.05, 0.05], 0.5), base, Math.min(1, t * 2.2))
    if (t > 0.88) c = mix(c, [0.1, 0.08, 0.08], 0.5)
    return c
  }
}

/**
 * Fileira de galpões colados (Comportas): cada trecho de 10–16 m é um prédio de tijolo de 14–26 m com cornija de
 * pedra, andares de janelas acesas (caixilho escuro em cruz, peitoril), telhado em dente de serra ou platibanda
 * com caixa de água, chaminé em 1 de 2 e cano de cobre correndo de prédio em prédio. Sem vão entre eles.
 */
export function factoryRow(lit: SoftGeo, glow: SoftGeo, s: number, z0: number, z1: number, face: number) {
  for (let z = z0, i = 0; z < z1; i++) {
    const L = 10 + rnd(i, 1 + s) * 6
    const cz = z + L / 2
    const seed = 7000 + i * 2 + (s > 0 ? 1 : 0)
    const D = 18
    const h = 14 + rnd(seed, 2) * 12
    const fx = face + (rnd(seed, 3) - 0.5) * 2
    const base = BRICK[seed % BRICK.length]
    const cx = s * (fx + D / 2)
    lit.box(D, h + 2, L + 0.1, at(cx, h / 2 - 1, cz), wallPaint(base, h + 2))
    // pilastras nas pontas e cornija
    for (const e of [-1, 1]) lit.box(1.2, h + 2, 1.2, at(s * (fx - 0.3), h / 2 - 1, cz + e * (L / 2 - 0.6)), mix(base, [0.1, 0.06, 0.05], 0.35))
    lit.box(1.6, 0.8, L + 0.4, at(s * (fx - 0.2), h + 0.6, cz), [0.56, 0.5, 0.44])
    // janelas: andares de 5 m
    const floors = Math.floor((h - 3) / 5)
    const nw = 2 + Math.floor(L / 6)
    for (let f = 0; f < floors; f++) {
      const wy = 3.6 + f * 5
      for (let w = 0; w < nw; w++) {
        const wz = cz - L / 2 + (w + 0.5) * (L / nw)
        const on = rnd(seed, 20 + f * 7 + w) > 0.25
        lit.box(0.4, 3, 2.2, at(s * (fx - 0.15), wy, wz), [0.16, 0.13, 0.12])
        if (on) glow.box(0.2, 2.6, 1.8, at(s * (fx - 0.3), wy, wz), (_x, yy): RGB => mix([1, 0.5, 0.18], [1, 0.82, 0.45], yy / 2.6 + 0.5))
        else lit.box(0.2, 2.6, 1.8, at(s * (fx - 0.3), wy, wz), [0.1, 0.12, 0.14])
        lit.box(0.25, 2.6, 0.14, at(s * (fx - 0.42), wy, wz), [0.12, 0.1, 0.09])
        lit.box(0.25, 0.14, 1.8, at(s * (fx - 0.42), wy, wz), [0.12, 0.1, 0.09])
        lit.box(0.6, 0.25, 2.5, at(s * (fx - 0.3), wy - 1.6, wz), [0.5, 0.45, 0.4])
      }
    }
    // telhado: dente de serra (3 águas, com a faixa de vidro acesa) ou platibanda com caixa de água
    if (seed % 2 === 0) {
      for (let k = 0; k < 3; k++) {
        const rz = cz - L / 2 + (k + 0.5) * (L / 3)
        lit.box(D - 1, 0.5, (L / 3) * 1.1, at(cx, h + 2.6, rz, 0, -0.55), [0.18, 0.18, 0.2])
        glow.box(D - 2, 1.2, 0.2, at(cx, h + 2.4, rz + L / 6 - 0.4), [0.9, 0.62, 0.3])
      }
    } else {
      lit.box(D + 0.4, 1.4, L + 0.4, at(cx, h + 1.7, cz), mix(base, [0.1, 0.06, 0.05], 0.2))
      const tx = s * (fx + 6)
      lit.cylinder(4, 3.2, at(tx, h + 4.2, cz), [0.32, 0.22, 0.16], 10)
      for (const e of [-1, 1]) lit.box(0.25, 2.4, 0.25, at(tx + e * 1.4, h + 2.4, cz + e * 1.4), [0.2, 0.18, 0.18])
    }
    // chaminé
    if (seed % 2 === 1 || rnd(seed, 40) > 0.6) {
      const ch = 10 + rnd(seed, 41) * 12
      const kx = s * (fx + 10 + rnd(seed, 42) * 5)
      lit.cylinder(3.2, ch, at(kx, h + ch / 2, cz + (rnd(seed, 43) - 0.5) * L * 0.5), (_x, yy): RGB => (Math.abs(Math.sin(yy * 1.3)) < 0.12 ? [0.16, 0.14, 0.14] : mix(base, [0.1, 0.07, 0.06], Math.max(0, yy / ch))), 10, 2.4)
    }
    // cano de cobre correndo a fachada (de prédio em prédio) com braçadeiras
    lit.tube(new Vector3(s * (fx - 0.8), 1.8, cz - L / 2 - 0.1), new Vector3(s * (fx - 0.8), 1.8, cz + L / 2 + 0.1), 0.42, [0.62, 0.32, 0.18], 8)
    for (const e of [-0.3, 0.3]) lit.box(0.7, 1.1, 0.25, at(s * (fx - 0.6), 1.8, cz + e * L), [0.5, 0.5, 0.52])
    z += L
  }
}

/**
 * Paredão de geleira (Mar de Gelo): trechos de 12–18 m de penhasco de gelo em colunas facetadas COLADAS
 * (prismas de 6 lados que se sobrepõem, alturas 22–48 m), sopé contínuo, tampa de neve, rachaduras acesas em
 * ciano, pingentes na beira e uma agulha de vez em quando.
 */
export function glacierWall(lit: SoftGeo, glow: SoftGeo, s: number, z0: number, z1: number, face: number, topAt: (z: number) => number) {
  const icePaint = (h: number, seed: number) => (x: number, yl: number, z: number): RGB => {
    const t = (yl + h / 2) / h
    let c = mix([0.12, 0.24, 0.44], [0.62, 0.8, 0.98], Math.min(1, t * 1.15))
    if (Math.abs(Math.sin(yl * 0.9 + x * 0.4 + seed)) < 0.08) c = mix(c, [0.9, 0.97, 1], 0.5)
    if (Math.sin(x * 1.7 + z * 1.3 + seed) > 0.8) c = mix(c, [0.3, 0.5, 0.8], 0.4)
    return c
  }
  for (let z = z0, i = 0; z < z1; i++) {
    const L = 12 + rnd(i, 1 + s) * 6
    const cz = z + L / 2
    const seed = 9000 + i * 2 + (s > 0 ? 1 : 0)
    // sopé contínuo (não deixa ver o mar entre as colunas)
    lit.box(24, 10, L + 0.4, at(s * (face + 12), 3, cz), icePaint(10, seed))
    const nCol = 3 + Math.floor(rnd(seed, 2) * 2)
    for (let k = 0; k < nCol; k++) {
      const d = 8 + rnd(seed, 10 + k) * 6
      const h = topAt(cz) + 22 + rnd(seed, 20 + k) * 26
      const px = s * (face + d * 0.4 + rnd(seed, 30 + k) * 8)
      const pz = cz - L / 2 + (k + 0.5) * (L / nCol) + (rnd(seed, 40 + k) - 0.5) * 2
      const yaw = rnd(seed, 50 + k)
      lit.cylinder(d, h, at(px, h / 2 - 2, pz, yaw), icePaint(h, seed + k), 6, d * 0.8)
      // tampa de neve com beira azulada
      lit.cylinder(d * 0.86, 1.2, at(px, h - 1.6, pz, yaw), (xx, _yy, zz): RGB => (Math.hypot(xx, zz) > d * 0.34 ? [0.74, 0.88, 1] : [0.95, 0.98, 1]), 6, d * 0.8)
      // pingentes na beira da tampa (do lado da prova)
      for (let p = 0; p < 3; p++) {
        const a = (s > 0 ? Math.PI : 0) + (p - 1) * 0.5 + yaw
        const ih = 1.5 + rnd(seed, 60 + k * 3 + p) * 3
        lit.cylinder(0.05, ih, at(px + Math.cos(a) * d * 0.4, h - 2.2 - ih / 2, pz + Math.sin(a) * d * 0.4), [0.75, 0.93, 1], 4, 0.6)
      }
      // veio aceso descendo a face (rachadura)
      if ((seed + k) % 2 === 0) {
        const vy = h * (0.3 + rnd(seed, 70 + k) * 0.4)
        glow.box(0.25, h * 0.35, 0.5, at(px - s * d * 0.42, vy, pz + (rnd(seed, 72 + k) - 0.5) * 2, 0, 0, (rnd(seed, 73 + k) - 0.5) * 0.4), [0.45, 0.92, 1])
      }
      // agulha em cima (1 em 4)
      if ((seed + k) % 4 === 0) lit.cylinder(d * 0.4, h * 0.35, at(px, h + h * 0.17 - 1.4, pz, yaw), (_x, yy): RGB => mix([0.55, 0.75, 0.96], [0.95, 0.98, 1], yy / (h * 0.35) + 0.5), 6, 0.1)
    }
    z += L - 0.5
  }
}
