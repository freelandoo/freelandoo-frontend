// features/meu-mundo/gincana/engine/comportas-view.ts — Comportas da Usina (2ª fase da Fábrica, 2026-11-20):
// o desenho próprio da prova "Comportas", peça por peça (skill meu-mundo-cenario-codigo).
//
// FICHA (referência: vídeo de uma corrida de portões que sobem e descem num party game — só o TIPO de prova
// e a riqueza de detalhe; nada de traçado, personagem, logotipo, cor de marca ou arte do jogo do vídeo)
// O que é:     corrida pelo pátio de comportas de uma usina do Domínio da Fábrica (Aeryn): chão de chapa de
//              aço, comportas de aço verde-petróleo que saem do chão, paredes de concreto com faixa de
//              perigo e trilho-guia, bobinas de cobre, canos de vapor, uma poça de graxa e a fileira rápida.
// Silhueta:    fileiras de blocos altos (3,5 m) alternando com paredes fixas (3,2 m) — a fileira "respira"
//              (sobe e desce em onda); bobinas de cobre baixas entre as fileiras.
// Massas:      comporta 3,2 × 3,5 × 2,8 (maior) · parede 1,0 × 3,2 × 3,1 · bobina r 0,8 × 2,2 · mureta de
//              cano 9 × 1,0 · poça de graxa 22 × 30 · deck 22 m de largura.
// Paleta:      aço verde-petróleo (0,10/0,27/0,25 → quina 0,30/0,52/0,46), concreto (0,46/0,45/0,42), chapa
//              do chão (fator do tema), perigo amarelo/preto, cobre (0,72/0,38/0,18), latão (0,80/0,62/0,26),
//              graxa (0,04/0,03/0,06 com brilho 0,30/0,26/0,40), luz: verde (0,35/1/0,55) e vermelha (1/0,18/0,1).
// 70/20/10:    70 aço escuro e concreto, 20 verde-petróleo e cobre, 10 perigo amarelo e as luzes.
// Material:    metal frio (comporta, trilho), pedra (concreto), metal quente (cobre, latão).
// Fora:        o inflável colorido, arcos, balões, bandeiras e o piso rosa do vídeo; nenhum desenho de interface.
// Inventado:   o lado de trás das comportas (igual à frente, número diferente) e a luz de cada comporta.
//
// PARTES (ordem de construção)
// 1. comporta (3,2 × 3,5 × 2,8; baixa 1,0; funda 4,8) — grande: corpo de aço; médio: nervuras, faixa de
//    perigo no topo, placa de número, visor; pequeno: rebites, chapa xadrez do tampo, escorrido de ferrugem.
// 2. parede fixa entre comportas — grande: pilar de concreto; médio: faixa de perigo, trilho-guia de aço,
//    capitel; pequeno: chumbadores, lascas, a luz da comporta.
// 3. moldura no chão (fenda da comporta) + faixa de pedestre antes e depois da fileira.
// 4. bobina de cobre (r 0,8 × 2,2) — 5. mureta de cano (funil) — 6. poça de graxa — 7. arredores.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import type { Material } from "@babylonjs/core/Materials/material"
import { DECK, gateLift, type Course, type Pad, type Post } from "../sim/course"
import { COMPORTAS } from "../sim/courses"
import { SoftGeo, at, mix, type RGB } from "./shapes"

const STEEL: RGB = [0.1, 0.27, 0.25]
const STEEL_L: RGB = [0.3, 0.52, 0.46]
const STEEL_D: RGB = [0.05, 0.13, 0.12]
const CONC: RGB = [0.4, 0.39, 0.37]
const CONC_D: RGB = [0.26, 0.25, 0.24]
const HAZ_Y: RGB = [0.98, 0.76, 0.08]
const HAZ_K: RGB = [0.07, 0.07, 0.08]
const COPPER: RGB = [0.72, 0.38, 0.18]
const BRASS: RGB = [0.8, 0.62, 0.26]
const IRON: RGB = [0.16, 0.16, 0.18]
const GREASE: RGB = [0.04, 0.03, 0.06]
const LIT_G: RGB = [0.35, 1, 0.55]
const LIT_R: RGB = [1, 0.18, 0.1]

