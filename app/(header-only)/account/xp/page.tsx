"use client"

/**
 * Página de XP + Engajamento do usuário — estilo tabloide (paleta dark/dourada).
 * Duas abas:
 *  - "XP & Níveis": foto recortada com NÍVEL/XP, barra de progresso e feed dos
 *    10 últimos ganhos (por perfil); no escopo Conta, grade de mini-cards.
 *  - "Engajamento": painel de métricas (views por canal, interações, seguidores,
 *    região, enxame, top conteúdo, horários) — ver <EngagementTab />.
 * Um seletor de escopo no topo (Conta · @username, depois subperfis e clans) é
 * compartilhado pelas duas abas.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Zap, Clock, Heart, Eye, Share2, UserPlus, MessageCircle, Star,
  CheckCircle2, CreditCard, Sparkles, BadgeCheck, TrendingUp, BarChart3,
  type LucideIcon,
} from "lucide-react"
import { PageShell, Section, PhotoFrame, EmptyState, ErrorState } from "@/components/tabloide"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import EngagementTab from "./EngagementTab"

type Translator = (key: string, fallback: string) => string
const INTL_TAG: Record<string, string> = { "pt-BR": "pt-BR", en: "en-US", es: "es-ES" }

type Profile = {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  is_clan?: boolean
  is_user_account?: boolean
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

// event_type -> rótulo + ícone (labelKey resolvido no render)
const EVENT_META: Record<string, { labelKey: string; label: string; icon: LucideIcon }> = {
  profile_activated:        { labelKey: "xpEvProfileActivated", label: "Ativação do perfil", icon: CheckCircle2 },
  profile_renewed:          { labelKey: "xpEvProfileRenewed", label: "Renovação da assinatura", icon: CreditCard },
  affiliate_sale_confirmed: { labelKey: "xpEvAffiliateSale", label: "Venda como afiliado", icon: TrendingUp },
  whatsapp_click:           { labelKey: "xpEvWhatsappClick", label: "Clique no WhatsApp", icon: MessageCircle },
  post_approved:            { labelKey: "xpEvPostApproved", label: "Post aprovado", icon: Sparkles },
  share_received:           { labelKey: "xpEvShare", label: "Compartilhamento", icon: Share2 },
  follow_received:          { labelKey: "xpEvFollow", label: "Novo seguidor", icon: UserPlus },
  review_received:          { labelKey: "xpEvReview", label: "Avaliação recebida", icon: Star },
  like_received:            { labelKey: "xpEvLike", label: "Curtida recebida", icon: Heart },
  profile_visit:            { labelKey: "xpEvVisit", label: "Visita ao perfil", icon: Eye },
  content_retention:        { labelKey: "xpEvRetention", label: "Retenção de conteúdo", icon: Clock },
  online_time:              { labelKey: "xpEvOnlineTime", label: "Tempo online", icon: Clock },
}

const ACCOUNT = "account"

function fmtOnline(min: number, t: Translator): string {
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return m
      ? `${h}h ${m}min ${t("online", "online")}`
      : `${h}h ${t("online", "online")}`
  }
  return `${min} min ${t("online", "online")}`
}

function fmtXp(x: number, intlTag: string): string {
  if (x >= 10) return Math.round(x).toLocaleString(intlTag)
  if (Number.isInteger(x)) return String(x)
  return x.toFixed(2).replace(/\.?0+$/, "")
}

function relTime(iso: string, intlTag: string, t: Translator): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const min = Math.floor(diff / 60000)
  if (min < 1) return t("justNow", "agora")
  const rtf = new Intl.RelativeTimeFormat(intlTag, { numeric: "always" })
  if (min < 60) return rtf.format(-min, "minute")
  const h = Math.floor(min / 60)
  if (h < 24) return rtf.format(-h, "hour")
  const days = Math.floor(h / 24)
  if (days < 30) return rtf.format(-days, "day")
  return new Date(iso).toLocaleDateString(intlTag, { day: "2-digit", month: "2-digit" })
}

export default function XpPage() {
  const t = useTranslations("Account")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [username, setUsername] = useState<string>("")
  // Avatar do usuário — fallback quando o subperfil não tem avatar próprio.
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  // Escopo selecionado: "account" ou um id_profile (subperfil/clan).
  const [scope, setScope] = useState<string>(ACCOUNT)
  const [tab, setTab] = useState<"xp" | "engagement">("xp")
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [profilesError, setProfilesError] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  // Carrega perfis do usuário (subperfis + clans).
  useEffect(() => {
    if (!token) { window.location.href = "/login?next=/account/xp"; return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setUserAvatar(data?.avatar ?? null)
        setUsername(data?.username ?? "")
        const all: Profile[] = (data?.profiles || []).filter(
          (p: Profile & { deleted_at?: string | null }) => !p.deleted_at,
        )
        setProfiles(all)
      })
      .catch(() => setProfilesError(true))
      .finally(() => setLoadingProfiles(false))
  }, [token])

  // Paridade user≡subperfil: o perfil-conta ganha entrada própria no escopo.
  const accountProfile = useMemo(
    () => profiles.find((p) => p.is_user_account) || null,
    [profiles],
  )
  const subprofiles = useMemo(
    () => profiles.filter((p) => !p.is_clan && !p.is_user_account),
    [profiles],
  )
  const clans = useMemo(() => profiles.filter((p) => p.is_clan), [profiles])
  // Grid do escopo "Conta inteira": perfil-conta primeiro, depois subperfis.
  const overviewProfiles = useMemo(
    () => (accountProfile ? [accountProfile, ...subprofiles] : subprofiles),
    [accountProfile, subprofiles],
  )

  return (
    <PageShell>
      <Section className="pb-16 pt-12 sm:pt-16">
        {/* Masthead */}
        <div className="relative max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <Zap className="h-3.5 w-3.5" />
            {t("xpEyebrow", "Sua evolução na plataforma")}
          </div>
          <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl md:text-6xl">
            {t("xpEngagementTitle", "XP & Engajamento")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9C2B6]">
            {t("xpEngagementSubtitle", "Acompanhe o XP por interações reais e o engajamento do seu conteúdo — views, seguidores, regiões, enxames e horários. Escolha a conta inteira ou um perfil específico.")}
          </p>
        </div>

        {/* Seletor de escopo (compartilhado pelas abas) */}
        <div className="mt-8 max-w-md">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#9A938A]">
            {t("profileLabel", "Perfil")}
          </label>
          {loadingProfiles ? (
            <div className="h-12 w-full animate-pulse rounded-md bg-[#F5F1E8]/8" />
          ) : (
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="h-12 w-full rounded-md border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-4 text-base font-bold text-[#F5F1E8] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)] outline-none transition focus:border-[#F2B705]"
            >
              <option value={ACCOUNT}>
                {t("wholeAccount", "Conta inteira")}{username ? ` · @${username}` : ""}
              </option>
              {accountProfile && (
                <option value={accountProfile.id_profile}>
                  {t("accountProfileOption", "Meu perfil (conta)")}{username ? ` · @${username}` : ""}
                </option>
              )}
              {subprofiles.length > 0 && (
                <optgroup label={t("subprofilesGroup", "Subperfis")}>
                  {subprofiles.map((p) => (
                    <option key={p.id_profile} value={p.id_profile}>
                      {p.display_name || t("unnamedProfile", "Perfil sem nome")}
                    </option>
                  ))}
                </optgroup>
              )}
              {clans.length > 0 && (
                <optgroup label={t("countClans", "Clans")}>
                  {clans.map((p) => (
                    <option key={p.id_profile} value={p.id_profile}>
                      {p.display_name || t("unnamedClan", "Clan sem nome")}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
        </div>

        {/* Abas */}
        <div className="mt-6 flex flex-wrap gap-2">
          {([
            { key: "xp" as const, label: t("tabXpLevels", "XP & Níveis"), icon: Zap },
            { key: "engagement" as const, label: t("tabEngagement", "Engajamento"), icon: BarChart3 },
          ]).map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`inline-flex items-center gap-2 rounded-md border-2 px-4 py-2 text-sm font-bold transition ${
                tab === tabItem.key
                  ? "border-[#F2B705] bg-[#F2B705] text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]"
                  : "border-[#F5F1E8]/15 bg-[#1D1810] text-[#C9C2B6] hover:border-[#F2B705]/40"
              }`}
            >
              <tabItem.icon className="h-4 w-4" />
              {tabItem.label}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {profilesError ? (
            <ErrorState description={t("loadProfilesError", "Não foi possível carregar seus perfis.")} onRetry={() => window.location.reload()} />
          ) : tab === "engagement" ? (
            <EngagementTab
              scope={scope === ACCOUNT ? "account" : "profile"}
              idProfile={scope === ACCOUNT ? null : scope}
            />
          ) : scope === ACCOUNT ? (
            <AccountXpOverview subprofiles={overviewProfiles} userAvatar={userAvatar} token={token} onSelect={setScope} />
          ) : (
            <ProfileXp
              profile={profiles.find((p) => p.id_profile === scope) ?? null}
              userAvatar={userAvatar}
              token={token}
            />
          )}
        </div>
      </Section>
    </PageShell>
  )
}

/* ─── XP de um perfil (subperfil ou clan) ─────────────────────────────────── */
function ProfileXp({
  profile, userAvatar, token,
}: { profile: Profile | null; userAvatar: string | null; token: string | null }) {
  const t = useTranslations("Account")
  const locale = useLocale()
  const intlTag = INTL_TAG[locale] || "pt-BR"
  const [summary, setSummary] = useState<XpSummary | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const id = profile?.id_profile ?? ""

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError("")
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const [sRes, fRes] = await Promise.all([
        fetch(`/api/subprofiles/${id}/xp-summary`, { headers }),
        fetch(`/api/subprofiles/${id}/xp-feed?limit=10`, { headers }),
      ])
      setSummary(sRes.ok ? await sRes.json() : null)
      if (fRes.ok) {
        const d = await fRes.json()
        setFeed(Array.isArray(d?.feed) ? d.feed : [])
      } else setFeed([])
    } catch {
      setError(t("loadProfileXpError", "Erro ao carregar o XP deste perfil"))
    } finally {
      setLoading(false)
    }
  }, [id, token, t])

  useEffect(() => { void load() }, [load])

  if (!profile) return null
  if (error) return <ErrorState description={error} onRetry={load} />

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* Hero: foto + nível + XP */}
      <div className="relative">
        <PhotoFrame
          src={profile.avatar_url || userAvatar || undefined}
          alt={profile.display_name || "Perfil"}
          ready torn cut icon="zap"
          className="aspect-[4/5] w-full"
        />
        <span className="fl-display absolute -left-2 -top-3 rotate-[-5deg] bg-[#F2B705] px-3 py-1 text-2xl text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]">
          {t("levelShort", "NV")} {summary?.xp_level ?? 0}
        </span>

        <div className="mt-4 border-2 border-[#F5F1E8]/12 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
          <h2 className="fl-display text-2xl leading-none text-[#F5F1E8]">
            {profile.display_name || t("unnamedProfile", "Perfil sem nome")}
          </h2>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A938A]">{t("levelLabel", "Nível")}</p>
              <p className="fl-display text-6xl leading-none text-[#F2B705]">
                {loading ? "—" : (summary?.xp_level ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A938A]">{t("xpTotalLabel", "XP total")}</p>
              <p className="fl-display text-3xl leading-none text-[#F5F1E8]">
                {loading ? "—" : Math.round(summary?.xp_total ?? 0).toLocaleString(intlTag)}
              </p>
            </div>
          </div>

          {summary && (
            <div className="mt-5">
              <div className="h-3 w-full overflow-hidden rounded-full border border-[#F5F1E8]/10 bg-[#0E0B06]">
                <div className="h-full bg-[#F2B705] transition-all duration-700" style={{ width: `${summary.xp_progress_percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-[#C9C2B6]">
                {summary.xp_missing > 0 ? (
                  <>{t("xpMissingPrefix", "Faltam")} <span className="font-bold text-[#F2B705]">{Math.round(summary.xp_missing).toLocaleString(intlTag)} XP</span> {t("xpForLevel", "para o nível")} {summary.xp_level + 1}</>
                ) : (
                  <>{t("readyNextLevel", "Pronto para o próximo nível 🎉")}</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feed dos últimos pontos */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <span className="fl-display inline-block -rotate-1 bg-[#F2B705] px-3 py-1 text-lg text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.45)]">
            {t("lastPoints", "Últimos pontos")}
          </span>
          <span className="h-[2px] flex-1 bg-[#F5F1E8]/12" />
        </div>

        {loading ? (
          <ul className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="h-16 animate-pulse rounded-md border-2 border-[#F5F1E8]/8 bg-[#1D1810]" />
            ))}
          </ul>
        ) : feed.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-6 w-6" />}
            title={profile.is_clan
              ? t("clanNoXpTitle", "Clan não acumula XP por evento")
              : t("noPointsYet", "Nenhum ponto ainda")}
            description={profile.is_clan
              ? t("clanNoXpDesc", "O XP do clan é a média dos membros. Os ganhos de XP por evento aparecem no perfil de cada membro.")
              : t("noPointsYetDesc", "Quando esse perfil receber curtidas, seguidores, avaliações ou tempo online, os ganhos de XP aparecem aqui.")}
          />
        ) : (
          <ul className="space-y-2">
            {feed.map((item, i) => {
              const meta = EVENT_META[item.event_type]
              const Icon = meta?.icon ?? Zap
              const title =
                item.event_type === "online_time" && item.minutes
                  ? fmtOnline(item.minutes, t)
                  : meta
                    ? t(meta.labelKey, meta.label)
                    : item.event_type
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
                    <p className="text-xs text-[#9A938A]">{relTime(item.created_at, intlTag, t)}</p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap">
                    <BadgeCheck className="h-4 w-4 text-[#F2B705]/70" />
                    <span className="fl-display text-xl text-[#F2B705]">+{fmtXp(item.xp_amount, intlTag)} XP</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ─── Visão geral de XP da conta (grade de subperfis) ─────────────────────── */
function AccountXpOverview({
  subprofiles, userAvatar, token, onSelect,
}: {
  subprofiles: Profile[]
  userAvatar: string | null
  token: string | null
  onSelect: (id: string) => void
}) {
  const t = useTranslations("Account")
  const locale = useLocale()
  const intlTag = INTL_TAG[locale] || "pt-BR"
  const [summaries, setSummaries] = useState<Record<string, XpSummary | null>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const entries = await Promise.all(
        subprofiles.map(async (p) => {
          try {
            const r = await fetch(`/api/subprofiles/${p.id_profile}/xp-summary`, { headers })
            return [p.id_profile, r.ok ? ((await r.json()) as XpSummary) : null] as const
          } catch {
            return [p.id_profile, null] as const
          }
        }),
      )
      if (!cancelled) {
        setSummaries(Object.fromEntries(entries))
        setLoading(false)
      }
    }
    if (subprofiles.length) void load()
    else setLoading(false)
    return () => { cancelled = true }
  }, [subprofiles, token])

  if (!subprofiles.length) {
    return (
      <EmptyState
        icon={<Zap className="h-6 w-6" />}
        title={t("noSubprofilesTitle", "Você ainda não tem subperfis profissionais")}
        description={t("noSubprofilesDesc", "Crie um subperfil para começar a acumular XP e níveis.")}
      />
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="fl-display inline-block -rotate-1 bg-[#F2B705] px-3 py-1 text-lg text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.45)]">
          {t("xpBySubprofile", "XP por subperfil")}
        </span>
        <span className="h-[2px] flex-1 bg-[#F5F1E8]/12" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subprofiles.map((p) => {
          const s = summaries[p.id_profile]
          return (
            <button
              key={p.id_profile}
              onClick={() => onSelect(p.id_profile)}
              className="group flex items-center gap-4 border-2 border-[#F5F1E8]/12 bg-[#15100A] p-4 text-left shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] transition hover:border-[#F2B705]/50"
            >
              <div className="relative shrink-0">
                <div className="h-16 w-16 overflow-hidden rounded-md border-2 border-[#F5F1E8]/15 bg-[#0E0B06]">
                  {(p.avatar_url || userAvatar) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url || userAvatar || ""} alt={p.display_name || "Perfil"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[#5A554C]"><Zap className="h-5 w-5" /></div>
                  )}
                </div>
                <span className="fl-display absolute -left-1.5 -top-2 rotate-[-6deg] bg-[#F2B705] px-1.5 text-xs text-[#1A1505] shadow-[2px_2px_0_0_rgba(0,0,0,0.5)]">
                  {t("levelShort", "NV")} {loading ? "—" : (s?.xp_level ?? 0)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[#F5F1E8]">{p.display_name || t("unnamedProfile", "Perfil sem nome")}</p>
                <p className="text-xs text-[#9A938A]">
                  {loading ? t("loadingLower", "carregando…") : `${Math.round(s?.xp_total ?? 0).toLocaleString(intlTag)} XP`}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-[#F5F1E8]/10 bg-[#0E0B06]">
                  <div className="h-full bg-[#F2B705] transition-all duration-700" style={{ width: `${s?.xp_progress_percent ?? 0}%` }} />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
