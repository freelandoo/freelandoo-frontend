# Filtro Lateral do /search (estilo Webmotors) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sidebar lateral de filtros no `/search` (desktop), com seções retráteis que mudam conforme a aba (Serviços / Produtos / Cursos), e grids 100% edge-to-edge (cards colados, `gap-px`, sem rounded) em todas as abas.

**Architecture:** Um componente novo `FilterRail` (presentational, recebe todo o estado por props — o estado continua vivendo em `page.tsx`, que já o gerencia hoje para o header retrátil). No desktop (`lg:+`) a página vira duas colunas: rail sticky à esquerda + conteúdo à direita; o header retrátil esconde os pills no `lg:+` (o rail assume) e o mobile fica como está (pills + chips de categoria). `ProductsGrid` e `CoursesGrid` são reescritos no padrão vitrine de serviços (tabloide: edge-to-edge, cantos retos, overlay).

**Tech Stack:** Nada novo. Reusa o que já está instalado: Tailwind 4, Radix (sheets existentes `RegionFilterSheet` etc.), lucide-react, GSAP (já usado). Sem dependência nova — as seções retráteis do rail usam o truque CSS `grid-rows-[0fr→1fr]` (anima `grid-template-rows`, barato e sem lib).

**Identidade visual:** tabloide do `/search` atual — canvas `#0b0804`, papel `#F1EDE2`, ink `#0B0B0D`, dourado `#F2B705`, accent dinâmico por enxame. Cantos retos, `border-2`, sombra dura `shadow-[3px_3px_0_0_#0B0B0D]`. **Zero `rounded`** em tudo que este plano cria.

**Backend:** ZERO mudanças. Todos os filtros já existem: serviços (`/api/search` com id_machine/id_category/estado/id_region/level_min + premium client-side), produtos (`/api/search/products` com id_product_category/state/id_region), cursos (`/api/search/courses` com id_machine/id_category; Gratuito/Pago filtra client-side via `price_cents`).

**Validação (repo não tem testes de componente):** cada task termina com `npx eslint <arquivos>` + `npx tsc --noEmit` limpos e commit. Caminhos sempre com aspas (path tem espaço).

---

## Decisões cravadas (não rediscutir na execução)

1. **Rail é desktop-only (`hidden lg:block`).** Mobile mantém os pills do header retrátil + chips de categoria de produto (`lg:hidden`). Sem drawer novo — o estado é o mesmo, só muda onde se renderiza.
2. **Seções por aba:**
   - **Serviços:** `ENXAMES` (botões com cor do enxame) → `PROFISSÃO` (lista, só habilita com enxame ativo) → `REGIÃO` (botão que abre o `RegionFilterSheet` existente) → `NÍVEL` (opções do `LEVEL_FILTER_OPTIONS`) → `PREMIUM` (toggle).
   - **Produtos:** `CATEGORIA` (categorias de produto) → `REGIÃO` (mesmo sheet).
   - **Cursos:** `ENXAMES` → `PROFISSÃO` → `PREÇO` (Todos / Gratuitos / Pagos — client-side).
3. **Grid de serviços** mantém `grid-cols-3 gap-px` mas no desktop com rail passa a `lg:grid-cols-4` (não 5 — o rail ocupa ~270px).
4. **Produtos = padrão vitrine:** tile full-bleed `aspect-[3/4]` (foto de produto é quadrada; 9:16 cortaria demais, 3:4 preserva e mantém a leitura de vitrine), gradiente inferior com nome/preço/cidade, `gap-px`, 3/4 colunas. Sem rounded, sem padding externo.
5. **Cursos:** `grid-cols-2 lg:grid-cols-3`, `gap-px`, edge-to-edge, capa 16/9 + faixa de info — sem rounded.
6. **Fora do escopo (não fazer):** filtro de preço em produtos (backend não suporta; fase 2), contagem de resultados no rail, URL-sync de filtros além do existente, mudanças de backend.

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `components/search/filter-rail.tsx` | **Criar** | Sidebar completa: `RailSection` (retrátil) + seções por aba. Presentational — estado via props. |
| `components/search/product-tile.tsx` | **Criar** | Tile de produto edge-to-edge (espelho do `FreelancerTile`). |
| `components/search/products-grid.tsx` | **Modificar** | Trocar grid rounded/gap-3 pela vitrine `gap-px` usando `ProductTile`. |
| `components/search/courses-grid.tsx` | **Modificar** | Grid 2/3 col `gap-px` edge-to-edge + prop `priceFilter`. |
| `app/(header-only)/search/page.tsx` | **Modificar** | Layout 2 colunas no lg+, estado `coursePrice`, chips de produto `lg:hidden`, montar `FilterRail`. |
| `components/search/search-retractable-header.tsx` | **Modificar** | Esconder pills no `lg:+` (1 className). |

