// features/meu-mundo/gincana/engine/backdrops.ts — GINCANA 2.0 (2026-11-16): o cenário em volta de cada Domínio.
//
// Só desenho, longe de quem corre (|x| ≥ 14): a regra e a colisão seguem em
// sim/courses.ts. Em código, sem Tripo (a regra dos minijogos desde 14/11):
// árvores gigantes, cogumelos acesos e a lua (Floresta); mesas listradas e
// pedras flutuando (Cânion); planeta com anel, torres de neon e estrelas
// (Orbital); vulcões com cratera acesa e chaminés (Forja); a fábrica do kit
// steampunk (Fábrica); icebergs, montanhas nevadas e aurora (Mar de Gelo).
// `lit` = malha com luz (cor por vértice); `glow` = malha sem luz (brilha).

import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { SoftGeo, at, mix, stripesY, type RGB } from "./shapes"
import { SP, factorySkyline, smokestack, pipeRun, type SteamCtx } from "../../engine/steampunk/scenery"
import type { GincanaDeco } from "./phase-themes"
import type { Pad } from "../sim/course"
import { Z0, Z1, deckY, rnd, side, setSpan, spanK } from "./backdrop-base"
import { mesaTower } from "./backdrop-canion"
import { fallSplash, foamRing, glowRipple, lightPath } from "./backdrop-agua"
import { farTrunk, farWall, logPile, mossDrum, shroomLamp, tallTrunk } from "./backdrop-floresta"
import { orbitalField } from "./backdrop-orbital"
import { comportasShore, fabricaHall } from "./backdrop-fabrica"
import { iceSea } from "./backdrop-gelo"
import { forgeField, gridWindow } from "./backdrop-forja"

/** `castleZ`: onde fica o castelo da Forja (no meio da arena das Paredes de Brasa; o Alto-Forno o põe depois da chegada).
 * `finishZ`/`pads` (20/11): o fundo vai até o fim da prova (percurso dobrado) e sabe a altura do chão (`deckY`).
 * `phase` (metade C, 20/11): a Fábrica e o Mar de Gelo desenham o fundo pela miniatura de cada fase. */
export function buildBackdrop(deco: GincanaDeco, lit: SoftGeo, glow: SoftGeo, ctx: SteamCtx, low: boolean, castleZ = 64, finishZ = 260, pads: readonly Pad[] = [], phase = "") {
  setSpan(finishZ, pads)
  const n = (low ? 0.6 : 1) * spanK()
  switch (deco) {
    case "forest":
      return forest(lit, glow, n, phase)
    case "canyon":
      return canyon(lit, glow, n, phase === "moinhos")
    case "orbital":
      return orbital(lit, glow, n)
    case "forge":
      return forge(lit, glow, ctx, n, castleZ)
    case "factory":
      return factory(lit, glow, ctx, n, phase)
    case "ice":
      return ice(lit, glow, n, phase)
    default:
      return
  }
}

// ── Floresta da Lua ──────────────────────────────────────────────────────────