/** Rebite: cubinho (12 triângulos; a esfera custava 10×). */
function rivet(g: SoftGeo, d: number, m: Parameters<SoftGeo["box"]>[3], c: RGB, _seg = 0) {
  g.box(d, d, d * 0.7, m, c)
}

/** Ruído barato e fixo (0–1) por posição. */
function n01(a: number, b: number, c = 0) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1
}

// ── reconhecer as peças da fase (a regra é dado: courses.ts) ──
export const isGate = (p: Pad) => p.gh > 0
export const isGateWall = (p: Pad) => p.gh === 0 && p.k === 1 && Math.abs(p.y - (DECK + COMPORTAS.wallH)) < 1e-6
export const isPipeWall = (p: Pad) => p.gh === 0 && p.k === 1 && Math.abs(p.y - (DECK + 1)) < 1e-6 && p.hz < 0.5
export const isGrease = (p: Pad) => p.sl < 1

/** Parte 1 — comporta. Malha com o TAMPO em y = 0 (a instância sobe e desce); desce h + 1,4 m. */
function gateGeo(g: SoftGeo, _gl: SoftGeo, hx: number, hz: number, h: number) {
  const H = h + 1.4
  const W = hx * 2
  const D = hz * 2
  // corpo: chanfro claro nas quinas (roundBox), mais escuro descendo (sombra de contato com a fenda)
  g.roundBox(W - 0.04, H, D - 0.04, 0.09, at(0, -H / 2, 0), (_x, y) => {
    const k = Math.max(0, Math.min(1, (y + H / 2 - 1.4) / h))
    return y > H / 2 - 0.05 ? STEEL_L : mix(STEEL_D, STEEL, 0.25 + 0.75 * k)
  }, 3)
  // ── tampo: chapa xadrez (losangos em relevo) e a beira amarela de degrau ──
  g.box(W - 0.3, 0.03, D - 0.3, at(0, 0.005, 0), mix(STEEL, STEEL_L, 0.35))
  const nx = Math.max(4, Math.round((W - 0.5) / 0.5))
  const nz = Math.max(4, Math.round((D - 0.5) / 0.5))
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = -W / 2 + 0.25 + ((i + 0.5) * (W - 0.5)) / nx
      const z = -D / 2 + 0.25 + ((j + 0.5) * (D - 0.5)) / nz
      g.box(0.07, 0.035, 0.24, at(x, 0.03, z, (i + j) % 2 ? 0.6 : -0.6), STEEL_L)
    }
  }
  for (const s of [-1, 1]) {
    g.box(W - 0.1, 0.04, 0.12, at(0, 0.012, s * (D / 2 - 0.1)), HAZ_Y)
    g.box(0.12, 0.04, D - 0.1, at(s * (W / 2 - 0.1), 0.012, 0), HAZ_Y)
  }
  // olhais de içar (dois, perto das paredes)
  for (const s of [-1, 1]) {
    g.box(0.34, 0.12, 0.3, at(s * (W / 2 - 0.45), 0.06, 0), IRON)
    g.torus(0.32, 0.08, at(s * (W / 2 - 0.45), 0.2, 0, 0, Math.PI / 2), IRON, 10)
  }
  // ── as duas faces (frente −z, trás +z) ──
  const tall = h > 2
  for (const s of [-1, 1]) {
    const fz = s * (D / 2)
    const out = (d: number) => fz + s * d
    // faixa de perigo no alto: fundo preto + listras amarelas inclinadas
    g.box(W - 0.2, 0.42, 0.04, at(0, -0.3, out(0.01)), HAZ_K)
    for (let x = -W / 2 + 0.25; x < W / 2 - 0.15; x += 0.42) g.box(0.17, 0.35, 0.012, at(x, -0.3, out(0.026), 0, 0, 0.55 * s), HAZ_Y)
    // cinta de aço sob a faixa
    g.box(W - 0.1, 0.12, 0.08, at(0, -0.58, out(0.03)), STEEL_L)
    if (tall) {
      // nervuras verticais (3) e a horizontal do meio, com quina clara
      const ribH = h - 0.85
      for (const x of [-W * 0.32, 0, W * 0.32]) {
        g.box(0.2, ribH, 0.12, at(x, -0.64 - ribH / 2, out(0.05)), (_x, y) => (y > ribH / 2 - 0.05 ? STEEL_L : STEEL))
        g.box(0.06, ribH, 0.02, at(x - 0.08, -0.64 - ribH / 2, out(0.11)), mix(STEEL, STEEL_L, 0.6))
        // rebites ao longo da nervura
        for (let k = 0; k < 5; k++) rivet(g, 0.075, at(x, -0.8 - (k * (ribH - 0.3)) / 4, out(0.12)), BRASS, 5)
      }
      g.box(W - 0.2, 0.14, 0.1, at(0, -0.64 - ribH * 0.55, out(0.04)), STEEL)
      // visor de latão (vidro escuro) e placa de número entre as nervuras
      g.torus(0.46, 0.07, at(-W * 0.16, -1.05, out(0.06), 0, Math.PI / 2), BRASS, 14)
      g.cylinder(0.4, 0.04, at(-W * 0.16, -1.05, out(0.04), 0, Math.PI / 2), [0.06, 0.16, 0.16], 14)
      g.box(0.08, 0.04, 0.02, at(-W * 0.16 - 0.08, -0.98, out(0.07), 0, 0, 0.6), [0.5, 0.75, 0.7])
      g.box(0.42, 0.3, 0.03, at(W * 0.16, -1.05, out(0.05)), BRASS)
      g.box(0.07, 0.2, 0.02, at(W * 0.16 - 0.07, -1.05, out(0.07)), [0.2, 0.14, 0.06])
      g.box(0.07, 0.2, 0.02, at(W * 0.16 + 0.07, -1.05, out(0.07)), [0.2, 0.14, 0.06])
      // escorrido de ferrugem dos rebites (finos, comprimentos diferentes)
      for (let k = 0; k < 5; k++) {
        const x = -W / 2 + 0.3 + n01(k, W + s) * (W - 0.6)
        const L = 0.4 + n01(s, k) * 1.4
        const y0 = -0.7 - n01(k, s, 3) * 0.8
        g.box(0.045, L, 0.015, at(x, y0 - L / 2, out(0.025)), mix([0.42, 0.18, 0.08], STEEL_D, 0.3))
      }
      // pé da face: chapa de desgaste mais escura com rebites
      g.box(W - 0.16, 0.3, 0.05, at(0, -h + 0.2, out(0.02)), STEEL_D)
      for (let k = 0; k < 6; k++) rivet(g, 0.06, at(-W / 2 + 0.3 + (k * (W - 0.6)) / 5, -h + 0.2, out(0.05)), mix(STEEL, STEEL_L, 0.5), 4)
    } else {
      // comporta baixa: só rebites e uma faixa de perigo larga embaixo da cinta
      for (let k = 0; k < 6; k++) rivet(g, 0.07, at(-W / 2 + 0.3 + (k * (W - 0.6)) / 5, -0.8, out(0.03)), BRASS, 5)
    }
  }
  // laterais (contra as paredes): sapatas de guia que correm no trilho
  for (const s of [-1, 1]) {
    for (const z of [-D / 2 + 0.35, D / 2 - 0.35]) g.box(0.06, h * 0.9, 0.3, at(s * (W / 2 + 0.01), -h * 0.45, z), IRON)
  }
}

