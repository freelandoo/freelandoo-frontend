"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Cog, Loader2, Lock, Package, Plus, Trash2 } from "lucide-react"
import {
  ProfileProductEditModal,
  type ProfileProduct,
  type ProfileProductMedia,
} from "@/components/profile/profile-product-edit-modal"

interface ProfileOwnerProductsSectionProps {
  profileId: string
}

function authHeaders(): HeadersInit | undefined {
  if (typeof window === "undefined") return undefined
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

function formatPriceParts(cents: number) {
  const safe = Math.max(0, Math.round(Number.isFinite(cents) ? cents : 0))
  const intPart = Math.floor(safe / 100)
  const frac = safe % 100
  return {
    integer: intPart.toLocaleString("pt-BR"),
    cents: frac.toString().padStart(2, "0"),
  }
}

function getCoverUrl(product: ProfileProduct) {
  const media = product.media || []
  const cover =
    media.find((m) => m.media_type === "image" || m.mime_type?.startsWith("image/")) ||
    media[0]
  return cover?.url || cover?.media_url || cover?.thumbnail_url || ""
}

export function ProfileOwnerProductsSection({ profileId }: ProfileOwnerProductsSectionProps) {
  const [products, setProducts] = useState<ProfileProduct[]>([])
  const [profileIsPaid, setProfileIsPaid] = useState<boolean | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [productSheet, setProductSheet] = useState<ProfileProduct | "create" | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    try {
      const ah = authHeaders()
      if (!ah) { setState("error"); return }
      const res = await fetch(`/api/profile/${profileId}/products`, { headers: ah })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || "fail")
      setProducts((d.products || []) as ProfileProduct[])
      setProfileIsPaid(!!d.profile_is_paid)
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [profileId])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (p: ProfileProduct) => {
    setProductSheet(p)
    setFeedbackError(null)
  }

  const openCreate = () => {
    setProductSheet("create")
    setFeedbackError(null)
  }

  const handleSaved = (saved: ProfileProduct) => {
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x.id_profile_product === saved.id_profile_product)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], ...saved, media: saved.media ?? next[idx].media }
        return next
      }
      return [...prev, saved]
    })
  }

  const handleMediaChanged = (productId: number, media: ProfileProductMedia[]) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id_profile_product === productId ? { ...p, media } : p
      )
    )
  }

  const handleDelete = async (product: ProfileProduct) => {
    if (!confirm(`Remover "${product.name}" da loja?`)) return
    setDeleting(product.id_profile_product)
    try {
      const ah = authHeaders()
      const res = await fetch(
        `/api/profile/${profileId}/products/${product.id_profile_product}`,
        { method: "DELETE", headers: ah },
      )
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id_profile_product !== product.id_profile_product))
      } else {
        const d = await res.json().catch(() => ({}))
        setFeedbackError(d.error || "Erro ao remover produto")
      }
    } catch {
      setFeedbackError("Erro de conexão ao remover produto")
    } finally {
      setDeleting(null)
    }
  }

  if (state === "error") {
    return (
      <section id="products-section" className="mb-20 scroll-mt-24">
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os produtos agora. Tente novamente mais tarde.
          </p>
        </div>
      </section>
    )
  }

  if (state === "loading") {
    return (
      <section id="products-section" className="mb-20 scroll-mt-24">
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        </div>
      </section>
    )
  }

  if (profileIsPaid === false) {
    return (
      <section id="products-section" className="mb-20 scroll-mt-24">
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-zinc-500" aria-hidden />
          <h3 className="mb-1 text-base font-semibold text-zinc-100">Loja disponível apenas para subperfis pagos</h3>
          <p className="mb-5 text-sm text-zinc-400">
            Ative a assinatura deste subperfil para começar a vender produtos.
          </p>
          <Link
            href={`/payment/taxa?profile_id=${profileId}`}
            className="inline-flex items-center justify-center rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-300"
          >
            Ativar subperfil pago
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section id="products-section" className="mb-20 scroll-mt-24">
      <div className="mb-4 flex items-center justify-between gap-3 px-4 md:px-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Loja</h2>
          <p className="text-[11px] text-zinc-500">
            Produtos físicos vendidos por este subperfil.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-yellow-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo produto
        </button>
      </div>

      {feedbackError && (
        <p className="mb-3 px-4 text-center text-sm text-destructive md:px-0 md:text-left">
          {feedbackError}
        </p>
      )}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Nenhum produto na loja ainda. Crie o primeiro para começar a vender.
          </p>
        </div>
      ) : (
        <ul className="-mx-4 grid grid-cols-3 items-stretch gap-px md:mx-0">
          {products.map((p) => {
            const img = getCoverUrl(p)
            const { integer, cents } = formatPriceParts(p.price_amount)
            const desc = p.description?.trim()
            const lowStock = p.stock_quantity <= 0

            return (
              <li
                key={p.id_profile_product}
                className="group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#121212] text-left"
              >
                <div className="relative aspect-[4/5] w-full shrink-0 bg-zinc-900">
                  <button
                    type="button"
                    className="absolute right-2 top-2 z-10 cursor-pointer rounded-full bg-black/55 p-1.5 text-zinc-100 backdrop-blur-sm transition hover:bg-black/75 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                    aria-label={`Editar produto: ${p.name}`}
                  >
                    <Cog className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-12 z-10 cursor-pointer rounded-full bg-black/55 p-1.5 text-red-300 backdrop-blur-sm transition hover:bg-black/75 hover:text-red-200 disabled:opacity-50"
                    onClick={(e) => { e.stopPropagation(); handleDelete(p) }}
                    disabled={deleting === p.id_profile_product}
                    aria-label={`Remover produto: ${p.name}`}
                  >
                    {deleting === p.id_profile_product ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>

                  {!p.is_active && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-zinc-700/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-200">
                      Inativo
                    </span>
                  )}

                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                      <Package className="h-11 w-11 text-zinc-600/90 sm:h-12 sm:w-12" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-2 md:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-xs font-bold leading-snug text-white md:text-sm">{p.name}</h3>
                    <div className={`flex shrink-0 items-center gap-0.5 text-[10px] font-medium md:text-[11px] ${lowStock ? "text-red-400" : "text-yellow-500"}`}>
                      <span className="tabular-nums">{p.stock_quantity} un</span>
                    </div>
                  </div>

                  <div className="mt-1.5 min-h-0 flex-1">
                    {desc ? (
                      <p className="line-clamp-2 text-[10px] font-normal leading-relaxed text-zinc-300 md:text-[11px]">{desc}</p>
                    ) : null}
                  </div>

                  <div className="mt-auto shrink-0">
                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      <p className="min-w-0 shrink text-sm font-bold leading-none tracking-tight text-white tabular-nums md:text-xl">
                        R$ {integer}
                        <span className="align-top text-[10px] font-semibold text-white/95 md:text-xs">,{cents}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="shrink-0 rounded-full bg-yellow-400 px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-black transition hover:bg-yellow-300 active:scale-[0.99] md:px-3 md:text-[10px]"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ProfileProductEditModal
        open={productSheet !== null}
        onClose={() => setProductSheet(null)}
        profileId={profileId}
        product={productSheet !== null && productSheet !== "create" ? productSheet : null}
        onSaved={(updated) => {
          handleSaved(updated)
          setFeedbackError(null)
        }}
        onMediaChanged={handleMediaChanged}
        onError={(msg) => {
          setFeedbackError(msg)
          window.setTimeout(() => setFeedbackError(null), 5000)
        }}
      />
    </section>
  )
}
