"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
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
  Hexagon,
  GraduationCap,
  UserRound,
  Users,
} from "lucide-react"
import { CoursesSection, type ProfileOption } from "./courses-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { MediaCropModal } from "@/components/media/media-crop-modal"
import {
  BEES_VIDEO_ASPECT_RATIO_MAX,
  POST_IMAGE_ASPECT_RATIO,
  POST_IMAGE_MAX_SIZE_BYTES,
  POST_IMAGE_OUTPUT,
  getImageDimensions,
  getVideoDimensions,
  isAspectRatio,
  validateImageFile,
  validateVideoFile,
} from "@/lib/media/media-validation"
import {
  compressImageToMaxSize,
  type ProcessedImage,
} from "@/lib/media/image-processing"

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
  feed_kind?: "feed" | "bees"
  likes_count?: number
  liked_by_me?: boolean
  media: Media[]
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

const BACKEND_DIRECT = "https://freelandoo-backend-production.up.railway.app"

/**
 * Portfólio do user-account (perfil-fantasma).
 * Espelha o subperfil: tabs Portfolio/Bees, modal com preview, crop modal pra
 * imagens 4:5 e validação 9:16 pra vídeos do Bees. Vídeos vão direto pro
 * backend pra escapar do body limit do Vercel.
 */
interface UserPortfolioProps {
  coursesProfileOptions?: ProfileOption[]
  /** Conteúdo da aba "Meus Perfis" (só renderizado em /account). */
  myProfilesSlot?: React.ReactNode
  /** Conteúdo da aba "Meus Clans" (só renderizado em /account). */
  myClansSlot?: React.ReactNode
}

type PortfolioTab = "feed" | "bees" | "courses" | "profiles" | "clans"

