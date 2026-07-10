"use client"

import { AlertDescription } from "@/components/ui/alert"

import { AlertTitle } from "@/components/ui/alert"

import { Alert } from "@/components/ui/alert"

import React, { useRef } from "react"
import { useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useMeProfile } from "@/hooks/use-me-profile"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import type { MediaItem, PerfilCompleto, Profile, RedeSocial } from "@/lib/types/account"
import { AccountError, AccountLoading } from "./_components/account-states"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Briefcase, Edit, Instagram, Youtube, Video, Plus, User, Camera, ZoomIn, ZoomOut, Trash2, ImageIcon, Upload, Pencil, AlertCircle, Copy, Check, CalendarDays, Settings, Users, Crown, ArrowRight, EyeOff, Eye, MessageCircle, BadgeCheck, UserRound, Sparkles, ShieldCheck, BarChart3, FolderCog, Wallet, Database, Bot, Dumbbell, Wrench } from "lucide-react"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { ManifestationBadge } from "@/components/manifestation/ManifestationBadge"
import { CommunityTile } from "@/components/community/community-tile"
import { HoverHint } from "@/features/tour/HoverHint"
import { Slider } from "@/components/ui/slider"
import { AvatarImage } from "@/components/ui/avatar"
import { OversizeModal } from "@/components/media/oversize-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import {
  AVATAR_IMAGE_ASPECT_RATIO,
  AVATAR_IMAGE_MAX_SIZE_BYTES,
  AVATAR_IMAGE_OUTPUT,
  POST_IMAGE_ASPECT_RATIO,
  POST_IMAGE_MAX_SIZE_BYTES,
  POST_IMAGE_OUTPUT,
  getImageDimensions,
  isAspectRatio,
  validateImageFile,
  validateVideoFile,
} from "@/lib/media/media-validation"
import { compressImageToMaxSize, type ProcessedImage } from "@/lib/media/image-processing"
import { RetractableProfileHeader } from "@/components/layout/retractable-profile-header"
import { useNavCounts } from "@/components/navigation/use-nav-counts"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"

// F3.S2 — pedaços pesados fora do bundle inicial da rota (chunk lazy, sem SSR).
// Modais só custam download quando abrem; o portfólio (52KB de fonte + players)
// chega logo após a hidratação com skeleton no lugar.
const UserPortfolio = dynamic(
  () => import("./_components/UserPortfolio").then((m) => m.UserPortfolio),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full animate-pulse rounded-xl bg-white/5" aria-hidden />
    ),
  }
)
const UserDropside = dynamic(
  () => import("@/components/layout/UserDropside").then((m) => m.UserDropside),
  { ssr: false }
)
const FollowingModal = dynamic(
  () => import("@/components/profile/following-modal").then((m) => m.FollowingModal),
  { ssr: false }
)
const PremiumProfileModal = dynamic(
  () => import("@/components/premium/PremiumProfileModal").then((m) => m.PremiumProfileModal),
  { ssr: false }
)
const MediaCropModal = dynamic(
  () => import("@/components/media/media-crop-modal").then((m) => m.MediaCropModal),
  { ssr: false }
)
const DataConnectionsModal = dynamic(
  () => import("@/components/account/DataConnectionsModal").then((m) => m.DataConnectionsModal),
  { ssr: false }
)

