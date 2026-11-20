// features/meu-mundo/gincana/engine/portoes-view.ts — Portões de Gelo (2ª fase do Mar de Gelo, 2026-11-20):
// o desenho próprio da prova "portas falsas que estreitam", peça por peça (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma corrida de portas falsas num party game — só o TIPO de prova e a riqueza de
// detalhe; nada de traçado, personagem, logotipo, cor de marca ou arte do jogo do vídeo)
// O que é:     corrida pelo Domínio do Mar de Gelo (Nívea): nove fileiras de portões de gelo talhado entre
//              colunas de cristal, cada fileira mais estreita (8 → 2 portões); o de verdade estilhaça em cacos,
//              o falso é parede (treme e racha). Lago de gelo liso, blocos de gelo que deslizam, estalactites.
// Silhueta:    paredes de 3,4 m cortadas em portões, colunas de cristal que passam do topo (4,6 m) com gorro de
//              neve, viga de neve com pingentes; a fileira fica mais curta e mais alta à medida que estreita.
// Massas:      portão 3–5 × 3,4 × 0,42 (maior) · coluna r 0,35 × 4,6 · viga 24 × 0,5 · lago 18 × 34 · bloco
//              2,4 × 1,8 · estalactite 1,9 × 2,3.
// Paleta:      gelo fundo (0,16/0,36/0,58) → gelo (0,42/0,66/0,86) → quina (0,8/0,93/1), neve (0,94/0,97/1),
//              cristal da coluna (0,22/0,42/0,62), pedra escura (0,2/0,24/0,3), luz fria (0,55/0,95/1) e o
//              acento quente pequeno: lampião âmbar (1/0,72/0,3).
// 70/20/10:    70 gelo e neve, 20 azul fundo do cristal, 10 luz fria e o âmbar dos lampiões.
// Material:    cristal (gelo), neve, pedra.
// Fora:        portas coloridas, arcos infláveis, fundo de céu claro e qualquer interface do vídeo.
// Inventado:   o lado de trás (igual à frente), o floco talhado no meio do portão e o lampião das colunas.
//
// PARTES (ordem de construção)
// 1. portão de gelo — grande: a laje com gradiente (fundo embaixo, claro em cima); médio: painel rebaixado
//    nas duas faces, floco talhado aceso, gorro de neve no topo; pequeno: rachaduras, cristais de geada,
//    neve no pé, lasca clara nas quinas.
// 2. colunas de cristal entre os portões + viga de neve com pingentes + lampião.
// 3. estilhaço (o de verdade) e a racha (o falso).
// 4. gelo liso do lago e do corredor — 5. bloco de gelo que desliza — 6. estalactite — 7. arredores.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { DECK, type Course, type Door, type Pad } from "../sim/course"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const ICE_D: RGB = [0.16, 0.36, 0.58]
const ICE: RGB = [0.42, 0.66, 0.86]
const ICE_L: RGB = [0.8, 0.93, 1]
const SNOW: RGB = [0.94, 0.97, 1]
const SNOW_S: RGB = [0.72, 0.8, 0.9]
const COLD: RGB = [0.55, 0.95, 1]

/** Ruído barato e fixo (0–1). */
function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

/** Largura de desenho de cada portão: 3 tipos (a instância escala o resto, no máximo ±8%). */
const KINDS = [3.25, 3.8, 5]
function kindOf(w: number) {
  let best = 0
  for (let i = 1; i < KINDS.length; i++) if (Math.abs(KINDS[i] - w) < Math.abs(KINDS[best] - w)) best = i
  return best
}

