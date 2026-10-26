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
  /** Amarelo: degrau (sobe). */
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
  /** Degrau (amarelo): cilindro alto. */
  stepR: 0.85,
  stepH: 1.0,
  /** Tinta some depois de (s) e cada jogador tem no máximo N manchas. */
  blobLife: 45,
  blobsPerPlayer: 60,

  /** Corações, soco e dano. */
  hearts: 5,
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

  /** Chefão (provisório até a etapa do chefão). */
  bossHp: 4000,
  bossHarm: 20,
  bossPunch: 10,
  bossR: 2.6,
  bossH: 6,

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
