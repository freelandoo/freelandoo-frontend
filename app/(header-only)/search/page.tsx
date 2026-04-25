"use client"

import { FreelancerCard } from "@/components/freelancer"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import {
  useMachinesCatalog,
  type CatalogMachine,
} from "@/components/home/machines/use-machines-catalog"
import { MACHINES, type MachineId } from "@/components/home/machines/tokens"

/**
 * Bridge map: real DB categories → machine slugs.
 * Used for client-side filtering while the database doesn't have
 * id_machine populated in tb_category.
 */
const CATEGORY_TO_MACHINE: Record<string, MachineId> = {
  // ── 1. Máquina de Views ──
  "editor de vídeo": "views",
  "editor de cortes": "views",
  "thumbmaker": "views",
  "designer de thumbnail": "views",
  "motion designer": "views",
  "roteirista": "views",
  "copywriter para vídeos": "views",
  "estrategista de conteúdo": "views",
  "estrategista de crescimento": "views",
  "social media focado em conteúdo": "views",
  "especialista em youtube": "views",
  "especialista em tiktok/reels": "views",
  "gestor de canal": "views",
  "editor": "views",

  // ── 2. Máquina de Divulgação ──
  "digital influencer": "divulgacao",
  "microinfluenciador": "divulgacao",
  "microinfluencer": "divulgacao",
  "creator ugc": "divulgacao",
  "ugc creator": "divulgacao",
  "afiliado": "divulgacao",
  "embaixador de marca": "divulgacao",
  "creator de lifestyle": "divulgacao",
  "creator de nicho": "divulgacao",
  "apresentador de produto": "divulgacao",
  "divulgador local": "divulgacao",
  "creator para campanhas": "divulgacao",
  "creator para lançamentos": "divulgacao",
  "social media": "divulgacao",
  "designer gráfico": "divulgacao",
  "gestor de tráfego": "divulgacao",
  "copywriter": "divulgacao",
  "influenciador": "divulgacao",
  "influenciadora": "divulgacao",

  // ── 3. Máquina de Limpeza ──
  "diarista": "limpeza",
  "faxineira": "limpeza",
  "auxiliar de limpeza": "limpeza",
  "limpeza pós-obra": "limpeza",
  "limpeza pesada": "limpeza",
  "organização residencial": "limpeza",
  "organização comercial": "limpeza",
  "passadeira": "limpeza",
  "lavador de estofado": "limpeza",
  "limpeza de vidros": "limpeza",
  "limpeza de escritório": "limpeza",
  "limpeza": "limpeza",
  "organização": "limpeza",

  // ── 4. Máquina de Construção ──
  "pedreiro": "construcao",
  "ajudante de obra": "construcao",
  "servente": "construcao",
  "engenheiro civil": "construcao",
  "arquiteto": "construcao",
  "pintor": "construcao",
  "azulejista": "construcao",
  "gesseiro": "construcao",
  "eletricista": "construcao",
  "encanador": "construcao",
  "instalador": "construcao",
  "mestre de obras": "construcao",
  "marceneiro": "construcao",
  "serralheiro": "construcao",
  "engenheiro": "construcao",
  "ajudante": "construcao",
  "acabamento": "construcao",

  // ── 5. Máquina de Negócios ──
  "sdr": "negocios",
  "closer": "negocios",
  "assistente virtual": "negocios",
  "atendimento ao cliente": "negocios",
  "suporte operacional": "negocios",
  "analista de crm": "negocios",
  "web designer": "negocios",
  "desenvolvimento de software": "negocios",
  "consultor comercial": "negocios",
  "especialista em automação": "negocios",
  "analista de marketing": "negocios",
  "atendimento": "negocios",
  "programador": "negocios",
  "desenvolvedor": "negocios",
  "designer": "negocios",

  // ── 6. Máquina de Oportunidades ──
  "freelancer geral": "oportunidades",
  "assistente geral": "oportunidades",
  "auxiliar administrativo": "oportunidades",
  "recepcionista": "oportunidades",
  "promotor": "oportunidades",
  "divulgador": "oportunidades",
  "captador de leads": "oportunidades",
  "operador digital": "oportunidades",
  "suporte geral": "oportunidades",
  "profissional multitarefa": "oportunidades",
  "prestador local": "oportunidades",
  "parceiro comercial": "oportunidades",

  // ── 7. Máquina de Saúde e Beleza ──
  "massagista": "saude_beleza",
  "massoterapeuta": "saude_beleza",
  "esteticista": "saude_beleza",
  "designer de sobrancelhas": "saude_beleza",
  "maquiadora": "saude_beleza",
  "cabeleireiro": "saude_beleza",
  "cabeleireira": "saude_beleza",
  "barbeiro": "saude_beleza",
  "manicure": "saude_beleza",
  "pedicure": "saude_beleza",
  "lash designer": "saude_beleza",
  "terapeuta corporal": "saude_beleza",
  "drenagem linfática": "saude_beleza",
  "depiladora": "saude_beleza",
  "micropigmentadora": "saude_beleza",
  "spa/relaxamento": "saude_beleza",

  // ── 8. Máquina de Saúde do Pet ──
  "banhista": "saude_pet",
  "tosador": "saude_pet",
  "groomer": "saude_pet",
  "dog walker": "saude_pet",
  "pet sitter": "saude_pet",
  "adestrador": "saude_pet",
  "cuidador de pets": "saude_pet",
  "hotel para pets": "saude_pet",
  "transporte pet": "saude_pet",
  "veterinário": "saude_pet",
  "veterinária": "saude_pet",
  "auxiliar veterinário": "saude_pet",
  "fisioterapia animal": "saude_pet",
  "recreador pet": "saude_pet",
  "cuidador domiciliar de pets": "saude_pet",
  "banho e tosa": "saude_pet",
}