function forest(lit: SoftGeo, glow: SoftGeo, n: number, phase: string) {
  // Serraria (miniatura): pilhas de toras nas duas beiras do caminho de tábuas
  if (phase === "serraria") {
    for (let z = Z0 + 20, i = 0; z < Z1 - 40; z += 38, i++) {
      const s = i % 2 ? 1 : -1
      logPile(lit, s * (11.5 + rnd(i, 400) * 2), z + rnd(i, 401) * 10, 3 + (i % 2), 4 + rnd(i, 402) * 1.5, i, 0.15 * s)
    }
  }
  // miniaturas (20/11): muralha de troncos altos nos dois lados, 1ª fileira junto da prova
  for (let z = Z0, i = 0; z < Z1; z += 13, i++) {
    for (const s of [-1, 1]) {
      const k = i * 2 + (s > 0 ? 1 : 0)
      const x = s * (17 + rnd(k, 200) * 9)
      const zz = z + rnd(k, 201) * 7
      const d = 2.4 + rnd(k, 203) * 1.4
      tallTrunk(lit, glow, x, zz, deckY(zz) + 46 + rnd(k, 202) * 18, d, k)
      // água (miniatura): anel verde aceso em volta das raízes
      glowRipple(glow, x, zz, d * 1.25, [0.45, 1, 0.62], 2)
    }
  }
  farWall(lit, Z0, Z1)
  // água (miniatura): o reflexo da lua (prata-lilás) do horizonte até a largada e anéis acesos soltos no pântano
  lightPath(glow, { xFar: -40, xNear: -6, z0: Z0 + 20, z1: Z1 + 40, srcZ: Z1 + 140, core: [0.9, 0.96, 1], edge: [0.6, 0.62, 0.95], hwNear: 5, hwFar: 22, step: 1.6, fill: 4, w: 0.12 }, 300)
  for (let i = 0; i < Math.round(30 * n); i++) glowRipple(glow, side(i, 9 + rnd(i, 500) * 22), Z0 + rnd(i, 501) * (Z1 - Z0), 0.8 + rnd(i, 502) * 1.6, [0.4, 1, 0.6])
  // 2ª fileira (|x| 32–60) e 3ª (|x| 62–130, mais azulada): o fundo fechado de troncos da miniatura
  // (as árvores-bonsai com flores soltas no céu saíram — a miniatura não tem)
  for (let z = Z0 - 20, i = 0; z < Z1 + 40; z += 9, i++) {
    for (const s of [-1, 1]) {
      const k = 1000 + i * 2 + (s > 0 ? 1 : 0)
      const zz = z + rnd(k, 1) * 6
      const x2 = s * (32 + rnd(k, 2) * 28)
      farTrunk(lit, x2, zz, deckY(zz) + 50 + rnd(k, 3) * 20, 2.6 + rnd(k, 4) * 1.6, k, (Math.abs(x2) - 30) / 120)
      const x3 = s * (62 + rnd(k, 5) * 68)
      farTrunk(lit, x3, zz + 4, deckY(zz) + 55 + rnd(k, 6) * 25, 3 + rnd(k, 7) * 2, k + 1, Math.min(0.85, (Math.abs(x3) - 30) / 110))
    }
  }
  // cogumelos acesos nas ilhotas (rosa e ciano), longe do caminho
  const shrooms = Math.round(26 * n)
  for (let i = 0; i < shrooms; i++) {
    // miniaturas: luminárias na beira (|x| 13–15) e entre os troncos (|x| 28–34)
    const x = side(i + 1, i % 3 === 2 ? 28 + rnd(i, 11) * 6 : 13 + rnd(i, 11) * 2)
    const z = Z0 + 10 + (i / shrooms) * (Z1 - Z0 - 20) + rnd(i, 13) * 5
    shroomLamp(lit, glow, x, z, 1.4 + rnd(i, 12) * 2.4, i)
  }
  // ilhas de pedra com musgo e cachoeira verde acesa (perto o bastante para ler)
  for (let i = 0; i < Math.round(12 * n); i++) {
    const x = side(i, 22 + rnd(i, 70) * 18)
    const z = Z0 + 15 + i * 28
    mossDrum(lit, glow, x, z, 8 + rnd(i, 71) * 5, 8 + rnd(i, 72) * 7, i)
  }
  // vitórias-régias com flor de lótus acesa no pântano
  for (let i = 0; i < Math.round(60 * n); i++) {
    const x = side(i + 1, 13 + rnd(i, 90) * 22)
    const z = Z0 + rnd(i, 91) * (Z1 - Z0)
    const r = 1.2 + rnd(i, 92) * 1.6
    lit.cylinder(r * 2, 0.12, at(x, 0.1, z), [0.18, 0.5, 0.24], 9)
    if (i % 3 === 0) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        glow.sphere(0.6, at(x + Math.cos(a) * 0.3, 0.45, z + Math.sin(a) * 0.3, a, 0.6, 0), [0.95, 0.5, 0.95], 5, 0.5, 1, 1.4)
      }
      glow.sphere(0.35, at(x, 0.55, z), [1, 0.9, 0.4], 5)
    }
  }
  // a lua (Floresta da Lua) e um anel de vaga-lumes grandes no céu
  // a lua no fim da subida (aparece por cima da pista), com o mar da lua mais escuro
  const craters: [number, number, number][] = [[-14, 10, 9], [8, 18, 6], [12, -8, 11], [-6, -16, 7], [20, 4, 4]]
  glow.sphere(84, at(-40, 92 + deckY(Z1) * 0.6, Z1 + 140), (x, y): RGB => {
    let k = 0
    for (const [cx, cy, r] of craters) k = Math.max(k, 1 - Math.hypot(x - cx, y - cy) / r)
    return mix([0.94, 0.96, 1], [0.7, 0.76, 0.9], Math.min(1, k * 1.6))
  }, 28)
  // vaga-lumes em todo canto (miniatura): em nuvens (grupos de 5–9), perto e longe, amarelos e verdes
  for (let c = 0; c < Math.round(36 * n); c++) {
    const cx = side(c, 7 + rnd(c, 20) * 50)
    const cz = Z0 + rnd(c, 22) * (Z1 - Z0)
    const cy = deckY(cz) * 0.5 + 1.5 + rnd(c, 21) * 9
    for (let k = 0; k < 5 + (c % 5); k++) {
      const col: RGB = (c + k) % 3 ? [1, 0.88, 0.35] : [0.6, 1, 0.45]
      glow.sphere(0.2 + rnd(c * 9 + k, 23) * 0.22, at(cx + (rnd(c * 9 + k, 24) - 0.5) * 7, cy + (rnd(c * 9 + k, 25) - 0.5) * 4, cz + (rnd(c * 9 + k, 26) - 0.5) * 7), col, 3)
    }
  }
}

// ── Cânion ───────────────────────────────────────────────────────────────────

/**
 * V-Cânion (ref. v3): ilha de arenito flutuando. Camadas de blocos (cada camada um bloco grande + dois
 * que saltam, girados), estratos escuros finos, quina de cima clara e base de cada bloco escura;
 * tampa de grama, acácia de copa chata em dois andares, e embaixo o "pião" de rocha que some nas nuvens.
 * Numa a cada duas, a cachoeira acesa cai da beira virada para a prova.
 */
