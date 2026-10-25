"use client"

// features/meu-mundo/ui/items/items-panel.tsx — a aba ITENS (mm3d-30): uma
// vitrine em slots com o que a pessoa TEM, lida das fontes reais (GET
// /inventory): geladeira, vestuário, veículos e casa. Não há estoque próprio
// desta tela — a unidade que a geladeira come é a mesma que aparece aqui.
//
// Slots: miniatura estática (nunca 3D), quantidade nos empilháveis, selo
// "Novo" no que chegou de presente, "Vestida" na skin em uso. Tocar abre a
// ficha com as ações que o jogo já permite: vestir (skins); comida/remédio
// se consome na geladeira de casa (a sala confere onde a pessoa está) — aqui
// só se diz onde. Sem vender, transferir nem descartar (não está nas regras).

import { useCallback, useEffect, useMemo, useState } from "react"
import { Gift, Home, Loader2, PackageOpen, RefreshCw, Search, Shirt } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getInventory, postSkinEquip } from "../../data"
import type { InventoryResult } from "../../types"
import { MM } from "../hud/tokens"
import { EvoButton, EvoDialog } from "../hud/hud-kit"
import { archivo } from "../status/evo-skin"
import { effectsOf } from "../fridge/fridge-logic"
import { effectText, toneColor } from "../fridge/shelf"
import { VehicleIcon } from "../meu-mundo-view"
import { GROUP_LABEL, buildSlots, groupsOf, slotName, type ItemGroup, type Slot } from "./item-catalog"

type Tr = (key: string, fallback: string) => string

export default function ItemsPanel({ onClose, onChanged }: { onClose: () => void; /** vestir mudou o avatar */ onChanged: () => void }) {
  const t = useTranslations("MeuMundo")
  const [data, setData] = useState<InventoryResult | null>(null)
  const [error, setError] = useState(false)
  const [group, setGroup] = useState<ItemGroup | "all" | "new">("all")
  const [query, setQuery] = useState("")
  const [pick, setPick] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setError(false)
    const r = await getInventory(token)
    if (r.ok) setData(r.data)
    else setError(true)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const slots = useMemo(() => (data ? buildSlots(data.inventory, data.items, data.fridge ?? {}) : []), [data])
  const groups = useMemo(() => groupsOf(slots), [slots])
  const hasNew = slots.some((s) => s.fresh)
  const q = query.trim().toLowerCase()
  const shown = slots.filter(
    (s) => (group === "all" || (group === "new" ? s.fresh : s.group === group)) && (!q || slotName(s, t).toLowerCase().includes(q)),
  )
  const selected = slots.find((s) => s.key === pick) ?? null

  const equip = async (id: string) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    const r = await postSkinEquip(token, id)
    setBusy(false)
    if (!r.ok) return setNotice(r.status === 0 ? t("levelNetError", "Sem conexão. Tente de novo.") : r.error)
    setData((d) => (d ? { ...d, inventory: { ...d.inventory, wardrobe: r.data.wardrobe } } : d))
    onChanged()
  }

  return (
    <EvoDialog fixed z="z-[78]" labelId="mm-items" eyebrow={t("itEyebrow", "Seus bens")} title={t("itTitle", "Itens")} onClose={onClose} width="max-w-2xl">
      {error ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center" style={{ color: MM.muted }} role="alert">
          {t("itLoadFail", "Não carregou seus itens.")}
          <EvoButton variant="gold" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
            {t("ibRetry", "Tentar de novo")}
          </EvoButton>
        </div>
      ) : !data ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="aspect-square rounded-[14px]" style={{ background: MM.card }} />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("itGroups", "Categorias")}>
              <GroupChip active={group === "all"} onClick={() => setGroup("all")} label={t("itAll", "Todos")} />
              {hasNew && <GroupChip active={group === "new"} onClick={() => setGroup("new")} label={t("itNew", "Novos")} icon={<Gift className="h-3.5 w-3.5" />} />}
              {groups.map((g) => (
                <GroupChip key={g} active={group === g} onClick={() => setGroup(g)} label={t(GROUP_LABEL[g][0], GROUP_LABEL[g][1])} />
              ))}
            </div>
            {slots.length > 8 && (
              <label className="flex h-9 w-full items-center gap-2 rounded-full px-3 sm:w-48" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${MM.border}` }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: MM.muted }} aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("itSearch", "Buscar")}
                  aria-label={t("itSearch", "Buscar")}
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#8d939c]"
                  style={{ color: MM.text }}
                />
              </label>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-[14px]" style={{ color: MM.muted }}>
              <PackageOpen className="h-8 w-8" style={{ color: MM.gold }} />
              {q ? t("itNoMatch", "Nada com esse nome.") : t("itEmpty", "Nada aqui ainda. O mercado do Status compra para a sua geladeira.")}
            </div>
          ) : (
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label={t("itTitle", "Itens")}>
              {shown.map((s) => (
                <li key={s.key}>
                  <SlotButton slot={s} t={t} active={pick === s.key} onClick={() => setPick(pick === s.key ? null : s.key)} />
                </li>
              ))}
            </ul>
          )}

          {selected && <SlotDetail slot={selected} t={t} busy={busy} onEquip={(id) => void equip(id)} />}
          {notice && (
            <p className="mt-2 text-[12px] font-semibold" style={{ color: MM.danger }} role="alert">
              {notice}
            </p>
          )}
          <p className="mt-3 text-[12px]" style={{ color: MM.muted }}>
            {t("itWallet", "Moedas do jogo: {n}").replace("{n}", String(data.wallet.coins))}
          </p>
        </>
      )}
    </EvoDialog>
  )
}

function GroupChip({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${archivo.className} inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold`}
      style={{ background: active ? MM.ruby : MM.card, color: active ? "#fff" : MM.muted, border: `1px solid ${active ? MM.rubyBorder : MM.border}` }}
    >
      {icon}
      {label}
    </button>
  )
}

