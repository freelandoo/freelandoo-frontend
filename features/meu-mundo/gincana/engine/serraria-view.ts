// features/meu-mundo/gincana/engine/serraria-view.ts — Serraria da Lua (3ª fase da Floresta, 2026-11-20): o
// desenho próprio da prova "pista de troncos e machados" (toras atravessadas que rolam contra você com cravos,
// machados de lenhador em pêndulo, tábuas que balançam), peça por peça (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma pista de obstáculos num party game — só o TIPO de prova e a riqueza de
// detalhe; nada de traçado, personagem, logotipo, cor de marca, interface ou arte do jogo do vídeo)
// O que é:     a serraria dos lenhadores da Floresta da Lua, de noite: pátio de toras deitadas que rolam com
//              cravos de ferro, a ponte estreita com os machados pendurados num pórtico de troncos, as tábuas
//              presas num mancal que balançam de lado, e o galpão da serraria com a roda d'água e a serra.
// Silhueta:    toras grossas atravessadas (riscam a pista de lado), cravos saindo em fileira, o pórtico alto
//              com os machados em leque, as tábuas tortas, o galpão de telhado íngreme e a roda no fundo.
// Massas:      tora r 1,15 × 11–15 m (grande r 1,3 × 15,6) · cravo 0,55 · machado 6,2 m de cabo, lâmina
//              dupla 1,6 m · tábua 4,8 × 5,8 m · ponte 3,4 m.
// Paleta:      casca (0,26/0,16/0,1 → sulco 0,12/0,07/0,05 → quina 0,46/0,32/0,2), cerne claro (0,86/0,66/0,4)
//              com anéis (0,62/0,42/0,24), ferro (0,13/0,13/0,15 → quina 0,46/0,46/0,5), corda (0,62/0,5/0,3),
//              musgo (0,22/0,42/0,2), luz da lua (0,62/0,86/1), lampião (1/0,7/0,32), aviso vermelho (0,9/0,22/0,16).
// 70/20/10:    70 madeira (casca e tábua), 20 ferro e musgo, 10 lampião, luz da lua e o vermelho do aviso.
// Material:    madeira (casca, tábua serrada), ferro batido, corda, musgo.
// Fora:        o chão roxo e rosa, os bonecos, os castelos, balões e bandeirinhas do vídeo; o traçado dele.
// Inventado:   o galpão e a roda d'água, as cintas de ferro, os mancais das tábuas, os lampiões.
//
// PARTES (ordem de construção — §2)
// 1. tora com cravos — grande: tronco deitado; médio: cintas de ferro, pontas serradas com anéis, musgo,
//    galhos cortados; pequeno: cravos com base de chapa, rebites, lascas claras, a seta de giro.
// 2. machado + pórtico — 3. tábua que balança + mancal — 4. chão de tábuas do pátio e da ponte
// 5. galpão da serraria (marco) — 6. miúdos: pilhas de toras, lampiões, tocos.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { DECK, logRowAngle, logSpikeCount, logSpikeX, plankAngle, SPIKE_OUT, type Course, type Log, type Pad, type Plank } from "../sim/course"
import type { RGB } from "./shapes"
import { SoftGeo, at, mix } from "./shapes"

const BARK: RGB = [0.4, 0.26, 0.16]
const BARK_D: RGB = [0.16, 0.1, 0.07]
const BARK_L: RGB = [0.62, 0.46, 0.3]
const HEART: RGB = [0.86, 0.66, 0.4]
const RING: RGB = [0.62, 0.42, 0.24]
const IRON: RGB = [0.13, 0.13, 0.15]
const IRON_L: RGB = [0.46, 0.46, 0.5]
const MOSS: RGB = [0.22, 0.42, 0.2]
const MOSS_L: RGB = [0.36, 0.56, 0.26]
const WARN: RGB = [0.9, 0.22, 0.16]
const SPIKE_TIP: RGB = [0.78, 0.78, 0.82]
const ROPE: RGB = [0.66, 0.54, 0.34]
const ROPE_D: RGB = [0.46, 0.36, 0.22]
const HANDLE: RGB = [0.74, 0.56, 0.34]
const HANDLE_D: RGB = [0.52, 0.36, 0.2]
const LEATHER: RGB = [0.2, 0.12, 0.08]
const PLANK: RGB = [0.62, 0.44, 0.26]
const PLANK_D: RGB = [0.36, 0.23, 0.13]
const PLANK_L: RGB = [0.82, 0.64, 0.42]
const STONE: RGB = [0.34, 0.34, 0.38]
const LAMP: RGB = [1, 0.7, 0.32]
const BONE: RGB = [0.92, 0.88, 0.76]
const SAWDUST: RGB = [0.9, 0.78, 0.56]
const ROOF: RGB = [0.5, 0.36, 0.28]
const ROOF_D: RGB = [0.26, 0.18, 0.15]
const AXE: RGB = [0.42, 0.43, 0.48]
const AXE_D: RGB = [0.28, 0.28, 0.32]

