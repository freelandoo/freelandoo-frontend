// features/meu-mundo/gincana/engine/crosta-view.ts — Trilha da Crosta (3ª fase da Forja, 2026-11-20): o desenho
// próprio da prova "achar o caminho escondido num tabuleiro, com malhos balançando por cima", peça por peça
// (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma corrida de "ache o caminho" num party game — só o TIPO de prova e a riqueza
// de detalhe; nada de traçado, personagem, logotipo, cor de marca, interface ou arte do jogo do vídeo)
// O que é:     o mar de lava da Forja de Kragor esfriou em placas quadradas de crosta; só um caminho é basalto
//              firme. Pisada, a placa firme ACENDE (veios de brasa) e fica acesa; a falsa afunda na lava. Malhos
//              de forja com cravos pendurados em pórticos de ferro balançam de lado.
// Silhueta:    tabuleiro baixo de placas com vãos acesos entre elas; os pórticos (duas colunas e a trave com a
//              corrente) cortam o céu a cada 7 m; o malho é um cilindro deitado com cravos.
// Massas:      placa 2,24 × 0,55 · malho r 1,15 × 2,6 (cilindro deitado no sentido da corrida) · pórtico 13 ×
//              9,5 m · patamar 17 × 7.
// Paleta:      basalto (0,09/0,08/0,075) → quina (0,32/0,27/0,24), cinza de cinza (0,2/0,18/0,17), fresta
//              apagada (0,3/0,07/0,03), brasa acesa (1/0,45/0,08 → 1/0,85/0,4), ferro (0,13/0,12/0,12),
//              latão (0,8/0,58/0,24), faixa de perigo laranja/preta.
// 70/20/10:    70 basalto e ferro escuro, 20 brasa laranja (frestas, lava, placas acesas), 10 latão e o amarelo
//              do miolo aceso.
// Material:    pedra vulcânica, metal quente.
// Fora:        o chão listrado colorido, os cilindros infláveis, as placas amarelas, balões, céu claro e qualquer
//              interface do vídeo.
// Inventado:   a crosta em gomos com frestas, os veios que acendem, o malho de forja com cravos e cintas.
//
// PARTES (ordem de construção — §2)
// 1. placa de crosta — grande: laje de basalto com quina clara e corpo que escurece para baixo; médio: 7 gomos
//    poligonais de crosta em alturas e tons diferentes, escória com brasa apagada entre eles; pequeno: furinho de
//    bolha, cinza clara, lasca na quina. 3 moldes. Acesa: contorno de brasa em cada gomo + filete na quina.
//    1ª rodada: gomos em grade 2 × 2 com furinhos pretos = dominó/azulejo → polígonos irregulares; 2ª: pequenos e
//    soltos com quina clara = porcas sextavadas → maiores, encostando, quina discreta.
// 2. malho (o pêndulo) — 3. pórtico do malho — 4. patamar — 5. arredores.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import type { Material } from "@babylonjs/core/Materials/material"
import type { Course } from "../sim/course"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const BASALT: RGB = [0.09, 0.08, 0.075]
const BASALT_L: RGB = [0.32, 0.27, 0.24]
const ASH: RGB = [0.2, 0.18, 0.17]
const CRACK: RGB = [0.3, 0.07, 0.03]
const EMBER: RGB = [1, 0.45, 0.08]
const EMBER_L: RGB = [1, 0.85, 0.4]

/** Ruído barato e fixo (0–1). */
function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

/** Os gomos de um molde: [x, z, raio, lados, giro] — pontos espalhados (distância mínima) dentro da placa. */
function cells(h: number, mold: number): [number, number, number, number, number][] {
  const pts: [number, number][] = []
  for (let k = 0; pts.length < 7 && k < 80; k++) {
    const x = (n01(mold, k, 1) * 2 - 1) * (h - 0.32)
    const z = (n01(mold, k, 2) * 2 - 1) * (h - 0.32)
    if (pts.every(([px, pz]) => Math.hypot(px - x, pz - z) > 0.62)) pts.push([x, z])
  }
  return pts.map(([x, z], k) => {
    let near = Infinity
    for (const [px, pz] of pts) if (px !== x || pz !== z) near = Math.min(near, Math.hypot(px - x, pz - z))
    const edge = Math.min(h - Math.abs(x), h - Math.abs(z)) - 0.04
    const r = Math.max(0.3, Math.min(near * 0.74, edge + 0.08))
    return [x, z, r, 5 + (k % 3), n01(mold, k, 3) * Math.PI] as [number, number, number, number, number]
  })
}

