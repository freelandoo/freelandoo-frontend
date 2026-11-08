// ═══ PODER DO PERSONAGEM (T3, decidido com o Alex em 2026-11-08) ═══
//
//   poder = HP×0,5 + ataque×3 + defesa×2 + (força + velocidade + inteligência)×10
//           + bônus de equipamento, arredondado para inteiro
//
// FONTE ÚNICA: o back roda a cópia GERADA (freelandoo-backend/src/utils/meuMundoPower.js,
// por scripts/build-power-sim.js) e grava o número em tb_mm_character.power a cada
// mudança da vida. Mudou aqui → rodar o script e commitar os dois repos (o unit confere).
//
// Sem import: o módulo é puro. A ficha da luta (heroSheet/heroStats de laminas/sim/fight.ts)
// entra por parâmetro em powerOf, assim front e back usam a MESMA regra da luta sem copiar.
//
// HP, ataque e defesa são os da ficha de luta SEM equipamento (o equipamento entra só no
// bônus, para não contar duas vezes). Força/velocidade/inteligência = os da vida + o bônus
// do nível (os mesmos que a luta usa).

export interface PowerStatus {
  hp: number
  atk: number
  def: number
  strength: number
  speed: number
  intelligence: number
}

/** Frações de bônus do equipamento (as mesmas de meuMundoGear.gearBonus / GearBonus da luta). */
export interface PowerGear {
  dmg?: number
  def?: number
  stam?: number
  warn?: number
  power?: number
}

export const POWER_WEIGHTS = { hp: 0.5, atk: 3, def: 2, attr: 10 }

/**
 * Bônus de equipamento: pontos de poder por 1,00 (100%) de cada fração. Escolha minha
 * (o Alex decidiu só "+ bônus de equipamento"): o equipamento no teto vale ~1.200, o que
 * pesa como ~40 pontos de atributo somados.
 */
export const GEAR_POWER: Required<PowerGear> = { dmg: 1500, def: 1500, stam: 1000, warn: 1000, power: 1200 }

/**
 * Suplementos ativos somam uma porcentagem ao poder base (antes do equipamento). Escolha
 * minha; ids = efeitos da vida (meuMundoLife.js, s.effects). Teto 15% somado.
 */
export const SUPPLEMENT_POWER: Record<string, number> = {
  preworkout: 0.04,
  creatine: 0.03,
  anabolic: 0.06,
  whey: 0.01,
  albumin: 0.01,
  multivit: 0.01,
}
export const SUPPLEMENT_MAX = 0.15

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Pontos de poder do equipamento (frações negativas ou lixo valem 0). */
export function gearPower(gear?: PowerGear | null): number {
  if (!gear) return 0
  let sum = 0
  for (const k of Object.keys(GEAR_POWER) as (keyof PowerGear)[]) sum += num(gear[k]) * GEAR_POWER[k]
  return sum
}

/** Fator dos suplementos ativos (1 = nenhum). Repetido conta uma vez. */
export function supplementFactor(supplements?: readonly string[] | null): number {
  if (!supplements || !supplements.length) return 1
  let add = 0
  for (const id of new Set(supplements)) add += SUPPLEMENT_POWER[id] ?? 0
  return 1 + Math.min(SUPPLEMENT_MAX, add)
}

/** A fórmula do poder. */
export function computePower(status: PowerStatus, gear?: PowerGear | null, supplements?: readonly string[] | null): number {
  const W = POWER_WEIGHTS
  const base =
    num(status.hp) * W.hp +
    num(status.atk) * W.atk +
    num(status.def) * W.def +
    (num(status.strength) + num(status.speed) + num(status.intelligence)) * W.attr
  return Math.round(base * supplementFactor(supplements) + gearPower(gear))
}

/** O que powerOf precisa da regra da luta (laminas/sim/fight.ts ou a cópia gerada no back). */
export interface PowerFightRule {
  heroSheet: (
    body: string | null | undefined,
    level: number,
    stats: { strength: number; speed: number; intelligence: number; dexterity?: number },
  ) => { hp: number; atk: number; def: number }
  heroStats: (
    stats: { strength: number; speed: number; intelligence: number; dexterity: number },
    level: number,
  ) => { strength: number; speed: number; intelligence: number }
}

export interface PowerInput {
  /** Corpo vestido (skin ou condição). */
  body: string | null | undefined
  /** Nível de aventura. */
  level: number
  /** Atributos da vida (sem o bônus do nível). */
  stats: { strength: number; speed: number; intelligence: number; dexterity?: number }
  gear?: PowerGear | null
  /** Ids dos efeitos ativos agora (a vida filtra os vencidos). */
  supplements?: readonly string[] | null
}

/** Status do poder a partir da vida, do nível e do corpo. */
export function powerStatus(rule: PowerFightRule, input: PowerInput): PowerStatus {
  const stats = {
    strength: num(input.stats.strength),
    speed: num(input.stats.speed),
    intelligence: num(input.stats.intelligence),
    dexterity: num(input.stats.dexterity),
  }
  const level = Math.max(1, Math.round(num(input.level) || 1))
  const sheet = rule.heroSheet(input.body, level, stats)
  const f = rule.heroStats(stats, level)
  return { hp: sheet.hp, atk: sheet.atk, def: sheet.def, strength: f.strength, speed: f.speed, intelligence: f.intelligence }
}

/** Poder completo de um personagem: o que o servidor grava e o que a tela confere. */
export function powerOf(rule: PowerFightRule, input: PowerInput): number {
  return computePower(powerStatus(rule, input), input.gear, input.supplements)
}