/** Ruído barato e fixo (0–1). */
function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

/** Casca: sulcos compridos ao longo do eixo x (escuros), placas no meio, quina clara em poucas. */
function barkPaint(seed: number) {
  return (x: number, y: number, z: number): RGB => {
    const a = Math.atan2(z, y)
    const groove = Math.sin(a * 11 + Math.sin(x * 0.7 + seed) * 0.9)
    const plate = n01(Math.round(a * 5), Math.round(x * 0.8), seed)
    if (groove > 0.72) return BARK_D
    if (groove < -0.8 && plate > 0.5) return BARK_L
    return mix(BARK, BARK_L, plate * 0.35)
  }
}

// ── 1. tora com cravos: eixo local = x, o nó gira em x (rotation.x = −w·t: o topo anda para −z) ──
// v2: casca mais clara (a noite apaga), cintas de ferro com rebites, musgo só num lado (mostra o giro), tocos
// de galho cortado, lasca clara onde o machado pegou, cravos de ferro com a ponta gasta e base de chapa.
export function serrariaLog(g: SoftGeo, gl: SoftGeo, L: Log, seed: number) {
  const R = L.R
  const len = L.hx * 2
  const ALONG = Math.PI / 2
  // tronco em gomos de ~1,1 m (cada um com raio e giro próprios: a casca ganha vértice ao longo e o contorno
  // fica levemente irregular), com uma junta escura fina entre eles
  const nSeg = Math.max(4, Math.round((len - 0.3) / 1.1))
  const sl = (len - 0.3) / nSeg
  for (let k = 0; k < nSeg; k++) {
    const x = -(len - 0.3) / 2 + (k + 0.5) * sl
    const rr = R * (0.975 + n01(seed, k, 3) * 0.05)
    g.cylinder(rr * 2, sl + 0.02, at(x, 0, 0, 0, n01(k, seed) * 3, ALONG), barkPaint(seed + k * 3), 30)
  }
  // pontas serradas: casca escura em volta, cerne claro com anéis e a rachadura do meio
  for (const e of [-1, 1]) {
    const ex = e * (len / 2 - 0.15)
    g.cylinder(R * 2 + 0.06, 0.32, at(ex, 0, 0, 0, 0, ALONG), BARK_D, 30)
    for (let k = 0; k < 6; k++) {
      const rr = R - 0.06 - k * (R / 6.4)
      g.cylinder(rr * 2, 0.02, at(ex + e * (0.162 + k * 0.004), 0, 0, 0, 0, ALONG), k === 0 ? mix(RING, BARK, 0.4) : k % 2 ? RING : HEART, 24)
    }
    g.box(0.03, R * 1.1, 0.06, at(ex + e * 0.19, R * 0.2, 0, 0, 0.3), BARK_D)
  }
  // cintas de ferro (perto das pontas e no meio), com quina clara e rebites
  const bands = [-len / 2 + 0.9, len / 2 - 0.9]
  if (len > 12) bands.push(0)
  for (const bx of bands) {
    g.cylinder(R * 2 + 0.1, 0.34, at(bx, 0, 0, 0, 0, ALONG), IRON, 30)
    g.cylinder(R * 2 + 0.14, 0.06, at(bx + 0.15, 0, 0, 0, 0, ALONG), IRON_L, 30)
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2
      g.sphere(0.1, at(bx, Math.cos(a) * (R + 0.06), Math.sin(a) * (R + 0.06)), IRON_L, 4)
    }
  }
  // musgo em ilhas, só no lado que estava para cima no tempo 0 (gira junto: mostra o giro de longe)
  for (let k = 0; k < 9; k++) {
    const x = -len / 2 + 1.4 + n01(seed, k) * (len - 2.8)
    if (bands.some((bx) => Math.abs(bx - x) < 0.5)) continue
    const a = 2.4 + (n01(k, seed) - 0.5) * 0.9
    g.sphere(0.7 + n01(seed, k, 2) * 0.5, at(x, Math.cos(a) * (R - 0.05), Math.sin(a) * (R - 0.05), 0, a), k % 2 ? MOSS : MOSS_L, 5, 1.6, 0.3, 1.1)
  }
  // tocos de galho cortado (corte claro na ponta) e lascas claras do machado
  for (let k = 0; k < 3; k++) {
    const x = -len / 2 + 2 + n01(seed, k, 5) * (len - 4)
    const a = Math.PI * (0.5 + k * 0.7) + n01(k, seed, 6)
    g.cylinder(0.34, 0.5, at(x, Math.cos(a) * (R + 0.18), Math.sin(a) * (R + 0.18), 0, a), BARK, 7, 0.26)
    g.cylinder(0.24, 0.02, at(x, Math.cos(a) * (R + 0.44), Math.sin(a) * (R + 0.44), 0, a), HEART, 7)
  }
  for (let k = 0; k < 4; k++) {
    const x = -len / 2 + 1.6 + n01(seed, k, 8) * (len - 3.2)
    const a = Math.PI * 1.3 + k * 1.4
    g.box(0.5, 0.04, 0.22, at(x, Math.cos(a) * (R + 0.005), Math.sin(a) * (R + 0.005), 0.4, a), HEART)
  }
  // cravos: as fileiras do sim (mesmo ângulo e mesmo x) — chapa de base com 4 rebites, haste escura, ponta gasta
  for (let k = 0; k < L.rows; k++) {
    const a = logRowAngle(L, k, 0)
    const n = logSpikeCount(L, k)
    const yb = Math.cos(a)
    const zb = Math.sin(a)
    for (let j = 0; j < n; j++) {
      const x = logSpikeX(L, k, j) - L.x
      g.box(0.62, 0.07, 0.62, at(x, yb * (R + 0.02), zb * (R + 0.02), 0, a), IRON)
      for (const [dx, dz] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
        g.sphere(0.08, at(x + dx, yb * (R + 0.06) - zb * dz, zb * (R + 0.06) + yb * dz), IRON_L, 3)
      }
      g.cylinder(0.5, SPIKE_OUT * 0.72, at(x, yb * (R + SPIKE_OUT * 0.36), zb * (R + SPIKE_OUT * 0.36), 0, a), IRON, 8, 0.26)
      g.cylinder(0.26, SPIKE_OUT * 0.42, at(x, yb * (R + SPIKE_OUT * 0.9), zb * (R + SPIKE_OUT * 0.9), 0, a), SPIKE_TIP, 8, 0)
      // anel de aviso aceso no pé do cravo (vê-se de longe, de noite)
      gl.cylinder(0.56, 0.05, at(x, yb * (R + 0.1), zb * (R + 0.1), 0, a), WARN, 8)
    }
  }
  // setas de giro (para onde o topo anda) pintadas em vermelho de aviso nas duas pontas, em 4 lados
  for (const ex of [-len / 2 + 0.45, len / 2 - 0.45]) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.6
      gl.box(0.16, 0.05, 0.7, at(ex, Math.cos(a) * (R + 0.012), Math.sin(a) * (R + 0.012), 0.5 * Math.sign(L.w), a), WARN)
    }
  }
}