/** Parte 2 — parede fixa entre comportas (no lugar: x, z do pad; topo em p.y). */
function gateWall(g: SoftGeo, gl: SoftGeo, p: Pad) {
  const h = COMPORTAS.wallH
  const W = p.hx * 2
  const D = p.hz * 2
  const y0 = DECK
  const seed = Math.round(p.x * 7 + p.z)
  // núcleo de concreto: quina clara no alto, pé escuro (sombra de contato)
  g.roundBox(W - 0.06, h - 0.35, D - 0.06, 0.07, at(p.x, y0 + (h - 0.35) / 2, p.z), (_x, y) => mix(CONC_D, CONC, Math.max(0, Math.min(1, (y + (h - 0.35) / 2) / 1.6))), 3)
  // marcas da fôrma (frisos horizontais) nas quatro faces e lascas claras nas quinas
  for (let k = 1; k <= 4; k++) {
    const y = y0 + k * 0.62
    g.box(W - 0.02, 0.035, D + 0.0, at(p.x, y, p.z), mix(CONC_D, CONC, 0.55))
  }
  for (let k = 0; k < 4; k++) {
    const sx = n01(seed, k) < 0.5 ? -1 : 1
    const sz = n01(k, seed) < 0.5 ? -1 : 1
    g.box(0.12, 0.1 + n01(seed, k, 2) * 0.15, 0.1, at(p.x + sx * (W / 2 - 0.02), y0 + 0.5 + n01(k, seed, 5) * 2, p.z + sz * (D / 2 - 0.02)), mix(CONC, [0.9, 0.88, 0.82], 0.5))
  }
  // sapata escura e chumbadores
  g.box(W + 0.16, 0.18, D + 0.16, at(p.x, y0 + 0.09, p.z), CONC_D)
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) g.cylinder(0.1, 0.1, at(p.x + sx * (W / 2 - 0.1), y0 + 0.22, p.z + sz * (D / 2 + 0.02)), IRON, 6)
  // faixa de perigo embaixo nas faces da frente e de trás (listras inclinadas sobre chapa preta)
  for (const s of [-1, 1]) {
    const fz = p.z + s * (D / 2 + 0.01)
    g.box(W - 0.08, 1.1, 0.03, at(p.x, y0 + 0.85, fz), HAZ_K)
    for (let x = -W / 2 + 0.15; x < W / 2 - 0.05; x += 0.36) g.box(0.14, 1.0, 0.012, at(p.x + x, y0 + 0.85, fz + s * 0.016, 0, 0, 0.5 * s), HAZ_Y)
    g.box(W - 0.04, 0.06, 0.06, at(p.x, y0 + 1.42, fz), mix(CONC, [1, 1, 1], 0.2))
  }
  // trilho-guia de aço nas faces que dão para as comportas (perfil em U: duas abas e o fundo escuro)
  for (const sx of [-1, 1]) {
    for (const zz of [-p.hz + 0.5, p.hz - 0.5]) {
      const x = p.x + sx * (W / 2 + 0.03)
      g.box(0.06, h - 0.4, 0.42, at(x, y0 + (h - 0.4) / 2, p.z + zz), STEEL_D)
      for (const dz of [-0.18, 0.18]) g.box(0.1, h - 0.4, 0.06, at(x + sx * 0.03, y0 + (h - 0.4) / 2, p.z + zz + dz), (_x, y) => (y > (h - 0.4) / 2 - 0.1 ? STEEL_L : mix(STEEL, STEEL_L, 0.3)))
      for (let k = 0; k < 4; k++) rivet(g, 0.06, at(x + sx * 0.06, y0 + 0.5 + k * 0.75, p.z + zz + 0.18), BRASS, 4)
    }
  }
  // capitel de ferro: chapa larga com quina clara, rebites e a caixa da sirene acesa na frente
  g.roundBox(W + 0.14, 0.35, D + 0.14, 0.05, at(p.x, y0 + h - 0.175, p.z), (_x, y) => (y > 0.1 ? mix(IRON, STEEL_L, 0.45) : IRON), 2)
  for (let k = 0; k < 4; k++) for (const sz of [-1, 1]) rivet(g, 0.07, at(p.x - W / 2 + 0.12 + (k * (W - 0.24)) / 3, y0 + h - 0.17, p.z + sz * (D / 2 + 0.08)), BRASS, 4)
  g.box(0.36, 0.3, 0.36, at(p.x, y0 + h + 0.15, p.z), IRON)
  g.cylinder(0.3, 0.06, at(p.x, y0 + h + 0.33, p.z), BRASS, 10)
  gl.cylinder(0.22, 0.22, at(p.x, y0 + h + 0.47, p.z), [1, 0.62, 0.15], 10)
}

