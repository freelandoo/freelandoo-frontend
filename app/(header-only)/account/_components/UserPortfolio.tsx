"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ImageIcon,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Loader2,
  Heart,
  X,
  AlertCircle,
  Hexagon,
  GraduationCap,
  UserRound,
  Users,
  Sparkles,
  Crop,
  Bookmark,
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

type PortfolioTab = "feed" | "bees" | "courses" | "profiles" | "clans" | "saved"

type SavedKind = "feed" | "bees"

type SavedItem = {
  id_bookmark: string
  bookmarked_at: string
  post_id: string
  title: string | null
  feed_kind: SavedKind
  display_name: string | null
  avatar_url: string | null
  username: string | null
  color_accent: string | null
  machine_name: string | null
  first_media: {
    url: string
    type: "image" | "video"
    thumbnail_url: string | null
  } | null
}

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

  // Escuta o + do RetractableProfileHeader pra abrir o modal certo.
  useEffect(() => {
    const onCreate = (e: Event) => {
      const detail = (e as CustomEvent<{ kind: string }>).detail
      if (!detail) return
      if (detail.kind === "post" || detail.kind === "bees") {
        const next = detail.kind === "bees" ? "bees" : "feed"
        setPortfolioTab(next)
        setEditingItemId(null)
        setForm({ title: "", description: "" })
        setPortfolioError(null)
        if (pendingPreview) URL.revokeObjectURL(pendingPreview)
        setPendingFile(null)
        setPendingOriginalFile(null)
        setPendingPreview(null)
        setIsModalOpen(true)
      } else if (detail.kind === "curso") {
        setPortfolioTab("courses")
        // CoursesSection abre seu próprio modal escutando o mesmo evento.
      }
    }
    window.addEventListener("freelandoo:create", onCreate)
    return () => window.removeEventListener("freelandoo:create", onCreate)
  }, [pendingPreview])

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
    setForm({ title: "", description: "" })
    setPortfolioError(null)
    clearPending()
    setIsModalOpen(true)
  }

  const handleEditItem = (item: Item) => {
    setEditingItemId(item.id_portfolio_item)
    setForm({
      title: item.title ?? "",
      description: item.description ?? "",
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
    // uploadFileToItem é declarado abaixo (closure estável dentro do componente).
    // Envolvê-lo em useCallback exigiria propagar deps de várias funções vizinhas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Abas retangulares grudadas no headcard — Portfolio/Bees só ícone, restantes com texto.
  const tabBtn = (active: boolean) =>
    `inline-flex h-8 items-center justify-center gap-1.5 border-b-2 px-3 text-[11px] font-semibold uppercase tracking-wide transition ${
      active
        ? "border-primary bg-primary/[0.08] text-primary"
        : "border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
    }`

  return (
    <section className="-mt-px mb-4">
      {/* Tabs grudadas no headcard (sem mb pra colar visualmente) */}
      <div className="flex items-stretch justify-between border-b border-white/[0.07] bg-zinc-950/40">
        <div className="flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setPortfolioTab("feed")}
            aria-label="Portfólio"
            title="Portfólio"
            className={tabBtn(portfolioTab === "feed") + " w-10 px-0"}
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab("bees")}
            aria-label="Bees"
            title="Bees"
            className={tabBtn(portfolioTab === "bees") + " w-10 px-0"}
          >
            <Hexagon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab("courses")}
            className={tabBtn(portfolioTab === "courses")}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Cursos
          </button>
          <button
            type="button"
            onClick={() => setPortfolioTab("saved")}
            className={tabBtn(portfolioTab === "saved")}
          >
            <Bookmark className="h-3.5 w-3.5" />
            Salvos
          </button>
          {myProfilesSlot !== undefined && (
            <button
              type="button"
              onClick={() => setPortfolioTab("profiles")}
              className={tabBtn(portfolioTab === "profiles")}
            >
              <UserRound className="h-3.5 w-3.5" />
              Perfis
            </button>
          )}
          {myClansSlot !== undefined && (
            <button
              type="button"
              onClick={() => setPortfolioTab("clans")}
              className={tabBtn(portfolioTab === "clans")}
            >
              <Users className="h-3.5 w-3.5" />
              Clans
            </button>
          )}
        </div>
      </div>
      {/* Botões "Novo item" e "Novo Bees" migraram pro + do RetractableProfileHeader. */}

      {portfolioTab === "courses" ? (
        <CoursesSection profileOptions={coursesProfileOptions} />
      ) : portfolioTab === "saved" ? (
        <SavedSection />
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
                          item.liked_by_me ? "text-yellow-400" : "text-muted-foreground"
                        }`}
                        title={`${item.likes_count ?? 0} curtidas`}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${item.liked_by_me ? "fill-current" : ""}`}
                        />
                        <span className="tabular-nums">{item.likes_count ?? 0}</span>
                      </span>
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
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-hidden p-0 gap-0 border-white/10 bg-gradient-to-b from-neutral-950 to-black">
          <div className="relative overflow-y-auto max-h-[92vh] [scrollbar-width:thin]">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    portfolioTab === "bees"
                      ? "bg-gradient-to-br from-amber-400/30 to-orange-500/20 text-amber-300"
                      : "bg-gradient-to-br from-yellow-400/25 to-amber-500/15 text-yellow-300"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-base text-white">
                    {editingItemId
                      ? "Editar item"
                      : portfolioTab === "bees"
                        ? "Novo Bees"
                        : "Novo post"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-white/50">
                    {editingItemId
                      ? "Atualize as informações."
                      : portfolioTab === "bees"
                        ? "Envie um vídeo vertical 9:16."
                        : "Mostre seu trabalho com uma imagem 4:5."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pt-5 pb-4 space-y-5">
              {/* Preview / Upload */}
              {!editingItemId && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-white/50">
                      {portfolioTab === "bees" ? "Vídeo" : "Imagem"}
                    </Label>
                    <span className="text-[10px] uppercase tracking-wider text-white/30">
                      {portfolioTab === "bees" ? "9:16 · até 100MB" : "4:5 · até 3MB"}
                    </span>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    {pendingPreview ? (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 220, damping: 26 }}
                        className={`relative mx-auto w-full ${
                          portfolioTab === "bees" ? "aspect-[9/16] max-w-[260px]" : "aspect-[4/5]"
                        } max-h-[460px] overflow-hidden rounded-2xl ring-1 ring-white/10 bg-black shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]`}
                      >
                        <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-gradient-to-tr from-yellow-400/0 via-amber-300/[0.04] to-transparent" />
                        {portfolioTab === "bees" ? (
                          <video
                            src={pendingPreview}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            autoPlay
                            loop
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pendingPreview}
                            alt="Pré-visualização"
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2">
                          {pendingOriginalFile && portfolioTab !== "bees" ? (
                            <button
                              type="button"
                              onClick={() =>
                                setCropTarget({ file: pendingOriginalFile, mode: "new" })
                              }
                              className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-black/90 transition-colors"
                            >
                              <Crop className="h-3 w-3" />
                              Recortar
                            </button>
                          ) : <span />}
                          <button
                            type="button"
                            onClick={clearPending}
                            className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-red-500/30 hover:text-red-100 transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Remover
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.label
                        key="empty"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 220, damping: 26 }}
                        className={`group relative mx-auto flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.02] ${
                          portfolioTab === "bees" ? "aspect-[9/16] max-w-[260px]" : "aspect-[4/5]"
                        } max-h-[460px] transition-all hover:border-yellow-400/40 hover:bg-yellow-400/[0.04]`}
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
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.06),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
                        <motion.div
                          animate={processingMedia ? { rotate: 360 } : { y: [0, -4, 0] }}
                          transition={
                            processingMedia
                              ? { repeat: Infinity, duration: 1, ease: "linear" }
                              : { repeat: Infinity, duration: 2.4, ease: "easeInOut" }
                          }
                          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10"
                        >
                          {processingMedia ? (
                            <Loader2 className="h-5 w-5 text-yellow-300" />
                          ) : portfolioTab === "bees" ? (
                            <Upload className="h-5 w-5 text-amber-300" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-yellow-300" />
                          )}
                        </motion.div>
                        <span className="px-6 text-center text-sm font-medium text-white/85">
                          {processingMedia
                            ? "Otimizando..."
                            : portfolioTab === "bees"
                              ? "Toque ou arraste seu vídeo 9:16"
                              : "Toque ou arraste sua imagem"}
                        </span>
                        <span className="mt-1 px-6 text-center text-[11px] text-white/40">
                          {portfolioTab === "bees"
                            ? "MP4 ou WebM, vertical"
                            : "JPG, PNG ou WebP — recortamos pra 4:5"}
                        </span>
                      </motion.label>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Título */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="up-title" className="text-[11px] uppercase tracking-wider text-white/50">
                    Título
                  </Label>
                  <span className="text-[10px] tabular-nums text-white/30">
                    {form.title.length}/120
                  </span>
                </div>
                <Input
                  id="up-title"
                  placeholder="Trabalho que fiz ontem..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={120}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/30 focus-visible:ring-yellow-400/40"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="up-desc" className="text-[11px] uppercase tracking-wider text-white/50">
                    Descrição
                  </Label>
                  <span className="text-[10px] tabular-nums text-white/30">
                    {form.description.length}/500
                  </span>
                </div>
                <Textarea
                  id="up-desc"
                  placeholder="Conte o contexto: cliente, processo, resultado..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={500}
                  rows={3}
                  className="rounded-xl border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/30 resize-none focus-visible:ring-yellow-400/40"
                />
              </div>

              <AnimatePresence>
                {portfolioError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: "spring", stiffness: 200, damping: 24 }}
                    className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-xs text-red-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-px" />
                    <span>{portfolioError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-white/[0.06] bg-black/40 backdrop-blur-sm">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isAddingItem}
                className="h-10 rounded-xl border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitItem}
                disabled={isAddingItem}
                className="h-10 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 font-medium text-black hover:from-yellow-300 hover:to-amber-400 shadow-[0_8px_24px_-8px_rgba(250,204,21,0.5)]"
              >
                {isAddingItem ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Publicando…
                  </>
                ) : editingItemId ? (
                  "Salvar"
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Publicar
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
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

function SavedSection() {
  const [savedKind, setSavedKind] = useState<SavedKind>("feed")
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  const load = useCallback(async (kind: SavedKind) => {
    const tk = token()
    if (!tk) {
      setError("Faça login para ver seus salvos.")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/me/bookmarks?kind=${kind}&per_page=48`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar salvos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(savedKind) }, [savedKind, load])

  const handleRemove = async (post_id: string) => {
    const tk = token()
    if (!tk) return
    setRemoving((r) => ({ ...r, [post_id]: true }))
    try {
      const res = await fetch(`/api/me/bookmarks/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ post_id }),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.post_id !== post_id))
      }
    } finally {
      setRemoving((r) => {
        const next = { ...r }
        delete next[post_id]
        return next
      })
    }
  }

  const aspectClass = savedKind === "bees" ? "aspect-[9/16]" : "aspect-[4/5]"

  return (
    <div className="pt-3">
      <div className="mb-3 flex items-center gap-1.5 px-3">
        <button
          type="button"
          onClick={() => setSavedKind("feed")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            savedKind === "feed"
              ? "bg-primary/15 text-primary"
              : "text-white/55 hover:text-white"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Posts
        </button>
        <button
          type="button"
          onClick={() => setSavedKind("bees")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            savedKind === "bees"
              ? "bg-primary/15 text-primary"
              : "text-white/55 hover:text-white"
          }`}
        >
          <Hexagon className="h-3.5 w-3.5" />
          Bees
        </button>
      </div>

      {error && (
        <p className="mb-3 px-3 text-sm text-red-300">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando salvos…
        </div>
      ) : items.length === 0 ? (
        <div className="mx-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center text-muted-foreground">
          <Bookmark className="mb-3 h-7 w-7 opacity-50" />
          <p className="text-sm font-medium">Você ainda não salvou nada por aqui</p>
          <p className="mt-1 text-xs text-white/45">
            Toque no marcador em qualquer post pra salvar pra depois.
          </p>
        </div>
      ) : (
        <div className="-mx-4 grid grid-cols-3 gap-px md:mx-0">
          {items.map((it) => {
            const thumb = it.first_media?.thumbnail_url || it.first_media?.url || null
            const isVideo = it.first_media?.type === "video"
            return (
              <div
                key={it.id_bookmark}
                className={`group relative overflow-hidden bg-zinc-900 ${aspectClass}`}
              >
                {thumb ? (
                  isVideo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={it.first_media?.thumbnail_url || ""}
                      alt={it.title || it.display_name || "Salvo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumb}
                      alt={it.title || it.display_name || "Salvo"}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-white/15" />
                  </div>
                )}

                {it.color_accent && (
                  <span
                    aria-hidden
                    className="absolute left-2 top-2 h-2 w-2 rounded-full ring-2 ring-zinc-950"
                    style={{ backgroundColor: it.color_accent }}
                    title={it.machine_name || ""}
                  />
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(it.post_id)}
                  disabled={!!removing[it.post_id]}
                  aria-label="Remover dos salvos"
                  title="Remover dos salvos"
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/85 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-40"
                >
                  {removing[it.post_id] ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  <p className="truncate font-medium">
                    {it.display_name || it.username || "Perfil"}
                  </p>
                  {it.title && (
                    <p className="truncate text-white/75">{it.title}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