// ── 1. portão de gelo ──
function iceGate(g: SoftGeo, gl: SoftGeo, W0: number, H: number) {
  const W = W0 - 0.14
  const D = 0.42
  // a laje: fundo embaixo → claro em cima, quina clara, veios verticais suaves
  g.roundBox(W, H, D, 0.1, at(0, H / 2, 0), (x, y) => {
    const k = Math.min(1, Math.max(0, y / H))
    const vein = Math.sin(x * 5.3 + Math.sin(y * 1.7) * 1.2) * 0.5 + 0.5
    return mix(mix(ICE_D, ICE, 0.35 + k * 0.6), ICE_L, vein * 0.12 + (Math.abs(x) > W / 2 - 0.12 ? 0.35 : 0))
  }, 4)
  for (const s of [-1, 1]) {
    const z = s * (D / 2)
    // painel rebaixado (mais fundo) com moldura clara em relevo
    const pw = W - 0.62
    const ph = H - 0.95
    const py = 0.45 + ph / 2
    g.box(pw + 0.16, 0.08, 0.05, at(0, py + ph / 2 + 0.04, z + s * 0.012), ICE_L)
    g.box(pw + 0.16, 0.08, 0.05, at(0, py - ph / 2 - 0.04, z + s * 0.012), mix(ICE, ICE_L, 0.4))
    for (const sx of [-1, 1]) g.box(0.08, ph, 0.05, at(sx * (pw / 2 + 0.04), py, z + s * 0.012), mix(ICE, ICE_L, 0.6))
    // o fundo do painel: geada clara nas bordas → gelo fundo no miolo (radial), com ondas de veio
    g.roundBox(pw, ph, 0.03, 0.01, at(0, py, z + s * 0.004), (x, y) => {
      const e = Math.max(Math.abs(x) / (pw / 2), Math.abs(y) / (ph / 2))
      const frost = Math.max(0, (e - 0.6) / 0.4)
      return mix(mix(ICE_D, ICE, 0.18 + (y + ph / 2) / ph * 0.3 + Math.sin(x * 7 + y * 3) * 0.06), ICE_L, frost * frost * 0.75)
    }, 1)
    // cachos de cristal nos cantos de baixo: prismas de 6 lados, pontudos, abrindo em leque
    for (const fx of [-1, 1]) {
      for (let c = 0; c < 4; c++) {
        const L = 0.62 - c * 0.12
        const lean = fx * (0.15 + c * 0.32)
        const bx = fx * (pw / 2 + 0.05)
        g.cylinder(0.16 - c * 0.02, L, at(bx - fx * Math.sin(Math.abs(lean)) * L * 0.5, 0.42 + Math.cos(lean) * L * 0.5, z + s * 0.08, 0, 0, lean), (_x, y) => (y > L * 0.2 ? ICE_L : mix(ICE, ICE_L, 0.4)), 6, 0.02)
      }
    }
    // bolhas presas no gelo (pontinhos claros em cachos)
    for (let c = 0; c < 14; c++) {
      const bx = (n01(c, 21, s) - 0.5) * (pw - 0.5)
      const by = py + (n01(c, 23, s) - 0.5) * (ph - 0.5)
      if (Math.abs(bx) < 0.7 && Math.abs(by - py) < 0.7) continue
      g.box(0.05 + n01(c, 5, 1) * 0.04, 0.05 + n01(c, 6, 1) * 0.04, 0.02, at(bx, by, z + s * 0.022), mix(ICE_L, SNOW, 0.5))
    }
    // floco talhado aceso: 3 hastes com as pontinhas (o mesmo em todo portão: o falso é igual por fora)
    const fy = py + ph * 0.08
    const R = Math.min(pw, ph) * 0.3
    for (let a = 0; a < 3; a++) {
      const r = (a / 3) * Math.PI
      gl.box(R * 2, 0.07, 0.03, at(0, fy, z + s * 0.03, 0, 0, r), COLD)
      for (const e of [-1, 1]) {
        const ex = Math.cos(r) * R * 0.62 * e
        const ey = Math.sin(r) * R * 0.62 * e
        for (const b of [-1, 1]) gl.box(R * 0.42, 0.05, 0.03, at(ex, fy + ey, z + s * 0.03, 0, 0, r + b * 0.8), COLD)
      }
    }
    gl.box(0.16, 0.16, 0.03, at(0, fy, z + s * 0.035, 0, 0, Math.PI / 4), [0.85, 1, 1])
    // rachaduras finas e claras (riscos tortos que partem dos cantos)
    for (let c = 0; c < 5; c++) {
      const cx = (n01(c, s, W0) - 0.5) * (pw - 0.3)
      const cy = 0.6 + n01(c, s + 3, W0) * (ph - 0.4)
      let ang = n01(c, 7, s) * Math.PI
      let px = cx
      let pyy = cy
      for (let seg = 0; seg < 3; seg++) {
        const L = 0.22 + n01(c, seg, s) * 0.3
        g.box(L, 0.022, 0.02, at(px, pyy, z + s * 0.022, 0, 0, ang), ICE_L)
        px += Math.cos(ang) * L * 0.5
        pyy += Math.sin(ang) * L * 0.5
        ang += (n01(seg, c, 2) - 0.5) * 1.4
      }
    }
    // cristais de geada (pequenos) no pé e nos cantos
    for (let c = 0; c < 9; c++) {
      const cx = (n01(c, 11, s) - 0.5) * (W - 0.2)
      const cy = 0.08 + n01(c, 13, s) * 0.5
      g.box(0.07, 0.07, 0.04, at(cx, cy, z + s * 0.02, 0, 0, n01(c, 2, 9) * 3), SNOW)
    }
    // neve encostada no pé (sombra de contato: base mais escura)
    for (let c = 0; c < Math.round(W / 0.5); c++) {
      const cx = -W / 2 + 0.25 + c * 0.5 + (n01(c, s, 4) - 0.5) * 0.15
      const sz = 0.38 + n01(c, s, 5) * 0.22
      g.sphere(sz, at(cx, 0.04, z + s * 0.1), (_x, y) => (y < -0.02 ? SNOW_S : SNOW), 6, 1.4, 0.55, 0.9)
    }
  }
  // gorro de neve no topo (bolotas achatadas que passam um pouco da borda)
  for (let c = 0; c < Math.round(W / 0.42); c++) {
    const cx = -W / 2 + 0.22 + c * 0.42 + (n01(c, 1, 8) - 0.5) * 0.12
    const sz = 0.42 + n01(c, 2, 8) * 0.18
    g.sphere(sz, at(cx, H + 0.02, (n01(c, 3, 8) - 0.5) * 0.08), (_x, y) => (y < 0 ? SNOW_S : SNOW), 6, 1.3, 0.5, 1.3)
  }
}