// ── 2. machado de lenhador (pêndulo): pivô na origem, cabeça em −len ──
// Lâmina DUPLA (balança para os dois lados), plano xy, gume para ±x; o gume claro fica no raio do que machuca.
export function serrariaAxe(g: SoftGeo, len: number, R: number) {
  // mancal no pivô: cubo de ferro com a corda enrolada
  g.cylinder(0.7, 0.6, at(0, 0, 0, 0, Math.PI / 2), IRON, 10)
  for (let k = 0; k < 5; k++) g.torus(0.42, 0.09, at(0, -0.4 - k * 0.12, 0), k % 2 ? ROPE : ROPE_D, 10)
  // cabo de madeira clara, mais grosso embaixo, com o veio e três empunhaduras de couro
  const hl = len - 0.5
  g.cylinder(0.26, hl, at(0, -0.5 - hl / 2, 0), (_x, y) => mix(HANDLE, HANDLE_D, 0.5 + Math.sin(y * 3.1) * 0.3), 8, 0.2)
  for (const y of [-1.4, -len * 0.55, -len + 1.1]) {
    for (let k = 0; k < 3; k++) g.torus(0.3, 0.06, at(0, y - k * 0.1, 0), LEATHER, 8)
  }
  // a cabeça: olho de ferro com a cunha em cima, as duas lâminas que abrem em leque e o gume claro
  const hy = -len
  g.box(0.62, 0.9, 0.5, at(0, hy, 0), AXE_D)
  g.box(0.2, 0.24, 0.54, at(0, hy + 0.5, 0), IRON_L)
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const h = 0.8 + i * 0.24
      const th = 0.32 - i * 0.05
      g.box(0.24, h, th, at(s * (0.42 + i * 0.2), hy, 0), i % 2 ? AXE_D : AXE)
    }
    // gume: faixa de aço polido, curva (três pedaços que abrem)
    for (let i = -1; i <= 1; i++) g.box(0.12, 0.6, 0.1, at(s * (1.18 - Math.abs(i) * 0.06), hy + i * 0.5, 0, 0, 0, s * i * 0.35), SPIKE_TIP)
    // a marca do lenhador (losango vermelho) nas duas faces
    for (const f of [-1, 1]) g.box(0.24, 0.24, 0.02, at(s * 0.62, hy, f * 0.2, 0, 0, Math.PI / 4), WARN)
  }
}

