"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useCreatorPublicProfile } from "@/hooks/use-creator-public-profile"
import { FreelancerProfileError, FreelancerProfileLoading } from "./_components/freelancer-states"
import type {
  Category,
  FollowerRange,
  FreelancerProfile,
  PortfolioItem,
  SocialMedia,
  SocialMediaType,
  Subcategory,
} from "@/lib/types/freelancer-profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Instagram, Youtube, ArrowLeft, Video, Edit2, Plus, Trash2, ImageIcon, Upload, X, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FreelancerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string
  const { profile, setProfile, portfolioItems, setPortfolioItems, loading, error, isOwnProfile } =
    useCreatorPublicProfile(profileId)
  const [isEditBioOpen, setIsEditBioOpen] = useState(false)
  const [editBio, setEditBio] = useState("")
  const [isSubmittingBio, setIsSubmittingBio] = useState(false)
  const [isEditDisplayNameOpen, setIsEditDisplayNameOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [isSubmittingDisplayName, setIsSubmittingDisplayName] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<number[]>([])
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false)
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false)
  const [editEstado, setEditEstado] = useState("")
  const [editMunicipio, setEditMunicipio] = useState("")
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false)
  const [isSocialMediaModalOpen, setIsSocialMediaModalOpen] = useState(false)
  const [socialMediaMeta, setSocialMediaMeta] = useState<{ types: SocialMediaType[]; follower_ranges: FollowerRange[] }>({ types: [], follower_ranges: [] })
  const [editingSocial, setEditingSocial] = useState<SocialMedia | null>(null)
  const [socialForm, setSocialForm] = useState({ id_social_media_type: "", url: "", id_follower_range: "" })
  const [isSubmittingSocial, setIsSubmittingSocial] = useState(false)
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState<string | null>(null) // id_portfolio_item em upload
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

  useEffect(() => {
    if (!profile) return
    setEditBio(profile.bio || "")
    setEditDisplayName(profile.display_name || "")
  }, [profile])

  const handleSaveBio = async () => {
    const currentToken = localStorage.getItem("token")
    console.log("[v0] handleSaveBio - token:", currentToken ? "presente" : "ausente")
    console.log("[v0] handleSaveBio - profileId:", profileId)
    console.log("[v0] handleSaveBio - bio:", editBio)

    if (!currentToken) {
      alert("É necessário estar logado para editar a bio")
      return
    }

    setIsSubmittingBio(true)

    try {
      const response = await fetch(`/api/profile/${profileId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: editBio }),
      })

      console.log("[v0] handleSaveBio - status:", response.status)

      if (response.ok) {
        setProfile((prev) => prev ? { ...prev, bio: editBio } : prev)
        setIsEditBioOpen(false)
      } else {
        const data = await response.json()
        console.log("[v0] handleSaveBio - erro:", data)
        alert(data.error || "Erro ao atualizar bio")
      }
    } catch (err) {
      console.error("[v0] handleSaveBio - catch:", err)
      alert("Erro ao salvar bio. Tente novamente.")
    } finally {
      setIsSubmittingBio(false)
    }
  }

  const fetchSocialMediaMeta = async () => {
    try {
      const response = await fetch("/api/social-media/meta")
      if (response.ok) {
        const data = await response.json()
        setSocialMediaMeta({
          types: data.types ?? data.social_media_types ?? [],
          follower_ranges: data.follower_ranges ?? [],
        })
      }
    } catch {
      // silencioso
    }
  }

  const handleOpenAddSocial = async () => {
    setEditingSocial(null)
    setSocialForm({ id_social_media_type: "", url: "", id_follower_range: "" })
    await fetchSocialMediaMeta()
    setIsSocialMediaModalOpen(true)
  }

  const handleOpenEditSocial = async (social: SocialMedia) => {
    setEditingSocial(social)
    setSocialForm({
      id_social_media_type: social.id_social_media_type.toString(),
      url: social.profile_url,
      id_follower_range: social.id_follower_range.toString(),
    })
    await fetchSocialMediaMeta()
    setIsSocialMediaModalOpen(true)
  }

  const handleSaveSocial = async () => {
    const currentToken = localStorage.getItem("token")
    if (!currentToken || !profileId) return

    setIsSubmittingSocial(true)
    try {
      let response: Response

      if (editingSocial) {
        // Atualizar
        response = await fetch(`/api/profile/${profileId}/social-media/${editingSocial.id_social_media_type}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url: socialForm.url,
            id_follower_range: parseInt(socialForm.id_follower_range),
          }),
        })
      } else {
        // Criar
        response = await fetch(`/api/profile/${profileId}/social-media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            id_social_media_type: parseInt(socialForm.id_social_media_type),
            url: socialForm.url,
            id_follower_range: parseInt(socialForm.id_follower_range),
          }),
        })
      }

      if (response.ok) {
        // Recarregar o perfil para pegar dados atualizados
        const profileResponse = await fetch(`/api/creator/${profileId}`)
        if (profileResponse.ok) {
          const data = await profileResponse.json()
          const p: FreelancerProfile = data.profile ?? data
          setProfile(p)
        }
        setIsSocialMediaModalOpen(false)
      } else {
        const data = await response.json()
        alert(data.error || "Erro ao salvar rede social")
      }
    } catch {
      alert("Erro ao salvar rede social. Tente novamente.")
    } finally {
      setIsSubmittingSocial(false)
    }
  }

  const handleDeleteSocial = async (social: SocialMedia) => {
    if (!confirm(`Remover ${social.desc_social_media_type} do perfil?`)) return

    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    try {
      const response = await fetch(`/api/profile/${profileId}/social-media/${social.id_social_media_type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` },
      })

      if (response.ok || response.status === 204) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                social_media: prev.social_media.filter(
                  (s) => s.id_social_media_type !== social.id_social_media_type
                ),
              }
            : prev
        )
      } else {
        const data = await response.json()
        alert(data.error || "Erro ao remover rede social")
      }
    } catch {
      alert("Erro ao remover rede social. Tente novamente.")
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(Array.isArray(data) ? data : data.categories ?? [])
      }
    } catch {
      // silencioso
    }
  }

  const handleOpenCategoryEdit = () => {
    if (profile) {
      setSelectedCategoryId(profile.id_category?.toString() ?? "")
      setSelectedSubcategoryIds(profile.subcategories.map((s) => s.id_subcategory))
    }
    fetchCategories()
    setIsEditCategoryOpen(true)
  }

  const handleToggleSubcategory = (id: number) => {
    setSelectedSubcategoryIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleOpenLocationEdit = async () => {
    const estado = profile?.estado || ""
    const municipio = profile?.municipio || ""
    setEditEstado(estado)
    setEditMunicipio(municipio)
    if (estado) {
      await fetchMunicipios(estado)
    }
    setIsEditLocationOpen(true)
  }

  const handleSaveLocation = async () => {
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    setIsSubmittingLocation(true)
    try {
      const response = await fetch(`/api/profile/${profileId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: editEstado,
          municipio: editMunicipio,
        }),
      })

      if (response.ok) {
        setProfile((prev) =>
          prev ? { ...prev, estado: editEstado, municipio: editMunicipio } : prev
        )
        setIsEditLocationOpen(false)
      } else {
        const data = await response.json()
        alert(data.error || "Erro ao atualizar localização")
      }
    } catch {
      alert("Erro ao salvar localização. Tente novamente.")
    } finally {
      setIsSubmittingLocation(false)
    }
  }

  const estados = [
    { id: 1, nome: "Acre", uf: "AC" },
    { id: 2, nome: "Alagoas", uf: "AL" },
    { id: 3, nome: "Amapá", uf: "AP" },
    { id: 4, nome: "Amazonas", uf: "AM" },
    { id: 5, nome: "Bahia", uf: "BA" },
    { id: 6, nome: "Ceará", uf: "CE" },
    { id: 7, nome: "Distrito Federal", uf: "DF" },
    { id: 8, nome: "Espírito Santo", uf: "ES" },
    { id: 9, nome: "Goiás", uf: "GO" },
    { id: 10, nome: "Maranhão", uf: "MA" },
    { id: 11, nome: "Mato Grosso", uf: "MT" },
    { id: 12, nome: "Mato Grosso do Sul", uf: "MS" },
    { id: 13, nome: "Minas Gerais", uf: "MG" },
    { id: 14, nome: "Pará", uf: "PA" },
    { id: 15, nome: "Paraíba", uf: "PB" },
    { id: 16, nome: "Paraná", uf: "PR" },
    { id: 17, nome: "Pernambuco", uf: "PE" },
    { id: 18, nome: "Piauí", uf: "PI" },
    { id: 19, nome: "Rio de Janeiro", uf: "RJ" },
    { id: 20, nome: "Rio Grande do Norte", uf: "RN" },
    { id: 21, nome: "Rio Grande do Sul", uf: "RS" },
    { id: 22, nome: "Rondônia", uf: "RO" },
    { id: 23, nome: "Roraima", uf: "RR" },
    { id: 24, nome: "Santa Catarina", uf: "SC" },
    { id: 25, nome: "São Paulo", uf: "SP" },
    { id: 26, nome: "Sergipe", uf: "SE" },
    { id: 27, nome: "Tocantins", uf: "TO" },
  ]

  const fetchMunicipios = async (uf: string) => {
    setLoadingMunicipios(true)
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
      )
      const data = await response.json()
      setMunicipios(data)
    } catch {
      setMunicipios([])
    } finally {
      setLoadingMunicipios(false)
    }
  }

  const handleEstadoChange = (uf: string) => {
    if (uf !== editEstado) {
      setEditEstado(uf)
      setEditMunicipio("")
      if (uf) fetchMunicipios(uf)
    }
  }

  const handleSaveCategory = async () => {
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    setIsSubmittingCategory(true)
    try {
      const response = await fetch(`/api/profile/${profileId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_category: parseInt(selectedCategoryId),
          subcategories: selectedSubcategoryIds,
        }),
      })

      if (response.ok) {
        const selectedCategory = categories.find((c) => c.id_category.toString() === selectedCategoryId)
        const selectedSubs = selectedCategory?.subcategories.filter((s) =>
          selectedSubcategoryIds.includes(s.id_subcategory)
        ) ?? []
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                id_category: parseInt(selectedCategoryId),
                desc_category: selectedCategory?.desc_category ?? prev.desc_category,
                subcategories: selectedSubs,
              }
            : prev
        )
        setIsEditCategoryOpen(false)
      } else {
        const data = await response.json()
        alert(data.error || "Erro ao atualizar categoria")
      }
    } catch {
      alert("Erro ao salvar categoria. Tente novamente.")
    } finally {
      setIsSubmittingCategory(false)
    }
  }

  const handleSaveDisplayName = async () => {
    const currentToken = localStorage.getItem("token")
    console.log("[v0] handleSaveDisplayName - token:", currentToken ? "presente" : "ausente")
    console.log("[v0] handleSaveDisplayName - profileId:", profileId)
    console.log("[v0] handleSaveDisplayName - display_name:", editDisplayName)

    if (!currentToken) {
      alert("É necessário estar logado para editar o nome")
      return
    }

    setIsSubmittingDisplayName(true)

    try {
      const response = await fetch(`/api/profile/${profileId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ display_name: editDisplayName }),
      })

      console.log("[v0] handleSaveDisplayName - status:", response.status)

      if (response.ok) {
        setProfile((prev) => prev ? { ...prev, display_name: editDisplayName } : prev)
        setIsEditDisplayNameOpen(false)
      } else {
        const data = await response.json()
        console.log("[v0] handleSaveDisplayName - erro:", data)
        alert(data.error || "Erro ao atualizar nome")
      }
    } catch (err) {
      console.error("[v0] handleSaveDisplayName - catch:", err)
      alert("Erro ao salvar nome. Tente novamente.")
    } finally {
      setIsSubmittingDisplayName(false)
    }
  }

  const refetchPortfolio = async () => {
    try {
      const res = await fetch(`/api/profile/${profileId}/portfolio`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items ?? data.portfolio ?? [])
        setPortfolioItems(items)
      }
    } catch {
      // silencioso
    }
  }

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    const currentToken = localStorage.getItem("token")
    if (!currentToken) return

    setIsUploadingPortfolio(itemId)
    setPortfolioError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/profile/${profileId}/portfolio/${itemId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: formData,
      })
      if (res.ok) {
        await refetchPortfolio()
      } else {
        const data = await res.json()
        setPortfolioError(data.error || "Erro ao fazer upload")
      }
    } catch {
      setPortfolioError("Erro ao fazer upload. Tente novamente.")
    } finally {
      setIsUploadingPortfolio(null)
      e.target.value = ""
    }
  }

  const handleAddPortfolioItem = () => {
    setEditingPortfolioItemId(null)
    setPortfolioForm({ title: "", description: "", project_url: "", is_featured: false, sort_order: 0 })
    setPortfolioError(null)
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
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(isEditing ? {} : { id_user: profile?.id_user ?? null, id_profile: profileId }),
          title: portfolioForm.title.trim() || null,
          description: portfolioForm.description.trim() || null,
          project_url: portfolioForm.project_url.trim() || null,
          is_featured: portfolioForm.is_featured,
          sort_order: portfolioForm.sort_order,
        }),
      })
      if (res.ok) {
        setIsPortfolioModalOpen(false)
        setEditingPortfolioItemId(null)
        await refetchPortfolio()
      } else {
        const data = await res.json()
        setPortfolioError(data.error || (isEditing ? "Erro ao editar item" : "Erro ao criar item"))
      }
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

  const getInitials = (name: string) => {
    if (!name) return "?"
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const getSocialIcon = (icon: string) => {
    const lower = icon.toLowerCase()
    if (lower === "instagram") return <Instagram className="h-5 w-5 text-white" />
    if (lower === "youtube") return <Youtube className="h-5 w-5 text-white" />
    return <Video className="h-5 w-5 text-white" />
  }

  const getSocialBg = (icon: string) => {
    const lower = icon.toLowerCase()
    if (lower === "instagram") return "bg-gradient-to-br from-purple-500 to-pink-500"
    if (lower === "youtube") return "bg-red-600"
    return "bg-black"
  }

  const getStatusLabel = (desc: string) => {
    const map: Record<string, { label: string; className: string }> = {
      perfil_ativo: { label: "Perfil Ativo", className: "bg-green-600 hover:bg-green-700" },
      destaque_premium: { label: "Premium", className: "bg-primary text-primary-foreground hover:bg-primary/90" },
      taxa_paga: { label: "Taxa Paga", className: "bg-blue-600 hover:bg-blue-700" },
    }
    return map[desc] ?? { label: desc.replace(/_/g, " "), className: "" }
  }

  if (loading) {
    return <FreelancerProfileLoading />
  }

  if (error || !profile) {
    return <FreelancerProfileError message={error || "Perfil não encontrado"} />
  }

  return (
    <div className="bg-page-shell-dark">
      <main className="container mx-auto px-4 py-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="max-w-4xl mx-auto space-y-6">

          {/* Card 1 - Avatar, nome, localização e status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <Avatar className="h-24 w-24 shrink-0">
                  {(profile.avatar_url || profile.user_avatar) && (
                    <AvatarImage
                      src={profile.avatar_url ?? profile.user_avatar!}
                      alt={profile.display_name}
                    />
                  )}
                  <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
                    {getInitials(profile.display_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                    {isOwnProfile && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditDisplayName(profile.display_name)
                          setIsEditDisplayNameOpen(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {(profile.municipio || profile.estado) && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{[profile.municipio, profile.estado].filter(Boolean).join(", ")}</span>
                      </div>
                      {isOwnProfile && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={handleOpenLocationEdit}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {profile.statuses && profile.statuses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profile.statuses.map((status) => {
                        const { label, className } = getStatusLabel(status.desc_status)
                        return (
                          <Badge key={status.id_status} className={className}>
                            {label}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações — visível apenas para o dono do perfil */}
          {isOwnProfile && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(() => {
                  const statusList = profile.statuses?.map((s) => s.desc_status) ?? []
                  const taxaPendente = statusList.includes("taxa_pendente")
                  const perfilAtivo = statusList.includes("perfil_ativo")
                  return (
                    <>
                      {taxaPendente && (
                        <Button
                          size="sm"
                          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                          onClick={() =>
                            router.push(`/checkout?id_profile=${encodeURIComponent(profileId)}`)
                          }
                        >
                          Pagar taxa
                        </Button>
                      )}
                      {perfilAtivo && (
                        <Button size="sm" className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
                          Comprar 1 mês premium
                        </Button>
                      )}
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {/* Card 2 - Categoria, subcategorias e bio */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              {/* Categoria */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Categoria</p>
                  {isOwnProfile && (
                    <Button size="sm" variant="ghost" onClick={handleOpenCategoryEdit}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
                <p className="font-medium">{profile.desc_category}</p>
                {profile.subcategories && profile.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.subcategories.map((sub) => (
                      <Badge key={sub.id_subcategory} variant="secondary">
                        {sub.desc_subcategory}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t" />

              {/* Bio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Bio</p>
                  {isOwnProfile && (
                    <Button size="sm" variant="ghost" onClick={() => setIsEditBioOpen(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
                {profile.bio ? (
                  <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
                ) : (
                  <p className="text-muted-foreground italic">Sem bio cadastrada.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Portfólio */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Portfólio</CardTitle>
                {isOwnProfile && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddPortfolioItem}
                    disabled={isAddingPortfolioItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isAddingPortfolioItem ? "Criando..." : "Novo item"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {portfolioError && (
                <p className="text-sm text-destructive mb-3">{portfolioError}</p>
              )}
              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portfolioItems.map((item) => {
                    const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
                    const firstMedia = activeMedias[0]
                    return (
                      <div key={item.id_portfolio_item} className="border rounded-lg overflow-hidden bg-card flex flex-col">
                        {/* Mídia de capa */}
                        {firstMedia ? (
                          <div className="relative aspect-video bg-muted">
                            {firstMedia.media_type === "video" ? (
                              <video
                                src={firstMedia.media_url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                              />
                            ) : (
                              <img
                                src={firstMedia.media_url}
                                alt={item.title ?? "Mídia do portfólio"}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {activeMedias.length > 1 && (
                              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded px-1.5 py-0.5">
                                +{activeMedias.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-video bg-muted flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}

                        {/* Conteúdo */}
                        <div className="p-3 flex flex-col gap-1 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold leading-snug line-clamp-1">
                              {item.title || "Sem título"}
                            </p>
                            {isOwnProfile && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditPortfolioItem(item)}
                                  className="inline-flex items-center justify-center h-7 w-7 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                                  aria-label="Editar item"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePortfolioDeleteItem(item.id_portfolio_item)}
                                  className="inline-flex items-center justify-center h-7 w-7 border border-input bg-background hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors"
                                  aria-label="Remover item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          {item.project_url && (
                            <a
                              href={item.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline truncate inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">Ver projeto</span>
                            </a>
                          )}
                          {/* Miniaturas adicionais */}
                          {activeMedias.length > 1 && (
                            <div className="flex gap-1.5 mt-1.5 overflow-x-auto">
                              {activeMedias.slice(1).map((media) => (
                                <div key={media.id_portfolio_media} className="relative group shrink-0 w-12 h-12 rounded overflow-hidden border bg-muted">
                                  {media.media_type === "video" ? (
                                    <video src={media.media_url} className="w-full h-full object-cover" muted playsInline />
                                  ) : (
                                    <img src={media.media_url} alt="Mídia" className="w-full h-full object-cover" />
                                  )}
                                  {isOwnProfile && (
                                    <button
                                      type="button"
                                      onClick={() => handlePortfolioDeleteMedia(item.id_portfolio_item, media.id_portfolio_media)}
                                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                      aria-label="Remover mídia"
                                    >
                                      <X className="h-3 w-3 text-white" />
                                    </button>
                                  )}
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
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 opacity-40" />
                  <p className="text-sm">Nenhum item no portfólio.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Redes Sociais */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Redes Sociais</CardTitle>
                {isOwnProfile && (
                  <Button size="sm" variant="outline" onClick={handleOpenAddSocial}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {profile.social_media && profile.social_media.filter((s) => s.is_active).length > 0 ? (
                <div className="space-y-3">
                  {profile.social_media.filter((s) => s.is_active).map((social) => (
                    <div
                      key={social.id_profile_social_media}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <a
                        href={social.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <div className={`rounded-full p-2 ${getSocialBg(social.icon)}`}>
                          {getSocialIcon(social.icon)}
                        </div>
                        <div>
                          <p className="font-medium">{social.desc_social_media_type}</p>
                          <p className="text-sm text-muted-foreground">{social.profile_url}</p>
                        </div>
                      </a>
                      <div className="flex items-center gap-2 ml-3">
                        <Badge variant="secondary">{social.follower_range} seguidores</Badge>
                        {isOwnProfile && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleOpenEditSocial(social)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteSocial(social)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">Sem redes sociais cadastradas.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Modal de Rede Social */}
      <Dialog open={isSocialMediaModalOpen} onOpenChange={setIsSocialMediaModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingSocial ? "Editar Rede Social" : "Adicionar Rede Social"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingSocial && (
              <div className="space-y-2">
                <Label>Rede Social</Label>
                <Select
                  value={socialForm.id_social_media_type}
                  onValueChange={(v) => setSocialForm((prev) => ({ ...prev, id_social_media_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a rede social" />
                  </SelectTrigger>
                  <SelectContent>
                    {socialMediaMeta.types.map((t) => (
                      <SelectItem key={t.id_social_media_type} value={t.id_social_media_type.toString()}>
                        {t.desc_social_media_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="social-url">
                {editingSocial ? `URL / Usuário (${editingSocial.desc_social_media_type})` : "URL / Usuário"}
              </Label>
              <Input
                id="social-url"
                placeholder="Ex: meuusuario ou https://..."
                value={socialForm.url}
                onChange={(e) => setSocialForm((prev) => ({ ...prev, url: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Faixa de Seguidores</Label>
              <Select
                value={socialForm.id_follower_range}
                onValueChange={(v) => setSocialForm((prev) => ({ ...prev, id_follower_range: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a faixa" />
                </SelectTrigger>
                <SelectContent>
                  {socialMediaMeta.follower_ranges.map((r) => (
                    <SelectItem key={r.id_follower_range} value={r.id_follower_range.toString()}>
                      {r.follower_range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setIsSocialMediaModalOpen(false)} disabled={isSubmittingSocial}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSocial}
                disabled={
                  isSubmittingSocial ||
                  !socialForm.url ||
                  !socialForm.id_follower_range ||
                  (!editingSocial && !socialForm.id_social_media_type)
                }
              >
                {isSubmittingSocial ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Localização */}
      <Dialog open={isEditLocationOpen} onOpenChange={setIsEditLocationOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Localização</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={editEstado} onValueChange={handleEstadoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estado" />
                </SelectTrigger>
                <SelectContent>
                  {estados.map((e) => (
                    <SelectItem key={e.id} value={e.uf}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editEstado && (
              <div className="space-y-2">
                <Label>Município</Label>
                <Select value={editMunicipio} onValueChange={setEditMunicipio} disabled={loadingMunicipios}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMunicipios ? "Carregando..." : "Selecione um município"} />
                  </SelectTrigger>
                  <SelectContent>
                    {municipios.map((m) => (
                      <SelectItem key={m.id} value={m.nome}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditLocationOpen(false)}
                disabled={isSubmittingLocation}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveLocation} disabled={isSubmittingLocation || !editEstado || !editMunicipio}>
                {isSubmittingLocation ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Categoria e Subcategoria */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={(val) => {
                  setSelectedCategoryId(val)
                  setSelectedSubcategoryIds([])
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id_category} value={cat.id_category.toString()}>
                      {cat.desc_category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategoryId && (() => {
              const cat = categories.find((c) => c.id_category.toString() === selectedCategoryId)
              if (!cat?.subcategories?.length) return null
              return (
                <div className="space-y-2">
                  <Label>Subcategorias</Label>
                  <div className="flex flex-wrap gap-2">
                    {cat.subcategories.map((sub) => {
                      const selected = selectedSubcategoryIds.includes(sub.id_subcategory)
                      return (
                        <button
                          key={sub.id_subcategory}
                          type="button"
                          onClick={() => handleToggleSubcategory(sub.id_subcategory)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-input hover:bg-muted"
                          }`}
                        >
                          {sub.desc_subcategory}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)} disabled={isSubmittingCategory}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCategory} disabled={isSubmittingCategory || !selectedCategoryId}>
                {isSubmittingCategory ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Display Name */}
      <Dialog open={isEditDisplayNameOpen} onOpenChange={setIsEditDisplayNameOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Nome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de exibição</Label>
              <Input
                id="display_name"
                placeholder="Seu nome no perfil"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditDisplayNameOpen(false)} disabled={isSubmittingDisplayName}>
                Cancelar
              </Button>
              <Button onClick={handleSaveDisplayName} disabled={isSubmittingDisplayName}>
                {isSubmittingDisplayName ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Item de Portfólio */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={(open) => { setIsPortfolioModalOpen(open); if (!open) setEditingPortfolioItemId(null) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPortfolioItemId ? "Editar item de portfólio" : "Novo item de portfólio"}</DialogTitle>
            <DialogDescription>
              {editingPortfolioItemId
                ? "Atualize as informações do item do seu portfólio."
                : "Preencha as informações do novo item do seu portfólio. Após criar, você poderá adicionar mídias."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Label htmlFor="portfolio-project-url">URL do projeto</Label>
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
              <Button onClick={handleSubmitPortfolioItem} disabled={isAddingPortfolioItem}>
                {isAddingPortfolioItem
                  ? editingPortfolioItemId ? "Salvando..." : "Criando..."
                  : editingPortfolioItemId ? "Salvar" : "Criar item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Bio */}
      <Dialog open={isEditBioOpen} onOpenChange={setIsEditBioOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Bio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Descreva-se em poucas palavras..."
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditBioOpen(false)} disabled={isSubmittingBio}>
                Cancelar
              </Button>
              <Button onClick={handleSaveBio} disabled={isSubmittingBio}>
                {isSubmittingBio ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
