"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MessageSquarePlus, X, ArrowRight, Check, Briefcase, Package, GraduationCap } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"

export type ChamadoMode = "service" | "product" | "course"

type Machine = {
  id_machine: number
  name: string
  color_accent?: string | null
}

type Profession = {
  id_category: number
  desc_category: string
}

type ProductCategory = {
  id_product_category: number
  name: string
}

type Step =
  | "machine"        // service / course
  | "profession"     // service / course
  | "productCat"     // product
  | "compose"
  | "success"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Modo do chamado. Default: service. */
  mode?: ChamadoMode
  /** Para modos service/course — pula o picker de Enxame se setado. */
  defaultMachineId?: number | null
}

const MODE_LABELS: Record<ChamadoMode, { title: string; verb: string; description: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  service: { title: "Abrir chamado de serviço", verb: "profissionais", description: "responderão pela aba O.S. das suas mensagens", icon: Briefcase },
  product: { title: "Abrir chamado de produto", verb: "vendedores", description: "responderão pela aba O.S. das suas mensagens", icon: Package },
  course:  { title: "Abrir chamado de curso", verb: "instrutores", description: "responderão pela aba O.S. das suas mensagens", icon: GraduationCap },
}

export function OpenChamadoModal({ open, onOpenChange, mode = "service", defaultMachineId }: Props) {
  // ---------- estado base ----------
  const initialStep: Step = useMemo(() => {
    if (mode === "product") return "productCat"
    return defaultMachineId ? "profession" : "machine"
  }, [mode, defaultMachineId])

  const [step, setStep] = useState<Step>(initialStep)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // service/course
  const [machines, setMachines] = useState<Machine[]>([])
  const [professions, setProfessions] = useState<Profession[]>([])
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(defaultMachineId ?? null)
  const [selectedProfessionId, setSelectedProfessionId] = useState<number | null>(null)
  const [estadoUf, setEstadoUf] = useState<string>("")
  const [municipio, setMunicipio] = useState<string>("")
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [loadingProfessions, setLoadingProfessions] = useState(false)
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)

  // product
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [selectedProductCategoryId, setSelectedProductCategoryId] = useState<number | null>(null)
  const [loadingProductCategories, setLoadingProductCategories] = useState(false)
  const [productTitle, setProductTitle] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")

  // shared
  const [description, setDescription] = useState("")

  // ---------- reset ao abrir/mudar mode ----------
  useEffect(() => {
    if (!open) return
    setStep(initialStep)
    setError(null)
    setSending(false)
    setDescription("")
    setProductTitle("")
    setMinPrice("")
    setMaxPrice("")
    setSelectedProfessionId(null)
    setSelectedProductCategoryId(null)
    setEstadoUf("")
    setMunicipio("")
    setMunicipios([])
    setSelectedMachineId(defaultMachineId ?? null)
  }, [open, initialStep, defaultMachineId])

  // ---------- carregamento ----------
  useEffect(() => {
    if (!open) return
    if (mode === "product") return
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
  }, [open, mode, machines.length])

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

  useEffect(() => {
    if (!open || mode !== "product") return
    if (productCategories.length > 0) return
    setLoadingProductCategories(true)
    fetch("/api/product-categories")
      .then((r) => r.json())
      .then((d) => {
        const list: ProductCategory[] = Array.isArray(d) ? d : d.items ?? d.categories ?? []
        setProductCategories(list)
      })
      .catch(() => setProductCategories([]))
      .finally(() => setLoadingProductCategories(false))
  }, [open, mode, productCategories.length])

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

  // ---------- derived ----------
  const selectedMachine = useMemo(
    () => machines.find((m) => m.id_machine === selectedMachineId) || null,
    [machines, selectedMachineId],
  )
  const selectedProfession = useMemo(
    () => professions.find((p) => p.id_category === selectedProfessionId) || null,
    [professions, selectedProfessionId],
  )
  const selectedProductCategory = useMemo(
    () => productCategories.find((p) => p.id_product_category === selectedProductCategoryId) || null,
    [productCategories, selectedProductCategoryId],
  )

  const trimmedMachine = (selectedMachine?.name || "").replace(/^Enxame de\s+/i, "")
  const accent = selectedMachine?.color_accent || "#fbbf24"
  const ModeIcon = MODE_LABELS[mode].icon

  const cityLine = municipio
    ? municipio + (estadoUf ? `/${estadoUf}` : "")
    : estadoUf
      ? estadoUf
      : null

  // ---------- envio ----------
  const handleSend = async () => {
    const desc = description.trim()
    if (desc.length < 5) {
      setError("Descreva com pelo menos 5 caracteres.")
      return
    }
    const token = getToken()
    if (!token) {
      setError("Faça login para abrir um chamado.")
      return
    }

    let endpoint = ""
    let payload: Record<string, unknown> = {}
    const isMultipart = false

    if (mode === "service") {
      if (!selectedMachineId || !selectedProfessionId) {
        setError("Escolha Enxame e profissão.")
        return
      }
      endpoint = "/api/service-requests"
      payload = {
        id_machine: selectedMachineId,
        id_category: selectedProfessionId,
        description: desc,
      }
      if (estadoUf) payload.estado = estadoUf
      if (municipio) payload.municipio = municipio
    } else if (mode === "course") {
      if (!selectedMachineId || !selectedProfessionId) {
        setError("Escolha Enxame e profissão.")
        return
      }
      endpoint = "/api/course-requests"
      payload = {
        id_machine: selectedMachineId,
        id_category: selectedProfessionId,
        description: desc,
      }
    } else {
      // product
      const title = productTitle.trim()
      if (title.length < 3) {
        setError("Título obrigatório (mín. 3 caracteres).")
        return
      }
      if (!selectedProductCategoryId) {
        setError("Escolha uma categoria de produto.")
        return
      }
      if (!estadoUf || !municipio) {
        setError("Estado e cidade são obrigatórios para produto.")
        return
      }
      endpoint = "/api/product-requests"
      payload = {
        title,
        description: desc,
        id_product_category: selectedProductCategoryId,
        state: estadoUf,
        city: municipio,
      }
      if (minPrice) {
        const n = Math.round(Number(minPrice) * 100)
        if (Number.isFinite(n)) payload.min_price_cents = n
      }
      if (maxPrice) {
        const n = Math.round(Number(maxPrice) * 100)
        if (Number.isFinite(n)) payload.max_price_cents = n
      }
    }

    setSending(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: isMultipart
          ? { Authorization: `Bearer ${token}` }
          : { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  // ---------- textos por mode ----------
  const composeIntroNode = (() => {
    if (mode === "service") {
      return (
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
          Profissionais de <strong className="text-white">{selectedProfession?.desc_category}</strong> no enxame{" "}
          <strong className="text-white">{trimmedMachine}</strong>
          {cityLine ? <> em <strong className="text-white">{cityLine}</strong></> : null} receberão sua mensagem
          e responderão pela aba <strong className="text-white">O.S.</strong>
        </p>
      )
    }
    if (mode === "course") {
      return (
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
          Instrutores de <strong className="text-white">{selectedProfession?.desc_category}</strong> no enxame{" "}
          <strong className="text-white">{trimmedMachine}</strong> que já têm curso publicado receberão sua mensagem
          e responderão pela aba <strong className="text-white">O.S.</strong>
        </p>
      )
    }
    return (
      <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
        Vendedores da loja de <strong className="text-white">{selectedProductCategory?.name}</strong>
        {cityLine ? <> em <strong className="text-white">{cityLine}</strong></> : null} receberão seu pedido
        e responderão pela aba <strong className="text-white">O.S.</strong>
      </p>
    )
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="border-white/10 bg-zinc-950 p-0 sm:max-w-[480px]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2">
            <ModeIcon className="h-4 w-4" style={{ color: accent }} />
            <DialogTitle className="text-sm font-semibold tracking-tight text-white">
              {MODE_LABELS[mode].title}
            </DialogTitle>
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

        {/* ---------- step: machine (service/course) ---------- */}
        {step === "machine" && (
          <div className="px-5 py-5">
            <p className="text-sm text-white/75">Escolha o Enxame que vai receber sua mensagem:</p>
            {loadingMachines ? (
              <div className="mt-6 flex items-center justify-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : machines.length === 0 ? (
              <p className="mt-4 text-xs text-white/45">Nenhum enxame disponível.</p>
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

        {/* ---------- step: profession (service/course) ---------- */}
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

        {/* ---------- step: productCat ---------- */}
        {step === "productCat" && (
          <div className="px-5 py-5">
            <p className="text-sm text-white/75">Escolha a categoria do produto:</p>
            {loadingProductCategories ? (
              <div className="mt-6 flex items-center justify-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : productCategories.length === 0 ? (
              <p className="mt-4 text-xs text-white/45">Nenhuma categoria de produto disponível.</p>
            ) : (
              <div className="mt-4 grid max-h-[50vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {productCategories.map((p) => {
                  const isActive = selectedProductCategoryId === p.id_product_category
                  return (
                    <button
                      key={p.id_product_category}
                      type="button"
                      onClick={() => setSelectedProductCategoryId(p.id_product_category)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition",
                        isActive
                          ? "border-white/30 bg-white/[0.06] text-white"
                          : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:text-white",
                      )}
                      style={isActive ? { borderColor: `${accent}88` } : undefined}
                    >
                      <span className="truncate font-medium">{p.name}</span>
                      {isActive && <Check className="h-4 w-4 shrink-0" style={{ color: accent }} />}
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
                onClick={() => setStep("compose")}
                disabled={!selectedProductCategoryId}
                className="bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              >
                Continuar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ---------- step: compose ---------- */}
        {step === "compose" && (
          <div className="px-5 py-5">
            {/* Resumo do escopo */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {mode !== "product" ? (
                  <>
                    <span className="text-white/45">Enxame</span>
                    <span className="font-semibold tracking-tight" style={{ color: accent }}>{trimmedMachine}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-white/45">Profissão</span>
                    <span className="font-semibold tracking-tight text-white">{selectedProfession?.desc_category}</span>
                  </>
                ) : (
                  <>
                    <span className="text-white/45">Categoria</span>
                    <span className="font-semibold tracking-tight text-white">{selectedProductCategory?.name}</span>
                  </>
                )}
                {cityLine && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-white/45">Local</span>
                    <span className="font-semibold tracking-tight text-white">{cityLine}</span>
                  </>
                )}
              </div>
            </div>
            {composeIntroNode}

            {/* Campo título — só product */}
            {mode === "product" && (
              <>
                <label className="mt-4 mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                  Título do produto
                </label>
                <input
                  type="text"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  placeholder="Ex: Tênis de corrida número 42"
                  maxLength={160}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/40 focus:outline-none"
                />
              </>
            )}

            {/* Estado + Município */}
            {mode !== "course" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                    Estado {mode === "product" ? <span className="normal-case text-red-400">*</span> : <span className="normal-case text-white/30">(opcional)</span>}
                  </label>
                  <select
                    value={estadoUf}
                    onChange={(e) => { setEstadoUf(e.target.value); setMunicipio("") }}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 text-sm text-white focus:border-yellow-400/40 focus:outline-none"
                  >
                    <option value="">{mode === "product" ? "Escolha" : "Todos"}</option>
                    {ESTADOS_BRASIL.map((e) => (
                      <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                    Cidade {mode === "product" ? <span className="normal-case text-red-400">*</span> : <span className="normal-case text-white/30">(opcional)</span>}
                  </label>
                  <select
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    disabled={!estadoUf || loadingMunicipios}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-2 text-sm text-white focus:border-yellow-400/40 focus:outline-none disabled:opacity-40"
                  >
                    <option value="">{!estadoUf ? "Escolha estado" : loadingMunicipios ? "Carregando…" : (mode === "product" ? "Escolha" : "Todas")}</option>
                    {municipios.map((m) => (
                      <option key={m.id} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Faixa de preço — só product */}
            {mode === "product" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                    Preço mínimo <span className="normal-case text-white/30">(R$, opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0,00"
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                    Preço máximo <span className="normal-case text-white/30">(R$, opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="0,00"
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/40 focus:outline-none"
                  />
                </div>
              </div>
            )}

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
              <Button
                variant="ghost"
                onClick={() => setStep(mode === "product" ? "productCat" : "profession")}
                disabled={sending}
              >
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

        {/* ---------- step: success ---------- */}
        {step === "success" && (
          <div className="px-5 py-7 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: `${accent}22`, borderColor: `${accent}55`, borderWidth: 1 }}
            >
              <Check className="h-6 w-6" style={{ color: accent }} />
            </div>
            <p className="mt-3 text-base font-semibold tracking-tight text-white">Chamado aberto!</p>
            <p className="mt-1 text-sm text-white/65">
              Os {MODE_LABELS[mode].verb} compatíveis receberão sua mensagem no mural.
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
