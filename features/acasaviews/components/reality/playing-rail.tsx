"use client"

import { useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Eye, Flame, Heart, MessageCircle, User, Users } from "lucide-react"
import { compactBR, pad2 } from "./format"

export type RailItem = {
  id: string
  rank: number | null
  name: string
  img: string | null
  /** número grande do card (pontos) — null = fora do placar */
  score: number | null
  href: string | null
  stats: { kind: "views" | "likes" | "comments"; value: number }[]
}

const STAT_ICON = { views: Eye, likes: Heart, comments: MessageCircle }

/**
 * "Quem está jogando": trilho horizontal com as setas redondas da referência
 * e a alternância Participantes × Audiência. As duas listas chegam prontas do
 * servidor (a alternância só troca qual delas é desenhada — zero requisição).
 *
 * ⚠️ Sem ícone de rede social no card: a referência mostra TikTok/YouTube,
 * mas o cadastro do participante não guarda as redes dele. Ícone sem link
 * seria enfeite prometendo um perfil que não existe — no lugar ficam as
 * métricas reais do placar.
 */
export function PlayingRail({ participants, audience }: { participants: RailItem[]; audience: RailItem[] }) {
  const [tab, setTab] = useState<"participants" | "audience">("participants")
  const railRef = useRef<HTMLDivElement>(null)
  const items = tab === "participants" ? participants : audience

  const scroll = (dir: 1 | -1) => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" })
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5" data-rv>
        <div className="flex min-w-0 basis-full items-center gap-4 xl:basis-0 xl:flex-1">
          <h2 className="rv-wide min-w-0 text-[clamp(1.7rem,3.7vw,3.6rem)] leading-[0.9]">
            <span className="rv-grunge-outline">Quem está</span> <span className="rv-grunge">jogando</span>
          </h2>
          <span aria-hidden className="h-0 w-0 shrink-0 border-y-[9px] border-l-[12px] border-y-transparent border-l-[var(--rv-pink)]" />
          <span aria-hidden className="rv-dotline hidden h-2 flex-1 md:block" />
        </div>
        <div className="flex flex-wrap gap-3" role="tablist" aria-label="Quem mostrar">
          <TabBtn active={tab === "participants"} onClick={() => setTab("participants")} icon={<User className="h-5 w-5" />}>
            Participantes
          </TabBtn>
          <TabBtn active={tab === "audience"} onClick={() => setTab("audience")} icon={<Users className="h-5 w-5" />}>
            Audiência
          </TabBtn>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-[var(--rv-line-strong)] px-6 py-14 text-center">
          <p className="rv-wide text-2xl">{tab === "participants" ? "Ninguém na casa ainda." : "A audiência ainda não pontuou."}</p>
          <p className="rv-type mt-2 text-xs text-[var(--rv-muted)]">O placar abre assim que os números chegarem das redes.</p>
        </div>
      ) : (
        <div className="relative md:px-16">
          <RoundArrow side="left" onClick={() => scroll(-1)} />
          <div
            ref={railRef}
            className="rv-rail rv-rail-bare pb-2 [grid-auto-columns:62%] sm:[grid-auto-columns:38%] md:[grid-auto-columns:calc((100%-48px)/4)] xl:[grid-auto-columns:calc((100%-80px)/6)]"
          >
            {items.map((it, i) => (
              <RailCard key={`${tab}-${it.id}`} it={it} index={i} />
            ))}
          </div>
          <RoundArrow side="right" onClick={() => scroll(1)} />
        </div>
      )}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rv-type inline-flex items-center gap-3 border-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors md:px-6 md:py-3 md:text-[13px] ${
        active
          ? "rv-glow-box border-[var(--rv-pink)] bg-[var(--rv-pink)] text-[var(--rv-white)]"
          : "border-[var(--rv-white)] text-[var(--rv-white)] hover:border-[var(--rv-pink)] hover:text-[var(--rv-pink-ink)]"
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

/** Seta redonda (círculo é exceção da regra de cantos — como avatar). */
function RoundArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ArrowLeft : ArrowRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Anterior" : "Próximo"}
      data-avatar
      className={`absolute top-1/2 z-[3] hidden h-12 w-12 -translate-y-1/2 items-center justify-center border-2 border-[var(--rv-white)] bg-[var(--rv-bg)] text-[var(--rv-pink-ink)] transition-colors hover:border-[var(--rv-pink)] hover:bg-[var(--rv-pink)] hover:text-[var(--rv-white)] md:flex ${
        side === "left" ? "left-0" : "right-0"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.5} />
    </button>
  )
}

function RailCard({ it, index }: { it: RailItem; index: number }) {
  const body = (
    <div className="rv-frame h-full [--c:16px]">
      <div className="rv-frame-in">
        <div className="relative aspect-[4/5] overflow-hidden">
          {it.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.img}
              alt=""
              loading="lazy"
              className="rv-duo absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span aria-hidden className="absolute inset-0 flex items-center justify-center">
              <span className="rv-halftone absolute inset-0 opacity-30" />
              <span className="rv-wide relative text-[88px] leading-none text-[var(--rv-white)] opacity-90">
                {(it.name.replace(/^@/, "").trim()[0] || "?").toUpperCase()}
              </span>
            </span>
          )}
          <span aria-hidden className="rv-duo-tint" />
          <span aria-hidden className="rv-scan absolute inset-0" />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: "linear-gradient(to top, rgba(5,5,5,0.95), transparent)" }}
          />
          <span className="rv-wide absolute left-2.5 top-2.5 z-[3] bg-[var(--rv-bg)] px-1.5 py-0.5 text-[22px] leading-none md:text-[24px]">
            {pad2(it.rank ?? index + 1)}
          </span>
          <div className="absolute inset-x-2.5 bottom-2 z-[3]">
            <p className="rv-type truncate text-[10px] uppercase tracking-[0.12em] text-[var(--rv-white)]">{it.name}</p>
            <div className="mt-0.5 flex items-end justify-between gap-2">
              {it.score != null ? (
                <span className="flex items-center gap-1.5">
                  <Flame className="h-5 w-5 shrink-0 fill-[var(--rv-pink)] text-[var(--rv-pink)]" aria-hidden />
                  <span className="rv-display text-[26px] leading-none md:text-[28px]">{compactBR(it.score)}</span>
                  <span className="sr-only">pontos</span>
                </span>
              ) : (
                <span className="rv-type text-[10px] text-[var(--rv-faint)]">fora do placar</span>
              )}
              <span className="flex shrink-0 items-center gap-1.5 text-[var(--rv-white)]">
                {it.stats.slice(0, 2).map((s) => {
                  const Ic = STAT_ICON[s.kind]
                  return (
                    <span key={s.kind} className="flex items-center gap-0.5" title={`${s.value} ${s.kind}`}>
                      <Ic className="h-3.5 w-3.5" aria-hidden />
                      <span className="rv-type text-[9px]">{compactBR(s.value)}</span>
                    </span>
                  )
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  // ⚠️ Sem `data-rv`: a revelação por rolagem só observa o que existia no
  // carregamento, e trocar de aba MONTA cards novos — eles nasceriam
  // escondidos para sempre. A entrada aqui é a animação curta do CSS.
  return (
    <div className="rv-page-in" style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}>
      {it.href ? (
        <Link href={it.href} className="group block h-full" aria-label={`${it.name}: ver dossiê`}>
          {body}
        </Link>
      ) : (
        <div className="group h-full">{body}</div>
      )}
    </div>
  )
}
