"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useParams } from "next/navigation"
import {
  Users, Trophy, ArrowLeft, Palette, Crown, Shield, ScrollText, Eye,
  ImagePlus, Loader2, Save, Hash, Sparkles, Target, Megaphone, Star,
  Pin, Trash2, BarChart3, Plus, PenSquare, Film, X, MessageSquare,
  Lock, Globe,
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
  privacy?: "public" | "private"
  monthly_cents?: number | null
  viewer_is_member?: boolean
  viewer_sub_status?: string | null
}
type MembershipSummary = {
  active_subs: number
  past_due_subs: number
  waiting_cents: number
  available_cents: number
  paid_cents: number
  total_net_cents: number
  payments_count: number
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
type GoalRankRow = { id_user: string; name: string | null; username: string | null; avatar_url: string | null; xp_level: number | null; score: number; posts?: number; eng?: number }
type Goal = {
  id: number; title: string; metric: string; target_value: number | null
  prize_polens: number; status: string; starts_at: string; ends_at: string | null; closed_at: string | null
  progress: number; percent: number | null; winner_user_id: string | null
  winner: { id_user: string; name: string | null; avatar_url: string | null; score: number } | null
  ranking: GoalRankRow[]
}
type Announcement = { id: number; body: string; is_pinned: boolean; created_at: string; author_username: string | null; author_name: string | null }
type Benchmark = { position: number; total: number; percentile: number | null; enxame_name: string | null }

// Identidade da comunidade = a do Freelandoo (escuro/tabloide). O líder só
// recolore os DETALHES (accent): ícones, aba ativa, barra de progresso, botão
// entrar, destaques. A base (fundo, cards, texto) é fixa.
const ACCENTS: { key: string; labelKey: string; fallback: string; hex: string }[] = [
  { key: "gold", labelKey: "accentGold", fallback: "Dourado", hex: "#F2B705" },
  { key: "magenta", labelKey: "accentMagenta", fallback: "Magenta", hex: "#ff1f8e" },
  { key: "cyan", labelKey: "accentCyan", fallback: "Ciano", hex: "#16c8e8" },
  { key: "purple", labelKey: "accentPurple", fallback: "Roxo", hex: "#a06bff" },
  { key: "leaf", labelKey: "accentLeaf", fallback: "Verde folha", hex: "#4fc95a" },
  { key: "red", labelKey: "accentRed", fallback: "Vermelho", hex: "#ff5a44" },
  { key: "orange", labelKey: "accentOrange", fallback: "Laranja", hex: "#ff8c2e" },
  { key: "gray", labelKey: "accentGray", fallback: "Cinza", hex: "#b8b1a6" },
]
function accentHex(a: string): string {
  return ACCENTS.find((x) => x.key === a)?.hex || ACCENTS[0].hex
}
function compact(n: number): string {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(Math.round(v))
}
function fmtBRL(cents: number): string {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
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

  // Recado (nota só-texto, até 2000 chars)
  const [recadoOpen, setRecadoOpen] = useState(false)
  const [recadoBody, setRecadoBody] = useState("")
  const [postingRecado, setPostingRecado] = useState(false)

  // Edição (líder)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [bioDraft, setBioDraft] = useState("")
  const [accentDraft, setAccentDraft] = useState("gold")
  const [uploading, setUploading] = useState<"banner" | "avatar" | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const seeded = useRef(false)
  const autoEdited = useRef(false)

  // Privacidade (comunidade privada com mensalidade)
  const [privacyDraft, setPrivacyDraft] = useState<"public" | "private">("public")
  const [monthlyDraft, setMonthlyDraft] = useState("") // em reais, ex.: "19,90"
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [membershipSummary, setMembershipSummary] = useState<MembershipSummary | null>(null)

  // Meta + mural
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [goalTitle, setGoalTitle] = useState("")
  const [goalMetric, setGoalMetric] = useState("xp")
  const [goalDays, setGoalDays] = useState(30)
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
  const isMember = isLeader || !!myMembership || !!community?.viewer_is_member
  const accent = accentHex(accentDraft)
  const showAsLeaderEdit = isLeader && edit
  const isPrivate = community?.privacy === "private"
  const feedLocked = isPrivate && !isMember
  const monthlyCents = Number(community?.monthly_cents || 0)

  const ranked = useMemo(
    () => [...members].sort((a, b) => Number(b.top_profile_xp || 0) - Number(a.top_profile_xp || 0)),
    [members]
  )

  const metricLabel = useCallback(
    (m: string) => m === "posts" ? t("metricPosts", "Publicações") : m === "shares" ? t("metricShares", "Compartilhamentos") : t("metricXp", "XP coletivo"),
    [t]
  )
  const scoreLabel = useCallback((m: string, r: { score: number; posts?: number; eng?: number }) => {
    if (m === "posts") return `${r.posts ?? 0}/${r.eng ?? 0}`
    if (m === "xp") return `${compact(r.score)} XP`
    return compact(r.score)
  }, [])
  const daysLeft = useCallback((ends: string | null) => {
    if (!ends) return null
    return Math.max(0, Math.ceil((new Date(ends).getTime() - Date.now()) / 86400000))
  }, [])

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
        fetch(`/api/communities/${id}`, authHeaders ? { headers: authHeaders } : undefined),
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
        setAccentDraft(c.community_theme?.accent || "gold")
        seeded.current = true
      }
      setPrivacyDraft(c.privacy === "private" ? "private" : "public")
      if (c.monthly_cents) setMonthlyDraft((Number(c.monthly_cents) / 100).toFixed(2).replace(".", ","))
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

  // Comunidade privada: cria o checkout da assinatura mensal e redireciona.
  const startMembershipCheckout = useCallback(async () => {
    const token = getToken()
    if (!token) { setActionMsg(t("loginToJoin", "Entre para participar")); return }
    setBusy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/membership/checkout`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) throw new Error(data.error || t("subscribeError", "Não foi possível iniciar a assinatura."))
      window.location.href = data.checkout_url
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("subscribeError", "Não foi possível iniciar a assinatura."))
      setBusy(false)
    }
  }, [id, t])

  const joinOrLeave = async (action: "join" | "leave") => {
    const token = getToken()
    if (!token) { setActionMsg(t("loginToJoin", "Entre para participar")); return }
    setBusy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      // Comunidade privada: o join devolve requires_payment → vai pro checkout.
      if (action === "join" && data?.requires_payment) {
        await startMembershipCheckout()
        return
      }
      if (!res.ok) throw new Error(data.error || t("joinError", "Não foi possível entrar."))
      setActionMsg(action === "join" ? t("joinSuccess", "Você entrou na comunidade!") : t("leaveSuccess", "Você saiu da comunidade."))
      await loadAll()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("joinError", "Não foi possível entrar."))
    } finally { setBusy(false) }
  }

  // Volta do checkout da assinatura (?assinatura=sucesso).
  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    const st = sp.get("assinatura")
    if (!st) return
    if (st === "sucesso") setActionMsg(t("subscribeSuccess", "Assinatura confirmada! Bem-vindo(a) à comunidade."))
    else if (st === "cancelada") setActionMsg(t("subscribeCanceled", "Assinatura cancelada — você não foi cobrado."))
    window.history.replaceState({}, "", window.location.pathname)
  }, [t])

  // Privacidade (líder): salvar público/privado + mensalidade.
  const savePrivacy = async () => {
    const token = getToken()
    if (!token) return
    let monthly_cents: number | undefined
    if (privacyDraft === "private") {
      monthly_cents = Math.round(Number(monthlyDraft.replace(/\./g, "").replace(",", ".")) * 100)
      if (!Number.isFinite(monthly_cents) || monthly_cents <= 0) {
        setActionMsg(t("privacyPriceInvalid", "Informe o valor da mensalidade."))
        return
      }
    }
    setSavingPrivacy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/privacy`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ privacy: privacyDraft, ...(monthly_cents ? { monthly_cents } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("saveError", "Não foi possível salvar."))
      setActionMsg(privacyDraft === "private" ? t("privacySavedPrivate", "Comunidade agora é privada.") : t("privacySavedPublic", "Comunidade agora é pública."))
      await loadAll()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setSavingPrivacy(false) }
  }

  // Resumo das mensalidades (líder de comunidade privada).
  useEffect(() => {
    if (!isLeader || !isPrivate || !id) { setMembershipSummary(null); return }
    const token = getToken()
    if (!token) return
    fetch(`/api/communities/${id}/membership/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMembershipSummary(d.summary || null))
      .catch(() => setMembershipSummary(null))
  }, [isLeader, isPrivate, id])

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
      if ((community.community_theme?.accent || "gold") !== accentDraft) {
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

  // Temporada (meta)
  const openGoalForm = () => {
    setGoalTitle(goal?.title || ""); setGoalMetric(goal?.metric || "xp")
    setGoalDays(30); setGoalFormOpen(true)
  }
  const saveGoal = async () => {
    const token = getToken()
    if (!token) return
    if (!goalTitle.trim()) { setActionMsg(t("goalInvalid", "Dê um nome para a temporada.")); return }
    setSavingGoal(true); setActionMsg(null)
    try {
      const ends_at = new Date(Date.now() + goalDays * 86400000).toISOString()
      const res = await fetch(`/api/communities/${id}/goal`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: goalTitle.trim(), metric: goalMetric, ends_at }),
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
  const openRecado = () => {
    setChooserOpen(false)
    if (!isMember) { setActionMsg(t("joinToPost", "Entre na comunidade para publicar.")); return }
    setRecadoBody(""); setRecadoOpen(true)
  }
  const postRecado = async () => {
    const token = getToken()
    const text = recadoBody.trim()
    if (!token || !text) return
    setPostingRecado(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/recado`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("recadoError", "Não foi possível publicar o recado."))
      setRecadoOpen(false); setRecadoBody(""); await fetchPosts(true)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("recadoError", "Não foi possível publicar o recado."))
    } finally { setPostingRecado(false) }
  }
  const deleteRecado = async (recadoId: number) => {
    const token = getToken()
    if (!token) return
    setPosts((prev) => prev.filter((p) => !(p.is_recado && p.recado_id === recadoId)))
    try {
      await fetch(`/api/communities/${id}/recado/${recadoId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    } catch { /* já removido otimisticamente */ }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804] text-sm font-bold uppercase tracking-[0.14em] text-[#9A938A]">
        {t("pageTitle", "Comunidades")}…
      </div>
    )
  }
  if (error || !community) {
    return (
      <div className="min-h-[100dvh] bg-[#0b0804]">
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <p className="fl-display text-2xl text-[#F5F1E8]">{t("notFound", "Comunidade não encontrada.")}</p>
          <Link href="/comunidades" className="mt-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[#F2B705]">
            <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
          </Link>
        </div>
      </div>
    )
  }

  const bannerSrc = bannerPreview || community.banner_url
  const avatarSrc = avatarPreview || community.avatar_url

  // Ranking exibido: o da temporada (por métrica) quando há meta; senão XP absoluto.
  const seasonOn = !!goal
  const rankRows = goal
    ? goal.ranking.map((r) => ({ id_user: r.id_user, name: r.name, avatar_url: r.avatar_url, score: r.score, posts: r.posts, eng: r.eng }))
    : ranked.map((m) => ({ id_user: m.id_user, name: m.top_profile_name || m.user_name, avatar_url: m.top_profile_avatar, score: Number(m.top_profile_xp || 0), posts: undefined as number | undefined, eng: undefined as number | undefined }))
  const topRow = goal && goal.status === "closed" && goal.winner
    ? { id_user: goal.winner.id_user, name: goal.winner.name, avatar_url: goal.winner.avatar_url, score: goal.winner.score, posts: undefined as number | undefined, eng: undefined as number | undefined }
    : rankRows[0]
  const rowScore = (row: { score: number; posts?: number; eng?: number }) =>
    seasonOn && goal ? scoreLabel(goal.metric, row) : compact(row.score)

  return (
    <div className={`relative min-h-[100dvh] overflow-hidden bg-[#0b0804] text-[#F5F1E8] ${showAsLeaderEdit ? "pb-28" : "pb-20"}`}>
      {/* Top bar */}
      <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 pt-6 md:px-10">
        <Link href="/comunidades" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9A938A] transition hover:text-[#F5F1E8]">
          <ArrowLeft className="h-4 w-4" /> {t("pageTitle", "Comunidades")}
        </Link>
        {isLeader && (
          <div className="flex items-center gap-2">
            {edit && (
              <div className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-2.5 py-1.5">
                <Palette className="h-4 w-4" style={{ color: accent }} />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8]">{t("colorsLabel", "Cores")}</span>
                <span className="h-5 w-5 border-2 border-[#0B0B0D]" style={{ background: accent }} />
                <select value={accentDraft} onChange={(e) => setAccentDraft(e.target.value)}
                  className="border-l-2 border-[#F5F1E8]/15 bg-transparent pl-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] outline-none [&_option]:bg-[#15120E]">
                  {ACCENTS.map((a) => <option key={a.key} value={a.key}>{t(a.labelKey, a.fallback)}</option>)}
                </select>
              </div>
            )}
            <button type="button" onClick={() => setEdit((e) => !e)}
              className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]">
              {edit ? <><Eye className="h-4 w-4" /> {t("viewPublic", "Ver como público")}</> : <><ScrollText className="h-4 w-4" /> {t("edit", "Editar")}</>}
            </button>
          </div>
        )}
      </div>

      {/* HERO */}
      <header className="relative mx-auto mt-4 max-w-5xl px-5 md:px-10">
        <div className="relative overflow-hidden border-2 border-[#0B0B0D]" style={{ boxShadow: `8px 8px 0 0 ${accent}` }}>
          <div className="relative h-44 md:h-56 bg-[#1D1810]">
            {bannerSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
            )}
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, #0b0804cc 100%)` }} />
            {showAsLeaderEdit && <ImageDrop label={t("changeBanner", "Trocar capa")} busy={uploading === "banner"} onFile={(f) => uploadImage("banner", f)} />}
            {community.enxame_name && (
              <span className="absolute left-4 top-4 z-20 -rotate-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]">
                {tx.enxame(null, community.enxame_name)}
              </span>
            )}
            {isPrivate && (
              <span className="absolute left-4 top-12 z-20 inline-flex -rotate-2 items-center gap-1 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F5F1E8]">
                <Lock className="h-3 w-3" style={{ color: accent }} /> {t("privateBadge", "Privada")}
                {monthlyCents > 0 && <span style={{ color: accent }}>· {fmtBRL(monthlyCents)}/{t("perMonthShort", "mês")}</span>}
              </span>
            )}
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[#0B0B0D] bg-[#15120E] px-2">
              <span className="text-[8px] font-bold uppercase text-[#9A938A]">{t("level", "Nível")}</span>
              <span className="fl-display text-2xl leading-none" style={{ color: accent }}>{community.xp_level}</span>
            </span>
          </div>
        </div>

        <div className="relative z-20 -mt-12 flex items-end gap-4 px-2 md:-mt-16 md:px-3">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] md:h-36 md:w-36" style={{ outline: `2px solid ${accent}`, outlineOffset: "2px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc || "/placeholder-user.jpg"} alt={community.display_name} className="h-full w-full object-cover" />
            {showAsLeaderEdit && <ImageDrop label={t("changePhoto", "Trocar foto")} small busy={uploading === "avatar"} onFile={(f) => uploadImage("avatar", f)} />}
          </div>
          <div className="flex-1 pb-1 md:pb-2">
            {showAsLeaderEdit ? (
              <input value={nameDraft} maxLength={80} onChange={(e) => setNameDraft(e.target.value)} placeholder={t("nameLabel", "Nome da comunidade")}
                className="w-full border-b-2 border-dashed border-[#F5F1E8]/30 bg-transparent fl-display text-4xl leading-[0.85] text-[#F5F1E8] outline-none md:text-6xl" />
            ) : (
              <h1 className="fl-display text-4xl leading-[0.85] text-[#F5F1E8] sm:text-5xl md:text-6xl">{community.display_name}</h1>
            )}
          </div>
          {!isLeader && (
            <div className="pb-1">
              {myMembership ? (
                myMembership.role !== "leader" ? (
                  <button type="button" disabled={busy} onClick={() => joinOrLeave("leave")}
                    className="border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-60">
                    {busy ? t("leaving", "Saindo...") : t("leave", "Sair")}
                  </button>
                ) : null
              ) : (
                <button type="button" disabled={busy} onClick={() => (isPrivate ? startMembershipCheckout() : joinOrLeave("join"))}
                  className="border-2 border-[#0B0B0D] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-60" style={{ background: accent }}>
                  {busy
                    ? t("joining", "Entrando...")
                    : isPrivate
                      ? `${t("subscribeJoin", "Assinar")} · ${fmtBRL(monthlyCents)}/${t("perMonthShort", "mês")}`
                      : t("join", "Entrar")}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {actionMsg && (
        <div className="relative z-10 mx-auto mt-4 max-w-5xl px-5 md:px-10">
          <p className="inline-block border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5 text-xs font-bold text-[#F5F1E8]">{actionMsg}</p>
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
          {/* Privacidade + mensalidade (só líder em edição) */}
          {showAsLeaderEdit && (
            <Block title={t("privacyTitle", "Privacidade")} icon={<Lock className="h-4 w-4" />} accent={accent}>
              <div className="flex flex-wrap items-center gap-2">
                {([
                  ["public", t("privacyPublic", "Pública"), <Globe key="g" className="h-4 w-4" />],
                  ["private", t("privacyPrivate", "Privada"), <Lock key="l" className="h-4 w-4" />],
                ] as const).map(([key, label, icon]) => (
                  <button key={key} type="button" onClick={() => setPrivacyDraft(key)}
                    className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em]"
                    style={privacyDraft === key ? { background: accent, color: "#0B0B0D" } : { background: "#1D1810", color: "#9A938A" }}>
                    {icon} {label}
                  </button>
                ))}
                {privacyDraft === "private" && (
                  <label className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("privacyPriceLabel", "Mensalidade R$")}</span>
                    <input value={monthlyDraft} onChange={(e) => setMonthlyDraft(e.target.value)} inputMode="decimal" placeholder="19,90"
                      className="w-20 bg-transparent text-sm font-bold text-[#F5F1E8] outline-none" />
                    <span className="text-[10px] font-bold uppercase text-[#9A938A]">/{t("perMonthShort", "mês")}</span>
                  </label>
                )}
                <button type="button" disabled={savingPrivacy} onClick={savePrivacy}
                  className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50">
                  {savingPrivacy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("privacyApply", "Aplicar")}
                </button>
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                {privacyDraft === "private"
                  ? t("privacyPrivateHint", "Privada: os posts ficam só aqui dentro (não vão pro feed nem pros bees) e entrar exige assinatura mensal. Membros atuais continuam sem pagar.")
                  : t("privacyPublicHint", "Pública: qualquer pessoa entra de graça e os posts também aparecem no feed. Assinaturas existentes param de cobrar no fim do ciclo.")}
              </p>
              {isPrivate && membershipSummary && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniStat label={t("summarySubs", "Assinantes")} value={String(membershipSummary.active_subs)} accent={accent} />
                  <MiniStat label={t("summaryWaiting", "Em liberação")} value={fmtBRL(Number(membershipSummary.waiting_cents))} accent={accent} />
                  <MiniStat label={t("summaryAvailable", "Liberado")} value={fmtBRL(Number(membershipSummary.available_cents))} accent={accent} />
                  <MiniStat label={t("summaryTotal", "Total líquido")} value={fmtBRL(Number(membershipSummary.total_net_cents))} accent={accent} />
                </div>
              )}
            </Block>
          )}

          {/* Temporada (meta com prazo + ranking + prêmio) */}
          {(showAsLeaderEdit || goal) && (
            <Block title={t("goalTitle", "Temporada da comunidade")} icon={<Target className="h-4 w-4" />} accent={accent}>
              {goalFormOpen && showAsLeaderEdit ? (
                <div className="space-y-2">
                  <input value={goalTitle} maxLength={120} onChange={(e) => setGoalTitle(e.target.value)} placeholder={t("goalNamePlaceholder", "Ex.: Bora postar essa semana!")}
                    className="w-full border-b-2 border-dashed border-[#F5F1E8]/30 bg-transparent fl-display text-xl text-[#F5F1E8] outline-none" />
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={goalMetric} onChange={(e) => setGoalMetric(e.target.value)} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1.5 text-xs font-bold uppercase text-[#F5F1E8] [&_option]:bg-[#15120E]">
                      <option value="xp">{t("metricXp", "XP coletivo")}</option>
                      <option value="posts">{t("metricPosts", "Publicações")}</option>
                      <option value="shares">{t("metricShares", "Compartilhamentos")}</option>
                    </select>
                    <select value={goalDays} onChange={(e) => setGoalDays(Number(e.target.value))} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1.5 text-xs font-bold uppercase text-[#F5F1E8] [&_option]:bg-[#15120E]">
                      <option value={30}>{t("goalDays30", "30 dias")}</option>
                      <option value={60}>{t("goalDays60", "60 dias")}</option>
                      <option value={90}>{t("goalDays90", "90 dias")}</option>
                    </select>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                    🏆 {t("goalPrizeNote", "100 poléns pro 1º lugar")} · {t("goalMinMembers", "mín. 5 membros")} {community.member_count < 5 ? `(${community.member_count}/5)` : ""}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button type="button" disabled={savingGoal || community.member_count < 5} onClick={saveGoal} className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50">
                      {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("goalStart", "Iniciar temporada")}
                    </button>
                    {goal && <button type="button" onClick={removeGoal} className="inline-flex items-center gap-2 border-2 border-[#ff5a44]/60 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#ff7a6a]"><Trash2 className="h-4 w-4" /> {t("goalRemove", "Remover")}</button>}
                    <button type="button" onClick={() => setGoalFormOpen(false)} className="border-2 border-[#F5F1E8]/20 px-4 py-1.5 text-xs font-bold uppercase text-[#9A938A]">{t("cancel", "Cancelar")}</button>
                  </div>
                </div>
              ) : goal ? (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="fl-display text-xl leading-tight text-[#F5F1E8]">{goal.title}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-0.5 text-[10px] font-extrabold uppercase" style={{ color: accent }}>
                      <Sparkles className="h-3 w-3" /> {goal.prize_polens} {t("polensWord", "poléns")}
                    </span>
                  </div>
                  {goal.status === "closed" ? (
                    <div className="mt-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{t("goalEnded", "Temporada encerrada")}</p>
                      {goal.winner ? (
                        <p className="mt-1 flex items-center gap-2 fl-display text-lg text-[#F5F1E8]">🏆 {goal.winner.name} <span className="text-xs font-bold text-[#9A938A]">· {t("goalWonPrize", "levou")} {goal.prize_polens} {t("polensWord", "poléns")}</span></p>
                      ) : (
                        <p className="mt-1 text-sm text-[#9A938A]">{t("goalNoWinner", "Sem vencedor (ninguém pontuou).")}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">
                        <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" style={{ color: accent }} /> {metricLabel(goal.metric)}</span>
                        <span>· {t("goalDaysLeft", "faltam")} {daysLeft(goal.ends_at) ?? 0} {t("goalDaysWord", "dias")}</span>
                      </div>
                      {goal.percent != null && (
                        <div className="mt-2 h-4 w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]">
                          <div className="h-full transition-[width] duration-500" style={{ width: `${goal.percent}%`, background: accent }} />
                        </div>
                      )}
                    </>
                  )}
                  {showAsLeaderEdit && (
                    <button type="button" onClick={openGoalForm} className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F5F1E8] underline">
                      {goal.status === "closed" ? t("goalNewSeason", "Nova temporada") : t("goalEdit", "Editar temporada")}
                    </button>
                  )}
                </div>
              ) : showAsLeaderEdit ? (
                <button type="button" onClick={openGoalForm} className="inline-flex items-center gap-2 border-2 border-dashed border-[#F5F1E8]/25 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#9A938A] hover:border-[#F5F1E8]/60">
                  <Plus className="h-4 w-4" /> {t("goalStart", "Iniciar temporada")}
                </button>
              ) : null}
            </Block>
          )}

          {/* Mural — privado: só membros leem; só o líder posta */}
          {(showAsLeaderEdit || (isMember && announcements.length > 0)) && (
            <Block title={t("muralTitle", "Mural do líder")} icon={<Megaphone className="h-4 w-4" />} accent={accent}>
              {showAsLeaderEdit && (
                <div className="mb-3 space-y-2 border-b border-[#F5F1E8]/10 pb-3">
                  <textarea value={annBody} maxLength={1000} rows={2} onChange={(e) => setAnnBody(e.target.value)} placeholder={t("muralPlaceholder", "Escreva um recado para a comunidade...")}
                    className="w-full bg-transparent text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]/70" />
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                      <input type="checkbox" checked={annPin} onChange={(e) => setAnnPin(e.target.checked)} /> <Pin className="h-3 w-3" /> {t("muralPin", "Fixar")}
                    </label>
                    <button type="button" disabled={postingAnn || !annBody.trim()} onClick={postAnnouncement}
                      className="ml-auto inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50">
                      {postingAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} {t("muralPost", "Publicar")}
                    </button>
                  </div>
                </div>
              )}
              {announcements.length === 0 ? (
                <p className="text-sm text-[#9A938A]">{t("muralEmpty", "Nenhum recado ainda.")}</p>
              ) : (
                <div className="space-y-2">
                  {announcements.map((a) => (
                    <div key={a.id} className="relative border border-[#F5F1E8]/10 bg-[#1D1810] px-4 py-3">
                      {a.is_pinned && <span className="mb-1 inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}><Pin className="h-3 w-3" /> {t("pinned", "Fixado")}</span>}
                      <p className="whitespace-pre-line text-sm text-[#F5F1E8]/90">{a.body}</p>
                      <div className="mt-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.1em] text-[#9A938A]/70">
                        <span>{a.author_username ? `@${a.author_username}` : ""} · {new Date(a.created_at).toLocaleDateString()}</span>
                        {showAsLeaderEdit && <button type="button" onClick={() => deleteAnnouncement(a.id)} className="text-[#ff7a6a]"><Trash2 className="h-3.5 w-3.5" /></button>}
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
                  className="w-full bg-transparent text-sm leading-relaxed text-[#F5F1E8]/85 outline-none placeholder:text-[#9A938A]/70" />
              ) : (
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#F5F1E8]/85">{community.bio}</p>
              )}
            </Block>
          )}

          {/* Tabs */}
          <div>
            <div className="flex gap-1 border-b-2 border-[#F5F1E8]/15">
              {([["feed", t("tabFeed", "Feed")], ["members", t("tabMembers", "Membros")]] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)} className="-mb-0.5 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8]"
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
                      <div key={m.id_user} className="flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#15120E] p-3">
                        <span className="fl-display text-xl leading-none text-[#F5F1E8]/30">{i + 1}</span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.top_profile_avatar || "/placeholder-user.jpg"} alt={m.top_profile_name || m.user_name || ""} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate fl-display text-base leading-tight text-[#F5F1E8]">{m.top_profile_name || m.user_name}</p>
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                            {m.role === "leader" ? <><Crown className="h-3 w-3" style={{ color: accent }} /> {t("roleLeader", "Líder")}</> :
                             m.role === "vice" ? <><Shield className="h-3 w-3" style={{ color: accent }} /> {t("roleVice", "Vice-líder")}</> :
                             t("roleMember", "Membro")} · {compact(m.top_profile_xp)} XP
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : feedLocked ? (
                <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-14 text-center">
                  <Lock className="mx-auto h-10 w-10" style={{ color: accent }} />
                  <p className="mt-4 fl-display text-2xl text-[#F5F1E8]">{t("lockedTitle", "Comunidade privada")}</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[#9A938A]">
                    {t("lockedText", "O feed é exclusivo para membros. Assine para entrar e ver tudo que acontece aqui dentro.")}
                  </p>
                  <button type="button" disabled={busy} onClick={startMembershipCheckout}
                    className="mt-5 inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-6 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-60"
                    style={{ background: accent }}>
                    <Lock className="h-4 w-4" /> {t("subscribeJoin", "Assinar")} · {fmtBRL(monthlyCents)}/{t("perMonthShort", "mês")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Composer "Poste ou escreva aqui" */}
                  <div className="relative">
                    <button type="button" onClick={() => isMember ? setChooserOpen((v) => !v) : setActionMsg(t("joinToPost", "Entre na comunidade para publicar."))}
                      className="flex w-full items-center gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3 text-left">
                      <PenSquare className="h-5 w-5 shrink-0" style={{ color: accent }} />
                      <span className="text-sm font-semibold text-[#9A938A]">{t("composerCta", "Poste ou escreva aqui")}</span>
                    </button>
                    {chooserOpen && isMember && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1 flex gap-2 border-2 border-[#0B0B0D] bg-[#15120E] p-2">
                        <button type="button" onClick={() => openComposer("post")} className="flex flex-1 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] hover:bg-[#241d12]">
                          <ImagePlus className="h-4 w-4" /> {t("postLabel", "Post")}
                        </button>
                        <button type="button" onClick={() => openComposer("bee")} className="flex flex-1 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] hover:bg-[#241d12]">
                          <Film className="h-4 w-4" /> {t("beeLabel", "Bee")}
                        </button>
                        <button type="button" onClick={openRecado} className="flex flex-1 items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] hover:bg-[#241d12]">
                          <MessageSquare className="h-4 w-4" /> {t("recadoLabel", "Recado")}
                        </button>
                        <button type="button" onClick={() => setChooserOpen(false)} aria-label={t("cancel", "Cancelar")} className="grid place-items-center border-2 border-[#F5F1E8]/20 px-2 text-[#9A938A]"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>

                  {/* Feed unificado (posts + bees + recados) — cards padrão do Freelandoo */}
                  {loadingPosts ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" /></div>
                  ) : posts.length === 0 ? (
                    <Empty text={t("feedEmptyGroup", "Ainda não há publicações. Seja o primeiro!")} />
                  ) : (
                    <div className="overflow-hidden border-2 border-[#0B0B0D] bg-[#0b0804]">
                      {posts.map((post) => (
                        <PortfolioPostCard
                          key={post.post_id}
                          post={post}
                          filters={FEED_FILTERS}
                          commentsCount={post.comments_count ?? 0}
                          hideCommunityLink
                          onDeleteRecado={deleteRecado}
                          canDeleteRecado={isLeader || (!!currentUserId && post.author_user_id === currentUserId)}
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
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-60">
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
            <div className="relative border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-5" style={{ boxShadow: `6px 6px 0 0 ${accent}` }}>
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                <BarChart3 className="h-4 w-4" /> {t("benchmarkTitle", "Benchmark")}
              </div>
              <div className="mt-1 fl-display text-5xl leading-none" style={{ color: accent }}>#{benchmark.position}</div>
              <p className="mt-1 text-xs font-semibold text-[#9A938A]">
                {t("benchmarkOf", "de")} {benchmark.total} · {benchmark.enxame_name ? tx.enxame(null, benchmark.enxame_name) : t("communitiesWord", "comunidades")}
              </p>
              {benchmark.percentile != null && benchmark.total > 1 && (
                <span className="mt-2 inline-block border-2 border-[#F5F1E8]/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
                  {t("benchmarkTop", "top")} {benchmark.percentile}%
                </span>
              )}
            </div>
          )}

          {topRow && (
            <Block title={t("spotlightTitle", "Destaque")} icon={<Star className="h-4 w-4" />} accent={accent}>
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]" style={{ outline: `2px solid ${accent}`, outlineOffset: "1px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={topRow.avatar_url || "/placeholder-user.jpg"} alt={topRow.name || ""} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate fl-display text-lg leading-tight text-[#F5F1E8]">{topRow.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">
                    {seasonOn && goal?.status === "closed" ? `🏆 ${t("spotlightWinner", "Vencedor")}` : seasonOn ? t("spotlightLeader", "Líder da temporada") : t("spotlightSub", "Membro destaque")} · {rowScore(topRow)}{seasonOn && goal?.metric === "posts" ? ` ${t("postsEng", "posts/eng")}` : ""}
                  </p>
                </div>
              </div>
            </Block>
          )}

          {rankRows.length > 0 && (
            <Block title={seasonOn ? t("rankingSeasonTitle", "Ranking da temporada") : t("rankingTitle", "Ranking dos membros")} icon={<Trophy className="h-4 w-4" />} accent={accent}>
              <ol className="space-y-2">
                {rankRows.slice(0, 5).map((row, i) => (
                  <li key={row.id_user} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 fl-display text-base text-[#F5F1E8]/40">{i + 1}</span>
                    <div className="h-8 w-8 shrink-0 overflow-hidden border border-[#0B0B0D] bg-[#1D1810]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.avatar_url || "/placeholder-user.jpg"} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#F5F1E8]">{row.name}</span>
                    <span className="shrink-0 text-[11px] font-extrabold" style={{ color: accent }}>{rowScore(row)}</span>
                  </li>
                ))}
              </ol>
              {seasonOn && goal?.metric === "posts" && (
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9A938A]/70">{t("postsEngHint", "posts / engajamento")}</p>
              )}
            </Block>
          )}
        </div>
      </div>

      {/* Barra fixa de edição */}
      {showAsLeaderEdit && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[#0B0B0D] bg-[#15120E]/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A938A]"><Hash className="h-4 w-4" /> {community.display_name}</span>
            {actionMsg && <span className="text-xs font-bold text-[#F5F1E8]/80">{actionMsg}</span>}
            <button type="button" onClick={saveAll} disabled={saving}
              className="ml-auto inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-2 text-sm font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D] disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("save", "Salvar")}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Recado (nota só-texto, até 2000 chars) */}
      {recadoOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onClick={() => !postingRecado && setRecadoOpen(false)}>
          <div className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#15120E]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-[#F5F1E8]/12 px-4 py-3">
              <span className="inline-flex items-center gap-2 fl-display text-lg text-[#F2B705]"><MessageSquare className="h-4 w-4" /> {t("recadoTitle", "Novo recado")}</span>
              <button type="button" onClick={() => setRecadoOpen(false)} aria-label={t("cancel", "Cancelar")} className="grid h-8 w-8 place-items-center text-[#9A938A] hover:text-[#F5F1E8]"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-4 py-4">
              <textarea value={recadoBody} maxLength={2000} rows={6} autoFocus onChange={(e) => setRecadoBody(e.target.value.slice(0, 2000))}
                placeholder={t("recadoPlaceholder", "Escreva um recado para a comunidade...")}
                className="w-full resize-none border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2.5 text-sm leading-relaxed text-[#F5F1E8] outline-none placeholder:text-[#9A938A]/70" />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("recadoOnlyHere", "Fica só na comunidade")}</span>
                <span className="text-[10px] tabular-nums text-[#9A938A]/70">{recadoBody.length}/2000</span>
              </div>
              <button type="button" disabled={postingRecado || !recadoBody.trim()} onClick={postRecado}
                className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2.5 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50">
                {postingRecado ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />} {t("recadoPublish", "Publicar recado")}
              </button>
            </div>
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
      className={`absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/50 text-white transition-opacity hover:opacity-100 ${busy ? "opacity-100" : "opacity-0"} ${small ? "text-[10px]" : "text-xs"}`}
    >
      {busy ? <Loader2 className={small ? "h-5 w-5 animate-spin" : "h-7 w-7 animate-spin"} /> : <ImagePlus className={small ? "h-5 w-5" : "h-7 w-7"} />}
      <span className="font-bold uppercase tracking-wide">{label}</span>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = "" }} />
    </div>
  )
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-3">
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A938A]"><span style={{ color: accent }}>{icon}</span>{label}</div>
      <div className="mt-1 fl-display text-2xl leading-none text-[#F5F1E8]">{value}</div>
    </div>
  )
}

function Block({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <div className="relative border-2 border-[#0B0B0D] bg-[#15120E] p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-[#F5F1E8]/10 pb-2">
        <span className="flex flex-1 items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]"><span style={{ color: accent }}>{icon}</span>{title}</span>
      </div>
      {children}
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold" style={{ color: accent }}>{value}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border-2 border-dashed border-[#F5F1E8]/20 bg-[#15120E]/40 py-16 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#9A938A]">
      {text}
    </div>
  )
}
