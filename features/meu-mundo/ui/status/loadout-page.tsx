// features/meu-mundo/ui/status/loadout-page.tsx — B6 (2026-11-08): a página
// "Equipado e efeitos" do STATUS. SÓ LEITURA, sem regra nova:
//   • Equipado: cada peça com o bônus dela (base + refino) e o total já com teto
//     (o total é o `bag.bonus` que o servidor calcula — meuMundoGear.gearBonus).
//   • Ativos: suplementos, remédios, estimulantes e lesão com o tempo que falta.
//   • De onde vem cada atributo: o treinado (a vida), o piso, o bônus do nível
//     (só na luta) e o quanto os efeitos aceleram o TREINO (efeito não muda o valor).
//   • Ficha de luta: base do personagem, nível e equipamento, pela heroSheet da
//     regra da luta (as parcelas saem por diferença, sem copiar constante).
//   • Poder (B7): as parcelas pela regra única power/power.ts; efeito temporário
//     nunca entra.
//   • Personagem (B3): o ativo e o link do certificado.

import type { ReactNode } from "react"
import { Brain, Crosshair, Dumbbell, LocateFixed, Wind, Zap, ScrollText } from "lucide-react"
import { useLocale } from "@/components/i18n/I18nProvider"
import type { GearBag, GearCatalog, GearItem, GearSlot } from "../../data"
import type { CharactersResult, LifeFull } from "../../types"
import { heroLevelScale, heroSheet, type GearBonus } from "../../laminas/sim/fight"
import { powerScore, POWER_ATTRS, type PowerAttr } from "../../power/power"
import { speciesName } from "../../characters/names"
import { RARITY } from "../kit/aether-tokens"
import { nameOf, percentage } from "../gear/gear-card"
import { Bar, EVO, Plate, Ring, Tag, archivo, teko } from "./evo-skin"
import type { AdvXp } from "./status-pages"

type Tr = (key: string, fallback: string) => string

export interface LoadoutData {
  gear: { catalog: GearCatalog; bag: GearBag } | null
  chars: CharactersResult | null
}

const SLOTS: GearSlot[] = ["weapon", "shield", "armor", "acc1", "acc2"]
const BONUS_KEYS: (keyof GearBonus)[] = ["dmg", "def", "stam", "warn", "power"]

function slotName(s: GearSlot, t: Tr) {
  return {
    weapon: t("lkSlotWeapon", "Arma"),
    shield: t("lkSlotShield", "Escudo"),
    armor: t("lkSlotArmor", "Armadura"),
    acc1: t("lkSlotAcc1", "Acessório 1"),
    acc2: t("lkSlotAcc2", "Acessório 2"),
  }[s]
}
function bonusName(k: keyof GearBonus, t: Tr) {
  return {
    dmg: t("lkBonusDmg", "Dano"),
    def: t("lkBonusDef", "Defesa"),
    stam: t("lkBonusStam", "Fôlego"),
    warn: t("lkBonusWarn", "Aviso"),
    power: t("lkBonusPower", "Poder máximo"),
  }[k]
}

/**
 * Bônus de UMA peça com o refino (só para mostrar a parcela; o total que vale é o
 * `bag.bonus` do servidor). Espelho de meuMundoGear.gearBonus: arma soma dano por
 * nível, armadura soma defesa, e do +6 em diante as duas somam o secundário.
 */
function pieceBonus(item: GearItem, level: number, up: GearCatalog["upgrade"]): Partial<GearBonus> {
  const out: Partial<GearBonus> = { ...(item.bonus || {}) }
  const lv = Math.max(0, Math.min(up.max, level || 0))
  if (item.category === "weapon") out.dmg = (out.dmg || 0) + lv * up.dmg
  if (item.category === "armor") out.def = (out.def || 0) + lv * up.def
  if ((item.category === "weapon" || item.category === "armor") && up.secondary) {
    const extra = Math.max(0, lv - 5)
    for (const [k, v] of Object.entries(up.secondary)) out[k as keyof GearBonus] = (out[k as keyof GearBonus] || 0) + extra * (Number(v) || 0)
  }
  return out
}

