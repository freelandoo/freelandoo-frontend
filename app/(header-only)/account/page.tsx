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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, MapPin, Briefcase, Edit, Instagram, Youtube, Video, Plus, User, Camera, ZoomIn, ZoomOut, Move, Phone, Trash2, ImageIcon, Upload, Pencil, AlertCircle, Copy, Check, CalendarDays } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { AvatarImage } from "@/components/ui/avatar"
import { AccountClansSection } from "@/components/account/account-clans-section"

export default function PerfilPage() {
  const router = useRouter()
  const { perfil, setPerfil, isLoading, error } = useMeProfile()
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

  const estados = ESTADOS_BRASIL

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

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code)
    setCouponCopied(true)
    setTimeout(() => setCouponCopied(false), 2000)
  }

  const fetchMachines = async () => {
    if (machines.length > 0) return
    setLoadingMachines(true)
    try {
      const res = await fetch("/api/machines")
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.machines ?? [])
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
      const res = await fetch(`/api/machines/${encodeURIComponent(id_machine)}/categories`)
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
      setNewProfileError("Selecione uma máquina.")
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

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Por favor, selecione uma imagem válida")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5MB")
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setFotoTemp(event.target?.result as string)
        setImagePosition({ x: 0, y: 0 })
        setZoom(1)
      }
      reader.readAsDataURL(file)
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

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")

    if (!isImage && !isVideo) {
      alert("Por favor, selecione uma imagem ou vídeo válido")
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      alert("O arquivo deve ter no máximo 100MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadingMedia({
        file,
        preview: event.target?.result as string,
      })
      setSelectedMediaType(isImage ? "image" : "video")
    }
    reader.readAsDataURL(file)
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
      let fileToUpload = uploadingMedia.file

      if (uploadingMedia.file.type.startsWith("image/") && uploadingMedia.file.size > 4 * 1024 * 1024) {
        try {
          const compressedBlob = await compressImage(uploadingMedia.file)
          fileToUpload = new File([compressedBlob], uploadingMedia.file.name, { type: "image/jpeg" })
        } catch (compressError) {
          throw new Error("Erro ao comprimir imagem: " + (compressError instanceof Error ? compressError.message : "Desconhecido"))
        }
      }

      const uploadFormData = new FormData()
      uploadFormData.append("file", fileToUpload)

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

      setUploadingMedia(null)
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

  return (
    <div className="bg-page-shell-dark">
      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-8 max-w-4xl mx-auto">
          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {perfil.avatar && <AvatarImage src={perfil.avatar || "/placeholder.svg"} alt={perfil.nome} />}
                    <AvatarFallback>{getInitials(perfil.nome)}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Nome</p>
                      <p className="font-semibold text-lg">{perfil.nome}</p>
                      {perfil.username && (
                        <p className="text-sm text-muted-foreground">@{perfil.username}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={openEditModal}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {perfil.data_nascimento && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Data de Nascimento</p>
                        <p className="font-medium">{new Date(perfil.data_nascimento.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                    {perfil.sexo && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Sexo</p>
                        <p className="font-medium">{formatarSexo(perfil.sexo)}</p>
                      </div>
                    )}
                    {perfil.estado && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Localização</p>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <p className="font-medium">{perfil.municipio ? `${perfil.municipio}, ${perfil.estado}` : perfil.estado}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {perfil.statuses && perfil.statuses.length > 0 ? (
                      perfil.statuses.map((status) => {
                        let badgeClass = "bg-green-600 hover:bg-green-700"
                        if (status.desc_status.includes("email")) {
                          badgeClass = "bg-green-600 hover:bg-green-700"
                        }
                        return (
                          <Badge key={status.id_status} variant="default" className={badgeClass}>
                            {status.desc_status.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                        )
                      })
                    ) : (
                      <Badge variant="secondary">Sem status</Badge>
                    )}


                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <p className="font-medium">{perfil.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Cupom</p>
                  {perfil.coupon_code ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleCopyCoupon(perfil.coupon_code!)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-primary bg-primary/5 hover:bg-primary/10 transition-colors font-mono text-sm font-semibold tracking-widest text-primary"
                      >
                        {couponCopied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                        {perfil.coupon_code}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {couponCopied ? "Copiado!" : "Clique para copiar"}
                        </span>
                      </button>
                      <Button asChild variant="outline" size="sm">
                        <a href="/account/afiliado">Painel de afiliado</a>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCoupon}
                      disabled={isGeneratingCoupon}
                    >
                      {isGeneratingCoupon ? "Gerando..." : "Gerar cupom"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Meus Perfis */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Meus Perfis</CardTitle>
                  {(() => {
                    const list = (perfil.profiles || []).filter((p) => !p.is_clan)
                    const total = list.length
                    const visible = list.filter((p) => p.is_published).length
                    const paidInvisible = list.filter((p) => p.is_paid && !p.is_visible).length
                    const unpaid = list.filter((p) => !p.is_paid).length
                    return (
                      <p className="text-sm text-muted-foreground mt-1">
                        Perfis: {total} criado{total === 1 ? "" : "s"} · {visible} visível{visible === 1 ? "" : "is"} · {paidInvisible} invisível{paidInvisible === 1 ? "" : "is"} · {unpaid} aguardando assinatura
                      </p>
                    )
                  })()}
                </div>
                <Button onClick={() => { setNewProfileError(null); setNewProfileForm({ id_machine: "", id_category: "", display_name: "", bio: "", estado: "", municipio: "" }); setProfessions([]); fetchMachines(); setIsNewProfileModalOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Perfil
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {perfil.profiles && perfil.profiles.filter((p) => !p.is_clan).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {perfil.profiles.filter((p) => !p.is_clan).map((profile) => {
                    const isPaid = !!profile.is_paid
                    const isVisible = profile.is_visible !== false
                    const isPublished = !!profile.is_published
                    return (
                    <Card
                      key={profile.id_profile}
                      className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col"
                    >
                      <CardContent className="p-6 flex-1 flex flex-col">
                        <div className="space-y-4 flex-1">
                          {/* Avatar e Display Name */}
                          <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                              {(profile.avatar_url || perfil?.avatar) && (
                                <AvatarImage src={(profile.avatar_url || perfil?.avatar) ?? undefined} alt={profile.display_name} />
                              )}
                              <AvatarFallback>{getInitials(profile.display_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <button
                                type="button"
                                onClick={() => router.push(`/account/profile/${profile.id_profile}`)}
                                className="font-semibold text-lg text-left hover:underline"
                              >
                                {profile.display_name}
                              </button>
                              {profile.category && (
                                <p className="text-sm text-muted-foreground">{profile.category}</p>
                              )}
                            </div>
                          </div>

                          {/* Status Badge — pagamento + visibilidade */}
                          <div className="flex flex-wrap gap-2">
                            {!isPaid ? (
                              <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 border border-amber-500/30">
                                Aguardando assinatura
                              </Badge>
                            ) : isPublished ? (
                              <Badge className="bg-green-600 hover:bg-green-700">Ativo e visível</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-slate-500/15 text-slate-700 border border-slate-500/30">
                                Invisível
                              </Badge>
                            )}
                            {(profile.machine_name || profile.machine_slug) && (
                              <Badge variant="outline">
                                {profile.machine_name || profile.machine_slug}
                              </Badge>
                            )}
                          </div>

                          {(profile.municipio || profile.estado) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {[profile.municipio, profile.estado].filter(Boolean).join(" - ")}
                            </p>
                          )}

                          {/* Bio */}
                          {profile.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
                          )}

                          {/* Redes Sociais */}
                          {profile.redes_sociais && profile.redes_sociais.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">Redes Sociais</p>
                              <div className="flex flex-wrap gap-2">
                                {profile.redes_sociais.map((rede) => {
                                  let icon = null
                                  let color = "bg-gray-500"

                                  const plataforma = rede.social_media_type?.toLowerCase() || ""
                                  if (plataforma.includes("instagram")) {
                                    icon = <Instagram className="h-4 w-4" />
                                    color = "bg-gradient-to-br from-purple-500 to-pink-500"
                                  } else if (plataforma.includes("youtube")) {
                                    icon = <Youtube className="h-4 w-4" />
                                    color = "bg-red-600"
                                  } else if (plataforma.includes("tiktok")) {
                                    icon = <Video className="h-4 w-4" />
                                    color = "bg-black"
                                  }

                                  return (
                                    <button
                                      key={rede.social_id}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        if (rede.url) {
                                          window.open(rede.url, "_blank")
                                        }
                                      }}
                                      className={`${color} p-2 rounded-full text-white hover:opacity-80 transition-opacity`}
                                      title={rede.social_media_type}
                                    >
                                      {icon}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Ações do perfil */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/account/profile/${profile.id_profile}`)}
                          >
                            Gerenciar perfil
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/account/profile/${profile.id_profile}/agenda`)}
                          >
                            <CalendarDays className="h-3.5 w-3.5 mr-1" />
                            Agenda
                          </Button>
                          {!isPaid && (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/payment/taxa?profile_id=${profile.id_profile}`)}
                            >
                              Ativar perfil
                            </Button>
                          )}
                          {isPaid && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={togglingVisibility === profile.id_profile}
                              onClick={() => handleToggleVisibility(profile.id_profile, !isVisible)}
                            >
                              {togglingVisibility === profile.id_profile
                                ? "..."
                                : isVisible
                                  ? "Deixar invisível"
                                  : "Tornar visível"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={deletingProfile === profile.id_profile}
                            onClick={() => handleDeleteProfile(profile.id_profile)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {deletingProfile === profile.id_profile ? "..." : "Excluir"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground mb-2">Nenhum perfil criado</p>
                  <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro perfil para começar</p>
                  <Button onClick={() => { setNewProfileError(null); setNewProfileForm({ id_machine: "", id_category: "", display_name: "", bio: "", estado: "", municipio: "" }); setProfessions([]); fetchMachines(); setIsNewProfileModalOpen(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Perfil
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meus Clans */}
          <AccountClansSection />
        </div>
      </main>

      {/* Modal de Novo Perfil */}
      <Dialog open={isNewProfileModalOpen} onOpenChange={(open) => { if (!open) setNewProfileError(null); setIsNewProfileModalOpen(open) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar novo perfil</DialogTitle>
            <DialogDescription>
              O perfil é criado como <strong>Aguardando assinatura</strong>. Ele só
              aparece nos classificados após você ativar a anuidade desse perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="np-display-name">Nome de exibição <span className="text-destructive">*</span></Label>
              <Input
                id="np-display-name"
                placeholder="Como você quer ser chamado..."
                value={newProfileForm.display_name}
                onChange={(e) => setNewProfileForm((prev) => ({ ...prev, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-machine">Máquina <span className="text-destructive">*</span></Label>
              <Select
                value={newProfileForm.id_machine}
                onValueChange={handleNewProfileMachineChange}
                disabled={loadingMachines}
              >
                <SelectTrigger id="np-machine">
                  <SelectValue placeholder={loadingMachines ? "Carregando..." : "Selecione uma máquina"} />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id_machine} value={String(m.id_machine)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-profession">Profissão <span className="text-destructive">*</span></Label>
              <Select
                value={newProfileForm.id_category}
                onValueChange={(val) => setNewProfileForm((prev) => ({ ...prev, id_category: val }))}
                disabled={!newProfileForm.id_machine || loadingProfessions}
              >
                <SelectTrigger id="np-profession">
                  <SelectValue placeholder={
                    !newProfileForm.id_machine
                      ? "Selecione uma máquina primeiro"
                      : loadingProfessions
                        ? "Carregando..."
                        : "Selecione uma profissão"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {professions.map((p) => (
                    <SelectItem key={p.id_category} value={String(p.id_category)}>
                      {p.desc_category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-bio">Bio</Label>
              <textarea
                id="np-bio"
                placeholder="Fale um pouco sobre você..."
                value={newProfileForm.bio}
                onChange={(e) => setNewProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none overflow-y-auto max-h-36"
                style={{ wordBreak: "break-all", overflowWrap: "break-word" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="np-estado">Estado</Label>
                <Select
                  value={newProfileForm.estado}
                  onValueChange={handleNewProfileEstadoChange}
                >
                  <SelectTrigger id="np-estado">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((e) => (
                      <SelectItem key={e.uf} value={e.uf}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="np-municipio">Município</Label>
                <Select
                  value={newProfileForm.municipio}
                  onValueChange={(val) => setNewProfileForm((prev) => ({ ...prev, municipio: val }))}
                  disabled={!newProfileForm.estado || loadingNewProfileMunicipios}
                >
                  <SelectTrigger id="np-municipio">
                    <SelectValue placeholder={loadingNewProfileMunicipios ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {newProfileMunicipios.map((m) => (
                      <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newProfileError && (
              <p className="text-sm text-destructive">{newProfileError}</p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setIsNewProfileModalOpen(false)} disabled={isCreatingProfile}>
                Cancelar
              </Button>
              <Button onClick={handleCreateProfile} disabled={isCreatingProfile}>
                {isCreatingProfile ? "Criando..." : "Criar perfil"}
              </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Rede Social" : "Adicionar Rede Social"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Plataforma</Label>
              <Select value={novaRede.platform} onValueChange={(value) => setNovaRede({ ...novaRede, platform: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Usuário/Handle</Label>
              <Input
                id="account"
                placeholder="@usuario"
                value={novaRede.account}
                onChange={(e) => setNovaRede({ ...novaRede, account: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="followers">Seguidores</Label>
              <Select value={novaRede.followers_range} onValueChange={(value) => setNovaRede({ ...novaRede, followers_range: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a faixa de seguidores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-10k">0 - 10k</SelectItem>
                  <SelectItem value="10k-50k">10k - 50k</SelectItem>
                  <SelectItem value="50k-200k">50k - 200k</SelectItem>
                  <SelectItem value="200k-1M">200k - 1M</SelectItem>
                  <SelectItem value="1M+">1M+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNovaRede({ id: "", platform: "", account: "", followers_range: "" })
              setIsEditing(false)
              setIsModalOpen(false)
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarRede}>
              {isEditing ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de Avatar */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alterar Avatar</DialogTitle>
          </DialogHeader>

          {!fotoTemp ? (
            <div className="space-y-6 py-4">
              {/* Avatar Atual ou Iniciais */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden shadow-lg">
                  {perfil?.avatar ? (
                    <img
                      src={perfil.avatar || "/placeholder.svg"}
                      alt={perfil.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl font-bold text-white">{getInitials(perfil?.nome || "")}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">Avatar Atual</p>
              </div>

              {/* Input de Arquivo */}
              <div className="space-y-3">
                <Label htmlFor="avatar-input" className="text-base">Selecionar Nova Imagem</Label>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                  ref={(input) => {
                    if (input) {
                      (window as any).avatarInput = input
                    }
                  }}
                />
                <Button
                  variant="outline"
                  className="w-full justify-center bg-transparent"
                  onClick={() => {
                    const input = document.getElementById("avatar-input") as HTMLInputElement
                    input?.click()
                  }}
                >
                  Escolher Arquivo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Preview Circular */}
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-48 h-48 rounded-full border-4 border-border overflow-hidden bg-muted cursor-move relative shadow-lg flex-shrink-0"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                >
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
                <p className="text-xs text-muted-foreground text-center">Arraste para posicionar</p>
              </div>

              {/* Zoom Slider */}
              <div className="space-y-3">
                <div className="flex gap-4 items-center px-2">
                  <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    min={1}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-3">
            {fotoTemp && (
              <Button variant="outline" onClick={handleCancelUpload}>
                Voltar
              </Button>
            )}
            {fotoTemp ? (
              <Button onClick={handleConfirmUpload} disabled={isUploadingAvatar} className="flex-1 sm:flex-none">
                {isUploadingAvatar ? "Salvando..." : "Salvar Avatar"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Perfil */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input
                  id="edit-nome"
                  placeholder="Seu nome completo"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-username">Nome de Usuário</Label>
                <Input
                  id="edit-username"
                  placeholder="ex: joao.silva"
                  value={editForm.username}
                  onChange={(e) => handleEditUsernameChange(e.target.value)}
                  maxLength={30}
                  className={editUsernameStatus === "taken" || editUsernameStatus === "invalid" ? "border-red-500 focus-visible:ring-red-500" : editUsernameStatus === "available" ? "border-green-500 focus-visible:ring-green-500" : ""}
                />
                {editUsernameMsg && (
                  <p className={`text-xs mt-1 font-medium ${
                    editUsernameStatus === "taken" || editUsernameStatus === "invalid"
                      ? "text-red-500"
                      : editUsernameStatus === "available"
                      ? "text-green-500"
                      : "text-muted-foreground"
                  }`}>
                    {editUsernameStatus === "checking" ? "Verificando..." : editUsernameMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={editForm.idade}
                  onChange={(e) => setEditForm({ ...editForm, idade: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo</Label>
                <Select value={editForm.sexo} onValueChange={(value) => setEditForm({ ...editForm, sexo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="O">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="Seu telefone"
                value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
              />
            </div>



            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select value={editForm.estado} onValueChange={handleEstadoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((estado) => (
                      <SelectItem key={estado.uf} value={estado.uf}>
                        {estado.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="municipio">Município</Label>
                <Select value={editForm.municipio} onValueChange={(value) => setEditForm({ ...editForm, municipio: value })} disabled={loadingMunicipios}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {municipios.map((municipio) => (
                      <SelectItem key={municipio.id} value={municipio.nome}>
                        {municipio.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Fale sobre você..."
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de Portfólio */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={setIsPortfolioModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Adicionar Mídia ao Portfólio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!uploadingMedia ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => document.getElementById("media-input")?.click()}>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium">Clique para adicionar ou arraste uma imagem/vídeo</p>
                <p className="text-sm text-muted-foreground">Máximo 100MB</p>
                <Input id="media-input" type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" />
              </div>
            ) : (
              <>
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {selectedMediaType === "image" ? (
                    <img src={uploadingMedia.preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={uploadingMedia.preview} className="w-full h-full object-cover" controls />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="media-title">Título</Label>
                  <Input
                    id="media-title"
                    placeholder="Título do projeto"
                    value={portfolioForm.title}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="media-description">Descrição</Label>
                  <textarea
                    id="media-description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Descreva seu projeto..."
                    value={portfolioForm.description}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="media-link">Link externo (opcional)</Label>
                  <Input
                    id="media-link"
                    placeholder="https://exemplo.com"
                    value={portfolioForm.external_link}
                    onChange={(e) => setPortfolioForm({ ...portfolioForm, external_link: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadingMedia(null)
                setPortfolioForm({ title: "", description: "", external_link: "" })
                setIsPortfolioModalOpen(false)
              }}
              disabled={mediaUploadProgress !== "idle"}
            >
              Cancelar
            </Button>
            {!uploadingMedia ? (
              <Button disabled>Próximo</Button>
            ) : (
              <Button onClick={handleUploadMedia} disabled={mediaUploadProgress !== "idle"}>
                {mediaUploadProgress === "idle" ? "Enviar" : mediaUploadProgress === "uploading" ? "Enviando..." : "Processando..."}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Mídia */}
      <Dialog open={isEditMediaModalOpen} onOpenChange={setIsEditMediaModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Mídia</DialogTitle>
            <DialogDescription>Edite as informações da sua mídia ou remova do portfólio</DialogDescription>
          </DialogHeader>

          {editingMedia && (
            <div className="grid gap-4 py-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {editingMedia.media_type === "image" ? (
                  <img src={editingMedia.media_url || "/placeholder.svg"} alt={editingMedia.title || "Preview"} className="w-full h-full object-cover" />
                ) : (
                  <video src={editingMedia.media_url} className="w-full h-full object-cover" controls />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  placeholder="Título do projeto"
                  value={editMediaForm.title}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <textarea
                  id="edit-description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descreva seu projeto..."
                  value={editMediaForm.description}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-link">Link externo (opcional)</Label>
                <Input
                  id="edit-link"
                  placeholder="https://exemplo.com"
                  value={editMediaForm.external_link}
                  onChange={(e) => setEditMediaForm({ ...editMediaForm, external_link: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="destructive" onClick={handleDeleteMedia} disabled={isSavingMedia} className="w-full sm:w-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsEditMediaModalOpen(false)} disabled={isSavingMedia} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button onClick={handleUpdateMedia} disabled={isSavingMedia} className="flex-1 sm:flex-none">
                {isSavingMedia ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
