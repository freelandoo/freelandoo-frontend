// features/meu-mundo/gincana/engine/backdrop-canion.ts — o fundo do Cânion pelas MINIATURAS (20/11).
//
// FICHA (miniaturas canion/moinhos/gangorras.webp — as 3 fases dividem este fundo)
// O que é:   céu de fim de tarde TOMADO por mesas de arenito flutuando — colunas altas de blocos empilhados como
//            tijolos grandes, tampa de grama com franja caída, acácias de copa chata, cachoeiras —, perto, no meio
//            e longe, em alturas diferentes; piões de pedra com tampa chata pairando junto da prova; mar de nuvens.
// Massas:    mesa-coluna (largura 12–30, altura 18–45) em 3 faixas (|x| 28–55 / 60–110 / 120–200); pião (d 3–8).
// Paleta:    arenito 0,55–0,95 laranja-rosado (junta escura 0,3/0,14/0,1, quina clara 1/0,86/0,66); grama 0,3–0,66
//            verde-limão; água da cachoeira 0,55–1 azul-branca (acesa).
// Fora:      castelos/moinhos da pista (são das fases).
//
// PARTES
// 1. mesa-coluna (`mesaTower`) — fiadas de blocos com juntas, blocos que saltam, grama com franja, acácia, cachoeira.
// 2. pião flutuante (`spinTop`).
// 3. distribuição em 3 faixas + muralha distante.
//
// Andamento: (uma linha por parte fechada)

import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { at, mix, type RGB, type SoftGeo } from "./shapes"
import { rnd } from "./backdrop-base"

const SAND: RGB[] = [
  [0.88, 0.5, 0.32],
  [0.78, 0.4, 0.25],
  [0.94, 0.62, 0.4],
  [0.83, 0.45, 0.3],
]

/** Bloco de arenito: escurece embaixo, quina de cima clara, estrato fino e pintinhas (a pintura recebe o y local). */
function brick(base: RGB, bh: number, seed: number) {
  return (x: number, y: number, z: number): RGB => {
    const t = (y + bh / 2) / bh
    let c = mix(mix(base, [0.2, 0.06, 0.05], 0.45), base, Math.min(1, t * 1.5))
    if (t > 0.9) c = mix(c, [1, 0.86, 0.66], 0.5)
    if (Math.abs(Math.sin(y * 3.1 + seed + x * 0.2)) < 0.07) c = mix(c, [0.36, 0.16, 0.1], 0.5)
    if (Math.sin(x * 2.3 + z * 1.7 + seed) * Math.cos(y * 2.9 - x) > 0.85) c = mix(c, [1, 0.8, 0.6], 0.3)
    return c
  }
}

/**
 * Mesa-coluna da miniatura: `courses` fiadas; cada fiada = miolo + 4–6 blocos grandes nas faces com juntas
 * escuras entre eles (parece tijolo grande) e 1–2 que saltam para fora; a coluna balança um pouco de fiada para
 * fiada (silhueta quebrada). Tampa de grama com franja que cai, 1–2 acácias, e (às vezes) a cachoeira acesa
 * na face que olha a prova. Embaixo, um pião curto que some nas nuvens.
 */
