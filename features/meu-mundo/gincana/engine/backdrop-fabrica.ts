// features/meu-mundo/gincana/engine/backdrop-fabrica.ts — o fundo das 3 fases do Domínio da Fábrica pela
// MINIATURA de cada uma (20/11, metade C). Só desenho, longe de quem corre; vai nas malhas `lit`/`glow` que já
// existem (nenhum material ou chamada nova). Chamado por `factory()` de backdrops.ts.
//
// FICHA — Fábrica de Engrenagens (`fabrica`, miniatura fases/fabrica.webp)
// O que é:        um galpão de fundição por DENTRO: os andares de chapa boiam num mar de lava com grade escura.
// Silhueta:       colunas quadradas verde-petróleo com faixas preta/amarela, viga verde lá no alto; no fundo,
//                 galeria de dois andares com guarda-corpo amarelo, tanques acesos e canos de cobre.
// Paleta:         verde-petróleo 0,1/0,36/0,36 · amarelo 0,95/0,72/0,08 · preto 0,05 · cobre 0,56/0,3/0,18 ·
//                 ferro 0,1–0,16 · lava 1/0,5/0,08 (acesa) · janela âmbar acesa.
// Fora:           a fumaça (o kit já solta vapor nas chaminés).
// Medidas:        andares em z 0/30/60/90, y 3/11/19/27 (sim/courses.ts FABRICA); bacias ±16 × ±14,5.
//
// PARTES (ordem)
// 1. colunas listradas (x ±21, entre os andares) — ~2 mil tri
// 2. vigas do alto (transversais e ao longo) — ~1 mil
// 3. paredes do galpão (x ±52, z −46 e o fundo) — massa escura com pilastras
// 4. galerias em 3 níveis com guarda-corpo amarelo — ~4 mil
// 5. tanques acesos na galeria (janela âmbar, cinta de latão) — instanciados por laço
// 6. canos de cobre ao longo das paredes
// 7. grade escura sobre a lava (hexágonos)

import type { SoftGeo, RGB } from "./shapes"
import { at, mix } from "./shapes"
import type { SteamCtx } from "../../engine/steampunk/scenery"
import { Z0, Z1 } from "./backdrop-base"

const TEAL: RGB = [0.1, 0.36, 0.36]
const TEAL_L: RGB = [0.24, 0.55, 0.52]
const HAZ_Y: RGB = [0.95, 0.72, 0.08]
const HAZ_K: RGB = [0.05, 0.05, 0.05]
const IRON: RGB = [0.1, 0.1, 0.11]
const IRON_L: RGB = [0.22, 0.21, 0.2]
const WALL: RGB = [0.06, 0.06, 0.065]

/** Pseudo-aleatório determinístico. */
function rnd(i: number, k = 0) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Coluna quadrada verde-petróleo com faixas preta e amarela (a da miniatura), de y0 até y1. */
function stripedColumn(lit: SoftGeo, x: number, z: number, y0: number, y1: number, w = 2.2) {
  const h = y1 - y0
  lit.roundBox(w, h, w, 0.12, at(x, y0 + h / 2, z), (_x, y) => {
    const yy = y + h / 2 + y0
    const m = ((yy % 7) + 7) % 7
    return m < 0.9 ? HAZ_K : m < 1.8 ? HAZ_Y : m < 2.7 ? HAZ_K : yy > y1 - 0.6 ? TEAL_L : TEAL
  }, 3)
}

/** Reflexo da lava pintado: o pé da parede fica alaranjado e escurece para cima. */
function lavaBounce(c: RGB, y: number): RGB {
  const k = Math.max(0, Math.min(1, 1 - (y - 0.5) / 9))
  return mix(c, [0.62, 0.2, 0.05], k * k * 0.75)
}

/**
 * Parede do galpão vista de DENTRO, centrada em (x, z), de largura w, virada por `ry` (a frente olha para +z do
 * quadro girado). Chapa escura em painéis, pilastras a cada 12 m, cinta em cada nível e faixas de janelas acesas
 * com caixilho escuro por cima; o pé leva o reflexo da lava.
 */
