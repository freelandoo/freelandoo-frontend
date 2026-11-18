// features/meu-mundo/gincana/sim/courses.ts — GINCANA 2.0 (2026-11-16): as FASES.
//
// "cidade" é o percurso de sempre (mm3d-47), com os MESMOS números. As outras
// seis são uma por Domínio (pedido do Alex: "6 fases como cada Domínio, com o
// tema de cada um", inspiradas nas provas de corrida dos party games de
// feijão — portas falsas, plataformas que andam, piso que cai, esteiras):
//
//  floresta — Floresta da Lua: cogumelos que lançam, raízes que giram, portas
//             de cipó, ponte de folhas que cai, troncos rolando.
//  canion   — Cânion: pedras flutuantes que andam, pêndulos de pedra, portões
//             que empurram, desfiladeiro com pistões de rocha, avalanche.
//  orbital  — Cidade Orbital: esteiras para trás, anéis que giram, hexágonos
//             que somem, barreiras de energia, esferas rolando.
//  forja    — Forja: martelos, pistões dos dois lados, esteiras de lado sobre
//             a lava, grade que cai, rochas derretidas.
//  fabrica  — Fábrica: esteira das prensas, engrenagens que giram, portas de
//             aço, prensas deslizantes, barris.
//  gelo     — Mar de Gelo: lago que escorrega, estalactites, placas de gelo
//             que andam, gelo fino, bolas de neve.
//
// O desenho de cada fase (cores, cenário, nomes) fica no front
// (engine/course-view.ts + engine/phase-themes.ts); aqui só a regra. Fase nova
// = uma função aqui + a entrada em COURSES + o tema + GINCANA_PHASES.

import { CourseKit, DECK, GINCANA, type Course, type GincanaPhase, type RoutePoint } from "./course"

/** Largada (2 filas de 4) e a ponte larga: igual em todas as fases. */
function kitStart(k: CourseKit) {
  k.box(0, 0, 10, 8, 6, 7, 0)
  // ponte larga: quem larga na ponta e corre reto não cai na água
  k.box(0, 11.5, 7, 3.6, 0, 1, 0)
  for (const x of [-4, 0, 4]) k.logo(x, 12.5)
}

/** Subida de 36 m com bolas e o patamar da chegada; devolve o z da linha. */
function kitFinish(k: CourseKit, z0: number, every: number, v: number, R: number) {
  const z1 = z0 + 36
  k.slope(0, z0, z1, DECK, DECK + 6, 6, 0, 1, 5)
  k.balls = { lanes: [-4.3, -1.45, 1.45, 4.3], every, v, R, zEnd: z0 - 3 }
  k.box(0, z1 + 7.8, 9, 7.8, 1, 0, 6, 0, 1.6, DECK + 6)
  for (const [x, dz] of [[-4.3, 12], [0, 20], [4.3, 28]] as [number, number][]) k.logo(x, z0 + dz, DECK + (6 * dz) / 36)
  return z1 + 8.8
}

/** Rota pela subida até a linha. */
function routeFinish(add: (x: number, z: number) => void, z0: number, finishZ: number) {
  for (let z = z0 + 1; z <= z0 + 35; z += 2.5) add(0, z)
  add(0, finishZ - 7)
  add(0, finishZ - 2)
  add(0, finishZ + 3)
}

/** Rota que só anda para +z (o computador mira o primeiro ponto adiante). */
function routeOf(fill: (add: (x: number, z: number, m?: number) => void) => void) {
  const out: RoutePoint[] = []
  fill((x, z, m) => out.push(m === undefined ? { x, z } : { x, z, m }))
  return out
}

// ═══ cidade — o percurso de sempre (mm3d-47) ═════════════════════════════════

