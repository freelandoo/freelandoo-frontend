// features/meu-mundo/gincana/engine/clareira-view.ts — Clareira da Lua (2ª fase da Floresta, 2026-11-19):
// o desenho próprio da fase "Tocos que Giram", peça por peça (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma corrida de discos de party game — só o TIPO de prova e a riqueza de
// detalhe; nada de traçado, personagem, logotipo ou arte do jogo do vídeo)
// O que é:     corrida por uma clareira da Floresta da Lua: madeira clara, musgo vivo, frutas e cogumelos
//              de cor forte sobre o verde (o lugar do inflável colorido da referência).
// Paleta:      madeira clara (anéis 0,86/0,66/0,40 ↔ 0,72/0,50/0,28), casca escura (0,22/0,13/0,08),
//              musgo (0,30/0,58/0,22 → 0,52/0,76/0,30), acentos: cogumelo vermelho de pintas, frutas
//              vermelha/azul/laranja/roxa, setas de seiva acesa (creme), vaga-lume âmbar.
// 70/20/10:    70 verde e madeira, 20 casca e pedra, 10 frutas, cogumelos e luzes.
// Fora:        nada do inflável/arco-íris/balões do vídeo; nenhum desenho de interface dele.
//
// PARTES (ordem de construção)
// 1. fatia de tronco que gira (r 3,4) + cogumelo do miolo — grande: tampo de anéis e casca; médio: rachas,
//    setas de seiva; pequeno: musgo, cogumelinhos, lascas.
// 2. tronco caído (1 × 3,2 m) — 3. chão da clareira (grama em placas, trilha de terra, borda de troncos)
// 4. pedra de musgo da rampa — 5. frutas gigantes (4 cores) — 6. tronco oco que lança as frutas
// 7. toco que gira (até 10 m de coluna) — 8. árvore gigante — 9. vitória-régia gigante — 10. arredores

import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { DECK, type Pad } from "../sim/course"
import { CLAREIRA } from "../sim/courses"
import { SoftGeo, at, mix, type RGB } from "./shapes"

export const WOOD_A: RGB = [0.86, 0.66, 0.4]
export const WOOD_B: RGB = [0.72, 0.5, 0.28]
const HEART: RGB = [0.6, 0.32, 0.16]
const BARK: RGB = [0.24, 0.14, 0.08]
const BARK_D: RGB = [0.13, 0.07, 0.04]
const BARK_L: RGB = [0.42, 0.27, 0.16]
const MOSS: RGB = [0.3, 0.58, 0.22]
const MOSS_L: RGB = [0.52, 0.76, 0.3]
const SAP: RGB = [0.72, 1, 0.36]

/** Ruído barato e fixo (0–1) por posição. */
/**
 * A seiva das peças que GIRAM vai na malha de madeira (luz do dia; a fase não tem noite): sem a 2ª malha
 * acesa, cada fatia e cada toco é UMA chamada de desenho (eram duas; 62 → 45 na fase).
 */
const SAP_LIT: RGB = [0.82, 1, 0.42]

export function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

/** Casca em sulcos verticais (pelo ângulo; precisa de lados no cilindro), mais escura embaixo. */
export function barkPaint(seed = 0, k = 11) {
  return (x: number, y: number, z: number): RGB => {
    const a = Math.atan2(z, x)
    const g = Math.sin(a * k + Math.sin(y * 1.3 + seed) * 1.4 + seed)
    const c = g > 0.55 ? BARK_D : g < -0.6 ? BARK_L : BARK
    return y < -0.2 ? mix(c, BARK_D, 0.35) : c
  }
}

/** Tampo de madeira cortada: anéis (geometria — a tampa do cilindro só tem miolo e borda), rachas e lascas. */
export function sliceTop(g: SoftGeo, x: number, y: number, z: number, r: number, seed: number) {
  const step = r > 2.5 ? 0.34 : 0.28
  let k = 0
  for (let rr = r; rr > 0.25; rr -= step, k++) {
    const wob = 1 + (n01(seed, k) - 0.5) * 0.03
    const c = k === 0 ? mix(WOOD_A, [1, 0.9, 0.7], 0.25) : k % 2 ? WOOD_B : WOOD_A
    g.cylinder(rr * 2 * wob, 0.06, at(x, y - 0.03 + k * 0.004, z), c, 28)
  }
  g.cylinder(0.7, 0.06, at(x, y - 0.03 + k * 0.004 + 0.002, z), HEART, 16)
  // rachas: três do miolo para fora, finas e escuras (uma chega à borda)
  for (let q = 0; q < 3; q++) {
    const a = seed * 1.7 + q * 2.1 + n01(seed, q) * 0.6
    const len = r * (q === 0 ? 0.95 : 0.45 + n01(q, seed) * 0.25)
    g.box(0.07, 0.02, len, at(x + Math.sin(a) * len * 0.5, y + k * 0.004 + 0.012, z + Math.cos(a) * len * 0.5, a), [0.36, 0.2, 0.1])
  }
}

/**
 * Parte 1 — fatia de tronco que gira (o disco do campo). Malha na origem (`p.x/p.z` = 0): o update gira.
 * Corpo de casca em sulcos até 1,2 m abaixo do tampo, casca grossa em volta do tampo, anéis, rachas, setas
 * de seiva acesa mostrando o giro, musgo e cogumelinhos na casca.
 */