function hallWall(lit: SoftGeo, glow: SoftGeo, x: number, z: number, w: number, ry: number, seed: number) {
  const H = 64
  const c = Math.cos(ry)
  const s = Math.sin(ry)
  // ponto local (u ao longo, y, v para dentro) → mundo
  const P = (u: number, y: number, v: number) => at(x + u * c + v * s, y, z - u * s + v * c, ry)
  // chapa em faixas de 6 m (o vértice é que pinta: faixa curta = o reflexo da lava fica só no pé), tons alternados
  for (let k = 0; k < 11; k++) {
    const y0 = -2 + k * 6
    const tone: RGB = k % 3 === 0 ? WALL : k % 3 === 1 ? [0.07, 0.065, 0.065] : [0.05, 0.05, 0.055]
    lit.box(w, 6, 2, P(0, y0 + 3, -1), (_x, y) => lavaBounce(tone, y0 + 3 + y))
  }
  const nP = Math.floor(w / 12)
  for (let i = 0; i <= nP; i++) {
    const u = -w / 2 + (i * w) / nP
    {
      lit.box(1.6, 12, 1.2, P(u, 4, 0.4), (_x, y) => lavaBounce(IRON_L, y + 4))
      lit.box(1.6, H - 12, 1.2, P(u, 10 + (H - 12) / 2, 0.4), IRON)
    }
  }
  // cintas nos níveis das galerias e faixas de janelas entre elas
  for (const y of [6, 18, 30, 42]) lit.box(w, 0.9, 0.8, P(0, y - 0.6, 0.6), (_x, yy) => (yy > 0.3 ? [0.3, 0.27, 0.22] : IRON))
  for (const y0 of [9, 21, 33]) {
    for (let i = 0; i < nP; i++) {
      const u0 = -w / 2 + (i * w) / nP
      const uw = w / nP
      if (rnd(i, seed + y0) < 0.2) continue
      // vidro aceso (âmbar embaixo → amarelo em cima) e o caixilho escuro em grade por cima
      glow.box(uw - 3, 5, 0.1, P(u0 + uw / 2, y0 + 2.5, 0.05), (_x, y) => mix([0.95, 0.42, 0.08], [1, 0.8, 0.36], y / 5 + 0.5))
      for (let k = 0; k <= 3; k++) lit.box(0.22, 5.2, 0.2, P(u0 + 1.5 + (k * (uw - 3)) / 3, y0 + 2.5, 0.2), IRON)
      lit.box(uw - 2.8, 0.22, 0.2, P(u0 + uw / 2, y0 + 2.5, 0.2), IRON)
      lit.box(uw - 2.6, 0.3, 0.5, P(u0 + uw / 2, y0 - 0.1, 0.3), IRON_L)
    }
  }
}

/** Galeria presa na parede: laje de chapa com beira clara, guarda-corpo amarelo (corrimão, travessa, montantes a
 * cada 2,4 m) e mão-francesa escura a cada 12 m. (x, z) = pé da parede; a laje avança 4 m para dentro. */
function gallery(lit: SoftGeo, x: number, z: number, w: number, y: number, ry: number) {
  const c = Math.cos(ry)
  const s = Math.sin(ry)
  const P = (u: number, yy: number, v: number) => at(x + u * c + v * s, yy, z - u * s + v * c, ry)
  const D = 4
  lit.box(w, 0.5, D, P(0, y, D / 2), (_x, yy) => (yy > 0.1 ? [0.2, 0.19, 0.18] : [0.07, 0.07, 0.07]))
  lit.box(w, 0.18, 0.2, P(0, y + 0.3, D - 0.1), [0.36, 0.33, 0.28])
  for (const [hy, t] of [[1.15, 0.16], [0.6, 0.09]] as [number, number][]) lit.box(w, t, t, P(0, y + 0.25 + hy, D - 0.15), HAZ_Y)
  for (let u = -w / 2; u <= w / 2 + 0.01; u += 2.4) lit.box(0.1, 1.15, 0.1, P(u, y + 0.25 + 0.58, D - 0.15), mix(HAZ_Y, [0.4, 0.28, 0.02], 0.35))
  // mão-francesa: escora em diagonal da parede até a beira da laje
  for (let u = -w / 2 + 2; u <= w / 2; u += 12) {
    const L = Math.hypot(D * 0.8, 2.6)
    lit.box(0.3, L, 0.3, at(x + u * c + D * 0.4 * s, y - 1.5, z - u * s + D * 0.4 * c, ry, -Math.atan2(D * 0.8, 2.6)), IRON)
  }
}

