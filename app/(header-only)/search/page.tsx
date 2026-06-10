"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2, MessageSquarePlus, SlidersHorizontal } from "lucide-react"
import {
  useMachinesCatalog,
  type CatalogMachine,
} from "@/components/home/machines/use-machines-catalog"
import { MACHINES, type MachineId } from "@/components/home/machines/tokens"
import { FreelancerTile } from "@/components/freelancer/freelancer-tile"
import { SearchRetractableHeader } from "@/components/search/search-retractable-header"
import { StoryBar, type StoryBarEntry } from "@/components/stories/story-bar"
import { StoryPlayer } from "@/components/stories/story-player"
import { MediaComposer } from "@/components/composer/MediaComposer"
import { OpenChamadoModal } from "@/components/search/open-chamado-modal"
import { SearchTabsBar, type SearchTab } from "@/components/search/search-tabs-bar"
import { ProductsGrid } from "@/components/search/products-grid"
import { CoursesGrid } from "@/components/search/courses-grid"
import { FilterRail, type CoursePriceFilter, type ProductCategoryEntry } from "@/components/search/filter-rail"
import {
  ProductSubfilterPanel,
  buildSubfilterParams,
  emptySubfilters,
  hasActiveSubfilters,
  type ProductSubfilterState,
} from "@/components/search/product-subfilters"
import { getAttributeSchema } from "@/lib/product-attributes"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"

/**
 * Bridge map: real DB categories → machine slugs.
 * Mantido enquanto id_machine não está populado em tb_category.
 */
const CATEGORY_TO_MACHINE: Record<string, MachineId> = {
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

function resolveMachineFromCategory(category: string | null | undefined): MachineId | null {
  if (!category) return null
  return CATEGORY_TO_MACHINE[category.toLowerCase().trim()] ?? null
}

interface Creator {
  id_profile: string
  display_name: string
  bio: string
  avatar_url: string | null
  estado: string
  municipio: string
  category: string
  profession_slug?: string | null
  sub_profile_slug?: string | null
  id_user: string
  username?: string | null
  user_nome: string
  user_avatar: string
  profile_statuses: { id_status: string; desc_status: string }[]
  redes_sociais: { url: string; social_id: string; follower_range: string; social_media_type: string }[]
  id_machine?: number | null
  machine_slug?: string | null
  is_clan?: boolean
  members_count?: number | null
  is_premium?: boolean
}

const DEFAULT_ACCENT = "#fbbf24"

function useMachineAccent(activeMachine: CatalogMachine | null) {
  return useMemo(() => {
    if (!activeMachine) return DEFAULT_ACCENT
    const seed = MACHINES.find((m) => m.id === activeMachine.slug)
    if (seed) return seed.colors.accent
    return activeMachine.color_accent || DEFAULT_ACCENT
  }, [activeMachine])
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0b0804] text-white/60 md:left-[80px]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  )
}

