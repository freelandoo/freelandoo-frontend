// features/meu-mundo/gincana/engine/moinhos-view.ts — Trilha dos Moinhos (2ª fase do Cânion, 2026-11-20):
// o desenho próprio da prova "circuito de obstáculos misto" (rolos que giram, blocos que varrem, pás sobre
// discos e um campo de catavento), peça por peça (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de um circuito de obstáculos num party game — só o TIPO de prova e a riqueza de
// detalhe; nada de traçado, personagem, logotipo, cor de marca, interface ou arte do jogo do vídeo)
// O que é:     a trilha dos moleiros do Cânion: um canal de moendas de pedra que rolam de lado, um corredor
//              de blocos de arenito que vão e voltam, duas mós de pedra com as pás do moinho deitadas por
//              cima e um campo de cataventos de madeira antes da subida das pedras.
// Silhueta:    rolos compridos e baixos no chão (riscam a pista no sentido da corrida), blocos quadrados
//              que saltam acima da cabeça, a cruz das pás sobre o disco, o moinho grande no fundo.
// Massas:      moenda r 1,05 × 14 m · bloco 3,2 × 3,2 × 2,2 · mó r 7 · pá 2 × 6,7 m · catavento 3,8 m.
// Paleta:      arenito (0,82/0,52/0,28 → quina 0,96/0,8/0,58), terracota (0,62/0,26/0,14), madeira
//              (0,42/0,26/0,14 → clara 0,62/0,44/0,26), ferro (0,14/0,13/0,13), lona (0,92/0,86/0,72),
//              ocre vivo (0,95/0,62/0,18) e o rio verde-jade embaixo.
// 70/20/10:    70 arenito e terracota, 20 madeira e lona, 10 ferro, ocre vivo e o jade da água.
// Material:    pedra (arenito), madeira, ferro, lona.
// Fora:        o chão colorido, os bonecos, os rolos listrados e qualquer peça reconhecível do vídeo.
// Inventado:   o moinho de pedra do fundo, os pórticos de madeira nas pontas das moendas, as mós.
//
// PARTES (ordem de construção — §2)
// 1. moenda — grande: anéis de mó enfiados num eixo; médio: sulcos, cintas de ferro, cubo de madeira nas
//    pontas; pequeno: cravos, lascas claras, setas de ocre do giro.
// 2. pórtico das moendas — 3. bloco de arenito — 4. mó + pá do moinho — 5. catavento — 6. chão de lajes
// 7. o moinho grande (marco).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Course, Pad, Post, Sweeper } from "../sim/course"
import type { RGB } from "./shapes"
import { SoftGeo, at, mix } from "./shapes"

const SAND: RGB = [0.82, 0.52, 0.28]
const SAND_D: RGB = [0.56, 0.32, 0.17]
const SAND_L: RGB = [0.96, 0.8, 0.58]
const TERRA: RGB = [0.62, 0.26, 0.14]
const WOOD: RGB = [0.42, 0.26, 0.14]
const WOOD_L: RGB = [0.62, 0.44, 0.26]
const IRON: RGB = [0.14, 0.13, 0.13]
const IRON_L: RGB = [0.4, 0.38, 0.36]
const OCHRE: RGB = [0.95, 0.62, 0.18]

/** Ruído barato e fixo (0–1). */
function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