const COPPER_D: RGB = [0.3, 0.14, 0.07]
const BRASS: RGB = [0.78, 0.56, 0.24]

/**
 * Tanque de fundição (a miniatura tem uma fila deles na galeria): corpo de cobre escuro com 3 cintas de latão, um
 * visor aceso em faixa vertical (gradiente vermelho → amarelo) com grade escura, tampa abaulada e o bocal aceso.
 * (x, y, z) = pé; `a` = para onde o visor olha.
 */
function vat(lit: SoftGeo, glow: SoftGeo, x: number, y: number, z: number, r: number, h: number, a: number) {
  lit.cylinder(r * 2, h, at(x, y + h / 2, z), (_x, yy) => mix(COPPER_D, [0.48, 0.24, 0.12], Math.max(0, yy / h + 0.5) ** 2), 10)
  lit.cylinder(r * 2.12, 0.3, at(x, y + 0.15, z), [0.06, 0.06, 0.06], 10)
  for (const k of [0.3, 0.62, 0.94]) lit.cylinder(r * 2.08, 0.22, at(x, y + h * k, z), BRASS, 10)
  lit.sphere(r * 2, at(x, y + h, z), COPPER_D, 6, 1, 0.45, 1)
  glow.cylinder(r * 0.7, 0.25, at(x, y + h + r * 0.42, z), [1, 0.62, 0.16], 8)
  const vx = x + Math.sin(a) * r * 0.97
  const vz = z + Math.cos(a) * r * 0.97
  glow.box(r * 0.55, h * 0.5, 0.08, at(vx, y + h * 0.46, vz, a), (_x, yy) => mix([0.9, 0.22, 0.04], [1, 0.82, 0.3], yy / (h * 0.5) + 0.5))
  for (let k = 0; k < 4; k++) lit.box(r * 0.62, 0.08, 0.1, at(vx + Math.sin(a) * 0.05, y + h * 0.26 + k * h * 0.13, vz + Math.cos(a) * 0.05, a), [0.05, 0.04, 0.04])
}

/**
 * Cano de cobre reto ao longo de uma parede (de a até b, raio r) com luva escura a cada 4 m e uma luva de latão a
 * cada 3 luvas; o claro em cima, escuro embaixo (a luz vem do alto). Usa a malha `lit` (nada de material novo).
 */
function copperRun(lit: SoftGeo, a: [number, number, number], b: [number, number, number], r: number, color: RGB = [0.56, 0.28, 0.13]) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dz = b[2] - a[2]
  const L = Math.hypot(dx, dy, dz)
  const yaw = Math.atan2(dx, dz)
  const pitch = Math.atan2(Math.hypot(dx, dz), dy)
  const mid = (k: number) => at(a[0] + dx * k, a[1] + dy * k, a[2] + dz * k, yaw, pitch)
  lit.cylinder(r * 2, L, mid(0.5), (xx) => mix(color, mix(color, [1, 0.8, 0.6], 0.35), Math.max(0, -xx / r)), 10)
  const n = Math.floor(L / 4)
  for (let i = 1; i < n; i++) lit.cylinder(r * 2.5, 0.28, mid(i / n), i % 3 === 0 ? BRASS : [0.12, 0.08, 0.06], 10)
}

const BRICKS: RGB[] = [[0.42, 0.2, 0.13], [0.33, 0.17, 0.12], [0.5, 0.27, 0.16], [0.38, 0.24, 0.18]]
const SLATE: RGB = [0.27, 0.29, 0.35]

/**
 * Armazém de tijolo da beira do canal (Comportas): pé em (x, z), frente virada para `face` (rad; 0 = olha +z).
 * Corpo com embasamento de pedra e cornija clara, telhado de duas águas em ardósia (cumeeira ao longo da frente),
 * janelas em grade (a maioria acesa, âmbar; as apagadas são escuras) com peitoril, e chaminé de tijolo com aro.
 */