export function spinSlice(g: SoftGeo, _glow: SoftGeo, p: Pad) {
  const r = p.r
  const y = p.y
  const seed = Math.round(p.z * 3 + p.x)
  // corpo e a casca
  g.cylinder(r * 2 - 0.1, 1.15, at(0, y - 0.62, 0), barkPaint(seed), 44, r * 2 + 0.05)
  g.torus(r * 2 - 0.12, 0.34, at(0, y - 0.1, 0), barkPaint(seed, 17), 26)
  sliceTop(g, 0, y, 0, r - 0.22, seed)
  // setas de seiva acesa: seis "›" no anel do meio, apontando para onde o tampo leva
  const dir = Math.sign(p.spin || 1)
  for (let q = 0; q < 6; q++) {
    const a = (q / 6) * Math.PI * 2 + 0.3
    const rr = r * 0.62
    const cx = Math.cos(a) * rr
    const cz = Math.sin(a) * rr
    // rotation.y = spin·t no Babylon leva o ponto (cos a, sin a) para (sin a, −cos a)·spin
    const head = Math.atan2(dir * Math.sin(a), -dir * Math.cos(a))
    const tx = cx + Math.sin(head) * 0.25
    const tz = cz + Math.cos(head) * 0.25
    for (const s of [-1, 1]) {
      const yaw = head + s * 0.7
      // contorno escuro embaixo (lê sobre a madeira clara) e a seiva acesa por cima
      g.box(0.34, 0.03, 0.98, at(tx - Math.sin(yaw) * 0.45, y + 0.045, tz - Math.cos(yaw) * 0.45, yaw), [0.3, 0.16, 0.08])
      g.box(0.22, 0.03, 0.86, at(tx - Math.sin(yaw) * 0.42, y + 0.07, tz - Math.cos(yaw) * 0.42, yaw), SAP_LIT)
    }
  }
  // musgo em tufos sobre a casca (lado de fora) e um par de cogumelinhos
  for (let q = 0; q < 9; q++) {
    const a = (q / 9) * Math.PI * 2 + n01(seed, q) * 0.5
    const s = 0.45 + n01(q, seed) * 0.35
    g.sphere(s, at(Math.cos(a) * (r - 0.12), y - 0.02, Math.sin(a) * (r - 0.12)), q % 3 ? MOSS : MOSS_L, 4, 1.4, 0.45, 1)
  }
  for (let q = 0; q < 2; q++) {
    const a = seed + q * 2.6
    const mx = Math.cos(a) * (r + 0.05)
    const mz = Math.sin(a) * (r + 0.05)
    g.cylinder(0.12, 0.38, at(mx, y - 0.25, mz), [0.95, 0.9, 0.78], 6)
    g.sphere(0.42, at(mx, y - 0.06, mz), [0.92, 0.2, 0.16], 6, 1, 0.55, 1)
  }
}

/** Cogumelo de chapéu vermelho com pintas (o miolo que empurra), com dois pequenos ao pé. */
export function hubShroom(g: SoftGeo, x: number, z: number, y0: number, y1: number, R: number) {
  const h = y1 - y0
  g.cylinder(R * 1.1, h * 0.7, at(x, y0 + h * 0.35, z), (_x, yy) => mix([0.86, 0.8, 0.66], [1, 0.97, 0.88], yy / (h * 0.7) + 0.5), 12, R * 0.9)
  g.cylinder(R * 1.6, 0.08, at(x, y0 + h * 0.62, z), [0.96, 0.9, 0.78], 14, R * 1.2)
  const C = R * 2.3
  g.sphere(C, at(x, y0 + h * 0.66, z), (xx, yy, zz) => {
    const rr = Math.hypot(xx, zz) / (C / 2)
    return yy < 0.02 ? [0.98, 0.9, 0.8] : mix([0.98, 0.22, 0.16], [0.7, 0.06, 0.08], rr * rr)
  }, 12, 1, 0.62, 1)
  for (let q = 0; q < 7; q++) {
    const a = (q / 7) * Math.PI * 2 + x
    const rr = q === 0 ? 0 : C * 0.3
    g.sphere(q === 0 ? 0.3 : 0.22, at(x + Math.cos(a) * rr, y0 + h * 0.66 + C * 0.3 - (q === 0 ? 0 : 0.08), z + Math.sin(a) * rr), [1, 0.97, 0.92], 4, 1, 0.45, 1)
  }
  for (const [dx, dz, s] of [[0.75, 0.45, 0.42], [-0.6, -0.7, 0.32]] as [number, number, number][]) {
    g.cylinder(0.1 * s * 3, 0.5 * s * 2, at(x + dx, y0 + 0.5 * s, z + dz), [0.95, 0.9, 0.8], 6)
    g.sphere(0.9 * s * 1.4, at(x + dx, y0 + s, z + dz), [0.95, 0.3, 0.2], 6, 1, 0.55, 1)
  }
}

/**
 * Parte 2 — tronco caído (o obstáculo baixo do campo de fatias; a regra é uma caixa 1 × 3,2 m com o topo
 * 0,95 m acima do chão). Tronco deitado meio enterrado, casca em sulcos, pontas cortadas com anéis, musgo
 * por cima, um galho quebrado, orelhas-de-pau laranja e a sombra de contato no chão.
 */
