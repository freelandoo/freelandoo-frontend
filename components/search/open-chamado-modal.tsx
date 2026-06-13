"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, X, ArrowLeft, Check, Briefcase, Package, GraduationCap } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { useActionConsent } from "@/hooks/use-action-consent"
import {
  COLOR_SWATCHES,
  getAttributeSchema,
  rangeValues,
  type AttrField,
} from "@/lib/product-attributes"

export type ChamadoMode = "service" | "product" | "course"

type Machine = {
  id_machine: number
  name: string
  slug?: string | null
  color_accent?: string | null
}

type Profession = {
  id_category: number
  desc_category: string
}

type ProductCategory = {
  id_product_category: number
  name: string
  slug?: string | null
}

type Step =
  | "machine"        // service / course
  | "profession"     // service / course
  | "productCat"     // product
  | "productAttrs"   // product — subfiltros da categoria (mesmo schema do FilterRail)
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

// Chaves i18n por modo (namespace "Chamado"); os fallbacks pt vivem nos pontos de uso.
const MODE_LABELS: Record<ChamadoMode, { titleKey: string; titlePt: string; verbKey: string; verbPt: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  service: { titleKey: "titleService", titlePt: "Abrir chamado de serviço", verbKey: "verbService", verbPt: "profissionais", icon: Briefcase },
  product: { titleKey: "titleProduct", titlePt: "Abrir chamado de produto", verbKey: "verbProduct", verbPt: "vendedores", icon: Package },
  course:  { titleKey: "titleCourse", titlePt: "Abrir chamado de curso", verbKey: "verbCourse", verbPt: "instrutores", icon: GraduationCap },
}

/** Renderiza um template "… {x} …" com os valores em <strong>. */
function renderTemplate(template: string, values: Record<string, React.ReactNode>) {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const m = part.match(/^\{(\w+)\}$/)
    if (m) return <strong key={i} className="text-white">{values[m[1]] ?? ""}</strong>
    return <span key={i}>{part}</span>
  })
}

