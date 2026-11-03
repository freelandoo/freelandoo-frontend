"use client"

// features/meu-mundo/ui/status/stat-bars.tsx — as BARRAS DE STATUS da Visão
// Geral (2026-11-03). Pedido do Alex: "barras como a placa de luta" (o sangue
// em paralelogramo do fight-plate.tsx) para defesa, ataque, força,
// inteligência, destreza e velocidade, cada uma de uma cor, de 0 a 1000.
//
// Força/inteligência/destreza/velocidade = o valor da vida (o mesmo da página
// Atributos). Defesa e ataque não são pontos na regra (são % do nível de
// aventura, heroLevelScale) — aqui viram 0–1000 só para a barra:
//   defesa = defesa / DEF_MAX (60%, o teto com equipamento) × 1000
//   ataque = bônus de dano / bônus do nível máximo × 1000
// e o % de verdade aparece pequeno ao lado do nome.

import { useEffect, useState, type ReactNode } from "react"
import { Brain, Crosshair, Dumbbell, Shield, Swords, Wind } from "lucide-react"
import type { LifeFull } from "../../types"
import { DEF_MAX, HERO_LEVEL_MAX, heroLevelScale } from "../../laminas/sim/fight"
import { anton } from "../hud/fight-plate"
import { archivo, EVO, teko } from "./evo-skin"
import { currentUiFx } from "../kit/steam/fx-tier"
import { useLocale } from "@/components/i18n/I18nProvider"

type Tr = (key: string, fallback: string) => string

export const STAT_MAX = 1000
const CORTE = 0.55 // inclinação do sangue da placa (corte = h × 0,55)
const TRILHO = "rgba(5,3,8,.82)"
const CONTORNO = "rgba(214,167,91,.75)"

/** Escurece um #rrggbb (o "fundo" do degradê, como o magentaFundo da placa). */
function darken(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - k))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}

const slant = (c: number) => `polygon(${c}px 0, 100% 0, calc(100% - ${c}px) 100%, 0 100%)`