// ── 2b. pórtico dos machados: dois pilares de viga serrada (pé de pedra, mão-francesa, cinta de ferro), a viga
// dupla de cima com o mancal de cada machado, rolos de corda, o lampião pendurado e a placa listrada de aviso ──
function beamPaint(seed: number) {
  return (x: number, y: number, z: number): RGB => {
    const grain = Math.sin((x + z) * 0.4 + y * 2.3 + seed) * 0.5 + 0.5
    return mix(PLANK_D, PLANK, 0.35 + grain * 0.4 + n01(Math.round(y * 2), seed) * 0.15)
  }
}
export function serrariaGantry(st: SoftGeo, glow: SoftGeo, x0: number, x1: number, z: number, py: number) {
  const top = py + 0.5
  for (const x of [x0, x1]) {
    const inn = Math.sign((x0 + x1) / 2 - x)
    // pé de pedra afundado na água, com musgo
    st.box(1.6, 1.4, 1.6, at(x, 0.3, z, 0.2), (_x, y) => (y > 0.5 ? MOSS : STONE))
    // o pilar: viga de 0,7 m com quina clara e duas cintas de ferro
    st.box(0.72, top - 1, 0.72, at(x, (top + 1) / 2, z), beamPaint(Math.round(x * 3 + z)))
    for (const e of [-0.37, 0.37]) st.box(0.06, top - 1, 0.06, at(x + e, (top + 1) / 2, z + 0.37), PLANK_L)
    for (const y of [3.4, top - 1.6]) st.box(0.8, 0.18, 0.8, at(x, y, z), IRON)
    // mãos-francesas para dentro e para os lados (a viga não balança com o tranco)
    st.box(0.32, 2.6, 0.32, at(x + inn * 0.8, top - 1.3, z, 0, 0, -inn * 0.7), beamPaint(7))
    for (const dz of [-1, 1]) st.box(0.3, 3.2, 0.3, at(x, 2.4, z + dz * 0.9, 0, -dz * 0.45), beamPaint(9))
    // rolo de corda pendurado no pilar e o lampião aceso no alto, do lado de fora
    for (let k = 0; k < 4; k++) st.torus(0.7, 0.1, at(x - inn * 0.42, top - 3 - k * 0.07, z, 0, 0, Math.PI / 2), k % 2 ? ROPE : ROPE_D, 10)
    st.box(0.9, 0.1, 0.1, at(x - inn * 0.75, top - 0.6, z), IRON)
    st.box(0.5, 0.08, 0.5, at(x - inn * 1.15, top - 1.0, z), IRON)
    for (const c of [-0.2, 0.2]) for (const e of [-0.2, 0.2]) st.box(0.05, 0.6, 0.05, at(x - inn * 1.15 + c, top - 1.35, z + e), IRON)
    glow.sphere(0.4, at(x - inn * 1.15, top - 1.35, z), LAMP, 7)
    st.box(0.56, 0.08, 0.56, at(x - inn * 1.15, top - 1.68, z), IRON)
  }
  // viga dupla de cima, as pontas serradas claras
  for (const dz of [-0.36, 0.36]) {
    st.box(x1 - x0 + 1.4, 0.62, 0.42, at((x0 + x1) / 2, top, z + dz), beamPaint(Math.round(z)))
    for (const x of [x0 - 0.7, x1 + 0.7]) st.box(0.02, 0.6, 0.4, at(x, top, z + dz), HEART)
  }
  // placa listrada de aviso no meio da viga (vermelho e osso), com dois parafusos
  const W = 2.6
  for (let k = 0; k < 6; k++) {
    st.box(W / 6, 0.5, 0.06, at((x0 + x1) / 2 - W / 2 + (k + 0.5) * (W / 6), top + 0.62, z - 0.6, 0, 0, 0), k % 2 ? BONE : WARN)
  }
  st.box(W + 0.14, 0.62, 0.04, at((x0 + x1) / 2, top + 0.62, z - 0.56), PLANK_D)
}

