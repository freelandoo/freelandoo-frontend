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
  // Portas da Prefeitura (Gincana 3, G3-11): a corrida de abertura do programa. Três fileiras de portas
  // (as falsas são parede; a semente sorteia quais abrem), a ponte, o carrossel de duas barras, mais
  // duas fileiras (menos portas abertas), as passarelas com pêndulos e a subida com barris.
  const k = new CourseKit()
  kitStart(k)
  // ── 1. portas ──
  k.box(0, 39.8, 8, 24.7, 6, 7, 1)
  const ROWS1: [number, number][] = [[26, 3], [38, 2], [50, 2]]
  for (const [z, open] of ROWS1) k.doorRow(0, z, 5, 3.2, 3.4, open)
  // ── 2. ponte e carrossel de duas barras ──
  k.box(0, 70, 2.4, 5.5, 6, 7, 2)
  k.disc(0, 85, 9.5, 0, 1, 2)
  k.post(0, 85, 0.8, DECK, DECK + 2.4, 1)
  k.sweep(0, 85, DECK + 0.55, 9.8, 0.32, 1.05, 0.4, true)
  k.box(0, 98.5, 5, 4, 6, 7, 2)
  // ── 3. mais portas (menos abertas) ──
  k.box(0, 120.5, 8, 18, 6, 7, 3)
  for (const z of [112, 126]) k.doorRow(0, z, 5, 3.2, 3.4, 2)
  // ── 4. passarelas com pêndulos ──
  const LANES = [-5, 0, 5]
  for (const x of LANES) k.beam(x, 138.5, x, 160, 1.5, 0, 1, 4)
  const swing = (x: number, z: number, ph: number) => k.swing(x, z, DECK + 9, 7.4, 1.1, 0.95, 2.2, ph)
  swing(-5, 144, 0)
  swing(0, 144, 2.1)
  swing(5, 144, 4.2)
  swing(-5, 153, 1.1)
  swing(0, 153, 3.3)
  swing(5, 153, 0.2)
  k.box(0, 165, 7, 5, 6, 7, 4)
  // ── 5. subida com barris e a chegada ──
  const z0 = 170
  const finishZ = kitFinish(k, z0, 0.95, 7.5, 1.2)
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
  })
  for (const [x, z] of K.trees) k.post(x, z, K.treeR, 0, CY1 + 12, 0)
  // ── 4. o barranco, a vitória-régia gigante que gira e as sementes penduradas ──
  k.box(0, 161.5 + CB, 7, 6.5, 5, 1, 4, 0, 6, CY2)
  k.box(0, 170.5 + CB, 2, 2.2, 5, 1, 4, 0, 1.2, CY2)
  const lily = k.disc(0, K.lily.z, K.lily.r, 5, 1, 4, CY2)
  k.pads[lily].spin = K.lilySpin
  let ph = 0
  for (const z of [176.5, 181, 185.5]) {
    k.swing(0, z + CB, CY2 + 9, 7.4, 1.25, 0.95, 2.05, ph)
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

/**
 * Feira Rolante (Gincana 3, G3-12): corrida na feira do Centro. A rampa de entrada é uma ESTEIRA
 * FORTE que desce (5,5 m/s: parado, ela leva você de volta) e as barracas soltam melancias que
 * rolam rampa abaixo; depois, duas esteiras lado a lado em sentidos opostos com prensas que
 * empurram de lado, os martelos (pêndulos), o corredor de esteiras de lado e a subida.
 */
function courseFeira(): Course {
  const k = new CourseKit()
  kitStart(k)
  const Y = DECK + 3
  // ── 1. rampa-esteira com melancias ──
  const r1 = k.slope(0, 15.1, 40, DECK, Y, 6, 0, 1, 1)
  k.pads[r1].bz = -GINCANA.belt
  k.balls = { lanes: [-4.3, -1.45, 1.45, 4.3], every: 1.15, v: 6.5, R: 1.15, zEnd: 12 }
  k.box(0, 44, 7, 4, 6, 7, 1, 0, 1.4, Y)
  // ── 2. esteiras de mão dupla com prensas ──
  const fwd = k.box(-3, 63, 3, 15, 2, 0, 2, 0, 1.4, Y)
  k.pads[fwd].bz = GINCANA.belt
  const back = k.box(3, 63, 3, 15, 3, 0, 2, 0, 1.4, Y)
  k.pads[back].bz = -GINCANA.belt
  const PW = [1.5, 1.9, 1.3]
  ;[54, 63, 72].forEach((z, i) => k.pusher(-3, z, 1.6, 0.9, 2.2, 3, 0, PW[i], i * 1.3, Y))
  k.box(0, 82, 7, 4, 6, 7, 2, 0, 1.4, Y)
  // ── 3. martelos ──
  k.box(0, 99, 6, 13, 6, 7, 3, 0, 1.4, Y)
  const ham = (x: number, z: number, ph: number) => k.swing(x, z, Y + 9, 7.4, 1.1, 0.95, 2.2, ph)
  ham(-3, 92, 0)
  ham(3, 92, 2.4)
  ham(-3, 99, 1.2)
  ham(3, 99, 3.6)
  ham(-3, 106, 4.4)
  ham(3, 106, 0.6)
  k.box(0, 115, 7, 3, 6, 7, 3, 0, 1.4, Y)
  // ── 4. corredor de esteiras de lado ──
  for (let i = 0; i < 6; i++) {
    const p = k.box(0, 120 + i * 4, 6, 2, i % 2 ? 4 : 5, 0, 4, 0, 1.4, Y)
    k.pads[p].bx = (i % 2 ? -1 : 1) * GINCANA.belt
  }
  k.box(0, 146, 7, 4, 6, 7, 4, 0, 1.4, Y)
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
  const ham = (x: number, z: number, ph: number) => k.swing(x, z, Y1 + 9, 7.4, 1.1, 0.95, 2.2, ph)
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
    k.sweep(0, z, Y1 + 0.55, 7.3, 0.32, w, a0, true)
  }
  gate(96, 1.25, 0)
  k.box(0, 104, 2.4, 1.2, 6, 7, 3, 0, 1.4, Y1)
  gate(112, -1.45, 0.8)
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

export const COURSES: Record<GincanaPhase, Course> = {
  cidade: courseCidade(),
  floresta: courseFloresta(),
  clareira: courseClareira(),
  canion: courseCanion(),
  orbital: courseOrbital(),
  forja: courseForja(),
  fabrica: courseFabrica(),
  gelo: courseGelo(),
  relogio: courseRelogio(),
  feira: courseFeira(),
  coroa: courseCoroa(),
}

/** O percurso da fase (desconhecida = a de sempre). */
export function courseOf(id: string | null | undefined): Course {
  return (id && (COURSES as Record<string, Course>)[id]) || COURSES.cidade
}
