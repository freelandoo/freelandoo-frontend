"use client"

// features/meu-mundo/ui/kit/stage-select.tsx — a tela de ESCOLHA DE FASE de todo minijogo.
//
// Pedido do Alex (18/11): "deixe todas as telas com o mesmo layout do Antigravidade". O desenho
// é o do SELECIONAR CIRCUITO da Corrida (corrida/ui/circuit-select.tsx, mm3d-74): cabeçalho com
// a marca do jogo e o título, grade de cartões 3/2/1 (miniatura 16:9 com nome e subtítulo,
// ambiente · dificuldade em barras · fatos, destaque ★, etiquetas, recorde) e o rodapé com o nome
// da fase escolhida e os botões do jogo (Treinar rosa + o principal em rubi). Tocar seleciona,
// dois toques jogam, Enter joga. Cada minijogo só monta os dados dos cartões e os botões.

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowLeft, CircleHelp, Crown, Lock, Trophy, X } from "lucide-react"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import type { WeeklyGame } from "../../data"
import { WeeklyBoard } from "../ranking/weekly-board"
import { BackToCity } from "./back-to-city"
import { MM } from "../hud/tokens"

/** Fundo e cor de destaque iguais à Antigravidade. */
export const STAGE_BG = "radial-gradient(120% 90% at 50% 0%, #22405c 0%, #0f151d 62%, #0a0d12 100%)"
export const STAGE_CYAN = "#5FE1FF"

export interface StageCardData {
  id: string
  thumb: string | null
  /** Degradê de reserva enquanto a miniatura não carrega. */
  bg: [string, string]
  accent: string
  /** Número da fase ("01"), no canto da miniatura. */
  num?: string
  name: string
  sub?: string
  env: string
  /** Dificuldade em barras (3 na Corrida/Paint, 5 no Jetpack/Gincana). */
  difficulty: { level: number; of: number; label: string }
  /** Fatos curtos na linha do ambiente (loops, jogadores, metas…). */
  facts?: ReactNode[]
  highlight?: string
  tags?: string[]
  record: { text: string; has: boolean }
  /** Texto da tranca ("Em breve"); sem ele o cartão está aberto. */
  locked?: string
  /** Peça por cima da miniatura (contorno da pista, estrelas ganhas, votos). */
  badge?: ReactNode
}

/** Botão secundário/principal do rodapé, no desenho dos modos da Antigravidade. */
export function StageButton({ primary, icon, title, sub, onClick, disabled }: { primary?: boolean; icon: ReactNode; title: string; sub?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={sub}
      className="flex min-h-[52px] min-w-[150px] items-center justify-center gap-2 rounded-none px-4 text-[14px] font-black uppercase italic tracking-[0.06em] transition-transform active:scale-[0.98] disabled:cursor-not-allowed max-[759px]:min-w-0 max-[759px]:flex-col max-[759px]:gap-0.5 max-[759px]:px-2 max-[759px]:text-[11.5px]"
      style={{
        background: primary ? MM.rubyFill : MM.card,
        border: `1px solid ${primary ? MM.rubyBorder : MM.border}`,
        color: disabled ? MM.disabledText : primary ? "#fff" : MM.text,
      }}
    >
      <span style={{ color: disabled ? MM.disabledText : primary ? "#fff" : MM.gold }}>{icon}</span>
      {title}
    </button>
  )
}

export interface StageSelectProps {
  /** Linha pequena acima do título: a marca do jogo (pode ter cores). */
  brand: ReactNode
  title: string
  cards: StageCardData[]
  selected: string
  onSelect: (id: string) => void
  /** Dois toques / Enter: jogar nesse cartão (o botão principal). */
  onRun?: (id: string) => void
  /** Seta de voltar (passo anterior do jogo, ex. garagem). */
  onBack?: () => void
  /** Voltar para a cidade. */
  onExit?: () => void
  /** Peça extra no cabeçalho (ex. "Sua nave · Trocar"). */
  headerExtra?: ReactNode
  /** Como jogar: abre por cima pelo botão "?". */
  help?: ReactNode
  /** Linha embaixo do nome no rodapé (teclas, modo). */
  footerLine?: string
  /** Peça à esquerda dos botões no rodapé (ex. veículo do Rolê). */
  footerExtra?: ReactNode
  actions: ReactNode
  /** Número de colunas dos botões (o grid do rodapé). */
  actionCols?: number
  error?: string | null
  /** Esconde o rodapé (ex. espera do Paint presa embaixo). */
  footerHidden?: boolean
  /** Peça presa por cima de tudo (ex. espera da sala). */
  overlay?: ReactNode
  /** Folga embaixo da grade (para a espera presa). */
  padBottom?: number
  /**
   * legend-v1 (24/11/2026, Alex: "o ranking mostra dentro da tela de escolha de fases, cada minijogo com o seu"):
   * o botão Ranking do cabeçalho abre o ranking da semana DESTE jogo (o mesmo do Ranking do jogo) com o prêmio Lendário.
   */
  rankGame?: WeeklyGame
}

