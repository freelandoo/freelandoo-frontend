"use client"

// features/meu-mundo/ui/rewards/receipt-lines.tsx — mm3d-59: o que um RECIBO
// do servidor concedeu, em linhas (XP, atributos, vitais). Mostra só o que o
// servidor gravou: delta EFETIVO, com a cor pela consequência (menos estresse
// é bom; mais estresse é ruim). A celebração animada (ganho e level up) usa
// os mesmos dados (reward-grammar.ts).

import { useTranslations } from "@/components/i18n/I18nProvider"
import type { Receipt } from "../../data"
import { AE } from "../kit/aether-tokens"
import { ATTR_META, VITAL_META, fmtDelta, toneOf } from "./reward-grammar"

export function ReceiptLines({ receipt }: { receipt: Receipt }) {
  const t = useTranslations("MeuMundo")
  const xp = receipt.deltas.xp
  const attrs = Object.entries(receipt.deltas.attrs || {}).filter(([, v]) => Math.abs(Number(v)) >= 0.005)
  const vitals = Object.entries(receipt.deltas.vitals || {}).filter(([, v]) => Math.abs(Number(v)) >= 0.05)
  return (
    <ul className="grid gap-1.5 text-left" aria-label={t("rewardReceipt", "O que você ganhou")}>
      {xp && xp.xp > 0 && (
        <li className="flex items-center justify-between gap-3 px-3 py-2" style={{ background: AE.steel, border: `1px solid ${AE.brassLine}` }}>
          <span className="text-[13px] font-bold" style={{ color: "#FFD23F" }}>
            ✦ {t("rewardXp", "XP de aventura")}
          </span>
          <span className="text-[15px] font-black tabular-nums" style={{ color: "#FFD23F" }}>
            +{xp.xp}
          </span>
        </li>
      )}
      {xp && xp.to > xp.from && (
        <li className="px-3 py-2 text-[13px] font-black uppercase" style={{ background: "#2a1d05", border: "1px solid #FFD23F", color: "#FFD23F" }}>
          {t("rewardLevelLine", "Nível {from} → {to}").replace("{from}", String(xp.from)).replace("{to}", String(xp.to))}
        </li>
      )}
      {attrs.map(([k, v]) => {
        const meta = ATTR_META[k as keyof typeof ATTR_META]
        if (!meta) return null
        return (
          <li key={k} className="flex items-center justify-between gap-3 px-3 py-2" style={{ background: AE.steel, border: `1px solid ${AE.brassLine}` }}>
            <span className="text-[13px] font-bold" style={{ color: meta.color }}>
              {meta.icon} {t(meta.labelKey, meta.label)}
            </span>
            <span className="text-[15px] font-black tabular-nums" style={{ color: meta.color }}>
              {fmtDelta(Number(v), 2)}
            </span>
          </li>
        )
      })}
      {vitals.map(([k, v]) => {
        const meta = VITAL_META[k as keyof typeof VITAL_META]
        if (!meta) return null
        const tone = toneOf(k, Number(v))
        return (
          <li key={k} className="flex items-center justify-between gap-3 px-3 py-2" style={{ background: AE.steel, border: `1px solid ${AE.brassLine}` }}>
            <span className="text-[13px] font-bold" style={{ color: AE.muted }}>
              {meta.icon} {t(meta.labelKey, meta.label)}
            </span>
            <span className="text-[15px] font-black tabular-nums" style={{ color: tone === "good" ? AE.good : AE.bad }}>
              {fmtDelta(Number(v), 0)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