export function fallenLog(g: SoftGeo, glow: SoftGeo, p: Pad) {
  const R = 0.58
  const L = p.hz * 2 + 0.1
  const cy = p.y - R + 0.02
  const seed = Math.round(p.x * 7 + p.z)
  const rot = p.rot
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  // ponto local (lx ao lado, lz ao longo) → mundo
  const W = (lx: number, ly: number, lz: number) => [p.x + lx * c + lz * s, ly, p.z - lx * s + lz * c] as const
  // sombra de contato (elipse escura no chão)
  const [sx, , sz] = W(0, 0, 0)
  g.sphere(1, at(sx, DECK + 0.012, sz, rot), [0.06, 0.13, 0.05], 6, R * 3.4, 0.02, L + 0.9)
  // o tronco: deitado ao longo de z local
  g.cylinder(R * 2, L, at(sx, cy, sz, rot, Math.PI / 2), barkPaint(seed, 13), 18)
  // pontas cortadas: anéis de madeira e o cerne
  for (const e of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const rr = R - 0.06 - k * 0.12
      const [ex, , ez] = W(0, 0, e * (L / 2 + 0.005 + k * 0.004))
      g.cylinder(rr * 2, 0.02, at(ex, cy, ez, rot, Math.PI / 2), k % 2 ? WOOD_B : WOOD_A, 16)
    }
  }
  // musgo por cima (tufos achatados, dois tons) e capim pendurado nas laterais
  for (let k = 0; k < 6; k++) {
    const lz = -L / 2 + 0.35 + (k / 5) * (L - 0.7)
    const [mx, , mz] = W((n01(seed, k) - 0.5) * 0.3, 0, lz)
    g.sphere(0.55 + n01(k, seed) * 0.3, at(mx, cy + R - 0.04, mz, rot), k % 2 ? MOSS : MOSS_L, 4, 1.3, 0.38, 1.5)
  }
  // galho quebrado saindo de lado
  const side = n01(seed, 9) < 0.5 ? -1 : 1
  const [b0x, , b0z] = W(side * R * 0.7, 0, 0.3)
  const [b1x, , b1z] = W(side * (R + 0.55), 0, 0.7)
  g.tube(new Vector3(b0x, cy + 0.15, b0z), new Vector3(b1x, cy + 0.55, b1z), 0.11, barkPaint(seed + 3, 5), 6)
  // orelhas-de-pau (prateleiras laranja) no outro lado
  for (let k = 0; k < 3; k++) {
    const [ox, , oz] = W(-side * (R + 0.04), 0, -0.6 + k * 0.32)
    g.sphere(0.38 - k * 0.06, at(ox, cy - 0.05 + k * 0.14, oz, rot), (_x, yy) => (yy > 0 ? [1, 0.6, 0.18] : [0.86, 0.42, 0.12]), 5, 1, 0.3, 1)
  }
  // dois vaga-lumes pousados no musgo (acesos à noite e de dia)
  for (let k = 0; k < 2; k++) {
    const [fx, , fz] = W((k - 0.5) * 0.3, 0, -0.5 + k * 1.1)
    glow.sphere(0.12, at(fx, cy + R + 0.12, fz), [1, 0.86, 0.3], 4)
  }
}

export function isClareiraLog(p: Pad) {
  return p.k === 1 && p.s === 1 && p.hx === 0.5 && p.hz === 1.6
}

const SOIL: RGB = [0.42, 0.27, 0.15]
const SOIL_D: RGB = [0.22, 0.13, 0.07]
const PATH: RGB = [0.62, 0.46, 0.28]
const FLOWERS: RGB[] = [[1, 0.96, 0.9], [1, 0.82, 0.2], [1, 0.45, 0.7], [0.7, 0.55, 1]]

/**
 * Parte 3 — chão da clareira (pisos e rampas): grama em manchas de três tons (geometria: a tampa não tem
 * vértice no meio), a trilha de terra batida no meio com pedrinhas, tufos de capim e flores na beira, borda
 * de troncos em gomos, barranco de terra com a faixa de grama em cima, e raízes no lugar das colunas.
 */
export function clearingFloor(g: SoftGeo, glow: SoftGeo, p: Pad, dyn: boolean) {
  const rise = p.y2 - p.y
  const len = p.hz * 2
  const pitch = Math.atan2(rise, len)
  const L = Math.hypot(len, rise)
  const yc = (p.y + p.y2) / 2
  const frame = at(p.x, yc, p.z, p.rot, -pitch)
  const F = (lx: number, ly: number, lz: number, yaw = 0) => Matrix.RotationY(yaw).multiply(Matrix.Translation(lx, ly, lz)).multiply(frame)
  const W = p.hx * 2
  const seed = Math.round(p.z * 5 + p.x * 3)
  // base: tampo musgo escuro e o barranco de terra (grama em cima, terra no meio, escuro no pé)
  g.roundBox(W, 0.5, L, 0.18, F(0, -0.25, 0), mix(MOSS, MOSS_L, 0.35), 4)
  g.roundBox(W - 0.05, p.d, L - 0.05, 0.2, F(0, -0.2 - p.d / 2, 0), (_x, y) => {
    const u = (y + p.d / 2) / p.d
    return u > 0.9 ? mix(MOSS, SOIL, 0.3) : u > 0.45 ? SOIL : mix(SOIL, SOIL_D, (0.45 - u) * 2)
  }, 4)
  // borda de troncos em gomos (lado e pontas), mais clara em cima
  for (const sx of [-1, 1]) {
    g.roundBox(0.5, 0.42, L + 0.3, 0.2, F(sx * (p.hx + 0.05), -0.02, 0), (_x, y, z) => (Math.floor(z / 1.3 + 100) % 2 ? (y > 0.08 ? BARK_L : BARK) : y > 0.08 ? mix(BARK_L, WOOD_A, 0.25) : BARK_D), 4)
  }
  if (dyn) return
  // manchas de grama: só em parte das casas, tamanhos e giros variados e contraste suave (de perto não pode
  // virar ladrilho); a trilha de terra batida no meio é de lajes de terra com pedrinhas
  const T = 1.25
  let i = 0
  for (let lx = -p.hx + T / 2; lx <= p.hx - T / 2 + 0.01; lx += T, i++) {
    let j = 0
    for (let lz = -L / 2 + T / 2; lz <= L / 2 - T / 2 + 0.01; lz += T, j++) {
      const h = n01(i, j, seed)
      const path = Math.abs(lx) < 1.5 && W >= 6
      const jx = (n01(j, i, seed) - 0.5) * 0.6
      const jz = (n01(i + 7, j, seed) - 0.5) * 0.6
      if (path) {
        const c = h < 0.5 ? PATH : mix(PATH, SOIL, 0.3)
        g.cylinder(T * 1.12, 0.06, F(lx + jx * 0.4, 0.03, lz + jz * 0.4, h * 3), c, 9, T * 1.06)
        if (h > 0.8) g.sphere(0.26, F(lx + jx, 0.07, lz - jz, h), [0.62, 0.6, 0.56], 3, 1.2, 0.45, 1)
        continue
      }
      if (h > 0.55) continue
      const sz = 0.7 + n01(j + 3, i, seed) * 0.9
      const c = h < 0.18 ? mix(MOSS_L, [0.62, 0.82, 0.36], 0.4) : h < 0.38 ? mix(MOSS, MOSS_L, 0.7) : mix(MOSS, SOIL_D, 0.12)
      g.cylinder(sz, 0.035, F(lx + jx, 0.018, lz + jz, h * 5), c, 7, sz * 0.94)
      // trevinho: três folhinhas num ponto
      if (h < 0.06) for (let q = 0; q < 3; q++) g.cylinder(0.2, 0.04, F(lx + jx + Math.cos(q * 2.1) * 0.1, 0.06, lz + jz + Math.sin(q * 2.1) * 0.1), [0.4, 0.74, 0.3], 5)
    }
  }
  // tufos de capim e flores na beira de dentro (só nos pisos largos)
  if (W >= 4) {
    for (const sx of [-1, 1]) {
      for (let lz = -L / 2 + 0.7, k = 0; lz <= L / 2 - 0.5; lz += 1.15, k++) {
        const h = n01(k, sx, seed)
        const lx = sx * (p.hx - 0.55 - h * 0.6)
        for (let b = 0; b < 3; b++) g.cylinder(0.14, 0.42 + b * 0.1, F(lx + (b - 1) * 0.12, 0.2 + b * 0.05, lz + (b % 2) * 0.1, b), b % 2 ? MOSS_L : MOSS, 4, 0.01)
        if (h > 0.45) {
          const fc = FLOWERS[k % FLOWERS.length]
          // flor = disco de cinco pontas (5 lados) + miolo aceso; pétala em esfera custava 720 triângulos
          g.cylinder(0.4, 0.04, F(lx + 0.3, 0.42, lz + 0.2, k), fc, 5)
          glow.sphere(0.09, F(lx + 0.3, 0.46, lz + 0.2), [1, 0.86, 0.3], 4)
        }
      }
    }
  }
  // raízes no lugar das colunas: três grossas descendo até o pântano
  const n = Math.max(1, Math.round(len / 9))
  const c = Math.cos(p.rot)
  const s = Math.sin(p.rot)
  for (let k = 0; k < n; k++) {
    const lz = -p.hz + ((k + 0.5) / n) * len
    const yTop = p.y + (rise * (lz + p.hz)) / len - p.d
    for (const sx of [-1, 1]) {
      const lx = sx * p.hx * 0.55
      const wx = p.x + lx * c + lz * s
      const wz = p.z - lx * s + lz * c
      g.tube(new Vector3(wx, yTop + 0.3, wz), new Vector3(wx + sx * 0.9, -1, wz + (n01(k, sx) - 0.5)), 0.38, barkPaint(k + sx, 7), 6)
    }
  }
}

