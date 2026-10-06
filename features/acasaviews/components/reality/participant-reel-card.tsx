import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Eye, Heart, MessageCircle, Minus, Share2 } from "lucide-react"
import type { ParticipantCard } from "@/lib/acasaviews/participants-live"
import { TiltCard } from "./tilt-card"
import { ScoreCounter } from "./score-counter"
import { compactBR, pad2 } from "./format"

const STATUS_LABEL: Record<string, string> = {
  active: "na casa",
  eliminated: "eliminado",
  finalist: "finalista",
  winner: "campeão",
}

/**
 * Card de participante da pele escura: foto dominante (P&B duro, ganha cor no
 * hover), posição real gigante sobreposta, métricas das redes em mono.
 *
 * ⚠️ Tendência só existe quando o backend tem `posicao_prev` — sem ele o card
 * NÃO mostra seta (não se inventa histórico). Participante que não casou com o
 * módulo de ranking aparece "fora do placar", sem números zerados fingindo
 * desempenho.
 */
export function ParticipantReelCard({ p, delay = 0 }: { p: ParticipantCard; delay?: number }) {
  const live = p.live
  const pos = live.matched && live.posicao ? live.posicao : null
  const prev = live.matched ? live.posicao_prev : null
  const trend = pos && prev ? (pos < prev ? "up" : pos > prev ? "down" : "same") : null
  const img = p.avatar_url || p.cover_url || "/placeholder-user.jpg"
  const eliminated = p.status === "eliminated"

  return (
    <div data-rv style={{ ["--rv-delay" as string]: `${delay}ms` }} className="h-full">
      <TiltCard className="h-full border border-[var(--rv-line-strong)] bg-[var(--rv-surface)]" max={4}>
        <Link
          href={`/acasaviews/participantes/${p.slug}`}
          className="group flex h-full flex-col"
          aria-label={`${p.display_name}${pos ? `, ${pos}º no placar de hoje` : ""}: ver dossiê`}
        >
          <div className="rv-scan relative aspect-square overflow-hidden border-b border-[var(--rv-line-strong)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt=""
              loading="lazy"
              className={`rv-photo absolute inset-0 h-full w-full object-cover ${eliminated ? "opacity-50" : ""}`}
            />
            <span aria-hidden className="rv-photo-tint" />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{ background: "linear-gradient(to top, rgba(5,5,5,0.92), transparent)" }}
            />

            <span className="rv-sticker absolute left-3 top-3 z-[3] -rotate-2">{STATUS_LABEL[p.status] || p.status}</span>

            {pos ? (
              <span aria-hidden className="rv-display rv-outline absolute -bottom-3 right-2 z-[3] text-[96px] leading-none md:text-[112px]">
                {pad2(pos)}
              </span>
            ) : (
              <span className="rv-label absolute right-3 top-3 z-[3] border border-[var(--rv-line-strong)] bg-[var(--rv-bg)] px-1.5 py-1 text-[9px] text-[var(--rv-muted)]">fora do placar</span>
            )}

            {trend && (
              <span
                className="rv-mono absolute right-3 top-3 z-[3] inline-flex items-center gap-1 border border-[var(--rv-line-strong)] bg-[var(--rv-bg)] px-1.5 py-1 text-[10px]"
                style={{ color: trend === "up" ? "var(--rv-up)" : trend === "down" ? "var(--rv-down)" : "var(--rv-muted)" }}
                title={`ontem: ${prev}º`}
              >
                {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {trend === "same" ? "estável" : `${Math.abs((prev ?? 0) - pos!)} pos.`}
              </span>
            )}

            <div className="absolute inset-x-3 bottom-3 z-[3] pr-20">
              <h3 className="rv-title-shift rv-display text-[34px] leading-[0.86] text-[var(--rv-white)]">{p.display_name}</h3>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-3">
            {p.tagline && <p className="line-clamp-2 text-xs font-semibold text-[var(--rv-muted)]">{p.tagline}</p>}

            {live.matched ? (
              <>
                <div className="flex items-end justify-between border-b border-dashed border-[var(--rv-line)] pb-2">
                  <span className="rv-label text-[var(--rv-faint)]">pontos</span>
                  <ScoreCounter value={live.pontuacao} className="rv-display text-3xl leading-none text-[var(--rv-pink-ink)]" />
                </div>
                <dl className="grid grid-cols-4 gap-1">
                  <Metric icon={<Eye className="h-3 w-3" />} label="views" value={live.views} />
                  <Metric icon={<Heart className="h-3 w-3" />} label="likes" value={live.likes} />
                  <Metric icon={<MessageCircle className="h-3 w-3" />} label="coment." value={live.comments} />
                  <Metric icon={<Share2 className="h-3 w-3" />} label="shares" value={live.shares} />
                </dl>
              </>
            ) : (
              <p className="rv-mono text-[11px] text-[var(--rv-faint)]">sem perfil ligado ao placar ainda</p>
            )}

            <span className="mt-auto inline-flex items-center gap-1.5 rv-label text-[var(--rv-white)]">
              ver dossiê
              <ArrowUpRight className="h-4 w-4 text-[var(--rv-pink)] transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </TiltCard>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border border-[var(--rv-line)] px-1.5 py-1">
      <dt className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[var(--rv-faint)]">
        <span className="text-[var(--rv-pink-ink)]">{icon}</span>
        {label}
      </dt>
      <dd className="rv-mono text-[13px] font-semibold text-[var(--rv-white)]">{compactBR(value)}</dd>
    </div>
  )
}