export function mesaTower(lit: SoftGeo, glow: SoftGeo, x: number, yTop: number, z: number, w: number, courses: number, seed: number, fall: boolean, far = false) {
  const bh = 3.4 + rnd(seed, 1) * 1.6
  let y = yTop
  const face = -Math.sign(x) || 1
  for (let k = 0; k < courses; k++) {
    const ww = w * (1 - k * 0.04) * (0.92 + rnd(seed, 2 + k) * 0.16)
    const ox = (rnd(seed, 10 + k) - 0.5) * w * 0.12
    const oz = (rnd(seed, 20 + k) - 0.5) * w * 0.12
    const yaw = (rnd(seed, 30 + k) - 0.5) * 0.25
    const base = SAND[(seed + k) % SAND.length]
    const cy = y - bh / 2
    // miolo escuro (só aparece nas juntas)
    lit.box(ww * 0.96, bh, ww * 0.82, at(x + ox, cy, z + oz, yaw), mix(base, [0.25, 0.1, 0.07], 0.55))
    // blocos das 4 faces, com junta (vão) entre eles
    const nb = far ? 1 : 2 + (k % 2)
    for (const f of [0, 1, 2, 3]) {
      const along = f % 2 === 0 ? ww : ww * 0.82
      const off = f % 2 === 0 ? ww * 0.41 : ww * 0.48
      const bl = along / nb - 0.35
      for (let b = 0; b < nb; b++) {
        const u = -along / 2 + (b + 0.5) * (along / nb) + (k % 2 ? 0.4 : -0.4)
        const sx = f % 2 === 0 ? bl : 1.4
        const sz = f % 2 === 0 ? 1.4 : bl
        const px = f % 2 === 0 ? u : (f === 1 ? 1 : -1) * off
        const pz = f % 2 === 0 ? (f === 0 ? 1 : -1) * off : u
        const c = Math.cos(yaw)
        const s = Math.sin(yaw)
        const hb = bh - 0.3 - rnd(seed, 40 + k * 16 + f * 4 + b) * 0.3
        const pop = rnd(seed, 60 + k * 16 + f * 4 + b) > 0.85 ? 0.8 : 0
        lit.box(sx + (f % 2 ? pop : 0), hb, sz + (f % 2 ? 0 : pop), at(x + ox + px * c + pz * s, cy - 0.1, z + oz - px * s + pz * c, yaw), brick(SAND[(seed + k + b + f) % SAND.length], hb, seed + k * 7 + b))
      }
    }
    y -= bh
  }
  // pião curto embaixo
  const deep = w * 0.7
  lit.cylinder(w * 0.1, deep, at(x, y - deep / 2, z, rnd(seed, 5)), (_x, yy): RGB => mix([0.3, 0.12, 0.1], [0.7, 0.36, 0.24], Math.min(1, (yy + deep / 2) / deep + 0.2)), 7, w * 0.7)
  // tampa de grama: placa + franja que cai pelas bordas (gomos achatados)
  const gw = w * 1.02
  lit.box(gw, 0.8, gw * 0.86, at(x, yTop + 0.3, z, 0), (_x, yy): RGB => (yy > 0.2 ? [0.52, 0.7, 0.26] : [0.32, 0.46, 0.17]))
  const nf = far ? 5 : 9
  for (let k = 0; k < nf; k++) {
    const a = (k / nf) * Math.PI * 2 + seed
    const rx = Math.cos(a) * gw * 0.5
    const rz = Math.sin(a) * gw * 0.43
    lit.sphere((2.4 + rnd(seed, 70 + k) * 1.4) * (far ? 1.6 : 1.2), at(x + rx, yTop - 0.3 - rnd(seed, 80 + k) * 0.6, z + rz, -a), (_x, yy): RGB => (yy > 0 ? [0.44, 0.62, 0.22] : [0.26, 0.4, 0.14]), 4, 0.7, 0.9, 1.3)
  }
  // acácias (1–2): tronco torto, copa chata em dois andares
  for (let t = 0; t < (far ? 1 : 1 + (seed % 2)); t++) {
    const ta = rnd(seed, 90 + t) * Math.PI * 2
    const tx = x + Math.cos(ta) * gw * 0.22
    const tz = z + Math.sin(ta) * gw * 0.2
    const th = 4 + rnd(seed, 92 + t) * 3
    const top = new Vector3(tx + (rnd(seed, 94 + t) - 0.5) * 2, yTop + 0.6 + th, tz)
    lit.tube(new Vector3(tx, yTop + 0.5, tz), top, 0.45, [0.32, 0.2, 0.13], 6)
    const cw = gw * (0.32 + rnd(seed, 96 + t) * 0.15)
    lit.sphere(cw, at(top.x, top.y, top.z), [0.2, 0.36, 0.13], 7, 1, 0.22, 0.9)
    lit.sphere(cw * 0.8, at(top.x + 0.4, top.y + 0.8, top.z - 0.3), [0.44, 0.64, 0.22], 7, 1, 0.2, 0.9)
  }
  if (fall) {
    const fx = x + face * gw * 0.5
    const fh = yTop - y + deep * 0.4
    glow.box(0.8, fh, 3.4, at(fx, yTop - fh / 2, z), (xx, yy, zz): RGB => mix([0.5, 0.82, 0.95], [1, 1, 1], Math.abs(Math.sin(yy * 0.8 + zz * 2.2)) > 0.6 ? 0.75 : 0.15))
    glow.box(1.4, 0.3, 3.8, at(fx - face * 0.4, yTop + 0.5, z), [0.6, 0.9, 1])
    glow.sphere(6, at(fx, yTop - fh, z), [0.95, 0.94, 1], 4, 1, 0.5, 1)
  }
}