/** Um paralelogramo: trilho escuro, contorno dourado, enchimento em degradê, vidro, marcas de 25%. */
function SlantBar({ value, color, h }: { value: number; color: string; h: number }) {
  const target = Math.max(0, Math.min(1, value / STAT_MAX))
  // enche ao abrir (só transform; no "low" já nasce cheia)
  const [p, setP] = useState(() => (currentUiFx() === "low" ? target : 0))
  useEffect(() => {
    const id = requestAnimationFrame(() => setP(target))
    return () => cancelAnimationFrame(id)
  }, [target])
  const c = h * CORTE
  const b = 1.5
  return (
    <div className="relative w-full" style={{ height: h }}>
      <div className="absolute inset-0" style={{ clipPath: slant(c), background: CONTORNO }} />
      <div className="absolute overflow-hidden" style={{ inset: b, clipPath: slant(c - b * 0.6), background: TRILHO }}>
        <div
          className="absolute inset-0"
          style={{
            clipPath: slant(c),
            background: `linear-gradient(180deg, ${color}, ${darken(color, 0.55)})`,
            transform: `translateX(${(p - 1) * 100}%)`,
            transition: "transform 700ms cubic-bezier(.2,.8,.2,1)",
            willChange: "transform",
          }}
        >
          <div className="absolute inset-x-0 top-0" style={{ height: "28%", background: "rgba(255,255,255,.22)" }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${i * 25}%`, top: "62%", bottom: 0, width: 1.5, background: "rgba(0,0,0,.5)", transform: "skewX(-29deg)", transformOrigin: "bottom" }}
          />
        ))}
      </div>
    </div>
  )
}

export interface StatRow {
  key: string
  icon: ReactNode
  label: string
  color: string
  value: number
  /** O valor de verdade quando não é ponto (o % da defesa/ataque). */
  note?: string
}

/** As 6 linhas, na ordem pedida. `level` = nível de aventura (sem = nível 1). */
export function useStatRows(life: LifeFull, level: number | undefined, t: Tr): StatRow[] {
  const locale = useLocale()
  const pct = (v: number) => (Math.round(v * 1000) / 10).toLocaleString(locale, { maximumFractionDigits: 1 })
  const at = life.character.attributes
  const h = heroLevelScale(level ?? 1)
  const atkTop = heroLevelScale(HERO_LEVEL_MAX).dmg - 1
  return [
    { key: "def", icon: <Shield />, label: t("stDefense", "Defesa"), color: "#5B9DFF", value: Math.round(Math.min(1, h.def / DEF_MAX) * STAT_MAX), note: `${pct(h.def)}%` },
    { key: "atk", icon: <Swords />, label: t("stAttack", "Ataque"), color: "#FF8A2A", value: Math.round(Math.min(1, (h.dmg - 1) / atkTop) * STAT_MAX), note: `+${pct(h.dmg - 1)}%` },
    { key: "str", icon: <Dumbbell />, label: t("atStrength", "Força"), color: "#FF2D4B", value: at.strength },
    { key: "int", icon: <Brain />, label: t("atIntelligence", "Inteligência"), color: "#B35CFF", value: at.intelligence },
    { key: "dex", icon: <Crosshair />, label: t("attrDexterity", "Destreza"), color: "#2FE3C8", value: at.dexterity ?? 0 },
    { key: "spd", icon: <Wind />, label: t("atSpeed", "Velocidade"), color: "#7CF05A", value: at.speed },
  ]
}

/** Uma linha: ícone + nome (+ %) à esquerda, a barra e o número grande na ponta. */
function StatLine({ row, small }: { row: StatRow; small: boolean }) {
  const h = small ? 13 : 22
  const num = small ? 19 : 32
  const v = Math.round(Math.max(0, Math.min(STAT_MAX, row.value)))
  return (
    <div className="flex min-w-0 items-center" style={{ gap: small ? 6 : 10 }}>
      <div className="flex shrink-0 items-center" style={{ width: small ? 132 : 210, gap: small ? 4 : 7 }}>
        <span className="flex shrink-0 items-center justify-center" style={{ color: row.color, width: small ? 12 : 20, height: small ? 12 : 20, filter: `drop-shadow(0 0 4px ${row.color}88)` }}>
          <span className="[&>svg]:h-full [&>svg]:w-full" style={{ width: "100%", height: "100%" }}>
            {row.icon}
          </span>
        </span>
        {/* nome e o % na MESMA linha: todas as linhas com a mesma altura */}
        <div className="flex min-w-0 items-baseline leading-none" style={{ gap: small ? 4 : 6 }}>
          <span className={`${teko.className} min-w-0 truncate font-semibold uppercase`} style={{ fontSize: small ? 14 : 20, letterSpacing: "0.06em", color: EVO.branco }}>
            {row.label}
          </span>
          {row.note && (
            <span className={`${archivo.className} shrink-0 font-semibold tabular-nums`} style={{ fontSize: small ? 9.5 : 12, color: row.color }}>
              {row.note}
            </span>
          )}
        </div>
      </div>
      <div className="relative min-w-0 flex-1" style={{ paddingRight: small ? 40 : 64 }}>
        <SlantBar value={v} color={row.color} h={h} />
        <span
          className={`${anton.className} pointer-events-none absolute right-0 top-1/2 tabular-nums leading-none`}
          style={{
            fontFamily: anton.style.fontFamily,
            fontSize: num,
            color: "#f5f1ed",
            transform: "translateY(-52%) skewX(-9deg)",
            WebkitTextStroke: `${small ? 2.5 : 4}px rgba(0,0,0,.92)`,
            paintOrder: "stroke fill",
            textShadow: `0 0 ${small ? 5 : 9}px ${row.color}99`,
          }}
        >
          {v}
        </span>
      </div>
    </div>
  )
}

/** As 6 barras, uma por linha (como a placa de luta). */
export function StatBars({ life, level, t, small = false }: { life: LifeFull; level?: number; t: Tr; small?: boolean }) {
  const rows = useStatRows(life, level, t)
  return (
    <div className="grid" style={{ rowGap: small ? 7 : 12 }}>
      {rows.map((r) => (
        <StatLine key={r.key} row={r} small={small} />
      ))}
    </div>
  )
}
