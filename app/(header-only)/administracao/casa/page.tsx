"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, Upload, ExternalLink,
  Eye, EyeOff, Users, Coins, ShieldAlert, Star,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// ─────────────────────────── tipos ───────────────────────────
type Participant = {
  id: string
  slug: string
  display_name: string
  tagline: string | null
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  quote: string | null
  vault_amount_cents: number
  suspicion_pct: number
  captures_count: number
  status: string
  accent_color: string
  external_ranking_user_id: string | null
  is_active: boolean
  sort_order: number
}
type Journey = { id: string; label: string | null; title: string; description: string | null; happened_on: string | null; sentiment: string; sort_order: number }
type Secret = { id: string; content: string; author_label: string; revealed: boolean; sort_order: number }
type Theory = { id: string; content: string; author_label: string; votes: number; sort_order: number }

type Detail = { participant: Participant; journey: Journey[]; secrets: Secret[]; theories: Theory[] }

const ACCENTS = ["magenta", "cyan", "gold"]
const STATUSES = ["active", "eliminated", "finalist", "winner"]
const SENTIMENTS = ["positive", "neutral", "negative"]

function brl(cents: number) {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function AdminCasaPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editing, setEditing] = useState<Participant | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    setToken(typeof window !== "undefined" ? localStorage.getItem("token") : null)
  }, [])

  const authHeaders = useCallback(
    (json = true): Record<string, string> => ({
      Authorization: `Bearer ${token}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
    }),
    [token],
  )

  const loadList = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/casa/participants", { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao carregar")
      setParticipants(data.participants || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro")
    } finally {
      setLoading(false)
    }
  }, [token, authHeaders])

  const loadDetail = useCallback(async (id: string) => {
    if (!token) return
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/casa/participants/${id}`, { headers: authHeaders() })
      const data = await res.json()
      if (res.ok) setDetail(data)
    } finally {
      setDetailLoading(false)
    }
  }, [token, authHeaders])

  useEffect(() => { if (token) loadList() }, [token, loadList])
  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null) }, [selectedId, loadDetail])

  async function removeParticipant(p: Participant) {
    if (!confirm(`Excluir "${p.display_name}" e todos os blocos/produtos?`)) return
    await fetch(`/api/admin/casa/participants/${p.id}`, { method: "DELETE", headers: authHeaders() })
    if (selectedId === p.id) setSelectedId(null)
    loadList()
  }

  if (!token) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando sessão…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/administracao")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Casa Views — Participantes</h1>
            <p className="text-sm text-muted-foreground">Editorial dos 8 participantes + lojinha Conveniência Views.</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus className="mr-1 h-4 w-4" /> Novo participante
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
      ) : participants.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          Nenhum participante. Crie o primeiro.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {participants.map((p) => (
            <Card key={p.id} className={`overflow-hidden transition ${selectedId === p.id ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.avatar_url || "/placeholder.svg"} alt="" className="h-12 w-12 rounded-full object-cover bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{p.display_name}</span>
                    {!p.is_active && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">/{p.slug}</div>
                </div>
                <Badge variant="outline" className="capitalize">{p.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pb-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" />{brl(p.vault_amount_cents)}</span>
                <span className="inline-flex items-center gap-1"><ShieldAlert className="h-3 w-3" />{p.suspicion_pct}%</span>
                <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{p.captures_count} capturas</span>
                {p.external_ranking_user_id ? (
                  <span className="inline-flex items-center gap-1 text-emerald-500"><Star className="h-3 w-3" />vinculado</span>
                ) : (
                  <span className="text-amber-500">sem ranking</span>
                )}
              </div>
              <div className="flex items-center gap-1 border-t p-2">
                <Button size="sm" variant={selectedId === p.id ? "secondary" : "ghost"} className="flex-1" onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}>
                  Blocos & loja
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                <a href={`/acasaviews/participantes/${p.slug}`} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost"><ExternalLink className="h-4 w-4" /></Button></a>
                <Button size="icon" variant="ghost" onClick={() => removeParticipant(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedId && (
        <div className="mt-8">
          {detailLoading || !detail ? (
            <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando blocos…</div>
          ) : (
            <DetailEditor detail={detail} authHeaders={authHeaders} reload={() => loadDetail(selectedId)} />
          )}
        </div>
      )}

      {showForm && (
        <ParticipantForm
          token={token}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadList(); if (selectedId) loadDetail(selectedId) }}
        />
      )}
    </div>
  )
}

// ════════════════════════ Form do participante ════════════════════════
function ParticipantForm({ token, editing, onClose, onSaved }: {
  token: string; editing: Participant | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<Record<string, string>>({
    display_name: editing?.display_name ?? "",
    slug: editing?.slug ?? "",
    tagline: editing?.tagline ?? "",
    bio: editing?.bio ?? "",
    quote: editing?.quote ?? "",
    vault_amount_cents: String(editing?.vault_amount_cents ?? 0),
    suspicion_pct: String(editing?.suspicion_pct ?? 0),
    captures_count: String(editing?.captures_count ?? 0),
    status: editing?.status ?? "active",
    accent_color: editing?.accent_color ?? "magenta",
    external_ranking_user_id: editing?.external_ranking_user_id ?? "",
    sort_order: String(editing?.sort_order ?? 0),
    is_active: String(editing?.is_active ?? true),
  })
  const [avatar, setAvatar] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    setSaving(true); setErr(null)
    try {
      // Avatar e cover precisam de uploads separados (1 arquivo por request).
      const baseUrl = editing ? `/api/admin/casa/participants/${editing.id}` : "/api/admin/casa/participants"
      const method = editing ? "PUT" : "POST"
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (avatar) { fd.append("file", avatar); fd.append("upload_kind", "avatar") }
      const res = await fetch(baseUrl, { method, headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao salvar")
      const savedId = data.participant?.id || editing?.id
      // Se houver cover, manda um segundo PUT só com o cover.
      if (cover && savedId) {
        const fd2 = new FormData()
        fd2.append("file", cover); fd2.append("upload_kind", "cover")
        await fetch(`/api/admin/casa/participants/${savedId}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: fd2 })
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Editar participante" : "Novo participante"}</DialogTitle></DialogHeader>
        {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome*"><Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} /></Field>
          <Field label="Slug (auto se vazio)"><Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="lia-mendes" /></Field>
          <Field label="Chamada (tagline)" full><Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
          <Field label="Bio (perfil narrativo)" full><Textarea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} /></Field>
          <Field label="Citação de destaque" full><Textarea rows={2} value={form.quote} onChange={(e) => set("quote", e.target.value)} /></Field>
          <Field label="Cofre (centavos)"><Input type="number" value={form.vault_amount_cents} onChange={(e) => set("vault_amount_cents", e.target.value)} /></Field>
          <Field label="Suspeita (0–100)"><Input type="number" value={form.suspicion_pct} onChange={(e) => set("suspicion_pct", e.target.value)} /></Field>
          <Field label="Capturas"><Input type="number" value={form.captures_count} onChange={(e) => set("captures_count", e.target.value)} /></Field>
          <Field label="Ordem"><Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} /></Field>
          <Field label="Status">
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Cor de destaque">
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.accent_color} onChange={(e) => set("accent_color", e.target.value)}>
              {ACCENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="ID/login no ranking (ao vivo)" full>
            <Input value={form.external_ranking_user_id} onChange={(e) => set("external_ranking_user_id", e.target.value)} placeholder="id_user ou user_login do casa-views-ranking" />
          </Field>
          <Field label="Avatar (quadrado)"><label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border px-2 text-sm text-muted-foreground"><Upload className="h-4 w-4" />{avatar?.name || "escolher…"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} /></label></Field>
          <Field label="Cover (hero 16:5)"><label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border px-2 text-sm text-muted-foreground"><Upload className="h-4 w-4" />{cover?.name || "escolher…"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></label></Field>
          <Field label="Ativo">
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.is_active} onChange={(e) => set("is_active", e.target.value)}>
              <option value="true">Sim</option><option value="false">Não</option>
            </select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

