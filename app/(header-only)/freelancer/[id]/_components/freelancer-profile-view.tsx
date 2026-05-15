"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useCreatorPublicProfile } from "@/hooks/use-creator-public-profile"
import { FreelancerProfileError, FreelancerProfileLoading } from "./freelancer-states"
import type { PortfolioItem } from "@/lib/types/freelancer-profile"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Briefcase,
  Crown,
  Edit2,
  ExternalLink,
  EyeOff,
  GraduationCap,
  Heart,
  Hexagon,
  ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react"
import { useMyCourses } from "@/hooks/use-my-courses"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AgendaBookingsExperience } from "@/components/agenda/AgendaBookingsExperience"
import { ProfilePublicServicesSection } from "@/components/profile/profile-public-services-section"
import type { ProfileServiceEditClanMember } from "@/components/profile/profile-service-edit-modal"
import { profileAllowsPublicBooking } from "@/lib/booking-public"
import { EngagementPanel } from "@/components/profile/engagement-panel"
import { RankingBadgeModal } from "@/components/profile/ranking-badge-modal"
import { PortfolioItemModal } from "@/components/profile/portfolio-item-modal"
import { RateProfile } from "@/components/profile/rate-profile"
import { MuralModal } from "@/components/profile/mural-modal"
import { ProfileHeadCard } from "@/components/profile/profile-head-card"
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

  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState<string | null>(null)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  const [isAddingPortfolioItem, setIsAddingPortfolioItem] = useState(false)
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false)
  const [editingPortfolioItemId, setEditingPortfolioItemId] = useState<string | null>(null)
  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    description: "",
    project_url: "",
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
  const [portfolioTab, setPortfolioTab] = useState<"feed" | "bees" | "services" | "courses">("feed")
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
    setEditingPortfolioItemId(null)
    setPortfolioForm({ title: "", description: "", project_url: "", is_featured: false, sort_order: 0 })
    setPortfolioError(null)
    clearPending()
    setIsPortfolioModalOpen(true)
  }

  const handleEditPortfolioItem = (item: PortfolioItem) => {
    setEditingPortfolioItemId(item.id_portfolio_item)
    setPortfolioForm({
      title: item.title ?? "",
      description: item.description ?? "",
      project_url: item.project_url ?? "",
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
          project_url: portfolioForm.project_url.trim() || null,
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

  // Badge polling for mural (30s, only for owner)
  useEffect(() => {
    if (!isOwnProfile) return
    const fetchBadge = async () => {
      const token = localStorage.getItem("token")
      if (!token) return
      try {
        const res = await fetch(`/api/service-requests/badge?id_profile=${encodeURIComponent(profileId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setMuralBadge({ has_new: !!data.has_new, chat_unread: data.chat_unread ?? 0 })
        }
      } catch { /* silent */ }
    }
    fetchBadge()
    const interval = setInterval(fetchBadge, 30000)
    return () => clearInterval(interval)
  }, [isOwnProfile, profileId])

  if (loading) {
    return <FreelancerProfileLoading />
  }

  if (error || !profile) {
    return <FreelancerProfileError message={error || "Perfil não encontrado"} />
  }

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-4 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* HEADER CARD */}
        <section className="mb-10">
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
            }}
          />
        </section>

        {/* PORTFOLIO SECTION */}
        <section className="mb-16">
          <div className="flex items-center justify-center md:justify-between mb-8 gap-3 flex-wrap">
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
                onClick={() => setPortfolioTab("services")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                  portfolioTab === "services"
                    ? "bg-amber-400 text-zinc-900 shadow-sm"
                    : "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 hover:text-amber-100"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                Serviços
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
            </div>
            {isOwnProfile && (portfolioTab === "feed" || portfolioTab === "bees") && (
              <Button
                size="sm"
                variant="ghost"
                className="hidden md:flex font-medium text-primary hover:bg-primary/10"
                onClick={handleAddPortfolioItem}
                disabled={isAddingPortfolioItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingPortfolioItem ? "Criando..." : "Novo item"}
              </Button>
            )}
          </div>

          {/* Mobile Novo Item button */}
          {isOwnProfile && (portfolioTab === "feed" || portfolioTab === "bees") && (
            <div className="flex md:hidden justify-center mb-6">
              <Button
                size="sm"
                variant="outline"
                className="w-full max-w-xs font-medium"
                onClick={handleAddPortfolioItem}
                disabled={isAddingPortfolioItem}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingPortfolioItem ? "Criando..." : "Novo item"}
              </Button>
            </div>
          )}

          {portfolioError && (portfolioTab === "feed" || portfolioTab === "bees") && (
            <p className="text-sm text-destructive mb-6 text-center">{portfolioError}</p>
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
            />
          )}

          {portfolioTab === "courses" && (
            <ProfileCoursesTab profileId={profileId} isOwnProfile={isOwnProfile} />
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
            <div className="-mx-4 grid grid-cols-3 gap-px md:mx-0">
              {filteredItems.map((item) => {
                const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
                const firstMedia = activeMedias[0]
                return (
                  <div key={item.id_portfolio_item} className="group relative flex flex-col">
                    {/* Media Container — 4:5 (feed) ou 9:16 (bees) */}
                    {firstMedia ? (
                      <div
                        className={`relative ${aspectClass} bg-muted overflow-hidden ${!isOwnProfile ? "cursor-pointer" : ""}`}
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
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full pl-1 pr-2.5 py-1 text-white text-xs">
                            {item.author_avatar_url ? (
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
                          <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wide font-semibold">
                            Clan
                          </div>
                        )}
                        
                        {/* Owner Overlay Actions */}
                        {isOwnProfile && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                            <label
                              className="flex items-center justify-center h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm cursor-pointer transition-colors"
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
                                  className="flex items-center gap-2 h-10 px-4 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition-colors text-sm font-medium"
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
                                    className="flex items-center justify-center h-10 w-10 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition-colors"
                                    title="Editar item"
                                  >
                                    <Edit2 className="h-5 w-5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePortfolioDeleteItem(item.id_portfolio_item)}
                                    className="flex items-center justify-center h-10 w-10 bg-destructive/80 hover:bg-destructive text-white rounded-full backdrop-blur-sm transition-colors"
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
                      <div className={`relative ${aspectClass} bg-muted flex items-center justify-center`}>
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                        {isOwnProfile && (
                          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <label
                              className="flex items-center justify-center h-10 w-10 bg-background border shadow-sm hover:bg-accent text-foreground rounded-full cursor-pointer transition-colors"
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
                              className="flex items-center justify-center h-10 w-10 bg-background border shadow-sm hover:bg-destructive hover:text-destructive-foreground text-foreground rounded-full transition-colors"
                              title="Remover item"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content below image */}
                    <div className="pt-3 px-2 md:px-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-1">{item.title || "Sem título"}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenPortfolioItemId(item.id_portfolio_item) }}
                            className={`flex items-center gap-1 text-xs transition-colors ${item.liked_by_me ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                            title={item.liked_by_me ? "Remover like" : "Curtir"}
                          >
                            <Heart className={`h-3.5 w-3.5 ${item.liked_by_me ? "fill-current" : ""}`} />
                            <span className="tabular-nums">{item.likes_count ?? 0}</span>
                          </button>
                          {item.project_url && (
                            <a
                              href={item.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center"
                              title="Ver projeto"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                      
                      {/* Secondary Media Thumbnails (Only visible to owner to manage them) */}
                      {isOwnProfile && activeMedias.length > 1 && (
                        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
                          {activeMedias.slice(1).map((media) => (
                            <div key={media.id_portfolio_media} className="relative group/thumb shrink-0 w-10 h-10 rounded overflow-hidden border border-border">
                              {media.media_type === "video" ? (
                                <video src={media.media_url} className="w-full h-full object-cover" muted playsInline />
                              ) : (
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
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
              <div className="h-16 w-16 rounded-full border-2 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">{emptyLabel}</p>
              {isOwnProfile && (
                <Button variant="link" onClick={handleAddPortfolioItem} className="mt-2 text-primary">
                  Adicionar o primeiro item
                </Button>
              )}
            </div>
          )
          })()}
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
              <h2 className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">Agenda</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Calendário mensal e lista dos seus agendamentos (mesma experiência da página Agenda).
              </p>
            </div>
            <AgendaBookingsExperience profileId={profileId} />
          </section>
        )}
      </main>

      {/* Modal de Novo Item de Portfólio */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={(open) => { setIsPortfolioModalOpen(open); if (!open) { setEditingPortfolioItemId(null); clearPending() } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPortfolioItemId ? "Editar item de portfólio" : "Novo item de portfólio"}</DialogTitle>
            <DialogDescription>
              {editingPortfolioItemId
                ? "Atualize as informações do item do seu portfólio."
                : "Preencha as informações do novo item do seu portfólio."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Upload de mídia */}
            {!editingPortfolioItemId && (
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
                      <img src={pendingPreview} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    {pendingOriginalFile && portfolioTab !== "bees" && (
                      <button
                        type="button"
                        onClick={() => setCropTarget({ file: pendingOriginalFile, mode: "new" })}
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
              <Label htmlFor="portfolio-title">Título</Label>
              <Input
                id="portfolio-title"
                placeholder="Ex: Campanha de verão, Ensaio fotográfico..."
                value={portfolioForm.title}
                onChange={(e) => setPortfolioForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio-description">Descrição</Label>
              <Textarea
                id="portfolio-description"
                placeholder="Descreva o trabalho, cliente, contexto..."
                value={portfolioForm.description}
                onChange={(e) => setPortfolioForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="resize-none overflow-y-auto max-h-36"
                style={{ wordBreak: "break-all", overflowWrap: "break-word" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio-project-url">URL do projeto (opcional)</Label>
              <Input
                id="portfolio-project-url"
                type="url"
                placeholder="https://..."
                value={portfolioForm.project_url}
                onChange={(e) => setPortfolioForm((prev) => ({ ...prev, project_url: e.target.value }))}
              />
            </div>

            {portfolioError && (
              <p className="text-sm text-destructive">{portfolioError}</p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setIsPortfolioModalOpen(false)}
                disabled={isAddingPortfolioItem}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmitPortfolioItem} disabled={isAddingPortfolioItem || processingMedia}>
                {isAddingPortfolioItem
                  ? editingPortfolioItemId ? "Salvando..." : "Criando..."
                  : editingPortfolioItemId ? "Salvar" : "Criar item"}
              </Button>
            </div>
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
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 border border-border">
                    {(profile.avatar_url || profile.user_avatar) && (
                      <AvatarImage
                        src={profile.avatar_url ?? profile.user_avatar!}
                        alt={profile.display_name}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback>{getInitials(profile.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <DialogTitle className="text-base truncate">
                      Membros de {profile.display_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {members.length} {members.length === 1 ? "membro" : "membros"}
                    </DialogDescription>
                  </div>
                </div>
                {members.length > 4 && (
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={membersQuery}
                      onChange={(e) => setMembersQuery(e.target.value)}
                      placeholder="Buscar por nome ou @username"
                      className="pl-9 h-9"
                    />
                  </div>
                )}
              </DialogHeader>
              <div className="px-4 pb-5 pt-3 max-h-[60vh] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Users className="h-8 w-8 opacity-40 mb-2" />
                    <p className="text-sm">Nenhum membro encontrado.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filtered.map((m) => (
                      <Link
                        key={m.id_member_profile}
                        href={`/freelancer/${m.id_member_profile}`}
                        className="group flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/60 transition-colors"
                        onClick={() => setShowMembers(false)}
                      >
                        <div className="relative">
                          <Avatar className="size-16 border border-border">
                            {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.display_name} className="object-cover" />}
                            <AvatarFallback>{getInitials(m.display_name)}</AvatarFallback>
                          </Avatar>
                          {m.role === "owner" && (
                            <span
                              className="absolute -bottom-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground border-2 border-background shadow-sm"
                              title="Dono do clan"
                            >
                              <Crown className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 w-full text-center">
                          <div className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                            {m.display_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">@{m.username}</div>
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
    </div>
  )
}

function ProfileCoursesTab({
  profileId,
  isOwnProfile,
}: {
  profileId: string
  isOwnProfile: boolean
}) {
  const { courses, isLoading } = useMyCourses()

  if (!isOwnProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
        <div className="h-16 w-16 rounded-full border-2 flex items-center justify-center mb-4">
          <GraduationCap className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium">Em breve.</p>
        <p className="mt-1 text-xs text-muted-foreground/80">
          Os cursos públicos deste perfil aparecerão aqui.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando cursos…
      </div>
    )
  }

  const linked = courses.filter((c) => c.profile_id === profileId)

  if (linked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
        <div className="h-16 w-16 rounded-full border-2 flex items-center justify-center mb-4">
          <GraduationCap className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium">Nenhum curso vinculado a este perfil.</p>
        <Link
          href="/account?tab=courses"
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          Criar curso na sua conta
        </Link>
      </div>
    )
  }

  return (
    <div className="-mx-4 grid grid-cols-3 gap-px md:mx-0">
      {linked.map((c) => (
        <Link
          key={c.id}
          href={c.slug ? `/cursos/${c.slug}` : `/account/courses/${c.id}`}
          className="group relative block aspect-[4/5] overflow-hidden bg-muted"
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
              <GraduationCap className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-xs font-semibold text-white line-clamp-2">{c.title}</p>
            {c.status !== "published" && (
              <span className="mt-1 inline-block rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                {c.status === "draft" ? "Rascunho" : "Pausado"}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