function SearchPageInner() {
  const t = useTranslations("Search")
  const searchParams = useSearchParams()
  const { machines } = useMachinesCatalog()

  const [selectedEstado, setSelectedEstado] = useState<string | null>(null)
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null)
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null)
  const [idMachine, setIdMachine] = useState<number | null>(null)
  const [idCategory, setIdCategory] = useState<number | null>(null)
  const [premiumOnly, setPremiumOnly] = useState(false)
  const [levelMin, setLevelMin] = useState<number | null>(null)

  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [storyOpen, setStoryOpen] = useState<{ entries: StoryBarEntry[]; index: number } | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [openChamadoOpen, setOpenChamadoOpen] = useState(false)
  const [storyBarKey, setStoryBarKey] = useState(0)
  const [tab, setTab] = useState<SearchTab>("services")
  const [productCategoryId, setProductCategoryId] = useState<number | null>(null)
  const [productCategories, setProductCategories] = useState<ProductCategoryEntry[]>([])
  const [productSubfilters, setProductSubfilters] = useState<ProductSubfilterState>(emptySubfilters())
  const [productFilterSheetOpen, setProductFilterSheetOpen] = useState(false)
  const [coursePrice, setCoursePrice] = useState<CoursePriceFilter>("all")

  // Troca de categoria de produto zera os subfiltros (são por categoria).
  const handleProductCategoryChange = useCallback((id: number | null) => {
    setProductCategoryId(id)
    setProductSubfilters(emptySubfilters())
    setProductFilterSheetOpen(false)
  }, [])

  // URL state sync: ?tab=
  useEffect(() => {
    const raw = searchParams.get("tab")
    if (raw === "services" || raw === "products" || raw === "courses") setTab(raw)
  }, [searchParams])

  const handleTabChange = useCallback((next: SearchTab) => {
    setTab(next)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (next === "services") url.searchParams.delete("tab")
    else url.searchParams.set("tab", next)
    window.history.replaceState({}, "", url.toString())
  }, [])

  // Carrega categorias de produto sob demanda
  useEffect(() => {
    if (tab !== "products") return
    if (productCategories.length > 0) return
    fetch("/api/product-categories")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.items ?? d.categories ?? []
        setProductCategories(list)
      })
      .catch(() => setProductCategories([]))
  }, [tab, productCategories.length])

  const scrollRef = useRef<HTMLDivElement | null>(null)

  const pendingSlug =
    searchParams.get("machine") ||
    searchParams.get("machine_slug") ||
    searchParams.get("from")?.replace("enxame-", "") ||
    null

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
    const estado = searchParams.get("estado")
    const regionId = searchParams.get("id_region")
    const regionName = searchParams.get("regiao")
    if (estado) setSelectedEstado(estado.toUpperCase().slice(0, 2))
    if (regionId) {
      const n = Number(regionId)
      if (Number.isFinite(n)) setSelectedRegionId(n)
    }
    if (regionName) setSelectedRegionName(regionName)
  }, [searchParams, machines, pendingSlug])

  const slugAwaitingResolution = !!pendingSlug && idMachine == null

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

  const accent = useMachineAccent(activeMachine)

  useEffect(() => {
    if (!idCategory) return
    if (!activeMachine) { setIdCategory(null); return }
    const stillValid = activeMachine.categories.some((c) => c.id_category === idCategory)
    if (!stillValid) setIdCategory(null)
  }, [idMachine, activeMachine, idCategory])

  useEffect(() => {
    if (slugAwaitingResolution) {
      setLoading(true)
      return
    }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (selectedEstado) params.append("estado", selectedEstado)
        if (selectedRegionId) params.append("id_region", String(selectedRegionId))
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
        if (levelMin != null) params.append("level_min", String(levelMin))

        const qs = params.toString()
        const url = `/api/search${qs ? `?${qs}` : ""}`
        const response = await fetch(url, { cache: "no-store" })
        if (!response.ok) throw new Error(t("searchError", "Erro ao buscar"))
        const data = await response.json()
        let list: Creator[] = Array.isArray(data) ? data : []
        list.forEach((c) => {
          if (!c.is_clan && !c.machine_slug) {
            c.machine_slug = resolveMachineFromCategory(c.category)
          }
        })
        if (activeMachine) {
          list = list.filter((c) => c.is_clan || c.machine_slug === activeMachine.slug)
        }
        if (activeCategory) {
          list = list.filter(
            (c) => c.is_clan || (c.category && c.category.toLowerCase() === activeCategory.desc_category.toLowerCase())
          )
        }
        if (!cancelled) setCreators(list)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("searchError", "Erro ao buscar"))
          setCreators([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [selectedEstado, selectedRegionId, idMachine, idCategory, activeMachine, activeCategory, slugAwaitingResolution, levelMin, t])

  const isPremium = useCallback((c: Creator) =>
    !!c.is_premium || c.profile_statuses?.some((s) => s.desc_status === "destaque_premium"),
    [])

  const display = useMemo(() => {
    return premiumOnly ? creators.filter(isPremium) : creators
  }, [creators, premiumOnly, isPremium])

  const clearAll = () => {
    setSelectedEstado(null)
    setSelectedRegionId(null)
    setSelectedRegionName(null)
    setIdMachine(null)
    setIdCategory(null)
    setLevelMin(null)
    setPremiumOnly(false)
    setProductCategoryId(null)
    setProductSubfilters(emptySubfilters())
    setProductFilterSheetOpen(false)
    setCoursePrice("all")
  }

  const activeProductCategory = useMemo(
    () => productCategories.find((c) => c.id_product_category === productCategoryId) ?? null,
    [productCategories, productCategoryId]
  )

  const productExtraParams = useMemo(
    () => buildSubfilterParams(productSubfilters, activeProductCategory?.slug),
    [productSubfilters, activeProductCategory]
  )

  return (
    <div data-tour="search-root" className="fixed inset-0 z-30 flex flex-col bg-[#0b0804] md:left-[80px]">
      <SearchRetractableHeader
        machines={machines}
        categories={machineCategories}
        selectedMachineId={idMachine}
        selectedCategoryId={idCategory}
        state={selectedEstado}
        regionId={selectedRegionId}
        regionName={selectedRegionName}
        levelMin={levelMin}
        premiumOnly={premiumOnly}
        accent={accent}
        scrollRef={scrollRef}
        tab={tab}
        onMachineChange={(id) => { setIdMachine(id); setIdCategory(null) }}
        onCategoryChange={setIdCategory}
        onLocationChange={({ state, regionId, regionName }) => { setSelectedEstado(state); setSelectedRegionId(regionId); setSelectedRegionName(regionName) }}
        onLevelChange={setLevelMin}
        onPremiumToggle={() => setPremiumOnly((v) => !v)}
        onClearAll={clearAll}
      />

      <div
        ref={scrollRef}
        className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="h-[64px] sm:h-[68px]" aria-hidden />

        <SearchTabsBar tab={tab} onTabChange={handleTabChange} accent={accent} />

        <div className="mx-auto flex w-full items-start lg:max-w-[1380px] lg:gap-5 lg:px-5 lg:pt-4">
          <FilterRail
            tab={tab}
            machines={machines}
            categories={machineCategories}
            selectedMachineId={idMachine}
            selectedCategoryId={idCategory}
            state={selectedEstado}
            regionId={selectedRegionId}
            regionName={selectedRegionName}
            levelMin={levelMin}
            premiumOnly={premiumOnly}
            accent={accent}
            productCategories={productCategories}
            productCategoryId={productCategoryId}
            productSubfilters={productSubfilters}
            coursePrice={coursePrice}
            onMachineChange={(id) => { setIdMachine(id); setIdCategory(null) }}
            onCategoryChange={setIdCategory}
            onLocationChange={({ state, regionId, regionName }) => { setSelectedEstado(state); setSelectedRegionId(regionId); setSelectedRegionName(regionName) }}
            onLevelChange={setLevelMin}
            onPremiumToggle={() => setPremiumOnly((v) => !v)}
            onProductCategoryChange={handleProductCategoryChange}
            onProductSubfiltersChange={setProductSubfilters}
            onCoursePriceChange={setCoursePrice}
            onClearAll={clearAll}
          />

          <div className="min-w-0 flex-1">
        {tab === "services" && (
          <div className="border-b-2 border-[#0B0B0D] bg-[#0b0804]/60 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-[640px] md:max-w-[760px] lg:max-w-[1080px]">
              <StoryBar
                key={storyBarKey}
                kind="trampo"
                defaultAccent={accent}
                showCreateSlot
                onCreate={() => setCreatorOpen(true)}
                onOpenProfile={(entry, all) => {
                  const idx = all.findIndex((e) => e.id_profile === entry.id_profile)
                  setStoryOpen({ entries: all, index: Math.max(0, idx) })
                }}
              />
            </div>
          </div>
        )}

        {tab === "services" && (loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/60" />
          </div>
        ) : error ? (
          <div className="px-4 py-10 text-center text-sm text-red-300">{error}</div>
        ) : display.length === 0 ? (
          <div className="fl-root px-4 py-20 text-center">
            <p className="fl-display text-3xl leading-none text-[#F5F1E8]">
              {t("noResultsMessage", "Nenhum profissional com esses filtros.")}
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-5 inline-flex items-center border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5"
            >
              {t("clearFiltersButton", "Limpar filtros")}
            </button>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-[640px] grid-cols-3 gap-px bg-white/[0.03] pb-6 md:max-w-[760px] md:grid-cols-4 lg:max-w-none lg:grid-cols-4">
            {display.map((c) => (
              <FreelancerTile
                key={c.id_profile}
                creator={c}
                featured={isPremium(c)}
              />
            ))}
          </div>
        ))}

        {tab === "products" && (
          <>
            {/* Barra de filtros de produto: categoria (estado/cidade reusam os do header retrátil) */}
            <div className="fl-root border-b-2 border-[#0B0B0D] bg-[#0b0804]/60 backdrop-blur-sm lg:hidden">
              <div className="mx-auto flex w-full max-w-[640px] items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] md:max-w-[760px] lg:max-w-[1080px] [&::-webkit-scrollbar]:hidden">
                <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">Categoria</span>
                {activeProductCategory && getAttributeSchema(activeProductCategory.slug).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setProductFilterSheetOpen(true)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 border-2 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5",
                      hasActiveSubfilters(productSubfilters)
                        ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
                        : "border-[#F1EDE2]/40 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]",
                    )}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Filtros
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleProductCategoryChange(null)}
                  className={cn(
                    "shrink-0 border-2 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5",
                    productCategoryId == null
                      ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
                      : "border-[#F1EDE2]/20 bg-transparent text-[#C9C2B6] hover:border-[#F1EDE2] hover:text-[#F1EDE2]",
                  )}
                >
                  Todas
                </button>
                {productCategories.map((cat) => {
                  const active = cat.id_product_category === productCategoryId
                  return (
                    <button
                      key={cat.id_product_category}
                      type="button"
                      onClick={() => {
                        if (active) {
                          // re-toque abre os subfiltros da categoria já ativa
                          if (getAttributeSchema(cat.slug).length > 0) setProductFilterSheetOpen(true)
                          return
                        }
                        handleProductCategoryChange(cat.id_product_category)
                        if (getAttributeSchema(cat.slug).length > 0) setProductFilterSheetOpen(true)
                      }}
                      className={cn(
                        "shrink-0 border-2 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5",
                        active
                          ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
                          : "border-[#F1EDE2]/20 bg-transparent text-[#C9C2B6] hover:border-[#F1EDE2] hover:text-[#F1EDE2]",
                      )}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <ProductsGrid
              categoryId={productCategoryId}
              state={selectedEstado}
              regionId={selectedRegionId}
              extraParams={productExtraParams}
            />

            {/* Sheet mobile de subfiltros da categoria (a coluna lateral só existe em lg+) */}
            {productFilterSheetOpen && activeProductCategory && (
              <div
                className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 lg:hidden"
                onClick={() => setProductFilterSheetOpen(false)}
              >
                <div
                  className="fl-root fl-paper-card max-h-[80dvh] w-full max-w-[560px] overflow-y-auto border-2 border-[#0B0B0D] bg-[#F1EDE2] pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_0_0_#0B0B0D]"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Filtros de ${activeProductCategory.name}`}
                >
                  <ProductSubfilterPanel
                    categoryName={activeProductCategory.name}
                    categorySlug={activeProductCategory.slug || ""}
                    accent={accent}
                    state={productSubfilters}
                    onChange={setProductSubfilters}
                    onBack={() => setProductFilterSheetOpen(false)}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {tab === "courses" && (
          <CoursesGrid
            machineId={idMachine}
            categoryId={idCategory}
            priceFilter={coursePrice}
          />
        )}
          </div>
        </div>
      </div>

      {storyOpen && (
        <StoryPlayer
          entries={storyOpen.entries}
          initialIndex={storyOpen.index}
          onClose={() => setStoryOpen(null)}
          onProfileViewed={() => {
            // força refresh da StoryBar pra remover borda metálica
          }}
        />
      )}

      <MediaComposer
        open={creatorOpen}
        mode="story"
        initialKind="trampo"
        onClose={() => setCreatorOpen(false)}
        onPosted={() => setStoryBarKey((k) => k + 1)}
      />

      {/* FAB: Abrir chamado — broadcast pra todo o Enxame escolhido */}
      <button
        type="button"
        data-tour="search-open-chamado"
        onClick={() => setOpenChamadoOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5 active:translate-x-px active:translate-y-px sm:bottom-7 sm:right-7"
        aria-label="Abrir chamado"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Abrir chamado</span>
      </button>

      <OpenChamadoModal
        open={openChamadoOpen}
        onOpenChange={setOpenChamadoOpen}
        mode={tab === "products" ? "product" : tab === "courses" ? "course" : "service"}
        defaultMachineId={tab !== "products" && idMachine && idMachine > 0 ? idMachine : null}
      />
    </div>
  )
}