export function StageSelect(p: StageSelectProps) {
  const t = useTranslations("MeuMundo")
  const locale = useLocale()
  const chosen = p.cards.find((c) => c.id === p.selected) ?? p.cards[0]
  const [helpOpen, setHelpOpen] = useState(false)
  const [rankOpen, setRankOpen] = useState(false)
  // Enter joga a fase escolhida (PC); Esc fecha a ajuda
  const runRef = useRef<() => void>(() => {})
  const { onRun } = p
  useEffect(() => {
    runRef.current = () => {
      if (!chosen.locked) onRun?.(chosen.id)
    }
  })
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (helpOpen || rankOpen)) {
        setHelpOpen(false)
        setRankOpen(false)
        e.preventDefault()
        return
      }
      if (e.key === "Enter" && !helpOpen && !rankOpen && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        runRef.current()
      }
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [helpOpen, rankOpen])
  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: STAGE_BG, color: MM.text }}>
      <header className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-[max(16px,env(safe-area-inset-top))] max-[759px]:px-3">
        {p.onBack && (
          <button
            type="button"
            onClick={p.onBack}
            aria-label={t("stageBack", "Voltar")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ background: MM.card, border: `1px solid ${MM.border}` }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: STAGE_CYAN }}>
            {p.brand}
          </div>
          <h1 className="truncate text-[26px] font-black uppercase italic leading-none tracking-tight max-[759px]:text-[20px]">{p.title}</h1>
        </div>
        {p.headerExtra}
        {p.rankGame && (
          <button
            type="button"
            onClick={() => setRankOpen(true)}
            aria-label={t("stageRanking", "Ranking da semana")}
            title={t("stageRanking", "Ranking da semana")}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-black uppercase italic tracking-[0.06em] max-[759px]:w-10 max-[759px]:justify-center max-[759px]:px-0"
            style={{ background: "rgba(242,183,5,0.14)", border: `1px solid ${MM.gold}`, color: MM.gold }}
          >
            <Crown className="h-5 w-5 shrink-0" />
            <span className="max-[759px]:hidden">{t("stageRankingShort", "Ranking")}</span>
          </button>
        )}
        {p.help && (
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label={t("stageHelp", "Como jogar")}
            title={t("stageHelp", "Como jogar")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ background: MM.card, border: `1px solid ${MM.border}`, color: MM.gold }}
          >
            <CircleHelp className="h-5 w-5" />
          </button>
        )}
        {p.onExit && <BackToCity onExit={p.onExit} className="pointer-events-auto" />}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 max-[759px]:px-3" style={p.padBottom ? { paddingBottom: p.padBottom } : undefined}>
        <div className="mx-auto grid max-w-[1180px] grid-cols-3 gap-3 max-[1020px]:grid-cols-2 max-[600px]:grid-cols-1">
          {p.cards.map((c) => (
            <StageCard key={c.id} c={c} selected={c.id === chosen.id} onPick={() => !c.locked && p.onSelect(c.id)} onRun={() => !c.locked && p.onRun?.(c.id)} />
          ))}
        </div>
      </div>

      {!p.footerHidden && (
        <footer className="shrink-0 px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 max-[759px]:px-3" style={{ background: "rgba(8,11,16,0.9)", borderTop: `1px solid ${MM.border}` }}>
          {p.error && (
            <p role="alert" className="mx-auto mb-2 max-w-[1180px] rounded-none px-3 py-2 text-[13px]" style={{ background: "rgba(110, 16, 34, 0.55)", color: "#FFD9DF" }}>
              {p.error}
            </p>
          )}
          <div className="mx-auto flex max-w-[1180px] items-center gap-3 max-[759px]:flex-col max-[759px]:items-stretch max-[759px]:gap-2">
            <div className="min-w-0 flex-1 max-[759px]:text-center">
              <div className="truncate text-[15px] font-black italic" style={{ color: chosen.accent }}>
                {chosen.name}
              </div>
              <div className="truncate text-[12px] max-[759px]:hidden" style={{ color: MM.muted }}>
                {chosen.env}
                {p.footerLine ? ` · ${p.footerLine}` : ""}
              </div>
            </div>
            {p.footerExtra}
            <div className="grid shrink-0 gap-2" style={{ gridTemplateColumns: `repeat(${p.actionCols ?? 2}, minmax(0, 1fr))` }}>
              {p.actions}
            </div>
          </div>
        </footer>
      )}

      {p.overlay}

      {rankOpen && p.rankGame && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 max-[759px]:p-2" style={{ background: "rgba(4,6,10,0.72)" }} onClick={() => setRankOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("stageRanking", "Ranking da semana")}
            className="max-h-full w-full max-w-[620px] overflow-y-auto rounded-none p-5 max-[759px]:p-3"
            style={{ background: MM.surface, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: STAGE_CYAN }}>
                  {p.brand}
                </div>
                <h2 className="text-[20px] font-black uppercase italic leading-none">{t("stageRanking", "Ranking da semana")}</h2>
              </div>
              <button type="button" onClick={() => setRankOpen(false)} aria-label={t("stageClose", "Fechar")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <WeeklyBoard t={t} locale={locale} only={p.rankGame} />
          </div>
        </div>
      )}

      {helpOpen && p.help && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4" style={{ background: "rgba(4,6,10,0.72)" }} onClick={() => setHelpOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("stageHelp", "Como jogar")}
            className="max-h-full w-full max-w-[620px] overflow-y-auto rounded-none p-5 max-[759px]:p-4"
            style={{ background: MM.surface, border: `1px solid ${MM.border}`, boxShadow: MM.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[20px] font-black uppercase italic leading-none">{t("stageHelp", "Como jogar")}</h2>
              <button type="button" onClick={() => setHelpOpen(false)} aria-label={t("stageClose", "Fechar")} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {p.help}
          </div>
        </div>
      )}
    </div>
  )
}