// O que cada efeito faz (texto). Os números são os de meuMundoLife.js (a regra é
// do servidor; aqui só se descreve): whey ×1,25 e albumina ×1,15 na força do treino,
// pré-treino ×1,15 força e velocidade, creatina ×1,1 força, anabolizante ×2 força,
// estimulante ×1,15 no estudo, multivitamínico ×1,3 na saúde (×1,7 com creatina).
function effectLine(id: string, t: Tr) {
  return (
    {
      albumin: t("lkFxAlbumin", "Treino rende 15% mais força."),
      whey: t("lkFxWhey", "Treino rende 25% mais força."),
      preworkout: t("lkFxPreworkout", "Treino rende 15% mais força e velocidade; a energia cai mais devagar."),
      creatine: t("lkFxCreatine", "Treino rende 10% mais força. Com multivitamínico, a saúde volta mais rápido."),
      multivit: t("lkFxMultivit", "A saúde volta 30% mais rápido (70% com creatina)."),
      calm: t("lkFxCalm", "O estresse sobe pela metade."),
      coffee: t("lkFxCoffee", "A energia cai mais devagar."),
      energy_drink: t("lkFxEnergyDrink", "A energia cai mais devagar."),
      stim: t("lkFxStim", "Estudo rende 15% mais; não deixa dormir. Pesa no Desgaste."),
      anabolic: t("lkFxAnabolic", "Força no treino em dobro e cresce mais rápido. A fertilidade cai e pesa no Desgaste."),
      injury: t("lkFxInjury", "Fora do hospital, a saúde volta pela metade."),
    } as Record<string, string>
  )[id] ?? ""
}

/** Quanto os efeitos ativos aceleram o ganho de cada atributo no treino/estudo. */
function trainingPace(effects: Set<string>): Partial<Record<PowerAttr, number>> {
  const protein = effects.has("whey") ? 1.25 : effects.has("albumin") ? 1.15 : 1
  const pre = effects.has("preworkout") ? 1.15 : 1
  return {
    strength: protein * pre * (effects.has("creatine") ? 1.1 : 1) * (effects.has("anabolic") ? 2 : 1),
    speed: pre,
    intelligence: effects.has("stim") ? 1.15 : 1,
  }
}

const hours = (h: number, t: Tr) =>
  h >= 48 ? t("lkDays", "{n} d").replace("{n}", String(Math.round(h / 24))) : h >= 1 ? t("lkHours", "{n} h").replace("{n}", String(Math.round(h))) : t("lkMinutes", "{n} min").replace("{n}", String(Math.max(1, Math.round(h * 60))))
const signed = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v))

function H({ children }: { children: ReactNode }) {
  return (
    <span className={`${teko.className} whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.03em]`} style={{ color: EVO.mudo }}>
      {children}
    </span>
  )
}
function Small({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <p className={`${archivo.className} text-[13px] leading-snug`} style={{ color: tone ?? EVO.mudo }}>
      {children}
    </p>
  )
}

// ─── Equipado ────────────────────────────────────────────────────────────────
export function Equipped({ data, t }: { data: LoadoutData; t: Tr }) {
  if (!data.gear) return <Small>{t("lkGearLoading", "Carregando o equipamento…")}</Small>
  const { catalog, bag } = data.gear
  const byId = new Map(catalog.items.map((i) => [i.id, i]))
  const any = SLOTS.some((s) => bag.equipped[s])
  return (
    <div className="grid gap-2">
      {SLOTS.map((s) => {
        const id = bag.equipped[s]
        const item = id ? byId.get(id) : null
        const lv = id ? bag.owned[id]?.level || 0 : 0
        const b = item ? pieceBonus(item, lv, catalog.upgrade) : {}
        const r = item ? RARITY[item.rarity] : null
        return (
          <div key={s} className="border-b pb-2" style={{ borderColor: EVO.linha }}>
            <div className="flex items-baseline justify-between gap-2">
              <H>{slotName(s, t)}</H>
              {item ? (
                <span className={`${archivo.className} min-w-0 truncate text-[15px] font-semibold`} style={{ color: r?.color ?? EVO.branco }}>
                  {nameOf(item, t)}
                  {lv > 0 ? ` +${lv}` : ""}
                </span>
              ) : (
                <span className={`${archivo.className} text-[14px]`} style={{ color: EVO.mudo }}>
                  {t("lkEmpty", "vazio")}
                </span>
              )}
            </div>
            {item && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {BONUS_KEYS.filter((k) => b[k]).map((k) => (
                  <Tag key={k} tone="bom">
                    {bonusName(k, t)} +{percentage(b[k] || 0)}
                  </Tag>
                ))}
                {!BONUS_KEYS.some((k) => b[k]) && <Tag tone="mudo">{t("lkNoBonus", "sem bônus")}</Tag>}
              </div>
            )}
          </div>
        )
      })}
      <div className="pt-1">
        <H>{t("lkGearTotal", "Total com teto")}</H>
        <div className="mt-1 grid gap-1.5">
          {BONUS_KEYS.map((k) => {
            const v = bag.bonus?.[k] || 0
            const cap = catalog.cap?.[k] || 0
            return (
              <div key={k} className="flex items-center gap-3">
                <span className={`${archivo.className} w-28 shrink-0 text-[13px] font-semibold`} style={{ color: EVO.branco }}>
                  {bonusName(k, t)}
                </span>
                <div className="flex-1">
                  <Bar value={v} max={cap || 1} color={v >= cap && cap > 0 ? EVO.ambar : EVO.bom} height={6} />
                </div>
                <span className={`${teko.className} w-24 shrink-0 text-right text-[17px] tabular-nums`} style={{ color: v >= cap && cap > 0 ? EVO.ambar : EVO.branco }}>
                  {percentage(v)} / {percentage(cap)}
                </span>
              </div>
            )
          })}
        </div>
        {!any && <Small>{t("lkGearNone", "Nada equipado. O Armeiro e a Forja do Arsenal vendem e fazem as peças.")}</Small>}
      </div>
    </div>
  )
}