/** Parte 4 — bobina de cobre (coluna). */
function coil(g: SoftGeo, gl: SoftGeo, q: Post) {
  const h = q.y1 - q.y0
  const R = q.r
  const y0 = q.y0
  const COP_D: RGB = [0.42, 0.18, 0.08]
  const COP_L: RGB = [0.95, 0.62, 0.36]
  // base: sapata de ferro com faixa de perigo e parafusos
  g.cylinder(R * 2 + 0.3, 0.22, at(q.x, y0 + 0.11, q.z), IRON, 16)
  g.cylinder(R * 2 + 0.32, 0.1, at(q.x, y0 + 0.2, q.z), (x, _y, z) => (Math.floor((Math.atan2(z, x) / Math.PI) * 6 + 12) % 2 ? HAZ_Y : HAZ_K), 24)
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3
    g.cylinder(0.12, 0.08, at(q.x + Math.cos(a) * (R + 0.08), y0 + 0.26, q.z + Math.sin(a) * (R + 0.08)), BRASS, 6)
  }
  // eixo de ferro
  g.cylinder(R * 0.8, h, at(q.x, y0 + h / 2, q.z), IRON, 12)
  // três carretéis de fio de cobre (gomos), cada um com espiras escuras e a borda clara em cima
  const n = 3
  const seg = (h - 0.55) / n
  for (let k = 0; k < n; k++) {
    const yc = y0 + 0.3 + seg * (k + 0.5)
    const rr = R * (k === 1 ? 0.96 : 1)
    g.cylinder(rr * 2, seg - 0.12, at(q.x, yc, q.z), (_x, y) => mix(COP_D, COPPER, Math.min(1, (y + seg / 2) / (seg * 0.8))), 22)
    // espiras: anéis finos alternando escuro/claro
    for (let j = 0; j < 4; j++) g.torus(rr * 2 + 0.02, 0.04, at(q.x, yc - seg * 0.32 + j * seg * 0.2, q.z), j % 2 ? COP_L : COP_D, 12)
    // flange de latão entre os carretéis
    g.cylinder(R * 2 + 0.14, 0.07, at(q.x, yc + seg / 2 - 0.02, q.z), (_x, y) => (y > 0 ? mix(BRASS, [1, 0.9, 0.6], 0.35) : BRASS), 22)
  }
  // terminal no topo: tampa, dois bornes e o arco aceso (ciano: a bobina está ligada)
  g.cylinder(R * 1.4, 0.16, at(q.x, q.y1 - 0.06, q.z), mix(IRON, STEEL_L, 0.3), 14)
  for (const s of [-1, 1]) g.cylinder(0.12, 0.3, at(q.x + s * R * 0.4, q.y1 + 0.13, q.z), BRASS, 8)
  gl.torus(R * 0.82, 0.05, at(q.x, q.y1 + 0.3, q.z, 0, Math.PI / 2), [0.45, 0.95, 1], 12)
}

