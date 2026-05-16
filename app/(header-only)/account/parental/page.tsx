"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  ShieldCheck,
  Plus,
  Copy,
  Trash2,
  Check,
  AlertCircle,
  MessageSquare,
} from "lucide-react"

type InviteStatus = "active" | "used" | "revoked" | "expired"
type SupervisedStatus = "active" | "suspended" | "revoked"

interface Invite {
  id_invite: string
  code: string
  status: InviteStatus
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_at: string
}

interface Permissions {
  can_view_feed: boolean
  can_post_feed: boolean
  can_use_bees: boolean
  can_watch_courses: boolean
  can_sell_courses: boolean
  can_message: boolean
  can_receive_messages: boolean
  can_use_global_chat: boolean
  can_use_machine_chat: boolean
  can_request_service: boolean
  can_show_in_showcase: boolean
  can_show_in_ranking: boolean
  can_have_mural: boolean
}

interface MinorMachineAccess {
  id_machine: number
  machine_name: string
  machine_slug: string
  allowed: boolean
}

interface Minor {
  id_supervised: string
  minor_user_id: string
  minor_username: string | null
  minor_nome: string
  minor_email: string
  minor_avatar: string | null
  minor_birthdate: string | null
  status: SupervisedStatus
  relationship: string | null
  created_at: string
  permissions: Permissions | null
  machines: MinorMachineAccess[]
}

interface Machine {
  id_machine: number
  name: string
  slug: string
  color_ring?: string
}