// ─── Ativos ──────────────────────────────────────────────────────────────────
/** D9 (apresentação 05): os remédios saíram do jogo; um efeito que ainda corria quando o servidor mudou não aparece. */
const RETIRED_FX = new Set(["metformin", "losartan"])
export const shownEffects = (life: LifeFull) => life.character.effects.filter((e) => !RETIRED_FX.has(e.id))
export function Active({ life, t }: { life: LifeFull; t: Tr }) {
  const fx = shownEffects(life)
  if (!fx.length) return <Small>{t("lkNoEffects", "Nenhum suplemento, remédio, estimulante ou lesão agindo agora.")}</Small>
  const total = new Map<string, number>()
  for (const it of life.catalog.items) {
    const e = (it as unknown as { effect?: { id: string; hours: number } | null }).effect
    if (e && e.id && !total.has(e.id)) total.set(e.id, e.hours)
  }
  return (
    <div className="grid gap-2">
      {fx.map((e) => {
        const max = Math.max(e.remainingH, total.get(e.id) ?? e.remainingH)
        const bad = e.id === "injury"
        return (
          <div key={e.id} className="border-b pb-2" style={{ borderColor: EVO.linha }}>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`${teko.className} text-[19px] font-semibold uppercase tracking-[0.1em]`} style={{ color: bad ? "#ff7b86" : EVO.branco }}>
                {effectLabel(e.id, t)}
              </span>
              <span className={`${archivo.className} text-[13px] font-semibold`} style={{ color: EVO.douradoClaro }}>
                {t("lkLeft", "falta {h}").replace("{h}", hours(e.remainingH, t))}
              </span>
            </div>
            <Bar value={e.remainingH} max={max || 1} color={bad ? EVO.perigo : EVO.ambar} height={5} />
            <Small>{effectLine(e.id, t)}</Small>
          </div>
        )
      })}
    </div>
  )
}

export function effectLabel(id: string, t: Tr) {
  return (
    {
      albumin: t("effAlbumin", "Albumina"),
      whey: t("effWhey", "Whey protein"),
      preworkout: t("effPreworkout", "Pré-treino"),
      creatine: t("effCreatine", "Creatina"),
      multivit: t("effMultivit", "Multivitamínico"),
      calm: t("effCalm", "Calmante"),
      coffee: t("effCoffee", "Café"),
      energy_drink: t("effEnergyDrink", "Energético"),
      stim: t("effStim", "Estimulante"),
      anabolic: t("effAnabolic", "Anabolizante"),
      injury: t("effInjury", "Lesão do boxe"),
    } as Record<string, string>
  )[id] ?? id
}