// ── 1. moenda: o eixo de madeira atravessa anéis de mó (eixo local = z, o nó gira em z) ──
export function moinhosDrum(g: SoftGeo, gl: SoftGeo, R: number, len: number, w: number, seed: number) {
  const ALONG = Math.PI / 2
  // eixo de madeira com cintas de ferro (aparece nas juntas entre os anéis)
  g.cylinder(R * 0.9, len + 0.6, at(0, 0, 0, 0, ALONG, 0), (x, _y, z) => mix(WOOD, WOOD_L, 0.25 + 0.3 * n01(Math.round(Math.atan2(z, x) * 3), 1)), 10)
  const n = Math.max(3, Math.round(len / 2))
  const step = len / n
  const wide = step - 0.3
  for (let i = 0; i < n; i++) {
    const zc = -len / 2 + (i + 0.5) * step
    const r = R - (i % 2 ? 0.05 : 0)
    const tone = n01(seed, i)
    const base = mix(mix(SAND, SAND_L, 0.35), i % 3 === 1 ? TERRA : SAND, 0.1 + tone * 0.4)
    // corpo do anel: pedra, a beirada mais escura (contato com o vizinho), o meio mais claro
    const BEV = 0.2
    g.cylinder(r * 2, wide - BEV * 2, at(0, 0, zc, 0, ALONG, 0), (x, _y, z) => {
      const grain = n01(Math.round(Math.atan2(z, x) * 4), seed + i)
      return mix(base, grain > 0.6 ? SAND_L : SAND_D, 0.12 + grain * 0.12)
    }, 22)
    // chanfro das duas bordas: a quina clara gasta (sobe da junta escura para a face)
    for (const s of [-1, 1]) {
      g.cylinder(r * 2, BEV, at(0, 0, zc + s * (wide / 2 - BEV / 2), 0, s * ALONG, 0), (_x, y) => (y > 0 ? mix(SAND_D, base, 0.4) : mix(SAND_L, base, 0.25)), 22, r * 2 - 0.26)
    }
    // picotado de cinzel: covas escuras curtas e lascas claras, espalhadas (a pedra da mó)
    for (let k = 0; k < 12; k++) {
      const m = n01(seed, i, k) * Math.PI * 2
      const zz = zc + (n01(i, k, seed + 3) - 0.5) * (wide - 0.6)
      const pit = k % 3 !== 0
      const s = pit ? 0.12 + n01(k, i) * 0.1 : 0.14
      g.box(s, 0.04, s * 2, at(Math.sin(m) * r, Math.cos(m) * r, zz, n01(k, i, 4) * 0.8, 0, -m), pit ? mix(mix(SAND_D, base, 0.35), [0.4, 0.36, 0.32], 0.3) : SAND_L)
    }
    // a cinta de ferro na junta (entre este anel e o próximo) com cravos
    if (i < n - 1) {
      const jz = zc + step / 2
      g.torus(R * 1.62, 0.16, at(0, 0, jz, 0, ALONG, 0), IRON, 12)
      for (let k = 0; k < 6; k++) {
        const m = (k / 6) * Math.PI * 2 + i
        g.box(0.13, 0.13, 0.13, at(Math.sin(m) * R * 0.86, Math.cos(m) * R * 0.86, jz, 0, 0, -m), IRON_L)
      }
    }
  }
  // cubo de madeira com aro de ferro nas pontas (a cara da moenda) e a cavilha
  for (const s of [-1, 1]) {
    const ez = s * (len / 2 + 0.12)
    g.cylinder(R * 1.15, 0.26, at(0, 0, ez, 0, ALONG, 0), (x, _y, z) => (Math.floor((Math.atan2(z, x) / Math.PI) * 4 + 8) % 2 ? WOOD : WOOD_L), 12)
    g.torus(R * 1.2, 0.12, at(0, 0, ez, 0, ALONG, 0), IRON, 14)
    g.cylinder(0.32, 0.6, at(0, 0, ez + s * 0.2, 0, ALONG, 0), IRON_L, 8)
  }
  // um V grande pintado em terracota por anel, dois por volta: dizem para que lado a moenda joga
  const sgn = Math.sign(w)
  const RED: RGB = [0.66, 0.16, 0.08]
  for (let i = 0; i < n; i++) {
    const zc = -len / 2 + (i + 0.5) * step
    const r = R - (i % 2 ? 0.05 : 0) + 0.015
    for (let k = 0; k < 2; k++) {
      const m0 = k * Math.PI + i * 0.9
      for (let j = 0; j < 7; j++) {
        // cada braço do V: 7 lascas encavaladas que andam em volta (a ponta do V aponta no sentido do giro)
        const t = j / 6
        for (const side of [-1, 1]) {
          const m = m0 + sgn * (1 - t) * 0.42
          const zz = zc + side * t * (wide / 2 - 0.25)
          g.box(0.26, 0.05, 0.3, at(Math.sin(m) * r, Math.cos(m) * r, zz, 0, 0, -m), j === 0 ? mix(RED, OCHRE, 0.3) : RED)
        }
      }
    }
  }
  void gl
}

// ── 2. pórtico das moendas: pilares de blocos de arenito fora da pista, viga de madeira com cintas, a mó
// de emblema no meio, lampiões pendurados e lona com franja; embaixo de cada cubo, o mancal de pedra ──
const CLOTH: RGB = [0.92, 0.86, 0.72]

function stonePillar(st: SoftGeo, x: number, z: number, y0: number, H: number, seed: number) {
  const nb = 4
  const bh = H / nb
  for (let b = 0; b < nb; b++) {
    const w = 1.9 - b * 0.12
    const off = (n01(seed, b) - 0.5) * 0.16
    const tone = mix(SAND, b % 2 ? SAND_D : TERRA, 0.15 + n01(b, seed) * 0.3)
    // bloco: base escura (contato) → topo claro, e a quina de cima mais clara
    st.box(w, bh - 0.08, w, at(x + off, y0 + bh * b + bh / 2, z + off * 0.6, n01(seed, b, 2) * 0.12), (_x, y) => mix(tone, y > bh / 2 - 0.2 ? SAND_L : SAND_D, y > bh / 2 - 0.2 ? 0.45 : y < -bh / 2 + 0.25 ? 0.4 : 0))
  }
  // sapata escura no chão e capitel de pedra clara
  st.box(2.3, 0.3, 2.3, at(x, y0 + 0.15, z), mix(SAND_D, IRON, 0.25))
  st.box(2.2, 0.35, 2.2, at(x, y0 + H + 0.17, z), SAND_L)
}

function lantern(st: SoftGeo, glow: SoftGeo, x: number, y: number, z: number) {
  st.cylinder(0.05, 0.7, at(x, y + 0.35, z), IRON, 4)
  st.box(0.5, 0.08, 0.5, at(x, y - 0.02, z), IRON)
  st.cylinder(0.56, 0.18, at(x, y - 0.75, z), IRON, 6, 0.3)
  for (const c of [-0.21, 0.21]) for (const e of [-0.21, 0.21]) st.box(0.05, 0.6, 0.05, at(x + c, y - 0.35, z + e), IRON)
  glow.cylinder(0.34, 0.5, at(x, y - 0.36, z), (_x, yy) => mix([1, 0.5, 0.14], [1, 0.9, 0.55], yy + 0.5), 8)
}

