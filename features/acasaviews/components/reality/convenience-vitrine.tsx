"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, BarChart3, Check, Crown, Flame, Loader2, PackageCheck, PackageX, ShoppingBag, Star, Timer, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { RealityStage } from "./reality-stage"
import { TiltCard } from "./tilt-card"
import { brl, pad2 } from "./format"

export type StoreProduct = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price_cents: number
  stock: number | null
  is_active?: boolean
  sort_order?: number
  media?: { id: string; media_url: string; media_type?: string }[]
}

export type SupportTarget = { slug: string; name: string; avatar: string | null; status: string }

type ShelfFilter = "all" | "stock" | "last"

const FILTERS: { key: ShelfFilter; label: string; icon: typeof Star }[] = [
  { key: "all", label: "Destaques", icon: Star },
  { key: "stock", label: "Em estoque", icon: PackageCheck },
  { key: "last", label: "Últimas unidades", icon: Timer },
]

function matches(p: StoreProduct, f: ShelfFilter): boolean {
  if (f === "all") return true
  const s = stockState(p)
  if (f === "stock") return !s.soldOut
  return s.low
}

/**
 * Vitrine da Conveniência Views — na composição da referência (2026-10-05):
 * manchete larga gasta, painel lateral, trilho de filtros, destaque grande e a
 * prateleira em cards de quadro escuro + painel branco.
 *
 * Onde ela diverge da referência DE PROPÓSITO (não "consertar" sem o backend):
 * - CARRINHO: o checkout (`POST /casa/checkout`) cobra UM produto por vez e
 *   amarra a venda a UM participante. O painel do canto, que na referência é o
 *   carrinho, é o "VOCÊ APOIA" — a escolha que o backend de fato exige.
 * - CATEGORIAS (lanches, bebidas, merch…): os produtos não têm categoria no
 *   banco. As abas filtram pelo que EXISTE: estoque.
 * - "APOIA: <pessoa>" em cada card: a referência põe uma pessoa diferente em
 *   cada produto. Aqui não há vínculo produto↔participante — o card mostra
 *   quem VOCÊ escolheu (ou o "?" de quem ainda não escolheu).
 * - "PONTOS": comprar não soma pontos no placar hoje; a vitrine diz o que é
 *   verdade — a venda fica registrada no nome de quem você apoia.
 * O destaque é o primeiro da ORDEM que o admin define na loja.
 */
