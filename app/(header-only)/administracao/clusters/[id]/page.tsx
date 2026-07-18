"use client"

/**
 * Sala de comando de um Cluster de Live (admin). Aqui o admin:
 *  - gerencia membros (@username) e vê quem está CONECTADO agora (presença WS);
 *  - aperta INICIAR → todos os membros conectados começam a live juntos
 *    (push socket cluster:start) e ENCERRAR → todos param;
 *  - dispara SINAIS: botões grandes configuráveis (label + cor) e caixas de
 *    texto que estampam a tela de todos os membros (cluster:signal).
 * Dark utilitário, pt-only, cantos retos (.fl-sharp).
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft, Loader2, MessageSquareText, Plus, Radio, Send, Square,
  Trash2, Users, Zap,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { emitRealtime, onRealtime } from "@/lib/realtime"

interface Cluster {
  id_live_cluster: string
  name: string
  status: "idle" | "started"
  started_at: string | null
  is_active: boolean
}
interface Member {
  id_user: string
  username: string | null
  name: string | null
  avatar_url: string | null
}
interface ClusterButton {
  id_button: string
  label: string
  color: string
  sort_order: number
  is_active: boolean
}

const COLOR_PRESETS = [
  { hex: "#22c55e", label: "Verde" },
  { hex: "#ec4899", label: "Rosa" },
  { hex: "#F2B705", label: "Amarelo" },
  { hex: "#4F7CFF", label: "Azul" },
]

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

export default function ClusterControlRoomPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [cluster, setCluster] = useState<Cluster | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [buttons, setButtons] = useState<ClusterButton[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newUsername, setNewUsername] = useState("")
  const [addingMember, setAddingMember] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0].hex)
  const [creatingButton, setCreatingButton] = useState(false)
  const [text, setText] = useState("")
  const [sendingText, setSendingText] = useState(false)
  const [firingId, setFiringId] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)
  const [lastSignal, setLastSignal] = useState<{ label: string; color: string } | null>(null)
  const lastSignalTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdmin = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) { router.push("/"); return }
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router])

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const res = await fetch(`/api/admin/live-clusters/${id}`, { headers: authHeaders(), cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      setCluster(data.cluster)
      setMembers(data.members || [])
      setButtons(data.buttons || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cluster")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { if (!checkingAuth) load() }, [checkingAuth, load])

  // ── Sala em tempo real: presença + estado + eco dos sinais ────────────────
  useEffect(() => {
    if (!id || checkingAuth) return
    emitRealtime("cluster:subscribe", { id_live_cluster: id })
    const offPresence = onRealtime("cluster:presence", (payload) => {
      const p = payload as { id_live_cluster?: string; user_ids?: string[] }
      if (p?.id_live_cluster !== id) return
      setOnlineIds(new Set(p.user_ids || []))
    })
    const offMembers = onRealtime("cluster:members:changed", (payload) => {
      const p = payload as { id_live_cluster?: string }
      if (p?.id_live_cluster === id) load()
    })
    const offStart = onRealtime("cluster:start", (payload) => {
      const p = payload as { id_live_cluster?: string }
      if (p?.id_live_cluster === id) setCluster((c) => (c ? { ...c, status: "started" } : c))
    })
    const offEnd = onRealtime("cluster:end", (payload) => {
      const p = payload as { id_live_cluster?: string }
      if (p?.id_live_cluster === id) setCluster((c) => (c ? { ...c, status: "idle" } : c))
    })
    const offSignal = onRealtime("cluster:signal", (payload) => {
      const p = payload as { id_live_cluster?: string; kind?: string; label?: string; color?: string; text?: string }
      if (p?.id_live_cluster !== id) return
      setLastSignal({
        label: p.kind === "text" ? (p.text || "") : (p.label || ""),
        color: p.kind === "text" ? "#F2B705" : (p.color || "#22c55e"),
      })
      if (lastSignalTimer.current) clearTimeout(lastSignalTimer.current)
      lastSignalTimer.current = setTimeout(() => setLastSignal(null), 4000)
    })
    return () => {
      emitRealtime("cluster:unsubscribe", { id_live_cluster: id })
      offPresence(); offMembers(); offStart(); offEnd(); offSignal()
      if (lastSignalTimer.current) clearTimeout(lastSignalTimer.current)
    }
  }, [id, checkingAuth, load])

  // ── Ações ─────────────────────────────────────────────────────────────────
  const post = useCallback(async (path: string, body?: unknown, method = "POST") => {
    const res = await fetch(`/api/admin/live-clusters/${id}${path}`, {
      method,
      headers: authHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
    return data
  }, [id])

  const handleStartEnd = useCallback(async () => {
    if (!cluster || switching) return
    setSwitching(true)
    setError(null)
    try {
      const action = cluster.status === "started" ? "end" : "start"
      const data = await post(`/${action}`)
      setCluster((c) => (c ? { ...c, status: data.cluster.status } : c))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao mudar o estado")
    } finally {
      setSwitching(false)
    }
  }, [cluster, switching, post])

  const handleAddMember = useCallback(async () => {
    const username = newUsername.trim()
    if (!username || addingMember) return
    setAddingMember(true)
    setError(null)
    try {
      const data = await post("/members", { username })
      setMembers(data.members || [])
      setNewUsername("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao adicionar membro")
    } finally {
      setAddingMember(false)
    }
  }, [newUsername, addingMember, post])

  const handleRemoveMember = useCallback(async (member: Member) => {
    if (!window.confirm(`Remover @${member.username || member.id_user} do cluster?`)) return
    try {
      const data = await post(`/members/${member.id_user}`, undefined, "DELETE")
      setMembers(data.members || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover membro")
    }
  }, [post])

  const handleCreateButton = useCallback(async () => {
    const label = newLabel.trim()
    if (!label || creatingButton) return
    setCreatingButton(true)
    setError(null)
    try {
      const data = await post("/buttons", { label, color: newColor, sort_order: buttons.length + 1 })
      setButtons((prev) => [...prev, data.button])
      setNewLabel("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar botão")
    } finally {
      setCreatingButton(false)
    }
  }, [newLabel, newColor, creatingButton, buttons.length, post])

  const handleDeleteButton = useCallback(async (button: ClusterButton) => {
    if (!window.confirm(`Excluir o botão "${button.label}"?`)) return
    try {
      await post(`/buttons/${button.id_button}`, undefined, "DELETE")
      setButtons((prev) => prev.filter((b) => b.id_button !== button.id_button))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir botão")
    }
  }, [post])

  const handleFireButton = useCallback(async (button: ClusterButton) => {
    if (firingId) return
    setFiringId(button.id_button)
    setError(null)
    try {
      await post("/signal", { kind: "button", id_button: button.id_button })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao disparar o botão")
    } finally {
      setFiringId(null)
    }
  }, [firingId, post])

  const handleSendText = useCallback(async () => {
    const value = text.trim()
    if (!value || sendingText) return
    setSendingText(true)
    setError(null)
    try {
      await post("/signal", { kind: "text", text: value })
      setText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar o texto")
    } finally {
      setSendingText(false)
    }
  }, [text, sendingText, post])

  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const onlineMembers = members.filter((m) => onlineIds.has(m.id_user))
  const started = cluster?.status === "started"

  return (
    <div className="fl-sharp min-h-screen bg-background">
      <main className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/administracao/clusters"
            className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground transition hover:text-foreground"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Radio className="h-7 w-7 text-primary" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-foreground">{cluster?.name || "Cluster"}</h1>
            <p className="text-sm text-muted-foreground">
              {onlineMembers.length}/{members.length} membros conectados agora
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartEnd}
            disabled={switching || !cluster}
            className={`inline-flex h-14 items-center gap-2 px-8 text-base font-black uppercase tracking-wide text-white transition disabled:opacity-60 ${
              started ? "bg-[#ec4899] hover:opacity-90" : "bg-[#22c55e] hover:opacity-90"
            }`}
          >
            {switching ? <Loader2 className="h-5 w-5 animate-spin" /> : started ? <Square className="h-5 w-5" /> : <Radio className="h-5 w-5" />}
            {started ? "Encerrar" : "Iniciar"}
          </button>
        </div>

        {started && (
          <p className="border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            Cluster INICIADO — os membros conectados começaram a live juntos. Os sinais abaixo aparecem gigantes na tela de todos.
          </p>
        )}
        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        {lastSignal && (
          <p
            className="border px-3 py-2 text-sm font-bold"
            style={{ borderColor: `${lastSignal.color}55`, background: `${lastSignal.color}1a`, color: lastSignal.color }}
          >
            Sinal enviado a todos: {lastSignal.label}
          </p>
        )}

        {/* Botões de sinal */}
        <section className="border border-border bg-card p-4 space-y-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Zap className="h-4 w-4" /> Botões de sinal — apertar estampa na tela de todos
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {buttons.filter((b) => b.is_active).map((button) => (
              <div key={button.id_button} className="group relative">
                <button
                  type="button"
                  onClick={() => handleFireButton(button)}
                  disabled={firingId !== null}
                  className="flex h-24 w-full items-center justify-center px-2 text-2xl font-black uppercase tracking-wide text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
                  style={{ background: button.color }}
                >
                  {firingId === button.id_button
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <span className="break-words text-center leading-tight">{button.label}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteButton(button)}
                  className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center bg-black text-white/80 transition hover:text-red-400 group-hover:flex"
                  aria-label={`Excluir botão ${button.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {/* Criar botão */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value.slice(0, 40))}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateButton() }}
              placeholder="Novo botão (ex.: PAUSA)"
              className="min-w-0 flex-1 border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            <div className="flex items-center gap-1">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setNewColor(preset.hex)}
                  className={`h-8 w-8 border-2 transition ${newColor === preset.hex ? "border-white" : "border-transparent"}`}
                  style={{ background: preset.hex }}
                  aria-label={preset.label}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreateButton}
              disabled={!newLabel.trim() || creatingButton}
              className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {creatingButton ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar botão
            </button>
          </div>
        </section>

        {/* Caixa de texto */}
        <section className="border border-border bg-card p-4 space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MessageSquareText className="h-4 w-4" /> Caixa de texto — aparece grande na tela de todos
          </p>
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="Escreva o recado…"
              className="flex-1 resize-none border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSendText}
              disabled={!text.trim() || sendingText}
              className="inline-flex items-center gap-1.5 self-end bg-[#F2B705] px-4 py-2.5 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {sendingText ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </div>
        </section>

        {/* Membros */}
        <section className="border border-border bg-card p-4 space-y-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="h-4 w-4" /> Membros do cluster ({members.length})
          </p>
          <div className="flex gap-2">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.slice(0, 60))}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddMember() }}
              placeholder="@username do usuário"
              className="flex-1 border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddMember}
              disabled={!newUsername.trim() || addingMember}
              className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
          </div>
          {members.length === 0 ? (
            <p className="border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              Nenhum membro ainda. Adicione pelo @username.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => {
                const online = onlineIds.has(member.id_user)
                return (
                  <li key={member.id_user} className="flex items-center gap-3 py-2.5">
                    <Avatar className="h-9 w-9" data-avatar>
                      {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.name || ""} />}
                      <AvatarFallback className="bg-zinc-800 text-[11px] text-white/80">
                        {(member.name || member.username || "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{member.name || member.username}</p>
                      <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        online ? "bg-green-500/15 text-green-400" : "bg-white/5 text-muted-foreground"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 ${online ? "animate-pulse bg-green-400" : "bg-muted-foreground"}`} />
                      {online ? "Conectado" : "Offline"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                      className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition hover:border-red-500/40 hover:text-red-400"
                      aria-label={`Remover ${member.username}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
