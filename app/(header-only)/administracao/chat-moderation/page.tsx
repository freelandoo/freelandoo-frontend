"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, Loader2, ShieldAlert, Check, X, MicOff, Ban, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface ModerationResult {
  id_moderation_result: number
  id_chat_message: string | null
  id_chat_room: string | null
  id_user: string
  original_text: string
  normalized_text: string
  action: string
  risk_score: number
  flags: string[]
  matched_terms: { term: string; category: string; severity: string }[]
  reason: string | null
  review_status: string
  reviewed_at: string | null
  created_at: string
  user_username: string | null
  user_nome: string | null
  room_type: string | null
}

const TABS = [
  { key: "pending",       label: "Em revisão" },
  { key: "all",           label: "Tudo" },
  { key: "block",         label: "Bloqueadas" },
  { key: "mute_temp",     label: "Mute" },
  { key: "hide",          label: "Ocultadas" },
] as const

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function formatDateTime(s: string) {
  try { return new Date(s).toLocaleString("pt-BR") } catch { return s }
}

function actionTone(action: string) {
  if (action === "block")     return "bg-rose-500/15 text-rose-300 border-rose-700"
  if (action === "mute_temp") return "bg-amber-500/15 text-amber-300 border-amber-700"
  if (action === "review")    return "bg-sky-500/15 text-sky-300 border-sky-700"
  if (action === "mask")      return "bg-zinc-500/15 text-zinc-300 border-zinc-700"
  if (action === "hide")      return "bg-purple-500/15 text-purple-300 border-purple-700"
  return "bg-muted/30 text-muted-foreground border-border"
}

export default function ChatModerationPage() {
  const router = useRouter()
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending")
  const [items, setItems] = useState<ModerationResult[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const token = getToken()
    if (!token) { router.push("/login"); return }
    setState("loading"); setError(null)
    try {
      const params = new URLSearchParams()
      if (tab === "pending")   params.set("review_status", "pending")
      else if (tab === "block")     params.set("action", "block")
      else if (tab === "mute_temp") params.set("action", "mute_temp")
      else if (tab === "hide")      params.set("action", "hide")
      const res = await fetch(`/api/admin/chat-moderation/results?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      })
      const d = await res.json()
      if (!res.ok) { setError(d?.error || "Erro"); setState("error"); return }
      setItems((d.items || []) as ModerationResult[])
      setState("loaded")
    } catch {
      setError("Erro de conexão"); setState("error")
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function decide(id: number, kind: "approve" | "keep-blocked") {
    setBusyId(id)
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/chat-moderation/results/${id}/${kind}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.error || "Falha")
      } else {
        await load()
      }
    } catch { setError("Erro de conexão") }
    finally { setBusyId(null) }
  }

  async function mute(id_user: string) {
    const minutes = Number(prompt("Mutar quantos minutos?", "10") || "0")
    if (!minutes) return
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/chat-moderation/users/${id_user}/mute`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.error || "Falha")
      } else {
        alert(`User mutado por ${minutes} min.`)
      }
    } catch { setError("Erro de conexão") }
  }

  async function ban(id_user: string) {
    const hours = Number(prompt("Banir quantas horas?", "24") || "0")
    if (!hours) return
    try {
      const token = getToken()
      const res = await fetch(`/api/admin/chat-moderation/users/${id_user}/ban`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: hours * 60 }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.error || "Falha")
      } else {
        alert(`User banido por ${hours}h.`)
      }
    } catch { setError("Erro de conexão") }
  }

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Voltar
        </button>

        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-primary" aria-hidden />
            <div>
              <h1 className="text-2xl font-bold">Moderação do Chat</h1>
              <p className="text-xs text-muted-foreground">Fila de revisão, bloqueios e ações sobre usuários.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Atualizar
            </button>
            <button type="button" onClick={() => router.push("/administracao/blocked-terms")} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
              Gerenciar termos
            </button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${tab === t.key ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 rounded-lg border border-rose-700 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">{error}</p>}

        {state === "loading" ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            Nada por aqui.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id_moderation_result} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${actionTone(r.action)}`}>
                      {r.action}
                    </span>
                    <span className="text-[11px] text-muted-foreground">score {r.risk_score}</span>
                    <span className="text-[11px] text-muted-foreground">@{r.user_username || "?"} · {r.room_type || "—"}</span>
                    {r.review_status === "pending" && <span className="rounded-full border border-amber-700 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">Pendente</span>}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{formatDateTime(r.created_at)}</span>
                </div>

                <p className="mt-3 break-words rounded-md bg-muted/30 px-3 py-2 text-sm">{r.original_text}</p>

                {r.matched_terms && r.matched_terms.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    Termos:
                    {r.matched_terms.map((m, i) => (
                      <span key={i} className="rounded border border-border bg-background/60 px-1.5 py-0.5 text-[10px]">
                        {m.term} <span className="opacity-60">({m.category}/{m.severity})</span>
                      </span>
                    ))}
                  </p>
                )}
                {r.flags && r.flags.length > 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Flags: {r.flags.join(", ")}</p>
                )}
                {r.reason && <p className="mt-1 text-[11px] text-muted-foreground">Motivo: {r.reason}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id_moderation_result}
                    onClick={() => decide(r.id_moderation_result, "approve")}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" aria-hidden /> Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id_moderation_result}
                    onClick={() => decide(r.id_moderation_result, "keep-blocked")}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" aria-hidden /> Manter bloqueada
                  </button>
                  <button
                    type="button"
                    onClick={() => mute(r.id_user)}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-700 bg-amber-950/30 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-900/40"
                  >
                    <MicOff className="h-3 w-3" aria-hidden /> Mutar user
                  </button>
                  <button
                    type="button"
                    onClick={() => ban(r.id_user)}
                    className="inline-flex items-center gap-1 rounded-full border border-rose-700 bg-rose-950/30 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-900/40"
                  >
                    <Ban className="h-3 w-3" aria-hidden /> Banir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
