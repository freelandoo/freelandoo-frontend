// features/meu-mundo/gincana/engine/tanque-view.ts — Tanque de Óleo (3ª fase da Fábrica, 2026-11-20): o desenho
// próprio da prova "subida em zigue-zague com o líquido subindo" (rampas de aço que trocam de lado, patamares de
// grade, barris, prensas que deslizam, pistões de parede, ganchos de guindaste), peça por peça (skill
// meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma pista de obstáculos num party game — só o TIPO de prova e a riqueza de
// detalhe; nada de traçado, personagem, logotipo, cor de marca, interface ou arte do jogo do vídeo)
// O que é:     o interior de um tanque de óleo da Fábrica, aberto em cima: o óleo preto sobe; uma escada de
//              rampas de chapa xadrez presas em vigas, patamares de grade, as máquinas que empurram de lado.
// Silhueta:    rampas inclinadas em zigue-zague sobre colunas finas, a parede curva do tanque com cintas de
//              rebite, o guindaste em cima, pistões saindo de caixas na parede, o marcador de nível.
// Massas:      rampa 6,2 × 24 m (a do meio 9 × 18) · patamar 16,8 × 9 m · coluna 0,5 m · parede a 15 m do eixo.
// Paleta:      aço escuro (0,12/0,13/0,14 → quina 0,46/0,48/0,5), chapa xadrez (0,3/0,31/0,33), grade
//              (0,2/0,21/0,22 sobre o vão escuro), faixa de perigo (amarelo 0,95/0,72/0,08 e preto 0,06),
//              ferrugem (0,46/0,24/0,12), verde-petróleo da Fábrica (0,14/0,34/0,34), latão (0,78/0,56/0,24),
//              óleo (0,05/0,04/0,03) com o brilho laranja das lâmpadas (1/0,58/0,2).
// 70/20/10:    70 aço escuro e chapa, 20 verde-petróleo e ferrugem, 10 amarelo de perigo, latão e lâmpada.
// Material:    metal frio (chapa, grade, viga), metal quente (latão), óleo.
// Fora:        o chão colorido, os bonecos, o "slime" verde e as rosquinhas do vídeo; o traçado dele.
// Inventado:   a parede do tanque com o marcador de nível, o guindaste, os barris de óleo, as caixas dos pistões.
//
// PARTES (ordem de construção — §2)
// 1. piso — rampa de chapa xadrez com faixa de perigo e vigas embaixo; patamar de grade com moldura; colunas
//    descendo até o óleo com mão-francesa. (grande: o tampo; médio: vigas, faixa, moldura; pequeno: relevo
//    da chapa, barras da grade, rebites, a mancha de óleo)
// 2. barril de óleo (as bolas da 1ª rampa) — 3. prensa + trilho — 4. pistão de parede + caixa
// 5. gancho do guindaste + trave — 6. parede do tanque, marcador de nível, lâmpadas (marco)

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import type { Course, Glove, Pad } from "../sim/course"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const STEEL: RGB = [0.12, 0.13, 0.14]
const STEEL_L: RGB = [0.46, 0.48, 0.5]
const STEEL_D: RGB = [0.05, 0.05, 0.06]
const PLATE: RGB = [0.3, 0.31, 0.33]
const PLATE_L: RGB = [0.5, 0.51, 0.53]
const GRATE: RGB = [0.22, 0.23, 0.24]
const HAZ_Y: RGB = [0.95, 0.72, 0.08]
const HAZ_K: RGB = [0.06, 0.06, 0.06]
const RUST: RGB = [0.46, 0.24, 0.12]
const TEAL: RGB = [0.14, 0.34, 0.34]
const TEAL_L: RGB = [0.3, 0.52, 0.5]
const BRASS: RGB = [0.78, 0.56, 0.24]
const OIL: RGB = [0.05, 0.04, 0.03]
const LAMP: RGB = [1, 0.58, 0.2]

