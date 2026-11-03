"use client"

// features/meu-mundo/ui/rewards/receipt-lines.tsx — mm3d-59: o que um RECIBO
// do servidor concedeu, em linhas (XP, atributos, vitais, itens). Mostra só o
// que o servidor gravou: delta EFETIVO. mm3d-60: peças metálicas que entram em
// sequência (a partir de `delay`) e, se subiu de nível, a faixa dourada de
// NÍVEL por último. Atributo usa a cor dele (a mesma dos números flutuantes);
// vital mostra o valor pela consequência (menos estresse é bom).

import type { CSSProperties } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { Receipt } from "../../data"
import { RARITY, type Rarity } from "../kit/aether-tokens"
import { FLOAT_COLOR, SP } from "../kit/steam/steam-tokens"
import { cinzel, teko } from "../status/evo-skin"
import { ATTR_META, VITAL_META, fmtDelta, toneOf } from "./reward-grammar"
import v from "./victory.module.css"

const STEP = 110

interface Line {
  key: string
  icon: string
  label: string
  value: string
  color: string
  valueColor?: string
}

export function ReceiptLines({ receipt, delay = 550 }: { receipt: Receipt; delay?: number }) {
  const t = useTranslations("MeuMundo")
  const xp = receipt.deltas.xp
  const lines: Line[] = []
  if (xp && xp.xp > 0) lines.push({ key: "xp", icon: "✦", label: t("rewardXp", "XP de aventura"), value: `+${xp.xp}`, color: FLOAT_COLOR.xp })
  for (const [k, raw] of Object.entries(receipt.deltas.attrs || {})) {
    const n = Number(raw)
    const meta = ATTR_META[k as keyof typeof ATTR_META]
    if (!meta || Math.abs(n) < 0.005) continue
    lines.push({ key: k, icon: meta.icon, label: t(meta.labelKey, meta.label), value: fmtDelta(n, 2), color: FLOAT_COLOR[k as keyof typeof FLOAT_COLOR] ?? meta.color })
  }
  for (const [k, raw] of Object.entries(receipt.deltas.vitals || {})) {
    const n = Number(raw)
    const meta = VITAL_META[k as keyof typeof VITAL_META]
    if (!meta || Math.abs(n) < 0.05) continue
    lines.push({
      key: k,
      icon: meta.icon,
      label: t(meta.labelKey, meta.label),
      value: fmtDelta(n, 0),
      color: FLOAT_COLOR[k as keyof typeof FLOAT_COLOR] ?? SP.gold,
      valueColor: toneOf(k, n) === "good" ? SP.green : SP.red,
    })
  }
  const coins = Math.round(Number(receipt.deltas.coins) || 0)
  if (coins > 0) lines.push({ key: "coins", icon: "◉", label: t("rewardCoins", "Moedas"), value: `+${coins}`, color: "#F2B705" })
  for (const it of receipt.items || []) {
    if (it.qty <= 0) continue
    const r = RARITY[(it.rarity as Rarity) || "common"] || RARITY.common
    lines.push({ key: `i-${it.id}`, icon: "◆", label: t(`gear_${it.id}`, it.id), value: `×${it.qty}`, color: r.color })
  }
  const leveled = !!xp && xp.to > xp.from
  return (
    <ul className={v.rows} aria-label={t("rewardReceipt", "O que você ganhou")}>
      {lines.map((l, i) => (
        <li key={l.key} className={`${v.row} ${v.rowText}`} style={{ "--c": l.color, "--v": l.valueColor ?? l.color, "--d": `${delay + i * STEP}ms` } as CSSProperties}>
          <span className={v.rowIcon} aria-hidden>
            {l.icon}
          </span>
          <span className={v.rowLabel}>{l.label}</span>
          <span className={`${teko.className} ${v.rowValue}`}>{l.value}</span>
        </li>
      ))}
      {leveled && (
        <li className={v.level} style={{ "--d": `${Math.max(1100, delay + lines.length * STEP)}ms` } as CSSProperties}>
          <span className={v.badge} aria-hidden>
            <svg viewBox="0 0 50 54" className="absolute inset-0 h-full w-full">
              <path d="M25 2 47 14v26L25 52 3 40V14Z" fill="#1A1206" stroke="#FFD68A" strokeWidth="2" />
              <path d="M25 8 41 17v20L25 46 9 37V17Z" fill="none" stroke="#B67A31" strokeWidth="1" />
            </svg>
            <span className={`${teko.className} ${v.badgeNum}`}>{xp!.to}</span>
          </span>
          <span className={v.levelText}>
            <span className={`${cinzel.className} ${v.levelFrom}`}>
              {t("rewardLevelLine", "Nível {from} → {to}").replace("{from}", String(xp!.from)).replace("{to}", String(xp!.to))}
            </span>
            <span className={`${cinzel.className} ${v.levelUp}`}>{t("levelUpTitle", "SUBIU DE NÍVEL!")}</span>
          </span>
        </li>
      )}
    </ul>
  )
}
