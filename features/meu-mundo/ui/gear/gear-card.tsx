"use client"

import type { ReactNode } from "react"
import type { ApiResult, GearBag, GearItem, GearOut } from "../../data"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { AE, RARITY } from "../kit/aether-tokens"
import { teko } from "../status/evo-skin"
import { shopBow, shopGun, shopHeavy, shopShield, shopSword } from "../../engine/shop-swords"

export type GearTr = (key: string, fallback: string) => string
export type GearAction = (id: string, run: (token: string, key: string) => Promise<ApiResult<GearOut>>, message?: string) => Promise<void>
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
export function gearThumb(item: GearItem): string | null {
  return (item.shop === "weapons" ? shopSword(item.id) : item.shop === "hammers" ? shopHeavy(item.id) : item.shop === "shields" ? shopShield(item.id) : item.shop === "bows" ? shopBow(item.id) : item.shop === "guns" ? shopGun(item.id) : null)?.thumb ?? null
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
  const rarity = RARITY[item.rarity]
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      <div className="shrink-0">
        <ItemImage src={gearThumb(item)} category={(item.category === "shield" ? "armor" : item.category) as ItemCategory} rarity={item.rarity} alt={nameOf(item, t)} ratio={16 / 7} />
      </div>
      <div className="flex items-start justify-between gap-2">
        <h4 className={teko.className + " text-[24px] font-semibold uppercase leading-tight"} style={{ color: AE.text }}>{nameOf(item, t)}</h4>
        <span className="shrink-0 px-1.5 py-1 text-[10px] font-bold uppercase" style={{ color: rarity.color, boxShadow: "inset 0 0 0 1px " + rarity.color }}>
          {t(rarity.labelKey, rarity.label)}
        </span>
      </div>
      {subtitle && <p className="text-[12px]" style={{ color: AE.muted }}>{subtitle}</p>}
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
    </div>
  )
}