// ── 3. tábua que balança: tampo em y = 0 local, o nó gira em z (rotation.z = ângulo) ──
// Tábuas atravessadas (pregadas em duas travessas), cada uma num tom e um tiquinho torta, pregos, duas
// cintas de ferro ao longo, o eixo de tronco por baixo, e a borda de cada lado pintada de aviso.
export function serrariaPlank(g: SoftGeo, P: Plank, seed: number) {
  const W = P.hx * 2
  const n = Math.max(5, Math.round((P.hz * 2) / 0.62))
  const bw = (P.hz * 2) / n
  for (let k = 0; k < n; k++) {
    const z = -P.hz + (k + 0.5) * bw
    const tone = n01(seed, k)
    g.box(W - n01(k, seed) * 0.3, 0.28, bw - 0.07, at((n01(seed, k, 2) - 0.5) * 0.15, -0.14 + (tone - 0.5) * 0.03, z, (n01(k, seed, 3) - 0.5) * 0.03), beamPaint(seed + k))
    // pregos (2 por travessa) e uma lasca clara de vez em quando
    for (const x of [-P.hx * 0.62, P.hx * 0.62]) for (const dz of [-bw * 0.22, bw * 0.22]) g.box(0.07, 0.03, 0.07, at(x, 0.005, z + dz), IRON_L)
    if (tone > 0.7) g.box(0.6, 0.02, 0.1, at((tone - 0.85) * W, 0.003, z + bw * 0.3, 0.2), PLANK_L)
  }
  // travessas e cintas de ferro ao longo (embaixo e por cima, perto das pontas)
  for (const x of [-P.hx * 0.62, P.hx * 0.62]) {
    g.box(0.5, 0.36, P.hz * 2 + 0.2, at(x, -0.46, 0), PLANK_D)
    g.box(0.24, 0.035, P.hz * 2 - 0.1, at(x, 0.012, 0), IRON)
  }
  // eixo de tronco por baixo do meio, com as pontas presas em ferro
  g.cylinder(0.7, P.hz * 2 + 0.6, at(0, -0.5, 0, 0, Math.PI / 2), BARK, 10)
  for (const e of [-1, 1]) g.cylinder(0.86, 0.2, at(0, -0.5, e * (P.hz + 0.2), 0, Math.PI / 2), IRON, 10)
  // borda de aviso dos dois lados (listras vermelho e osso; na malha da madeira: uma chamada por tábua)
  for (const s of [-1, 1]) {
    for (let k = 0; k < n; k++) g.box(0.16, 0.04, bw * 0.9, at(s * (P.hx - 0.16), 0.02, -P.hz + (k + 0.5) * bw), k % 2 ? BONE : WARN)
  }
}

/** Os mancais das tábuas (parados): pilar de pedra que sai do pântano com o berço de ferro do eixo. */
export function serrariaPlankPosts(st: SoftGeo, course: Course) {
  for (const P of course.planks) {
    for (const e of [-1, 1]) {
      const z = P.z + e * (P.hz + 0.2)
      const h = P.y - 1.05
      st.box(1.1, h, 1.1, at(P.x, h / 2 - 0.4, z, n01(P.x, z) * 0.4), (_x, y) => (y > h / 2 - 0.5 ? mix(STONE, MOSS, 0.3) : STONE))
      st.box(1.3, 0.2, 1.3, at(P.x, h - 0.35, z), IRON)
      st.box(0.2, 0.7, 0.4, at(P.x - 0.5, h - 0.05, z), IRON)
      st.box(0.2, 0.7, 0.4, at(P.x + 0.5, h - 0.05, z), IRON)
    }
  }
}