export function ConvenienceVitrine({ products, targets }: { products: StoreProduct[] | null; targets: SupportTarget[] }) {
  const [support, setSupport] = useState<string | null>(null)
  const [coupon, setCoupon] = useState<string | null>(null)
  const [open, setOpen] = useState<StoreProduct | null>(null)
  const [filter, setFilter] = useState<ShelfFilter>("all")

  // ?apoia= e ?cupom= vêm do link compartilhado; lidos do window (useSearchParams
  // obrigaria Suspense e tiraria a página do HTML do servidor).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const a = q.get("apoia")
    if (a && targets.some((t) => t.slug === a)) setSupport(a)
    const c = q.get("cupom")
    if (c) setCoupon(c)
  }, [targets])

  const supported = targets.find((t) => t.slug === support) || null
  const list = products || []
  // o número do card é a posição na ORDEM da loja — não muda com o filtro
  const numbered = list.map((p, i) => ({ p, n: i + 1 }))
  const shown = numbered.filter(({ p }) => matches(p, filter))
  const featured = filter === "all" ? shown[0] || null : null
  const rest = featured ? shown.slice(1) : shown
  const counts: Record<ShelfFilter, number> = {
    all: list.length,
    stock: list.filter((p) => matches(p, "stock")).length,
    last: list.filter((p) => matches(p, "last")).length,
  }

  return (
    <>
      {/* ═══════════ HERÓI ═══════════ */}
      <section className="rv-grid rv-noise relative overflow-hidden">
        {/* faixas de luz diagonais — pintadas uma vez */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          <span className="rv-streak -left-40 top-16 h-24 w-[520px]" />
          <span className="rv-streak rv-streak-pink -left-16 top-[300px] h-3 w-[360px]" />
          <span className="rv-streak -right-44 top-8 h-20 w-[520px]" />
          <span className="rv-streak rv-streak-pink -right-20 top-[250px] h-2 w-[320px]" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden md:block">
          <span className="rv-plus left-8 top-8" />
          <span className="rv-plus left-[46%] top-[62%]" />
          <span className="rv-plus right-[26%] top-[14%]" />
        </div>

        {/* cubo de vidro rosa atrás do selo (WebGPU → WebGL2 → SVG) */}
        <RealityStage
          variant="cube"
          className="rv-stage-glow absolute -right-[30%] top-0 z-[1] h-[260px] w-[90%] opacity-40 md:-right-[8%] md:h-[320px] md:w-[46%] md:opacity-70 lg:right-[18%] lg:w-[26%] lg:opacity-90"
        />

        <div className="relative z-[2] mx-auto max-w-[1600px] px-4 pb-6 pt-8 md:px-8 md:pt-10">
          <div className="relative grid gap-6 lg:grid-cols-[140px_minmax(0,1fr)_300px] lg:gap-8">
            {/* bloco técnico */}
            <p
              className="rv-type hidden text-[12px] uppercase leading-[1.5] tracking-[0.16em] text-[var(--rv-muted)] lg:block lg:pt-4"
              data-rv="left"
            >
              Reality
              <br />
              social
              <br />
              em tempo
              <br />
              real.
            </p>

            {/* manchete — "VIEWS" divide a linha com o selo da loja, como na
                referência; o h1 fica no leitor de tela e as duas linhas visuais
                são aria-hidden (o bloco ao lado precisa ficar FORA do h1). */}
            <div className="relative min-w-0">
              <h1 className="sr-only">Conveniência Views</h1>
              <p
                aria-hidden
                data-rv="mask"
                className="rv-wide rv-grunge whitespace-nowrap text-[7.8vw] leading-[0.86] lg:text-[clamp(3.2rem,4.9vw,6.2rem)]"
              >
                Conveniência
              </p>
              <div className="mt-1 flex flex-wrap items-end gap-x-6 gap-y-3">
                <p
                  aria-hidden
                  data-rv="mask"
                  className="rv-wide rv-glow-text text-[13vw] leading-[0.84] text-[var(--rv-pink)] sm:text-[10vw] lg:text-[clamp(4rem,7vw,8.8rem)]"
                  style={{ ["--rv-delay" as string]: "80ms" }}
                >
                  Views
                </p>
                <div className="min-w-0 max-w-[24rem] pb-1" data-rv style={{ ["--rv-delay" as string]: "160ms" }}>
                  <p className="flex items-center gap-2">
                    <Crown aria-hidden className="h-6 w-6 fill-[var(--rv-pink)] text-[var(--rv-pink)]" />
                    <span className="rv-script text-4xl leading-none text-[var(--rv-yellow)]">loja oficial</span>
                  </p>
                  <p className="rv-type mt-2 text-[13px] font-bold uppercase tracking-[0.12em]">Produtos reais. Apoio de verdade.</p>
                  <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-[var(--rv-muted)]">
                    A loja oficial da Casa Views. Cada compra fica registrada no nome do participante que você escolher.
                  </p>
                </div>
              </div>
            </div>

            {/* painel "VOCÊ APOIA" — no lugar do carrinho da referência — e o
                selo "compre / apoie / faça parte" logo abaixo dele */}
            <div className="flex flex-col gap-5">
              <SupportPanel targets={targets} support={support} onSupport={setSupport} />
              <span
                aria-hidden
                className="rv-wide hidden w-fit -rotate-6 self-start bg-[var(--rv-pink)] px-3 py-2 text-center text-[15px] leading-[0.95] text-[var(--rv-bg)] shadow-[4px_4px_0_0_var(--rv-white)] lg:block"
              >
                Compre
                <br />
                apoie
                <br />
                faça parte
              </span>
            </div>
          </div>

          {/* ═══ trilho de filtros ═══ */}
          {list.length > 1 && (
            <div className="rv-rail-bare mt-8 flex gap-2 overflow-x-auto pb-1 md:mt-10 md:gap-3" role="tablist" aria-label="Filtrar a prateleira">
              {FILTERS.map(({ key, label, icon: Icon }) => {
                const on = key === filter
                const empty = counts[key] === 0
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    disabled={empty && !on}
                    onClick={() => setFilter(key)}
                    className={`rv-type flex shrink-0 items-center gap-2 border px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors md:min-w-[11rem] md:justify-center ${
                      on
                        ? "rv-glow-box border-[var(--rv-pink)] bg-[var(--rv-pink)] text-[var(--rv-bg)]"
                        : "border-[var(--rv-line-strong)] text-[var(--rv-white)] hover:border-[var(--rv-white)] disabled:opacity-35"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <span className={on ? "opacity-70" : "text-[var(--rv-faint)]"}>{pad2(counts[key])}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1600px] px-4 pb-14 pt-4 md:px-8 md:pb-20">
        {products === null ? (
          <StateBlock
            icon={<PackageX className="h-8 w-8" />}
            title="A loja saiu do ar por um instante."
            text="Não conseguimos ler a prateleira agora. Atualize a página em alguns segundos."
          />
        ) : list.length === 0 ? (
          <StateBlock
            icon={<ShoppingBag className="h-8 w-8" />}
            title="A prateleira está vazia."
            text="Os produtos da temporada ainda estão chegando. Volte logo."
          />
        ) : shown.length === 0 ? (
          <StateBlock
            icon={<PackageX className="h-8 w-8" />}
            title="Nada neste filtro."
            text="Volte para Destaques para ver a prateleira inteira."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
            {featured && (
              <div className="col-span-2 lg:row-span-2">
                <FeaturedProduct p={featured.p} n={featured.n} supported={supported} onBuy={() => setOpen(featured.p)} />
              </div>
            )}
            {/* cards montam DEPOIS do carregamento quando o filtro muda: nada de
                data-rv (o observador só vê o que existia) — entrada por rv-page-in */}
            {rest.map(({ p, n }, i) => (
              <div key={`${filter}-${p.id}`} className="rv-page-in" style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }}>
                <ProductCard p={p} n={n} supported={supported} onBuy={() => setOpen(p)} />
              </div>
            ))}
          </div>
        )}

        {/* faixa "cada compra tem um nome" */}
        {list.length > 0 && (
          <div className="rv-frame mt-10" data-rv>
            <div className="rv-frame-in rv-grid flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5 md:px-8">
              <Crown aria-hidden className="h-8 w-8 -rotate-12 fill-[var(--rv-pink)] text-[var(--rv-pink)]" />
              <p className="rv-wide text-2xl leading-[0.9] md:text-3xl">
                Cada compra
                <br />
                <span className="text-[var(--rv-pink)]">tem um nome.</span>
              </p>
              <p className="rv-type text-[10px] uppercase leading-[1.7] tracking-[0.14em] text-[var(--rv-muted)] md:ml-auto">
                Produtos reais
                <br />
                Pagamento seguro
                <br />
                Sem frete
                <br />1 item por pedido
              </p>
            </div>
          </div>
        )}
      </div>

      <CheckoutPanel
        product={open}
        targets={targets}
        support={support}
        onSupport={setSupport}
        coupon={coupon}
        onClose={() => setOpen(null)}
      />
    </>
  )
}

/* ───────────────────────── helpers ───────────────────────── */

function imageOf(p: StoreProduct): string | null {
  return p.image_url || p.media?.find((m) => !m.media_type || m.media_type.startsWith("image"))?.media_url || null
}

function stockState(p: StoreProduct): { soldOut: boolean; label: string; low: boolean } {
  // Sem preço o backend recusa o checkout ("Produto sem preço"): o botão não
  // pode prometer uma compra que não existe.
  if (!(Number(p.price_cents) > 0)) return { soldOut: true, label: "indisponível", low: false }
  if (p.stock === null || p.stock === undefined) return { soldOut: false, label: "em estoque", low: false }
  if (p.stock <= 0) return { soldOut: true, label: "esgotado", low: false }
  if (p.stock <= 5) return { soldOut: false, label: `restam ${p.stock}`, low: true }
  return { soldOut: false, label: "em estoque", low: false }
}

/** Estoque sobre fundo escuro (destaque e painel de pagamento). */
function StockLine({ p }: { p: StoreProduct }) {
  const s = stockState(p)
  return (
    <span
      className="inline-flex items-center gap-1.5 rv-label text-[10px]"
      style={{ color: s.soldOut ? "var(--rv-down)" : s.low ? "var(--rv-yellow)" : "var(--rv-up)" }}
    >
      <span className="h-1.5 w-1.5" style={{ background: "currentColor", borderRadius: 9999 }} aria-hidden />
      {s.label}
    </span>
  )
}

/** Estoque sobre o painel branco do card: "restam N" vira etiqueta rosa. */
function PaperStock({ p }: { p: StoreProduct }) {
  const s = stockState(p)
  if (s.low) {
    return (
      <span className="rv-type -rotate-2 whitespace-nowrap bg-[var(--rv-pink)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--rv-white)]">
        {s.label}
      </span>
    )
  }
  return (
    <span
      className="rv-type inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]"
      style={{ color: s.soldOut ? "var(--rv-pink-deep)" : "var(--rv-up-ink)" }}
    >
      {s.soldOut ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
      {s.label}
    </span>
  )
}

/** Chip "APOIA:" sobre a foto — quem VOCÊ escolheu, ou o "?" de quem não escolheu. */
function SupportChip({ supported, big = false }: { supported: SupportTarget | null; big?: boolean }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 border border-[var(--rv-line-strong)] bg-[rgba(5,5,5,0.86)] pr-2.5 ${big ? "p-1" : "p-0.5"}`}
    >
      {supported ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-avatar
          src={supported.avatar || "/placeholder-user.jpg"}
          alt=""
          className={`${big ? "h-11 w-11" : "h-7 w-7"} shrink-0 object-cover`}
          style={{ borderRadius: 9999 }}
        />
      ) : (
        <span
          data-avatar
          className={`${big ? "h-11 w-11 text-lg" : "h-7 w-7 text-sm"} inline-flex shrink-0 items-center justify-center bg-[var(--rv-surface-3)] font-black text-[var(--rv-pink-ink)]`}
          style={{ borderRadius: 9999 }}
        >
          ?
        </span>
      )}
      <Flame className={`${big ? "h-4 w-4" : "h-3 w-3"} shrink-0 text-[var(--rv-pink)]`} />
      <span className={`rv-type min-w-0 truncate font-bold uppercase tracking-[0.08em] ${big ? "text-[13px]" : "text-[9px]"}`}>
        Apoia: <span className={supported ? "text-[var(--rv-yellow)]" : "text-[var(--rv-muted)]"}>{supported ? supported.name : "escolha"}</span>
      </span>
    </span>
  )
}

/* ───────────────────────── painel "você apoia" ───────────────────────── */

function SupportPanel({
  targets,
  support,
  onSupport,
}: {
  targets: SupportTarget[]
  support: string | null
  onSupport: (slug: string | null) => void
}) {
  const chosen = targets.find((t) => t.slug === support) || null
  return (
    <aside className="rv-frame relative z-[4] self-start" data-rv="right" style={{ ["--rv-delay" as string]: "180ms" }}>
      <div className="rv-frame-in flex flex-col gap-3 p-4">
        <p className="rv-type flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[var(--rv-pink)]" /> Você apoia
          </span>
          {chosen && (
            <button
              type="button"
              onClick={() => onSupport(null)}
              className="text-[9px] text-[var(--rv-faint)] hover:text-[var(--rv-pink-ink)]"
            >
              trocar
            </button>
          )}
        </p>

        {chosen ? (
          <div className="flex items-center gap-3 border border-[var(--rv-pink)] bg-[rgba(255,0,122,0.12)] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-avatar
              src={chosen.avatar || "/placeholder-user.jpg"}
              alt=""
              className="h-12 w-12 shrink-0 object-cover"
              style={{ borderRadius: 9999 }}
            />
            <div className="min-w-0">
              <p className="rv-wide truncate text-lg leading-none">{chosen.name}</p>
              <p className="rv-type mt-1 text-[9px] uppercase tracking-[0.12em] text-[var(--rv-muted)]">recebe as suas compras</p>
            </div>
          </div>
        ) : targets.length === 0 ? (
          <p className="text-xs font-semibold text-[var(--rv-muted)]">Nenhum participante disponível agora.</p>
        ) : (
          <div
            className="rv-rail-bare grid max-h-[148px] grid-cols-5 gap-2 overflow-y-auto p-0.5"
            role="radiogroup"
            aria-label="Participante que recebe sua compra"
          >
            {targets.map((t) => (
              <button
                key={t.slug}
                type="button"
                role="radio"
                aria-checked={false}
                onClick={() => onSupport(t.slug)}
                title={t.name}
                aria-label={t.name}
                className="group relative aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-avatar
                  src={t.avatar || "/placeholder-user.jpg"}
                  alt=""
                  className={`h-full w-full object-cover grayscale transition group-hover:grayscale-0 ${t.status === "eliminated" ? "opacity-50" : ""}`}
                  style={{ borderRadius: 9999, boxShadow: "0 0 0 1.5px var(--rv-line-strong)" }}
                />
              </button>
            ))}
          </div>
        )}

        <p className="rv-type flex items-center gap-2 border-t border-[var(--rv-line)] pt-3 text-[9px] uppercase leading-[1.5] tracking-[0.12em] text-[var(--rv-muted)]">
          <BarChart3 className="h-5 w-5 shrink-0 text-[var(--rv-up)]" />
          Sua compra fica registrada no nome de quem você apoia.
        </p>
      </div>
    </aside>
  )
}

/* ───────────────────────── destaque ───────────────────────── */

function FeaturedProduct({ p, n, supported, onBuy }: { p: StoreProduct; n: number; supported: SupportTarget | null; onBuy: () => void }) {
  const img = imageOf(p)
  const s = stockState(p)
  return (
    <article data-rv className="rv-frame rv-frame-pink h-full" style={{ ["--c" as string]: "26px" }}>
      <div className="rv-frame-in flex h-full flex-col">
        <div className="rv-shelf-art relative min-h-[300px] flex-1 overflow-hidden md:min-h-[360px]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={p.name}
              className={`absolute inset-0 h-full w-full object-cover ${s.soldOut ? "grayscale opacity-50" : ""}`}
              style={{ filter: s.soldOut ? undefined : "contrast(1.08) saturate(1.1)" }}
            />
          ) : (
            <ShoppingBag aria-hidden className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 text-[var(--rv-pink)] opacity-40" />
          )}
          <span className="rv-type absolute left-4 top-4 z-[3] flex items-center gap-1.5 border border-[var(--rv-pink)] bg-[rgba(5,5,5,0.86)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
            <Crown className="h-3.5 w-3.5 fill-[var(--rv-yellow)] text-[var(--rv-yellow)]" /> Produto em destaque
          </span>
          <span className="rv-wide absolute left-4 top-12 z-[3] text-3xl text-[var(--rv-white)] [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            {pad2(n)}
          </span>
          <p className="rv-script absolute left-16 top-14 z-[3] -rotate-6 text-3xl text-[var(--rv-white)] [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            destaque da casa
          </p>
          <div className="absolute bottom-4 left-4 right-4 z-[3]">
            <SupportChip supported={supported} big />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--rv-pink)] p-5 md:p-6">
          <h2 className="rv-wide text-4xl leading-[0.88] md:text-5xl">{p.name}</h2>
          {p.description && (
            <p className="rv-type line-clamp-2 text-[12px] uppercase tracking-[0.1em] text-[var(--rv-muted)]">{p.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="rv-wide rv-glow-text text-4xl leading-none text-[var(--rv-pink)] md:text-5xl">{brl(p.price_cents)}</span>
              <StockLine p={p} />
            </div>
            <button type="button" onClick={onBuy} disabled={s.soldOut} className="rv-btn flex-1 sm:flex-none">
              {s.soldOut ? s.label : (
                <>
                  <ShoppingBag className="h-4 w-4" /> Comprar <ArrowRight className="rv-arrow h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

/* ───────────────────────── card ───────────────────────── */

function ProductCard({ p, n, supported, onBuy }: { p: StoreProduct; n: number; supported: SupportTarget | null; onBuy: () => void }) {
  const img = imageOf(p)
  const s = stockState(p)
  return (
    <TiltCard className="rv-cut-tr flex h-full flex-col border border-[var(--rv-line-strong)] bg-[var(--rv-surface)]" max={4}>
      <div className="rv-shelf-art relative aspect-[4/3.4] overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={p.name}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ${s.soldOut ? "grayscale opacity-40" : ""}`}
          />
        ) : (
          <ShoppingBag aria-hidden className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-[var(--rv-pink)] opacity-40" />
        )}
        <span className="rv-wide absolute left-2.5 top-2 z-[3] text-xl text-[var(--rv-white)] [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">
          {pad2(n)}
        </span>
        {s.soldOut && (
          <span className="rv-wide absolute inset-x-0 top-1/2 z-[3] -translate-y-1/2 -rotate-6 truncate bg-[var(--rv-white)] px-2 py-1 text-center text-sm text-[var(--rv-bg)] sm:text-xl">
            {s.label}
          </span>
        )}
        <div className="absolute bottom-2 left-2 right-2 z-[3]">
          <SupportChip supported={supported} />
        </div>
      </div>

      <div className="rv-paper flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="rv-title-shift rv-wide line-clamp-2 text-[15px] leading-[0.95]">{p.name}</h3>
        {p.description && <p className="rv-type line-clamp-1 text-[9px] uppercase tracking-[0.1em] opacity-60">{p.description}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1.5">
          <span className="rv-wide text-xl leading-none text-[var(--rv-pink-deep)]">{brl(p.price_cents)}</span>
          {/* esgotado já é dito pela faixa da foto e pelo botão */}
          {!s.soldOut && <PaperStock p={p} />}
        </div>
        <button
          type="button"
          onClick={onBuy}
          disabled={s.soldOut}
          aria-label={`Comprar ${p.name}`}
          className="rv-paper-btn mt-1.5 h-9 w-full"
        >
          {s.soldOut ? s.label : "Comprar"}
        </button>
      </div>
    </TiltCard>
  )
}

/* ───────────────────────── painel de compra ───────────────────────── */

function CheckoutPanel({
  product,
  targets,
  support,
  onSupport,
  coupon,
  onClose,
}: {
  product: StoreProduct | null
  targets: SupportTarget[]
  support: string | null
  onSupport: (slug: string) => void
  coupon: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const open = !!product

  const close = useCallback(() => {
    if (!loading) onClose()
  }, [loading, onClose])

  // trocar de produto zera o erro do anterior
  const [lastId, setLastId] = useState<string | null>(null)
  if ((product?.id ?? null) !== lastId) {
    setLastId(product?.id ?? null)
    setError(null)
  }

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, close])

  if (!product) return null
  const img = imageOf(product)
  const chosen = targets.find((t) => t.slug === support) || null

  async function pay() {
    if (!product) return
    if (!chosen) {
      setError("Escolha quem recebe a sua compra.")
      return
    }
    const token = getToken()
    if (!token) {
      const back = `/acasaviews/conveniencia?apoia=${encodeURIComponent(chosen.slug)}${coupon ? `&cupom=${encodeURIComponent(coupon)}` : ""}`
      router.push(`/login?next=${encodeURIComponent(back)}`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/casa/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          participant_slug: chosen.slug,
          ...(coupon ? { coupon_code: coupon } : {}),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.checkout_url) throw new Error(data?.error || "Não foi possível iniciar a compra.")
      window.location.href = data.checkout_url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: "var(--rv-z-overlay)" }}>
      <button type="button" aria-label="Fechar" tabIndex={-1} onClick={close} className="absolute inset-0 bg-black/70" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="rv-checkout-title"
        className="rv-page-in absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col border-t-2 border-[var(--rv-pink)] bg-[var(--rv-bg)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:border-l-2 md:border-t-0"
      >
        <header className="flex items-center justify-between border-b border-[var(--rv-line-strong)] px-5 py-4">
          <span id="rv-checkout-title" className="flex items-center gap-2 rv-display text-3xl">
            <ShoppingBag className="h-5 w-5 text-[var(--rv-pink)]" /> Seu pedido
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 items-center justify-center border border-[var(--rv-line-strong)] hover:border-[var(--rv-pink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="flex gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden border border-[var(--rv-line-strong)] bg-[var(--rv-surface-2)]">
              {img && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="rv-display text-3xl leading-[0.9]">{product.name}</p>
              <p className="rv-mono mt-1 text-[11px] text-[var(--rv-faint)]">1 × {brl(product.price_cents)}</p>
              <div className="mt-2">
                <StockLine p={product} />
              </div>
            </div>
          </div>

          {product.description && (
            <p className="whitespace-pre-line border-l-2 border-[var(--rv-line-strong)] pl-3 text-[13px] font-semibold leading-relaxed text-[var(--rv-muted)]">
              {product.description}
            </p>
          )}

          <fieldset>
            <legend className="mb-2 flex items-center gap-1.5 rv-label text-[var(--rv-pink-ink)]">
              <Flame className="h-3.5 w-3.5" /> Sua compra apoia
            </legend>
            {targets.length === 0 ? (
              <p className="text-sm font-semibold text-[var(--rv-muted)]">Nenhum participante disponível agora.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Participante que recebe sua compra">
                {targets.map((t) => {
                  const on = t.slug === support
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => onSupport(t.slug)}
                      className={`flex items-center gap-2 border p-2 text-left transition-colors ${
                        on ? "border-[var(--rv-pink)] bg-[rgba(255,0,122,0.14)]" : "border-[var(--rv-line-strong)] hover:border-[var(--rv-white)]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        data-avatar
                        src={t.avatar || "/placeholder-user.jpg"}
                        alt=""
                        className="h-8 w-8 shrink-0 object-cover"
                        style={{ borderRadius: 9999, filter: on ? "none" : "grayscale(1)" }}
                      />
                      <span className="min-w-0 flex-1 truncate rv-label text-[10px]">{t.name}</span>
                      {on && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--rv-pink)]" />}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>

          {coupon && (
            <p className="rv-mono text-[11px] text-[var(--rv-muted)]">
              CUPOM <span className="bg-[var(--rv-yellow)] px-1 text-[var(--rv-bg)]">{coupon.toUpperCase()}</span> aplicado ao link
            </p>
          )}
        </div>

        <footer className="space-y-3 border-t border-[var(--rv-line-strong)] px-5 py-5">
          <div className="flex items-end justify-between">
            <span className="rv-label text-[var(--rv-faint)]">total</span>
            <span className="rv-display text-5xl leading-none text-[var(--rv-yellow)]">{brl(product.price_cents)}</span>
          </div>
          {error && (
            <p role="alert" className="border border-[var(--rv-pink)] bg-[rgba(255,0,122,0.1)] px-3 py-2 text-xs font-bold text-[var(--rv-white)]">
              {error}
            </p>
          )}
          <button type="button" onClick={pay} disabled={loading || !chosen} className="rv-btn w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Redirecionando…
              </>
            ) : chosen ? (
              <>
                Ir para o pagamento <ArrowRight className="rv-arrow h-4 w-4" />
              </>
            ) : (
              "Escolha quem você apoia"
            )}
          </button>
          <p className="text-[11px] font-semibold text-[var(--rv-faint)]">
            Pagamento seguro fora da Freelandoo. Produto da Conveniência Views — sem frete.
          </p>
        </footer>
      </aside>
    </div>
  )
}

function StateBlock({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center border border-dashed border-[var(--rv-line-strong)] px-6 py-20 text-center">
      <span className="text-[var(--rv-pink-ink)]">{icon}</span>
      <p className="rv-display mt-4 text-4xl md:text-5xl">{title}</p>
      <p className="mt-3 max-w-md text-sm font-semibold text-[var(--rv-muted)]">{text}</p>
    </div>
  )
}
