"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCreatorPublicProfile } from "@/hooks/use-creator-public-profile"
import { FreelancerProfileError, FreelancerProfileLoading } from "./freelancer-states"
import type { PortfolioItem } from "@/lib/types/freelancer-profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Instagram, Youtube, ArrowLeft, Video, Settings, Plus, Trash2, ImageIcon, Upload, X, ExternalLink, CalendarDays, Clock, Loader2, Edit2, MessageCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProfileScheduleSection } from "@/components/calendar/ProfileScheduleSection"

export default function FreelancerProfileView({ profileId }: { profileId: string }) {
  const router = useRouter()
  const { profile, portfolioItems, setPortfolioItems, loading, error, isOwnProfile } =
    useCreatorPublicProfile(profileId)

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
    if (lower === "instagram") return <Instagram className="h-4 w-4 text-white" />
    if (lower === "youtube") return <Youtube className="h-4 w-4 text-white" />
    if (lower === "whatsapp") return <MessageCircle className="h-4 w-4 text-white" />
    return <Video className="h-4 w-4 text-white" />
  }

  const getSocialBg = (icon: string) => {
    const lower = icon.toLowerCase()
    if (lower === "instagram") return "bg-gradient-to-br from-purple-500 to-pink-500"
    if (lower === "youtube") return "bg-red-600"
    if (lower === "whatsapp") return "bg-green-500"
    return "bg-black"
  }

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

        {/* HEADER SECTION */}
        <section className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 mb-12">
          {/* Avatar Area */}
          <div className="shrink-0">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border border-border">
              {(profile.avatar_url || profile.user_avatar) && (
                <AvatarImage
                  src={profile.avatar_url ?? profile.user_avatar!}
                  alt={profile.display_name}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-primary text-4xl font-bold text-primary-foreground">
                {getInitials(profile.display_name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info Area */}
          <div className="flex-1 space-y-5 text-center md:text-left w-full">
            {/* Name and Buttons Row */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <h1 className="text-2xl md:text-3xl font-semibold">{profile.display_name}</h1>
              
              <div className="flex items-center justify-center md:justify-start gap-2 w-full md:w-auto">
                {isOwnProfile ? (
                  <>
                    <Button 
                      asChild 
                      variant="secondary" 
                      className="font-semibold bg-secondary/80 hover:bg-secondary text-secondary-foreground flex-1 md:flex-none"
                    >
                      <Link href={`/account/profile/${profileId}/settings`}>
                        Editar perfil
                      </Link>
                    </Button>
                    <Button 
                      onClick={() => {
                        const agendaEl = document.getElementById("agenda-section")
                        if (agendaEl) agendaEl.scrollIntoView({ behavior: "smooth" })
                      }}
                      className="font-semibold flex-1 md:flex-none"
                    >
                      Agendar
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => {
                      const agendaEl = document.getElementById("agenda-section")
                      if (agendaEl) agendaEl.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="font-semibold w-full md:w-auto px-8"
                  >
                    Agendar
                  </Button>
                )}
              </div>
            </div>

            {/* Badges and Location */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm">
              <div className="flex items-center justify-center md:justify-start gap-2">
                {profile.machine_name && (
                  <Badge variant="outline" className="font-medium">
                    {profile.machine_name}
                  </Badge>
                )}
                {profile.desc_category && (
                  <Badge variant="secondary" className="font-medium bg-muted">
                    {profile.desc_category}
                  </Badge>
                )}
              </div>
              {(profile.municipio || profile.estado) && (
                <div className="flex items-center justify-center md:justify-start gap-1 text-muted-foreground font-medium">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{[profile.municipio, profile.estado].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm md:text-base leading-relaxed max-w-2xl break-words whitespace-pre-wrap mx-auto md:mx-0">
                {profile.bio}
              </p>
            )}

            {/* Social Links */}
            {profile.social_media && profile.social_media.filter(s => s.is_active).length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {profile.social_media.filter(s => s.is_active).map(social => (
                  <a
                    key={social.id_profile_social_media}
                    href={social.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center hover:scale-110 transition-transform"
                    title={social.desc_social_media_type}
                  >
                    <div className={`rounded-full p-2 ${getSocialBg(social.icon)}`}>
                      {getSocialIcon(social.icon)}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* DIVIDER */}
        <div className="border-t border-border mb-8"></div>

        {/* PORTFOLIO SECTION */}
        <section className="mb-16">
          <div className="flex items-center justify-center md:justify-between mb-8">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-wide uppercase text-muted-foreground">Portfólio</h2>
            </div>
            {isOwnProfile && (
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
          {isOwnProfile && (
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

          {portfolioError && (
            <p className="text-sm text-destructive mb-6 text-center">{portfolioError}</p>
          )}

          {portfolioItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 md:gap-4 lg:gap-6">
              {portfolioItems.map((item) => {
                const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
                const firstMedia = activeMedias[0]
                return (
                  <div key={item.id_portfolio_item} className="group relative flex flex-col">
                    {/* Media Container 4:5 aspect ratio */}
                    {firstMedia ? (
                      <div className="relative aspect-[4/5] bg-muted overflow-hidden md:rounded-lg border border-border/50">
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
                                accept="image/*,video/*"
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
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative aspect-[4/5] bg-muted flex items-center justify-center md:rounded-lg border border-border/50">
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
                                accept="image/*,video/*"
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
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm line-clamp-1">{item.title || "Sem título"}</h3>
                        {item.project_url && (
                          <a
                            href={item.project_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center shrink-0"
                            title="Ver projeto"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
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
              <p className="text-sm font-medium">Nenhum item no portfólio ainda.</p>
              {isOwnProfile && (
                <Button variant="link" onClick={handleAddPortfolioItem} className="mt-2 text-primary">
                  Adicionar o primeiro item
                </Button>
              )}
            </div>
          )}
        </section>

        {/* AGENDA SECTION */}
        <ProfileScheduleSection profileId={profileId} profileName={profile.display_name || "este profissional"} />
      </main>

      {/* Modal de Novo Item de Portfólio */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={(open) => { setIsPortfolioModalOpen(open); if (!open) setEditingPortfolioItemId(null) }}>
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
    </div>
  )
}
