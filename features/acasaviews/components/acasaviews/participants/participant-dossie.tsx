"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Eye, EyeOff, Heart, MessageCircle, Trophy, Hash, Vault, Flame,
  Camera, ScrollText, Lock, Lightbulb, ShoppingBag, Loader2, Save, Trash2,
  Plus, X, ImagePlus, Palette,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import type { ParticipantFull, JourneyItem, SecretItem, TheoryItem } from "@/lib/acasaviews/participants-live"
import { ConvenienceStore } from "./convenience-store"

type ShowKey = "show_perfil" | "show_journey" | "show_secrets" | "show_theories" | "show_desempenho" | "show_cofre" | "show_suspicion" | "show_captures" | "show_store"
const ACCENTS: { key: string; label: string; varName: string }[] = [
  { key: "magenta", label: "Magenta", varName: "var(--magenta)" },
  { key: "cyan", label: "Ciano", varName: "var(--cyan)" },
  { key: "gold", label: "Dourado", varName: "var(--gold)" },
  { key: "purple", label: "Roxo", varName: "var(--purple)" },
  { key: "leaf", label: "Verde folha", varName: "var(--leaf)" },
]
const STATUSES = [
  { key: "active", label: "Na casa" }, { key: "finalist", label: "Finalista" },
  { key: "eliminated", label: "Eliminado" }, { key: "winner", label: "Campeão" },
]
const SENTIMENTS = ["positive", "neutral", "negative"]
function accentVar(a: string) {
  return a === "cyan" ? "var(--cyan)" : a === "gold" ? "var(--gold)" : a === "purple" ? "var(--purple)" : a === "leaf" ? "var(--leaf)" : "var(--magenta)"
}
function brl(c: number) { return (Number(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }
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

  return (
    <div className={`casa-rank casa-paper relative min-h-screen overflow-hidden ${edit ? "pb-28" : "pb-20"}`}>
      <div className="casa-dots pointer-events-none absolute right-0 top-40 h-40 w-40 opacity-[0.06]" />

      <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 pt-6 md:px-10">
        <Link href="/acasaviews/rankings" className="inline-flex items-center gap-2 casa-body text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--ink-soft)]/70 hover:text-[var(--ink)]">
          <ArrowLeft className="h-4 w-4" /> rankings
        </Link>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {edit && (
              <div className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-white px-2.5 py-1.5 shadow-[3px_3px_0_0_var(--ink)]">
                <Palette className="h-4 w-4 text-[var(--ink)]" />
                <span className="casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)]">Cores</span>
                <span className="h-5 w-5 rounded-full border-2 border-[var(--ink)]" style={{ background: accent }} />
                <select value={d.accent_color} onChange={(e) => set("accent_color", e.target.value)}
                  className="border-l-2 border-[var(--ink)]/20 bg-transparent pl-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.1em] text-[var(--ink)] outline-none">
                  {ACCENTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => setEdit((e) => !e)} className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-white px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)]">
              {edit ? <><Eye className="h-4 w-4" /> ver como público</> : <><ScrollText className="h-4 w-4" /> editar</>}
            </button>
          </div>
        )}
      </div>

      {/* ── HERO ── */}
      <header className="relative mx-auto mt-4 max-w-5xl px-5 md:px-10">
        <div className="relative overflow-hidden border-2 border-[var(--ink)] shadow-[8px_8px_0_0_var(--ink)]">
          <div className="relative h-44 md:h-56" style={{ background: accent }}>
            {d.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-luminosity" />
            )}
            <div className="casa-dots absolute inset-0 opacity-10" />
            {edit && <ImageDrop label="banner" onFile={(f) => uploadImage(f, "cover")} />}
            {/* status */}
            {edit ? (
              <select value={d.status} onChange={(e) => set("status", e.target.value)} className="absolute left-4 top-4 z-40 border-2 border-[var(--ink)] bg-white px-2 py-1 casa-body text-[10px] font-extrabold uppercase text-[var(--ink)]">
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            ) : (
              <span className="absolute left-4 top-4 -rotate-2 border-2 border-[var(--ink)] bg-white px-3 py-1 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--ink)]">
                {STATUSES.find((s) => s.key === d.status)?.label || d.status}
              </span>
            )}
            {!edit && live.matched && live.posicao && (
              <span className="absolute right-4 top-4 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[var(--ink)] bg-white px-2 text-[var(--ink)]">
                <span className="casa-body text-[8px] font-bold uppercase">posição</span>
                <span className="casa-display text-2xl leading-none">#{live.posicao}</span>
              </span>
            )}
          </div>
        </div>

        {/* identidade */}
        <div className="relative z-20 -mt-12 flex items-end gap-4 px-2 md:-mt-16 md:px-3">
          <div className="relative h-28 w-28 shrink-0 border-2 border-[var(--ink)] shadow-[5px_5px_0_0_var(--ink)] md:h-36 md:w-36" style={{ background: "var(--paper-2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.avatar_url || "/placeholder-user.jpg"} alt={d.display_name} className="h-full w-full object-cover" />
            {edit && <ImageDrop label="avatar" small onFile={(f) => uploadImage(f, "avatar")} />}
          </div>
          <div className="flex-1 pb-1 md:pb-2">
            {edit ? (
              <input value={d.display_name} onChange={(e) => set("display_name", e.target.value)} placeholder="Nome"
                className="w-full border-b-2 border-dashed border-[var(--ink)]/40 bg-transparent casa-display text-4xl leading-[0.85] text-[var(--ink)] outline-none md:text-6xl" />
            ) : (
              <h1 className="casa-display text-4xl leading-[0.85] text-[var(--ink)] sm:text-5xl md:text-6xl">{d.display_name}</h1>
            )}
            {edit ? (
              <input value={d.tagline || ""} onChange={(e) => set("tagline", e.target.value)} placeholder="Chamada curta (tagline)"
                className="mt-2 w-full max-w-xl border-b border-dashed border-[var(--ink)]/30 bg-transparent casa-body text-sm font-semibold text-[var(--ink-soft)]/75 outline-none" />
            ) : (d.tagline && <p className="mt-2 max-w-xl casa-body text-sm font-semibold text-[var(--ink-soft)]/75">{d.tagline}</p>)}
          </div>
        </div>
      </header>

      {/* vínculo ranking (só admin) */}
      {edit && (
        <div className="mx-auto mt-4 max-w-5xl px-5 md:px-10">
          <label className="flex flex-wrap items-center gap-2 border-2 border-dashed border-[var(--ink)]/30 bg-white/60 px-3 py-2 casa-body text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/70">
            ID/login no ranking:
            <input value={d.external_ranking_user_id || ""} onChange={(e) => set("external_ranking_user_id", e.target.value)} placeholder="user_login do casa-views-ranking"
              className="flex-1 border-b border-[var(--ink)]/30 bg-transparent px-1 text-xs normal-case outline-none" />
            <span className="flex items-center gap-1"><input type="checkbox" checked={d.is_active} onChange={(e) => set("is_active", e.target.checked)} /> ativo</span>
          </label>
        </div>
      )}

      {/* ── KPIs (live, read-only) ── */}
      <section className="relative z-10 mx-auto mt-6 max-w-5xl px-5 md:px-10">
        {!live.matched && (
          <p className="mb-3 inline-block -rotate-1 border border-[var(--ink)]/30 bg-white/60 px-3 py-1 casa-body text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/60">números ao vivo aparecem quando o participante é vinculado ao ranking</p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi icon={<Trophy className="h-4 w-4" />} label="pontos" value={compact(live.pontuacao)} pct={live.matched ? live.pontuacao_pct_24h : null} accent={accent} />
          <Kpi icon={<Hash className="h-4 w-4" />} label="posição" value={live.posicao ? `#${live.posicao}` : "—"} pct={null} accent={accent} />
          <Kpi icon={<Eye className="h-4 w-4" />} label="views" value={compact(live.views)} pct={live.matched ? live.views_pct_24h : null} accent={accent} />
          <Kpi icon={<Heart className="h-4 w-4" />} label="likes" value={compact(live.likes)} pct={live.matched ? live.likes_pct_24h : null} accent={accent} />
          <Kpi icon={<MessageCircle className="h-4 w-4" />} label="comentários" value={compact(live.comments)} pct={live.matched ? live.comments_pct_24h : null} accent={accent} />
        </div>
      </section>

      {/* ── grid ── */}
      <div className="relative z-10 mx-auto mt-8 grid max-w-5xl gap-6 px-5 md:grid-cols-3 md:px-10">
        {/* esquerda */}
        <div className="space-y-6 md:col-span-2">
          {/* citação */}
          {(edit || d.quote) && (
            <div className="relative">
              {edit && <SectionToggle on={true} hidden label="citação" />}
              {edit ? (
                <textarea value={d.quote || ""} onChange={(e) => set("quote", e.target.value)} placeholder="Citação de destaque" rows={2}
                  className="w-full border-l-4 bg-white px-5 py-4 casa-marker text-2xl text-[var(--ink)] shadow-[4px_4px_0_0_var(--ink)] outline-none" style={{ borderColor: accent }} />
              ) : (
                <blockquote className="border-l-4 bg-white px-5 py-4 casa-marker text-2xl text-[var(--ink)] shadow-[4px_4px_0_0_var(--ink)]" style={{ borderColor: accent }}>“{d.quote}”</blockquote>
              )}
            </div>
          )}

          {/* Perfil (bio) */}
          {visible("show_perfil") && (edit || d.bio) && (
            <Block title="Perfil" icon={<ScrollText className="h-4 w-4" />} accent={accent} edit={edit} on={d.show_perfil} onToggle={() => toggle("show_perfil")}>
              {edit ? (
                <textarea value={d.bio || ""} onChange={(e) => set("bio", e.target.value)} placeholder="Perfil narrativo (bio)" rows={4}
                  className="w-full bg-transparent casa-body text-sm leading-relaxed text-[var(--ink-soft)]/85 outline-none" />
              ) : (<p className="whitespace-pre-line casa-body text-sm leading-relaxed text-[var(--ink-soft)]/85">{d.bio}</p>)}
            </Block>
          )}

          {/* Desempenho (live) */}
          {visible("show_desempenho") && (live.matched || edit) && (
            <Block title="Desempenho · últimas 24h" icon={<Flame className="h-4 w-4" />} accent={accent} edit={edit} on={d.show_desempenho} onToggle={() => toggle("show_desempenho")}>
              {live.matched ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Delta label="pontos" delta={live.pontuacao_delta_24h} pct={live.pontuacao_pct_24h} />
                  <Delta label="views" delta={live.views_delta_24h} pct={live.views_pct_24h} />
                  <Delta label="likes" delta={live.likes_delta_24h} pct={live.likes_pct_24h} />
                  <Delta label="comentários" delta={live.comments_delta_24h} pct={live.comments_pct_24h} />
                </div>
              ) : <p className="casa-body text-sm text-[var(--ink-soft)]/55">Sem dados ao vivo — vincule ao ranking.</p>}
            </Block>
          )}

          {/* Jornada */}
          {visible("show_journey") && (edit || journey.length > 0) && (
            <Block title="Jornada na casa" icon={<ScrollText className="h-4 w-4" />} accent={accent} edit={edit} on={d.show_journey} onToggle={() => toggle("show_journey")}>
              <ol className="relative space-y-3 border-l-2 border-[var(--ink)]/15 pl-5">
                {journey.map((j, idx) => (
                  <li key={j.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[var(--ink)]" style={{ background: j.sentiment === "positive" ? "var(--cyan)" : j.sentiment === "negative" ? "var(--magenta)" : "var(--paper-2)" }} />
                    {edit ? (
                      <div className="space-y-1 rounded border border-[var(--ink)]/15 bg-[var(--paper)] p-2">
                        <div className="flex gap-2">
                          <input value={j.label || ""} onChange={(e) => setJourney(upd(journey, idx, { label: e.target.value }))} placeholder="Dia 1" className="w-24 border-b border-[var(--ink)]/20 bg-transparent casa-body text-[10px] font-bold uppercase outline-none" />
                          <select value={j.sentiment} onChange={(e) => setJourney(upd(journey, idx, { sentiment: e.target.value }))} className="border border-[var(--ink)]/20 bg-white text-[10px]">
                            {SENTIMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => setJourney(journey.filter((_, i) => i !== idx))} className="ml-auto text-[var(--magenta)]"><X className="h-4 w-4" /></button>
                        </div>
                        <input value={j.title} onChange={(e) => setJourney(upd(journey, idx, { title: e.target.value }))} placeholder="Título*" className="w-full bg-transparent casa-display text-lg leading-tight text-[var(--ink)] outline-none" />
                        <textarea value={j.description || ""} onChange={(e) => setJourney(upd(journey, idx, { description: e.target.value }))} placeholder="Descrição" rows={2} className="w-full bg-transparent casa-body text-sm text-[var(--ink-soft)]/75 outline-none" />
                      </div>
                    ) : (<>
                      {j.label && <span className="casa-body text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]/55">{j.label}</span>}
                      <h4 className="casa-display text-xl leading-tight text-[var(--ink)]">{j.title}</h4>
                      {j.description && <p className="mt-0.5 casa-body text-sm text-[var(--ink-soft)]/75">{j.description}</p>}
                    </>)}
                  </li>
                ))}
              </ol>
              {edit && <AddBtn onClick={() => setJourney([...journey, { id: tid(), label: `Dia ${journey.length + 1}`, title: "", description: "", happened_on: null, sentiment: "neutral", sort_order: journey.length }])} label="adicionar dia" />}
            </Block>
          )}

          {/* Teorias */}
          {visible("show_theories") && (edit || theories.length > 0) && (
            <Block title="Teorias da audiência" icon={<Lightbulb className="h-4 w-4" />} accent={accent} edit={edit} on={d.show_theories} onToggle={() => toggle("show_theories")}>
              <div className="space-y-3">
                {theories.map((t, idx) => (
                  <div key={t.id} className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
                    {edit ? (<div className="space-y-1">
                      <textarea value={t.content} onChange={(e) => setTheories(upd(theories, idx, { content: e.target.value }))} placeholder="Teoria*" rows={2} className="w-full bg-transparent casa-body text-sm text-[var(--ink-soft)]/85 outline-none" />
                      <div className="flex items-center gap-2">
                        <input value={t.author_label} onChange={(e) => setTheories(upd(theories, idx, { author_label: e.target.value }))} placeholder="@autor" className="border-b border-[var(--ink)]/20 bg-transparent casa-body text-xs outline-none" />
                        <input type="number" value={t.votes} onChange={(e) => setTheories(upd(theories, idx, { votes: Number(e.target.value) }))} className="w-20 border-b border-[var(--ink)]/20 bg-transparent casa-body text-xs outline-none" /> <span className="casa-body text-[10px]">votos</span>
                        <button onClick={() => setTheories(theories.filter((_, i) => i !== idx))} className="ml-auto text-[var(--magenta)]"><X className="h-4 w-4" /></button>
                      </div>
                    </div>) : (<>
                      <p className="casa-body text-sm text-[var(--ink-soft)]/85">{t.content}</p>
                      <div className="mt-1 flex items-center justify-between casa-body text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/50"><span>— {t.author_label}</span><span style={{ color: accent }}>{t.votes} votos</span></div>
                    </>)}
                  </div>
                ))}
              </div>
              {edit && <AddBtn onClick={() => setTheories([...theories, { id: tid(), content: "", author_label: "@audiência", votes: 0, sort_order: theories.length }])} label="adicionar teoria" />}
            </Block>
          )}
        </div>

        {/* direita */}
        <div className="space-y-6">
          {/* Cofre */}
          {visible("show_cofre") && (
            <div className="relative border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-5 text-white shadow-[6px_6px_0_0_var(--magenta)]">
              {edit && <SectionToggle on={d.show_cofre} onToggle={() => toggle("show_cofre")} dark />}
              <div className="flex items-center gap-2 casa-body text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/60"><Vault className="h-4 w-4" /> cofre da casa</div>
              {edit ? (
                <div className="mt-1 flex items-baseline gap-1"><span className="casa-display text-2xl" style={{ color: "var(--gold)" }}>R$</span>
                  <input type="number" value={Math.round(d.vault_amount_cents / 100)} onChange={(e) => set("vault_amount_cents", Math.max(0, Number(e.target.value)) * 100)} className="w-32 bg-transparent casa-display text-4xl outline-none" style={{ color: "var(--gold)" }} />
                </div>
              ) : (<div className="mt-1 casa-display text-4xl" style={{ color: "var(--gold)" }}>{brl(d.vault_amount_cents)}</div>)}
            </div>
          )}

          {/* Termômetro */}
          {visible("show_suspicion") && (
            <Block title="Termômetro de suspeita" icon={<Flame className="h-4 w-4" />} accent={accent} edit={edit} on={d.show_suspicion} onToggle={() => toggle("show_suspicion")}>
              <div className="flex items-end justify-between">
                {edit ? (
                  <div className="flex items-baseline"><input type="number" min={0} max={100} value={d.suspicion_pct} onChange={(e) => set("suspicion_pct", Math.min(100, Math.max(0, Number(e.target.value))))} className="w-20 bg-transparent casa-display text-5xl text-[var(--ink)] outline-none" /><span className="casa-display text-3xl text-[var(--ink)]">%</span></div>
                ) : (<span className="casa-display text-5xl text-[var(--ink)]">{d.suspicion_pct}%</span>)}
                <span className="casa-body text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-soft)]/50">audiência</span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden border-2 border-[var(--ink)] bg-white"><div className="h-full" style={{ width: `${d.suspicion_pct}%`, background: "linear-gradient(90deg, var(--cyan), var(--magenta))" }} /></div>
            </Block>
          )}

          {/* Capturas */}
          {visible("show_captures") && (
            <Block title="Capturas" icon={<Camera className="h-4 w-4" />} accent={accent} edit={edit} on={d.show_captures} onToggle={() => toggle("show_captures")}>
              <div className="flex items-baseline gap-2">
                {edit ? (<input type="number" value={d.captures_count} onChange={(e) => set("captures_count", Math.max(0, Number(e.target.value)))} className="w-24 bg-transparent casa-display text-5xl text-[var(--ink)] outline-none" />) : (<span className="casa-display text-5xl text-[var(--ink)]">{d.captures_count}</span>)}
                <span className="casa-body text-sm font-semibold text-[var(--ink-soft)]/60">flagras registrados</span>
              </div>
            </Block>
          )}

          {/* Caixinha de segredos */}
          {visible("show_secrets") && (edit || secrets.length > 0) && (
            <Block title="Caixinha de segredos" icon={<Lock className="h-4 w-4" />} accent={accent} edit={edit} on={d.show_secrets} onToggle={() => toggle("show_secrets")}>
              <div className="space-y-2">
                {secrets.map((s, idx) => (
                  <div key={s.id} className="-rotate-[0.4deg] border border-[var(--ink)]/20 bg-white px-3 py-2 shadow-[2px_2px_0_0_var(--ink)]">
                    {edit ? (<div className="space-y-1">
                      <textarea value={s.content} onChange={(e) => setSecrets(upd(secrets, idx, { content: e.target.value }))} placeholder="Escreva o bilhete…" rows={2} className="w-full bg-transparent casa-marker text-lg leading-tight text-[var(--ink)] outline-none" />
                      <div className="flex items-center gap-2">
                        <input value={s.author_label} onChange={(e) => setSecrets(upd(secrets, idx, { author_label: e.target.value }))} placeholder="anônimo" className="border-b border-[var(--ink)]/20 bg-transparent casa-body text-[10px] uppercase outline-none" />
                        <button onClick={() => setSecrets(secrets.filter((_, i) => i !== idx))} className="ml-auto text-[var(--magenta)]"><X className="h-4 w-4" /></button>
                      </div>
                    </div>) : (<>
                      <p className="casa-marker text-lg leading-tight text-[var(--ink)]">{s.content}</p>
                      <span className="casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/45">— {s.author_label}</span>
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
        <section className="relative z-10 mx-auto mt-10 max-w-5xl px-5 md:px-10">
          <div className="mb-5 flex flex-wrap items-center gap-3 border-b-2 border-[var(--ink)] pb-3">
            <ShoppingBag className="h-6 w-6" style={{ color: accent }} />
            <h2 className="casa-display text-3xl leading-none text-[var(--ink)] md:text-4xl">CONVENIÊNCIA VIEWS</h2>
            {edit && <SectionToggle on={d.show_store} onToggle={() => toggle("show_store")} inline />}
          </div>
          {compra === "success" && <div className="mb-4 border-2 border-emerald-600 bg-emerald-50 px-4 py-3 casa-body text-sm font-bold text-emerald-700">✓ Compra confirmada! Obrigado por apoiar {d.display_name}.</div>}
          {compra === "cancel" && <div className="mb-4 border-2 border-[var(--ink)]/40 bg-white px-4 py-3 casa-body text-sm font-bold text-[var(--ink-soft)]/70">Compra cancelada.</div>}
          <ConvenienceStore products={initial.products} accent={accent} slug={slug} />
        </section>
      )}

      {/* barra fixa de edição */}
      {edit && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[var(--ink)] bg-white/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <button onClick={del} className="inline-flex items-center gap-2 border-2 border-[var(--magenta)] px-3 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--magenta-deep)]"><Trash2 className="h-4 w-4" /> excluir</button>
            {msg && <span className="casa-body text-xs font-bold text-[var(--ink-soft)]/70">{msg}</span>}
            <button onClick={save} disabled={saving} className="ml-auto inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-2 casa-body text-sm font-extrabold uppercase tracking-[0.14em] text-white disabled:opacity-60">
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

function ImageDrop({ onFile, label, small }: { onFile: (f: File) => void; label: string; small?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      className={`absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100 ${small ? "text-[10px]" : "text-xs"}`}
    >
      <ImagePlus className={small ? "h-5 w-5" : "h-7 w-7"} />
      <span className="casa-body font-bold uppercase tracking-wide">arraste {label}</span>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = "" }} />
    </div>
  )
}

function SectionToggle({ on, onToggle, dark, inline, hidden, label }: { on: boolean; onToggle?: () => void; dark?: boolean; inline?: boolean; hidden?: boolean; label?: string }) {
  if (hidden) return null
  return (
    <button onClick={onToggle} title={on ? "Visível — clique p/ esconder" : "Escondido — clique p/ mostrar"}
      className={`${inline ? "" : "absolute right-2 top-2"} z-20 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${on ? (dark ? "border-white/30 text-white/80" : "border-emerald-500 text-emerald-600") : "border-[var(--ink-soft)]/40 text-[var(--ink-soft)]/50 line-through"}`}>
      {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}{label || (on ? "visível" : "oculto")}
    </button>
  )
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="mt-3 inline-flex items-center gap-1 border-2 border-dashed border-[var(--ink)]/40 px-3 py-1.5 casa-body text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]/70 hover:border-[var(--ink)]"><Plus className="h-4 w-4" /> {label}</button>
}

function Kpi({ icon, label, value, pct, accent }: { icon: React.ReactNode; label: string; value: string; pct: number | null; accent: string }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-white px-3 py-3 shadow-[3px_3px_0_0_var(--ink)]">
      <div className="flex items-center gap-1 casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/55"><span style={{ color: accent }}>{icon}</span>{label}</div>
      <div className="mt-1 flex items-baseline gap-1"><span className="casa-display text-2xl leading-none text-[var(--ink)]">{value}</span>
        {pct !== null && pct !== 0 && <span className={`casa-body text-[10px] font-extrabold ${pct > 0 ? "text-emerald-600" : "text-rose-600"}`}>{pct > 0 ? "↑" : "↓"}{Math.abs(pct)}%</span>}
      </div>
    </div>
  )
}

function Block({ title, icon, accent, children, edit, on, onToggle }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode; edit?: boolean; on?: boolean; onToggle?: () => void }) {
  return (
    <div className={`relative border-2 border-[var(--ink)] bg-white p-5 shadow-[5px_5px_0_0_var(--ink)] ${edit && on === false ? "opacity-50" : ""}`}>
      <div className="mb-3 flex items-center gap-2 border-b border-[var(--line)] pb-2">
        <span className="flex flex-1 items-center gap-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ink)]"><span style={{ color: accent }}>{icon}</span>{title}</span>
        {edit && onToggle && <SectionToggle on={!!on} onToggle={onToggle} inline />}
      </div>
      {children}
    </div>
  )
}

function Delta({ label, delta, pct }: { label: string; delta: number; pct: number }) {
  const up = delta >= 0
  return (
    <div className="border border-[var(--line)] bg-[var(--paper)] px-3 py-2">
      <div className="casa-body text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-soft)]/50">{label}</div>
      <div className={`casa-display text-xl ${up ? "text-emerald-600" : "text-rose-600"}`}>{up ? "+" : ""}{delta.toLocaleString("pt-BR")}</div>
      <div className={`casa-body text-[10px] font-bold ${up ? "text-emerald-600" : "text-rose-600"}`}>{up ? "↑" : "↓"}{Math.abs(pct)}% / 24h</div>
    </div>
  )
}