function mbLabel(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))}MB`
}

export default function PerfilPage() {
  const t = useTranslations("Account")
  const tx = useTaxonomy()
  const router = useRouter()
  const { perfil, setPerfil, isLoading, error } = useMeProfile()
  const navCounts = useNavCounts()
  const unreadMessages = navCounts.conversationUnread
  const [dropsideOpen, setDropsideOpen] = useState(false)
  const [followedProfilesCount, setFollowedProfilesCount] = useState(0)
  const [myCommunities, setMyCommunities] = useState<
    Array<{
      id_profile: string
      display_name: string
      avatar_url: string | null
      role: "leader" | "vice" | "member"
      xp_level: number
      member_count: number
      enxame_name: string | null
      banner_url?: string | null
      community_theme?: { accent?: string } | null
    }>
  >([])
  const [followingModalOpen, setFollowingModalOpen] = useState(false)
  const [dataConnOpen, setDataConnOpen] = useState(false)
  const dataApiOn = useFeature("data_api")
  const atendimentoIaOn = useFeature("atendimento_ia_venda")
  const academiasOn = useFeature("fitness_academias")
  // Toolbar retrátil do headcard (botão de ferramentas — espelha a engrenagem
  // do subperfil: hover expande, click alterna).
  const [toolsOpen, setToolsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [novaRede, setNovaRede] = useState({
    id: "",
    platform: "",
    account: "",
    followers_range: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [fotoTemp, setFotoTemp] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    nome: "",
    username: "",
    idade: "",
    sexo: "",
    telefone: "",
    estado: "",
    municipio: "",
    bio: "",
  })
  // Username availability in edit modal
  const [editUsernameStatus, setEditUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle")
  const [editUsernameMsg, setEditUsernameMsg] = useState("")
  const editUsernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  // Modal amigável de "arquivo grande" (leva pra /comprimir). Guarda o rótulo
  // do limite porque avatar e vídeo têm limites diferentes.
  const [oversizeLabel, setOversizeLabel] = useState<string | null>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false)
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false)
  const [machines, setMachines] = useState<{ id_machine: number; name: string; slug: string }[]>([])
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [professions, setProfessions] = useState<{ id_category: number; desc_category: string }[]>([])
  const [loadingProfessions, setLoadingProfessions] = useState(false)
  const [newProfileForm, setNewProfileForm] = useState({
    id_machine: "",
    id_category: "",
    display_name: "",
    bio: "",
    estado: "",
    municipio: "",
  })
  const [newProfileMunicipios, setNewProfileMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingNewProfileMunicipios, setLoadingNewProfileMunicipios] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [newProfileError, setNewProfileError] = useState<string | null>(null)
  const [isGeneratingCoupon, setIsGeneratingCoupon] = useState(false)
  const [couponCopied, setCouponCopied] = useState(false)
  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    description: "",
    external_link: "",
  })
  const [uploadingMedia, setUploadingMedia] = useState<{ file: File; preview: string } | null>(null)
  const [originalUploadImage, setOriginalUploadImage] = useState<File | null>(null)
  const [mediaCropFile, setMediaCropFile] = useState<File | null>(null)
  const [isProcessingUploadMedia, setIsProcessingUploadMedia] = useState(false)
  const [mediaUploadProgress, setMediaUploadProgress] = useState<"idle" | "uploading" | "processing">("idle")
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video">("image")
  const [isEditMediaModalOpen, setIsEditMediaModalOpen] = useState(false)
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null)
  const [editMediaForm, setEditMediaForm] = useState({
    title: "",
    description: "",
    external_link: "",
  })
  const [isSavingMedia, setIsSavingMedia] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null)
  const [deletingProfile, setDeletingProfile] = useState<string | null>(null)
  const [premiumProfile, setPremiumProfile] = useState<{ id: string; name?: string } | null>(null)
  const srBadge = { has_new: navCounts.serviceHasNew, unread_chats: navCounts.serviceUnread }
  const profileBadges = navCounts.conversationByActor
  const [manifestation, setManifestation] = useState<{
    active?: {
      id: string
      name: string
      banner_url: string
      tag_label: string
      tag_color: string
      tag_icon?: string | null
      expires_at: string
    } | null
    applied_profile_ids?: string[]
  } | null>(null)

  const estados = ESTADOS_BRASIL

  React.useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    fetch("/api/manifestations/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setManifestation(data) })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    fetch("/api/entity-follows/me/summary", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setFollowedProfilesCount(Number(data.following_count) || 0)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    fetch("/api/communities/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.communities)) setMyCommunities(data.communities)
      })
      .catch(() => {})
  }, [])

  // Ref no headcard pro RetractableProfileHeader observar.
  const headcardRef = useRef<HTMLElement | null>(null)

  // Deep-link: ?edit=1 abre o modal Editar (dropside da toolbar entra aqui em /account?edit=1)
  const editDeeplinkOpenedRef = useRef(false)
  React.useEffect(() => {
    if (editDeeplinkOpenedRef.current) return
    if (!perfil) return
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("edit") !== "1") return
    editDeeplinkOpenedRef.current = true
    openEditModal()
    // Limpa o param da URL pra não reabrir se o usuário só fechar o modal
    const url = new URL(window.location.href)
    url.searchParams.delete("edit")
    window.history.replaceState({}, "", url.toString())
    // openEditModal é estável (declarado no escopo do componente) — dispara
    // só quando `perfil` carrega; rodar de novo a cada referência nova de
    // openEditModal reabriria o modal indevidamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  // Mesma-página: quando o usuário já está em /account, trocar a query (?edit=1)
  // não remonta nada, então a toolbar dispara este evento pra abrir o editor na
  // hora. Cobre o caso em que o menu da conta só abre estando em /account.
  React.useEffect(() => {
    if (!perfil) return
    const handler = () => openEditModal()
    window.addEventListener("freelandoo:open-account-edit", handler)
    return () => window.removeEventListener("freelandoo:open-account-edit", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil])

  if (isLoading) {
    return <AccountLoading />
  }

  if (error || !perfil) {
    return <AccountError message={error || t("loadProfileError", "Erro ao carregar perfil")} />
  }

  const handleGenerateCoupon = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setIsGeneratingCoupon(true)
    try {
      const res = await fetch("/api/users/me/coupon", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPerfil((prev) => prev ? { ...prev, coupon_code: data.coupon_code ?? data.code ?? data.coupon } : prev)
      }
    } catch {
      // silencioso
    } finally {
      setIsGeneratingCoupon(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code)
    setCouponCopied(true)
    setTimeout(() => setCouponCopied(false), 2000)
  }

  const fetchMachines = async () => {
    if (machines.length > 0) return
    setLoadingMachines(true)
    try {
      const res = await fetch("/api/enxames")
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.enxames ?? data.machines ?? [])
        setMachines(list)
      }
    } catch {
      // silencioso
    } finally {
      setLoadingMachines(false)
    }
  }

  const fetchProfessions = async (id_machine: string) => {
    setLoadingProfessions(true)
    try {
      const res = await fetch(`/api/enxames/${encodeURIComponent(id_machine)}/categories`)
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.categories ?? [])
        setProfessions(list)
      } else {
        setProfessions([])
      }
    } catch {
      setProfessions([])
    } finally {
      setLoadingProfessions(false)
    }
  }

  const handleToggleVisibility = async (id_profile: string, next: boolean) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setTogglingVisibility(id_profile)
    try {
      const res = await fetch(`/api/profile/${id_profile}/visibility`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: next }),
      })
      if (res.ok) {
        const updated = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
        if (updated.ok) setPerfil(await updated.json())
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || t("visibilityError", "Não foi possível alterar a visibilidade."))
      }
    } catch {
      alert(t("visibilityErrorRetry", "Erro ao alterar visibilidade."))
    } finally {
      setTogglingVisibility(null)
    }
  }

  const handleDeleteProfile = async (id_profile: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    const ok = window.confirm(
      t("deleteProfileConfirm", "Tem certeza que deseja excluir este perfil? Ele não aparecerá mais para você nem para o público. O histórico de pagamentos é preservado para auditoria.")
    )
    if (!ok) return
    setDeletingProfile(id_profile)
    try {
      const res = await fetch(`/api/profile/${id_profile}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const updated = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
        if (updated.ok) setPerfil(await updated.json())
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || t("deleteProfileError", "Não foi possível excluir o perfil."))
      }
    } catch {
      alert(t("deleteProfileErrorRetry", "Erro ao excluir o perfil."))
    } finally {
      setDeletingProfile(null)
    }
  }

  const handleToggleManifestationProfile = async (id_profile: string, enabled: boolean) => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const res = await fetch(`/api/manifestations/profiles/${id_profile}/apply`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t("manifestApplyError", "Nao foi possivel aplicar"))
      setManifestation((prev) => prev ? { ...prev, applied_profile_ids: data.applied_profile_ids || [] } : prev)
    } catch (err) {
      alert(err instanceof Error ? err.message : t("manifestApplyErrorGeneric", "Erro ao aplicar Manifestacao"))
    }
  }

  const handleNewProfileMachineChange = (val: string) => {
    setNewProfileForm((prev) => ({ ...prev, id_machine: val, id_category: "" }))
    setProfessions([])
    if (val) fetchProfessions(val)
  }

  const fetchNewProfileMunicipios = async (estadoId: string) => {
    setLoadingNewProfileMunicipios(true)
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`
      )
      if (response.ok) {
        const data = await response.json()
        setNewProfileMunicipios(data.map((m: { id: number; nome: string }) => ({ id: m.id, nome: m.nome })))
      }
    } catch {
      // silencioso
    } finally {
      setLoadingNewProfileMunicipios(false)
    }
  }

  const handleNewProfileEstadoChange = (uf: string) => {
    setNewProfileForm((prev) => ({ ...prev, estado: uf, municipio: "" }))
    const estadoObj = estados.find((e) => e.uf === uf)
    if (estadoObj) fetchNewProfileMunicipios(estadoObj.id.toString())
  }

  const handleCreateProfile = async () => {
    if (!newProfileForm.display_name.trim()) {
      setNewProfileError(t("displayNameRequired", "O nome de exibição é obrigatório."))
      return
    }
    if (!newProfileForm.id_machine) {
      setNewProfileError(t("selectMachine", "Selecione um enxame."))
      return
    }
    if (!newProfileForm.id_category) {
      setNewProfileError(t("selectProfession", "Selecione uma profissão."))
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return

    setIsCreatingProfile(true)
    setNewProfileError(null)
    try {
      const payload = {
        id_user: perfil?.id_user ?? null,
        id_machine: Number(newProfileForm.id_machine),
        id_category: Number(newProfileForm.id_category),
        display_name: newProfileForm.display_name.trim(),
        bio: newProfileForm.bio.trim() || null,
        estado: newProfileForm.estado || null,
        municipio: newProfileForm.municipio || null,
      }
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const resData = await res.json()
      if (res.ok) {
        setIsNewProfileModalOpen(false)
        setNewProfileForm({ id_machine: "", id_category: "", display_name: "", bio: "", estado: "", municipio: "" })
        setProfessions([])
        // Recarrega dados do usuário
        const updated = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
        if (updated.ok) setPerfil(await updated.json())
      } else {
        setNewProfileError(resData.error || resData.message || t("createProfileError", "Erro ao criar perfil. Tente novamente."))
      }
    } catch {
      setNewProfileError(t("createProfileError", "Erro ao criar perfil. Tente novamente."))
    } finally {
      setIsCreatingProfile(false)
    }
  }

  const getInitials = (nome: string) => {
    if (!nome) return "?"
    const names = nome.split(" ")
    return names[0][0] + (names[1]?.[0] || "")
  }

  const formatarSexo = (sexo: string | null | undefined) => {
    if (!sexo) return t("notInformed", "Não informado")
    const sexoUpper = sexo.toUpperCase()
    if (sexoUpper === "M") return t("genderMale", "Masculino")
    if (sexoUpper === "F") return t("genderFemale", "Feminino")
    return t("genderOther", "Outros")
  }

  const renderRedeSocial = (rede: RedeSocial & { id?: string }) => {
    if (!rede.platform) {
      return null
    }

    let icon = <Instagram className="h-5 w-5 text-white" />
    let bgColor = "bg-gradient-to-br from-purple-500 to-pink-500"

    const plataforma = rede.platform.toLowerCase()

    if (plataforma === "youtube") {
      icon = <Youtube className="h-5 w-5 text-white" />
      bgColor = "bg-red-600"
    } else if (plataforma === "tiktok") {
      icon = <Video className="h-5 w-5 text-white" />
      bgColor = "bg-black"
    }

    return (
      <div
        key={rede.id || rede.platform}
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => {
          // Construir URL da rede social baseado na plataforma
          let url = ""
          const account = rede.account.replace("@", "")

          if (rede.platform.toLowerCase() === "instagram") {
            url = `https://instagram.com/${account}`
          } else if (rede.platform.toLowerCase() === "youtube") {
            url = `https://youtube.com/@${account}`
          } else if (rede.platform.toLowerCase() === "tiktok") {
            url = `https://tiktok.com/@${account}`
          }

          if (url) {
            window.open(url, "_blank")
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-full ${bgColor} p-2`}>{icon}</div>
          <div>
            <p className="font-medium capitalize">{rede.platform}</p>
            <p className="text-sm text-muted-foreground">{rede.account}</p>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Badge variant="secondary">{rede.followers_range}</Badge>
          {rede.id && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  setNovaRede({
                    id: rede.id || "",
                    platform: rede.platform,
                    account: rede.account,
                    followers_range: rede.followers_range,
                  })
                  setIsEditing(true)
                  setIsModalOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteRede(rede.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  const handleDeleteRede = async (id: string | undefined) => {
    if (!id) return

    const token = localStorage.getItem("token")
    if (!token) {
      alert(t("sessionExpired", "Sessão expirada. Faça login novamente."))
      router.push("/login")
      return
    }

    try {
      const response = await fetch(`/api/users/me/social-media/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t("deleteSocialError", "Erro ao deletar rede social"))
      }

      const getResponse = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (getResponse.ok) {
        const updatedProfile = await getResponse.json()
        setPerfil(updatedProfile)
      }
    } catch (error) {
      console.error("Erro ao deletar rede social:", error)
      alert(error instanceof Error ? error.message : t("deleteSocialError", "Erro ao deletar rede social"))
    }
  }

  const uploadUserAvatarFile = async (file: File) => {
    setIsUploadingAvatar(true)

    const token = localStorage.getItem("token")
    if (!token) {
      alert(t("sessionExpired", "Sessão expirada. Faça login novamente."))
      router.push("/login")
      return
    }

    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch("/api/users/me/avatar", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t("updateAvatarError", "Erro ao atualizar avatar"))
      }

      const getResponse = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (getResponse.ok) {
        const updatedProfile = await getResponse.json()
        setPerfil(updatedProfile)
      }

      setFotoPreview(null)
      setFotoTemp(null)
      setAvatarFile(null)
      setIsUploadModalOpen(false)
      setImagePosition({ x: 0, y: 0 })
      setZoom(1)
    } catch (error) {
      console.error("Erro ao fazer upload do avatar:", error)
      alert(error instanceof Error ? error.message : t("updateAvatarError", "Erro ao atualizar avatar"))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleUserAvatarCropConfirm = async (image: ProcessedImage) => {
    URL.revokeObjectURL(image.previewUrl)
    await uploadUserAvatarFile(image.file)
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) {
      if (file.size > AVATAR_IMAGE_MAX_SIZE_BYTES) {
        setOversizeLabel(mbLabel(AVATAR_IMAGE_MAX_SIZE_BYTES))
        return
      }
      const validation = validateImageFile(file, AVATAR_IMAGE_MAX_SIZE_BYTES)
      if (!validation.ok) {
        alert(validation.error)
        return
      }
      setAvatarFile(file)
      setIsUploadModalOpen(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    const limit = 100 * zoom
    setImagePosition({
      x: Math.max(-limit, Math.min(limit, newX)),
      y: Math.max(-limit, Math.min(limit, newY)),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({ x: touch.clientX - imagePosition.x, y: touch.clientY - imagePosition.y })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const touch = e.touches[0]
    const newX = touch.clientX - dragStart.x
    const newY = touch.clientY - dragStart.y
    const limit = 100 * zoom
    setImagePosition({
      x: Math.max(-limit, Math.min(limit, newX)),
      y: Math.max(-limit, Math.min(limit, newY)),
    })
  }

  const cropImage = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!fotoTemp) {
        reject(new Error("Nenhuma imagem selecionada"))
        return
      }

      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Não foi possível criar canvas"))
          return
        }

        const outputSize = 400
        canvas.width = outputSize
        canvas.height = outputSize

        const containerSize = 192

        const imgAspect = img.width / img.height
        let renderWidth: number
        let renderHeight: number

        if (imgAspect > 1) {
          renderHeight = containerSize
          renderWidth = containerSize * imgAspect
        } else {
          renderWidth = containerSize
          renderHeight = containerSize / imgAspect
        }

        const scaleX = img.width / renderWidth
        const scaleY = img.height / renderHeight

        const renderCenterX = renderWidth / 2
        const renderCenterY = renderHeight / 2

        const containerCenterX = containerSize / 2
        const containerCenterY = containerSize / 2

        const offsetX = renderCenterX - containerCenterX
        const offsetY = renderCenterY - containerCenterY

        const visibleSize = containerSize / zoom

        const visibleCenterX = offsetX + containerCenterX - imagePosition.x / zoom
        const visibleCenterY = offsetY + containerCenterY - imagePosition.y / zoom

        const sx = (visibleCenterX - visibleSize / 2) * scaleX
        const sy = (visibleCenterY - visibleSize / 2) * scaleY
        const sWidth = visibleSize * scaleX
        const sHeight = visibleSize * scaleY

        ctx.drawImage(img, Math.max(0, sx), Math.max(0, sy), sWidth, sHeight, 0, 0, outputSize, outputSize)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Erro ao gerar imagem"))
            }
          },
          "image/jpeg",
          0.9
        )
      }
      img.onerror = () => reject(new Error("Erro ao carregar imagem"))
      img.src = fotoTemp
    })
  }

  const handleConfirmUpload = async () => {
    if (!fotoTemp) return

    setIsUploadingAvatar(true)

    const token = localStorage.getItem("token")
    if (!token) {
      alert(t("sessionExpired", "Sessão expirada. Faça login novamente."))
      router.push("/login")
      return
    }

    try {
      const croppedBlob = await cropImage()
      const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })

      const formData = new FormData()
      formData.append("avatar", croppedFile)

      const response = await fetch("/api/users/me/avatar", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t("updateAvatarError", "Erro ao atualizar avatar"))
      }

      const getResponse = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (getResponse.ok) {
        const updatedProfile = await getResponse.json()
        setPerfil(updatedProfile)
      }

      setFotoPreview(null)
      setFotoTemp(null)
      setAvatarFile(null)
      setIsUploadModalOpen(false)
      setImagePosition({ x: 0, y: 0 })
      setZoom(1)
    } catch (error) {
      console.error("Erro ao fazer upload do avatar:", error)
      alert(error instanceof Error ? error.message : t("updateAvatarError", "Erro ao atualizar avatar"))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleCancelUpload = () => {
    setFotoTemp(null)
    setAvatarFile(null)
    setImagePosition({ x: 0, y: 0 })
    setZoom(1)
    if (!fotoPreview) {
      setIsUploadModalOpen(false)
    }
  }

  const checkEditUsername = async (u: string, currentUsername: string) => {
    if (u === currentUsername) {
      setEditUsernameStatus("idle")
      setEditUsernameMsg("")
      return
    }
    if (u.length < 3) {
      setEditUsernameStatus("invalid")
      setEditUsernameMsg(t("usernameMin", "Mínimo 3 caracteres"))
      return
    }
    setEditUsernameStatus("checking")
    try {
      const res = await fetch(`/api/check-username?u=${encodeURIComponent(u)}`)
      const data = await res.json()
      if (data.available) {
        setEditUsernameStatus("available")
        setEditUsernameMsg(t("usernameAvailable", "Disponível ✓"))
      } else {
        setEditUsernameStatus("taken")
        setEditUsernameMsg(t("usernameTaken", "Este nome já está em uso"))
      }
    } catch {
      setEditUsernameStatus("idle")
      setEditUsernameMsg("")
    }
  }

  const handleEditUsernameChange = (raw: string) => {
    const u = raw.toLowerCase().replace(/[^a-z0-9_.]/g, "")
    setEditForm((prev) => ({ ...prev, username: u }))
    setEditUsernameStatus("idle")
    setEditUsernameMsg("")
    if (editUsernameTimer.current) clearTimeout(editUsernameTimer.current)
    if (u.length >= 3) {
      editUsernameTimer.current = setTimeout(() => checkEditUsername(u, perfil.username || ""), 400)
    }
  }

  const openEditModal = async () => {
    setEditForm({
      nome: perfil.nome || "",
      username: perfil.username || "",
      idade: perfil.idade?.toString() || "",
      sexo: perfil.sexo || "",
      telefone: perfil.telefone || "",
      estado: perfil.estado || "",
      municipio: perfil.municipio || "",
      bio: perfil.bio || "",
    })
    setEditUsernameStatus("idle")
    setEditUsernameMsg("")

    if (perfil.estado) {
      const estadoObj = estados.find((e) => e.uf === perfil.estado)
      if (estadoObj) {
        fetchMunicipios(estadoObj.id.toString())
      }
    }
    setIsEditModalOpen(true)
  }

  const fetchMunicipios = async (estadoId: string) => {
    setLoadingMunicipios(true)
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`
      )
      if (response.ok) {
        const data = await response.json()
        setMunicipios(data.map((m: { id: number; nome: string }) => ({ id: m.id, nome: m.nome })))
      }
    } catch (error) {
      console.error("Erro ao buscar municípios:", error)
    } finally {
      setLoadingMunicipios(false)
    }
  }

  const handleEstadoChange = (uf: string) => {
    setEditForm({ ...editForm, estado: uf, municipio: "" })
    const estadoObj = estados.find((e) => e.uf === uf)
    if (estadoObj) {
      fetchMunicipios(estadoObj.id.toString())
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)

    const token = localStorage.getItem("token")
    if (!token) {
      alert(t("sessionExpired", "Sessão expirada. Faça login novamente."))
      router.push("/login")
      return
    }

    const payload: Record<string, unknown> = {
      nome: editForm.nome || null,
      username: editForm.username || null,
      idade: editForm.idade ? parseInt(editForm.idade) : null,
      sexo: editForm.sexo || null,
      telefone: editForm.telefone,
      estado: editForm.estado,
      municipio: editForm.municipio,
      bio: editForm.bio,
    }

    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t("saveProfileError", "Erro ao salvar perfil"))
      }

      const getResponse = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (getResponse.ok) {
        const updatedProfile = await getResponse.json()
        setPerfil(updatedProfile)
      }

      setIsEditModalOpen(false)
    } catch (error) {
      console.error("Erro ao salvar perfil:", error)
      alert(error instanceof Error ? error.message : t("saveProfileError", "Erro ao salvar perfil"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdicionarRede = async () => {
    if (!novaRede.platform || !novaRede.account || !novaRede.followers_range) {
      alert(t("fillAllFields", "Preencha todos os campos"))
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      alert(t("tokenNotFound", "Token não encontrado"))
      return
    }

    try {
      const url = isEditing && novaRede.id
        ? `/api/users/me/social-media/${novaRede.id}`
        : "/api/users/me/social-media"

      const method = isEditing && novaRede.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: novaRede.platform,
          account: novaRede.account,
          followers_range: novaRede.followers_range,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t("saveSocialError", "Erro ao salvar rede social"))
      }

      const getResponse = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (getResponse.ok) {
        const updatedProfile = await getResponse.json()
        setPerfil(updatedProfile)
      }

      setNovaRede({ id: "", platform: "", account: "", followers_range: "" })
      setIsEditing(false)
      setIsModalOpen(false)
    } catch (error) {
      console.error("Erro ao salvar rede social:", error)
      alert(error instanceof Error ? error.message : t("saveSocialError", "Erro ao salvar rede social"))
    }
  }

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Não foi possível criar canvas"))
          return
        }

        const MAX_SIZE = 1920
        let width = img.width
        let height = img.height

        if (width > height && width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width
          width = MAX_SIZE
        } else if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height
          height = MAX_SIZE
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("Erro ao comprimir imagem"))
            }
          },
          "image/jpeg",
          0.85
        )
      }
      img.onerror = () => reject(new Error("Erro ao carregar imagem"))
      img.src = URL.createObjectURL(file)
    })
  }

  const revokeUploadPreview = (preview: string | null | undefined) => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
  }

  const setProcessedUploadImage = (processed: ProcessedImage, originalFile: File) => {
    revokeUploadPreview(uploadingMedia?.preview)
    setUploadingMedia({ file: processed.file, preview: processed.previewUrl })
    setOriginalUploadImage(originalFile)
    setSelectedMediaType("image")
  }

  const prepareUploadImage = async (file: File) => {
    const validation = validateImageFile(file, POST_IMAGE_MAX_SIZE_BYTES)
    if (!validation.ok) {
      alert(validation.error)
      return
    }

    try {
      const dimensions = await getImageDimensions(file)
      if (!isAspectRatio(dimensions.width, dimensions.height, POST_IMAGE_ASPECT_RATIO)) {
        setMediaCropFile(file)
        return
      }

      setIsProcessingUploadMedia(true)
      const processed = await compressImageToMaxSize(file, {
        outputWidth: POST_IMAGE_OUTPUT.width,
        outputHeight: POST_IMAGE_OUTPUT.height,
        maxSizeBytes: POST_IMAGE_MAX_SIZE_BYTES,
        mimeType: "image/webp",
        errorMessage: t("postImageTooBig", "A imagem do post precisa ter no máximo 3MB."),
      })
      setProcessedUploadImage(processed, file)
    } catch (error) {
      alert(error instanceof Error ? error.message : t("optimizeFileError", "Nao foi possivel otimizar esse arquivo. Tente outro."))
    } finally {
      setIsProcessingUploadMedia(false)
    }
  }

  const handleUploadCropConfirm = (image: ProcessedImage) => {
    if (!mediaCropFile) return
    setProcessedUploadImage(image, mediaCropFile)
    setMediaCropFile(null)
  }

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")

    if (!isImage && !isVideo) {
      alert(t("selectValidMedia", "Por favor, selecione uma imagem ou vídeo válido"))
      return
    }

    if (isImage) {
      await prepareUploadImage(file)
      return
    }

    const validation = validateVideoFile(file)
    if (!validation.ok) {
      alert(validation.error)
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      setOversizeLabel("100MB")
      return
    }

    revokeUploadPreview(uploadingMedia?.preview)
    setUploadingMedia({ file, preview: URL.createObjectURL(file) })
    setOriginalUploadImage(null)
    setSelectedMediaType("video")
  }

  const handleUploadMedia = async () => {
    if (!uploadingMedia) return

    setMediaUploadProgress("uploading")
    const token = localStorage.getItem("token")

    if (!token) {
      alert(t("sessionExpired", "Sessão expirada. Faça login novamente."))
      router.push("/login")
      return
    }

    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", uploadingMedia.file)

      const uploadResponse = await fetch("/api/media/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text()
        let errorData
        try {
          errorData = JSON.parse(text)
        } catch {
          errorData = { error: text || t("mediaUploadError", "Erro ao fazer upload da mídia") }
        }
        throw new Error(errorData.error || t("uploadStatusError", "Erro ao fazer upload (Status {status})").replace("{status}", String(uploadResponse.status)))
      }

      const uploadedMedia = await uploadResponse.json()

      setMediaUploadProgress("processing")

      const mediaPayload = {
        title: portfolioForm.title || uploadingMedia.file.name,
        description: portfolioForm.description || "",
        media_url: uploadedMedia.media_url,
        media_type: uploadedMedia.media_type,
        external_link: portfolioForm.external_link || "",
        position: perfil.media?.length || 0,
      }

      const mediaResponse = await fetch("/api/media", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mediaPayload),
      })

      if (!mediaResponse.ok) {
        const errorData = await mediaResponse.json()
        throw new Error(errorData.error || t("createPortfolioItemError", "Erro ao criar item do portfólio"))
      }

      const getResponse = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (getResponse.ok) {
        const updatedProfile = await getResponse.json()
        setPerfil(updatedProfile)
      }

      try {
        const mediaResponseRefresh = await fetch("/api/media", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (mediaResponseRefresh.ok) {
          const mediaData = await mediaResponseRefresh.json()
          setPerfil((prevPerfil) =>
            prevPerfil ? { ...prevPerfil, media: mediaData } : prevPerfil
          )
        }
      } catch (mediaError) {
        console.error("Erro ao carregar mídia após upload:", mediaError)
      }

      revokeUploadPreview(uploadingMedia.preview)
      setUploadingMedia(null)
      setOriginalUploadImage(null)
      setPortfolioForm({ title: "", description: "", external_link: "" })
      setIsPortfolioModalOpen(false)
      setMediaUploadProgress("idle")
    } catch (error) {
      console.error("Erro ao fazer upload da mídia:", error)
      alert(error instanceof Error ? error.message : t("mediaUploadError", "Erro ao fazer upload da mídia"))
      setMediaUploadProgress("idle")
    }
  }

  const handleOpenEditMedia = (item: MediaItem) => {
    setEditingMedia(item)
    setEditMediaForm({
      title: item.title || "",
      description: item.description || "",
      external_link: item.external_link || "",
    })
    setIsEditMediaModalOpen(true)
  }

  const handleUpdateMedia = async () => {
    if (!editingMedia) return

    setIsSavingMedia(true)
    const token = localStorage.getItem("token")
    if (!token) {
      alert(t("sessionExpired", "Sessão expirada. Faça login novamente."))
      router.push("/login")
      return
    }

    const mediaId = editingMedia.id_media?.toString() || editingMedia.id

    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editMediaForm.title,
          description: editMediaForm.description,
          external_link: editMediaForm.external_link,
        }),
      })

      if (!response.ok) {
        throw new Error(t("updateMediaError", "Erro ao atualizar mídia"))
      }

      if (perfil) {
        setPerfil({
          ...perfil,
          media: perfil.media?.map((m) =>
            m.id_media === editingMedia.id_media || m.id === editingMedia.id ? { ...m, ...editMediaForm } : m
          ) || [],
        })
      }

      setIsEditMediaModalOpen(false)
      setEditingMedia(null)
    } catch (error) {
      console.error("Erro ao atualizar mídia:", error)
      alert(t("updateMediaError", "Erro ao atualizar mídia"))
    } finally {
      setIsSavingMedia(false)
    }
  }

  const handleDeleteMedia = async () => {
    if (!editingMedia) return

    if (!confirm(t("deleteMediaConfirm", "Tem certeza que deseja deletar esta mídia?"))) return

    setIsSavingMedia(true)
    const token = localStorage.getItem("token")
    if (!token) return

    const mediaId = editingMedia.id_media?.toString() || editingMedia.id

    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(t("deleteMediaError", "Erro ao deletar mídia"))
      }

      if (perfil) {
        setPerfil({
          ...perfil,
          media: perfil.media?.filter((m) => m.id_media !== editingMedia.id_media && m.id !== editingMedia.id) || [],
        })
      }

      setIsEditMediaModalOpen(false)
      setEditingMedia(null)
    } catch (error) {
      console.error("Erro ao deletar mídia:", error)
      alert(t("deleteMediaError", "Erro ao deletar mídia"))
    } finally {
      setIsSavingMedia(false)
    }
  }

  const emailVerified =
    Array.isArray(perfil.statuses) &&
    perfil.statuses.some((s) =>
      String(s.desc_status || "").toLowerCase().includes("email")
    )
  const totalProfiles = (perfil.profiles || []).filter((p) => !p.is_clan).length
  const visibleProfiles = (perfil.profiles || []).filter(
    (p) => !p.is_clan && p.is_published
  ).length

  return (
    <div className="fl-root fl-paper-texture min-h-[100dvh] overflow-x-hidden">
      <RetractableProfileHeader
        targetRef={headcardRef}
        name={perfil.nome || perfil.username || ""}
        addMenu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("create", "Criar")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_8px_18px_-12px_rgba(242,196,9,0.65)] transition active:scale-[0.96]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onSelect={() =>
                  window.dispatchEvent(
                    new CustomEvent("freelandoo:create", { detail: { kind: "post" } }),
                  )
                }
              >
                <ImageIcon className="h-4 w-4" />
                {t("menuPost", "Post")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  window.dispatchEvent(
                    new CustomEvent("freelandoo:create", { detail: { kind: "bees" } }),
                  )
                }
              >
                <Sparkles className="h-4 w-4" />
                {t("menuCurtos", "Curto")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setNewProfileError(null)
                  setNewProfileForm({ id_machine: "", id_category: "", display_name: "", bio: "", estado: "", municipio: "" })
                  setProfessions([])
                  fetchMachines()
                  setIsNewProfileModalOpen(true)
                }}
              >
                <UserRound className="h-4 w-4" />
                {t("menuProfile", "Perfil")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/comunidades")}>
                <Users className="h-4 w-4" />
                {t("menuCommunity", "Comunidade")}
              </DropdownMenuItem>
              {/* "Curso" saiu daqui: cursos agora nascem DENTRO de um subperfil
                  pago (regra Alex 2026-07-01). Criar curso é pelo "+" do
                  subperfil, não pelo nível do user. */}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        <HoverHint id="account-counter-profiles" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">{t("countProfiles", "Perfis")}</span>
            <span className="font-semibold tabular-nums text-[#F5F1E8]">{totalProfiles}</span>
          </span>
        </HoverHint>
        <HoverHint id="account-counter-visible" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">{t("countVisible", "Visíveis")}</span>
            <span className="font-semibold tabular-nums text-[#F5F1E8]">{visibleProfiles}</span>
          </span>
        </HoverHint>
        <HoverHint id="account-counter-clans" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">{t("countCommunities", "Comunidades")}</span>
            <span className="font-semibold tabular-nums text-[#F5F1E8]">{myCommunities.length}</span>
          </span>
        </HoverHint>
        <HoverHint id="account-counter-following" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">{t("countFollowing", "Acompanhando")}</span>
            <span className="font-semibold tabular-nums text-[#F5F1E8]">{followedProfilesCount}</span>
          </span>
        </HoverHint>
        <HoverHint id="account-counter-unread" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">{t("countUnread", "Não lidas")}</span>
            <span
              className={`font-semibold tabular-nums ${unreadMessages > 0 ? "text-[#F2B705]" : "text-[#F5F1E8]"}`}
            >
              {unreadMessages}
            </span>
          </span>
        </HoverHint>
      </RetractableProfileHeader>
      <main className="container mx-auto px-0 py-10 md:px-4 md:py-12 overflow-x-hidden">
        <div className="mx-auto grid w-full min-w-0 max-w-[1100px] gap-5 md:gap-6">
          <article
            ref={headcardRef}
            className="min-w-0 overflow-hidden rounded-2xl fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] max-md:rounded-none max-md:border-x-0 max-md:shadow-none"
          >
            <div className="relative h-40 overflow-hidden bg-[#1d1810] md:h-52">
              {manifestation?.active?.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={manifestation.active.banner_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(242,183,5,0.28),transparent_36%),linear-gradient(135deg,#1d1810,#141009)]" />
              )}

              {/* sininho de notificações (só na /account) + configurações */}
              <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                <NotificationBell />
                <button
                  type="button"
                  onClick={() => setDropsideOpen(true)}
                  aria-label={t("openAccountMenu", "Abrir menu da conta")}
                  aria-haspopup="dialog"
                  aria-expanded={dropsideOpen}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#F2B705] active:translate-x-px active:translate-y-px"
                  title={t("openSettings", "Abrir configurações")}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>

            </div>

            <div className="relative px-5 pb-6 md:px-7">
              <div className="relative z-10 -mt-12 flex items-end justify-between gap-4 md:gap-6">
                <div className="flex min-w-0 flex-1 items-end gap-4 md:gap-6">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    aria-label={t("changeAvatar", "Trocar foto de perfil")}
                    title={t("changeAvatar", "Trocar foto de perfil")}
                    className="group relative flex aspect-[4/5] w-24 shrink-0 -rotate-3 items-center justify-center overflow-hidden rounded-xl border-4 border-[#F1EDE2] bg-[#F2B705]/15 shadow-[6px_6px_0_0_#F2B705] ring-2 ring-[#0B0B0D] transition-transform duration-300 hover:rotate-0 md:w-28"
                  >
                    <Avatar className="h-full w-full rounded-none">
                      {perfil.avatar && (
                        <AvatarImage
                          src={perfil.avatar}
                          alt={perfil.nome}
                          className="rounded-none object-cover"
                        />
                      )}
                      <AvatarFallback className="rounded-none bg-[#F2B705]/15 text-2xl font-semibold text-[#0B0B0D]">
                        {getInitials(perfil.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#0B0B0D]/55 text-[#F1EDE2] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <Camera className="h-5 w-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t("changePhoto", "Trocar foto")}</span>
                    </span>
                  </button>

                  <div className="flex min-w-0 flex-col items-start gap-1.5 pb-1">
                    {/* Nome migrou pro RetractableProfileHeader. @username fica como contexto.
                        Carteira virou botão no toolbar (junto de Métricas/Gerenciar). */}
                    {perfil.username && (
                      <p className="text-sm font-medium text-[#5b554b]">@{perfil.username}</p>
                    )}
                  </div>
                </div>

                {/* Casa Views (ticket) — lado direito */}
                <div className="flex shrink-0 flex-col items-center pb-1">
                  <Link
                    href="/acasaviews/rankings"
                    aria-label={t("casaViewsRankingsAria", "Ver os rankings da Casa Views")}
                    title={t("casaViewsRankings", "Rankings da Casa Views")}
                    className="group -rotate-2 transition-transform duration-200 hover:rotate-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/casaviews/profile/casa-views-ticket.webp"
                      alt="Casa Views"
                      className="w-[112px] select-none drop-shadow-[3px_4px_6px_rgba(0,0,0,0.35)] transition-[filter] group-hover:drop-shadow-[4px_6px_10px_rgba(216,169,40,0.45)] md:w-[128px]"
                    />
                  </Link>
                </div>
              </div>

              {perfil.bio && (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#2b2b2e]">
                  {perfil.bio}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {manifestation?.active && (
                  <HoverHint id="account-manifestation-tag" side="bottom">
                    <ManifestationBadge label={manifestation.active.tag_label} size="lg" />
                  </HoverHint>
                )}
                {perfil.statuses?.filter((s) => !String(s.desc_status || "").toLowerCase().includes("email")).map((status) => (
                  <span
                    key={status.id_status}
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.04] px-2.5 py-1 text-[11px] font-bold text-[#2b2b2e]"
                  >
                    {status.desc_status.replace(/_/g, " ")}
                  </span>
                ))}
                {/* Botão Parental: sempre presente. Menor → pedir permissão; adulto → painel. */}
                <HoverHint
                  id={perfil.is_minor === true ? "account-parental-supervised" : "account-parental"}
                  side="bottom"
                >
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        perfil.is_minor === true
                          ? "/account/parental/request"
                          : "/account/parental"
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#E0A500]/60 bg-[#F2B705]/15 px-2.5 py-1 text-[11px] font-bold text-[#8a6d00] transition hover:bg-[#F2B705]/30"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {perfil.is_minor === true ? t("supervised", "Supervisionada") : t("parental", "Parental")}
                  </button>
                </HoverHint>
                {perfil.coupon_code ? (
                  <HoverHint id="account-coupon" side="bottom">
                    <button
                      onClick={() => handleCopyCoupon(perfil.coupon_code!)}
                      data-tour="account-coupon"
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-[#E0A500]/60 bg-[#F2B705]/12 px-2.5 py-1 font-mono text-[11px] font-bold tracking-widest text-[#8a6d00] transition hover:bg-[#F2B705]/25"
                    >
                      {couponCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {perfil.coupon_code}
                    </button>
                  </HoverHint>
                ) : (
                  <HoverHint id="account-coupon-generate" side="bottom">
                    <button
                      type="button"
                      onClick={handleGenerateCoupon}
                      disabled={isGeneratingCoupon}
                      data-tour="account-coupon"
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0B0B0D]/25 bg-[#0B0B0D]/[0.04] px-2.5 py-1 text-[11px] font-bold text-[#2b2b2e] transition hover:bg-[#F2B705]/20 disabled:opacity-50"
                    >
                      {isGeneratingCoupon ? t("generating", "Gerando...") : t("generateCoupon", "Gerar cupom")}
                    </button>
                  </HoverHint>
                )}
              </div>

              {/* Toolbar retrátil: botão de ferramentas expande a fila de ícones
                  (hover abre, click alterna — mesmo comportamento da engrenagem
                  do subperfil). Botões só-ícone; o nome vive no title/aria. */}
              <div
                className="mt-5 flex flex-wrap items-center gap-3 text-[13px] text-[#2b2b2e]"
                onMouseEnter={() => setToolsOpen(true)}
                onMouseLeave={() => setToolsOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setToolsOpen((v) => !v)}
                  aria-expanded={toolsOpen}
                  aria-label={toolsOpen ? t("toolsClose", "Fechar ferramentas") : t("toolsButton", "Ferramentas")}
                  title={toolsOpen ? t("toolsClose", "Fechar ferramentas") : t("toolsButton", "Ferramentas")}
                  className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#ffc81f] active:scale-[0.96]"
                >
                  <Wrench className="h-4 w-4" />
                  {unreadMessages > 0 && !toolsOpen && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#F1EDE2]" />
                  )}
                </button>
                <div
                  aria-hidden={!toolsOpen}
                  className={`flex items-center gap-3 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out ${
                    toolsOpen
                      ? "max-w-[640px] translate-x-0 opacity-100"
                      : "pointer-events-none max-w-0 -translate-x-1 opacity-0"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => router.push("/mensagens?tab=os")}
                    aria-label={t("openMessages", "Abrir mensagens")}
                    className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] transition hover:bg-[#F2B705]/20"
                    title={t("messages", "Mensagens")}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {unreadMessages > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#E0A500] ring-2 ring-[#F1EDE2]" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/account/xp")}
                    aria-label={t("viewMetricsAria", "Ver métricas e XP")}
                    title={t("metrics", "Métricas")}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] transition hover:bg-[#F2B705]/20"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/account/gerenciamento")}
                    aria-label={t("mgmtButtonAria", "Gerenciamento da conta: subperfis, serviços, cursos e produtos")}
                    title={t("mgmtButton", "Gerenciar")}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] transition hover:bg-[#F2B705]/20"
                  >
                    <FolderCog className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/wallet")}
                    aria-label={t("openWallet", "Abrir minha Carteira")}
                    title={t("myWallet", "Minha Carteira")}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] transition hover:bg-[#F2B705]/20"
                  >
                    <Wallet className="h-4 w-4" />
                  </button>
                  {dataApiOn && (
                    <button
                      type="button"
                      onClick={() => setDataConnOpen(true)}
                      aria-label={t("dataApiAria", "Conexões de Dados: gerar token de API para ler os dados da conta")}
                      title={t("dataApi", "Conexões de Dados")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] transition hover:bg-[#F2B705]/20"
                    >
                      <Database className="h-4 w-4" />
                    </button>
                  )}
                  {atendimentoIaOn && (
                    <button
                      type="button"
                      onClick={() => router.push("/account/atendimento-ia")}
                      aria-label={t("atendimentoIaAria", "Atendimento IA: bot que responde suas conversas")}
                      title={t("atendimentoIa", "Atendimento IA")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] transition hover:bg-[#F2B705]/20"
                    >
                      <Bot className="h-4 w-4" />
                    </button>
                  )}
                  {academiasOn && (
                    <button
                      type="button"
                      onClick={() => router.push("/fitness")}
                      aria-label={t("fitnessAria", "Painel fitness: calorias, água, peso e treinos")}
                      title={t("fitnessTool", "Fitness")}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] transition hover:bg-[#F2B705]/20"
                    >
                      <Dumbbell className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setFollowingModalOpen(true)}
                  className="tabular-nums rounded-md px-1 transition hover:bg-[#0B0B0D]/[0.06]"
                  title={t("seeWhoYouFollow", "Ver quem você acompanha")}
                >
                  <span className="font-bold text-[#0B0B0D]">{followedProfilesCount}</span>{" "}
                  <span className="text-[#5b554b]">{t("followingLabel", "acompanhados")}</span>
                </button>
              </div>
            </div>
          </article>
          {/* Portfólio do user account — agora com 5 abas (Portfólio | Bees | Cursos | Perfis | Clans) */}
          <UserPortfolio
            coursesProfileOptions={(perfil.profiles || [])
              .filter((p) => !p.is_clan)
              .map((p) => ({
                id: p.id_profile,
                name: p.display_name || t("unnamedProfile", "Perfil sem nome"),
              }))}
            myProfilesSlot={
              <div className="space-y-4">
            <div>
              {perfil.profiles && perfil.profiles.filter((p) => !p.is_clan).length > 0 ? (
                <div className="grid grid-cols-3 gap-px">
                  {perfil.profiles.filter((p) => !p.is_clan).map((profile) => {
                    const isPaid = !!profile.is_paid
                    const isVisible = profile.is_visible !== false
                    const isPublished = !!profile.is_published
                    const imgSrc = profile.avatar_url || perfil?.avatar || null
                    const hasNotification = !!profileBadges[profile.id_profile]
                    const hasManifestation = !!manifestation?.active
                    const manifestationApplied = !!manifestation?.applied_profile_ids?.includes(profile.id_profile)
                    return (
                      <div key={profile.id_profile} className="group relative">
                        <button
                          type="button"
                          onClick={() => router.push(`/account/profile/${profile.id_profile}`)}
                          className={`relative block aspect-[4/5] w-full overflow-hidden border border-[#F5F1E8]/10 bg-[#F5F1E8]/[0.03] transition cursor-pointer ${
                            hasNotification
                              ? "animate-pulse ring-2 ring-red-500"
                              : ""
                          }`}
                          aria-label={t("openProfileAria", "Abrir perfil {name}").replace("{name}", profile.display_name)}
                        >
                          {imgSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imgSrc}
                              alt={profile.display_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#F5F1E8]/40">
                              {getInitials(profile.display_name)}
                            </div>
                          )}
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"
                          />
                          {manifestationApplied && (
                            <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 backdrop-blur-sm">
                              <Sparkles className="h-3 w-3" />
                              {t("manifestationWord", "Manifestacao")}
                            </span>
                          )}
                        </button>

                        {/* Engrenagem (canto superior esquerdo) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="absolute top-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 text-white/85 backdrop-blur-sm transition hover:bg-zinc-950"
                              aria-label={t("profileActions", "Ações do perfil")}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuItem onClick={() => router.push(`/account/profile/${profile.id_profile}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("manageProfile", "Gerenciar perfil")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/account/profile/${profile.id_profile}/agenda`)}>
                              <CalendarDays className="h-4 w-4 mr-2" />
                              {t("agenda", "Agenda")}
                            </DropdownMenuItem>
                            {!isPaid && (
                              <DropdownMenuItem onClick={() => router.push(`/payment/taxa?profile_id=${profile.id_profile}`)}>
                                <Briefcase className="h-4 w-4 mr-2" />
                                {t("activateProfile", "Ativar perfil")}
                              </DropdownMenuItem>
                            )}
                            {isPaid && (
                              <DropdownMenuItem
                                disabled={togglingVisibility === profile.id_profile}
                                onClick={() => handleToggleVisibility(profile.id_profile, !isVisible)}
                              >
                                {isVisible ? (
                                  <><EyeOff className="h-4 w-4 mr-2" /> {t("makeInvisible", "Deixar invisível")}</>
                                ) : (
                                  <><Eye className="h-4 w-4 mr-2" /> {t("makeVisible", "Tornar visível")}</>
                                )}
                              </DropdownMenuItem>
                            )}
                            {hasManifestation && (
                              <DropdownMenuItem
                                onClick={() => handleToggleManifestationProfile(profile.id_profile, !manifestationApplied)}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                {manifestationApplied ? t("removeManifestation", "Remover Manifestacao") : t("applyManifestation", "Aplicar Manifestacao")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={deletingProfile === profile.id_profile}
                              onClick={() => handleDeleteProfile(profile.id_profile)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("delete", "Excluir")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Coroa: comprar premium (canto superior esquerdo, ao lado da engrenagem) */}
                        {isPaid && (
                          <button
                            type="button"
                            onClick={() => setPremiumProfile({ id: profile.id_profile, name: profile.display_name || undefined })}
                            className="absolute top-2 left-12 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300/95 text-zinc-900 backdrop-blur-sm transition hover:bg-amber-200 shadow-[0_4px_12px_-2px_rgba(251,191,36,0.55)]"
                            aria-label={t("makePremium", "Tornar perfil premium")}
                            title={t("makePremium", "Tornar perfil premium")}
                          >
                            <Crown className="h-3.5 w-3.5 fill-zinc-900" />
                          </button>
                        )}

                        {/* Status badge (canto superior direito) */}
                        <div className="absolute top-2 right-2 pointer-events-none">
                          {!isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 backdrop-blur-sm">
                              {t("statusWaiting", "Aguardando")}
                            </span>
                          ) : isPublished ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                              {t("statusVisible", "Visível")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm">
                              {t("statusInvisible", "Invisível")}
                            </span>
                          )}
                        </div>

                        <p className="px-1 pt-1.5 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-[#F5F1E8] md:text-sm">
                          <UserRound className="h-3 w-3 text-primary/80" />
                          <span className="truncate">{profile.display_name}</span>
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-[#F5F1E8]/15 bg-[#F5F1E8]/[0.02] py-12 text-center">
                  <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#F2B705]/15">
                    <User className="h-8 w-8 text-[#F2B705]" />
                  </div>
                  <p className="fl-display text-xl text-[#F5F1E8]">{t("noProfileCreated", "Nenhum perfil criado")}</p>
                  <p className="mt-1 mb-5 text-sm text-[#9A938A]">{t("createFirstProfile", "Crie seu primeiro perfil para começar")}</p>
                  <button
                    type="button"
                    onClick={() => { setNewProfileError(null); setNewProfileForm({ id_machine: "", id_category: "", display_name: "", bio: "", estado: "", municipio: "" }); setProfessions([]); fetchMachines(); setIsNewProfileModalOpen(true) }}
                    className="fl-btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    {t("createProfile", "Criar Perfil")}
                  </button>
                </div>
              )}
            </div>
              </div>
            }
            myClansSlot={
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Link
                    href="/search?tab=communities"
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#F5F1E8]/25 px-4 py-2 text-[13px] font-bold text-[#F5F1E8] transition hover:border-[#F2B705] hover:text-[#F2B705]"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {t("browseByEnxame", "Buscar por enxame")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
            <div>
              {myCommunities.length > 0 ? (
                <div className="grid grid-cols-2 gap-px bg-white/[0.03] sm:grid-cols-3 lg:grid-cols-4">
                  {myCommunities.map((c) => (
                    <CommunityTile key={c.id_profile} community={c} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-[#F5F1E8]/15 bg-[#F5F1E8]/[0.02] p-8 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-[#9A938A]" />
                  <p className="text-sm text-[#9A938A]">
                    {t("noCommunitiesYet", "Você ainda não participa de nenhuma comunidade.")}
                  </p>
                  <Link href="/comunidades" className="mt-2 inline-block text-sm font-bold text-[#F2B705] hover:underline">
                    {t("createOrJoinCommunity", "Criar ou entrar em uma comunidade")}
                  </Link>
                </div>
              )}
            </div>
              </div>
            }
          />

        </div>
      </main>

      <UserDropside
        open={dropsideOpen}
        onClose={() => setDropsideOpen(false)}
        user={perfil}
        unreadServiceRequest={srBadge.has_new || srBadge.unread_chats > 0}
        onLogout={handleLogout}
      />

      {/* Modal de Novo Perfil */}
      <Dialog open={isNewProfileModalOpen} onOpenChange={(open) => { if (!open) setNewProfileError(null); setIsNewProfileModalOpen(open) }}>
        <DialogContent className="fl-root fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">{t("createNewProfile", "Criar novo perfil")}</DialogTitle>
            <DialogDescription className="text-[#5b554b]">
              {t("createProfileDescBefore", "O perfil é criado como")} <strong className="text-[#0B0B0D]">{t("awaitingActivation", "Aguardando ativação")}</strong>. {t("createProfileDescAfter", "Ele só aparece nos classificados após você ativar esse perfil.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label htmlFor="np-display-name" className="fl-label">{t("displayNameLabel", "Nome de exibição")} <span className="text-[#b91c1c]">*</span></label>
              <input
                id="np-display-name"
                className="fl-input"
                placeholder={t("displayNamePlaceholder", "Como você quer ser chamado...")}
                value={newProfileForm.display_name}
                onChange={(e) => setNewProfileForm((prev) => ({ ...prev, display_name: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="np-machine" className="fl-label">{t("machineLabel", "Enxame")} <span className="text-[#b91c1c]">*</span></label>
              <select
                id="np-machine"
                className="fl-input"
                value={newProfileForm.id_machine}
                onChange={(e) => handleNewProfileMachineChange(e.target.value)}
                disabled={loadingMachines}
              >
                <option value="" disabled>{loadingMachines ? t("loading", "Carregando...") : t("selectMachine", "Selecione um enxame")}</option>
                {machines.map((m) => (
                  <option key={m.id_machine} value={String(m.id_machine)}>{tx.enxame(m.slug, m.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="np-profession" className="fl-label">{t("professionLabel", "Profissão")} <span className="text-[#b91c1c]">*</span></label>
              <select
                id="np-profession"
                className="fl-input"
                value={newProfileForm.id_category}
                onChange={(e) => setNewProfileForm((prev) => ({ ...prev, id_category: e.target.value }))}
                disabled={!newProfileForm.id_machine || loadingProfessions}
              >
                <option value="" disabled>
                  {!newProfileForm.id_machine
                    ? t("selectMachineFirst", "Selecione um enxame primeiro")
                    : loadingProfessions
                      ? t("loading", "Carregando...")
                      : t("selectProfession", "Selecione uma profissão")}
                </option>
                {professions.map((p) => (
                  <option key={p.id_category} value={String(p.id_category)}>{tx.profession(p.desc_category)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="np-bio" className="fl-label">{t("bioLabel", "Bio")}</label>
              <textarea
                id="np-bio"
                placeholder={t("bioPlaceholderShort", "Fale um pouco sobre você...")}
                value={newProfileForm.bio}
                onChange={(e) => setNewProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="fl-input max-h-36 resize-none overflow-y-auto"
                style={{ wordBreak: "break-all", overflowWrap: "break-word" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="np-estado" className="fl-label">{t("stateLabel", "Estado")}</label>
                <select
                  id="np-estado"
                  className="fl-input"
                  value={newProfileForm.estado}
                  onChange={(e) => handleNewProfileEstadoChange(e.target.value)}
                >
                  <option value="" disabled>{t("select", "Selecione")}</option>
                  {estados.map((e) => (
                    <option key={e.uf} value={e.uf}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="np-municipio" className="fl-label">{t("cityLabel", "Município")}</label>
                <select
                  id="np-municipio"
                  className="fl-input"
                  value={newProfileForm.municipio}
                  onChange={(e) => setNewProfileForm((prev) => ({ ...prev, municipio: e.target.value }))}
                  disabled={!newProfileForm.estado || loadingNewProfileMunicipios}
                >
                  <option value="" disabled>{loadingNewProfileMunicipios ? t("loading", "Carregando...") : t("select", "Selecione")}</option>
                  {newProfileMunicipios.map((m) => (
                    <option key={m.id} value={m.nome}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            {newProfileError && (
              <p className="text-sm font-medium text-[#b91c1c]">{newProfileError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="fl-btn-card rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={() => setIsNewProfileModalOpen(false)} disabled={isCreatingProfile}>
                {t("cancel", "Cancelar")}
              </button>
              <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={handleCreateProfile} disabled={isCreatingProfile}>
                {isCreatingProfile ? t("creating", "Criando...") : t("createProfileButton", "Criar perfil")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Adicionar/Editar Rede Social */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setNovaRede({ id: "", platform: "", account: "", followers_range: "" })
          setIsEditing(false)
        }
        setIsModalOpen(open)
      }}>
        <DialogContent className="fl-root fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">{isEditing ? t("editSocial", "Editar rede social") : t("addSocial", "Adicionar rede social")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="platform" className="fl-label">{t("platformLabel", "Plataforma")}</label>
              <select
                id="platform"
                className="fl-input"
                value={novaRede.platform}
                onChange={(e) => setNovaRede({ ...novaRede, platform: e.target.value })}
              >
                <option value="" disabled>{t("selectPlatform", "Selecione a plataforma")}</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>

            <div>
              <label htmlFor="account" className="fl-label">{t("handleLabel", "Usuário/Handle")}</label>
              <input
                id="account"
                className="fl-input"
                placeholder={t("handlePlaceholder", "@usuario")}
                value={novaRede.account}
                onChange={(e) => setNovaRede({ ...novaRede, account: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="followers" className="fl-label">{t("followersLabel", "Seguidores")}</label>
              <select
                id="followers"
                className="fl-input"
                value={novaRede.followers_range}
                onChange={(e) => setNovaRede({ ...novaRede, followers_range: e.target.value })}
              >
                <option value="" disabled>{t("selectFollowersRange", "Selecione a faixa de seguidores")}</option>
                <option value="0-10k">0 - 10k</option>
                <option value="10k-50k">10k - 50k</option>
                <option value="50k-200k">50k - 200k</option>
                <option value="200k-1M">200k - 1M</option>
                <option value="1M+">1M+</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <button type="button" className="fl-btn-card rounded-full px-4 py-2 text-sm font-bold" onClick={() => {
              setNovaRede({ id: "", platform: "", account: "", followers_range: "" })
              setIsEditing(false)
              setIsModalOpen(false)
            }}>
              {t("cancel", "Cancelar")}
            </button>
            <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold" onClick={handleAdicionarRede}>
              {isEditing ? t("update", "Atualizar") : t("add", "Adicionar")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de Avatar */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="fl-root fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">{t("changeAvatarTitle", "Alterar avatar")}</DialogTitle>
          </DialogHeader>

          {!fotoTemp ? (
            <div className="space-y-6 py-4">
              {/* Avatar Atual ou Iniciais */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-[#0B0B0D] bg-[radial-gradient(circle_at_30%_25%,rgba(242,183,5,0.35),transparent_60%),#1d1810] shadow-[4px_4px_0_0_#0B0B0D]">
                  {perfil?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={perfil.avatar || "/placeholder.svg"}
                      alt={perfil.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl font-bold text-[#F5F1E8]">{getInitials(perfil?.nome || "")}</span>
                  )}
                </div>
                <p className="text-center text-sm text-[#5b554b]">{t("currentAvatar", "Avatar atual")}</p>
              </div>

              {/* Input de Arquivo */}
              <div className="space-y-3">
                <label htmlFor="avatar-input" className="fl-label">{t("selectNewImage", "Selecionar nova imagem")}</label>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFotoChange}
                  className="hidden"
                  ref={(input) => {
                    if (input) {
                      (window as any).avatarInput = input
                    }
                  }}
                />
                <button
                  type="button"
                  className="fl-btn-card w-full rounded-full px-4 py-2.5 text-sm font-bold"
                  onClick={() => {
                    const input = document.getElementById("avatar-input") as HTMLInputElement
                    input?.click()
                  }}
                >
                  {t("chooseFile", "Escolher arquivo")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Preview Circular */}
              <div className="flex flex-col items-center gap-4">
                <div
                  className="relative h-48 w-48 flex-shrink-0 cursor-move overflow-hidden rounded-full border-4 border-[#0B0B0D] bg-[#1d1810] shadow-[4px_4px_0_0_#0B0B0D]"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imageRef}
                    src={fotoTemp || "/placeholder.svg"}
                    alt={t("preview", "Preview")}
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoom})`,
                    }}
                  />
                </div>
                <p className="text-center text-xs text-[#5b554b]">{t("dragToPosition", "Arraste para posicionar")}</p>
              </div>

              {/* Zoom Slider */}
              <div className="space-y-3">
                <div className="flex items-center gap-4 px-2">
                  <ZoomOut className="h-4 w-4 flex-shrink-0 text-[#5b554b]" />
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    min={1}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                  <ZoomIn className="h-4 w-4 flex-shrink-0 text-[#5b554b]" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-3">
            {fotoTemp && (
              <button type="button" className="fl-btn-card rounded-full px-4 py-2 text-sm font-bold" onClick={handleCancelUpload}>
                {t("back", "Voltar")}
              </button>
            )}
            {fotoTemp ? (
              <button type="button" className="fl-btn-gold flex-1 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 sm:flex-none" onClick={handleConfirmUpload} disabled={isUploadingAvatar}>
                {isUploadingAvatar ? t("saving", "Salvando...") : t("saveAvatar", "Salvar avatar")}
              </button>
            ) : (
              <button type="button" className="fl-btn-card flex-1 rounded-full px-4 py-2 text-sm font-bold sm:flex-none" onClick={() => setIsUploadModalOpen(false)}>
                {t("cancel", "Cancelar")}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {avatarFile && !isUploadModalOpen && (
        <MediaCropModal
          file={avatarFile}
          aspectRatio={AVATAR_IMAGE_ASPECT_RATIO}
          outputWidth={AVATAR_IMAGE_OUTPUT.width}
          outputHeight={AVATAR_IMAGE_OUTPUT.height}
          maxSizeMB={2}
          mediaType="profile_avatar"
          title={t("adjustAvatarTitle", "Ajustar foto de perfil")}
          description={t("adjustAvatarDesc", "Ajuste sua foto de perfil.")}
          onCancel={() => setAvatarFile(null)}
          onConfirm={handleUserAvatarCropConfirm}
        />
      )}

      {/* Modal de Edição de Perfil */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="fl-root max-h-[90vh] overflow-y-auto fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">{t("editProfileTitle", "Editar perfil")}</DialogTitle>
            <DialogDescription className="text-[#5b554b]">
              {t("editProfileDesc", "Atualize seus dados pessoais e veja o status da sua conta.")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Seção: Conta & Verificação (migrado do headcard) */}
            <div className="space-y-3 rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5b554b]">
                  {t("accountVerification", "Conta & Verificação")}
                </div>
                {emailVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-700/30 bg-emerald-600/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    <BadgeCheck className="h-3 w-3" />
                    {t("emailVerified", "Email verificado")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#E0A500]/40 bg-[#F2B705]/15 px-2.5 py-1 text-[11px] font-bold text-[#8a6d00]">
                    <AlertCircle className="h-3 w-3" />
                    {t("emailNotVerified", "Não verificado")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label htmlFor="edit-email" className="fl-label">{t("emailLabel", "Email")}</label>
                  <input
                    id="edit-email"
                    type="email"
                    value={perfil.email || ""}
                    readOnly
                    disabled
                    className="fl-input"
                  />
                </div>
                {!emailVerified && (
                  <Link
                    href="/verificar-email"
                    className="fl-btn-gold inline-flex h-11 items-center justify-center rounded-xl px-4 text-[12px] font-bold"
                  >
                    {t("verifyNow", "Verificar agora")}
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-[#8a8275]">
                {t("emailLoginNote", "O email é usado para login e não pode ser alterado por aqui.")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-nome" className="fl-label">{t("nameLabel", "Nome")}</label>
                <input
                  id="edit-nome"
                  className="fl-input"
                  placeholder={t("fullNamePlaceholder", "Seu nome completo")}
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="edit-username" className="fl-label">{t("usernameLabel", "Nome de usuário")}</label>
                <input
                  id="edit-username"
                  placeholder={t("usernamePlaceholder", "ex: joao.silva")}
                  value={editForm.username}
                  onChange={(e) => handleEditUsernameChange(e.target.value)}
                  maxLength={30}
                  className={`fl-input ${editUsernameStatus === "taken" || editUsernameStatus === "invalid" ? "fl-input-error" : editUsernameStatus === "available" ? "fl-input-ok" : ""}`}
                />
                {editUsernameMsg && (
                  <p className={`mt-1 text-xs font-bold ${
                    editUsernameStatus === "taken" || editUsernameStatus === "invalid"
                      ? "text-[#b91c1c]"
                      : editUsernameStatus === "available"
                      ? "text-emerald-700"
                      : "text-[#5b554b]"
                  }`}>
                    {editUsernameStatus === "checking" ? t("checking", "Verificando...") : editUsernameMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="data_nascimento" className="fl-label">{t("birthDateLabel", "Data de nascimento")}</label>
                <input
                  id="data_nascimento"
                  type="date"
                  className="fl-input"
                  value={editForm.idade}
                  onChange={(e) => setEditForm({ ...editForm, idade: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="sexo" className="fl-label">{t("genderLabel", "Sexo")}</label>
                <select
                  id="sexo"
                  className="fl-input"
                  value={editForm.sexo}
                  onChange={(e) => setEditForm({ ...editForm, sexo: e.target.value })}
                >
                  <option value="" disabled>{t("select", "Selecione")}</option>
                  <option value="M">{t("genderMale", "Masculino")}</option>
                  <option value="F">{t("genderFemale", "Feminino")}</option>
                  <option value="O">{t("genderOther", "Outros")}</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="fl-label">{t("phoneLabel", "Telefone")}</label>
              <input
                id="telefone"
                className="fl-input"
                placeholder={t("phonePlaceholder", "Seu telefone")}
                value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="estado" className="fl-label">{t("stateLabel", "Estado")}</label>
                <select
                  id="estado"
                  className="fl-input"
                  value={editForm.estado}
                  onChange={(e) => handleEstadoChange(e.target.value)}
                >
                  <option value="" disabled>{t("select", "Selecione")}</option>
                  {estados.map((estado) => (
                    <option key={estado.uf} value={estado.uf}>{estado.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="municipio" className="fl-label">{t("cityLabel", "Município")}</label>
                <select
                  id="municipio"
                  className="fl-input"
                  value={editForm.municipio}
                  onChange={(e) => setEditForm({ ...editForm, municipio: e.target.value })}
                  disabled={loadingMunicipios}
                >
                  <option value="" disabled>{t("select", "Selecione")}</option>
                  {municipios.map((municipio) => (
                    <option key={municipio.id} value={municipio.nome}>{municipio.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="fl-label">{t("bioLabel", "Bio")}</label>
              <textarea
                id="bio"
                className="fl-input min-h-[80px] resize-none"
                placeholder={t("bioPlaceholder", "Fale sobre você...")}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>

            {/* Seção: Redes Sociais do user (aparecem no headcard do username).
                Espelha o que o onboarding salva — fica aqui pra quem pulou o
                primeiro modal poder cadastrar/editar depois. */}
            <div className="space-y-3 rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5b554b]">
                    {t("socialNetworks", "Redes Sociais")}
                  </div>
                  <p className="mt-1 text-[11px] text-[#8a8275]">
                    {t("socialNetworksUserHint", "Aparecem no seu perfil principal (username).")}
                  </p>
                </div>
                <button
                  type="button"
                  className="fl-btn-card inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold"
                  onClick={() => {
                    setNovaRede({ id: "", platform: "", account: "", followers_range: "" })
                    setIsEditing(false)
                    setIsModalOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("add", "Adicionar")}
                </button>
              </div>
              {perfil.redes_sociais && perfil.redes_sociais.length > 0 ? (
                <div className="space-y-2">
                  {perfil.redes_sociais.map((rede) => renderRedeSocial(rede))}
                </div>
              ) : (
                <p className="text-[11px] text-[#8a8275]">{t("noSocialNetworks", "Sem redes sociais cadastradas.")}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <button type="button" className="fl-btn-card rounded-full px-4 py-2 text-sm font-bold" onClick={() => setIsEditModalOpen(false)}>
              {t("cancel", "Cancelar")}
            </button>
            <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? t("saving", "Salvando...") : t("save", "Salvar")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de Portfólio */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={setIsPortfolioModalOpen}>
        <DialogContent className="fl-root fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">{t("addPortfolioMedia", "Adicionar mídia ao portfólio")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!uploadingMedia ? (
              <div className="cursor-pointer rounded-xl border-2 border-dashed border-[#0B0B0D]/30 p-8 text-center transition-colors hover:border-[#E0A500] hover:bg-[#F2B705]/[0.06]" onClick={() => document.getElementById("media-input")?.click()}>
                <Upload className="mx-auto mb-2 h-8 w-8 text-[#8a6d00]" />
                <p className="font-bold text-[#0B0B0D]">{t("clickOrDragMedia", "Clique para adicionar ou arraste uma imagem/vídeo")}</p>
                <p className="text-sm text-[#5b554b]">{t("maxMediaSize", "Máximo 100MB")}</p>
                <input id="media-input" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={handleMediaSelect} className="hidden" />
              </div>
            ) : (
              <>
                <div className={`relative overflow-hidden rounded-xl border-2 border-[#0B0B0D]/15 bg-[#1d1810] ${selectedMediaType === "image" ? "aspect-[4/5]" : "aspect-video"}`}>
                  {selectedMediaType === "image" ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadingMedia.preview || "/placeholder.svg"} alt={t("preview", "Preview")} className="w-full h-full object-cover" />
                      {originalUploadImage && (
                        <button
                          type="button"
                          onClick={() => setMediaCropFile(originalUploadImage)}
                          className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/85"
                        >
                          {t("cropImage", "Cortar imagem")}
                        </button>
                      )}
                    </>
                  ) : (
                    <video src={uploadingMedia.preview} className="w-full h-full object-cover" controls />
                  )}
                </div>

                <div>
                  <label htmlFor="media-title" className="fl-label">{t("titleLabel", "Título")}</label>
                  <input
                    id="media-title"
                    className="fl-input"
                    placeholder={t("projectTitlePlaceholder", "Título do projeto")}
                    value={portfolioForm.title}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="media-description" className="fl-label">{t("descriptionLabel", "Descrição")}</label>
                  <textarea
                    id="media-description"
                    className="fl-input min-h-[80px] resize-none"
                    placeholder={t("projectDescriptionPlaceholder", "Descreva seu projeto...")}
                    value={portfolioForm.description}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="media-link" className="fl-label">{t("externalLinkLabel", "Link externo (opcional)")}</label>
                  <input
                    id="media-link"
                    className="fl-input"
                    placeholder={t("externalLinkPlaceholder", "https://exemplo.com")}
                    value={portfolioForm.external_link}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, external_link: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              className="fl-btn-card rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50"
              onClick={() => {
                setUploadingMedia(null)
                setPortfolioForm({ title: "", description: "", external_link: "" })
                setIsPortfolioModalOpen(false)
              }}
              disabled={mediaUploadProgress !== "idle"}
            >
              {t("cancel", "Cancelar")}
            </button>
            {!uploadingMedia ? (
              <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold opacity-50" disabled>{t("next", "Próximo")}</button>
            ) : (
              <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={handleUploadMedia} disabled={mediaUploadProgress !== "idle"}>
                {mediaUploadProgress === "idle" ? t("send", "Enviar") : mediaUploadProgress === "uploading" ? t("uploading", "Enviando...") : t("processing", "Processando...")}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mediaCropFile && (
        <MediaCropModal
          file={mediaCropFile}
          aspectRatio={POST_IMAGE_ASPECT_RATIO}
          outputWidth={POST_IMAGE_OUTPUT.width}
          outputHeight={POST_IMAGE_OUTPUT.height}
          maxSizeMB={3}
          mediaType="post_image"
          title={t("cropImage", "Cortar imagem")}
          description={t("cropImageDesc", "Corte sua imagem no formato 4:5 para aparecer melhor no feed.")}
          onCancel={() => setMediaCropFile(null)}
          onConfirm={handleUploadCropConfirm}
        />
      )}

      {/* Modal de Edição de Mídia */}
      <Dialog open={isEditMediaModalOpen} onOpenChange={setIsEditMediaModalOpen}>
        <DialogContent className="fl-root fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">{t("editMediaTitle", "Editar mídia")}</DialogTitle>
            <DialogDescription className="text-[#5b554b]">{t("editMediaDesc", "Edite as informações da sua mídia ou remova do portfólio.")}</DialogDescription>
          </DialogHeader>

          {editingMedia && (
            <div className="grid gap-4 py-4">
              <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-[#0B0B0D]/15 bg-[#1d1810]">
                {editingMedia.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editingMedia.media_url || "/placeholder.svg"} alt={editingMedia.title || t("preview", "Preview")} className="w-full h-full object-cover" />
                ) : (
                  <video src={editingMedia.media_url} className="w-full h-full object-cover" controls />
                )}
              </div>

              <div>
                <label htmlFor="edit-title" className="fl-label">{t("titleLabel", "Título")}</label>
                <input
                  id="edit-title"
                  className="fl-input"
                  placeholder={t("projectTitlePlaceholder", "Título do projeto")}
                  value={editMediaForm.title}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, title: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="edit-description" className="fl-label">{t("descriptionLabel", "Descrição")}</label>
                <textarea
                  id="edit-description"
                  className="fl-input min-h-[80px] resize-none"
                  placeholder={t("projectDescriptionPlaceholder", "Descreva seu projeto...")}
                  value={editMediaForm.description}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, description: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="edit-link" className="fl-label">{t("externalLinkLabel", "Link externo (opcional)")}</label>
                <input
                  id="edit-link"
                  className="fl-input"
                  placeholder={t("externalLinkPlaceholder", "https://exemplo.com")}
                  value={editMediaForm.external_link}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, external_link: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <button type="button" onClick={handleDeleteMedia} disabled={isSavingMedia} className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#b91c1c] bg-[#b91c1c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#a01818] disabled:opacity-50 sm:w-auto">
              <Trash2 className="h-4 w-4" />
              {t("delete", "Deletar")}
            </button>
            <div className="flex w-full gap-2 sm:w-auto">
              <button type="button" className="fl-btn-card flex-1 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 sm:flex-none" onClick={() => setIsEditMediaModalOpen(false)} disabled={isSavingMedia}>
                {t("cancel", "Cancelar")}
              </button>
              <button type="button" className="fl-btn-gold flex-1 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 sm:flex-none" onClick={handleUpdateMedia} disabled={isSavingMedia}>
                {isSavingMedia ? t("saving", "Salvando...") : t("save", "Salvar")}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Premium (comprar destaque pra um perfil) */}
      {premiumProfile && (
        <PremiumProfileModal
          open={!!premiumProfile}
          onOpenChange={(o) => { if (!o) setPremiumProfile(null) }}
          profileId={premiumProfile.id}
          profileName={premiumProfile.name}
        />
      )}

      <FollowingModal
        open={followingModalOpen}
        onClose={() => setFollowingModalOpen(false)}
      />

      <OversizeModal open={!!oversizeLabel} onClose={() => setOversizeLabel(null)} limitLabel={oversizeLabel || ""} />

      {dataApiOn && <DataConnectionsModal open={dataConnOpen} onClose={() => setDataConnOpen(false)} />}
    </div>
  )
}