function StageCard({ c, selected, onPick, onRun }: { c: StageCardData; selected: boolean; onPick: () => void; onRun: () => void }) {
  const [imgOk, setImgOk] = useState(true)
  return (
    <button
      type="button"
      onClick={onPick}
      onDoubleClick={onRun}
      aria-pressed={selected}
      disabled={!!c.locked}
      className="group relative flex flex-col overflow-hidden rounded-none text-left transition-transform duration-150 active:scale-[0.99] disabled:cursor-not-allowed"
      style={{
        background: MM.surface,
        border: `2px solid ${selected ? c.accent : MM.border}`,
        boxShadow: selected ? `0 0 0 1px ${c.accent}55, 0 10px 30px -10px ${c.accent}99` : MM.shadow,
        transform: selected ? "translateY(-2px)" : undefined,
      }}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden max-[600px]:aspect-[21/9]" style={{ background: `linear-gradient(135deg, ${c.bg[0]}, ${c.bg[1]})` }}>
        {imgOk && c.thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumb ?? undefined} alt="" loading="lazy" onError={() => setImgOk(false)} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(5,8,12,0.85) 100%)" }} />
        {c.num && (
          <span className="absolute left-2.5 top-1.5 text-[18px] font-black italic leading-none" style={{ color: c.accent, textShadow: "0 1px 0 #000, 0 0 8px rgba(0,0,0,0.6)" }}>
            {c.num}
          </span>
        )}
        {c.badge}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="text-[20px] font-black italic leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{c.name}</div>
          {c.sub && <div className="mt-1 line-clamp-2 text-[12px] leading-tight text-white/80">{c.sub}</div>}
        </div>
        {c.locked && (
          <div className="absolute inset-0 grid place-items-center bg-black/60">
            <span className="flex flex-col items-center gap-1 text-[11px] font-black uppercase tracking-[0.1em]">
              <Lock className="h-8 w-8" />
              {c.locked}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: MM.muted }}>
          <span>{c.env}</span>
          <span className="flex items-center gap-1" title={c.difficulty.label}>
            {Array.from({ length: c.difficulty.of }, (_, i) => (
              <span key={i} className="h-2.5 w-1.5" style={{ background: i < c.difficulty.level ? c.accent : "rgba(255,255,255,0.15)" }} />
            ))}
            <span className="ml-1">{c.difficulty.label}</span>
          </span>
          {c.facts?.map((f, i) => (
            <span key={i} className="flex items-center gap-1">
              {f}
            </span>
          ))}
        </div>
        {c.highlight && (
          <div className="text-[13px] font-semibold leading-snug" style={{ color: MM.text }}>
            ★ {c.highlight}
          </div>
        )}
        {c.tags && c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]" style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${c.accent}66`, color: c.accent }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-1 text-[12px]" style={{ color: c.record.has ? MM.gold : MM.muted }}>
          <Trophy className="h-3.5 w-3.5 shrink-0" />
          {c.record.text}
        </div>
      </div>
    </button>
  )
}
