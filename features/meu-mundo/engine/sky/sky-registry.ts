// features/meu-mundo/engine/sky/sky-registry.ts
//
// Céus panorâmicos (skybox) — o registro das 8 artes e onde cada uma entra no jogo.
// Arte: `MEU MUNDO 3D/ceu/originais/` → `pipeline/ceu/preparar.py` → `public/meu-mundo/ceu/v1/<px>/<id>.webp`
// + `sky-medidas.gen.ts` (horizonte e cores medidas). Aqui fica só o AJUSTE FINO de cada região
// (orientação, altura do horizonte, cor, névoa, efeitos). Teste: `MEU MUNDO 3D/pipeline/ceu/harness`.
//
// As artes são panoramas 2:1 PINTADOS, não equiretangulares: o horizonte fica a 58–68% da altura e o
// céu acaba reto no topo. Por isso a projeção é CILÍNDRICA (sky-dome.ts): sem distorção perto do
// horizonte, e o que fica acima/abaixo da arte é a cor lisa da borda (sem riscos no zênite).

import type { QualityTier } from "../quality"
import { SKY_MEDIDAS } from "./sky-medidas.gen"

export type SkyRegionId = keyof typeof SKY_MEDIDAS
type C3 = readonly [number, number, number]

/** Efeitos da camada C (só médio/alto; no baixo a arte é estática). Valor = intensidade 0–1. */
export interface SkyFx {
  /** Estrelas piscando (pontos claros pequenos acima do horizonte). */
  twinkle?: number
  /** Relâmpago esporádico: clarão breve no céu (e um toque na luz do céu, se a cena passar a luz). */
  lightning?: number
  /** Aurora: o brilho corre ao longo das cortinas verdes (a arte não se move). */
  aurora?: number
  /** Brilho quente pulsando perto do horizonte (lava, fornalhas). */
  pulse?: number
}

export interface SkyRegion {
  id: SkyRegionId
  label: string
  /** Linha do horizonte na arte (0 = topo) — medida + ajuste. */
  horizon: number
  /** Giro da arte (rad). π = o MEIO da imagem fica em +z (o "norte" das cenas) e a emenda nas costas. */
  yaw: number
  /** Escala vertical da arte (1 = proporção da imagem). */
  vScale: number
  /** Abaixo do horizonte vira a cor da névoa (1) ou mostra a arte (0). Bairro/centro: o fundo da arte é azul liso. */
  hazeBelow: number
  /** Bruma de distância sobre o que está pintado no horizonte (0–1): empurra a arte para longe. */
  airHaze: number
  /** Ajuste de cor da arte (para casar com o low-poly do jogo). */
  exposure: number
  saturation: number
  tint: C3
  /** Cor da névoa/fundo com esta arte (null = a da cena). O chão distante funde aqui. */
  fog: C3 | null
  /** Quanto a névoa da cena puxa para `fog` (0 = nada, 1 = toda). */
  fogMix: number
  /** Cor lisa acima/abaixo da arte (vem do pipeline). */
  top: C3
  bottom: C3
  /** Some com o disco de lua/sol e a aurora em malha da cena (a arte já tem). */
  dropAstro: boolean
  fx: SkyFx
}

const M = SKY_MEDIDAS
const base = (id: SkyRegionId) => ({ id, horizon: M[id].horizon, top: M[id].top, bottom: M[id].bottom, yaw: Math.PI, vScale: 1, airHaze: 0.1, exposure: 1, saturation: 1, tint: [1, 1, 1] as C3, dropAstro: true })