// ════════════════════════ Editor de blocos & loja ════════════════════════
function DetailEditor({ detail, authHeaders, reload }: {
  detail: Detail; authHeaders: (json?: boolean) => Record<string, string>; reload: () => void
}) {
  const pid = detail.participant.id
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Blocos de <span className="text-primary">{detail.participant.display_name}</span></h2>

      <ListSection<Journey>
        title="Jornada na casa"
        items={detail.journey}
        columns={[
          { key: "label", label: "Marco", placeholder: "Dia 1" },
          { key: "title", label: "Título*", placeholder: "Entrou na casa" },
          { key: "description", label: "Descrição", placeholder: "...", textarea: true },
          { key: "sentiment", label: "Tom", select: SENTIMENTS },
          { key: "sort_order", label: "Ordem", type: "number" },
        ]}
        createUrl={`/api/admin/casa/participants/${pid}/journey`}
        itemUrl={(id) => `/api/admin/casa/journey/${id}`}
        render={(it) => <><b>{it.label ? `${it.label} · ` : ""}{it.title}</b><span className="text-xs text-muted-foreground"> · {it.sentiment}</span>{it.description && <p className="text-sm text-muted-foreground">{it.description}</p>}</>}
        authHeaders={authHeaders} reload={reload}
      />

      <ListSection<Secret>
        title="Caixinha de segredos"
        items={detail.secrets}
        columns={[
          { key: "content", label: "Segredo*", placeholder: "...", textarea: true },
          { key: "author_label", label: "Autor", placeholder: "anônimo" },
          { key: "sort_order", label: "Ordem", type: "number" },
        ]}
        createUrl={`/api/admin/casa/participants/${pid}/secrets`}
        itemUrl={(id) => `/api/admin/casa/secrets/${id}`}
        render={(it) => <><p className="text-sm">{it.content}</p><span className="text-xs text-muted-foreground">— {it.author_label}</span></>}
        authHeaders={authHeaders} reload={reload}
      />

      <ListSection<Theory>
        title="Teorias da audiência"
        items={detail.theories}
        columns={[
          { key: "content", label: "Teoria*", placeholder: "...", textarea: true },
          { key: "author_label", label: "Autor", placeholder: "audiência" },
          { key: "votes", label: "Votos", type: "number" },
          { key: "sort_order", label: "Ordem", type: "number" },
        ]}
        createUrl={`/api/admin/casa/participants/${pid}/theories`}
        itemUrl={(id) => `/api/admin/casa/theories/${id}`}
        render={(it) => <><p className="text-sm">{it.content}</p><span className="text-xs text-muted-foreground">— {it.author_label} · {it.votes} votos</span></>}
        authHeaders={authHeaders} reload={reload}
      />

      <p className="rounded-md border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
        Os produtos da <b>Conveniência Views</b> são uma loja única (espelhada em todas as páginas de participante).
        Gerencie em <a href="/administracao/casa-loja" className="text-primary underline">Conveniência Views</a>.
      </p>
    </div>
  )
}