// ── 1. placa de crosta (origem no topo, no meio) ──
function plate(g: SoftGeo, h: number, mold: number) {
  const W = h * 2
  // corpo: escurece para baixo (sombra de contato com a lava) e a quina de cima clara, lascada
  g.box(W, 0.5, W, at(0, -0.3, 0), (_x, y) => (y > 0.2 ? [0.07, 0.04, 0.03] : mix([0.04, 0.035, 0.035], BASALT, (y + 0.25) / 0.45)))
  for (const s of [-1, 1]) {
    g.box(W + 0.02, 0.06, 0.08, at(0, -0.05, s * (h - 0.03)), (x) => (n01(Math.round(x * 5), s, mold) > 0.75 ? ASH : BASALT_L))
    g.box(0.08, 0.06, W + 0.02, at(s * (h - 0.03), -0.05, 0), (_x, _y, z) => (n01(Math.round(z * 5), s + 3, mold) > 0.75 ? ASH : BASALT_L))
  }
  // o chão entre os gomos: escória escura com a brasa apagada no fundo (não denuncia nada)
  g.box(W - 0.12, 0.02, W - 0.12, at(0, -0.04, 0), (x, _y, z) => (n01(Math.round(x * 6), Math.round(z * 6), mold) > 0.6 ? CRACK : [0.12, 0.05, 0.03]))
  // gomos de crosta: polígonos de alturas e tons diferentes, a beira de cada um mais clara (quina que pega luz)
  cells(h - 0.04, mold).forEach(([x, z, r, n, rot], k) => {
    const top = n01(mold, k, 7) * 0.05
    const tone = mix(BASALT, ASH, 0.1 + n01(mold, k, 8) * 0.4)
    g.cylinder(r * 2, 0.12, at(x, top - 0.06, z, rot), (xx, yy, zz) => {
      if (yy < 0.02) return mix(tone, [0.03, 0.03, 0.03], 0.5)
      const d = Math.hypot(xx, zz) / r
      return d > 0.9 ? mix(tone, BASALT_L, 0.32) : mix(tone, [0.05, 0.045, 0.04], (1 - d) * 0.3)
    }, n, r * 1.7)
    // um furinho de bolha e um ponto de cinza clara, pequenos
    const a = n01(mold, k, 9) * Math.PI * 2
    g.cylinder(0.07, 0.02, at(x + Math.cos(a) * r * 0.35, top + 0.005, z + Math.sin(a) * r * 0.35), [0.045, 0.04, 0.04], 5)
    if (k % 2) g.cylinder(0.1, 0.015, at(x - Math.cos(a) * r * 0.3, top + 0.004, z - Math.sin(a) * r * 0.4), mix(ASH, BASALT_L, 0.5), 5)
  })
}

// ── 1b. a placa acesa: cada gomo ganha o contorno de brasa (a luz sai das frestas), o filete na quina e a brasa
// no meio ──
function plateLit(gl: SoftGeo, h: number, mold: number) {
  cells(h - 0.04, mold).forEach(([x, z, r, n, rot], k) => {
    const top = n01(mold, k, 7) * 0.05
    gl.cylinder(r * 2 + 0.16, 0.05, at(x, top - 0.085, z, rot), (xx, _y, zz) => mix(EMBER, EMBER_L, Math.min(1, Math.hypot(xx, zz) / (r + 0.08) - 0.2)), n, r * 1.7 + 0.16)
  })
  // chão entre os gomos aceso por baixo
  gl.box(h * 2 - 0.14, 0.02, h * 2 - 0.14, at(0, -0.022, 0), EMBER)
  for (const s of [-1, 1]) {
    gl.box(h * 2 + 0.04, 0.04, 0.05, at(0, -0.02, s * h), EMBER_L)
    gl.box(0.05, 0.04, h * 2 + 0.04, at(s * h, -0.02, 0), EMBER_L)
  }
}

const MOLDS = 3

/** As placas do tabuleiro: 3 moldes instanciados + a camada acesa; a falsa pisada treme e afunda na lava. */
export class CrostaPlates {
  private readonly bases: Mesh[] = []
  private readonly plates: InstancedMesh[] = []
  private readonly lit: InstancedMesh[] = []

