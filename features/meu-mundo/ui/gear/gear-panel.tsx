"use client"

// features/meu-mundo/ui/gear/gear-panel.tsx — mm3d-59: MOCHILA, ARMEIRO e FORJA.
//
// Tudo em cards no carrossel do kit (ui/kit/), fundo opaco, imagem (ou o
// placeholder da categoria) em todo item. O servidor confere tudo (nível,
// classe, posse, moedas, materiais) e cada compra/forja leva uma chave
// gerada no clique — clicar duas vezes não cobra duas vezes. A interface só
// mostra o que o servidor devolveu.

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import {
  buyGear,
  equipGear,
  forgeGear,
  getGear,
  recycleGear,
  upgradeGear,
  type GearBag,
  type GearCatalog,
  type GearItem,
  type GearRecipe,
  type GearSlot,
  type Receipt,
  type ApiResult,
} from "../../data"
import { AetherModal, AetherButton } from "../kit/aether-modal"
import { AetherCarousel, AetherTabs, type CarouselItem } from "../kit/aether-carousel"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { AE, RARITY, chamfer } from "../kit/aether-tokens"
import { teko } from "../status/evo-skin"

type Tab = "bag" | "armory" | "forge"
type T = (k: string, f: string) => string

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

/** Bônus em texto ("+5% dano"). */
function bonusLines(b: GearItem["bonus"], t: T): string[] {
  if (!b) return []
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const out: string[] = []
  if (b.dmg) out.push(t("gearBonusDmg", "+{v} dano").replace("{v}", pct(b.dmg)))
  if (b.def) out.push(t("gearBonusDef", "+{v} defesa").replace("{v}", pct(b.def)))
  if (b.stam) out.push(t("gearBonusStam", "−{v} fôlego gasto").replace("{v}", pct(b.stam)))
  if (b.warn) out.push(t("gearBonusWarn", "+{v} tempo de aviso").replace("{v}", pct(b.warn)))
  if (b.power) out.push(t("gearBonusPower", "+{v} carga do poder").replace("{v}", pct(b.power)))
  return out
}

const nameOf = (it: GearItem, t: T) => t(`gear_${it.id}`, it.name)
const catOf = (it: GearItem): ItemCategory => it.category as ItemCategory