/** Parte 5 — mureta de cano (funil). */
function pipeWall(g: SoftGeo, gl: SoftGeo, p: Pad) {
  const L = p.hx * 2
  const y = DECK
  const cy = y + 0.55
  const R = 0.4
  const x0 = p.x - p.hx
  const x1 = p.x + p.hx
  const seed = Math.round(p.z)
  // dormentes de ferro com sela (berço) embaixo do cano
  for (let k = 0; k < 4; k++) {
    const x = x0 + 0.6 + (k * (L - 1.2)) / 3
    g.box(0.5, 0.18, p.hz * 2 + 0.1, at(x, y + 0.09, p.z), IRON)
    g.box(0.24, 0.24, R * 1.6, at(x, y + 0.24, p.z), mix(IRON, STEEL_L, 0.2))
    g.torus(R * 2 + 0.1, 0.07, at(x, cy, p.z, 0, 0, Math.PI / 2), IRON, 16)
  }
  // o cano: aço verde-petróleo, mais escuro embaixo (sombra de contato), quina clara em cima
  // (a malha deita girando em z: o "alto" do cano é o x local)
  g.cylinder(R * 2, L - 0.5, at(p.x, cy, p.z, 0, 0, Math.PI / 2), (x) => mix(STEEL_D, STEEL_L, Math.max(0, Math.min(1, (x / R) * 0.5 + 0.45))), 18)
  // flanges de latão com parafusos a cada ~2,2 m
  for (let x = x0 + 1.4; x < x1 - 1; x += 2.2) {
    g.cylinder(R * 2 + 0.2, 0.14, at(x, cy, p.z, 0, 0, Math.PI / 2), BRASS, 18)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      rivet(g, 0.07, at(x + 0.08, cy + Math.sin(a) * (R + 0.06), p.z + Math.cos(a) * (R + 0.06)), mix(BRASS, IRON, 0.5), 4)
    }
  }
  // as pontas: cotovelo descendo ao chão, com flange
  for (const s of [-1, 1]) {
    const xe = s < 0 ? x0 + 0.25 : x1 - 0.25
    g.sphere(R * 2, at(xe, cy, p.z), STEEL, 12)
    g.cylinder(R * 2, cy - y, at(xe, y + (cy - y) / 2, p.z), mix(STEEL_D, STEEL, 0.6), 14)
    g.cylinder(R * 2 + 0.24, 0.1, at(xe, y + 0.05, p.z), IRON, 14)
  }
  // cano fino de cobre por cima, com braçadeiras
  g.cylinder(0.2, L - 0.9, at(p.x, cy + R + 0.08, p.z - 0.12, 0, 0, Math.PI / 2), COPPER, 8)
  for (let x = x0 + 0.9; x < x1 - 0.5; x += 1.5) g.box(0.08, 0.14, 0.26, at(x, cy + R + 0.06, p.z - 0.12), IRON)
  // registro: volante vermelho no alto (raios), e o manômetro com o mostrador aceso
  const vx = p.x + (n01(seed, 1) - 0.5) * L * 0.4
  g.cylinder(0.22, 0.32, at(vx, cy + R + 0.12, p.z + 0.12), BRASS, 10)
  g.torus(0.62, 0.07, at(vx, cy + R + 0.3, p.z + 0.12), [0.7, 0.1, 0.08], 16)
  for (let k = 0; k < 3; k++) g.box(0.6, 0.05, 0.05, at(vx, cy + R + 0.3, p.z + 0.12, (k / 3) * Math.PI), [0.6, 0.08, 0.06])
  const gx = p.x - (n01(seed, 2) - 0.5) * L * 0.5
  g.cylinder(0.08, 0.25, at(gx, cy + R + 0.1, p.z + 0.15), BRASS, 6)
  g.cylinder(0.36, 0.1, at(gx, cy + R + 0.32, p.z + 0.15, 0, Math.PI / 2), BRASS, 14)
  gl.cylinder(0.28, 0.02, at(gx, cy + R + 0.32, p.z + 0.09, 0, Math.PI / 2), [0.95, 0.92, 0.75], 14)
  g.box(0.02, 0.12, 0.01, at(gx + 0.03, cy + R + 0.34, p.z + 0.075, 0, 0, -0.6), [0.6, 0.06, 0.04])
  // faixa de perigo no meio do cano (lê de longe como barreira)
  for (let k = -2; k <= 2; k++) g.cylinder(R * 2 + 0.02, 0.18, at(p.x + k * 0.36, cy, p.z, 0, 0, Math.PI / 2), k % 2 ? HAZ_K : HAZ_Y, 18)
}