type Column = { key: string; label: string; placeholder?: string; textarea?: boolean; type?: string; select?: string[] }

function ListSection<T extends { id: string }>({ title, items, columns, createUrl, itemUrl, render, authHeaders, reload }: {
  title: string; items: T[]; columns: Column[]; createUrl: string; itemUrl: (id: string) => string
  render: (it: T) => React.ReactNode; authHeaders: (json?: boolean) => Record<string, string>; reload: () => void
}) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function add() {
    if (busy) return
    setBusy(true)
    try {
      await fetch(createUrl, { method: "POST", headers: authHeaders(), body: JSON.stringify(draft) })
      setDraft({})
      reload()
    } finally { setBusy(false) }
  }
  async function del(id: string) {
    await fetch(itemUrl(id), { method: "DELETE", headers: authHeaders() })
    reload()
  }

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">{title} <span className="text-xs font-normal text-muted-foreground">({items.length})</span></CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2">
            <div className="min-w-0">{render(it)}</div>
            <Button size="icon" variant="ghost" onClick={() => del(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        <div className="grid items-end gap-2 rounded-md border border-dashed p-3 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((c) => (
            <div key={c.key} className={`space-y-1 ${c.textarea ? "sm:col-span-2 lg:col-span-3" : ""}`}>
              <Label className="text-xs">{c.label}</Label>
              {c.select ? (
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={draft[c.key] ?? c.select[0]} onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))}>
                  {c.select.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : c.textarea ? (
                <Textarea rows={2} value={draft[c.key] ?? ""} placeholder={c.placeholder} onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))} />
              ) : (
                <Input type={c.type || "text"} value={draft[c.key] ?? ""} placeholder={c.placeholder} onChange={(e) => setDraft((d) => ({ ...d, [c.key]: e.target.value }))} />
              )}
            </div>
          ))}
          <Button onClick={add} disabled={busy} className="lg:col-span-3"><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>
      </CardContent>
    </Card>
  )
}