const SAND: RGB[] = [
  [0.86, 0.48, 0.3],
  [0.74, 0.36, 0.22],
  [0.92, 0.6, 0.38],
  [0.8, 0.42, 0.28],
]
function sandPaint(base: RGB, lh: number, seed: number) {
  return (x: number, y: number, z: number): RGB => {
    const t = (y + lh / 2) / lh
    const strata = Math.abs(Math.sin(y * 2.6 + seed + Math.sin(x * 0.3 + z * 0.2) * 0.6)) < 0.08
    let c = mix(mix(base, [0, 0, 0], 0.4), base, Math.min(1, t * 1.6))
    if (t > 0.92) c = mix(c, [1, 0.86, 0.66], 0.45)
    if (strata) c = mix(c, [0.3, 0.14, 0.1], 0.5)
    return c
  }
}
function rockIsland(lit: SoftGeo, glow: SoftGeo, x: number, yTop: number, z: number, w: number, layers: number, seed: number, fall: boolean, tree = true) {
  const lh = Math.min(4 + rnd(seed, 1) * 3, w * 0.55)
  let y = yTop
  for (let k = 0; k < layers; k++) {
    const sc = 1 - k * 0.1
    const base = SAND[(seed + k) % SAND.length]
    const yaw = rnd(seed, 10 + k) * 0.6
    lit.box(w * sc, lh, w * sc * 0.82, at(x, y - lh / 2, z, yaw), sandPaint(base, lh, seed + k))
    // estrato: friso de pedra mais escura que sai um palmo do bloco, e duas rachaduras verticais
    lit.box(w * sc + 0.5, 0.35, w * sc * 0.82 + 0.5, at(x, y - lh * 0.55, z, yaw), mix(base, [0.25, 0.1, 0.08], 0.45))
    for (let c = 0; c < 2; c++) {
      const cx = (rnd(seed, 90 + k * 2 + c) - 0.5) * w * sc * 0.8
      lit.box(0.3, lh * 0.7, 0.3, at(x + Math.cos(yaw) * cx, y - lh * 0.45, z - w * sc * 0.41 * (c ? 1 : -1) - Math.sin(yaw) * cx, yaw), [0.32, 0.14, 0.1])
    }
    // dois blocos que saltam do contorno (silhueta quebrada)
    for (let b = 0; b < 2; b++) {
      const a = rnd(seed, 20 + k * 3 + b) * Math.PI * 2
      const bw = w * sc * (0.3 + rnd(seed, 30 + k + b) * 0.2)
      const bh = lh * (0.6 + rnd(seed, 40 + k + b) * 0.35)
      lit.box(bw, bh, bw * 0.9, at(x + Math.cos(a) * w * sc * 0.45, y - lh + bh / 2, z + Math.sin(a) * w * sc * 0.38, a), sandPaint(SAND[(seed + k + b + 1) % SAND.length], bh, seed + 7 * b))
    }
    y -= lh
  }
  // o pião embaixo: afina até a ponta, escurecendo
  const deep = w * 0.9
  lit.cylinder(w * 0.12, deep, at(x, y - deep / 2, z, rnd(seed, 5)), (_x, yy) => mix([0.28, 0.12, 0.1], [0.66, 0.32, 0.22], Math.min(1, (yy + deep / 2) / deep + 0.2)), 7, w * 0.72)
  // tampa de grama (beira mais clara) e tufos
  const gw = w * 0.96
  lit.box(gw, 0.7, gw * 0.8, at(x, yTop + 0.2, z, rnd(seed, 10) * 0.6), (_x, yy) => (yy > 0.2 ? [0.5, 0.66, 0.24] : [0.3, 0.42, 0.16]))
  for (let t = 0; t < 4; t++) {
    const a = rnd(seed, 50 + t) * Math.PI * 2
    const r = gw * 0.38 * rnd(seed, 60 + t)
    lit.sphere(1.6 + rnd(seed, 70 + t), at(x + Math.cos(a) * r, yTop + 0.7, z + Math.sin(a) * r), [0.34, 0.5, 0.18], 5, 1, 0.6, 1)
  }
  if (!tree) return
  // acácia: tronco que entorta, copa chata em dois andares (escura embaixo, clara em cima)
  const ta = rnd(seed, 80) * Math.PI * 2
  const tx = x + Math.cos(ta) * gw * 0.18
  const tz = z + Math.sin(ta) * gw * 0.18
  const lean = (rnd(seed, 81) - 0.5) * 0.5
  lit.cylinder(1.1, 5, at(tx, yTop + 2.9, tz, 0, 0, lean), [0.3, 0.2, 0.13], 6, 0.7)
  const cx = tx - Math.sin(lean) * 5
  const cw = gw * 0.6
  lit.sphere(cw, at(cx, yTop + 5.6, tz), [0.22, 0.38, 0.14], 9, 1, 0.22, 0.9)
  lit.sphere(cw * 0.78, at(cx + 0.6, yTop + 6.5, tz - 0.4), [0.42, 0.62, 0.22], 9, 1, 0.2, 0.9)
  if (fall) {
    // a cachoeira acesa da beira virada para a prova, mais clara no meio, com névoa no pé
    const fx = x - Math.sign(x) * gw * 0.47
    const fh = yTop - y + deep * 0.5
    glow.box(3.6, fh, 1, at(fx, yTop - fh / 2, z), (xx, yy) => mix([0.55, 0.85, 0.95], [1, 1, 1], Math.abs(Math.sin(yy * 0.9 + xx * 2)) > 0.6 ? 0.7 : 0.15))
    glow.sphere(6, at(fx, yTop - fh, z), [0.95, 0.92, 1], 6, 1, 0.5, 1)
    for (const dz of [-1.2, 1.2]) glow.box(0.5, fh * 0.9, 0.3, at(fx - Math.sign(x) * 0.5, yTop - fh * 0.45, z + dz), [1, 1, 1])
    glow.box(2.8, 0.25, 1.4, at(fx + Math.sign(x) * 0.6, yTop + 0.45, z), [0.6, 0.9, 1])
  }
}

