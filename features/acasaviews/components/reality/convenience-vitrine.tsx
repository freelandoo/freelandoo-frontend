"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, Flame, Loader2, PackageX, ShoppingBag, X } from "lucide-react"
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

/**
 * Vitrine da Conveniência Views.
 *
 * O que ela NÃO tem, e por quê (para ninguém "consertar" sem o backend):
 * - CARRINHO: o checkout (`POST /casa/checkout`) cobra UM produto por vez e
 *   amarra a venda a UM participante. Um carrinho na tela prometeria uma
 *   compra que o backend não sabe fazer. O painel lateral é o lugar dele.
 * - CATEGORIAS: os produtos não têm categoria no banco. Uma barra de abas
 *   inventadas filtraria por nada.
 * - "PONTOS" por compra: comprar não soma pontos no placar hoje; a vitrine diz
 *   o que é verdade — a venda fica registrada no nome de quem você apoia.
 * O produto em destaque é o primeiro da ORDEM que o admin define na loja.
 */
export function ConvenienceVitrine({ products, targets }: { products: StoreProduct[] | null; targets: SupportTarget[] }) {
  const [support, setSupport] = useState<string | null>(null)
  const [coupon, setCoupon] = useState<string | null>(null)
  const [open, setOpen] = useState<StoreProduct | null>(null)

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
  const featured = list[0] || null
  const rest = list.slice(1)

  return (
    <>
      {/* ═══════════ HERÓI ═══════════ */}
      <section className="rv-grid rv-noise relative overflow-hidden border-b border-[var(--rv-line)]">
        <RealityStage className="absolute -right-[36%] top-6 z-0 h-[320px] w-[115%] opacity-50 md:-right-[14%] md:top-[8%] md:h-[80%] md:w-[52%] md:opacity-90" />
        <div aria-hidden className="rv-halftone pointer-events-none absolute -left-10 bottom-0 z-0 h-40 w-64 opacity-25" />

        <div className="relative z-[2] mx-auto max-w-[1440px] px-4 pb-12 pt-10 md:px-8 md:pb-16 md:pt-14">
          <div className="flex flex-wrap items-center gap-2" data-rv>
            <span className="rv-sticker rv-sticker-yellow -rotate-2">
              <ShoppingBag className="h-3 w-3" /> aberta agora
            </span>
            <span className="rv-mono text-[11px] text-[var(--rv-muted)]">CASA VIEWS · {pad2(list.length)} ITENS NA PRATELEIRA</span>
          </div>

          <div className="relative mt-6">
            <p className="rv-script absolute -top-9 left-1 z-[3] -rotate-6 text-4xl text-[var(--rv-pink-ink)] md:-top-12 md:text-5xl" data-rv>
              loja oficial
            </p>
            <h1 data-rv="mask" className="rv-display -ml-1 text-[clamp(4.4rem,17vw,12.5rem)] leading-[0.8]">
              Conveniência
              <br />
              <span className="text-[var(--rv-pink)]">Views</span>
            </h1>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,28rem)_1fr] md:items-end" data-rv style={{ ["--rv-delay" as string]: "140ms" }}>
            <div>
              <p className="rv-display text-3xl leading-[0.9] md:text-4xl">
                Produtos reais.
                <br />
                <span className="text-[var(--rv-yellow)]">Apoio de verdade.</span>
              </p>
              <p className="mt-4 text-[15px] font-semibold leading-relaxed text-[var(--rv-muted)]">
                Compre. Apoie. Faça parte. Toda venda fica registrada no nome do participante que você escolher.
              </p>
            </div>
            <div className="rv-mono flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-[var(--rv-faint)] md:justify-self-end md:text-right">
              <span>PAGAMENTO SEGURO</span>
              <span>SEM FRETE</span>
              <span>1 ITEM POR PEDIDO</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ VOCÊ APOIA ═══════════ */}
      {targets.length > 0 && (
        <section className="sticky top-14 border-b border-[var(--rv-line)] bg-[rgba(5,5,5,0.94)] md:top-16" style={{ zIndex: 40 }}>
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 md:px-8">
            <span className="flex shrink-0 items-center gap-1.5 rv-label text-[var(--rv-pink-ink)]">
              <Flame className="h-3.5 w-3.5" /> você apoia
            </span>
            <div className="flex gap-2 overflow-x-auto pb-0.5" role="radiogroup" aria-label="Participante que recebe sua compra">
              {targets.map((t) => {
                const on = t.slug === support
                return (
                  <button
                    key={t.slug}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSupport(on ? null : t.slug)}
                    className={`flex shrink-0 items-center gap-2 border px-2 py-1 transition-colors ${
                      on
                        ? "border-[var(--rv-pink)] bg-[var(--rv-pink)] text-[var(--rv-white)]"
                        : "border-[var(--rv-line-strong)] text-[var(--rv-muted)] hover:border-[var(--rv-white)] hover:text-[var(--rv-white)]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      data-avatar
                      src={t.avatar || "/placeholder-user.jpg"}
                      alt=""
                      className="h-6 w-6 object-cover grayscale"
                      style={{ borderRadius: 9999 }}
                    />
                    <span className="rv-label whitespace-nowrap text-[10px]">{t.name}</span>
                    {t.status === "eliminated" && <span className="rv-mono text-[9px] opacity-60">elim.</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-8 md:py-16">
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
        ) : (
          <>
            {featured && <FeaturedProduct p={featured} supported={supported} onBuy={() => setOpen(featured)} />}

            {rest.length > 0 && (
              <>
                <div className="mb-6 mt-16 flex items-end justify-between gap-4 border-b border-[var(--rv-line-strong)] pb-3" data-rv>
                  <h2 className="rv-display text-5xl leading-[0.85] md:text-6xl">A prateleira</h2>
                  <span className="rv-mono text-[11px] text-[var(--rv-faint)]">[{pad2(rest.length)}]</span>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {rest.map((p, i) => (
                    <ProductCard key={p.id} p={p} n={i + 2} supported={supported} delay={Math.min(i, 7) * 60} onBuy={() => setOpen(p)} />
                  ))}
                </div>
              </>
            )}
          </>
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
  if (p.stock <= 5) return { soldOut: false, label: `só ${p.stock} restante${p.stock > 1 ? "s" : ""}`, low: true }
  return { soldOut: false, label: "em estoque", low: false }
}

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

function SupportLine({ supported }: { supported: SupportTarget | null }) {
  return (
    <span className="rv-mono flex items-center gap-1.5 text-[10px] text-[var(--rv-faint)]">
      <Flame className="h-3 w-3 text-[var(--rv-pink-ink)]" />
      APOIA: <span className="text-[var(--rv-white)]">{supported ? supported.name.toUpperCase() : "ESCOLHA NO PAGAMENTO"}</span>
    </span>
  )
}

/* ───────────────────────── destaque ───────────────────────── */

function FeaturedProduct({ p, supported, onBuy }: { p: StoreProduct; supported: SupportTarget | null; onBuy: () => void }) {
  const img = imageOf(p)
  const s = stockState(p)
  return (
    <article data-rv className="relative grid overflow-hidden border border-[var(--rv-line-strong)] bg-[var(--rv-surface)] md:grid-cols-[1.15fr_1fr]">
      <div className="rv-scan relative aspect-square overflow-hidden border-b border-[var(--rv-line-strong)] bg-[var(--rv-surface-2)] md:aspect-auto md:min-h-[520px] md:border-b-0 md:border-r">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={p.name} className="absolute inset-0 h-full w-full object-cover" style={{ filter: "contrast(1.08)" }} />
        ) : (
          <div className="rv-halftone absolute inset-0 opacity-20" aria-hidden />
        )}
        <span className="rv-sticker rv-sticker-pink absolute left-4 top-4 z-[3] -rotate-3">produto em destaque</span>
        <span aria-hidden className="rv-display rv-outline absolute -bottom-6 -left-2 z-[3] text-[180px] leading-none">01</span>
      </div>

      <div className="relative flex flex-col gap-5 p-6 md:p-10">
        <span aria-hidden className="rv-mono absolute right-5 top-5 text-[10px] text-[var(--rv-faint)]">
          REF · {p.id.slice(0, 8).toUpperCase()}
        </span>
        <h2 className="rv-display pr-16 text-6xl leading-[0.85] md:text-7xl">{p.name}</h2>
        {p.description && (
          <p className="whitespace-pre-line text-[15px] font-semibold leading-relaxed text-[var(--rv-muted)]">{p.description}</p>
        )}
        <div className="mt-auto flex flex-col gap-4 border-t border-[var(--rv-line-strong)] pt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <span className="rv-display text-6xl leading-none text-[var(--rv-yellow)]">{brl(p.price_cents)}</span>
            <StockLine p={p} />
          </div>
          <SupportLine supported={supported} />
          <button type="button" onClick={onBuy} disabled={s.soldOut} className="rv-btn w-full md:w-fit">
            {s.soldOut ? s.label : (
              <>
                Comprar <ArrowRight className="rv-arrow h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

/* ───────────────────────── card ───────────────────────── */

function ProductCard({
  p,
  n,
  supported,
  delay,
  onBuy,
}: {
  p: StoreProduct
  n: number
  supported: SupportTarget | null
  delay: number
  onBuy: () => void
}) {
  const img = imageOf(p)
  const s = stockState(p)
  return (
    <div data-rv style={{ ["--rv-delay" as string]: `${delay}ms` }}>
      <TiltCard className="flex h-full flex-col border border-[var(--rv-line-strong)] bg-[var(--rv-surface)]" max={4}>
        <div className="relative aspect-square overflow-hidden border-b border-[var(--rv-line-strong)] bg-[var(--rv-surface-2)]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={p.name}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ${s.soldOut ? "grayscale opacity-40" : ""}`}
            />
          ) : (
            <div className="rv-halftone absolute inset-0 opacity-15" aria-hidden />
          )}
          <span aria-hidden className="rv-display rv-outline absolute -bottom-3 right-2 z-[3] text-[88px] leading-none">
            {pad2(n)}
          </span>
          {s.soldOut && (
            <span className="absolute inset-x-0 top-1/2 z-[3] -translate-y-1/2 -rotate-6 bg-[var(--rv-white)] py-1.5 text-center rv-display text-3xl text-[var(--rv-bg)]">
              {s.label}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <h3 className="rv-title-shift rv-display text-3xl leading-[0.9]">{p.name}</h3>
          {p.description && <p className="line-clamp-2 text-xs font-semibold text-[var(--rv-muted)]">{p.description}</p>}
          <SupportLine supported={supported} />
          <div className="mt-auto flex items-end justify-between gap-2 border-t border-dashed border-[var(--rv-line)] pt-3">
            <div className="flex flex-col gap-1">
              <span className="rv-display text-3xl leading-none text-[var(--rv-yellow)]">{brl(p.price_cents)}</span>
              <StockLine p={p} />
            </div>
            <button
              type="button"
              onClick={onBuy}
              disabled={s.soldOut}
              aria-label={`Comprar ${p.name}`}
              className="rv-btn px-3 py-2.5 text-[11px]"
            >
              {s.soldOut ? "—" : (
                <>
                  Comprar <ArrowRight className="rv-arrow h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </TiltCard>
    </div>
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
