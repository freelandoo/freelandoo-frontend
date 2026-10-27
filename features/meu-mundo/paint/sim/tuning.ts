// features/meu-mundo/paint/sim/tuning.ts — PAINT (mm3d-35): os números do jogo.
//
// Regra única: o navegador e a sala (src/utils/meuMundoPaint.js, GERADO deste
// diretório por scripts/build-paint-sim.js no back) usam os mesmos valores.
// Unidades: metros, segundos, m/s. y para cima; o chão das ilhas é o topo.

/** As três tintas. O índice é o que viaja na rede. */
export const PAINT = {
  /** Turquesa: plataforma (ponte). */
  BRIDGE: 0,
  /** Vermelho escuro: dano; apaga a tinta do outro time. */
  HARM: 1,
  /** Amarelo: cama elástica (mm3d-35e: quem pisa é lançado para cima). */
  STEP: 2,
} as const
export type PaintColor = 0 | 1 | 2

export const PAINT_COLORS = ["#1FC8C0", "#9E1B2B", "#F2C230"] as const

export const TUNING = {
  /** Passo fixo da física do corpo. */
  step: 1 / 60,
  gravity: 22,
  walk: 4.4,
  run: 6.6,
  /** Pulo: 7,6 m/s com g 22 → ~1,31 m de altura, ~0,69 s no ar. */
  jumpV: 7.6,
  /** Pulo duplo (mm3d-35c, pedido do Alex): mais um pulo no ar, um pouco mais baixo. */
  maxJumps: 2,
  airJumpV: 7.0,
  /** Controle no ar (fração da aceleração no chão). */
  airControl: 0.55,
  accel: 30,
  /** Quanto o corpo sobe sozinho num degrau (sem pular). */
  stepUp: 0.42,
  /** Raio e altura do corpo (cápsula). */
  bodyR: 0.4,
  bodyH: 1.75,
  /** Abaixo disto caiu nas nuvens: volta à base. */
  fallY: -26,
  /** Tolerância de "pisando" para pular logo depois de sair da borda. */
  coyote: 0.12,

  /** Munição por cor: começa, máximo, recarga da cápsula. */
  ammoStart: 24,
  ammoMax: 40,
  capsuleGive: 20,
  capsuleRespawn: 10,
  capsuleR: 1.1,
  /** Tiros por segundo segurando o botão (índice = cor). */
  fireRate: [7, 6, 3.5] as readonly number[],
  /** Custo em munição de cada tiro (índice = cor). */
  cost: [1, 1, 2] as readonly number[],
  /** Alcance (m) do raio de cada cor. */
  range: [13, 24, 9] as readonly number[],

  /** Ponte (turquesa): disco achatado. */
  bridgeR: 1.25,
  bridgeH: 0.34,
  /** A ponte cresce até esta distância horizontal de quem atira. */
  bridgeReach: 12,
  /** Cama elástica (amarelo, mm3d-35e): almofada baixa (dá para entrar andando) que lança para cima. */
  stepR: 1.0,
  stepH: 0.4,
  /** Velocidade do lançamento: ~4,6 m de altura (+ o pulo no ar; o topo pede 5,2 m). */
  bounceV: 14.2,
  /** Tinta some depois de (s) e cada jogador tem no máximo N manchas. */
  blobLife: 45,
  blobsPerPlayer: 60,

  /** Sangue (mm3d-38: barra no lugar dos 5 corações), soco e dano. */
  hpMax: 100,
  harmDmg: 20,
  punchDmg: 15,
  punchRange: 1.8,
  punchCos: 0.5, // cone de 60° para cada lado
  punchCooldown: 0.6,
  punchKnock: 8.5,
  punchLift: 4.5,
  harmKnock: 3.2,
  harmLift: 2,
  /** Raio do alvo do tiro (cápsula do outro jogador). */
  hitR: 0.55,
  /** Nocaute: s até voltar à base; depois de voltar, s sem tomar dano. */
  koTime: 3,
  shield: 2,

  /** Gatinhos. */
  catR: 1.3,
  catsToPortal: 20,
  portalR: 1.8,

  /** Chefão (mm3d-38: gato-gorila de porcelana, 10 m — o Alex pediu +5 m; anda apoiado nas mãos). */
  bossHp: 4000,
  bossHarm: 20,
  bossPunch: 10,
  bossR: 3.8,
  bossH: 10,
  /** Anda até a vítima (m/s), vira (rad/s) e não sai deste raio do centro da ilha. */
  bossWalk: 3.6,
  bossTurn: 2.2,
  bossLeash: 16,
  /** Pausa entre um golpe e outro (s). */
  bossRest: 1.1,
  /**
   * Golpes: `hit` = s depois do começo em que acerta, `dur` = duração toda.
   * Patada: cone na frente. Tapa no chão: círculo à frente dele (pula e bate
   * as duas mãos). Rugido: sem dano (quando o primeiro chega e na metade da vida).
   */
  bossSwipe: { reach: 9, cos: 0.35, hit: 0.75, dur: 1.7, dmg: 30, knock: 7, lift: 4.5 },
  bossSlam: { ahead: 6, r: 7.5, hit: 1.15, dur: 2.4, dmg: 45, knock: 5.5, lift: 6.5 },
  bossRoar: { dur: 2.2 },

  /** Partida. */
  matchTime: 600,
  countdown: 5,
} as const

/** Modos de partida: jogadores por time. */
export const PAINT_MODES = { solo: 1, "1v1": 1, "2v2": 2, "3v3": 3 } as const
export type PaintMode = keyof typeof PAINT_MODES
export function modeTeams(mode: PaintMode) {
  return mode === "solo" ? 1 : 2
}
export function modeCapacity(mode: PaintMode) {
  return PAINT_MODES[mode] * modeTeams(mode)
}
