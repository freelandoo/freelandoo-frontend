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

import { CourseKit, DECK, type Course, type GincanaPhase, type RoutePoint } from "./course"

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

function courseOrbital(): Course {
  const k = new CourseKit()
  kitStart(k)
  // ── 1. esteiras para trás, com caixas no caminho ──
  k.box(0, 19, 7, 3, 6, 7, 1)
  const belt = k.box(0, 35, 6, 13, 6, 3, 1)
  k.pads[belt].bz = -3.2
  for (const [x, z] of [[-3, 28], [2.5, 32], [-1, 37], [3.5, 41], [-3.5, 44.5]] as [number, number][]) k.post(x, z, 0.65, DECK, DECK + 1.2, 7)
  k.box(0, 52, 7, 4, 6, 7, 1)
  // ── 2. anéis que giram ──
  const SPIN = [0.55, -0.75, 0.65]
  ;[63.5, 77.5, 91.5].forEach((z, i) => {
    const d = k.disc(0, z, 7.5, i === 1 ? 4 : 6, 7, 2)
    k.pads[d].spin = SPIN[i]
  })
  k.post(0, 77.5, 0.7, DECK, DECK + 2.2, 7)
  k.sweep(0, 77.5, DECK + 0.55, 7.7, 0.3, 1.45, 0, false)
  k.box(0, 103, 7, 4, 6, 7, 2)
  // ── 3. hexágonos que somem ──
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 5; c++) {
      const x = (c - 2) * 2.9 + (r % 2 ? 1.45 : -1.45) * 0.5
      k.tile(x, 109.6 + r * 2.55, 1.45, (r + c) % 3 === 0 ? 4 : 6, 1)
    }
  }
  k.box(0, 146, 7, 4, 6, 7, 3)
  // ── 4. barreiras de energia ──
  k.box(0, 173, 6, 23, 6, 7, 4)
  ;[[159, 1.3, 0], [173, -1.5, 0.8], [187, 1.2, 1.6]].forEach(([z, w, a0]) => {
    k.sweep(0, z, DECK + 0.55, 6.3, 0.3, w, a0, true)
    k.post(0, z, 0.8, DECK, DECK + 2.2, 7)
  })
  k.pusher(0, 166, 1.4, 1.0, 2.4, 4.4, 0, 1.5, 0)
  k.pusher(0, 180, 1.4, 1.0, 2.4, 4.4, 0, 1.9, 2.1)
  k.box(0, 200, 7, 4, 6, 7, 4)
  // ── 5. esferas rolando ──
  const z0 = 204
  const finishZ = kitFinish(k, z0, 0.95, 7.5, 1.15)
  for (const [x, z] of [[0, 52], [-4, 49], [4, 49], [0, 103], [0, 146], [-4, 166], [4, 180], [0, 200]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "orbital",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 52, y: DECK, w: 6 },
      { x: 0, z: 103, y: DECK, w: 6 },
      { x: 0, z: 146, y: DECK, w: 6 },
      { x: 0, z: 200, y: DECK, w: 5.5 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [22, 56, 107, 150, z0],
    minFinish: 22,
    tileTime: { warn: 0.55, gone: 5 },
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        add(0, 20)
        const F = [-1.5, 1, 5, -5][Math.floor(r(2) * 4)]
        for (let z = 24; z <= 47; z += 2.5) add(F, z)
        add(0, 50)
        for (let z = 54; z <= 99; z += 1.6) add(0, z)
        add(0, 103)
        add(0, 107.5)
        for (let i = 0; i < 13; i++) add(0, 109.6 + i * 2.55)
        add(0, 143.5)
        add(0, 147)
        const B = r(3) < 0.5 ? -1 : 1
        for (let z = 151; z <= 197; z += 2) add(B * (z > 166 && z < 180 ? -3.4 : 3.4), z)
        add(0, 201)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ forja — Forja ═══════════════════════════════════════════════════════════

function courseForja(): Course {
  const k = new CourseKit()
  kitStart(k)
  // ── 1. martelos ──
  k.box(0, 19, 7, 3, 0, 1, 1)
  k.box(0, 40, 7, 18, 0, 1, 1)
  ;[29, 38, 47].forEach((z, row) => [-4, 0, 4].forEach((x, col) => k.swing(x, z, DECK + 9, 7.4, 1.1, 0.9, 2.3, row * 1.4 + col * 2.1)))
  // ── 2. pistões dos dois lados ──
  k.box(0, 81, 7, 23, 0, 1, 2)
  for (let i = 0; i < 5; i++) {
    const z = 66 + i * 8
    k.glove(-9.4, z, DECK + 1, 1, 8.2, 1.15, 2.4, i * 0.9)
    k.glove(9.4, z, DECK + 1, -1, 8.2, 1.15, 2.4, i * 0.9 + 1.2)
    k.post(-9.4, z, 1.0, -1, DECK + 2.2, 4)
    k.post(9.4, z, 1.0, -1, DECK + 2.2, 4)
  }
  // ── 3. esteiras de lado sobre a lava ──
  k.box(0, 108, 7, 4, 0, 1, 3)
  ;[118, 130, 142].forEach((z, i) => {
    const b = k.box(0, z, 4, 6, 4, 0, 3)
    k.pads[b].bx = i % 2 ? -3 : 3
  })
  k.box(0, 152, 7, 4, 0, 1, 3)
  // ── 4. grade que cai ──
  for (let r = 0; r < 9; r++) for (let c = 0; c < 5; c++) k.tile((c - 2) * 2.9, 158.5 + r * 2.9, 1.3, (r + c) % 2 ? 2 : 0)
  k.box(0, 187, 7, 4, 0, 1, 4)
  // ── 5. rochas derretidas ──
  const z0 = 191
  const finishZ = kitFinish(k, z0, 0.95, 7.5, 1.2)
  for (const [x, z] of [[0, 56], [0, 61], [0, 108], [-2.5, 118], [2.5, 130], [-2.5, 142], [0, 152], [0, 187]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "forja",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 61, y: DECK, w: 6 },
      { x: 0, z: 108, y: DECK, w: 6 },
      { x: 0, z: 152, y: DECK, w: 6 },
      { x: 0, z: 187, y: DECK, w: 5.5 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [22, 58, 112, 156, z0],
    minFinish: 22,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        const L = [-2, 2, -6, 6][Math.floor(r(2) * 4)]
        for (let z = 20; z <= 56; z += 2) add(L, z)
        add(0, 59)
        const F = [-0.2, 0.2, -5.5, 5.5][Math.floor(r(3) * 4)]
        for (let z = 62; z <= 103; z += 2.5) add(F, z)
        add(0, 106)
        add(0, 110)
        for (let z = 113; z <= 148; z += 1.5) add(0, z)
        add(0, 152)
        add(0, 156)
        for (let i = 0; i < 9; i++) add(0, 158.5 + i * 2.9)
        add(0, 185)
        add(0, 188)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ fabrica — Fábrica ═══════════════════════════════════════════════════════

function courseFabrica(): Course {
  const k = new CourseKit()
  kitStart(k)
  // ── 1. esteira das prensas ──
  k.box(0, 19, 7, 3, 6, 1, 1)
  const belt = k.box(0, 36, 5, 14, 6, 1, 1)
  k.pads[belt].bz = -2.5
  ;[27, 33, 39, 45].forEach((z, i) => {
    const left = i % 2 === 0
    const x0 = left ? -7.6 : 7.6
    k.glove(x0, z, DECK + 1, left ? 1 : -1, 8, 1.15, 2.5, i * 0.85)
    k.post(x0, z, 1.0, -1, DECK + 2.2, 1)
  })
  k.box(0, 54, 7, 4, 6, 1, 1)
  // ── 2. engrenagens que giram ──
  const GEAR: [number, number, number][] = [[-3, 65, 0.5], [3, 77, -0.6], [-3, 89, 0.5]]
  for (const [x, z, w] of GEAR) {
    const d = k.disc(x, z, 7, 1, 0, 2)
    k.pads[d].spin = w
    k.post(x, z, 0.75, DECK, DECK + 2.3, 0)
  }
  k.sweep(3, 77, DECK + 0.55, 7.2, 0.3, 1.3, 0, false)
  // ── 3. portas de aço ──
  k.box(0, 120, 8, 24, 6, 1, 3)
  for (const z of [112, 122, 132]) k.doorRow(0, z, 5, 3.2, 3.4, 2)
  // ── 4. prensas deslizantes ──
  k.box(0, 164, 6, 20, 6, 1, 4)
  const PW = [1.4, 1.8, 1.2, 1.6, 2.0]
  ;[151, 158, 165, 172, 179].forEach((z, i) => k.pusher(0, z, 2.2, 1.0, 2.4, 4, 0, PW[i], i * 1.1))
  k.box(0, 188, 7, 4, 6, 1, 4)
  // ── 5. barris ──
  const z0 = 192
  const finishZ = kitFinish(k, z0, 0.95, 7.5, 1.15)
  for (const [x, z] of [[0, 54], [0, 100], [-4.8, 117], [4.8, 127], [0, 139], [0, 188]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "fabrica",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 54, y: DECK, w: 6 },
      { x: 0, z: 100, y: DECK, w: 6 },
      { x: 0, z: 139, y: DECK, w: 7 },
      { x: 0, z: 188, y: DECK, w: 5.5 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [22, 58, 104, 144, z0],
    minFinish: 22,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        const F = r(2) < 0.5 ? -1.6 : 1.6
        for (let z = 20; z <= 50; z += 2) add(F, z)
        add(0, 54)
        add(-3, 58.5)
        add(-3, 65)
        add(-1, 70.5)
        add(3, 74)
        add(3, 80)
        add(1, 83.5)
        add(-3, 86)
        add(-3, 92)
        add(-1, 96.5)
        for (const z of [100, 105, 108, 112.6, 117, 122.6, 127, 132.6, 137, 141]) add(0, z)
        for (let z = 145; z <= 183; z += 2) add(0, z)
        add(0, 186)
        add(0, 189)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ gelo — Mar de Gelo ══════════════════════════════════════════════════════

function courseGelo(): Course {
  const k = new CourseKit()
  kitStart(k)
  // ── 1. lago que escorrega ──
  k.box(0, 19, 7, 3, 7, 6, 1)
  const lake = k.box(0, 37, 7, 15, 7, 6, 1)
  k.pads[lake].f = 0.18
  for (const [x, z] of [[-3.5, 29], [3, 33], [-1, 39], [4, 45], [-4, 48]] as [number, number][]) k.post(x, z, 0.7, DECK, DECK + 1.6, 6)
  k.pusher(0, 41.5, 1.6, 1.2, 1.8, 4, 0, 1.2, 0)
  k.box(0, 56, 7, 4, 7, 6, 1)
  // ── 2. estalactites sobre três pontes ──
  for (const x of [-5, 0, 5]) {
    const b = k.beam(x, 59.5, x, 96.5, 1.6, 7, 6, 2)
    k.pads[b].f = 0.6
  }
  let ph = 0
  for (const z of [67, 77, 87]) {
    for (const x of [-5, 0, 5]) {
      k.swing(x, z, DECK + 9, 7.4, 1.0, 0.9, 2.1, ph)
      ph += 2.3
    }
  }
  k.box(0, 100, 8, 4, 7, 6, 2)
  // ── 3. placas de gelo que andam ──
  const FLOE = [107.1, 112.7, 118.3, 123.9, 129.5]
  const floes: number[] = []
  for (let i = 0; i < FLOE.length; i++) {
    const p = k.box(0, FLOE[i], 3.2, 2.5, 7, 6, 3, 0, 1.0)
    Object.assign(k.pads[p], { mx: 4.5, mw: 0.9, mph: i * 1.3, f: 0.5 })
    floes.push(p)
  }
  k.box(0, 138.8, 7, 6.2, 7, 6, 3)
  // ── 4. gelo fino ──
  for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) k.tile((c - 2.5) * 2.9, 146.4 + r * 2.9, 1.3, (r + c) % 2 ? 7 : 6)
  k.box(0, 172, 7, 4, 7, 6, 4)
  // ── 5. bolas de neve ──
  const z0 = 176
  const finishZ = kitFinish(k, z0, 1.0, 7.5, 1.2)
  for (const [x, z] of [[0, 56], [-5, 62], [5, 62], [0, 100], [0, 140], [0, 172]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "gelo",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 56, y: DECK, w: 6 },
      { x: 0, z: 100, y: DECK, w: 6 },
      { x: 0, z: 140, y: DECK, w: 6 },
      { x: 0, z: 172, y: DECK, w: 5.5 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [22, 60, 104, 145, z0],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        add(0, 20)
        const F = [-1.5, 1.5, -5.5, 5.5][Math.floor(r(2) * 4)]
        for (let z = 24; z <= 50; z += 2) add(F, z)
        add(0, 53)
        add(0, 56)
        const L = [-5, 0, 5][Math.floor(r(3) * 3)]
        add(L * 0.6, 58)
        for (let z = 60; z <= 96; z += 3) add(L, z)
        add(L * 0.4, 99)
        add(0, 102)
        add(0, 104.2)
        for (let i = 0; i < FLOE.length; i++) add(0, FLOE[i], floes[i])
        add(0, 133.5)
        add(0, 138)
        add(0, 144)
        for (let i = 0; i < 8; i++) add(0, 146.4 + i * 2.9)
        add(0, 170)
        add(0, 173)
        routeFinish(add, z0, finishZ)
      }),
  })
}

/** Todas as fases (montadas uma vez). */
export const COURSES: Record<GincanaPhase, Course> = {
  cidade: courseCidade(),
  floresta: courseFloresta(),
  canion: courseCanion(),
  orbital: courseOrbital(),
  forja: courseForja(),
  fabrica: courseFabrica(),
  gelo: courseGelo(),
}

/** O percurso da fase (desconhecida = a de sempre). */
export function courseOf(id: string | null | undefined): Course {
  return (id && (COURSES as Record<string, Course>)[id]) || COURSES.cidade
}