function canyon(lit: SoftGeo, glow: SoftGeo, n: number, wet = false) {
  // miniaturas (20/11): mesas-coluna de arenito em 3 faixas, perto/meio/longe, em alturas diferentes
  const bands: [number, number, number, number, number][] = [
    // |x| de, |x| até, passo em z, largura, fiadas
    [30, 26, 34, 12, 4],
    [62, 50, 30, 18, 6],
    [125, 80, 36, 28, 8],
  ]
  bands.forEach(([x0, dx, step, w0, c0], bi) => {
    for (let z = Z0 - 20, i = 0; z < Z1 + 40; z += step, i++) {
      for (const s of [-1, 1]) {
        const k = bi * 1000 + i * 2 + (s > 0 ? 1 : 0)
        const zz = z + rnd(k, 1) * step * 0.6
        const w = w0 * (0.75 + rnd(k, 2) * 0.6)
        const yTop = deckY(zz) + 6 + bi * 8 + rnd(k, 3) * (14 + bi * 10)
        const mx = s * (x0 + rnd(k, 4) * dx)
        const { bottom, fallX } = mesaTower(lit, glow, mx, yTop, zz, w, c0 + Math.floor(rnd(k, 5) * 3), k, k % 3 === 0, bi === 2)
        // água (Moinhos): espuma onde o pião entra na água
        // (se as fiadas já entram na água, o anel abraça a coluna; senão, o pião na altura da água)
        // e no pé da cachoeira (quando ela chega na água)
        if (wet && bi < 2 && !Number.isNaN(fallX) && bottom < 6) fallSplash(glow, fallX, zz, k)
        if (wet && bottom < 0 && bi < 2) foamRing(glow, mx, zz, bottom + w * 0.7 < 0 ? w * 0.47 : w * (0.05 + 0.3 * (-bottom / (w * 0.7))) + 0.5, k)
      }
    }
  })
  // o sol do fim de tarde, grande e baixo à frente da prova (miolo amarelo, borda laranja, halo rosado)
  glow.sphere(90, at(0, 18, 560), (x, y) => mix([1, 0.62, 0.3], [1, 0.92, 0.5], Math.max(0, 1 - Math.hypot(x, y) / 45)), 16, 1, 1, 0.2)
  glow.torus(118, 6, at(0, 18, 566, 0, Math.PI / 2, 0), [1, 0.7, 0.62], 40)
  // água (Moinhos): o reflexo do sol no lugar do mar de nuvens e das brasas
  // o sol baixo (x 0, z 560): miolo dourado, borda laranja-rosada, mais largo que a pista
  if (wet) lightPath(glow, { xFar: 0, xNear: 0, z0: Z0 + 30, z1: 545, srcZ: 560, core: [1, 0.95, 0.66], edge: [1, 0.5, 0.36], hwNear: 14, hwFar: 44, step: 1.1, fill: 7 })
  // mar de nuvens embaixo da prova (o abismo some nas nuvens, como na referência)
  for (let i = 0; i < (wet ? 0 : Math.round(70 * n)); i++) {
    const x = side(i, 4 + rnd(i, 80) * 90)
    const z = Z0 + rnd(i, 81) * (Z1 - Z0 + 60)
    const s = 12 + rnd(i, 82) * 16
    lit.sphere(s, at(x, -4.5 + rnd(i, 83) * 3, z), (_x, y) => mix([0.96, 0.7, 0.74], [1, 0.95, 0.92], Math.min(1, Math.max(0, y / (s * 0.42) + 0.5 + rnd(i, 84) * 0.2))), 6, 1, 0.42, 1)
  }
  // ilhotas flutuando sobre o abismo (a mesma pedra das ilhas, pequena; uma a cada três com acácia)
  for (let i = 0; i < Math.round(26 * n); i++) {
    const x = side(i + 1, 16 + rnd(i, 30) * 40)
    const z = Z0 + rnd(i, 31) * (Z1 - Z0)
    const y = 8 + rnd(i, 32) * 30
    const s = 3 + rnd(i, 33) * 6
    rockIsland(lit, glow, x, y, z, s, 1, i + 100, false, i % 3 === 0)
  }
  // brasas de sol no fundo do abismo
  for (let i = 0; i < (wet ? 0 : Math.round(30 * n)); i++) glow.sphere(0.5, at(side(i, 6 + rnd(i, 40) * 20), -6 - rnd(i, 41) * 10, Z0 + rnd(i, 42) * (Z1 - Z0)), [1, 0.6, 0.3], 3)
}

// ── Cidade Orbital ───────────────────────────────────────────────────────────

