"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BadgeCheck, ChevronRight, CreditCard, Hexagon, Loader2, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ShareIconButton } from "@/components/share/share-icon-button"

type Product = {
  id: string
  category_id: string | null
  category_name: string | null
  name: string
  description: string | null
  banner_url: string
  tag_label: string
  tag_color: string
  tag_icon: string | null
  price_cents: number
  price_polens: number
  duration_days: number
  stock: number | null
  is_featured: boolean
}

type Category = { id: string; name: string; slug: string }
type Catalog = { categories: Category[]; products: Product[]; featured: Product | null }

const tagClasses: Record<string, string> = {
  emerald: "border-emerald-600/20 bg-emerald-50 text-emerald-700",
  amber: "border-amber-600/20 bg-amber-50 text-amber-700",
  rose: "border-rose-600/20 bg-rose-50 text-rose-700",
  sky: "border-sky-600/20 bg-sky-50 text-sky-700",
  zinc: "border-zinc-600/20 bg-zinc-100 text-zinc-700",
  red: "border-red-600/20 bg-red-50 text-red-700",
  blue: "border-blue-600/20 bg-blue-50 text-blue-700",
  green: "border-green-600/20 bg-green-50 text-green-700",
  yellow: "border-yellow-600/20 bg-yellow-50 text-yellow-700",
  orange: "border-orange-600/20 bg-orange-50 text-orange-700",
}

function fmtBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100)
}

export default function ManifestacaoPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [mine, setMine] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [buying, setBuying] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [purchaseModal, setPurchaseModal] = useState<{ title: string; message: string } | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const loadMine = useCallback(async () => {
    if (!token) return
    const res = await fetch("/api/manifestations/me", { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setMine(await res.json())
  }, [token])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/manifestations/products", { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Nao foi possivel carregar a loja")
        if (!cancelled) setCatalog(data)
        await loadMine()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [loadMine])

  const products = useMemo(() => {
    const list = catalog?.products || []
    const q = query.trim().toLowerCase()
    return list.filter((p) => {
      const matchesCategory = category === "all" || p.category_id === category
      const matchesQuery = !q || `${p.name} ${p.description || ""} ${p.tag_label}`.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [catalog?.products, category, query])

  async function buy(product: Product, method: "polens" | "stripe") {
    if (!token) {
      window.location.href = `/login?next=/manifestacao`
      return
    }
    setBuying(`${method}:${product.id}`)
    try {
      const res = await fetch(`/api/manifestations/checkout/${method}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Compra nao concluida")
      if (method === "stripe" && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }
      await loadMine()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro na compra"
      setPurchaseModal({
        title: method === "polens" && message.toLowerCase().includes("saldo")
          ? "Voce nao tem Polens suficientes"
          : "Compra nao concluida",
        message,
      })
    } finally {
      setBuying(null)
    }
  }

  const active = mine?.active as (Product & { expires_at?: string }) | null | undefined
  const previewProduct = selectedProduct ?? catalog?.featured ?? products[0] ?? null

  return (
    <main className="min-h-[100dvh] bg-[#f8faf9] text-zinc-950">
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-12">
        <div className="flex min-h-[520px] flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                Banners e tags para o seu perfil
              </div>
              <ShareIconButton
                path="/manifestacao"
                title="Manifestação no Freelandoo"
              />
            </div>
            <h1 className="mt-7 max-w-[760px] text-4xl font-semibold leading-none tracking-tight text-zinc-950 md:text-6xl">
              Manifestacao
            </h1>
            <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-zinc-600">
              Compre uma identidade visual temporaria para o seu username e escolha em quais subperfis ela aparece.
            </p>
          </div>

          {active ? (
            <div className="mt-8 rounded-[1.5rem] border border-emerald-900/10 bg-white p-4 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Ativa agora</p>
                  <p className="mt-1 text-lg font-semibold">{active.name}</p>
                </div>
                <Link href="/account" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  Aplicar <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-900">
          {previewProduct?.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewProduct.banner_url} alt={previewProduct.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(217,119,6,0.32),transparent_34%),linear-gradient(135deg,#18181b,#3f3f46)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/82 via-zinc-950/42 to-zinc-950/18" />
          <div className="absolute inset-x-5 top-5 rounded-2xl border border-white/12 bg-zinc-950/38 p-4 text-white backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg font-semibold">
                AS
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">alex sandro</p>
                <p className="text-xs text-white/60">@alexsandro</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5" />
              {previewProduct?.tag_label || "Tag exclusiva"}
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{previewProduct?.name || "Colecao em destaque"}</h2>
            <p className="mt-1 text-sm text-white/70">Preview do visual no perfil</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="flex flex-col gap-3 border-y border-zinc-200 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-[360px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar banner ou tag"
              className="h-11 w-full rounded-full border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-zinc-400"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCategory("all")} className={cn("h-10 shrink-0 rounded-full border px-4 text-sm transition active:scale-[0.98]", category === "all" ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600")}>Todos</button>
            {(catalog?.categories || []).map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)} className={cn("h-10 shrink-0 rounded-full border px-4 text-sm transition active:scale-[0.98]", category === c.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600")}>{c.name}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 py-8 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-72 animate-pulse rounded-[1.5rem] bg-zinc-200" />)}
          </div>
        ) : error ? (
          <div className="py-16 text-sm text-red-700">{error}</div>
        ) : products.length === 0 ? (
          <div className="py-16 text-sm text-zinc-500">Nenhum banner encontrado.</div>
        ) : (
          <div className="grid gap-5 py-8 md:grid-cols-2">
            {products.map((p, index) => (
              <article
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={cn(
                  "group cursor-pointer overflow-hidden rounded-[1.5rem] border bg-white shadow-[0_18px_40px_-34px_rgba(0,0,0,0.35)] transition",
                  selectedProduct?.id === p.id ? "border-zinc-950 ring-2 ring-zinc-950/10" : "border-zinc-200 hover:border-zinc-400"
                )}
                style={{ animation: `fade-in .42s cubic-bezier(.16,1,.3,1) both ${index * 55}ms` }}
              >
                <div className="aspect-[16/5] overflow-hidden bg-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.banner_url} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                </div>
                <div className="p-5">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", tagClasses[p.tag_color] || tagClasses.emerald)}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {p.tag_label}
                  </span>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">{p.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{p.description || `${p.duration_days} dias de visual ativo.`}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmtBRL(p.price_cents)}</p>
                      <p className="text-xs text-amber-700">{p.price_polens.toLocaleString("pt-BR")} Polens</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Button
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedProduct(p)
                        void buy(p, "stripe")
                      }}
                      className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.98]"
                    >
                      {buying === `stripe:${p.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Cartao
                    </Button>
                    <Button
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedProduct(p)
                        void buy(p, "polens")
                      }}
                      variant="outline"
                      className="rounded-full border-amber-600/25 text-amber-800 hover:bg-amber-50 active:scale-[0.98]"
                    >
                      {buying === `polens:${p.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hexagon className="mr-2 h-4 w-4" />}
                      Polens
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {purchaseModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/55 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-50 text-amber-700">
              <Hexagon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{purchaseModal.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{purchaseModal.message}</p>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setPurchaseModal(null)} className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800">
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
