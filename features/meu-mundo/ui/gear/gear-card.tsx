"use client"

import type { ReactNode } from "react"
import type { ApiResult, ClassStatKey, GearBag, GearClassStats, GearItem, GearOut } from "../../data"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { ArtCard } from "../kit/art-card"
import { AE, rankOf } from "../kit/aether-tokens"
import { RankSeal } from "../kit/rank-seal"
import { teko } from "../status/evo-skin"
import { shopBow, shopGun, shopHeavy, shopShield, shopStaff, shopSword } from "../../engine/shop-swords"
import { itemArt } from "../../engine/item-art"

export type GearTr = (key: string, fallback: string) => string
export type GearAction = (id: string, run: (token: string, key: string) => Promise<ApiResult<GearOut>>, message?: string, opts?: { quiet?: boolean }) => Promise<GearOut | null>
export const nameOf = (item: GearItem, t: GearTr) => t("gear_" + item.id, item.name)
export const percentage = (value: number) => String(Math.round(value * 1000) / 10) + "%"

export function bonusLines(bonus: GearItem["bonus"], t: GearTr): string[] {
  if (!bonus) return []
  return [
    bonus.dmg ? t("gearBonusDmg", "+{v} dano").replace("{v}", percentage(bonus.dmg)) : null,
    bonus.def ? t("gearBonusDef", "+{v} defesa").replace("{v}", percentage(bonus.def)) : null,
    bonus.stam ? t("gearBonusStam", "−{v} fôlego gasto").replace("{v}", percentage(bonus.stam)) : null,
    bonus.warn ? t("gearBonusWarn", "+{v} tempo de aviso").replace("{v}", percentage(bonus.warn)) : null,
    bonus.power ? t("gearBonusPower", "+{v} carga do poder").replace("{v}", percentage(bonus.power)) : null,
    // trilha E4: chaves proporcionais novas
    bonus.hp ? t("gearBonusHp", "+{v} vida").replace("{v}", percentage(bonus.hp)) : null,
    bonus.acc ? t("gearBonusAcc", "+{v} acuracidade").replace("{v}", percentage(bonus.acc)) : null,
    bonus.spd ? t("gearBonusSpd", "+{v} velocidade").replace("{v}", percentage(bonus.spd)) : null,
    bonus.int ? t("gearBonusInt", "+{v} inteligência").replace("{v}", percentage(bonus.int)) : null,
    bonus.dex ? t("gearBonusDex", "+{v} destreza").replace("{v}", percentage(bonus.dex)) : null,
  ].filter((line): line is string => !!line)
}

/** Miniatura do item de loja (as abas do Arsenal); null = desenho da categoria. */
const STAT_LABEL: Record<ClassStatKey, [string, string]> = {
  hp: ["gearStatHp", "HP"], atk: ["gearStatAtk", "Força"], def: ["gearStatDef", "Defesa"], acc: ["gearStatAcc", "Acerto"],
  spd: ["gearStatSpd", "Esquiva"], stam: ["gearStatStam", "Fôlego"], dmg: ["gearStatDmg", "Dano"],
}
const statLabel = (k: ClassStatKey, t: GearTr) => t(STAT_LABEL[k][0], STAT_LABEL[k][1])
const pctText = (v: number) => (Math.round(v * 100) / 100).toLocaleString("pt-BR") + "%"

/** Status da classe em linhas curtas ("+864 Força", "+27,5% Dano"): número primeiro, depois a %. */
export function classStatLines(stats: Pick<GearClassStats, "flat" | "pct"> | null | undefined, t: GearTr): string[] {
  if (!stats) return []
  const flat = (Object.entries(stats.flat) as [ClassStatKey, number][]).filter(([, v]) => v > 0).map(([k, v]) => `+${Math.round(v).toLocaleString("pt-BR")} ${statLabel(k, t)}`)
  const pct = (Object.entries(stats.pct) as [ClassStatKey, number][]).filter(([, v]) => v > 0).map(([k, v]) => `+${pctText(v)} ${statLabel(k, t)}`)
  return [...flat, ...pct]
}
/** Linhas de um item: status da classe se tiver (arma, escudo, proteção…); senão o bônus antigo (runa etc.). */
export function itemLines(item: GearItem, t: GearTr): string[] {
  return item.stats ? classStatLines(item.stats, t) : bonusLines(item.bonus, t)
}

