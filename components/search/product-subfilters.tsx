"use client"

// Painel de subfiltros por categoria de produto (aba Produtos do /search).
// Drill-in: clicou numa categoria na coluna de filtros → a coluna vira este
// painel (título da categoria + campos do schema de lib/product-attributes).
// Régua de tamanho = slider duplo com os números visíveis; cores = swatches;
// marca = texto com sugestões; preço = faixa em R$ (sempre presente).
// Presentational: estado vive em search/page.tsx e vira querystring attr_*.

import { ArrowLeft, X } from "lucide-react"
import {
  COLOR_SWATCHES,
  getAttributeSchema,
  type AttrField,
} from "@/lib/product-attributes"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { cn } from "@/lib/utils"

export interface ProductSubfilterState {
  /** chips/colors: chave → valores marcados */
  attrs: Record<string, string[]>
  /** range (régua): chave → [min, max] selecionado */
  ranges: Record<string, [number, number]>
  brand: string
  priceMin: string // em reais (texto livre)
  priceMax: string
}

export function emptySubfilters(): ProductSubfilterState {
  return { attrs: {}, ranges: {}, brand: "", priceMin: "", priceMax: "" }
}

export function hasActiveSubfilters(s: ProductSubfilterState): boolean {
  return (
    Object.keys(s.attrs).length > 0 ||
    Object.keys(s.ranges).length > 0 ||
    s.brand.trim() !== "" ||
    s.priceMin.trim() !== "" ||
    s.priceMax.trim() !== ""
  )
}

function parseReais(input: string): number | null {
  const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}

/** Converte o estado em params attr_* / price_* pro GET /search/products. */
export function buildSubfilterParams(
  state: ProductSubfilterState,
  categorySlug: string | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  const schema = getAttributeSchema(categorySlug)
  const byKey = new Map(schema.map((f) => [f.key, f]))

  for (const [key, vals] of Object.entries(state.attrs)) {
    if (byKey.has(key) && vals.length > 0) out[`attr_${key}`] = vals.join(",")
  }
  for (const [key, [lo, hi]] of Object.entries(state.ranges)) {
    const field = byKey.get(key)
    if (!field || field.type !== "range") continue
    // Só filtra se a régua foi apertada em relação ao intervalo completo.
    if (lo > (field.min ?? 0)) out[`attr_${key}_min`] = String(lo)
    if (hi < (field.max ?? 0)) out[`attr_${key}_max`] = String(hi)
  }
  if (state.brand.trim()) out.attr_brand = state.brand.trim()

  const min = parseReais(state.priceMin)
  const max = parseReais(state.priceMax)
  if (min != null && min > 0) out.price_min = String(min)
  if (max != null && max > 0) out.price_max = String(max)
  return out
}

interface PanelProps {
  categoryName: string
  categorySlug: string
  accent: string
  state: ProductSubfilterState
  onChange: (next: ProductSubfilterState) => void
  onBack: () => void
}

