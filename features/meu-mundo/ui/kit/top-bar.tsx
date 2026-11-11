"use client"

// features/meu-mundo/ui/kit/top-bar.tsx — a BARRA DE CIMA ÚNICA das telas do menu
// (apresentação, etapa 01 · Anexo A §7 regra 1). Esquerda: voltar · casa · título da
// tela. Direita: as moedas, cada uma com "+", que sempre leva à loja.
//
// Medidas (celular 390×844): altura 52 px (6% de H) + a área segura de cima; botões de
// ícone 44×44 (alvo do dedo); título 16 px Anton caixa alta (degrau `title` da escada
// D14); valor da moeda 13 px, rótulo escondido abaixo de 420 px de largura. Pele
// steampunk: ferro opaco, filete de latão embaixo, sombra dura. Sem backdrop-filter;
// só transform/opacity no toque.

import type { ReactNode } from "react"
import { ChevronLeft, Gem, Home, Plus } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { SP } from "./steam/steam-tokens"
import { MM } from "../hud/tokens"
import { TAP, TOPBAR_H, TX } from "./type-scale"
import { anton } from "../hud/fight-plate"

export interface TopBarCoin {
  id: "coins" | "polens"
  value: number | null
  /** Toque no "+": abre a loja (ou a compra de Gold). Sem ele, não há "+". */
  onAdd?: () => void
}

export interface TopBarProps {
  title: string
  /** Voltar um nível (a tela de dentro → a de fora). */
  onBack?: () => void
  /** Casa = fechar tudo e voltar ao jogo. */
  onHome?: () => void
  coins?: TopBarCoin[]
  /** Peça extra antes das moedas (raro: ex. contador de capacidade). */
  extra?: ReactNode
  className?: string
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid shrink-0 place-items-center transition-transform duration-100 active:scale-[0.94]"
      style={{ width: TAP, height: TAP, color: SP.goldHi }}
    >
      {children}
    </button>
  )
}

export function TopBar({ title, onBack, onHome, coins = [], extra, className = "" }: TopBarProps) {
  const t = useTranslations("MeuMundo")
  // até 9.999 por extenso; daí em diante compacto ("12,5 mil"), para o título caber em 390
  const fmt = (n: number | null) => (n == null ? "—" : n < 10000 ? n.toLocaleString("pt-BR") : new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n))
  return (
    <header
      data-mm-topbar=""
      className={`relative flex w-full shrink-0 items-center gap-1 pl-1 pr-2 ${className}`}
      style={{
        height: `calc(${TOPBAR_H}px + env(safe-area-inset-top, 0px))`,
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: SP.plate,
        borderBottom: `1px solid ${SP.goldDeep}`,
        boxShadow: `0 1px 0 ${SP.gold}33, ${MM.shadowSoft}`,
      }}
    >
      {onBack && (
        <IconButton label={t("tbBack", "Voltar")} onClick={onBack}>
          <ChevronLeft className="h-6 w-6" strokeWidth={2.4} />
        </IconButton>
      )}
      {onHome && (
        <IconButton label={t("tbHome", "Voltar ao jogo")} onClick={onHome}>
          <Home className="h-5 w-5" strokeWidth={2.2} />
        </IconButton>
      )}
      <h2 className={`${anton.className} ${TX.title} min-w-0 flex-1 truncate pl-1 uppercase tracking-[0.06em]`} style={{ color: MM.text, fontFamily: anton.style.fontFamily }}>
        {title}
      </h2>
      {extra}
      {coins.map((c) => (
        <span
          key={c.id}
          className="flex h-8 shrink-0 items-center gap-1 pl-1.5"
          style={{ background: SP.well, border: `1px solid ${SP.goldDeep}`, paddingRight: c.onAdd ? 0 : 8 }}
          title={c.id === "coins" ? t("tbCoins", "Esmeraldas") : t("tbPolens", "Gold")}
        >
          {c.id === "coins" ? <Gem className="h-3.5 w-3.5" style={{ color: SP.green }} aria-hidden /> : <span aria-hidden className="h-3 w-3 rotate-45" style={{ background: SP.goldHi }} />}
          <span className={`${TX.body} font-bold tabular-nums`} style={{ color: MM.text }}>
            {fmt(c.value)}
          </span>
          <span className={`${TX.label} max-[420px]:hidden`} style={{ color: SP.muted }}>
            {c.id === "coins" ? t("tbCoins", "Esmeraldas") : t("tbPolens", "Gold")}
          </span>
          {c.onAdd && (
            <button
              type="button"
              onClick={c.onAdd}
              aria-label={t("tbAdd", "Conseguir mais")}
              className="grid h-8 w-8 place-items-center transition-transform duration-100 active:scale-[0.92]"
              style={{ background: SP.goldPlate, color: SP.ink }}
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
            </button>
          )}
        </span>
      ))}
    </header>
  )
}
