// features/meu-mundo/engine/sky/sky-registry.ts
//
// Céus panorâmicos (skybox) — o registro das 8 áreas, cada uma com arte de DIA e de NOITE, e onde cada
// uma entra no jogo. Arte: `MEU MUNDO 3D/ceu/originais-v3/<área>_<dia|noite>.png` → `pipeline/ceu/preparar.py`
// → `public/meu-mundo/ceu/v2/<px>/<arte>.webp` + `sky-medidas.gen.ts` (horizonte e cores medidas). Aqui fica
// só o AJUSTE FINO (giro, cor, névoa, efeitos). Teste: `MEU MUNDO 3D/pipeline/ceu/harness`.
//
// As artes são SÓ CÉU, em FAIXA 19:7 (sem casa/prédio/montanha pintada — a 1ª leva com paisagem virava um
// paredão atrás do mapa e foi reprovada). Projeção em cilindro com a proporção da arte (sky-dome.ts);
// `horizon` = onde a névoa da arte começa.
//
// Dia × noite: bairro e centro seguem o relógio de Brasília (as duas artes se misturam no crepúsculo);
// cada cena de Domínio usa a arte que combina com a luz dela (`variantOfCena`).

import { QUALITY, type QualityTier } from "../quality"
import { SKY_MEDIDAS } from "./sky-medidas.gen"

export type SkyArtId = keyof typeof SKY_MEDIDAS
export type SkyRegionId = "bairro" | "centro" | "noctis" | "zephyra" | "maru" | "aeryn" | "kragor" | "iris"
export type SkyVariant = "dia" | "noite"
/** Modo da cúpula: uma arte fixa ou o ciclo (dia ↔ noite misturados por `setNightMix`). */
export type SkyMode = SkyVariant | "ciclo"
type C3 = readonly [number, number, number]

/** Efeitos da camada C (só médio/alto; no baixo a arte é estática). Valor = intensidade 0–1. */
export interface SkyFx {
  /** Estrelas piscando (pontos claros pequenos acima do horizonte). */
  twinkle?: number
  /** Relâmpago esporádico: clarão breve no céu (e um toque na luz do céu, se a cena passar a luz). */
  lightning?: number
  /** Aurora: o brilho corre ao longo das cortinas verdes (a arte não se move). */
  aurora?: number
  /** Brilho quente pulsando perto do horizonte (lava, fornalhas, brasas). */
  pulse?: number
}

export interface SkyRegion {
  id: SkyRegionId
  label: string
  /** Giro da arte (rad). π = o MEIO da imagem fica em +z (o "norte" das cenas) e a emenda nas costas. */
  yaw: number
  /** Abaixo do horizonte vira a cor da névoa (1) ou mostra a arte (0). */
  hazeBelow: number
  /** Bruma perto do horizonte (0–1): a arte funde com a névoa da cena, sem faixa. */
  airHaze: number
  /** Ajuste de cor das artes (para casar com o low-poly do jogo). */
  exposure: number
  saturation: number
  tint: C3
  /** Quanto a névoa da cena puxa para a cor da arte no horizonte (0 = nada; bairro/centro: a névoa é a da hora). */
  fogMix: number
  /** Some com o disco de lua/sol e a aurora em malha da cena (a arte já tem). */
  dropAstro: boolean
  fx: Record<SkyVariant, SkyFx>
}

const R = (id: SkyRegionId, label: string, o: Partial<SkyRegion> & Pick<SkyRegion, "fx">): SkyRegion => ({
  id,
  label,
  yaw: Math.PI,
  hazeBelow: 0.6,
  airHaze: 0.15,
  exposure: 1,
  saturation: 0.95,
  tint: [1, 1, 1],
  fogMix: 0.5,
  dropAstro: true,
  ...o,
})