function millEmblem(st: SoftGeo, x: number, y: number, z: number) {
  // a mó de pé (eixo em z): disco de pedra com sulcos em raio e o olho de ferro
  st.cylinder(2.8, 0.45, at(x, y, z, 0, Math.PI / 2, 0), (xx, _y, zz) => mix(SAND, SAND_L, Math.hypot(xx, zz) > 1.2 ? 0.45 : 0.1), 24)
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    st.box(0.12, 1.0, 0.1, at(x + Math.sin(a) * 0.75, y + Math.cos(a) * 0.75, z - 0.24, 0, 0, -a + 0.35), SAND_D)
    st.box(0.12, 1.0, 0.1, at(x + Math.sin(a) * 0.75, y + Math.cos(a) * 0.75, z + 0.24, 0, 0, -a + 0.35), SAND_D)
  }
  st.cylinder(0.6, 0.6, at(x, y, z, 0, Math.PI / 2, 0), IRON, 8)
  st.torus(2.85, 0.12, at(x, y, z, 0, Math.PI / 2, 0), IRON, 24)
}

function gate(st: SoftGeo, glow: SoftGeo, z: number, y0: number, half: number) {
  const H = 5.6
  for (const s of [-1, 1]) stonePillar(st, s * (half + 1.2), z, y0, H, z + s)
  const span = (half + 1.2) * 2 + 1.6
  const by = y0 + H + 0.9
  // viga dupla de madeira (a de cima mais clara) com cintas de ferro e cravos
  st.box(span, 0.9, 1.1, at(0, by, z), (_x, y) => (y > 0.25 ? WOOD_L : y < -0.3 ? mix(WOOD, IRON, 0.3) : WOOD))
  st.box(span - 1.2, 0.5, 0.8, at(0, by + 0.7, z), (_x, y) => (y > 0.1 ? mix(WOOD_L, CLOTH, 0.2) : WOOD))
  for (let c = -3; c <= 3; c++) {
    const x = c * (span / 7.4)
    st.box(0.2, 0.96, 1.16, at(x, by, z), IRON)
    for (const fz of [-0.6, 0.6]) st.sphere(0.12, at(x, by + 0.22, z + fz), IRON_L, 5)
  }
  // mãos-francesas: escoras diagonais do pilar à viga
  for (const s of [-1, 1]) st.box(0.32, 2.2, 0.36, at(s * (half - 0.2), by - 1.15, z, 0, 0, s * 0.75), WOOD)
  millEmblem(st, 0, by + 2.1, z)
  // lona de moleiro com franja ocre (pano em gomos, um pouco caído), uma faixa de cada lado da mó
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = s * (2.4 + k * 1.15)
      const drop = 1.1 + (k % 2) * 0.35
      // três gomos (dobra): o do meio salta e é mais claro, os de fora mais escuros; franja em dentes
      for (let f = 0; f < 3; f++) {
        const fx = x + (f - 1) * 0.34
        const fz = z - 0.6 - (f === 1 ? 0.08 : 0)
        const tone = mix(CLOTH, SAND_D, f === 1 ? 0.02 : 0.22 + (k % 2) * 0.08)
        st.box(0.36, drop, 0.05, at(fx, by - 0.45 - drop / 2, fz), (_x, y) => (y > drop / 2 - 0.15 ? mix(tone, WOOD, 0.4) : tone))
        st.box(0.36, 0.16, 0.06, at(fx, by - 0.45 - drop + 0.1, fz - 0.01), OCHRE)
        st.box(0.18, 0.18, 0.05, at(fx, by - 0.45 - drop - 0.06, fz - 0.01, 0, 0, Math.PI / 4), mix(OCHRE, TERRA, 0.3))
      }
    }
  }
  for (const s of [-1, 1]) lantern(st, glow, s * (half - 1.6), by - 0.45, z + 0.62)
}

export function moinhosFrames(st: SoftGeo, glow: SoftGeo, course: Course) {
  if (!course.drums.length) return
  const z0 = Math.min(...course.drums.map((d) => d.z0))
  const z1 = Math.max(...course.drums.map((d) => d.z0 + d.rings.reduce((a, r) => a + r.len, 0)))
  const y0 = course.drums[0].y - 0.25
  gate(st, glow, z0 - 1.6, y0, 9)
  gate(st, glow, z1 + 1.6, y0, 9)
  // mancal de pedra sob o cubo de cada moenda: berço em U com a bucha de ferro
  for (const d of course.drums) {
    const len = d.rings.reduce((a, r) => a + r.len, 0)
    for (const ez of [d.z0 - 0.45, d.z0 + len + 0.45]) {
      st.box(1.5, 0.7, 0.55, at(d.x, y0 + 0.35, ez), (_x, y) => (y > 0.2 ? SAND_L : SAND_D))
      for (const s of [-1, 1]) st.box(0.32, d.y - y0 + 0.2, 0.55, at(d.x + s * 0.58, y0 + (d.y - y0 + 0.2) / 2, ez), (_x, y) => (y > 0 ? SAND : SAND_D))
      st.torus(0.5, 0.12, at(d.x, d.y, ez, 0, Math.PI / 2, 0), IRON_L, 10)
    }
  }
}