function courseCidade(): Course {
  const k = new CourseKit()
  kitStart(k)
  // ── 1. carrossel ──
  const carousel = (x: number, z: number, r: number, w: number, a0: number, both: boolean, c: number) => {
    k.disc(x, z, r, c, 1, 1)
    k.post(x, z, 0.8, DECK, DECK + 2.4, 1)
    k.sweep(x, z, DECK + 0.55, r + 0.3, 0.32, w, a0, both)
  }
  carousel(0, 24, 9, 1.15, 0, false, 0)
  for (const s of [-1, 1]) k.box(4.5 * s, 35.2, 1.6, 4.3, 2, 7, 1)
  carousel(-6.5, 46, 7, -1.4, 0.6, false, 4)
  carousel(6.5, 46, 7, 1.7, 1.9, false, 4)
  for (const s of [-1, 1]) k.box(4.5 * s, 55, 1.6, 3.2, 2, 7, 1)
  carousel(0, 66, 9.5, 0.95, 0.4, true, 0)
  k.box(0, 79, 2.2, 4, 6, 7, 1)
  // ── 2. passarelas ──
  k.box(0, 87, 8, 4, 1, 0, 2)
  const LANES = [-5, 0, 5]
  for (const x of LANES) k.beam(x, 90.6, x, 105, 1.5, 0, 1, 2)
  for (const x of LANES) k.disc(x, 105, 1.7, 1, 0, 2)
  k.beam(-5, 105, -5, 119, 1.5, 0, 1, 2)
  k.beam(5, 105, 5, 119, 1.5, 0, 1, 2)
  k.beam(0, 105, -5, 119, 1.5, 0, 1, 2)
  k.beam(0, 105, 5, 119, 1.5, 0, 1, 2)
  for (const x of LANES) k.disc(x, 119, 1.7, 1, 0, 2)
  for (const x of LANES) k.beam(x, 119, x, 133.4, 1.5, 0, 1, 2)
  const swing = (x: number, z: number, ph: number) => k.swing(x, z, DECK + 9, 7.4, 1.1, 0.95, 2.2, ph)
  swing(-5, 98, 0)
  swing(0, 98, 2.1)
  swing(5, 98, 4.2)
  swing(-5, 112, 1.1)
  swing(-2.5, 112, 3.3)
  swing(2.5, 112, 0.2)
  swing(5, 112, 2.6)
  swing(-5, 126, 3.9)
  swing(0, 126, 1.6)
  swing(5, 126, 5.0)
  // ── 3. luvas ──
  k.box(0, 137, 8, 4, 6, 7, 3)
  k.box(0, 162, 7, 21, 2, 4, 3)
  for (let i = 0; i < 7; i++) {
    const left = i % 2 === 0
    const z = 146 + i * 5
    const x0 = left ? -9.4 : 9.4
    k.glove(x0, z, DECK + 1.0, left ? 1 : -1, 8.2, 1.15, 2.6, i * 0.83)
    k.post(x0, z, 1.0, -1, DECK + 2.2, 6)
  }
  for (const [x, z] of [[-3, 149], [3.5, 153], [0, 158], [-4, 164], [2.5, 168], [-1.5, 174], [4, 178]] as [number, number][]) {
    k.post(x, z, 0.55, DECK, DECK + 1.1, 4)
  }
  // ── 4. xadrez ──
  k.box(0, 187.3, 7, 4.3, 1, 0, 4)
  for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) k.tile((c - 2.5) * 2.9, 193 + r * 2.9, 1.3, (r + c) % 2 === 0 ? 2 : 5)
  k.box(0, 216.5, 7, 4.7, 6, 7, 4)
  // ── 5. subida e chegada ──
  const z0 = 221.2
  k.slope(0, z0, 257.2, DECK, DECK + 6, 6, 0, 1, 5)
  k.box(0, 265, 9, 7.8, 1, 0, 6, 0, 1.6, DECK + 6)
  k.balls = { lanes: [-4.3, -1.45, 1.45, 4.3], every: 0.95, v: 7.5, R: 1.2, zEnd: z0 - 3 }
  // logos (mm3d-47b), nos lugares abertos do caminho
  for (const [x, z] of [[0, 79], [-5, 87], [5, 87], [-5, 105], [0, 105], [5, 105], [0, 137], [-3.5, 151], [3.5, 161], [-3.5, 171], [0, 187.5], [-2.9, 216.5], [2.9, 216.5]] as [number, number][]) k.logo(x, z)
  for (const [x, z] of [[-4.3, 233], [0, 241], [4.3, 249]] as [number, number][]) k.logo(x, z, DECK + (6 * (z - z0)) / 36)
  return k.done({
    id: "cidade",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 87, y: DECK, w: 6 },
      { x: 0, z: 137, y: DECK, w: 6 },
      { x: 0, z: 187, y: DECK, w: 5.5 },
      { x: 0, z: 216, y: DECK, w: 5.5 },
    ],
    finishZ: 266,
    finishY: DECK + 6,
    sections: [15, 83, 133.4, 183, 221.2],
    minFinish: 22,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        add(side * 2.5, 20)
        for (const z of [29, 33, 38.5, 42]) add(side * 4.5, z)
        add(side * 4.6, 46)
        for (const z of [50, 53, 57.5]) add(side * 4.5, z)
        add(side * 3.5, 61)
        add(side * 3.2, 66)
        add(side * 2, 71)
        add(0, 75.8)
        add(0, 80)
        add(0, 84)
        const L = [-5, 0, 5][Math.floor(r(2) * 3)]
        const D = L !== 0 ? L : r(3) < 0.5 ? -5 : 5
        add(L * 0.6, 88)
        add(L, 90.4)
        for (const z of [94, 98, 102, 105]) add(L, z)
        for (let i = 1; i <= 4; i++) add(L + (D - L) * (i / 4), 105 + 3.5 * i)
        for (const z of [122, 126, 130, 133.6]) add(D, z)
        add(D * 0.4, 137)
        const F = [-2.2, 2.2, -4.8, 4.8][Math.floor(r(4) * 4)]
        for (let z = 142; z <= 183; z += 3) add(F, z)
        add(0, 187)
        add(0, 190.8)
        for (let i = 0; i < 7; i++) add(0, 193 + i * 2.9)
        add(0, 213)
        add(0, 216.5)
        routeFinish(add, z0, 266)
      }),
  })
}

