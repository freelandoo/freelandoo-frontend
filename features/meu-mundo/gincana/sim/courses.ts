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

import { CourseKit, DECK, GINCANA, reprise, type Course, type GincanaPhase, type RoutePoint } from "./course"

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

/**
 * Canal da Cidade — números da dificuldade (20/11, o Alex: "obstáculos mais resistentes e mais rápidos").
 * Antes: portas 3-2-2 / 2-2, carrossel de uma barra (1,05 rad/s), pêndulos R 1,1 amp 0,95 em 2 fileiras,
 * barris a cada 0,95 s a 7,5 m/s (R 1,2), ponte sem nada.
 */
export const CIDADE = {
  /** 20/11: uma porta aberta por fileira, nunca na frente da aberta da anterior (doorsOpen) */
  rows1: [[26, 1], [38, 1], [50, 1]] as [number, number][],
  open2: 1,
  /** socos da ponte: [x da base, z, fase] */
  punches: [[-5.6, 67.5, 0], [5.6, 72.5, 1.2]] as [number, number, number][],
  punchReach: 6.2,
  punchPeriod: 1.9,
  sweep: { w: 1.1, acc: 0.008, wMax: 1.5, highY: 1.45, highW: 0.6 },
  pend: {
    R: 1.2,
    amp: 1.05,
    rows: [[144, [0, 2.1, 4.2]], [153, [1.1, 3.3, 0.2]]] as [number, number[]][],
  },
  balls: { every: 0.75, v: 8.5, R: 1.35 },
} as const

function courseCidade(): Course {
  // Portas da Prefeitura (Gincana 3, G3-11): a corrida de abertura do programa. Três fileiras de portas
  // (as falsas são parede; a semente sorteia quais abrem), a ponte, o carrossel de duas barras, mais
  // duas fileiras (menos portas abertas), as passarelas com pêndulos e a subida com barris.
  const k = new CourseKit()
  kitStart(k)
  // ── 1. portas ──
  k.box(0, 39.8, 8, 24.7, 6, 7, 1)
  for (const [z, open] of CIDADE.rows1) k.doorRow(0, z, 5, 3.2, 3.4, open)
  // ── 2. ponte com os socos de lado e o carrossel de duas barras ──
  k.box(0, 70, 2.4, 5.5, 6, 7, 2)
  // 20/11 (dificuldade): dois socos atravessam a ponte estreita, um de cada margem, desencontrados
  for (const [x0, z, ph] of CIDADE.punches) {
    k.post(x0, z, 0.45, -1, DECK + 1.9, 2)
    k.glove(x0, z, DECK + 1, -Math.sign(x0), CIDADE.punchReach, 1.0, CIDADE.punchPeriod, ph)
  }
  k.disc(0, 85, 9.5, 0, 1, 2)
  k.post(0, 85, 0.8, DECK, DECK + 2.4, 1)
  // 20/11: a barra baixa (pular) acelera; a alta (mergulhar, um braço só) gira ao contrário — nunca se passa as duas do mesmo jeito
  const SW = CIDADE.sweep
  k.sweep(0, 85, DECK + 0.55, 9.8, 0.32, SW.w, 0.4, true, SW.acc, SW.wMax)
  k.sweep(0, 85, DECK + SW.highY, 9.8, 0.3, -SW.highW, 0.4 + Math.PI / 2, false)
  k.box(0, 98.5, 5, 4, 6, 7, 2)
  // ── 3. mais portas (menos abertas) ──
  k.box(0, 120.5, 8, 18, 6, 7, 3)
  for (const z of [112, 126]) k.doorRow(0, z, 5, 3.2, 3.4, CIDADE.open2)
  // ── 4. passarelas com pêndulos (três fileiras) ──
  const LANES = [-5, 0, 5]
  for (const x of LANES) k.beam(x, 138.5, x, 160, 1.5, 0, 1, 4)
  const PD = CIDADE.pend
  for (const [z, phs] of PD.rows) LANES.forEach((x, i) => k.swing(x, z, DECK + 9, 7.4, PD.R, PD.amp, 2.2, phs[i]))
  k.box(0, 165, 7, 5, 6, 7, 4)
  // ── 5. subida com barris e a chegada ──
  const z0 = 170
  const finishZ = kitFinish(k, z0, CIDADE.balls.every, CIDADE.balls.v, CIDADE.balls.R)
  for (const [x, z] of [[0, 18], [-4.8, 32], [4.8, 44], [0, 58], [0, 98.5], [-4.8, 118], [4.8, 132], [0, 165]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "cidade",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 61, y: DECK, w: 6 },
      { x: 0, z: 100, y: DECK, w: 5 },
      { x: 0, z: 136, y: DECK, w: 6 },
      { x: 0, z: 167, y: DECK, w: 5.5 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [15.1, 64.5, 102.5, 138.5, z0],
    minFinish: 22,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        for (const z of [19, 22.5, 26.6, 30, 34, 38.6, 42, 46, 50.6, 54, 58, 62]) add(0, z)
        add(0, 66)
        add(0, 70)
        add(0, 74.5)
        add(side * 1.5, 77)
        add(side * 3.2, 81)
        add(side * 3.2, 86)
        add(side * 2, 90.5)
        add(0, 94.8)
        add(0, 98.5)
        for (const z of [103, 106, 108.5, 112.6, 116, 120, 122.5, 126.6, 130, 134]) add(0, z)
        const L = [-5, 0, 5][Math.floor(r(2) * 3)]
        add(L * 0.6, 136.5)
        add(L, 139)
        for (const z of [142, 146, 149, 152, 156, 159]) add(L, z)
        add(L, 160.8)
        add(L * 0.4, 163)
        add(0, 167)
        routeFinish(add, z0, finishZ)
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
/**
 * 20/11 (pedido do Alex): o chão das duas clareiras das raízes é uma esteira redonda que gira rápido CONTRA a
 * raiz. O que conta é o giro relativo (chão + raiz): a raiz tem que voltar depois dos 1,2 s de quem caiu
 * levantar, senão ela acerta de novo até jogar no pântano. Por isso a raiz ficou mais lenta. Por clareira:
 * [giro da raiz, giro do chão] (rad/s, antes do ×1,22 das corridas; na beira o chão anda ~7–8 m/s).
 */
export const FLORESTA_ROOTS = [
  [0.45, 0.85],
  [-0.9, 1.0],
] as const
/** Vitórias-régias que andam (antes 3). */
export const FLORESTA_LILIES = 8
/** Segundos a mais para o pântano chegar ao topo (e no tempo da prova) por causa do percurso maior. */
export const FLORESTA_RISE_PLUS = 25
/** Força da esteira antes das vitórias-régias (fração de GINCANA.belt, contra quem corre). */
export const FLORESTA_BELT = 0.5

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
  const roots = (z: number, [w, spin]: readonly [number, number], a0: number, both: boolean) => {
    const d = k.disc(0, z, 6.5, 4, 1, 2, Y1)
    k.pads[d].spin = -Math.sign(w) * spin
    k.post(0, z, 0.8, Y1, Y1 + 2.4, 5)
    k.sweep(0, z, Y1 + 0.55, 6.8, 0.34, w, a0, both)
  }
  roots(70.5, FLORESTA_ROOTS[0], 0, true)
  k.box(0, 79.5, 1.8, 2.5, 4, 1, 2, 0, 1.2, Y1)
  roots(88.5, FLORESTA_ROOTS[1], 1.2, false)
  k.box(0, 99, 6, 4, 5, 1, 2, 0, 1.4, Y1)
  // ── 3. rampa curta e vitórias-régias que andam ──
  k.slope(0, 103, 121, Y1, Y2, 4, 5, 1, 3)
  // 20/11 (pedido do Alex): o patamar antes das vitórias-régias é esteira contra quem corre (pule com embalo)
  const pre = k.box(0, 123, 4, 2, 5, 1, 3, 0, 1.2, Y2)
  // (a esteira cheia deixa 2 m/s de embalo e ninguém alcança a 1ª folha: metade da força)
  k.pads[pre].bz = -GINCANA.belt * FLORESTA_BELT
  // 20/11 (pedido do Alex: "tem 3, deixe 8 no mínimo"): oito vitórias-régias; o resto da fase anda LD
  const LILY = Array.from({ length: FLORESTA_LILIES }, (_, i) => 129 + i * 5.5)
  const LD = (FLORESTA_LILIES - 3) * 5.5
  const lilies: number[] = []
  LILY.forEach((z, i) => {
    const p = k.disc(0, z, 2.2, i % 2 ? 2 : 5, 1, 3, Y2)
    k.pads[p].mx = 4
    k.pads[p].mw = 1.1
    k.pads[p].mph = i * 1.6
    lilies.push(p)
  })
  k.box(0, 148 + LD, 6, 4, 5, 1, 3, 0, 1.4, Y2)
  // ── 4. rampa dos cocos (pêndulos) ──
  k.slope(0, 152 + LD, 176 + LD, Y2, Y3, 5, 5, 1, 4)
  let ph = 0
  for (const z of [158, 164, 170]) {
    const top = Y2 + ((z - 152) / 24) * (Y3 - Y2)
    for (const x of [-2.5, 2.5]) {
      k.swing(x, z + LD, top + 9, 7.4, 1.1, 0.95, 2.1, ph)
      ph += 1.9
    }
  }
  k.box(0, 180 + LD, 6, 4, 5, 1, 4, 0, 1.4, Y3)
  // ── 5. ponte de folhas que cai e a subida final ──
  for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) k.tile((c - 1) * 2.9, 186.6 + LD + r * 2.9, 1.3, (r + c) % 2 ? 5 : 1, 0, Y3)
  k.box(0, 209 + LD, 6, 3.5, 5, 1, 5, 0, 1.4, Y3)
  k.slope(0, 212.5 + LD, 230.5 + LD, Y3, Y4, 5, 5, 1, 5)
  k.box(0, 238 + LD, 9, 7.5, 1, 0, 6, 0, 1.6, Y4)
  for (const [x, z, y] of [[0, 55, Y1], [0, 99, Y1], [-3, 148 + LD, Y2], [3, 148 + LD, Y2], [0, 180 + LD, Y3], [0, 209 + LD, Y3]] as [number, number, number][]) k.logo(x, z, y)
  const finishZ = 238 + LD
  return k.done({
    id: "floresta",
    mode: "race",
    // 20/11: +LD de percurso (8 vitórias-régias) → o pântano sobe um pouco mais devagar e o tempo cresce junto
    limit: 90 + FLORESTA_RISE_PLUS,
    // 3 s de folga; depois sobe até o topo (antes 0,34 m/s: a largada afogava aos ~12 s, o topo aos ~74 s)
    rise: { y0: 0, y1: 26, t0: 3, t1: 79.5 + FLORESTA_RISE_PLUS },
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 55, y: Y1, w: 6 },
      { x: 0, z: 99, y: Y1, w: 5 },
      { x: 0, z: 148 + LD, y: Y2, w: 5 },
      { x: 0, z: 180 + LD, y: Y3, w: 5 },
    ],
    finishZ,
    finishY: Y4,
    sections: [15, 59, 103, 152 + LD, 184 + LD],
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
        for (const z of [145, 149, 151]) add(0, z + LD)
        const L = [-1.2, 0, 1.2][Math.floor(r(2) * 3)]
        for (let z = 153; z <= 175; z += 2.5) add(L, z + LD)
        for (const z of [178, 182, 184.5]) add(0, z + LD)
        for (let i = 0; i < 7; i++) add(0, 186.6 + LD + i * 2.9)
        for (const z of [206.5, 210, 212]) add(0, z + LD)
        for (let z = 214; z <= 230; z += 2) add(0, z + LD)
        for (const z of [233 + LD, 236 + LD, finishZ + 3]) add(0, z)
      }),
  })
}

// ═══ clareira — Clareira da Lua (2ª fase da Floresta) ════════════════════════

/**
 * 2026-11-19 (pedido do Alex: a corrida dos discos do vídeo, com a cara da
 * Floresta). TOCOS QUE GIRAM — corrida em cinco trechos, copiando o TIPO de
 * prova (nada do traçado nem da arte do jogo do vídeo):
 *  1. campo de fatias de tronco que giram (cada uma para um lado), com troncos
 *     caídos entre elas para pular ou contornar;
 *  2. rampa das frutas: frutas gigantes descem por quatro faixas, pedras de
 *     musgo entre as faixas dão abrigo; no alto, as frutas saem de troncos ocos;
 *  3. tocos em escada que giram sobre o pântano, entre árvores gigantes;
 *  4. a vitória-régia gigante que gira, com sementes penduradas balançando;
 *  5. cogumelos que lançam para o alto do barranco e a subida da chegada.
 * As medidas que o desenho usa (troncos ocos, árvores, tocos) ficam em CLAREIRA.
 */
const CY1 = DECK + 5
const CY2 = CY1 + 5.6
const CY3 = CY2 + 2.2
const CY4 = CY3 + 2.5
/**
 * Pedido do Alex (19/11, 3ª rodada): tudo que gira GRANDE (perto da vitória-régia) e rápido, e o circuito
 * maior. O campo de fatias empurra o resto 33 m (CA) e a escada de tocos mais 39 m (CB = 72 no total).
 */
const CA = 33
const CB = 72
/** Fatia grande: raio, vão entre vizinhas e a distância entre centros de uma fileira e da seguinte. */
const DR = 7
const DGAP = 2.4
const DX = 2 * DR + DGAP
const DZ = Math.sqrt(DX * DX - (DX / 2) * (DX / 2))
const DZ0 = 15.1 + DGAP + DR
/** Toco grande: raio, lado da escada e o passo em z (vão 2,4 m). */
const SR = 5.5
const SX = 4.5
const SZ0 = 117 + CA + DGAP + SR
const SZ1 = Math.sqrt((2 * SR + DGAP) ** 2 - SX * SX)
const SZ = Math.sqrt((2 * SR + DGAP) ** 2 - (2 * SX) ** 2)
export const CLAREIRA = {
  Y1: CY1,
  Y2: CY2,
  Y3: CY3,
  Y4: CY4,
  /**
   * Campo de discos SOBRE O PÂNTANO ("não pode ter espaço para andar sem ser pelos discos"): colmeia
   * 3-2-3-2-3 de fatias grandes, vão de 2,4 m entre vizinhas (correndo não passa: tem que pular).
   */
  discs: [0, 1, 2, 3, 4].flatMap((row) =>
    (row % 2 ? [-DX / 2, DX / 2] : [-DX, 0, DX]).map((x) => [x, DZ0 + row * DZ] as const),
  ) as readonly (readonly [number, number])[],
  discR: DR,

  /** Giro das fatias (rad/s, alternando o lado). */

  discSpin: [2.0, 2.3, 2.15] as readonly number[],
  /** Giro dos tocos (rad/s). */
  stumpSpin: 3.2,
  /** Giro da vitória-régia (rad/s). */
  lilySpin: 2.3,
  /** Rampa das frutas (DECK → Y1) e as faixas das frutas. */
  ramp: { z0: 65 + CA, z1: 105 + CA, hx: 8 },
  lanes: [-6, -2, 2, 6] as readonly number[],
  /** Pedras de musgo entre as faixas: x, z (meia largura 0,75, meio comprimento 1,6, 1,5 m acima da rampa). */
  stones: [[-4, 72], [4, 72], [0, 80.5], [-4, 89], [4, 89], [0, 97.5]].map(([x, z]) => [x, z + CA] as const) as readonly (readonly [number, number])[],
  /** Troncos ocos de onde saem as frutas (um por faixa): centro do tronco deitado. */
  cannonZ: 107.5 + CA,
  cannonR: 1.15,
  cannonLen: 4,
  /** Tocos grandes que giram, em escada: x, z, raio, quanto acima do chão Y1. */
  stumps: [0, 1, 2, 3, 4, 5, 6].map(
    (i) => [i === 0 ? 0 : i % 2 ? SX : -SX, SZ0 + (i === 0 ? 0 : SZ1 + (i - 1) * SZ), SR, 0.9 + i * 0.7] as const,
  ) as readonly (readonly [number, number, number, number])[],
  /** Árvores gigantes ao lado da escada de tocos. */
  trees: [1, 2, 4, 5].map((i) => [i % 2 ? -12.6 : 12.6, SZ0 + SZ1 + (i - 1) * SZ] as const) as readonly (readonly [number, number])[],
  treeR: 1.6,
  /** A vitória-régia gigante. */
  lily: { z: 181 + CB, r: 9 },
  /** Cogumelos que lançam (x, z). */
  shrooms: [[-3, 203.1 + CB], [3, 203.1 + CB]] as readonly (readonly [number, number])[],
} as const

