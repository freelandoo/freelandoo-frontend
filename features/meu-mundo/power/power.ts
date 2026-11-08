// ═══ PODER DO PERSONAGEM (B7, decisão do Alex em 2026-11-08) ═══
//
//   poder = força + velocidade + destreza + inteligência + acurácia
//         + HP máx do nível de aventura
//         + equipamento (cada 1% de bônus, somando todas as chaves já com teto, vale 10 pontos)
//
// Soma simples, SÓ do permanente: os atributos como a vida guarda (sem suplemento, fome, sono
// ou efeito temporário; sem o bônus de nível que só vale na luta), o HP máx do nível
// (heroLevelScale: 100 + 9 por nível, sem o peso da skin) e o equipamento equipado.
// Substitui a fórmula do T3 (HP×0,5 + ataque×3 + …, suplemento multiplicando), que estava errada.
//
// FONTE ÚNICA: o back roda a cópia GERADA (freelandoo-backend/src/utils/meuMundoPower.js,
// por scripts/build-power-sim.js) e grava o número em tb_mm_character.power a cada
// mudança da vida. Mudou aqui → rodar o script e commitar os dois repos (o unit confere).
//
// Sem import: o módulo é puro. O HP do nível (heroLevelScale de laminas/sim/fight.ts) entra
// por parâmetro, assim front e back usam a MESMA regra da luta sem copiar.
//
// Nome: "power" na luta é a barra do golpe máximo (POWER do fight.ts e a chave `power` do
// equipamento). Este número é o PODER do personagem — nunca misturar.

export const POWER_ATTRS = ["strength", "speed", "dexterity", "intelligence", "accuracy"] as const
export type PowerAttr = (typeof POWER_ATTRS)[number]

/** Pontos de poder por 1% de bônus de equipamento. */
export const GEAR_PER_PCT = 10

/** Frações de bônus do equipamento já com teto (meuMundoGear.gearBonus / GearBonus da luta). */
export type PowerGear = Partial<Record<"dmg" | "def" | "stam" | "warn" | "power", number>>

/** Parcelas do poder (para a tela): os 5 atributos, o HP do nível e o equipamento. */
export type PowerParts = Record<PowerAttr | "hp" | "gear", number>

/** O que o poder precisa da regra da luta (laminas/sim/fight.ts ou a cópia gerada no back). */
export interface PowerFightRule {
  heroLevelScale: (level: number) => { hp: number }
}

export interface PowerInput {
  /** Atributos como a vida guarda (sem o bônus do nível). Ausente = 0. */
  attrs: Partial<Record<PowerAttr, number>>
  /** Nível de aventura (ausente/0 = 1). */
  level: number
  gear?: PowerGear | null
}

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Poder com as parcelas (arredondadas). */
export function powerScore(rule: PowerFightRule, input: PowerInput): { total: number; parts: PowerParts } {
  const parts = {} as PowerParts
  let total = 0
  for (const k of POWER_ATTRS) {
    const v = num(input.attrs?.[k])
    parts[k] = Math.round(v)
    total += v
  }
  const level = Math.max(1, Math.round(num(input.level) || 1))
  const hp = num(rule.heroLevelScale(level).hp)
  parts.hp = Math.round(hp)
  total += hp
  let pct = 0
  for (const v of Object.values(input.gear || {})) pct += num(v) * 100
  const g = pct * GEAR_PER_PCT
  parts.gear = Math.round(g)
  total += g
  return { total: Math.round(total), parts }
}

/** Só o número: o que o servidor grava. */
export function powerOf(rule: PowerFightRule, input: PowerInput): number {
  return powerScore(rule, input).total
}