function orbital(lit: SoftGeo, glow: SoftGeo, n: number) {
  // planeta com faixas e o anel
  lit.sphere(170, at(170, 40, 420), stripesY([0.42, 0.3, 0.7], [0.66, 0.42, 0.78], 18, 0.1), 20)
  glow.torus(300, 4, at(170, 40, 420, 0.3, 0.35, 0.2), [0.5, 0.8, 1], 48)
  glow.sphere(30, at(-160, 90, 260), [1, 0.86, 0.6], 12)
  // ilhas, torres e o arranjo em três camadas (20/11, pela miniatura): backdrop-orbital.ts
  orbitalField(lit, glow, n)
  // anéis de tráfego (aros acesos) e discos flutuantes
  for (let i = 0; i < Math.round(8 * n); i++) {
    glow.torus(10 + rnd(i, 50) * 8, 0.4, at(side(i, 22 + rnd(i, 51) * 20), 12 + rnd(i, 52) * 18, Z0 + 20 + i * 38, 0, Math.PI / 2, 0), [0.4, 0.9, 1], 24)
  }
  // estrelas
  // estrelas numa esfera fixa: não crescem com o comprimento da prova
  for (let i = 0; i < Math.round(160 * Math.min(1, n)); i++) {
    const a = rnd(i, 60) * Math.PI * 2
    const e = 0.08 + rnd(i, 61) * 1.3
    const r = 520
    glow.sphere(1.2 + rnd(i, 62) * 1.6, at(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r - 40, 130 + Math.sin(a) * Math.cos(e) * r), [1, 1, 1], 3)
  }
}

// ── Forja ────────────────────────────────────────────────────────────────────

/**
 * V-Forja (ref. v3): o castelo da forja atrás da arena, de onde as paredes de brasa "saem". Torre do meio
 * com o portão em arco aceso (grade escura na frente), ameias, duas torres redondas com janelas acesas e
 * coroa de ameias, contrafortes e a lava escorrendo das bocas laterais até o mar de lava.
 */
function forgeCastle(lit: SoftGeo, glow: SoftGeo, cx: number, cz: number) {
  const STONE: RGB = [0.2, 0.15, 0.14]
  const DARK: RGB = [0.1, 0.08, 0.08]
  const stone = (h: number) => (_x: number, y: number): RGB => (y > h / 2 - 0.4 ? [0.34, 0.24, 0.2] : y < -h / 2 + 2 ? DARK : STONE)
  // corpo e portão
  const W = 30
  const H = 24
  lit.box(W, H, 10, at(cx, H / 2 - 1, cz), stone(H))
  for (let k = 0; k < 8; k++) lit.box(2.4, 2.2, 10.6, at(cx - W / 2 + 1.6 + k * ((W - 3.2) / 7), H + 0.1, cz), stone(2.2))
  glow.box(10, 12, 0.4, at(cx, 6 - 1, cz - 5.1), (_x, y) => mix([1, 0.9, 0.4], [1, 0.3, 0.05], (y + 6) / 12))
  glow.cylinder(10, 0.4, at(cx, 11 - 1, cz - 5.1, 0, Math.PI / 2, 0), [1, 0.36, 0.06], 16)
  for (let b = 0; b < 6; b++) lit.box(0.4, 13, 0.6, at(cx - 4.2 + b * 1.68, 5.5 - 1, cz - 5.4), DARK)
  for (let r = 0; r < 4; r++) lit.box(10.4, 0.4, 0.6, at(cx, 1.5 + r * 3, cz - 5.4), DARK)
  // frisos de pedra (saltam do plano), juntas desencontradas e seteiras acesas: o corpo não é chapa lisa
  for (const fy of [7.5, 15.5, 21.5]) lit.box(W + 0.6, 0.7, 10.8, at(cx, fy, cz), [0.3, 0.22, 0.19])
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 9; c++) {
      const jx = cx - W / 2 + 1.8 + c * 3.4 + (r % 2) * 1.7
      if (Math.abs(jx - cx) < 6.2 && r < 4) continue
      lit.box(0.16, 1.8, 0.2, at(jx, 1.6 + r * 3.6, cz - 5.05), DARK)
    }
  }
  for (const sx of [-1, 1]) for (const wy of [10, 18.5]) glow.box(0.7, 2.4, 0.3, at(cx + sx * 9.5, wy, cz - 5.1), [1, 0.58, 0.14])
  // 20/11 (miniatura): as janelas grandes em grade do andar de cima, acesas
  for (const sx of [-1, 1]) gridWindow(lit, glow, cx + sx * 4.2, 18.6, cz - 5.25, 4.6, 4.8)
  // faixa de perigo sobre o portão e o brasão (engrenagem de brasa)
  for (let q = 0; q < 8; q++) lit.box(1.5, 1, 0.5, at(cx - 5.25 + q * 1.5, 13 - 1, cz - 5.2), q % 2 ? [0.08, 0.07, 0.07] : [1, 0.76, 0.1])
  glow.torus(5, 0.5, at(cx, 18, cz - 5.2, 0, Math.PI / 2, 0), [1, 0.5, 0.1], 20)
  // torres redondas
  for (const sx of [-1, 1]) {
    const tx = cx + sx * (W / 2 + 3)
    const th = H + 10
    lit.cylinder(9, th, at(tx, th / 2 - 1, cz), stone(th), 12, 8)
    lit.cylinder(10.4, 2, at(tx, th, cz), [0.3, 0.22, 0.19], 12)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      lit.box(1.6, 2, 1.2, at(tx + Math.cos(a) * 4.6, th + 1.8, cz + Math.sin(a) * 4.6, -a), stone(2))
    }
    for (let r = 0; r < 3; r++) glow.box(1.2, 2.6, 0.3, at(tx, 8 + r * 8, cz - 4.2), [1, 0.55, 0.12])
    for (const by of [th * 0.3, th * 0.62]) lit.cylinder(9.6, 0.9, at(tx, by, cz), [0.32, 0.24, 0.2], 12, 9.4)
    // lava escorrendo da boca lateral até o chão (degradê: amarelo na boca, vermelho no pé)
    const lx = cx + sx * (W / 2 - 3)
    glow.box(3, 14, 0.6, at(lx, 14 / 2 - 2, cz - 5.3), (_x, y) => mix([1, 0.3, 0.04], [1, 0.82, 0.3], (y + 7) / 14))
    lit.box(4.4, 1.4, 1.6, at(lx, 12.6, cz - 5.4), DARK)
  }
  // contrafortes
  for (const sx of [-1, 1]) for (const k of [0.3, 0.7]) lit.box(2, 14, 4, at(cx + sx * W * (k - 0.5) * 2 * 0.5 + sx * 6, 6, cz - 6), stone(14))
}