export const SKY_REGIONS: Record<SkyRegionId, SkyRegion> = {
  // cidade: abaixo do horizonte = névoa da hora; o casco 3D de estrelas/lua sai (a arte da noite já tem)
  bairro: R("bairro", "Bairro", { hazeBelow: 1, airHaze: 0.3, fogMix: 0, fx: { dia: {}, noite: { twinkle: 0.5 } } }),
  centro: R("centro", "Centro da Cidade", { hazeBelow: 1, airHaze: 0.3, fogMix: 0, fx: { dia: {}, noite: { twinkle: 0.5 } } }),
  noctis: R("noctis", "Floresta Lunar de Noctis", { fx: { dia: { twinkle: 0.3 }, noite: { twinkle: 0.8 } } }),
  zephyra: R("zephyra", "Cânion das Tempestades de Zéphyra", { fx: { dia: { lightning: 0.5 }, noite: { lightning: 0.8 } } }),
  maru: R("maru", "Mar de Gelo de Marú", { fx: { dia: {}, noite: { aurora: 0.8, twinkle: 0.5 } } }),
  aeryn: R("aeryn", "Fábrica de Bronze de Aeryn", { fx: { dia: { pulse: 0.35 }, noite: { pulse: 0.6 } } }),
  kragor: R("kragor", "Vulcão de Kragor", { fx: { dia: { pulse: 0.5 }, noite: { pulse: 0.7 } } }),
  iris: R("iris", "Cidade Orbital de Íris", { fx: { dia: { twinkle: 0.3 }, noite: { twinkle: 0.8 } } }),
}

export const SKY_REGION_IDS = Object.keys(SKY_REGIONS) as SkyRegionId[]

/** A arte de uma área numa variante, com o que o pipeline mediu. */
export function skyArt(id: SkyRegionId, v: SkyVariant) {
  const art = `${id}_${v}` as SkyArtId
  return { art, ...SKY_MEDIDAS[art] }
}

/** Domínio (id do back, = prefixo da cena `floresta-1`…) → céu. */
export const DOMAIN_SKY: Readonly<Record<string, SkyRegionId>> = {
  floresta: "noctis",
  canion: "zephyra",
  gelo: "maru",
  fabrica: "aeryn",
  vulcao: "kragor",
  orbital: "iris",
}

/** Céu de uma cena em código (`gelo-2` → Marú); null = cena sem arte (fatias de teste). */
export function skyOfCena(nome: string): SkyRegionId | null {
  return DOMAIN_SKY[nome.split("-")[0]] ?? null
}

/** Exceções da escolha automática dia/noite por cena (nome da cena → variante). */
export const CENA_VARIANT: Readonly<Record<string, SkyVariant>> = {}

/** Dia ou noite para a cena: pela luz dela (céu escuro = noite), salvo exceção em `CENA_VARIANT`. */
export function variantOfCena(nome: string, ceu: C3): SkyVariant {
  const fixed = CENA_VARIANT[nome]
  if (fixed) return fixed
  return 0.299 * ceu[0] + 0.587 * ceu[1] + 0.114 * ceu[2] < 0.32 ? "noite" : "dia"
}

/** Lado da textura por nível (`QUALITY[tier].sky.tex`): baixo 1024 (≈2,8 MB de vídeo por arte), médio e alto 2048 (≈8 MB). */
export function skyTexSize(tier: QualityTier): 1024 | 2048 {
  return QUALITY[tier].sky.tex
}

/** Arquivos versionados por pasta (`v2`): arte nova = `v3`, nunca sobrescrever (cache do navegador/CDN). */
export function skyUrl(art: SkyArtId, tier: QualityTier): string {
  return `/meu-mundo/ceu/v2/${skyTexSize(tier)}/${art}.webp`
}

/** Névoa da cena com o céu: puxa a cor da cena para a da arte logo abaixo do horizonte. */
export function skyFog(id: SkyRegionId, v: SkyVariant, sceneFog: C3): [number, number, number] {
  const r = SKY_REGIONS[id]
  const f = skyArt(id, v).below
  const k = r.fogMix
  return [sceneFog[0] + (f[0] - sceneFog[0]) * k, sceneFog[1] + (f[1] - sceneFog[1]) * k, sceneFog[2] + (f[2] - sceneFog[2]) * k]
}
