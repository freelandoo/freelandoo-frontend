"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
import { HoverHint } from "@/features/tour/HoverHint"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { CoursesSection, type ProfileOption } from "./courses-section"
import { MediaComposer } from "@/components/composer/MediaComposer"
import type { ComposerMode } from "@/lib/composer/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const tr = useTranslations("Account")
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  const [portfolioTab, setPortfolioTab] = useState<PortfolioTab>("feed")
  // Chaves do Painel de Controle: Cursos e Comunidade podem estar desligadas.
  const coursesOn = useFeature("courses")
  const communitiesOn = useFeature("communities")
  useEffect(() => {
    if ((!coursesOn && portfolioTab === "courses") || (!communitiesOn && portfolioTab === "clans")) {
      setPortfolioTab("feed")
    }
  }, [coursesOn, communitiesOn, portfolioTab])
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null)

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
      if (!res.ok) throw new Error(data.error || tr("loadPortfolioError", "Erro ao carregar portfólio"))
      setItems(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      setListError(err instanceof Error ? err.message : tr("loadPortfolioError", "Erro ao carregar portfólio"))
    } finally {
      setLoading(false)
    }
  }, [tr])

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
        clearPending()
        setComposerMode(next === "bees" ? "bee" : "post")
      } else if (detail.kind === "curso") {
        setPortfolioTab("courses")
        // CoursesSection abre seu próprio modal escutando o mesmo evento.
      }
    }
    window.addEventListener("freelandoo:create", onCreate)
    return () => window.removeEventListener("freelandoo:create", onCreate)
  }, [clearPending])

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
    portfolioTab === "bees" ? tr("noBeesYet", "Nenhum Bees ainda.") : tr("noPortfolioYet", "Nenhum item no portfólio ainda.")

  const handleAddItem = () => {
    if (portfolioTab === "feed" || portfolioTab === "bees") {
      setPortfolioError(null)
      setComposerMode(portfolioTab === "bees" ? "bee" : "post")
      return
    }
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
      return tr("beesVideoOnly", "Bees aceita apenas vídeos 9:16. Envie um arquivo MP4 ou WebM.")
    }
    const v = validateVideoFile(file)
    if (!v.ok) return v.error
    try {
      const dim = await getVideoDimensions(file)
      if (dim.aspectRatio > BEES_VIDEO_ASPECT_RATIO_MAX) {
        return tr("beesVideoNotVertical", "Esse vídeo não está em 9:16. Bees aceita apenas vídeos verticais (9:16).")
      }
    } catch (err) {
      return err instanceof Error ? err.message : tr("videoValidateError", "Não foi possível validar o vídeo.")
    }
    return null
  }, [tr])

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
          errorMessage: tr("postImageTooBig", "A imagem do post precisa ter no máximo 3MB."),
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
            : tr("optimizeFileError", "Não foi possível otimizar esse arquivo. Tente outro."),
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
        setPortfolioError(data.error || tr("mediaUploadError", "Erro ao fazer upload da mídia"))
        return
      }
      await fetchItems()
    } catch {
      setPortfolioError(tr("mediaUploadErrorRetry", "Erro ao fazer upload da mídia. Tente novamente."))
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
          setPortfolioError(uploadData.error || tr("mediaUploadError", "Erro ao fazer upload da mídia"))
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
    if (!confirm(tr("confirmRemoveItem", "Remover este item do portfólio?"))) return
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
        alert(data.error || tr("removeItemError", "Erro ao remover item"))
      }
    } catch {
      alert(tr("removeItemErrorRetry", "Erro ao remover item. Tente novamente."))
    }
  }

  const handleDeleteMedia = async (itemId: string, mediaId: string) => {
    if (!confirm(tr("confirmRemoveMedia", "Remover esta mídia?"))) return
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
        alert(data.error || tr("removeMediaError", "Erro ao remover mídia"))
      }
    } catch {
      alert(tr("removeMediaErrorRetry", "Erro ao remover mídia. Tente novamente."))
    }
  }

  // Abas retangulares grudadas no headcard — Portfolio/Bees só ícone, restantes com texto.
  const tabBtn = (active: boolean) =>
    `inline-flex h-8 items-center justify-center gap-1.5 border-b-2 px-3 text-[11px] font-semibold uppercase tracking-wide transition ${
      active
        ? "border-[#F2B705] bg-[#F2B705]/10 text-[#F2B705]"
        : "border-transparent text-[#9A938A] hover:bg-[#F5F1E8]/[0.04] hover:text-[#F5F1E8]"
    }`

  return (
    <section className="-mt-px mb-4 min-w-0 max-w-full overflow-x-hidden">
      {/* Tabs grudadas no headcard (sem mb pra colar visualmente) */}
      <div className="flex items-stretch justify-between border-b border-[#F5F1E8]/12 bg-[#1d1810]/50">
        <div className="flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <HoverHint id="account-tab-feed" side="bottom">
            <button
              type="button"
              onClick={() => setPortfolioTab("feed")}
              aria-label={tr("tabPortfolio", "Portfólio")}
              className={tabBtn(portfolioTab === "feed") + " w-10 px-0"}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          </HoverHint>
          <HoverHint id="account-tab-bees" side="bottom">
            <button
              type="button"
              onClick={() => setPortfolioTab("bees")}
              aria-label={tr("menuBees", "Bees")}
              className={tabBtn(portfolioTab === "bees") + " w-10 px-0"}
            >
              <Hexagon className="h-4 w-4" />
            </button>
          </HoverHint>
          {coursesOn && (
            <HoverHint id="account-tab-courses" side="bottom">
              <button
                type="button"
                onClick={() => setPortfolioTab("courses")}
                className={tabBtn(portfolioTab === "courses")}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                {tr("tabCourses", "Cursos")}
              </button>
            </HoverHint>
          )}
          <HoverHint id="account-tab-saved" side="bottom">
            <button
              type="button"
              onClick={() => setPortfolioTab("saved")}
              className={tabBtn(portfolioTab === "saved")}
            >
              <Bookmark className="h-3.5 w-3.5" />
              {tr("tabSaved", "Salvos")}
            </button>
          </HoverHint>
          {myProfilesSlot !== undefined && (
            <HoverHint id="account-tab-profiles" side="bottom">
              <button
                type="button"
                onClick={() => setPortfolioTab("profiles")}
                className={tabBtn(portfolioTab === "profiles")}
              >
                <UserRound className="h-3.5 w-3.5" />
                {tr("tabProfiles", "Perfis")}
              </button>
            </HoverHint>
          )}
          {myClansSlot !== undefined && communitiesOn && (
            <HoverHint id="account-tab-clans" side="bottom">
              <button
                type="button"
                onClick={() => setPortfolioTab("clans")}
                className={tabBtn(portfolioTab === "clans")}
              >
                <Users className="h-3.5 w-3.5" />
                {tr("tabCommunity", "Comunidade")}
              </button>
            </HoverHint>
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
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#f87171]/40 bg-[#b91c1c]/15 px-3 py-2 text-xs text-[#f87171]">
          <AlertCircle className="h-4 w-4" />
          {listError}
        </div>
      )}

      {portfolioError && (
        <p className="mb-4 text-center text-sm text-[#f87171]">{portfolioError}</p>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9A938A]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("loadingPortfolio", "Carregando portfólio…")}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#F5F1E8]/15 py-20 text-[#9A938A]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#F5F1E8]/20">
            <ImageIcon className="h-8 w-8 opacity-60" />
          </div>
          <p className="text-sm font-medium">{emptyLabel}</p>
          <button type="button" onClick={handleAddItem} className="mt-2 text-sm font-bold text-[#F2B705] hover:underline">
            {tr("addFirstItem", "Adicionar o primeiro item")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px">
          {filteredItems.map((item) => {
            const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
            const firstMedia = activeMedias[0]
            const itemKind = item.feed_kind ?? "feed"
            return (
              <div key={item.id_portfolio_item} className="group relative flex flex-col">
                {/* Media Container — 4:5 (feed) ou 9:16 (bees) */}
                {firstMedia ? (
                  <div className={`relative ${aspectClass} bg-[#1d1810] overflow-hidden`}>
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
                        alt={item.title ?? tr("portfolioMediaAlt", "Mídia do portfólio")}
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
                        title={tr("addMedia", "Adicionar mídia")}
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
                          title={tr("editItem", "Editar item")}
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id_portfolio_item)}
                          className="flex items-center justify-center h-10 w-10 bg-destructive/80 hover:bg-destructive text-white rounded-full backdrop-blur-sm transition-colors"
                          title={tr("removeItem", "Remover item")}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`relative ${aspectClass} bg-[#1d1810] flex items-center justify-center`}
                  >
                    <ImageIcon className="h-8 w-8 text-[#F5F1E8]/25" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label
                        className="flex items-center justify-center h-10 w-10 bg-[#F5F1E8]/15 border border-[#F5F1E8]/20 shadow-sm hover:bg-[#F5F1E8]/25 text-[#F5F1E8] rounded-full cursor-pointer transition-colors"
                        title={tr("addMedia", "Adicionar mídia")}
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
                        className="flex items-center justify-center h-10 w-10 bg-[#F5F1E8]/15 border border-[#F5F1E8]/20 shadow-sm hover:bg-[#b91c1c] hover:text-white text-[#F5F1E8] rounded-full transition-colors"
                        title={tr("removeItem", "Remover item")}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Content below image */}
                <div className="min-w-0 pt-3 px-2 md:px-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-[#F5F1E8]">
                      {item.title || tr("untitled", "Sem título")}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          item.liked_by_me ? "text-[#F2B705]" : "text-[#9A938A]"
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
                    <p className="mt-1 line-clamp-2 break-words text-xs text-[#9A938A]">
                      {item.description}
                    </p>
                  )}

                  {activeMedias.length > 1 && (
                    <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
                      {activeMedias.slice(1).map((media) => (
                        <div
                          key={media.id_portfolio_media}
                          className="relative group/thumb shrink-0 w-10 h-10 rounded overflow-hidden border border-[#F5F1E8]/15"
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
                              alt={tr("mediaAlt", "Mídia")}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMedia(item.id_portfolio_item, media.id_portfolio_media)
                            }
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                            aria-label={tr("removeMediaAria", "Remover mídia")}
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
        <DialogContent className="fl-root sm:max-w-[560px] max-h-[92vh] overflow-hidden p-0 gap-0 fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]">
          <div className="relative overflow-y-auto max-h-[92vh] [scrollbar-width:thin]">
            <DialogHeader className="px-6 pt-6 pb-3 border-b-2 border-[#0B0B0D]/15">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="fl-display text-xl text-[#0B0B0D]">
                    {editingItemId
                      ? tr("editItem", "Editar item")
                      : portfolioTab === "bees"
                        ? tr("newBees", "Novo Bees")
                        : tr("newPost", "Novo post")}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#5b554b]">
                    {editingItemId
                      ? tr("editItemHint", "Atualize as informações.")
                      : portfolioTab === "bees"
                        ? tr("newBeesHint", "Envie um vídeo vertical 9:16.")
                        : tr("newPostHint", "Mostre seu trabalho com uma imagem 4:5.")}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pt-5 pb-4 space-y-5">
              {/* Preview / Upload */}
              {!editingItemId && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
                      {portfolioTab === "bees" ? tr("videoLabel", "Vídeo") : tr("imageLabel", "Imagem")}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#8a8275]">
                      {portfolioTab === "bees" ? tr("videoLimits", "9:16 · até 100MB") : tr("imageLimits", "4:5 · até 3MB")}
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
                            alt={tr("previewAlt", "Pré-visualização")}
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
                              {tr("crop", "Recortar")}
                            </button>
                          ) : <span />}
                          <button
                            type="button"
                            onClick={clearPending}
                            className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur hover:bg-red-500/30 hover:text-red-100 transition-colors"
                          >
                            <X className="h-3 w-3" />
                            {tr("remove", "Remover")}
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
                        className={`group relative mx-auto flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#0B0B0D]/25 bg-[#0B0B0D]/[0.03] ${
                          portfolioTab === "bees" ? "aspect-[9/16] max-w-[260px]" : "aspect-[4/5]"
                        } max-h-[460px] transition-all hover:border-[#E0A500] hover:bg-[#F2B705]/[0.08]`}
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
                          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#0B0B0D] bg-[#F2B705]/20"
                        >
                          {processingMedia ? (
                            <Loader2 className="h-5 w-5 text-[#8a6d00]" />
                          ) : portfolioTab === "bees" ? (
                            <Upload className="h-5 w-5 text-[#8a6d00]" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-[#8a6d00]" />
                          )}
                        </motion.div>
                        <span className="px-6 text-center text-sm font-bold text-[#0B0B0D]">
                          {processingMedia
                            ? tr("optimizing", "Otimizando...")
                            : portfolioTab === "bees"
                              ? tr("dropVideoHint", "Toque ou arraste seu vídeo 9:16")
                              : tr("dropImageHint", "Toque ou arraste sua imagem")}
                        </span>
                        <span className="mt-1 px-6 text-center text-[11px] text-[#5b554b]">
                          {portfolioTab === "bees"
                            ? tr("videoFormats", "MP4 ou WebM, vertical")
                            : tr("imageFormats", "JPG, PNG ou WebP — recortamos pra 4:5")}
                        </span>
                      </motion.label>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Título */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="up-title" className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
                    {tr("titleLabel", "Título")}
                  </label>
                  <span className="text-[10px] tabular-nums text-[#8a8275]">
                    {form.title.length}/120
                  </span>
                </div>
                <input
                  id="up-title"
                  placeholder={tr("workTitlePlaceholder", "Trabalho que fiz ontem...")}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={120}
                  className="fl-input"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="up-desc" className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
                    {tr("descriptionLabel", "Descrição")}
                  </label>
                  <span className="text-[10px] tabular-nums text-[#8a8275]">
                    {form.description.length}/500
                  </span>
                </div>
                <textarea
                  id="up-desc"
                  placeholder={tr("contextPlaceholder", "Conte o contexto: cliente, processo, resultado...")}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={500}
                  rows={3}
                  className="fl-input resize-none"
                />
              </div>

              <AnimatePresence>
                {portfolioError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: "spring", stiffness: 200, damping: 24 }}
                    className="flex items-start gap-2 rounded-xl border-2 border-[#b91c1c]/30 bg-[#b91c1c]/[0.08] px-3 py-2 text-xs text-[#b91c1c]"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-px" />
                    <span>{portfolioError}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DialogFooter className="px-6 py-4 border-t-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.02]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isAddingItem}
                className="fl-btn-card rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50"
              >
                {tr("cancel", "Cancelar")}
              </button>
              <button
                type="button"
                onClick={handleSubmitItem}
                disabled={isAddingItem}
                className="fl-btn-gold inline-flex items-center rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {isAddingItem ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {tr("publishing", "Publicando…")}
                  </>
                ) : editingItemId ? (
                  tr("save", "Salvar")
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    {tr("publish", "Publicar")}
                  </>
                )}
              </button>
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
          title={tr("cropImage", "Cortar imagem")}
          description={tr("cropImageDesc", "Corte sua imagem no formato 4:5 para aparecer melhor no feed.")}
          onCancel={() => setCropTarget(null)}
          onConfirm={handleCropConfirm}
        />
      )}

      <MediaComposer
        open={composerMode !== null}
        mode={composerMode ?? "post"}
        onClose={() => setComposerMode(null)}
        onPosted={() => {
          setComposerMode(null)
          void fetchItems()
        }}
      />
    </section>
  )
}