function forge(lit: SoftGeo, glow: SoftGeo, ctx: SteamCtx, n: number, castleZ: number) {
  const rock: RGB = [0.16, 0.12, 0.11]
  const count = Math.round(8 * n)
  for (let i = 0; i < count; i++) {
    const x = side(i, 70 + rnd(i) * 70)
    const z = Z0 + (i / count) * (Z1 - Z0) + 20
    const d = 60 + rnd(i, 2) * 40
    const h = 40 + rnd(i, 3) * 30
    lit.cylinder(d, h, at(x, h / 2 - 2, z), stripesY(rock, [0.24, 0.16, 0.12], 6, 0.2), 12, d * 0.22)
    glow.cylinder(d * 0.2, 1.2, at(x, h - 1.4, z), [1, 0.5, 0.1], 12)
    // rios de lava descendo
    for (let k = 0; k < 2; k++) {
      const a = (k ? 0.6 : -0.6) + (x > 0 ? Math.PI : 0)
      const len = h * 0.9
      glow.capsule(0.9, len, at(x + Math.sin(a) * d * 0.25, h * 0.5, z + Math.cos(a) * d * 0.25, a, 0.85, 0), [1, 0.4, 0.05], 6)
    }
  }
  // muralhas de ferro com janelas acesas dos dois lados (a fortaleza da forja, como na referência)
  for (let i = 0; i < Math.round(9 * n); i++) {
    const x = side(i, 32 + rnd(i, 140) * 16)
    const z = Z0 + 20 + i * 36
    const w = 14 + rnd(i, 141) * 10
    const h = 12 + rnd(i, 142) * 14
    lit.roundBox(6, h, w, 0.4, at(x, h / 2 - 1, z), stripesY([0.2, 0.17, 0.17], [0.26, 0.2, 0.18], 3, 0), 3)
    for (let k = 0; k < 3; k++) lit.roundBox(7, 2.4, 2.2, 0.2, at(x, h + 0.6, z - w / 2 + 1.5 + k * ((w - 3) / 2)), [0.24, 0.2, 0.19], 2)
    for (let r2 = 0; r2 < 2; r2++) {
      for (let k = 0; k < 3; k++) {
        glow.roundBox(6.2, 2.2, 1.1, 0.3, at(x, h * (0.35 + r2 * 0.32), z - w / 3 + (k * w) / 3), [1, 0.5, 0.1], 2)
      }
    }
    glow.roundBox(2, h + 4, 1.4, 0.6, at(x - Math.sign(x) * 3.4, h / 2 - 2, z + w * 0.3), [1, 0.45, 0.06], 2)
  }
  // chaminés da forja, rochas e braseiros perto do caminho
  for (let i = 0; i < Math.round(10 * n); i++) smokestack(ctx, side(i, 26 + rnd(i, 10) * 18), Z0 + 20 + i * 32, 18 + rnd(i, 11) * 14, 1.4 + rnd(i, 12), 0)
  for (let i = 0; i < Math.round(24 * n); i++) {
    const x = side(i + 1, 15 + rnd(i, 20) * 12)
    const z = Z0 + rnd(i, 21) * (Z1 - Z0)
    const s = 2 + rnd(i, 22) * 4
    lit.sphere(s, at(x, 0.2, z, rnd(i, 23) * 5), rock, 6, 1.2, 0.7, 1)
    if (i % 3 === 0) glow.sphere(s * 0.35, at(x, s * 0.4, z), [1, 0.55, 0.1], 5)
  }
  forgeCastle(lit, glow, 0, castleZ)
  // 20/11 (miniatura): torres de tambores e casarões de janelas acesas enchendo os lados
  forgeField(lit, glow, n)
  // brasas no ar
  for (let i = 0; i < Math.round(60 * n); i++) glow.sphere(0.22, at(side(i, 4 + rnd(i, 30) * 30), 2 + rnd(i, 31) * 22, Z0 + rnd(i, 32) * (Z1 - Z0)), [1, 0.62, 0.2], 3)
}

// ── Fábrica ──────────────────────────────────────────────────────────────────