// ── 4. chão de tábuas (pátio, ponte, patamares): assoalho serrado em fiadas desencontradas, pregos, manchas de
// serragem clara, a viga de borda escura com um toco de poste a cada tanto (silhueta quebrada) ──
export function serrariaFloor(g: SoftGeo, p: Pad): boolean {
  if (p.k !== 1 || p.y2 !== p.y || p.hx < 1 || p.mw !== 0 || p.spin !== 0) return false
  const y = p.y + 0.03
  const W = p.hx * 2 - 0.36
  const D = p.hz * 2 - 0.1
  g.box(W + 0.1, 0.03, D + 0.05, at(p.x, y - 0.02, p.z), PLANK_D)
  const BW = 0.62
  const rows = Math.max(1, Math.round(D / BW))
  const bw = D / rows
  for (let j = 0; j < rows; j++) {
    const cz = p.z - D / 2 + (j + 0.5) * bw
    let x = p.x - W / 2
    let i = 0
    while (x < p.x + W / 2 - 0.05) {
      let w = 2.2 + n01(i, j, p.z) * 2.6
      if (x + w > p.x + W / 2 - 0.9) w = p.x + W / 2 - x
      const cx = x + w / 2
      const patch = Math.sin(cx * 0.31 + cz * 0.17) * 0.5 + 0.5
      const tone = n01(i, j, 3) < 0.12 ? mix(PLANK, BARK, 0.5) : mix(mix(PLANK, PLANK_L, 0.25), PLANK_D, patch * 0.4 + n01(i, j, 4) * 0.2)
      g.box(w - 0.06, 0.05, bw - 0.06, at(cx, y + 0.01, cz), (_x, yy) => (yy > 0 ? tone : mix(tone, PLANK_D, 0.5)))
      // pregos nas pontas da tábua
      for (const e of [-1, 1]) for (const dz of [-0.16, 0.16]) g.box(0.06, 0.012, 0.06, at(cx + e * (w / 2 - 0.15), y + 0.04, cz + dz), IRON_L)
      // veio escuro de vez em quando e nó da madeira
      if (n01(i, j, 7) < 0.25) g.box(w * 0.6, 0.012, 0.04, at(cx, y + 0.041, cz + (n01(i, j, 8) - 0.5) * 0.3), PLANK_D)
      if (n01(i, j, 9) < 0.12) g.cylinder(0.16, 0.014, at(cx + (n01(i, j, 10) - 0.5) * w * 0.5, y + 0.042, cz), BARK_D, 6)
      x += w
      i++
    }
  }
  // serragem: manchas claras achatadas no pátio (não na ponte estreita)
  if (p.hx > 3) {
    for (let k = 0; k < Math.round(p.hz / 2); k++) {
      const sx = p.x + (n01(k, p.z, 1) - 0.5) * W * 0.8
      const sz = p.z + (n01(k, p.z, 2) - 0.5) * D * 0.85
      g.sphere(1, at(sx, y + 0.045, sz, n01(k, 3)), mix(SAWDUST, PLANK, 0.45), 7, 0.8 + n01(k, 4) * 1.0, 0.025, 0.5 + n01(k, 5) * 0.6)
      g.sphere(1, at(sx + 0.3, y + 0.05, sz - 0.2, n01(k, 6)), SAWDUST, 5, 0.35, 0.02, 0.25)
    }
  }
  // viga de borda escura nas laterais compridas, com tocos de poste e a quina clara
  for (const s of [-1, 1]) {
    g.box(0.36, 0.42, p.hz * 2, at(p.x + s * (p.hx - 0.18), p.y + 0.05, p.z), (_x, yy) => (yy > 0.16 ? PLANK_L : PLANK_D))
    if (p.hx > 3) {
      const n = Math.max(1, Math.round((p.hz * 2) / 5))
      for (let k = 0; k < n; k++) {
        const z = p.z - p.hz + (k + 0.5) * ((p.hz * 2) / n)
        const h = 0.7 + n01(k, s, p.z) * 0.4
        g.cylinder(0.42, h, at(p.x + s * (p.hx - 0.18), p.y + h / 2, z), barkPaint(k + 3), 8)
        g.cylinder(0.34, 0.02, at(p.x + s * (p.hx - 0.18), p.y + h + 0.01, z), HEART, 8)
      }
    }
  }
  return true
}

// ── 5. o galpão da serraria (marco, do lado da pista): base de pedra, paredes de tábua em pé com mata-junta,
// telhado íngreme de tabuinhas com cumeeira, janelas acesas, a boca aberta com a mesa da serra (a serra
// circular gira), a roda d'água na parede que dá para a pista (gira) e a pilha de toras ──
function shed(st: SoftGeo, glow: SoftGeo, x: number, z: number, face: number) {
  const W = 9
  const D = 12
  const H = 5.2
  const base = 2.2
  // base de pedra em blocos, musgo no pé
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      st.box(W / 2 + 0.1, base / 2 - 0.06, D / 3 - 0.08, at(x - W / 4 + (i % 2) * (W / 2), 0.2 + j * (base / 2), z - D / 3 + Math.floor(i / 2) * (D / 3), n01(i, j) * 0.06), (_x, yy) => (j === 0 && yy < 0 ? mix(STONE, MOSS, 0.5) : mix(STONE, BONE, n01(i, j, 2) * 0.25)))
    }
  }
  // paredes: tábuas em pé (cada uma num tom), mata-juntas escuras e a quina de viga clara
  const y0 = base + 0.7
  const nb = Math.round(D / 0.55)
  for (const s of [-1, 1]) {
    for (let k = 0; k < nb; k++) st.box(0.18, H, D / nb - 0.04, at(x + s * W / 2, y0 + H / 2, z - D / 2 + (k + 0.5) * (D / nb)), mix(PLANK_D, PLANK, 0.3 + n01(k, s) * 0.45))
  }
  const nf = Math.round(W / 0.55)
  for (const s of [-1, 1]) {
    for (let k = 0; k < nf; k++) {
      const xx = x - W / 2 + (k + 0.5) * (W / nf)
      const gable = H + (W / 2 - Math.abs(xx - x)) * 0.9
      st.box(W / nf - 0.04, gable, 0.18, at(xx, y0 + gable / 2, z + s * D / 2), mix(PLANK_D, PLANK, 0.3 + n01(k, s, 4) * 0.45))
    }
  }
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) st.box(0.42, H, 0.42, at(x + cx * W / 2, y0 + H / 2, z + cz * D / 2), PLANK_L)
  // telhado: duas águas de tabuinhas em fiadas (as de baixo mais escuras), cumeeira e beiral
  const pitch = Math.atan(0.9)
  const half = W / 2 / Math.cos(pitch) + 0.9
  for (const s of [-1, 1]) {
    const rows = 9
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows
      const rx = x + s * (W / 2 + 0.7) * (1 - t)
      const ry = y0 + H + (W / 2 + 0.7) * t * 0.9 + 0.15
      st.box(half / rows + 0.12, 0.14, D + 1.4, at(rx, ry, z, 0, 0, -s * pitch), mix(ROOF_D, ROOF, t * 0.7 + n01(r, s) * 0.2))
    }
  }
  st.box(0.5, 0.4, D + 1.6, at(x, y0 + H + W / 2 * 0.9 + 0.5, z), PLANK_D)
  // janelas acesas no lado da pista (grade de caixilho escuro por cima da luz) e a boca da serra
  const fx = x + face * (W / 2 + 0.1)
  for (const wz of [-3.6, 3.6]) {
    glow.box(0.06, 1.3, 1.5, at(fx, y0 + 3, z + wz), LAMP)
    st.box(0.1, 1.5, 0.1, at(fx + face * 0.05, y0 + 3, z + wz), PLANK_D)
    st.box(0.1, 0.1, 1.7, at(fx + face * 0.05, y0 + 3, z + wz), PLANK_D)
    st.box(0.16, 0.16, 1.9, at(fx + face * 0.06, y0 + 2.3, z + wz), PLANK_L)
  }
  // chaminé de pedra com a boca escura
  st.box(1.1, 3.4, 1.1, at(x - face * 2, y0 + H + 3.2, z + 3.5), STONE)
  st.box(1.3, 0.3, 1.3, at(x - face * 2, y0 + H + 5, z + 3.5), mix(STONE, BONE, 0.3))
  st.box(0.6, 0.05, 0.6, at(x - face * 2, y0 + H + 5.16, z + 3.5), BARK_D)
  return { y0, fx }
}

