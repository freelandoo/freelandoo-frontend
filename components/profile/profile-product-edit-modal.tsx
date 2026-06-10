"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GripVertical, ImagePlus, Loader2, Package, Save, Trash2, X } from "lucide-react"

// Caixas padrão Correios/Melhor Envio — escolher uma preenche as dimensões.
// Valores em cm. O peso fica separado porque varia por produto mesmo dentro
// da mesma caixa. "Personalizada" deixa os 3 campos livres.
type BoxPreset = { id: string; label: string; h: number; w: number; l: number; hint?: string }
const BOX_PRESETS: BoxPreset[] = [
  { id: "mini",   label: "Mini Envios (16 × 11 × 2 cm)",      h: 2,  w: 11, l: 16, hint: "envelope, acessórios pequenos" },
  { id: "pp",     label: "Caixa PP (18 × 14 × 8 cm)",         h: 8,  w: 14, l: 18, hint: "joias, eletrônicos pequenos" },
  { id: "p",      label: "Caixa P (27 × 18 × 9 cm)",          h: 9,  w: 18, l: 27, hint: "livros, camisetas dobradas" },
  { id: "m",      label: "Caixa M (31 × 24 × 11 cm)",         h: 11, w: 24, l: 31, hint: "roupas, calçados" },
  { id: "g",      label: "Caixa G (41 × 27 × 11 cm)",         h: 11, w: 27, l: 41, hint: "kits, produtos maiores" },
  { id: "gg",     label: "Caixa GG (33 × 24 × 24 cm)",        h: 24, w: 24, l: 33, hint: "volumosos" },
]

