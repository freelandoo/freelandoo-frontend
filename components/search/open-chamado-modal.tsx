"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MessageSquarePlus, X, ArrowRight, Check } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"

type Machine = {
  id_machine: number
  name: string
  color_accent?: string | null
}

type Profession = {
  id_category: number
  desc_category: string
}

type Step = "machine" | "profession" | "compose" | "success"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMachineId: number | null
}

export function OpenChamadoModal({ open, onOpenChange, defaultMachineId }: Props) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [professions, setProfessions] = useState<Profession[]>([])
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [loadingProfessions, setLoadingProfessions] = useState(false)
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)

  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(defaultMachineId)
  const [selectedProfessionId, setSelectedProfessionId] = useState<number | null>(null)
  const [estadoUf, setEstadoUf] = useState<string>("")
  const [municipio, setMunicipio] = useState<string>("")
  const [description, setDescription] = useState("")

  const [step, setStep] = useState<Step>(defaultMachineId ? "profession" : "machine")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset ao abrir
  useEffect(() => {
    if (!open) return
    setSelectedMachineId(defaultMachineId)
    setSelectedProfessionId(null)
    setEstadoUf("")
    setMunicipio("")
    setMunicipios([])
    setDescription("")
    setError(null)
    setStep(defaultMachineId ? "profession" : "machine")
  }, [open, defaultMachineId])

  // Carrega lista de enxames
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

  // Carrega profissões quando entrar no step "profession"
  useEffect(() => {
    if (step !== "profession" || !selectedMachineId) return
    setLoadingProfessions(true)
    setProfessions([])
    fetch(`/api/enxames/${selectedMachineId}/categories`)
      .then((r) => r.json())
      .then((d) => {
        const list: Profession[] = Array.isArray(d) ? d : d.categories ?? []
        setProfessions(list)
      })
      .catch(() => setProfessions([]))
      .finally(() => setLoadingProfessions(false))
  }, [step, selectedMachineId])

  // Carrega municípios do estado escolhido
  useEffect(() => {
    if (!estadoUf) {
      setMunicipios([])
      return
    }
    const est = ESTADOS_BRASIL.find((e) => e.uf === estadoUf)
    if (!est) return
    setLoadingMunicipios(true)
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${est.id}/municipios`)
      .then((r) => r.json())
      .then((d) => setMunicipios(d.map((m: { id: number; nome: string }) => ({ id: m.id, nome: m.nome }))))
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMunicipios(false))
  }, [estadoUf])

  const selectedMachine = useMemo(
    () => machines.find((m) => m.id_machine === selectedMachineId) || null,
    [machines, selectedMachineId],
  )
  const selectedProfession = useMemo(
    () => professions.find((p) => p.id_category === selectedProfessionId) || null,
    [professions, selectedProfessionId],
  )

  const trimmedMachine = (selectedMachine?.name || "").replace(/^Enxame de\s+/i, "")
  const accent = selectedMachine?.color_accent || "#fbbf24"

  const handleSend = async () => {
    const desc = description.trim()
    if (!selectedMachineId || !selectedProfessionId) {
      setError("Escolha Enxame e profissão.")
      return
    }
    if (desc.length < 5) {
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
      const payload: Record<string, unknown> = {
        id_machine: selectedMachineId,
        id_category: selectedProfessionId,
        description: desc,
      }
      if (estadoUf) payload.estado = estadoUf
      if (municipio) payload.municipio = municipio
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
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

  const cityLine = municipio
    ? municipio + (estadoUf ? `/${estadoUf}` : "")
    : estadoUf
      ? estadoUf
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="border-white/10 bg-zinc-950 p-0 sm:max-w-[480px]">
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

        {step === "machine" && (
          <div className="px-5 py-5">
            <p className="text-sm text-white/75">Escolha o Enxame que vai receber sua mensagem:</p>
            {loadingMachines ? (
              <div className="mt-6 flex items-center justify-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="mt-4 grid max-h-[50vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {machines.map((m) => {
                  const isActive = selectedMachineId === m.id_machine
                  return (
                    <button
                      key={m.id_machine}
                      type="button"
                      onClick={() => setSelectedMachineId(m.id_machine)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition",
                        isActive
                          ? "border-white/30 bg-white/[0.06] text-white"
                          : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:text-white",
                      )}
                      style={isActive ? { borderColor: `${m.color_accent || "#fbbf24"}88` } : undefined}
                    >
                      <span className="truncate font-medium">{m.name.replace(/^Enxame de\s+/i, "")}</span>
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
                onClick={() => setStep("profession")}
                disabled={!selectedMachineId}
                className="bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              >
                Continuar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "profession" && (
          <div className="px-5 py-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Enxame</p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: accent }}>
                {trimmedMachine}
              </p>
            </div>
            <p className="mt-4 text-sm text-white/75">Escolha a profissão dentro do enxame:</p>
            {loadingProfessions ? (
              <div className="mt-6 flex items-center justify-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : professions.length === 0 ? (
              <p className="mt-4 text-xs text-white/45">Nenhuma profissão cadastrada neste enxame.</p>
            ) : (
              <div className="mt-3 grid max-h-[40vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {professions.map((p) => {
                  const isActive = selectedProfessionId === p.id_category
                  return (
                    <button
                      key={p.id_category}
                      type="button"
                      onClick={() => setSelectedProfessionId(p.id_category)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-[12.5px] transition",
                        isActive
                          ? "border-white/30 bg-white/[0.06] text-white"
                          : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:text-white",
                      )}
                      style={isActive ? { borderColor: `${accent}88` } : undefined}
                    >
                      <span className="truncate">{p.desc_category}</span>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => (defaultMachineId ? onOpenChange(false) : setStep("machine"))}
              >
                {defaultMachineId ? "Cancelar" : "Voltar"}
              </Button>
              <Button
                onClick={() => setStep("compose")}
                disabled={!selectedProfessionId}
                className="bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              >
                Continuar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "compose" && (
          <div className="px-5 py-5">
            {/* Resumo + aviso de confirmação */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-white/45">Enxame</span>
                <span className="font-semibold" style={{ color: accent }}>{trimmedMachine}</span>
                <span className="text-white/20">·</span>
                <span className="text-white/45">Profissão</span>
                <span className="font-semibold text-white">{selectedProfession?.desc_category}</span>
                {cityLine && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-white/45">Local</span>
                    <span className="font-semibold text-white">{cityLine}</span>
                  </>
                )}
              </div>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
              Todos os profissionais de <strong className="text-white">{selectedProfession?.desc_category}</strong>{" "}
              no enxame <strong className="text-white">{trimmedMachine}</strong>
              {cityLine ? <> em <strong className="text-white">{cityLine}</strong></> : null} receberão
              sua mensagem e responderão pela aba <strong className="text-white">O.S.</strong> das suas mensagens.
            </p>

            {/* Estado + Município (opcional) */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                  Estado <span className="normal-case text-white/30">(opcional)</span>
                </label>
                <select
                  value={estadoUf}
                  onChange={(e) => { setEstadoUf(e.target.value); setMunicipio("") }}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 text-sm text-white focus:border-yellow-400/40 focus:outline-none"
                >
                  <option value="">Todos</option>
                  {ESTADOS_BRASIL.map((e) => (
                    <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                  Cidade <span className="normal-case text-white/30">(opcional)</span>
                </label>
                <select
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  disabled={!estadoUf || loadingMunicipios}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 text-sm text-white focus:border-yellow-400/40 focus:outline-none disabled:opacity-40"
                >
                  <option value="">{!estadoUf ? "Escolha estado" : loadingMunicipios ? "Carregando…" : "Todas"}</option>
                  {municipios.map((m) => (
                    <option key={m.id} value={m.nome}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <label className="mt-4 mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
              Mensagem do chamado
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que você precisa…"
              rows={5}
              maxLength={4000}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/40 focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
              <span>Mínimo 5 caracteres.</span>
              <span>{description.length}/4000</span>
            </div>
            {error && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
            )}

            <div className="mt-5 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("profession")} disabled={sending}>
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
              Os profissionais de <strong className="text-white">{selectedProfession?.desc_category}</strong> no enxame{" "}
              <strong className="text-white">{trimmedMachine}</strong>
              {cityLine ? <> em <strong className="text-white">{cityLine}</strong></> : null}{" "}
              receberão sua mensagem no mural. As respostas chegam em{" "}
              <strong className="text-white">Mensagens → O.S.</strong>
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
