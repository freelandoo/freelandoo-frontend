"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MessageSquarePlus, X, ArrowRight, Check } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

type Machine = {
  id_machine: number
  name: string
  color_accent?: string | null
}

type Step = "picker" | "confirm" | "compose" | "success"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMachineId: number | null
  machines?: Machine[]
}

export function OpenChamadoModal({ open, onOpenChange, defaultMachineId, machines: machinesProp }: Props) {
  const [machines, setMachines] = useState<Machine[]>(machinesProp || [])
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(defaultMachineId)
  const [step, setStep] = useState<Step>(defaultMachineId ? "confirm" : "picker")
  const [description, setDescription] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedId(defaultMachineId)
    setStep(defaultMachineId ? "confirm" : "picker")
    setDescription("")
    setError(null)
  }, [open, defaultMachineId])

  useEffect(() => {
    if (!open) return
    if (machines.length > 0) return
    setLoadingMachines(true)
    fetch("/api/enxames")
      .then((r) => r.json())
      .then((d) => {
        const list: Machine[] = Array.isArray(d) ? d : d.enxames ?? d.machines ?? []
        setMachines(list)
      })
      .catch(() => setMachines([]))
      .finally(() => setLoadingMachines(false))
  }, [open, machines.length])

  const selectedMachine = useMemo(
    () => machines.find((m) => m.id_machine === selectedId) || null,
    [machines, selectedId],
  )

  const trimmedName = (selectedMachine?.name || "").replace(/^Enxame de\s+/i, "")
  const accent = selectedMachine?.color_accent || "#fbbf24"

  const handleSend = async () => {
    const desc = description.trim()
    if (!selectedId || desc.length < 5) {
      setError("Descreva com pelo menos 5 caracteres.")
      return
    }
    const token = getToken()
    if (!token) {
      setError("Faça login para abrir um chamado.")
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_machine: selectedId, description: desc }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Falha ${res.status}`)
      }
      setStep("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir chamado")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 p-0 sm:max-w-[480px]">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" style={{ color: accent }} />
            <DialogTitle className="text-sm font-semibold text-white">Abrir chamado</DialogTitle>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "picker" && (
          <div className="px-5 py-5">
            <p className="text-sm text-white/75">Escolha o Enxame que vai receber sua mensagem:</p>
            {loadingMachines ? (
              <div className="mt-6 flex items-center justify-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="mt-4 grid max-h-[50vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {machines.map((m) => {
                  const isActive = selectedId === m.id_machine
                  return (
                    <button
                      key={m.id_machine}
                      type="button"
                      onClick={() => setSelectedId(m.id_machine)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition",
                        isActive
                          ? "border-white/30 bg-white/[0.06] text-white"
                          : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:text-white",
                      )}
                      style={isActive ? { borderColor: `${m.color_accent || "#fbbf24"}88` } : undefined}
                    >
                      <span className="truncate font-medium">
                        {m.name.replace(/^Enxame de\s+/i, "")}
                      </span>
                      {isActive && <Check className="h-4 w-4 shrink-0" style={{ color: m.color_accent || "#fbbf24" }} />}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                disabled={!selectedId}
                className="bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              >
                Continuar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="px-5 py-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Enxame</p>
              <p className="mt-1 text-base font-semibold text-white" style={{ color: accent }}>
                {trimmedName}
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Todos os profissionais do enxame <strong className="text-white">{trimmedName}</strong> receberão sua mensagem
              e entrarão em contato pela aba <strong className="text-white">O.S.</strong> das suas mensagens.
            </p>
            <p className="mt-2 text-xs text-white/50">
              Confirme para escrever a mensagem do chamado.
            </p>
            <div className="mt-5 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => (defaultMachineId ? onOpenChange(false) : setStep("picker"))}>
                {defaultMachineId ? "Cancelar" : "Voltar"}
              </Button>
              <Button onClick={() => setStep("compose")} className="bg-yellow-400 text-zinc-950 hover:bg-yellow-300">
                Confirmar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "compose" && (
          <div className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
              Mensagem para <span style={{ color: accent }}>{trimmedName}</span>
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que você precisa…"
              rows={6}
              maxLength={4000}
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/40 focus:outline-none"
              autoFocus
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
              <span>Mínimo 5 caracteres.</span>
              <span>{description.length}/4000</span>
            </div>
            {error && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
            )}
            <div className="mt-5 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("confirm")} disabled={sending}>
                Voltar
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || description.trim().length < 5}
                className="bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  "Enviar chamado"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="px-5 py-7 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: `${accent}22`, borderColor: `${accent}55`, borderWidth: 1 }}
            >
              <Check className="h-6 w-6" style={{ color: accent }} />
            </div>
            <p className="mt-3 text-base font-semibold text-white">Chamado aberto!</p>
            <p className="mt-1 text-sm text-white/65">
              Os profissionais do enxame <strong className="text-white">{trimmedName}</strong> receberão sua mensagem.
              As respostas chegam em <strong className="text-white">Mensagens → O.S.</strong>
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-5 bg-yellow-400 text-zinc-950 hover:bg-yellow-300">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