function factory(lit: SoftGeo, glow: SoftGeo, ctx: SteamCtx, n: number, phase: string) {
  if (phase === "fabrica") return fabricaHall(lit, glow, ctx, n / spanK())
  if (phase === "comportas") comportasShore(lit, glow, n / spanK())
  // a silhueta de fábricas do kit steampunk dos dois lados
  factorySkyline(ctx, -95, 130, 50, Math.round(12 * n), -2, 21, 1.4)
  factorySkyline(ctx, 95, 130, 50, Math.round(12 * n), -2, 37, 1.4)
  for (let i = 0; i < Math.round(8 * n); i++) smokestack(ctx, side(i, 34 + rnd(i, 3) * 16), Z0 + 30 + i * 40, 26 + rnd(i, 4) * 16, 2 + rnd(i, 5), -2)
  // canos ao longo do canal de óleo
  for (const s of [-1, 1]) {
    pipeRun(ctx, [[s * 18, 1.5, Z0], [s * 18, 1.5, Z1]], 0.8, SP.copper)
    pipeRun(ctx, [[s * 20, 3.2, Z0], [s * 20, 3.2, Z1]], 0.55, SP.brass)
  }
  // lampiões de latão ao longo do canal (luz quente que se lê de longe) e engrenagens gigantes no alto
  for (const sx of [-1, 1]) {
    for (let z = Z0 + 6; z < Z1; z += 12) {
      const x = sx * 16.5
      lit.cylinder(0.36, 4.2, at(x, 2.1, z), stripesY(SP.brassDark, SP.copper, 1.4, 0), 8)
      lit.roundBox(0.9, 1.1, 0.9, 0.12, at(x, 4.6, z), SP.brass, 2)
      glow.roundBox(0.62, 0.8, 0.62, 0.1, at(x, 4.6, z), [1, 0.72, 0.3], 2)
    }
  }
  for (let i = 0; i < Math.round(6 * n); i++) {
    const x = side(i, 40 + rnd(i, 60) * 30)
    const z = Z0 + 30 + i * 52
    const r = 9 + rnd(i, 61) * 6
    lit.cylinder(r * 2, 1.6, at(x, 22 + rnd(i, 62) * 10, z, 0, 0, Math.PI / 2), (yy, _x, zz) => (Math.hypot(yy, zz) > r * 0.8 ? SP.brass : SP.copper), 20)
  }
  // engrenagens gigantes paradas e placas de perigo
  for (let i = 0; i < Math.round(10 * n); i++) {
    const x = side(i, 24 + rnd(i, 7) * 10)
    const z = Z0 + 15 + i * 30
    const r = 4 + rnd(i, 8) * 5
    lit.cylinder(r * 2, 1, at(x, r + 1, z, 0, 0, Math.PI / 2), stripesY(SP.iron, SP.steel, 1.4, 0), 18)
    glow.sphere(0.8, at(x, r * 2 + 2, z), [1, 0.75, 0.2], 5)
  }
  for (let i = 0; i < Math.round(30 * n); i++) lit.roundBox(2, 2, 2, 0.15, at(side(i + 1, 14 + rnd(i, 9) * 6), 0.4, Z0 + rnd(i, 10) * (Z1 - Z0), rnd(i, 11)), stripesY([0.9, 0.7, 0.1], [0.12, 0.12, 0.12], 0.5, 1), 2)
}

// ── Mar de Gelo ──────────────────────────────────────────────────────────────

function ice(lit: SoftGeo, glow: SoftGeo, n: number, phase: string) {
  // metade C (20/11): penhascos, icebergs e banquisas pela miniatura de cada fase (backdrop-gelo.ts)
  iceSea(lit, glow, n / spanK(), phase)
  const white: RGB = [0.92, 0.96, 1]
  const blue: RGB = [0.6, 0.78, 0.94]
  // V-Gelo (ref. v3): placas de gelo hexagonais boiando, tampa de neve com beira azulada, lado ciano
  // escurecendo para baixo e pingentes embaixo da beira (o que dá a cara de "gelo que pinga")
  for (let i = 0; i < Math.round(46 * n); i++) {
    // metade fica em volta do rolo (onde a câmera olha), o resto ao longe
    const x = side(i, 11 + rnd(i, 200) * (i % 2 ? 22 : 40))
    const z = i % 2 ? -24 + rnd(i, 201) * 90 : Z0 + 20 + rnd(i, 201) * (Z1 - Z0 - 40)
    if (Math.abs(x) < 13 && z > -6 && z < 40) continue
    const d = 4 + rnd(i, 202) * 6
    const y = 0.25 + rnd(i, 203) * 0.5
    const yaw = rnd(i, 204) * 3
    // estaleiro: placas redondas (a miniatura mostra discos de gelo); nas outras, sextavadas
    const fs = phase === "estaleiro" ? 10 : 6
    lit.cylinder(d, 1, at(x, y, z, yaw), (_x, yy) => mix([0.18, 0.5, 0.78], [0.55, 0.85, 1], yy + 0.5), fs, d * 1.04)
    lit.cylinder(d * 1.02, 0.3, at(x, y + 0.6, z, yaw), (xx, _yy, zz) => (Math.hypot(xx, zz) > d * 0.42 ? [0.72, 0.9, 1] : [0.94, 0.98, 1]), fs)
    // rachadura funda (uma placa em cada três)
    if (i % 3 === 0) lit.box(d * 0.8, 0.05, 0.12, at(x, y + 0.76, z, yaw + 0.7), [0.3, 0.6, 0.85])
    for (let k = 0; k < 6; k++) {
      const a = yaw + (k / 6) * Math.PI * 2 + 0.5
      const ih = 0.6 + rnd(i, 210 + k) * 1.4
      lit.cylinder(0.02, ih, at(x + Math.cos(a) * d * 0.44, y - 0.5 - ih / 2, z + Math.sin(a) * d * 0.44), [0.7, 0.92, 1], 4, 0.36)
    }
  }
  // icebergs no mar
  for (let i = 0; i < Math.round(16 * n); i++) {
    const x = side(i + 1, 18 + rnd(i, 10) * 50)
    const z = Z0 + rnd(i, 11) * (Z1 - Z0)
    const w = 4 + rnd(i, 12) * 10
    const h = 3 + rnd(i, 13) * 12
    lit.cylinder(w, h, at(x, h / 2 - 0.5, z, rnd(i, 14) * 3), mix(white, blue, rnd(i, 15) * 0.6), 5 + (i % 3), w * (0.3 + rnd(i, 16) * 0.4))
  }
  // cristais acesos perto do caminho
  for (let i = 0; i < Math.round(20 * n); i++) {
    const x = side(i, 14 + rnd(i, 20) * 6)
    const z = Z0 + 10 + rnd(i, 21) * (Z1 - Z0 - 20)
    const h = 2 + rnd(i, 22) * 4
    glow.cylinder(0.9, h, at(x, h / 2, z, 0, (rnd(i, 23) - 0.5) * 0.5, (rnd(i, 24) - 0.5) * 0.5), [0.6, 0.9, 1], 5, 0.05)
  }
}