// ── 3. bloco de arenito: estratos em faixas de 3 tons, quinas claras gastas, um sol entalhado em ocre nas
// faces da corrida, o trenó de madeira com cintas embaixo; no chão, o trilho de madeira por onde ele anda ──
export function moinhosBlock(g: SoftGeo, hx: number, hz: number, h: number, seed: number) {
  const W = hx * 2
  const D = hz * 2
  const skid = 0.32
  const bh = h - skid
  // três lajes grossas de arenito (canto gasto), desencontradas e um pouco giradas; junta escura entre elas
  const ROSE: RGB = [0.9, 0.6, 0.42]
  const hs = [0.36, 0.34, 0.3]
  let y = skid
  for (let b = 0; b < 3; b++) {
    const t = bh * hs[b]
    const tone = mix(mix(ROSE, SAND_L, 0.25), [SAND, TERRA, SAND_L][(b + seed) % 3], 0.2 + n01(b, seed) * 0.25)
    const ox = (n01(seed, b, 1) - 0.5) * 0.18
    const oz = (n01(seed, b, 2) - 0.5) * 0.18
    const sh = b === 1 ? 0.12 : 0
    g.box(W - 0.5, 0.1, D - 0.5, at(ox, y + 0.02, oz), mix(SAND_D, IRON, 0.45))
    g.roundBox(W - sh, t - 0.06, D - sh, 0.07, at(ox, y + t / 2 + 0.03, oz, (n01(seed, b, 3) - 0.5) * 0.08), (_x, yy) => {
      const top = yy > t / 2 - 0.22
      const low = yy < -t / 2 + 0.2
      return top ? mix(tone, SAND_L, 0.5) : low ? mix(tone, SAND_D, 0.45) : tone
    }, 2)
    // trincas: riscos escuros de pé nas quatro faces, um ou dois por face
    for (let f = 0; f < 4; f++) {
      const along = f < 2
      const s = f % 2 ? 1 : -1
      const u = (n01(seed, b, f + 7) - 0.5) * (along ? W : D) * 0.7
      const ch = t * (0.35 + n01(b, f, seed) * 0.3)
      const px = along ? u + ox : s * ((W - sh) / 2 + 0.005) + ox
      const pz = along ? s * ((D - sh) / 2 + 0.005) + oz : u + oz
      g.box(along ? 0.07 : 0.03, ch, along ? 0.03 : 0.07, at(px, y + t / 2 - (t - ch) * 0.3, pz), mix(SAND_D, IRON, 0.5))
    }
    y += t
  }
  // sol entalhado nas duas faces da corrida (±z): disco fundo + 8 raios
  for (const fz of [-1, 1]) {
    const z = fz * (D / 2 - 0.08)
    const cy = skid + bh * 0.52
    g.cylinder(1.25, 0.1, at(0, cy, z, 0, Math.PI / 2, 0), mix(OCHRE, TERRA, 0.35), 14)
    g.cylinder(0.5, 0.14, at(0, cy, z, 0, Math.PI / 2, 0), OCHRE, 10)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      g.box(0.2, 0.3, 0.04, at(Math.sin(a) * 0.8, cy + Math.cos(a) * 0.8, z + fz * 0.02, 0, 0, -a), mix(OCHRE, TERRA, 0.3))
    }
  }
  // lascas e covas espalhadas nas faces de lado (±x)
  for (let k = 0; k < 10; k++) {
    const sx = k % 2 ? 1 : -1
    g.sphere(0.16 + n01(k, seed) * 0.12, at(sx * (W / 2 - 0.12), skid + 0.3 + n01(seed, k) * (bh - 0.6), (n01(k, seed, 5) - 0.5) * (D - 0.8)), k % 3 ? mix(SAND_D, IRON, 0.15) : SAND_L, 5, 0.3, 1, 1)
  }
  // trenó: duas sapatas de madeira com a ponta virada e cintas de ferro
  for (const sz of [-1, 1]) {
    g.box(W + 0.3, skid, 0.5, at(0, skid / 2, sz * (D / 2 - 0.45)), (_x, y) => (y > 0 ? WOOD_L : WOOD))
    for (const sx of [-1, 1]) g.box(0.4, 0.3, 0.5, at(sx * (W / 2 + 0.2), skid * 0.75, sz * (D / 2 - 0.45), 0, 0, sx * 0.5), WOOD)
    for (const sx of [-0.6, 0.6]) g.box(0.14, skid + 0.04, 0.54, at(sx * W * 0.5, skid / 2, sz * (D / 2 - 0.45)), IRON)
  }
}

export function moinhosTracks(st: SoftGeo, course: Course) {
  for (const q of course.pushers) {
    const span = (q.ax + q.hx) * 2 + 0.6
    for (const sz of [-1, 1]) {
      const z = q.z + sz * (q.hz - 0.45)
      // trilho de madeira com a beira clara e cravos de ferro, e a sombra do sulco embaixo
      st.box(span + 0.3, 0.03, 0.8, at(q.x, q.y + 0.015, z), mix(SAND_D, IRON, 0.3))
      st.box(span, 0.1, 0.5, at(q.x, q.y + 0.05, z), (_x, y) => (y > 0 ? WOOD_L : WOOD))
      for (let k = 0; k <= 8; k++) st.box(0.12, 0.05, 0.12, at(q.x - span / 2 + (k / 8) * span, q.y + 0.11, z, 0.78), IRON_L)
    }
    // batentes de pedra nas duas pontas do curso
    for (const sx of [-1, 1]) st.box(0.7, 0.6, q.hz * 2 + 0.2, at(q.x + sx * (span / 2 + 0.35), q.y + 0.3, q.z), (_x, y) => (y > 0.15 ? SAND_L : SAND_D))
  }
}