function detectPreset(h: string, w: string, l: string): string {
  const parse = (s: string) => {
    const n = parseFloat(String(s).replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }
  const hN = parse(h), wN = parse(w), lN = parse(l)
  const match = BOX_PRESETS.find(p => p.h === hN && p.w === wN && p.l === lN)
  return match?.id || "custom"
}
import { AffiliateOptInField } from "@/components/affiliate/affiliate-opt-in-field"
import {
  COLOR_SWATCHES,
  getAttributeSchema,
  rangeValues,
  type AttrField,
  type ProductAttributes,
} from "@/lib/product-attributes"
import { compressImageToMaxSize } from "@/lib/media/image-processing"
import {
  POST_IMAGE_MAX_SIZE_BYTES,
  POST_IMAGE_OUTPUT,
  validateImageFile,
  validateVideoFile,
} from "@/lib/media/media-validation"

export interface ProfileProduct {
  id_profile_product: number
  id_profile: string
  name: string
  description: string | null
  price_amount: number
  stock_quantity: number
  weight_grams: number
  height_cm: number | string
  width_cm: number | string
  length_cm: number | string
  origin_zipcode_override: string | null
  is_active: boolean
  id_product_category: number | null
  affiliates_allowed?: boolean
  delivery_mode?: "shipping" | "local_pickup"
  attributes?: ProductAttributes | null
  created_at?: string
  updated_at?: string
  media?: ProfileProductMedia[]
}

export interface ProductCategoryOption {
  id_product_category: number
  name: string
  slug: string
}

export interface ProfileProductMedia {
  id_product_media: number
  url?: string
  media_url?: string
  thumbnail_url?: string | null
  media_type?: "image" | "video"
  mime_type?: string
  sort_order: number
}

const MAX_PRODUCT_MEDIA = 8
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/webm", "video/quicktime",
]

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function headers(): HeadersInit {
  const token = getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function parsePriceReais(input: string): number {
  const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return -1
  return Math.round(n * 100)
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

/**
 * Espelha o card público de `profile-public-products-section.tsx`.
 * Se mudar o visual da vitrine, atualizar aqui também.
 */
function ProductCardPreview({
  name,
  description,
  priceCents,
  stockQty,
  coverUrl,
}: {
  name: string
  description: string
  priceCents: number
  stockQty: number
  coverUrl: string | null
}) {
  const { integer, cents } = formatPriceParts(priceCents)
  const desc = description.trim()
  const outOfStock = stockQty <= 0
  const displayName = name.trim() || "Nome do produto"

  return (
    <div className="group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-left">
      <div className="relative aspect-[4/5] w-full shrink-0 border-b-2 border-[#0B0B0D] bg-[#1d1810]">
        {outOfStock && (
          <span className="absolute left-2 top-2 z-10 rounded-full border border-[#0B0B0D] bg-[#0B0B0D]/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#F1EDE2]">
            Esgotado
          </span>
        )}
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2a2212] to-[#141009]">
            <Package className="h-11 w-11 text-[#F2B705]/40" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-2">
        <h3 className="truncate text-xs font-bold leading-snug text-[#0B0B0D]">{displayName}</h3>
        <div className="mt-1.5 min-h-0 flex-1">
          {desc ? (
            <p className="line-clamp-2 text-[10px] font-normal leading-relaxed text-[#5b554b]">
              {desc}
            </p>
          ) : null}
        </div>
        <div className="mt-auto shrink-0">
          <div className="mt-2 flex items-center justify-between gap-1.5">
            <p className="min-w-0 shrink text-sm font-bold leading-none tracking-tight text-[#0B0B0D] tabular-nums">
              R$ {integer}
              <span className="align-top text-[10px] font-semibold text-[#0B0B0D]/75">,{cents}</span>
            </p>
            <span className="shrink-0 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-2.5 py-1.5 text-center text-[9px] font-bold uppercase tracking-wider text-[#1A1505]">
              Ver
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseDecimal(input: string): number {
  const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return -1
  return Math.round(n * 100) / 100
}

function parseInteger(input: string): number {
  const n = Number(input.replace(/\D/g, ""))
  if (!Number.isFinite(n) || n < 0) return -1
  return Math.floor(n)
}

function formatZip(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

interface ProfileProductEditModalProps {
  open: boolean
  onClose: () => void
  profileId: string
  product: ProfileProduct | null
  onSaved: (product: ProfileProduct) => void
  onMediaChanged?: (productId: number, media: ProfileProductMedia[]) => void
  onError?: (message: string) => void
}

export function ProfileProductEditModal({
  open,
  onClose,
  profileId,
  product,
  onSaved,
  onMediaChanged,
  onError,
}: ProfileProductEditModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_reais: "0,00",
    stock_quantity: "0",
    weight_grams: "0",
    height_cm: "0",
    width_cm: "0",
    length_cm: "0",
    origin_zipcode_override: "",
    is_active: true,
    id_product_category: "" as string,
    affiliates_allowed: false,
    delivery_mode: "shipping" as "shipping" | "local_pickup",
  })
  const [attrs, setAttrs] = useState<ProductAttributes>({})
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<ProductCategoryOption[]>([])
  const [pricingPreview, setPricingPreview] = useState<{
    seller_amount_cents: number
    service_fee_cents: number
    processor_fee_cents: number
    affiliate_commission_cents: number
    display_price_cents: number
  } | null>(null)

  const [mediaList, setMediaList] = useState<ProfileProductMedia[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingMedia, setDeletingMedia] = useState<number | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewCoverUrl = useMemo(() => {
    const cover =
      mediaList.find((m) => m.media_type === "image" || m.mime_type?.startsWith("image/")) ||
      mediaList[0]
    return cover?.url || cover?.media_url || cover?.thumbnail_url || null
  }, [mediaList])
  const previewPriceCents = useMemo(() => {
    const cents = parsePriceReais(form.price_reais)
    return cents < 0 ? 0 : cents
  }, [form.price_reais])
  const previewStock = useMemo(() => {
    const n = Number(form.stock_quantity.replace(/\D/g, ""))
    return Number.isFinite(n) ? n : 0
  }, [form.stock_quantity])

  useEffect(() => {
    if (!open || product !== null) return
    setForm({
      name: "",
      description: "",
      price_reais: "0,00",
      stock_quantity: "0",
      weight_grams: "0",
      height_cm: "0",
      width_cm: "0",
      length_cm: "0",
      origin_zipcode_override: "",
      is_active: true,
      id_product_category: "",
      affiliates_allowed: false,
      delivery_mode: "shipping",
    })
    setAttrs({})
  }, [open, product])

  useEffect(() => {
    if (!open || !product) return
    setForm({
      name: product.name,
      description: product.description || "",
      price_reais: (product.price_amount / 100).toFixed(2).replace(".", ","),
      stock_quantity: String(product.stock_quantity ?? 0),
      weight_grams: String(product.weight_grams ?? 0),
      height_cm: String(product.height_cm ?? 0).replace(".", ","),
      width_cm: String(product.width_cm ?? 0).replace(".", ","),
      length_cm: String(product.length_cm ?? 0).replace(".", ","),
      origin_zipcode_override: product.origin_zipcode_override
        ? `${product.origin_zipcode_override.slice(0, 5)}-${product.origin_zipcode_override.slice(5, 8)}`
        : "",
      is_active: product.is_active !== false,
      id_product_category: product.id_product_category != null ? String(product.id_product_category) : "",
      affiliates_allowed: product.affiliates_allowed ?? false,
      delivery_mode: product.delivery_mode === "local_pickup" ? "local_pickup" : "shipping",
    })
    setAttrs(product.attributes && typeof product.attributes === "object" ? product.attributes : {})
  }, [open, product])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch("/api/product-categories")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list: ProductCategoryOption[] = Array.isArray(data?.categories) ? data.categories : []
        setCategories(list)
      })
      .catch(() => { /* silencioso */ })
    return () => { cancelled = true }
  }, [open])

  // Preview do preço final ao comprador
  useEffect(() => {
    if (!open) return
    const cents = parsePriceReais(form.price_reais)
    if (cents < 0 || cents === 0) { setPricingPreview(null); return }
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ seller_cents: String(cents) })
        if (form.affiliates_allowed) params.set("affiliates_allowed", "true")
        const r = await fetch(`/api/store/price-preview?${params.toString()}`, { headers: headers() })
        const d = await r.json()
        if (!cancelled && r.ok) setPricingPreview(d.pricing)
      } catch { /* silencioso */ }
    }, 300)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [open, form.price_reais, form.affiliates_allowed])

  const isEdit = product !== null
  const mediaUrl = (pid: number) =>
    `/api/profile/${profileId}/products/${pid}/media`

  const fetchMedia = useCallback(async () => {
    if (!product) return []
    setMediaLoading(true)
    try {
      const res = await fetch(mediaUrl(product.id_profile_product), { headers: headers() })
      if (res.ok) {
        const data = await res.json()
        const items: ProfileProductMedia[] = Array.isArray(data) ? data : data.media ?? []
        const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
        setMediaList(sorted)
        return sorted
      }
    } catch { /* silencioso */ }
    finally {
      setMediaLoading(false)
    }
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id_profile_product, profileId])

  useEffect(() => {
    if (open && product) fetchMedia()
    if (!open) setMediaList([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id_profile_product])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ""
    if (!file || !product) return

    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")
    const validation = isImage
      ? validateImageFile(file, POST_IMAGE_MAX_SIZE_BYTES)
      : isVideo
        ? validateVideoFile(file)
        : { ok: false as const, error: "Formato não suportado. Envie JPG, PNG, WebP, MP4, WebM ou MOV." }

    if (!validation.ok) {
      onError?.(validation.error)
      return
    }
    if (mediaList.length >= MAX_PRODUCT_MEDIA) {
      onError?.(`Máximo de ${MAX_PRODUCT_MEDIA} arquivos por produto.`)
      return
    }

    setUploading(true)
    let previewUrlToRevoke: string | null = null
    try {
      let uploadFile = file
      if (isImage) {
        const processed = await compressImageToMaxSize(file, {
          outputWidth: POST_IMAGE_OUTPUT.width,
          outputHeight: POST_IMAGE_OUTPUT.height,
          maxSizeBytes: POST_IMAGE_MAX_SIZE_BYTES,
          mimeType: "image/webp",
          errorMessage: "A foto do produto precisa ter no máximo 3MB após otimização.",
        })
        uploadFile = processed.file
        previewUrlToRevoke = processed.previewUrl
      }

      const fd = new FormData()
      fd.append("file", uploadFile)
      const res = await fetch(mediaUrl(product.id_profile_product), {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      if (res.ok) {
        const nextMedia = await fetchMedia()
        onMediaChanged?.(product.id_profile_product, nextMedia)
      } else {
        const d = await res.json().catch(() => ({}))
        onError?.(d.error || "Erro ao enviar arquivo")
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Erro de conexão ao enviar arquivo")
    } finally {
      if (previewUrlToRevoke) URL.revokeObjectURL(previewUrlToRevoke)
      setUploading(false)
    }
  }

  async function handleDeleteMedia(mediaId: number) {
    if (!product) return
    setDeletingMedia(mediaId)
    try {
      const res = await fetch(
        `${mediaUrl(product.id_profile_product)}/${mediaId}`,
        { method: "DELETE", headers: headers() },
      )
      if (res.ok) {
        setMediaList((prev) => {
          const next = prev.filter((m) => m.id_product_media !== mediaId)
          onMediaChanged?.(product.id_profile_product, next)
          return next
        })
      } else {
        const d = await res.json().catch(() => ({}))
        onError?.(d.error || "Erro ao remover arquivo")
      }
    } catch {
      onError?.("Erro de conexão ao remover arquivo")
    }
    setDeletingMedia(null)
  }

  async function handleReorder(fromIndex: number, toIndex: number) {
    if (!product || fromIndex === toIndex) return
    const reordered = [...mediaList]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setMediaList(reordered)
    onMediaChanged?.(product.id_profile_product, reordered)

    try {
      await fetch(`${mediaUrl(product.id_profile_product)}/reorder`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ ordered_ids: reordered.map((m) => m.id_product_media) }),
      })
    } catch { /* revert na próxima recarga */ }
  }

  function handleDragStart(idx: number) { setDragIdx(idx) }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  function handleDrop(idx: number) {
    if (dragIdx !== null && dragIdx !== idx) handleReorder(dragIdx, idx)
    setDragIdx(null); setDragOverIdx(null)
  }
  function handleDragEnd() { setDragIdx(null); setDragOverIdx(null) }

  function renderMediaThumb(media: ProfileProductMedia) {
    const url = media.url || media.media_url || media.thumbnail_url || ""
    const mimeType = media.mime_type || (media.media_type === "video" ? "video/mp4" : "image/webp")
    if (mimeType.startsWith("video/")) {
      return <video src={url} className="h-full w-full object-cover" muted preload="metadata" />
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-full w-full object-cover" />
  }

  async function saveProduct() {
    const name = form.name.trim()
    if (!name) { onError?.("Informe o nome do produto"); return }
    if (name.length > 160) { onError?.("Nome deve ter no máximo 160 caracteres"); return }

    const price_amount = parsePriceReais(form.price_reais)
    if (price_amount < 0) { onError?.("Preço inválido"); return }

    const stock_quantity = parseInteger(form.stock_quantity)
    if (stock_quantity < 0) { onError?.("Estoque inválido"); return }

    const weight_grams = parseInteger(form.weight_grams)
    if (weight_grams < 0) { onError?.("Peso inválido (gramas)"); return }

    const height_cm = parseDecimal(form.height_cm)
    const width_cm = parseDecimal(form.width_cm)
    const length_cm = parseDecimal(form.length_cm)
    if (height_cm < 0 || width_cm < 0 || length_cm < 0) {
      onError?.("Dimensões inválidas"); return
    }

    const zipDigits = form.origin_zipcode_override.replace(/\D/g, "")
    if (zipDigits && zipDigits.length !== 8) {
      onError?.("CEP de origem do produto inválido (8 dígitos)"); return
    }

    const categoryId = form.id_product_category ? Number(form.id_product_category) : 0
    if (!categoryId) { onError?.("Selecione uma categoria para o produto"); return }

    setSaving(true)
    const body: Record<string, unknown> = {
      name,
      description: form.description.trim() || null,
      price_amount,
      stock_quantity,
      weight_grams,
      height_cm,
      width_cm,
      length_cm,
      origin_zipcode_override: zipDigits || null,
      is_active: form.is_active,
      id_product_category: categoryId,
      affiliates_allowed: form.affiliates_allowed,
      delivery_mode: form.delivery_mode,
      attributes: attrs,
    }
    try {
      const url = product
        ? `/api/profile/${profileId}/products/${product.id_profile_product}`
        : `/api/profile/${profileId}/products`
      const res = await fetch(url, {
        method: product ? "PATCH" : "POST",
        headers: headers(),
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (res.ok && d.product) {
        onSaved(d.product as ProfileProduct)
        onClose()
      } else {
        onError?.(d.error || "Erro ao salvar")
      }
    } catch {
      onError?.("Erro de conexão")
    }
    setSaving(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-product-edit-title"
      >
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D]/15 p-6">
          <h2 id="profile-product-edit-title" className="fl-display text-2xl text-[#0B0B0D]">
            {isEdit ? "Editar produto" : "Novo produto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#0B0B0D]/60 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] px-6 py-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#5b554b]">
            Pré-visualização na vitrine
          </p>
          <div className="mx-auto w-[180px] overflow-hidden rounded-xl">
            <ProductCardPreview
              name={form.name}
              description={form.description}
              priceCents={previewPriceCents}
              stockQty={previewStock}
              coverUrl={previewCoverUrl}
            />
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="fl-label">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={160}
              placeholder="Ex: Camiseta oversized"
              className="fl-input"
            />
          </div>
          <div>
            <label className="fl-label">Descrição (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="fl-input resize-none"
            />
          </div>

          <div>
            <label className="fl-label">Categoria</label>
            <select
              value={form.id_product_category}
              onChange={(e) => {
                const next = e.target.value
                setForm((f) => ({ ...f, id_product_category: next }))
                // Poda atributos que não existem no schema da nova categoria.
                const slug = categories.find((c) => String(c.id_product_category) === next)?.slug
                const validKeys = new Set(getAttributeSchema(slug).map((fld) => fld.key))
                setAttrs((prev) => {
                  const out: ProductAttributes = {}
                  for (const [k, v] of Object.entries(prev)) if (validKeys.has(k)) out[k] = v
                  return out
                })
              }}
              className="fl-input"
            >
              <option value="">Selecione uma categoria…</option>
              {categories.map((c) => (
                <option key={c.id_product_category} value={c.id_product_category}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <AttributeFieldsEditor
            schema={getAttributeSchema(
              categories.find((c) => String(c.id_product_category) === form.id_product_category)?.slug
            )}
            value={attrs}
            onChange={setAttrs}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="fl-label">Preço (R$) — você recebe</label>
              <input
                type="text"
                value={form.price_reais}
                onChange={(e) => setForm((f) => ({ ...f, price_reais: e.target.value }))}
                placeholder="0,00"
                className="fl-input font-mono"
              />
            </div>
            <div>
              <label className="fl-label">Estoque (unidades)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.stock_quantity}
                onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value.replace(/\D/g, "") }))}
                placeholder="0"
                className="fl-input font-mono"
              />
            </div>
          </div>

          {pricingPreview && pricingPreview.display_price_cents > 0 && (
            <div className="rounded-lg border-2 border-[#E0A500]/40 bg-[#F2B705]/10 px-3 py-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#b8860b]">
                Preço final ao comprador (com taxas)
              </p>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-lg font-bold text-[#0B0B0D] tabular-nums">
                  {(pricingPreview.display_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span className="text-[10px] text-[#5b554b]">
                  Serviço {(pricingPreview.service_fee_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  {" · "}Maquininha {(pricingPreview.processor_fee_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  {pricingPreview.affiliate_commission_cents > 0 && (
                    <>
                      {" · "}Afiliado {(pricingPreview.affiliate_commission_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-[#8a8275]">
                Frete (Melhor Envio) é somado em cima desse valor no checkout.
              </p>
            </div>
          )}

          {/* Entrega — 1 select unificado: Retirar comigo | 6 caixas padrão | Personalizada.
              Local pickup → esconde tudo. Caixa padrão → auto-preenche e esconde campos.
              Personalizada → mostra dimensões/peso/CEP pra digitar à mão. */}
          <div>
            <p className="mb-2 text-xs font-bold text-[#0B0B0D]/60">Entrega</p>
            <select
              value={
                form.delivery_mode === "local_pickup"
                  ? "local_pickup"
                  : detectPreset(String(form.height_cm), String(form.width_cm), String(form.length_cm))
              }
              onChange={(e) => {
                const v = e.target.value
                if (v === "local_pickup") {
                  setForm((f) => ({ ...f, delivery_mode: "local_pickup" }))
                  return
                }
                if (v === "custom") {
                  setForm((f) => ({ ...f, delivery_mode: "shipping" }))
                  return
                }
                const preset = BOX_PRESETS.find((p) => p.id === v)
                if (!preset) return
                setForm((f) => ({
                  ...f,
                  delivery_mode: "shipping",
                  height_cm: String(preset.h).replace(".", ","),
                  width_cm: String(preset.w).replace(".", ","),
                  length_cm: String(preset.l).replace(".", ","),
                }))
              }}
              className="fl-input"
            >
              <option value="local_pickup">🤝 Retirar comigo (sem frete)</option>
              <optgroup label="Caixas padrão (Correios / Melhor Envio)">
                {BOX_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}{p.hint ? ` — ${p.hint}` : ""}
                  </option>
                ))}
              </optgroup>
              <option value="custom">Personalizada (digitar dimensões à mão)</option>
            </select>
            <p className="mt-1 text-[10px] text-[#8a8275]">
              Escolha a caixa em que vai embalar. Se nenhuma serve, use &quot;Personalizada&quot;.
            </p>
          </div>

          {form.delivery_mode === "local_pickup" ? (
            <div className="rounded-lg border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-3 text-xs text-[#5b554b]">
              Sem frete por transportadora. O comprador vai ver o botão &quot;Falar com vendedor&quot;
              no produto, que abre uma conversa direta com você no Mensagens.
            </div>
          ) : detectPreset(String(form.height_cm), String(form.width_cm), String(form.length_cm)) === "custom" ? (
          <>
          <div>
            <p className="mb-2 text-xs font-bold text-[#0B0B0D]/60">Dimensões e peso (personalizadas)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="fl-label">Peso (g)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.weight_grams}
                  onChange={(e) => setForm((f) => ({ ...f, weight_grams: e.target.value.replace(/\D/g, "") }))}
                  placeholder="0"
                  className="fl-input font-mono"
                />
              </div>
              <div>
                <label className="fl-label">Altura (cm)</label>
                <input
                  type="text"
                  value={form.height_cm}
                  onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
                  placeholder="0,00"
                  className="fl-input font-mono"
                />
              </div>
              <div>
                <label className="fl-label">Largura (cm)</label>
                <input
                  type="text"
                  value={form.width_cm}
                  onChange={(e) => setForm((f) => ({ ...f, width_cm: e.target.value }))}
                  placeholder="0,00"
                  className="fl-input font-mono"
                />
              </div>
              <div>
                <label className="fl-label">Comprimento (cm)</label>
                <input
                  type="text"
                  value={form.length_cm}
                  onChange={(e) => setForm((f) => ({ ...f, length_cm: e.target.value }))}
                  placeholder="0,00"
                  className="fl-input font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="fl-label">CEP de origem deste produto (opcional)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              value={form.origin_zipcode_override}
              onChange={(e) => setForm((f) => ({ ...f, origin_zipcode_override: formatZip(e.target.value) }))}
              placeholder="00000-000"
              className="fl-input font-mono"
            />
            <p className="mt-1 text-[10px] text-[#8a8275]">
              Sobrescreve o CEP padrão do subperfil para este produto.
            </p>
          </div>
          </>
          ) : (
            <div>
              {/* Caixa padrão escolhida — peso é o único campo que ainda precisa do vendedor. */}
              <label className="fl-label">Peso (g)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.weight_grams}
                onChange={(e) => setForm((f) => ({ ...f, weight_grams: e.target.value.replace(/\D/g, "") }))}
                placeholder="0"
                className="fl-input max-w-[200px] font-mono"
              />
              <p className="mt-1 text-[10px] text-[#8a8275]">
                Caixa padrão preenche as dimensões automaticamente. Só o peso varia por produto.
              </p>
            </div>
          )}

          {isEdit && (
            <div>
              <label className="mb-2 flex items-center gap-1 text-xs font-bold text-[#0B0B0D]/60">
                <ImagePlus className="h-3.5 w-3.5" />
                Fotos e vídeos do produto
              </label>

              {mediaLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0B0B0D]/40" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {mediaList.map((media, idx) => (
                      <div
                        key={media.id_product_media}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={handleDragEnd}
                        className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                          dragOverIdx === idx
                            ? "border-[#E0A500] ring-2 ring-[#E0A500]/30"
                            : "border-[#0B0B0D]/20"
                        } ${dragIdx === idx ? "opacity-40" : ""}`}
                      >
                        {renderMediaThumb(media)}
                        <div className="absolute inset-0 flex items-start justify-between bg-gradient-to-b from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            className="m-1 cursor-grab rounded p-0.5 text-white/70 hover:text-white active:cursor-grabbing"
                            aria-label="Arrastar para reordenar"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(media.id_product_media)}
                            disabled={deletingMedia === media.id_product_media}
                            className="m-1 rounded bg-red-600/80 p-1 text-white hover:bg-red-600 disabled:opacity-50"
                            aria-label="Remover arquivo"
                          >
                            {deletingMedia === media.id_product_media ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}

                    {mediaList.length < MAX_PRODUCT_MEDIA && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#0B0B0D]/30 text-[#5b554b] transition-colors hover:border-[#E0A500] hover:text-[#E0A500] disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="h-5 w-5" />
                            <span className="text-[10px]">Adicionar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_MIME_TYPES.join(",")}
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <p className="mt-1.5 text-[10px] text-[#8a8275]">
                    JPG, PNG, WebP, MP4, WebM ou MOV · Até {MAX_PRODUCT_MEDIA} arquivos.
                    {mediaList.length > 1 && " Arraste para reordenar."}
                  </p>
                </>
              )}
            </div>
          )}

          {!isEdit && (
            <p className="text-[11px] text-[#8a8275]">
              Após salvar, abra o produto novamente para enviar fotos e vídeos.
            </p>
          )}

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-[#0B0B0D]/40 text-[#E0A500] accent-[#E0A500]"
            />
            <span className="text-sm font-medium text-[#0B0B0D]">Ativo (visível na loja)</span>
          </label>

          <AffiliateOptInField
            variant="light"
            allowed={form.affiliates_allowed}
            onAllowedChange={(v) => setForm((f) => ({ ...f, affiliates_allowed: v }))}
            disabled={saving}
          />
        </div>
        <div className="flex justify-end gap-2 border-t-2 border-[#0B0B0D]/15 p-6">
          <button
            type="button"
            onClick={onClose}
            className="fl-btn-card rounded-full px-4 py-2 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveProduct}
            disabled={saving}
            className="fl-btn-gold inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Campos dinâmicos de atributos por categoria (lib/product-attributes.ts).
// chips/range → multi-select; colors → swatches; brand → texto com sugestões.
// Esses valores viram os subfiltros da aba Produtos no /search.
// =============================================================================
function AttributeFieldsEditor({
  schema,
  value,
  onChange,
}: {
  schema: AttrField[]
  value: ProductAttributes
  onChange: (next: ProductAttributes) => void
}) {
  if (schema.length === 0) return null

  const toggleMulti = (key: string, option: string) => {
    const current = Array.isArray(value[key]) ? (value[key] as string[]) : []
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option]
    const out = { ...value }
    if (next.length === 0) delete out[key]
    else out[key] = next
    onChange(out)
  }

  const setText = (key: string, text: string) => {
    const out = { ...value }
    if (!text.trim()) delete out[key]
    else out[key] = text
    onChange(out)
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5b554b]">
        Detalhes pro comprador filtrar
      </p>
      {schema.map((field) => {
        if (field.type === "brand") {
          const listId = `attr-brand-${field.key}`
          return (
            <div key={field.key}>
              <label className="fl-label">{field.label}</label>
              <input
                type="text"
                list={field.suggestions?.length ? listId : undefined}
                value={typeof value[field.key] === "string" ? (value[field.key] as string) : ""}
                onChange={(e) => setText(field.key, e.target.value)}
                maxLength={80}
                placeholder="Ex.: marca do produto"
                className="fl-input"
              />
              {field.suggestions?.length ? (
                <datalist id={listId}>
                  {field.suggestions.map((s) => <option key={s} value={s} />)}
                </datalist>
              ) : null}
            </div>
          )
        }

        if (field.type === "colors") {
          const selected = Array.isArray(value[field.key]) ? (value[field.key] as string[]) : []
          return (
            <div key={field.key}>
              <label className="fl-label">{field.label}</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_SWATCHES.map((c) => {
                  const active = selected.includes(c.name)
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggleMulti(field.key, c.name)}
                      aria-pressed={active}
                      title={c.name}
                      className={
                        "h-7 w-7 rounded-full border-2 transition-transform hover:-translate-y-0.5 " +
                        (active ? "border-[#0B0B0D] ring-2 ring-[#E0A500]" : "border-[#0B0B0D]/25")
                      }
                      style={
                        c.hex
                          ? { background: c.hex }
                          : { background: "conic-gradient(#E0312D,#F2B705,#2E9E44,#2E62D9,#7B3FE4,#E0312D)" }
                      }
                    />
                  )
                })}
              </div>
            </div>
          )
        }

        // chips e range (vendedor marca os valores disponíveis; a régua é só no filtro do comprador)
        const options = field.type === "range" ? rangeValues(field) : field.options ?? []
        const selected = Array.isArray(value[field.key]) ? (value[field.key] as string[]) : []
        return (
          <div key={field.key}>
            <label className="fl-label">{field.label}</label>
            <div className="flex flex-wrap gap-1.5">
              {options.map((opt) => {
                const active = selected.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleMulti(field.key, opt)}
                    aria-pressed={active}
                    className={
                      "border-2 px-2.5 py-1 text-[11px] font-bold transition-transform hover:-translate-y-0.5 " +
                      (active
                        ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D]"
                        : "border-[#0B0B0D]/25 bg-white/50 text-[#3a352c] hover:border-[#0B0B0D]")
                    }
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