/**
 * Alvos flutuantes (todas as fases, 17/11): discos de anéis concêntricos com o neon da fase por baixo e a
 * ponta embaixo — o enfeite de programa de TV que as 7 referências repetem dos dois lados da prova.
 */
export function buildTargets(lit: SoftGeo, glow: SoftGeo, deco: GincanaDeco, neon: RGB, low: boolean) {
  const ringA: RGB = deco === "forge" ? [0.85, 0.16, 0.1] : [0.95, 0.36, 0.58]
  const ringB: RGB = deco === "forge" ? [1, 0.78, 0.4] : [1, 0.92, 0.86]
  const base: RGB = deco === "orbital" ? [0.3, 0.28, 0.44] : deco === "ice" ? [0.62, 0.78, 0.92] : deco === "forge" ? [0.18, 0.15, 0.15] : [0.62, 0.38, 0.2]
  const count = low ? 8 : 14
  for (let i = 0; i < count; i++) {
    const x = side(i, 15.5 + rnd(i, 100) * 9)
    const z = Z0 + 50 + (i / count) * (Z1 - Z0 - 60) + rnd(i, 101) * 10
    const y = 2 + rnd(i, 102) * 5
    const r = 2 + rnd(i, 103) * 1.4
    // anéis concêntricos = discos empilhados (a tampa do cilindro não tem vértice no meio para pintar anel)
    lit.cylinder(r * 2, 0.7, at(x, y, z), base, 20)
    lit.cylinder(r * 1.86, 0.06, at(x, y + 0.37, z), ringA, 20)
    lit.cylinder(r * 1.36, 0.06, at(x, y + 0.39, z), ringB, 18)
    lit.cylinder(r * 0.86, 0.06, at(x, y + 0.41, z), ringA, 16)
    lit.cylinder(r * 0.4, 0.06, at(x, y + 0.43, z), ringB, 12)
    lit.torus(r * 2 + 0.2, 0.32, at(x, y - 0.05, z), base, 18)
    glow.torus(r * 2 - 0.2, 0.14, at(x, y - 0.42, z), neon, 16)
    lit.cylinder(0.1, r * 1.3, at(x, y - 0.35 - r * 0.65, z), base, 10, r * 1.2)
    glow.cylinder(0.02, r * 0.9, at(x, y - 0.6 - r * 1.3, z), neon, 6, 0.4)
  }
}

/** Aurora (só no Mar de Gelo, à noite): faixas acesas no alto. */
export function buildAurora(g: SoftGeo) {
  // V-Gelo (ref. v3): três cortinas onduladas no céu ao fundo, cada uma de faixas finas lado a lado.
  // O material é aditivo (preto some): verde aceso embaixo → magenta em cima, sumindo nas duas pontas.
  const curtain = (zc: number, y0: number, h: number, ph: number, amp: number) => {
    for (let k = 0; k < 64; k++) {
      const x = -280 + k * 8.8
      const z = zc + Math.sin(k * 0.21 + ph) * amp + Math.sin(k * 0.07 + ph * 2) * amp * 0.6
      const hh = h * (0.75 + 0.25 * Math.sin(k * 0.33 + ph))
      const edge = Math.min(1, k / 10, (63 - k) / 10)
      const yaw = Math.atan2(Math.cos(k * 0.21 + ph) * amp * 0.21, 8.2)
      // a caixa só tem vértice em cima e embaixo: quatro pedaços empilhados para o degradê aparecer
      const colorAt = (t: number): RGB => {
        const fade = Math.min(1, t / 0.12) * Math.min(1, (1 - t) / 0.35) * edge
        const c = mix([0.1, 0.9, 0.4], [0.75, 0.15, 0.9], Math.min(1, Math.max(0, (t - 0.2) / 0.55)))
        return [c[0] * fade, c[1] * fade, c[2] * fade]
      }
      const T = [0, 0.12, 0.4, 0.65, 1]
      for (let q = 0; q < 4; q++) {
        const sh = hh * (T[q + 1] - T[q])
        g.box(9.2, sh, 0.3, at(x, y0 + hh * T[q] + sh / 2, z, -yaw), (_x, y) => colorAt(T[q] + ((y + sh / 2) / sh) * (T[q + 1] - T[q])))
      }
    }
  }
  curtain(520, 95, 90, 0, 40)
  curtain(640, 120, 100, 2.1, 50)
  curtain(440, 130, 60, 4.2, 30)
}