// ── 2. colunas de cristal, viga de neve com pingentes, lampião âmbar ──
const CRYS: RGB = [0.3, 0.52, 0.74]
const CRYS_D: RGB = [0.14, 0.26, 0.44]
const STONE: RGB = [0.32, 0.36, 0.44]
const AMBER: RGB = [1, 0.72, 0.3]

function pillar(g: SoftGeo, gl: SoftGeo, x: number, z: number, H: number, end: boolean, seed: number) {
  const d = end ? 0.95 : 0.66
  const top = DECK + H + (end ? 1.9 : 1.15)
  // pé de pedra escura (sombra de contato embaixo) com neve no degrau
  g.roundBox(d + 0.36, 0.42, d + 0.5, 0.06, at(x, DECK + 0.21, z), (_x, y) => (y < -0.1 ? [0.2, 0.22, 0.28] : STONE), 3)
  for (let c = 0; c < 5; c++) {
    const a = (c / 5) * Math.PI * 2 + seed
    g.sphere(0.34, at(x + Math.cos(a) * (d / 2 + 0.12), DECK + 0.44, z + Math.sin(a) * (d / 2 + 0.2)), SNOW, 6, 1.3, 0.45, 1.3)
  }
  // o fuste: prisma de cristal de 6 lados, fundo embaixo → claro em cima, aresta clara
  const fh = top - DECK - 0.42
  g.cylinder(d, fh, at(x, DECK + 0.42 + fh / 2, z, Math.PI / 6), (px, y, pz) => {
    const k = (y + fh / 2) / fh
    const edge = Math.abs(Math.sin(Math.atan2(pz, px) * 3)) > 0.93
    return edge ? ICE_L : mix(CRYS_D, CRYS, 0.3 + k * 0.6)
  }, 6)
  // cintas de gelo claro (médio) e o filete aceso nas duas faces (frente e trás)
  for (const fy of [0.35, 0.72]) g.cylinder(d + 0.1, 0.12, at(x, DECK + 0.42 + fh * fy, z, Math.PI / 6), mix(ICE, ICE_L, 0.5), 6)
  for (const fz of [-1, 1]) gl.box(0.07, fh * 0.55, 0.03, at(x, DECK + 0.42 + fh * 0.53, z + fz * (d * 0.44)), COLD)
  // ponta: cristal pontudo + gorro de neve
  g.cylinder(d * 0.9, 0.7, at(x, top + 0.35, z, Math.PI / 6), ICE_L, 6, 0.04)
  g.sphere(d + 0.3, at(x, top + 0.02, z), (_x, y) => (y < 0 ? SNOW_S : SNOW), 7, 1.1, 0.42, 1.1)
  if (end) {
    // lampião âmbar no braço de ferro (o acento quente, 10%)
    for (const fz of [-1, 1]) {
      const lz = z + fz * (d / 2 + 0.35)
      g.box(0.08, 0.08, 0.5, at(x, DECK + H + 0.4, z + fz * (d / 2 + 0.15)), [0.12, 0.12, 0.14])
      g.roundBox(0.34, 0.08, 0.34, 0.02, at(x, DECK + H + 0.36, lz), [0.12, 0.12, 0.14], 2)
      g.roundBox(0.34, 0.08, 0.34, 0.02, at(x, DECK + H - 0.1, lz), [0.12, 0.12, 0.14], 2)
      gl.box(0.24, 0.38, 0.24, at(x, DECK + H + 0.13, lz), AMBER)
    }
  }
}