/** Status da classe: o número inteiro dividido nos status e a porcentagem dividida nas chaves. */
export function ClassStats({ stats, t }: { stats?: GearClassStats | null; t: GearTr }) {
  if (!stats) return null
  const flat = Object.entries(stats.flat) as [ClassStatKey, number][]
  const pct = Object.entries(stats.pct) as [ClassStatKey, number][]
  return (
    <div className="grid grid-cols-2 gap-2 text-[12px]">
      <div className="grid content-start gap-0.5 rounded-md p-2" style={{ background: AE.well }}>
        <span className="text-[11px] font-semibold uppercase" style={{ color: AE.muted }}>{t("gearStatNumber", "Número")} · {stats.number.toLocaleString("pt-BR")}</span>
        {flat.map(([k, v]) => <span key={k} className="font-semibold" style={{ color: AE.text }}>+{v.toLocaleString("pt-BR")} {statLabel(k, t)}</span>)}
      </div>
      <div className="grid content-start gap-0.5 rounded-md p-2" style={{ background: AE.well }}>
        <span className="text-[11px] font-semibold uppercase" style={{ color: AE.muted }}>{t("gearStatPercent", "Porcentagem")} · {pctText(stats.percent)}</span>
        {pct.map(([k, v]) => <span key={k} className="font-semibold" style={{ color: AE.aether }}>+{pctText(v)} {statLabel(k, t)}</span>)}
      </div>
    </div>
  )
}

export function gearThumb(item: GearItem): string | null {
  // cajados (aba Cajados e o Cajado dos Moldes, 22/11/2026): a thumb sai da tabela das armas novas
  return (item.shop === "weapons" ? shopSword(item.id) : item.shop === "hammers" ? shopHeavy(item.id) : item.shop === "shields" ? shopShield(item.id) : item.shop === "bows" ? shopBow(item.id) : item.shop === "guns" ? shopGun(item.id) : shopStaff(item.id))?.thumb ?? itemArt(item.id)
}

/** Por que não dá para usar/comprar (nível, quem usa a arma, classe); null = pode. Peça única da Mochila e da Loja (B5). */
export function gearLock(item: GearItem, bag: GearBag | null, t: GearTr): string | null {
  if (!bag) return null
  if (bag.level < item.level) return t("gearNeedLevel", "Precisa do nível {n}").replace("{n}", String(item.level))
  if (item.shop === "weapons") return bag.warrior ? null : t("gearWarriorOnly", "Só guerreiros usam espadas")
  if (item.shop === "shields") return bag.warrior ? null : t("gearShieldOnly", "Só quem usa espada leva escudo")
  if (item.shop === "bows") return bag.archer ? null : t("gearBowOnly", "Só Íris e Aeryn usam arcos")
  if (item.shop === "guns") return bag.gunner ? null : t("gearGunOnly", "Só Ciborgue e Noctis usam estas armas")
  if (item.shop === "hammers") return bag.hammer ? null : t("gearHammerOnly", "Só Soldado de Pedra, Marú e Kragor usam estas armas")
  return item.clan && item.clan !== bag.clan ? t("gearOtherClan", "Arma de outra classe") : null
}

export function GearItemCard({ item, t, subtitle, lines, children }: {
  item: GearItem; t: GearTr; subtitle?: string; lines?: string[]; children?: ReactNode
}) {
  const rank = rankOf(item)
  const art = gearThumb(item)
  const category = (item.category === "shield" ? "armor" : item.category) as ItemCategory
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h4 className={teko.className + " text-[24px] font-semibold uppercase leading-tight"} style={{ color: AE.text }}>{nameOf(item, t)}</h4>
        <RankSeal rank={rank} t={t} />
      </div>
      {subtitle && <p className="text-[12px]" style={{ color: AE.muted }}>{subtitle}</p>}
      <ClassStats stats={item.stats} t={t} />
      {item.set && <p className="text-[12px] font-semibold" style={{ color: AE.goldSoft }}>{t("gearSetLine", "Conjunto {name}").replace("{name}", t("gearSet_" + item.set, item.set))}</p>}
      {!!lines?.length && <ul className="grid gap-1 text-[13px] font-semibold" style={{ color: AE.aether }}>{lines.map(line => <li key={line}>{line}</li>)}</ul>}
      {item.description && <p className="text-[12px]" style={{ color: AE.muted }}>{t("gearDesc_" + item.id, item.description)}</p>}
      {(item.source || item.uses?.length) && (
        <details className="text-[12px]" style={{ color: AE.muted }}>
          <summary className="min-h-9 py-2 font-semibold" style={{ color: AE.goldSoft }}>{t("forgeItemGuide", "Onde conseguir e como usar")}</summary>
          {item.source && <p className="mb-1">{t("gearSource_" + item.id, item.source.join(" · "))}</p>}
          {!!item.uses?.length && <p>{t("gearUses_" + item.id, item.uses.join(" · "))}</p>}
        </details>
      )}
      <div className="mt-auto grid gap-2 pt-1">{children}</div>
    </>
  )
  // 17/11: arma com arte 2:3 — a arte ocupa o cartão e o texto fica por cima (Loja, Forja, Mochila…)
  if (art)
    return (
      <ArtCard src={art} category={category} rarity={rank} alt={nameOf(item, t)}>
        {body}
      </ArtCard>
    )
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      <div className="shrink-0">
        <ItemImage src={null} category={category} rarity={rank} alt={nameOf(item, t)} ratio={16 / 7} />
      </div>
      {body}
    </div>
  )
}
