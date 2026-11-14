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
import type { GearBag, GearCatalog, GearItem, GearSlot } from "../../data"
import type { CharactersResult, LifeFull } from "../../types"
import type { GearBonus } from "../../laminas/sim/fight"
import { RARITY } from "../kit/aether-tokens"
import { nameOf, percentage } from "../gear/gear-card"
import { Bar, EVO, Tag, archivo, teko } from "./evo-skin"

type Tr = (key: string, fallback: string) => string

export interface LoadoutData {
  gear: { catalog: GearCatalog; bag: GearBag } | null
  chars: CharactersResult | null
}

/** E6: os 8 slots (antes: arma, escudo, armadura e dois acessórios). */
const SLOTS: GearSlot[] = ["weapon", "offhand", "helm", "chest", "gloves", "boots", "amulet", "relic"]
/** E4: + as chaves proporcionais (hp, acc, spd, int, dex); linha zerada não aparece. */
const BONUS_KEYS: (keyof GearBonus)[] = ["dmg", "def", "hp", "acc", "spd", "int", "dex", "stam", "warn", "power"]

function slotName(s: GearSlot, t: Tr) {
  return {
    weapon: t("lkSlotWeapon", "Arma"),
    offhand: t("lkSlotOffhand", "Mão secundária"),
    helm: t("lkSlotHelm", "Cabeça"),
    chest: t("lkSlotChest", "Peito"),
    gloves: t("lkSlotGloves", "Mãos"),
    boots: t("lkSlotBoots", "Pés"),
    amulet: t("lkSlotAmulet", "Amuleto"),
    relic: t("lkSlotRelic", "Relíquia"),
  }[s]
}
function bonusName(k: keyof GearBonus, t: Tr) {
  return {
    dmg: t("lkBonusDmg", "Dano"),
    def: t("lkBonusDef", "Defesa"),
    stam: t("lkBonusStam", "Fôlego"),
    warn: t("lkBonusWarn", "Aviso"),
    power: t("lkBonusPower", "Poder máximo"),
    hp: t("lkBonusHp", "Vida"),
    acc: t("lkBonusAcc", "Acuracidade"),
    spd: t("lkBonusSpd", "Velocidade"),
    int: t("lkBonusInt", "Inteligência"),
    dex: t("lkBonusDex", "Destreza"),
  }[k]
}

/**
 * Bônus de UMA peça vestida (só para mostrar a parcela; o total que vale é o `bag.bonus`).
 * E7: vem pronto do servidor pela régua (`bag.pieces`, com o plus e o grau da cópia); sem
 * ele, o do catálogo (a cópia +0).
 */
function pieceBonus(bag: GearBag, slot: GearSlot, item: GearItem): Partial<GearBonus> {
  return bag.pieces?.[slot] ?? item.bonus ?? {}
}

/** E7: conjuntos com peça vestida → { set, n } (o "2/4" da tela de equipar). */
function wornSets(catalog: GearCatalog, bag: GearBag, byId: Map<string, GearItem>) {
  const count = new Map<string, number>()
  for (const s of SLOTS) {
    const it = bag.equipped[s] ? byId.get(bag.equipped[s] as string) : null
    if (it?.set) count.set(it.set, (count.get(it.set) || 0) + 1)
  }
  return (catalog.sets || []).filter((s) => count.has(s.id)).map((s) => ({ set: s, n: count.get(s.id) || 0 }))
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

const hours = (h: number, t: Tr) =>
  h >= 48 ? t("lkDays", "{n} d").replace("{n}", String(Math.round(h / 24))) : h >= 1 ? t("lkHours", "{n} h").replace("{n}", String(Math.round(h))) : t("lkMinutes", "{n} min").replace("{n}", String(Math.max(1, Math.round(h * 60))))
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
export function Equipped({ data, t, onPickSlot }: { data: LoadoutData; t: Tr; onPickSlot?: (slot: GearSlot) => void }) {
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
        const b = item ? pieceBonus(bag, s, item) : {}
        const r = item ? RARITY[item.rarity] : null
        return (
          <div key={s} className="border-b pb-2" style={{ borderColor: EVO.linha }}>
            <div className="flex items-baseline justify-between gap-2">
              {onPickSlot ? (
                // E6: tocar o slot abre a mochila filtrada por ele
                <button type="button" onClick={() => onPickSlot(s)} className="min-h-8 text-left underline-offset-2 hover:underline" aria-label={t("lkPickSlot", "Escolher peça para {slot}").replace("{slot}", slotName(s, t))}>
                  <H>{slotName(s, t)}</H>
                </button>
              ) : (
                <H>{slotName(s, t)}</H>
              )}
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
      {wornSets(catalog, bag, byId).map(({ set, n }) => {
        const step = set.steps[String(Math.min(4, n))] || 0
        return (
          <div key={set.id} className="flex items-baseline justify-between gap-2 border-b pb-2" style={{ borderColor: EVO.linha }}>
            <H>{t("gearSetLine", "Conjunto {name}").replace("{name}", t("gearSet_" + set.id, set.name))}</H>
            <span className={`${teko.className} text-[17px] tabular-nums`} style={{ color: step >= 1 ? EVO.ambar : step > 0 ? EVO.bom : EVO.mudo }}>
              {n}/{set.pieces.length}
              {" · "}
              {step > 0
                ? set.keys.map((k) => bonusName(k, t)).join(" + ") + " " + (step >= 1 ? t("lkSetFull", "inteiro") : t("lkSetPart", "{p}%").replace("{p}", String(Math.round(step * 100))))
                : t("lkSetNeed", "faltam {n} para somar").replace("{n}", String(2 - n))}
            </span>
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
