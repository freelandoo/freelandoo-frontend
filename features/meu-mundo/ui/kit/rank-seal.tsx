"use client"

// Selo da CLASSE DE RARIDADE (E · D · C · B · A · S · SS · SSR · Lendária · Divina), decisão do Alex
// em 2026-11-17. Peça única do card do item, da loja, dos equipamentos e da mochila.
import { RANK, type Rank } from "./aether-tokens"
import { teko } from "../status/evo-skin"

type Tr = (key: string, fallback: string) => string

/** Selo da classe de raridade (E…SSR, Lendária, Divina), peça única de card, loja e equipamentos. */
export function RankSeal({ rank, t, size = "md" }: { rank: Rank; t: Tr; size?: "sm" | "md" }) {
  const r = RANK[rank]
  const label = t(r.labelKey, r.label)
  const word = rank === "legendary" || rank === "divine"
  return (
    <span
      className={teko.className + " shrink-0 font-semibold uppercase leading-none " + (size === "sm" ? "px-1 py-0.5 text-[13px]" : "px-1.5 py-1 " + (word ? "text-[15px]" : "text-[20px]"))}
      style={{ color: r.color, boxShadow: "inset 0 0 0 1px " + r.color, textShadow: rank === "E" ? undefined : "0 0 6px " + r.glow + "88", minWidth: size === "sm" ? 18 : 28, textAlign: "center" }}
      title={t("rankClassOf", "Classe {r}").replace("{r}", label)}
      aria-label={t("rankClassOf", "Classe {r}").replace("{r}", label)}
    >
      {label}
    </span>
  )
}