export function warehouse(lit: SoftGeo, glow: SoftGeo, x: number, z: number, w: number, h: number, d: number, face: number, seed: number) {
  const c = Math.cos(face)
  const s = Math.sin(face)
  // local (u ao longo da frente, y, v para trás) → mundo
  const P = (u: number, y: number, v: number, rx = 0) => at(x + u * c - v * s, y, z - u * s - v * c, face, rx)
  const brick = BRICKS[seed % BRICKS.length]
  lit.box(w, h, d, P(0, h / 2, 0), (_x, y) => mix(mix(brick, [0.05, 0.03, 0.03], 0.45), brick, Math.min(1, (y + h / 2) / 3)))
  lit.box(w + 0.3, 1.2, d + 0.3, P(0, 0.6, 0), [0.4, 0.36, 0.32])
  lit.box(w + 0.5, 0.5, d + 0.5, P(0, h, 0), [0.55, 0.48, 0.4])
  // telhado: duas águas de ardósia e a empena de tijolo nas pontas
  const rh = d * 0.38
  const sl = Math.hypot(d / 2, rh)
  const ang = Math.atan2(rh, d / 2)
  for (const sv of [-1, 1]) lit.box(w + 0.8, 0.35, sl + 0.4, P(0, h + 0.25 + rh / 2, (sv * d) / 4, sv * ang), (_x, y, zz) => (y > 0 ? mix(SLATE, [0.1, 0.1, 0.13], Math.abs(zz) / sl) : [0.08, 0.08, 0.1]))
  lit.box(w + 0.9, 0.3, 0.5, P(0, h + 0.3 + rh, 0), [0.5, 0.5, 0.52])
  // empena escalonada de tijolo nas duas pontas (o telhado fica atrás dela)
  for (const su of [-1, 1])
    for (let k = 0; k < 3; k++) {
      const ww = d * (1 - k * 0.3)
      lit.box(0.6, rh / 3 + 0.3, ww, P((su * (w + 0.6)) / 2, h + (k + 0.5) * (rh / 3) + 0.15, 0), mix(brick, [0.06, 0.04, 0.03], 0.15))
      lit.box(0.8, 0.2, ww + 0.2, P((su * (w + 0.6)) / 2, h + (k + 1) * (rh / 3) + 0.3, 0), [0.55, 0.48, 0.4])
    }
  // janelas na frente: colunas a cada 3 m, andares a cada 3,6 m; pilastra entre as colunas e cinta entre andares
  const cols = Math.max(2, Math.floor((w - 2) / 3))
  const rows = Math.max(1, Math.floor((h - 2.4) / 3.6))
  const darkB = mix(brick, [0.05, 0.03, 0.03], 0.3)
  for (let i = 0; i <= cols; i++) lit.box(0.6, h - 1.2, 0.3, P(-w / 2 + 1.5 + i * ((w - 3) / cols), 1.2 + (h - 1.2) / 2, -d / 2 - 0.12), darkB)
  for (let j = 1; j < rows; j++) lit.box(w, 0.25, 0.25, P(0, 2.6 + j * 3.6 - 0.35, -d / 2 - 0.1), mix(brick, [0.6, 0.5, 0.42], 0.4))
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const u = -w / 2 + 1.5 + (i + 0.5) * ((w - 3) / cols)
      const y = 2.6 + j * 3.6 + 0.9
      const on = rnd(i * 7 + j * 13, seed) < 0.72
      if (on) glow.box(1.2, 1.8, 0.1, P(u, y, -d / 2 - 0.02), (_x, yy) => mix([1, 0.55, 0.16], [1, 0.84, 0.42], yy / 1.8 + 0.5))
      else lit.box(1.2, 1.8, 0.1, P(u, y, -d / 2 - 0.02), [0.05, 0.05, 0.07])
      lit.box(0.12, 1.8, 0.14, P(u, y, -d / 2 - 0.06), [0.12, 0.08, 0.06])
      lit.box(1.5, 0.18, 0.3, P(u, y - 1, -d / 2 - 0.1), [0.55, 0.48, 0.4])
    }
  // chaminé (2 em cada 3 prédios)
  if (seed % 3 !== 0) {
    const ch = 3 + rnd(seed, 3) * 4
    const cu = (rnd(seed, 4) - 0.5) * w * 0.6
    lit.box(1.2, ch, 1.2, P(cu, h + rh * 0.5 + ch / 2, d * 0.18), brick)
    lit.box(1.5, 0.35, 1.5, P(cu, h + rh * 0.5 + ch, d * 0.18), [0.12, 0.12, 0.13])
  }
}