export function isClareiraFloor(p: Pad) {
  return p.k !== 0 && !isClareiraLog(p) && !(p.s === 2 && p.hx === 0.75) && !(p.s === 3 && p.hx === CLAREIRA.cannonR)
}

/**
 * Parte 4 — pedra de musgo da rampa (a regra é uma caixa 1,5 × 3,2 m, 1,5 m acima da rampa): bloco de
 * pedra cinza-azulada em dois pedaços desencontrados (quina clara em cima, base escura), racha, manchas de
 * líquen, capa de musgo que escorre pela beira, samambaias no pé e a sombra de contato.
 */
export function mossStone(g: SoftGeo, p: Pad) {
  const top = p.y
  const H = p.d
  const seed = Math.round(p.z * 3 + p.x)
  const ST: RGB = [0.48, 0.5, 0.54]
  const stone = (h: number) => (_x: number, y: number, z: number): RGB => {
    const u = y / h + 0.5
    const lichen = n01(Math.round(z * 3), Math.round(y * 3), seed) > 0.86
    const c = u > 0.88 ? mix(ST, [0.82, 0.84, 0.86], 0.5) : mix(mix(ST, [0.2, 0.22, 0.24], 0.55), ST, Math.min(1, u * 1.3))
    return lichen && u > 0.3 ? mix(c, [0.78, 0.74, 0.36], 0.55) : c
  }
  // dois blocos: o grande atrás, o menor na frente, um pouco girado (silhueta quebrada)
  g.roundBox(1.5, H, 2.1, 0.3, at(p.x, top - H / 2, p.z + 0.5, 0.06), stone(H), 10)
  g.roundBox(1.36, H - 0.35, 1.3, 0.28, at(p.x + 0.04, top - 0.35 - (H - 0.35) / 2, p.z - 0.95, -0.12), stone(H - 0.35), 10)
  // racha na face da frente
  g.box(0.06, H * 0.55, 0.05, at(p.x - 0.25, top - H * 0.4, p.z - 1.62, 0, 0, 0.2), [0.14, 0.15, 0.16])
  // capa de musgo: tufos achatados em cima, alguns escorrendo pela beira
  for (let q = 0; q < 7; q++) {
    const lz = -1.3 + (q / 6) * 2.9
    const lx = (n01(q, seed) - 0.5) * 0.7
    const zTop = lz < -0.3 ? top - 0.35 : top
    g.sphere(0.7 + n01(seed, q) * 0.3, at(p.x + lx, zTop + 0.02, p.z + lz), q % 2 ? MOSS : MOSS_L, 5, 1.2, 0.32, 1.1)
  }
  for (const sx of [-1, 1]) g.sphere(0.5, at(p.x + sx * 0.72, top - 0.25, p.z + 0.2 * sx), MOSS, 6, 0.35, 1.4, 1)
  // samambaias no pé (folhas compridas em leque)
  for (const [dx, dz] of [[-0.85, -1.2], [0.85, 1.3]] as [number, number][]) {
    for (let q = 0; q < 5; q++) {
      const a = (q / 5) * Math.PI * 2
      g.sphere(0.9, at(p.x + dx + Math.cos(a) * 0.3, top - H + 0.45, p.z + dz + Math.sin(a) * 0.3, -a, 0.5, 0), q % 2 ? [0.22, 0.52, 0.2] : [0.32, 0.64, 0.24], 4, 0.22, 0.12, 1)
    }
  }
}

export function isClareiraStone(p: Pad) {
  return p.k === 1 && p.s === 2 && p.hx === 0.75
}

