"use client"

/**
 * Página de XP do usuário — estilo tabloide (paleta dark/dourada), inspirada no
 * Ranking. Seleciona um subperfil, mostra a foto recortada com NÍVEL e XP
 * embaixo, barra de progresso pro próximo nível e um feed das 10 últimas coisas
 * que deram ponto (tempo online agregado por hora).
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Zap, Clock, Heart, Eye, Share2, UserPlus, MessageCircle, Star,
  CheckCircle2, CreditCard, Sparkles, BadgeCheck, TrendingUp, type LucideIcon,
} from "lucide-react"
import { PageShell, Section, PhotoFrame, EmptyState, ErrorState } from "@/components/tabloide"

type Profile = {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  is_clan?: boolean
}

type XpSummary = {
  xp_total: number
  xp_level: number
  xp_current_level: number
  xp_next_level: number
  xp_missing: number
  xp_progress_percent: number
}

type FeedItem = {
  event_type: string
  xp_amount: number
  created_at: string
  count: number
  minutes: number | null
}

// event_type -> rótulo + ícone
const EVENT_META: Record<string, { label: string; icon: LucideIcon }> = {
  profile_activated:        { label: "Ativação do perfil", icon: CheckCircle2 },
  profile_renewed:          { label: "Renovação da assinatura", icon: CreditCard },
  affiliate_sale_confirmed: { label: "Venda como afiliado", icon: TrendingUp },
  whatsapp_click:           { label: "Clique no WhatsApp", icon: MessageCircle },
  post_approved:            { label: "Post aprovado", icon: Sparkles },
  share_received:           { label: "Compartilhamento", icon: Share2 },
  follow_received:          { label: "Novo seguidor", icon: UserPlus },
  review_received:          { label: "Avaliação recebida", icon: Star },
  like_received:            { label: "Curtida recebida", icon: Heart },
  profile_visit:            { label: "Visita ao perfil", icon: Eye },
  content_retention:        { label: "Retenção de conteúdo", icon: Clock },
  online_time:              { label: "Tempo online", icon: Clock },
}

function fmtOnline(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m ? `${h}h ${m}min online` : `${h}h online`
  }
  return `${min} min online`
}

function fmtXp(x: number): string {
  if (x >= 10) return Math.round(x).toLocaleString("pt-BR")
  if (Number.isInteger(x)) return String(x)
  return x.toFixed(2).replace(/\.?0+$/, "")
}

function relTime(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const min = Math.floor(diff / 60000)
  if (min < 1) return "agora"
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const days = Math.floor(h / 24)
  if (days < 30) return `há ${days}d`
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export default function XpPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  // Avatar do usuário — fallback quando o subperfil não tem avatar próprio
  // (mesmo padrão do /account: subperfil.avatar_url || user.avatar).
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>("")
  const [summary, setSummary] = useState<XpSummary | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  // Carrega subperfis do usuário (não-clan — são os que ganham XP)
  useEffect(() => {
    if (!token) { window.location.href = "/login?next=/account/xp"; return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setUserAvatar(data?.avatar ?? null)
        const subs: Profile[] = (data?.profiles || []).filter((p: Profile) => !p.is_clan)
        setProfiles(subs)
        if (subs.length) setSelectedId(subs[0].id_profile)
      })
      .catch(() => setError("Não foi possível carregar seus perfis"))
      .finally(() => setLoadingProfiles(false))
  }, [token])

  const loadXp = useCallback(async (id: string) => {
    setLoadingData(true)
    setError("")
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const [sRes, fRes] = await Promise.all([
        fetch(`/api/subprofiles/${id}/xp-summary`, { headers }),
        fetch(`/api/subprofiles/${id}/xp-feed?limit=10`, { headers }),
      ])
      if (sRes.ok) setSummary(await sRes.json())
      else setSummary(null)
      if (fRes.ok) {
        const d = await fRes.json()
        setFeed(Array.isArray(d?.feed) ? d.feed : [])
      } else setFeed([])
    } catch {
      setError("Erro ao carregar o XP deste perfil")
    } finally {
      setLoadingData(false)
    }
  }, [token])

  useEffect(() => {
    if (selectedId) void loadXp(selectedId)
  }, [selectedId, loadXp])

  const selected = useMemo(
    () => profiles.find((p) => p.id_profile === selectedId) ?? null,
    [profiles, selectedId],
  )

  return (
    <PageShell>
      <Section className="pb-16 pt-12 sm:pt-16">
        {/* Masthead */}
        <div className="relative max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <Zap className="h-3.5 w-3.5" />
            Sua evolução na plataforma
          </div>
          <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl md:text-6xl">
            XP & Níveis
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9C2B6]">
            Cada subperfil acumula XP por interações reais — ativações, vendas, seguidores,
            avaliações, tempo online e mais. Escolha um perfil e veja como ele está evoluindo.
          </p>
        </div>

        {/* Select de perfil */}
        <div className="mt-8 max-w-md">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#9A938A]">
            Perfil
          </label>
          {loadingProfiles ? (
            <div className="h-12 w-full animate-pulse rounded-md bg-[#F5F1E8]/8" />
          ) : profiles.length === 0 ? (
            <p className="text-sm text-[#C9C2B6]">Você ainda não tem subperfis profissionais.</p>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-12 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-4 text-base font-bold text-[#F5F1E8] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] outline-none transition focus:border-[#F2B705]"
            >
              {profiles.map((p) => (
                <option key={p.id_profile} value={p.id_profile}>
                  {p.display_name || "Perfil sem nome"}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Conteúdo */}
        {error ? (
          <div className="mt-10"><ErrorState description={error} onRetry={() => selectedId && loadXp(selectedId)} /></div>
        ) : !selected ? null : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
            {/* ===== Hero: foto + nível + XP embaixo ===== */}
            <div className="relative">
              <PhotoFrame
                src={selected.avatar_url || userAvatar || undefined}
                alt={selected.display_name || "Perfil"}
                ready
                torn
                cut
                icon="zap"
                className="aspect-[4/5] w-full"
              />
              {/* Selo de nível sobre a foto */}
              <span className="fl-display absolute -left-2 -top-3 rotate-[-5deg] bg-[#F2B705] px-3 py-1 text-2xl text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]">
                NV {summary?.xp_level ?? 0}
              </span>

              {/* Bloco de NÍVEL + XP embaixo da foto */}
              <div className="mt-4 border-2 border-[#F5F1E8]/12 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                <h2 className="fl-display text-2xl leading-none text-[#F5F1E8]">
                  {selected.display_name || "Perfil sem nome"}
                </h2>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A938A]">Nível</p>
                    <p className="fl-display text-6xl leading-none text-[#F2B705]">
                      {loadingData ? "—" : (summary?.xp_level ?? 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A938A]">XP total</p>
                    <p className="fl-display text-3xl leading-none text-[#F5F1E8]">
                      {loadingData ? "—" : Math.round(summary?.xp_total ?? 0).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Barra de progresso pro próximo nível */}
                {summary && (
                  <div className="mt-5">
                    <div className="h-3 w-full overflow-hidden rounded-full border border-[#F5F1E8]/10 bg-[#0E0B06]">
                      <div
                        className="h-full bg-[#F2B705] transition-all duration-700"
                        style={{ width: `${summary.xp_progress_percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#C9C2B6]">
                      {summary.xp_missing > 0 ? (
                        <>Faltam <span className="font-bold text-[#F2B705]">{Math.round(summary.xp_missing).toLocaleString("pt-BR")} XP</span> para o nível {summary.xp_level + 1}</>
                      ) : (
                        <>Pronto para o próximo nível 🎉</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ===== Feed: últimas 10 coisas que deram ponto ===== */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="fl-display inline-block -rotate-1 bg-[#F2B705] px-3 py-1 text-lg text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.45)]">
                  Últimos pontos
                </span>
                <span className="h-[2px] flex-1 bg-[#F5F1E8]/12" />
              </div>

              {loadingData ? (
                <ul className="space-y-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="h-16 animate-pulse rounded-md border-2 border-[#F5F1E8]/8 bg-[#1D1810]" />
                  ))}
                </ul>
              ) : feed.length === 0 ? (
                <EmptyState
                  icon={<Zap className="h-6 w-6" />}
                  title="Nenhum ponto ainda"
                  description="Quando esse perfil receber curtidas, seguidores, avaliações ou tempo online, os ganhos de XP aparecem aqui."
                />
              ) : (
                <ul className="space-y-2">
                  {feed.map((item, i) => {
                    const meta = EVENT_META[item.event_type] ?? { label: item.event_type, icon: Zap }
                    const Icon = meta.icon
                    const title =
                      item.event_type === "online_time" && item.minutes
                        ? fmtOnline(item.minutes)
                        : meta.label
                    return (
                      <li
                        key={`${item.event_type}-${item.created_at}-${i}`}
                        className="flex items-center gap-3 rounded-md border-2 border-[#F5F1E8]/10 bg-[#1D1810] p-3 shadow-[3px_3px_0_0_rgba(0,0,0,0.35)] transition-colors hover:border-[#F2B705]/40"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#F2B705]/30 bg-[#F2B705]/10 text-[#F2B705]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-[#F5F1E8]">{title}</p>
                          <p className="text-xs text-[#9A938A]">{relTime(item.created_at)}</p>
                        </div>
                        <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap">
                          <BadgeCheck className="h-4 w-4 text-[#F2B705]/70" />
                          <span className="fl-display text-xl text-[#F2B705]">+{fmtXp(item.xp_amount)} XP</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Section>
    </PageShell>
  )
}