/** Parte 6 — poça de graxa sobre o chão (afunda o pé uns 10 cm): borda recortada, bolhas, rastros e brilho. */
function grease(g: SoftGeo, _gl: SoftGeo, p: Pad) {
  const y = p.y + 0.17
  const W = p.hx * 2 - 0.8
  const D = p.hz * 2 - 0.6
  const GLINT: RGB = [0.17, 0.14, 0.24]
  const SHEEN: RGB = [0.07, 0.14, 0.15]
  g.box(W, 0.12, D, at(p.x, y - 0.06, p.z), (_x, yy) => (yy > 0 ? GREASE : mix(GREASE, [0.12, 0.1, 0.1], 0.5)))
  // borda recortada: manchas redondas transbordando nas duas pontas (entrada e saída)
  for (const s of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      const x = p.x - W / 2 + 1 + (k * (W - 2)) / 8 + (n01(k, s) - 0.5) * 0.8
      const r = 0.7 + n01(s, k) * 0.9
      g.cylinder(r * 2, 0.11, at(x, y - 0.05, p.z + s * (D / 2 - 0.1 + n01(k, s, 4) * 0.5)), GREASE, 14)
    }
  }
  // brilho oleoso: manchas finas violeta e verde-azulado (o arco-íris do óleo, apagado)
  for (let k = 0; k < 22; k++) {
    const x = p.x + (n01(k, 7) - 0.5) * (W - 1.5)
    const z = p.z + (n01(7, k) - 0.5) * (D - 1.5)
    const r = 0.4 + n01(k, 3) * 1.1
    g.sphere(r * 2, at(x, y + 0.002 + k * 0.0004, z, n01(k, 9) * 3), k % 3 ? GLINT : SHEEN, 10, 1.9, 0.01, 0.6)
  }
  // rastros arrastados (pé de quem passou) correndo para +z
  for (let k = 0; k < 10; k++) {
    const x = p.x + (n01(k, 11) - 0.5) * (W - 3)
    const z = p.z + (n01(11, k) - 0.5) * (D - 6)
    const L = 2 + n01(k, 12) * 3
    g.box(0.35, 0.012, L, at(x, y + 0.012, z, (n01(k, 13) - 0.5) * 0.4), mix(GREASE, GLINT, 0.55))
  }
  // bolhas: meia esfera escura com o ponto de luz
  for (let k = 0; k < 30; k++) {
    const x = p.x + (n01(k, 21) - 0.5) * (W - 1)
    const z = p.z + (n01(21, k) - 0.5) * (D - 1)
    const r = 0.08 + n01(k, 22) * 0.18
    g.sphere(r * 2, at(x, y, z), mix(GREASE, GLINT, 0.4), 6, 1, 0.7, 1)
    g.sphere(r * 0.5, at(x - r * 0.3, y + r * 0.55, z - r * 0.3), [0.75, 0.72, 0.85], 4)
    if (k % 4 === 0) g.torus(r * 6, 0.035, at(x, y + 0.004, z), mix(GREASE, GLINT, 0.8), 16)
  }
}

