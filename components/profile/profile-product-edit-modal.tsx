"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GripVertical, ImagePlus, Loader2, Save, Trash2, X } from "lucide-react"
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
  created_at?: string
  updated_at?: string
  media?: ProfileProductMedia[]
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
  })
  const [saving, setSaving] = useState(false)

  const [mediaList, setMediaList] = useState<ProfileProductMedia[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingMedia, setDeletingMedia] = useState<number | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    })
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
    })
  }, [open, product])

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
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-product-edit-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <h2 id="profile-product-edit-title" className="text-lg font-semibold text-zinc-100">
            {isEdit ? "Editar produto" : "Novo produto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={160}
              placeholder="Ex: Camiseta oversized"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Descrição (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Preço (R$)</label>
              <input
                type="text"
                value={form.price_reais}
                onChange={(e) => setForm((f) => ({ ...f, price_reais: e.target.value }))}
                placeholder="0,00"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Estoque (unidades)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.stock_quantity}
                onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value.replace(/\D/g, "") }))}
                placeholder="0"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">Dimensões e peso (para frete)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Peso (g)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.weight_grams}
                  onChange={(e) => setForm((f) => ({ ...f, weight_grams: e.target.value.replace(/\D/g, "") }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Altura (cm)</label>
                <input
                  type="text"
                  value={form.height_cm}
                  onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Largura (cm)</label>
                <input
                  type="text"
                  value={form.width_cm}
                  onChange={(e) => setForm((f) => ({ ...f, width_cm: e.target.value }))}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Comprimento (cm)</label>
                <input
                  type="text"
                  value={form.length_cm}
                  onChange={(e) => setForm((f) => ({ ...f, length_cm: e.target.value }))}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">CEP de origem deste produto (opcional)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={9}
              value={form.origin_zipcode_override}
              onChange={(e) => setForm((f) => ({ ...f, origin_zipcode_override: formatZip(e.target.value) }))}
              placeholder="00000-000"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              Sobrescreve o CEP padrão do subperfil para este produto.
            </p>
          </div>

          {isEdit && (
            <div>
              <label className="mb-2 flex items-center gap-1 text-xs text-zinc-400">
                <ImagePlus className="h-3.5 w-3.5" />
                Fotos e vídeos do produto
              </label>

              {mediaLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
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
                        className={`group relative aspect-square overflow-hidden rounded-lg border transition-all ${
                          dragOverIdx === idx
                            ? "border-yellow-400 ring-2 ring-yellow-400/30"
                            : "border-zinc-700"
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
                        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-600 text-zinc-500 transition-colors hover:border-yellow-400/50 hover:text-yellow-400 disabled:opacity-50"
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

                  <p className="mt-1.5 text-[10px] text-zinc-600">
                    JPG, PNG, WebP, MP4, WebM ou MOV · Até {MAX_PRODUCT_MEDIA} arquivos.
                    {mediaList.length > 1 && " Arraste para reordenar."}
                  </p>
                </>
              )}
            </div>
          )}

          {!isEdit && (
            <p className="text-[11px] text-zinc-500">
              Após salvar, abra o produto novamente para enviar fotos e vídeos.
            </p>
          )}

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-yellow-400"
            />
            <span className="text-sm text-zinc-200">Ativo (visível na loja)</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveProduct}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-300 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}
