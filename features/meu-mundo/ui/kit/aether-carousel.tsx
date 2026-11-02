"use client"

// features/meu-mundo/ui/kit/aether-carousel.tsx — mm3d-59: o CARROSSEL de cards.
//
// Card ativo na frente, nítido, inteiro e com a ação principal; os vizinhos
// aparecem dos lados indicando continuidade, OPACOS (só escurecem por um véu
// preto opaco por cima e diminuem). Só o ativo é interativo/focável: os outros
// ficam `inert` (fora do foco e da árvore acessível). Navegação por arrasto
// (swipe), botões anterior/próximo (44 px) e setas do teclado, com o título da
// seção e a posição ("3 de 8"). Um carrossel horizontal por tela — dentro do
// card, rolagem só VERTICAL (nada de carrossel aninhado disputando o gesto).
// Só transform anima; a superfície de cada card é sempre opaca.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion, type PanInfo } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { archivo, teko } from "../status/evo-skin"
import { AE, chamfer } from "./aether-tokens"

export interface CarouselItem {
  key: string
  /** Rótulo curto para leitores de tela ("Espada de latão"). */
  label: string
  render: (active: boolean) => ReactNode
}

export function AetherCarousel({
  title,
  items,
  index: controlled,
  initial = 0,
  onIndex,
  cardWidth = 300,
  cardHeight = 420,
  empty,
}: {
  title?: string
  items: CarouselItem[]
  index?: number
  /** Card de partida (não controlado). */
  initial?: number
  onIndex?: (i: number) => void
  cardWidth?: number
  cardHeight?: number
  empty?: ReactNode
}) {
  const t = useTranslations("MeuMundo")
  const reduce = useReducedMotion()
  const [own, setOwn] = useState(initial)
  const n = items.length
  const idx = Math.max(0, Math.min(n - 1, controlled ?? own))
  const setIdx = useCallback(
    (i: number) => {
      const c = Math.max(0, Math.min(n - 1, i))
      setOwn(c)
      onIndex?.(c)
    },
    [n, onIndex],
  )
  const wrap = useRef<HTMLDivElement | null>(null)
  const [vw, setVw] = useState(cardWidth * 2)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setVw(el.clientWidth))
    ro.observe(el)
    setVw(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  // no celular o card ocupa quase a largura; os vizinhos mostram só a borda
  const w = Math.min(cardWidth, Math.max(220, vw - 72))
  const gap = Math.max(14, Math.min(28, vw * 0.03))

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      setIdx(idx + 1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      setIdx(idx - 1)
    } else if (e.key === "Home") setIdx(0)
    else if (e.key === "End") setIdx(n - 1)
  }
  const onPanEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x
    const v = info.velocity.x
    if (dx < -w * 0.18 || v < -450) setIdx(idx + 1)
    else if (dx > w * 0.18 || v > 450) setIdx(idx - 1)
  }

  if (!n) return <div className="py-8 text-center text-[14px]" style={{ color: AE.muted }}>{empty}</div>

  return (
    <section aria-roledescription="carousel" aria-label={title} className="relative select-none" onKeyDown={onKey}>
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        {title && (
          <h3 className={`${teko.className} text-[22px] font-semibold uppercase leading-none tracking-wide`} style={{ color: AE.goldSoft }}>
            {title}
          </h3>
        )}
        <span className={`${archivo.className} text-[12px] font-semibold tabular-nums`} style={{ color: AE.muted }} aria-live="polite">
          {t("carouselPos", "{i} de {n}").replace("{i}", String(idx + 1)).replace("{n}", String(n))}
        </span>
      </div>
      <motion.div
        ref={wrap}
        className="relative overflow-hidden"
        style={{ height: cardHeight + 8, touchAction: "pan-y" }}
        onPanEnd={onPanEnd}
      >
        {items.map((it, i) => {
          const rel = i - idx
          if (Math.abs(rel) > 2) return null
          const active = rel === 0
          const x = rel * (w + gap)
          return (
            <motion.div
              key={it.key}
              role="group"
              aria-roledescription="slide"
              aria-label={`${it.label} — ${t("carouselPos", "{i} de {n}").replace("{i}", String(i + 1)).replace("{n}", String(n))}`}
              aria-hidden={active ? undefined : true}
              inert={!active}
              className="absolute top-1"
              style={{ width: w, height: cardHeight, left: "50%", marginLeft: -w / 2, zIndex: 10 - Math.abs(rel) }}
              initial={false}
              animate={{ x, scale: active ? 1 : 0.9 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38, mass: 0.8 }}
              onClick={() => !active && setIdx(i)}
            >
              <div className="h-full w-full" style={{ background: active ? AE.gold : AE.brassLine, clipPath: chamfer(AE.cut.card), padding: active ? 2 : 1 }}>
                <div className="relative h-full w-full overflow-hidden" style={{ background: active ? AE.steelHi : AE.steel, clipPath: chamfer(AE.cut.card - 1) }}>
                  {it.render(active)}
                  {/* vizinho: véu preto OPACO por cima (o card não fica transparente) */}
                  {!active && <div className="pointer-events-none absolute inset-0" style={{ background: "#000", opacity: 0.45 }} aria-hidden />}
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIdx(idx - 1)}
          disabled={idx <= 0}
          aria-label={t("carouselPrev", "Anterior")}
          className="grid h-11 w-11 place-items-center outline-none focus-visible:ring-2 disabled:cursor-not-allowed"
          style={{ background: AE.brassPlate, color: idx <= 0 ? AE.dim : AE.goldSoft, clipPath: chamfer(AE.cut.button) }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex max-w-[50%] gap-1 overflow-hidden" aria-hidden>
          {items.slice(0, 12).map((it, i) => (
            <span key={it.key} className="h-1.5 w-3" style={{ background: i === idx ? AE.gold : AE.brassLine }} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIdx(idx + 1)}
          disabled={idx >= n - 1}
          aria-label={t("carouselNext", "Próximo")}
          className="grid h-11 w-11 place-items-center outline-none focus-visible:ring-2 disabled:cursor-not-allowed"
          style={{ background: AE.brassPlate, color: idx >= n - 1 ? AE.dim : AE.goldSoft, clipPath: chamfer(AE.cut.button) }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  )
}

/** Abas do kit (categorias): botões retos, a ativa em dourado. Rolagem horizontal própria, fora do carrossel. */
export function AetherTabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {tabs.map((tb) => {
        const on = tb.id === value
        return (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tb.id)}
            className={`${teko.className} min-h-11 shrink-0 px-4 text-[18px] font-semibold uppercase tracking-wide outline-none focus-visible:ring-2`}
            style={{ background: on ? AE.goldPlate : AE.steel, color: on ? AE.ink : AE.muted, clipPath: chamfer(AE.cut.chip) }}
          >
            {tb.label}
          </button>
        )
      })}
    </div>
  )
}