/** Resolve machine slug from a profile's category name (case-insensitive). */
function resolveMachineFromCategory(category: string | null | undefined): MachineId | null {
  if (!category) return null
  return CATEGORY_TO_MACHINE[category.toLowerCase().trim()] ?? null
}

interface RedeSocial {
  url: string
  social_id: string
  follower_range: string
  social_media_type: string
}

interface ProfileStatus {
  id_status: string
  desc_status: string
}

interface Creator {
  id_profile: string
  display_name: string
  bio: string
  avatar_url: string | null
  estado: string
  municipio: string
  category: string
  id_user: string
  user_nome: string
  user_avatar: string
  profile_statuses: ProfileStatus[]
  redes_sociais: RedeSocial[]
  id_machine?: number | null
  machine_slug?: string | null
}

const ESTADOS = [
  { id: 1, nome: "Acre", uf: "AC" },
  { id: 2, nome: "Alagoas", uf: "AL" },
  { id: 3, nome: "Amapá", uf: "AP" },
  { id: 4, nome: "Amazonas", uf: "AM" },
  { id: 5, nome: "Bahia", uf: "BA" },
  { id: 6, nome: "Ceará", uf: "CE" },
  { id: 7, nome: "Distrito Federal", uf: "DF" },
  { id: 8, nome: "Espírito Santo", uf: "ES" },
  { id: 9, nome: "Goiás", uf: "GO" },
  { id: 10, nome: "Maranhão", uf: "MA" },
  { id: 11, nome: "Mato Grosso", uf: "MT" },
  { id: 12, nome: "Mato Grosso do Sul", uf: "MS" },
  { id: 13, nome: "Minas Gerais", uf: "MG" },
  { id: 14, nome: "Pará", uf: "PA" },
  { id: 15, nome: "Paraíba", uf: "PB" },
  { id: 16, nome: "Paraná", uf: "PR" },
  { id: 17, nome: "Pernambuco", uf: "PE" },
  { id: 18, nome: "Piauí", uf: "PI" },
  { id: 19, nome: "Rio de Janeiro", uf: "RJ" },
  { id: 20, nome: "Rio Grande do Norte", uf: "RN" },
  { id: 21, nome: "Rio Grande do Sul", uf: "RS" },
  { id: 22, nome: "Rondônia", uf: "RO" },
  { id: 23, nome: "Roraima", uf: "RR" },
  { id: 24, nome: "Santa Catarina", uf: "SC" },
  { id: 25, nome: "São Paulo", uf: "SP" },
  { id: 26, nome: "Sergipe", uf: "SE" },
  { id: 27, nome: "Tocantins", uf: "TO" },
]

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <main className="container mx-auto px-4 py-8 md:py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </main>
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  )
}

/**
 * Resolve the machine theme colors from the catalog or static seed.
 * Returns a consistent colors object for theming the entire page.
 */
