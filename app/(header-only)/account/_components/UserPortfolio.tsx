"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  ImageIcon,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Loader2,
  Heart,
  ExternalLink,
  X,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Media = {
  id_portfolio_media: string
  media_url: string
  media_type: "image" | "video"
  thumbnail_url?: string | null
  is_active?: boolean
}

type Item = {
  id_portfolio_item: string
  title: string | null
  description: string | null
  project_url: string | null
  is_featured?: boolean
  sort_order?: number
  likes_count?: number
  liked_by_me?: boolean
  media: Media[]
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

/**
 * Portfólio do user-account (perfil-fantasma).
 * Visual idêntico ao do subperfil (grid 3-col aspect-[4/5], header com
 * "PORTFÓLIO" + botão "Novo item", overlay de ações, suporte vídeo/imagem,
 * múltiplas mídias por item). Endpoints /api/me/portfolio/*.
 */
export function UserPortfolio() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)

  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    project_url: "",
  })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [uploadingForItem, setUploadingForItem] = useState<string | null>(null)

  const clearPending = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
  }, [pendingPreview])

  const fetchItems = useCallback(async () => {
    const t = token()
    if (!t) return
    setLoading(true)
    setListError(null)
    try {
      const res = await fetch("/api/me/portfolio", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar portfólio")
      setItems(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao carregar portfólio")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  const handleAddItem = () => {
    setEditingItemId(null)
    setForm({ title: "", description: "", project_url: "" })
    setPortfolioError(null)
    clearPending()
    setIsModalOpen(true)
  }

  const handleEditItem = (item: Item) => {
    setEditingItemId(item.id_portfolio_item)
    setForm({
      title: item.title ?? "",
      description: item.description ?? "",
      project_url: item.project_url ?? "",
    })
    setPortfolioError(null)
    clearPending()
    setIsModalOpen(true)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const isImage = f.type.startsWith("image/")
    const isVideo = f.type.startsWith("video/")
    if (!isImage && !isVideo) {
      setPortfolioError("Envie uma imagem (JPG/PNG/WebP) ou vídeo (MP4/WebM).")
      return
    }
    clearPending()
    setPendingFile(f)
    setPendingPreview(URL.createObjectURL(f))
    setPortfolioError(null)
  }

  const handleSubmitItem = async () => {
    const t = token()
    if (!t) return

    const isEditing = editingItemId !== null
    setIsAddingItem(true)
    setPortfolioError(null)

    try {
      const url = isEditing
        ? `/api/me/portfolio/${editingItemId}`
        : `/api/me/portfolio`
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim() || null,
          description: form.description.trim() || null,
          project_url: form.project_url.trim() || null,
          is_featured: false,
          sort_order: 0,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPortfolioError(data.error || (isEditing ? "Erro ao editar" : "Erro ao criar item"))
        return
      }
      const created = await res.json()
      const newItemId: string = isEditing
        ? editingItemId!
        : created.id_portfolio_item ?? created.item?.id_portfolio_item

      // Upload da mídia pendente (se houver)
      if (pendingFile && newItemId) {
        const fd = new FormData()
        fd.append("file", pendingFile)
        const uploadRes = await fetch(`/api/me/portfolio/${newItemId}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
          body: fd,
        })
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}))
          setPortfolioError(uploadData.error || "Erro ao fazer upload da mídia")
          return
        }
      }

      clearPending()
      setIsModalOpen(false)
      setEditingItemId(null)
      await fetchItems()
    } catch (err) {
      setPortfolioError(
        err instanceof Error
          ? err.message
          : isEditing
          ? "Erro ao editar. Tente novamente."
          : "Erro ao criar. Tente novamente."
      )
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleUploadToExistingItem = async (
    e: React.ChangeEvent<HTMLInputElement>,
    itemId: string,
  ) => {
    const f = e.target.files?.[0]
    if (!f) return
    const t = token()
    if (!t) return

    setUploadingForItem(itemId)
    try {
      const fd = new FormData()
      fd.append("file", f)
      const res = await fetch(`/api/me/portfolio/${itemId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erro ao enviar mídia")
        return
      }
      await fetchItems()
    } catch {
      alert("Erro ao enviar mídia. Tente novamente.")
    } finally {
      setUploadingForItem(null)
      // Reset input
      e.target.value = ""
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Remover este item do portfólio?")) return
    const t = token()
    if (!t) return
    try {
      const res = await fetch(`/api/me/portfolio/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok || res.status === 204) {
        setItems((prev) => prev.filter((it) => it.id_portfolio_item !== itemId))
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erro ao remover item")
      }
    } catch {
      alert("Erro ao remover item. Tente novamente.")
    }
  }

  const handleDeleteMedia = async (itemId: string, mediaId: string) => {
    if (!confirm("Remover esta mídia?")) return
    const t = token()
    if (!t) return
    try {
      const res = await fetch(`/api/me/portfolio/${itemId}/media/${mediaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok || res.status === 204) {
        setItems((prev) =>
          prev.map((it) =>
            it.id_portfolio_item === itemId
              ? { ...it, media: it.media.filter((m) => m.id_portfolio_media !== mediaId) }
              : it,
          ),
        )
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erro ao remover mídia")
      }
    } catch {
      alert("Erro ao remover mídia. Tente novamente.")
    }
  }

  return (
    <section className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-center md:justify-between mb-6">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-wide uppercase text-muted-foreground">
            Portfólio
          </h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="hidden md:flex font-medium text-primary hover:bg-primary/10"
          onClick={handleAddItem}
          disabled={isAddingItem}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isAddingItem ? "Criando..." : "Novo item"}
        </Button>
      </div>

      {/* Mobile Novo Item button */}
      <div className="flex md:hidden justify-center mb-6">
        <Button
          size="sm"
          variant="outline"
          className="w-full max-w-xs font-medium"
          onClick={handleAddItem}
          disabled={isAddingItem}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isAddingItem ? "Criando..." : "Novo item"}
        </Button>
      </div>

      {listError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="h-4 w-4" />
          {listError}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando portfólio…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
          <div className="h-16 w-16 rounded-full border-2 flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">Nenhum item no portfólio ainda.</p>
          <Button variant="link" onClick={handleAddItem} className="mt-2 text-primary">
            Adicionar o primeiro item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {items.map((item) => {
            const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
            const firstMedia = activeMedias[0]
            return (
              <div key={item.id_portfolio_item} className="group relative flex flex-col">
                {/* Media Container 4:5 */}
                {firstMedia ? (
                  <div className="relative aspect-[4/5] bg-muted overflow-hidden md:rounded-lg border border-border/50">
                    {firstMedia.media_type === "video" ? (
                      <video
                        src={firstMedia.media_url}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        muted
                        playsInline
                        onMouseEnter={(e) => { void e.currentTarget.play() }}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={firstMedia.media_url}
                        alt={item.title ?? "Mídia do portfólio"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}

                    {/* Multiple media indicator */}
                    {activeMedias.length > 1 && (
                      <div className="absolute top-3 right-3">
                        <ImageIcon className="h-5 w-5 text-white drop-shadow-md opacity-90" />
                      </div>
                    )}

                    {/* Owner Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <label
                        className="flex items-center justify-center h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm cursor-pointer transition-colors"
                        title="Adicionar mídia"
                      >
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                          onChange={(e) => handleUploadToExistingItem(e, item.id_portfolio_item)}
                          disabled={uploadingForItem === item.id_portfolio_item}
                        />
                        {uploadingForItem === item.id_portfolio_item ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5" />
                        )}
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleEditItem(item)}
                          className="flex items-center justify-center h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition-colors"
                          title="Editar item"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id_portfolio_item)}
                          className="flex items-center justify-center h-10 w-10 bg-destructive/80 hover:bg-destructive text-white rounded-full backdrop-blur-sm transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[4/5] bg-muted flex items-center justify-center md:rounded-lg border border-border/50">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label
                        className="flex items-center justify-center h-10 w-10 bg-background border shadow-sm hover:bg-accent text-foreground rounded-full cursor-pointer transition-colors"
                        title="Adicionar mídia"
                      >
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                          onChange={(e) => handleUploadToExistingItem(e, item.id_portfolio_item)}
                          disabled={uploadingForItem === item.id_portfolio_item}
                        />
                        {uploadingForItem === item.id_portfolio_item ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5" />
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id_portfolio_item)}
                        className="flex items-center justify-center h-10 w-10 bg-background border shadow-sm hover:bg-destructive hover:text-destructive-foreground text-foreground rounded-full transition-colors"
                        title="Remover item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Content below image */}
                <div className="pt-3 px-2 md:px-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm line-clamp-1">
                      {item.title || "Sem título"}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          item.liked_by_me ? "text-red-500" : "text-muted-foreground"
                        }`}
                        title={`${item.likes_count ?? 0} curtidas`}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${item.liked_by_me ? "fill-current" : ""}`}
                        />
                        <span className="tabular-nums">{item.likes_count ?? 0}</span>
                      </span>
                      {item.project_url && (
                        <a
                          href={item.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center"
                          title="Ver projeto"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Secondary Media Thumbnails */}
                  {activeMedias.length > 1 && (
                    <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
                      {activeMedias.slice(1).map((media) => (
                        <div
                          key={media.id_portfolio_media}
                          className="relative group/thumb shrink-0 w-10 h-10 rounded overflow-hidden border border-border"
                        >
                          {media.media_type === "video" ? (
                            <video
                              src={media.media_url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={media.media_url}
                              alt="Mídia"
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMedia(item.id_portfolio_item, media.id_portfolio_media)
                            }
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            aria-label="Remover mídia"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Novo/Editar */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(o) => {
          setIsModalOpen(o)
          if (!o) {
            setEditingItemId(null)
            clearPending()
            setPortfolioError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Editar item" : "Novo item de portfólio"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="up-title">Título</Label>
              <Input
                id="up-title"
                placeholder="Ex.: Trabalho que fiz ontem"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="up-desc">Descrição (opcional)</Label>
              <textarea
                id="up-desc"
                placeholder="Conte algo sobre essa publicação…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={500}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="up-url">URL do projeto (opcional)</Label>
              <Input
                id="up-url"
                type="url"
                placeholder="https://…"
                value={form.project_url}
                onChange={(e) => setForm({ ...form, project_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="up-file">Imagem ou vídeo</Label>
              <Input
                id="up-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={onFileChange}
              />
              {pendingPreview && pendingFile && (
                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                  {pendingFile.type.startsWith("video/") ? (
                    <video
                      src={pendingPreview}
                      className="h-48 w-full object-cover"
                      muted
                      playsInline
                      controls
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pendingPreview} alt="" className="h-48 w-full object-cover" />
                  )}
                </div>
              )}
              {editingItemId && (
                <p className="text-[11px] text-muted-foreground">
                  Sem arquivo selecionado, mantém as mídias atuais.
                </p>
              )}
            </div>

            {portfolioError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <AlertCircle className="h-4 w-4" />
                {portfolioError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isAddingItem}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitItem} disabled={isAddingItem}>
              {isAddingItem ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : editingItemId ? (
                "Salvar"
              ) : (
                "Publicar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default UserPortfolio
