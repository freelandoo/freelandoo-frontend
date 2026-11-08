// features/meu-mundo/jetpack/sim/phases.ts — JETPACK (mm3d-75): as FASES na regra.
//
// Expansão pedida pelo Alex ("Jetpack Evolution"): o mesmo voo (propulsor,
// gravidade, velocidade, combustível e a caixa do corpo NÃO mudam), em seis
// cenários. O que muda por fase é SÓ o túnel que a semente gera: quais
// obstáculos entram, em que ordem aparecem, o quanto já começa difícil, o
// espaço entre eles, quantos galões e o trecho especial ("set piece").
//
// Fase 01 (industrial) é o túnel original e segue gerado pelo código antigo,
// idêntico (mesma semente = mesmo túnel de antes). As outras usam o gerador
// com CAMINHO (Course.spawnPhase): cada abertura nasce ao alcance da anterior
// pelo que o corpo consegue subir/descer/andar de lado no tempo do vão.
//
// O desenho de cada fase (nome, cartão, cores, cenário) fica em
// engine/phase-art.ts; aqui só o que muda o voo. Fase nova = entrada aqui +
// lá (+ o id no back, JETPACK_PHASES em src/realtime/meuMundoJetpack.js).

import type { ObstacleKind } from "./flight"

export type PhaseId = "industrial" | "canion" | "orbital" | "floresta" | "forja" | "artico" | "vacuo"

/** Trecho especial da fase: uma sequência desenhada, a cada `every` metros. */
export type SetPiece = "rings3" | "gates3" | "arches" | "furnace" | "icecave"

export interface PhaseRule {
  id: PhaseId
  /** Jogável (Anéis do Vácuo fica no catálogo, desligado). */
  enabled: boolean
  /** Obstáculos: [tipo, peso, a partir de quantos metros]. */
  kinds: readonly (readonly [ObstacleKind, number, number])[]
  /** Dificuldade na largada (0–1) e metros até a dificuldade máxima. */
  h0: number
  hK: number
  /** Multiplicador do espaço entre obstáculos (1 = o do túnel original). */
  gap: number
  /** Chance de galão em cada vão e de ser uma fila de 3 (antes da dificuldade). */
  can: number
  trio: number
  /** Trecho especial e a cada quantos metros (o primeiro entra em `setAt`). */
  set: SetPiece | null
  setAt: number
  setEvery: number
}

export const DEFAULT_PHASE: PhaseId = "industrial"

export const PHASE_RULES: readonly PhaseRule[] = [
  // o túnel original (o gerador antigo; os campos abaixo só documentam)
  {
    id: "industrial",
    enabled: true,
    kinds: [
      ["pressV", 1, 0],
      ["pressH", 1, 0],
      ["pipes", 1, 0],
      ["crusher", 1, 380],
      ["piston", 1, 850],
      ["gears", 1, 1400],
    ],
    h0: 0,
    hK: 7000,
    gap: 1,
    can: 0.8,
    trio: 0.35,
    set: null,
    setAt: 0,
    setEvery: 0,
  },
  // Cânion Flutuante: anéis, rochas suspensas, barreiras de faixa e corredores entre penhascos
  {
    id: "canion",
    enabled: true,
    kinds: [
      ["ring", 3, 0],
      ["rocks", 2, 0],
      ["band", 2, 0],
      ["cliff", 1.5, 500],
    ],
    h0: 0.05,
    hK: 6500,
    gap: 1.05,
    can: 0.85,
    trio: 0.4,
    set: "rings3",
    setAt: 600,
    setEvery: 1500,
  },
  // Cidade Orbital: portões deslizantes, barreiras de energia, anéis de tráfego e plataformas
  {
    id: "orbital",
    enabled: true,
    kinds: [
      ["slider", 3, 0],
      ["energy", 2, 0],
      ["ring", 1.5, 300],
      ["beam", 2, 0],
    ],
    h0: 0.15,
    hK: 6000,
    gap: 1,
    can: 0.8,
    trio: 0.35,
    set: "gates3",
    setAt: 700,
    setEvery: 1400,
  },
  // Floresta Bioluminescente: raízes, troncos suspensos, flores mecânicas e arcos naturais
  {
    id: "floresta",
    enabled: true,
    kinds: [
      ["roots", 2.5, 0],
      ["beam", 2, 0],
      ["iris", 2, 250],
      ["ring", 2, 0],
    ],
    h0: 0.2,
    hK: 6000,
    gap: 1,
    can: 0.8,
    trio: 0.35,
    set: "arches",
    setAt: 650,
    setEvery: 1400,
  },
  // Forja Vulcânica: pistões gigantes, engrenagens, placas mecânicas e portões industriais
  {
    id: "forja",
    enabled: true,
    kinds: [
      ["crusher", 2.5, 0],
      ["gears", 2, 0],
      ["beam", 2, 0],
      ["pressH", 1.5, 0],
      ["pressV", 1, 400],
    ],
    h0: 0.38,
    hK: 5500,
    gap: 1,
    can: 0.78,
    trio: 0.3,
    set: "furnace",
    setAt: 800,
    setEvery: 1500,
  },
  // Tempestade Ártica: cristais, comportas congeladas, blocos de gelo e túneis estreitos
  {
    id: "artico",
    enabled: true,
    kinds: [
      ["crystals", 2.5, 0],
      ["slider", 2, 0],
      ["rocks", 1.5, 0],
      ["narrow", 2, 300],
    ],
    h0: 0.42,
    hK: 5500,
    gap: 1,
    can: 0.78,
    trio: 0.3,
    set: "icecave",
    setAt: 750,
    setEvery: 1500,
  },
  // Anéis do Vácuo: reservada (não aparece como jogável; a gravidade NÃO muda)
  {
    id: "vacuo",
    enabled: false,
    kinds: [
      ["ring", 3, 0],
      ["rocks", 2, 0],
      ["slider", 1, 0],
    ],
    h0: 0.5,
    hK: 5000,
    gap: 1,
    can: 0.75,
    trio: 0.3,
    set: "rings3",
    setAt: 600,
    setEvery: 1400,
  },
]

/** A regra de uma fase (desconhecida ou desligada = a original). */
export function phaseRule(id: string | null | undefined): PhaseRule {
  const r = PHASE_RULES.find((p) => p.id === id)
  return r && r.enabled ? r : PHASE_RULES[0]
}

/** Ids jogáveis, na ordem. */
export const PLAYABLE_PHASES: readonly PhaseId[] = PHASE_RULES.filter((p) => p.enabled).map((p) => p.id)
