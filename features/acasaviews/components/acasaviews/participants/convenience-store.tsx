"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Crown, Flame, Loader2, Pencil, Settings, ShieldCheck, ShoppingBag, ShoppingCart, Star, X } from "lucide-react"
import type { ProductItem } from "@/lib/acasaviews/participants-live"

function brl(cents: number) {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

const ADMIN_STORE = "/administracao/casa-loja"

/**
 * Seção "Conveniência Views" do dossiê do participante, na composição da
 * referência: cabeçalho grande com chamada, o 1º produto em destaque largo e
 * os outros em cards menores, e a faixa de garantias embaixo.
 *
 * ⚠️ Fiel ao que a loja É: não há carrinho (o checkout cobra UM produto e exige
 * o participante, que é a atribuição da venda) e o produto é digital/simbólico,
 * sem frete — por isso os botões dizem "comprar" e a faixa NÃO promete envio.
 * O "apoia" de cada card é o participante desta página, que é quem recebe a
 * venda; ele não é inventado por produto.
 */
export function ConvenienceStore({
  products, slug, participantName, participantAvatar, edit, adminSlot, notice,
}: {
  products: ProductItem[]
  slug: string
  participantName: string
  participantAvatar: string | null
  edit?: boolean
  adminSlot?: React.ReactNode
  notice?: React.ReactNode
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<ProductItem | null>(null)
  const [descModal, setDescModal] = useState<ProductItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function buy(product: ProductItem) {
    setError(null)
    const token = getToken()
    if (!token) {
      const next = encodeURIComponent(`/acasaviews/participantes/${slug}`)
      router.push(`/login?next=${next}`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/casa/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        // participant_slug = atribuição: registra qual participante recebeu a venda
        body: JSON.stringify({ product_id: product.id, participant_slug: slug }),
      })
      const data = await res.json()
      if (!res.ok || !data?.checkout_url) throw new Error(data?.error || "Não foi possível iniciar a compra.")
      window.location.href = data.checkout_url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.")
      setLoading(false)
    }
  }

  const [featured, ...rest] = products

  return (
    <>
      <section className="rv-frame rv-frame-pink" style={{ ["--c" as string]: "28px" }}>
        <div className="rv-frame-in rv-grid">
          {/* decoração pintada uma vez */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="rv-streak rv-streak-pink -left-24 top-32 h-3 w-[360px]" />
            <span className="rv-streak -right-40 bottom-24 h-16 w-[460px] opacity-50" />
            <span className="rv-glitch-stripes absolute -left-10 top-0 h-40 w-24 opacity-20" />
            <span className="rv-glitch-stripes absolute -right-8 bottom-0 h-48 w-28 opacity-20" />
            <span className="rv-plus left-6 top-6" />
            <span className="rv-plus right-8 top-[46%]" />
          </div>

          {/* cabeçalho */}
          <div className="relative flex flex-col gap-5 px-5 pb-6 pt-7 md:flex-row md:items-start md:px-8">
            <div className="hidden w-28 shrink-0 md:block">
              <span className="flex h-14 w-14 items-center justify-center border-[1.5px] border-[var(--rv-pink)] text-[var(--rv-pink)]">
                <ShoppingCart className="h-6 w-6" />
              </span>
              <p className="rv-type mt-4 text-[10px] uppercase leading-[1.6] tracking-[0.16em] text-[var(--rv-muted)]">Reality<br />social<br />em tempo<br />real.</p>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="rv-display flex flex-wrap items-end gap-x-3 text-5xl leading-[0.86] md:text-7xl">
                <span className="rv-grunge">Conveniência</span>
                <span className="text-[var(--rv-pink)] [text-shadow:0_0_22px_rgba(255,0,122,0.45)]">Views</span>
                <Crown aria-hidden className="mb-2 h-10 w-10 -rotate-12 text-[var(--rv-pink)]" strokeWidth={1.6} />
              </h2>
              <p className="rv-type mt-3 text-sm uppercase tracking-[0.12em]">Produtos oficiais. Apoie {participantName}.</p>
              <p className="rv-type mt-1 max-w-[52ch] text-xs leading-relaxed text-[var(--rv-muted)]">
                Cada compra fica registrada para {participantName} e mantém a experiência da casa viva.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
              {adminSlot}
              <p aria-hidden className="rv-script hidden max-w-[12ch] -rotate-6 text-right text-3xl leading-[0.95] text-[var(--rv-pink-ink)] lg:block">
                Mais que um produto. É movimento.
              </p>
              {edit && (
                <Link href={ADMIN_STORE} className="rv-type inline-flex items-center gap-3 border-[1.5px] border-[var(--rv-white)] bg-[var(--rv-bg)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] hover:border-[var(--rv-pink)]">
                  <Settings className="h-4 w-4" /> Gerenciar produtos <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {notice && <div className="relative px-5 md:px-8">{notice}</div>}

          {/* produtos */}
          <div className="relative px-5 pb-6 md:px-8">
            {products.length === 0 ? (
              <p className="rv-type border border-dashed border-[var(--rv-line-strong)] bg-[rgba(5,5,5,0.7)] px-5 py-10 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--rv-muted)]">
                Nenhum produto deste participante por enquanto.
              </p>
            ) : (
              <div className={`grid gap-5 border-[1.5px] border-[var(--rv-line-strong)] bg-[rgba(5,5,5,0.75)] p-3 sm:grid-cols-2 md:p-4 ${rest.length > 0 ? "lg:grid-cols-4" : ""}`}>
                <FeaturedCard prod={featured} solo={rest.length === 0} onBuy={() => setSelected(featured)} onDesc={() => setDescModal(featured)} edit={edit} />
                {rest.map((prod, i) => (
                  <ProductCard key={prod.id} index={i + 2} prod={prod} participantName={participantName} participantAvatar={participantAvatar}
                    onBuy={() => setSelected(prod)} onDesc={() => setDescModal(prod)} edit={edit} />
                ))}
              </div>
            )}
          </div>

          {/* garantias — só o que a loja de fato entrega */}
          <div className="relative mx-5 mb-7 grid gap-4 border-[1.5px] border-[var(--rv-line-strong)] bg-[rgba(5,5,5,0.8)] px-5 py-4 sm:grid-cols-3 md:mx-8">
            <Perk icon={<ShieldCheck className="h-7 w-7" />} title="Compra direta" sub="Pagamento seguro, sem carrinho" />
            <Perk icon={<Star className="h-7 w-7" />} title="Apoia os participantes" sub="A venda fica registrada no nome dele" />
            <Perk icon={<Crown className="h-7 w-7" />} title="Edições exclusivas" sub="Itens oficiais da Casa Views" />
          </div>
        </div>
      </section>

      {/* Dialog de confirmação */}
      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(5,5,5,0.8)] p-4" onClick={() => !loading && setSelected(null)}>
          <div className="w-full max-w-md border-2 border-[var(--rv-pink)] bg-[var(--rv-bg)] text-[var(--rv-white)] rv-glow-box" onClick={(e) => e.stopPropagation()}>
            <div className="rv-block-head flex items-center justify-between px-4 py-3">
              <span className="rv-display flex items-center gap-2 text-2xl"><ShoppingBag className="h-5 w-5 text-[var(--rv-pink)]" /> Confirmar compra</span>
              <button onClick={() => !loading && setSelected(null)} aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden border border-[var(--rv-white)] bg-[var(--rv-surface-2)]">
                  {selected.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="rv-display text-xl leading-tight">{selected.name}</h4>
                  <span className="rv-display text-2xl text-[var(--rv-pink-ink)]">{brl(selected.price_cents)}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--rv-muted)]">
                Você será levado ao pagamento seguro. Produto digital/simbólico da Conveniência Views — sem frete.
              </p>
              {error && <p className="border border-[var(--rv-pink)] bg-[rgba(255,0,122,0.1)] px-3 py-2 text-xs font-semibold text-[var(--rv-pink-ink)]">{error}</p>}
              <button onClick={() => buy(selected)} disabled={loading} className="rv-btn w-full">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecionando…</> : "Ir para o pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Descrição (somente leitura) */}
      {descModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(5,5,5,0.8)] p-4" onClick={() => setDescModal(null)}>
          <div className="w-full max-w-md border-2 border-[var(--rv-white)] bg-[var(--rv-bg)] text-[var(--rv-white)]" onClick={(e) => e.stopPropagation()}>
            <div className="rv-block-head flex items-center justify-between px-4 py-3">
              <span className="rv-display text-2xl leading-tight">{descModal.name}</span>
              <button onClick={() => setDescModal(null)} aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--rv-muted)]">{descModal.description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function inStock(p: ProductItem) {
  return p.stock === null || p.stock > 0
}

function StockTag({ prod }: { prod: ProductItem }) {
  const ok = inStock(prod)
  return (
    <span className={`rv-type inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] ${ok ? "text-[var(--rv-up)]" : "text-[var(--rv-down)]"}`}>
      <span data-avatar className={`h-1.5 w-1.5 ${ok ? "bg-[var(--rv-up)]" : "bg-[var(--rv-down)]"}`} />
      {ok ? "em estoque" : "esgotado"}
    </span>
  )
}

function ProductArt({ prod, className }: { prod: ProductItem; className: string }) {
  return (
    <div className={`rv-shelf-art relative overflow-hidden ${className}`}>
      {prod.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={prod.image_url} alt={prod.name} className="relative h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-[var(--rv-pink)]"><ShoppingBag className="h-12 w-12" /></span>
      )}
      <Crown aria-hidden className="absolute bottom-3 right-3 h-7 w-7 -rotate-12 text-[var(--rv-white)] drop-shadow-[0_0_6px_rgba(5,5,5,0.9)]" strokeWidth={1.6} />
    </div>
  )
}