---

### Task 1: `RailSection` + `FilterRail`

**Files:**
- Create: `components/search/filter-rail.tsx`

- [ ] **Step 1: Criar o arquivo com o conteúdo completo**

```tsx
"use client"

// Sidebar lateral de filtros do /search (desktop, lg+), estilo Webmotors mas
// na identidade tabloide. Presentational: todo estado vem de page.tsx (o mesmo
// estado que alimenta os pills do header retrátil no mobile).
// Seções mudam por aba: services / products / courses.

import { useState } from "react"
import type { ReactNode } from "react"
import { ChevronDown, MapPin, Star, X } from "lucide-react"
import type { CatalogCategory, CatalogMachine } from "@/components/home/machines/use-machines-catalog"
import { MACHINES } from "@/components/home/machines/tokens"
import { RegionFilterSheet } from "@/components/feed/region-filter-sheet"
import { LEVEL_FILTER_OPTIONS } from "@/components/feed/level-filter-sheet"
import type { SearchTab } from "@/components/search/search-tabs-bar"
import { cn } from "@/lib/utils"

export type CoursePriceFilter = "all" | "free" | "paid"

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
  productCategories: { id_product_category: number; name: string }[]
  productCategoryId: number | null
  coursePrice: CoursePriceFilter
  onMachineChange: (id: number | null) => void
  onCategoryChange: (id: number | null) => void
  onLocationChange: (next: { state: string | null; regionId: number | null; regionName: string | null }) => void
  onLevelChange: (level: number | null) => void
  onPremiumToggle: () => void
  onProductCategoryChange: (id: number | null) => void
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
    productCategories, productCategoryId, coursePrice,
    onMachineChange, onCategoryChange, onLocationChange, onLevelChange,
    onPremiumToggle, onProductCategoryChange, onCoursePriceChange, onClearAll,
  } = props

  const activeMachine = machines.find((m) => m.id_machine === selectedMachineId) || null
  const hasFilters =
    !!(selectedMachineId || selectedCategoryId || state || regionId || levelMin ||
       premiumOnly || productCategoryId || coursePrice !== "all")

  const showEnxame = tab === "services" || tab === "courses"
  const showProfession = tab === "services" || tab === "courses"
  const showRegion = tab === "services" || tab === "products"

  return (
    <aside className="hidden w-[270px] shrink-0 lg:block">
      <div className="sticky top-[76px] max-h-[calc(100dvh-92px)] overflow-y-auto border-2 border-[#0B0B0D] bg-[#F1EDE2] shadow-[5px_5px_0_0_#0B0B0D] [scrollbar-width:thin]">
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D] bg-[#0B0B0D] px-4 py-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#F1EDE2]">Filtros</span>
          {hasFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#F2B705] transition hover:text-[#F1EDE2]"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>

        {tab === "products" && (
          <RailSection title="Categoria" defaultOpen>
            <RailOption label="Todas" active={productCategoryId == null} accent={accent} onClick={() => onProductCategoryChange(null)} />
            {productCategories.map((c) => (
              <RailOption
                key={c.id_product_category}
                label={c.name}
                active={c.id_product_category === productCategoryId}
                accent={accent}
                onClick={() => onProductCategoryChange(c.id_product_category)}
              />
            ))}
          </RailSection>
        )}

        {showEnxame && (
          <RailSection title="Enxames" defaultOpen>
            <RailOption label="Todos" active={selectedMachineId == null} accent="#F2B705" onClick={() => { onMachineChange(null); onCategoryChange(null) }} />
            {machines.map((m) => {
              const tint = machineAccent(m)
              const active = m.id_machine === selectedMachineId
              return (
                <RailOption
                  key={m.id_machine}
                  label={m.name.replace(/^Enxame de\s+/i, "")}
                  active={active}
                  accent={tint}
                  dot={tint}
                  onClick={() => { onMachineChange(active ? null : m.id_machine); onCategoryChange(null) }}
                />
              )
            })}
          </RailSection>
        )}

        {showProfession && (
          <RailSection title="Profissão" defaultOpen={!!activeMachine}>
            {!activeMachine ? (
              <p className="px-1 py-1 text-[11px] font-semibold text-[#6B6457]">Escolha um enxame primeiro.</p>
            ) : (
              <>
                <RailOption label="Todas" active={selectedCategoryId == null} accent={accent} onClick={() => onCategoryChange(null)} />
                {categories.map((c) => (
                  <RailOption
                    key={c.id_category}
                    label={c.desc_category}
                    active={c.id_category === selectedCategoryId}
                    accent={accent}
                    onClick={() => onCategoryChange(c.id_category === selectedCategoryId ? null : c.id_category)}
                  />
                ))}
              </>
            )}
          </RailSection>
        )}

        {showRegion && (
          <RailSection title="Região" defaultOpen={false}>
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
                  <span className="truncate">{regionName || state || "Escolher região"}</span>
                </button>
              }
            />
            {(state || regionId) && (
              <button
                type="button"
                onClick={() => onLocationChange({ state: null, regionId: null, regionName: null })}
                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#6B6457] hover:text-[#0B0B0D]"
              >
                <X className="h-3 w-3" /> Remover região
              </button>
            )}
          </RailSection>
        )}

        {tab === "services" && (
          <RailSection title="Nível" defaultOpen={false}>
            <RailOption label="Qualquer" active={levelMin == null} accent={accent} onClick={() => onLevelChange(null)} />
            {LEVEL_FILTER_OPTIONS.filter((o) => o.value != null).map((o) => (
              <RailOption
                key={String(o.value)}
                label={o.label}
                active={levelMin === o.value}
                accent={accent}
                onClick={() => onLevelChange(levelMin === o.value ? null : o.value)}
              />
            ))}
          </RailSection>
        )}

        {tab === "services" && (
          <RailSection title="Premium" defaultOpen={false}>
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
              Só perfis Premium
            </button>
          </RailSection>
        )}

        {tab === "courses" && (
          <RailSection title="Preço" defaultOpen={false}>
            <RailOption label="Todos" active={coursePrice === "all"} accent={accent} onClick={() => onCoursePriceChange("all")} />
            <RailOption label="Gratuitos" active={coursePrice === "free"} accent={accent} onClick={() => onCoursePriceChange("free")} />
            <RailOption label="Pagos" active={coursePrice === "paid"} accent={accent} onClick={() => onCoursePriceChange("paid")} />
          </RailSection>
        )}
      </div>
    </aside>
  )
}

/* Seção retrátil sem lib: anima grid-template-rows (0fr ⇄ 1fr). */
function RailSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b-2 border-[#0B0B0D]/15 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#0B0B0D]/[0.04]"
      >
        <span className="fl-display text-lg leading-none text-[#0B0B0D]">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-[#0B0B0D]/60 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div
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
```

