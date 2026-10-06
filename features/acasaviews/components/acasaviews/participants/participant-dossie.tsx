"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, ChevronRight, Eye, EyeOff, Heart, MessageCircle, Trophy, BarChart3, Vault, Zap,
  Camera, ScrollText, Lock, Lightbulb, Loader2, Save, Trash2, Thermometer,
  Plus, X, ImagePlus, Palette, Bookmark, Share2, Star, Crown, UserRound, Route, Quote,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import type { ParticipantFull, JourneyItem, SecretItem, TheoryItem } from "@/lib/acasaviews/participants-live"
import { ConvenienceStore } from "./convenience-store"

/**
 * Dossiê do participante na pele "reality" (preto/branco/rosa). A cor de
 * destaque escolhida pelo admin pinta SÓ o banner (duotom) — a estrutura da
 * página é rosa, como nas outras telas da seção. Mesma lógica de edição de
 * antes: o admin abre editável, "ver como público" alterna.
 */

type ShowKey = "show_perfil" | "show_journey" | "show_secrets" | "show_theories" | "show_desempenho" | "show_cofre" | "show_suspicion" | "show_captures" | "show_store"
const ACCENTS: { key: string; label: string }[] = [
  { key: "magenta", label: "Magenta" },
  { key: "cyan", label: "Ciano" },
  { key: "gold", label: "Dourado" },
  { key: "purple", label: "Roxo" },
  { key: "leaf", label: "Verde folha" },
  { key: "red", label: "Vermelho" },
  { key: "orange", label: "Laranja" },
  { key: "gray", label: "Cinza" },
]
const STATUSES = [
  { key: "active", label: "Na casa" }, { key: "finalist", label: "Finalista" },
  { key: "eliminated", label: "Eliminado" }, { key: "winner", label: "Campeão" },
]
const SENTIMENTS = ["positive", "neutral", "negative"]
const SENTIMENT_LABEL: Record<string, string> = { positive: "positivo", neutral: "neutro", negative: "negativo" }
function accentVar(a: string) {
  return ACCENTS.some((x) => x.key === a) ? `var(--rv-acc-${a})` : "var(--rv-acc-magenta)"
}
function sentimentColor(s: string) {
  return s === "positive" ? "var(--rv-cyan)" : s === "negative" ? "var(--rv-pink)" : "var(--rv-white)"
}
function brl(c: number) { return (Number(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}
let tmp = 0
const tid = () => `tmp-${++tmp}`

export function ParticipantDossie({ initial, slug, compra }: { initial: ParticipantFull; slug: string; compra?: string }) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // estado editável
  const [d, setD] = useState(initial)
  const [journey, setJourney] = useState<JourneyItem[]>(initial.journey)
  const [secrets, setSecrets] = useState<SecretItem[]>(initial.secrets)
  const [theories, setTheories] = useState<TheoryItem[]>(initial.theories)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u) return
        const admin = Boolean(u.is_admin) || (Array.isArray(u.roles) && u.roles.some((r: { desc_role?: string }) => r.desc_role === "Administrator"))
        setIsAdmin(admin)
        if (admin) setEdit(true) // admin sempre abre editável
      })
      .catch(() => {})
  }, [])

  const accent = accentVar(d.accent_color)
  const live = d.live
  function set<K extends keyof ParticipantFull>(k: K, v: ParticipantFull[K]) { setD((s) => ({ ...s, [k]: v })) }
  function toggle(k: ShowKey) { setD((s) => ({ ...s, [k]: !s[k] })) }

  async function uploadImage(file: File, kind: "avatar" | "cover") {
    const token = getToken()
    const fd = new FormData(); fd.append("file", file); fd.append("kind", kind)
    setMsg("Enviando imagem…")
    try {
      const res = await fetch("/api/admin/casa/uploads", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (data?.url) { set(kind === "cover" ? "cover_url" : "avatar_url", data.url); setMsg(null) }
      else setMsg(data?.error || "Falha no upload")
    } catch { setMsg("Falha no upload") }
  }

  async function save() {
    setSaving(true); setMsg(null)
    const token = getToken()
    const payload = {
      participant: {
        display_name: d.display_name, slug: d.slug, tagline: d.tagline, bio: d.bio, quote: d.quote,
        avatar_url: d.avatar_url, cover_url: d.cover_url, accent_color: d.accent_color, status: d.status,
        vault_amount_cents: d.vault_amount_cents, suspicion_pct: d.suspicion_pct, captures_count: d.captures_count,
        external_ranking_user_id: d.external_ranking_user_id, is_active: d.is_active,
        show_perfil: d.show_perfil, show_journey: d.show_journey, show_secrets: d.show_secrets,
        show_theories: d.show_theories, show_desempenho: d.show_desempenho, show_cofre: d.show_cofre,
        show_suspicion: d.show_suspicion, show_captures: d.show_captures, show_store: d.show_store,
      },
      journey: journey.map((j) => ({ label: j.label, title: j.title, description: j.description, sentiment: j.sentiment })),
      secrets: secrets.map((s) => ({ content: s.content, author_label: s.author_label, revealed: s.revealed })),
      theories: theories.map((t) => ({ content: t.content, author_label: t.author_label, votes: t.votes })),
    }
    try {
      const res = await fetch(`/api/admin/casa/participants/${d.id}/full`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data?.error || "Falha ao salvar"); setSaving(false); return }
      setMsg("Salvo!")
      if (data?.participant?.slug && data.participant.slug !== slug) {
        router.replace(`/acasaviews/participantes/${data.participant.slug}`)
      } else { router.refresh() }
      setTimeout(() => setMsg(null), 2500)
    } catch { setMsg("Falha ao salvar") }
    setSaving(false)
  }

  async function del() {
    if (!confirm(`Excluir "${d.display_name}"? Some tudo (jornada, segredos, teorias).`)) return
    const token = getToken()
    await fetch(`/api/admin/casa/participants/${d.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    router.push("/acasaviews/rankings")
  }

  const visible = (k: ShowKey) => edit || d[k]
  const [firstName, ...restName] = (d.display_name || "").trim().split(/\s+/)
  const year = new Date().getFullYear()

  return (
    <div className={`rv rv-grid rv-noise rv-page-in ${edit ? "pb-32" : "pb-24"}`}>
      {/* faixas de luz e "+" técnicos — pintados uma vez */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <span className="rv-streak -left-40 top-40 h-24 w-[520px]" />
        <span className="rv-streak rv-streak-pink -right-24 top-[420px] h-3 w-[380px]" />
        <span className="rv-streak rv-streak-pink -left-16 top-[900px] h-2 w-[320px]" />
        <span className="rv-streak -right-44 top-[1200px] h-16 w-[480px] opacity-60" />
        <span className="rv-plus left-10 top-24 hidden md:block" />
        <span className="rv-plus right-14 top-[620px] hidden md:block" />
        <span className="rv-plus left-[48%] top-[1100px] hidden md:block" />
      </div>

      <SideRails year={year} />

      <div className="relative z-[2] mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-8">
        {/* ── trilha + controles do admin ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Trilha" className="rv-type flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--rv-muted)]">
            <Link href="/acasaviews/rankings" className="inline-flex items-center gap-2 hover:text-[var(--rv-white)]">
              <ArrowLeft className="h-4 w-4" /> Rankings
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-[var(--rv-faint)]" />
            <Link href="/acasaviews/ranking-participantes" className="hover:text-[var(--rv-white)]">Participantes</Link>
            <ChevronRight className="h-3.5 w-3.5 text-[var(--rv-faint)]" />
            <span className="text-[var(--rv-pink-ink)]">{d.display_name}</span>
          </nav>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              {edit && (
                <div className="rv-type inline-flex items-center gap-2 border-[1.5px] border-[var(--rv-white)] bg-[var(--rv-bg)] px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em]">
                  <Palette className="h-4 w-4" />
                  Cores
                  <span data-avatar className="h-4 w-4 border border-[var(--rv-white)]" style={{ background: accent }} />
                  <select value={d.accent_color} onChange={(e) => set("accent_color", e.target.value)}
                    className="border-l border-[var(--rv-line-strong)] bg-[var(--rv-bg)] pl-2 text-[11px] uppercase text-[var(--rv-white)] outline-none">
                    {ACCENTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>
                </div>
              )}
              <button onClick={() => setEdit((e) => !e)} className="rv-type inline-flex items-center gap-2 border-[1.5px] border-[var(--rv-white)] bg-[var(--rv-bg)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] hover:bg-[var(--rv-white)] hover:text-[var(--rv-bg)]">
                {edit ? <><Eye className="h-4 w-4" /> ver como público</> : <><ScrollText className="h-4 w-4" /> editar</>}
              </button>
            </div>
          )}
        </div>

        {/* ── HERÓI ── */}
        <header className="rv-frame rv-frame-pink mt-5" style={{ ["--c" as string]: "26px" }}>
          <div className="rv-frame-in">
            {/* banner em duotom da cor de destaque */}
            <div className="relative h-44 overflow-hidden bg-[var(--rv-surface-2)] md:h-60" style={{ ["--acc" as string]: accent }}>
              {d.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover grayscale contrast-125" />
              ) : (
                <span aria-hidden className="rv-glitch-stripes absolute inset-0 opacity-30" />
              )}
              <span aria-hidden className="rv-duo-acc" />
              <span aria-hidden className="rv-halftone absolute inset-0 opacity-15" />
              <span aria-hidden className="rv-scan absolute inset-0" />
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--rv-bg)] to-transparent" />
              {edit && <ImageDrop label="banner" onFile={(f) => uploadImage(f, "cover")} />}

              {edit ? (
                <select value={d.status} onChange={(e) => set("status", e.target.value)} className="rv-select rv-type absolute left-4 top-4 z-40 px-2 py-1 text-[11px] uppercase">
                  {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              ) : (
                <span className="absolute left-4 top-4 z-[3] inline-flex items-stretch">
                  <span className="flex items-center bg-[var(--rv-bg)] px-2 text-[var(--rv-pink)]"><Star className="h-4 w-4 fill-current" /></span>
                  <span className="rv-display bg-[var(--rv-pink)] px-3 py-1 text-lg tracking-[0.06em] text-[var(--rv-white)]">
                    {STATUSES.find((s) => s.key === d.status)?.label || d.status}
                  </span>
                </span>
              )}
              {!edit && live.matched && live.posicao ? (
                <span className="absolute right-4 top-4 z-[3] flex flex-col items-center border-2 border-[var(--rv-white)] bg-[var(--rv-bg)] px-3 py-1">
                  <span className="rv-type text-[9px] uppercase tracking-[0.16em] text-[var(--rv-muted)]">posição</span>
                  <span className="rv-display text-3xl text-[var(--rv-pink)]">#{live.posicao}</span>
                </span>
              ) : (
                <Crown aria-hidden className="absolute right-6 top-5 z-[3] h-12 w-12 -rotate-12 text-[var(--rv-pink)] drop-shadow-[0_0_10px_rgba(255,0,122,0.8)]" strokeWidth={1.6} />
              )}
            </div>

            {/* identidade */}
            <div className="relative z-[3] flex flex-col gap-5 px-4 pb-6 sm:flex-row sm:items-end md:px-7">
              <div className="relative -mt-20 aspect-[4/5] w-36 shrink-0 border-2 border-[var(--rv-pink)] bg-[var(--rv-surface-2)] rv-glow-box md:-mt-28 md:w-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.avatar_url || "/placeholder-user.jpg"} alt={d.display_name} className="h-full w-full object-cover" />
                <Crown aria-hidden className="absolute -left-3 -top-4 h-7 w-7 -rotate-12 fill-[var(--rv-pink)] text-[var(--rv-pink)]" />
                {edit && <ImageDrop label="avatar" small onFile={(f) => uploadImage(f, "avatar")} />}
              </div>

              <div className="min-w-0 flex-1">
                {edit ? (
                  <input value={d.display_name} onChange={(e) => set("display_name", e.target.value)} placeholder="Nome"
                    className="rv-field rv-display w-full border-b-2 border-dashed border-[var(--rv-line-strong)] text-5xl md:text-7xl" />
                ) : (
                  <h1 className="rv-display break-words text-[15vw] leading-[0.86] sm:text-6xl md:text-8xl">
                    <span className="rv-grunge">{firstName}</span>
                    {restName.length > 0 && <><br /><span className="text-[var(--rv-pink)]">{restName.join(" ")}</span></>}
                  </h1>
                )}
                {edit ? (
                  <input value={d.tagline || ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Chamada curta (tagline)"
                    className="rv-field mt-3 w-full max-w-xl border-b border-dashed border-[var(--rv-line-strong)] text-sm" />
                ) : (d.tagline && (
                  <p className="mt-3 flex max-w-xl items-start gap-2 text-sm text-[var(--rv-muted)] md:text-base">
                    <span aria-hidden className="mt-1 text-[10px] text-[var(--rv-pink)]">▶</span>{d.tagline}
                  </p>
                ))}
              </div>

              <p aria-hidden className="rv-script hidden max-w-[11ch] -rotate-6 self-center text-3xl text-[var(--rv-pink-ink)] lg:block">
                A audiência transforma cada rolê em espetáculo.
              </p>
            </div>
          </div>
        </header>

        {/* vínculo ranking (só admin) */}
        {edit && (
          <label className="rv-type mt-4 flex flex-wrap items-center gap-3 border border-dashed border-[var(--rv-line-strong)] bg-[rgba(5,5,5,0.7)] px-3 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[var(--rv-muted)]">
            ID/login no ranking:
            <input value={d.external_ranking_user_id || ""} onChange={(e) => set("external_ranking_user_id", e.target.value)} placeholder="user_login do casa-views-ranking"
              className="rv-field min-w-[12rem] flex-1 border-l border-[var(--rv-line)] px-3 text-xs normal-case" />
            <span className="flex items-center gap-2 text-[var(--rv-white)]">
              <input type="checkbox" checked={d.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-[var(--rv-up)]" />
              <span data-avatar className={`h-2 w-2 ${d.is_active ? "bg-[var(--rv-up)]" : "bg-[var(--rv-faint)]"}`} />
              ativo
            </span>
          </label>
        )}

        {/* ── KPIs (ao vivo, só leitura) ── */}
        <section className="mt-6">
          {!live.matched && (
            <p className="rv-type mb-3 inline-flex items-center gap-2 border border-[var(--rv-line-strong)] bg-[rgba(5,5,5,0.7)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--rv-muted)]">
              <span aria-hidden className="h-1.5 w-1.5 bg-[var(--rv-pink)]" />
              números ao vivo aparecem quando o participante é vinculado ao ranking
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Kpi icon={<Trophy className="h-4 w-4" />} label="pontos" value={compact(live.pontuacao)} pct={live.matched ? live.pontuacao_pct_24h : null} />
            <Kpi icon={<BarChart3 className="h-4 w-4" />} label="posição" value={live.posicao ? `#${live.posicao}` : "—"} pct={null} />
            <Kpi icon={<Eye className="h-4 w-4" />} label="views" value={compact(live.views)} pct={live.matched ? live.views_pct_24h : null} />
            <Kpi icon={<Heart className="h-4 w-4" />} label="likes" value={compact(live.likes)} pct={live.matched ? live.likes_pct_24h : null} />
            <Kpi icon={<MessageCircle className="h-4 w-4" />} label="comentários" value={compact(live.comments)} pct={live.matched ? live.comments_pct_24h : null} />
            <Kpi icon={<Bookmark className="h-4 w-4" />} label="salvamentos" value={compact(live.saved)} pct={null} />
            <Kpi icon={<Share2 className="h-4 w-4" />} label="compart." value={compact(live.shares)} pct={null} />
          </div>
        </section>

        {/* ── grade ── */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {/* esquerda */}
          <div className="space-y-5 lg:col-span-2">
            {/* citação */}
            {(edit || d.quote) && (
              <div className="relative overflow-hidden border-[1.5px] border-[var(--rv-line-strong)] bg-[var(--rv-surface)] px-6 py-6 md:px-8">
                <Quote aria-hidden className="absolute left-4 top-4 h-9 w-9 -scale-x-100 fill-[var(--rv-pink)] text-[var(--rv-pink)]" />
                <span aria-hidden className="rv-glitch-stripes absolute -right-8 bottom-0 h-full w-28 opacity-10" />
                {edit ? (
                  <textarea value={d.quote || ""} onChange={(e) => set("quote", e.target.value)} placeholder="Citação de destaque" rows={2}
                    className="rv-field rv-script relative w-full pl-10 text-3xl leading-tight" />
                ) : (
                  <blockquote className="rv-script relative pl-10 text-3xl leading-tight md:text-4xl">{d.quote}</blockquote>
                )}
                <p className="rv-type relative mt-3 text-right text-[10px] uppercase tracking-[0.2em] text-[var(--rv-muted)]">{d.display_name}</p>
              </div>
            )}

            {/* Perfil (bio) */}
            {visible("show_perfil") && (edit || d.bio) && (
              <Block title="Perfil" icon={<UserRound className="h-5 w-5" />} edit={edit} on={d.show_perfil} onToggle={() => toggle("show_perfil")}>
                {edit ? (
                  <textarea value={d.bio || ""} onChange={(e) => set("bio", e.target.value)} placeholder="Perfil narrativo (bio)" rows={4}
                    className="rv-field w-full text-sm leading-relaxed" />
                ) : (<p className="whitespace-pre-line text-sm leading-relaxed text-[var(--rv-muted)]">{d.bio}</p>)}
              </Block>
            )}

            {/* Desempenho (ao vivo) */}
            {visible("show_desempenho") && (live.matched || edit) && (
              <Block title="Desempenho · últimas 24h" icon={<Zap className="h-5 w-5" />} edit={edit} on={d.show_desempenho} onToggle={() => toggle("show_desempenho")}>
                {live.matched ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Delta label="pontos" delta={live.pontuacao_delta_24h} pct={live.pontuacao_pct_24h} />
                    <Delta label="views" delta={live.views_delta_24h} pct={live.views_pct_24h} />
                    <Delta label="likes" delta={live.likes_delta_24h} pct={live.likes_pct_24h} />
                    <Delta label="comentários" delta={live.comments_delta_24h} pct={live.comments_pct_24h} />
                  </div>
                ) : <p className="text-sm text-[var(--rv-muted)]">Sem dados ao vivo — vincule ao ranking.</p>}
              </Block>
            )}

            {/* Jornada */}
            {visible("show_journey") && (edit || journey.length > 0) && (
              <Block title="Jornada na casa" icon={<Route className="h-5 w-5" />} edit={edit} on={d.show_journey} onToggle={() => toggle("show_journey")}>
                <ol className="relative space-y-4 pl-7">
                  <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-[var(--rv-line-strong)]" />
                  {journey.map((j, idx) => (
                    <li key={j.id} className="relative">
                      <span aria-hidden data-avatar className="absolute -left-7 top-5 h-[15px] w-[15px] border-2 border-[var(--rv-bg)]"
                        style={{ background: sentimentColor(j.sentiment), boxShadow: `0 0 0 1.5px ${sentimentColor(j.sentiment)}` }} />
                      <div className="rv-paper border-l-4 px-4 py-3 shadow-[4px_4px_0_0_var(--rv-pink)]" style={{ borderLeftColor: sentimentColor(j.sentiment) === "var(--rv-white)" ? "var(--rv-bg)" : sentimentColor(j.sentiment) }}>
                        {edit ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <input value={j.label || ""} onChange={(e) => setJourney(upd(journey, idx, { label: e.target.value }))} placeholder="Dia 1"
                                className="rv-type w-24 border border-[var(--rv-bg)] bg-transparent px-1.5 py-0.5 text-[10px] uppercase outline-none" />
                              <select value={j.sentiment} onChange={(e) => setJourney(upd(journey, idx, { sentiment: e.target.value }))}
                                className="rv-type border border-[var(--rv-bg)] bg-[var(--rv-white)] px-1 py-0.5 text-[10px] uppercase text-[var(--rv-bg)]">
                                {SENTIMENTS.map((s) => <option key={s} value={s}>{SENTIMENT_LABEL[s]}</option>)}
                              </select>
                              <button onClick={() => setJourney(journey.filter((_, i) => i !== idx))} aria-label="Remover dia" className="ml-auto text-[var(--rv-pink-deep)]"><X className="h-4 w-4" /></button>
                            </div>
                            <input value={j.title} onChange={(e) => setJourney(upd(journey, idx, { title: e.target.value }))} placeholder="Título*"
                              className="rv-display w-full bg-transparent text-2xl text-[var(--rv-bg)] outline-none placeholder:text-[rgba(5,5,5,0.35)]" />
                            <textarea value={j.description || ""} onChange={(e) => setJourney(upd(journey, idx, { description: e.target.value }))} placeholder="Descrição" rows={2}
                              className="w-full bg-transparent text-sm text-[rgba(5,5,5,0.75)] outline-none placeholder:text-[rgba(5,5,5,0.35)]" />
                          </div>
                        ) : (<>
                          <div className="flex flex-wrap items-center gap-2">
                            {j.label && <span className="rv-type border border-[var(--rv-bg)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]">{j.label}</span>}
                            <span className="rv-type text-[10px] uppercase tracking-[0.12em] text-[rgba(5,5,5,0.55)]">{SENTIMENT_LABEL[j.sentiment] || j.sentiment}</span>
                          </div>
                          <h4 className="rv-display mt-1.5 text-2xl">{j.title}</h4>
                          {j.description && <p className="mt-1 text-sm text-[rgba(5,5,5,0.72)]">{j.description}</p>}
                        </>)}
                      </div>
                    </li>
                  ))}
                </ol>
                {edit && <AddBtn onClick={() => setJourney([...journey, { id: tid(), label: `Dia ${journey.length + 1}`, title: "", description: "", happened_on: null, sentiment: "neutral", sort_order: journey.length }])} label="adicionar dia" />}
              </Block>
            )}

            {/* Teorias */}
            {visible("show_theories") && (edit || theories.length > 0) && (
              <Block title="Teorias da audiência" icon={<Lightbulb className="h-5 w-5" />} edit={edit} on={d.show_theories} onToggle={() => toggle("show_theories")}>
                <div className="space-y-3">
                  {theories.map((t, idx) => (
                    <div key={t.id} className="border border-[var(--rv-line-strong)] bg-[var(--rv-surface-2)] px-4 py-3">
                      {edit ? (<div className="space-y-1.5">
                        <textarea value={t.content} onChange={(e) => setTheories(upd(theories, idx, { content: e.target.value }))} placeholder="Teoria*" rows={2} className="rv-field w-full text-sm" />
                        <div className="flex items-center gap-2">
                          <input value={t.author_label} onChange={(e) => setTheories(upd(theories, idx, { author_label: e.target.value }))} placeholder="@autor" className="rv-field rv-type border-b border-[var(--rv-line)] text-xs" />
                          <input type="number" value={t.votes} onChange={(e) => setTheories(upd(theories, idx, { votes: Number(e.target.value) }))} className="rv-field rv-type w-20 border-b border-[var(--rv-line)] text-xs" />
                          <span className="rv-type text-[10px] uppercase text-[var(--rv-muted)]">votos</span>
                          <button onClick={() => setTheories(theories.filter((_, i) => i !== idx))} aria-label="Remover teoria" className="ml-auto text-[var(--rv-pink)]"><X className="h-4 w-4" /></button>
                        </div>
                      </div>) : (<>
                        <p className="text-sm text-[var(--rv-white)]">{t.content}</p>
                        <div className="rv-type mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-[var(--rv-muted)]">
                          <span>— {t.author_label}</span><span className="text-[var(--rv-pink-ink)]">{t.votes} votos</span>
                        </div>
                      </>)}
                    </div>
                  ))}
                </div>
                {edit && <AddBtn onClick={() => setTheories([...theories, { id: tid(), content: "", author_label: "@audiência", votes: 0, sort_order: theories.length }])} label="adicionar teoria" />}
              </Block>
            )}
          </div>

          {/* direita */}
          <div className="space-y-5">
            {/* Cofre */}
            {visible("show_cofre") && (
              <div className={`relative overflow-hidden border-2 border-[var(--rv-pink)] bg-[var(--rv-surface)] px-5 py-5 rv-glow-box ${edit && !d.show_cofre ? "opacity-50" : ""}`}>
                <span aria-hidden className="rv-glitch-stripes absolute -right-6 bottom-0 h-16 w-32 opacity-25" />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="rv-display flex items-center gap-2 text-lg tracking-[0.04em]"><Vault className="h-5 w-5 text-[var(--rv-pink)]" /> Cofre da casa</span>
                  {edit && <SectionToggle on={d.show_cofre} onToggle={() => toggle("show_cofre")} />}
                </div>
                {edit ? (
                  <div className="relative mt-3 flex items-baseline gap-1 text-[var(--rv-yellow)]">
                    <span className="rv-display text-3xl">R$</span>
                    <input type="number" value={Math.round(d.vault_amount_cents / 100)} onChange={(e) => set("vault_amount_cents", Math.max(0, Number(e.target.value)) * 100)}
                      className="rv-display w-36 bg-transparent text-6xl text-[var(--rv-yellow)] outline-none" />
                  </div>
                ) : (<div className="rv-display relative mt-3 text-6xl text-[var(--rv-yellow)] [text-shadow:0_0_18px_rgba(255,196,0,0.35)]">{brl(d.vault_amount_cents)}</div>)}
              </div>
            )}

            {/* Termômetro */}
            {visible("show_suspicion") && (
              <Block title="Termômetro de suspeita" icon={<Thermometer className="h-5 w-5" />} edit={edit} on={d.show_suspicion} onToggle={() => toggle("show_suspicion")}>
                <div className="flex items-end justify-between gap-3">
                  {edit ? (
                    <div className="flex items-baseline">
                      <input type="number" min={0} max={100} value={d.suspicion_pct} onChange={(e) => set("suspicion_pct", Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="rv-display w-28 bg-transparent text-7xl text-[var(--rv-white)] outline-none" />
                      <span className="rv-display text-3xl">%</span>
                    </div>
                  ) : (<span className="rv-display text-7xl">{d.suspicion_pct}<span className="ml-1 text-3xl">%</span></span>)}
                  <span className="rv-script max-w-[9ch] -rotate-6 text-right text-xl text-[var(--rv-pink-ink)]">A audiência sempre desconfia.</span>
                </div>
                <div className="mt-4 h-3 w-full border border-[var(--rv-white)] bg-[var(--rv-bg)] p-px">
                  <div className="h-full" style={{ width: `${d.suspicion_pct}%`, background: "linear-gradient(90deg, var(--rv-cyan), var(--rv-pink))" }} />
                </div>
              </Block>
            )}

            {/* Capturas */}
            {visible("show_captures") && (
              <Block title="Capturas" icon={<Camera className="h-5 w-5" />} edit={edit} on={d.show_captures} onToggle={() => toggle("show_captures")}>
                <div className="flex items-baseline gap-3">
                  {edit ? (
                    <input type="number" value={d.captures_count} onChange={(e) => set("captures_count", Math.max(0, Number(e.target.value)))}
                      className="rv-display w-28 bg-transparent text-7xl text-[var(--rv-white)] outline-none" />
                  ) : (<span className="rv-display text-7xl">{d.captures_count}</span>)}
                  <span className="rv-type text-[11px] uppercase tracking-[0.12em] text-[var(--rv-muted)]">flagras registrados</span>
                </div>
              </Block>
            )}

            {/* Caixinha de segredos */}
            {visible("show_secrets") && (edit || secrets.length > 0) && (
              <Block title="Caixinha de segredos" icon={<Lock className="h-5 w-5" />} edit={edit} on={d.show_secrets} onToggle={() => toggle("show_secrets")}>
                <div className="space-y-3">
                  {secrets.map((s, idx) => (
                    <div key={s.id} className="rv-note px-4 py-3">
                      {edit ? (<div className="space-y-1">
                        <textarea value={s.content} onChange={(e) => setSecrets(upd(secrets, idx, { content: e.target.value }))} placeholder="Escreva o bilhete…" rows={2}
                          className="rv-script w-full bg-transparent text-xl leading-tight text-[var(--rv-bg)] outline-none placeholder:text-[rgba(5,5,5,0.35)]" />
                        <div className="flex items-center gap-2">
                          <input value={s.author_label} onChange={(e) => setSecrets(upd(secrets, idx, { author_label: e.target.value }))} placeholder="anônimo"
                            className="rv-type border-b border-[rgba(5,5,5,0.25)] bg-transparent text-[10px] uppercase outline-none" />
                          <button onClick={() => setSecrets(secrets.filter((_, i) => i !== idx))} aria-label="Remover bilhete" className="ml-auto text-[var(--rv-pink-deep)]"><X className="h-5 w-5" /></button>
                        </div>
                      </div>) : (<>
                        <p className="rv-script text-xl leading-tight">{s.content}</p>
                        <span className="rv-type mt-1 block text-[10px] uppercase tracking-[0.14em] text-[rgba(5,5,5,0.6)]">{s.author_label}</span>
                      </>)}
                    </div>
                  ))}
                </div>
                {edit && <AddBtn onClick={() => setSecrets([...secrets, { id: tid(), content: "", author_label: "anônimo", revealed: true, sort_order: secrets.length }])} label="adicionar bilhete" />}
              </Block>
            )}
          </div>
        </div>

        {/* Conveniência Views */}
        {visible("show_store") && (
          <div className={`mt-12 ${edit && !d.show_store ? "opacity-50" : ""}`}>
            <ConvenienceStore
              products={initial.products}
              slug={slug}
              participantName={d.display_name}
              participantAvatar={d.avatar_url}
              edit={edit}
              adminSlot={edit ? <SectionToggle on={d.show_store} onToggle={() => toggle("show_store")} /> : null}
              notice={(compra === "success" || compra === "cancel") ? <>
                {compra === "success" && <div className="mb-4 border-2 border-[var(--rv-up)] bg-[rgba(61,220,132,0.08)] px-4 py-3 text-sm font-bold text-[var(--rv-up)]">✓ Compra confirmada! Obrigado por apoiar {d.display_name}.</div>}
                {compra === "cancel" && <div className="mb-4 border border-[var(--rv-line-strong)] px-4 py-3 text-sm font-bold text-[var(--rv-muted)]">Compra cancelada.</div>}
              </> : null}
            />
          </div>
        )}
      </div>

      {/* barra fixa de edição */}
      {edit && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[var(--rv-pink)] bg-[rgba(5,5,5,0.94)] px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <button onClick={del} className="rv-btn rv-btn-ghost !px-3 !py-2 !text-[11px] !shadow-none hover:!bg-[var(--rv-pink)] hover:!text-[var(--rv-white)]"><Trash2 className="h-4 w-4" /> excluir</button>
            {msg && <span className="rv-type text-xs text-[var(--rv-muted)]">{msg}</span>}
            <button onClick={save} disabled={saving} className="rv-btn ml-auto !py-2.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} salvar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function upd<T>(arr: T[], idx: number, patch: Partial<T>): T[] {
  return arr.map((x, i) => (i === idx ? { ...x, ...patch } : x))
}

/** Colunas técnicas nas laterais (só em tela larga — no resto não há espaço). */
function SideRails({ year }: { year: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden 2xl:block">
      <div className="absolute left-8 top-40 w-36">
        <p className="rv-type text-[12px] uppercase leading-[1.5] tracking-[0.16em]">Reality social<br />em tempo real.</p>
        <p className="rv-type mt-4 text-[12px] uppercase leading-[1.5] tracking-[0.16em] text-[var(--rv-muted)]">A audiência<br />também joga.</p>
        <span className="rv-barcode mt-4 block h-10 w-24" />
        <p className="rv-type mt-2 text-[12px] tracking-[0.14em]">{year}</p>
        <p className="rv-script mt-16 -rotate-6 text-4xl leading-[0.95] text-[var(--rv-pink-ink)]">Quem manda é a audiência.</p>
        <Crown className="mt-3 h-10 w-10 -rotate-6 text-[var(--rv-pink)]" strokeWidth={1.6} />
        <p className="rv-type mt-24 text-[10px] uppercase leading-[1.9] tracking-[0.2em] text-[var(--rv-muted)]">Pessoas<br />Histórias<br />Conflitos<br />Estratégias<br />Views<br />Real</p>
        <p className="rv-display mt-24 text-4xl leading-[0.9]">Tudo pode<br />virar<br />conteúdo.</p>
      </div>
      <div className="absolute right-8 top-56 w-36 text-right">
        <p className="rv-script rotate-6 text-5xl leading-[0.9] text-[var(--rv-pink-ink)]">Be real.<br />Be views.</p>
        <p className="rv-script mt-40 -rotate-6 text-3xl leading-[1] text-[var(--rv-pink-ink)]">Vibes, likes, comentários, shares. Poder real.</p>
        <p className="rv-script mt-40 rotate-3 text-3xl leading-[1] text-[var(--rv-pink-ink)]">Mais que um jogo. Um fenômeno.</p>
        <span className="rv-barcode ml-auto mt-10 block h-8 w-20" />
        <p className="rv-type mt-1 text-[9px] uppercase tracking-[0.2em] text-[var(--rv-muted)]">ACV {year}</p>
      </div>
    </div>
  )
}

function ImageDrop({ onFile, label, small }: { onFile: (f: File) => void; label: string; small?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      className={`absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-1 bg-[rgba(5,5,5,0.6)] text-[var(--rv-white)] opacity-0 transition-opacity hover:opacity-100 ${small ? "text-[10px]" : "text-xs"}`}
    >
      <ImagePlus className={small ? "h-5 w-5" : "h-7 w-7"} />
      <span className="rv-type uppercase tracking-[0.14em]">arraste {label}</span>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = "" }} />
    </div>
  )
}

function SectionToggle({ on, onToggle }: { on: boolean; onToggle?: () => void }) {
  return (
    <button onClick={onToggle} title={on ? "Visível — clique p/ esconder" : "Escondido — clique p/ mostrar"}
      className={`rv-type inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${on ? "border-[var(--rv-up)] text-[var(--rv-up)]" : "border-[var(--rv-faint)] text-[var(--rv-faint)] line-through"}`}>
      {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{on ? "visível" : "oculto"}
    </button>
  )
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="rv-type mt-4 flex w-full items-center justify-center gap-2 border border-dashed border-[var(--rv-line-strong)] px-3 py-2.5 text-[11px] uppercase tracking-[0.16em] text-[var(--rv-muted)] hover:border-[var(--rv-pink)] hover:text-[var(--rv-white)]">
      <Plus className="h-4 w-4" /> {label}
    </button>
  )
}

function Kpi({ icon, label, value, pct }: { icon: React.ReactNode; label: string; value: string; pct: number | null }) {
  return (
    <div className="relative border-2 border-[var(--rv-white)] bg-[var(--rv-surface)] px-3 py-3">
      <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 bg-[var(--rv-pink)] [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
      <div className="rv-type flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--rv-muted)]"><span className="text-[var(--rv-pink)]">{icon}</span>{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="rv-display text-4xl">{value}</span>
        {pct !== null && pct !== 0 && <span className={`rv-type text-[10px] font-bold ${pct > 0 ? "text-[var(--rv-up)]" : "text-[var(--rv-down)]"}`}>{pct > 0 ? "↑" : "↓"}{Math.abs(pct)}%</span>}
      </div>
    </div>
  )
}

function Block({ title, icon, children, edit, on, onToggle }: { title: string; icon: React.ReactNode; children: React.ReactNode; edit?: boolean; on?: boolean; onToggle?: () => void }) {
  return (
    <section className={`relative border-[1.5px] border-[var(--rv-line-strong)] bg-[rgba(10,10,10,0.88)] ${edit && on === false ? "opacity-50" : ""}`}>
      <div className="rv-block-head flex items-center gap-3 px-5 py-3">
        <span className="text-[var(--rv-pink)]">{icon}</span>
        <h3 className="rv-display flex-1 text-xl tracking-[0.03em]">{title}</h3>
        {edit && onToggle && <SectionToggle on={!!on} onToggle={onToggle} />}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Delta({ label, delta, pct }: { label: string; delta: number; pct: number }) {
  const up = delta >= 0
  const tone = up ? "text-[var(--rv-up)]" : "text-[var(--rv-down)]"
  return (
    <div className="border border-[var(--rv-line-strong)] bg-[var(--rv-surface-2)] px-3 py-2">
      <div className="rv-type text-[10px] uppercase tracking-[0.12em] text-[var(--rv-muted)]">{label}</div>
      <div className={`rv-display text-2xl ${tone}`}>{up ? "+" : ""}{delta.toLocaleString("pt-BR")}</div>
      <div className={`rv-type text-[10px] ${tone}`}>{up ? "↑" : "↓"}{Math.abs(pct)}% / 24h</div>
    </div>
  )
}