// ── 4a. mó: o disco é a pedra de baixo de um moinho — face com o "picado" em setores (sulcos paralelos), o
// olho escuro no meio, aro de ferro com quina clara, a pedra grossa embaixo e as estacas na água ──
export function moinhosDisc(g: SoftGeo, p: Pad): boolean {
  if (p.k !== 0 || p.r < 5) return false
  const R = p.r
  const y = p.y
  const FACE: RGB = mix(SAND_L, [0.78, 0.7, 0.6], 0.45)
  g.cylinder(R * 2, 0.5, at(p.x, y - 0.25, p.z), (x, yy, z) => {
    const d = Math.hypot(x, z) / R
    return yy > 0 ? mix(FACE, SAND_D, d > 0.93 ? 0.25 : d < 0.18 ? 0.5 : 0) : SAND_D
  }, 48)
  // a pedra grossa embaixo (mais escura, sai da água) e o aro de ferro
  // a pedra de baixo afina para dentro em três anéis (estratos), a de baixo molhada (escura)
  for (let b = 0; b < 3; b++) {
    const r0 = R - 0.25 - b * 0.55
    g.cylinder(r0 * 2, 0.95, at(p.x, y - 0.95 - b * 0.9, p.z), (_x, yy) => mix([SAND, TERRA, SAND_D][b], IRON, b === 2 ? 0.25 : yy < -0.3 ? 0.15 : 0), 32, r0 * 2 + 0.25)
  }
  g.torus(R * 2 + 0.05, 0.22, at(p.x, y - 0.18, p.z), IRON, 28)
  g.torus(R * 2 + 0.05, 0.08, at(p.x, y + 0.0, p.z), IRON_L, 24)
  // o picado: 10 setores, cada um com 4 sulcos paralelos (do olho até a beira, em diagonal)
  const N = 10
  for (let s = 0; s < N; s++) {
    const a = (s / N) * Math.PI * 2
    for (let k = 0; k < 4; k++) {
      const off = 0.35 + k * 0.48
      const len = R * 0.72 - k * 0.35
      // sulco: ao longo do raio "a", deslocado de lado por off (o desenho em harpa da mó)
      const mx = Math.sin(a) * (R * 0.22 + len / 2) + Math.cos(a) * off
      const mz = Math.cos(a) * (R * 0.22 + len / 2) - Math.sin(a) * off
      g.box(0.16, 0.04, len, at(p.x + mx, y + 0.005, p.z + mz, a), k === 0 ? mix(SAND_D, IRON, 0.4) : mix(SAND_D, FACE, 0.3))
    }
  }
  // o olho: anel escuro de ferro e a sombra em volta do eixo
  g.cylinder(R * 0.38, 0.03, at(p.x, y + 0.01, p.z), mix(SAND_D, IRON, 0.55), 24)
  // estacas de madeira na água, com cinta de ferro
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3
    const px = p.x + Math.sin(a) * (R - 0.55)
    const pz = p.z + Math.cos(a) * (R - 0.55)
    g.cylinder(0.5, 3.3, at(px, y - 2.05, pz), (_x, yy) => (yy > 1.2 ? WOOD_L : yy < -1 ? mix(WOOD, IRON, 0.4) : WOOD), 8)
    g.torus(0.56, 0.08, at(px, y - 1.0, pz), IRON, 10)
  }
  return true
}

// ── 4b. a pá do moinho deitada: a vara de madeira com a grade de ripas e a lona (baixa: se pula), a ponteira
// de ferro e o cubo de madeira com coroa de dentes no eixo ──
export function moinhosSweep(g: SoftGeo, _gl: SoftGeo, s: Sweeper) {
  if (s.len < 3) return vaneArms(g, s)
  const z0 = s.both ? -s.len : 0
  const len = s.both ? s.len * 2 : s.len
  const d = s.r * 2
  // a vara: madeira com a face de cima clara
  g.box(d * 0.75, d * 0.75, len, at(0, 0, z0 + len / 2), (_x, y) => (y > 0.05 ? WOOD_L : WOOD))
  for (const e of s.both ? [-1, 1] : [1]) {
    const L = s.len
    // grade de ripas na frente do giro (de um só lado da vara: a pá) com a lona entre elas
    const side = e
    for (let k = 1; k < Math.round(L / 0.75); k++) {
      const z = e * k * 0.75
      g.box(0.95, 0.07, 0.09, at(side * 0.5, 0.26, z), WOOD_L)
    }
    g.box(0.07, 0.12, L - 1, at(side * 0.95, 0.24, e * (L / 2 + 0.4)), WOOD)
    g.box(0.78, 0.03, L - 1.3, at(side * 0.55, 0.22, e * (L / 2 + 0.5)), (_x, _y, z) => (Math.floor(Math.abs(z) / 1.5) % 2 ? CLOTH : mix(CLOTH, OCHRE, 0.45)))
    // ponteira de ferro com a faixa ocre (a ponta é o que bate primeiro)
    g.box(d * 0.85, d * 0.85, 0.45, at(0, 0, e * (L - 0.22)), IRON)
    g.box(d * 0.9, 0.08, 0.5, at(0, d * 0.45, e * (L - 0.22)), OCHRE)
    // cintas de ferro na vara
    for (const t of [0.3, 0.6]) g.box(d * 0.8, d * 0.8, 0.12, at(0, 0, e * L * t), IRON)
  }
  // cubo: tambor de madeira com aros de ferro e a coroa de dentes, pino de ferro em cima
  const hy = -(s.y - 3)
  g.cylinder(1.3, -hy + 0.5, at(0, hy + (-hy + 0.5) / 2, 0), (_x, y) => (y > 0 ? WOOD_L : WOOD), 14)
  for (const yy of [hy + 0.12, 0.25]) g.torus(1.34, 0.1, at(0, yy, 0), IRON, 16)
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    g.box(0.2, 0.22, 0.2, at(Math.sin(a) * 0.62, 0.62, Math.cos(a) * 0.62, a), WOOD_L)
  }
  g.cylinder(0.3, 0.5, at(0, 0.75, 0), IRON_L, 8)
}