- [ ] **Step 2: Validar**

Run: `npx eslint "components/search/filter-rail.tsx"` → sem output.
Run: `npx tsc --noEmit 2>&1 | grep -i "filter-rail"` → sem output.
Nota: se `LEVEL_FILTER_OPTIONS` tipar `value` como `number | null`, o filtro `.filter((o) => o.value != null)` resolve; se o tsc reclamar de `levelMin === o.value`, fazer cast `o.value as number`.

- [ ] **Step 3: Commit**

```bash
git add "components/search/filter-rail.tsx"
git commit -m "feat(search): FilterRail — sidebar de filtros por aba (desktop)"
```

---

### Task 2: `ProductTile` (vitrine de produto)

**Files:**
- Create: `components/search/product-tile.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
"use client"

// Tile de produto edge-to-edge para a vitrine do /search — espelha o
// FreelancerTile (full-bleed, overlay inferior, sem borda/rounded/margem).
// aspect-[3/4]: foto de produto é quadrada; 3:4 preserva o produto e deixa
// espaço pro overlay (9:16 cortaria demais).

import Image from "next/image"
import Link from "next/link"
import { Package } from "lucide-react"

export type ProductTileItem = {
  id_profile_product: number
  name: string
  price_amount: number
  category_name: string | null
  profile_display_name: string | null
  sub_profile_slug: string | null
  username: string | null
  estado: string | null
  municipio: string | null
  thumb_url: string | null
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ProductTile({ p }: { p: ProductTileItem }) {
  const href = p.sub_profile_slug ? `/p/${p.sub_profile_slug}` : p.username ? `/${p.username}` : "#"
  return (
    <Link
      href={href}
      className="group relative block aspect-[3/4] w-full overflow-hidden bg-zinc-900 transition-transform duration-300 active:scale-[0.98]"
    >
      {p.thumb_url ? (
        <Image
          src={p.thumb_url}
          alt={p.name}
          fill
          sizes="(max-width: 768px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/25">
          <Package className="h-10 w-10" />
        </div>
      )}

      {p.category_name && (
        <span className="absolute left-2 top-2 z-10 bg-[#0B0B0D]/80 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#F1EDE2]">
          {p.category_name}
        </span>
      )}

      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-0.5 p-3">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)]">
          {p.name}
        </h3>
        <p className="text-[15px] font-black tracking-tight text-[#F2B705] drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
          {formatBRL(p.price_amount)}
        </p>
        <p className="line-clamp-1 text-[10px] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
          {p.municipio}{p.municipio && p.estado ? ", " : ""}{p.estado}
          {p.profile_display_name ? ` · ${p.profile_display_name}` : ""}
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Validar** — `npx eslint "components/search/product-tile.tsx"` e `npx tsc --noEmit` filtrado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "components/search/product-tile.tsx"
git commit -m "feat(search): ProductTile edge-to-edge no padrao da vitrine"
```

