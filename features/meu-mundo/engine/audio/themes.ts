// features/meu-mundo/engine/audio/themes.ts — que música e que fundo tocam em cada lugar (áudio S2).
//
// A "zona" de som de cada cena, num lugar só (sem `if` espalhado): o id é o do próprio jogo
// (interiores de meuMundoCenterInteriors.js, classe do bairro, palco da luta, minijogo).
// Música = asset de C:\Users\Alex\ComfyUI-Audio\gerador\musicas.json ("musica.x" → "musica-x");
// fundo = asset do inventário de efeitos (pedidos.json). Prédios iguais dividem a mesma faixa.

/** Hora de Brasília → noite (18h–6h), a mesma régua dos monstros da rua. */
export const isNightHour = (h: number) => h >= 18 || h < 6

export const MUSIC = {
  main: "musica-tema-principal",
  centerDay: "musica-centro-dia",
  centerNight: "musica-centro-noite",
  danger: "musica-rua-perigo",
  house: "musica-casa",
  fight: "musica-luta",
  boss: "musica-luta-chefe",
  godHunt: "musica-deus-solto",
  boxe: "musica-boxe",
  hall: "musica-hall",
  win: "musica-vitoria",
  lose: "musica-derrota",
  chapter: "musica-capitulo",
  seasonEnd: "musica-fim-temporada",
} as const

/** Bairro pela classe (lore v2 C1). Bairro antigo sem classe = o das Raposas. */
export const hoodMusic = (clan: string | null | undefined) => (clan === "vampiro" ? "musica-bairro-vampiros" : "musica-bairro-raposas")

/** Interior do centro → música e fundo. */
const INTERIOR: Record<string, { music: string; amb: string }> = {
  pizzaria: { music: "musica-lojas", amb: "lugar-pizzaria-ambiente" },
  hamburgueria: { music: "musica-lojas", amb: "lugar-hamburgueria-ambiente" },
  supermercado: { music: "musica-lojas", amb: "lugar-supermercado-ambiente" },
  universidade: { music: "musica-biblioteca-escola", amb: "lugar-universidade-ambiente" },
  biblioteca: { music: "musica-biblioteca-escola", amb: "lugar-biblioteca-ambiente" },
  escola: { music: "musica-biblioteca-escola", amb: "lugar-escola-ambiente" },
  academia: { music: "musica-academia", amb: "lugar-academia-ambiente" },
  igreja: { music: "musica-igreja", amb: "lugar-igreja-ambiente" },
  delegacia: { music: "musica-delegacia", amb: "lugar-delegacia-ambiente" },
  forja: { music: "musica-forja", amb: "lugar-forja-ambiente" },
  arsenal: { music: "musica-forja", amb: "lugar-arsenal-ambiente" },
  criolab: { music: "musica-criolab", amb: "lugar-criolab-ambiente" },
}
export const interiorSound = (id: string | null | undefined) => (id ? (INTERIOR[id] ?? null) : null)

/** Fundo da praça (centro) e da rua. */
export const AMB = {
  squareDay: "lugar-centro-praca-dia",
  /** S3: não toca mais como fundo (só no ganho de status, gain-pillar.ts). */
  squareNight: "lugar-centro-praca-noite",
  streetDanger: "lugar-centro-rua-noite-perigo",
} as const

/** Minijogo → música; fase → fundo (ids das fases de cada jogo). */
export const GAME_MUSIC = {
  jetpack: "musica-jogo-jetpack",
  noturno: "musica-jogo-noturno",
  corrida: "musica-jogo-corrida",
  paint: "musica-jogo-paint",
  gincana: "musica-jogo-gincana",
} as const
export const jetpackPhaseAmb = (theme: string) => `jogo-jetpack-fase-${theme}`
export const noturnoBiomeAmb = (biome: string) => `jogo-noturno-bioma-${biome}`
export const paintMapAmb = (map: string) => `jogo-paint-mapa-${map}`
export const corridaTrackAmb = (track: string) => `jogo-corrida-pista-${track}`

/** Luta: palco + chefe + deus solto → faixa. */
export function fightMusic(o: { stage?: string; boss?: string | null; god?: string | null }) {
  if (o.stage === "ring") return MUSIC.boxe
  if (o.boss) return MUSIC.boss
  if (o.god) return MUSIC.godHunt
  return MUSIC.fight
}
