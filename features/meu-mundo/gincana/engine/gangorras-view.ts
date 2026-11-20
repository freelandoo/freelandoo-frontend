// features/meu-mundo/gincana/engine/gangorras-view.ts — Gangorras do Desfiladeiro (3ª fase do Cânion,
// 2026-11-20): o desenho próprio da prova "tábuas que inclinam com o peso sobre o vazio", peça por peça
// (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma pista de obstáculos num party game — só o TIPO de prova; nada de traçado,
// personagem, logotipo, cor de marca, interface ou arte do jogo do vídeo)
// O que é:     pontes de gangorra de madeira e ferro atravessando o desfiladeiro do Cânion, cada uma num eixo
//              em cima de uma coluna de arenito que sobe do fundo; ao sol da tarde.
// Silhueta:    tábuas compridas inclinadas (ritmo de serrote quando a turma passa), colunas de pedra em
//              camadas que somem no vazio, cavaletes em A no eixo, bandeirolas nos postes.
// Massas:      gangorra 2,5 × 9 m · prato 4,4–6,2 × 4,2 m · balança 10,4 × 12 m · coluna Ø 1,6–2,6 m.
// Paleta:      madeira (0,62/0,36/0,18 → quina 0,86/0,6/0,34 → sombra 0,3/0,16/0,08), ferro (0,14/0,13/0,13 →
//              quina 0,48/0,44/0,4), arenito (0,8/0,46/0,26 em camadas com 0,9/0,68/0,42 e 0,56/0,26/0,16),
//              corda (0,84/0,72/0,48), aviso laranja (1/0,5/0,12) e creme (0,96/0,9/0,78), lampião (1/0,78/0,4).
// 70/20/10:    70 madeira e arenito, 20 ferro escuro e corda, 10 laranja de aviso, turquesa das bandeirolas e luz.
// Material:    madeira, metal quente, pedra.
// Fora:        as tábuas coloridas, os bonecos, o arco e o chão do vídeo; o traçado dele.
// Inventado:   as colunas de arenito, os cavaletes, as cintas de ferro, os lampiões e as bandeirolas.
//
// PARTES (ordem de construção — §2)
// 1. tábua da gangorra (ripas, longarinas, cintas, pontas de aviso, corrimão de corda) — ok na 1ª rodada de fotos
// 2. eixo e cavalete em A + coluna de arenito embaixo
// 3. prato de lado (ripas no comprido, eixo em z, para-choque nas pontas)
// 4. a balança grande (tábua larga com cintas e postes de bandeirola)
// 5. miúdos: lampiões nos capitéis, bandeirolas.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Course, Seesaw } from "../sim/course"
import type { RunWorld } from "../sim/body"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const WOOD: RGB = [0.62, 0.36, 0.18]
const WOOD_L: RGB = [0.86, 0.6, 0.34]
const WOOD_D: RGB = [0.3, 0.16, 0.08]
const WOOD_2: RGB = [0.52, 0.3, 0.16]
const WOOD_3: RGB = [0.7, 0.44, 0.24]
const IRON: RGB = [0.14, 0.13, 0.13]
const IRON_L: RGB = [0.48, 0.44, 0.4]
const ROCK: RGB = [0.8, 0.46, 0.26]
const ROCK_L: RGB = [0.9, 0.68, 0.42]
const ROCK_D: RGB = [0.56, 0.26, 0.16]
const ROPE: RGB = [0.84, 0.72, 0.48]
const WARN: RGB = [1, 0.5, 0.12]
const CREAM: RGB = [0.96, 0.9, 0.78]
const TEAL: RGB = [0.16, 0.62, 0.6]
const LAMP: RGB = [1, 0.78, 0.4]

const n01 = (a: number, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
  return s - Math.floor(s)
}
const TONES = [WOOD, WOOD_2, WOOD_3]

/**
 * 1. A tábua no eixo local: tampo em y = 0, o comprido em `along` (z se ax 0, x se ax 1). `rail` põe o
 * corrimão de corda nos lados compridos.
 */