---

### Task 3: `ProductsGrid` → vitrine `gap-px`

**Files:**
- Modify: `components/search/products-grid.tsx`

- [ ] **Step 1: Substituir o bloco do grid (linhas 88–146, o `return` final) por:**

```tsx
  return (
    <div className="mx-auto grid w-full max-w-[640px] grid-cols-3 gap-px bg-white/[0.03] pb-6 md:max-w-[760px] lg:max-w-none lg:grid-cols-4">
      {items.map((p) => (
        <ProductTile key={p.id_profile_product} p={p} />
      ))}
    </div>
  )
```

- [ ] **Step 2: Ajustar imports do arquivo** — remover `Link`, `Image` e `cn` (não usados mais), manter `Loader2`/`Package` (estados), e adicionar:

```tsx
import { ProductTile } from "@/components/search/product-tile"
```

A função local `formatBRL` também sai (vive no tile). O tipo `ProductItem` continua (é o shape do fetch) — o `ProductTile` aceita por structural typing.

- [ ] **Step 3: Validar** — eslint + tsc filtrado em `products-grid` sem erros.

- [ ] **Step 4: Commit**

```bash
git add "components/search/products-grid.tsx"
git commit -m "feat(search): produtos no padrao vitrine — gap-px, cards colados"
```

---

### Task 4: `CoursesGrid` → 2/3 colunas edge-to-edge + `priceFilter`

**Files:**
- Modify: `components/search/courses-grid.tsx`

- [ ] **Step 1: Adicionar a prop e o filtro client-side.** Em `Props`:

```tsx
interface Props {
  machineId: number | null
  categoryId: number | null
  q?: string | null
  /** Filtro client-side: cursos com price_cents nulo/0 = gratuitos. */
  priceFilter?: "all" | "free" | "paid"
}
```

Na assinatura: `export function CoursesGrid({ machineId, categoryId, q, priceFilter = "all" }: Props)`.
Após o fetch (antes dos early-returns), derivar:

```tsx
  const visible = items.filter((c) => {
    if (priceFilter === "free") return !c.price_cents
    if (priceFilter === "paid") return !!c.price_cents && c.price_cents > 0
    return true
  })
```