// ── 5. catavento: o mastro de madeira com sapata de pedra e cintas (poste fixo) e, no nó que gira, os dois
// braços baixos de pá (a barra) e lá em cima a seta da biruta com a cauda de lona, que aponta junto ──
export function moinhosMast(st: SoftGeo, q: Post) {
  const h = q.y1 - q.y0
  st.box(0.9, 0.3, 0.9, at(q.x, q.y0 + 0.15, q.z, 0.4), (_x, y) => (y > 0 ? SAND_L : SAND_D))
  st.cylinder(q.r * 2, h, at(q.x, q.y0 + h / 2, q.z), (_x, y) => (y > h * 0.3 ? WOOD_L : WOOD), 8)
  for (const t of [0.35, 1.25]) st.torus(q.r * 2 + 0.06, 0.06, at(q.x, q.y0 + t, q.z), IRON, 10)
}

function vaneArms(g: SoftGeo, s: Sweeper) {
  const L = s.len
  const d = s.r * 2
  // vara curta + a pá: tábua larga de pé (lê "pá de roda") com a borda ocre
  g.box(d * 0.6, d * 0.6, L * 2, at(0, 0, 0), WOOD)
  for (const e of [-1, 1]) {
    g.box(0.12, d * 1.4, L - 0.55, at(0, 0.05, e * (L / 2 + 0.25)), (_x, y) => (y > d * 0.45 ? OCHRE : y > 0 ? CLOTH : mix(CLOTH, SAND_D, 0.3)))
    g.box(0.16, d * 1.5, 0.12, at(0, 0.05, e * (L - 0.06)), IRON)
  }
  // a cabeça que gira no mastro e a biruta: seta de ferro na frente, cauda de lona atrás
  const top = 2.6 - (s.y - 3) - 0.1
  g.cylinder(0.5, 0.35, at(0, 0, 0), IRON, 10)
  g.cylinder(0.24, 0.25, at(0, top, 0), IRON_L, 8)
  g.box(0.06, 0.06, 1.7, at(0, top + 0.12, 0), IRON)
  g.cylinder(0.24, 0.4, at(0, top + 0.12, 0.95, 0, Math.PI / 2, 0), IRON, 4, 0)
  g.box(0.04, 0.5, 0.6, at(0, top + 0.18, -0.75), (_x, y) => (y > 0.05 ? OCHRE : CLOTH))
  g.sphere(0.16, at(0, top + 0.12, 0), BRASS2, 6)
}
const BRASS2: RGB = [0.78, 0.58, 0.26]

// ── 6. chão de lajes de arenito: fiadas desencontradas (largura sorteada), cada laje com a quina de cima
// clara, tons em manchas largas, rejunte escuro, uma laje rachada de vez em quando; meio-fio de blocos nas
// bordas compridas; sombra de contato debaixo das moendas ──
export function moinhosFloor(g: SoftGeo, p: Pad): boolean {
  if (p.k !== 1 || p.f < 0.9 || p.gh !== 0 || p.y2 !== p.y || p.hx < 1) return false
  const y = p.y + 0.035
  const W = p.hx * 2 - 0.5
  const D = p.hz * 2 - 0.2
  g.box(W + 0.1, 0.03, D + 0.05, at(p.x, y - 0.02, p.z), mix(SAND_D, IRON, 0.35))
  const RH = 1.5
  const rows = Math.max(1, Math.round(D / RH))
  const rh = D / rows
  for (let j = 0; j < rows; j++) {
    const cz = p.z - D / 2 + (j + 0.5) * rh
    let x = p.x - W / 2
    let i = 0
    while (x < p.x + W / 2 - 0.05) {
      let w = 1.1 + n01(i, j, p.z) * 1.4
      if (x + w > p.x + W / 2 - 0.5) w = p.x + W / 2 - x
      const cx = x + w / 2
      const patch = Math.sin(cx * 0.23 + cz * 0.11) * 0.5 + 0.5
      const tone = n01(i, j, 3) < 0.1 ? mix(SAND, TERRA, 0.45) : mix(mix(SAND, SAND_L, 0.4), SAND_D, patch * 0.45)
      g.box(w - 0.09, 0.05, rh - 0.09, at(cx, y + 0.01, cz), (_x, yy) => (yy > 0 ? tone : mix(tone, SAND_D, 0.5)))
      // quina clara de cima (lado da luz) e a lasca
      g.box(w - 0.12, 0.012, 0.07, at(cx, y + 0.04, cz + rh / 2 - 0.1), mix(tone, SAND_L, 0.55))
      if (n01(i, j, 7) < 0.14) {
        g.box(0.05, 0.012, rh * 0.7, at(cx + (n01(i, j, 8) - 0.5) * w * 0.5, y + 0.041, cz, (n01(i, j, 9) - 0.5) * 0.8), mix(SAND_D, IRON, 0.5))
      }
      x += w
      i++
    }
  }
  // meio-fio nas bordas compridas: blocos de alturas alternadas (silhueta quebrada), base escura
  if (p.hz > 3) {
    for (const s of [-1, 1]) {
      const n = Math.round((p.hz * 2) / 1.25)
      for (let k = 0; k < n; k++) {
        const z = p.z - p.hz + (k + 0.5) * ((p.hz * 2) / n)
        const h = 0.22 + (k % 3 === 0 ? 0.14 : 0) + n01(k, s, p.z) * 0.06
        g.box(0.5, h, (p.hz * 2) / n - 0.08, at(p.x + s * (p.hx - 0.22), p.y + h / 2, z), (_x, yy) => (yy > h / 2 - 0.06 ? SAND_L : yy < -h / 2 + 0.08 ? SAND_D : SAND))
      }
    }
  }
  return true
}