const n01 = (a: number, b = 0, c = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Ferrugem em ilhas e sujeira larga sobre uma cor (pelo lugar no mundo). */
function worn(base: RGB, x: number, z: number, k = 1): RGB {
  const r = Math.sin(x * 0.9 + z * 0.37) * Math.cos(z * 0.53 - x * 0.21)
  if (r > 0.72) return mix(base, RUST, 0.5 * k)
  const d = Math.sin(x * 0.23 + z * 0.11) * 0.5 + 0.5
  return mix(base, STEEL_D, d * 0.25 * k)
}

// ── 2. barril de óleo (as bolas da 1ª rampa): deitado no eixo x, rola em x como a bola. Tambor vermelho
// gasto com dois aros de rolagem saltados, a borda dobrada nas pontas, tampa escura com o bujão de latão,
// a etiqueta amarela de perigo e o escorrido de óleo ──
const DRUM: RGB = [0.62, 0.17, 0.12]
const DRUM_L: RGB = [0.86, 0.36, 0.24]
export function tanqueBarrel(g: SoftGeo, R: number) {
  const Lg = 2.2
  const ax = (x: number, y = 0, z = 0) => at(x, y, z, 0, 0, Math.PI / 2)
  // corpo: vermelho com sujeira em mancha, a faixa de cima (no giro) mais clara
  g.cylinder(R * 2, Lg - 0.1, ax(0), (x, y, z) => {
    const a = Math.atan2(z, x)
    const d = Math.sin(a * 3 + y * 2.1) * 0.5 + 0.5
    if (Math.sin(a * 2 - y * 1.3) > 0.82) return mix(DRUM, RUST, 0.6)
    return mix(mix(DRUM, DRUM_L, Math.max(0, Math.cos(a)) * 0.35), STEEL_D, d * 0.22)
  }, 20)
  // aros de rolagem (saltados) e a borda dobrada das pontas, quina clara
  for (const s of [-0.26, 0.26]) g.torus(R * 2 + 0.04, 0.09, ax(s * Lg), (x) => (x > 0 ? DRUM_L : DRUM), 22)
  for (const s of [-1, 1]) {
    g.torus(R * 2 - 0.02, 0.1, ax(s * (Lg / 2 - 0.05)), STEEL_L, 22)
    // tampa funda e escura, com o bujão de latão e o respiro
    g.cylinder(R * 2 - 0.14, 0.04, ax(s * (Lg / 2 - 0.08)), mix(DRUM, STEEL_D, 0.55), 20)
    g.cylinder(0.26, 0.08, at(s * (Lg / 2 - 0.04), R * 0.55, 0, 0, 0, Math.PI / 2), BRASS, 8)
    g.cylinder(0.14, 0.07, at(s * (Lg / 2 - 0.04), -R * 0.5, R * 0.2, 0, 0, Math.PI / 2), STEEL_L, 6)
  }
  // etiqueta de perigo em volta (entre os aros), listra preta diagonal e o losango do inflamável
  for (const a0 of [0, Math.PI]) {
    const y = Math.cos(a0) * (R + 0.005)
    const z = Math.sin(a0) * (R + 0.005)
    g.box(0.7, 0.02, 0.5, at(0, y, z, 0, a0), HAZ_Y)
    g.box(0.12, 0.025, 0.52, at(-0.18, y * 1.002, z, 0.6, a0), HAZ_K)
    g.box(0.12, 0.025, 0.52, at(0.18, y * 1.002, z, 0.6, a0), HAZ_K)
  }
  // escorrido de óleo saindo do bujão
  g.box(0.12, 0.012, 0.5, at(Lg / 2 - 0.35, R + 0.008, 0.2, 0.2), OIL)
}

// ── 1. piso: rampa de chapa xadrez e patamar de grade ─────────────────────────────────────────────────────
/** Desenha rampa (k 2) e patamar (k 1) do tanque; largada e chegada ficam com o desenho de sempre. */
export function tanqueFloor(g: SoftGeo, glow: SoftGeo, p: Pad): boolean {
  if (p.s === 0 || p.s === 6 || p.k === 0 || p.mw !== 0 || p.spin !== 0) return false
  const rise = p.y2 - p.y
  const ramp = rise !== 0
  const len = p.hz * 2
  const pitch = Math.atan2(rise, len)
  const L = Math.hypot(len, rise)
  const yc = (p.y + p.y2) / 2
  const frame = at(p.x, yc, p.z, p.rot, -pitch)
  const F = (lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) => at(lx, ly, lz, ry, rx, rz).multiply(frame)
  const W = p.hx * 2
  // tampo: a chapa de base (escura embaixo) e a moldura de cantoneira
  g.box(W, 0.32, L, F(0, -0.16, 0), (_x, y) => (y > 0.1 ? STEEL : STEEL_D))
  const inner = W - 1.1
  if (ramp) {
    // chapa xadrez em placas de 1,5 m (cada uma num tom, emenda escura) com o relevo em losango
    const PL = 1.5
    const nz = Math.round(L / PL)
    const pl = L / nz
    for (let j = 0; j < nz; j++) {
      const lz = -L / 2 + (j + 0.5) * pl
      const wz = p.z + (lz / L) * len
      const tone = worn(mix(PLATE, PLATE_L, n01(j, p.z) * 0.25), p.x, wz, 0.8)
      g.box(inner, 0.04, pl - 0.05, F(0, 0.02, lz), tone)
      // relevo: tracinhos alternados (ora num sentido, ora no outro), mais claros em cima
      const st = 0.42
      for (let a = -inner / 2 + st / 2, ia = 0; a < inner / 2 - 0.1; a += st, ia++) {
        for (let b = -pl / 2 + st / 2, ib = 0; b < pl / 2 - 0.1; b += st, ib++) {
          const yaw = (ia + ib) % 2 ? 0.78 : -0.78
          g.box(0.2, 0.025, 0.06, F(a, 0.05, lz + b, 0, yaw), mix(tone, PLATE_L, 0.55))
        }
      }
      // a emenda com rebites
      for (let a = -inner / 2 + 0.3; a < inner / 2; a += 0.75) g.box(0.07, 0.03, 0.07, F(a, 0.05, lz - pl / 2 + 0.06), STEEL_L)
    }
    // degraus de borracha (travas) a cada 3 m: barra escura com friso claro
    for (let lz = -L / 2 + 3; lz < L / 2 - 1; lz += 3) {
      g.box(inner, 0.07, 0.16, F(0, 0.07, lz), HAZ_K)
      g.box(inner, 0.02, 0.05, F(0, 0.11, lz + 0.05), PLATE_L)
    }
  } else {
    // grade: o vão escuro (óleo lá embaixo) e as barras de chapa em pé, travessas a cada 1 m
    g.box(inner, 0.02, L - 1.1, F(0, -0.02, 0), OIL)
    const bars = Math.round(inner / 0.32)
    for (let i = 0; i <= bars; i++) {
      const lx = -inner / 2 + (i / bars) * inner
      g.box(0.06, 0.12, L - 1.1, F(lx, 0.04, 0), (x, y, z) => (y > 0.03 ? worn(mix(GRATE, PLATE_L, 0.25), p.x + lx, p.z + z) : GRATE))
    }
    for (let lz = -L / 2 + 0.55 + 1; lz < L / 2 - 0.6; lz += 1) g.box(inner, 0.1, 0.05, F(0, 0.03, lz), GRATE)
    // a placa do meio, onde passa a trilha: chapa lisa com a seta para o próximo lado
    g.box(2.6, 0.05, 1.6, F(0, 0.09, 0), worn(PLATE, p.x, p.z))
    for (const sx of [-1, 1]) g.box(0.9, 0.02, 0.22, F(sx * 0.35, 0.12, 0, 0, sx * 0.7), HAZ_Y)
  }
  // faixa de perigo nas duas bordas compridas (listra diagonal) e a cantoneira clara por fora
  for (const sx of [-1, 1]) {
    const ex = sx * (W / 2 - 0.28)
    const n = Math.round(L / 0.5)
    for (let k = 0; k < n; k++) g.box(0.5, 0.05, L / n - 0.02, F(ex, 0.03, -L / 2 + (k + 0.5) * (L / n)), k % 2 ? HAZ_K : HAZ_Y)
    g.box(0.12, 0.42, L, F(sx * (W / 2 - 0.02), -0.05, 0), (_x, y) => (y > 0.15 ? STEEL_L : STEEL))
  }
  // pontas (patamar) com a mesma faixa
  if (!ramp) {
    for (const sz of [-1, 1]) {
      const n = Math.round(W / 0.5)
      for (let k = 0; k < n; k++) g.box(W / n - 0.02, 0.05, 0.5, F(-W / 2 + (k + 0.5) * (W / n), 0.03, sz * (L / 2 - 0.28)), k % 2 ? HAZ_K : HAZ_Y)
    }
  }
  // vigas I embaixo (duas compridas) e travessas
  for (const sx of [-0.62, 0.62]) {
    const bx = sx * (W / 2)
    g.box(0.5, 0.08, L - 0.2, F(bx, -0.36, 0), STEEL)
    g.box(0.1, 0.6, L - 0.2, F(bx, -0.68, 0), (x, y, z) => worn(TEAL, p.x + bx, p.z + z * 0.9, 0.7))
    g.box(0.5, 0.08, L - 0.2, F(bx, -1.0, 0), (_x, _y, z) => worn(TEAL_L, p.x + bx, p.z + z))
  }
  for (let lz = -L / 2 + 1; lz < L / 2; lz += 3) g.box(W * 0.62 * 2 / 2 + 0.4, 0.3, 0.14, F(0, -0.6, lz), STEEL)
  // colunas até o fundo do tanque (dentro do óleo), com mão-francesa e a base de concreto submersa
  const cols = ramp ? Math.max(2, Math.round(L / 8)) : 2
  for (let c = 0; c < cols; c++) {
    const u = cols === 1 ? 0.5 : c / (cols - 1)
    const lz = -L / 2 + 1.2 + u * (L - 2.4)
    const wz = p.z + (lz / L) * len
    const top = yc + (lz / L) * rise - 1.05
    for (const sx of [-0.62, 0.62]) {
      const cx = p.x + sx * (W / 2)
      const h = top + 2
      g.box(0.46, h, 0.46, at(cx, top - h / 2, wz), (_x, y) => (y > h / 2 - 0.5 ? TEAL_L : worn(TEAL, cx, wz + y)))
      // mão-francesa diagonal e chapa de base sob a viga
      g.box(0.14, 2.2, 0.14, at(cx, top - 0.9, wz + 0.8, 0, 0.6), TEAL)
      g.box(0.7, 0.08, 0.7, at(cx, top + 0.02, wz), STEEL_L)
    }
  }
  // gotas e mancha de óleo na chapa (pequeno)
  if (n01(p.z, p.x) > 0.2) {
    const lz = (n01(p.z, 3) - 0.5) * L * 0.6
    const lx = (n01(p.z, 4) - 0.5) * inner * 0.5
    g.sphere(1, F(lx, ramp ? 0.07 : 0.11, lz), OIL, 7, 1.2 + n01(p.z, 5) * 0.8, 0.02, 0.8)
  }
  // lâmpada de gaiola numa ponta do patamar (luz acesa, gaiola escura por cima)
  if (!ramp) {
    for (const sx of [-1, 1]) {
      const lx = sx * (W / 2 - 0.1)
      g.box(0.12, 1.4, 0.12, F(lx, 0.7, L / 2 - 0.3), STEEL)
      glow.sphere(0.36, F(lx, 1.45, L / 2 - 0.3), LAMP, 8)
      for (let k = 0; k < 4; k++) g.box(0.03, 0.42, 0.03, F(lx + Math.cos(k * 1.57) * 0.2, 1.45, L / 2 - 0.3 + Math.sin(k * 1.57) * 0.2), STEEL_D)
      g.cylinder(0.5, 0.08, F(lx, 1.68, L / 2 - 0.3), BRASS, 10)
    }
  }
  return true
}

// ── 5. gancho do guindaste (pêndulo): cabo de aço em elos, a polia de moitão (caixa verde com a roda
// de latão e a faixa de perigo) e o gancho em J de aço com a trava amarela; a bola de batida é o moitão ──
export function tanqueHook(g: SoftGeo, len: number, R: number) {
  const top = -len + R * 1.15
  // cabo duplo (dois fios descendo até o moitão) com braçadeiras
  for (const s of [-0.18, 0.18]) g.box(0.07, -top, 0.07, at(s, top / 2, 0), STEEL_D)
  for (let y = -0.8; y > top + 0.3; y -= 1.4) g.box(0.5, 0.1, 0.14, at(0, y, 0), STEEL_L)
  // moitão: caixa verde (quina clara), a roda de latão dos dois lados e a faixa de perigo embaixo
  const by = -len + R * 0.25
  g.box(R * 1.5, R * 1.7, R * 1.1, at(0, by, 0), (_x, y) => (y > R * 0.7 ? TEAL_L : mix(TEAL, TEAL_L, 0.35)))
  for (const s of [-1, 1]) {
    g.cylinder(R * 1.3, 0.12, at(0, by + R * 0.2, s * R * 0.58, 0, Math.PI / 2), BRASS, 16)
    g.cylinder(R * 0.4, 0.16, at(0, by + R * 0.2, s * R * 0.62, 0, Math.PI / 2), STEEL_D, 8)
  }
  const n = 6
  for (let i = 0; i < n; i++) g.box((R * 1.52) / n, R * 0.36, R * 1.12, at(-R * 0.76 + (i + 0.5) * ((R * 1.52) / n), by - R * 0.67, 0), i % 2 ? HAZ_K : HAZ_Y)
  // o gancho em J: haste, a curva (gomos) e a ponta; trava amarela fechando a boca
  const hy = by - R * 0.85
  g.cylinder(0.3, 0.6, at(0, hy - 0.3, 0), STEEL_L, 8)
  const r = R * 0.55
  const cy = hy - 0.6 - r
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI / 2 + (k / 8) * Math.PI * 1.25
    g.box(0.3, 0.3, 0.34, at(Math.cos(a + Math.PI / 2) * -r, cy + Math.sin(a + Math.PI / 2) * -r, 0, 0, 0, a), k % 4 === 0 ? STEEL_L : mix(STEEL, STEEL_L, 0.35))
  }
  g.box(0.08, r * 1.1, 0.08, at(r * 0.45, cy + r * 0.25, 0, 0, 0, 0.5), HAZ_Y)
}

