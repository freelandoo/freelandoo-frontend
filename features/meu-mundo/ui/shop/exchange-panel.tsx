"use client"
// Trilha E17 — LOJA DE TROCA, dentro da Loja: cada minijogo paga a sua ficha (minutos ativos ÷ 2 por
// partida, + 1 se venceu) e o Hall paga a dele (PvP: só ficha). Aqui se troca ficha por material, runa e
// Selo. O servidor confere o saldo e grava o recibo; a tela só mostra o catálogo que ele mandou.
// A E19 acrescenta as ofertas de evento (só aparecem com o evento ligado).
import { useMemo, useState } from "react"
import { exchangeGear, type GearBag, type GearCatalog, type GearItem } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AetherTabs } from "../kit/aether-carousel"
import { AE, RARITY } from "../kit/aether-tokens"
import { nameOf, type GearAction, type GearTr } from "../gear/gear-card"

export function ExchangePanel({ catalog, bag, t, act, busy }: { catalog: GearCatalog; bag: GearBag; t: GearTr; act: GearAction; busy: boolean }) {
  const byId = useMemo(() => new Map(catalog.items.map((it) => [it.id, it])), [catalog])
  // E19: oferta de evento só com o evento ligado (o servidor recusa fora dele)
  const offers = useMemo(() => (catalog.exchange?.offers || []).filter((o) => !o.event || (bag.events || []).includes(o.event)), [catalog, bag.events])
  const tokens = useMemo(() => [...new Set(offers.map((o) => o.token))], [offers])
  const [token, setToken] = useState<string>("")
  const current = tokens.includes(token) ? token : tokens[0] || ""
  if (!tokens.length) return <p className="py-6 text-center text-[13px]" style={{ color: AE.muted }}>{t("gearNothing", "Nada por aqui ainda.")}</p>
  const have = bag.owned[current]?.qty || 0
  const label = (id: string) => (byId.has(id) ? nameOf(byId.get(id) as GearItem, t) : id)
  return (
    <div className="grid gap-3">
      <AetherTabs<string> label={t("exchangeTitle", "Loja de troca")} value={current} onChange={setToken}
        tabs={tokens.map((id) => ({ id, label: label(id) }))} />
      <p className="text-[13px] font-bold" style={{ color: AE.goldSoft }}>{t("exchangeBalance", "Você tem {n} fichas").replace("{n}", String(have))}</p>
      <p className="text-[12px]" style={{ color: AE.muted }}>{t("exchangeHint", "Ficha por partida: minutos ativos ÷ 2, mais 1 se venceu.")}</p>
      <ul className="grid gap-2">
        {offers.filter((o) => o.token === current).map((o) => {
          const can = have >= o.cost
          return (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-3" style={{ background: AE.steel, boxShadow: "inset 0 0 0 1px " + AE.brassLine }}>
              <span className="min-w-0 text-[13px]" style={{ color: AE.text }}>
                {Object.entries(o.gives).map(([id, n]) => (
                  <span key={id} style={{ color: byId.has(id) ? RARITY[(byId.get(id) as GearItem).rarity].color : AE.text }}>{n}× {label(id)} </span>
                ))}
              </span>
              <AetherButton disabled={busy || !can} onClick={() => void act("exchange-" + o.id, (tk, key) => exchangeGear(tk, o.id, 1, key), t("exchangeDone", "Troca feita."))}>
                {can ? t("exchangeGo", "Trocar · {n} fichas").replace("{n}", String(o.cost)) : t("exchangeShort", "Faltam fichas ({n})").replace("{n}", String(o.cost))}
              </AetherButton>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