  constructor(scene: Scene, toy: Material, glowMat: Material, private readonly course: Course) {
    const h = course.tiles[0]?.h ?? 1.12
    const plateBase: Mesh[] = []
    const litBase: Mesh[] = []
    for (let m = 0; m < MOLDS; m++) {
      const g = new SoftGeo()
      plate(g, h, m)
      const b = g.build(`crosta-plate-${m}`, scene, toy, false)
      b.isVisible = false
      plateBase.push(b)
      const gl = new SoftGeo()
      plateLit(gl, h, m)
      const lb = gl.build(`crosta-lit-${m}`, scene, glowMat, false)
      lb.isVisible = false
      litBase.push(lb)
    }
    this.bases.push(...plateBase, ...litBase)
    course.tiles.forEach((q, i) => {
      const m = (q.pr * 7 + q.pc * 3 + q.pg) % MOLDS
      // giro de 90° em 90° (o molde não se repete igual ao vizinho)
      const rot = ((q.pr + q.pc * 2) % 4) * (Math.PI / 2)
      const p = plateBase[m].createInstance(`crosta-p-${i}`)
      p.position.set(q.x, q.y, q.z)
      p.rotation.y = rot
      p.isPickable = false
      this.plates.push(p)
      const l = litBase[m].createInstance(`crosta-l-${i}`)
      l.position.set(q.x, q.y, q.z)
      l.rotation.y = rot
      l.isPickable = false
      l.setEnabled(false)
      this.lit.push(l)
    })
  }

  update(tiles: Float64Array, t: number, clock: number) {
    const C = this.course
    for (let i = 0; i < C.tiles.length; i++) {
      const s = tiles[i]
      const q = C.tiles[i]
      const p = this.plates[i]
      this.lit[i].setEnabled(s === -2)
      if (s < 0 || t < s) {
        p.setEnabled(true)
        p.position.set(q.x, q.y, q.z)
        p.rotation.x = 0
        p.rotation.z = 0
        continue
      }
      const age = t - s
      const warn = C.tileTime.warn
      if (age < warn) {
        // treme: a crosta racha
        const j = 0.06 * (age / warn)
        p.setEnabled(true)
        p.position.set(q.x + Math.sin(clock * 61 + i) * j, q.y - age * 0.1, q.z + Math.cos(clock * 53 + i) * j)
      } else if (age < warn + 1.6) {
        // afunda devagar, inclinando, até sumir na lava
        const k = age - warn
        p.setEnabled(true)
        p.position.set(q.x, q.y - 0.05 - k * k * 1.6, q.z)
        p.rotation.x = k * 0.35 * (i % 2 ? 1 : -1)
        p.rotation.z = k * 0.22 * (i % 3 ? -1 : 1)
      } else p.setEnabled(false)
    }
  }

  dispose() {
    for (const p of this.plates) p.dispose()
    for (const l of this.lit) l.dispose()
    for (const b of this.bases) b.dispose()
  }
}

// ── 2. malho (pêndulo): origem no pino; a cabeça em (0, −len, 0), deitada no sentido do balanço (x) — as duas
// faces de bater em brasa, cintas de latão, três anéis de cravos; a haste de ferro quadrada com colares de latão,
// a faixa de perigo perto da cabeça e o soquete aparafusado ──
const IRON: RGB = [0.13, 0.12, 0.12]
const IRON_L: RGB = [0.42, 0.4, 0.38]
const BRASS: RGB = [0.8, 0.58, 0.24]
const HAZ_K: RGB = [0.06, 0.05, 0.05]

export function crostaHammer(g: SoftGeo, gl: SoftGeo, len: number, R: number) {
  const L = R * 2.2
  const r = R * 0.95
  // cabeça: ferro com faixas longas mais escuras (forjado), a quina das faces clara
  g.cylinder(r * 2, L, at(0, -len, 0, 0, 0, Math.PI / 2), (x, y, z) => {
    const a = Math.atan2(z, x)
    const band = Math.sin(a * 6) > 0.6
    if (Math.abs(y) > L / 2 - 0.12) return IRON_L
    return band ? mix(IRON, [0.03, 0.03, 0.03], 0.5) : IRON
  }, 16)
  // faces de bater: disco um pouco maior, e a brasa no meio (o ferro quente)
  for (const s of [-1, 1]) {
    g.cylinder(r * 2.12, 0.14, at(s * (L / 2 + 0.02), -len, 0, 0, 0, Math.PI / 2), mix(IRON, IRON_L, 0.5), 16)
    gl.cylinder(r * 1.5, 0.06, at(s * (L / 2 + 0.1), -len, 0, 0, 0, Math.PI / 2), (_x, _y, z) => mix([1, 0.3, 0.05], [1, 0.8, 0.35], Math.max(0, 1 - Math.abs(z) / r)), 14)
    // cinta de latão perto de cada face
    g.torus(r * 2.06, 0.14, at(s * (L / 2 - 0.32), -len, 0, 0, 0, Math.PI / 2), BRASS, 18)
  }
  // cravos: três anéis de 8, desencontrados; ponta clara
  for (let ring = 0; ring < 3; ring++) {
    const x = (ring - 1) * L * 0.27
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (ring % 2) * (Math.PI / 8)
      const d = r + 0.16
      g.cylinder(0.3, 0.36, at(x, -len + Math.sin(a) * d, Math.cos(a) * d, 0, Math.PI / 2 - a), (_x, y) => (y > 0.08 ? IRON_L : IRON), 6, 0)
    }
  }
  // soquete: bloco aparafusado onde a haste entra
  g.box(0.75, 0.5, 0.75, at(0, -len + r + 0.15, 0), (_x, y) => (y > 0.15 ? IRON_L : IRON))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(0.1, 0.06, 0.1, at(sx * 0.27, -len + r + 0.42, sz * 0.27), BRASS)
  // haste quadrada de ferro, colares de latão, faixa de perigo logo acima do soquete
  const top = -0.3
  const bot = -len + r + 0.4
  g.box(0.3, top - bot, 0.3, at(0, (top + bot) / 2, 0), (x) => (x > 0.1 ? IRON_L : IRON))
  for (let y = bot + 1.6; y < top - 0.4; y += 1.8) g.box(0.42, 0.16, 0.42, at(0, y, 0), BRASS)
  for (let k = 0; k < 4; k++) g.box(0.34, 0.16, 0.34, at(0, bot + 0.15 + k * 0.16, 0), k % 2 ? HAZ_K : EMBER)
  // o pino em cima (eixo do balanço = z)
  g.cylinder(0.5, 0.7, at(0, 0, 0, 0, Math.PI / 2, 0), IRON_L, 10)
  g.box(0.5, 0.5, 0.36, at(0, -0.2, 0), IRON)
}