// ── 4. pistão de parede: a cabeça (aríete de aço com face listrada de perigo e borda de borracha) e, fixa,
// a caixa do cilindro hidráulico presa numa coluna que desce até o óleo, com a mangueira e o manômetro ──
export function tanquePistonHead(g: SoftGeo, gv: Glove) {
  const R = gv.R
  const d = gv.dir
  // placa do aríete (face para onde soca) com listras e a borda escura de borracha
  g.box(0.36, R * 2, R * 2, at(0, 0, 0), STEEL)
  g.box(0.06, R * 1.8, R * 1.8, at(d * 0.2, 0, 0), (_x, y, z) => (Math.floor((y + z) / 0.32 + 100) % 2 ? HAZ_Y : HAZ_K))
  for (const s of [-1, 1]) {
    g.box(0.2, 0.16, R * 2.1, at(d * 0.12, s * R, 0), HAZ_K)
    g.box(0.2, R * 2.1, 0.16, at(d * 0.12, 0, s * R), HAZ_K)
  }
  // parafusos nos cantos e o colar do êmbolo atrás
  for (const [y, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.box(0.08, 0.12, 0.12, at(d * 0.24, y * R * 0.72, z * R * 0.72), STEEL_L)
  g.cylinder(R * 1.1, 0.3, at(-d * 0.3, 0, 0, 0, 0, Math.PI / 2), BRASS, 12)
}

function pistonBox(g: SoftGeo, glow: SoftGeo, gv: Glove) {
  const d = gv.dir
  const bx = gv.x0 - d * (gv.R + 1.1)
  // caixa do cilindro: verde-petróleo, tampa clara, cintas e a faixa de perigo na boca
  g.box(1.9, gv.R * 2.6, gv.R * 2.6, at(bx, gv.y, gv.z), (x, y, z) => (y > gv.R * 1.2 ? mix(TEAL_L, STEEL_L, 0.3) : worn(mix(TEAL, TEAL_L, 0.55), bx + x, gv.z + z + y)))
  for (const k of [-0.5, 0.3]) g.box(0.14, gv.R * 2.7, gv.R * 2.7, at(bx + k, gv.y, gv.z), STEEL)
  const n = 6
  for (let i = 0; i < n; i++) g.box(0.1, (gv.R * 2.6) / n, gv.R * 2.7, at(bx + d * 0.96, gv.y - gv.R * 1.3 + (i + 0.5) * ((gv.R * 2.6) / n), gv.z), i % 2 ? HAZ_K : HAZ_Y)
  // a luz de aviso em cima (acende pela cor) e o manômetro de latão
  glow.sphere(0.34, at(bx, gv.y + gv.R * 1.3 + 0.2, gv.z), [1, 0.3, 0.12], 8)
  g.cylinder(0.5, 0.12, at(bx, gv.y + gv.R * 1.3 + 0.02, gv.z), STEEL_D, 10)
  g.cylinder(0.5, 0.08, at(bx - d * 0.2, gv.y + 0.2, gv.z + gv.R * 1.32, 0, Math.PI / 2), BRASS, 12)
  g.cylinder(0.38, 0.02, at(bx - d * 0.2, gv.y + 0.2, gv.z + gv.R * 1.38, 0, Math.PI / 2), [0.92, 0.9, 0.82], 12)
  // coluna até o fundo e a mangueira hidráulica (arco preto descendo)
  const top = gv.y - gv.R * 1.3
  g.box(0.5, top + 2, 0.5, at(bx - d * 0.3, (top - 2) / 2, gv.z), (_x, y) => (y > (top + 2) / 2 - 0.4 ? TEAL_L : worn(TEAL, bx, gv.z + y)))
  g.box(0.12, 2, 0.12, at(bx + d * 0.4, top - 0.8, gv.z, 0, 0, d * 0.55), TEAL)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI
    g.box(0.16, 0.16, 0.5, at(bx - d * (0.95 + Math.sin(a) * 0.5), gv.y - Math.cos(a) * gv.R * 1.1, gv.z - gv.R * 0.4, 0, a), [0.08, 0.08, 0.08])
  }
}

// ── 6. o tanque (marco): parede de chapas em duas fiadas com cintas de rebite, marcas velhas do nível do óleo,
// canos com flanges, escadas de marinheiro, lâmpadas na borda e a passarela com guarda-corpo; no fundo a parede
// alta com o medidor de nível (tubo de vidro aceso com as marcas) e o volante da válvula ──
const WX = 16.5
const Z0 = -14
const Z1 = 152
const TOP = 12
function tankSide(g: SoftGeo, glow: SoftGeo, s: number) {
  const x = s * WX
  const PW = 4
  for (let z = Z0; z < Z1; z += PW) {
    const i = Math.round((z - Z0) / PW)
    for (let r = 0; r < 2; r++) {
      const y0 = -2 + r * 7
      const h = r ? TOP - 5 : 7
      const tone = mix(STEEL, PLATE, 0.25 + n01(i, r, s) * 0.3)
      g.box(0.3, h - 0.06, PW - 0.06, at(x, y0 + h / 2, z + PW / 2), (_x, y, zz) => {
        const wy = y0 + h / 2 + y
        // marcas velhas do óleo: faixas escuras finas em alturas fixas
        if (Math.abs(wy - 4.2) < 0.12 || Math.abs(wy - 7.6) < 0.08 || Math.abs(wy - 9.8) < 0.06) return mix(tone, OIL, 0.7)
        return worn(tone, x, z + PW / 2 + zz + wy * 0.7, 0.9)
      })
    }
    // cinta vertical na emenda com rebites
    g.box(0.12, TOP + 2, 0.22, at(x - s * 0.16, TOP / 2 - 1, z), STEEL_L)
    for (let y = -1; y < TOP; y += 1.1) g.box(0.08, 0.1, 0.1, at(x - s * 0.22, y, z + 0.18), STEEL_L)
  }
  // cinta horizontal entre as fiadas e a cantoneira da borda (clara em cima)
  g.box(0.16, 0.26, Z1 - Z0, at(x - s * 0.17, 5, (Z0 + Z1) / 2), STEEL_L)
  g.box(0.7, 0.3, Z1 - Z0, at(x, TOP + 0.15, (Z0 + Z1) / 2), (_x, y) => (y > 0 ? STEEL_L : STEEL))
  // passarela por cima com guarda-corpo amarelo
  g.box(1.6, 0.12, Z1 - Z0, at(x + s * 0.9, TOP + 0.3, (Z0 + Z1) / 2), GRATE)
  g.box(0.08, 0.08, Z1 - Z0, at(x + s * 1.65, TOP + 1.4, (Z0 + Z1) / 2), HAZ_Y)
  g.box(0.06, 0.06, Z1 - Z0, at(x + s * 1.65, TOP + 0.85, (Z0 + Z1) / 2), HAZ_Y)
  for (let z = Z0 + 1; z < Z1; z += 3) g.box(0.08, 1.1, 0.08, at(x + s * 1.65, TOP + 0.85, z), HAZ_Y)
  // dois canos ao longo da parede, com flanges e suportes; o de cima de cobre
  for (const [py, col, d] of [[3, TEAL, 0.7], [8.4, [0.58, 0.32, 0.18] as RGB, 0.5]] as [number, RGB, number][]) {
    g.cylinder(d, Z1 - Z0, at(x - s * 0.75, py, (Z0 + Z1) / 2, 0, Math.PI / 2), col, 10)
    for (let z = Z0 + 2; z < Z1; z += 6) {
      g.cylinder(d + 0.22, 0.16, at(x - s * 0.75, py, z, 0, Math.PI / 2), STEEL_L, 10)
      g.box(0.6, 0.12, 0.2, at(x - s * 0.45, py - d / 2 - 0.06, z + 1), STEEL)
    }
  }
  // escadas de marinheiro (dois banzos e degraus) e lâmpadas de gaiola na borda
  for (let z = Z0 + 18; z < Z1; z += 34) {
    for (const dz of [-0.35, 0.35]) g.box(0.08, TOP + 1, 0.08, at(x - s * 0.5, TOP / 2 - 0.5, z + dz), STEEL_L)
    for (let y = 0; y < TOP; y += 0.45) g.box(0.06, 0.06, 0.7, at(x - s * 0.5, y, z), STEEL_L)
  }
  for (let z = Z0 + 6; z < Z1; z += 12) {
    g.box(0.5, 0.3, 0.3, at(x - s * 0.3, TOP - 0.8, z), STEEL)
    glow.sphere(0.5, at(x - s * 0.55, TOP - 1.1, z), LAMP, 8)
    for (let k = 0; k < 4; k++) g.box(0.04, 0.55, 0.04, at(x - s * 0.55 + Math.cos(k * 1.57) * 0.27, TOP - 1.1, z + Math.sin(k * 1.57) * 0.27), STEEL_D)
  }
}

function tankBack(g: SoftGeo, glow: SoftGeo) {
  const z = Z1
  const H = 34
  // parede alta em chapas (fiadas de 6 m), cintas e rebites
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 8; c++) {
      const x = -WX + (c + 0.5) * ((WX * 2) / 8)
      const y = -2 + (r + 0.5) * (H / 6)
      const tone = mix(mix(STEEL, PLATE, 0.45 + n01(r, c, 9) * 0.3), TEAL, r > 3 ? 0.35 : 0)
      g.box((WX * 2) / 8 - 0.06, H / 6 - 0.06, 0.3, at(x, y, z), (xx, yy) => worn(tone, x + xx, y + yy, 0.9))
    }
    g.box(WX * 2, 0.24, 0.16, at(0, -2 + r * (H / 6), z - 0.17), STEEL_L)
  }
  // o medidor de nível: tubo de vidro com o óleo aceso, as marcas e os números em barras, a moldura de latão
  // faixa larga de perigo (listra diagonal) no alto e o letreiro de nível máximo (barra vermelha)
  for (let k = 0; k < 22; k++) g.box((WX * 2) / 22 - 0.04, 1.4, 0.1, at(-WX + (k + 0.5) * ((WX * 2) / 22), 27.6, z - 0.25), (x, y) => (Math.floor((x + y) / 0.5 + 100) % 2 ? HAZ_Y : HAZ_K))
  glow.box(WX * 2 - 2, 0.2, 0.08, at(0, 26.5, z - 0.3), [1, 0.2, 0.1])
  const gx = -4.5
  g.box(1.8, 30, 0.4, at(gx, 15, z - 0.3), STEEL_D)
  glow.box(0.7, 28, 0.12, at(gx, 15, z - 0.55), (_x, y) => (y < 4 ? LAMP : mix(LAMP, [0.3, 0.2, 0.1], 0.55)))
  for (let k = 0; k <= 14; k++) {
    const y = 1 + k * 2
    g.box(k % 2 ? 0.5 : 0.9, 0.12, 0.1, at(gx + 0.9, y, z - 0.6), k % 2 ? STEEL_L : HAZ_Y)
  }
  for (const y of [0.4, 29.6]) g.box(2.2, 0.5, 0.6, at(gx, y, z - 0.4), BRASS)
  // volante da válvula e o cano grosso que entra no tanque
  g.cylinder(2.2, 4, at(8, 4, z - 2, 0, Math.PI / 2), TEAL, 14)
  g.cylinder(2.8, 0.3, at(8, 4, z - 3.9, 0, Math.PI / 2), STEEL_L, 14)
  g.torus(2.4, 0.16, at(8, 7.4, z - 1, 0, Math.PI / 2), [0.7, 0.14, 0.1], 18)
  for (let k = 0; k < 3; k++) g.box(2.3, 0.12, 0.12, at(8, 7.4, z - 1, 0, 0, (k / 3) * Math.PI), [0.7, 0.14, 0.1])
  g.box(0.3, 3.4, 0.3, at(8, 5.7, z - 0.6), STEEL)
  // cantoneira e passarela no alto, com as lâmpadas
  g.box(WX * 2 + 1, 0.4, 0.8, at(0, H - 2, z - 0.2), STEEL_L)
  for (let x = -WX + 3; x < WX; x += 6) glow.sphere(0.6, at(x, H - 3, z - 0.7), LAMP, 8)
}

/** Peças fixas da prova (caixas dos pistões; depois o tanque e o marcador de nível). */
export class TanqueView {
  private readonly meshes: Mesh[] = []
  constructor(scene: Scene, toy: Material, glowMat: Material, course: Course) {
    const st = new SoftGeo()
    const glow = new SoftGeo()
    for (const gv of course.gloves) pistonBox(st, glow, gv)
    tankSide(st, glow, -1)
    tankSide(st, glow, 1)
    tankBack(st, glow)
    this.meshes.push(st.build("tanque-static", scene, toy, true))
    this.meshes.push(glow.build("tanque-static-glow", scene, glowMat, true))
  }
  dispose() {
    for (const m of this.meshes) m.dispose()
  }
}
