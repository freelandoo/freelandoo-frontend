"use client"

// features/meu-mundo/ui/kit/back-to-city.tsx — a saída de todo minijogo (pedido do Alex,
// 2026-11-08: "não tem como sair de nenhum jogo"). Antes era um X redondo no canto de cima
// à direita, coberto pelos botões de chat/caixa/sino da casca; agora é um botão com texto,
// igual em todos, e a casca esconde aqueles botões enquanto um jogo cobre a tela.

import { ArrowLeft } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { SP as ST } from "./steam/steam-tokens"
import { MM } from "../hud/tokens"

export function BackToCity({ onExit, className = "" }: { onExit: () => void; className?: string }) {
  const t = useTranslations("MeuMundo")
  const label = t("mmBackToCity", "Voltar à cidade")
  return (
    <button
      type="button"
      onClick={onExit}
      aria-label={label}
      className={`flex h-10 shrink-0 items-center gap-2 px-3.5 text-[13px] font-black uppercase tracking-[0.1em] transition-transform active:scale-[0.97] ${className}`}
      style={{ background: "rgba(10,12,16,0.82)", border: `1px solid ${ST.gold}`, color: MM.text, boxShadow: MM.shadowSoft }}
    >
      <ArrowLeft className="h-4 w-4" style={{ color: ST.gold }} />
      <span className="max-[420px]:hidden">{label}</span>
    </button>
  )
}
