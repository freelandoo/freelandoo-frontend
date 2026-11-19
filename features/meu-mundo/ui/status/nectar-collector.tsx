"use client"

// features/meu-mundo/ui/status/nectar-collector.tsx — o COLETOR DE NÉCTAR (19/11, pedido do Alex).
//
// No nível 5 do treinador a pessoa ganha o coletor: ele aparece na tela de
// equipar e mostra TUDO o que a conta já coletou de néctar, sem limite. Quem
// decide se está liberado e quanto foi coletado é o servidor (`GET /nectar`:
// `collector.unlocked` e `earnedMl`). Aqui só se desenha.
//
// Sem limite: o tubo enche a cada 10 L e começa de novo; cada volta completa
// acende um anel no coletor.

import { useEffect, useState } from "react"
import { getToken } from "@/lib/auth"
import { useLocale } from "@/components/i18n/I18nProvider"
import { getNectarWallet } from "../../data"
import { EVO, archivo, teko } from "./evo-skin"

type Tr = (key: string, fallback: string) => string

/** Um anel a cada 10 L. */
export const RING_ML = 10000

export function collectorFill(earnedMl: number) {
  const ml = Math.max(0, Math.floor(Number(earnedMl) || 0))
  return { rings: Math.floor(ml / RING_ML), into: ml % RING_ML }
}

export function NectarCollector({ t }: { t: Tr }) {
  const locale = useLocale()
  const [state, setState] = useState<{ unlocked: boolean; earnedMl: number } | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    void getNectarWallet(token).then((r) => {
      if (alive && r.ok) setState({ unlocked: !!r.data.collector?.unlocked, earnedMl: r.data.earnedMl || 0 })
    })
    return () => {
      alive = false
    }
  }, [])

  if (!state?.unlocked) return null
  const { rings, into } = collectorFill(state.earnedMl)
  const pct = (into / RING_ML) * 100
  const litersTxt = (ml: number) => (ml / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })
  const total = litersTxt(state.earnedMl)

  return (
    <section
      className={`${archivo.className} flex items-center gap-3 p-2.5`}
      style={{ background: "rgba(12,15,20,0.6)", boxShadow: "inset 0 0 0 1px rgba(232,182,91,0.45)", borderRadius: 10 }}
      aria-label={t("ncCollector", "Coletor de néctar")}
    >
      {/* o frasco: latão em volta, néctar subindo por dentro */}
      <div className="relative h-16 w-7 shrink-0 overflow-hidden" style={{ background: "#0b0e13", boxShadow: "inset 0 0 0 2px #B8873E", borderRadius: "10px 10px 6px 6px" }} aria-hidden>
        <div className="absolute inset-[3px] flex flex-col justify-end">
          <div
            className="w-full transition-[height] duration-700 ease-out"
            style={{ height: `${pct}%`, background: "linear-gradient(180deg, #FFE7A0 0%, #F2B705 55%, #C47A10 100%)", borderRadius: 4, boxShadow: "0 0 10px rgba(242,183,5,0.55)" }}
          />
        </div>
        <div className="absolute inset-x-0 top-1/4 h-px" style={{ background: "rgba(255,226,166,0.25)" }} />
        <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: "rgba(255,226,166,0.25)" }} />
        <div className="absolute inset-x-0 top-3/4 h-px" style={{ background: "rgba(255,226,166,0.25)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "#E8B65B" }}>
          {t("ncCollector", "Coletor de néctar")}
        </p>
        <p className={`${teko.className} text-[30px] font-semibold leading-none tabular-nums`} style={{ color: "#FFE2A6", textShadow: "0 2px 0 #000" }}>
          {t("ncCollectorTotal", "{n} L").replace("{n}", total)}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug" style={{ color: EVO.mudo }}>
          {t("ncCollectorHint", "Todo o néctar que você já coletou. Não tem limite.")}
        </p>
        {rings > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "#F2B705" }}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ boxShadow: "inset 0 0 0 2px #F2B705" }} aria-hidden />
            {t("ncCollectorRings", "{n} anéis completos (10 L cada)").replace("{n}", rings.toLocaleString(locale))}
          </p>
        )}
      </div>
    </section>
  )
}
