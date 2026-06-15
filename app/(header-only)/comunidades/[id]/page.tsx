"use client"

import "../comunidade-casa.css"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import {
  Users, Trophy, ArrowLeft, Palette, Crown, Shield, ScrollText, Eye,
  ImagePlus, Loader2, Save, Hash, Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { getToken, getStoredUser } from "@/lib/auth"

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
}
type Media = { media_url: string; media_type: string; thumbnail_url: string | null }
type Item = { id_portfolio_item: string; title: string | null; description: string | null; feed_kind: string; media: Media[] }

// Cor de destaque (recolore só os detalhes — base paper/tinta é fixa). Mesma
// lista da página de participante da Casa Views.
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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const t = useTranslations("Community")
  const tx = useTaxonomy()

  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [feed, setFeed] = useState<Item[]>([])
  const [bees, setBees] = useState<Item[]>([])
  const [tab, setTab] = useState<"feed" | "bees" | "members">("feed")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  const currentUserId = getStoredUser()?.id_user ?? null
  const isLeader = !!community && !!currentUserId && community.id_leader_user === currentUserId
  const myMembership = useMemo(
    () => members.find((m) => m.id_user === currentUserId) || null,
    [members, currentUserId]
  )

  const accent = accentVar(accentDraft)

  const loadAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [cRes, mRes, fRes, bRes] = await Promise.all([
        fetch(`/api/communities/${id}`),
        fetch(`/api/communities/${id}/members`),
        fetch(`/api/communities/${id}/feed?kind=feed`),
        fetch(`/api/communities/${id}/feed?kind=bees`),
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
      const mData = await mRes.json()
      setMembers(Array.isArray(mData.members) ? mData.members : [])
      const fData = await fRes.json()
      setFeed(Array.isArray(fData.items) ? fData.items : [])
      const bData = await bRes.json()
      setBees(Array.isArray(bData.items) ? bData.items : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notFound", "Comunidade não encontrada."))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { loadAll() }, [loadAll])

  // Líder abre em modo edição uma vez (igual à página de participante).
  useEffect(() => {
    if (isLeader && !autoEdited.current) { setEdit(true); autoEdited.current = true }
  }, [isLeader])

  const joinOrLeave = async (action: "join" | "leave") => {
    const token = getToken()
    if (!token) { setActionMsg(t("loginToJoin", "Entre para participar")); return }
    setBusy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/${action}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })
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
      const fd = new FormData()
      fd.append(kind, file)
      const res = await fetch(`/api/communities/${id}/${kind}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
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

  // Salva nome+bio (/profile) e accent (/theme) juntos.
  const saveAll = async () => {
    const token = getToken()
    if (!token || !community) return
    if (!nameDraft.trim()) { setActionMsg(t("saveError", "Não foi possível salvar.")); return }
    setSaving(true); setActionMsg(null)
    try {
      const pRes = await fetch(`/api/communities/${id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: nameDraft.trim(), bio: bioDraft.trim() || null }),
      })
      const pData = await pRes.json()
      if (!pRes.ok) throw new Error(pData.error || t("saveError", "Não foi possível salvar."))
      if ((community.community_theme?.accent || "magenta") !== accentDraft) {
        const tRes = await fetch(`/api/communities/${id}/theme`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  const items = tab === "bees" ? bees : feed
  const bannerSrc = bannerPreview || community.banner_url
  const avatarSrc = avatarPreview || community.avatar_url
  const showAsLeaderEdit = isLeader && edit

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
                <select
                  value={accentDraft}
                  onChange={(e) => setAccentDraft(e.target.value)}
                  className="border-l-2 border-[var(--ink)]/20 bg-transparent pl-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink)] outline-none"
                >
                  {ACCENTS.map((a) => <option key={a.key} value={a.key}>{t(a.labelKey, a.fallback)}</option>)}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => setEdit((e) => !e)}
              className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-white px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)]"
            >
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

        {/* identidade */}
        <div className="relative z-20 -mt-12 flex items-end gap-4 px-2 md:-mt-16 md:px-3">
          <div className="relative h-28 w-28 shrink-0 border-2 border-[var(--ink)] shadow-[5px_5px_0_0_var(--ink)] md:h-36 md:w-36" style={{ background: "var(--paper-2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc || "/placeholder-user.jpg"} alt={community.display_name} className="h-full w-full object-cover" />
            {showAsLeaderEdit && <ImageDrop label={t("changePhoto", "Trocar foto")} small busy={uploading === "avatar"} onFile={(f) => uploadImage("avatar", f)} />}
          </div>
          <div className="flex-1 pb-1 md:pb-2">
            {showAsLeaderEdit ? (
              <input
                value={nameDraft}
                maxLength={80}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder={t("nameLabel", "Nome da comunidade")}
                className="w-full border-b-2 border-dashed border-[var(--ink)]/40 bg-transparent casa-display text-4xl leading-[0.85] text-[var(--ink)] outline-none md:text-6xl"
              />
            ) : (
              <h1 className="casa-display text-4xl leading-[0.85] text-[var(--ink)] sm:text-5xl md:text-6xl">{community.display_name}</h1>
            )}
          </div>
          {/* ação de visitante */}
          {!isLeader && (
            <div className="pb-1">
              {myMembership ? (
                myMembership.role !== "leader" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => joinOrLeave("leave")}
                    className="border-2 border-[var(--ink)] bg-white px-5 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
                  >
                    {busy ? t("leaving", "Saindo...") : t("leave", "Sair")}
                  </button>
                ) : null
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => joinOrLeave("join")}
                  className="border-2 border-[var(--ink)] px-5 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
                  style={{ background: accent }}
                >
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

      {/* Perfil (bio) */}
      {(showAsLeaderEdit || community.bio) && (
        <section className="relative z-10 mx-auto mt-6 max-w-5xl px-5 md:px-10">
          <Block title={t("profileSection", "Perfil")} icon={<ScrollText className="h-4 w-4" />} accent={accent}>
            {showAsLeaderEdit ? (
              <textarea
                value={bioDraft}
                maxLength={200}
                onChange={(e) => setBioDraft(e.target.value)}
                placeholder={t("bioPlaceholder", "Conte sobre a comunidade...")}
                rows={4}
                className="w-full bg-transparent casa-body text-sm leading-relaxed text-[var(--ink-soft)]/85 outline-none"
              />
            ) : (
              <p className="whitespace-pre-line casa-body text-sm leading-relaxed text-[var(--ink-soft)]/85">{community.bio}</p>
            )}
          </Block>
        </section>
      )}

      {/* Tabs */}
      <section className="relative z-10 mx-auto mt-8 max-w-5xl px-5 md:px-10">
        <div className="flex gap-1 border-b-2 border-[var(--ink)]">
          {([
            ["feed", t("tabFeed", "Feed")],
            ["bees", t("tabBees", "Bees")],
            ["members", t("tabMembers", "Membros")],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="-mb-0.5 px-4 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink)]"
              style={{
                borderBottom: tab === key ? `4px solid ${accent}` : "4px solid transparent",
                opacity: tab === key ? 1 : 0.5,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="mt-6">
          {tab === "members" ? (
            members.length === 0 ? (
              <Empty text={t("membersEmpty", "Sem membros ainda.")} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((m) => (
                  <div key={m.id_user} className="flex items-center gap-3 border-2 border-[var(--ink)] bg-white p-3 shadow-[4px_4px_0_0_var(--ink)]">
                    <div className="h-12 w-12 shrink-0 overflow-hidden border-2 border-[var(--ink)]" style={{ background: "var(--paper-2)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.top_profile_avatar || "/placeholder-user.jpg"} alt={m.top_profile_name || m.user_name || ""} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate casa-display text-base leading-tight text-[var(--ink)]">{m.top_profile_name || m.user_name}</p>
                      <p className="flex items-center gap-1 casa-body text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]/60">
                        {m.role === "leader" ? <><Crown className="h-3 w-3" style={{ color: accent }} /> {t("roleLeader", "Líder")}</> :
                         m.role === "vice" ? <><Shield className="h-3 w-3" style={{ color: accent }} /> {t("roleVice", "Vice-líder")}</> :
                         t("roleMember", "Membro")}
                        {typeof m.top_profile_level === "number" ? ` · ${t("level", "Nível")} ${m.top_profile_level}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : items.length === 0 ? (
            <Empty text={tab === "bees" ? t("beesEmpty", "Nenhum Bee ainda.") : t("feedEmpty", "Esta comunidade ainda não publicou nada.")} />
          ) : (
            <div className={tab === "bees" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" : "grid gap-4 sm:grid-cols-2"}>
              {items.map((it) => {
                const cover = it.media?.[0]
                return (
                  <div key={it.id_portfolio_item} className="overflow-hidden border-2 border-[var(--ink)] bg-white shadow-[4px_4px_0_0_var(--ink)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover.thumbnail_url || cover.media_url}
                        alt={it.title || ""}
                        loading="lazy"
                        className={tab === "bees" ? "aspect-[9/16] w-full object-cover" : "aspect-[4/5] w-full object-cover"}
                      />
                    ) : null}
                    {it.title || it.description ? (
                      <div className="p-3">
                        {it.title ? <p className="truncate casa-display text-base leading-tight text-[var(--ink)]">{it.title}</p> : null}
                        {it.description ? <p className="mt-0.5 line-clamp-2 casa-body text-xs text-[var(--ink-soft)]/70">{it.description}</p> : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Barra fixa de edição */}
      {showAsLeaderEdit && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[var(--ink)] bg-white/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <span className="inline-flex items-center gap-2 casa-body text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/60">
              <Hash className="h-4 w-4" /> {community.display_name}
            </span>
            {actionMsg && <span className="casa-body text-xs font-bold text-[var(--ink-soft)]/70">{actionMsg}</span>}
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="ml-auto inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-2 casa-body text-sm font-extrabold uppercase tracking-[0.14em] text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("save", "Salvar")}
            </button>
          </div>
        </div>
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
