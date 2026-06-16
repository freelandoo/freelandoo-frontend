"use client"

import "../comunidade-casa.css"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import {
  Users, Trophy, ArrowLeft, Palette, Crown, Shield, ScrollText, Eye,
  ImagePlus, Loader2, Save, Hash, Sparkles, Target, Megaphone, Star,
  Pin, Trash2, BarChart3, Plus, PenSquare, Film, X,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { getToken, getStoredUser } from "@/lib/auth"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"

const PortfolioPostCard = dynamic(
  () => import("@/components/feed/portfolio-post-card").then((m) => m.PortfolioPostCard),
  { ssr: false }
)
const CommentsPanel = dynamic(
  () => import("@/components/comments/comments-panel").then((m) => m.CommentsPanel),
  { ssr: false }
)
const MediaComposer = dynamic(
  () => import("@/components/composer/MediaComposer").then((m) => m.MediaComposer),
  { ssr: false }
)

type Theme = { primary?: string; background?: string; text?: string; accent?: string }
type Community = {
  id_profile: string
  id_leader_user: string | null
  display_name: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  enxame_name: string | null
  community_theme: Theme | null
  xp_total: number
  xp_level: number
  member_count: number
}
type Member = {
  id_user: string
  role: "leader" | "vice" | "member"
  user_name: string | null
  user_username: string | null
  top_profile_avatar: string | null
  top_profile_name: string | null
  top_profile_level: number | null
  top_profile_xp: number
}
type Goal = { id: number; title: string; metric: string; target_value: number; progress: number; percent: number; ends_at: string | null }
type Announcement = { id: number; body: string; is_pinned: boolean; created_at: string; author_username: string | null; author_name: string | null }
type Benchmark = { position: number; total: number; percentile: number | null; enxame_name: string | null }

const ACCENTS: { key: string; labelKey: string; fallback: string }[] = [
  { key: "magenta", labelKey: "accentMagenta", fallback: "Magenta" },
  { key: "cyan", labelKey: "accentCyan", fallback: "Ciano" },
  { key: "gold", labelKey: "accentGold", fallback: "Dourado" },
  { key: "purple", labelKey: "accentPurple", fallback: "Roxo" },
  { key: "leaf", labelKey: "accentLeaf", fallback: "Verde folha" },
  { key: "red", labelKey: "accentRed", fallback: "Vermelho" },
  { key: "orange", labelKey: "accentOrange", fallback: "Laranja" },
  { key: "gray", labelKey: "accentGray", fallback: "Cinza" },
]
function accentVar(a: string): string {
  const map: Record<string, string> = {
    magenta: "--magenta", cyan: "--cyan", gold: "--gold", purple: "--purple",
    leaf: "--leaf", red: "--red", orange: "--orange", gray: "--gray",
  }
  return `var(${map[a] || "--magenta"})`
}
function compact(n: number): string {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(Math.round(v))
}

const FEED_FILTERS: FeedFilters = { id_machine: null, id_category: null, estado: null, municipio: null, level_min: null }

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const t = useTranslations("Community")
  const tx = useTaxonomy()

  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [goal, setGoal] = useState<Goal | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null)
  const [tab, setTab] = useState<"feed" | "members">("feed")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Feed estilo grupo
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [postsCursor, setPostsCursor] = useState<string | null>(null)
  const [postsHasMore, setPostsHasMore] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerKind, setComposerKind] = useState<"post" | "bee">("post")
  const [chooserOpen, setChooserOpen] = useState(false)

  // Edição (líder)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [bioDraft, setBioDraft] = useState("")
  const [accentDraft, setAccentDraft] = useState("magenta")
  const [uploading, setUploading] = useState<"banner" | "avatar" | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const seeded = useRef(false)
  const autoEdited = useRef(false)

  // Meta + mural
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [goalTitle, setGoalTitle] = useState("")
  const [goalMetric, setGoalMetric] = useState("xp")
  const [goalTarget, setGoalTarget] = useState("")
  const [savingGoal, setSavingGoal] = useState(false)
  const [annBody, setAnnBody] = useState("")
  const [annPin, setAnnPin] = useState(false)
  const [postingAnn, setPostingAnn] = useState(false)

  const currentUserId = getStoredUser()?.id_user ?? null
  const isLeader = !!community && !!currentUserId && community.id_leader_user === currentUserId
  const myMembership = useMemo(
    () => members.find((m) => m.id_user === currentUserId) || null,
    [members, currentUserId]
  )
  const isMember = isLeader || !!myMembership
  const accent = accentVar(accentDraft)
  const showAsLeaderEdit = isLeader && edit

  const ranked = useMemo(
    () => [...members].sort((a, b) => Number(b.top_profile_xp || 0) - Number(a.top_profile_xp || 0)),
    [members]
  )
  const spotlight = ranked[0] || null

  const metricLabel = useCallback(
    (m: string) => m === "posts" ? t("metricPosts", "Publicações") : m === "members" ? t("metricMembers", "Membros") : t("metricXp", "XP coletivo"),
    [t]
  )

  const fetchGoal = useCallback(async () => {
    const r = await fetch(`/api/communities/${id}/goal`)
    const d = await r.json().catch(() => ({}))
    setGoal(d.goal || null)
  }, [id])
  const fetchAnnouncements = useCallback(async () => {
    const token = getToken()
    const r = await fetch(`/api/communities/${id}/announcements`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const d = await r.json().catch(() => ({}))
    setAnnouncements(Array.isArray(d.announcements) ? d.announcements : [])
  }, [id])

  const fetchPosts = useCallback(async (reset: boolean, cursor?: string | null) => {
    if (!id) return
    if (reset) setLoadingPosts(true); else setLoadingMorePosts(true)
    try {
      const sp = new URLSearchParams({ limit: "10" })
      if (!reset && cursor) sp.set("cursor", cursor)
      const token = getToken()
      const r = await fetch(`/api/communities/${id}/feed-posts?${sp.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      })
      const d = await r.json().catch(() => ({}))
      const items: FeedPost[] = Array.isArray(d.items) ? d.items : []
      setPosts((prev) => (reset ? items : [...prev, ...items]))
      setPostsCursor(d.next_cursor || null)
      setPostsHasMore(!!d.has_more)
    } finally {
      if (reset) setLoadingPosts(false); else setLoadingMorePosts(false)
    }
  }, [id])

  const loadAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const tk = getToken()
      const authHeaders = tk ? { Authorization: `Bearer ${tk}` } : undefined
      const [cRes, mRes, gRes, aRes, bmRes] = await Promise.all([
        fetch(`/api/communities/${id}`),
        fetch(`/api/communities/${id}/members`),
        fetch(`/api/communities/${id}/goal`),
        fetch(`/api/communities/${id}/announcements`, authHeaders ? { headers: authHeaders } : undefined),
        fetch(`/api/communities/${id}/benchmark`),
      ])
      const cData = await cRes.json()
      if (!cRes.ok) throw new Error(cData.error || t("notFound", "Comunidade não encontrada."))
      const c: Community = cData.community
      setCommunity(c)
      if (!seeded.current) {
        setNameDraft(c.display_name)
        setBioDraft(c.bio || "")
        setAccentDraft(c.community_theme?.accent || "magenta")
        seeded.current = true
      }
      const mData = await mRes.json(); setMembers(Array.isArray(mData.members) ? mData.members : [])
      const gData = await gRes.json(); setGoal(gData.goal || null)
      const aData = await aRes.json(); setAnnouncements(Array.isArray(aData.announcements) ? aData.announcements : [])
      const bmData = await bmRes.json(); setBenchmark(bmData.benchmark || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notFound", "Comunidade não encontrada."))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { fetchPosts(true) }, [fetchPosts])
  useEffect(() => {
    if (isLeader && !autoEdited.current) { setEdit(true); autoEdited.current = true }
  }, [isLeader])

  const joinOrLeave = async (action: "join" | "leave") => {
    const token = getToken()
    if (!token) { setActionMsg(t("loginToJoin", "Entre para participar")); return }
    setBusy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("joinError", "Não foi possível entrar."))
      setActionMsg(action === "join" ? t("joinSuccess", "Você entrou na comunidade!") : t("leaveSuccess", "Você saiu da comunidade."))
      await loadAll()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("joinError", "Não foi possível entrar."))
    } finally { setBusy(false) }
  }

  const uploadImage = async (kind: "banner" | "avatar", file: File) => {
    const token = getToken()
    if (!token) return
    const localUrl = URL.createObjectURL(file)
    if (kind === "banner") setBannerPreview(localUrl); else setAvatarPreview(localUrl)
    setUploading(kind); setActionMsg(null)
    try {
      const fd = new FormData(); fd.append(kind, file)
      const res = await fetch(`/api/communities/${id}/${kind}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("uploadError", "Não foi possível enviar a imagem."))
      await loadAll()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("uploadError", "Não foi possível enviar a imagem."))
    } finally {
      setUploading(null)
      if (kind === "banner") setBannerPreview(null); else setAvatarPreview(null)
      URL.revokeObjectURL(localUrl)
    }
  }

  const saveAll = async () => {
    const token = getToken()
    if (!token || !community) return
    if (!nameDraft.trim()) { setActionMsg(t("saveError", "Não foi possível salvar.")); return }
    setSaving(true); setActionMsg(null)
    try {
      const pRes = await fetch(`/api/communities/${id}/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: nameDraft.trim(), bio: bioDraft.trim() || null }),
      })
      const pData = await pRes.json()
      if (!pRes.ok) throw new Error(pData.error || t("saveError", "Não foi possível salvar."))
      if ((community.community_theme?.accent || "magenta") !== accentDraft) {
        const tRes = await fetch(`/api/communities/${id}/theme`, {
          method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ theme: { ...(community.community_theme || {}), accent: accentDraft } }),
        })
        const tData = await tRes.json()
        if (!tRes.ok) throw new Error(tData.error || t("saveError", "Não foi possível salvar."))
      }
      setActionMsg(t("profileSaved", "Alterações salvas!"))
      await loadAll()
      setTimeout(() => setActionMsg(null), 2500)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setSaving(false) }
  }

  // Meta
  const openGoalForm = () => {
    setGoalTitle(goal?.title || ""); setGoalMetric(goal?.metric || "xp")
    setGoalTarget(goal ? String(goal.target_value) : ""); setGoalFormOpen(true)
  }
  const saveGoal = async () => {
    const token = getToken()
    if (!token) return
    const target = Number(goalTarget)
    if (!goalTitle.trim() || !Number.isFinite(target) || target <= 0) {
      setActionMsg(t("goalInvalid", "Preencha o nome e um alvo maior que zero.")); return
    }
    setSavingGoal(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/goal`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: goalTitle.trim(), metric: goalMetric, target_value: target }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("saveError", "Não foi possível salvar."))
      setGoalFormOpen(false); await fetchGoal()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setSavingGoal(false) }
  }
  const removeGoal = async () => {
    const token = getToken()
    if (!token) return
    await fetch(`/api/communities/${id}/goal`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    setGoalFormOpen(false); await fetchGoal()
  }

  // Mural
  const postAnnouncement = async () => {
    const token = getToken()
    if (!token || !annBody.trim()) return
    setPostingAnn(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/announcements`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: annBody.trim(), is_pinned: annPin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("saveError", "Não foi possível salvar."))
      setAnnBody(""); setAnnPin(false); await fetchAnnouncements()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setPostingAnn(false) }
  }
  const deleteAnnouncement = async (annId: number) => {
    const token = getToken()
    if (!token) return
    await fetch(`/api/communities/${id}/announcements/${annId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    await fetchAnnouncements()
  }

  const openComposer = (kind: "post" | "bee") => {
    setChooserOpen(false)
    if (!isMember) { setActionMsg(t("joinToPost", "Entre na comunidade para publicar.")); return }
    setComposerKind(kind); setComposerOpen(true)
  }

  if (loading) {
    return (
      <div className="casa-rank casa-paper flex min-h-[100dvh] items-center justify-center casa-body text-sm font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/60">
        {t("pageTitle", "Comunidades")}…
      </div>
    )
  }
  if (error || !community) {
    return (
      <div className="casa-rank casa-paper min-h-[100dvh]">
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <p className="casa-display text-2xl text-[var(--ink)]">{t("notFound", "Comunidade não encontrada.")}</p>
          <Link href="/comunidades" className="mt-4 inline-flex items-center gap-2 casa-body text-sm font-bold uppercase tracking-[0.12em] text-[var(--magenta-deep)]">
            <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
          </Link>
        </div>
      </div>
    )
  }

  const bannerSrc = bannerPreview || community.banner_url
  const avatarSrc = avatarPreview || community.avatar_url

  return (
    <div className={`casa-rank casa-paper relative min-h-[100dvh] overflow-hidden ${showAsLeaderEdit ? "pb-28" : "pb-20"}`}>
      <div className="casa-dots pointer-events-none absolute right-0 top-40 h-40 w-40 opacity-[0.06]" />

      {/* Top bar */}
      <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 pt-6 md:px-10">
        <Link href="/comunidades" className="inline-flex items-center gap-2 casa-body text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70 hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> {t("pageTitle", "Comunidades")}
        </Link>
        {isLeader && (
          <div className="flex items-center gap-2">
            {edit && (
              <div className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-white px-2.5 py-1.5 shadow-[3px_3px_0_0_var(--ink)]">
                <Palette className="h-4 w-4 text-[var(--ink)]" />
                <span className="casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)]">{t("colorsLabel", "Cores")}</span>
                <span className="h-5 w-5 rounded-full border-2 border-[var(--ink)]" style={{ background: accent }} />
                <select value={accentDraft} onChange={(e) => setAccentDraft(e.target.value)}
                  className="border-l-2 border-[var(--ink)]/20 bg-transparent pl-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink)] outline-none">
                  {ACCENTS.map((a) => <option key={a.key} value={a.key}>{t(a.labelKey, a.fallback)}</option>)}
                </select>
              </div>
            )}
            <button type="button" onClick={() => setEdit((e) => !e)}
              className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-white px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)]">
              {edit ? <><Eye className="h-4 w-4" /> {t("viewPublic", "Ver como público")}</> : <><ScrollText className="h-4 w-4" /> {t("edit", "Editar")}</>}
            </button>
          </div>
        )}
      </div>

      {/* HERO */}
      <header className="relative mx-auto mt-4 max-w-5xl px-5 md:px-10">
        <div className="relative overflow-hidden border-2 border-[var(--ink)] shadow-[8px_8px_0_0_var(--ink)]">
          <div className="relative h-44 md:h-56" style={{ background: accent }}>
            {bannerSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-luminosity" />
            )}
            <div className="casa-dots absolute inset-0 opacity-10" />
            {showAsLeaderEdit && <ImageDrop label={t("changeBanner", "Trocar capa")} busy={uploading === "banner"} onFile={(f) => uploadImage("banner", f)} />}
            {community.enxame_name && (
              <span className="absolute left-4 top-4 z-20 -rotate-2 border-2 border-[var(--ink)] bg-white px-3 py-1 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--ink)]">
                {tx.enxame(null, community.enxame_name)}
              </span>
            )}
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white px-2 text-[var(--ink)]">
              <span className="casa-body text-[8px] font-bold uppercase">{t("level", "Nível")}</span>
              <span className="casa-display text-2xl leading-none">{community.xp_level}</span>
            </span>
          </div>
        </div>

        <div className="relative z-20 -mt-12 flex items-end gap-4 px-2 md:-mt-16 md:px-3">
          <div className="relative h-28 w-28 shrink-0 border-2 border-[var(--ink)] shadow-[5px_5px_0_0_var(--ink)] md:h-36 md:w-36" style={{ background: "var(--paper-2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc || "/placeholder-user.jpg"} alt={community.display_name} className="h-full w-full object-cover" />
            {showAsLeaderEdit && <ImageDrop label={t("changePhoto", "Trocar foto")} small busy={uploading === "avatar"} onFile={(f) => uploadImage("avatar", f)} />}
          </div>
          <div className="flex-1 pb-1 md:pb-2">
            {showAsLeaderEdit ? (
              <input value={nameDraft} maxLength={80} onChange={(e) => setNameDraft(e.target.value)} placeholder={t("nameLabel", "Nome da comunidade")}
                className="w-full border-b-2 border-dashed border-[var(--ink)]/40 bg-transparent casa-display text-4xl leading-[0.85] text-[var(--ink)] outline-none md:text-6xl" />
            ) : (
              <h1 className="casa-display text-4xl leading-[0.85] text-[var(--ink)] sm:text-5xl md:text-6xl">{community.display_name}</h1>
            )}
          </div>
          {!isLeader && (
            <div className="pb-1">
              {myMembership ? (
                myMembership.role !== "leader" ? (
                  <button type="button" disabled={busy} onClick={() => joinOrLeave("leave")}
                    className="border-2 border-[var(--ink)] bg-white px-5 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60">
                    {busy ? t("leaving", "Saindo...") : t("leave", "Sair")}
                  </button>
                ) : null
              ) : (
                <button type="button" disabled={busy} onClick={() => joinOrLeave("join")}
                  className="border-2 border-[var(--ink)] px-5 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60" style={{ background: accent }}>
                  {busy ? t("joining", "Entrando...") : t("join", "Entrar")}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {actionMsg && (
        <div className="relative z-10 mx-auto mt-4 max-w-5xl px-5 md:px-10">
          <p className="inline-block border-2 border-[var(--ink)] bg-white px-3 py-1.5 casa-body text-xs font-bold text-[var(--ink-soft)]/80 shadow-[2px_2px_0_0_var(--ink)]">{actionMsg}</p>
        </div>
      )}

      {/* KPIs */}
      <section className="relative z-10 mx-auto mt-6 max-w-5xl px-5 md:px-10">
        <div className="grid grid-cols-3 gap-3">
          <Kpi icon={<Users className="h-4 w-4" />} label={t("membersCount", "membros")} value={compact(community.member_count)} accent={accent} />
          <Kpi icon={<Trophy className="h-4 w-4" />} label={t("level", "Nível")} value={String(community.xp_level)} accent={accent} />
          <Kpi icon={<Sparkles className="h-4 w-4" />} label="XP" value={compact(community.xp_total)} accent={accent} />
        </div>
      </section>

      {/* GRID */}
      <div className="relative z-10 mx-auto mt-8 grid max-w-5xl gap-6 px-5 md:grid-cols-3 md:px-10">
        {/* coluna principal */}
        <div className="space-y-6 md:col-span-2">
          {/* Meta */}
          {(showAsLeaderEdit || goal) && (
            <Block title={t("goalTitle", "Meta da comunidade")} icon={<Target className="h-4 w-4" />} accent={accent}>
              {goalFormOpen && showAsLeaderEdit ? (
                <div className="space-y-2">
                  <input value={goalTitle} maxLength={120} onChange={(e) => setGoalTitle(e.target.value)} placeholder={t("goalNamePlaceholder", "Ex.: Bora postar essa semana!")}
                    className="w-full border-b-2 border-dashed border-[var(--ink)]/40 bg-transparent casa-display text-xl text-[var(--ink)] outline-none" />
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={goalMetric} onChange={(e) => setGoalMetric(e.target.value)} className="border-2 border-[var(--ink)] bg-white px-2 py-1.5 casa-body text-xs font-bold uppercase text-[var(--ink)]">
                      <option value="xp">{t("metricXp", "XP coletivo")}</option>
                      <option value="posts">{t("metricPosts", "Publicações")}</option>
                      <option value="members">{t("metricMembers", "Membros")}</option>
                    </select>
                    <input type="number" min={1} value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder={t("goalTarget", "Alvo")}
                      className="w-28 border-2 border-[var(--ink)] bg-white px-2 py-1.5 casa-body text-sm text-[var(--ink)] outline-none" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" disabled={savingGoal} onClick={saveGoal} className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-60">
                      {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("save", "Salvar")}
                    </button>
                    {goal && <button type="button" onClick={removeGoal} className="inline-flex items-center gap-2 border-2 border-[var(--magenta)] px-4 py-1.5 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--magenta-deep)]"><Trash2 className="h-4 w-4" /> {t("goalRemove", "Remover")}</button>}
                    <button type="button" onClick={() => setGoalFormOpen(false)} className="border-2 border-[var(--ink)]/30 px-4 py-1.5 casa-body text-xs font-bold uppercase text-[var(--ink-soft)]/70">{t("cancel", "Cancelar")}</button>
                  </div>
                </div>
              ) : goal ? (
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <span className="casa-display text-xl leading-tight text-[var(--ink)]">{goal.title}</span>
                    <span className="shrink-0 casa-body text-sm font-extrabold text-[var(--ink)]">{compact(goal.progress)}<span className="text-[var(--ink-soft)]/50">/{compact(goal.target_value)}</span></span>
                  </div>
                  <div className="mt-2 h-4 w-full overflow-hidden border-2 border-[var(--ink)] bg-white">
                    <div className="h-full transition-[width] duration-500" style={{ width: `${goal.percent}%`, background: accent }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between casa-body text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/55">
                    <span>{goal.percent}% · {metricLabel(goal.metric)}</span>
                    {showAsLeaderEdit && <button type="button" onClick={openGoalForm} className="text-[var(--ink)] underline">{t("goalEdit", "Editar meta")}</button>}
                  </div>
                </div>
              ) : showAsLeaderEdit ? (
                <button type="button" onClick={openGoalForm} className="inline-flex items-center gap-2 border-2 border-dashed border-[var(--ink)]/40 px-4 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]/70 hover:border-[var(--ink)]">
                  <Plus className="h-4 w-4" /> {t("goalSet", "Definir meta")}
                </button>
              ) : null}
            </Block>
          )}

          {/* Mural — privado: só membros leem; só o líder posta */}
          {(showAsLeaderEdit || (isMember && announcements.length > 0)) && (
            <Block title={t("muralTitle", "Mural do líder")} icon={<Megaphone className="h-4 w-4" />} accent={accent}>
              {showAsLeaderEdit && (
                <div className="mb-3 space-y-2 border-b border-[var(--line)] pb-3">
                  <textarea value={annBody} maxLength={1000} rows={2} onChange={(e) => setAnnBody(e.target.value)} placeholder={t("muralPlaceholder", "Escreva um recado para a comunidade...")}
                    className="w-full bg-transparent casa-body text-sm text-[var(--ink)] outline-none" />
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1 casa-body text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]/70">
                      <input type="checkbox" checked={annPin} onChange={(e) => setAnnPin(e.target.checked)} /> <Pin className="h-3 w-3" /> {t("muralPin", "Fixar")}
                    </label>
                    <button type="button" disabled={postingAnn || !annBody.trim()} onClick={postAnnouncement}
                      className="ml-auto inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-1.5 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-50">
                      {postingAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} {t("muralPost", "Publicar")}
                    </button>
                  </div>
                </div>
              )}
              {announcements.length === 0 ? (
                <p className="casa-body text-sm text-[var(--ink-soft)]/55">{t("muralEmpty", "Nenhum recado ainda.")}</p>
              ) : (
                <div className="space-y-2">
                  {announcements.map((a) => (
                    <div key={a.id} className="relative border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                      {a.is_pinned && <span className="mb-1 inline-flex items-center gap-1 casa-body text-[9px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}><Pin className="h-3 w-3" /> {t("pinned", "Fixado")}</span>}
                      <p className="whitespace-pre-line casa-body text-sm text-[var(--ink-soft)]/90">{a.body}</p>
                      <div className="mt-1 flex items-center justify-between casa-body text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]/45">
                        <span>{a.author_username ? `@${a.author_username}` : ""} · {new Date(a.created_at).toLocaleDateString()}</span>
                        {showAsLeaderEdit && <button type="button" onClick={() => deleteAnnouncement(a.id)} className="text-[var(--magenta-deep)]"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Block>
          )}

          {/* Perfil */}
          {(showAsLeaderEdit || community.bio) && (
            <Block title={t("profileSection", "Perfil")} icon={<ScrollText className="h-4 w-4" />} accent={accent}>
              {showAsLeaderEdit ? (
                <textarea value={bioDraft} maxLength={200} onChange={(e) => setBioDraft(e.target.value)} placeholder={t("bioPlaceholder", "Conte sobre a comunidade...")} rows={4}
                  className="w-full bg-transparent casa-body text-sm leading-relaxed text-[var(--ink-soft)]/85 outline-none" />
              ) : (
                <p className="whitespace-pre-line casa-body text-sm leading-relaxed text-[var(--ink-soft)]/85">{community.bio}</p>
              )}
            </Block>
          )}

          {/* Tabs */}
          <div>
            <div className="flex gap-1 border-b-2 border-[var(--ink)]">
              {([["feed", t("tabFeed", "Feed")], ["members", t("tabMembers", "Membros")]] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)} className="-mb-0.5 px-4 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink)]"
                  style={{ borderBottom: tab === key ? `4px solid ${accent}` : "4px solid transparent", opacity: tab === key ? 1 : 0.5 }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === "members" ? (
                members.length === 0 ? <Empty text={t("membersEmpty", "Sem membros ainda.")} /> : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ranked.map((m, i) => (
                      <div key={m.id_user} className="flex items-center gap-3 border-2 border-[var(--ink)] bg-white p-3 shadow-[4px_4px_0_0_var(--ink)]">
                        <span className="casa-display text-xl leading-none text-[var(--ink)]/30">{i + 1}</span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden border-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.top_profile_avatar || "/placeholder-user.jpg"} alt={m.top_profile_name || m.user_name || ""} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate casa-display text-base leading-tight text-[var(--ink)]">{m.top_profile_name || m.user_name}</p>
                          <p className="flex items-center gap-1 casa-body text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]/60">
                            {m.role === "leader" ? <><Crown className="h-3 w-3" style={{ color: accent }} /> {t("roleLeader", "Líder")}</> :
                             m.role === "vice" ? <><Shield className="h-3 w-3" style={{ color: accent }} /> {t("roleVice", "Vice-líder")}</> :
                             t("roleMember", "Membro")} · {compact(m.top_profile_xp)} XP
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {/* Composer "Escreva algo" */}
                  <div className="relative">
                    <button type="button" onClick={() => isMember ? setChooserOpen((v) => !v) : setActionMsg(t("joinToPost", "Entre na comunidade para publicar."))}
                      className="flex w-full items-center gap-3 border-2 border-[var(--ink)] bg-white px-4 py-3 text-left shadow-[4px_4px_0_0_var(--ink)]">
                      <PenSquare className="h-5 w-5 shrink-0" style={{ color: accent }} />
                      <span className="casa-body text-sm font-semibold text-[var(--ink-soft)]/60">{t("writeSomething", "Escreva algo...")}</span>
                    </button>
                    {chooserOpen && isMember && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 flex gap-2 border-2 border-[var(--ink)] bg-white p-2 shadow-[4px_4px_0_0_var(--ink)]">
                        <button type="button" onClick={() => openComposer("post")} className="flex flex-1 items-center justify-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--ink)] hover:bg-[var(--paper-2)]">
                          <ImagePlus className="h-4 w-4" /> {t("postLabel", "Post")}
                        </button>
                        <button type="button" onClick={() => openComposer("bee")} className="flex flex-1 items-center justify-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--ink)] hover:bg-[var(--paper-2)]">
                          <Film className="h-4 w-4" /> {t("beeLabel", "Bee")}
                        </button>
                        <button type="button" onClick={() => setChooserOpen(false)} aria-label={t("cancel", "Cancelar")} className="grid place-items-center border-2 border-[var(--ink)]/30 px-2"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>

                  {/* Feed unificado (posts + bees) — cards padrão do Freelandoo (escuros) */}
                  {loadingPosts ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--ink-soft)]/50" /></div>
                  ) : posts.length === 0 ? (
                    <Empty text={t("feedEmptyGroup", "Ainda não há publicações. Seja o primeiro!")} />
                  ) : (
                    <div className="overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[#0b0804] shadow-[5px_5px_0_0_var(--ink)]">
                      {posts.map((post) => (
                        <PortfolioPostCard
                          key={post.post_id}
                          post={post}
                          filters={FEED_FILTERS}
                          commentsCount={post.comments_count ?? 0}
                          shareUrlOverride={
                            isMember && currentUserId && typeof window !== "undefined"
                              ? `${window.location.origin}/cs/${id}/${currentUserId}/${post.post_id}`
                              : undefined
                          }
                          onOpenComments={(pid) => setOpenCommentsFor(pid)}
                          onLikeChange={(pid, liked, likes_count) => {
                            setPosts((prev) => prev.map((p) => p.post_id === pid ? { ...p, viewer_has_liked: liked, likes_count: likes_count ?? p.likes_count } : p))
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {postsHasMore && (
                    <div className="flex justify-center">
                      <button type="button" disabled={loadingMorePosts} onClick={() => fetchPosts(false, postsCursor)}
                        className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-white px-5 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60">
                        {loadingMorePosts ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("loadMore", "Ver mais")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          {benchmark && (
            <div className="relative border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-5 text-white shadow-[6px_6px_0_0_var(--magenta)]">
              <div className="flex items-center gap-2 casa-body text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/60">
                <BarChart3 className="h-4 w-4" /> {t("benchmarkTitle", "Benchmark")}
              </div>
              <div className="mt-1 casa-display text-5xl leading-none" style={{ color: "var(--gold)" }}>#{benchmark.position}</div>
              <p className="mt-1 casa-body text-xs font-semibold text-white/70">
                {t("benchmarkOf", "de")} {benchmark.total} · {benchmark.enxame_name ? tx.enxame(null, benchmark.enxame_name) : t("communitiesWord", "comunidades")}
              </p>
              {benchmark.percentile != null && benchmark.total > 1 && (
                <span className="mt-2 inline-block border-2 border-white/30 px-2 py-0.5 casa-body text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--gold)" }}>
                  {t("benchmarkTop", "top")} {benchmark.percentile}%
                </span>
              )}
            </div>
          )}

          {spotlight && (
            <Block title={t("spotlightTitle", "Destaque")} icon={<Star className="h-4 w-4" />} accent={accent}>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden border-2 border-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)]" style={{ background: "var(--paper-2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={spotlight.top_profile_avatar || "/placeholder-user.jpg"} alt={spotlight.top_profile_name || ""} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate casa-display text-lg leading-tight text-[var(--ink)]">{spotlight.top_profile_name || spotlight.user_name}</p>
                  <p className="casa-body text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/55">{t("spotlightSub", "Membro destaque")} · {compact(spotlight.top_profile_xp)} XP</p>
                </div>
              </div>
            </Block>
          )}

          {ranked.length > 0 && (
            <Block title={t("rankingTitle", "Ranking dos membros")} icon={<Trophy className="h-4 w-4" />} accent={accent}>
              <ol className="space-y-2">
                {ranked.slice(0, 5).map((m, i) => (
                  <li key={m.id_user} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 casa-display text-base text-[var(--ink)]/40">{i + 1}</span>
                    <div className="h-8 w-8 shrink-0 overflow-hidden border border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.top_profile_avatar || "/placeholder-user.jpg"} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="min-w-0 flex-1 truncate casa-body text-sm font-semibold text-[var(--ink)]">{m.top_profile_name || m.user_name}</span>
                    <span className="shrink-0 casa-body text-[11px] font-extrabold" style={{ color: accent }}>{compact(m.top_profile_xp)}</span>
                  </li>
                ))}
              </ol>
            </Block>
          )}
        </div>
      </div>

      {/* Barra fixa de edição */}
      {showAsLeaderEdit && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[var(--ink)] bg-white/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <span className="inline-flex items-center gap-2 casa-body text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/60"><Hash className="h-4 w-4" /> {community.display_name}</span>
            {actionMsg && <span className="casa-body text-xs font-bold text-[var(--ink-soft)]/70">{actionMsg}</span>}
            <button type="button" onClick={saveAll} disabled={saving}
              className="ml-auto inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-2 casa-body text-sm font-extrabold uppercase tracking-[0.14em] text-white disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("save", "Salvar")}
            </button>
          </div>
        </div>
      )}

      {/* Painel de comentários + composer */}
      <CommentsPanel
        postId={openCommentsFor}
        open={!!openCommentsFor}
        onClose={() => setOpenCommentsFor(null)}
        loginNextPath={`/comunidades/${id}`}
        onCountChange={(pid, delta) => setPosts((prev) => prev.map((p) => p.post_id === pid ? { ...p, comments_count: Math.max(0, (p.comments_count ?? 0) + delta) } : p))}
      />
      {composerOpen && (
        <MediaComposer
          open
          mode={composerKind}
          communityId={id}
          onClose={() => setComposerOpen(false)}
          onPosted={() => { setComposerOpen(false); fetchPosts(true) }}
        />
      )}
    </div>
  )
}

function ImageDrop({ onFile, label, small, busy }: { onFile: (f: File) => void; label: string; small?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      className={`absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/40 text-white transition-opacity hover:opacity-100 ${busy ? "opacity-100" : "opacity-0"} ${small ? "text-[10px]" : "text-xs"}`}
    >
      {busy ? <Loader2 className={small ? "h-5 w-5 animate-spin" : "h-7 w-7 animate-spin"} /> : <ImagePlus className={small ? "h-5 w-5" : "h-7 w-7"} />}
      <span className="casa-body font-bold uppercase tracking-wide">{label}</span>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = "" }} />
    </div>
  )
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-white px-3 py-3 shadow-[3px_3px_0_0_var(--ink)]">
      <div className="flex items-center gap-1 casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/55"><span style={{ color: accent }}>{icon}</span>{label}</div>
      <div className="mt-1 casa-display text-2xl leading-none text-[var(--ink)]">{value}</div>
    </div>
  )
}

function Block({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <div className="relative border-2 border-[var(--ink)] bg-white p-5 shadow-[5px_5px_0_0_var(--ink)]">
      <div className="mb-3 flex items-center gap-2 border-b border-[var(--line)] pb-2">
        <span className="flex flex-1 items-center gap-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]"><span style={{ color: accent }}>{icon}</span>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border-2 border-dashed border-[var(--ink)]/30 bg-white/40 py-16 text-center casa-body text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/50">
      {text}
    </div>
  )
}