export function moinhosDrumShadows(g: SoftGeo, course: Course) {
  for (const d of course.drums) {
    const len = d.rings.reduce((a, r) => a + r.len, 0)
    g.box(d.R * 2.3, 0.01, len + 0.6, at(d.x, d.y - 0.25 + 0.085, d.z0 + len / 2), mix(SAND_D, IRON, 0.5))
  }
}

// ── 7. o marco: moinho de pedra numa mesa do cânion — torre de arenito em fiadas que afina, porta e janelas
// acesas, varanda de madeira, capuz de telhas e as quatro velas de grade e lona que giram de frente para a
// trilha. Dois: o grande ao lado das mós e um menor do outro lado, perto dos blocos ──
function millTower(st: SoftGeo, glow: SoftGeo, x: number, z: number, S: number, face: number) {
  // a mesa de pedra que sai da água (três degraus, a de baixo molhada)
  for (let b = 0; b < 3; b++) {
    const r = (6.2 - b * 0.9) * S
    st.cylinder(r * 2, 1.6 * S, at(x, 0.8 * S + b * 1.6 * S - 0.6, z, b * 0.7), (_x, y) => mix([SAND_D, TERRA, SAND][b], y > 0.5 * S ? SAND_L : SAND_D, 0.3), 9, r * 2 - 0.5 * S)
  }
  const y0 = 4.2 * S
  const H = 15 * S
  const nC = 10
  for (let c = 0; c < nC; c++) {
    const t0 = c / nC
    const r0 = (3.6 - 1.2 * t0) * S
    const r1 = (3.6 - 1.2 * (t0 + 1 / nC)) * S
    const tone = mix(mix(SAND, SAND_L, 0.3), c % 3 === 1 ? TERRA : SAND_D, 0.12 + n01(c, x) * 0.2)
    st.cylinder(r0 * 2, H / nC - 0.06 * S, at(x, y0 + (c + 0.5) * (H / nC), z, c * 0.2), (_x, y) => (y > H / nC / 2 - 0.25 * S ? mix(tone, SAND_L, 0.35) : tone), 12, r1 * 2)
  }
  const top = y0 + H
  const rt = 2.4 * S
  // varanda de madeira a 2/3: piso, guarda-corpo e as mãos-francesas
  const gy = y0 + H * 0.62
  const gr = (3.6 - 1.2 * 0.62) * S + 1.0 * S
  st.cylinder(gr * 2, 0.3 * S, at(x, gy, z), (_x, y) => (y > 0 ? WOOD_L : WOOD), 16)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    st.box(0.14 * S, 1.1 * S, 0.14 * S, at(x + Math.sin(a) * (gr - 0.1 * S), gy + 0.6 * S, z + Math.cos(a) * (gr - 0.1 * S)), WOOD)
    if (k % 2 === 0) st.box(0.18 * S, 1.3 * S, 0.18 * S, at(x + Math.sin(a) * (gr - 0.6 * S), gy - 0.7 * S, z + Math.cos(a) * (gr - 0.6 * S), a, 0.6), WOOD)
  }
  st.torus(gr * 2 - 0.2 * S, 0.1 * S, at(x, gy + 1.15 * S, z), WOOD_L, 24)
  // porta e janelas acesas (gradiente) com moldura de madeira, viradas para a trilha
  const fa = face > 0 ? Math.PI / 2 : -Math.PI / 2
  const win = (y: number, r: number, w: number, h: number) => {
    const wx = x + Math.sin(fa) * (r + 0.05 * S)
    const wz = z + Math.cos(fa) * (r + 0.05 * S)
    st.box(w + 0.3 * S, h + 0.3 * S, 0.2 * S, at(wx, y, wz, fa), WOOD)
    glow.box(w, h, 0.12 * S, at(wx + Math.sin(fa) * 0.06 * S, y, wz + Math.cos(fa) * 0.06 * S, fa), (_x, yy) => mix([1, 0.5, 0.15], [1, 0.86, 0.5], yy / h + 0.5))
    st.box(0.12 * S, h, 0.16 * S, at(wx + Math.sin(fa) * 0.12 * S, y, wz + Math.cos(fa) * 0.12 * S, fa), WOOD)
  }
  win(y0 + 1.3 * S, 3.5 * S, 1.4 * S, 2.4 * S)
  win(y0 + H * 0.4, (3.6 - 1.2 * 0.4) * S, 0.8 * S, 1.2 * S)
  win(y0 + H * 0.82, (3.6 - 1.2 * 0.82) * S, 0.7 * S, 1.0 * S)
  // capuz: telhas em fiadas (cone em anéis alternados) e o pináculo
  for (let k = 0; k < 5; k++) {
    const ra = rt * 1.25 * (1 - k / 5) + 0.1 * S
    const rb = rt * 1.25 * (1 - (k + 1) / 5) + 0.1 * S
    st.cylinder(ra * 2, 0.9 * S, at(x, top + 0.45 * S + k * 0.85 * S, z), k % 2 ? TERRA : mix(TERRA, SAND_D, 0.4), 14, rb * 2)
  }
  st.cylinder(0.2 * S, 1.6 * S, at(x, top + 5 * S, z), IRON, 6)
  st.sphere(0.4 * S, at(x, top + 5.8 * S, z), OCHRE, 6)
  return { hubX: x + face * (rt + 1.2 * S), hubY: top - 0.4 * S, hubZ: z }
}