// ── Fábrica de Engrenagens: o galpão de fundição ─────────────────────────────

export function fabricaHall(lit: SoftGeo, glow: SoftGeo, ctx: SteamCtx, n: number) {
  const X = 52
  const ZA = -46
  const ZB = 140
  const TOP = 46
  // 1. colunas listradas dos dois lados, entre os andares
  for (const z of [-16, 15, 45, 75, 106]) for (const s of [-1, 1]) stripedColumn(lit, s * 21, z, -2, TOP)
  // 2. vigas do alto: transversal em cada par de colunas e duas ao longo
  for (const z of [-16, 15, 45, 75, 106]) lit.box(44, 1.6, 1.4, at(0, TOP + 0.8, z), (_x, y) => (y < -0.5 ? IRON : TEAL))
  for (const s of [-1, 1]) lit.box(1.4, 1.6, 124, at(s * 21, TOP + 0.8, 45), (_x, y) => (y < -0.5 ? IRON : TEAL))
  // 3. paredes do galpão: lados e as duas pontas (a de trás da largada também, para a volta da câmera)
  for (const s of [-1, 1]) hallWall(lit, glow, s * X, (ZA + ZB) / 2, ZB - ZA, s > 0 ? -Math.PI / 2 : Math.PI / 2, 1 + s)
  hallWall(lit, glow, 0, ZB, X * 2, Math.PI, 5)
  hallWall(lit, glow, 0, ZA, X * 2, 0, 7)
  // 4. galerias em 3 níveis: laje, guarda-corpo amarelo e mão-francesa a cada pilastra (lados e o fundo)
  for (const y of [6, 18, 30]) {
    for (const s of [-1, 1]) gallery(lit, s * (X - 1), (ZA + ZB) / 2, ZB - ZA - 4, y, s > 0 ? -Math.PI / 2 : Math.PI / 2)
    gallery(lit, 0, ZB - 1, X * 2 - 4, y, Math.PI)
    gallery(lit, 0, ZA + 1, X * 2 - 4, y, 0)
  }
  // 5. tanques acesos nas galerias (2 de 3 vãos; o resto fica para os canos), altura e raio variando
  for (const y of n < 1 ? [6, 30] : [6, 18, 30]) {
    let i = 0
    for (let u = ZA + 6; u < ZB - 6; u += 12, i++) {
      if ((i + y) % 3 === 0) continue
      for (const s of [-1, 1]) vat(lit, glow, s * (X - 2.6), y + 0.25, u + (rnd(i, y) - 0.5) * 3, 1.3 + rnd(i, y + s) * 0.4, 3.2 + rnd(i, y + 2) * 1.6, s > 0 ? -Math.PI / 2 : Math.PI / 2)
    }
    i = 0
    for (let u = -X + 8; u < X - 6; u += 12, i++) {
      if ((i + y) % 3 !== 0) vat(lit, glow, u + (rnd(i, y + 9) - 0.5) * 3, y + 0.25, ZB - 2.6, 1.3 + rnd(i, y + 4) * 0.4, 3.2 + rnd(i, y + 5) * 1.6, Math.PI)
      if ((i + y) % 3 !== 1) vat(lit, glow, u + (rnd(i, y + 19) - 0.5) * 3, y + 0.25, ZA + 2.6, 1.3 + rnd(i, y + 14) * 0.4, 3.2 + rnd(i, y + 15) * 1.6, 0)
    }
  }
  // 6. canos de cobre pelas paredes: dois paralelos sob cada galeria e descidas verticais entre os tanques
  for (const s of [-1, 1]) {
    const wx = s * (X - 0.6)
    for (const [y, r] of [[3.2, 0.55], [4.6, 0.36], [15, 0.5], [27, 0.45]] as [number, number][]) copperRun(lit, [wx - s * r, y, ZA + 2], [wx - s * r, y, ZB - 2], r, y > 4 && y < 5 ? [0.16, 0.38, 0.38] : undefined)
    for (let z = ZA + 12, i = 0; z < ZB - 6; z += 24, i++) copperRun(lit, [wx - s * 0.7, -1, z + 3], [wx - s * 0.7, 30 + (i % 2) * 6, z + 3], 0.4)
  }
  for (const [y, r] of [[3.2, 0.55], [4.6, 0.36], [15, 0.5], [27, 0.45]] as [number, number][])
    for (const zz of [ZB - 0.6 - r, ZA + 0.6 + r]) copperRun(lit, [-X + 2, y, zz], [X - 2, y, zz], r, y > 4 && y < 5 ? [0.16, 0.38, 0.38] : undefined)
  void glow
  void ctx
}