// ═══ floresta — Floresta da Lua ══════════════════════════════════════════════

/**
 * Gincana 3 (2026-11-18): MARÉ DO PÂNTANO — subida pela Floresta da Lua com o
 * pântano subindo atrás (0,3 m/s desde o "vai"). Quem o pântano alcança, ou cai
 * quando o posto de volta já está embaixo dele, está FORA. Cinco andares:
 * rampa dos troncos (3→9 m) · raízes que giram (9) · rampa curta e
 * vitórias-régias que andam (9→14) · rampa dos cocos-pêndulo (14→20) · ponte de
 * folhas que cai e a subida final (20→24).
 */
function courseFloresta(): Course {
  const k = new CourseKit()
  kitStart(k)
  const Y1 = DECK + 6
  const Y2 = Y1 + 5
  const Y3 = Y2 + 6
  const Y4 = Y3 + 4
  // ── 1. rampa dos troncos rolando ──
  k.slope(0, 15, 51, DECK, Y1, 6, 5, 1, 1)
  k.balls = { lanes: [-4.3, -1.45, 1.45, 4.3], every: 1.15, v: 6.5, R: 1.1, zEnd: 12 }
  k.box(0, 55, 7, 4, 5, 1, 1, 0, 1.4, Y1)
  // ── 2. raízes que giram (duas clareiras ligadas por pontes) ──
  k.box(0, 61.5, 1.8, 2.5, 4, 1, 2, 0, 1.2, Y1)
  const roots = (z: number, w: number, a0: number, both: boolean) => {
    k.disc(0, z, 6.5, 4, 1, 2, Y1)
    k.post(0, z, 0.8, Y1, Y1 + 2.4, 5)
    k.sweep(0, z, Y1 + 0.55, 6.8, 0.34, w, a0, both)
  }
  roots(70.5, 1.1, 0, true)
  k.box(0, 79.5, 1.8, 2.5, 4, 1, 2, 0, 1.2, Y1)
  roots(88.5, -1.6, 1.2, false)
  k.box(0, 99, 6, 4, 5, 1, 2, 0, 1.4, Y1)
  // ── 3. rampa curta e vitórias-régias que andam ──
  k.slope(0, 103, 121, Y1, Y2, 4, 5, 1, 3)
  k.box(0, 123, 4, 2, 5, 1, 3, 0, 1.2, Y2)
  const LILY = [129, 134.5, 140]
  const lilies: number[] = []
  LILY.forEach((z, i) => {
    const p = k.disc(0, z, 2.2, i % 2 ? 2 : 5, 1, 3, Y2)
    k.pads[p].mx = 4
    k.pads[p].mw = 1.1
    k.pads[p].mph = i * 1.6
    lilies.push(p)
  })
  k.box(0, 148, 6, 4, 5, 1, 3, 0, 1.4, Y2)
  // ── 4. rampa dos cocos (pêndulos) ──
  k.slope(0, 152, 176, Y2, Y3, 5, 5, 1, 4)
  let ph = 0
  for (const z of [158, 164, 170]) {
    const top = Y2 + ((z - 152) / 24) * (Y3 - Y2)
    for (const x of [-2.5, 2.5]) {
      k.swing(x, z, top + 9, 7.4, 1.1, 0.95, 2.1, ph)
      ph += 1.9
    }
  }
  k.box(0, 180, 6, 4, 5, 1, 4, 0, 1.4, Y3)
  // ── 5. ponte de folhas que cai e a subida final ──
  for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) k.tile((c - 1) * 2.9, 186.6 + r * 2.9, 1.3, (r + c) % 2 ? 5 : 1, 0, Y3)
  k.box(0, 209, 6, 3.5, 5, 1, 5, 0, 1.4, Y3)
  k.slope(0, 212.5, 230.5, Y3, Y4, 5, 5, 1, 5)
  k.box(0, 238, 9, 7.5, 1, 0, 6, 0, 1.6, Y4)
  for (const [x, z, y] of [[0, 55, Y1], [0, 99, Y1], [-3, 148, Y2], [3, 148, Y2], [0, 180, Y3], [0, 209, Y3]] as [number, number, number][]) k.logo(x, z, y)
  const finishZ = 238
  return k.done({
    id: "floresta",
    mode: "race",
    limit: 90,
    // 3 s de folga; depois 0,34 m/s (a largada afoga aos ~12 s, o topo aos ~74 s)
    rise: { y0: 0, y1: 26, t0: 3, t1: 79.5 },
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 55, y: Y1, w: 6 },
      { x: 0, z: 99, y: Y1, w: 5 },
      { x: 0, z: 148, y: Y2, w: 5 },
      { x: 0, z: 180, y: Y3, w: 5 },
    ],
    finishZ,
    finishY: Y4,
    sections: [15, 59, 103, 152, 184],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(0, 15.5)
        for (let z = 18; z <= 50; z += 2.5) add(0, z)
        for (const z of [53, 57, 60, 62.5]) add(0, z)
        for (let z = 65; z <= 76; z += 2) add(0, z)
        for (const z of [78, 80.5]) add(0, z)
        for (let z = 83; z <= 94; z += 2) add(0, z)
        for (const z of [97, 101]) add(0, z)
        for (let z = 104; z <= 120; z += 2.5) add(0, z)
        add(0, 122)
        add(0, 124.5)
        LILY.forEach((z, i) => add(0, z, lilies[i]))
        for (const z of [145, 149, 151]) add(0, z)
        const L = [-1.2, 0, 1.2][Math.floor(r(2) * 3)]
        for (let z = 153; z <= 175; z += 2.5) add(L, z)
        for (const z of [178, 182, 184.5]) add(0, z)
        for (let i = 0; i < 7; i++) add(0, 186.6 + i * 2.9)
        for (const z of [206.5, 210, 212]) add(0, z)
        for (let z = 214; z <= 230; z += 2) add(0, z)
        for (const z of [233, 236, finishZ + 3]) add(0, z)
      }),
  })
}