export function sawPlank(g: SoftGeo, S: Seesaw, rail: boolean, seed: number) {
  const long = S.ax === 0 ? S.hz : S.hx
  const wide = S.ax === 0 ? S.hx : S.hz
  // monta em (u = no comprido, v = no largo); M(u, v, y) vira a matriz no local da peça
  const M = (u: number, y: number, v: number, rot = 0) => (S.ax === 0 ? at(v, y, u, rot) : at(u, y, v, rot + Math.PI / 2))
  // ripas atravessadas: 3 tons, quina de cima clara, as das pontas pintadas de aviso
  const SL = 0.36
  const n = Math.round((long * 2) / SL)
  const step = (long * 2) / n
  for (let i = 0; i < n; i++) {
    const u = -long + (i + 0.5) * step
    const tone = TONES[Math.floor(n01(i, seed) * 3)]
    const end = i < 2 || i >= n - 2
    const lift = (n01(i, seed, 2) - 0.5) * 0.02
    if (end) {
      // ponta de aviso: listras laranja/creme desencontradas entre as duas ripas
      const NS = 6
      const sw = (wide * 2) / NS
      for (let s = 0; s < NS; s++) {
        const c = (s + i) % 2 === 0 ? WARN : CREAM
        g.box(sw - 0.01, 0.13, step - 0.045, M(u, -0.065, -wide + (s + 0.5) * sw), (_x, y) => (y > 0.05 ? mix(c, [1, 1, 1], 0.12) : mix(c, WOOD_D, 0.4)))
      }
      continue
    }
    g.box(wide * 2 - n01(i, seed, 1) * 0.08, 0.13, step - 0.045, M(u, -0.065 + lift, (n01(i, seed, 4) - 0.5) * 0.05), (x, y, _z) => {
      if (end) return Math.abs(x) % 0.9 < 0.45 === (i % 2 === 0) ? WARN : CREAM
      if (y > 0.05) return mix(tone, WOOD_L, 0.32 + n01(i, Math.round(x * 3), seed) * 0.18)
      return mix(tone, WOOD_D, 0.35)
    })
  }
  // longarinas embaixo (sombra de contato: escuras em cima, junto das ripas)
  for (const f of [-1, 1]) g.box(0.24, 0.32, long * 2 - 0.1, M(0, -0.29, f * (wide - 0.2), 0), (_x, y) => (y > 0.1 ? WOOD_D : mix(WOOD_2, WOOD_D, 0.25)))
  g.box(0.2, 0.26, long * 2 - 0.3, M(0, -0.26, 0), WOOD_D)
  // cintas de ferro com cravos: nas pontas, a um terço e no eixo
  for (const u of [-long + 0.55, -long * 0.45, 0, long * 0.45, long - 0.55]) {
    g.box(wide * 2 + 0.06, 0.035, 0.13, M(u, 0.012, 0), (_x, y) => (y > 0 ? IRON_L : IRON))
    for (let k = -2; k <= 2; k++) g.sphere(0.06, M(u, 0.03, (k / 2.2) * wide), IRON_L, 5)
  }
  // eixo (mancal embaixo, no meio)
  g.box(wide * 2 + 0.1, 0.18, 0.5, M(0, -0.52, 0), IRON)
  if (!rail) {
    // para-choque baixo nas duas pontas do comprido
    for (const f of [-1, 1]) g.box(wide * 2, 0.16, 0.14, M(f * (long - 0.07), 0.08, 0), (_x, y) => (y > 0.04 ? WOOD_L : WOOD_D))
    return
  }
  // corrimão: estacas nos lados, corda dupla entre elas (caída no meio do vão)
  const posts = Math.max(3, Math.round(long / 1.5) + 1)
  for (const f of [-1, 1]) {
    const v = f * (wide + 0.02)
    const us: number[] = []
    for (let k = 0; k < posts; k++) us.push(-long + 0.3 + ((long * 2 - 0.6) * k) / (posts - 1))
    for (const u of us) {
      g.box(0.12, 0.62, 0.12, M(u, 0.26, v), (_x, y) => (y > 0.26 ? WOOD_L : y < -0.2 ? WOOD_D : WOOD))
      g.box(0.16, 0.06, 0.16, M(u, 0.58, v), IRON)
    }
    for (let k = 0; k + 1 < us.length; k++) {
      for (const h of [0.52, 0.3]) {
        const a = S.ax === 0 ? new Vector3(v, h, us[k]) : new Vector3(us[k], h, v)
        const b = S.ax === 0 ? new Vector3(v, h, us[k + 1]) : new Vector3(us[k + 1], h, v)
        const mid = a.add(b).scale(0.5)
        mid.y -= 0.08
        g.tube(a, mid, 0.025, ROPE, 5)
        g.tube(mid, b, 0.025, ROPE, 5)
      }
    }
  }
}

/** 2. Coluna de arenito em camadas do fundo do desfiladeiro até o capitel (y do topo). */
function column(g: SoftGeo, x: number, z: number, top: number, d: number, seed: number) {
  const H = 15
  const bands = 7
  for (let i = 0; i < bands; i++) {
    const y1 = top - (i * H) / bands
    const h = H / bands + 0.05
    const w = d * (1 + i * 0.07) * (0.92 + n01(i, seed) * 0.16)
    const tone = i % 3 === 0 ? ROCK_L : i % 3 === 1 ? ROCK : ROCK_D
    g.cylinder(w, h, at(x + (n01(i, seed, 1) - 0.5) * 0.25, y1 - h / 2, z + (n01(i, seed, 2) - 0.5) * 0.25, n01(i, seed, 3) * 3), (_x, y) => (y > h / 2 - 0.12 ? mix(tone, ROCK_L, 0.5) : mix(tone, ROCK_D, Math.max(0, -y / h) * 0.6)), 7, w * 1.02)
  }
  // capitel: laje de pedra mais larga com quina clara
  g.box(d * 1.25, 0.32, d * 1.25, at(x, top + 0.16, z, 0.3), (_x, y) => (y > 0.1 ? ROCK_L : ROCK))
}