Trocar `items.length === 0` por `visible.length === 0` no empty-state e `items.map` por `visible.map`.

- [ ] **Step 2: Trocar o grid e o card pro padrão tabloide.** Container (linha 88):

```tsx
    <div className="mx-auto grid w-full max-w-[640px] grid-cols-2 gap-px bg-white/[0.03] pb-6 md:max-w-[760px] lg:max-w-none lg:grid-cols-3">
```

No `<Link>` do card, remover `rounded-2xl` e as classes de borda/hover soft; novo className:

```tsx
            className="group relative flex flex-col overflow-hidden bg-zinc-900 transition-transform duration-300 active:scale-[0.98]"
```

(remover também o `style={{ transition: ... }}` inline). No badge de categoria, trocar `rounded-full` por nada (fica reto): `className="absolute left-2 top-2 bg-black/70 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] backdrop-blur"` mantendo o `style` de cor. O bloco de info embaixo (`p-3`) ganha fundo de papel pra leitura tabloide:

```tsx
            <div className="flex flex-1 flex-col gap-1.5 border-t-2 border-[#0B0B0D] bg-[#F1EDE2] p-3">
              <p className="line-clamp-2 text-[13px] font-bold leading-tight text-[#0B0B0D]">{c.title}</p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <p className="text-[14px] font-black tracking-tight" style={{ color: "#9a7400" }}>
                  {formatBRL(c.price_cents)}
                </p>
                {c.profile_display_name && (
                  <p className="truncate text-[10px] font-semibold text-[#6B6457]">{c.profile_display_name}</p>
                )}
              </div>
            </div>
```

(remove o `short_description` — densidade da vitrine.)

- [ ] **Step 3: Validar** — eslint + tsc filtrado em `courses-grid` sem erros.

- [ ] **Step 4: Commit**

```bash
git add "components/search/courses-grid.tsx"
git commit -m "feat(search): cursos 2/3 colunas edge-to-edge + filtro gratuito/pago"
```

---

### Task 5: Layout 2 colunas + montar o rail em `page.tsx`

**Files:**
- Modify: `app/(header-only)/search/page.tsx`

- [ ] **Step 1: Novo estado + import.** Junto dos imports:

```tsx
import { FilterRail, type CoursePriceFilter } from "@/components/search/filter-rail"
```

Junto dos states (após `productCategories`):

```tsx
  const [coursePrice, setCoursePrice] = useState<CoursePriceFilter>("all")
```

E em `clearAll()`, adicionar ao final: `setProductCategoryId(null); setCoursePrice("all")`.

- [ ] **Step 2: Carregar categorias de produto também quando o rail existe.** O efeito atual só busca com `tab === "products"` — manter (o rail de produtos só aparece nessa aba; nada muda).

- [ ] **Step 3: Restruturar o miolo do return.** Hoje a sequência dentro do scroller é: spacer → `SearchTabsBar` → blocos por aba. Passa a ser: spacer → `SearchTabsBar` → **wrapper 2 colunas**. Substituir tudo entre `<SearchTabsBar ... />` e o fechamento do scroller (`</div>` do `ref={scrollRef}`) por:

```tsx
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
            coursePrice={coursePrice}
            onMachineChange={(id) => { setIdMachine(id); setIdCategory(null) }}
            onCategoryChange={setIdCategory}
            onLocationChange={({ state, regionId, regionName }) => { setSelectedEstado(state); setSelectedRegionId(regionId); setSelectedRegionName(regionName) }}
            onLevelChange={setLevelMin}
            onPremiumToggle={() => setPremiumOnly((v) => !v)}
            onProductCategoryChange={setProductCategoryId}
            onCoursePriceChange={setCoursePrice}
            onClearAll={clearAll}
          />

          <div className="min-w-0 flex-1">
            {/* ⬇⬇ os blocos por aba existentes entram aqui, inalterados exceto
                pelos pontos das Steps 4–6 ⬇⬇ */}
          </div>
        </div>
```

Mover para dentro de `div.min-w-0.flex-1` (sem alterar a lógica): o bloco da StoryBar (`tab === "services" && <div className="border-b-2...`), o bloco do grid de serviços, o bloco de produtos e o de cursos.