function lintel(g: SoftGeo, x0: number, x1: number, z: number, H: number, seed: number) {
  const y = DECK + H + 0.34
  const span = x1 - x0
  // viga de neve batida: corpo azulado embaixo, branco em cima
  g.roundBox(span, 0.44, 0.62, 0.12, at((x0 + x1) / 2, y, z), (_x, yy) => (yy < -0.08 ? mix(SNOW_S, ICE, 0.25) : SNOW), 4)
  // neve em bolotas por cima (silhueta quebrada)
  for (let c = 0; c < Math.round(span / 0.55); c++) {
    const cx = x0 + 0.3 + c * 0.55 + (n01(c, seed, 1) - 0.5) * 0.2
    g.sphere(0.5 + n01(c, seed, 2) * 0.25, at(cx, y + 0.22, z + (n01(c, seed, 3) - 0.5) * 0.15), SNOW, 6, 1.2, 0.5, 1.1)
  }
  // pingentes: tamanhos variados, em grupos (mais em uns trechos, quase nada em outros)
  for (let c = 0; c < Math.round(span / 0.32); c++) {
    const cx = x0 + 0.16 + c * 0.32
    const dens = Math.sin(cx * 0.9 + seed) * 0.5 + 0.5
    if (n01(c, seed, 4) > dens * 0.9 + 0.1) continue
    const L = 0.18 + n01(c, seed, 5) * 0.55 * (0.4 + dens)
    for (const fz of [-1, 1]) {
      if (n01(c, seed + fz, 6) < 0.3) continue
      g.cylinder(0.11, L, at(cx + fz * 0.04, y - 0.2 - L / 2, z + fz * 0.24), (_x, yy) => (yy > 0 ? ICE_L : mix(ICE_L, SNOW, 0.6)), 5, 0.0)
    }
  }
}