/** 2b. Cavalete em A dos dois lados do eixo, do capitel até o mancal (fora da largura da tábua). */
function trestle(g: SoftGeo, S: Seesaw, base: number) {
  const wide = S.ax === 0 ? S.hx : S.hz
  const axleY = S.y - 0.52
  for (const f of [-1, 1]) {
    const off = f * (wide + 0.3)
    const P = (v: number, y: number, u: number) => (S.ax === 0 ? new Vector3(S.x + v, y, S.z + u) : new Vector3(S.x + u, y, S.z + v))
    g.tube(P(off, base, -0.9), P(off, axleY, 0), 0.1, WOOD, 6)
    g.tube(P(off, base, 0.9), P(off, axleY, 0), 0.1, WOOD, 6)
    g.tube(P(off, base + 0.45, -0.62), P(off, base + 0.45, 0.62), 0.06, WOOD_D, 5)
    // mancal de ferro no alto do cavalete
    const m = P(off, axleY, 0)
    g.box(0.3, 0.34, 0.42, S.ax === 0 ? at(m.x, m.y, m.z) : at(m.x, m.y, m.z, Math.PI / 2), (_x, y) => (y > 0.1 ? IRON_L : IRON))
  }
  // o eixo atravessando
  const L = wide * 2 + 0.9
  g.cylinder(0.2, L, S.ax === 0 ? at(S.x, axleY, S.z, 0, 0, Math.PI / 2) : at(S.x, axleY, S.z, 0, Math.PI / 2), IRON_L, 8)
}

/** 5. Lampião num poste curto (vidro aceso no `glow`). */
function lantern(g: SoftGeo, glow: SoftGeo, x: number, y: number, z: number) {
  g.box(0.12, 1.5, 0.12, at(x, y + 0.75, z), WOOD_D)
  g.box(0.42, 0.06, 0.42, at(x, y + 1.52, z), IRON)
  g.box(0.36, 0.08, 0.36, at(x, y + 1.98, z), IRON)
  g.box(0.08, 0.5, 0.08, at(x, y + 1.76, z), IRON)
  glow.box(0.3, 0.38, 0.3, at(x, y + 1.76, z), (_x, yy) => mix(LAMP, [1, 0.95, 0.75], Math.max(0, yy + 0.1)))
}

/** 5b. Bandeirola: mastro e um pano triangular turquesa/laranja. */
function pennant(g: SoftGeo, x: number, y: number, z: number, k: number) {
  g.box(0.08, 2.4, 0.08, at(x, y + 1.2, z), WOOD_D)
  const c = k % 2 ? TEAL : WARN
  for (let i = 0; i < 4; i++) g.box(0.03, 0.42 - i * 0.1, 0.24, at(x, y + 2.15, z + 0.14 + i * 0.22), c)
}

export class GangorrasView {
  private readonly meshes: Mesh[] = []
  private readonly nodes: { node: TransformNode; S: Seesaw; i: number }[] = []
  constructor(scene: Scene, toy: Material, glowMat: Material, private readonly course: Course) {
    const st = new SoftGeo()
    const glow = new SoftGeo()
    course.saws.forEach((S, i) => {
      const big = S.hx > 4
      const base = S.y - 1.05
      column(st, S.x, S.z, base - 0.32, big ? 2.6 : S.ax === 1 ? 2 : 1.6, i)
      trestle(st, S, base)
      if (big) {
        for (const f of [-1, 1]) {
          lantern(st, glow, S.x + f * (S.hx + 0.9), base, S.z)
          pennant(st, S.x + f * (S.hx + 0.9), base, S.z - 1.2, i + (f > 0 ? 1 : 0))
        }
      } else if (i % 3 === 1 || S.ax === 1) lantern(st, glow, S.x + (S.ax === 0 ? S.hx + 0.75 : 0), base, S.z + (S.ax === 1 ? S.hz + 0.6 : 0))
    })
    this.meshes.push(st.build("gangorras-static", scene, toy, true))
    this.meshes.push(glow.build("gangorras-static-glow", scene, glowMat, true))
    course.saws.forEach((S, i) => {
      const node = new TransformNode(`gangorra-${i}`, scene)
      node.position.set(S.x, S.y, S.z)
      const g = new SoftGeo()
      sawPlank(g, S, S.ax === 0, i)
      const m = g.build(`gangorra-m-${i}`, scene, toy, false)
      m.parent = node
      this.meshes.push(m)
      this.nodes.push({ node, S, i })
    })
  }
  /** O ângulo vem do mundo (peso de quem está em cima). */
  update(world: RunWorld) {
    for (const p of this.nodes) {
      const a = world.saw[p.i * 2] ?? 0
      if (p.S.ax === 0) p.node.rotation.x = a
      else p.node.rotation.z = -a
    }
  }
  dispose() {
    for (const p of this.nodes) p.node.dispose()
    for (const m of this.meshes) m.dispose()
  }
}