function FeaturedCard({ prod, solo, onBuy, onDesc, edit }: { prod: ProductItem; solo?: boolean; onBuy: () => void; onDesc: () => void; edit?: boolean }) {
  const ok = inStock(prod)
  return (
    <article className="relative flex flex-col border-2 border-[var(--rv-pink)] bg-[var(--rv-bg)] rv-glow-box sm:col-span-2">
      <div className="relative">
        <ProductArt prod={prod} className={solo ? "aspect-[16/10] md:aspect-[21/8]" : "aspect-[16/10]"} />
        <span className="rv-type absolute left-0 top-0 inline-flex items-center gap-2 bg-[var(--rv-pink)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em]">
          <Crown className="h-4 w-4" /> Produto em destaque
        </span>
        <span className="rv-display absolute right-0 top-0 bg-[var(--rv-bg)] px-3 py-1 text-2xl">01</span>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--rv-bg)] to-transparent" />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
        <h3 className="rv-display text-4xl leading-[0.9]">{prod.name}</h3>
        {prod.description && <Desc text={prod.description} onMore={onDesc} className="mt-2 text-sm text-[var(--rv-muted)]" />}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-5">
          <span className="rv-display text-5xl text-[var(--rv-pink)]">{brl(prod.price_cents)}</span>
          <StockTag prod={prod} />
          <div className="ml-auto flex items-stretch gap-2">
            <button type="button" disabled={!ok} onClick={onBuy} className="rv-btn !shadow-none">
              <ShoppingCart className="h-4 w-4" /> {ok ? "Comprar" : "Esgotado"} <ArrowRight className="rv-arrow h-4 w-4" />
            </button>
            {edit && <EditLink />}
          </div>
        </div>
      </div>
    </article>
  )
}