// ── 4. gelo liso (pads com atrito baixo): placas com racha entre elas, gelo fundo no miolo, riscos de
// patins, bolhas presas e neve amontoada nas bordas ──
export function portoesFloor(g: SoftGeo, _gl: SoftGeo, p: Pad) {
  if (p.f >= 0.9 || p.k !== 1 || p.gh !== 0 || p.y2 !== p.y) return
  const y = p.y + 0.06
  const S = 2.1
  const nx = Math.max(2, Math.round((p.hx * 2 - 0.6) / S))
  const nz = Math.max(2, Math.round((p.hz * 2 - 0.4) / S))
  const sx = (p.hx * 2 - 0.6) / nx
  const sz = (p.hz * 2 - 0.4) / nz
  // a "rachadura" é o vão claro entre as placas: um tampo claro por baixo
  g.box(p.hx * 2 - 0.5, 0.03, p.hz * 2 - 0.3, at(p.x, y - 0.03, p.z), mix(ICE_L, SNOW, 0.3))
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const cx = p.x - p.hx + 0.3 + (i + 0.5) * sx + (n01(i, j, 1) - 0.5) * sx * 0.25
      const cz = p.z - p.hz + 0.2 + (j + 0.5) * sz + (n01(i, j, 2) - 0.5) * sz * 0.25
      const r = Math.min(sx, sz) * (0.56 + n01(i, j, 3) * 0.08)
      // tom da placa em manchas largas (2–3 tons): fundo, médio e uma geada clara de vez em quando
      const tone = Math.sin(cx * 0.21 + cz * 0.13) * 0.5 + 0.5
      const deep = n01(i, j, 4) < 0.12 ? mix(ICE, ICE_L, 0.5) : mix(ICE_D, ICE, 0.25 + tone * 0.5)
      g.cylinder(r * 2, 0.04, at(cx, y, cz, n01(i, j, 5) * 6), (x, _y, z) => {
        const e = Math.min(1, Math.hypot(x, z) / r)
        return mix(deep, ICE_L, e > 0.78 ? (e - 0.78) * 2.6 : 0)
      }, 6)
      // bolhas presas em algumas placas
      if (n01(i, j, 6) < 0.35) {
        for (let b = 0; b < 4; b++) {
          const a = n01(i, j, 7 + b) * 6.28
          const rr = n01(j, i, 9 + b) * r * 0.6
          g.box(0.07, 0.01, 0.07, at(cx + Math.cos(a) * rr, y + 0.022, cz + Math.sin(a) * rr, a), mix(ICE_L, SNOW, 0.6))
        }
      }
    }
  }
  // riscos de patins: curvas longas e finas, claras, correndo para +z
  for (let k = 0; k < Math.round(p.hz * 0.9); k++) {
    let x = p.x + (n01(k, 31) - 0.5) * (p.hx * 2 - 2)
    let z = p.z - p.hz + 1 + n01(k, 32) * (p.hz * 2 - 6)
    let a = (n01(k, 33) - 0.5) * 0.6
    for (let s = 0; s < 4; s++) {
      const L = 1.1 + n01(k, s) * 0.8
      g.box(0.05, 0.008, L, at(x, y + 0.025, z + L / 2, a), SNOW)
      x += Math.sin(a) * L
      z += Math.cos(a) * L
      a += (n01(s, k, 34) - 0.5) * 0.5
    }
  }
  // neve amontoada nas duas bordas compridas (silhueta quebrada; mais escura no pé)
  for (const s of [-1, 1]) {
    for (let k = 0; k < Math.round(p.hz * 2 / 0.9); k++) {
      const z = p.z - p.hz + 0.45 + k * 0.9 + (n01(k, s, 41) - 0.5) * 0.3
      if (n01(k, s, 42) < 0.18) continue
      const sz2 = 0.6 + n01(k, s, 43) * 0.7
      g.sphere(sz2, at(p.x + s * (p.hx - 0.25 - n01(k, s, 44) * 0.2), y + 0.02, z), (_x, yy) => (yy < 0 ? SNOW_S : SNOW), 6, 1.2, 0.55, 1.4)
    }
  }
}