function logPile(st: SoftGeo, x: number, z: number, n: number, seed: number) {
  // toras empilhadas em pirâmide, pontas serradas claras para fora, duas estacas segurando
  let k = 0
  for (let row = 0; row < n; row++) {
    for (let i = 0; i < n - row; i++) {
      const r = 0.42 + n01(seed, k) * 0.08
      const xx = x - ((n - row - 1) * 0.9) / 2 + i * 0.9
      const yy = 0.9 + row * 0.78
      const L = 4.4 + n01(k, seed) * 0.8
      st.cylinder(r * 2, L, at(xx, yy, z, 0, Math.PI / 2), barkPaint(seed + k), 10)
      for (const e of [-1, 1]) st.cylinder(r * 2 - 0.08, 0.03, at(xx, yy, z + e * (L / 2 + 0.01), 0, Math.PI / 2), k % 2 ? HEART : RING, 10)
      k++
    }
  }
  for (const s of [-1, 1]) st.box(0.22, n * 0.8 + 0.8, 0.22, at(x + s * (n * 0.45 + 0.2), (n * 0.8 + 0.8) / 2 + 0.4, z), BARK)
}

export function serrariaWheel(g: SoftGeo, R: number) {
  // roda d'água: dois aros de tábua, raios, pás e o cubo de ferro (eixo local = x)
  for (const s of [-0.7, 0.7]) {
    const N = 18
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2
      g.box(0.22, 0.34, ((Math.PI * 2 * R) / N) * 1.06, at(s, Math.cos(a) * R, Math.sin(a) * R, 0, a + Math.PI / 2), k % 2 ? PLANK : PLANK_D)
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      g.box(0.18, R * 2, 0.22, at(s, 0, 0, 0, a), PLANK_D)
    }
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.13
    g.box(1.7, 0.1, 0.7, at(0, Math.cos(a) * (R + 0.15), Math.sin(a) * (R + 0.15), 0, a), mix(PLANK, PLANK_L, 0.3))
  }
  g.cylinder(0.9, 2, at(0, 0, 0, 0, 0, Math.PI / 2), IRON, 12)
  g.cylinder(0.5, 2.6, at(0, 0, 0, 0, 0, Math.PI / 2), IRON_L, 8)
}

export function serrariaSaw(g: SoftGeo, gl: SoftGeo, R: number) {
  // serra circular: disco de aço com dentes e o miolo de latão; os furos e um filete aceso (de longe)
  g.cylinder(R * 2, 0.06, at(0, 0, 0, 0, 0, Math.PI / 2), AXE, 36)
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2
    g.box(0.05, 0.22, 0.16, at(0, Math.cos(a) * (R + 0.06), Math.sin(a) * (R + 0.06), 0, a + 0.4), SPIKE_TIP)
  }
  g.cylinder(0.5, 0.12, at(0, 0, 0, 0, 0, Math.PI / 2), [0.78, 0.6, 0.26], 12)
  gl.cylinder(R * 1.3, 0.07, at(0, 0, 0, 0, 0, Math.PI / 2), [0.6, 0.86, 1], 30, R * 1.3)
}