// ─── De onde vem cada atributo ───────────────────────────────────────────────
const ATTR_LOOK: Record<PowerAttr, [ReactNode, string, string, string]> = {
  strength: [<Dumbbell key="i" className="h-4 w-4" />, EVO.perigo, "atStrength", "Força"],
  speed: [<Wind key="i" className="h-4 w-4" />, EVO.bom, "atSpeed", "Velocidade"],
  dexterity: [<Crosshair key="i" className="h-4 w-4" />, "#3FE6D2", "attrDexterity", "Destreza"],
  intelligence: [<Brain key="i" className="h-4 w-4" />, EVO.azul, "atIntelligence", "Inteligência"],
  accuracy: [<LocateFixed key="i" className="h-4 w-4" />, "#FFAD24", "attrAccuracy", "Acurácia"],
}

function Origins({ life, adv, t }: { life: LifeFull; adv: AdvXp | null | undefined; t: Tr }) {
  const at = life.character.attributes as unknown as Record<string, number> & { floors?: Record<string, number> }
  const lvAttr = adv ? heroLevelScale(adv.level).attr : 0
  const pace = trainingPace(new Set(life.character.effects.map((e) => e.id)))
  return (
    <div>
      <div className={`grid grid-cols-[minmax(0,1fr)_42px_36px_40px_46px] items-baseline gap-x-2 border-b pb-1`} style={{ borderColor: EVO.linha }}>
        <H>{t("lkAttr", "Atributo")}</H>
        <H>{t("lkTrained", "Treino")}</H>
        <H>{t("lkFloor", "Piso")}</H>
        <H>{t("lkLevelFight", "Nível*")}</H>
        <H>{t("lkPace", "Ritmo")}</H>
      </div>
      {POWER_ATTRS.map((k) => {
        const [icon, color, key, fb] = ATTR_LOOK[k]
        const v = Number(at[k]) || 0
        const floor = Number(at.floors?.[k]) || 0
        // O bônus do nível vale para força/velocidade/inteligência/destreza na luta; a acurácia (B7) a luta ainda não usa.
        const lv = k === "accuracy" ? 0 : lvAttr
        const p = pace[k] ?? 1
        return (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_42px_36px_40px_46px] items-center gap-x-2 border-b py-1.5" style={{ borderColor: EVO.linha }}>
            <span className="flex min-w-0 items-center gap-2">
              <Ring color={color} size={24}>
                {icon}
              </Ring>
              <span className={`${teko.className} truncate text-[16px] font-semibold uppercase tracking-[0.03em]`} style={{ color: EVO.branco }}>
                {t(key, fb)}
              </span>
            </span>
            <span className={`${teko.className} text-[20px] font-bold tabular-nums`} style={{ color: EVO.branco }}>
              {Math.round(v)}
            </span>
            <span className={`${teko.className} text-[18px] tabular-nums`} style={{ color: EVO.douradoClaro }}>
              {Math.round(floor)}
            </span>
            <span className={`${teko.className} text-[18px] tabular-nums`} style={{ color: lv ? "#FFD23F" : EVO.mudo }}>
              {lv ? signed(lv) : "—"}
            </span>
            <span className={`${teko.className} text-[18px] tabular-nums`} style={{ color: p > 1 ? EVO.bom : EVO.mudo }}>
              {p > 1 ? `×${(Math.round(p * 100) / 100).toLocaleString()}` : "—"}
            </span>
          </div>
        )
      })}
      <div className="mt-1.5 grid gap-1">
        <Small>{t("lkOriginNote1", "Treino = o valor que fica (é o que entra no Poder). Piso = o que não se perde mais.")}</Small>
        <Small>{t("lkOriginNote2", "*Nível = bônus do nível de aventura, só dentro da luta. Ritmo = quanto os efeitos ativos aceleram o treino; efeito não muda o valor.")}</Small>
      </div>
    </div>
  )
}

