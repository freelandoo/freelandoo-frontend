"use client"

// Admin (trilha E19): EVENTOS do Meu Mundo. Ligado = toda luta, minijogo e Domínio validado paga a
// ficha de evento (minutos ativos ÷ 2 + 1 se venceu) e a loja do evento abre dentro da Loja. Com
// duração, desliga sozinho no prazo; sem duração, fica até desligar aqui. Desligado, as fichas ficam
// guardadas para o próximo. Pele tabloide utilitária (admin interno: sem i18n).

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { PageBackLink } from "@/components/tabloide/PageBackLink"
import { getEventConfig, saveEventConfig, type EventConfig } from "@/features/meu-mundo/data"

const isAdmin = (user: ReturnType<typeof useAuth>["user"]): boolean => {
  const u = user as unknown as { is_admin?: boolean; roles?: { desc_role: string }[] }
  return !!(u?.is_admin || u?.roles?.some((r) => r.desc_role === "Administrator"))
}

export default function AdminMeuMundoEventosPage() {
  const router = useRouter()
  const { user, status } = useAuth()
  const [cfg, setCfg] = useState<EventConfig | null>(null)
  const [hours, setHours] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const r = await getEventConfig(token)
    if (!r.ok) return setError(r.error)
    setCfg(r.data)
  }, [])

  useEffect(() => {
    if (status === "loading") return
    if (status !== "authenticated" || !isAdmin(user)) {
      router.replace("/")
      return
    }
    void load()
  }, [status, user, router, load])

  const toggle = async (id: string, active: boolean) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    setError(null)
    const h = hours[id]?.trim()
    const r = await saveEventConfig(token, id, active, active && h ? Number(h.replace(",", ".")) : null)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    setCfg(r.data)
  }

  if (!cfg) return <div className="fl-root fl-paper-texture min-h-[100dvh]">{error && <p className="p-8 text-sm text-red-200">{error}</p>}</div>

  return (
    <div className="fl-root fl-paper-texture min-h-[100dvh] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <PageBackLink href="/admin" className="mb-5" />
        <header className="mb-6 border-b-2 border-[#F1EDE2]/12 pb-4">
          <h1 className="fl-display text-4xl leading-none text-[#F2B705]">Meu Mundo · eventos</h1>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#a89f8d]">Ligado: toda atividade paga ficha de evento e a loja do evento abre</p>
        </header>

        {error && <div className="mb-4 border-2 border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</div>}

        <section className="space-y-3">
          {cfg.events.map((e) => (
            <div key={e.id} className="border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-[family-name:var(--font-anton)] text-lg uppercase leading-none">{e.name}</div>
                  <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.06em] text-[#6B6457]">
                    {e.open ? "ligado" : e.active ? "ligado, mas o prazo acabou" : "desligado"}
                    {e.endsAt ? ` · até ${new Date(e.endsAt).toLocaleString("pt-BR")}` : e.active ? " · sem prazo" : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  {!e.open && (
                    <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#6B6457]">
                      Duração (horas, vazio = sem prazo)
                      <input inputMode="decimal" value={hours[e.id] ?? ""} onChange={(ev) => setHours({ ...hours, [e.id]: ev.target.value })} className="w-40 border-2 border-[#0B0B0D] bg-white px-2 py-1.5 text-base text-[#0B0B0D]" />
                    </label>
                  )}
                  <button type="button" disabled={busy} onClick={() => void toggle(e.id, !e.open)} className="fl-btn-gold px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] disabled:opacity-60">
                    {busy ? "Gravando…" : e.open ? "Desligar" : "Ligar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