function useMachineTheme(activeMachine: CatalogMachine | null) {
  return useMemo(() => {
    const defaultColors = {
      from: "#e6b800",
      to: "#f59e0b",
      glow: "rgba(230,184,0,0.45)",
      ring: "rgba(230,184,0,0.7)",
      accent: "#fbbf24",
      text: "#fde68a",
    }

    if (!activeMachine) return defaultColors

    // Try to find in static seed for full color info
    const seed = MACHINES.find((m) => m.id === activeMachine.slug)
    if (seed) return seed.colors

    // Fallback to catalog colors
    return {
      from: activeMachine.color_from || defaultColors.from,
      to: activeMachine.color_to || defaultColors.to,
      glow: activeMachine.color_glow || defaultColors.glow,
      ring: activeMachine.color_ring || defaultColors.ring,
      accent: activeMachine.color_accent || defaultColors.accent,
      text: activeMachine.color_text || defaultColors.text,
    }
  }, [activeMachine])
}

function SearchPageInner() {
  const searchParams = useSearchParams()
  const { machines } = useMachinesCatalog()

  const [selectedEstado, setSelectedEstado] = useState("")
  const [selectedCity, setSelectedCity] = useState("")
  const [idMachine, setIdMachine] = useState<number | null>(null)
  const [idCategory, setIdCategory] = useState<number | null>(null)

  const [premiumOnly, setPremiumOnly] = useState(false)

  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Slug pendente da URL (síncrono). Enquanto não resolvido pelo catálogo,
  // a busca fica bloqueada para não exibir profissões de outras máquinas.
  const pendingSlug =
    searchParams.get("machine") ||
    searchParams.get("machine_slug") ||
    searchParams.get("from")?.replace("maquina-", "") ||
    null

  // Hydrate from URL (id_machine/id_category, ?machine=<slug> ou legacy ?from=maquina-<slug>)
  useEffect(() => {
    const imRaw = searchParams.get("id_machine")
    const icRaw = searchParams.get("id_category")

    if (imRaw) {
      const n = Number(imRaw)
      if (Number.isFinite(n)) setIdMachine(n)
    } else if (pendingSlug && machines.length > 0) {
      const m = machines.find((x) => x.slug === pendingSlug)
      if (m) setIdMachine(m.id_machine)
    }
    if (icRaw) {
      const n = Number(icRaw)
      if (Number.isFinite(n)) setIdCategory(n)
    }
  }, [searchParams, machines, pendingSlug])

  // Quando há slug na URL mas o catálogo ainda não carregou (ou idMachine não foi
  // resolvido), seguramos o fetch para evitar flash de profissões de outra máquina.
  const slugAwaitingResolution =
    !!pendingSlug && idMachine == null

  const activeMachine: CatalogMachine | null = useMemo(
    () => machines.find((m) => m.id_machine === idMachine) ?? null,
    [machines, idMachine]
  )

  const machineCategories = useMemo(
    () => activeMachine?.categories.filter((c) => c.is_active) ?? [],
    [activeMachine]
  )

  const activeCategory = useMemo(
    () => machineCategories.find((c) => c.id_category === idCategory) ?? null,
    [machineCategories, idCategory]
  )

  // Machine theme colors
  const theme = useMachineTheme(activeMachine)

  // Reset profession when machine changes and current profession doesn't belong
  useEffect(() => {
    if (!idCategory) return
    if (!activeMachine) {
      setIdCategory(null)
      return
    }
    const stillValid = activeMachine.categories.some((c) => c.id_category === idCategory)
    if (!stillValid) setIdCategory(null)
  }, [idMachine, activeMachine, idCategory])

  // City list depends on state
  useEffect(() => {
    if (selectedEstado) {
      setLoadingMunicipios(true)
      fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedEstado}/municipios`
      )
        .then((r) => r.json())
        .then((data) => {
          setMunicipios(data)
          setLoadingMunicipios(false)
        })
        .catch(() => setLoadingMunicipios(false))
    } else {
      setMunicipios([])
      setSelectedCity("")
    }
  }, [selectedEstado])

  // Fetch creators reactively when any filter changes
  useEffect(() => {
    if (slugAwaitingResolution) {
      // URL pede uma máquina específica que ainda não foi resolvida pelo catálogo.
      // Mostra loading e espera — assim nunca renderizamos profissões da máquina errada.
      setLoading(true)
      return
    }
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (selectedEstado) params.append("estado", selectedEstado)
        if (selectedCity) {
          const municipio = municipios.find((m) => m.id.toString() === selectedCity)
          if (municipio) params.append("municipio", municipio.nome)
        }

        // Send machine filters to backend (server-side when supported)
        if (activeMachine) {
          if (activeMachine.id_machine > 0) {
            params.append("id_machine", String(activeMachine.id_machine))
          }
          params.append("machine_slug", activeMachine.slug)
        }

        if (idCategory != null && idCategory > 0) {
          params.append("id_category", String(idCategory))
        } else if (activeCategory) {
          params.append("category", activeCategory.desc_category)
        }

        const queryString = params.toString()
        const url = `/api/search${queryString ? `?${queryString}` : ""}`
        const response = await fetch(url)
        if (!response.ok) throw new Error("Erro ao buscar creators")
        const data = await response.json()
        let list: Creator[] = Array.isArray(data) ? data : []

        // Step 1: Enrich EVERY creator with machine_slug from their category.
        // This is critical — the backend may return machine_slug: null.
        // The CATEGORY_TO_MACHINE map bridges the gap.
        list.forEach((c) => {
          if (!c.machine_slug) {
            c.machine_slug = resolveMachineFromCategory(c.category)
          }
        })

        // Step 2: Filter by selected machine (client-side)
        // ALWAYS apply when a machine is selected — even if result is empty
        if (activeMachine) {
          list = list.filter(
            (c) => c.machine_slug === activeMachine.slug
          )
        }

        // Step 3: Filter by selected category/profession
        if (activeCategory) {
          list = list.filter(
            (c) =>
              c.category &&
              c.category.toLowerCase() === activeCategory.desc_category.toLowerCase()
          )
        }

        setCreators(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao buscar creators")
        setCreators([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [selectedEstado, selectedCity, municipios, idMachine, idCategory, activeMachine, activeCategory, slugAwaitingResolution])

  const topCreators = creators.filter((c) =>
    c.profile_statuses?.some((s) => s.desc_status === "destaque_premium")
  )
  const regularCreators = creators.filter(
    (c) => !c.profile_statuses?.some((s) => s.desc_status === "destaque_premium")
  )
  const displayCreators = premiumOnly ? topCreators : creators

  return (
    <div className="min-h-screen bg-background">
      {/* Machine accent bar at top */}
      {activeMachine && (
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${theme.from}, ${theme.to})`,
          }}
        />
      )}

      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Active filter pills */}
        {(activeMachine || activeCategory || selectedEstado || selectedCity) && (
          <div
            className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border p-4"
            style={{
              background: activeMachine
                ? `linear-gradient(90deg, ${theme.from}18, transparent)`
                : undefined,
              borderColor: activeMachine ? `${theme.accent}55` : undefined,
            }}
          >
            {activeMachine && (
              <span
                className="text-sm font-semibold"
                style={{ color: theme.accent }}
              >
                {activeMachine.name}
              </span>
            )}
            {activeCategory && (
              <FilterPill
                label={activeCategory.desc_category}
                color={theme.accent}
                onRemove={() => setIdCategory(null)}
              />
            )}
            {selectedEstado && (
              <FilterPill
                label={selectedEstado}
                color={theme.accent}
                onRemove={() => {
                  setSelectedEstado("")
                  setSelectedCity("")
                }}
              />
            )}
            {selectedCity && (
              <FilterPill
                label={
                  municipios.find((m) => m.id.toString() === selectedCity)?.nome ?? ""
                }
                color={theme.accent}
                onRemove={() => setSelectedCity("")}
              />
            )}
            <button
              onClick={() => {
                setSelectedEstado("")
                setSelectedCity("")
                setIdMachine(null)
                setIdCategory(null)
              }}
              className="ml-auto text-xs underline transition hover:opacity-80"
              style={{ color: theme.accent }}
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div
          className="mb-8 rounded-lg border p-6"
          style={{
            background: activeMachine
              ? `linear-gradient(135deg, ${theme.from}08, ${theme.to}05)`
              : undefined,
            borderColor: activeMachine ? `${theme.accent}33` : undefined,
          }}
        >
          <h3 className="font-semibold text-lg mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SelectField
              label="Estado"
              value={selectedEstado}
              onChange={setSelectedEstado}
              accentColor={activeMachine ? theme.accent : undefined}
              options={[
                { value: "", label: "Todos os estados" },
                ...ESTADOS.map((e) => ({ value: e.uf, label: `${e.nome} — ${e.uf}` })),
              ]}
            />
            <SelectField
              label="Cidade"
              value={selectedCity}
              onChange={setSelectedCity}
              disabled={!selectedEstado || loadingMunicipios}
              accentColor={activeMachine ? theme.accent : undefined}
              placeholderValue={
                loadingMunicipios
                  ? "Carregando..."
                  : selectedEstado
                    ? "Todas as cidades"
                    : "Selecione um estado"
              }
              options={municipios.map((m) => ({ value: m.id.toString(), label: m.nome }))}
            />
            <SelectField
              label="Máquina"
              value={idMachine != null ? String(idMachine) : ""}
              onChange={(v) => {
                setIdMachine(v ? Number(v) : null)
                setIdCategory(null)
              }}
              accentColor={activeMachine ? theme.accent : undefined}
              options={[
                { value: "", label: "Todas as máquinas" },
                ...machines
                  .filter((m) => m.is_active)
                  .map((m) => ({
                    value: String(m.id_machine),
                    label: m.name,
                  })),
              ]}
            />
            <SelectField
              label="Profissão"
              value={idCategory != null ? String(idCategory) : ""}
              onChange={(v) => setIdCategory(v ? Number(v) : null)}
              disabled={!activeMachine}
              accentColor={activeMachine ? theme.accent : undefined}
              placeholderValue={activeMachine ? "Todas as profissões" : "Escolha a máquina"}
              options={machineCategories.map((c) => ({
                value: String(c.id_category),
                label: c.desc_category,
              }))}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Checkbox
              id="premium"
              checked={premiumOnly}
              onCheckedChange={(checked) => setPremiumOnly(checked as boolean)}
            />
            <label htmlFor="premium" className="text-sm font-medium cursor-pointer">
              Apenas Premium
            </label>
            <Badge
              variant="outline"
              className="ml-auto whitespace-nowrap"
              style={activeMachine ? { borderColor: `${theme.accent}55`, color: theme.accent } : undefined}
            >
              {displayCreators.length} resultado{displayCreators.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div
              className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: `${theme.accent}44`, borderTopColor: theme.accent }}
            />
            <p className="mt-4 text-lg text-muted-foreground">Carregando creators...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-lg text-red-500">Erro: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {premiumOnly ? (
              displayCreators.length > 0 ? (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-3xl font-bold">Criadores Premium</h2>
                    <Badge
                      className="text-white"
                      style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                    >
                      Premium
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayCreators.map((creator) => (
                      <FreelancerCard
                        key={creator.id_profile}
                        creator={creator}
                        featured
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <EmptyState accentColor={theme.accent} />
              )
            ) : (
              <>
                {topCreators.length > 0 && (
                  <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                      <h2 className="text-3xl font-bold">Top em Destaque</h2>
                      <Badge
                        className="text-white"
                        style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                      >
                        Premium
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {topCreators.map((creator) => (
                        <FreelancerCard
                          key={creator.id_profile}
                          creator={creator}
                          featured
                        />
                      ))}
                    </div>
                  </section>
                )}

                {regularCreators.length > 0 && (
                  <section>
                    <h2 className="text-3xl font-bold mb-6">
                      {activeCategory
                        ? activeCategory.desc_category
                        : activeMachine
                          ? (
                            <>
                              Profissionais de{" "}
                              <span style={{ color: theme.accent }}>
                                {activeMachine.name}
                              </span>
                            </>
                          )
                          : "Todos os profissionais"}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {regularCreators.map((creator) => (
                        <FreelancerCard key={creator.id_profile} creator={creator} />
                      ))}
                    </div>
                  </section>
                )}

                {creators.length === 0 && <EmptyState accentColor={theme.accent} />}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function FilterPill({
  label,
  color,
  onRemove,
}: {
  label: string
  color: string
  onRemove: () => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: `${color}55`, color }}
    >
      {label}
      <button
        aria-label={`Remover ${label}`}
        onClick={onRemove}
        className="ml-0.5 opacity-70 hover:opacity-100 transition"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholderValue,
  accentColor,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
  placeholderValue?: string
  accentColor?: string
}) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-2"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={accentColor ? { borderColor: `${accentColor}44` } : undefined}
      >
        {placeholderValue && <option value="">{placeholderValue}</option>}
        {options.map((o) => (
          <option key={o.value || o.label} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function EmptyState({ accentColor }: { accentColor: string }) {
  return (
    <div className="text-center py-12">
      <div
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `${accentColor}15` }}
      >
        <span className="text-2xl">🔍</span>
      </div>
      <p className="text-lg text-muted-foreground">
        Nenhum profissional encontrado com os filtros selecionados.
      </p>
    </div>
  )
}