function courseClareira(): Course {
  const K = CLAREIRA
  const k = new CourseKit()
  kitStart(k)
  // ── 1. campo de fatias de tronco que giram ──
  // sem piso: cada fatia é um tronco em pé no pântano; caiu = volta à largada
  K.discs.forEach(([x, z], i) => {
    const p = k.disc(x, z, K.discR, 1, 1, 1, DECK + 0.25)
    k.pads[p].d = DECK + 0.25
    // vizinhos giram ao contrário (quem pula de uma para a outra troca de sentido)
    k.pads[p].spin = (i % 2 ? -1 : 1) * K.discSpin[i % 3]
    // o miolo da fatia: um cogumelo que empurra
    k.post(x, z, 1.2, DECK + 0.25, DECK + 1.6, 2)
  })
  // ── 2. rampa das frutas, com pedras de musgo entre as faixas ──
  k.box(0, 61.5 + CA, 8, 3.5, 5, 1, 1)
  const R = K.ramp
  const rampY = (z: number) => DECK + ((CY1 - DECK) * (z - R.z0)) / (R.z1 - R.z0)
  k.slope(0, R.z0, R.z1, DECK, CY1, R.hx, 5, 1, 2)
  k.balls = { lanes: K.lanes, every: 0.8, v: 7, R: 1.1, zEnd: 62.5 + CA }
  for (const [x, z] of K.stones) k.box(x, z, 0.75, 1.6, 0, 1, 2, 0, 1.5 + 0.6, rampY(z) + 1.5)
  // ── 3. os troncos ocos no alto da rampa e os tocos que giram sobre o pântano ──
  k.box(0, 111 + CA, 8, 6, 5, 1, 3, 0, 1.4, CY1)
  // tronco oco deitado = parede reta (caixa de 2,3 × 4 m, alto demais para subir)
  for (const x of K.lanes) k.box(x, K.cannonZ, K.cannonR, K.cannonLen / 2, 0, 1, 3, 0, K.cannonR * 2 + 0.2, CY1 + K.cannonR * 2)
  K.stumps.forEach(([x, z, r, h], i) => {
    const p = k.disc(x, z, r, 1, 1, 3, CY1 + h)
    k.pads[p].d = CY1 + h
    k.pads[p].spin = (i % 2 ? 1 : -1) * K.stumpSpin
    // 20/11 (dificuldade): semente pendurada balançando por cima dos tocos pares (joga no pântano)
    if (i > 0 && i % 2 === 0) k.swing(x, z, CY1 + h + 9, 7.4, 1.25, 1.0, 1.9, i * 1.3)
  })
  for (const [x, z] of K.trees) k.post(x, z, K.treeR, 0, CY1 + 12, 0)
  // ── 4. o barranco, a vitória-régia gigante que gira e as sementes penduradas ──
  k.box(0, 161.5 + CB, 7, 6.5, 5, 1, 4, 0, 6, CY2)
  k.box(0, 170.5 + CB, 2, 2.2, 5, 1, 4, 0, 1.2, CY2)
  const lily = k.disc(0, K.lily.z, K.lily.r, 5, 1, 4, CY2)
  k.pads[lily].spin = K.lilySpin
  let ph = 0
  // 20/11 (dificuldade): sementes maiores e com balanço mais largo
  for (const z of [176.5, 181, 185.5]) {
    k.swing(0, z + CB, CY2 + 9, 7.4, 1.4, 1.1, 2.05, ph)
    ph += 2.3
  }
  k.box(0, 192.6 + CB, 2, 2.6, 5, 1, 4, 0, 1.2, CY2)
  // ── 5. cogumelos que lançam e a subida da chegada ──
  k.box(0, 197.6 + CB, 6, 2.4, 5, 1, 5, 0, 1.4, CY2)
  for (const [x, z] of K.shrooms) k.post(x, z, 1.15, 0, CY2 + 0.2, 2, 13.5)
  k.box(0, 210 + CB, 7, 4, 5, 1, 5, 0, 2.6, CY3)
  k.slope(0, 214 + CB, 236 + CB, CY3, CY4, 6, 5, 1, 5)
  k.swing(-2.4, 222 + CB, CY3 + 10.5, 7.6, 1.2, 0.9, 1.9, 0.6)
  k.swing(2.4, 229 + CB, CY3 + 11.5, 7.6, 1.2, 0.9, 1.9, 2.9)
  k.box(0, 243.8 + CB, 9, 7.8, 1, 0, 6, 0, 1.6, CY4)
  for (const [x, z, y] of [[0, 13.5, DECK], [0, 61.5 + CA, DECK], [-4, 113.5 + CA, CY1], [4, 113.5 + CA, CY1], [0, 163 + CB, CY2], [0, 210 + CB, CY3]] as [number, number, number][]) k.logo(x, z, y)
  const finishZ = 236 + CB + 8.8
  return k.done({
    id: "clareira",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 61.5 + CA, y: DECK, w: 6 },
      { x: 0, z: 113 + CA, y: CY1, w: 5 },
      { x: 0, z: 163 + CB, y: CY2, w: 5 },
      { x: 0, z: 198.2 + CB, y: CY2, w: 4 },
    ],
    finishZ,
    finishY: CY4,
    sections: [15.5, R.z0, 112 + CA, 168.5 + CB, 195 + CB],
    minFinish: 22,
    route: (r) =>
      routeOf((add) => {
        // 1. de fatia em fatia em ziguezague (a semente escolhe o lado): entra pela borda, passa ao lado do
        // cogumelo do miolo e sai pela borda voltada para a próxima
        const side = r(1) < 0.5 ? -1 : 1
        add(0, 10)
        add(0, 14.6)
        const hops: [number, number][] = [0, 1, 2, 3, 4].map((row) => [row % 2 ? (side * DX) / 2 : 0, DZ0 + row * DZ])
        const out: [number, number] = [0, 59 + CA]
        let prev: [number, number] = [0, 14.6]
        hops.forEach(([x, z], i) => {
          const nx = i + 1 < hops.length ? hops[i + 1] : out
          const din = Math.hypot(x - prev[0], z - prev[1])
          const dout = Math.hypot(nx[0] - x, nx[1] - z)
          add(x - ((x - prev[0]) / din) * (DR - 1.2), z - ((z - prev[1]) / din) * (DR - 1.2))
          add(x + 2.4, z)
          add(x + ((nx[0] - x) / dout) * (DR - 0.8), z + ((nx[1] - z) / dout) * (DR - 0.8))
          prev = [x, z]
        })
        add(out[0], out[1])
        // 2. rampa: sobe pela coluna das pedras e desvia de lado quando a pedra está na frente
        const L = [-4, 0, 4][Math.floor(r(2) * 3)]
        for (let z = 64 + CA; z <= 104 + CA; z += 2) {
          const near = K.stones.some(([x, sz]) => x === L && Math.abs(z - sz) < 2.6)
          add(near ? L + (L >= 0 ? -1.3 : 1.3) * (L === 0 ? side : 1) : L, z)
        }
        // passa entre os troncos ocos pela abertura da coluna
        add(L, 103.5 + CA)
        add(L, 106 + CA)
        add(L, 109 + CA)
        add(L * 0.5, 112 + CA)
        add(0, 115.5 + CA)
        // 3. tocos, um a um: entra pela borda, passa pelo miolo e sai pela borda voltada para o próximo
        let pv: [number, number] = [0, 115.5 + CA]
        K.stumps.forEach(([x, z], i) => {
          const nx: [number, number] = i + 1 < K.stumps.length ? [K.stumps[i + 1][0], K.stumps[i + 1][1]] : [0, 156.5 + CB]
          const din = Math.hypot(x - pv[0], z - pv[1])
          const dout = Math.hypot(nx[0] - x, nx[1] - z)
          add(x - ((x - pv[0]) / din) * (SR - 1.2), z - ((z - pv[1]) / din) * (SR - 1.2))
          add(x, z)
          add(x + ((nx[0] - x) / dout) * (SR - 1), z + ((nx[1] - z) / dout) * (SR - 1))
          pv = [x, z]
        })
        add(0, 156.5 + CB)
        add(0, 163 + CB)
        add(0, 168.5 + CB)
        add(0, 172 + CB)
        // 4. atravessa a vitória-régia pelo meio
        for (let z = 174; z <= 189; z += 2.5) add(0, z + CB)
        add(0, 191 + CB)
        add(0, 194.5 + CB)
        add(0, 198.5 + CB)
        // 5. cogumelo e o barranco
        const S = K.shrooms[r(3) < 0.5 ? 0 : 1]
        add(S[0], S[1])
        add(S[0] * 0.5, 207 + CB)
        add(0, 211 + CB)
        for (let z = 214.5; z <= 235; z += 2.5) add(0, z + CB)
        add(0, finishZ - 7)
        add(0, finishZ - 2)
        add(0, finishZ + 3)
      }),
  })
}

// ═══ serraria — Serraria da Lua (3ª fase da Floresta) ════════════════════════

/**
 * 20/11 (pedido do Alex, 11º vídeo de referência: tipo de prova "pista de troncos e machados"): a serraria dos
 * lenhadores na Floresta da Lua, de noite. Toras deitadas ATRAVESSADAS na pista que rolam contra quem corre, com
 * fileiras de cravos (`Log`; duas delas deixam um desvio pelo lado), a ponte estreita dos machados de lenhador
 * (pêndulos que varrem a ponte), as tábuas que balançam de lado (`Plank`, duas filas desencontradas) e o
 * pátio das toras grandes com um machado por cima, antes da subida.
 */
export const SERRARIA = {
  /** toras do pátio: [x, z, meia largura, giro rad/s, fase dos cravos] */
  logs: [
    [0, 23, 7.6, 1.25, 0],
    [-2.2, 32, 5.4, 1.5, 1.1],
    [2.2, 41, 5.4, -1.35, 2.3],
    [0, 50, 7.6, 1.6, 0.6],
  ] as [number, number, number, number, number][],
  logR: 1.15,
  /** machados da ponte: z e fase */
  axes: [
    [70, 0],
    [77.5, 1.4],
    [85, 2.7],
    [92.5, 0.8],
  ] as [number, number][],
  axeLen: 6.2,
  /** tábuas: z dos centros (duas filas, x = ±2.6) */
  planks: [111.2, 117.2, 123.2, 129.2, 135.2],
  plankX: 2.6,
  /**
   * 20/11 (o Alex: "tem que ser só uma gangorra em cada linha, não duas, e elas têm que ser sensíveis a peso:
   * conforme o peso de um lado ela vira e faz o personagem escorregar"): cada fileira vira UMA gangorra larga
   * (10 m) que tomba de lado pelo PESO (mola fraca) e escorrega (`slip`). Antes: duas tábuas por fileira
   * balançando pelo relógio (amp 0,3, 1,35 rad/s).
   */
  saw: { hx: 5, hz: 2.9, max: 0.34, k: 0.3, slip: 11, rest: 0.06 },
  /** pátio das toras grandes: [z, giro] */
  bigLogs: [
    [157, 1.2],
    [172, 1.4],
  ] as [number, number][],
  bigR: 1.3,
} as const