function SlotThumb({ slot, big = false }: { slot: Slot; big?: boolean }) {
  const cls = big ? "h-20 w-20" : "h-full w-full"
  if (slot.thumb)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- miniatura estática local (mesmo arquivo da geladeira/retrato, em cache)
      <img src={slot.thumb} alt="" loading="lazy" decoding="async" draggable={false} className={`${cls} object-cover ${slot.skin ? "rounded-full" : "rounded-[12px]"}`} />
    )
  const icon = slot.vehicle ? <VehicleIcon kind={slot.vehicle.kind} className="h-8 w-8" /> : slot.house ? <Home className="h-8 w-8" /> : <Shirt className="h-8 w-8" />
  return (
    <span className={`${cls} inline-flex items-center justify-center rounded-[12px]`} style={{ color: MM.gold }} aria-hidden>
      {icon}
    </span>
  )
}

function SlotButton({ slot, t, active, onClick }: { slot: Slot; t: Tr; active: boolean; onClick: () => void }) {
  const name = slotName(slot, t)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={slot.qty != null ? `${name} × ${slot.qty}` : name}
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden p-1.5"
      style={{
        borderRadius: MM.radius.card,
        background: "radial-gradient(ellipse at 50% 35%, rgba(52,62,78,0.75), rgba(14,17,24,0.75))",
        border: `1px solid ${active ? MM.rubyBorder : MM.border}`,
        boxShadow: active ? `0 0 0 1px ${MM.ruby}` : undefined,
      }}
    >
      <SlotThumb slot={slot} />
      {slot.qty != null && (
        <span className="absolute bottom-1 right-1 rounded-full px-1.5 text-[11px] font-bold tabular-nums leading-[18px]" style={{ background: "rgba(0,0,0,0.65)", color: MM.text }}>
          ×{slot.qty}
        </span>
      )}
      {slot.fresh && (
        <span className="absolute left-1 top-1 rounded-full px-1.5 text-[10px] font-bold uppercase leading-4" style={{ background: MM.ruby, color: "#fff" }}>
          {t("itNewBadge", "Novo")}
        </span>
      )}
      {slot.skin?.equipped && (
        <span className="absolute left-1 top-1 rounded-full px-1.5 text-[10px] font-bold uppercase leading-4" style={{ background: MM.gold, color: "#1a1408" }}>
          {t("itWearing", "Vestida")}
        </span>
      )}
    </button>
  )
}

function SlotDetail({ slot, t, busy, onEquip }: { slot: Slot; t: Tr; busy: boolean; onEquip: (id: string) => void }) {
  const name = slotName(slot, t)
  let lines: string[] = []
  let action: React.ReactNode = null
  if (slot.item) {
    lines = [
      t("itInFridge", "{n} na sua geladeira").replace("{n}", String(slot.qty ?? 0)),
      t("itEatHint", "Para comer ou tomar, abra a geladeira dentro de casa."),
    ]
  } else if (slot.skin) {
    lines = [slot.skin.kind === "standard" ? t("skinStandardLine", "Muda com a vida: magro, normal, gordo ou forte.") : t("itSkinOwned", "Skin sua, para sempre.")]
    action = slot.skin.equipped ? (
      <span className="text-[13px] font-semibold" style={{ color: MM.gold }}>
        {t("itWearingNow", "Você está usando")}
      </span>
    ) : (
      <EvoButton variant="primary" size="sm" loading={busy} icon={<Shirt className="h-4 w-4" />} onClick={() => onEquip(slot.skin!.id)}>
        {t("itWear", "Vestir")}
      </EvoButton>
    )
  } else if (slot.vehicle) {
    const w = slot.vehicle.where
    lines = [w === "spot" ? t("itAtSpot", "Na vaga da sua casa.") : w === "house" ? t("itInHouse", "Guardado dentro de casa.") : t("itOnStreet", "Ficou na rua do bairro, onde você deixou.")]
  } else if (slot.house) {
    lines = [t("itHouseLine", "Lote {lot} · {nb}").replace("{lot}", String(slot.house.lot).padStart(2, "0")).replace("{nb}", slot.house.neighborhood)]
  }
  const fx = slot.item ? effectsOf(slot.item) : []
  return (
    <section className="mt-3 flex gap-3 rounded-[14px] p-3" style={{ background: MM.card, border: `1px solid ${MM.border}` }} aria-live="polite">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[12px]" style={{ background: "rgba(0,0,0,0.3)" }}>
        <SlotThumb slot={slot} big />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-[16px] font-bold leading-5" style={{ color: MM.text }}>
          {name}
        </h3>
        {lines.map((l) => (
          <p key={l} className="text-[13px] leading-[18px]" style={{ color: MM.muted }}>
            {l}
          </p>
        ))}
        {fx.length > 0 && (
          <ul className="mt-0.5 flex flex-wrap gap-1">
            {fx.map((e) => (
              <li key={e.key} className="px-2 py-[3px] text-[11px] font-semibold leading-none" style={{ borderRadius: 999, color: toneColor(e.tone), boxShadow: `inset 0 0 0 1px ${toneColor(e.tone)}55`, background: "rgba(0,0,0,0.3)" }}>
                {effectText(e, t)}
              </li>
            ))}
          </ul>
        )}
        {action && <div className="mt-1">{action}</div>}
        {busy && !action && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
    </section>
  )
}