- [ ] **Step 4: Grid de serviços no desktop com rail.** No container do grid de serviços, trocar `lg:max-w-[1080px] lg:grid-cols-5` por `lg:max-w-none lg:grid-cols-4`:

```tsx
          <div className="mx-auto grid w-full max-w-[640px] grid-cols-3 gap-px bg-white/[0.03] pb-6 md:max-w-[760px] md:grid-cols-4 lg:max-w-none lg:grid-cols-4">
```

- [ ] **Step 5: Chips de categoria de produto viram mobile-only.** No wrapper da barra de chips (`tab === "products"` → primeiro `<div className="fl-root border-b-2...">`), adicionar `lg:hidden`:

```tsx
            <div className="fl-root border-b-2 border-[#0B0B0D] bg-[#0b0804]/60 backdrop-blur-sm lg:hidden">
```

- [ ] **Step 6: Passar o priceFilter pros cursos.**

```tsx
        {tab === "courses" && (
          <CoursesGrid
            machineId={idMachine}
            categoryId={idCategory}
            priceFilter={coursePrice}
          />
        )}
```

- [ ] **Step 7: Validar** — `npx eslint "app/(header-only)/search/page.tsx"` + `npx tsc --noEmit` (filtrar por `search`): sem erros.

- [ ] **Step 8: Commit**

```bash
git add "app/(header-only)/search/page.tsx"
git commit -m "feat(search): layout 2 colunas com FilterRail no desktop"
```

---

### Task 6: Esconder pills do header no desktop

**Files:**
- Modify: `components/search/search-retractable-header.tsx:117`

- [ ] **Step 1:** No container dos pills (linha ~117), adicionar `lg:hidden`:

```tsx
          <div className="ml-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:ml-2 lg:hidden">
```

(O header continua existindo no desktop — logo + faixa dourada — só os pills somem, porque o rail assume.)

- [ ] **Step 2: Validar + commit**

```bash
git add "components/search/search-retractable-header.tsx"
git commit -m "feat(search): header esconde pills no lg+ (rail assume os filtros)"
```

---

### Task 7: Verificação visual final + push

- [ ] **Step 1:** `npm run dev` e abrir `http://localhost:3000/search`. Conferir em ≥1024px: rail à esquerda com seções Enxames/Profissão/Região/Nível/Premium; trocar pra aba Produtos → rail vira Categoria/Região e grid fica colado `gap-px` 3/4 col; aba Cursos → rail Enxames/Profissão/Preço, grid 3 col. Em <1024px: rail some, pills do header e chips de produto voltam; cursos em 2 colunas.
- [ ] **Step 2:** Clicar um enxame no rail → grid filtra e o pill mobile (resize) reflete o mesmo estado (estado único em page.tsx).
- [ ] **Step 3:** `npx tsc --noEmit` limpo; `npx eslint components/search app/\(header-only\)/search` limpo.
- [ ] **Step 4:** `git push`.

---

## Self-Review (executado na escrita)

- **Cobertura:** sidebar por aba ✓ (T1+T5), cards colados em todas as abas ✓ (T3 produtos, T4 cursos, serviços já era e mantém em T5.4), produtos padrão vitrine ✓ (T2+T3), cursos 3 web / 2 mobile ✓ (T4), mobile preservado ✓ (T5.5+T6).
- **Placeholders:** nenhum — todo step tem código/diff exato.
- **Consistência de tipos:** `CoursePriceFilter` exportado em T1 e importado em T5; `ProductTileItem` compatível por structural typing com `ProductItem` do grid; `SearchTab` reusado do tabs-bar. Risco mapeado: tipo de `LEVEL_FILTER_OPTIONS.value` (mitigação descrita em T1 Step 2).
- **Riscos conhecidos:** (a) `sticky top-[76px]` do rail depende da altura real do `SearchTabsBar` sticky — ajustar o offset na verificação visual se sobrepor; (b) grid de serviços com `lg:grid-cols-4` + rail pode apertar em 1024–1180px — se tile ficar <180px, cair pra `lg:grid-cols-3 xl:grid-cols-4`.
