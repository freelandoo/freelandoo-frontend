"use client"

// Sidebar lateral de filtros do /search (desktop, lg+), estilo Webmotors mas
// na identidade tabloide. Presentational: todo estado vem de page.tsx (o mesmo
// estado que alimenta os pills do header retrátil no mobile).
// Seções mudam por aba: services / products / courses.

import { useEffect, useId, useState } from "react"
import type { ReactNode } from "react"
import { ArrowLeft, ChevronDown, MapPin, Star, X } from "lucide-react"
import type { CatalogCategory, CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { MACHINES } from "@/components/home/machines/tokens"
import { RegionFilterSheet } from "@/components/feed/region-filter-sheet"
import { LEVEL_FILTER_OPTIONS } from "@/components/feed/level-filter-sheet"
import type { SearchTab } from "@/components/search/search-tabs-bar"
import {
  ProductSubfilterPanel,
  type ProductSubfilterState,
} from "@/components/search/product-subfilters"
import { getAttributeSchema } from "@/lib/product-attributes"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { cn } from "@/lib/utils"

export type CoursePriceFilter = "all" | "free" | "paid"

export interface ProductCategoryEntry {
  id_product_category: number
  name: string
  slug?: string
}

interface FilterRailProps {
  tab: SearchTab
  machines: CatalogMachine[]
  categories: CatalogCategory[]
  selectedMachineId: number | null
  selectedCategoryId: number | null
  state: string | null
  regionId: number | null
  regionName: string | null
  levelMin: number | null
  premiumOnly: boolean
  accent: string
  productCategories: ProductCategoryEntry[]
  productCategoryId: number | null
  productSubfilters: ProductSubfilterState
  coursePrice: CoursePriceFilter
  onMachineChange: (id: number | null) => void
  onCategoryChange: (id: number | null) => void
  onLocationChange: (next: { state: string | null; regionId: number | null; regionName: string | null }) => void
  onLevelChange: (level: number | null) => void
  onPremiumToggle: () => void
  onProductCategoryChange: (id: number | null) => void
  onProductSubfiltersChange: (next: ProductSubfilterState) => void
  onCoursePriceChange: (v: CoursePriceFilter) => void
  onClearAll: () => void
}

function machineAccent(m: CatalogMachine): string {
  const seed = MACHINES.find((x) => x.id === m.slug)
  return seed?.colors.accent || m.color_accent || "#F2B705"
}

export function FilterRail(props: FilterRailProps) {
  const {
    tab, machines, categories, selectedMachineId, selectedCategoryId,
    state, regionId, regionName, levelMin, premiumOnly, accent,
    productCategories, productCategoryId, productSubfilters, coursePrice,
    onMachineChange, onCategoryChange, onLocationChange, onLevelChange,
    onPremiumToggle, onProductCategoryChange, onProductSubfiltersChange,
    onCoursePriceChange, onClearAll,
  } = props

  const t = useTranslations("Search")
  const tx = useTaxonomy()

  // Drill-in da aba Produtos: categoria clicada vira painel de subfiltros.
  const [productDrill, setProductDrill] = useState(false)
  const activeProductCategory =
    productCategories.find((c) => c.id_product_category === productCategoryId) || null
  const drillSchema = getAttributeSchema(activeProductCategory?.slug)
  const showDrill = tab === "products" && productDrill && !!activeProductCategory && drillSchema.length > 0

  const activeMachine = machines.find((m) => m.id_machine === selectedMachineId) || null

  // Drill-in de Serviços/Cursos: enxame clicado vira painel com as profissões
  // só daquele enxame + Nível/Premium (serviços) ou Preço (cursos), tudo botão;
  // Região é o único dropdown. Mesmo esquema do drill de Produtos.
  const [enxameDrill, setEnxameDrill] = useState(false)
  const showEnxameDrill = (tab === "services" || tab === "courses") && enxameDrill && !!activeMachine
  useEffect(() => {
    // Limpou o enxame por fora (pills do header / Limpar) → sai do drill.
    if (!selectedMachineId) setEnxameDrill(false)
  }, [selectedMachineId])
  useEffect(() => {
    setEnxameDrill(false)
  }, [tab])
  const hasFilters =
    !!(selectedMachineId || selectedCategoryId || state || regionId || levelMin ||
       premiumOnly || productCategoryId || coursePrice !== "all")

  const isEnxameTab = tab === "services" || tab === "courses"

  // Seções reutilizadas dentro e fora do drill de enxame.
  const regionSection = (
    <RailSection title={t("regionFilterLabel", "Região")} defaultOpen={false}>
      <RegionFilterSheet
        state={state}
        regionId={regionId}
        regionName={regionName}
        onChange={onLocationChange}
        accent={accent}
        trigger={
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 border-2 px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5",
              state || regionId
                ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
                : "border-[#0B0B0D]/30 bg-white/50 text-[#0B0B0D] hover:border-[#0B0B0D]"
            )}
            style={state || regionId ? { background: accent } : undefined}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{regionName || state || t("chooseRegion", "Escolher região")}</span>
          </button>
        }
      />
      {(state || regionId) && (
        <button
          type="button"
          onClick={() => onLocationChange({ state: null, regionId: null, regionName: null })}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#6B6457] hover:text-[#0B0B0D]"
        >
          <X className="h-3 w-3" /> {t("removeRegion", "Remover região")}
        </button>
      )}
    </RailSection>
  )

  const levelSection = (
    <RailSection title={t("levelFilterLabel", "Nível")} defaultOpen={false}>
      <RailOption label={t("anyLevel", "Qualquer")} active={levelMin == null} accent={accent} onClick={() => onLevelChange(null)} />
      {LEVEL_FILTER_OPTIONS.filter((o) => o.value != null).map((o) => (
        <RailOption
          key={String(o.value)}
          label={t(`level${o.value}Plus`, o.label)}
          active={levelMin === o.value}
          accent={accent}
          onClick={() => onLevelChange(levelMin === o.value ? null : o.value)}
        />
      ))}
    </RailSection>
  )

  const premiumSection = (
    <RailSection title={t("premiumButtonLabel", "Premium")} defaultOpen={false}>
      <button
        type="button"
        onClick={onPremiumToggle}
        className={cn(
          "flex w-full items-center gap-2 border-2 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5",
          premiumOnly
            ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
            : "border-[#0B0B0D]/30 bg-white/50 text-[#0B0B0D] hover:border-[#0B0B0D]"
        )}
      >
        <Star className={cn("h-3.5 w-3.5", premiumOnly && "fill-current")} />
        {t("premiumOnlyLabel", "Só perfis Premium")}
      </button>
    </RailSection>
  )

  const coursePriceSection = (
    <RailSection title={t("priceSection", "Preço")} defaultOpen={false}>
      <RailOption label={t("allMale", "Todos")} active={coursePrice === "all"} accent={accent} onClick={() => onCoursePriceChange("all")} />
      <RailOption label={t("freeCoursesLabel", "Gratuitos")} active={coursePrice === "free"} accent={accent} onClick={() => onCoursePriceChange("free")} />
      <RailOption label={t("paidCoursesLabel", "Pagos")} active={coursePrice === "paid"} accent={accent} onClick={() => onCoursePriceChange("paid")} />
    </RailSection>
  )

  return (
    <aside className="hidden w-[270px] shrink-0 lg:block">
      <div className="sticky top-[76px] max-h-[calc(100dvh-92px)] overflow-y-auto border-2 border-[#0B0B0D] bg-[#F1EDE2] shadow-[5px_5px_0_0_#0B0B0D] [scrollbar-width:thin]">
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D] bg-[#0B0B0D] px-4 py-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#F1EDE2]">{t("filtersButton", "Filtros")}</span>
          {hasFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F2B705] transition hover:text-[#F1EDE2]"
            >
              <X className="h-3 w-3" /> {t("clearButton", "Limpar")}
            </button>
          )}
        </div>

        {tab === "products" && showDrill && activeProductCategory && (
          <ProductSubfilterPanel
            categoryName={activeProductCategory.name}
            categorySlug={activeProductCategory.slug || ""}
            accent={accent}
            state={productSubfilters}
            onChange={onProductSubfiltersChange}
            onBack={() => setProductDrill(false)}
          />
        )}

        {tab === "products" && !showDrill && (
          <RailSection title={t("categoryLabel", "Categoria")} defaultOpen>
            <RailOption label={t("allFemale", "Todas")} active={productCategoryId == null} accent={accent} onClick={() => { onProductCategoryChange(null); setProductDrill(false) }} />
            {productCategories.map((c) => (
              <RailOption
                key={c.id_product_category}
                label={tx.productCategory(c.slug, c.name)}
                active={c.id_product_category === productCategoryId}
                accent={accent}
                onClick={() => {
                  onProductCategoryChange(c.id_product_category)
                  // Abre o painel de subfiltros se a categoria tiver schema.
                  if (getAttributeSchema(c.slug).length > 0) setProductDrill(true)
                }}
              />
            ))}
          </RailSection>
        )}

        {/* Drill-in de enxame (Serviços/Cursos): profissões do enxame + Nível/
            Premium (serviços) ou Preço (cursos); Região é o único dropdown. */}
        {isEnxameTab && showEnxameDrill && activeMachine && (
          <>
            <div className="flex items-center gap-2 border-b-2 border-[#0B0B0D]/15 px-4 py-3">
              <button
                type="button"
                onClick={() => setEnxameDrill(false)}
                aria-label={t("backToEnxames", "Voltar pros enxames")}
                className="inline-flex h-7 w-7 items-center justify-center border-2 border-[#0B0B0D] bg-white/60 text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <span className="h-2.5 w-2.5 shrink-0 border border-[#0B0B0D]" style={{ background: machineAccent(activeMachine) }} />
              <span className="fl-display min-w-0 truncate text-xl leading-none text-[#0B0B0D]">
                {tx.enxame(activeMachine.slug, activeMachine.name)}
              </span>
            </div>

            <RailSection title={t("professionFilterLabel", "Profissão")} defaultOpen>
              <RailOption label={t("allFemale", "Todas")} active={selectedCategoryId == null} accent={accent} onClick={() => onCategoryChange(null)} />
              {categories.map((c) => (
                <RailOption
                  key={c.id_category}
                  label={tx.profession(c.desc_category)}
                  active={c.id_category === selectedCategoryId}
                  accent={accent}
                  onClick={() => onCategoryChange(c.id_category === selectedCategoryId ? null : c.id_category)}
                />
              ))}
            </RailSection>

            {tab === "services" && levelSection}
            {tab === "services" && premiumSection}
            {tab === "services" && regionSection}
            {tab === "courses" && coursePriceSection}
          </>
        )}

        {/* Lista de enxames (fora do drill): clicar num enxame abre o drill. */}
        {isEnxameTab && !showEnxameDrill && (
          <>
            <RailSection title={t("enxamesSection", "Enxames")} defaultOpen>
              <RailOption label={t("allMale", "Todos")} active={selectedMachineId == null} accent="#F2B705" onClick={() => { onMachineChange(null); onCategoryChange(null); setEnxameDrill(false) }} />
              {machines.map((m) => {
                const tint = machineAccent(m)
                const active = m.id_machine === selectedMachineId
                return (
                  <RailOption
                    key={m.id_machine}
                    label={tx.enxame(m.slug, m.name)}
                    active={active}
                    accent={tint}
                    dot={tint}
                    onClick={() => {
                      // Clique vira página do enxame (drill) com as profissões dele.
                      if (!active) {
                        onMachineChange(m.id_machine)
                        onCategoryChange(null)
                      }
                      setEnxameDrill(true)
                    }}
                  />
                )
              })}
            </RailSection>

            {tab === "services" && regionSection}
            {tab === "services" && levelSection}
            {tab === "services" && premiumSection}
            {tab === "courses" && coursePriceSection}
          </>
        )}
      </div>
    </aside>
  )
}

/* Seção retrátil sem lib: anima grid-template-rows (0fr ⇄ 1fr). */
function RailSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  return (
    <section className="border-b-2 border-[#0B0B0D]/15 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#0B0B0D]/[0.04]"
      >
        <span className="fl-display text-lg leading-none text-[#0B0B0D]">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-[#0B0B0D]/60 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div
        id={panelId}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 px-4 pb-3">{children}</div>
        </div>
      </div>
    </section>
  )
}

function RailOption({
  label, active, accent, dot, onClick,
}: { label: string; active: boolean; accent: string; dot?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2 border-2 px-3 py-1.5 text-left text-[11px] font-extrabold uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5",
        active
          ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
          : "border-transparent text-[#3a352c] hover:border-[#0B0B0D]/40"
      )}
      style={active ? { background: accent } : undefined}
    >
      {dot && <span className="h-2 w-2 shrink-0 border border-[#0B0B0D]" style={{ background: dot }} />}
      <span className="truncate">{label}</span>
    </button>
  )
}