// ─── Ficha de luta: base, nível e equipamento ────────────────────────────────
function FightSheet({ life, adv, gear, t }: { life: LifeFull; adv: AdvXp; gear: Partial<GearBonus> | null; t: Tr }) {
  const a = life.character.attributes
  const stats = { strength: a.strength, speed: a.speed, intelligence: a.intelligence, dexterity: a.dexterity ?? 0 }
  const base = heroSheet(life.avatar, 1, stats)
  const leveled = heroSheet(life.avatar, adv.level, stats)
  const full = heroSheet(life.avatar, adv.level, stats, gear || undefined)
  const rows: [keyof typeof full, string, string, string][] = [
    ["hp", t("stHpLong", "Vida (HP)"), "#FF3B4E", ""],
    ["atk", t("stAttack", "Ataque"), "#FF9F45", ""],
    ["def", t("stDefense", "Defesa"), "#8FB8FF", ""],
    ["acc", t("lkAcc", "Acuracidade"), "#FFAD24", ""],
    ["spd", t("atSpeed", "Velocidade"), EVO.bom, ""],
  ]
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_42px_42px_44px_50px] items-baseline gap-x-2 border-b pb-1" style={{ borderColor: EVO.linha }}>
        <H>{t("lkStat", "Status")}</H>
        <H>{t("lkBase", "Base")}</H>
        <H>{t("lkLevel", "Nível")}</H>
        <H>{t("lkGear", "Equip.")}</H>
        <H>{t("lkTotal", "Total")}</H>
      </div>
      {rows.map(([k, label, color]) => {
        const b = base[k]
        const l = leveled[k] - base[k]
        const g = full[k] - leveled[k]
        return (
          <div key={k} className="grid grid-cols-[minmax(0,1fr)_42px_42px_44px_50px] items-center gap-x-2 border-b py-1.5" style={{ borderColor: EVO.linha }}>
            <span className={`${teko.className} truncate text-[17px] font-semibold uppercase tracking-[0.04em]`} style={{ color }}>
              {label}
            </span>
            <span className={`${teko.className} text-[18px] tabular-nums`} style={{ color: EVO.branco }}>
              {Math.round(b)}
            </span>
            <span className={`${teko.className} text-[18px] tabular-nums`} style={{ color: Math.round(l) ? "#FFD23F" : EVO.mudo }}>
              {Math.round(l) ? signed(l) : "—"}
            </span>
            <span className={`${teko.className} text-[18px] tabular-nums`} style={{ color: Math.round(g) ? EVO.bom : EVO.mudo }}>
              {Math.round(g) ? signed(g) : "—"}
            </span>
            <span className={`${teko.className} text-[21px] font-bold tabular-nums`} style={{ color: EVO.branco }}>
              {Math.round(full[k])}
            </span>
          </div>
        )
      })}
      <div className="mt-1.5">
        <Small>{t("lkSheetNote", "Base = o peso do personagem vestido sobre o treino. O nível de aventura e o equipamento somam por cima. Suplemento não entra na luta.")}</Small>
      </div>
    </div>
  )
}

