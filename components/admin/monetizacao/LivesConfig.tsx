"use client"

/**
 * Loja de presentes das Lives (admin). Cada presente é leve: emoji + cor +
 * animação (preset CSS/GSAP) + preço em Poléns. Nada de mídia pesada.
 * CRUD em /api/admin/lives/gifts.
 */
import { useCallback, useEffect, useState } from "react"
import { Loader2, Radio, Check, AlertCircle, Plus, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type Gift = {
  id_live_gift: string
  name: string
  emoji: string
  color: string
  animation: string
  price_polens: number
  sort_order: number
  is_active: boolean
}

const ANIMATIONS = [
  { value: "float", label: "Flutuar ↑" },
  { value: "burst", label: "Explodir ✦" },
  { value: "rain", label: "Chuva ☂" },
  { value: "pulse", label: "Pulsar ◉" },
  { value: "spin", label: "Girar ↻" },
  { value: "slide", label: "Deslizar →" },
]

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = { error: text } }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `HTTP ${res.status}`)
  return data as T
}

function Banner({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
      ok ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
         : "bg-destructive/10 text-destructive border border-destructive/30"}`}>
      {ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {msg}
    </div>
  )
}

function GiftRow({ gift, onSaved, onDeleted }: {
  gift: Gift
  onSaved: (g: Gift) => void
  onDeleted: (id: string) => void
}) {
  const [form, setForm] = useState<Gift>(gift)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const isNew = gift.id_live_gift === "__new__"

  function patch<K extends keyof Gift>(k: K, v: Gift[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function save() {
    setErr("")
    if (!form.name.trim()) { setErr("Nome obrigatório"); return }
    setSaving(true)
    try {
      const body = JSON.stringify({
        name: form.name.trim(),
        emoji: form.emoji,
        color: form.color,
        animation: form.animation,
        price_polens: Number(form.price_polens) || 0,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      })
      const data = isNew
        ? await api<{ gift: Gift }>("/api/admin/lives/gifts", { method: "POST", body })
        : await api<{ gift: Gift }>(`/api/admin/lives/gifts/${form.id_live_gift}`, { method: "PUT", body })
      onSaved(data.gift)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (isNew) { onDeleted("__new__"); return }
    if (!confirm(`Remover o presente "${form.name}"?`)) return
    try {
      await api(`/api/admin/lives/gifts/${form.id_live_gift}`, { method: "DELETE" })
      onDeleted(form.id_live_gift)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao remover")
    }
  }

  return (
    <div className={`rounded-lg border p-3 ${form.is_active ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-end gap-3">
        {/* Preview */}
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-md border text-2xl"
          style={{ background: `${form.color}1a`, borderColor: `${form.color}66` }}
        >
          {form.emoji || "🎁"}
        </div>
        <div className="w-16">
          <Label className="text-[10px] text-muted-foreground">Emoji</Label>
          <Input value={form.emoji} onChange={(e) => patch("emoji", e.target.value)} className="h-9 text-center text-lg" maxLength={8} />
        </div>
        <div className="min-w-[140px] flex-1">
          <Label className="text-[10px] text-muted-foreground">Nome</Label>
          <Input value={form.name} onChange={(e) => patch("name", e.target.value)} placeholder="Coração" className="h-9" />
        </div>
        <div className="w-28">
          <Label className="text-[10px] text-muted-foreground">Preço (Poléns)</Label>
          <Input type="number" min={0} value={form.price_polens} onChange={(e) => patch("price_polens", Number(e.target.value))} className="h-9" />
        </div>
        <div className="w-36">
          <Label className="text-[10px] text-muted-foreground">Animação</Label>
          <select
            value={form.animation}
            onChange={(e) => patch("animation", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none"
          >
            {ANIMATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div className="w-16">
          <Label className="text-[10px] text-muted-foreground">Cor</Label>
          <input type="color" value={form.color} onChange={(e) => patch("color", e.target.value)} className="h-9 w-full cursor-pointer rounded-md border border-input bg-transparent" />
        </div>
        <div className="w-16">
          <Label className="text-[10px] text-muted-foreground">Ordem</Label>
          <Input type="number" value={form.sort_order} onChange={(e) => patch("sort_order", Number(e.target.value))} className="h-9" />
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-xs">
          <Checkbox checked={form.is_active} onCheckedChange={(v) => patch("is_active", v === true)} />
          Ativo
        </label>
        <div className="flex gap-1.5 pb-1">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={remove} title="Remover">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  )
}

export function LivesConfig() {
  const [loading, setLoading] = useState(true)
  const [gifts, setGifts] = useState<Gift[]>([])
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ gifts: Gift[] }>("/api/admin/lives/gifts")
      setGifts(Array.isArray(data.gifts) ? data.gifts : [])
    } catch (e) {
      setFeedback({ ok: false, msg: e instanceof Error ? e.message : "Erro ao carregar" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function addDraft() {
    setGifts((g) => [
      { id_live_gift: "__new__", name: "", emoji: "🎁", color: "#F2B705", animation: "float", price_polens: 10, sort_order: (g[g.length - 1]?.sort_order ?? 0) + 1, is_active: true },
      ...g,
    ])
  }

  function onSaved(saved: Gift) {
    setGifts((g) => {
      const hasNew = g.some((x) => x.id_live_gift === "__new__")
      const next = hasNew
        ? g.map((x) => (x.id_live_gift === "__new__" ? saved : x))
        : g.map((x) => (x.id_live_gift === saved.id_live_gift ? saved : x))
      return next
    })
    setFeedback({ ok: true, msg: "Presente salvo" })
  }

  function onDeleted(id: string) {
    setGifts((g) => g.filter((x) => x.id_live_gift !== id))
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Radio className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h2 className="text-xl font-bold">Lives — Loja de presentes</h2>
          <p className="text-sm text-muted-foreground">
            Presentes que os espectadores enviam ao vivo (gastam Poléns). Leves: só emoji, cor e animação.
          </p>
        </div>
        <Button onClick={addDraft} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo presente
        </Button>
      </div>

      {feedback && <div className="mb-4"><Banner ok={feedback.ok} msg={feedback.msg} /></div>}

      <Card>
        <CardContent className="space-y-3 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : gifts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum presente ainda. Clique em “Novo presente”.
            </p>
          ) : (
            gifts.map((g) => (
              <GiftRow key={g.id_live_gift} gift={g} onSaved={onSaved} onDeleted={onDeleted} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