/** Sombra de contato das toras no assoalho (parada: a tora gira no lugar). */
export function serrariaLogShadows(g: SoftGeo, course: Course) {
  for (const L of course.logs) g.sphere(1, at(L.x, DECK + 0.075, L.z), [0.1, 0.06, 0.04], 10, L.hx * 2.05, 0.02, L.R * 2.2)
}

export class SerrariaView {
  private readonly meshes: Mesh[] = []
  private readonly spinners: { node: TransformNode; w: number }[] = []
  private readonly logs: TransformNode[] = []
  private readonly planks: TransformNode[] = []

  constructor(scene: Scene, toy: Material, glowMat: Material, private readonly course: Course) {
    course.logs.forEach((L, i) => {
      const node = new TransformNode(`serraria-log-${i}`, scene)
      node.position.set(L.x, L.y, L.z)
      const g = new SoftGeo()
      const gl = new SoftGeo()
      serrariaLog(g, gl, L, i * 7 + 3)
      const m = g.build(`serraria-log-m-${i}`, scene, toy, false)
      const mg = gl.build(`serraria-log-g-${i}`, scene, glowMat, false)
      m.parent = node
      mg.parent = node
      this.meshes.push(m, mg)
      this.logs.push(node)
    })
    course.planks.forEach((P, i) => {
      const node = new TransformNode(`serraria-plank-${i}`, scene)
      node.position.set(P.x, P.y, P.z)
      const g = new SoftGeo()
      serrariaPlank(g, P, i * 5 + 1)
      const m = g.build(`serraria-plank-m-${i}`, scene, toy, false)
      m.parent = node
      this.meshes.push(m)
      this.planks.push(node)
    })
    if (course.logs.length) {
      // o galpão ao lado das tábuas, a roda d'água na parede que dá para a pista, a serra na boca, as pilhas
      const st = new SoftGeo()
      const lit = new SoftGeo()
      const sx = -21
      const sz = 120
      const { y0, fx } = shed(st, lit, sx, sz, 1)
      logPile(st, 17, 40, 4, 3)
      logPile(st, -18, 30, 3, 8)
      logPile(st, 18, 162, 4, 13)
      logPile(st, sx + 2, sz - 9.5, 3, 17)
      // mesa da serra na frente da boca (cavaletes, tampo) e o mancal da roda
      st.box(1.4, 0.2, 4.6, at(fx + 1.4, y0 + 0.8, sz - 3.6), PLANK)
      for (const dz of [-1.8, 1.8]) st.box(1.2, 1.2, 0.2, at(fx + 1.4, y0 + 0.2, sz - 3.6 + dz), PLANK_D)
      st.box(1.2, y0 + 1.5, 1.2, at(fx - 2.6, (y0 + 1.5) / 2 - 0.4, sz + 8.6), STONE)
      st.box(1.2, y0 + 1.5, 1.2, at(fx - 6.4, (y0 + 1.5) / 2 - 0.4, sz + 8.6), STONE)
      st.box(4.6, 0.5, 0.5, at(fx - 4.5, y0 + 0.4, sz + 8.6), BARK)
      this.meshes.push(st.build("serraria-shed", scene, toy, true))
      this.meshes.push(lit.build("serraria-shed-lit", scene, glowMat, true))
      const mk = (name: string, x: number, y: number, z: number, w: number, fill: (g: SoftGeo, gl: SoftGeo) => void) => {
        const node = new TransformNode(name, scene)
        node.position.set(x, y, z)
        const g = new SoftGeo()
        const gl = new SoftGeo()
        fill(g, gl)
        const m = g.build(name + "-m", scene, toy, false)
        const mg = gl.build(name + "-g", scene, glowMat, false)
        m.parent = node
        mg.parent = node
        this.meshes.push(m, mg)
        this.spinners.push({ node, w })
      }
      mk("serraria-wheel", fx - 4.5, y0 + 0.4, sz + 8.6, -0.6, (g) => serrariaWheel(g, 3.4))
      mk("serraria-saw", fx + 1.4, y0 + 1.4, sz - 3.6, 6, (g, gl) => serrariaSaw(g, gl, 0.75))
      const sh = new SoftGeo()
      serrariaLogShadows(sh, course)
      this.meshes.push(sh.build("serraria-log-shadows", scene, toy, true))
    }
    if (course.planks.length) {
      const st = new SoftGeo()
      serrariaPlankPosts(st, course)
      this.meshes.push(st.build("serraria-plank-posts", scene, toy, true))
    }
  }

  update(t: number) {
    this.course.logs.forEach((L, i) => (this.logs[i].rotation.x = -L.w * t))
    this.course.planks.forEach((P, i) => (this.planks[i].rotation.z = plankAngle(P, t)))
    for (const s of this.spinners) s.node.rotation.x = s.w * t
  }

  dispose() {
    for (const m of this.meshes) m.dispose()
    for (const n of [...this.logs, ...this.planks, ...this.spinners.map((s) => s.node)]) n.dispose()
  }
}