/**
 * Grade sextavada sobre a lava da Fábrica (a miniatura): cada favo aceso mais claro no miolo (amarelo) e mais
 * fundo na beira, e o caixilho escuro grosso por cima. Pinta POR CIMA da textura do fluido (256 × 256, repetida):
 * 12 colunas × 10 linhas fecham a emenda (o favo fica 4% mais baixo que o regular, não se nota).
 */
export function paintLavaGrate(g: CanvasRenderingContext2D) {
  const S = 256 / 18
  const H = 256 / 20
  const hex = (cx: number, cy: number, k: number) => {
    g.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const px = cx + Math.cos(a) * S * k
      const py = cy + Math.sin(a) * H * k * 1.1547
      if (i) g.lineTo(px, py)
      else g.moveTo(px, py)
    }
    g.closePath()
  }
  for (let c = -1; c <= 12; c++)
    for (let r = -1; r <= 10; r++) {
      const cx = c * 1.5 * S
      const cy = r * 2 * H + (c % 2 ? H : 0)
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, S)
      gr.addColorStop(0, "rgba(255,214,90,0.85)")
      gr.addColorStop(0.55, "rgba(255,120,20,0.35)")
      gr.addColorStop(1, "rgba(150,30,0,0.5)")
      g.fillStyle = gr
      hex(cx, cy, 0.92)
      g.fill()
      g.strokeStyle = "rgba(38,14,8,0.95)"
      g.lineWidth = 2.6
      hex(cx, cy, 1)
      g.stroke()
    }
}

// ── Comportas da Usina: a beira do canal ─────────────────────────────────────

export function comportasShore(lit: SoftGeo, glow: SoftGeo, n: number) {
  const QX = 74
  for (const s of [-1, 1]) {
    // cais de pedra: laje com a beira clara e o pé molhado escuro; cabeços de amarração na beira
    lit.box(60, 2.4, Z1 - Z0 + 60, at(s * (QX + 28), 0, (Z0 + Z1) / 2), (_x, y) => (y > 0.6 ? [0.42, 0.38, 0.34] : [0.12, 0.11, 0.1]))
    lit.box(0.8, 0.5, Z1 - Z0 + 60, at(s * (QX - 1.6), 1.3, (Z0 + Z1) / 2), [0.56, 0.52, 0.46])
    for (let z = Z0; z < Z1 + 20; z += 9) lit.cylinder(0.6, 0.9, at(s * (QX - 1), 1.65, z), [0.1, 0.1, 0.11], 8, 0.5)
    // 1ª fila (na beira) e 2ª fila mais alta atrás, frente virada para a prova
    for (const [row, x0, hmin, hvar] of [[0, QX + 2, 8, 8], [1, QX + 20, 14, 12]] as [number, number, number, number][]) {
      if (row === 1 && n < 1) continue
      let z = Z0 - 10 + (row ? 7 : 0)
      let i = 0
      while (z < Z1 + 30) {
        const k = i * 2 + (s > 0 ? 1 : 0) + row * 50
        const w = 12 + rnd(k, 1) * 12
        const d = 9 + rnd(k, 2) * 4
        const h = hmin + rnd(k, 3) * hvar
        warehouse(lit, glow, s * (x0 + d / 2 + rnd(k, 4) * 3), z + w / 2, w, h, d, s > 0 ? Math.PI / 2 : -Math.PI / 2, k)
        z += w + 2 + rnd(k, 5) * 5
        i++
      }
    }
  }
}