export default UserPortfolio

function SavedSection() {
  const tr = useTranslations("Account")
  const [savedKind, setSavedKind] = useState<SavedKind>("feed")
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Record<string, boolean>>({})

  const load = useCallback(async (kind: SavedKind) => {
    const tk = token()
    if (!tk) {
      setError(tr("loginToSeeSaved", "Faça login para ver seus salvos."))
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
      setError(e instanceof Error ? e.message : tr("loadSavedError", "Erro ao carregar salvos"))
    } finally {
      setLoading(false)
    }
  }, [tr])

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
              ? "bg-[#F2B705]/15 text-[#F2B705]"
              : "text-[#9A938A] hover:text-[#F5F1E8]"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          {tr("postsLabel", "Posts")}
        </button>
        <button
          type="button"
          onClick={() => setSavedKind("bees")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            savedKind === "bees"
              ? "bg-[#F2B705]/15 text-[#F2B705]"
              : "text-[#9A938A] hover:text-[#F5F1E8]"
          }`}
        >
          <Hexagon className="h-3.5 w-3.5" />
          {tr("menuBees", "Bees")}
        </button>
      </div>

      {error && (
        <p className="mb-3 px-3 text-sm text-[#f87171]">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#9A938A]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("loadingSaved", "Carregando salvos…")}
        </div>
      ) : items.length === 0 ? (
        <div className="mx-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#F5F1E8]/12 py-16 text-center text-[#9A938A]">
          <Bookmark className="mb-3 h-7 w-7 opacity-60" />
          <p className="text-sm font-medium text-[#F5F1E8]">{tr("nothingSavedYet", "Você ainda não salvou nada por aqui")}</p>
          <p className="mt-1 text-xs text-[#9A938A]">
            {tr("nothingSavedHint", "Toque no marcador em qualquer post pra salvar pra depois.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px">
          {items.map((it) => {
            const thumb = it.first_media?.thumbnail_url || it.first_media?.url || null
            const isVideo = it.first_media?.type === "video"
            return (
              <div
                key={it.id_bookmark}
                className={`group relative overflow-hidden bg-[#1d1810] ${aspectClass}`}
              >
                <Link
                  href={`/p/${it.post_id}`}
                  aria-label={it.title || it.display_name || tr("openPost", "Abrir post")}
                  className="absolute inset-0 z-0"
                >
                  {thumb ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={isVideo ? (it.first_media?.thumbnail_url || "") : thumb}
                      alt={it.title || it.display_name || tr("savedAlt", "Salvo")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-white/15" />
                    </div>
                  )}
                </Link>

                {it.color_accent && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-2 top-2 z-10 h-2 w-2 rounded-full ring-2 ring-zinc-950"
                    style={{ backgroundColor: it.color_accent }}
                    title={it.machine_name || ""}
                  />
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(it.post_id)}
                  disabled={!!removing[it.post_id]}
                  aria-label={tr("removeFromSaved", "Remover dos salvos")}
                  title={tr("removeFromSaved", "Remover dos salvos")}
                  className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/85 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-40"
                >
                  {removing[it.post_id] ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-2 py-2 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                  <p className="truncate font-medium">
                    {it.display_name || it.username || tr("menuProfile", "Perfil")}
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
