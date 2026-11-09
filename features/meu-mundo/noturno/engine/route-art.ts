// features/meu-mundo/noturno/engine/route-art.ts — ROLÊ NOTURNO 2.0: a arte de cada rota no menu.
//
// Só apresentação (nome, ambiente, momento de destaque, etiquetas, cor e a
// miniatura). As miniaturas são CAPTURAS do próprio jogo
// (MEU MUNDO 3D/pipeline/noturno/harness2/thumbs.js → public/meu-mundo/noturno/v3/rotas),
// sem texto dentro: título e dados vêm da tela. Dificuldade não aparece: a
// regra é a mesma em todas as rotas (só muda o traçado e o cenário).

import type { RunPhase } from "../sim/track"
import { RUN_PHASES } from "../sim/track"
import type { ObstacleKind } from "../sim/run"

type Txt = { key: string; label: string }
/** O que derrubou, com o nome do obstáculo DA ROTA (as medidas são as mesmas em todas). */
export const CRASH_TEXT: Partial<Record<RunPhase, Record<ObstacleKind, Txt>>> = {
  floresta: {
    car: { key: "rnByForestCar", label: "Bateu na carroça!" },
    amb: { key: "rnByForestAmb", label: "Bateu nos cogumelos gigantes!" },
    truck: { key: "rnByForestTruck", label: "Bateu no tronco caído!" },
    barrier: { key: "rnByForestBarrier", label: "Tropeçou nos troncos!" },
    ramp: { key: "rnByForestRamp", label: "Caiu da rampa de raízes!" },
  },
  canion: {
    car: { key: "rnByCanyonCar", label: "Bateu no vagonete!" },
    amb: { key: "rnByCanyonAmb", label: "Bateu na ruína!" },
    truck: { key: "rnByCanyonTruck", label: "Bateu no vagão de carga!" },
    barrier: { key: "rnByCanyonBarrier", label: "Tropeçou na barricada!" },
    ramp: { key: "rnByCanyonRamp", label: "Caiu da rampa!" },
  },
  orbital: {
    car: { key: "rnByOrbitalCar", label: "Bateu na cápsula!" },
    amb: { key: "rnByOrbitalAmb", label: "Bateu na comporta!" },
    truck: { key: "rnByOrbitalTruck", label: "Bateu no contêiner maglev!" },
    barrier: { key: "rnByOrbitalBarrier", label: "Bateu na barreira de energia!" },
    ramp: { key: "rnByOrbitalRamp", label: "Caiu da rampa de vidro!" },
  },
  forja: {
    car: { key: "rnByForgeCar", label: "Bateu no vagonete de escória!" },
    amb: { key: "rnByForgeAmb", label: "Bateu na prensa!" },
    truck: { key: "rnByForgeTruck", label: "Bateu nos lingotes!" },
    barrier: { key: "rnByForgeBarrier", label: "Bateu na barra em brasa!" },
    ramp: { key: "rnByForgeRamp", label: "Caiu da rampa!" },
  },
  fabrica: {
    car: { key: "rnByFactoryCar", label: "Bateu no carrinho automático!" },
    amb: { key: "rnByFactoryAmb", label: "Bateu na coluna deslizante!" },
    truck: { key: "rnByFactoryTruck", label: "Bateu na esteira!" },
    barrier: { key: "rnByFactoryBarrier", label: "Bateu na barra deslizante!" },
    ramp: { key: "rnByFactoryRamp", label: "Caiu da rampa!" },
  },
}

export interface RouteArt {
  id: RunPhase
  num: string
  name: string
  nameKey: string
  env: string
  envKey: string
  /** O momento de destaque da rota. */
  hero: string
  heroKey: string
  tags: { key: string; label: string }[]
  accent: string
  /** Fundo enquanto a miniatura não chega. */
  bg: [string, string]
  thumb: string
}

const THUMBS = "/meu-mundo/noturno/v3/rotas/"