/**
 * Parte 5 — frutas gigantes que descem a rampa (uma espécie por faixa, cor forte sobre o verde: o papel das
 * bolas coloridas da referência). Malha na origem, rola em x. 0 maçã-da-lua (vermelha, cabinho e folha),
 * 1 mirtilo (azul com pó claro e a coroa de cinco pontas), 2 laranja (casca em gomos, folha), 3 ameixa (roxa,
 * sulco e o brilho de pó).
 */
export function fruit(g: SoftGeo, kind: number, R: number) {
  const D = R * 2
  const shade = (c: RGB, k = 0.55) => (_x: number, y: number): RGB => mix(mix(c, [0, 0, 0], k), c, Math.min(1, (y / R + 1) * 0.75))
  const leaf = (x: number, y: number, z: number, yaw: number, c: RGB = [0.24, 0.6, 0.2]) => g.sphere(0.95, at(x, y, z, yaw, 0.35, 0), c, 6, 0.42, 0.1, 1)
  if (kind === 0) {
    g.sphere(D, at(0, 0, 0), shade([0.92, 0.14, 0.12]), 18, 1.04, 0.94, 1.04)
    g.sphere(D * 0.3, at(-R * 0.35, R * 0.5, -R * 0.55), [1, 0.5, 0.42], 8, 1, 0.6, 1)
    g.cylinder(0.12, 0.55, at(0, R * 0.95, 0, 0, 0, 0.2), [0.36, 0.22, 0.1], 6)
    leaf(0.32, R * 1.0, 0.05, 0.6)
  } else if (kind === 1) {
    g.sphere(D, at(0, 0, 0), (x, y, z) => (n01(Math.round(x * 4), Math.round(y * 4), Math.round(z * 4)) > 0.82 ? [0.5, 0.56, 0.86] : shade([0.2, 0.3, 0.78])(x, y)), 18)
    g.cylinder(0.75, 0.12, at(0, R * 0.97, 0), [0.14, 0.12, 0.3], 10)
    for (let q = 0; q < 5; q++) {
      const a = (q / 5) * Math.PI * 2
      g.box(0.16, 0.12, 0.42, at(Math.sin(a) * 0.3, R * 1.02, Math.cos(a) * 0.3, a, -0.6, 0), [0.2, 0.16, 0.4])
    }
  } else if (kind === 2) {
    g.sphere(D, at(0, 0, 0), (x, y, z) => {
      const seg = Math.abs(Math.sin(Math.atan2(z, x) * 5)) < 0.12
      const c = shade([1, 0.55, 0.08], 0.45)(x, y)
      return seg ? mix(c, [1, 0.8, 0.4], 0.35) : c
    }, 20)
    g.cylinder(0.2, 0.12, at(0, R * 0.98, 0), [0.4, 0.5, 0.18], 6)
    leaf(0.35, R * 1.0, -0.1, -0.4, [0.18, 0.5, 0.16])
    leaf(-0.3, R * 1.0, 0.12, 2.4, [0.24, 0.58, 0.2])
  } else {
    g.sphere(D, at(0, 0, 0), (x, y, z) => {
      const groove = Math.abs(x) < 0.08 && z > 0
      const c = shade([0.5, 0.16, 0.6])(x, y)
      return groove ? mix(c, [0, 0, 0], 0.35) : c
    }, 18, 0.96, 1, 1.06)
    g.sphere(D * 0.32, at(R * 0.4, R * 0.45, -R * 0.5), [0.78, 0.6, 0.86], 8, 1, 0.6, 1)
    g.cylinder(0.11, 0.45, at(0, R * 0.98, 0), [0.32, 0.22, 0.12], 6)
  }
}

/**
 * Parte 6 — tronco oco deitado (a regra é uma caixa 2,3 × 4 m, alta demais para subir): a boca virada para a
 * rampa, escura por dentro com o brilho âmbar de onde a fruta sai, anéis de madeira na borda cortada, casca
 * em sulcos, musgo e folhas por cima, raízes que firmam no chão e uma fruta esperando lá dentro.
 */
export function hollowLog(g: SoftGeo, glow: SoftGeo, p: Pad) {
  const R = p.hx
  const L = p.hz * 2
  const cy = p.y - R
  const seed = Math.round(p.x * 5)
  const z0 = p.z - p.hz
  g.sphere(1, at(p.x, cy - R + 0.015, p.z), [0.06, 0.13, 0.05], 8, R * 2.8, 0.02, L + 0.8)
  g.cylinder(R * 2, L, at(p.x, cy, p.z, 0, Math.PI / 2), barkPaint(seed, 13), 22)
  // borda cortada da boca: anel claro de madeira, depois o oco escuro em degraus (fundo)
  g.torus(R * 2 - 0.22, 0.24, at(p.x, cy, z0 - 0.02, 0, Math.PI / 2), (x, _y, z) => (Math.sin(Math.hypot(x, z) * 40) > 0 ? WOOD_A : WOOD_B), 28)
  g.cylinder(R * 2 - 0.42, 0.04, at(p.x, cy, z0 + 0.04, 0, Math.PI / 2), [0.1, 0.05, 0.03], 22)
  // o brilho do fundo, NA FRENTE do escuro (senão o escuro o cobre): miolo âmbar e um anel quente em volta
  glow.cylinder(R * 0.85, 0.02, at(p.x, cy, z0 + 0.0, 0, Math.PI / 2), [1, 0.58, 0.16], 18)
  glow.torus(R * 1.15, 0.07, at(p.x, cy, z0 - 0.01, 0, Math.PI / 2), [1, 0.82, 0.4], 18)
  // a ponta de trás: tampa de madeira com anéis
  for (let k = 0; k < 3; k++) g.cylinder((R - 0.06 - k * 0.3) * 2, 0.03, at(p.x, cy, z0 + L + 0.01 + k * 0.004, 0, Math.PI / 2), k % 2 ? WOOD_B : WOOD_A, 20)
  // musgo e folhas por cima, cogumelinhos de lado
  for (let k = 0; k < 5; k++) g.sphere(0.85 + n01(seed, k) * 0.35, at(p.x + (n01(k, seed) - 0.5) * 0.6, cy + R - 0.05, z0 + 0.5 + k * 0.78), k % 2 ? MOSS : MOSS_L, 5, 1.2, 0.36, 1.3)
  for (let k = 0; k < 3; k++) g.sphere(1.1, at(p.x + (k - 1) * 0.5, cy + R + 0.12, z0 + 1.6 + k * 0.5, k * 1.9, 0.3, 0), [0.22, 0.58, 0.22], 5, 0.5, 0.1, 1)
  const side = seed % 2 ? 1 : -1
  for (let k = 0; k < 3; k++) {
    const mz = z0 + 0.9 + k * 0.5
    g.cylinder(0.1, 0.3, at(p.x + side * (R + 0.05), cy - R + 0.18 + k * 0.05, mz), [0.95, 0.9, 0.78], 5)
    g.sphere(0.36 - k * 0.06, at(p.x + side * (R + 0.05), cy - R + 0.36 + k * 0.05, mz), [1, 0.62, 0.2], 5, 1, 0.5, 1)
  }
  // raízes firmando no chão
  for (const sx of [-1, 1]) for (const dz of [0.6, L - 0.7]) {
    g.tube(new Vector3(p.x + sx * R * 0.7, cy - R * 0.4, z0 + dz), new Vector3(p.x + sx * (R + 0.7), p.y - R * 2 - 0.05, z0 + dz + 0.3), 0.16, barkPaint(seed + dz, 5), 6)
  }
}