/** A peça comum de todo card de item: imagem, nome, raridade, linhas. */
function ItemCard({ it, t, sub, lines, children }: { it: GearItem; t: T; sub?: string; lines?: string[]; children?: React.ReactNode }) {
  const r = RARITY[it.rarity]
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <ItemImage category={catOf(it)} rarity={it.rarity} alt={nameOf(it, t)} ratio={4 / 3} />
      <div className="flex items-start justify-between gap-2">
        <h4 className={`${teko.className} text-[24px] font-semibold uppercase leading-[0.95]`} style={{ color: AE.text }}>
          {nameOf(it, t)}
        </h4>
        <span className="mt-0.5 shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: r.color, boxShadow: `inset 0 0 0 1px ${r.color}` }}>
          {t(r.labelKey, r.label)}
        </span>
      </div>
      {sub && (
        <p className="text-[12px] leading-tight" style={{ color: AE.muted }}>
          {sub}
        </p>
      )}
      {!!lines?.length && (
        <ul className="grid gap-0.5 text-[13px] font-semibold" style={{ color: AE.aether }}>
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <div className="mt-auto grid gap-1.5">{children}</div>
    </div>
  )
}

export default function GearPanel({ onClose, initialTab = "bag", onReceipt }: { onClose: () => void; initialTab?: Tab; onReceipt?: (r: Receipt) => void }) {
  const t = useTranslations("MeuMundo") as T
  const [tab, setTab] = useState<Tab>(initialTab)
  const [cat, setCat] = useState<GearCatalog | null>(null)
  const [bag, setBag] = useState<GearBag | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState(false)

  const load = useCallback(async () => {
    const tk = getToken()
    if (!tk) return setErr(true)
    const r = await getGear(tk)
    if (!r.ok) return setErr(true)
    setCat(r.data.gear)
    setBag(r.data.bag)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const byId = useMemo(() => new Map((cat?.items || []).map((i) => [i.id, i])), [cat])

  /** Roda uma operação do servidor (a chave é gerada aqui, uma por clique confirmado). */
  const act = useCallback(
    async (id: string, fn: (tk: string, key: string) => Promise<ApiResult<{ bag: GearBag; receipt?: Receipt; replay?: boolean }>>, ok?: string) => {
      const tk = getToken()
      if (!tk || busy) return
      setBusy(id)
      setMsg(null)
      const r = await fn(tk, newKey())
      setBusy(null)
      setConfirm(null)
      if (!r.ok) return setMsg(r.error || t("gearFail", "Não deu certo. Tente de novo."))
      setBag(r.data.bag)
      if (ok) setMsg(ok)
      if (r.data.receipt && !r.data.replay) onReceipt?.(r.data.receipt)
    },
    [busy, onReceipt, t],
  )

  const equippedIn = (id: string) => (bag ? (Object.entries(bag.equipped).find(([, v]) => v === id)?.[0] as GearSlot | undefined) : undefined)
  const levelLock = (it: GearItem) => (bag && bag.level < it.level ? t("gearNeedLevel", "Precisa do nível {n}").replace("{n}", String(it.level)) : null)
  const clanLock = (it: GearItem) => (bag && it.clan && bag.clan && it.clan !== bag.clan ? t("gearOtherClan", "Arma de outra classe") : null)
  /** Comparação com o que está equipado no mesmo slot. */
  const compare = (it: GearItem): string | null => {
    if (!bag || !it.bonus) return null
    const slot = it.category === "weapon" ? "weapon" : it.category === "armor" ? "armor" : null
    if (!slot) return null
    const cur = bag.equipped[slot] ? byId.get(bag.equipped[slot]!) : null
    if (!cur || cur.id === it.id) return null
    const k = it.category === "weapon" ? "dmg" : "def"
    const d = (it.bonus[k] || 0) - (cur.bonus?.[k] || 0)
    if (!d) return null
    return t("gearCompare", "{d} em relação a {name}").replace("{d}", `${d > 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)}%`).replace("{name}", nameOf(cur, t))
  }

  // ── cards ──
  const bagItems: CarouselItem[] = useMemo(() => {
    if (!bag || !cat) return []
    return cat.items
      .filter((it) => bag.owned[it.id])
      .map((it) => {
        const own = bag.owned[it.id]
        const slot = equippedIn(it.id)
        const slots: GearSlot[] = it.category === "weapon" ? ["weapon"] : it.category === "armor" ? ["armor"] : it.category === "accessory" ? ["acc1", "acc2"] : []
        const lock = levelLock(it) || clanLock(it)
        return {
          key: it.id,
          label: nameOf(it, t),
          render: () => (
            <ItemCard
              it={it}
              t={t}
              sub={[it.stack ? `×${own.qty}` : null, own.level ? t("gearUpgraded", "Aprimorado +{n}").replace("{n}", String(own.level)) : null, slot ? t("gearEquipped", "Equipado") : null].filter(Boolean).join(" · ")}
              lines={bonusLines(it.bonus, t)}
            >
              {lock && <p className="text-[12px] font-semibold" style={{ color: AE.bad }}>{lock}</p>}
              {!!slots.length &&
                (slot ? (
                  <AetherButton tone="secondary" busy={busy === it.id} onClick={() => void act(it.id, (tk) => equipGear(tk, slot, null))}>
                    {t("gearUnequip", "Tirar")}
                  </AetherButton>
                ) : (
                  <AetherButton
                    disabled={!!lock}
                    busy={busy === it.id}
                    onClick={() => {
                      const free = slots.find((s) => !bag.equipped[s]) || slots[0]
                      void act(it.id, (tk) => equipGear(tk, free, it.id), t("gearEquippedOk", "Equipado!"))
                    }}
                  >
                    {t("gearEquip", "Equipar")}
                  </AetherButton>
                ))}
              {it.category === "material" && (
                <p className="text-[12px]" style={{ color: AE.muted }}>
                  {t("gearMaterialUse", "Material da forja. Recicle o que sobrar por {c} moedas cada.").replace("{c}", String(it.sell))}
                </p>
              )}
            </ItemCard>
          ),
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bag, cat, busy, t])

  const armoryItems: CarouselItem[] = useMemo(() => {
    if (!bag || !cat) return []
    return cat.items
      .filter((it) => it.price != null)
      .map((it) => {
        const owned = !!bag.owned[it.id]
        const lock = levelLock(it) || clanLock(it)
        const poor = bag.coins < (it.price || 0)
        const asking = confirm === it.id
        const cmp = compare(it)
        return {
          key: it.id,
          label: nameOf(it, t),
          render: () => (
            <ItemCard it={it} t={t} sub={t("gearPrice", "{p} moedas").replace("{p}", String(it.price))} lines={[...bonusLines(it.bonus, t), ...(cmp ? [cmp] : [])]}>
              {owned && !it.stack ? (
                <p className="text-[13px] font-bold" style={{ color: AE.good }}>{t("gearOwned", "Já é seu")}</p>
              ) : lock ? (
                <p className="text-[12px] font-semibold" style={{ color: AE.bad }}>{lock}</p>
              ) : poor ? (
                <p className="text-[12px] font-semibold" style={{ color: AE.bad }}>{t("gearPoor", "Moedas insuficientes")}</p>
              ) : asking ? (
                <div className="grid grid-cols-2 gap-1.5">
                  <AetherButton tone="secondary" onClick={() => setConfirm(null)}>
                    {t("gearCancel", "Voltar")}
                  </AetherButton>
                  <AetherButton busy={busy === it.id} onClick={() => void act(it.id, (tk, key) => buyGear(tk, it.id, key), t("gearBought", "Comprado! Está na mochila."))}>
                    {t("gearConfirm", "Confirmar")}
                  </AetherButton>
                </div>
              ) : (
                <AetherButton onClick={() => setConfirm(it.id)}>{t("gearBuy", "Comprar")}</AetherButton>
              )}
            </ItemCard>
          ),
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bag, cat, busy, confirm, t])

  const forgeItems: CarouselItem[] = useMemo(() => {
    if (!bag || !cat) return []
    const recipes = cat.recipes.map((rc: GearRecipe) => {
      const out = byId.get(rc.out)!
      const missingRecipe = rc.recipe && !bag.owned[rc.recipe]
      const lack = Object.entries(rc.needs).filter(([m, n]) => (bag.owned[m]?.qty || 0) < n)
      const lockLv = bag.level < rc.level
      const lines = Object.entries(rc.needs).map(([m, n]) => `${byId.get(m) ? nameOf(byId.get(m)!, t) : m}: ${bag.owned[m]?.qty || 0}/${n}`)
      return {
        key: rc.id,
        label: nameOf(out, t),
        render: () => (
          <ItemCard it={out} t={t} sub={t("gearForgeCost", "Forjar: {c} moedas + materiais").replace("{c}", String(rc.coins))} lines={lines}>
            {lockLv ? (
              <p className="text-[12px] font-semibold" style={{ color: AE.bad }}>{t("gearNeedLevel", "Precisa do nível {n}").replace("{n}", String(rc.level))}</p>
            ) : missingRecipe ? (
              <p className="text-[12px] font-semibold" style={{ color: AE.bad }}>{t("gearNeedRecipe", "Falta aprender a receita")}</p>
            ) : (
              <AetherButton disabled={!!lack.length || bag.coins < rc.coins} busy={busy === rc.id} onClick={() => void act(rc.id, (tk, key) => forgeGear(tk, rc.id, key), t("gearForged", "Forjado!"))}>
                {lack.length ? t("gearLack", "Faltam materiais") : t("gearForge", "Forjar")}
              </AetherButton>
            )}
          </ItemCard>
        ),
      }
    })
    const ups = cat.items
      .filter((it) => bag.owned[it.id] && (it.category === "weapon" || it.category === "armor"))
      .map((it) => {
        const lv = bag.owned[it.id].level
        const max = lv >= cat.upgrade.max
        return {
          key: `up-${it.id}`,
          label: `${t("gearUpgrade", "Aprimorar")} ${nameOf(it, t)}`,
          render: () => (
            <ItemCard
              it={it}
              t={t}
              sub={t("gearUpgradeLv", "Aprimoramento {n} de {max}").replace("{n}", String(lv)).replace("{max}", String(cat.upgrade.max))}
              lines={[it.category === "weapon" ? t("gearUpDmg", "+2% de dano por nível") : t("gearUpDef", "+1,5% de defesa por nível")]}
            >
              <AetherButton disabled={max} busy={busy === `up-${it.id}`} onClick={() => void act(`up-${it.id}`, (tk, key) => upgradeGear(tk, it.id, key), t("gearUpgradedOk", "Aprimorado!"))}>
                {max ? t("gearMax", "No máximo") : t("gearUpgrade", "Aprimorar")}
              </AetherButton>
            </ItemCard>
          ),
        }
      })
    const recycle = cat.items
      .filter((it) => it.category === "material" && (bag.owned[it.id]?.qty || 0) > 0)
      .map((it) => ({
        key: `rc-${it.id}`,
        label: `${t("gearRecycle", "Reciclar")} ${nameOf(it, t)}`,
        render: () => (
          <ItemCard it={it} t={t} sub={`×${bag.owned[it.id].qty}`} lines={[t("gearRecycleEach", "{c} moedas cada").replace("{c}", String(it.sell))]}>
            <AetherButton tone="secondary" busy={busy === `rc-${it.id}`} onClick={() => void act(`rc-${it.id}`, (tk, key) => recycleGear(tk, it.id, 1, key))}>
              {t("gearRecycleOne", "Reciclar 1")}
            </AetherButton>
          </ItemCard>
        ),
      }))
    return [...recipes, ...ups, ...recycle]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bag, cat, busy, byId, t])

  const items = tab === "bag" ? bagItems : tab === "armory" ? armoryItems : forgeItems
  return (
    <AetherModal
      eyebrow={bag ? t("gearHeader", "Nível {lv} · {c} moedas").replace("{lv}", String(bag.level)).replace("{c}", String(bag.coins)) : undefined}
      title={t("gearTitle", "Equipamento")}
      onClose={onClose}
      width={640}
    >
      <AetherTabs<Tab>
        label={t("gearTitle", "Equipamento")}
        value={tab}
        onChange={(v) => {
          setTab(v)
          setConfirm(null)
          setMsg(null)
        }}
        tabs={[
          { id: "bag", label: t("gearTabBag", "Mochila") },
          { id: "armory", label: t("gearTabArmory", "Armeiro") },
          { id: "forge", label: t("gearTabForge", "Forja") },
        ]}
      />
      {!cat || !bag ? (
        <div className="grid h-48 place-items-center" style={{ color: AE.muted }}>
          {err ? t("gearLoadFail", "Não foi possível abrir o equipamento.") : <Loader2 className="h-6 w-6 animate-spin" aria-label={t("gearLoading", "Carregando…")} />}
        </div>
      ) : (
        <>
          {tab === "bag" && (
            <div className="mb-3 grid grid-cols-4 gap-1.5" aria-label={t("gearSlots", "Equipado agora")}>
              {(["weapon", "armor", "acc1", "acc2"] as GearSlot[]).map((s) => {
                const it = bag.equipped[s] ? byId.get(bag.equipped[s]!) : null
                return (
                  <div key={s} className="p-1" style={{ background: AE.well, clipPath: chamfer(AE.cut.chip) }} title={it ? nameOf(it, t) : t("gearEmpty", "Vazio")}>
                    <ItemImage category={it ? catOf(it) : s === "weapon" ? "weapon" : s === "armor" ? "armor" : "accessory"} rarity={it?.rarity || "common"} alt={it ? nameOf(it, t) : t("gearEmpty", "Vazio")} />
                    <p className="mt-1 truncate text-center text-[10px] font-semibold uppercase" style={{ color: it ? AE.text : AE.dim }}>
                      {it ? nameOf(it, t) : t("gearEmpty", "Vazio")}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
          <AetherCarousel
            key={tab}
            title={tab === "bag" ? t("gearTabBag", "Mochila") : tab === "armory" ? t("gearTabArmory", "Armeiro") : t("gearTabForge", "Forja")}
            items={items}
            empty={tab === "bag" ? t("gearBagEmpty", "Mochila vazia. Lute e jogue para ganhar materiais.") : t("gearNothing", "Nada por aqui ainda.")}
          />
          {msg && (
            <p role="status" className="mt-2 text-center text-[13px] font-semibold" style={{ color: AE.goldSoft }}>
              {msg}
            </p>
          )}
        </>
      )}
    </AetherModal>
  )
}