// ═══ canion — Cânion ═════════════════════════════════════════════════════════

/**
 * Gincana 3 (2026-11-18): PEDRAS QUE CAEM — sobrevivência no Cânion. Quatro
 * andares de pedras hexagonais flutuando sobre o abismo (15, 11, 7 e 3 m). Pedra
 * pisada treme 1 s e cai para sempre; quem cai do andar de baixo está FORA.
 * Acaba quando só sobra a vaga (metade) em pé ou em 2 min. Pular poupa pedra:
 * no ar ninguém derruba nada.
 */
const STONE_FLOORS = [DECK + 12, DECK + 8, DECK + 4, DECK] as const
const STONE_R = 18
const STONE_GAP = 2.4

/** Centros da colmeia de um andar (a de baixo deslocada meia pedra, para quem cai de um buraco achar chão). */
export function stoneCells(floor: number) {
  const out: [number, number][] = []
  const dz = (STONE_GAP * Math.sqrt(3)) / 2
  const shift = floor % 2 ? STONE_GAP / 2 : 0
  for (let r = -10; r <= 10; r++) {
    for (let c = -9; c <= 9; c++) {
      const x = c * STONE_GAP + (r % 2 ? STONE_GAP / 2 : 0) + shift
      const z = r * dz
      if (Math.hypot(x, z) <= STONE_R - 0.5 * floor) out.push([x, z])
    }
  }
  return out
}