export function isClareiraCannon(p: Pad) {
  return p.k === 1 && p.s === 3 && p.hx === CLAREIRA.cannonR
}

/**
 * O pórtico de galhos sobre os troncos ocos (marco do alto da rampa): dois troncos grossos nas pontas, um
 * galho torto de viga com musgo, cipós pendurados, sementes acesas de lanterna e a placa de madeira.
 */
export function cannonGate(g: SoftGeo, glow: SoftGeo) {
  const K = CLAREIRA
  const y0 = K.Y1
  const z = K.cannonZ + 2.6
  const X = K.ramp.hx + 0.9
  const top = y0 + 7
  for (const sx of [-1, 1]) {
    g.cylinder(1.5, top - y0 + 4, at(sx * X, (top + y0 - 4) / 2, z), barkPaint(sx * 3, 9), 14, 1.1)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4
      g.tube(new Vector3(sx * X, y0 + 1.2, z), new Vector3(sx * X + Math.cos(a) * 1.6, y0 - 0.2, z + Math.sin(a) * 1.6), 0.24, barkPaint(k, 5), 6)
    }
    g.sphere(2.4, at(sx * X, top + 0.6, z), MOSS, 6, 1, 0.6, 1)
  }
  // a viga: galho em gomos que sobe e desce um pouco
  const N = 10
  const pt = (k: number) => new Vector3(-X + (2 * X * k) / N, top - 0.2 + Math.sin((k / N) * Math.PI) * 0.7 + Math.sin(k * 1.7) * 0.12, z)
  for (let k = 0; k < N; k++) {
    g.tube(pt(k), pt(k + 1), 0.48 - Math.abs(k - N / 2) * 0.02, barkPaint(k, 9), 9)
    const c = pt(k + 0.5)
    g.sphere(1.3, at(c.x, c.y + 0.45, c.z + (k % 2 ? 0.2 : -0.2)), k % 3 ? MOSS : MOSS_L, 5, 1.2, 0.5, 1)
    // cipó pendurado e, um sim um não, a semente-lanterna acesa
    const hang = 1.2 + n01(k, 3) * 1.6
    g.cylinder(0.07, hang, at(c.x, c.y - hang / 2, c.z - 0.3), [0.24, 0.4, 0.16], 4)
    if (k % 2 === 0) {
      glow.sphere(0.55, at(c.x, c.y - hang - 0.25, c.z - 0.3), [1, 0.78, 0.3], 6, 1, 1.25, 1)
      g.cylinder(0.4, 0.12, at(c.x, c.y - hang + 0.1, c.z - 0.3), [0.3, 0.2, 0.1], 6)
    }
  }
  // placa de madeira pendurada no meio (só tábua e moldura; sem texto)
  g.roundBox(3.4, 1.1, 0.16, 0.05, at(0, top - 1.7, z - 0.1), (x) => (Math.floor((x + 5) / 0.55) % 2 ? WOOD_A : WOOD_B), 4)
  g.roundBox(3.6, 0.14, 0.2, 0.04, at(0, top - 1.12, z - 0.1), BARK, 3)
  for (const sx of [-1, 1]) g.cylinder(0.06, 0.8, at(sx * 1.4, top - 0.8, z - 0.1), [0.3, 0.22, 0.12], 4)
  glow.box(2.4, 0.12, 0.05, at(0, top - 1.7, z - 0.2), [0.72, 1, 0.36])
}

/**
 * Parte 7 — toco que gira (a escada sobre o pântano): coluna de casca em sulcos do pântano até o tampo, pé
 * que alarga com raízes na água, faixa de musgo e orelhas-de-pau na coluna, tampo de anéis com as setas de
 * seiva do giro e um cogumelo aceso de lado. Malha na origem (o update gira).
 */