function courseSerraria(): Course {
  const K = SERRARIA
  const k = new CourseKit()
  kitStart(k)
  // ── 1. as toras com cravos ──
  k.box(0, 37, 8.2, 21.9, 0, 1, 1)
  for (const [x, z, hx, w, ph] of K.logs) k.log(x, z, DECK + 0.05, K.logR, hx, w, 2, 3.0, ph)
  // ── 2. a ponte dos machados ──
  k.box(0, 62.5, 3.6, 3.4, 5, 1, 2)
  k.box(0, 82, 1.7, 16.1, 0, 1, 2)
  for (const [z, ph] of K.axes) k.swing(0, z, DECK + 7.6, K.axeLen, 0.8, 1.0, 1.85, ph)
  k.box(0, 102, 3.6, 3.9, 5, 1, 3)
  // ── 3. as tábuas que balançam ──
  K.planks.forEach((z, i) => {
    k.saw(0, z, DECK, K.saw.hx, K.saw.hz, 1, K.saw.max, i % 2 ? K.saw.rest : -K.saw.rest, K.saw.k)
    k.saws[k.saws.length - 1].slip = K.saw.slip
  })
  // ── 4. o pátio das toras grandes, com um machado no vão entre elas ──
  k.box(0, 160, 8.2, 21.9, 5, 1, 4)
  for (const [z, w] of K.bigLogs) k.log(0, z, DECK + 0.05, K.bigR, 7.8, w, 2, 2.8, z * 0.3)
  k.swing(0, (K.bigLogs[0][0] + K.bigLogs[1][0]) / 2, DECK + 7.6, K.axeLen, 0.8, 1.0, 1.6, 0.5)
  // ── 5. a subida ──
  const z0 = 182
  const finishZ = kitFinish(k, z0, 1.15, 6.5, 1.1)
  for (const [x, z] of [[0, 18], [6.6, 32], [-6.6, 41], [0, 62.5], [0, 102], [0, 144]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "serraria",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 62.5, y: DECK, w: 3 },
      { x: 0, z: 102, y: DECK, w: 3 },
      { x: 0, z: 144, y: DECK, w: 6 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [15.1, 59.1, 98.1, 138.1, z0],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        add(0, 10)
        add(0, 17)
        add(0, 21)
        add(0, 26)
        // 2ª e 3ª toras: metade desvia pelo vão do lado, metade passa por cima
        const s2 = r(1) < 0.5
        const s3 = r(2) < 0.5
        add(s2 ? 6.2 : -2.2, 29)
        add(s2 ? 6.2 : -2.2, 35)
        add(s3 ? -6.2 : 2.2, 38)
        add(s3 ? -6.2 : 2.2, 44)
        add(0, 47)
        add(0, 53)
        add(0, 57)
        for (let z = 60; z <= 104; z += 2) add(0, z)
        const c = r(3) < 0.5 ? -1 : 1
        add(c * 1.2, 107)
        for (let z = 109; z <= 137; z += 2) add(c * 1.2, z)
        add(0, 141)
        for (let z = 145; z <= 180; z += 2.5) add(0, z)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ canion — Cânion ═════════════════════════════════════════════════════════

/**
 * Gincana 3 (2026-11-18): PEDRAS QUE CAEM — sobrevivência no Cânion. Pedra pisada treme e cai para sempre;
 * quem cai do andar de baixo está FORA. Acaba quando só sobra a vaga (metade) em pé ou em 2 min. Pular poupa
 * pedra: no ar ninguém derruba nada.
 * 20/11 (o Alex: "mais do que 4 pisos e algo legal para dificultar"): SEIS andares (23 → 3 m) e o cânion
 * DESMORONA PELA BORDA — a partir de `CANION.crumble.start` s o anel de fora de cada andar cai sozinho, um anel a
 * cada `every` s, até o miolo (os andares de baixo começam depois). A arena encolhe e quem fica na beira cai.
 */
/** 20/11 (pedido do Alex: "o espaço entre um piso e outro tem que ser no mínimo 3× maior"): 12 m entre os andares (antes 4) */
export const STONE_STEP = 12
const STONE_FLOORS = [DECK + 5 * STONE_STEP, DECK + 4 * STONE_STEP, DECK + 3 * STONE_STEP, DECK + 2 * STONE_STEP, DECK + STONE_STEP, DECK] as const
const STONE_R = 18
const STONE_GAP = 2.4

export const CANION = {
  floors: STONE_FLOORS,
  /** desmoronamento: começa em `start` s no andar de cima; cada andar abaixo começa `floorLag` s depois; um anel (2,4 m) a cada `every` s */
  crumble: { start: 14, floorLag: 4, every: 3.5, keep: 2.6 },
  warn: 0.85,
} as const

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
  const CR = CANION.crumble
  STONE_FLOORS.forEach((y, f) => {
    const rMax = STONE_R - 0.5 * f
    for (const [x, z] of stoneCells(f)) {
      // a cor do ladrilho = o andar (o desenho pinta cada andar de uma cor clara)
      k.tile(x, z, 1.27, f, 1, y)
      // o miolo (raio `keep`) nunca desmorona; o resto cai de fora para dentro
      const d = Math.hypot(x, z)
      if (d > CR.keep) k.tiles[k.tiles.length - 1].cr = CR.start + f * CR.floorLag + Math.floor((rMax - d) / STONE_GAP) * CR.every
    }
  })
  const top = STONE_FLOORS[0]
  return k.done({
    id: "canion",
    mode: "survive",
    qualify: 0.5,
    limit: 120,
    tileTime: { warn: CANION.warn, gone: 1e6 },
    checkpoints: [{ x: 0, z: 1.3, y: top, w: 6 }],
    // arena: ninguém "chega" (a linha fica fora e no alto)
    finishZ: 40,
    finishY: 90,
    sections: [],
    minFinish: 1e6,
    route: () => [{ x: 0, z: 0 }],
  })
}

// ═══ moinhos — Trilha dos Moinhos (2ª fase do Cânion) ═════════════════════════

/**
 * 20/11 (pedido do Alex, 4º vídeo de referência: tipo de prova "circuito de obstáculos misto"): no Cânion
 * Flutuante, a trilha da vila dos moinhos. Moendas de pedra deitadas que giram (o lado é parede; em cima o giro
 * joga você de lado), blocos de arenito que deslizam, pás de moinho girando rente aos discos de pedra, o campo
 * de cata-ventos (pás pequenas em grade, cada uma no seu giro) e a subida com as pedras rolando.
 */
export const MOINHOS = {
  /**
   * 20/11 (pedido do Alex: "se ficar bem grande, sem chão e com buracos, aí faz sentido"): três moendas GRANDES
   * lado a lado sobre o vazio (o topo no nível do deck), cada uma em 5 anéis que giram cada um para um lado,
   * com buracos que passam por baixo de quem está em cima. Caiu = volta ao posto.
   */
  R: 2.8,
  /** x de cada moenda */
  millX: [-5.8, 0, 5.8],
  z0: 15.2, // um tico depois do começo do trecho 1: o reprise copia o que começa depois da emenda (15,15)
  ringLen: 7.94,
  /** giro de cada anel (rad/s; a moenda do meio ao contrário das de fora) */
  ringW: [0.5, -0.58, 0.54, -0.5, 0.6],
  /** buracos por anel: meia largura (rad) e quantos */
  holeHalf: 0.3,
  /** cata-ventos: [x, z, giro] — 20/11: pás GROSSAS (parede: não se pula nem se mergulha) */
  // duas fileiras de 4 a cada 4,5 m: os alcances se cruzam, então todo vão (e a beira) fecha de tempos em tempos
  vanes: [
    [-6.75, 135, 1.1], [-2.25, 135, -1.2], [2.25, 135, 1.15], [6.75, 135, -1.1],
    [-6.75, 147, -1.15], [-2.25, 147, 1.1], [2.25, 147, -1.2], [6.75, 147, 1.15],
  ] as [number, number, number][],
  /** vãos por onde se passa (x) */
  vaneGaps: [-4.5, 0, 4.5],
  vaneLen: 1.2,
  vaneR: 0.9,
  vaneSpeed: 0.5,
  /** chão do campo de cata-ventos: gangorra de lado que tomba com o peso (escorrega) */
  tilt: { z0: 129, z1: 155.9, max: 0.1, k: 0.45 },
} as const

function courseMoinhos(): Course {
  const K = MOINHOS
  const k = new CourseKit()
  kitStart(k)
  // ── 1. as moendas grandes sobre o vazio, com buracos ──
  K.millX.forEach((x, m) =>
    k.drum(
      x,
      K.z0,
      DECK - K.R,
      K.R,
      K.ringW.map((w, i) => ({
        len: K.ringLen,
        w: (m === 1 ? -1 : 1) * w,
        holes: [0, Math.PI].map((o) => ({ a: o + i * 1.3 + m * 2.1, half: K.holeHalf })),
      })),
      0.8,
      false,
    ),
  )
  // ── 2. os blocos de arenito ──
  k.box(0, 72, 9, 17.1, 5, 1, 2)
  // 20/11 (dificuldade): cinco blocos (antes três), mais rápidos e indo até a beira (jogam no vazio)
  k.pusher(0, 60, 1.6, 1.6, 2.2, 7.2, 0, 1.25, 0)
  k.pusher(0, 66, 1.6, 1.6, 2.2, 7.2, 0, 1.45, 1.3)
  k.pusher(0, 72, 1.6, 1.6, 2.2, 7.2, 0, 1.35, 2.6)
  k.pusher(0, 78, 1.6, 1.6, 2.2, 7.2, 0, 1.55, 3.9)
  k.pusher(0, 84, 1.6, 1.6, 2.2, 7.2, 0, 1.2, 5.0)
  // ── 3. as pás do moinho sobre dois discos de pedra ──
  k.box(0, 91, 2.2, 2.1, 0, 1, 3)
  k.disc(0, 100, 7, 2, 1, 3)
  k.sweep(0, 100, DECK + 0.55, 6.7, 0.32, 1.3, 0, true)
  k.box(0, 108.5, 2.2, 1.8, 0, 1, 3)
  k.disc(0, 117, 7, 2, 1, 3)
  k.sweep(0, 117, DECK + 0.55, 6.7, 0.32, -1.4, Math.PI / 2, true)
  // ── 4. o campo de cata-ventos ──
  // 20/11 (pedido do Alex): o posto fica num pedaço firme; o resto do campo é uma gangorra de lado que tomba com o
  // peso da turma (escorrega para o lado baixo e joga no vazio) e as pás são paredes grossas que giram
  const T = K.tilt
  k.box(0, (124.1 + T.z0) / 2, 9, (T.z0 - 124.1) / 2, 5, 1, 4)
  k.saw(0, (T.z0 + T.z1) / 2, DECK, 9, (T.z1 - T.z0) / 2, 1, T.max, 0, T.k)
  for (const [x, z, w] of K.vanes) {
    k.sweep(x, z, DECK + 1.3, K.vaneLen, K.vaneR, w * K.vaneSpeed, x * 0.7, true)
    k.post(x, z, 0.2, DECK, DECK + 2.6, 4)
  }
  // ── 5. a subida com as pedras ──
  const z0 = 156
  const finishZ = kitFinish(k, z0, 1.1, 6.5, 1.1)
  for (const [x, z] of [[0, 16.5], [-7.4, 45], [0, 57], [0, 91.5], [0, 126]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "moinhos",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 58, y: DECK, w: 6 },
      { x: 0, z: 91.5, y: DECK, w: 2 },
      { x: 0, z: 127.5, y: DECK, w: 6 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [15.1, 54.9, 89.1, 124.1, z0],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        const a = r(1) < 0.5 ? -1 : 1
        const b = r(2) < 0.5 ? -1 : 1
        // em cima de uma das moendas (a semente escolhe), pelo topo
        const mx = K.millX[1 + (b > 0 ? a : 0)]
        add(mx * 0.5, 10)
        add(mx, 14)
        for (let z = 17; z <= 53; z += 2) add(mx, z)
        add(0, 56)
        for (let z = 57; z <= 88; z += 2.5) add(0, z)
        // nos discos, longe do eixo (perto dele a barra passa rápido demais para ler)
        const c = r(3) < 0.5 ? -1 : 1
        add(0, 90)
        add(0, 92.5)
        add(c * 2.6, 96)
        add(c * 3, 100)
        add(c * 2.6, 104)
        add(0, 107.5)
        add(0, 109.5)
        add(-c * 2.6, 113)
        add(-c * 3, 117)
        add(-c * 2.6, 121)
        add(0, 124)
        // pelos vãos das pás (a semente escolhe um em cada fileira)
        const g1 = K.vaneGaps[Math.floor(r(4) * 3)]
        const g2 = K.vaneGaps[Math.floor(r(5) * 3)]
        add(g1 * 0.5, 128)
        add(g1, 131)
        add(g1, 135)
        add(g1, 138.5)
        add((g1 + g2) / 2, 141)
        add(g2, 143.5)
        add(g2, 147)
        add(g2, 150.5)
        // a 2ª volta começa nas moendas logo aqui: alinha com a escolhida antes de chegar
        add(mx, 153.5)
        add(mx, 155.5)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ helices — Hélices da Orbital ════════════════════════════════════════════

/**
 * Gincana (2026-11-20, vídeo 5): CORRIDA DAS HÉLICES — a 2ª fase da Cidade
 * Orbital. Hélices deitadas no vazio: cada uma são 2 ou 3 pás retas cruzadas
 * no mesmo cubo (caixas que giram juntas) e um disco no miolo. Quem pisa é
 * levado pelo giro; entre uma hélice e a outra, o salto é de ponta a ponta.
 * Nas hélices pares, a barra do cubo varre por cima (se pula). Caiu no vazio =
 * volta ao último posto.
 */
export const HELICES = {
  /** [x, z, nº de pás (2 = cruz, 3 = seis braços), meio-comprimento da pá, meia-largura, giro rad/s, barra] */
  fans: [
    [0, 30, 2, 7, 1.7, 0.5, 0],
    [0, 46, 3, 7, 1.7, -0.55, 0],
    [-2.5, 89, 3, 7.5, 1.9, 0.5, 1],
    [2, 108.8, 2, 7.5, 1.9, -0.6, 0],
    [-1.5, 128.4, 3, 7.5, 1.9, 0.62, 1],
  ] as [number, number, number, number, number, number, number][],
  /** 20/11 (pedido do Alex): o miolo de cada hélice gira RÁPIDO ao contrário das pás (× o giro da hélice).
   *  Antes: o miolo girava junto com as pás (× 1). */
  hub: -3.2,
} as const

function courseHelices(): Course {
  const k = new CourseKit()
  kitStart(k)
  const fan = (x: number, z: number, n: number, L: number, hw: number, w: number, bar: number, s: number) => {
    for (let i = 0; i < n; i++) {
      const p = k.box(x, z, hw, L, 5, 1, s, (i * Math.PI) / n, 1.2)
      k.pads[p].spin = w
    }
    const c = k.disc(x, z, hw * 1.9, 6, 1, s)
    k.pads[c].spin = w * HELICES.hub
    // a barra do cubo: gira ao contrário, rente ao tampo (se pula); o cubo é um poste (ninguém fica no eixo)
    if (bar) {
      k.sweep(x, z, DECK + 0.55, L - 0.4, 0.3, -w * 1.6, 0.6, true)
      k.post(x, z, 1.1, DECK, DECK + 2.2, 4)
    }
  }
  // ── 1. as duas primeiras hélices ──
  k.box(0, 18.1, 3, 3, 0, 1, 1)
  for (const f of HELICES.fans.slice(0, 2)) fan(f[0], f[1], f[2], f[3], f[4], f[5], f[6], 1)
  // ── 2. a doca: ilha com o posto e o corredor das barras ──
  k.box(0, 58, 4, 3, 0, 1, 2)
  k.box(0, 69.5, 4.5, 8.5, 4, 1, 2)
  k.sweep(0, 64.2, DECK + 0.55, 4.5, 0.3, 1.0, 0, true)
  k.sweep(0, 74.8, DECK + 0.55, 4.5, 0.3, -1.15, 1, true)
  k.box(0, 79.7, 2.5, 1.7, 0, 1, 3)
  // ── 3. três hélices desencontradas, duas com a barra no cubo ──
  for (const f of HELICES.fans.slice(2)) fan(f[0], f[1], f[2], f[3], f[4], f[5], f[6], 3)
  // pilares parados entre uma hélice e a outra (a ponte entre os cubos)
  k.box(0, 99.2, 2, 1.8, 0, 1, 3)
  k.box(0, 118.6, 2, 1.8, 0, 1, 3)
  // ── 4. o cais e as plataformas que vão e voltam ──
  k.box(0, 138.5, 4, 2.6, 0, 1, 4)
  for (const [z, ph] of [[145.5, 0], [152.5, 2.1], [159.5, 4.2]] as [number, number][]) {
    const p = k.box(0, z, 2.6, 2.6, 4, 1, 4, 0, 1)
    Object.assign(k.pads[p], { mx: 2.4, mz: 0, mw: 1.1, mph: ph })
  }
  k.box(0, 166.2, 4, 2.8, 0, 1, 4)
  // ── 5. a subida das pedras ──
  const z0 = 169
  const finishZ = kitFinish(k, z0, 1.05, 6.8, 1.1)
  for (const [x, z] of [[0, 16.5], [0, 57], [0, 79], [0, 99.2], [0, 118.6], [0, 139]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "helices",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 58, y: DECK, w: 3 },
      { x: 0, z: 138.5, y: DECK, w: 3 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [17.4, 55, 78, 136, z0],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        add(0, 10)
        add(0, 17)
        add(0, 20.5)
        for (let z = 23; z <= 53; z += 1.5) add(0, z)
        add(0, 56)
        add(0, 59)
        add(2.4, 61.5)
        for (let z = 63; z <= 68.5; z += 1.5) add(2.4, z)
        add(-2.4, 70)
        for (let z = 71.5; z <= 78; z += 1.5) add(-2.4, z)
        add(0, 78.5)
        add(0, 81)
        // nas hélices com barra, longe do cubo (de um lado); na do meio, pelo eixo
        const sd = r(1) < 0.5 ? -1 : 1
        for (let z = 82.5; z <= 135; z += 1.5) {
          if (z > 96.5 && z < 101.5) add(0, z)
          else if (z > 116 && z < 121) add(0, z)
          else if (z < 97) add(-2.5 + sd * 2.6 * Math.max(0, 1 - Math.abs(z - 89) / 7), z)
          else if (z < 117) add(2, z)
          else add(-1.5 - sd * 2.6 * Math.max(0, 1 - Math.abs(z - 128.4) / 7), z)
        }
        add(0, 137)
        for (let z = 140; z <= 165; z += 1.5) add(0, z)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ crosta — Trilha da Crosta (Forja) ═══════════════════════════════════════

/**
 * Gincana (2026-11-20, vídeo 6): TRILHA DA CROSTA — a 3ª fase da Forja. A lava
 * esfriou em placas sobre o mar de brasa e só um caminho aguenta (a semente
 * sorteia; `pathReal`). A placa firme, pisada, acende em brasa e fica acesa para
 * todos; a crosta falsa afunda na hora e vira buraco. Quatro tabuleiros: o largo
 * (7 × 8), o dos malhos (7 × 10, três malhos com cravos balançando de lado), o
 * estreito (5 × 9, dois malhos) e o da brasa (6 × 8, dois malhos). Caiu na lava =
 * volta ao último posto.
 */
export const CROSTA = {
  /** passo do tabuleiro (m) e meia largura da placa */
  step: 2.4,
  h: 1.12,
  /** [x, z0, colunas, fileiras] */
  grids: [
    [0, 16, 7, 8],
    [0, 42.2, 7, 10],
    [0, 73.25, 5, 9],
    [0, 100.75, 6, 8],
  ] as [number, number, number, number][],
  /** malhos: [z, fase] */
  hammers: [
    [47, 0],
    [54.2, 2.1],
    [61.4, 4.2],
    [78.05, 1],
    [87.65, 3.2],
    [105.55, 0.6],
    [112.75, 3.7],
  ] as [number, number][],
  /** 20/11 (dificuldade): malhos maiores, mais largos e mais rápidos (antes R 1,15, amp 0,72/0,9, w 1,9) */
  hamR: 1.25,
  hamAmp: [0.8, 1.0] as [number, number],
  hamW: 2.0,
  /**
   * 20/11 (o Alex: "se a pessoa for pelos cantos ela nunca é atingida"): o malho fica num CARRINHO que corre de
   * lado na viga do pórtico (±`tx` = meia largura do tabuleiro − `edge`), então o golpe baixo chega até a beira.
   * Giro do carrinho `tw` rad/s (mais lento que o balanço: o lugar seguro muda a cada passada).
   */
  trolley: { edge: 1.2, tw: 0.85 },
  balls: { every: 0.85, v: 7.5, R: 1.25 },
} as const

function courseCrosta(): Course {
  const k = new CourseKit()
  kitStart(k)
  for (const [x, z0, cols, rows] of CROSTA.grids) k.pathGrid(x, z0, cols, rows, CROSTA.h, CROSTA.step, 3)
  // patamares entre os tabuleiros (o posto)
  k.box(0, 37.5, 8.6, 3.55, 2, 1, 2)
  k.box(0, 68.6, 8.6, 3.55, 2, 1, 3)
  k.box(0, 96.6, 6, 3, 2, 1, 4)
  k.box(0, 121.7, 7.4, 3, 2, 1, 5)
  // os malhos: pêndulo pendurado no pórtico, balança de lado (cobre ±6 m)
  CROSTA.hammers.forEach(([z, ph], i) => {
    k.swing(0, z, DECK + 9, 7.6, CROSTA.hamR, z > 70 && z < 95 ? CROSTA.hamAmp[0] : CROSTA.hamAmp[1], CROSTA.hamW, ph)
    // o tabuleiro onde o malho está: o carrinho corre até `edge` da beira
    const g = CROSTA.grids.find(([, z0, , rows]) => z >= z0 && z <= z0 + rows * CROSTA.step)
    const half = g ? (g[2] * CROSTA.step) / 2 : 6
    Object.assign(k.pendulums[k.pendulums.length - 1], { tx: Math.max(1, half - CROSTA.trolley.edge), tw: CROSTA.trolley.tw, tph: i * 2.3 })
  })
  const z0 = 124.7
  const finishZ = kitFinish(k, z0, CROSTA.balls.every, CROSTA.balls.v, CROSTA.balls.R)
  for (const [x, z] of [[0, 37.5], [0, 68.6], [0, 96.6], [0, 121.7]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "crosta",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 37.5, y: DECK, w: 6 },
      { x: 0, z: 68.6, y: DECK, w: 6 },
      { x: 0, z: 96.6, y: DECK, w: 4 },
      { x: 0, z: 121.7, y: DECK, w: 5 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [14.9, 41, 72.1, 99.6, z0],
    minFinish: 20,
    // a falsa cai já (0,25 s) e não volta: o buraco é a pista para quem vem atrás
    tileTime: { warn: 0.25, gone: 1e6 },
    route: () =>
      routeOf((add) => {
        add(0, 10)
        for (let z = 14; z <= 122; z += 1.2) add(0, z)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ gangorras — Gangorras do Desfiladeiro (3ª fase do Cânion) ════════════════

/**
 * 20/11 (pedido do Alex, 8º vídeo de referência: tipo de prova "tábuas que inclinam com o peso sobre o
 * vazio"): pontes de gangorra de madeira e corda atravessando o desfiladeiro. A gangorra inclina pelo PESO de
 * quem está em cima (estado no mundo, `w.saw`) — quem chega encontra a tábua como os da frente deixaram.
 * 1. Três pistas, duas fileiras de gangorras compridas com patamar no meio (a ponta de perto descansa no chão;
 *    passou do eixo, ela tomba para a frente; se tem gente na frente, a sua ponta está no alto: pule).
 * 2. A corrente: três gangorras emendadas em cada uma das duas pistas estreitas, sem patamar.
 * 3. Os pratos de lado: gangorras largas que tombam para o lado de quem pisa fora do meio (escorrega),
 *    com vão para pular entre elas.
 * 4. A balança grande: uma gangorra larga para todos; ela só tomba quando a turma passa do eixo.
 * Diferente da Serraria (tábuas que balançam pelo relógio): aqui quem move a tábua é o peso dos corredores.
 */
export const GANGORRAS = {
  /**
   * 20/11 (pedido do Alex: "tem que ser um só bem grande em cada etapa… umas 8 etapas… ele escorrega, conforme
   * ele sobe todo mundo escorrega, é bem sensível"): no lugar das duas fileiras de três tábuas, 8 BALANÇAS largas
   * em fila, uma por etapa, que tombam de LADO pelo peso (mola fraca = sensível) e escorregam forte (`slip`).
   * Quem pisa num lado faz ela descer para esse lado: tem que correr para o outro. Patamar de descanso depois
   * da 4ª. `rest` = repouso torto, alternando o lado. Antes: rows [19.9, 35.5], lanes ±3.4 / 0, long hx 1,25.
   */
  stages: { n: 8, z0: 15.4, hx: 3.3, hz: 3.3, gap: 0.5, max: 0.34, k: 0.3, slip: 11, rest: 0.06, mid: 4, midHz: 2.6 },
  long: { hx: 1.25, hz: 4.5, max: 0.2, k: 0.9 },
  /** corrente: z do eixo de cada elo; pistas ±2.3 */
  chain: [51.1, 60.4, 69.7],
  chainX: 2.3,
  chainHx: 1.0,
  /** pratos de lado: [x, z, meia largura] */
  plates: [[-2.9, 84, 2.2], [2.9, 84, 2.2], [0, 91.4, 3.1], [-3.2, 98.8, 2.3], [3.2, 98.8, 2.3], [0, 105.2, 3.1]] as [number, number, number][],
  plateHz: 2.1,
  big: { z: 123.3, hx: 5.2, hz: 6, max: 0.16, k: 0.35 },
} as const

/** Gangorras: z do centro de cada balança, o patamar do meio e onde acabam (20/11). */
export function gangorraStages() {
  const S = GANGORRAS.stages
  const zs: number[] = []
  let z = S.z0
  let mid = 0
  for (let i = 0; i < S.n; i++) {
    if (i === S.mid) {
      mid = z + S.midHz
      z += 2 * S.midHz + S.gap
    }
    zs.push(z + S.hz)
    z += 2 * S.hz + S.gap
  }
  return { zs, mid, end: z - S.gap }
}
/** O resto da fase (do patamar 43,3 em diante) anda isto para a frente (as balanças são mais compridas). */
const GANG_D = gangorraStages().end + 0.2 - 40.2

function courseGangorras(): Course {
  const K = GANGORRAS
  const k = new CourseKit()
  kitStart(k)
  // gangorra comprida que descansa com a ponta de perto no chão (eixo acima do patamar)
  const longSaw = (x: number, z: number, hx: number, hz: number, max: number, kk: number) =>
    k.saw(x, z, DECK + Math.tan(max) * hz, hx, hz, 0, max, -max, kk)
  const D = GANG_D
  const ST = K.stages
  const G = gangorraStages()
  // ── 1. as 8 balanças grandes (tombam de lado com o peso e escorregam) ──
  G.zs.forEach((z, i) => {
    k.saw(0, z, DECK, ST.hx, ST.hz, 1, ST.max, i % 2 ? ST.rest : -ST.rest, ST.k)
    k.saws[k.saws.length - 1].slip = ST.slip
  })
  k.box(0, G.mid, ST.hx, ST.midHz, 1, 1, 1)
  k.box(0, 43.3 + D, 6.2, 3.1, 1, 1, 1)
  // 20/11 (dificuldade): no patamar, a barra baixa girando (pule ou cai no vazio)
  k.sweep(0, 43.3 + D, DECK + 0.55, 5.6, 0.3, -1.2, Math.PI / 2, true)
  // ── 2. a corrente: três elos emendados em cada pista ──
  for (const x of [-K.chainX, K.chainX]) for (const z of K.chain) longSaw(x, z + D, K.chainHx, K.long.hz, K.long.max, K.long.k)
  // 20/11 (dificuldade): pêndulos atravessando as duas correntes
  k.swing(0, 55.7 + D, DECK + 8.6, 7.2, 1.05, 0.85, 1.9, 0)
  k.swing(0, 65 + D, DECK + 8.6, 7.2, 1.05, 0.85, 1.9, 2.2)
  k.box(0, 77.5 + D, 5.2, 3, 1, 1, 2)
  // ── 3. os pratos de lado ──
  // descansam tortos, cada um para um lado: quem pisa no lado baixo escorrega e tomba mais; o peso no lado alto endireita
  K.plates.forEach(([x, z, hx], i) => k.saw(x, z + D, DECK, hx, K.plateHz, 1, 0.28, i % 2 ? 0.13 : -0.13, 0.9))
  k.box(0, 113.4 + D, 6.2, 3, 1, 1, 3)
  k.sweep(0, 113.4 + D, DECK + 0.55, 5.6, 0.3, 1.25, 0.8, true)
  // ── 4. a balança grande ──
  longSaw(0, K.big.z + D, K.big.hx, K.big.hz, K.big.max, K.big.k)
  const z0 = K.big.z + D + K.big.hz + 0.3
  const finishZ = kitFinish(k, z0, 1.05, 7, 1.15)
  for (const [x, z] of [[0, G.mid], [-3, 43.3 + D], [3, 43.3 + D], [0, 77.5 + D], [0, 113.4 + D]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "gangorras",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: G.mid + 1.2, y: DECK, w: 4 },
      { x: 0, z: 43.3 + D, y: DECK, w: 5 },
      { x: 0, z: 77.5 + D, y: DECK, w: 4 },
      { x: 0, z: 113.4 + D, y: DECK, w: 5 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [15.1, 46.4 + D, 80.5 + D, 116.4 + D, z0],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        add(0, 10)
        // balanças: um pouco fora do meio (o peso de cada um conta); a regra de correr para o lado que sobe é do robô
        G.zs.forEach((z, i) => {
          const x = (r(10 + i) - 0.5) * 2
          add(x, z - ST.hz + 0.7)
          add(x, z + ST.hz - 0.7)
        })
        const l3 = r(3) < 0.5 ? -K.chainX : K.chainX
        add(l3, 46 + D)
        add(l3, 74 + D)
        // pratos: o do lado da corrente, o do meio, um dos dois de lado e o do meio
        // (no prato, um pouco fora do meio: o peso de cada um conta)
        const o = (i: number) => (r(6 + i) - 0.5) * 2.2
        add(Math.sign(l3) * 2.9 + o(0), 81 + D)
        add(Math.sign(l3) * 2.9 + o(0), 86 + D)
        add(o(1), 89.4 + D)
        add(o(1), 93.4 + D)
        const s4 = r(4) < 0.5 ? -3.2 : 3.2
        add(s4 + o(2), 96.8 + D)
        add(s4 + o(2), 100.8 + D)
        add(o(3), 104.2 + D)
        add(o(3), 108.2 + D)
        add(0, 111 + D)
        for (let z = K.big.z + D - K.big.hz + 1; z <= K.big.z + D + K.big.hz - 1; z += 2) add(r(5) < 0.5 ? -1.5 : 1.5, z)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ aros — Descida dos Aros (Mar de Gelo) ════════════════════════════════════

/**
 * Gincana (2026-11-20, vídeo 7): DESCIDA DOS AROS — a 4ª fase do Mar de Gelo.
 * Larga no alto e desce duas ladeiras de gelo liso (escorrega e a ladeira
 * empurra para baixo). Aros de cristal no ar: quem PULA pelo meio ganha turbo e
 * embalo (`hoopPass`); um vai e volta de lado; um cogumelo de neve lança até o
 * aro alto. Um bloco de gelo desliza no patamar. No fim, três paredões de janelas:
 * só passa quem pula pela janela (parapeito de 1 m, verga a 3,6 m), e cada janela tem um aro.
 */
export const AROS = {
  y0: DECK + 12,
  /** [x, z, altura acima do gelo, mx, w, fase] */
  hoops: [
    [-2.5, 24, 2.2, 0, 0, 0],
    [2.2, 33, 2.2, 0, 0, 0],
    [-1.2, 42, 2.2, 0, 0, 0],
    [2.6, 51, 2.2, 0, 0, 0],
    [0, 77, 2.2, 0, 0, 0],
    [-3, 91, 4.6, 0, 0, 0],
    [0, 99, 2.2, 3, 1.2, 0],
    [2.2, 107, 2.2, 0, 0, 0],
  ] as [number, number, number, number, number, number][],
  /** paredões: [z, janelas (x)] — parapeito 1 m, janela de 2,4 m (20/11: 3-2-3 → 2-1-2) */
  walls: [
    [124, [-2.4, 2.4]],
    [130.5, [0]],
    [137, [-4.8, 4.8]],
  ] as [number, number[]][],
  /** 20/11 (dificuldade): blocos de gelo que deslizam de lado na 1ª descida — [z, fase] */
  slides: [[31, 0], [38.5, 1.4], [55, 2.6]] as [number, number][],
  slideAx: 4.6,
  slideW: 1.25,
  /** 20/11: estalactites em pêndulo na 2ª descida — [x, z, fase] */
  icicles: [[-2.4, 81, 0], [1.8, 94.5, 1.6], [-1.2, 103, 3.1]] as [number, number, number][],
  /** 20/11: as pedras da subida (antes 1,05 s, 6,8 m/s, R 1,1) */
  balls: { every: 0.8, v: 8, R: 1.3 },
} as const

function courseAros(): Course {
  const k = new CourseKit()
  const Y0 = AROS.y0
  const Y1 = DECK + 5
  // largada no alto
  k.box(0, 0, 10, 8, 6, 7, 0, 0, 3, Y0)
  k.box(0, 11.5, 7, 3.6, 0, 1, 0, 0, 2, Y0)
  for (const x of [-4, 0, 4]) k.logo(x, 12.5, Y0)
  // ladeira de gelo: escorrega (f) e empurra para baixo (bz)
  const ice = (z0: number, z1: number, y0: number, y1: number, s: number) => {
    const p = k.slope(0, z0, z1, y0, y1, 6.5, 3, 1, s)
    Object.assign(k.pads[p], { f: 0.55, bz: 2.2 })
  }
  const surf = (z: number) => (z < 60 ? Y0 + ((Y1 - Y0) * (z - 15.1)) / (60 - 15.1) : Y1 + ((DECK - Y1) * (z - 68)) / (112 - 68))
  // ── 1. a primeira descida, com os aros ──
  ice(15.1, 60, Y0, Y1, 1)
  for (const [x, z] of [[2.6, 28.5], [-2.8, 46.5]] as [number, number][]) k.post(x, z, 0.75, surf(z) - 0.5, surf(z) + 1.9, 3)
  // blocos de gelo que cruzam a ladeira (meio enterrados: o topo fica 1,5 m acima do gelo)
  for (const [z, ph] of AROS.slides) k.pusher(0, z, 1.2, 1.2, 2.0, AROS.slideAx, 0, AROS.slideW, ph, surf(z) - 0.5)
  // ── 2. patamar com o bloco de gelo que desliza ──
  k.box(0, 64, 7, 4, 2, 1, 2, 0, 2.2, Y1)
  k.pusher(0, 64.5, 1.4, 1.4, 2.0, 4.8, 0, 1.1, 0, Y1)
  // ── 3. a segunda descida: aro, cogumelo de neve até o aro alto, aro que vai e volta ──
  ice(68, 112, Y1, DECK, 3)
  k.post(-3, 86.5, 1.1, surf(86.5) - 0.6, surf(86.5) + 0.15, 2, 12.5)
  k.post(3.2, 83, 0.75, surf(83) - 0.5, surf(83) + 1.9, 3)
  for (const [x, z, dy, mx, w, ph] of AROS.hoops) k.hoop(x, z, surf(z) + dy, 1.45, mx, w, ph)
  for (const [x, z, ph] of AROS.icicles) k.swing(x, z, surf(z) + 8.6, 7.2, 1.1, 1.05, 2.3, ph)
  // ── 4. o paredão de janelas: parede com janelas de parapeito baixo, um aro em cada janela ──
  k.box(0, 116.5, 7.5, 4.5, 2, 1, 4, 0, 1.6)
  k.box(0, 136.5, 8, 15.5, 2, 1, 4, 0, 1.6)
  for (const [z, wins] of AROS.walls) {
    const W = 1.2
    const xs = [-8, ...wins.flatMap((x) => [x - W, x + W]), 8]
    for (let i = 0; i < xs.length; i += 2) {
      const a = xs[i]
      const b = xs[i + 1]
      if (b - a > 0.05) k.box((a + b) / 2, z, (b - a) / 2, 0.45, 5, 1, 4, 0, 4.5, DECK + 4.5)
    }
    for (const x of wins) {
      k.box(x, z, W, 0.45, 5, 1, 4, 0, 1, DECK + 1)
      // a verga: a janela é janela (de 1 a 3,6 m), não um entalhe até o topo
      k.box(x, z, W, 0.45, 5, 1, 4, 0, 0.9, DECK + 4.5)
      k.hoop(x, z, DECK + 2.25, 1.15)
    }
  }
  // a subida das pedras (a rampa das bolas é a dela, não a das descidas)
  k.ramp = null
  const z0 = 152
  const finishZ = kitFinish(k, z0, AROS.balls.every, AROS.balls.v, AROS.balls.R)
  for (const [x, z, y] of [[0, 64, Y1], [0, 116.5, DECK]] as [number, number, number][]) k.logo(x, z, y)
  return k.done({
    id: "aros",
    checkpoints: [
      { x: 0, z: -3.5, y: Y0, w: 7 },
      { x: 0, z: 64, y: Y1, w: 5 },
      { x: 0, z: 116.5, y: DECK, w: 5 },
      { x: 0, z: 134, y: DECK, w: 5 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [15.1, 60, 68, 121, z0],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        add(0, 10)
        add(0, 14)
        // pelos aros (a semente decide se o robô vai buscar o aro alto do cogumelo)
        const high = r(2) < 0.6
        for (const [x, z] of AROS.hoops) {
          if (z === 91 && !high) {
            add(0, 84)
            add(0, 92)
            continue
          }
          if (z === 91) add(-3, 84.5)
          add(x, z - 3.5)
          add(x, z + 1)
        }
        add(0, 114)
        // uma janela de cada paredão (pela semente)
        for (const [z, wins] of AROS.walls) {
          const x = wins[Math.floor(r(3 + z) * wins.length)]
          add(x, z - 3)
          add(x, z + 1.2)
        }
        add(0, 142)
        routeFinish(add, z0, finishZ)
      }),
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
  // 20/11 (dificuldade; o `tempo` das corridas não vale na arena): chão 0,16 → 0,22; barras aceleram mais e vão
  // mais longe (baixa 0,02/2,5 → 0,026/2,9; alta 0,014/1,7 → 0,02/2,1)
  k.pads[floor].spin = 0.22
  k.post(0, 0, 1.1, DECK, DECK + 3.2, 4)
  // barra baixa (pular): dois braços
  k.sweep(0, 0, DECK + 0.55, 11.6, 0.36, 0.85, 0, true, 0.026, 2.9)
  // barra alta (mergulhar): um braço, ao contrário, na altura do peito
  k.sweep(0, 0, DECK + 1.4, 11.6, 0.3, -0.6, Math.PI / 2, false, 0.02, 2.1)
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

// ═══ altoforno — Esteira do Alto-Forno (2ª fase da Forja) ═════════════════════

/**
 * 20/11 (pedido do Alex, 3º vídeo de referência: tipo de prova "esteira subindo contra você com o canhão no
 * alto atirando coisas que quicam"): na Forja de Kragor, a esteira de ferro sobe 80 m até a boca do
 * alto-forno e PUXA PARA TRÁS; lá de cima o canhão cospe bolas de ferro em brasa que descem QUICANDO e indo
 * de lado (no alto do quique dá para passar por baixo). Bigornas nas bordas, o patamar com a barra de fogo
 * que gira e a esteira curta até a chegada.
 */
/** m/s de lado que a bola pode pegar a cada quique (20/11) */
export const ALTOFORNO_BOUNCE = 2.6

export const ALTOFORNO = {
  z0: 40,
  z1: 120,
  rise: 10,
  hx: 7,
  belt: -4.4,
  lanes: [-4.8, -2.4, 0, 2.4, 4.8],
} as const

function courseAltoForno(): Course {
  const K = ALTOFORNO
  const k = new CourseKit()
  kitStart(k)
  // ── 1. o pátio da fundição: aquecimento com duas barras de fogo baixas ──
  k.box(0, 27.5, 8, 12.4, 6, 7, 1)
  k.sweep(0, 28, DECK + 0.5, 7, 0.35, 1.4, 0, true)
  // ── 2–3. a esteira grande (a 1ª rampa: é ela que tem as bolas) ──
  const ramp = k.slope(0, K.z0, K.z1, DECK, DECK + K.rise, K.hx, 6, 7, 2)
  k.pads[ramp].bz = K.belt
  // bigornas nas bordas (para quem foge da bola pelo canto: um tranco)
  for (let z = K.z0 + 8; z < K.z1 - 4; z += 12) {
    for (const s of [-1, 1]) {
      const zz = z + (s > 0 ? 6 : 0)
      const y = DECK + (K.rise * (zz - K.z0)) / (K.z1 - K.z0)
      k.post(s * (K.hx - 0.7), zz, 0.6, y, y + 1.3, 3)
    }
  }
  // 20/11: bola em toda esteira (as das voltas repetidas e a curta do fim, caindo do alto) e rumo novo a cada quique
  k.balls = { lanes: K.lanes, every: 0.95, v: 9, R: 1.25, zEnd: K.z0 - 2.2, hop: 1.7, hopT: 0.62, all: true, bounce: ALTOFORNO_BOUNCE, allEvery: 1.8 }
  // ── 4. o patamar do alto-forno: a barra de fogo que gira ──
  const top = DECK + K.rise
  k.box(0, 127.5, 8, 7.5, 6, 7, 4, 0, 1.4, top)
  k.sweep(0, 127.5, top + 0.6, 7.6, 0.4, 1.7, 0, true)
  // ── 5. esteira curta até a chegada e o patamar ──
  const z2 = 135
  const z3 = 163
  const fin = k.slope(0, z2, z3, top, top + 4, 6, 6, 7, 5)
  k.pads[fin].bz = K.belt * 0.6
  k.box(0, z3 + 7.8, 9, 7.8, 1, 0, 6, 0, 1.6, top + 4)
  for (const [x, z, y] of [[0, 20, DECK], [-4.4, 60, DECK + 2.5], [4.4, 90, DECK + 6.25], [0, 145, top + 1.4]] as [number, number, number][]) k.logo(x, z, y)
  const finishZ = z3 + 8.8
  return k.done({
    id: "altoforno",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 36, y: DECK, w: 6 },
      { x: 0, z: 123, y: top, w: 6 },
      { x: 0, z: 133, y: top, w: 6 },
    ],
    finishZ,
    finishY: top + 4,
    sections: [15.1, K.z0, 80, K.z1, z2],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.6, 16)
        add(side * 4.5, 24)
        add(side * 4.5, 32)
        for (let z = K.z0 + 1; z <= K.z1; z += 2.5) add(0, z)
        add(0, 124)
        add(0, 131)
        for (let z = z2 + 1; z <= z3; z += 2.5) add(0, z)
        add(0, finishZ - 2)
        add(0, finishZ + 3)
      }),
  })
}

// ═══ fabrica — Fábrica ═══════════════════════════════════════════════════════

/**
 * 20/11 (pedido do Alex): "pegou 10 o centro vira um pula-pula e te manda pra uma fase parecida em cima com mais
 * obstáculos, aí coleta 10 e vai subindo; 2 sempre ficam para trás, os dois últimos estão fora". Andares em escada
 * (cada um `D` m à frente e `H` m acima), três de engrenagens e o topo; cada andar pede mais `goal`.
 */
export const FABRICA = {
  D: 30,
  H: 8,
  goal: 10,
  gearFloors: 3,
  /** pulo do pula-pula: sobe ~11 m e cai ~6 m dentro do andar de cima */
  vy: 25.7,
  vz: 17.5,
  r: 2.6,
} as const

function courseFabrica(): Course {
  const K = FABRICA
  const k = new CourseKit()
  const floors: { x: number; z: number; y: number; r: number; goal: number; pad: number; vy: number; vz: number }[] = []
  let n = 0
  for (let f = 0; f <= K.gearFloors; f++) {
    const z = f * K.D
    const y = DECK + f * K.H
    if (f === K.gearFloors) {
      // o topo: o pódio de quem subiu tudo
      const top = k.box(0, z, 8, 8, 2, 1, 1, 0, 1.6, y)
      floors.push({ x: 0, z, y, r: 0, goal: 1e9, pad: top, vy: 0, vz: 0 })
      break
    }
    k.box(0, z, 12, 12, 2, 1, 1, 0, 1.6, y)
    // esteiras (um tico acima do chão para valerem): a da esquerda leva para a frente, a da direita para trás; mais
    // fortes a cada andar
    const bf = 1 + f * 0.2
    const beltL = k.box(-8, z, 1.6, 12, 0, 1, 1, 0, 1.6, y + 0.05)
    k.pads[beltL].bz = GINCANA.belt * bf
    const beltR = k.box(8, z, 1.6, 12, 0, 1, 1, 0, 1.6, y + 0.05)
    k.pads[beltR].bz = -GINCANA.belt * bf
    // o miolo: plataforma do meio (a dourada fica nela) — o pula-pula de quem tem as engrenagens do andar
    const pad = k.disc(0, z, K.r, 4, 1, 1, y + 1)
    floors.push({ x: 0, z, y, r: K.r, goal: K.goal * (f + 1), pad, vy: K.vy, vz: K.vz })
    // prensas que deslizam de lado (mais rápidas em cima)
    const pw = 0.85 * (1 + f * 0.25)
    k.pusher(0, z + 7, 1.3, 1.3, 1.8, 8.5, 0, pw, 0, y)
    k.pusher(0, z - 7, 1.3, 1.3, 1.8, 8.5, 0, pw, Math.PI, y)
    // 2º andar em diante: barra baixa girando em volta do miolo (pule) — no 3º, mais rápida e com martelos
    if (f >= 1) k.sweep(0, z, y + 0.55, 7.2, 0.35, f === 1 ? 1.1 : -1.5, 0, true)
    if (f >= 2) {
      k.swing(-4.5, z + 4.5, y + 8, 6.6, 0.9, 0.9, 1.9, 0)
      k.swing(4.5, z - 4.5, y + 8, 6.6, 0.9, 0.9, 1.9, 1.6)
      k.glove(-12.6, z + 2.5, y + 1, 1, 5.5, 1.0, 2.4, 0)
      k.glove(12.6, z - 2.5, y + 1, -1, 5.5, 1.0, 2.4, 1.2)
    }
    // engrenagens: anel no chão, as dos cantos, as das esteiras e a dourada no miolo
    const add = (x: number, zz: number, yy: number, v: number, back: number) => k.gem(x, zz, yy + 0.9, v, 1 + (n++ % 6) * 0.6, back)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      add(Math.sin(a) * 5, z + Math.cos(a) * 5, y, 1, 7)
    }
    for (const [x, dz] of [[-4, 9.5], [4, -9.5], [-4, -9.5], [4, 9.5]] as [number, number][]) add(x, z + dz, y, 1, 7)
    for (const dz of [-8, 0, 8]) {
      add(-8, z + dz, y + 0.05, 1, 7)
      add(8, z + dz, y + 0.05, 1, 7)
    }
    add(0, z, y + 1, 3, 12)
  }
  return k.done({
    id: "fabrica",
    mode: "collect",
    // 8 na largada: 6 sobem do 1º andar, 4 do 2º, 2 do 3º (classificam)
    qualify: 0.25,
    limit: 240,
    floors,
    checkpoints: floors.map((f, i) => ({ x: 0, z: i === 0 ? -3.6 : f.z - 8, y: f.y, w: 5 })),
    finishZ: 1e6,
    finishY: 1e6,
    sections: [],
    minFinish: 1e6,
    route: () => [{ x: 0, z: 0 }],
  })
}

// ═══ comportas — Comportas da Usina (2ª fase da Fábrica) ═════════════════════

/**
 * 20/11 (pedido do Alex: fases novas pelos vídeos de referência; tipo de prova "portões que sobem e
 * descem"): corrida na usina da Fábrica. Fileiras de COMPORTAS de aço saem do chão e voltam pelo relógio
 * (gateLift); entre elas, paredes fixas listradas. Embaixo a comporta é chão; em cima é parede de 3,5 m (e
 * quem estava no tampo sobe junto). Trechos: comportas em onda → comportas baixas (pule) e fundas →
 * funil com muretas → GRAXA (corre na metade) com comportas lentas → a fileira rápida e a subida.
 */
export const COMPORTAS = {
  /** Centros das 5 comportas e das paredes entre elas (fileira larga, deck de 22 m). */
  gx: [-8.4, -4.2, 0, 4.2, 8.4],
  wall: [[-10.4, 0.6], [-6.3, 0.5], [-2.1, 0.5], [2.1, 0.5], [6.3, 0.5], [10.4, 0.6]] as [number, number][],
  /** Fileira estreita (funil, deck de 14 m). */
  gx3: [-4.2, 0, 4.2],
  wall3: [[-6.3, 0.7], [-2.1, 0.5], [2.1, 0.5], [6.3, 0.7]] as [number, number][],
  gateHx: 1.6,
  gateH: 3.5,
  lowH: 1.0,
  wallH: 3.2,
  /** Graxa: fração da corrida. */
  grease: 0.5,
  /**
   * 20/11 (o Alex: "têm que demorar mais pra abrir, não pode ficar abrindo e fechando rápido, senão não atrasa
   * ninguém — no mínimo 5× mais lento"): o ciclo e o atraso de TODAS as comportas × `slow` (a onda da fileira
   * continua a mesma, só mais lenta). Antes ×1: ciclos de 2,6–5 s.
   */
  slow: 5,
} as const

function courseComportas(): Course {
  const K = COMPORTAS
  const k = new CourseKit()
  kitStart(k)
  const row = (z: number, hz: number, xs: readonly number[], walls: readonly [number, number][], per: number, ph: (i: number) => number, s: number, h: (i: number) => number = () => K.gateH) => {
    xs.forEach((x, i) => k.gate(x, z, K.gateHx, hz, h(i), per * K.slow, ph(i) * K.slow, 6, 7, s))
    for (const [x, hx] of walls) k.box(x, z, hx, hz + 0.15, 4, 1, s, 0, K.wallH + 1.4, DECK + K.wallH)
  }
  // ── 1. comportas em onda ──
  k.box(0, 40, 11, 24.9, 3, 1, 1)
  row(26, 1.4, K.gx, K.wall, 4, (i) => i * 0.8, 1)
  row(40, 1.4, K.gx, K.wall, 4, (i) => (4 - i) * 0.8, 1)
  row(54, 1.4, K.gx, K.wall, 3.6, (i) => (i % 2) * 1.8, 1)
  for (const [x, z] of [[-9.4, 33], [9.4, 33], [-9.4, 47], [9.4, 47]] as [number, number][]) k.post(x, z, 0.8, DECK, DECK + 2.2, 2)
  // 20/11 (dificuldade): martelo no 1º vão e barra baixa girando no 2º (pule)
  k.swing(0, 33, DECK + 8, 6.6, 1.0, 1.05, 2.0, 0.3)
  k.sweep(0, 47, DECK + 0.55, 4.6, 0.32, -0.72, Math.PI / 2, true)
  // ── 2. comportas baixas (pule) e fundas ──
  k.box(0, 85, 11, 20.2, 3, 1, 2)
  row(72, 1.4, K.gx, K.wall, 3.2, (i) => i * 0.64, 2, (i) => (i % 2 ? K.lowH : K.gateH))
  row(84, 1.4, K.gx, K.wall, 3, (i) => (i % 2) * 1.5, 2)
  row(96, 2.4, K.gx, K.wall, 4.4, (i) => [0, 2.2, 1.1, 3.3, 0.5][i], 2)
  for (const [x, z] of [[-9.4, 78], [9.4, 78], [-9.4, 90], [9.4, 90]] as [number, number][]) k.post(x, z, 0.8, DECK, DECK + 2.2, 2)
  // 20/11 (dificuldade): martelos do guindaste em pêndulo entre as fileiras (jogam para a beira)
  k.swing(-3.6, 78, DECK + 8, 6.6, 1.0, 1.0, 2.0, 0)
  k.swing(3.6, 78, DECK + 8, 6.6, 1.0, 1.0, 2.0, Math.PI)
  k.swing(-2.4, 90, DECK + 8, 6.6, 1.05, 1.1, 2.1, 0.8)
  k.swing(2.4, 90, DECK + 8, 6.6, 1.05, 1.1, 2.1, 0.8 + Math.PI)

  // ── 3. funil com muretas e a fileira estreita ──
  k.box(0, 120, 7, 15.1, 3, 1, 3)
  k.box(-2.5, 112, 4.5, 0.45, 2, 1, 3, 0, 1.0 + 1.4, DECK + 1.0)
  k.box(2.5, 119, 4.5, 0.45, 2, 1, 3, 0, 1.0 + 1.4, DECK + 1.0)
  // 20/11 (dificuldade): no funil, um pistão sai da mureta e soca para fora (cai do deck)
  k.glove(-6.4, 110.6, DECK + 1, 1, 11.4, 1.1, 2.0, 0)
  k.glove(6.4, 118.2, DECK + 1, -1, 11.4, 1.1, 2.0, 1.1)
  row(128, 1.4, K.gx3, K.wall3, 2.8, (i) => i * 0.93, 3)
  // ── 4. graxa com comportas lentas ──
  const g = k.box(0, 150, 11, 15, 4, 1, 4)
  k.pads[g].sl = K.grease
  row(150, 1.4, K.gx, K.wall, 5, (i) => i, 4)
  // 20/11 (dificuldade): na graxa, martelos em pêndulo (no escorregadio é difícil fugir)
  k.swing(-3.2, 142, DECK + 8, 6.6, 1.0, 1.05, 2.0, 0)
  k.swing(3.2, 142, DECK + 8, 6.6, 1.0, 1.05, 2.0, Math.PI)

  for (const [x, z] of [[-3, 158], [3, 158]] as [number, number][]) k.post(x, z, 0.8, DECK, DECK + 2.2, 2)

  // ── 5. a fileira rápida e a subida ──
  k.box(0, 172, 11, 7, 3, 1, 5)
  row(172, 1.4, K.gx, K.wall, 2.6, (i) => i * 0.52, 5)
  // 20/11 (dificuldade): martelos antes da fileira rápida
  k.swing(-2.8, 167.4, DECK + 8, 6.6, 1.0, 1.0, 2.2, 0.4)
  k.swing(2.8, 167.4, DECK + 8, 6.6, 1.0, 1.0, 2.2, 0.4 + Math.PI)

  const z0 = 179
  k.slope(0, z0, z0 + 14, DECK, DECK + 3, 8, 0, 1, 5)
  k.box(0, z0 + 14 + 7.8, 9, 7.8, 1, 0, 6, 0, 1.6, DECK + 3)
  const finishZ = z0 + 14 + 8.8
  for (const [x, z] of [[0, 67], [-4, 107], [4, 107], [0, 166]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "comportas",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 67, y: DECK, w: 7 },
      { x: 0, z: 107.5, y: DECK, w: 6 },
      { x: 0, z: 137.5, y: DECK, w: 7 },
      { x: 0, z: 167, y: DECK, w: 7 },
    ],
    finishZ,
    finishY: DECK + 3,
    sections: [15.1, 64.9, 105.1, 135, 165],
    minFinish: 20,
    // a rota só segue o meio: a escolha da comporta é do computador (bots.ts gateAim), na hora
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        for (let z = 18; z <= 104; z += 2) add(0, z)
        add(4.6, 109)
        add(4.6, 113.5)
        add(0, 115.8)
        add(-4.6, 117.5)
        add(-4.6, 120.5)
        add(0, 123)
        for (let z = 125; z <= 177; z += 2) add(0, z)
        for (let z = z0 + 1; z <= z0 + 13; z += 2.5) add(0, z)
        add(0, finishZ - 7)
        add(0, finishZ - 2)
        add(0, finishZ + 3)
      }),
  })
}

// ═══ tanque — Tanque de Óleo (3ª fase da Fábrica) ═══════════════════════════

/**
 * 20/11 (pedido do Alex, 10º vídeo de referência: tipo de prova "subida em zigue-zague com o líquido subindo"):
 * dentro do tanque da Fábrica o óleo SOBE e quem ele alcança está FORA. Quatro rampas de aço que trocam de
 * lado (esquerda, direita, esquerda, meio), ligadas por patamares que se cruzam de lado a lado. Em cada trecho
 * um perigo da Fábrica: barris rolando na 1ª rampa, prensas que deslizam de lado na 2ª, os ganchos do
 * guindaste que balançam no 2º patamar, os pistões que socam da parede na 3ª rampa (jogam no óleo), as
 * prensas do 3º patamar e os ganchos da rampa do meio até a chegada no alto do tanque.
 * Diferente da Maré do Pântano: o caminho vai e volta (zigue-zague), o perigo é empurrar de lado.
 */
export const TANQUE = {
  /** x das rampas (trocam de lado; a última no meio) */
  rx: [-4.2, 4.2, -4.2, 4.2, -4.2, 4.2, 0] as const,
  rhx: 3.1,
  /** z de cada rampa [início, fim] */
  rz: [
    [15, 39],
    [48, 72],
    [81, 105],
    [114, 138],
    [147, 171],
    [180, 204],
    [213, 231],
  ] as [number, number][],
  /** altura de cada andar acima do DECK */
  dy: [0, 5, 10, 15, 20, 25, 30, 35] as const,
  /** z das prensas da 2ª e da 5ª rampa e fases */
  press2: [[54, 0], [60, 1.6], [66, 3.2]] as [number, number][],
  press5: [[153, 0.4], [160, 2.2], [167, 1.0]] as [number, number][],
  /** z dos pistões da 3ª, 4ª e 6ª rampa (socam da parede de fora) */
  punch3: [[87, 0], [93, 0.8], [99, 1.6]] as [number, number][],
  punch4: [[119, 0.3], [124, 1.1], [129, 1.9], [134, 0.7]] as [number, number][],
  punch6: [[185, 0], [189.5, 0.6], [194, 1.2], [198.5, 1.8]] as [number, number][],
  /** Óleo derramado: a corrida fica nesta fração e o pé escorrega (atrito). */
  oilRun: 0.55,
  oilGrip: 0.3,
  /**
   * 20/11 (pedido do Alex: "esses propulsores na parede precisam ter um curso maior e chegar ao outro lado"):
   * o pistão da rampa vai até a borda de lá (sobra só a beirada); os do patamar largo seguem até o meio.
   */
  pistonReach: 2 * 3.1 + 1.6 - 1.0 - 0.15,
} as const

function courseTanque(): Course {
  const K = TANQUE
  const k = new CourseKit()
  kitStart(k)
  const Y = K.dy.map((d) => DECK + d)
  const yAt = (i: number, z: number) => Y[i] + ((z - K.rz[i][0]) / (K.rz[i][1] - K.rz[i][0])) * (Y[i + 1] - Y[i])
  const ramp = (i: number, s: number, hx: number = K.rhx) => k.slope(K.rx[i], K.rz[i][0], K.rz[i][1], Y[i], Y[i + 1], hx, 3, 1, s)
  const land = (i: number, s: number) => {
    const z0 = K.rz[i][1]
    const z1 = K.rz[i + 1][0]
    return k.box(0, (z0 + z1) / 2, 8.4, (z1 - z0) / 2, 5, 1, s, 0, 1.4, Y[i + 1])
  }
  const greasy = (p: number) => Object.assign(k.pads[p], { sl: K.oilRun, f: K.oilGrip })
  // poça de óleo na rampa i, de z0 a z1, faixa (x relativo à rampa, meia largura): uma rampa fina por cima
  const oilRamp = (i: number, z0: number, z1: number, dx: number, hx: number, s: number) =>
    greasy(k.slope(K.rx[i] + dx, z0, z1, yAt(i, z0) + 0.03, yAt(i, z1) + 0.03, hx, 3, 1, s))
  // poça no patamar i (que fica depois da rampa i)
  const oilLand = (i: number, x: number, z: number, hx: number, hz: number, s: number) => greasy(k.box(x, z, hx, hz, 5, 1, s, 0, 0.3, Y[i + 1] + 0.15)) // acima das barras da grade
  const pistons = (i: number, list: readonly (readonly [number, number])[], reach: number, per: number) => {
    const out = K.rx[i] < 0 ? -1 : 1
    for (const [z, ph] of list) k.glove(K.rx[i] + out * (K.rhx + 1.6), z, yAt(i, z) + 1, -out, reach, 1.0, per, ph)
  }
  // ── 1. rampa dos barris (esquerda) ──
  ramp(0, 1)
  k.balls = { lanes: [-1.5, 1.5], every: 1.5, v: 6, R: 1.0, zEnd: 12 }
  land(0, 1)
  k.glove(9.4, 41.5, Y[1] + 1, -1, 7.5, 1.0, 2.6, 0)
  k.glove(9.4, 45.5, Y[1] + 1, -1, 7.5, 1.0, 2.6, 1.3)
  // ── 2. rampa das prensas (direita) ──
  ramp(1, 2)
  for (const [z, ph] of K.press2) k.pusher(K.rx[1], z, 1.1, 1.1, 1.8, 2.1, 0, 1.25, ph, yAt(1, z))
  oilRamp(1, 50, 56, -1.4, 1.5, 2)
  land(1, 2)
  k.swing(-2.5, 75, Y[2] + 8, 6.6, 0.9, 0.9, 1.9, 0)
  k.swing(2.5, 78.5, Y[2] + 8, 6.6, 0.9, 0.9, 1.9, 1.6)
  // ── 3. rampa dos pistões (esquerda) ──
  ramp(2, 3)
  pistons(2, K.punch3, K.pistonReach, 3.0)
  oilRamp(2, 90, 100, 1.5, 1.4, 3)
  land(2, 3)
  k.pusher(-2.6, 108, 1.2, 1.2, 1.8, 3.6, 0, 1.0, 0, Y[3])
  k.pusher(2.6, 111.5, 1.2, 1.2, 1.8, 3.6, 0, 1.0, 2.2, Y[3])
  // ── 4. vazamento: daqui para cima o óleo escorre pelas rampas ──
  // 4ª rampa (direita): óleo em quase tudo + pistões da parede de fora
  ramp(3, 4)
  oilRamp(3, 115, 137, 0, K.rhx - 0.25, 4)
  pistons(3, K.punch4, K.pistonReach, 2.8)
  land(3, 4)
  oilLand(3, -3.5, 145.6, 4, 1.3, 4)
  k.swing(-2.8, 141, Y[4] + 8, 6.6, 0.9, 0.95, 2.0, 0.5)
  k.swing(2.8, 144, Y[4] + 8, 6.6, 0.9, 0.95, 2.0, 2.1)
  // 5ª rampa (esquerda): prensas em fila + poças alternadas
  ramp(4, 4)
  for (const [z, ph] of K.press5) k.pusher(K.rx[4], z, 1.1, 1.0, 1.8, 2.1, 0, 1.15, ph, yAt(4, z))
  oilRamp(4, 155, 158, 1.3, 1.6, 4)
  oilRamp(4, 162, 165, -1.3, 1.6, 4)
  land(4, 4)
  oilLand(4, 3.8, 178.6, 4.2, 1.3, 4)
  k.pusher(-2.6, 174, 1.2, 1.2, 1.8, 3.6, 0, 1.15, 1.0, Y[5])
  k.pusher(2.6, 177.2, 1.2, 1.2, 1.8, 3.6, 0, 1.15, 3.0, Y[5])
  // 6ª rampa (direita): a mais estreita, óleo inteiro e os pistões em sequência
  ramp(5, 4, 2.7)
  oilRamp(5, 181, 203, 0, 2.45, 4)
  pistons(5, K.punch6, K.pistonReach, 2.6)
  land(5, 4)
  k.swing(-2.5, 207, Y[6] + 8, 6.6, 0.9, 1.0, 2.1, 0)
  k.swing(2.5, 210, Y[6] + 8, 6.6, 0.9, 1.0, 2.1, 1.7)
  // ── 5. rampa do meio com os ganchos e a chegada no alto ──
  ramp(6, 5, 4.5)
  k.swing(-1.6, 217, yAt(6, 217) + 8, 6.6, 0.9, 0.9, 1.8, 0.4)
  k.swing(1.6, 222, yAt(6, 222) + 8, 6.6, 0.9, 0.9, 1.8, 2.0)
  k.swing(0, 227, yAt(6, 227) + 8, 6.6, 0.9, 0.95, 1.9, 1.1)
  k.box(0, 238.8, 9, 7.8, 1, 0, 6, 0, 1.6, Y[7])
  const finishZ = 239.8
  const L = (i: number) => (K.rz[i][1] + K.rz[i + 1][0]) / 2
  for (const i of [0, 1, 2, 3, 4]) k.logo(0, L(i), Y[i + 1])
  return k.done({
    id: "tanque",
    mode: "race",
    limit: 170, // 20/11: pistões de curso longo
    // 3 s de folga; o óleo afoga a largada aos ~11 s e passa do topo perto do fim
    rise: { y0: 0, y1: Y[7] + 2, t0: 3, t1: 136 }, // 20/11: +24 s pelos pistões que atravessam a rampa
    checkpoints: [{ x: 0, z: -3.5, y: DECK, w: 7 }, ...[0, 1, 2, 3, 4, 5].map((i) => ({ x: 0, z: L(i), y: Y[i + 1], w: 6 }))],
    finishZ,
    finishY: Y[7],
    sections: [15, 48, 81, 114, 213],
    minFinish: 34,
    route: (r) =>
      routeOf((add) => {
        const l0 = r(1) < 0.5 ? -1.4 : 1.4
        add(K.rx[0] * 0.5, 9)
        add(K.rx[0], 13.5)
        for (let z = 16; z <= 38; z += 2) add(K.rx[0] + l0, z)
        for (let i = 0; i < 6; i++) {
          const z0 = K.rz[i][1]
          const z1 = K.rz[i + 1][0]
          const nx = K.rx[i + 1]
          add(K.rx[i], z0 + 1.5)
          add(0, (z0 + z1) / 2)
          add(nx, z1 - 1.5)
          // nas rampas com pistões, por dentro (longe da parede de fora)
          const inner = i + 1 === 2 || i + 1 === 3 || i + 1 === 5 ? -Math.sign(nx) * 1.2 : 0
          for (let z = z1 + 1; z <= K.rz[i + 1][1] - 1; z += 2) add(nx + inner, z)
        }
        add(0, finishZ - 7)
        add(0, finishZ - 2)
        add(0, finishZ + 3)
      }),
  })
}

// ═══ portoes — Portões de Gelo (2ª fase do Mar de Gelo) ══════════════════════

/**
 * 20/11 (pedido do Alex, 2º vídeo de referência: tipo de prova "portas falsas que estreitam"): corrida no Mar de
 * Gelo. Nove fileiras de portas de gelo, cada vez mais estreitas e com menos portas de verdade (a falsa é parede;
 * a de verdade estilhaça quando alguém encosta), chão de GELO nos trechos 2 e 4 (escorrega: frear antes da
 * porta), blocos de gelo que deslizam de lado, estalactites que balançam e a subida com bolas de neve.
 * Diferente das Portas da Prefeitura: largura e número mudam por fileira (8 → 2), gelo e blocos.
 */
export const PORTOES = {
  /** [z, portas, abertas, meia largura do deck] por fileira */
  rows: [
    // 20/11: uma de verdade por fileira (antes 4, 3, 2, 2, 2) — e ela aguenta PORTOES.hits batidas
    [22, 8, 1, 12],
    [34, 7, 1, 12],
    [46, 6, 1, 12],
    [60, 6, 1, 9],
    [74, 5, 1, 9],
    [95, 4, 1, 6.5],
    [105, 4, 1, 6.5],
    [118, 3, 1, 5],
    [131, 2, 1, 5],
  ] as [number, number, number, number][],
  doorH: 3.4,
  /** batidas para quebrar a de verdade (20/11) */
  hits: 3,
  /** 20/11 (dificuldade): mais escorregadio (antes 0,5) */
  ice: 0.4,
  /** blocos do lago: [z, giro, fase] (antes 2 blocos, 1,0 e 1,3) */
  blocks: [[66, 1.3, 0], [74.5, 1.5, 2.2], [82, 1.6, 1.6]] as [number, number, number][],
  /** estalactites do corredor: [z, fase] (antes 2, R 1,1) */
  icicles: [[122.5, 0], [126.5, 2.4], [135, 1.2]] as [number, number][],
  icicleR: 1.25,
  snow: { every: 0.8, v: 8, R: 1.3 },
} as const

function coursePortoes(): Course {
  const K = PORTOES
  const k = new CourseKit()
  kitStart(k)
  // ── 1. o pátio largo: 3 fileiras ──
  k.box(0, 35, 12, 19.9, 6, 7, 1)
  // ── 2. o lago congelado (escorrega) com blocos de gelo que deslizam ──
  const ice2 = k.box(0, 72, 9, 17.1, 3, 7, 2)
  k.pads[ice2].f = K.ice
  for (const [z, w, ph] of K.blocks) k.pusher(0, z, 1.2, 1.2, 1.8, 6.4, 0, w, ph)
  // ── 3. a ponte de gelo: 2 fileiras de 4 ──
  k.box(0, 100, 6.5, 10.9, 6, 7, 3)
  // ── 4. o corredor (escorrega) com as estalactites ──
  const z0 = 138
  const ice4 = k.box(0, (110.9 + z0) / 2, 5, (z0 - 110.9) / 2, 3, 7, 4)
  k.pads[ice4].f = K.ice
  for (const [z, ph] of K.icicles) k.swing(0, z, DECK + 9, 7.4, K.icicleR, 0.95, 2.1, ph)
  for (const [z, n, open, hx] of K.rows) k.doorRow(0, z, n, (hx * 2) / n, K.doorH, open)
  // ── 5. subida com bolas de neve e a chegada ──
  const finishZ = kitFinish(k, z0, K.snow.every, K.snow.v, K.snow.R)
  for (const [x, z] of [[0, 16.5], [-6, 28], [6, 40], [0, 56.5], [0, 91], [0, 112.5]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "portoes",
    doorHits: PORTOES.hits,
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 57, y: DECK, w: 6 },
      { x: 0, z: 91.5, y: DECK, w: 5 },
      { x: 0, z: 113, y: DECK, w: 4 },
      { x: 0, z: 136, y: DECK, w: 4 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [15.1, 54.9, 89.1, 110.9, z0],
    minFinish: 20,
    // a rota segue o meio; a porta é escolha do computador (bots.ts pickDoor), na hora
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        for (let z = 18; z <= 135; z += 2.5) add(0, z)
        routeFinish(add, z0, finishZ)
      }),
  })
}

// ═══ estaleiro — Estaleiro do Quebra-Gelo (3ª fase do Mar de Gelo) ═══════════

/**
 * 20/11 (pedido do Alex, 9º vídeo de referência: tipo de prova "ilhas com barras que varrem + hélices gigantes
 * em pé"): no estaleiro preso no Mar de Gelo, as hélices dos quebra-gelos giram DE PÉ, de frente para quem corre
 * (as pás varrem o chão embaixo do cubo; passa-se pelo vão entre elas). Duas banquisas redondas com a barra de
 * proa que varre, o cais estreito com três hélices em fila, o pátio com duas fileiras de hélices lado a lado
 * (escolha o vão e a hora) e a subida para o dique seco com a hélice gigante atravessada.
 * Diferente das Hélices da Orbital (deitadas, você anda em cima) e dos Moinhos (pás rente aos discos): aqui a
 * pá gira num plano em pé e o vão passa pela frente de quem corre.
 */
export const ESTALEIRO = {
  /** cais: z das hélices, nº de pás, giro */
  /** 20/11 (dificuldade): mais rápidas (antes 1,25/1,05/1,5; com 4 pás em todas ninguém passava — 336 pancadas) */
  pier: [[62, 3, 1.35], [70.5, 4, -1.15], [79, 3, 1.6]] as [number, number, number][],
  /** pátio: [x, z, giro] — duas fileiras desencontradas (uma 3ª fileira travou a prova: testado em 20/11) */
  yard: [[-6.2, 95, 1.1], [0, 95, -1.25], [6.2, 95, 1.1], [-3.1, 104, -1.2], [3.1, 104, 1.2]] as [number, number, number][],
  pierL: 4.2,
  yardL: 3.0,
  bigL: 6.2,
  /** giro da hélice gigante (antes 0,85) */
  bigW: 1.0,
  hubY: 0.35,
  /** barras das banquisas: aceleram até wMax (20/11) */
  barAcc: 0.01,
  barMax: 1.7,
} as const

function courseEstaleiro(): Course {
  const K = ESTALEIRO
  const k = new CourseKit()
  kitStart(k)
  // hélice em pé: o cubo fica a L − folga acima do chão (a ponta raspa o piso)
  const rot = (x: number, z: number, floor: number, L: number, n: number, w: number, ph: number) =>
    k.rotor(x, z, floor + L - K.hubY, L, n, 0.42, 0.35, w, ph)
  // ── 1. as banquisas com a barra de proa ──
  k.box(0, 17.5, 2.2, 2.4, 5, 1, 1, 0, 1.2)
  k.disc(0, 28, 8, 5, 1, 1)
  k.post(0, 28, 0.8, DECK, DECK + 2.4, 5)
  k.sweep(0, 28, DECK + 0.55, 8.3, 0.34, 1.05, 0, true, K.barAcc, K.barMax)
  k.box(0, 38.5, 2.2, 2.6, 5, 1, 1, 0, 1.2)
  k.disc(0, 49, 8, 5, 1, 1)
  k.post(0, 49, 0.8, DECK, DECK + 2.4, 5)
  k.sweep(0, 49, DECK + 0.55, 8.3, 0.34, -1.3, 1.4, false, K.barAcc, K.barMax)
  // ── 2. o cais com três hélices em fila ──
  k.box(0, 70.5, 3.3, 13.5, 5, 1, 2)
  K.pier.forEach(([z, n, w], i) => rot(0, z, DECK, K.pierL, n, w, i * 0.7))
  // ── 3. o pátio com duas fileiras lado a lado ──
  k.box(0, 99.5, 9.6, 15.5, 5, 1, 3)
  K.yard.forEach(([x, z, w], i) => rot(x, z, DECK, K.yardL, 3, w, i * 1.1))
  // ── 4. a subida para o dique seco com a hélice gigante atravessada ──
  const z0 = 115
  const z1 = 143
  const Yt = DECK + 6
  k.slope(0, z0, z1, DECK, Yt, 6.6, 5, 1, 4)
  const zb = 131
  rot(0, zb, DECK + ((zb - z0) / (z1 - z0)) * (Yt - DECK), K.bigL, 4, K.bigW, 0.3)
  k.box(0, z1 + 7.8, 9, 7.8, 1, 0, 6, 0, 1.6, Yt)
  const finishZ = z1 + 8.8
  for (const [x, z] of [[0, 17.5], [0, 38.5], [-2, 58.5], [2, 58.5], [0, 86], [0, 111]] as [number, number][]) k.logo(x, z)
  return k.done({
    id: "estaleiro",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 38.5, y: DECK, w: 2 },
      { x: 0, z: 59, y: DECK, w: 3 },
      { x: 0, z: 87, y: DECK, w: 6 },
      { x: 0, z: 111, y: DECK, w: 6 },
    ],
    finishZ,
    finishY: Yt,
    sections: [15.1, 57, 84, z0, z0 + 14],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        for (let z = 10; z <= 58; z += 2) add(0, z)
        // no cais: um pouco para um lado (o vão chega antes perto da ponta da pá)
        const s = r(1) < 0.5 ? -1.4 : 1.4
        for (let z = 60; z <= 82; z += 2) add(s, z)
        add(0, 86)
        // pátio: o vão entre as hélices da 1ª fileira (x ±3,1) e depois o da 2ª (0 ou ±6,2)
        const g1 = r(2) < 0.5 ? -3.1 : 3.1
        add(g1, 91)
        add(g1, 97)
        const g2 = r(3) < 0.4 ? 0 : g1 < 0 ? -6.2 : 6.2
        add(g2, 101)
        add(g2, 107)
        add(0, 112)
        for (let z = z0 + 1; z <= z1 - 1; z += 2.5) add(r(4) < 0.5 ? -2.5 : 2.5, z)
        add(0, finishZ - 7)
        add(0, finishZ - 2)
        add(0, finishZ + 3)
      }),
  })
}

// ═══ gelo — Mar de Gelo ══════════════════════════════════════════════════════

/**
 * 20/11 (pedido do Alex com a foto do rolo: "tem que andar sobre a fase, ir percorrendo o percurso nesses tubos e
 * com armadilhas entre eles, pulando de tubo em tubo, pelo menos uns 20 tubos, e chegar ao fim"): o Mar de Gelo
 * deixa de ser a arena do Rolo e vira CORRIDA sobre 20 TUBOS DE GELO deitados ao longo do caminho. Cada tubo gira
 * no seu sentido (o chão anda de lado e a curva escorrega para fora), os da frente mais rápido, e a partir do 5º
 * têm buracos que passam por baixo. Entre eles: vão para pular (o tubo seguinte mais alto ou mais baixo),
 * estalactites em pêndulo por cima dos tubos e pistões de gelo que socam de lado. Banquisa com posto depois do
 * 5º, 10º e 15º. Antes (18/11): arena de sobrevivência num rolo só (R 7, 6 anéis).
 */
export const GELO = {
  n: 20,
  z0: 16.6,
  R: 3.2,
  len: 6.4,
  gap: 2.0,
  /** topo de cada tubo acima do DECK (sobe e desce; subida de no máximo 0,4 m — mais que isso o vão de 2 m não fecha) */
  tops: [0.5, 0.9, 0.5, 0.9, 0.6, 0.8, 0.7, 1.1, 0.8, 1.2, 0.5, 0.9, 1.3, 0.9, 1.3, 0.8, 1.2, 0.9, 1.3, 1.0],
  /** giro (rad/s): sobe do 1º ao último; sinal alternado */
  w0: 0.42,
  wStep: 0.022,
  /** buraco: meia abertura (rad) e a partir de qual tubo. Cada tubo tem 2 metades (anéis) e o buraco fica numa
   *  só (alternando): dá para fugir para a outra metade ou pular por cima (0,24 rad ≈ 1,5 m de vão). */
  holeHalf: 0.24,
  holeFrom: 4,
  /** banquisas (descanso + posto) depois destes tubos */
  rests: [5, 10, 15],
  restHz: 2.4,
  /** estalactites em pêndulo por cima destes tubos: [tubo, fase] */
  icicles: [[2, 0], [6, 1.4], [8, 2.6], [12, 0.7], [16, 2], [19, 1.1]] as [number, number][],
  /** pistões de gelo que socam de lado nestes tubos: [tubo, lado, fase] */
  punches: [[9, 1, 0], [13, -1, 1.1], [17, 1, 0.5], [18, -1, 1.7]] as [number, number, number][],
} as const

/** Gelo: z de começo de cada tubo e o centro de cada banquisa; e onde acaba. */
export function geloLayout() {
  const K = GELO
  const tubes: number[] = []
  const rests: number[] = []
  let z = K.z0
  for (let i = 0; i < K.n; i++) {
    if ((K.rests as readonly number[]).includes(i)) {
      rests.push(z + K.restHz)
      z += 2 * K.restHz + K.gap
    }
    tubes.push(z)
    z += K.len + K.gap
  }
  return { tubes, rests, end: z - K.gap }
}

function courseGelo(): Course {
  const K = GELO
  const k = new CourseKit()
  kitStart(k)
  const L = geloLayout()
  L.tubes.forEach((z, i) => {
    const w = (i % 2 ? -1 : 1) * (K.w0 + K.wStep * i)
    const holes = i < K.holeFrom ? [] : [{ a: Math.PI + i * 0.9, half: K.holeHalf }]
    // acc 0: o tubo gira sempre igual (o Rolo acelerava na arena); duas metades, o buraco numa só (alterna)
    const half = (h: boolean) => ({ len: K.len / 2, w, holes: h ? holes : [], acc: 0 })
    k.drum(0, z, DECK + K.tops[i] - K.R, K.R, [half(i % 2 === 0), half(i % 2 === 1)], 0.6)
  })
  for (const z of L.rests) k.box(0, z, 4, K.restHz, 3, 1, 2 + Math.floor((z - K.z0) / 60), 0, 1.4, DECK + 0.6)
  const mid = (i: number) => L.tubes[i] + K.len / 2
  for (const [i, ph] of K.icicles) k.swing(0, mid(i), DECK + K.tops[i] + 8, 7, 1.05, 0.95, 2.0, ph)
  for (const [i, side, ph] of K.punches) k.glove(side * (K.R + 1.6), mid(i), DECK + K.tops[i] + 0.9, -side, 2 * K.R + 0.6, 0.9, 2.6, ph)
  const z0 = L.end + 1.4
  k.box(0, z0 - 0.7, 6, 1.4, 0, 1, 5)
  const finishZ = kitFinish(k, z0 + 0.7, 1.0, 7, 1.1)
  for (const z of L.rests) k.logo(0, z, DECK + 0.6)
  return k.done({
    id: "gelo",
    mode: "race",
    limit: 170,
    checkpoints: [{ x: 0, z: -3.5, y: DECK, w: 7 }, ...L.rests.map((z) => ({ x: 0, z: z + 0.6, y: DECK + 0.6, w: 4 }))],
    finishZ,
    finishY: DECK + 6,
    sections: [15.1, ...L.rests.map((z) => z - K.restHz), z0],
    minFinish: 20,
    route: (r) =>
      routeOf((add) => {
        add(0, 10)
        L.tubes.forEach((z, i) => {
          const x = (r(10 + i) - 0.5) * 1.6
          add(x, z + 0.8)
          add(x, z + K.len - 0.8)
        })
        routeFinish(add, z0 + 0.7, finishZ)
      }),
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

/**
 * Feira Rolante (Gincana 3, G3-12): corrida na feira do Centro. A rampa de entrada é uma ESTEIRA
 * FORTE que desce (5,5 m/s: parado, ela leva você de volta) e as barracas soltam melancias que
 * rolam rampa abaixo; depois, duas esteiras lado a lado em sentidos opostos com prensas que
 * empurram de lado, os martelos (pêndulos), o corredor de esteiras de lado e a subida.
 */
/**
 * Feira do Centro — números da dificuldade (20/11, o Alex: "obstáculos mais resistentes e mais rápidos").
 * Antes: melancias a cada 1,15 s a 6,5 m/s (R 1,15), 3 prensas (1,5/1,9/1,3), martelos R 1,1 amp 0,95,
 * corredor de esteiras de lado sem nada.
 */
export const FEIRA = {
  melons: { every: 0.9, v: 7.5, R: 1.3 },
  /** prensas da esteira de ida: [z, giro] */
  press: [[52, 1.8], [58.5, 2.3], [65, 1.6], [71.5, 2.1]] as [number, number][],
  /** 20/11 (o Alex: "essas barreiras móveis precisam atravessar as duas esteiras"): a prensa vai e volta de uma
   *  beira à outra das DUAS esteiras (centro 0, ±4,4: o bloco de 3,2 m chega a ±6). Antes: só na de ida (−3 ± 3). */
  pressAx: 4.4,
  ham: { R: 1.25, amp: 1.05 },
  /** martelos do meio: [z, fase] */
  hamMid: [[99, 4.8]] as [number, number][],
  /** socos no patamar depois do corredor de esteiras (na esteira, quem espera o soco cai): [x da base, z, fase] */
  punches: [[9.2, 145, 0], [-9.2, 148.5, 1.4]] as [number, number, number][],
  punchReach: 7.4,
  punchPeriod: 2.8,
  /**
   * 20/11 (pedido do Alex, no corredor de esteiras de lado: "mais luvas de boxe, na frente de cada esteira, e cada
   * esteira tem que ser mais forte ainda, e essa plataforma vira uma gangorra sensível… tem que equilibrar").
   * `beltF` = força das esteiras de lado (× GINCANA.belt, antes 1); luva por esteira: alcance e período.
   */
  beltF: 1.2,
  beltPunch: { reach: 6.8, period: 3.0 },
  /** o patamar antes do corredor: balança que tomba de lado (mola fraca = sensível) */
  tilt: { max: 0.3, k: 0.28, slip: 9 },
  /** "bolas caindo e quicando" no chão dos martelos */
  flat: { every: 1.25, v: 6, hop: 1.5, hopT: 0.6, bounce: 2.4 },
} as const

function courseFeira(): Course {
  const k = new CourseKit()
  kitStart(k)
  const Y = DECK + 3
  // ── 1. rampa-esteira com melancias ──
  const r1 = k.slope(0, 15.1, 40, DECK, Y, 6, 0, 1, 1)
  k.pads[r1].bz = -GINCANA.belt * 0.75 // rampa + melancias + esteira: a esteira cheia trava todo mundo
  k.balls = { lanes: [-4.3, -1.45, 1.45, 4.3], every: FEIRA.melons.every, v: FEIRA.melons.v, R: FEIRA.melons.R, zEnd: 12 }
  k.box(0, 44, 7, 4, 6, 7, 1, 0, 1.4, Y)
  // ── 2. esteiras de mão dupla com prensas ──
  const fwd = k.box(-3, 63, 3, 15, 2, 0, 2, 0, 1.4, Y)
  k.pads[fwd].bz = GINCANA.belt
  const back = k.box(3, 63, 3, 15, 3, 0, 2, 0, 1.4, Y)
  k.pads[back].bz = -GINCANA.belt
  FEIRA.press.forEach(([z, w], i) => k.pusher(0, z, 1.6, 0.9, 2.2, FEIRA.pressAx, 0, w, i * 1.3, Y))
  k.box(0, 82, 7, 4, 6, 7, 2, 0, 1.4, Y)
  // ── 3. martelos ── (20/11: com bolas caindo do alto e quicando — balls.flat)
  const hamFloor = k.box(0, 99, 6, 13, 6, 7, 3, 0, 1.4, Y)
  k.pads[hamFloor].bb = 1
  if (k.balls) k.balls.flat = { ...FEIRA.flat }
  const ham = (x: number, z: number, ph: number) => k.swing(x, z, Y + 9, 7.4, FEIRA.ham.R, FEIRA.ham.amp, 2.2, ph)
  ham(-3, 92, 0)
  ham(3, 92, 2.4)
  ham(-3, 99, 1.2)
  ham(3, 99, 3.6)
  ham(-3, 106, 4.4)
  ham(3, 106, 0.6)
  // 20/11: um martelo no meio da fileira do meio (em todas, ninguém passava: 129 pancadas)
  for (const [z, ph] of FEIRA.hamMid) ham(0, z, ph)
  // 20/11: o patamar é uma balança que tomba de lado com o peso — equilibre
  k.saw(0, 115, Y, 7, 3, 1, FEIRA.tilt.max, 0, FEIRA.tilt.k)
  k.saws[k.saws.length - 1].slip = FEIRA.tilt.slip
  // ── 4. corredor de esteiras de lado ── (20/11: mais fortes, e uma luva na frente de cada uma, do lado de onde
  // a esteira vem: o soco joga para o lado em que ela leva)
  for (let i = 0; i < 6; i++) {
    const p = k.box(0, 120 + i * 4, 6, 2, i % 2 ? 4 : 5, 0, 4, 0, 1.4, Y)
    const dir = i % 2 ? -1 : 1
    k.pads[p].bx = dir * GINCANA.belt * FEIRA.beltF
    const x0 = -dir * 7.4
    k.post(x0, 120 + i * 4, 0.45, -1, Y + 1.9, 2)
    k.glove(x0, 120 + i * 4, Y + 1, dir, FEIRA.beltPunch.reach, 1.0, FEIRA.beltPunch.period, i * 0.9)
  }
  k.box(0, 146, 7, 4, 6, 7, 4, 0, 1.4, Y)
  // 20/11: socos de lado no patamar depois do corredor
  for (const [x0, z, ph] of FEIRA.punches) {
    k.post(x0, z, 0.45, -1, Y + 1.9, 2)
    k.glove(x0, z, Y + 1, -Math.sign(x0), FEIRA.punchReach, 1.0, FEIRA.punchPeriod, ph)
  }
  // ── 5. subida e chegada ──
  const z0 = 150
  k.slope(0, z0, z0 + 24, Y, DECK + 6, 6, 0, 1, 5)
  k.box(0, z0 + 24 + 7.8, 9, 7.8, 1, 0, 6, 0, 1.6, DECK + 6)
  const finishZ = z0 + 24 + 8.8
  for (const [x, z] of [[0, 44], [0, 82], [-3, 115], [3, 115], [0, 146]] as [number, number][]) k.logo(x, z, Y)
  return k.done({
    id: "feira",
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 45.5, y: Y, w: 6 },
      { x: 0, z: 83.5, y: Y, w: 6 },
      { x: 0, z: 116.5, y: Y, w: 6 },
      { x: 0, z: 147.5, y: Y, w: 6 },
    ],
    finishZ,
    finishY: DECK + 6,
    sections: [15.1, 48, 86, 118, z0],
    minFinish: 22,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        const F = [-1.45, 1.45, -3, 3][Math.floor(r(2) * 4)]
        for (let z = 18; z <= 39; z += 3) add(F, z)
        add(F * 0.5, 42)
        add(-3, 46)
        for (let z = 50; z <= 76; z += 2) add(-3, z)
        add(-1.5, 79)
        add(0, 83)
        const H = r(3) < 0.5 ? -3 : 3
        for (const z of [87, 90, 94, 97, 101, 104, 108, 111]) add(H, z)
        add(0, 115)
        for (let z = 118.5; z <= 142; z += 1.5) add(0, z)
        add(0, 146)
        for (let z = z0 + 1; z <= z0 + 23; z += 2.5) add(0, z)
        add(0, finishZ - 7)
        add(0, finishZ - 2)
        add(0, finishZ + 3)
      }),
  })
}

/**
 * Coroa da Torre (Gincana 3, G3-13): a FINAL do programa (vaga = 1). Rampa larga com bolas em cinco
 * faixas, martelos, dois portões giratórios (carrosséis de duas barras), a rampa final e a coroa
 * no alto do estrado da torre: só ganha quem PULA e pega a coroa (a linha fica 1,1 m acima do chão).
 */
/**
 * Torre da Coroa — números da dificuldade (20/11, o Alex: "obstáculos mais resistentes e mais rápidos").
 * Antes: martelos R 1,1 amp 0,95; portões a 1,25 e −1,45 rad/s sem aceleração; ponte estreita sem nada.
 */
export const COROA = {
  ham: { R: 1.25, amp: 1.05 },
  gateAcc: 0.01,
  gateMax: 1.9,
  /** barra alta (mergulhar) no 2º portão, ao contrário, um braço */
  highY: 1.45,
  highW: 0.6,
  /** soco da ponte estreita: [x da base, z, fase] */
  punch: [5.6, 104, 0.6] as [number, number, number],
} as const

function courseCoroa(): Course {
  const k = new CourseKit()
  kitStart(k)
  const Y1 = DECK + 5
  const Y2 = DECK + 8
  // ── 1. rampa larga com bolas ──
  k.slope(0, 15.1, 51, DECK, Y1, 8, 0, 1, 1)
  k.balls = { lanes: [-6, -3, 0, 3, 6], every: 0.8, v: 7, R: 1.3, zEnd: 12 }
  k.box(0, 55, 8, 4, 6, 7, 1, 0, 1.4, Y1)
  // ── 2. martelos ──
  k.box(0, 74, 6, 15, 6, 7, 2, 0, 1.4, Y1)
  const ham = (x: number, z: number, ph: number) => k.swing(x, z, Y1 + 9, 7.4, COROA.ham.R, COROA.ham.amp, 2.2, ph)
  ham(-3, 66, 0)
  ham(3, 66, 2.4)
  ham(-3, 74, 1.2)
  ham(3, 74, 3.6)
  ham(-3, 82, 4.4)
  ham(3, 82, 0.6)
  // ── 3. portões giratórios ──
  const gate = (z: number, w: number, a0: number) => {
    k.disc(0, z, 7, 4, 1, 3, Y1)
    k.post(0, z, 0.8, Y1, Y1 + 2.4, 1)
    k.sweep(0, z, Y1 + 0.55, 7.3, 0.32, w, a0, true, COROA.gateAcc, COROA.gateMax)
  }
  gate(96, 1.25, 0)
  k.box(0, 104, 2.4, 1.2, 6, 7, 3, 0, 1.4, Y1)
  {
    const [x0, z, ph] = COROA.punch
    k.post(x0, z, 0.45, -1, Y1 + 1.9, 2)
    k.glove(x0, z, Y1 + 1, -Math.sign(x0), 6.2, 1.0, 2.2, ph)
  }
  gate(112, -1.45, 0.8)
  k.sweep(0, 112, Y1 + COROA.highY, 7.3, 0.3, COROA.highW, 0.8 + Math.PI / 2, false)
  k.box(0, 122, 7, 3, 6, 7, 3, 0, 1.4, Y1)
  // ── 4. ladrilhos que caem (6 × 6) ──
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) k.tile((c - 2.5) * 2.9, 127.6 + r * 2.9, 1.3, (r + c) % 2 === 0 ? 2 : 5, 0, Y1)
  k.box(0, 147.5, 7, 2.5, 6, 7, 4, 0, 1.4, Y1)
  // ── 5. rampa final e o estrado da coroa ──
  const z0 = 150
  k.slope(0, z0, z0 + 24, Y1, Y2, 6, 0, 1, 5)
  k.box(0, 176, 7, 2, 6, 7, 5, 0, 1.4, Y2)
  k.box(0, 183, 2.6, 5, 1, 0, 5, 0, 1.6, Y2)
  const finishZ = 182.5
  for (const [x, z] of [[0, 55], [-3, 70], [3, 78], [0, 122]] as [number, number][]) k.logo(x, z, Y1)
  return k.done({
    id: "coroa",
    qualify: 0.01,
    crown: true,
    checkpoints: [
      { x: 0, z: -3.5, y: DECK, w: 7 },
      { x: 0, z: 56.5, y: Y1, w: 7 },
      { x: 0, z: 88, y: Y1, w: 5 },
      { x: 0, z: 123, y: Y1, w: 6 },
      { x: 0, z: 148.5, y: Y1, w: 6 },
    ],
    finishZ,
    finishY: Y2 + 1.1,
    sections: [15.1, 59, 89, 125, z0],
    minFinish: 18,
    route: (r) =>
      routeOf((add) => {
        const side = r(1) < 0.5 ? -1 : 1
        add(side * 1.2, 10)
        add(side * 0.8, 15.5)
        const F = [-4.5, -1.5, 1.5, 4.5][Math.floor(r(2) * 4)]
        for (let z = 18; z <= 50; z += 3) add(F, z)
        add(F * 0.4, 54)
        const H = r(3) < 0.5 ? -3 : 3
        for (const z of [60, 63, 69, 71, 77, 79, 85, 88]) add(H, z)
        add(0, 89.5)
        add(side * 3, 93)
        add(side * 3, 99)
        add(0, 102.5)
        add(0, 105.5)
        add(-side * 3, 109)
        add(-side * 3, 115)
        add(0, 119.5)
        add(0, 123)
        const T = [-1.45, 1.45][Math.floor(r(4) * 2)]
        for (let i = 0; i < 6; i++) add(T, 127.6 + i * 2.9)
        add(0, 146)
        add(0, 148.5)
        for (let z = z0 + 1; z <= z0 + 23; z += 2.5) add(0, z)
        add(0, 176)
        add(0, 180)
        add(0, 185)
      }),
  })
}

/** As fases como foram desenhadas (uma volta só): os testes de estrutura leem daqui. */
export const COURSE_BASE: Record<GincanaPhase, Course> = {
  cidade: courseCidade(),
  floresta: courseFloresta(),
  clareira: courseClareira(),
  serraria: courseSerraria(),
  tanque: courseTanque(),
  canion: courseCanion(),
  moinhos: courseMoinhos(),
  gangorras: courseGangorras(),
  orbital: courseOrbital(),
  helices: courseHelices(),
  forja: courseForja(),
  altoforno: courseAltoForno(),
  crosta: courseCrosta(),
  aros: courseAros(),
  fabrica: courseFabrica(),
  comportas: courseComportas(),
  gelo: courseGelo(),
  portoes: coursePortoes(),
  estaleiro: courseEstaleiro(),
  relogio: courseRelogio(),
  feira: courseFeira(),
  coroa: courseCoroa(),
}

/** Quanto media cada corrida antes de dobrar (o Tanque já tinha sido alongado à mão). */
export const BASE_LEN: Partial<Record<GincanaPhase, number>> = { tanque: 140.8 }

// 20/11 (pedido do Alex): toda corrida com no mínimo o DOBRO do percurso antigo — o miolo se repete (reprise)
export const COURSES: Record<GincanaPhase, Course> = {
  cidade: reprise(COURSE_BASE.cidade),
  floresta: reprise(COURSE_BASE.floresta),
  clareira: reprise(COURSE_BASE.clareira),
  serraria: reprise(COURSE_BASE.serraria, { f: 1 }), // toras mais rápidas na 2ª volta prendem todo mundo
  tanque: reprise(COURSE_BASE.tanque, { z0: 114, z1: 213, base: BASE_LEN.tanque }),
  canion: reprise(COURSE_BASE.canion),
  moinhos: reprise(COURSE_BASE.moinhos),
  gangorras: reprise(COURSE_BASE.gangorras),
  orbital: reprise(COURSE_BASE.orbital),
  helices: reprise(COURSE_BASE.helices, { f: 1 }), // hélices mais rápidas na 2ª volta jogam todo mundo no vazio
  forja: reprise(COURSE_BASE.forja),
  altoforno: reprise(COURSE_BASE.altoforno),
  crosta: reprise(COURSE_BASE.crosta),
  aros: reprise(COURSE_BASE.aros),
  fabrica: reprise(COURSE_BASE.fabrica),
  comportas: reprise(COURSE_BASE.comportas),
  gelo: reprise(COURSE_BASE.gelo),
  portoes: reprise(COURSE_BASE.portoes),
  estaleiro: reprise(COURSE_BASE.estaleiro),
  relogio: reprise(COURSE_BASE.relogio),
  feira: reprise(COURSE_BASE.feira),
  coroa: reprise(COURSE_BASE.coroa),
}

/** O percurso da fase (desconhecida = a de sempre). */
export function courseOf(id: string | null | undefined): Course {
  return (id && (COURSES as Record<string, Course>)[id]) || COURSES.cidade
}
