"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ToggleRight, Loader2, Check, Power } from "lucide-react"

type Flag = {
  flag_key: string
  label: string
  description: string | null
  is_enabled: boolean
  updated_at: string | null
}

export default function AdminPainelDeControlePage() {
  const router = useRouter()
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const load = useCallback(async () => {
    if (!token) {
      router.push("/login")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/feature-flags", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.status === 403 || res.status === 401) {
        router.push("/")
        return
      }
      const data = await res.json()
      if (Array.isArray(data?.flags)) setFlags(data.flags)
    } catch {
      setError("Não foi possível carregar o painel.")
    } finally {
      setLoading(false)
    }
  }, [token, router])

  useEffect(() => {
    void load()
  }, [load])

  async function toggle(flag: Flag) {
    const next = !flag.is_enabled
    setSavingKey(flag.flag_key)
    setError("")
    // otimista
    setFlags((prev) => prev.map((f) => (f.flag_key === flag.flag_key ? { ...f, is_enabled: next } : f)))
    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(flag.flag_key)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: next }),
      })
      if (!res.ok) throw new Error()
      setSavedKey(flag.flag_key)
      setTimeout(() => setSavedKey((k) => (k === flag.flag_key ? null : k)), 1800)
    } catch {
      // reverte
      setFlags((prev) => prev.map((f) => (f.flag_key === flag.flag_key ? { ...f, is_enabled: flag.is_enabled } : f)))
      setError("Falha ao salvar. Tente novamente.")
    } finally {
      setSavingKey(null)
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
            <Power className="h-4 w-4" /> sistema
          </p>
          <h1 className="fl-display text-5xl leading-[0.85] text-foreground md:text-6xl">Painel de Controle</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada chave liga ou desliga uma <strong>responsabilidade inteira</strong> da plataforma. Ao desligar, tudo aquilo
            some da interface (abas, seções, links, rotas) <strong>e</strong> as rotas do backend passam a recusar — mas os
            dados NÃO são apagados: religou, volta tudo. Pedidos/pagamentos já em andamento continuam liquidando.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>
        ) : flags.length === 0 ? (
          <div className="border-2 border-dashed border-foreground/20 py-16 text-center">
            <p className="fl-display text-2xl text-muted-foreground">Nenhuma chave</p>
            <p className="mt-1 text-sm text-muted-foreground">Ainda não há responsabilidades cadastradas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flags.map((flag) => {
              const busy = savingKey === flag.flag_key
              const saved = savedKey === flag.flag_key
              return (
                <section
                  key={flag.flag_key}
                  className={`border-2 border-[#0B0B0D] bg-[#1D1810] p-5 shadow-[4px_4px_0_0_#0B0B0D] transition ${
                    flag.is_enabled ? "" : "opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="fl-display flex items-center gap-2 text-xl text-[#F1EDE2]">
                        <ToggleRight className="h-5 w-5 shrink-0 text-[#F2B705]" />
                        {flag.label}
                        <span
                          className={`border-2 border-[#0B0B0D] px-1.5 text-[10px] font-black uppercase tracking-wide ${
                            flag.is_enabled ? "bg-[#16a34a] text-[#0B0B0D]" : "bg-[#dc2626] text-[#F1EDE2]"
                          }`}
                        >
                          {flag.is_enabled ? "Ligado" : "Desligado"}
                        </span>
                      </h2>
                      {flag.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-[#F1EDE2]/60">{flag.description}</p>
                      )}
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[#F1EDE2]/30">
                        {flag.flag_key}
                        {saved && <span className="ml-2 inline-flex items-center gap-1 text-[#16a34a]"><Check className="h-3 w-3" /> salvo</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {busy && <Loader2 className="h-4 w-4 animate-spin text-[#F1EDE2]/50" />}
                      <Toggle on={flag.is_enabled} disabled={busy} onClick={() => toggle(flag)} />
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-[#dc2626]">{error}</p>}
      </main>
    </div>
  )
}

function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`relative h-7 w-12 shrink-0 border-2 border-[#0B0B0D] transition disabled:cursor-not-allowed disabled:opacity-60 ${
        on ? "bg-[#F2B705]" : "bg-[#0E0B06]"
      }`}
    >
      <span className={`absolute top-0.5 h-5 w-5 bg-[#F1EDE2] transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  )
}