export function spinStump(g: SoftGeo, _glow: SoftGeo, p: Pad) {
  const r = p.r
  const y = p.y
  const seed = Math.round(p.z * 3)
  const H = p.d
  g.cylinder(r * 2 - 0.08, H, at(0, y - H / 2 - 0.05, 0), barkPaint(seed, 13), 30, r * 2 + 0.05)
  // pé que alarga e as raízes na água
  g.cylinder(r * 2.5, 1.6, at(0, 0.6, 0), barkPaint(seed + 1, 13), 24, r * 2)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + seed
    g.tube(new Vector3(Math.cos(a) * r * 0.9, 1.2, Math.sin(a) * r * 0.9), new Vector3(Math.cos(a) * (r + 1.5), -0.3, Math.sin(a) * (r + 1.5)), 0.3, barkPaint(k, 5), 6)
  }
  // casca grossa em volta do tampo e a faixa de musgo logo abaixo
  g.torus(r * 2 - 0.1, 0.3, at(0, y - 0.1, 0), barkPaint(seed, 17), 22)
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + n01(seed, k)
    g.sphere(0.6 + n01(k, seed) * 0.3, at(Math.cos(a) * r, y - 0.35 - n01(seed, k + 3) * 0.5, Math.sin(a) * r), k % 3 ? MOSS : MOSS_L, 4, 0.5, 1.1, 1)
  }
  // orelhas-de-pau na coluna (duas alturas)
  for (let k = 0; k < 4; k++) {
    const a = seed + k * 1.6
    const yy = y - 1.6 - (k % 2) * 1.8 - k * 0.3
    if (yy < 1.5) continue
    g.sphere(0.8 - (k % 2) * 0.2, at(Math.cos(a) * (r + 0.05), yy, Math.sin(a) * (r + 0.05), -a), (_x, ty) => (ty > 0 ? [1, 0.62, 0.2] : [0.82, 0.4, 0.12]), 6, 1, 0.28, 1)
  }
  sliceTop(g, 0, y, 0, r - 0.2, seed)
  const dir = Math.sign(p.spin || 1)
  for (let q = 0; q < 4; q++) {
    const a = (q / 4) * Math.PI * 2 + 0.5
    const rr = r * 0.6
    const head = Math.atan2(dir * Math.sin(a), -dir * Math.cos(a))
    const tx = Math.cos(a) * rr + Math.sin(head) * 0.2
    const tz = Math.sin(a) * rr + Math.cos(head) * 0.2
    for (const s of [-1, 1]) {
      const yaw = head + s * 0.7
      g.box(0.3, 0.03, 0.8, at(tx - Math.sin(yaw) * 0.36, y + 0.045, tz - Math.cos(yaw) * 0.36, yaw), [0.3, 0.16, 0.08])
      g.box(0.2, 0.03, 0.7, at(tx - Math.sin(yaw) * 0.34, y + 0.07, tz - Math.cos(yaw) * 0.34, yaw), SAP_LIT)
    }
  }
  // cogumelo aceso de lado, na casca (lanterna para a noite)
  const a = seed * 0.7
  const mx = Math.cos(a) * (r + 0.15)
  const mz = Math.sin(a) * (r + 0.15)
  g.cylinder(0.18, 0.5, at(mx, y - 0.7, mz), [1, 0.9, 0.62], 6)
  g.sphere(0.7, at(mx, y - 0.45, mz), (_x, yy) => (yy < 0 ? [1, 0.86, 0.5] : [0.95, 0.35, 0.78]), 7, 1, 0.5, 1)
}

export function isClareiraStump(p: Pad) {
  return p.k === 0 && p.spin !== 0 && p.s === 3
}

/**
 * Parte 8 — árvore gigante da escada de tocos (a regra é uma coluna r 1,6 do pântano até 12 m acima do chão):
 * tronco que alarga no pé com raízes grossas na água, casca clara nas cristas, placas de musgo, orelhas-de-pau
 * ACESAS em escada (azul-esverdeado: o "cogumelo da lua"), dois galhos grossos e a copa em três camadas
 * (escura embaixo, clara em cima) com cipós e flores acesas.
 */
export function giantTree(g: SoftGeo, glow: SoftGeo, x: number, z: number, r: number, top: number) {
  const seed = Math.round(x * 3 + z)
  const out = Math.sign(x) || 1
  g.cylinder(r * 2, top + 1, at(x, (top - 1) / 2, z), barkPaint(seed, 9), 20, r * 1.7)
  g.cylinder(r * 3.4, 2.4, at(x, 0.6, z), barkPaint(seed + 2, 9), 20, r * 2)
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + seed
    g.tube(new Vector3(x + Math.cos(a) * r * 0.9, 2.2, z + Math.sin(a) * r * 0.9), new Vector3(x + Math.cos(a) * (r + 2.6), -0.4, z + Math.sin(a) * (r + 2.6)), 0.42, barkPaint(k, 5), 7)
  }
  // placas de musgo pelo tronco
  for (let k = 0; k < 8; k++) {
    const a = seed + k * 2.3
    const yy = 3 + k * ((top - 4) / 8)
    g.sphere(1.3, at(x + Math.cos(a) * r * 0.92, yy, z + Math.sin(a) * r * 0.92, -a), k % 2 ? MOSS : MOSS_L, 5, 0.4, 1.4, 1)
  }
  // orelhas-de-pau acesas em escada, viradas para a pista
  for (let k = 0; k < 5; k++) {
    const a = Math.PI + (out > 0 ? 0 : Math.PI) + (k - 2) * 0.35
    const yy = 4 + k * 1.7
    glow.sphere(1.0 - k * 0.08, at(x + Math.cos(a) * (r + 0.05), yy, z + Math.sin(a) * (r + 0.05), -a), (_x, ty) => (ty > 0 ? [0.4, 1, 0.86] : [0.2, 0.62, 0.6]), 6, 1, 0.26, 1)
  }
  // dois galhos grossos para fora da pista
  const branches: Vector3[] = []
  for (const [h, ang, len] of [[top - 2.5, 0.5, 6], [top - 0.5, -0.6, 5]] as [number, number, number][]) {
    const a = (out > 0 ? 0 : Math.PI) + ang
    const b0 = new Vector3(x, h, z)
    const b1 = new Vector3(x + Math.cos(a) * len, h + 2.5, z + Math.sin(a) * len)
    g.tube(b0, b1, 0.55, barkPaint(h, 7), 8)
    branches.push(b1)
  }
  // copa em três camadas: escura embaixo, clara em cima; no alto do tronco e na ponta dos galhos
  const crowns = [new Vector3(x, top + 2.5, z), ...branches]
  crowns.forEach((c, i) => {
    const S = i === 0 ? 8 : 5.5
    g.sphere(S, at(c.x, c.y, c.z), [0.08, 0.26, 0.14], 8, 1.25, 0.6, 1.25)
    g.sphere(S * 0.8, at(c.x + 0.6, c.y + S * 0.22, c.z - 0.4), [0.14, 0.4, 0.2], 8, 1.2, 0.6, 1.2)
    g.sphere(S * 0.5, at(c.x - 0.4, c.y + S * 0.42, c.z + 0.3), [0.3, 0.6, 0.26], 7, 1.15, 0.6, 1.15)
    // cipós pendurados com flor acesa na ponta
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + i
      const vx = c.x + Math.cos(a) * S * 0.5
      const vz = c.z + Math.sin(a) * S * 0.5
      const hang = 2 + n01(k, i, seed) * 3
      g.cylinder(0.08, hang, at(vx, c.y - S * 0.25 - hang / 2, vz), [0.22, 0.4, 0.16], 4)
      if (k % 2 === 0) glow.sphere(0.4, at(vx, c.y - S * 0.25 - hang, vz), [1, 0.42, 0.84], 6)
    }
  })
}