const ART: Record<RunPhase, Omit<RouteArt, "id" | "thumb">> = {
  floresta: {
    num: "01",
    name: "Floresta Bioluminescente",
    nameKey: "rnRouteForest",
    env: "Passarelas entre árvores colossais",
    envKey: "rnEnvForest",
    hero: "Curva em volta da árvore gigante, arco de raízes e a cascata acesa.",
    heroKey: "rnHeroForest",
    tags: [
      { key: "rnTagLoop", label: "Loop 360°" },
      { key: "rnTagSpiral", label: "Descida em espiral" },
      { key: "rnTagBridges", label: "Pontes" },
    ],
    accent: "#3ff2c4",
    bg: ["#0d3b3a", "#1a0f33"],
  },
  canion: {
    num: "02",
    name: "Cânion Flutuante",
    nameKey: "rnRouteCanyon",
    env: "Pista suspensa sobre o mar de nuvens",
    envKey: "rnEnvCanyon",
    hero: "Loop ancorado na rocha sobre as nuvens, ilhas e cachoeiras no horizonte.",
    heroKey: "rnHeroCanyon",
    tags: [
      { key: "rnTagLoop", label: "Loop 360°" },
      { key: "rnTagBanked", label: "Curvas inclinadas" },
      { key: "rnTagPortal", label: "Portais de descida" },
    ],
    accent: "#ff9a4a",
    bg: ["#7a3a2c", "#2c2b6a"],
  },
  orbital: {
    num: "03",
    name: "Cidade Orbital",
    nameKey: "rnRouteOrbital",
    env: "Vidro estrutural sobre a megacidade espacial",
    envKey: "rnEnvOrbital",
    hero: "Curva em volta da torre e o grande loop com o planeta ao fundo.",
    heroKey: "rnHeroOrbital",
    tags: [
      { key: "rnTagLoop", label: "Loop 360°" },
      { key: "rnTagGlass", label: "Pistas de vidro" },
      { key: "rnTagBanked", label: "Curvas inclinadas" },
    ],
    accent: "#7ad8ff",
    bg: ["#14214f", "#3a1460"],
  },
  forja: {
    num: "04",
    name: "Forja Vulcânica",
    nameKey: "rnRouteForge",
    env: "Forja colossal sobre rios de lava",
    envKey: "rnEnvForge",
    hero: "A boca da fornalha, a cachoeira de lava e o loop com o vulcão ao fundo.",
    heroKey: "rnHeroForge",
    tags: [
      { key: "rnTagLoop", label: "Loop 360°" },
      { key: "rnTagLava", label: "Sobre a lava" },
      { key: "rnTagPortal", label: "Portais de descida" },
    ],
    accent: "#ff6a2a",
    bg: ["#4a120a", "#1a0a0a"],
  },
  fabrica: {
    num: "05",
    name: "Fábrica Industrial",
    nameKey: "rnRouteFactory",
    env: "Megafábrica noturna em operação",
    envKey: "rnEnvFactory",
    hero: "O corredor dos robôs e o loop monumental sobre as linhas de produção.",
    heroKey: "rnHeroFactory",
    tags: [
      { key: "rnTagLoop", label: "Loop 360°" },
      { key: "rnTagMachines", label: "Máquinas" },
      { key: "rnTagClimb", label: "Subidas" },
    ],
    accent: "#ffd23a",
    bg: ["#1f2430", "#3a2a0a"],
  },
  classica: {
    num: "06",
    name: "Cidade Noturna — Clássica",
    nameKey: "rnRouteClassic",
    env: "A avenida da madrugada, reta, de sempre",
    envKey: "rnEnvClassic",
    hero: "Trânsito, rampas e caminhões — sem curvas nem loops.",
    heroKey: "rnHeroClassic",
    tags: [{ key: "rnTagClassic", label: "Clássica" }],
    accent: "#ff4fb3",
    bg: ["#3a1f5c", "#07060d"],
  },
}

export function routeArt(id: RunPhase): RouteArt {
  return { id, ...ART[id], thumb: `${THUMBS}${id}.webp` }
}

export function menuRoutes(): RouteArt[] {
  return RUN_PHASES.map(routeArt)
}