// ── 3. pórtico do malho: duas colunas de ferro em treliça (4 montantes, travessas em X) sobre sapata de basalto,
// capitel de latão com braseiro aceso, a trave dupla com faixa de perigo e o mancal do pino ──
export function crostaGantry(st: SoftGeo, glow: SoftGeo, x0: number, x1: number, z: number, py: number) {
  const foot = -1.2
  for (const x of [x0, x1]) {
    // sapata de basalto (sai da lava) com a quina clara
    st.box(2.2, 1.6, 2.2, at(x, foot + 0.2, z), (_x, y) => (y > 0.6 ? BASALT_L : mix([0.03, 0.03, 0.03], BASALT, (y + 0.8) / 1.4)))
    const h = py + 0.4 - (foot + 1)
    for (const [dx, dz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) st.box(0.22, h, 0.22, at(x + dx, foot + 1 + h / 2, z + dz), (xx) => (xx > 0.05 ? IRON_L : IRON))
    // travessas em X nas faces da frente e de trás (a treliça)
    const n = Math.max(3, Math.round(h / 1.6))
    for (let k = 0; k < n; k++) {
      const y = foot + 1 + (k + 0.5) * (h / n)
      const tilt = Math.atan2(h / n, 1.1)
      for (const dz of [-0.55, 0.55]) {
        st.box(0.1, Math.hypot(1.1, h / n), 0.08, at(x, y, z + dz, 0, 0, tilt), IRON)
        st.box(0.1, Math.hypot(1.1, h / n), 0.08, at(x, y, z + dz, 0, 0, -tilt), IRON)
      }
      st.box(1.32, 0.12, 1.32, at(x, foot + 1 + k * (h / n), z), mix(IRON, IRON_L, 0.3))
    }
    // capitel de latão e o braseiro aceso em cima
    st.box(1.6, 0.3, 1.6, at(x, py + 0.55, z), BRASS)
    st.cylinder(1.0, 0.45, at(x, py + 0.92, z), IRON, 8, 1.3)
    glow.sphere(0.9, at(x, py + 1.18, z), (_x, y) => mix(EMBER, EMBER_L, Math.max(0, y * 2)), 8, 1, 0.6, 1)
  }
  // trave dupla: duas vigas com a faixa de perigo na frente e o mancal do pino de cada malho
  const len = x1 - x0
  for (const dz of [-0.32, 0.32]) {
    st.box(len, 0.45, 0.22, at((x0 + x1) / 2, py + 0.15, z + dz), (_x, y) => (y > 0.1 ? IRON_L : IRON))
    const n = Math.round(len / 0.9)
    for (let k = 0; k < n; k++) st.box(len / n - 0.02, 0.26, 0.04, at(x0 + (k + 0.5) * (len / n), py + 0.15, z + dz * 1.42), k % 2 ? HAZ_K : EMBER)
  }
  for (let x = x0 + 1.5; x < x1 - 1; x += 1.5) for (const dz of [-0.45, 0.45]) st.box(0.1, 0.1, 0.06, at(x, py + 0.3, z + dz), BRASS)
}
