"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Compass, Loader2, Check } from "lucide-react"

type Settings = {
  is_enabled: boolean
  audience: "all" | "admin"
  show_mode: "once" | "always"
}

const DEFAULTS: Settings = { is_enabled: true, audience: "all", show_mode: "once" }

export default function AdminTourPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const load = useCallback(async () => {
    if (!token) {
      router.push("/login")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/tour/settings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.status === 403 || res.status === 401) {
        router.push("/")
        return
      }
      const data = await res.json()
      if (data?.settings) {
        setSettings({
          is_enabled: !!data.settings.is_enabled,
          audience: data.settings.audience === "admin" ? "admin" : "all",
          show_mode: data.settings.show_mode === "always" ? "always" : "once",
        })
      }
    } catch {
      setError("Não foi possível carregar a configuração.")
    } finally {
      setLoading(false)
    }
  }, [token, router])

  useEffect(() => {
    void load()
  }, [load])

  async function save(patch: Partial<Settings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/tour/settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error()
      setSavedAt(Date.now())
    } catch {
      setError("Falha ao salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>

        <header className="mb-8 border-b-4 border-foreground/80 pb-2">
          <p className="fl-marker text-base text-primary inline-flex items-center gap-2">
            <Compass className="h-4 w-4" /> onboarding
          </p>
          <h1 className="fl-display text-5xl leading-[0.85] text-foreground md:text-6xl">Tour de boas-vindas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Controla quando o tour <code className="text-primary">/bem-vindo</code> aparece sozinho. Enquanto você edita o tour,
            deixe <strong>só para admin + toda vez</strong>; quando terminar, volte para <strong>todos + só a 1ª vez</strong>.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-6">
            {/* Liga/desliga */}
            <section className="border-2 border-[#0B0B0D] bg-[#1D1810] p-5 shadow-[4px_4px_0_0_#0B0B0D]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="fl-display text-xl text-[#F1EDE2]">Auto-tour ligado</h2>
                  <p className="mt-1 text-xs text-[#F1EDE2]/60">Se desligar, o tour nunca aparece sozinho (só pelo &quot;Rever tour&quot; no menu).</p>
                </div>
                <Toggle on={settings.is_enabled} onClick={() => save({ is_enabled: !settings.is_enabled })} />
              </div>
            </section>

            {/* Audiência */}
            <section className={`border-2 border-[#0B0B0D] bg-[#1D1810] p-5 shadow-[4px_4px_0_0_#0B0B0D] ${!settings.is_enabled ? "opacity-50" : ""}`}>
              <h2 className="fl-display text-xl text-[#F1EDE2]">Quem vê</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Choice label="Todos" desc="Qualquer pessoa no 1º acesso." active={settings.audience === "all"} disabled={!settings.is_enabled} onClick={() => save({ audience: "all" })} />
                <Choice label="Só admin" desc="Só administradores veem (use enquanto edita)." active={settings.audience === "admin"} disabled={!settings.is_enabled} onClick={() => save({ audience: "admin" })} />
              </div>
            </section>

            {/* Frequência */}
            <section className={`border-2 border-[#0B0B0D] bg-[#1D1810] p-5 shadow-[4px_4px_0_0_#0B0B0D] ${!settings.is_enabled ? "opacity-50" : ""}`}>
              <h2 className="fl-display text-xl text-[#F1EDE2]">Quando aparece</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Choice label="Só a 1ª vez" desc="Aparece uma vez e some depois." active={settings.show_mode === "once"} disabled={!settings.is_enabled} onClick={() => save({ show_mode: "once" })} />
                <Choice label="Toda vez" desc="Reaparece a cada login (para testar)." active={settings.show_mode === "always"} disabled={!settings.is_enabled} onClick={() => save({ show_mode: "always" })} />
              </div>
            </section>

            <div className="flex items-center justify-between">
              <Link href="/bem-vindo?rever=1" className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-sm font-bold text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5">
                <Compass className="h-4 w-4" /> Abrir o tour agora
              </Link>
              <span className="text-xs text-muted-foreground">
                {saving ? (
                  <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…</span>
                ) : savedAt ? (
                  <span className="inline-flex items-center gap-1.5 text-[#16a34a]"><Check className="h-3.5 w-3.5" /> Salvo</span>
                ) : null}
              </span>
            </div>

            {error && <p className="text-sm text-[#dc2626]">{error}</p>}
          </div>
        )}
      </main>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative h-7 w-12 shrink-0 border-2 border-[#0B0B0D] transition ${on ? "bg-[#F2B705]" : "bg-[#0E0B06]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 bg-[#F1EDE2] transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  )
}

function Choice({ label, desc, active, disabled, onClick }: { label: string; desc: string; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border-2 p-3 text-left transition disabled:cursor-not-allowed ${
        active ? "border-[#F2B705] bg-[#F2B705]/10" : "border-[#0B0B0D] bg-[#0E0B06] hover:border-[#F1EDE2]/30"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-bold text-[#F1EDE2]">
        {active && <Check className="h-4 w-4 text-[#F2B705]" />}
        {label}
      </span>
      <span className="mt-0.5 block text-xs text-[#F1EDE2]/55">{desc}</span>
    </button>
  )
}