function millSails(g: SoftGeo, S: number) {
  // cubo de madeira com aro de ferro (eixo local = x) e quatro velas de grade com lona
  g.cylinder(1.6 * S, 1.2 * S, at(0, 0, 0, 0, 0, Math.PI / 2), WOOD, 10)
  g.torus(1.65 * S, 0.12 * S, at(0.3 * S, 0, 0, 0, 0, Math.PI / 2), IRON, 12)
  g.cylinder(0.5 * S, 0.6 * S, at(0.75 * S, 0, 0, 0, 0, Math.PI / 2), IRON_L, 8)
  const L = 9.5 * S
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    // peça no plano da vela (y = ao longo do braço, z = largura), girada por a em volta de x
    const arm = (lx: number, ly: number, lz: number, w: number, h: number, d: number, paint: RGB | ((x: number, y: number, z: number) => RGB)) => {
      const c = Math.cos(a)
      const s = Math.sin(a)
      g.box(w, h, d, at(lx, ly * c - lz * s, ly * s + lz * c, 0, a), paint)
    }
    arm(0.4 * S, L / 2 + 0.6 * S, 0, 0.35 * S, L, 0.4 * S, (_x, y) => (y > 0 ? WOOD_L : WOOD))
    // a grade: travessas e a vara de borda
    for (let j = 0; j < 9; j++) arm(0.45 * S, 1.8 * S + j * 0.95 * S, 0.9 * S, 0.12 * S, 0.1 * S, 1.8 * S, WOOD_L)
    arm(0.45 * S, L / 2 + 1.5 * S, 1.8 * S, 0.12 * S, L - 2 * S, 0.1 * S, WOOD)
    // lona em gomos de tom, a ponta listrada de ocre
    arm(0.5 * S, L / 2 + 1.5 * S, 0.9 * S, 0.04 * S, L - 2.4 * S, 1.6 * S, (_x, y) => (y > L / 2 - 2.6 * S ? mix(CLOTH, OCHRE, 0.5) : Math.floor(y / (1.5 * S) + 10) % 2 ? CLOTH : mix(CLOTH, SAND_D, 0.18)))
  }
}

export class MoinhosMills {
  private readonly meshes: Mesh[] = []
  private readonly nodes: TransformNode[] = []
  private readonly hubs: TransformNode[] = []

  constructor(scene: Scene, toy: Material, glowMat: Material, course: Course) {
    const st = new SoftGeo()
    const glow = new SoftGeo()
    const disc = course.pads.find((p) => p.k === 0 && p.r >= 5)
    const zBig = disc ? disc.z + 8.5 : 108
    const spots: [number, number, number, number][] = [
      [19, zBig, 1, -1],
      [-21, 64, 0.72, 1],
    ]
    for (const [x, z, S, face] of spots) {
      const h = millTower(st, glow, x, z, S, face)
      const node = new TransformNode("moinhos-sails", scene)
      node.position.set(h.hubX, h.hubY, h.hubZ)
      if (face < 0) node.rotation.y = Math.PI
      const spin = new TransformNode("moinhos-sails-spin", scene)
      spin.parent = node
      const g = new SoftGeo()
      millSails(g, S)
      const m = g.build("moinhos-sails-m", scene, toy, false)
      m.parent = spin
      this.meshes.push(m)
      this.nodes.push(node, spin)
      this.hubs.push(spin)
    }
    this.meshes.push(st.build("moinhos-towers", scene, toy, true))
    this.meshes.push(glow.build("moinhos-towers-lit", scene, glowMat, true))
  }

  update(t: number) {
    this.hubs.forEach((h, i) => (h.rotation.x = t * (0.42 + i * 0.13)))
  }

  dispose() {
    for (const m of this.meshes) m.dispose()
    for (const n of this.nodes) n.dispose()
  }
}
