"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Loader2, Check } from "lucide-react"
import { getToken } from "@/lib/auth"

/**
 * Campo admin-only na página da Audiência: define a DATA DE INÍCIO — o ranking
 * só conta comentários de posts publicados a partir dela. Vazio = conta todos.
 * Só aparece para Administrator (checa via /api/users/me). Salva via proxy
 * same-origin (que repassa o JWT ao módulo de ranking, validado no Freelandoo).
 */
export function AudienceDateAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [date, setDate] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false
    // admin?
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const admin =
          Boolean(data.is_admin) ||
          (Array.isArray(data.roles) && data.roles.some((r: { desc_role?: string }) => r.desc_role === "Administrator"))
        setIsAdmin(admin)
      })
      .catch(() => {})
    // valor atual
    fetch("/api/acasaviews/audience-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setDate(data?.audience_start_date || "")
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [])

  async function save(value: string) {
    setSaving(true)
    setError(null)
    try {
      const token = getToken()
      const res = await fetch("/api/acasaviews/audience-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ start_date: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Falha ao salvar")
      } else {
        setDate(data?.audience_start_date || "")
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1800)
      }
    } catch {
      setError("Falha ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) return null

  return (
    <section className="mx-auto max-w-[1600px] px-4 pt-5 md:px-8">
      <div className="flex flex-wrap items-center gap-3 border border-[var(--rv-pink)] bg-[var(--rv-surface)] px-4 py-3">
        <span
          className="rv-type inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--rv-pink-ink)]"
        >
          <CalendarClock className="h-4 w-4" />
          admin · audiência conta a partir de
        </span>

        <input
          type="date"
          value={date}
          disabled={!loaded || saving}
          onChange={(e) => setDate(e.target.value)}
          className="rv-type border border-[var(--rv-white)] bg-[var(--rv-bg)] px-2 py-1 text-sm text-[var(--rv-white)] outline-none [color-scheme:dark]"
        />

        <button
          onClick={() => save(date)}
          disabled={saving || !loaded}
          className="rv-type inline-flex items-center gap-1.5 bg-[var(--rv-pink)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--rv-white)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : savedFlash ? <Check className="h-4 w-4" /> : null}
          {savedFlash ? "salvo" : "salvar"}
        </button>

        {date && (
          <button
            onClick={() => {
              setDate("")
              save("")
            }}
            disabled={saving}
            className="rv-type text-[11px] uppercase tracking-[0.12em] text-[var(--rv-muted)] underline hover:text-[var(--rv-white)] disabled:opacity-60"
          >
            limpar (contar tudo)
          </button>
        )}

        {error && <span className="rv-type text-[11px] text-[var(--rv-down)]">{error}</span>}
        <span className="rv-type text-[10px] text-[var(--rv-faint)]">
          posts publicados a partir desta data · vazio = todos
        </span>
      </div>
    </section>
  )
}