/**
 * Parte 9 — vitória-régia gigante que gira (r 9 m): folha em dois tons do miolo para a borda (anéis de
 * geometria), nervuras em relevo do miolo para fora, a borda virada para cima (verde claro por cima,
 * vermelho-vinho por baixo), gotas d'água, três lótus acesos na beira e as setas de seiva do giro. Malha na
 * origem; o caule grosso desce até o pântano.
 */
export function giantLily(g: SoftGeo, glow: SoftGeo, p: Pad) {
  const R = p.r
  const y = p.y
  const L1: RGB = [0.2, 0.5, 0.24]
  const L2: RGB = [0.34, 0.66, 0.3]
  // corpo fino e os anéis do tampo (escuro no miolo → claro na borda)
  g.cylinder(R * 2, 0.5, at(0, y - 0.3, 0), [0.14, 0.34, 0.16], 48)
  for (let k = 0; k < 6; k++) g.cylinder((R - 0.25 - k * 1.35) * 2, 0.05, at(0, y - 0.03 + k * 0.004, 0), mix(L2, L1, k / 5), 48)
  // nervuras: 16 do miolo para a borda, claras e em relevo
  for (let q = 0; q < 16; q++) {
    const a = (q / 16) * Math.PI * 2
    const len = R - 0.6
    g.box(0.16, 0.05, len, at(Math.sin(a) * len / 2, y + 0.02, Math.cos(a) * len / 2, a), [0.56, 0.82, 0.44])
  }
  g.cylinder(1.4, 0.08, at(0, y + 0.02, 0), [0.6, 0.84, 0.42], 16)
  // borda virada
  g.torus(R * 2, 0.5, at(0, y + 0.08, 0), (_x, yy, zz) => (yy > 0.05 ? (Math.sin(Math.atan2(zz, _x) * 40) > 0.6 ? [0.5, 0.8, 0.38] : [0.42, 0.74, 0.34]) : [0.56, 0.16, 0.2]), 64)
  // gotas d'água
  for (let q = 0; q < 10; q++) {
    const a = q * 2.39
    const rr = 2 + (q % 5) * 1.3
    g.sphere(0.2 + (q % 3) * 0.06, at(Math.cos(a) * rr, y + 0.06, Math.sin(a) * rr), [0.8, 0.95, 1], 6, 1, 0.5, 1)
  }
  // lótus acesos na beira (fora do miolo de pisar)
  for (let q = 0; q < 3; q++) {
    const a = (q / 3) * Math.PI * 2 + 0.5
    const fx = Math.cos(a) * (R - 0.2)
    const fz = Math.sin(a) * (R - 0.2)
    for (let k = 0; k < 8; k++) {
      const b = (k / 8) * Math.PI * 2
      glow.sphere(0.9, at(fx + Math.cos(b) * 0.4, y + 0.5, fz + Math.sin(b) * 0.4, -b, 0.6, 0), mix([1, 0.5, 0.88], [1, 0.86, 0.96], k % 2 ? 0.4 : 0), 6, 0.5, 1, 1.5)
    }
    glow.sphere(0.5, at(fx, y + 0.6, fz), [1, 0.9, 0.42], 6)
  }
  // setas de seiva do giro em dois anéis
  const dir = Math.sign(p.spin || 1)
  for (const [n, rr] of [[8, R * 0.72], [5, R * 0.4]] as [number, number][]) {
    for (let q = 0; q < n; q++) {
      const a = (q / n) * Math.PI * 2 + rr
      const head = Math.atan2(dir * Math.sin(a), -dir * Math.cos(a))
      const tx = Math.cos(a) * rr + Math.sin(head) * 0.3
      const tz = Math.sin(a) * rr + Math.cos(head) * 0.3
      for (const s of [-1, 1]) {
        const yaw = head + s * 0.7
        glow.box(0.26, 0.03, 1.0, at(tx - Math.sin(yaw) * 0.46, y + 0.07, tz - Math.cos(yaw) * 0.46, yaw), [0.92, 1, 0.7])
      }
    }
  }
  // o caule grosso até o pântano
  g.cylinder(1.4, y, at(0, y / 2 - 0.4, 0), (_x, yy) => mix([0.1, 0.26, 0.12], [0.2, 0.42, 0.18], yy / y + 0.5), 10)
}

export function isClareiraLily(p: Pad) {
  return p.k === 0 && p.spin !== 0 && p.s === 4
}

/** A peça é desta fase? (o course-view pergunta antes de desenhar do jeito comum.) */
export function isClareiraSlice(p: Pad) {
  return p.k === 0 && p.spin !== 0 && p.s === 1
}

export { CLAREIRA, DECK, Vector3 }

/** Colunas da fase: o cogumelo do miolo das fatias e (parte 8) a árvore gigante. */
export function clareiraPost(g: SoftGeo, glow: SoftGeo, q: { x: number; z: number; r: number; y0: number; y1: number }) {
  if (q.r >= CLAREIRA.treeR - 0.01) return giantTree(g, glow, q.x, q.z, q.r, q.y1)
  hubShroom(g, q.x, q.z, q.y0, q.y1, q.r)
  void glow
}
