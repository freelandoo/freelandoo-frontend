"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useCreatorPublicProfile } from "@/hooks/use-creator-public-profile"
import { FreelancerProfileError, FreelancerProfileLoading } from "./freelancer-states"
import type { PortfolioItem } from "@/lib/types/freelancer-profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Briefcase,
  Crown,
  Crop,
  Edit2,
  EyeOff,
  GraduationCap,
  Heart,
  Hexagon,
  ImageIcon,
  Loader2,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useMyCourses } from "@/hooks/use-my-courses"
import { RetractableProfileHeader } from "@/components/layout/retractable-profile-header"
import { EmptyState, GoldButton, LoadingState } from "@/components/tabloide"

interface XpSummary {
  xp_level: number
  xp_total: number
  xp_progress_percent: number
  xp_next_level: number
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { AgendaBookingsExperience } from "@/components/agenda/AgendaBookingsExperience"
import { ProfilePublicServicesSection } from "@/components/profile/profile-public-services-section"
import type { ProfileServiceEditClanMember } from "@/components/profile/profile-service-edit-modal"
import { ProfileOwnerProductsSection } from "@/components/profile/profile-owner-products-section"
import { ProfilePublicProductsSection } from "@/components/profile/profile-public-products-section"
import { profileAllowsPublicBooking } from "@/lib/booking-public"
import { EngagementPanel } from "@/components/profile/engagement-panel"
import { RankingBadgeModal } from "@/components/profile/ranking-badge-modal"
import { PortfolioItemModal } from "@/components/profile/portfolio-item-modal"
import { RateProfile } from "@/components/profile/rate-profile"
import { MuralModal } from "@/components/profile/mural-modal"
import { ProfileHeadCard } from "@/components/profile/profile-head-card"
import { ShareIconButton } from "@/components/share/share-icon-button"
import { buildProfileUrl } from "@/lib/slug"
import { MediaComposer } from "@/components/composer/MediaComposer"
import type { ComposerMode } from "@/lib/composer/types"
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
import { compressImageToMaxSize, type ProcessedImage } from "@/lib/media/image-processing"

export default function FreelancerProfileView({
  profileId,
  kind = "profile",
}: {
  profileId: string
  kind?: "profile" | "clan"
}) {
  const isClan = kind === "clan"
  const entityType = isClan ? "clan" : "profile"
  const router = useRouter()
  const pathname = usePathname()
  const { profile, portfolioItems, setPortfolioItems, members, loading, error, isOwnProfile } =
    useCreatorPublicProfile(profileId, { kind })
  const [showMembers, setShowMembers] = useState(false)
  const [membersQuery, setMembersQuery] = useState("")
  const [followRefreshKey, setFollowRefreshKey] = useState(0)
  const [xpData, setXpData] = useState<XpSummary | null>(null)
  const headcardRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isClan) return
    let cancelled = false
    fetch(`/api/subprofiles/${profileId}/xp-summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setXpData(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [profileId, isClan])

  // Registra visita ao perfil (XP de visita pro dono; dedup diário no backend).
  // Só após carregar, e não conta auto-visita do próprio dono nem clans.
  const visitSentRef = useRef(false)
  useEffect(() => {
    if (loading || isClan || isOwnProfile || !profileId || visitSentRef.current) return
    visitSentRef.current = true
    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null
    fetch("/api/ranking/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id_profile: profileId }),
    }).catch(() => {})
  }, [loading, isClan, isOwnProfile, profileId])

  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState<string | null>(null)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  const [isAddingPortfolioItem, setIsAddingPortfolioItem] = useState(false)
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false)
  const [editingPortfolioItemId, setEditingPortfolioItemId] = useState<string | null>(null)
  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    description: "",
    is_featured: false,
    sort_order: 0,
  })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingOriginalFile, setPendingOriginalFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<{ file: File; itemId?: string; mode: "new" | "existing" } | null>(null)
  const [processingMedia, setProcessingMedia] = useState(false)
  const [showEngagement, setShowEngagement] = useState(false)
  const [showRanking, setShowRanking] = useState(false)
  const [openPortfolioItemId, setOpenPortfolioItemId] = useState<string | null>(null)
  const [showMural, setShowMural] = useState(false)
  const [muralBadge, setMuralBadge] = useState<{ has_new: boolean; chat_unread: number }>({ has_new: false, chat_unread: 0 })
  const [portfolioTab, setPortfolioTab] = useState<"feed" | "bees" | "services" | "courses" | "shop">("feed")
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null)
  const [createServiceTrigger, setCreateServiceTrigger] = useState(0)
  const searchParams = useSearchParams()

  const refetchPortfolio = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/profile/${profileId}/portfolio`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items ?? data.portfolio ?? [])
        setPortfolioItems(items)
      }
    } catch {
      // silencioso
    }
  }

  // Deep-link: ?portfolio=<id> abre modal automaticamente
  useEffect(() => {
    const id = searchParams?.get("portfolio")
    if (id) setOpenPortfolioItemId(id)
  }, [searchParams])

  // Deep-link: ?ranking=1 abre o ranking a partir da toolbar.
  useEffect(() => {
    const openRanking = searchParams?.get("ranking")
    if (openRanking) setShowRanking(true)
  }, [searchParams])

  const closeRanking = () => {
    setShowRanking(false)
    if (!searchParams?.get("ranking")) return
    const next = new URLSearchParams(searchParams.toString())
    next.delete("ranking")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const updatePortfolioItemLike = (itemId: string, liked: boolean, count: number) => {
    setPortfolioItems((items) =>
      items.map((it) =>
        it.id_portfolio_item === itemId
          ? { ...it, liked_by_me: liked, likes_count: count }
          : it
      )
    )
  }

  const revokePreviewUrl = (url: string | null) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url)
  }

  const clearPending = () => {
    revokePreviewUrl(pendingPreview)
    setPendingFile(null)
    setPendingOriginalFile(null)
    setPendingPreview(null)
  }

  const setPendingProcessedImage = (processed: ProcessedImage, originalFile: File) => {
    revokePreviewUrl(pendingPreview)
    setPendingFile(processed.file)
    setPendingOriginalFile(originalFile)
    setPendingPreview(processed.previewUrl)
  }

  const uploadPortfolioFile = async (itemId: string, file: File) => {
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    setIsUploadingPortfolio(itemId)
    setPortfolioError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      // Vídeos vão direto ao backend pra escapar do limite de body do Vercel.
      const isVideo = file.type.startsWith("video/")
      const uploadUrl = isVideo
        ? `https://freelandoo-backend-production.up.railway.app/profile/${profileId}/portfolio/${itemId}/upload`
        : `/api/profile/${profileId}/portfolio/${itemId}/upload`
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: formData,
      })
      if (res.ok) {
        await refetchPortfolio()
      } else {
        const data = await res.json().catch(() => ({}))
        setPortfolioError(data.error || "Erro ao fazer upload")
      }
    } catch {
      setPortfolioError("Erro ao fazer upload. Tente novamente.")
    } finally {
      setIsUploadingPortfolio(null)
    }
  }

  const preparePostImage = async (file: File, mode: "new" | "existing", itemId?: string) => {
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
        await uploadPortfolioFile(itemId, processed.file)
      }
    } catch (err) {
      setPortfolioError(err instanceof Error ? err.message : "Não foi possível otimizar esse arquivo. Tente outro.")
    } finally {
      setProcessingMedia(false)
    }
  }

  const validateBeesVideo = async (file: File): Promise<string | null> => {
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
  }

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
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
      await uploadPortfolioFile(itemId, file)
      return
    }

    if (file.type.startsWith("image/")) {
      await preparePostImage(file, "existing", itemId)
      return
    }

    const videoValidation = validateVideoFile(file)
    if (!videoValidation.ok) {
      setPortfolioError(videoValidation.error)
      return
    }
    await uploadPortfolioFile(itemId, file)
  }

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
      await uploadPortfolioFile(target.itemId, image.file)
    }
  }

  const handleAddPortfolioItem = () => {
    if (portfolioTab === "feed" || portfolioTab === "bees") {
      setPortfolioError(null)
      setComposerMode(portfolioTab === "bees" ? "bee" : "post")
      return
    }
    setEditingPortfolioItemId(null)
    setPortfolioForm({ title: "", description: "", is_featured: false, sort_order: 0 })
    setPortfolioError(null)
    clearPending()
    setIsPortfolioModalOpen(true)
  }

  // Escuta o + do RetractableProfileHeader pra abrir o modal certo.
  useEffect(() => {
    const onCreate = (e: Event) => {
      const detail = (e as CustomEvent<{ kind: string }>).detail
      if (!detail) return
      if (detail.kind === "post") {
        setPortfolioTab("feed")
        setPortfolioError(null)
        setComposerMode("post")
      } else if (detail.kind === "bees") {
        setPortfolioTab("bees")
        setPortfolioError(null)
        setComposerMode("bee")
      } else if (detail.kind === "servico") {
        setPortfolioTab("services")
        // Incrementa trigger para o ProfilePublicServicesSection abrir o modal de criar.
        setCreateServiceTrigger((n) => n + 1)
      } else if (detail.kind === "curso") {
        setPortfolioTab("courses")
        // Curso é criado em /account, então redireciona.
        router.push("/account?tab=cursos")
      }
    }
    window.addEventListener("freelandoo:create-subprofile", onCreate)
    return () => window.removeEventListener("freelandoo:create-subprofile", onCreate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEditPortfolioItem = (item: PortfolioItem) => {
    setEditingPortfolioItemId(item.id_portfolio_item)
    setPortfolioForm({
      title: item.title ?? "",
      description: item.description ?? "",
      is_featured: false,
      sort_order: 0,
    })
    setPortfolioError(null)
    clearPending()
    setIsPortfolioModalOpen(true)
  }

  const handleSubmitPortfolioItem = async () => {
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    const isEditing = editingPortfolioItemId !== null
    setIsAddingPortfolioItem(true)
    setPortfolioError(null)
    try {
      const url = isEditing
        ? `/api/profile/${profileId}/portfolio/${editingPortfolioItemId}`
        : `/api/profile/${profileId}/portfolio`
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? {} : { id_user: profile?.id_user ?? null, id_profile: profileId }),
          ...(isEditing ? {} : { feed_kind: portfolioTab }),
          title: portfolioForm.title.trim() || null,
          description: portfolioForm.description.trim() || null,
          is_featured: portfolioForm.is_featured,
          sort_order: portfolioForm.sort_order,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setPortfolioError(data.error || (isEditing ? "Erro ao editar item" : "Erro ao criar item"))
        return
      }
      const created = await res.json()
      const newItemId: string = isEditing ? editingPortfolioItemId! : (created.id_portfolio_item ?? created.item?.id_portfolio_item)
      // Upload da mídia pendente. Vídeos vão direto ao backend (bypassa o
      // body limit do Vercel Hobby, ~4.5MB). Imagens — sempre <3MB depois
      // do compress — continuam via proxy.
      if (pendingFile && newItemId) {
        const fd = new FormData()
        fd.append("file", pendingFile)
        const isVideo = pendingFile.type.startsWith("video/")
        const uploadUrl = isVideo
          ? `https://freelandoo-backend-production.up.railway.app/profile/${profileId}/portfolio/${newItemId}/upload`
          : `/api/profile/${profileId}/portfolio/${newItemId}/upload`
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
          body: fd,
        })
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}))
          setPortfolioError(uploadData.error || "Erro ao fazer upload da mídia")
          return
        }
      }
      clearPending()
      setIsPortfolioModalOpen(false)
      setEditingPortfolioItemId(null)
      await refetchPortfolio()
    } catch {
      setPortfolioError(isEditing ? "Erro ao editar item. Tente novamente." : "Erro ao criar item. Tente novamente.")
    } finally {
      setIsAddingPortfolioItem(false)
    }
  }

  const handlePortfolioDeleteMedia = async (itemId: string, mediaId: string) => {
    if (!confirm("Remover esta mídia do portfólio?")) return
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    try {
      const res = await fetch(`/api/profile/${profileId}/portfolio/${itemId}/media/${mediaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      if (res.ok || res.status === 204) {
        setPortfolioItems((prev) =>
          prev.map((item) =>
            item.id_portfolio_item === itemId
               ? { ...item, media: item.media.filter((m) => m.id_portfolio_media !== mediaId) }
               : item
          )
        )
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao remover mídia")
      }
    } catch {
      alert("Erro ao remover mídia. Tente novamente.")
    }
  }

  const handlePortfolioDeleteItem = async (itemId: string) => {
    if (!confirm("Remover este item do portfólio?")) return
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    try {
      const res = await fetch(`/api/profile/${profileId}/portfolio/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      if (res.ok || res.status === 204) {
        setPortfolioItems((prev) => prev.filter((item) => item.id_portfolio_item !== itemId))
      } else {
        const data = await res.json()
        alert(data.error || "Erro ao remover item")
      }
    } catch {
      alert("Erro ao remover item. Tente novamente.")
    }
  }

  // Owner do clan oculta um post de membro do feed do clan, sem afetar o
  // portfolio do subperfil de origem.
  const handleHideFromClan = async (itemId: string) => {
    if (!isClan || !isOwnProfile) return
    if (!confirm("Ocultar este post do feed do clan? O post continuará no perfil do membro.")) return
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return
    try {
      const res = await fetch(
        `/api/clans/${profileId}/hidden-posts/${itemId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      )
      if (res.ok || res.status === 201) {
        setPortfolioItems((prev) =>
          prev.filter((item) => item.id_portfolio_item !== itemId)
        )
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Erro ao ocultar do clan")
      }
    } catch {
      alert("Erro ao ocultar do clan. Tente novamente.")
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "?"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  // Badge do mural — só busca 1x ao montar. Refresh manual ao voltar pra aba.
  // Reduzimos o poll agressivo de 30s pra evitar consumo de Vercel; eventos
  // novos virão via realtime (nav-counts:changed) e via foco da janela.
  useEffect(() => {
    if (!isOwnProfile) return
    let cancelled = false
    const fetchBadge = async () => {
      const token = localStorage.getItem("token")
      if (!token) return
      try {
        const res = await fetch(`/api/service-requests/badge?id_profile=${encodeURIComponent(profileId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok || cancelled) return
        const data = await res.json()
        setMuralBadge({ has_new: !!data.has_new, chat_unread: data.chat_unread ?? 0 })
      } catch { /* silent */ }
    }
    fetchBadge()
    const onFocus = () => {
      if (!document.hidden) fetchBadge()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [isOwnProfile, profileId])

  if (loading) {
    return <FreelancerProfileLoading />
  }

  if (error || !profile) {
    return <FreelancerProfileError message={error || "Perfil não encontrado"} />
  }

  return (
    <div className="fl-root fl-paper-texture min-h-[100dvh] font-sans antialiased">
      <RetractableProfileHeader
        targetRef={headcardRef}
        name={profile.display_name || ""}
        progress={!isClan && xpData ? xpData.xp_progress_percent : undefined}
        addMenu={
          isOwnProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Criar"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505] shadow-[2px_2px_0_0_#0B0B0D] transition active:scale-[0.96]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] [&_[role=menuitem]]:cursor-pointer [&_[role=menuitem]]:focus:bg-[#0B0B0D] [&_[role=menuitem]]:focus:text-[#F1EDE2]">
                <DropdownMenuItem
                  onSelect={() =>
                    window.dispatchEvent(
                      new CustomEvent("freelandoo:create-subprofile", { detail: { kind: "post" } }),
                    )
                  }
                >
                  <ImageIcon className="h-4 w-4" />
                  Post
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    window.dispatchEvent(
                      new CustomEvent("freelandoo:create-subprofile", { detail: { kind: "bees" } }),
                    )
                  }
                >
                  <Hexagon className="h-4 w-4" />
                  Bees
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    window.dispatchEvent(
                      new CustomEvent("freelandoo:create-subprofile", { detail: { kind: "servico" } }),
                    )
                  }
                >
                  <Briefcase className="h-4 w-4" />
                  Serviço
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    window.dispatchEvent(
                      new CustomEvent("freelandoo:create-subprofile", { detail: { kind: "curso" } }),
                    )
                  }
                >
                  <GraduationCap className="h-4 w-4" />
                  Curso
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      >
        {!isClan && xpData && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
              Nv {xpData.xp_level}
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-primary">
              {xpData.xp_total.toLocaleString("pt-BR")} XP
            </span>
          </div>
        )}
      </RetractableProfileHeader>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 -ml-1 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-bold text-[#C9C2B6] transition hover:text-[#F5F1E8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* HEADER CARD */}
        <section ref={headcardRef} className="mb-0">
          <ProfileHeadCard
            profile={profile}
            profileId={profileId}
            entityType={entityType}
            isClan={isClan}
            isOwnProfile={isOwnProfile}
            portfolioCount={portfolioItems.length}
            followRefreshKey={followRefreshKey}
            onFollowChanged={() => setFollowRefreshKey((value) => value + 1)}
            ownerActions={{
              editHref: isClan
                ? `/account/clans/${profileId}/edit`
                : `/account/profile/${profileId}/settings`,
              onShowEngagement: () => setShowEngagement(true),
              onShowRanking: () => setShowRanking(true),
              onShowMural: () => setShowMural(true),
              muralBadge,
              agendaHref: isClan
                ? `/account/clans/${profileId}/agenda`
                : `/account/profile/${profileId}/agenda`,
              onShowMembers: isClan ? () => setShowMembers(true) : undefined,
              clansHref: !isClan ? "/account/clans" : undefined,
              manageHref: isClan ? `/account/clans/${profileId}` : undefined,
            }}
            visitorScheduleButtonLabel="Serviços"
            visitorActions={{
              onShowRanking: () => setShowRanking(true),
              onShowMembers: isClan ? () => setShowMembers(true) : undefined,
              onScheduleScroll: () => {
                const el = document.getElementById("services-section")
                if (el) el.scrollIntoView({ behavior: "smooth" })
              },
              shareButton: (() => {
                const handle = profile.username || ""
                const sharePath =
                  profile.profession_slug && handle
                    ? buildProfileUrl({
                        profession_slug: profile.profession_slug,
                        municipio: profile.municipio,
                        handle,
                        sub_profile_slug: (profile as { sub_profile_slug?: string | null }).sub_profile_slug || null,
                      })
                    : pathname || `/freelancer/${profileId}`
                return (
                  <ShareIconButton
                    path={sharePath}
                    title={`${profile.display_name} no Freelandoo`}
                    description={profile.bio?.slice(0, 140) || undefined}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/85 transition hover:bg-white/[0.08]"
                  />
                )
              })(),
            }}
          />
        </section>

        {/* PORTFOLIO SECTION — abas retangulares, grudadas no headcard */}
        <section className="mb-16">
          <div className="mt-4 flex items-stretch justify-between border-y-2 border-[#F5F1E8]/15">
            <div className="flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setPortfolioTab("feed")}
                aria-label="Portfólio"
                title="Portfólio"
                className={`inline-flex h-10 w-11 items-center justify-center border-b-2 transition ${
                  portfolioTab === "feed"
                    ? "border-[#F2B705] bg-[#F2B705]/10 text-[#F2B705]"
                    : "border-transparent text-[#9A938A] hover:bg-[#F5F1E8]/[0.04] hover:text-[#F5F1E8]"
                }`}
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPortfolioTab("bees")}
                aria-label="Bees"
                title="Bees"
                className={`inline-flex h-10 w-11 items-center justify-center border-b-2 transition ${
                  portfolioTab === "bees"
                    ? "border-[#F2B705] bg-[#F2B705]/10 text-[#F2B705]"
                    : "border-transparent text-[#9A938A] hover:bg-[#F5F1E8]/[0.04] hover:text-[#F5F1E8]"
                }`}
              >
                <Hexagon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPortfolioTab("services")}
                className={`inline-flex h-10 items-center justify-center gap-1.5 border-b-2 px-3 text-[11px] font-bold uppercase tracking-wide transition ${
                  portfolioTab === "services"
                    ? "border-[#F2B705] bg-[#F2B705]/10 text-[#F2B705]"
                    : "border-transparent text-[#9A938A] hover:bg-[#F5F1E8]/[0.04] hover:text-[#F5F1E8]"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                Serviços
              </button>
              <button
                type="button"
                onClick={() => setPortfolioTab("courses")}
                className={`inline-flex h-10 items-center justify-center gap-1.5 border-b-2 px-3 text-[11px] font-bold uppercase tracking-wide transition ${
                  portfolioTab === "courses"
                    ? "border-[#F2B705] bg-[#F2B705]/10 text-[#F2B705]"
                    : "border-transparent text-[#9A938A] hover:bg-[#F5F1E8]/[0.04] hover:text-[#F5F1E8]"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                Cursos
              </button>
              {!isClan && (
                <button
                  type="button"
                  onClick={() => setPortfolioTab("shop")}
                  className={`inline-flex h-10 items-center justify-center gap-1.5 border-b-2 px-3 text-[11px] font-bold uppercase tracking-wide transition ${
                    portfolioTab === "shop"
                      ? "border-[#F2B705] bg-[#F2B705]/10 text-[#F2B705]"
                      : "border-transparent text-[#9A938A] hover:bg-[#F5F1E8]/[0.04] hover:text-[#F5F1E8]"
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Loja
                </button>
              )}
            </div>
          </div>
          {/* "+ Novo" migrou pro dropdown do RetractableProfileHeader. */}
          <div className="mt-0">

          {portfolioError && (portfolioTab === "feed" || portfolioTab === "bees") && (
            <p className="mb-6 mt-4 rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/10 px-3 py-2 text-center text-sm font-medium text-[#fca5a5]">{portfolioError}</p>
          )}

          {portfolioTab === "services" && (
            <ProfilePublicServicesSection
              profileId={profileId}
              allowPublicBooking={profileAllowsPublicBooking(profile)}
              showOwnerControls={isOwnProfile}
              isClan={isClan}
              clanMembers={
                isClan ? (members as ProfileServiceEditClanMember[]) : []
              }
              openCreateTrigger={createServiceTrigger}
            />
          )}

          {portfolioTab === "courses" && (
            <ProfileCoursesTab profileId={profileId} isOwnProfile={isOwnProfile} />
          )}

          {portfolioTab === "shop" && !isClan && (
            isOwnProfile
              ? <ProfileOwnerProductsSection profileId={profileId} />
              : <ProfilePublicProductsSection profileId={profileId} />
          )}

          {(portfolioTab === "feed" || portfolioTab === "bees") && (() => {
            const filteredItems = portfolioItems.filter(
              (it) => (it.feed_kind ?? "feed") === portfolioTab
            )
            const aspectClass = portfolioTab === "bees" ? "aspect-[9/16]" : "aspect-[4/5]"
            const emptyLabel =
              portfolioTab === "bees"
                ? "Nenhum Bees ainda."
                : "Nenhum item no portfólio ainda."
            return filteredItems.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              {filteredItems.map((item) => {
                const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
                const firstMedia = activeMedias[0]
                return (
                  <div key={item.id_portfolio_item} className="group relative flex flex-col overflow-hidden rounded-xl border-2 border-[#0B0B0D] bg-[#F1EDE2] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705]">
                    {/* Media Container — 4:5 (feed) ou 9:16 (bees) */}
                    {firstMedia ? (
                      <div
                        className={`relative ${aspectClass} bg-[#1d1810] overflow-hidden border-b-2 border-[#0B0B0D] ${!isOwnProfile ? "cursor-pointer" : ""}`}
                        onClick={() => { if (!isOwnProfile) setOpenPortfolioItemId(item.id_portfolio_item) }}
                      >
                        {firstMedia.media_type === "video" ? (
                          <video
                            src={firstMedia.media_url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            muted
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play()}
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
                        {isClan && item.is_clan_self === false && item.author_display_name && (
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#0B0B0D]/70 backdrop-blur-sm rounded-full pl-1 pr-2.5 py-1 text-[#F1EDE2] text-xs">
                            {item.author_avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.author_avatar_url}
                                alt={item.author_display_name}
                                className="h-5 w-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-white/20" />
                            )}
                            <span className="line-clamp-1 max-w-[100px]">{item.author_display_name}</span>
                          </div>
                        )}
                        {isClan && item.is_clan_self && (
                          <div className="absolute top-3 left-3 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1A1505]">
                            Clan
                          </div>
                        )}

                        {/* Owner Overlay Actions */}
                        {isOwnProfile && (
                          <div className="absolute inset-0 bg-[#0B0B0D]/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                            <label
                              className="flex items-center justify-center h-10 w-10 border-2 border-[#0B0B0D] bg-[#F1EDE2] hover:bg-[#F2B705] text-[#0B0B0D] rounded-full cursor-pointer transition-colors"
                              title="Adicionar mídia"
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept={portfolioTab === "bees" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"}
                                onChange={(e) => handlePortfolioUpload(e, item.id_portfolio_item)}
                                disabled={isUploadingPortfolio === item.id_portfolio_item}
                              />
                              {isUploadingPortfolio === item.id_portfolio_item ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Upload className="h-5 w-5" />
                              )}
                            </label>
                            <div className="flex items-center gap-3">
                              {isClan && (item as PortfolioItem & { id_profile?: string }).id_profile !== profileId ? (
                                /* Post de membro num clan: owner so pode ocultar
                                   do feed do clan; o post permanece no perfil
                                   do membro. */
                                <button
                                  type="button"
                                  onClick={() => handleHideFromClan(item.id_portfolio_item)}
                                  className="flex items-center gap-2 h-10 px-4 border-2 border-[#0B0B0D] bg-[#F1EDE2] hover:bg-[#F2B705] text-[#0B0B0D] rounded-full transition-colors text-sm font-bold"
                                  title="Ocultar do clan (não exclui do perfil do membro)"
                                >
                                  <EyeOff className="h-4 w-4" />
                                  Ocultar do clan
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditPortfolioItem(item)}
                                    className="flex items-center justify-center h-10 w-10 border-2 border-[#0B0B0D] bg-[#F1EDE2] hover:bg-[#F2B705] text-[#0B0B0D] rounded-full transition-colors"
                                    title="Editar item"
                                  >
                                    <Edit2 className="h-5 w-5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePortfolioDeleteItem(item.id_portfolio_item)}
                                    className="flex items-center justify-center h-10 w-10 border-2 border-[#0B0B0D] bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-full transition-colors"
                                    title="Remover item"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`relative ${aspectClass} bg-[#e8e2d4] flex items-center justify-center border-b-2 border-[#0B0B0D]`}>
                        <ImageIcon className="h-8 w-8 text-[#0B0B0D]/25" />
                        {isOwnProfile && (
                          <div className="absolute inset-0 bg-[#0B0B0D]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <label
                              className="flex items-center justify-center h-10 w-10 border-2 border-[#0B0B0D] bg-[#F1EDE2] hover:bg-[#F2B705] text-[#0B0B0D] rounded-full cursor-pointer transition-colors"
                              title="Adicionar mídia"
                            >
                              <input
                                type="file"
                                className="hidden"
                                accept={portfolioTab === "bees" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"}
                                onChange={(e) => handlePortfolioUpload(e, item.id_portfolio_item)}
                                disabled={isUploadingPortfolio === item.id_portfolio_item}
                              />
                              {isUploadingPortfolio === item.id_portfolio_item ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Upload className="h-5 w-5" />
                              )}
                            </label>
                            <button
                              type="button"
                              onClick={() => handlePortfolioDeleteItem(item.id_portfolio_item)}
                              className="flex items-center justify-center h-10 w-10 border-2 border-[#0B0B0D] bg-[#F1EDE2] hover:bg-[#dc2626] hover:text-white text-[#0B0B0D] rounded-full transition-colors"
                              title="Remover item"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content below image */}
                    <div className="flex-1 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-sm line-clamp-1 text-[#0B0B0D]">{item.title || "Sem título"}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenPortfolioItemId(item.id_portfolio_item) }}
                            className={`flex items-center gap-1 text-xs font-bold transition-colors ${item.liked_by_me ? "text-[#E0A500]" : "text-[#0B0B0D]/55 hover:text-[#E0A500]"}`}
                            title={item.liked_by_me ? "Remover like" : "Curtir"}
                          >
                            <Heart className={`h-3.5 w-3.5 ${item.liked_by_me ? "fill-current" : ""}`} />
                            <span className="tabular-nums">{item.likes_count ?? 0}</span>
                          </button>
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-xs text-[#5b554b] mt-1 line-clamp-2">{item.description}</p>
                      )}

                      {/* Secondary Media Thumbnails (Only visible to owner to manage them) */}
                      {isOwnProfile && activeMedias.length > 1 && (
                        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
                          {activeMedias.slice(1).map((media) => (
                            <div key={media.id_portfolio_media} className="relative group/thumb shrink-0 w-10 h-10 rounded overflow-hidden border-2 border-[#0B0B0D]">
                              {media.media_type === "video" ? (
                                <video src={media.media_url} className="w-full h-full object-cover" muted playsInline />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={media.media_url} alt="Mídia" className="w-full h-full object-cover" />
                              )}
                              <button
                                type="button"
                                onClick={() => handlePortfolioDeleteMedia(item.id_portfolio_item, media.id_portfolio_media)}
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
          ) : (
            <div className="mt-8">
              <EmptyState
                icon={<ImageIcon className="h-7 w-7" />}
                title={emptyLabel}
                description={
                  isOwnProfile
                    ? "Publique seu primeiro trabalho para começar a montar seu portfólio."
                    : "Este perfil ainda não publicou nada por aqui."
                }
                action={
                  isOwnProfile ? (
                    <GoldButton onClick={handleAddPortfolioItem} className="px-5 py-2.5 text-sm">
                      <Plus className="h-4 w-4" />
                      Adicionar o primeiro item
                    </GoldButton>
                  ) : undefined
                }
              />
            </div>
          )
          })()}
          </div>
        </section>

        {/* Avaliação (visitante) — fica fora das abas */}
        {!isOwnProfile && (
          <section className="mb-8">
            <RateProfile profileId={profileId} />
          </section>
        )}

        {isOwnProfile && (
          <section id="agenda-section" className="mb-20 scroll-mt-24">
            <div className="mb-6">
              <h2 className="fl-display text-2xl text-[#F5F1E8] md:text-3xl">Agenda</h2>
              <p className="mt-1 text-sm text-[#9A938A]">
                Calendário mensal e lista dos seus agendamentos (mesma experiência da página Agenda).
              </p>
            </div>
            <AgendaBookingsExperience
              profileId={profileId}
              settingsHref={
                isClan
                  ? `/account/clans/${profileId}/agenda`
                  : `/account/profile/${profileId}/agenda`
              }
            />
          </section>
        )}
      </main>

      {/* Modal de Novo Item de Portfólio */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={(open) => { setIsPortfolioModalOpen(open); if (!open) { setEditingPortfolioItemId(null); clearPending() } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-hidden p-0 gap-0 border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D]">
          <div className="relative overflow-y-auto max-h-[92vh] [scrollbar-width:thin]">
            <DialogHeader className="px-6 pt-6 pb-3 border-b-2 border-[#0B0B0D]/15">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="fl-display text-xl text-[#0B0B0D]">
                    {editingPortfolioItemId
                      ? "Editar item"
                      : portfolioTab === "bees"
                        ? "Novo Bees"
                        : "Novo post"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#5b554b]">
                    {editingPortfolioItemId
                      ? "Atualize as informações."
                      : portfolioTab === "bees"
                        ? "Envie um vídeo vertical 9:16."
                        : "Mostre seu trabalho com uma imagem 4:5."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 pt-5 pb-4 space-y-5">
              {!editingPortfolioItemId && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-[#0B0B0D]/60">
                      {portfolioTab === "bees" ? "Vídeo" : "Imagem"}
                    </Label>
                    <span className="text-[10px] uppercase tracking-wider text-[#0B0B0D]/40">
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
                          <img src={pendingPreview} alt="Pré-visualização" className="h-full w-full object-cover" />
                        )}
                        <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2">
                          {pendingOriginalFile && portfolioTab !== "bees" ? (
                            <button
                              type="button"
                              onClick={() => setCropTarget({ file: pendingOriginalFile, mode: "new" })}
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
                        className={`group relative mx-auto flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#0B0B0D]/25 bg-[#0B0B0D]/[0.03] ${
                          portfolioTab === "bees" ? "aspect-[9/16] max-w-[260px]" : "aspect-[4/5]"
                        } max-h-[460px] transition-all hover:border-[#E0A500] hover:bg-[#F2B705]/10`}
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
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(242,183,5,0.10),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
                        <motion.div
                          animate={processingMedia ? { rotate: 360 } : { y: [0, -4, 0] }}
                          transition={
                            processingMedia
                              ? { repeat: Infinity, duration: 1, ease: "linear" }
                              : { repeat: Infinity, duration: 2.4, ease: "easeInOut" }
                          }
                          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#0B0B0D] bg-[#F2B705]"
                        >
                          {processingMedia ? (
                            <Loader2 className="h-5 w-5 text-[#1A1505]" />
                          ) : portfolioTab === "bees" ? (
                            <Upload className="h-5 w-5 text-[#1A1505]" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-[#1A1505]" />
                          )}
                        </motion.div>
                        <span className="px-6 text-center text-sm font-bold text-[#0B0B0D]">
                          {processingMedia
                            ? "Otimizando..."
                            : portfolioTab === "bees"
                              ? "Toque ou arraste seu vídeo 9:16"
                              : "Toque ou arraste sua imagem"}
                        </span>
                        <span className="mt-1 px-6 text-center text-[11px] text-[#5b554b]">
                          {portfolioTab === "bees"
                            ? "MP4 ou WebM, vertical"
                            : "JPG, PNG ou WebP — recortamos pra 4:5"}
                        </span>
                      </motion.label>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="portfolio-title" className="text-[11px] font-bold uppercase tracking-wider text-[#0B0B0D]/60">
                    Título
                  </Label>
                  <span className="text-[10px] tabular-nums text-[#0B0B0D]/40">
                    {portfolioForm.title.length}/120
                  </span>
                </div>
                <input
                  id="portfolio-title"
                  placeholder="Campanha de verão, ensaio fotográfico..."
                  value={portfolioForm.title}
                  onChange={(e) => setPortfolioForm((prev) => ({ ...prev, title: e.target.value }))}
                  maxLength={120}
                  className="fl-input"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="portfolio-description" className="text-[11px] font-bold uppercase tracking-wider text-[#0B0B0D]/60">
                    Descrição
                  </Label>
                  <span className="text-[10px] tabular-nums text-[#0B0B0D]/40">
                    {portfolioForm.description.length}/500
                  </span>
                </div>
                <textarea
                  id="portfolio-description"
                  placeholder="Conte o contexto: cliente, processo, resultado..."
                  value={portfolioForm.description}
                  onChange={(e) => setPortfolioForm((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={500}
                  rows={3}
                  className="fl-input resize-none"
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                />
              </div>

              <AnimatePresence>
                {portfolioError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ type: "spring", stiffness: 200, damping: 24 }}
                    className="rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/10 px-3 py-2 text-xs font-medium text-[#b91c1c]"
                  >
                    {portfolioError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DialogFooter className="px-6 py-4 border-t-2 border-[#0B0B0D]/15 bg-[#e8e2d4]">
              <button
                type="button"
                onClick={() => setIsPortfolioModalOpen(false)}
                disabled={isAddingPortfolioItem}
                className="fl-btn-card rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitPortfolioItem}
                disabled={isAddingPortfolioItem || processingMedia}
                className="fl-btn-gold inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {isAddingPortfolioItem ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Publicando…
                  </>
                ) : editingPortfolioItemId ? (
                  "Salvar"
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Publicar
                  </>
                )}
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {showRanking && (
        <RankingBadgeModal profileId={profileId} onClose={closeRanking} />
      )}

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

      {openPortfolioItemId && (() => {
        const item = portfolioItems.find((i) => i.id_portfolio_item === openPortfolioItemId)
        if (!item) return null
        return (
          <PortfolioItemModal
            item={item}
            profileId={profileId}
            onClose={() => setOpenPortfolioItemId(null)}
            onLikeChange={updatePortfolioItemLike}
          />
        )
      })()}

      {showEngagement && (
        <EngagementPanel profileId={profileId} onClose={() => setShowEngagement(false)} />
      )}

      {isClan && showMembers && (() => {
        const sortedMembers = [...members].sort((a, b) => {
          if (a.role === "owner" && b.role !== "owner") return -1
          if (b.role === "owner" && a.role !== "owner") return 1
          return a.display_name.localeCompare(b.display_name, "pt-BR")
        })
        const q = membersQuery.trim().toLowerCase()
        const filtered = q
          ? sortedMembers.filter(
              (m) =>
                m.display_name.toLowerCase().includes(q) ||
                m.username.toLowerCase().includes(q)
            )
          : sortedMembers
        return (
          <Dialog
            open={showMembers}
            onOpenChange={(open) => {
              setShowMembers(open)
              if (!open) setMembersQuery("")
            }}
          >
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D]">
              <DialogHeader className="px-6 pt-6 pb-4 border-b-2 border-[#0B0B0D]/15">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 border-2 border-[#0B0B0D]">
                    {(profile.avatar_url || profile.user_avatar) && (
                      <AvatarImage
                        src={profile.avatar_url ?? profile.user_avatar!}
                        alt={profile.display_name}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-[#F2B705]/20 text-[#0B0B0D]">{getInitials(profile.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <DialogTitle className="fl-display text-xl text-[#0B0B0D] truncate">
                      Membros de {profile.display_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#5b554b]">
                      {members.length} {members.length === 1 ? "membro" : "membros"}
                    </DialogDescription>
                  </div>
                </div>
                {members.length > 4 && (
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0B0B0D]/40 z-10" />
                    <input
                      value={membersQuery}
                      onChange={(e) => setMembersQuery(e.target.value)}
                      placeholder="Buscar por nome ou @username"
                      className="fl-input !pl-9"
                    />
                  </div>
                )}
              </DialogHeader>
              <div className="px-4 pb-5 pt-3 max-h-[60vh] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-[#5b554b]">
                    <Users className="h-8 w-8 opacity-40 mb-2" />
                    <p className="text-sm">Nenhum membro encontrado.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filtered.map((m) => (
                      <Link
                        key={m.id_member_profile}
                        href={`/freelancer/${m.id_member_profile}`}
                        className="group flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[#0B0B0D]/[0.05] transition-colors"
                        onClick={() => setShowMembers(false)}
                      >
                        <div className="relative">
                          <Avatar className="size-16 border-2 border-[#0B0B0D]">
                            {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.display_name} className="object-cover" />}
                            <AvatarFallback className="bg-[#F2B705]/20 text-[#0B0B0D]">{getInitials(m.display_name)}</AvatarFallback>
                          </Avatar>
                          {m.role === "owner" && (
                            <span
                              className="absolute -bottom-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-[#F2B705] text-[#1A1505] border-2 border-[#F1EDE2] shadow-sm"
                              title="Dono do clan"
                            >
                              <Crown className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 w-full text-center">
                          <div className="text-xs font-bold truncate text-[#0B0B0D] group-hover:text-[#E0A500] transition-colors">
                            {m.display_name}
                          </div>
                          <div className="text-[10px] text-[#5b554b] truncate">@{m.username}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Mural Modal — only rendered for owner */}
      {isOwnProfile && (
        <MuralModal
          open={showMural}
          onOpenChange={setShowMural}
          profileId={profileId}
        />
      )}

      <MediaComposer
        open={composerMode !== null}
        mode={composerMode ?? "post"}
        initialProfileId={profileId}
        onClose={() => setComposerMode(null)}
        onPosted={() => {
          setComposerMode(null)
          void refetchPortfolio()
        }}
      />
    </div>
  )
}

interface PublicCourseLite {
  id: string
  title: string
  slug: string | null
  cover_url: string | null
  status: "draft" | "published" | "paused"
  profile_id: string | null
  price_cents: number
}

function ProfileCoursesTab({
  profileId,
  isOwnProfile,
}: {
  profileId: string
  isOwnProfile: boolean
}) {
  // Dono usa o catálogo "meus cursos" (inclui rascunhos/pausados).
  // Visitante busca o endpoint público (só publicados).
  const myCoursesHook = useMyCourses()
  const [publicCourses, setPublicCourses] = useState<PublicCourseLite[]>([])
  const [publicLoading, setPublicLoading] = useState(!isOwnProfile)

  useEffect(() => {
    if (isOwnProfile) return
    let cancelled = false
    setPublicLoading(true)
    fetch(`/api/courses/public/by-profile/${profileId}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json()
        if (cancelled) return
        setPublicCourses(Array.isArray(data?.courses) ? data.courses : [])
      })
      .catch(() => {
        if (!cancelled) setPublicCourses([])
      })
      .finally(() => {
        if (!cancelled) setPublicLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOwnProfile, profileId])

  const isLoading = isOwnProfile ? myCoursesHook.isLoading : publicLoading
  const linked: PublicCourseLite[] = isOwnProfile
    ? (myCoursesHook.courses as PublicCourseLite[]).filter(
        (c) => c.profile_id === profileId,
      )
    : publicCourses

  if (isLoading) {
    return (
      <div className="mt-8">
        <LoadingState label="Carregando cursos…" />
      </div>
    )
  }

  if (linked.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          icon={<GraduationCap className="h-7 w-7" />}
          title={isOwnProfile ? "Nenhum curso vinculado" : "Em breve"}
          description={
            isOwnProfile
              ? "Vincule um curso a este perfil para mostrá-lo aqui."
              : "Este perfil ainda não publicou cursos."
          }
          action={
            isOwnProfile ? (
              <GoldButton href="/account?tab=courses" className="px-5 py-2.5 text-sm">
                Criar curso na sua conta
              </GoldButton>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
      {linked.map((c) => (
        <Link
          key={c.id}
          href={
            isOwnProfile
              ? `/account/courses/${c.id}`
              : c.slug
                ? `/cursos/${c.slug}`
                : `/account/courses/${c.id}`
          }
          className="group relative block aspect-[4/5] overflow-hidden rounded-xl border-2 border-[#0B0B0D] bg-[#1d1810] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705]"
        >
          {c.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.cover_url}
              alt={c.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <GraduationCap className="h-12 w-12 text-[#F2B705]/30" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0B0B0D]/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-xs font-bold text-white line-clamp-2">{c.title}</p>
            {isOwnProfile && c.status !== "published" && (
              <span className="mt-1 inline-block rounded-full border border-[#F2B705]/50 bg-[#F2B705]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F2B705]">
                {c.status === "draft" ? "Rascunho" : "Pausado"}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
