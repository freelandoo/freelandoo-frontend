"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCreatorPublicProfile } from "@/hooks/use-creator-public-profile"
import { FreelancerProfileError, FreelancerProfileLoading } from "./freelancer-states"
import type { PortfolioItem } from "@/lib/types/freelancer-profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Instagram, Youtube, ArrowLeft, Video, Settings, Plus, Trash2, ImageIcon, Upload, X, ExternalLink, CalendarDays, Clock, Loader2, Edit2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

  // Booking state
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [bookingDate, setBookingDate] = useState("")
  const [bookingSlots, setBookingSlots] = useState<{ start: string; end: string }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [bookingForm, setBookingForm] = useState({ client_name: "", client_email: "", client_whatsapp: "" })
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

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
    return <Video className="h-4 w-4 text-white" />
  }

  const getSocialBg = (icon: string) => {
    const lower = icon.toLowerCase()
    if (lower === "instagram") return "bg-gradient-to-br from-purple-500 to-pink-500"
    if (lower === "youtube") return "bg-red-600"
    return "bg-black"
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

          {/* Header Card */}
          <Card>
            <CardContent className="pt-6 relative">
              {isOwnProfile && (
                <Button
                  asChild
                  size="icon"
                  variant="outline"
                  className="absolute top-4 right-4 rounded-full"
                >
                  <Link href={`/account/profile/${profileId}/settings`}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              
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

                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold pr-12">{profile.display_name}</h1>
                    
                    {(profile.municipio || profile.estado) && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{[profile.municipio, profile.estado].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.machine_name && (
                      <Badge variant="outline" className="bg-muted">
                        {profile.machine_name}
                      </Badge>
                    )}
                    {profile.desc_category && (
                      <Badge variant="secondary">
                        {profile.desc_category}
                      </Badge>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl break-words whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  )}

                  {profile.social_media && profile.social_media.filter(s => s.is_active).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {profile.social_media.filter(s => s.is_active).map(social => (
                        <a
                          key={social.id_profile_social_media}
                          href={social.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center hover:opacity-80 transition-opacity"
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
                                <label
                                  className="inline-flex items-center justify-center h-7 w-7 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors cursor-pointer"
                                  aria-label="Adicionar mídia"
                                >
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*,video/*"
                                    onChange={(e) => handlePortfolioUpload(e, item.id_portfolio_item)}
                                    disabled={isUploadingPortfolio === item.id_portfolio_item}
                                  />
                                  {isUploadingPortfolio === item.id_portfolio_item ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Upload className="h-3.5 w-3.5" />
                                  )}
                                </label>
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
                              className="text-xs text-primary hover:underline truncate inline-flex items-center gap-1 mt-1"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">Ver projeto</span>
                            </a>
                          )}
                          {/* Miniaturas adicionais */}
                          {activeMedias.length > 1 && (
                            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
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

          {/* Agendar Horário — visível para visitantes (não dono) */}
          {!isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Agendar horário
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isBookingOpen ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">Quer marcar um horário com este profissional?</p>
                    <Button onClick={() => setIsBookingOpen(true)} className="gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Ver horários disponíveis
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Date picker */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Escolha a data</label>
                      <input
                        type="date"
                        min={new Date().toISOString().substring(0, 10)}
                        value={bookingDate}
                        onChange={async (e) => {
                          const d = e.target.value
                          setBookingDate(d)
                          setSelectedSlot(null)
                          setBookingError(null)
                          if (!d) { setBookingSlots([]); return }
                          setLoadingSlots(true)
                          try {
                            const res = await fetch(`/api/public/profile/${profileId}/available-slots?date=${d}`)
                            const data = await res.json()
                            setBookingSlots(data.slots || [])
                            if (data.message && (!data.slots || data.slots.length === 0)) {
                              setBookingError(data.message)
                            }
                          } catch { setBookingSlots([]) }
                          setLoadingSlots(false)
                        }}
                        className="w-full max-w-xs bg-background border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    {/* Slots */}
                    {bookingDate && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Horários disponíveis</label>
                        {loadingSlots ? (
                          <div className="flex items-center gap-2 text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buscando horários...
                          </div>
                        ) : bookingSlots.length === 0 ? (
                          <p className="text-muted-foreground text-sm py-4">
                            {bookingError || "Nenhum horário disponível nesta data."}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {bookingSlots.map((slot) => (
                              <button
                                key={slot.start}
                                onClick={() => { setSelectedSlot(slot.start); setBookingError(null) }}
                                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                                  selectedSlot === slot.start
                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                    : "bg-background hover:bg-muted border-border"
                                }`}
                              >
                                <Clock className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                                {slot.start}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Client form */}
                    {selectedSlot && (
                      <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                        <h4 className="font-medium">Seus dados</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor="booking-name">Nome *</Label>
                            <Input
                              id="booking-name"
                              placeholder="Seu nome completo"
                              value={bookingForm.client_name}
                              onChange={(e) => setBookingForm(f => ({ ...f, client_name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="booking-email">Email *</Label>
                            <Input
                              id="booking-email"
                              type="email"
                              placeholder="seu@email.com"
                              value={bookingForm.client_email}
                              onChange={(e) => setBookingForm(f => ({ ...f, client_email: e.target.value }))}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor="booking-whatsapp">WhatsApp (opcional)</Label>
                            <Input
                              id="booking-whatsapp"
                              placeholder="(11) 99999-9999"
                              value={bookingForm.client_whatsapp}
                              onChange={(e) => setBookingForm(f => ({ ...f, client_whatsapp: e.target.value }))}
                            />
                          </div>
                        </div>

                        {bookingError && (
                          <p className="text-destructive text-sm">{bookingError}</p>
                        )}

                        <Button
                          className="w-full gap-2"
                          disabled={isSubmittingBooking || !bookingForm.client_name.trim() || !bookingForm.client_email.trim()}
                          onClick={async () => {
                            setIsSubmittingBooking(true)
                            setBookingError(null)
                            try {
                              const res = await fetch(`/api/public/profile/${profileId}/bookings`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  client_name: bookingForm.client_name.trim(),
                                  client_email: bookingForm.client_email.trim(),
                                  client_whatsapp: bookingForm.client_whatsapp.trim() || null,
                                  booking_date: bookingDate,
                                  start_time: selectedSlot,
                                }),
                              })
                              const data = await res.json()
                              if (res.ok && data.checkout_url) {
                                window.location.href = data.checkout_url
                              } else {
                                setBookingError(data.error || "Erro ao agendar. Tente novamente.")
                              }
                            } catch {
                              setBookingError("Erro de conexão. Tente novamente.")
                            } finally {
                              setIsSubmittingBooking(false)
                            }
                          }}
                        >
                          {isSubmittingBooking ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                          ) : (
                            <>Confirmar e pagar sinal</>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Ao confirmar, você será redirecionado para o pagamento do sinal via Stripe.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
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
