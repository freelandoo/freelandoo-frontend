"use client"
// Trilha E16 — CONSUMÍVEL DE PREPARO na tela de versus. Um por luta: o servidor gasta o item e grava
// o preparo no ticket (`POST /fight/prep`); a tela remonta a luta com o ticket novo, então o aparelho
// simula exatamente o que o servidor vai re-simular. Só Arena, rua e Domínio (Boxe, Hall, deus e
// prólogo não oferecem). Sem consumível na mochila, nada aparece.
import { useEffect, useState } from "react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { fightPrep, getGear, type FightTicket, type GearItem } from "../../data"
import { AE } from "../../ui/kit/aether-tokens"
import { bonusLines, nameOf, type GearTr } from "../../ui/gear/gear-card"

const PREP_ORIGINS = ["laminas", "mob", "domain"]

export function PrepPicker({ ticket, onApplied }: { ticket: FightTicket; onApplied: (ticket: FightTicket) => void }) {
  const t = useTranslations("MeuMundo") as GearTr
  const allowed = PREP_ORIGINS.includes(ticket.origin) && !ticket.setup.god
  const [items, setItems] = useState<{ item: GearItem; qty: number }[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!allowed || ticket.setup.prep) return
    let alive = true
    const token = getToken()
    if (!token) return
    void getGear(token).then((r) => {
      if (!alive || !r.ok) return
      setItems(r.data.gear.items.filter((it) => it.category === "consumable" && it.prep).map((item) => ({ item, qty: r.data.bag.owned[item.id]?.qty || 0 })).filter((x) => x.qty > 0))
    })
    return () => { alive = false }
  }, [allowed, ticket.setup.prep])
  if (!allowed) return null
  const chosen = ticket.setup.prep
  if (!chosen && !items?.length) return null
  const use = async (id: string) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    setError(null)
    const r = await fightPrep(token, ticket.ticket, id)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    onApplied(r.data.fight)
  }
  return (
    <div className="pointer-events-auto absolute left-1/2 top-2 z-20 flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-3 py-2"
      style={{ background: "rgba(12,9,6,.72)", boxShadow: "inset 0 0 0 1px " + AE.brassLine, color: AE.text }}>
      <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: AE.goldSoft }}>{t("prepTitle", "Preparo")}</span>
      {chosen ? (
        <span className="text-[13px]" style={{ color: AE.good }}>{bonusLines({ [chosen.key]: chosen.v }, t).join(" · ")}</span>
      ) : items!.map(({ item, qty }) => (
        <button key={item.id} type="button" disabled={busy} onClick={() => void use(item.id)}
          className="min-h-11 px-3 text-[12px] font-semibold disabled:opacity-50"
          style={{ background: AE.well, boxShadow: "inset 0 0 0 1px " + AE.brassLine, color: AE.text }}>
          {nameOf(item, t)} ×{qty} · {bonusLines(item.prep ? { [item.prep.key]: item.prep.v } : {}, t).join("")}
        </button>
      ))}
      {!chosen && <span className="w-full text-center text-[11px]" style={{ color: AE.muted }}>{t("prepHint", "Um por luta: gasta ao escolher.")}</span>}
      {error && <span className="w-full text-center text-[12px]" style={{ color: AE.bad }}>{error}</span>}
    </div>
  )
}