export function ProductSubfilterPanel({
  categoryName, categorySlug, accent, state, onChange, onBack,
}: PanelProps) {
  const t = useTranslations("Search")
  const tx = useTaxonomy()
  const schema = getAttributeSchema(categorySlug)
  const displayName = tx.productCategory(categorySlug, categoryName)

  const toggleAttr = (key: string, option: string) => {
    const current = state.attrs[key] ?? []
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option]
    const attrs = { ...state.attrs }
    if (next.length === 0) delete attrs[key]
    else attrs[key] = next
    onChange({ ...state, attrs })
  }

  const setRange = (key: string, value: [number, number]) => {
    onChange({ ...state, ranges: { ...state.ranges, [key]: value } })
  }

  return (
    <div>
      {/* Cabeçalho do drill-in: voltar + título da categoria */}
      <div className="flex items-center gap-2 border-b-2 border-[#0B0B0D]/15 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("backToCategories", "Voltar pras categorias")}
          className="inline-flex h-7 w-7 items-center justify-center border-2 border-[#0B0B0D] bg-white/60 text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition-transform hover:-translate-y-0.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <span className="fl-display min-w-0 truncate text-xl leading-none text-[#0B0B0D]">
          {displayName}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4">
        {schema.map((field) => (
          <SubfilterField
            key={field.key}
            field={field}
            accent={accent}
            state={state}
            onToggle={toggleAttr}
            onRange={setRange}
            onBrand={(v) => onChange({ ...state, brand: v })}
          />
        ))}

        {/* Preço — sempre presente, em R$ */}
        <div>
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
            {t("priceBRL", "Preço (R$)")}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={state.priceMin}
              onChange={(e) => onChange({ ...state, priceMin: e.target.value })}
              placeholder={t("minPlaceholder", "mín")}
              className="w-full min-w-0 border-2 border-[#0B0B0D]/30 bg-white/60 px-2 py-1.5 font-mono text-xs text-[#0B0B0D] outline-none placeholder:text-[#6B6457] focus:border-[#0B0B0D]"
            />
            <span className="text-[10px] font-bold text-[#6B6457]">{t("toConnector", "a")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={state.priceMax}
              onChange={(e) => onChange({ ...state, priceMax: e.target.value })}
              placeholder={t("maxPlaceholder", "máx")}
              className="w-full min-w-0 border-2 border-[#0B0B0D]/30 bg-white/60 px-2 py-1.5 font-mono text-xs text-[#0B0B0D] outline-none placeholder:text-[#6B6457] focus:border-[#0B0B0D]"
            />
          </div>
        </div>

        {hasActiveSubfilters(state) && (
          <button
            type="button"
            onClick={() => onChange(emptySubfilters())}
            className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6B6457] transition hover:text-[#0B0B0D]"
          >
            <X className="h-3 w-3" /> {t("clearCategoryFilters", "Limpar filtros de {name}").replace("{name}", displayName)}
          </button>
        )}
      </div>
    </div>
  )
}

function SubfilterField({
  field, accent, state, onToggle, onRange, onBrand,
}: {
  field: AttrField
  accent: string
  state: ProductSubfilterState
  onToggle: (key: string, option: string) => void
  onRange: (key: string, value: [number, number]) => void
  onBrand: (v: string) => void
}) {
  const t = useTranslations("Search")
  const tx = useTaxonomy()
  if (field.type === "range") {
    const min = field.min ?? 0
    const max = field.max ?? 0
    const [lo, hi] = state.ranges[field.key] ?? [min, max]
    return (
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
            {tx.attrLabel(field.label)}
          </p>
          <span className="border border-[#0B0B0D]/30 bg-white/70 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-[#0B0B0D]">
            {lo === min && hi === max ? t("allRange", "todos") : lo === hi ? lo : `${lo} – ${hi}`}
          </span>
        </div>
        <RangeRuler
          min={min}
          max={max}
          step={field.step ?? 1}
          value={[lo, hi]}
          accent={accent}
          onChange={(v) => onRange(field.key, v)}
        />
      </div>
    )
  }

  if (field.type === "colors") {
    const selected = state.attrs[field.key] ?? []
    return (
      <div>
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
          {tx.attrLabel(field.label)}
        </p>
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
                  "h-6 w-6 rounded-full border-2 transition-transform hover:-translate-y-0.5",
                  active ? "border-[#0B0B0D] ring-2 ring-offset-1" : "border-[#0B0B0D]/30",
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
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
          {tx.attrLabel(field.label)}
        </p>
        <input
          type="text"
          value={state.brand}
          onChange={(e) => onBrand(e.target.value)}
          maxLength={80}
          placeholder={t("searchBrandPlaceholder", "Buscar marca…")}
          className="w-full border-2 border-[#0B0B0D]/30 bg-white/60 px-2 py-1.5 text-xs text-[#0B0B0D] outline-none placeholder:text-[#6B6457] focus:border-[#0B0B0D]"
        />
        {field.suggestions?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {field.suggestions.map((s) => {
              const active = state.brand.toLowerCase() === s.toLowerCase()
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onBrand(active ? "" : s)}
                  aria-pressed={active}
                  className={cn(
                    "border px-1.5 py-0.5 text-[10px] font-bold transition-transform hover:-translate-y-0.5",
                    active
                      ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[1px_1px_0_0_#0B0B0D]"
                      : "border-[#0B0B0D]/25 text-[#3a352c] hover:border-[#0B0B0D]",
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
  const selected = state.attrs[field.key] ?? []
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6B6457]">
        {tx.attrLabel(field.label)}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(field.options ?? []).map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(field.key, opt)}
              aria-pressed={active}
              className={cn(
                "border-2 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] transition-transform hover:-translate-y-0.5",
                active
                  ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
                  : "border-[#0B0B0D]/25 bg-white/50 text-[#3a352c] hover:border-[#0B0B0D]",
              )}
              style={active ? { background: accent } : undefined}
            >
              {tx.attrOption(opt)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Régua de faixa: dois <input type=range> sobrepostos + trilho marcado ────
function RangeRuler({
  min, max, step, value, accent, onChange,
}: {
  min: number
  max: number
  step: number
  value: [number, number]
  accent: string
  onChange: (v: [number, number]) => void
}) {
  const t = useTranslations("Search")
  const [lo, hi] = value
  const span = max - min || 1
  const loPct = ((lo - min) / span) * 100
  const hiPct = ((hi - min) / span) * 100

  return (
    <div>
      <div className="relative h-6">
        {/* trilho */}
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 border border-[#0B0B0D]/40 bg-white/60" />
        {/* trecho selecionado */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 border border-[#0B0B0D]"
          style={{ left: `${loPct}%`, right: `${100 - hiPct}%`, background: accent }}
        />
        {/* thumbs nativos (transparentes, um por extremidade) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={t("minAria", "Mínimo")}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi)
            onChange([v, hi])
          }}
          className="fl-range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={t("maxAria", "Máximo")}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo)
            onChange([lo, v])
          }}
          className="fl-range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
        />
      </div>
      {/* números das extremidades da régua */}
      <div className="mt-0.5 flex justify-between font-mono text-[10px] font-bold tabular-nums text-[#6B6457]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {/* estilos dos thumbs (só os thumbs recebem pointer events) */}
      <style>{`
        .fl-range-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          -webkit-appearance: none;
          appearance: none;
          height: 16px;
          width: 16px;
          border: 2px solid #0b0b0d;
          background: #f1ede2;
          box-shadow: 2px 2px 0 0 #0b0b0d;
          cursor: grab;
        }
        .fl-range-thumb::-moz-range-thumb {
          pointer-events: auto;
          height: 16px;
          width: 16px;
          border: 2px solid #0b0b0d;
          border-radius: 0;
          background: #f1ede2;
          box-shadow: 2px 2px 0 0 #0b0b0d;
          cursor: grab;
        }
      `}</style>
    </div>
  )
}
