"use client"

import type { KeyboardEvent } from "react"
import { Crown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Accent } from "@/lib/acasaviews/ranking-data"
import { AnimatedNumber } from "./animated-number"
import { CasaAvatar } from "./casa-avatar"
import { statIcon } from "./stat-icon"

export interface PodiumMeta {
  label: string
  value: number
  compact?: boolean
}

export interface PodiumItem {
  id?: string
  rank: number
  name: string
  handle: string
  avatar: string
  score: number
  scoreLabel: string
  tag: string
  tagAccent: Accent
  meta: PodiumMeta[]
}

export interface PodiumSide {
  /** ["TOP 3", "da audiência"] — a 2ª linha sai em rosa */
  title: [string, string]
  text: string
  /** frase manuscrita ("quem manda é a audiência") */
  script?: string
}

interface PodiumTop3Props {
  items: PodiumItem[] // [rank1, rank2, rank3]
  /** legado do tema claro — a pele escura é rosa nos dois placares */
  accent: "cyan" | "magenta"
  onSelect?: (item: PodiumItem) => void
  getSelectLabel?: (item: PodiumItem) => string
  /** bloco de texto à esquerda do pódio (some no celular só no recuo) */
  side?: PodiumSide
}

/**
 * Pódio na composição da referência (2026-10-05): três cartões altos de
 * retrato — o campeão maior, mais alto, com coroa e moldura rosa acesa —,
 * o nome, os pontos e a linha de números com ícone por cima da foto, e os
 * pedestais de vidro 2 · 1 · 3 embaixo (pintados em CSS, sem imagem).
 *
 * Sem foto, o cartão mostra a inicial (CasaAvatar): a audiência vem do
 * Instagram, que não expõe a foto de quem comenta.
 * A entrada é CSS (`rv-page-in` com atraso): 3º e 2º sobem antes do campeão.
 */