export function UserPortfolio({
  coursesProfileOptions = [],
  myProfilesSlot,
  myClansSlot,
}: UserPortfolioProps = {}) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  const [portfolioTab, setPortfolioTab] = useState<PortfolioTab>("feed")

  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    project_url: "",
  })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingOriginalFile, setPendingOriginalFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<{
    file: File
    itemId?: string
    mode: "new" | "existing"
  } | null>(null)
  const [processingMedia, setProcessingMedia] = useState(false)
  const [uploadingForItem, setUploadingForItem] = useState<string | null>(null)

  const clearPending = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingOriginalFile(null)
    setPendingPreview(null)
  }, [pendingPreview])

  const setPendingProcessedImage = useCallback(
    (processed: ProcessedImage, originalFile: File) => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview)
      setPendingFile(processed.file)
      setPendingOriginalFile(originalFile)
      setPendingPreview(processed.previewUrl)
    },
    [pendingPreview],
  )

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

  const isPortfolioGridTab = portfolioTab === "feed" || portfolioTab === "bees"
  const filteredItems = useMemo(
    () =>
      isPortfolioGridTab
        ? items.filter((it) => (it.feed_kind ?? "feed") === portfolioTab)
        : [],
    [items, portfolioTab, isPortfolioGridTab],
  )
  const aspectClass = portfolioTab === "bees" ? "aspect-[9/16]" : "aspect-[4/5]"
  const emptyLabel =
    portfolioTab === "bees" ? "Nenhum Bees ainda." : "Nenhum item no portfólio ainda."

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

  const validateBeesVideo = useCallback(async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("video/")) {
      return "Bees aceita apenas vídeos 9:16. Envie um arquivo MP4 ou WebM."
    }
    const v = validateVideoFile(file)
    if (!v.ok) return v.error
    try {
      const dim = await getVideoDimensions(file)
      if (dim.aspectRatio > BEES_VIDEO_ASPECT_RATIO_MAX) {
        return "Esse vídeo não está em 9:16. Bees aceita apenas vídeos verticais (9:16)."
      }
    } catch (err) {
      return err instanceof Error ? err.message : "Não foi possível validar o vídeo."
    }
    return null
  }, [])

  const preparePostImage = useCallback(
    async (file: File, mode: "new" | "existing", itemId?: string) => {
      const imageValidation = validateImageFile(file, POST_IMAGE_MAX_SIZE_BYTES)
      if (!imageValidation.ok) {
        setPortfolioError(imageValidation.error)
        return
      }
      setPortfolioError(null)
      try {
        const dimensions = await getImageDimensions(file)
        if (!isAspectRatio(dimensions.width, dimensions.height, POST_IMAGE_ASPECT_RATIO)) {
          setCropTarget({ file, itemId, mode })
          return
        }
        setProcessingMedia(true)
        const processed = await compressImageToMaxSize(file, {
          outputWidth: POST_IMAGE_OUTPUT.width,
          outputHeight: POST_IMAGE_OUTPUT.height,
          maxSizeBytes: POST_IMAGE_MAX_SIZE_BYTES,
          mimeType: "image/webp",
          errorMessage: "A imagem do post precisa ter no máximo 3MB.",
        })
        if (mode === "new") {
          setPendingProcessedImage(processed, file)
        } else if (itemId) {
          URL.revokeObjectURL(processed.previewUrl)
          await uploadFileToItem(itemId, processed.file)
        }
      } catch (err) {
        setPortfolioError(
          err instanceof Error
            ? err.message
            : "Não foi possível otimizar esse arquivo. Tente outro.",
        )
      } finally {
        setProcessingMedia(false)
      }
    },
    [setPendingProcessedImage],
  )

  const handlePendingFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (portfolioTab === "bees") {
      const err = await validateBeesVideo(file)
      if (err) {
        setPortfolioError(err)
        return
      }
      setPortfolioError(null)
      setPendingFile(file)
      setPendingOriginalFile(file)
      setPendingPreview(URL.createObjectURL(file))
      return
    }
    await preparePostImage(file, "new")
  }

  const handlePendingFileDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (portfolioTab === "bees") {
      const err = await validateBeesVideo(file)
      if (err) {
        setPortfolioError(err)
        return
      }
      setPortfolioError(null)
      setPendingFile(file)
      setPendingOriginalFile(file)
      setPendingPreview(URL.createObjectURL(file))
      return
    }
    if (!file.type.startsWith("image/")) return
    await preparePostImage(file, "new")
  }

  const handleCropConfirm = async (image: ProcessedImage) => {
    const target = cropTarget
    if (!target) return
    setCropTarget(null)
    if (target.mode === "new") {
      setPendingProcessedImage(image, target.file)
      return
    }
    URL.revokeObjectURL(image.previewUrl)
    if (target.itemId) {
      await uploadFileToItem(target.itemId, image.file)
    }
  }

  const uploadFileToItem = async (itemId: string, file: File) => {
    const t = token()
    if (!t) return
    setUploadingForItem(itemId)
    try {
      const fd = new FormData()
      fd.append("file", file)
      // Vídeos vão direto ao backend pra escapar do body limit do Vercel.
      const isVideo = file.type.startsWith("video/")
      const uploadUrl = isVideo
        ? `${BACKEND_DIRECT}/me/portfolio/${itemId}/upload`
        : `/api/me/portfolio/${itemId}/upload`
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPortfolioError(data.error || "Erro ao fazer upload da mídia")
        return
      }
      await fetchItems()
    } catch {
      setPortfolioError("Erro ao fazer upload da mídia. Tente novamente.")
    } finally {
      setUploadingForItem(null)
    }
  }

  const handleUploadToExistingItem = async (
    e: React.ChangeEvent<HTMLInputElement>,
    itemId: string,
    itemKind: "feed" | "bees",
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (itemKind === "bees") {
      const err = await validateBeesVideo(file)
      if (err) {
        setPortfolioError(err)
        return
      }
      setPortfolioError(null)
      await uploadFileToItem(itemId, file)
      return
    }
    if (file.type.startsWith("image/")) {
      await preparePostImage(file, "existing", itemId)
      return
    }
    const v = validateVideoFile(file)
    if (!v.ok) {
      setPortfolioError(v.error)
      return
    }
    await uploadFileToItem(itemId, file)
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
          ...(isEditing ? {} : { feed_kind: portfolioTab }),
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

      // Upload da mídia pendente. Vídeos via backend direto.
      if (pendingFile && newItemId) {
        const fd = new FormData()
        fd.append("file", pendingFile)
        const isVideo = pendingFile.type.startsWith("video/")
        const uploadUrl = isVideo
          ? `${BACKEND_DIRECT}/me/portfolio/${newItemId}/upload`
          : `/api/me/portfolio/${newItemId}/upload`
        const uploadRes = await fetch(uploadUrl, {
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
            : "Erro ao criar. Tente novamente.",
      )
    } finally {
      setIsAddingItem(false)
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
      {/* Header + Tabs */}
      <div className="flex items-center justify-center md:justify-between mb-6 gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setPortfolioTab("feed")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              portfolioTab === "feed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Portfólio
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab("bees")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              portfolioTab === "bees"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hexagon className="h-3.5 w-3.5" />
            Bees
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab("courses")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              portfolioTab === "courses"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Meus Cursos
          </button>
          {myProfilesSlot !== undefined && (
            <button
              type="button"
              onClick={() => setPortfolioTab("profiles")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                portfolioTab === "profiles"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserRound className="h-3.5 w-3.5" />
              Meus Perfis
            </button>
          )}
          {myClansSlot !== undefined && (
            <button
              type="button"
              onClick={() => setPortfolioTab("clans")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                portfolioTab === "clans"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Meus Clans
            </button>
          )}
        </div>
        {isPortfolioGridTab && (
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
        )}
      </div>

      {/* Mobile Novo Item button */}
      {isPortfolioGridTab && (
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
      )}

      {portfolioTab === "courses" ? (
        <CoursesSection profileOptions={coursesProfileOptions} />
      ) : portfolioTab === "profiles" ? (
        <>{myProfilesSlot}</>
      ) : portfolioTab === "clans" ? (
        <>{myClansSlot}</>
      ) : (
        <>
      {listError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="h-4 w-4" />
          {listError}
        </div>
      )}

      {portfolioError && (
        <p className="text-sm text-destructive mb-4 text-center">{portfolioError}</p>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando portfólio…
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
          <div className="h-16 w-16 rounded-full border-2 flex items-center justify-center mb-4">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">{emptyLabel}</p>
          <Button variant="link" onClick={handleAddItem} className="mt-2 text-primary">
            Adicionar o primeiro item
          </Button>
        </div>
      ) : (
        <div className="-mx-4 grid grid-cols-3 gap-px md:mx-0">
          {filteredItems.map((item) => {
            const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
            const firstMedia = activeMedias[0]
            const itemKind = item.feed_kind ?? "feed"
            return (
              <div key={item.id_portfolio_item} className="group relative flex flex-col">
                {/* Media Container — 4:5 (feed) ou 9:16 (bees) */}
                {firstMedia ? (
                  <div className={`relative ${aspectClass} bg-muted overflow-hidden`}>
                    {firstMedia.media_type === "video" ? (
                      <video
                        src={firstMedia.media_url}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        muted
                        playsInline
                        onMouseEnter={(e) => {
                          void e.currentTarget.play()
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause()
                          e.currentTarget.currentTime = 0
                        }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={firstMedia.media_url}
                        alt={item.title ?? "Mídia do portfólio"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}

                    {activeMedias.length > 1 && (
                      <div className="absolute top-3 right-3">
                        <ImageIcon className="h-5 w-5 text-white drop-shadow-md opacity-90" />
                      </div>
                    )}

                    {/* Owner Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <label
                        className="flex items-center justify-center h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm cursor-pointer transition-colors"
                        title="Adicionar mídia"
                      >
                        <input
                          type="file"
                          className="hidden"
                          accept={
                            itemKind === "bees"
                              ? "video/mp4,video/webm,video/quicktime"
                              : "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                          }
                          onChange={(e) =>
                            handleUploadToExistingItem(e, item.id_portfolio_item, itemKind)
                          }
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
                  <div
                    className={`relative ${aspectClass} bg-muted flex items-center justify-center`}
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label
                        className="flex items-center justify-center h-10 w-10 bg-background border shadow-sm hover:bg-accent text-foreground rounded-full cursor-pointer transition-colors"
                        title="Adicionar mídia"
                      >
                        <input
                          type="file"
                          className="hidden"
                          accept={
                            itemKind === "bees"
                              ? "video/mp4,video/webm,video/quicktime"
                              : "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                          }
                          onChange={(e) =>
                            handleUploadToExistingItem(e, item.id_portfolio_item, itemKind)
                          }
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
        </>
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
            <DialogTitle>
              {editingItemId
                ? "Editar item de portfólio"
                : portfolioTab === "bees"
                  ? "Novo Bees"
                  : "Novo item de portfólio"}
            </DialogTitle>
            <DialogDescription>
              {editingItemId
                ? "Atualize as informações do item."
                : portfolioTab === "bees"
                  ? "Envie um vídeo vertical 9:16."
                  : "Preencha as informações do novo item do seu portfólio."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Upload de mídia */}
            {!editingItemId && (
              <div className="space-y-2">
                <Label>{portfolioTab === "bees" ? "Vídeo 9:16" : "Imagem"}</Label>
                {pendingPreview ? (
                  <div
                    className={`relative w-full ${
                      portfolioTab === "bees" ? "aspect-[9/16]" : "aspect-[4/5]"
                    } max-h-[460px] rounded-xl overflow-hidden border border-border bg-muted`}
                  >
                    {portfolioTab === "bees" ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        src={pendingPreview}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        autoPlay
                        loop
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pendingPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {pendingOriginalFile && portfolioTab !== "bees" && (
                      <button
                        type="button"
                        onClick={() =>
                          setCropTarget({ file: pendingOriginalFile, mode: "new" })
                        }
                        className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/85"
                      >
                        Cortar imagem
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearPending}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`flex flex-col items-center justify-center w-full ${
                      portfolioTab === "bees" ? "aspect-[9/16]" : "aspect-[4/5]"
                    } max-h-[460px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handlePendingFileDrop}
                  >
                    <input
                      type="file"
                      accept={
                        portfolioTab === "bees"
                          ? "video/mp4,video/webm,video/quicktime"
                          : "image/jpeg,image/png,image/webp"
                      }
                      className="hidden"
                      onChange={handlePendingFileSelect}
                      disabled={processingMedia}
                    />
                    {processingMedia ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    )}
                    <span className="text-sm text-muted-foreground font-medium">
                      {processingMedia
                        ? "Otimizando..."
                        : portfolioTab === "bees"
                          ? "Clique ou arraste um vídeo 9:16"
                          : "Clique ou arraste uma imagem"}
                    </span>
                    <span className="text-xs text-muted-foreground/60 mt-1">
                      {portfolioTab === "bees"
                        ? "MP4 ou WebM - 9:16 - max 100MB"
                        : "JPG, PNG ou WebP - 4:5 - max 3MB"}
                    </span>
                  </label>
                )}
              </div>
            )}

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
              <Textarea
                id="up-desc"
                placeholder="Descreva o trabalho, cliente, contexto..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={500}
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
                "Criar item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crop modal pra imagens fora do 4:5 */}
      {cropTarget && (
        <MediaCropModal
          file={cropTarget.file}
          aspectRatio={POST_IMAGE_ASPECT_RATIO}
          outputWidth={POST_IMAGE_OUTPUT.width}
          outputHeight={POST_IMAGE_OUTPUT.height}
          maxSizeMB={3}
          mediaType="post_image"
          title="Cortar imagem"
          description="Corte sua imagem no formato 4:5 para aparecer melhor no feed."
          onCancel={() => setCropTarget(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </section>
  )
}

export default UserPortfolio