function ProductCard({ prod, index, participantName, participantAvatar, onBuy, onDesc, edit }: {
  prod: ProductItem; index: number; participantName: string; participantAvatar: string | null; onBuy: () => void; onDesc: () => void; edit?: boolean
}) {
  const ok = inStock(prod)
  return (
    <article className="relative flex flex-col border-[1.5px] border-[var(--rv-white)] bg-[var(--rv-bg)]">
      <div className="relative">
        <ProductArt prod={prod} className="aspect-[4/3]" />
        <span className="rv-display absolute left-0 top-0 bg-[var(--rv-bg)] px-2.5 py-1 text-xl">{String(index).padStart(2, "0")}</span>
        <span className="absolute bottom-0 left-0 flex max-w-[85%] items-center gap-2 bg-[var(--rv-bg)] pr-3">
          <span className="h-10 w-10 shrink-0 overflow-hidden border border-[var(--rv-white)] bg-[var(--rv-surface-2)]">
            {participantAvatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={participantAvatar} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="rv-type flex min-w-0 items-center gap-1 text-[10px] uppercase tracking-[0.1em]">
            <Flame className="h-3.5 w-3.5 shrink-0 text-[var(--rv-pink)]" />
            <span className="truncate">Apoia: {participantName}</span>
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h3 className="rv-display text-2xl leading-[0.95]">{prod.name}</h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="rv-display text-3xl text-[var(--rv-pink)]">{brl(prod.price_cents)}</span>
          <StockTag prod={prod} />
        </div>
        {prod.description && <Desc text={prod.description} onMore={onDesc} className="rv-type mt-2 text-[11px] leading-relaxed text-[var(--rv-muted)]" />}
        <div className="mt-auto flex items-stretch gap-2 pt-4">
          <button type="button" disabled={!ok} onClick={onBuy}
            className="rv-type flex flex-1 items-center justify-center gap-2 border-[1.5px] border-[var(--rv-white)] py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:border-[var(--rv-pink)] hover:bg-[var(--rv-pink)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
            <ShoppingCart className="h-4 w-4" /> {ok ? "Comprar" : "Esgotado"}
          </button>
          {edit && <EditLink />}
        </div>
      </div>
    </article>
  )
}

/** Descrição curta no card; a inteira abre no modal. */
function Desc({ text, onMore, className }: { text: string; onMore: () => void; className: string }) {
  const long = text.length > 110
  return (
    <p className={className}>
      {long ? `${text.slice(0, 110).trimEnd()}… ` : text}
      {long && (
        <button type="button" onClick={onMore} className="text-[var(--rv-pink-ink)] underline">ver mais</button>
      )}
    </p>
  )
}

function EditLink() {
  return (
    <Link href={ADMIN_STORE} aria-label="Editar produto na loja" title="Editar na loja"
      className="flex w-11 items-center justify-center border-[1.5px] border-[var(--rv-white)] hover:border-[var(--rv-pink)] hover:text-[var(--rv-pink)]">
      <Pencil className="h-4 w-4" />
    </Link>
  )
}

function Perk({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 sm:border-l sm:border-[var(--rv-line)] sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
      <span className="shrink-0 text-[var(--rv-pink)]">{icon}</span>
      <span>
        <span className="rv-type block text-[12px] uppercase tracking-[0.12em]">{title}</span>
        <span className="rv-type block text-[10px] uppercase tracking-[0.1em] text-[var(--rv-muted)]">{sub}</span>
      </span>
    </div>
  )
}
