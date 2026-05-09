"use client"

import { X, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import type { ProfileService } from "./types"

interface ServiceSelectionModalProps {
  open: boolean
  onClose: () => void
  services: ProfileService[]
  dateISO: string
  startTime: string
  onConfirm: (serviceId: number, clientData: { name: string; email: string; whatsapp: string }) => Promise<void>
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
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (lockedServiceId != null) {
      setSelectedId(lockedServiceId)
    } else {
      setSelectedId(null)
    }
    setName("")
    setEmail("")
    setWhatsapp("")
  }, [open, lockedServiceId])

  if (!open) return null

  const dateLabel = new Date(dateISO + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  })

  const activeServices = services.filter(s => s.is_active !== false)
  const selected = activeServices.find(s => s.id_profile_service === selectedId) || null

  async function handleConfirm() {
    if (!selectedId) { setError("Escolha um serviço"); return }
    if (!name.trim() || !email.trim()) { setError("Preencha nome e e-mail"); return }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(selectedId, { name: name.trim(), email: email.trim(), whatsapp: whatsapp.trim() })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao agendar")
    } finally {
      setSubmitting(false)
    }
  }

  const isLocked = lockedServiceId != null

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
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Seus dados</label>
              <input
                type="text" placeholder="Nome completo" value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 outline-none"
              />
              <input
                type="email" placeholder="E-mail" value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 outline-none"
              />
              <input
                type="text" placeholder="WhatsApp (opcional)" value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-400 outline-none"
              />
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
            <button onClick={handleConfirm} disabled={!selectedId || submitting}
              className="flex items-center gap-2 px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Escolher e pagar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