function courseCanion(): Course {
  const k = new CourseKit()
  STONE_FLOORS.forEach((y, f) => {
    for (const [x, z] of stoneCells(f)) {
      const ring = Math.floor(Math.hypot(x, z) / 4.6)
      const pair = [[2, 1], [0, 1], [5, 2], [6, 2]][f]
      k.tile(x, z, 1.27, pair[ring % 2], 1, y)
    }
  })
  const top = STONE_FLOORS[0]
  return k.done({
    id: "canion",
    mode: "survive",
    qualify: 0.5,
    limit: 120,
    tileTime: { warn: 1.0, gone: 1e6 },
    checkpoints: [{ x: 0, z: 1.3, y: top, w: 6 }],
    // arena: ninguém "chega" (a linha fica fora e no alto)
    finishZ: 40,
    finishY: 90,
    sections: [],
    minFinish: 1e6,
    route: () => [{ x: 0, z: 0 }],
  })
}

// ═══ orbital — Cidade Orbital ════════════════════════════════════════════════

/**
 * Gincana 3 (2026-11-18): VARREDURA — sobrevivência na Cidade Orbital. Um disco
 * no vazio que gira devagar e duas barras: a BAIXA (rente ao chão) se pula; a
 * ALTA (na altura do peito, girando para o outro lado) só passa quem MERGULHA
 * por baixo. As duas aceleram até o fim. Quem cai do disco está fora. Acaba
 * quando sobra a vaga (metade) ou em 100 s.
 */
function courseOrbital(): Course {
  const k = new CourseKit()
  const floor = k.disc(0, 0, 11, 6, 7, 1)
  k.pads[floor].spin = 0.16
  k.post(0, 0, 1.1, DECK, DECK + 3.2, 4)
  // barra baixa (pular): dois braços
  k.sweep(0, 0, DECK + 0.55, 11.6, 0.36, 0.85, 0, true, 0.02, 2.5)
  // barra alta (mergulhar): um braço, ao contrário, na altura do peito
  k.sweep(0, 0, DECK + 1.4, 11.6, 0.3, -0.6, Math.PI / 2, false, 0.014, 1.7)
  return k.done({
    id: "orbital",
    mode: "survive",
    qualify: 0.5,
    limit: 100,
    checkpoints: [{ x: 0, z: -6.5, y: DECK, w: 6 }],
    finishZ: 40,
    finishY: 90,
    sections: [],
    minFinish: 1e6,
    route: () => [{ x: 0, z: 0 }],
  })
}

