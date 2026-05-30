"use client"

import { AlertDescription } from "@/components/ui/alert"

import { AlertTitle } from "@/components/ui/alert"

import { Alert } from "@/components/ui/alert"

import React, { useRef } from "react"
import { useState } from "react"
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
import { Briefcase, Edit, Instagram, Youtube, Video, Plus, User, Camera, ZoomIn, ZoomOut, Trash2, ImageIcon, Upload, Pencil, AlertCircle, Copy, Check, CalendarDays, Settings, Users, Crown, ArrowRight, EyeOff, Eye, MessageCircle, BadgeCheck, UserRound, Sparkles, ShieldCheck } from "lucide-react"
import { ManifestationBadge } from "@/components/manifestation/ManifestationBadge"
import { HoverHint } from "@/features/tour/HoverHint"
import { UserPortfolio } from "./_components/UserPortfolio"
import { FollowingModal } from "@/components/profile/following-modal"
import { PremiumProfileModal } from "@/components/premium/PremiumProfileModal"
import { Slider } from "@/components/ui/slider"
import { AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { MediaCropModal } from "@/components/media/media-crop-modal"
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
import { UserDropside } from "@/components/layout/UserDropside"
import { useNavCounts } from "@/components/navigation/use-nav-counts"

export default function PerfilPage() {
  const router = useRouter()
  const { perfil, setPerfil, isLoading, error } = useMeProfile()
  const navCounts = useNavCounts()
  const unreadMessages = navCounts.conversationUnread
  const [dropsideOpen, setDropsideOpen] = useState(false)
  const [followedProfilesCount, setFollowedProfilesCount] = useState(0)
  const [followingModalOpen, setFollowingModalOpen] = useState(false)
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

  if (isLoading) {
    return <AccountLoading />
  }

  if (error || !perfil) {
    return <AccountError message={error || "Erro ao carregar perfil"} />
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
        alert(data.error || "Não foi possível alterar a visibilidade.")
      }
    } catch {
      alert("Erro ao alterar visibilidade.")
    } finally {
      setTogglingVisibility(null)
    }
  }

  const handleDeleteProfile = async (id_profile: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    const ok = window.confirm(
      "Tem certeza que deseja excluir este perfil? Ele não aparecerá mais para você nem para o público. O histórico de pagamentos é preservado para auditoria."
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
        alert(data.error || "Não foi possível excluir o perfil.")
      }
    } catch {
      alert("Erro ao excluir o perfil.")
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
      if (!res.ok) throw new Error(data.error || "Nao foi possivel aplicar")
      setManifestation((prev) => prev ? { ...prev, applied_profile_ids: data.applied_profile_ids || [] } : prev)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao aplicar Manifestacao")
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
      setNewProfileError("O nome de exibição é obrigatório.")
      return
    }
    if (!newProfileForm.id_machine) {
      setNewProfileError("Selecione um enxame.")
      return
    }
    if (!newProfileForm.id_category) {
      setNewProfileError("Selecione uma profissão.")
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
        setNewProfileError(resData.error || resData.message || "Erro ao criar perfil. Tente novamente.")
      }
    } catch {
      setNewProfileError("Erro ao criar perfil. Tente novamente.")
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
    if (!sexo) return "Não informado"
    const sexoUpper = sexo.toUpperCase()
    if (sexoUpper === "M") return "Masculino"
    if (sexoUpper === "F") return "Feminino"
    return "Outros"
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
      alert("Sessão expirada. Faça login novamente.")
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
        throw new Error(errorData.error || "Erro ao deletar rede social")
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
      alert(error instanceof Error ? error.message : "Erro ao deletar rede social")
    }
  }

  const uploadUserAvatarFile = async (file: File) => {
    setIsUploadingAvatar(true)

    const token = localStorage.getItem("token")
    if (!token) {
      alert("Sessão expirada. Faça login novamente.")
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
        throw new Error(errorData.error || "Erro ao atualizar avatar")
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
      alert(error instanceof Error ? error.message : "Erro ao atualizar avatar")
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
      alert("Sessão expirada. Faça login novamente.")
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
        throw new Error(errorData.error || "Erro ao atualizar avatar")
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
      alert(error instanceof Error ? error.message : "Erro ao atualizar avatar")
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
      setEditUsernameMsg("Mínimo 3 caracteres")
      return
    }
    setEditUsernameStatus("checking")
    try {
      const res = await fetch(`/api/check-username?u=${encodeURIComponent(u)}`)
      const data = await res.json()
      if (data.available) {
        setEditUsernameStatus("available")
        setEditUsernameMsg("Disponível ✓")
      } else {
        setEditUsernameStatus("taken")
        setEditUsernameMsg("Este nome já está em uso")
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
      alert("Sessão expirada. Faça login novamente.")
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
        throw new Error(errorData.error || "Erro ao salvar perfil")
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
      alert(error instanceof Error ? error.message : "Erro ao salvar perfil")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdicionarRede = async () => {
    if (!novaRede.platform || !novaRede.account || !novaRede.followers_range) {
      alert("Preencha todos os campos")
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      alert("Token não encontrado")
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
        throw new Error(errorData.error || "Erro ao salvar rede social")
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
      alert(error instanceof Error ? error.message : "Erro ao salvar rede social")
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
        errorMessage: "A imagem do post precisa ter no máximo 3MB.",
      })
      setProcessedUploadImage(processed, file)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Nao foi possivel otimizar esse arquivo. Tente outro.")
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
      alert("Por favor, selecione uma imagem ou vídeo válido")
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
      alert("O arquivo deve ter no máximo 100MB")
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
      alert("Sessão expirada. Faça login novamente.")
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
          errorData = { error: text || "Erro ao fazer upload da mídia" }
        }
        throw new Error(errorData.error || `Erro ao fazer upload (Status ${uploadResponse.status})`)
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
        throw new Error(errorData.error || "Erro ao criar item do portfólio")
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
      alert(error instanceof Error ? error.message : "Erro ao fazer upload da mídia")
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
      alert("Sessão expirada. Faça login novamente.")
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
        throw new Error("Erro ao atualizar mídia")
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
      alert("Erro ao atualizar mídia")
    } finally {
      setIsSavingMedia(false)
    }
  }

  const handleDeleteMedia = async () => {
    if (!editingMedia) return

    if (!confirm("Tem certeza que deseja deletar esta mídia?")) return

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
        throw new Error("Erro ao deletar mídia")
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
      alert("Erro ao deletar mídia")
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
  const totalClans = (perfil.profiles || []).filter((p) => p.is_clan).length

  return (
    <div className="fl-root fl-paper-texture min-h-[100dvh]">
      <RetractableProfileHeader
        targetRef={headcardRef}
        name={perfil.nome || perfil.username || ""}
        addMenu={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Criar"
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
                Post
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  window.dispatchEvent(
                    new CustomEvent("freelandoo:create", { detail: { kind: "bees" } }),
                  )
                }
              >
                <Sparkles className="h-4 w-4" />
                Bees
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
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/account/clans")}>
                <Users className="h-4 w-4" />
                Clan
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  window.dispatchEvent(
                    new CustomEvent("freelandoo:create", { detail: { kind: "curso" } }),
                  )
                }
              >
                <Crown className="h-4 w-4" />
                Curso
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        <HoverHint id="account-counter-profiles" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">Perfis</span>
            <span className="font-semibold tabular-nums text-[#F5F1E8]">{totalProfiles}</span>
          </span>
        </HoverHint>
        <HoverHint id="account-counter-visible" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">Visíveis</span>
            <span className="font-semibold tabular-nums text-[#F5F1E8]">{visibleProfiles}</span>
          </span>
        </HoverHint>
        <HoverHint id="account-counter-clans" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">Clans</span>
            <span className="font-semibold tabular-nums text-[#F5F1E8]">{totalClans}</span>
          </span>
        </HoverHint>
        <HoverHint id="account-counter-following" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">Acompanhando</span>
            <span className="font-semibold tabular-nums text-[#F5F1E8]">{followedProfilesCount}</span>
          </span>
        </HoverHint>
        <HoverHint id="account-counter-unread" side="bottom">
          <span className="inline-flex items-center gap-1">
            <span className="text-[#9A938A] uppercase tracking-wide">Não lidas</span>
            <span
              className={`font-semibold tabular-nums ${unreadMessages > 0 ? "text-[#F2B705]" : "text-[#F5F1E8]"}`}
            >
              {unreadMessages}
            </span>
          </span>
        </HoverHint>
      </RetractableProfileHeader>
      <main className="container mx-auto px-4 py-10 md:py-12">
        <div className="mx-auto grid w-full max-w-[1100px] gap-5 md:gap-6">
          <article
            ref={headcardRef}
            className="overflow-hidden rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]"
          >
            <div className="relative h-40 bg-[#1d1810] md:h-52">
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#F1EDE2] via-[#F1EDE2]/25 to-transparent" />

              {/* Adesivo Casa Views — leva aos rankings (agora interno: /acasaviews) */}
              <Link
                href="/acasaviews/rankings"
                aria-label="Ver os rankings da Casa Views"
                title="Rankings da Casa Views"
                className="group absolute left-4 top-4 z-10 -rotate-3 transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-0"
              >
                {/* fita washi colada no topo do adesivo */}
                <span
                  aria-hidden
                  className="absolute -top-2 left-1/2 h-3.5 w-12 -translate-x-1/2 rotate-2 bg-[#F4D53B]/70 shadow-[1px_2px_3px_rgba(0,0,0,0.35)]"
                />
                <span className="relative flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#0BC5E0] px-3 py-2 shadow-[3px_3px_0_0_#0B0B0D] transition-[box-shadow] group-hover:shadow-[5px_5px_0_0_#F2B705]">
                  <Crown className="h-5 w-5 shrink-0 text-[#0B0B0D]" />
                  <span className="fl-display text-left leading-[0.78]">
                    <span className="block text-[12px] tracking-tight text-[#0B0B0D]">Casa</span>
                    <span className="block text-[19px] tracking-tight text-[#E11D48] [-webkit-text-stroke:0.6px_#0B0B0D]">Views</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 -rotate-45 text-[#0B0B0D] transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setDropsideOpen(true)}
                aria-label="Abrir menu da conta"
                aria-haspopup="dialog"
                aria-expanded={dropsideOpen}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#F2B705] active:translate-x-px active:translate-y-px"
                title="Abrir configurações"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-6 md:px-7">
              <div className="-mt-12 flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:gap-6 md:text-left">
                <div className="relative flex aspect-[4/5] w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-[#F1EDE2] bg-[#F2B705]/15 ring-2 ring-[#0B0B0D] md:w-28">
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
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    aria-label="Trocar foto"
                    className="absolute bottom-1 right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] transition hover:bg-[#F2B705]"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  {/* Nome migrou pro RetractableProfileHeader. @username fica como contexto. */}
                  {perfil.username && (
                    <p className="text-sm font-medium text-[#5b554b]">@{perfil.username}</p>
                  )}
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
                    {perfil.is_minor === true ? "Supervisionada" : "Parental"}
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
                      {isGeneratingCoupon ? "Gerando..." : "Gerar cupom"}
                    </button>
                  </HoverHint>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-[13px] text-[#2b2b2e]">
                <button
                  type="button"
                  onClick={() => router.push("/mensagens?tab=os")}
                  aria-label="Abrir mensagens"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.03] text-[#0B0B0D] transition hover:bg-[#F2B705]/20"
                  title="Mensagens"
                >
                  <MessageCircle className="h-4 w-4" />
                  {unreadMessages > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#E0A500] ring-2 ring-[#F1EDE2]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFollowingModalOpen(true)}
                  className="tabular-nums rounded-md px-1 transition hover:bg-[#0B0B0D]/[0.06]"
                  title="Ver quem você acompanha"
                >
                  <span className="font-bold text-[#0B0B0D]">{followedProfilesCount}</span>{" "}
                  <span className="text-[#5b554b]">acompanhados</span>
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
                name: p.display_name || "Perfil sem nome",
              }))}
            myProfilesSlot={
              <div className="space-y-4">
            <div>
              {perfil.profiles && perfil.profiles.filter((p) => !p.is_clan).length > 0 ? (
                <div className="-mx-5 grid grid-cols-3 gap-px md:-mx-7">
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
                          aria-label={`Abrir perfil ${profile.display_name}`}
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
                              Manifestacao
                            </span>
                          )}
                        </button>

                        {/* Engrenagem (canto superior esquerdo) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="absolute top-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 text-white/85 backdrop-blur-sm transition hover:bg-zinc-950"
                              aria-label="Ações do perfil"
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuItem onClick={() => router.push(`/account/profile/${profile.id_profile}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Gerenciar perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/account/profile/${profile.id_profile}/agenda`)}>
                              <CalendarDays className="h-4 w-4 mr-2" />
                              Agenda
                            </DropdownMenuItem>
                            {!isPaid && (
                              <DropdownMenuItem onClick={() => router.push(`/payment/taxa?profile_id=${profile.id_profile}`)}>
                                <Briefcase className="h-4 w-4 mr-2" />
                                Ativar perfil
                              </DropdownMenuItem>
                            )}
                            {isPaid && (
                              <DropdownMenuItem
                                disabled={togglingVisibility === profile.id_profile}
                                onClick={() => handleToggleVisibility(profile.id_profile, !isVisible)}
                              >
                                {isVisible ? (
                                  <><EyeOff className="h-4 w-4 mr-2" /> Deixar invisível</>
                                ) : (
                                  <><Eye className="h-4 w-4 mr-2" /> Tornar visível</>
                                )}
                              </DropdownMenuItem>
                            )}
                            {hasManifestation && (
                              <DropdownMenuItem
                                onClick={() => handleToggleManifestationProfile(profile.id_profile, !manifestationApplied)}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                {manifestationApplied ? "Remover Manifestacao" : "Aplicar Manifestacao"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={deletingProfile === profile.id_profile}
                              onClick={() => handleDeleteProfile(profile.id_profile)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Coroa: comprar premium (canto superior esquerdo, ao lado da engrenagem) */}
                        {isPaid && (
                          <button
                            type="button"
                            onClick={() => setPremiumProfile({ id: profile.id_profile, name: profile.display_name || undefined })}
                            className="absolute top-2 left-12 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300/95 text-zinc-900 backdrop-blur-sm transition hover:bg-amber-200 shadow-[0_4px_12px_-2px_rgba(251,191,36,0.55)]"
                            aria-label="Tornar perfil premium"
                            title="Tornar perfil premium"
                          >
                            <Crown className="h-3.5 w-3.5 fill-zinc-900" />
                          </button>
                        )}

                        {/* Status badge (canto superior direito) */}
                        <div className="absolute top-2 right-2 pointer-events-none">
                          {!isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 backdrop-blur-sm">
                              Aguardando
                            </span>
                          ) : isPublished ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                              Visível
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm">
                              Invisível
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
                  <p className="fl-display text-xl text-[#F5F1E8]">Nenhum perfil criado</p>
                  <p className="mt-1 mb-5 text-sm text-[#9A938A]">Crie seu primeiro perfil para começar</p>
                  <button
                    type="button"
                    onClick={() => { setNewProfileError(null); setNewProfileForm({ id_machine: "", id_category: "", display_name: "", bio: "", estado: "", municipio: "" }); setProfessions([]); fetchMachines(); setIsNewProfileModalOpen(true) }}
                    className="fl-btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Perfil
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
                    href="/account/clans"
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#F5F1E8]/25 px-4 py-2 text-[13px] font-bold text-[#F5F1E8] transition hover:border-[#F2B705] hover:text-[#F2B705]"
                  >
                    Gerenciar clans
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
            <div>
              {perfil.profiles && perfil.profiles.filter((p) => p.is_clan).length > 0 ? (
                <div className="-mx-5 grid grid-cols-3 gap-px md:-mx-7">
                  {perfil.profiles.filter((p) => p.is_clan).map((clan) => {
                    const isPaid = !!clan.is_paid
                    const isVisible = clan.is_visible !== false
                    const isPublished = !!clan.is_published
                    const imgSrc = clan.avatar_url || null
                    return (
                      <div key={clan.id_profile} className="group relative">
                        <button
                          type="button"
                          onClick={() => router.push(`/clans/${clan.id_profile}`)}
                          className="relative block aspect-[4/5] w-full overflow-hidden border border-[#F5F1E8]/10 bg-[#F5F1E8]/[0.03] transition"
                          aria-label={`Abrir clan ${clan.display_name}`}
                        >
                          {imgSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imgSrc}
                              alt={clan.display_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#F5F1E8]/60"
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(242,183,5,0.22), rgba(20,16,9,0.6))",
                              }}
                            >
                              {getInitials(clan.display_name)}
                            </div>
                          )}
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"
                          />
                        </button>

                        {/* Engrenagem (canto superior esquerdo) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="absolute top-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 text-white/85 backdrop-blur-sm transition hover:bg-zinc-950"
                              aria-label="Ações do clan"
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuItem onClick={() => router.push(`/clans/${clan.id_profile}`)}>
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Ver clan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/account/clans/${clan.id_profile}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Gerenciar clan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/account/clans/${clan.id_profile}/agenda`)}>
                              <CalendarDays className="h-4 w-4 mr-2" />
                              Agenda
                            </DropdownMenuItem>
                            {isPaid && (
                              <DropdownMenuItem
                                disabled={togglingVisibility === clan.id_profile}
                                onClick={() => handleToggleVisibility(clan.id_profile, !isVisible)}
                              >
                                {isVisible ? (
                                  <><EyeOff className="h-4 w-4 mr-2" /> Deixar invisível</>
                                ) : (
                                  <><Eye className="h-4 w-4 mr-2" /> Tornar visível</>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={deletingProfile === clan.id_profile}
                              onClick={() => handleDeleteProfile(clan.id_profile)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Status badge (canto superior direito) */}
                        <div className="absolute top-2 right-2 pointer-events-none">
                          {!isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 backdrop-blur-sm">
                              Aguardando
                            </span>
                          ) : isPublished ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                              Visível
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur-sm">
                              Invisível
                            </span>
                          )}
                        </div>

                        <p className="px-1 pt-1.5 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-[#F5F1E8] md:text-sm">
                          <Crown className="h-3 w-3 text-primary" />
                          <span className="truncate">{clan.display_name}</span>
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-[#F5F1E8]/15 bg-[#F5F1E8]/[0.02] p-8 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-[#9A938A]" />
                  <p className="text-sm text-[#9A938A]">
                    Você ainda não tem clans criados.
                  </p>
                  <Link href="/account/clans" className="mt-2 inline-block text-sm font-bold text-[#F2B705] hover:underline">
                    Criar ou entrar em um clan
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
        <DialogContent className="fl-root border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">Criar novo perfil</DialogTitle>
            <DialogDescription className="text-[#5b554b]">
              O perfil é criado como <strong className="text-[#0B0B0D]">Aguardando ativação</strong>. Ele só
              aparece nos classificados após você ativar esse perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label htmlFor="np-display-name" className="fl-label">Nome de exibição <span className="text-[#b91c1c]">*</span></label>
              <input
                id="np-display-name"
                className="fl-input"
                placeholder="Como você quer ser chamado..."
                value={newProfileForm.display_name}
                onChange={(e) => setNewProfileForm((prev) => ({ ...prev, display_name: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="np-machine" className="fl-label">Enxame <span className="text-[#b91c1c]">*</span></label>
              <select
                id="np-machine"
                className="fl-input"
                value={newProfileForm.id_machine}
                onChange={(e) => handleNewProfileMachineChange(e.target.value)}
                disabled={loadingMachines}
              >
                <option value="" disabled>{loadingMachines ? "Carregando..." : "Selecione um enxame"}</option>
                {machines.map((m) => (
                  <option key={m.id_machine} value={String(m.id_machine)}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="np-profession" className="fl-label">Profissão <span className="text-[#b91c1c]">*</span></label>
              <select
                id="np-profession"
                className="fl-input"
                value={newProfileForm.id_category}
                onChange={(e) => setNewProfileForm((prev) => ({ ...prev, id_category: e.target.value }))}
                disabled={!newProfileForm.id_machine || loadingProfessions}
              >
                <option value="" disabled>
                  {!newProfileForm.id_machine
                    ? "Selecione um enxame primeiro"
                    : loadingProfessions
                      ? "Carregando..."
                      : "Selecione uma profissão"}
                </option>
                {professions.map((p) => (
                  <option key={p.id_category} value={String(p.id_category)}>{p.desc_category}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="np-bio" className="fl-label">Bio</label>
              <textarea
                id="np-bio"
                placeholder="Fale um pouco sobre você..."
                value={newProfileForm.bio}
                onChange={(e) => setNewProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="fl-input max-h-36 resize-none overflow-y-auto"
                style={{ wordBreak: "break-all", overflowWrap: "break-word" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="np-estado" className="fl-label">Estado</label>
                <select
                  id="np-estado"
                  className="fl-input"
                  value={newProfileForm.estado}
                  onChange={(e) => handleNewProfileEstadoChange(e.target.value)}
                >
                  <option value="" disabled>Selecione</option>
                  {estados.map((e) => (
                    <option key={e.uf} value={e.uf}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="np-municipio" className="fl-label">Município</label>
                <select
                  id="np-municipio"
                  className="fl-input"
                  value={newProfileForm.municipio}
                  onChange={(e) => setNewProfileForm((prev) => ({ ...prev, municipio: e.target.value }))}
                  disabled={!newProfileForm.estado || loadingNewProfileMunicipios}
                >
                  <option value="" disabled>{loadingNewProfileMunicipios ? "Carregando..." : "Selecione"}</option>
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
                Cancelar
              </button>
              <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={handleCreateProfile} disabled={isCreatingProfile}>
                {isCreatingProfile ? "Criando..." : "Criar perfil"}
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
        <DialogContent className="fl-root border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">{isEditing ? "Editar rede social" : "Adicionar rede social"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="platform" className="fl-label">Plataforma</label>
              <select
                id="platform"
                className="fl-input"
                value={novaRede.platform}
                onChange={(e) => setNovaRede({ ...novaRede, platform: e.target.value })}
              >
                <option value="" disabled>Selecione a plataforma</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>

            <div>
              <label htmlFor="account" className="fl-label">Usuário/Handle</label>
              <input
                id="account"
                className="fl-input"
                placeholder="@usuario"
                value={novaRede.account}
                onChange={(e) => setNovaRede({ ...novaRede, account: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="followers" className="fl-label">Seguidores</label>
              <select
                id="followers"
                className="fl-input"
                value={novaRede.followers_range}
                onChange={(e) => setNovaRede({ ...novaRede, followers_range: e.target.value })}
              >
                <option value="" disabled>Selecione a faixa de seguidores</option>
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
              Cancelar
            </button>
            <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold" onClick={handleAdicionarRede}>
              {isEditing ? "Atualizar" : "Adicionar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de Avatar */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="fl-root border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">Alterar avatar</DialogTitle>
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
                <p className="text-center text-sm text-[#5b554b]">Avatar atual</p>
              </div>

              {/* Input de Arquivo */}
              <div className="space-y-3">
                <label htmlFor="avatar-input" className="fl-label">Selecionar nova imagem</label>
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
                  Escolher arquivo
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
                    alt="Preview"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoom})`,
                    }}
                  />
                </div>
                <p className="text-center text-xs text-[#5b554b]">Arraste para posicionar</p>
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
                Voltar
              </button>
            )}
            {fotoTemp ? (
              <button type="button" className="fl-btn-gold flex-1 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 sm:flex-none" onClick={handleConfirmUpload} disabled={isUploadingAvatar}>
                {isUploadingAvatar ? "Salvando..." : "Salvar avatar"}
              </button>
            ) : (
              <button type="button" className="fl-btn-card flex-1 rounded-full px-4 py-2 text-sm font-bold sm:flex-none" onClick={() => setIsUploadModalOpen(false)}>
                Cancelar
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
          title="Ajustar foto de perfil"
          description="Ajuste sua foto de perfil."
          onCancel={() => setAvatarFile(null)}
          onConfirm={handleUserAvatarCropConfirm}
        />
      )}

      {/* Modal de Edição de Perfil */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="fl-root max-h-[90vh] overflow-y-auto border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">Editar perfil</DialogTitle>
            <DialogDescription className="text-[#5b554b]">
              Atualize seus dados pessoais e veja o status da sua conta.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Seção: Conta & Verificação (migrado do headcard) */}
            <div className="space-y-3 rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#5b554b]">
                  Conta & Verificação
                </div>
                {emailVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-700/30 bg-emerald-600/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    <BadgeCheck className="h-3 w-3" />
                    Email verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#E0A500]/40 bg-[#F2B705]/15 px-2.5 py-1 text-[11px] font-bold text-[#8a6d00]">
                    <AlertCircle className="h-3 w-3" />
                    Não verificado
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label htmlFor="edit-email" className="fl-label">Email</label>
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
                    Verificar agora
                  </Link>
                )}
              </div>
              <p className="text-[11px] text-[#8a8275]">
                O email é usado para login e não pode ser alterado por aqui.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-nome" className="fl-label">Nome</label>
                <input
                  id="edit-nome"
                  className="fl-input"
                  placeholder="Seu nome completo"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="edit-username" className="fl-label">Nome de usuário</label>
                <input
                  id="edit-username"
                  placeholder="ex: joao.silva"
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
                    {editUsernameStatus === "checking" ? "Verificando..." : editUsernameMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="data_nascimento" className="fl-label">Data de nascimento</label>
                <input
                  id="data_nascimento"
                  type="date"
                  className="fl-input"
                  value={editForm.idade}
                  onChange={(e) => setEditForm({ ...editForm, idade: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="sexo" className="fl-label">Sexo</label>
                <select
                  id="sexo"
                  className="fl-input"
                  value={editForm.sexo}
                  onChange={(e) => setEditForm({ ...editForm, sexo: e.target.value })}
                >
                  <option value="" disabled>Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="O">Outros</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="fl-label">Telefone</label>
              <input
                id="telefone"
                className="fl-input"
                placeholder="Seu telefone"
                value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="estado" className="fl-label">Estado</label>
                <select
                  id="estado"
                  className="fl-input"
                  value={editForm.estado}
                  onChange={(e) => handleEstadoChange(e.target.value)}
                >
                  <option value="" disabled>Selecione</option>
                  {estados.map((estado) => (
                    <option key={estado.uf} value={estado.uf}>{estado.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="municipio" className="fl-label">Município</label>
                <select
                  id="municipio"
                  className="fl-input"
                  value={editForm.municipio}
                  onChange={(e) => setEditForm({ ...editForm, municipio: e.target.value })}
                  disabled={loadingMunicipios}
                >
                  <option value="" disabled>Selecione</option>
                  {municipios.map((municipio) => (
                    <option key={municipio.id} value={municipio.nome}>{municipio.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="fl-label">Bio</label>
              <textarea
                id="bio"
                className="fl-input min-h-[80px] resize-none"
                placeholder="Fale sobre você..."
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <button type="button" className="fl-btn-card rounded-full px-4 py-2 text-sm font-bold" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de Portfólio */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={setIsPortfolioModalOpen}>
        <DialogContent className="fl-root border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">Adicionar mídia ao portfólio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!uploadingMedia ? (
              <div className="cursor-pointer rounded-xl border-2 border-dashed border-[#0B0B0D]/30 p-8 text-center transition-colors hover:border-[#E0A500] hover:bg-[#F2B705]/[0.06]" onClick={() => document.getElementById("media-input")?.click()}>
                <Upload className="mx-auto mb-2 h-8 w-8 text-[#8a6d00]" />
                <p className="font-bold text-[#0B0B0D]">Clique para adicionar ou arraste uma imagem/vídeo</p>
                <p className="text-sm text-[#5b554b]">Máximo 100MB</p>
                <input id="media-input" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={handleMediaSelect} className="hidden" />
              </div>
            ) : (
              <>
                <div className={`relative overflow-hidden rounded-xl border-2 border-[#0B0B0D]/15 bg-[#1d1810] ${selectedMediaType === "image" ? "aspect-[4/5]" : "aspect-video"}`}>
                  {selectedMediaType === "image" ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadingMedia.preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
                      {originalUploadImage && (
                        <button
                          type="button"
                          onClick={() => setMediaCropFile(originalUploadImage)}
                          className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/85"
                        >
                          Cortar imagem
                        </button>
                      )}
                    </>
                  ) : (
                    <video src={uploadingMedia.preview} className="w-full h-full object-cover" controls />
                  )}
                </div>

                <div>
                  <label htmlFor="media-title" className="fl-label">Título</label>
                  <input
                    id="media-title"
                    className="fl-input"
                    placeholder="Título do projeto"
                    value={portfolioForm.title}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="media-description" className="fl-label">Descrição</label>
                  <textarea
                    id="media-description"
                    className="fl-input min-h-[80px] resize-none"
                    placeholder="Descreva seu projeto..."
                    value={portfolioForm.description}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="media-link" className="fl-label">Link externo (opcional)</label>
                  <input
                    id="media-link"
                    className="fl-input"
                    placeholder="https://exemplo.com"
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
              Cancelar
            </button>
            {!uploadingMedia ? (
              <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold opacity-50" disabled>Próximo</button>
            ) : (
              <button type="button" className="fl-btn-gold rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50" onClick={handleUploadMedia} disabled={mediaUploadProgress !== "idle"}>
                {mediaUploadProgress === "idle" ? "Enviar" : mediaUploadProgress === "uploading" ? "Enviando..." : "Processando..."}
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
          title="Cortar imagem"
          description="Corte sua imagem no formato 4:5 para aparecer melhor no feed."
          onCancel={() => setMediaCropFile(null)}
          onConfirm={handleUploadCropConfirm}
        />
      )}

      {/* Modal de Edição de Mídia */}
      <Dialog open={isEditMediaModalOpen} onOpenChange={setIsEditMediaModalOpen}>
        <DialogContent className="fl-root border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">Editar mídia</DialogTitle>
            <DialogDescription className="text-[#5b554b]">Edite as informações da sua mídia ou remova do portfólio.</DialogDescription>
          </DialogHeader>

          {editingMedia && (
            <div className="grid gap-4 py-4">
              <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-[#0B0B0D]/15 bg-[#1d1810]">
                {editingMedia.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editingMedia.media_url || "/placeholder.svg"} alt={editingMedia.title || "Preview"} className="w-full h-full object-cover" />
                ) : (
                  <video src={editingMedia.media_url} className="w-full h-full object-cover" controls />
                )}
              </div>

              <div>
                <label htmlFor="edit-title" className="fl-label">Título</label>
                <input
                  id="edit-title"
                  className="fl-input"
                  placeholder="Título do projeto"
                  value={editMediaForm.title}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, title: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="edit-description" className="fl-label">Descrição</label>
                <textarea
                  id="edit-description"
                  className="fl-input min-h-[80px] resize-none"
                  placeholder="Descreva seu projeto..."
                  value={editMediaForm.description}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, description: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="edit-link" className="fl-label">Link externo (opcional)</label>
                <input
                  id="edit-link"
                  className="fl-input"
                  placeholder="https://exemplo.com"
                  value={editMediaForm.external_link}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, external_link: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <button type="button" onClick={handleDeleteMedia} disabled={isSavingMedia} className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#b91c1c] bg-[#b91c1c] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#a01818] disabled:opacity-50 sm:w-auto">
              <Trash2 className="h-4 w-4" />
              Deletar
            </button>
            <div className="flex w-full gap-2 sm:w-auto">
              <button type="button" className="fl-btn-card flex-1 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 sm:flex-none" onClick={() => setIsEditMediaModalOpen(false)} disabled={isSavingMedia}>
                Cancelar
              </button>
              <button type="button" className="fl-btn-gold flex-1 rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 sm:flex-none" onClick={handleUpdateMedia} disabled={isSavingMedia}>
                {isSavingMedia ? "Salvando..." : "Salvar"}
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
    </div>
  )
}