export function OpenChamadoModal({ open, onOpenChange, mode = "service", defaultMachineId }: Props) {
  const t = useTranslations("Chamado")
  const tx = useTaxonomy()
  const { ensureConsent } = useActionConsent()
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
  // Subfiltros da categoria (igual ao drill-in do FilterRail): chave → valores
  // marcados. Valores ficam em pt (mesma regra da querystring attr_*).
  const [attrSel, setAttrSel] = useState<Record<string, string[]>>({})
  const [brandSel, setBrandSel] = useState("")

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
    setAttrSel({})
    setBrandSel("")
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

  // Schema de subfiltros da categoria selecionada (mesma fonte do FilterRail).
  const productSchema = useMemo(
    () => getAttributeSchema(selectedProductCategory?.slug),
    [selectedProductCategory?.slug],
  )

  /** Atributos efetivos pro payload/resumo: chips/cores marcados + marca. */
  const pickedAttributes = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const [key, vals] of Object.entries(attrSel)) {
      if (vals.length > 0) out[key] = vals
    }
    if (brandSel.trim()) out.brand = [brandSel.trim()]
    return out
  }, [attrSel, brandSel])

  const toggleAttr = (key: string, option: string) => {
    setAttrSel((prev) => {
      const cur = prev[key] ?? []
      const next = cur.includes(option) ? cur.filter((v) => v !== option) : [...cur, option]
      const out = { ...prev }
      if (next.length === 0) delete out[key]
      else out[key] = next
      return out
    })
  }

  const trimmedMachine = selectedMachine ? tx.enxame(selectedMachine.slug, selectedMachine.name) : ""
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
      setError(t("errMinDescription", "Descreva com pelo menos 5 caracteres."))
      return
    }
    const token = getToken()
    if (!token) {
      setError(t("errLoginRequired", "Faça login para abrir um chamado."))
      return
    }
    if (!(await ensureConsent("purchase"))) return

    let endpoint = ""
    let payload: Record<string, unknown> = {}
    const isMultipart = false

    if (mode === "service") {
      if (!selectedMachineId || !selectedProfessionId) {
        setError(t("errChooseMachineProfession", "Escolha Enxame e profissão."))
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
        setError(t("errChooseMachineProfession", "Escolha Enxame e profissão."))
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
        setError(t("errTitleRequired", "Título obrigatório (mín. 3 caracteres)."))
        return
      }
      if (!selectedProductCategoryId) {
        setError(t("errChooseProductCategory", "Escolha uma categoria de produto."))
        return
      }
      endpoint = "/api/product-requests"
      payload = {
        title,
        description: desc,
        id_product_category: selectedProductCategoryId,
      }
      if (Object.keys(pickedAttributes).length > 0) payload.attributes = pickedAttributes
      // Local opcional: quando informado, restringe o matching à cidade/UF;
      // ausência = pedido nacional (qualquer vendedor elegível responde).
      if (estadoUf) payload.state = estadoUf
      if (municipio) payload.city = municipio
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
      setError(err instanceof Error ? err.message : t("errOpenFailed", "Erro ao abrir chamado"))
    } finally {
      setSending(false)
    }
  }

  // ---------- textos por mode ----------
  const professionName = tx.profession(selectedProfession?.desc_category)
  const productCategoryName = tx.productCategory(null, selectedProductCategory?.name)
  const composeIntroNode = (() => {
    if (mode === "service") {
      const template = cityLine
        ? t("introServiceCity", "Profissionais de {profession} no enxame {machine} em {city} receberão sua mensagem e responderão pela aba {os}")
        : t("introService", "Profissionais de {profession} no enxame {machine} receberão sua mensagem e responderão pela aba {os}")
      return (
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
          {renderTemplate(template, { profession: professionName, machine: trimmedMachine, city: cityLine, os: "O.S." })}
        </p>
      )
    }
    if (mode === "course") {
      return (
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
          {renderTemplate(
            t("introCourse", "Instrutores de {profession} no enxame {machine} que já têm curso publicado receberão sua mensagem e responderão pela aba {os}"),
            { profession: professionName, machine: trimmedMachine, os: "O.S." }
          )}
        </p>
      )
    }
    const template = cityLine
      ? t("introProductCity", "Vendedores da loja de {category} em {city} receberão seu pedido e responderão pela aba {os}")
      : t("introProduct", "Vendedores da loja de {category} receberão seu pedido e responderão pela aba {os}")
    return (
      <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
        {renderTemplate(template, { category: productCategoryName, city: cityLine, os: "O.S." })}
      </p>
    )
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="!rounded-none border-2 border-white/15 bg-zinc-950 p-0 shadow-[6px_6px_0_0_rgba(0,0,0,0.6)] sm:max-w-[480px]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2">
            <ModeIcon className="h-4 w-4" style={{ color: accent }} />
            <DialogTitle className="text-sm font-semibold tracking-tight text-white">
              {t(MODE_LABELS[mode].titleKey, MODE_LABELS[mode].titlePt)}
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="border-2 border-white/15 p-1.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
            aria-label={t("close", "Fechar")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ---------- step: machine (service/course) ----------
            1 clique no enxame já avança pras profissões (sem "Continuar"). */}
        {step === "machine" && (
          <div className="px-5 py-5">
            <p className="text-sm text-white/75">{t("chooseMachine", "Escolha o Enxame que vai receber sua mensagem:")}</p>
            {loadingMachines ? (
              <div className="mt-6 flex items-center justify-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : machines.length === 0 ? (
              <p className="mt-4 text-xs text-white/45">{t("noMachines", "Nenhum enxame disponível.")}</p>
            ) : (
              <div className="mt-4 grid max-h-[50vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {machines.map((m) => {
                  const isActive = selectedMachineId === m.id_machine
                  return (
                    <button
                      key={m.id_machine}
                      type="button"
                      onClick={() => {
                        setSelectedMachineId(m.id_machine)
                        setSelectedProfessionId(null)
                        setStep("profession")
                      }}
                      className={cn(
                        "flex items-center justify-between gap-2 border-2 px-3 py-2.5 text-left text-[13px] transition",
                        isActive
                          ? "border-white/30 bg-white/[0.06] text-white"
                          : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:text-white",
                      )}
                      style={isActive ? { borderColor: `${m.color_accent || "#fbbf24"}88` } : undefined}
                    >
                      <span className="truncate font-medium">{tx.enxame(m.slug, m.name)}</span>
                      {isActive && <Check className="h-4 w-4 shrink-0" style={{ color: m.color_accent || "#fbbf24" }} />}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t("cancel", "Cancelar")}
              </Button>
            </div>
          </div>
        )}

        {/* ---------- step: profession (service/course) ----------
            1 clique na profissão já vai pro final (descrição + região). */}
        {step === "profession" && (
          <div className="px-5 py-5">
            <div className="flex items-center gap-2 border-2 border-white/15 bg-white/[0.03] p-3">
              {!defaultMachineId && (
                <button
                  type="button"
                  onClick={() => setStep("machine")}
                  aria-label={t("back", "Voltar")}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-white/25 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">{t("machineLabel", "Enxame")}</p>
                <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: accent }}>
                  {trimmedMachine}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/75">{t("chooseProfession", "Escolha a profissão dentro do enxame:")}</p>
            {loadingProfessions ? (
              <div className="mt-6 flex items-center justify-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : professions.length === 0 ? (
              <p className="mt-4 text-xs text-white/45">{t("noProfessions", "Nenhuma profissão cadastrada neste enxame.")}</p>
            ) : (
              <div className="mt-3 grid max-h-[40vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {professions.map((p) => {
                  const isActive = selectedProfessionId === p.id_category
                  return (
                    <button
                      key={p.id_category}
                      type="button"
                      onClick={() => {
                        setSelectedProfessionId(p.id_category)
                        setStep("compose")
                      }}
                      className={cn(
                        "flex items-center justify-between gap-2 border-2 px-3 py-2 text-left text-[12.5px] transition",
                        isActive
                          ? "border-white/30 bg-white/[0.06] text-white"
                          : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:text-white",
                      )}
                      style={isActive ? { borderColor: `${accent}88` } : undefined}
                    >
                      <span className="truncate">{tx.profession(p.desc_category)}</span>
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
                {defaultMachineId ? t("cancel", "Cancelar") : t("back", "Voltar")}
              </Button>
            </div>
          </div>
        )}

        {/* ---------- step: productCat ---------- */}
        {step === "productCat" && (
          <div className="px-5 py-5">
            <p className="text-sm text-white/75">{t("chooseProductCategory", "Escolha a categoria do produto:")}</p>
            {loadingProductCategories ? (
              <div className="mt-6 flex items-center justify-center text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : productCategories.length === 0 ? (
              <p className="mt-4 text-xs text-white/45">{t("noProductCategories", "Nenhuma categoria de produto disponível.")}</p>
            ) : (
              <div className="mt-4 grid max-h-[50vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {productCategories.map((p) => {
                  const isActive = selectedProductCategoryId === p.id_product_category
                  return (
                    <button
                      key={p.id_product_category}
                      type="button"
                      onClick={() => {
                        setSelectedProductCategoryId(p.id_product_category)
                        setAttrSel({})
                        setBrandSel("")
                        // Tem subfiltros pra esta categoria? Drill-in; senão, compose direto.
                        setStep(getAttributeSchema(p.slug).length > 0 ? "productAttrs" : "compose")
                      }}
                      className={cn(
                        "flex items-center justify-between gap-2 border-2 px-3 py-2.5 text-left text-[13px] transition",
                        isActive
                          ? "border-white/30 bg-white/[0.06] text-white"
                          : "border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:text-white",
                      )}
                      style={isActive ? { borderColor: `${accent}88` } : undefined}
                    >
                      <span className="truncate font-medium">{tx.productCategory(null, p.name)}</span>
                      {isActive && <Check className="h-4 w-4 shrink-0" style={{ color: accent }} />}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t("cancel", "Cancelar")}
              </Button>
            </div>
          </div>
        )}

        {/* ---------- step: productAttrs ----------
            Espelha o drill-in de subfiltros da Loja (FilterRail): os mesmos
            campos da categoria (plataforma, condição, marca…). Todos opcionais
            — refinam o matching, mas o comprador pode pular. */}
        {step === "productAttrs" && (
          <div className="px-5 py-5">
            <div className="flex items-center gap-2 border-2 border-white/15 bg-white/[0.03] p-3">
              <button
                type="button"
                onClick={() => setStep("productCat")}
                aria-label={t("back", "Voltar")}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center border-2 border-white/25 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">{t("categoryLabel", "Categoria")}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white">{productCategoryName}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-white/75">{t("refineProduct", "Detalhe o que você procura (opcional):")}</p>

            <div className="mt-4 max-h-[44vh] space-y-4 overflow-y-auto pr-0.5">
              {productSchema.map((field) => (
                <AttrFieldDark
                  key={field.key}
                  field={field}
                  accent={accent}
                  selected={attrSel[field.key] ?? []}
                  brand={brandSel}
                  onToggle={toggleAttr}
                  onBrand={setBrandSel}
                  tx={tx}
                  t={t}
                />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("productCat")}>
                {t("back", "Voltar")}
              </Button>
              <Button
                onClick={() => setStep("compose")}
                className="rounded-none bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              >
                {t("continue", "Continuar")}
              </Button>
            </div>
          </div>
        )}

        {/* ---------- step: compose ---------- */}
        {step === "compose" && (
          <div className="px-5 py-5">
            {/* Resumo do escopo */}
            <div className="border-2 border-white/15 bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {mode !== "product" ? (
                  <>
                    <span className="text-white/45">{t("machineLabel", "Enxame")}</span>
                    <span className="font-semibold tracking-tight" style={{ color: accent }}>{trimmedMachine}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-white/45">{t("professionLabel", "Profissão")}</span>
                    <span className="font-semibold tracking-tight text-white">{professionName}</span>
                  </>
                ) : (
                  <>
                    <span className="text-white/45">{t("categoryLabel", "Categoria")}</span>
                    <span className="font-semibold tracking-tight text-white">{productCategoryName}</span>
                  </>
                )}
                {cityLine && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-white/45">{t("locationLabel", "Local")}</span>
                    <span className="font-semibold tracking-tight text-white">{cityLine}</span>
                  </>
                )}
              </div>
            </div>
            {/* Recap dos subfiltros escolhidos (só product) */}
            {mode === "product" && Object.keys(pickedAttributes).length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {Object.entries(pickedAttributes).flatMap(([key, vals]) =>
                  vals.map((v) => (
                    <span
                      key={`${key}:${v}`}
                      className="border-2 border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-white/80"
                    >
                      {key === "brand" ? v : key === "colors" ? tx.colorName(v) : tx.attrOption(v)}
                    </span>
                  )),
                )}
                <button
                  type="button"
                  onClick={() => setStep("productAttrs")}
                  className="text-[10px] font-bold uppercase tracking-[0.08em] text-yellow-400/90 underline-offset-2 hover:underline"
                >
                  {t("edit", "Editar")}
                </button>
              </div>
            )}

            {composeIntroNode}

            {/* Campo título — só product */}
            {mode === "product" && (
              <>
                <label className="mt-4 mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                  {t("productTitleLabel", "Título do produto")}
                </label>
                <input
                  type="text"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  placeholder={t("productTitlePlaceholder", "Ex: Tênis de corrida número 42")}
                  maxLength={160}
                  className="w-full border-2 border-white/15 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/50 focus:outline-none"
                />
              </>
            )}

            {/* Estado + Município */}
            {mode !== "course" && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                    {t("stateLabel", "Estado")} <span className="normal-case text-white/30">{t("optionalSuffix", "(opcional)")}</span>
                  </label>
                  <select
                    value={estadoUf}
                    onChange={(e) => { setEstadoUf(e.target.value); setMunicipio("") }}
                    className="h-10 w-full border-2 border-white/15 bg-white/[0.03] px-2 text-sm text-white focus:border-yellow-400/50 focus:outline-none [&>option]:bg-zinc-900 [&>option]:text-white"
                  >
                    <option value="">{t("allStates", "Todos")}</option>
                    {ESTADOS_BRASIL.map((e) => (
                      <option key={e.uf} value={e.uf}>{e.nome} ({e.uf})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                    {t("cityLabel", "Cidade")} <span className="normal-case text-white/30">{t("optionalSuffix", "(opcional)")}</span>
                  </label>
                  <select
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    disabled={!estadoUf || loadingMunicipios}
                    className="h-10 w-full border-2 border-white/15 bg-white/[0.03] px-2 text-sm text-white focus:border-yellow-400/50 focus:outline-none disabled:opacity-40 [&>option]:bg-zinc-900 [&>option]:text-white"
                  >
                    <option value="">{!estadoUf ? t("chooseStateFirst", "Escolha estado") : loadingMunicipios ? t("loading", "Carregando…") : t("allCities", "Todas")}</option>
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
                    {t("minPriceLabel", "Preço mínimo")} <span className="normal-case text-white/30">{t("brlOptionalSuffix", "(R$, opcional)")}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0,00"
                    className="h-10 w-full border-2 border-white/15 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
                    {t("maxPriceLabel", "Preço máximo")} <span className="normal-case text-white/30">{t("brlOptionalSuffix", "(R$, opcional)")}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="0,00"
                    className="h-10 w-full border-2 border-white/15 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/50 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Descrição */}
            <label className="mt-4 mb-1 block text-[10px] uppercase tracking-[0.14em] text-white/45">
              {t("messageLabel", "Mensagem do chamado")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("messagePlaceholder", "Descreva o que você precisa…")}
              rows={5}
              maxLength={4000}
              className="w-full resize-none border-2 border-white/15 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/50 focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
              <span>{t("minChars", "Mínimo 5 caracteres.")}</span>
              <span>{description.length}/4000</span>
            </div>
            {error && (
              <p className="mt-3 border-2 border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>
            )}

            <div className="mt-5 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setStep(
                    mode === "product"
                      ? productSchema.length > 0
                        ? "productAttrs"
                        : "productCat"
                      : "profession",
                  )
                }
                disabled={sending}
              >
                {t("back", "Voltar")}
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || description.trim().length < 5}
                className="rounded-none bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    {t("sending", "Enviando…")}
                  </>
                ) : (
                  t("send", "Enviar chamado")
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
            <p className="mt-3 text-base font-semibold tracking-tight text-white">{t("successTitle", "Chamado aberto!")}</p>
            <p className="mt-1 text-sm text-white/65">
              {renderTemplate(
                t("successBody", "Os {verb} compatíveis receberão sua mensagem no mural. As respostas chegam em {dest}"),
                { verb: t(MODE_LABELS[mode].verbKey, MODE_LABELS[mode].verbPt), dest: "Mensagens → O.S." }
              )}
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-5 rounded-none bg-yellow-400 text-zinc-950 hover:bg-yellow-300">
              {t("close", "Fechar")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Campo de subfiltro — variante escura (paleta do modal, cantos retos) */
/*  Espelha SubfilterField do FilterRail, mas no tema do chamado.        */
/* ------------------------------------------------------------------ */
function AttrFieldDark({
  field, accent, selected, brand, onToggle, onBrand, tx, t,
}: {
  field: AttrField
  accent: string
  selected: string[]
  brand: string
  onToggle: (key: string, option: string) => void
  onBrand: (v: string) => void
  tx: ReturnType<typeof useTaxonomy>
  t: ReturnType<typeof useTranslations>
}) {
  const chip = (key: string, opt: string, label: string, active: boolean) => (
    <button
      key={opt}
      type="button"
      onClick={() => onToggle(key, opt)}
      aria-pressed={active}
      className={cn(
        "border-2 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.03em] transition",
        active
          ? "border-transparent text-zinc-950"
          : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
      )}
      style={active ? { background: accent } : undefined}
    >
      {label}
    </button>
  )

  // range → chips dos valores discretos (ex.: numeração de calçado).
  if (field.type === "range") {
    return (
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{tx.attrLabel(field.label)}</p>
        <div className="flex flex-wrap gap-1.5">
          {rangeValues(field).map((v) => chip(field.key, v, v, selected.includes(v)))}
        </div>
      </div>
    )
  }

  if (field.type === "colors") {
    return (
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{tx.attrLabel(field.label)}</p>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_SWATCHES.map((c) => {
            const active = selected.includes(c.name)
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onToggle(field.key, c.name)}
                aria-pressed={active}
                title={tx.colorName(c.name)}
                className={cn(
                  "h-6 w-6 border-2 transition",
                  active ? "border-white ring-2 ring-offset-1 ring-offset-zinc-950" : "border-white/25",
                )}
                style={{
                  background: c.hex || "conic-gradient(#E0312D,#F2B705,#2E9E44,#2E62D9,#7B3FE4,#E0312D)",
                  ...(active ? ({ "--tw-ring-color": accent } as React.CSSProperties) : {}),
                }}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === "brand") {
    return (
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{tx.attrLabel(field.label)}</p>
        <input
          type="text"
          value={brand}
          onChange={(e) => onBrand(e.target.value)}
          maxLength={80}
          placeholder={t("searchBrandPlaceholder", "Buscar marca…")}
          className="w-full border-2 border-white/15 bg-white/[0.03] px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-yellow-400/50 focus:outline-none"
        />
        {field.suggestions?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {field.suggestions.map((s) => {
              const active = brand.toLowerCase() === s.toLowerCase()
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onBrand(active ? "" : s)}
                  aria-pressed={active}
                  className={cn(
                    "border-2 px-1.5 py-0.5 text-[10px] font-bold transition",
                    active ? "border-transparent text-zinc-950" : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
                  )}
                  style={active ? { background: accent } : undefined}
                >
                  {s}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  // chips
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{tx.attrLabel(field.label)}</p>
      <div className="flex flex-wrap gap-1.5">
        {(field.options ?? []).map((opt) => chip(field.key, opt, tx.attrOption(opt), selected.includes(opt)))}
      </div>
    </div>
  )
}