function PodiumColumn({
  item,
  onSelect,
  selectLabel,
}: {
  item: PodiumItem
  onSelect?: (item: PodiumItem) => void
  selectLabel?: string
}) {
  const isFirst = item.rank === 1
  const interactive = !!onSelect
  const order = item.rank === 1 ? "order-2" : item.rank === 2 ? "order-1" : "order-3"
  const width = isFirst ? "w-[37%]" : "w-[31.5%]"
  const pedestalH = isFirst ? "h-14 md:h-24" : item.rank === 2 ? "h-10 md:h-16" : "h-8 md:h-12"
  const delay = item.rank === 1 ? 360 : item.rank === 2 ? 180 : 0

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(item)
    }
  }

  return (
    <div
      className={cn("rv-page-in group flex min-w-0 flex-col items-center outline-none", interactive && "cursor-pointer", order, width)}
      style={{ animationDelay: `${delay}ms` }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? selectLabel || item.name : undefined}
      onClick={interactive ? () => onSelect?.(item) : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      <div className={cn("relative w-full transition-transform duration-300", interactive && "group-hover:-translate-y-1")}>
        {isFirst && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-10 -z-10"
              style={{ background: "radial-gradient(closest-side, rgba(255,0,122,0.4), transparent)" }}
            />
            <Crown
              aria-hidden
              className="absolute -top-7 left-1/2 z-20 h-7 w-7 -translate-x-1/2 fill-[var(--rv-pink)] text-[var(--rv-pink)] drop-shadow-[0_0_10px_rgba(255,0,122,0.9)] md:-top-11 md:h-10 md:w-10"
            />
          </>
        )}

        <div
          className={cn(
            "rv-frame [--c:12px] md:[--c:20px]",
            isFirst ? "rv-frame-pink rv-glow-box" : "[--frame:var(--rv-line-strong)] group-hover:[--frame:var(--rv-pink)]",
          )}
        >
          <div className="rv-frame-in">
            <div className={cn("relative w-full", isFirst ? "aspect-[3/4.4]" : "aspect-[3/4]")}>
              <CasaAvatar
                name={item.name}
                src={item.avatar}
                className={cn("absolute inset-0 h-full w-full object-[50%_25%]", !isFirst && "rv-photo")}
                textClassName={isFirst ? "text-6xl md:text-[10rem]" : "text-5xl md:text-8xl"}
              />
              {!isFirst && <span aria-hidden className="rv-photo-tint" />}
              <span aria-hidden className="rv-scan absolute inset-0" />
              {/* véu escuro embaixo para o texto */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[62%]"
                style={{ background: "linear-gradient(to top, rgba(5,5,5,0.96) 18%, rgba(5,5,5,0.55) 60%, transparent)" }}
              />

              <span
                className={cn(
                  "rv-wide absolute left-0 top-0 z-[3] px-1.5 py-0.5 text-sm leading-none md:px-3 md:py-1.5 md:text-2xl",
                  isFirst ? "bg-[var(--rv-pink)] text-[var(--rv-white)]" : "bg-[var(--rv-bg)] text-[var(--rv-white)]",
                )}
              >
                {String(item.rank).padStart(2, "0")}
              </span>

              <div className="absolute inset-x-0 bottom-0 z-[3] px-1.5 pb-2 text-center md:px-3 md:pb-3">
                <h3 className={cn("rv-wide truncate leading-none", isFirst ? "text-[11px] md:text-2xl" : "text-[10px] md:text-lg")}>
                  {item.name}
                </h3>
                <div className="mt-1 flex items-center justify-center gap-1.5 md:mt-2 md:gap-2">
                  <span
                    className={cn(
                      "rv-wide leading-none",
                      isFirst ? "rv-glow-text text-2xl text-[var(--rv-pink)] md:text-6xl" : "text-xl text-[var(--rv-white)] md:text-4xl",
                    )}
                  >
                    <AnimatedNumber value={item.score} compact={item.score >= 100000} />
                  </span>
                  <span className="rv-type hidden max-w-[7rem] truncate bg-[var(--rv-yellow)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--rv-bg)] sm:inline-block md:text-[9px]">
                    {item.tag}
                  </span>
                </div>
                <p className="rv-type mt-0.5 text-[7px] uppercase tracking-[0.16em] text-[var(--rv-muted)] md:mt-1 md:text-[9px]">
                  {item.scoreLabel}
                </p>
                {item.meta.length > 0 && (
                  <div className="mt-2 hidden items-center justify-center gap-3 border-t border-[var(--rv-line)] pt-2 md:flex">
                    {item.meta.slice(0, 4).map((m) => {
                      const Icon = statIcon(m.label)
                      return (
                        <span key={m.label} className="rv-type flex items-center gap-1 text-[10px] font-bold" title={m.label}>
                          <Icon className="h-3.5 w-3.5 text-[var(--rv-pink-ink)]" aria-hidden />
                          <AnimatedNumber value={m.value} compact={m.compact} />
                          <span className="sr-only">{m.label}</span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* pedestal de vidro: tampo claro + frente com o número */}
      <div className="relative mt-3 w-[94%] md:mt-4">
        <div
          aria-hidden
          className="h-2.5 md:h-4"
          style={{
            clipPath: "polygon(7% 0, 93% 0, 100% 100%, 0 100%)",
            background: isFirst ? "var(--rv-pink-hot)" : "rgba(244,244,240,0.18)",
          }}
        />
        <div
          className={cn("relative flex items-center justify-center", pedestalH)}
          style={{
            background: isFirst
              ? "linear-gradient(180deg, var(--rv-pink) 0%, rgba(255,0,122,0.55) 100%)"
              : "linear-gradient(180deg, rgba(244,244,240,0.1) 0%, rgba(244,244,240,0.03) 100%)",
            boxShadow: isFirst
              ? "0 0 46px rgba(255,0,122,0.6), inset 0 0 0 1px rgba(255,79,163,0.9)"
              : "inset 0 0 0 1px rgba(255,0,122,0.55), 0 0 18px rgba(255,0,122,0.18)",
          }}
        >
          <span className={cn("rv-wide relative z-10 text-3xl md:text-6xl", isFirst ? "text-[var(--rv-white)]" : "rv-outline")}>
            {item.rank}
          </span>
        </div>
      </div>
    </div>
  )
}

export function PodiumTop3({ items, onSelect, getSelectLabel, side }: PodiumTop3Props) {
  if (items.length === 0) return null
  return (
    <section className="relative mx-auto max-w-[1600px] px-4 pb-10 pt-6 md:px-8 md:pb-14">
      <div className={cn("grid items-end gap-8", side && "lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10")}>
        {side && (
          <div className="relative self-center" data-rv="left">
            <h2 className="rv-wide leading-[0.88]">
              <span className="rv-grunge block text-5xl md:text-6xl">{side.title[0]}</span>
              <span className="block text-2xl text-[var(--rv-pink)] md:text-3xl">{side.title[1]}</span>
            </h2>
            <p className="rv-type mt-4 max-w-[34ch] text-[11px] uppercase leading-[1.6] tracking-[0.06em] text-[var(--rv-muted)]">
              {side.text}
            </p>
            {side.script && (
              <p className="rv-script mt-4 -rotate-6 text-3xl leading-none text-[var(--rv-pink-ink)]">{side.script}</p>
            )}
          </div>
        )}

        <div className="mx-auto flex w-full max-w-4xl items-end justify-center gap-2 pt-10 sm:gap-4 md:gap-6 md:pt-14">
          {items.map((item) => (
            <PodiumColumn key={item.rank} item={item} onSelect={onSelect} selectLabel={getSelectLabel?.(item)} />
          ))}
        </div>
      </div>
    </section>
  )
}