// ═══ forja — Forja ═══════════════════════════════════════════════════════════

/**
 * Gincana 3 (2026-11-18): PAREDES DE BRASA — sobrevivência na Forja. Uma
 * arena quadrada de 22 m sobre a lava; ondas de parede de brasa vêm da frente
 * e atravessam tudo: parede alta com um ou dois vãos (ache o buraco) ou
 * mureta baixa (pule). Quem a parede empurra para fora cai na lava e está
 * FORA. As ondas ficam mais rápidas; acaba quando sobra a vaga ou em 100 s.
 */
function courseForja(): Course {
  const k = new CourseKit()
  k.box(0, 0, 11, 11, 0, 1, 1, 0, 1.6)
  return k.done({
    id: "forja",
    mode: "survive",
    qualify: 0.5,
    limit: 100,
    walls: { hw: 11, z0: 13, z1: -14, y: DECK, every: 3.2, t0: 2, v0: 3.4, v1: 11, ramp: 60, seg: 2.2, tall: 3.2, low: 0.9 },
    checkpoints: [{ x: 0, z: -2, y: DECK, w: 6 }],
    finishZ: 40,
    finishY: 90,
    sections: [],
    minFinish: 1e6,
    route: () => [{ x: 0, z: 0 }],
  })
}

// ═══ fabrica — Fábrica ═══════════════════════════════════════════════════════

/**
 * Gincana 3 (2026-11-18): CAÇA ÀS ENGRENAGENS — coleta na Fábrica. Chão de
 * 24 m sobre o óleo com duas esteiras (em sentidos contrários), duas prensas
 * que deslizam de lado e a plataforma do meio (1 m acima: pule ou suba na
 * beira). Engrenagens aparecem espalhadas e voltam 7 s depois de pegas; a
 * DOURADA (no alto do meio) vale 3. Quem cai no óleo volta ao meio (só perde
 * tempo). Em 75 s, classificam os que pegaram mais (metade).
 */
function courseFabrica(): Course {
  const k = new CourseKit()
  k.box(0, 0, 12, 12, 2, 1, 1, 0, 1.6)
  // esteiras (um tico acima do chão para valerem): a da esquerda leva para a frente, a da direita para trás
  const beltL = k.box(-8, 0, 1.6, 12, 0, 1, 1, 0, 1.6, DECK + 0.05)
  k.pads[beltL].bz = GINCANA.belt
  const beltR = k.box(8, 0, 1.6, 12, 0, 1, 1, 0, 1.6, DECK + 0.05)
  k.pads[beltR].bz = -GINCANA.belt
  // plataforma do meio (a dourada fica nela)
  k.disc(0, 0, 2.6, 4, 1, 1, DECK + 1)
  // prensas que deslizam de lado
  k.pusher(0, 7, 1.3, 1.3, 1.8, 8.5, 0, 0.85, 0)
  k.pusher(0, -7, 1.3, 1.3, 1.8, 8.5, 0, 0.85, Math.PI)
  // engrenagens: anel no chão, as das esteiras e a dourada
  let n = 0
  const add = (x: number, z: number, y: number, v: number, back: number) => k.gem(x, z, y + 0.9, v, 1 + (n++ % 6) * 0.6, back)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    add(Math.sin(a) * 5, Math.cos(a) * 5, DECK, 1, 7)
  }
  for (const [x, z] of [[-4, 9.5], [4, -9.5], [-4, -9.5], [4, 9.5]] as [number, number][]) add(x, z, DECK, 1, 7)
  for (const z of [-8, 0, 8]) {
    add(-8, z, DECK + 0.05, 1, 7)
    add(8, z, DECK + 0.05, 1, 7)
  }
  add(0, 0, DECK + 1, 3, 12)
  return k.done({
    id: "fabrica",
    mode: "collect",
    qualify: 0.5,
    limit: 75,
    checkpoints: [{ x: 0, z: -3.6, y: DECK, w: 5 }],
    finishZ: 40,
    finishY: 90,
    sections: [],
    minFinish: 1e6,
    route: () => [{ x: 0, z: 0 }],
  })
}