// ── 5. bloco de gelo que desliza: trenó de ferro e madeira com rebites de latão, o bloco talhado em cima
// (quina clara, rachas, geada no pé), neve no topo e pingentes nas bordas. Origem no chão, no centro. ──
const WOOD: RGB = [0.36, 0.24, 0.16]
const IRON_D: RGB = [0.12, 0.13, 0.16]
const BRASS: RGB = [0.8, 0.62, 0.26]
export function portoesBlock(g: SoftGeo, hx: number, hz: number, h: number) {
  const W = hx * 2
  const D = hz * 2
  // trenó: duas lâminas de ferro curvas na frente e atrás (desliza de lado: lâminas no eixo x)
  for (const sz of [-1, 1]) {
    g.box(W + 0.3, 0.1, 0.14, at(0, 0.06, sz * (D / 2 - 0.25)), IRON_D)
    for (const sx of [-1, 1]) g.cylinder(0.28, 0.14, at(sx * (W / 2 + 0.15), 0.16, sz * (D / 2 - 0.25), 0, Math.PI / 2, 0), IRON_D, 8)
  }
  g.box(W, 0.18, D - 0.2, at(0, 0.2, 0), (x) => (Math.abs(Math.sin(x * 4.2)) < 0.08 ? darker3(WOOD) : WOOD))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(0.1, 0.1, 0.1, at(sx * (W / 2 - 0.15), 0.32, sz * (D / 2 - 0.2)), BRASS)
  // o bloco: fundo embaixo → claro em cima; quina clara
  const bh = h - 0.3
  g.roundBox(W - 0.1, bh, D - 0.1, 0.12, at(0, 0.3 + bh / 2, 0), (x, y, z) => {
    const k = (y + bh / 2) / bh
    const edge = Math.abs(x) > W / 2 - 0.2 || Math.abs(z) > D / 2 - 0.2
    return mix(mix(ICE_D, ICE, 0.3 + k * 0.55), ICE_L, edge ? 0.4 : 0)
  }, 3)
  // rachas nas 4 faces
  for (let f = 0; f < 4; f++) {
    const a = (f / 4) * Math.PI * 2
    const fx = Math.sin(a)
    const fz = Math.cos(a)
    const half = f % 2 ? hx : hz
    for (let c = 0; c < 3; c++) {
      let u = (n01(f, c, 1) - 0.5) * (half * 1.4)
      let v = 0.6 + n01(f, c, 2) * (bh - 0.6)
      let ang = n01(f, c, 3) * Math.PI
      for (let s = 0; s < 3; s++) {
        const L = 0.2 + n01(f, c, s + 4) * 0.25
        const off = (f % 2 ? hx : hz) - 0.03
        g.box(L, 0.025, 0.02, at(fx * off + fz * u, v, fz * off - fx * u, a, 0, ang), ICE_L)
        u += Math.cos(ang) * L * 0.5
        v += Math.sin(ang) * L * 0.5
        ang += (n01(s, c, f) - 0.5) * 1.3
      }
    }
  }
  // neve no topo (bolotas que passam da borda) e pingentes nas bordas da frente e de trás
  for (let c = 0; c < 6; c++) {
    const cx = (n01(c, 1, 3) - 0.5) * (W - 0.5)
    const cz = (n01(c, 2, 3) - 0.5) * (D - 0.5)
    g.sphere(0.7 + n01(c, 3, 3) * 0.4, at(cx, h + 0.02, cz), (_x, y) => (y < 0 ? SNOW_S : SNOW), 6, 1.2, 0.45, 1.2)
  }
  for (const sz of [-1, 1]) {
    for (let c = 0; c < 6; c++) {
      const x = -W / 2 + 0.2 + c * ((W - 0.4) / 5)
      const L = 0.18 + n01(c, sz, 9) * 0.4
      g.cylinder(0.1, L, at(x, h - 0.08 - L / 2, sz * (D / 2 - 0.02)), ICE_L, 5, 0.0)
    }
  }
}
function darker3(c: RGB): RGB {
  return [c[0] * 0.6, c[1] * 0.6, c[2] * 0.6]
}

// ── 6. estalactite que balança: bloco de rocha congelada onde a corrente prende, cacho de pingentes
// pontudos PARA BAIXO (o maior no meio, que é a bola da regra: raio R na ponta) e geada. Origem no pivô. ──
export function portoesIcicle(g: SoftGeo, len: number, R: number) {
  // corrente de elos de ferro escuro (alternando o giro)
  const top = len - R * 2.6
  const n = Math.max(4, Math.round(top / 0.42))
  for (let k = 0; k < n; k++) g.torus(0.42, 0.1, at(0, -0.21 - k * 0.42, 0, k % 2 ? Math.PI / 2 : 0, 0, Math.PI / 2), k % 2 ? IRON_D : [0.2, 0.21, 0.25], 6)
  // rocha congelada (o "teto" que caiu): pedra escura com neve por cima
  const ry = -top - 0.1
  g.sphere(R * 1.5, at(0, ry, 0), (x, y) => (y > R * 0.18 ? SNOW : mix(STONE, ICE, 0.3 + Math.abs(Math.sin(x * 5)) * 0.3)), 7, 1, 0.6, 1)
  // o pingente grande (ponta embaixo, na altura da bola: -len) e quatro menores em volta
  const mainL = len - top
  g.cylinder(R * 1.25, mainL, at(0, ry - mainL / 2, 0, 0.3), (_x, y) => (y > mainL * 0.25 ? mix(ICE, ICE_L, 0.3) : y < -mainL * 0.3 ? ICE_L : mix(ICE, ICE_L, 0.6)), 7, 0.0)
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.4
    const L = mainL * (0.4 + n01(k, 1, 7) * 0.35)
    const r = R * 0.5
    g.cylinder(R * 0.6, L, at(Math.cos(a) * r, ry - L / 2 - 0.05, Math.sin(a) * r, a), (_x, y) => (y < -L * 0.2 ? ICE_L : mix(ICE, ICE_L, 0.45)), 6, 0.0)
  }
  // cristais de geada na rocha (pequenos)
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2
    g.box(0.12, 0.12, 0.12, at(Math.cos(a) * R * 0.7, ry + 0.05, Math.sin(a) * R * 1.05, a, 0.6, 0.6), ICE_L)
  }
}

