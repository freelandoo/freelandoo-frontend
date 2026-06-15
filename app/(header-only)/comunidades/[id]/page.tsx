"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Trophy, ArrowLeft, Palette, Crown, Shield } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { getToken, getStoredUser } from "@/lib/auth"

type Theme = { primary?: string; background?: string; text?: string }
type Community = {
  id_profile: string
  id_leader_user: string | null
  display_name: string
  bio: string | null
  avatar_url: string | null
  enxame_name: string | null
  community_theme: Theme | null
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

const DEFAULT_THEME: Required<Theme> = { primary: "#F2B705", background: "#F1EDE2", text: "#1A1505" }

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
  const [themeOpen, setThemeOpen] = useState(false)

  const currentUserId = getStoredUser()?.id_user ?? null
  const isLeader = !!community && !!currentUserId && community.id_leader_user === currentUserId
  const myMembership = useMemo(
    () => members.find((m) => m.id_user === currentUserId) || null,
    [members, currentUserId]
  )

  const theme = useMemo<Required<Theme>>(
    () => ({ ...DEFAULT_THEME, ...(community?.community_theme || {}) }),
    [community]
  )

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
      setCommunity(cData.community)
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

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const joinOrLeave = async (action: "join" | "leave") => {
    const token = getToken()
    if (!token) {
      setActionMsg(t("loginToJoin", "Entre para participar"))
      return
    }
    setBusy(true)
    setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("joinError", "Não foi possível entrar."))
      setActionMsg(action === "join" ? t("joinSuccess", "Você entrou na comunidade!") : t("leaveSuccess", "Você saiu da comunidade."))
      await loadAll()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("joinError", "Não foi possível entrar."))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-sm text-muted-foreground">
        {t("pageTitle", "Comunidades")}…
      </div>
    )
  }
  if (error || !community) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="text-lg font-semibold">{t("notFound", "Comunidade não encontrada.")}</p>
        <Link href="/comunidades" className="mt-4 inline-flex items-center gap-2 text-sm text-[#F2B705]">
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </Link>
      </div>
    )
  }

  const items = tab === "bees" ? bees : feed

  return (
    <div
      className="min-h-[100dvh]"
      style={{ background: theme.background, color: theme.text }}
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <Link href="/comunidades" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </Link>

        {/* Header */}
        <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar className="size-20 ring-4" style={{ boxShadow: `0 0 0 4px ${theme.primary}33` }}>
            <AvatarImage src={community.avatar_url || undefined} alt={community.display_name} />
            <AvatarFallback>{community.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold">{community.display_name}</h1>
            {community.enxame_name ? (
              <p className="text-sm opacity-70">{tx.enxame(null, community.enxame_name)}</p>
            ) : null}
            {community.bio ? <p className="mt-1 text-sm opacity-80">{community.bio}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm opacity-80">
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {community.member_count} {t("membersCount", "membros")}</span>
              <span className="inline-flex items-center gap-1"><Trophy className="h-4 w-4" /> {t("level", "Nível")} {community.xp_level}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {isLeader ? (
              <button
                type="button"
                onClick={() => setThemeOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ border: `2px solid ${theme.primary}`, color: theme.text }}
              >
                <Palette className="h-4 w-4" /> {t("editTheme", "Editar cores")}
              </button>
            ) : myMembership ? (
              myMembership.role !== "leader" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => joinOrLeave("leave")}
                  className="rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60"
                  style={{ border: `2px solid ${theme.text}33`, color: theme.text }}
                >
                  {busy ? t("leaving", "Saindo...") : t("leave", "Sair")}
                </button>
              ) : null
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => joinOrLeave("join")}
                className="rounded-xl px-5 py-2 text-sm font-bold disabled:opacity-60"
                style={{ background: theme.primary, color: "#1A1505" }}
              >
                {busy ? t("joining", "Entrando...") : t("join", "Entrar")}
              </button>
            )}
          </div>
        </div>

        {actionMsg ? (
          <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: `${theme.primary}22` }}>{actionMsg}</p>
        ) : null}

        {themeOpen && isLeader ? (
          <ThemeEditor
            communityId={community.id_profile}
            initial={theme}
            t={t}
            onClose={() => setThemeOpen(false)}
            onSaved={loadAll}
          />
        ) : null}

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b" style={{ borderColor: `${theme.text}22` }}>
          {([
            ["feed", t("tabFeed", "Feed")],
            ["bees", t("tabBees", "Bees")],
            ["members", t("tabMembers", "Membros")],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="px-4 py-2 text-sm font-semibold"
              style={{
                borderBottom: tab === key ? `3px solid ${theme.primary}` : "3px solid transparent",
                opacity: tab === key ? 1 : 0.6,
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
                  <div key={m.id_user} className="flex items-center gap-3 rounded-2xl p-4" style={{ background: `${theme.text}08` }}>
                    <Avatar className="size-12">
                      <AvatarImage src={m.top_profile_avatar || undefined} alt={m.top_profile_name || m.user_name || ""} />
                      <AvatarFallback>{(m.top_profile_name || m.user_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{m.top_profile_name || m.user_name}</p>
                      <p className="flex items-center gap-1 text-xs opacity-70">
                        {m.role === "leader" ? <><Crown className="h-3 w-3" /> {t("roleLeader", "Líder")}</> :
                         m.role === "vice" ? <><Shield className="h-3 w-3" /> {t("roleVice", "Vice-líder")}</> :
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
                  <div key={it.id_portfolio_item} className="overflow-hidden rounded-2xl" style={{ background: `${theme.text}08` }}>
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
                        {it.title ? <p className="truncate text-sm font-semibold">{it.title}</p> : null}
                        {it.description ? <p className="line-clamp-2 text-xs opacity-70">{it.description}</p> : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed py-16 text-center text-sm opacity-60">{text}</div>
}

function ThemeEditor({
  communityId,
  initial,
  t,
  onClose,
  onSaved,
}: {
  communityId: string
  initial: Required<Theme>
  t: (key: string, fallback: string) => string
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [primary, setPrimary] = useState(initial.primary)
  const [background, setBackground] = useState(initial.background)
  const [text, setText] = useState(initial.text)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const save = async () => {
    const token = getToken()
    if (!token) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/communities/${communityId}/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: { primary, background, text } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("themeError", "Não foi possível salvar as cores."))
      setMsg(t("themeSaved", "Cores atualizadas!"))
      await onSaved()
      onClose()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("themeError", "Não foi possível salvar as cores."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: `${text}22` }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <ColorField label={t("colorPrimary", "Cor principal")} value={primary} onChange={setPrimary} />
        <ColorField label={t("colorBackground", "Cor de fundo")} value={background} onChange={setBackground} />
        <ColorField label={t("colorText", "Cor do texto")} value={text} onChange={setText} />
      </div>
      {msg ? <p className="mt-2 text-xs opacity-70">{msg}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={saving} onClick={save} className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60" style={{ background: primary, color: "#1A1505" }}>
          {t("saveTheme", "Salvar")}
        </button>
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm" style={{ border: `2px solid ${text}33` }}>
          {t("cancel", "Cancelar")}
        </button>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
      <span className="opacity-80">{label}</span>
    </label>
  )
}
