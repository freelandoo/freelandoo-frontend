"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Cog, Loader2, Lock, Package, Plus, RefreshCw, Trash2 } from "lucide-react"
import {
  ProfileProductEditModal,
  type ProfileProduct,
  type ProfileProductMedia,
} from "@/components/profile/profile-product-edit-modal"
import { EmptyState, LoadingState } from "@/components/tabloide"
import { useActionConsent } from "@/hooks/use-action-consent"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"

const INTL_TAG: Record<string, string> = { "pt-BR": "pt-BR", en: "en-US", es: "es-ES" }

interface ProfileOwnerProductsSectionProps {
  profileId: string
}

function authHeaders(): HeadersInit | undefined {
  if (typeof window === "undefined") return undefined
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

function formatPriceParts(cents: number, intlTag: string) {
  const safe = Math.max(0, Math.round(Number.isFinite(cents) ? cents : 0))
  const intPart = Math.floor(safe / 100)
  const frac = safe % 100
  return {
    integer: intPart.toLocaleString(intlTag),
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
  const t = useTranslations("Account")
  const locale = useLocale()
  const intlTag = INTL_TAG[locale] || "pt-BR"
  const [products, setProducts] = useState<ProfileProduct[]>([])
  const [profileIsPaid, setProfileIsPaid] = useState<boolean | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [productSheet, setProductSheet] = useState<ProfileProduct | "create" | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const { ensureConsent } = useActionConsent()

  const load = useCallback(async () => {
    setState("loading")
    setLoadError(null)
    try {
      const ah = authHeaders()
      if (!ah) {
        setLoadError(t("loginToManageStore", "Você precisa estar logado para gerenciar a loja."))
        setState("error")
        return
      }
      const res = await fetch(`/api/profile/${profileId}/products`, { headers: ah })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(d?.error || `${t("httpError", "Erro HTTP")} ${res.status}`)
        setState("error")
        return
      }
      setProducts((d.products || []) as ProfileProduct[])
      setProfileIsPaid(!!d.profile_is_paid)
      setState("loaded")
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("connectionErrorShort", "Erro de conexão"))
      setState("error")
    }
  }, [profileId, t])

  useEffect(() => {
    load()
  }, [load])

  const openEdit = (p: ProfileProduct) => {
    setProductSheet(p)
    setFeedbackError(null)
  }

  const openCreate = async () => {
    if (!(await ensureConsent("publish_offer"))) return
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
    if (!confirm(`${t("removeFromStorePre", "Remover")} "${product.name}" ${t("removeFromStorePost", "da loja?")}`)) return
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
        setFeedbackError(d.error || t("removeProductError", "Erro ao remover produto"))
      }
    } catch {
      setFeedbackError(t("removeProductConnError", "Erro de conexão ao remover produto"))
    } finally {
      setDeleting(null)
    }
  }

  if (state === "loading") {
    return (
      <section id="products-section" className="mb-20 scroll-mt-24">
        <LoadingState label={t("loadingProductsEllipsis", "Carregando produtos…")} />
      </section>
    )
  }

  if (state === "error") {
    return (
      <section id="products-section" className="mb-20 scroll-mt-24">
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] px-6 py-10 text-center text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
          <p className="fl-display text-xl text-[#0B0B0D]">{t("loadProductsError", "Não foi possível carregar os produtos.")}</p>
          {loadError && (
            <p className="text-xs text-[#b91c1c] break-words">{loadError}</p>
          )}
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={load}
              className="fl-btn-card inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("tryAgain", "Tentar novamente")}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="fl-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("productWord", "Produto")}
            </button>
          </div>
        </div>

        <ProfileProductEditModal
          open={productSheet !== null}
          onClose={() => setProductSheet(null)}
          profileId={profileId}
          product={productSheet !== null && productSheet !== "create" ? productSheet : null}
          onSaved={(saved) => {
            handleSaved(saved)
            setProfileIsPaid(true)
            setState("loaded")
            setLoadError(null)
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

  if (profileIsPaid === false) {
    return (
      <section id="products-section" className="mb-20 scroll-mt-24">
        <div className="mx-auto max-w-md rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] px-6 py-12 text-center text-[#0B0B0D] shadow-[5px_5px_0_0_#0B0B0D]">
          <Lock className="mx-auto mb-3 h-10 w-10 text-[#0B0B0D]/40" aria-hidden />
          <h3 className="fl-display mb-1 text-xl text-[#0B0B0D]">{t("storePaidOnly", "Loja só para subperfis pagos")}</h3>
          <p className="mb-5 text-sm text-[#5b554b]">
            {t("activateToSell", "Ative este subperfil para começar a vender produtos.")}
          </p>
          <Link
            href={`/payment/taxa?profile_id=${profileId}`}
            className="fl-btn-gold inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-bold"
          >
            {t("activatePaidSubprofile", "Ativar subperfil pago")}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section id="products-section" className="mb-20 scroll-mt-24">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="fl-display text-2xl text-[#F5F1E8] md:text-3xl">{t("storeTitle", "Loja")}</h2>
          <p className="text-[11px] text-[#9A938A]">
            {t("physicalProductsBy", "Produtos físicos vendidos por este subperfil.")}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="fl-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("productWord", "Produto")}
        </button>
      </div>

      {feedbackError && (
        <p className="mb-3 rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/10 px-3 py-2 text-center text-sm font-medium text-[#fca5a5] md:text-left">
          {feedbackError}
        </p>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title={t("emptyStore", "Loja vazia")}
          description={t("emptyStoreDesc", "Nenhum produto na loja ainda. Crie o primeiro para começar a vender.")}
        />
      ) : (
        <ul className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3">
          {products.map((p) => {
            const img = getCoverUrl(p)
            const { integer, cents } = formatPriceParts(p.price_amount, intlTag)
            const desc = p.description?.trim()
            const lowStock = p.stock_quantity <= 0

            return (
              <li
                key={p.id_profile_product}
                className="group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-left shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705]"
              >
                <div className="relative aspect-[4/5] w-full shrink-0 border-b-2 border-[#0B0B0D] bg-[#1d1810]">
                  <button
                    type="button"
                    className="absolute right-2 top-2 z-10 cursor-pointer rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] p-1.5 text-[#0B0B0D] transition hover:bg-[#F2B705]"
                    onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                    aria-label={`${t("editProductAria", "Editar produto:")} ${p.name}`}
                  >
                    <Cog className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-12 z-10 cursor-pointer rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] p-1.5 text-[#b91c1c] transition hover:bg-[#dc2626] hover:text-white disabled:opacity-50"
                    onClick={(e) => { e.stopPropagation(); handleDelete(p) }}
                    disabled={deleting === p.id_profile_product}
                    aria-label={`${t("removeProductAria", "Remover produto:")} ${p.name}`}
                  >
                    {deleting === p.id_profile_product ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>

                  {!p.is_active && (
                    <span className="absolute left-2 top-2 z-10 rounded-full border border-[#0B0B0D] bg-[#0B0B0D]/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#F1EDE2]">
                      {t("inactive", "Inativo")}
                    </span>
                  )}

                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2212] to-[#141009]">
                      <Package className="h-11 w-11 text-[#F2B705]/40 sm:h-12 sm:w-12" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-2 md:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-xs font-bold leading-snug text-[#0B0B0D] md:text-sm">{p.name}</h3>
                    <div className={`flex shrink-0 items-center gap-0.5 text-[10px] font-bold md:text-[11px] ${lowStock ? "text-[#b91c1c]" : "text-[#E0A500]"}`}>
                      <span className="tabular-nums">{p.stock_quantity} {t("unitsAbbr", "un")}</span>
                    </div>
                  </div>

                  <div className="mt-1.5 min-h-0 flex-1">
                    {desc ? (
                      <p className="line-clamp-2 text-[10px] font-normal leading-relaxed text-[#5b554b] md:text-[11px]">{desc}</p>
                    ) : null}
                  </div>

                  <div className="mt-auto shrink-0">
                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      <p className="min-w-0 shrink text-sm font-bold leading-none tracking-tight text-[#0B0B0D] tabular-nums md:text-xl">
                        R$ {integer}
                        <span className="align-top text-[10px] font-semibold text-[#0B0B0D]/75 md:text-xs">,{cents}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="fl-btn-gold shrink-0 rounded-full px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider md:px-3 md:text-[10px]"
                      >
                        {t("editLabel", "Editar")}
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