/** Pórtico das estalactites: duas colunas de cristal grossas e a viga de gelo com pingentes. */
export function portoesSwingGantry(st: SoftGeo, glow: SoftGeo, x0: number, x1: number, z: number, py: number) {
  const H = py - DECK
  for (const x of [x0, x1]) pillar(st, glow, x, z, H - 1.4, true, x * 0.3)
  st.roundBox(x1 - x0 + 1.2, 0.7, 1.0, 0.2, at((x0 + x1) / 2, py + 0.3, z), (_x, y) => (y < -0.1 ? mix(ICE, ICE_L, 0.3) : mix(ICE_L, SNOW, 0.4)), 4)
  lintel(st, x0 - 0.4, x1 + 0.4, z, H + 0.15, z)
}

/** As molduras das fileiras (estáticas): colunas entre os portões + viga + pingentes. */
export function portoesFrames(st: SoftGeo, glow: SoftGeo, course: Course) {
  const rows = new Map<number, Door[]>()
  for (const d of course.doors) {
    const r = rows.get(d.row) ?? []
    r.push(d)
    rows.set(d.row, r)
  }
  for (const [row, ds] of rows) {
    const H = ds[0].h
    const z = ds[0].z
    const xs = ds.map((d) => d.x - d.hw).concat([ds[ds.length - 1].x + ds[ds.length - 1].hw])
    lintel(st, xs[0] - 0.3, xs[xs.length - 1] + 0.3, z, H, row * 3.1)
    xs.forEach((x, i) => pillar(st, glow, x, z, H, i === 0 || i === xs.length - 1, row + i * 0.7))
  }
}

/**
 * Os portões (instanciados por tipo de largura) + estilhaço/racha. Todos iguais por fora: só o toque revela.
 * Chamadas: 3 tipos × (portão + floco aceso) = 6.
 */
export class PortoesDoors {
  private readonly bases: Mesh[] = []
  private readonly items: { d: Door; door: InstancedMesh; lit: InstancedMesh; sx: number; shake: number; broke: boolean; hp: number }[] = []
  /** cacos (um só molde, instâncias reaproveitadas) */
  private readonly shards: { m: InstancedMesh; life: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; s: number }[] = []
  private nextShard = 0
  private lastClock = -1

  constructor(scene: Scene, toy: Material, glowMat: Material, course: Course) {
    const kinds = new Map<number, [Mesh, Mesh]>()
    for (const d of course.doors) {
      const k = kindOf(d.hw * 2)
      let pair = kinds.get(k)
      if (!pair) {
        const g = new SoftGeo()
        const gl = new SoftGeo()
        iceGate(g, gl, KINDS[k], d.h)
        const a = g.build(`portoes-door-${k}`, scene, toy, false)
        const b = gl.build(`portoes-door-lit-${k}`, scene, glowMat, false)
        a.isVisible = false
        b.isVisible = false
        this.bases.push(a, b)
        pair = [a, b]
        kinds.set(k, pair)
      }
      const sx = (d.hw * 2) / KINDS[k]
      const door = pair[0].createInstance(`portoes-door-${this.items.length}`)
      const lit = pair[1].createInstance(`portoes-door-lit-${this.items.length}`)
      for (const m of [door, lit]) {
        m.isPickable = false
        m.position.set(d.x, DECK, d.z)
        m.scaling.x = sx
      }
      this.items.push({ d, door, lit, sx, shake: -9, broke: false, hp: 0 })
    }
    // ── 3. o caco: lasca de 5 lados pontuda (clara na ponta), 120 no total
    const sg = new SoftGeo()
    sg.cylinder(0.3, 0.6, at(0, 0, 0), (_x, y) => (y > 0.05 ? ICE_L : mix(ICE, ICE_L, 0.3)), 5, 0.04)
    sg.box(0.22, 0.3, 0.06, at(0.08, -0.12, 0, 0, 0, 0.5), ICE)
    const sb = sg.build("portoes-shard", scene, toy, false)
    sb.isVisible = false
    this.bases.push(sb)
    for (let i = 0; i < 120; i++) {
      const m = sb.createInstance(`portoes-shard-${i}`)
      m.isPickable = false
      m.setEnabled(false)
      this.shards.push({ m, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, s: 1 })
    }
  }