// ═══ gelo — Mar de Gelo ══════════════════════════════════════════════════════

/**
 * Gincana 3 (2026-11-18, plano das 10 fases): ROLO DE GELO — sobrevivência no Mar de Gelo. Um cilindro de
 * gelo deitado (raio 7 m, 30 m de comprido) feito de 5 anéis; cada anel gira no seu sentido (e cada vez mais
 * rápido) e tem buracos que passam por baixo de quem está em cima. O chão anda de lado e escorrega para fora
 * na curva: corra contra o giro e troque de anel quando um buraco vier. Caiu no mar = FORA. Acaba quando
 * sobra a vaga (metade) ou em 100 s.
 */
export const ROLL_R = 7
export const ROLL_TOP = DECK + 4
function courseGelo(): Course {
  const k = new CourseKit()
  const W = [0.3, -0.34, 0.38, -0.32, 0.36, -0.29]
  k.drum(
    0,
    0,
    ROLL_TOP - ROLL_R,
    ROLL_R,
    W.map((w, i) => ({
      len: 5,
      w,
      // os buracos começam embaixo (o primeiro chega ao topo depois de ~8 s); dois anéis têm 3
      holes: (i % 3 === 1 ? [0, 2.1, 4.2] : [0, 3.1]).map((o) => ({ a: Math.PI + o + i * 0.7, half: 0.17 + (i % 2) * 0.03 })),
    })),
    0.6,
  )
  return k.done({
    id: "gelo",
    mode: "survive",
    qualify: 0.5,
    limit: 100,
    checkpoints: [{ x: 0, z: 16.3, y: ROLL_TOP, w: 3.4 }],
    finishZ: 40,
    finishY: 90,
    sections: [],
    minFinish: 1e6,
    route: () => [{ x: 0, z: 15 }],
  })
}

/** Todas as fases (montadas uma vez). */
/**
 * Relógio da Praça (Gincana 3, memória): grade 5×5 na praça do Centro. Os ladrilhos mostram
 * símbolos, apagam, o relógio da torre chama um e os ladrilhos dos outros caem por 3 s.
 * As rodadas encurtam; quem cai está fora.
 */
export const MEM_GRID = { x: 0, z: 0, y: DECK, n: 5, size: 3.3, gap: 0.22, t0: 1.5 }
function courseRelogio(): Course {
  const k = new CourseKit()
  return k.done({
    id: "relogio",
    mode: "survive",
    qualify: 0.5,
    limit: 100,
    memory: MEM_GRID,
    checkpoints: [{ x: 0, z: 1.3, y: DECK, w: 6 }],
    finishZ: 40,
    finishY: 90,
    sections: [],
    minFinish: 1e6,
    route: () => [{ x: 0, z: 0 }],
  })
}

export const COURSES: Record<GincanaPhase, Course> = {
  cidade: courseCidade(),
  floresta: courseFloresta(),
  canion: courseCanion(),
  orbital: courseOrbital(),
  forja: courseForja(),
  fabrica: courseFabrica(),
  gelo: courseGelo(),
  relogio: courseRelogio(),
}

/** O percurso da fase (desconhecida = a de sempre). */
export function courseOf(id: string | null | undefined): Course {
  return (id && (COURSES as Record<string, Course>)[id]) || COURSES.cidade
}