// ─── Poder (B7) ──────────────────────────────────────────────────────────────
function PowerParts({ life, adv, gear, t }: { life: LifeFull; adv: AdvXp; gear: Partial<GearBonus> | null; t: Tr }) {
  const locale = useLocale()
  const attrs = life.character.attributes as unknown as Partial<Record<PowerAttr, number>>
  const { total, parts } = powerScore({ heroLevelScale }, { attrs, level: adv.level, gear })
  const saved = life.character.power
  const rows: [string, number, string][] = [
    ...POWER_ATTRS.map((k) => [t(ATTR_LOOK[k][2], ATTR_LOOK[k][3]), parts[k], ATTR_LOOK[k][1]] as [string, number, string]),
    [t("lkPowerHp", "HP máx. do nível {n}").replace("{n}", String(adv.level)), parts.hp, "#FF3B4E"],
    [t("lkPowerGear", "Equipamento (1% = 10)"), parts.gear, EVO.bom],
  ]
  const top = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <div>
      <div className="grid gap-1">
        {rows.map(([label, v, color]) => (
          <div key={label} className="grid grid-cols-[1fr_minmax(60px,1fr)_56px] items-center gap-2">
            <span className={`${archivo.className} truncate text-[13px] font-semibold`} style={{ color: EVO.branco }}>
              {label}
            </span>
            <Bar value={v} max={top} color={color} height={6} />
            <span className={`${teko.className} text-right text-[18px] tabular-nums`} style={{ color: EVO.branco }}>
              {v.toLocaleString(locale)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: EVO.linha }}>
        <span className="flex items-center gap-2">
          <Zap className="h-5 w-5" style={{ color: "#FFD23F" }} />
          <span className={`${teko.className} text-[20px] font-semibold uppercase tracking-[0.14em]`} style={{ color: "#FFE9B8" }}>
            {t("stPower", "PODER")}
          </span>
        </span>
        <span className={`${teko.className} text-[30px] font-bold tabular-nums leading-none`} style={{ color: "#FFD23F" }}>
          {total.toLocaleString(locale)}
        </span>
      </div>
      {saved != null && Math.abs(saved - total) > 1 && (
        <Small tone={EVO.douradoClaro}>{t("lkPowerSaved", "O ranking mostra {n}: o servidor regrava a cada mudança da vida.").replace("{n}", saved.toLocaleString(locale))}</Small>
      )}
      <Small>{t("lkPowerNote", "Só o permanente: suplemento, fome, sono e efeito temporário nunca entram no Poder.")}</Small>
    </div>
  )
}

// ─── Personagem (B3) ─────────────────────────────────────────────────────────
function Character({ data, t }: { data: LoadoutData; t: Tr }) {
  const list = data.chars?.characters.list ?? []
  const c = list.find((x) => x.status === "alive") ?? null
  if (!data.chars) return <Small>{t("lkCharLoading", "Carregando o personagem…")}</Small>
  if (!c) return <Small>{t("lkCharNone", "Nenhum personagem ativo.")}</Small>
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`${teko.className} truncate text-[22px] font-semibold uppercase tracking-[0.08em]`} style={{ color: EVO.branco }}>
          {c.petName || speciesName(c.species, t)}
        </span>
        <span className={`${archivo.className} shrink-0 text-[13px] font-semibold`} style={{ color: EVO.douradoClaro }}>
          {c.serialText}
        </span>
      </div>
      <Small tone={EVO.branco}>
        {speciesName(c.species, t)} · {c.sex === "f" ? t("chFemale", "fêmea") : t("chMale", "macho")} · {c.adult ? t("lkAdult", "adulto") : t("lkYoung", "jovem")} ·{" "}
        {t("lkActiveDays", "{n} dias ativos").replace("{n}", String(Math.round(c.activeDays)))}
      </Small>
      <a
        href={`/meu-mundo/certificado/${encodeURIComponent(c.certCode)}`}
        target="_blank"
        rel="noopener"
        className={`${archivo.className} inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold`}
        style={{ color: EVO.dourado }}
      >
        <ScrollText className="h-4 w-4" />
        {t("lkCertificate", "Ver certificado")}
      </a>
    </div>
  )
}

// ─── a página ────────────────────────────────────────────────────────────────
export function LoadoutPage({ life, adv, data, compact, t }: { life: LifeFull; adv?: AdvXp | null; data: LoadoutData; compact: boolean; t: Tr }) {
  const gear = data.gear?.bag.bonus ?? null
  const equipped = (
    <Plate title={t("lkEquipped", "Equipado")}>
      <Equipped data={data} t={t} />
    </Plate>
  )
  const active = (
    <Plate title={t("lkActive", "Efeitos ativos")}>
      <Active life={life} t={t} />
    </Plate>
  )
  const origins = (
    <Plate title={t("lkOrigins", "De onde vem cada atributo")}>
      <Origins life={life} adv={adv} t={t} />
    </Plate>
  )
  const sheet = adv ? (
    <Plate title={t("lkSheet", "Ficha de luta")} aside={<span className={`${archivo.className} text-[13px]`} style={{ color: "#FFD23F" }}>{t("hudLevel", "Nv. {n}").replace("{n}", String(adv.level))}</span>}>
      <FightSheet life={life} adv={adv} gear={gear} t={t} />
    </Plate>
  ) : null
  const power = adv ? (
    <Plate title={t("lkPower", "Poder, parcela por parcela")}>
      <PowerParts life={life} adv={adv} gear={gear} t={t} />
    </Plate>
  ) : null
  const character = (
    <Plate title={t("lkCharacter", "Personagem")}>
      <Character data={data} t={t} />
    </Plate>
  )
  if (compact)
    return (
      <div className="flex flex-col gap-2 pb-2">
        {character}
        {power}
        {equipped}
        {active}
        {origins}
        {sheet}
      </div>
    )
  return (
    <div className="grid h-full grid-cols-3 gap-4 overflow-y-auto pr-1">
      <div className="flex flex-col gap-4">
        {equipped}
        {active}
      </div>
      <div className="flex flex-col gap-4">
        {origins}
        {sheet}
      </div>
      <div className="flex flex-col gap-4">
        {power}
        {character}
      </div>
    </div>
  )
}
