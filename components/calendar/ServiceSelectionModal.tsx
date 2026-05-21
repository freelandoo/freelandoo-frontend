"use client"

import { X, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import type { ProfileService } from "./types"
import { getStoredUser, getToken, setSession, extractAuthSession, type AuthUser } from "@/lib/auth"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"

interface ServiceSelectionModalProps {
  open: boolean
  onClose: () => void
  services: ProfileService[]
  dateISO: string
  startTime: string
  onConfirm: (serviceId: number, clientData: { whatsapp: string }) => Promise<void>
  /** Serviço já escolhido (fluxo vindo do modal de data/hora público). */
  lockedServiceId?: number
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

export function ServiceSelectionModal({
  open,
  onClose,
  services,
  dateISO,
  startTime,
  onConfirm,
  lockedServiceId,
}: ServiceSelectionModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [whatsapp, setWhatsapp] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // E-mail login inline
  const [emailLoginOpen, setEmailLoginOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setLoginError(null)
    setEmailLoginOpen(false)
    setLoginEmail("")
    setLoginPassword("")
    if (lockedServiceId != null) {
      setSelectedId(lockedServiceId)
    } else {
      setSelectedId(null)
    }
    setWhatsapp("")
    // Carrega usuário logado (se houver)
    const token = getToken()
    if (!token) {
      setUser(null)
      setAuthChecked(true)
      return
    }
    setUser(getStoredUser())
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && (data.id_user || data.user?.id_user)) {
          const u: AuthUser = data.id_user ? data : data.user
          setUser(u)
        }
      })
      .catch(() => { /* mantém o que está em storage */ })
      .finally(() => setAuthChecked(true))
  }, [open, lockedServiceId])

  if (!open) return null

  const dateLabel = new Date(dateISO + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  })

  const activeServices = services.filter(s => s.is_active !== false)
  const selected = activeServices.find(s => s.id_profile_service === selectedId) || null
  const isLocked = lockedServiceId != null
  const isLoggedIn = !!user

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loginSubmitting) return
    setLoginSubmitting(true)
    setLoginError(null)
    try {
      const res = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, senha: loginPassword }),
      })
      const data = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        setLoginError(typeof data?.error === "string" ? data.error : "Falha no login")
        return
      }
      const session = extractAuthSession(data as Record<string, unknown>)
      if (!session) {
        setLoginError("Resposta inválida do servidor")
        return
      }
      setSession(session.token, session.user)
      setUser(session.user)
      setEmailLoginOpen(false)
    } catch {
      setLoginError("Erro ao conectar com o servidor")
    } finally {
      setLoginSubmitting(false)
    }
  }

  async function handleConfirm() {
    if (!selectedId) { setError("Escolha um serviço"); return }
    if (!isLoggedIn) { setError("Faça login para agendar"); return }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(selectedId, { whatsapp: whatsapp.trim() })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao agendar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Agendar horário</h2>
            <p className="text-sm text-zinc-400 capitalize mt-1">{dateLabel} • {startTime}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            {isLocked ? (
              <>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Serviço
                </label>
                {!selected ? (
                  <p className="text-sm text-red-400">Serviço não encontrado.</p>
                ) : (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-100">{selected.name}</span>
                      <span className="text-sm font-bold text-yellow-400">{formatBRL(selected.price_amount)}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{selected.duration_minutes} min</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Escolha o serviço
                </label>
                {activeServices.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhum serviço disponível.</p>
                ) : (
                  <div className="space-y-2">
                    {activeServices.map((s) => (
                      <button
                        key={s.id_profile_service}
                        type="button"
                        onClick={() => setSelectedId(s.id_profile_service)}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          selectedId === s.id_profile_service
                            ? "border-yellow-400 bg-yellow-400/10 shadow-md"
                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-zinc-100">{s.name}</span>
                          <span className="text-sm font-bold text-yellow-400">{formatBRL(s.price_amount)}</span>
                        </div>
                        {s.description && <p className="mt-1 text-xs text-zinc-400">{s.description}</p>}
                        <p className="mt-2 text-xs text-zinc-500">{s.duration_minutes} min</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {selectedId && (
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              {!authChecked ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                </div>
              ) : isLoggedIn ? (
                <>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Logado como</label>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-2 text-sm text-zinc-200">
                    <p className="font-medium">{user!.nome || user!.email}</p>
                    {user!.nome && <p className="text-xs text-zinc-500">{user!.email}</p>}
                  </div>
                  <input
                    type="tel"
                    placeholder="WhatsApp (opcional)"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 outline-none"
                  />
                </>
              ) : (
                <>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Entre para agendar
                  </label>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4 space-y-3">
                    <div className="flex justify-center">
                      <GoogleSignInButton
                        text="continue_with"
                        onComplete={() => setUser(getStoredUser())}
                      />
                    </div>

                    {!emailLoginOpen ? (
                      <button
                        type="button"
                        onClick={() => setEmailLoginOpen(true)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 hover:border-zinc-500"
                      >
                        Entrar com e-mail
                      </button>
                    ) : (
                      <form onSubmit={handleEmailLogin} className="space-y-2">
                        <input
                          type="email"
                          required
                          placeholder="E-mail"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 outline-none"
                        />
                        <input
                          type="password"
                          required
                          placeholder="Senha"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 outline-none"
                        />
                        {loginError && (
                          <p className="text-xs text-red-400">{loginError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEmailLoginOpen(false)}
                            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500"
                          >
                            Voltar
                          </button>
                          <button
                            type="submit"
                            disabled={loginSubmitting}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-semibold text-zinc-900 hover:bg-yellow-300 disabled:opacity-50"
                          >
                            {loginSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Entrar
                          </button>
                        </div>
                      </form>
                    )}

                    <p className="text-[11px] text-zinc-500 text-center">
                      Sem conta?{" "}
                      <a href={`/cadastro?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`} className="text-yellow-400 hover:underline">
                        Cadastre-se
                      </a>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-zinc-800 bg-zinc-900/50">
          {selected ? (
            <span className="text-sm text-zinc-400">
              Total: <strong className="text-yellow-400">{formatBRL(selected.price_amount)}</strong>
            </span>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-sm text-zinc-200">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedId || !isLoggedIn || submitting}
              className="flex items-center gap-2 px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoggedIn ? "Escolher e pagar" : "Entrar para agendar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