export const SKY_REGIONS: Record<SkyRegionId, SkyRegion> = {
  noctis_floresta_lunar: {
    ...base("noctis_floresta_lunar"),
    label: "Floresta Lunar de Noctis",
    hazeBelow: 0,
    saturation: 0.92,
    fog: M.noctis_floresta_lunar.below,
    fogMix: 0.55,
    fx: { twinkle: 0.8 },
  },
  zephyra_canion_tempestades: {
    ...base("zephyra_canion_tempestades"),
    label: "Cânion das Tempestades de Zéphyra",
    hazeBelow: 0,
    saturation: 0.9,
    fog: M.zephyra_canion_tempestades.below,
    fogMix: 0.5,
    fx: { lightning: 0.7 },
  },
  maru_mar_gelo: {
    ...base("maru_mar_gelo"),
    label: "Mar de Gelo de Marú",
    hazeBelow: 0,
    saturation: 0.9,
    fog: M.maru_mar_gelo.below,
    fogMix: 0.5,
    fx: { aurora: 0.8, twinkle: 0.5 },
  },
  aeryn_fabrica_bronze: {
    ...base("aeryn_fabrica_bronze"),
    label: "Fábrica de Bronze de Aeryn",
    hazeBelow: 0,
    saturation: 0.92,
    fog: M.aeryn_fabrica_bronze.below,
    fogMix: 0.5,
    fx: { pulse: 0.5 },
  },
  kragor_vulcao: {
    ...base("kragor_vulcao"),
    label: "Vulcão de Kragor",
    hazeBelow: 0,
    saturation: 0.9,
    fog: M.kragor_vulcao.below,
    fogMix: 0.55,
    fx: { pulse: 0.7 },
  },
  iris_cidade_orbital: {
    ...base("iris_cidade_orbital"),
    label: "Cidade Orbital de Íris",
    hazeBelow: 0,
    saturation: 0.92,
    fog: M.iris_cidade_orbital.below,
    fogMix: 0.5,
    fx: { twinkle: 0.8 },
  },
  centro_cidade: {
    ...base("centro_cidade"),
    label: "Centro da Cidade",
    vScale: 0.72,
    airHaze: 0.28,
    // fundo azul liso da arte → névoa; o dia/noite da cena escurece a arte (sky-dome `setLight`)
    hazeBelow: 1,
    saturation: 0.9,
    fog: null,
    fogMix: 0,
    dropAstro: false,
    fx: {},
  },
  bairro: {
    ...base("bairro"),
    label: "Bairro",
    vScale: 0.8,
    airHaze: 0.25,
    hazeBelow: 1,
    saturation: 0.9,
    fog: null,
    fogMix: 0,
    dropAstro: false,
    fx: {},
  },
}

export const SKY_REGION_IDS = Object.keys(SKY_REGIONS) as SkyRegionId[]

/** Domínio (id do back, = prefixo da cena `floresta-1`…) → céu. */
export const DOMAIN_SKY: Readonly<Record<string, SkyRegionId>> = {
  floresta: "noctis_floresta_lunar",
  canion: "zephyra_canion_tempestades",
  gelo: "maru_mar_gelo",
  fabrica: "aeryn_fabrica_bronze",
  vulcao: "kragor_vulcao",
  orbital: "iris_cidade_orbital",
}

/** Céu de uma cena em código (`gelo-2` → Marú); null = cena sem arte (fatias de teste). */
export function skyOfCena(nome: string): SkyRegionId | null {
  return DOMAIN_SKY[nome.split("-")[0]] ?? null
}

/** Lado da textura por nível: baixo 1024 (≈2,8 MB de vídeo), médio e alto 2048 (≈8 MB). 4096 custava 32 MB e
 *  não mudava a leitura de um céu pintado — fica de fora. */
export function skyTexSize(tier: QualityTier): 1024 | 2048 {
  return tier === "low" ? 1024 : 2048
}

/** Arquivos versionados por pasta (`v1`): arte nova = `v2`, nunca sobrescrever (cache do navegador/CDN). */
export function skyUrl(id: SkyRegionId, tier: QualityTier): string {
  return `/meu-mundo/ceu/v1/${skyTexSize(tier)}/${id}.webp`
}

/** Névoa da cena com o céu: puxa a cor da cena para a da arte. */
export function skyFog(region: SkyRegion, sceneFog: C3): [number, number, number] {
  const f = region.fog
  if (!f || region.fogMix <= 0) return [sceneFog[0], sceneFog[1], sceneFog[2]]
  const k = region.fogMix
  return [sceneFog[0] + (f[0] - sceneFog[0]) * k, sceneFog[1] + (f[1] - sceneFog[1]) * k, sceneFog[2] + (f[2] - sceneFog[2]) * k]
}