const PERMISSION_GROUPS: Array<{
  title: string
  description: string
  items: Array<{ key: keyof Permissions; label: string; hint?: string }>
}> = [
  {
    title: "Conteúdo",
    description: "O que o menor pode ver e publicar",
    items: [
      { key: "can_view_feed", label: "Ver o feed" },
      { key: "can_post_feed", label: "Postar no feed" },
      { key: "can_use_bees", label: "Usar Bees" },
      { key: "can_watch_courses", label: "Assistir cursos" },
      { key: "can_sell_courses", label: "Vender cursos", hint: "Publicação exige aprovação" },
    ],
  },
  {
    title: "Conversas",
    description: "Mensagens e chats coletivos",
    items: [
      { key: "can_message", label: "Enviar mensagens" },
      { key: "can_receive_messages", label: "Receber mensagens" },
      { key: "can_use_global_chat", label: "Chat global" },
      { key: "can_use_machine_chat", label: "Chat de máquinas" },
    ],
  },
  {
    title: "Bloqueios duros (não desligáveis)",
    description: "Mantidos sempre desligados para contas supervisionadas",
    items: [
      { key: "can_request_service", label: "Pedir serviço" },
      { key: "can_show_in_showcase", label: "Aparecer na vitrine" },
      { key: "can_show_in_ranking", label: "Aparecer no ranking" },
      { key: "can_have_mural", label: "Mural público" },
    ],
  },
]

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function ParentalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [minors, setMinors] = useState<Minor[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [generating, setGenerating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [expandedMinorId, setExpandedMinorId] = useState<string | null>(null)
  const [savingMinorId, setSavingMinorId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [invitesRes, minorsRes, machinesRes] = await Promise.all([
        fetch("/api/supervision/codes", { headers: authHeaders(), cache: "no-store" }),
        fetch("/api/supervision/minors", { headers: authHeaders(), cache: "no-store" }),
        fetch("/api/machines", { cache: "no-store" }),
      ])

      if (invitesRes.status === 401 || minorsRes.status === 401) {
        router.push("/login")
        return
      }
      const invitesData = await invitesRes.json()
      const minorsData = await minorsRes.json()
      const machinesData = await machinesRes.json()

      if (!invitesRes.ok) throw new Error(invitesData?.error || "Falha ao listar códigos")
      if (!minorsRes.ok) throw new Error(minorsData?.error || "Falha ao listar menores")

      setInvites(invitesData.invites || [])
      setMinors(minorsData.minors || [])
      setMachines(
        Array.isArray(machinesData)
          ? machinesData
          : machinesData.machines || []
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const activeInvites = useMemo(
    () => invites.filter((i) => i.status === "active" && new Date(i.expires_at) > new Date()),
    [invites]
  )

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/supervision/codes", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Falha ao gerar código")
        return
      }
      setInvites((prev) => [data.invite, ...prev])
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (id_invite: string) => {
    if (!confirm("Revogar este código? Quem tiver com ele em mãos não conseguirá mais usar.")) return
    const res = await fetch(`/api/supervision/codes/${id_invite}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id_invite !== id_invite))
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data?.error || "Falha ao revogar")
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }

  const togglePermission = async (minor: Minor, key: keyof Permissions) => {
    if (!minor.permissions) return
    // Bloqueios duros: não permitem ativação (servidor também ignora).
    const hardBlocked = ["can_request_service", "can_show_in_showcase", "can_show_in_ranking", "can_have_mural"]
    if (hardBlocked.includes(key)) return

    const nextValue = !minor.permissions[key]
    setSavingMinorId(minor.minor_user_id)
    try {
      const res = await fetch(`/api/supervision/minors/${minor.minor_user_id}/permissions`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: nextValue }),
      })
      const data = await res.json()
      if (res.ok && data.permissions) {
        setMinors((prev) =>
          prev.map((m) =>
            m.minor_user_id === minor.minor_user_id ? { ...m, permissions: data.permissions } : m
          )
        )
      }
    } finally {
      setSavingMinorId(null)
    }
  }

  const toggleMachine = async (minor: Minor, machine: Machine, allowed: boolean) => {
    setSavingMinorId(minor.minor_user_id)
    try {
      const res = await fetch(
        `/api/supervision/minors/${minor.minor_user_id}/machines/${machine.id_machine}`,
        {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ allowed }),
        }
      )
      if (res.ok) {
        setMinors((prev) =>
          prev.map((m) => {
            if (m.minor_user_id !== minor.minor_user_id) return m
            const others = m.machines.filter((x) => x.id_machine !== machine.id_machine)
            return {
              ...m,
              machines: [
                ...others,
                {
                  id_machine: machine.id_machine,
                  machine_name: machine.name,
                  machine_slug: machine.slug,
                  allowed,
                },
              ],
            }
          })
        )
      }
    } finally {
      setSavingMinorId(null)
    }
  }

  const setStatus = async (minor: Minor, status: SupervisedStatus) => {
    const label =
      status === "suspended"
        ? "Suspender este vínculo? O menor mantém a conta, mas perde acesso supervisionado."
        : status === "revoked"
          ? "Revogar este vínculo? A conta do menor ficará sem responsável."
          : null
    if (label && !confirm(label)) return

    setSavingMinorId(minor.minor_user_id)
    try {
      const res = await fetch(`/api/supervision/minors/${minor.minor_user_id}/status`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setMinors((prev) =>
          prev.map((m) => (m.minor_user_id === minor.minor_user_id ? { ...m, status } : m))
        )
      }
    } finally {
      setSavingMinorId(null)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8 md:py-10">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/account")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
              Parental
            </h1>
            <p className="text-sm text-muted-foreground">
              Contas supervisionadas vinculadas à sua conta.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Gerar código */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Código do responsável</CardTitle>
            <CardDescription>
              Gere um código e envie ao menor. Ele usa o código no cadastro para vincular a conta a você.
              <br />
              <span className="text-xs">Cada código vale 24h e pode ser usado uma única vez.</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleGenerate} disabled={generating}>
              <Plus className="mr-2 h-4 w-4" />
              {generating ? "Gerando..." : "Gerar código"}
            </Button>

            {activeInvites.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">Nenhum código ativo no momento.</p>
            )}

            {activeInvites.length > 0 && (
              <div className="space-y-2">
                {activeInvites.map((inv) => {
                  const expiresIn = Math.max(
                    0,
                    Math.round((new Date(inv.expires_at).getTime() - Date.now()) / (60 * 60 * 1000))
                  )
                  return (
                    <div
                      key={inv.id_invite}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.05] p-3"
                    >
                      <code className="rounded bg-black/40 px-2 py-1 font-mono text-sm tracking-widest text-amber-300">
                        {inv.code}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        Expira em {expiresIn}h
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(inv.code)}
                          aria-label="Copiar"
                        >
                          {copiedCode === inv.code ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(inv.id_invite)}
                          aria-label="Revogar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de menores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filhos vinculados</CardTitle>
            <CardDescription>
              {minors.length === 0
                ? "Quando o menor usar o seu código no cadastro, ele aparecerá aqui."
                : "Toque em um menor para abrir permissões e máquinas liberadas."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}

            {!loading && minors.length === 0 && (
              <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                Nenhum filho vinculado ainda.
              </div>
            )}

            {minors.map((minor) => {
              const expanded = expandedMinorId === minor.minor_user_id
              const saving = savingMinorId === minor.minor_user_id
              const allowedMachineIds = new Set(
                minor.machines.filter((m) => m.allowed).map((m) => m.id_machine)
              )
              return (
                <div
                  key={minor.minor_user_id}
                  className="rounded-lg border border-white/10 bg-zinc-950/40"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedMinorId(expanded ? null : minor.minor_user_id)}
                    className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/[0.03]"
                  >
                    <Avatar className="h-10 w-10">
                      {minor.minor_avatar && <AvatarImage src={minor.minor_avatar} />}
                      <AvatarFallback>
                        {(minor.minor_nome || "M").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{minor.minor_nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{minor.minor_username || "—"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        minor.status === "active"
                          ? "bg-green-500/15 text-green-400"
                          : minor.status === "suspended"
                            ? "bg-yellow-500/15 text-yellow-400"
                            : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {minor.status}
                    </span>
                  </button>

                  {expanded && (
                    <div className="space-y-5 border-t border-white/5 p-4">
                      {/* Status controls */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={minor.status === "active" ? "default" : "outline"}
                          disabled={saving || minor.status === "active"}
                          onClick={() => setStatus(minor, "active")}
                        >
                          Ativar
                        </Button>
                        <Button
                          size="sm"
                          variant={minor.status === "suspended" ? "default" : "outline"}
                          disabled={saving || minor.status === "suspended"}
                          onClick={() => setStatus(minor, "suspended")}
                        >
                          Suspender
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving || minor.status === "revoked"}
                          onClick={() => setStatus(minor, "revoked")}
                          className="text-red-500 hover:text-red-400"
                        >
                          Revogar
                        </Button>
                        <Link
                          href={`/account/parental/${minor.minor_user_id}/messages`}
                          className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Mensagens de {minor.minor_nome.split(" ")[0]}
                        </Link>
                      </div>

                      {/* Permissões */}
                      {minor.permissions ? (
                        <div className="space-y-4">
                          {PERMISSION_GROUPS.map((group) => (
                            <div key={group.title} className="space-y-2">
                              <div>
                                <p className="text-sm font-medium text-white">{group.title}</p>
                                <p className="text-xs text-muted-foreground">{group.description}</p>
                              </div>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {group.items.map((item) => {
                                  const isHard = group.title.startsWith("Bloqueios")
                                  return (
                                    <label
                                      key={item.key}
                                      className={`flex items-center gap-2 rounded-md border border-white/5 p-2 text-sm ${
                                        isHard ? "opacity-60" : "hover:bg-white/[0.03] cursor-pointer"
                                      }`}
                                    >
                                      <Checkbox
                                        checked={!!minor.permissions?.[item.key]}
                                        disabled={isHard || saving}
                                        onCheckedChange={() => togglePermission(minor, item.key)}
                                      />
                                      <div className="min-w-0 flex-1">
                                        <span className="text-white/90">{item.label}</span>
                                        {item.hint && (
                                          <span className="ml-1 text-[10px] text-muted-foreground">
                                            ({item.hint})
                                          </span>
                                        )}
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Permissões não disponíveis.</p>
                      )}

                      {/* Máquinas */}
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-white">Máquinas liberadas</p>
                          <p className="text-xs text-muted-foreground">
                            Marque as máquinas que o menor pode usar. Sem marcação = bloqueada.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {machines.map((m) => {
                            const allowed = allowedMachineIds.has(m.id_machine)
                            return (
                              <label
                                key={m.id_machine}
                                className="flex items-center gap-2 rounded-md border border-white/5 p-2 text-sm hover:bg-white/[0.03] cursor-pointer"
                              >
                                <Checkbox
                                  checked={allowed}
                                  disabled={saving}
                                  onCheckedChange={(v) =>
                                    toggleMachine(minor, m, v === true)
                                  }
                                />
                                <span className="text-white/90">{m.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