/** Peças fixas da fase: devolve true se o pad foi desenhado aqui (o resto segue o desenho comum). */
export function comportasPad(g: SoftGeo, gl: SoftGeo, p: Pad): boolean {
  if (isGateWall(p)) {
    gateWall(g, gl, p)
    return true
  }
  if (isPipeWall(p)) {
    pipeWall(g, gl, p)
    return true
  }
  return false
}

/** Por cima do chão (o chão comum já foi desenhado): graxa. */
export function comportasFloor(g: SoftGeo, gl: SoftGeo, p: Pad) {
  if (isGrease(p)) grease(g, gl, p)
}

export function comportasPost(g: SoftGeo, gl: SoftGeo, q: Post) {
  coil(g, gl, q)
}

/**
 * As comportas que se mexem: uma malha por tipo (alta, baixa, funda) e uma instância por comporta (1 chamada
 * por tipo); a luz de cada comporta (verde embaixo, vermelha subindo/em cima) = duas malhas instanciadas.
 */
export class ComportasGates {
  private readonly bases: Mesh[] = []
  private readonly items: { inst: InstancedMesh; p: Pad; green: InstancedMesh; red: InstancedMesh }[] = []

  constructor(scene: Scene, toy: Material, glowMat: Material, course: Course) {
    const kinds = new Map<string, Mesh>()
    // a luz: faixa acesa no chão, rente à frente e atrás de cada comporta (largura dela), com 3 setas
    // (uma malha por cor e por fundura de comporta: 4 chamadas no total)
    const lamps = new Map<string, Mesh>()
    const lamp = (col: RGB, name: string, hz: number) => {
      const key = `${name}-${hz}`
      const had = lamps.get(key)
      if (had) return had
      const lg = new SoftGeo()
      for (const s of [-1, 1]) {
        const z = s * (hz + 0.35)
        lg.box(2.9, 0.05, 0.2, at(0, 0, z), col)
        // setas (›) apontando o caminho (+z), dos dois lados
        for (const x of [-0.9, 0, 0.9]) for (const a of [-1, 1]) lg.box(0.09, 0.05, 0.36, at(x + a * 0.11, 0, z + 0.42 * -s, a * 0.75), col)
      }
      const m = lg.build(key, scene, glowMat, false)
      m.isVisible = false
      this.bases.push(m)
      lamps.set(key, m)
      return m
    }
    for (const p of course.pads) {
      if (!isGate(p)) continue
      const key = `${p.hx}-${p.hz}-${p.gh}`
      let base = kinds.get(key)
      if (!base) {
        const g = new SoftGeo()
        const gl = new SoftGeo()
        gateGeo(g, gl, p.hx, p.hz, p.gh)
        base = g.build(`comportas-gate-${key}`, scene, toy, false)
        base.isVisible = false
        kinds.set(key, base)
        this.bases.push(base)
      }
      const inst = base.createInstance(`comportas-gate-${this.items.length}`)
      inst.isPickable = false
      inst.position.set(p.x, p.y, p.z)
      const green = lamp(LIT_G, "comportas-lamp-g", p.hz).createInstance(`comportas-lg-${this.items.length}`)
      const red = lamp(LIT_R, "comportas-lamp-r", p.hz).createInstance(`comportas-lr-${this.items.length}`)
      for (const l of [green, red]) {
        l.isPickable = false
        l.position.set(p.x, DECK + 0.1, p.z)
      }
      this.items.push({ inst, p, green, red })
    }
  }

  update(t: number) {
    for (const it of this.items) {
      const p = it.p
      const lift = gateLift(p, t)
      it.inst.position.y = p.y + p.gh * lift
      // vermelha: subindo, em cima ou prestes a subir (0,5 s antes)
      const warn = gateLift(p, t + 0.5) > 0 || lift > 0.02
      it.green.setEnabled(!warn)
      it.red.setEnabled(warn)
    }
  }

  dispose() {
    for (const it of this.items) {
      it.inst.dispose()
      it.green.dispose()
      it.red.dispose()
    }
    for (const b of this.bases) b.dispose()
  }
}