  /** Solta `n` cacos do portão: `big` = estilhaço inteiro (o de verdade); senão, lasquinhas do topo (o falso). */
  private burst(d: Door, n: number, big: boolean, seed: number) {
    for (let k = 0; k < n; k++) {
      const sh = this.shards[this.nextShard]
      this.nextShard = (this.nextShard + 1) % this.shards.length
      const r = (j: number) => n01(seed, k, j)
      sh.life = big ? 1.1 + r(1) * 0.6 : 0.8 + r(1) * 0.3
      sh.x = d.x + (r(2) - 0.5) * d.hw * 1.8
      sh.y = DECK + (big ? 0.3 + r(3) * d.h * 0.9 : d.h - 0.1)
      sh.z = d.z + (r(4) - 0.5) * 0.3
      // o de verdade explode para a frente (+z, o lado de quem passou) e para cima; o falso só deixa cair
      sh.vx = (r(5) - 0.5) * (big ? 5 : 1.2)
      sh.vy = big ? 1.5 + r(6) * 4 : 0.3
      sh.vz = big ? 1.5 + r(7) * 4.5 : (r(7) - 0.5) * 1.5
      sh.rx = (r(8) - 0.5) * 14
      sh.ry = (r(9) - 0.5) * 14
      sh.s = big ? 0.6 + r(10) * 1.1 : 0.35 + r(10) * 0.3
      sh.m.setEnabled(true)
      sh.m.position.set(sh.x, sh.y, sh.z)
      sh.m.rotation.set(r(11) * 6, r(12) * 6, r(13) * 6)
      sh.m.scaling.setAll(sh.s)
    }
  }

  /** `t` = relógio da corrida (o que `world.doors` guarda); `clock` = relógio da tela. */
  update(t: number, clock: number, doors: ArrayLike<number>, hp?: ArrayLike<number>) {
    const dt = this.lastClock < 0 ? 0 : Math.min(0.05, Math.max(0, clock - this.lastClock))
    this.lastClock = clock
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]
      const s = doors[i]
      if (s >= 0) {
        // o de verdade: estilhaça (some e vira cacos) — uma vez; se a corrida recomeçar, volta inteiro
        if (!it.broke) {
          it.broke = true
          if (t - s < 1) this.burst(it.d, 16, true, i * 7.3 + s)
        }
        it.door.setEnabled(false)
        it.lit.setEnabled(false)
      } else {
        it.broke = false
        it.door.setEnabled(true)
        it.lit.setEnabled(true)
        if (s === -2 && it.shake < -1) {
          it.shake = clock
          this.burst(it.d, 4, false, i * 3.1 + clock)
        }
        // a de verdade levou mais uma batida (aguenta algumas): treme e solta lascas
        const h = hp ? hp[i] : 0
        if (h > it.hp) {
          it.shake = clock
          this.burst(it.d, 3 + h * 2, false, i * 5.7 + clock)
        }
        it.hp = h
        const age = clock - it.shake
        const dx = age >= 0 && age < 0.35 ? Math.sin(age * 60) * 0.08 * (1 - age / 0.35) : 0
        it.door.position.x = it.d.x + dx
        it.lit.position.x = it.d.x + dx
      }
    }
    // cacos: voo com gravidade, quicam no chão, encolhem no fim
    for (const sh of this.shards) {
      if (sh.life <= 0) continue
      sh.life -= dt
      if (sh.life <= 0) {
        sh.m.setEnabled(false)
        continue
      }
      sh.vy -= 16 * dt
      sh.x += sh.vx * dt
      sh.y += sh.vy * dt
      sh.z += sh.vz * dt
      const floor = DECK + 0.1 * sh.s
      if (sh.y < floor) {
        sh.y = floor
        sh.vy = Math.abs(sh.vy) * 0.3
        sh.vx *= 0.6
        sh.vz *= 0.6
        sh.rx *= 0.5
        sh.ry *= 0.5
      }
      sh.m.position.set(sh.x, sh.y, sh.z)
      sh.m.rotation.x += sh.rx * dt
      sh.m.rotation.y += sh.ry * dt
      sh.m.scaling.setAll(sh.s * Math.min(1, sh.life / 0.35))
    }
  }

  dispose() {
    for (const it of this.items) {
      it.door.dispose()
      it.lit.dispose()
    }
    for (const sh of this.shards) sh.m.dispose()
    for (const b of this.bases) b.dispose()
  }
}
