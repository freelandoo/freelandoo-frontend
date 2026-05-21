"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Crown,
  CreditCard,
  ImageIcon,
  Lock,
  LogOut,
  MessageSquare,
  Search,
  Send,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react"
import { MediaCropModal } from "@/components/media/media-crop-modal"
import {
  POST_IMAGE_ASPECT_RATIO,
  POST_IMAGE_MAX_SIZE_BYTES,
  POST_IMAGE_OUTPUT,
  getImageDimensions,
  isAspectRatio,
  validateImageFile,
  validateVideoFile,
} from "@/lib/media/media-validation"
import { compressImageToMaxSize, type ProcessedImage } from "@/lib/media/image-processing"
import { getCapturedCoupon } from "@/lib/share-coupon"

type Member = {
  id_member_profile: string
  role: "owner" | "member"
  joined_at: string
  display_name: string
  avatar_url: string | null
  username: string
  id_user: string
}

type Invite = {
  id_clan_invite: number
  id_invited_profile: string
  invited_display_name: string
  invited_avatar_url: string | null
  invited_username: string
  created_at: string
}

type Clan = {
  id_profile: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  machine_name: string | null
  is_paid?: boolean
  is_visible?: boolean
  members: Member[]
  members_count: number
  max_slots: number
  settings: {
    free_slots: number
    paid_slots: number
    slot_price_cents?: number
  } | null
}

type PortfolioMedia = {
  id_portfolio_media: string
  media_url: string
  media_type: "image" | "video" | "file"
  thumbnail_url: string | null
}

type PortfolioItem = {
  id_portfolio_item: string
  title: string
  description: string | null
  media: PortfolioMedia[]
}

type ClanMessage = {
  id_clan_message: number
  id_user: string
  content: string
  created_at: string
  author_username: string
  author_display_name: string
  author_avatar_url: string | null
}

type InvitableProfile = {
  id_profile: string
  id_user: string
  display_name: string
  avatar_url: string | null
  username: string
  user_avatar: string | null
  desc_category: string | null
  is_paid: boolean
  already_in_clan: boolean
}

export default function ManageClanPage({
  params,
}: {
  params: Promise<{ id_profile: string }>
}) {
  const { id_profile } = use(params)
  const router = useRouter()
  const [clan, setClan] = useState<Clan | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [me, setMe] = useState<{ id_user: string } | null>(null)

  // Invite form
  const [search, setSearch] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<InvitableProfile[]>([])
  const [inviteError, setInviteError] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Slot purchase
  const [buyingSlot, setBuyingSlot] = useState(false)

  // Portfolio
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [newItemTitle, setNewItemTitle] = useState("")
  const [newItemFile, setNewItemFile] = useState<File | null>(null)
  const [newItemOriginalImage, setNewItemOriginalImage] = useState<File | null>(null)
  const [newItemPreview, setNewItemPreview] = useState<string | null>(null)
  const [newItemCropFile, setNewItemCropFile] = useState<File | null>(null)
  const [processingPortfolioMedia, setProcessingPortfolioMedia] = useState(false)
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)
  const [portfolioError, setPortfolioError] = useState("")

  // Messages
  const [messages, setMessages] = useState<ClanMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageError, setMessageError] = useState("")

  async function loadAll() {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    const auth = { Authorization: `Bearer ${token}` }
    try {
      const [clanRes, invitesRes, meRes, messagesRes, portfolioRes] =
        await Promise.all([
          fetch(`/api/clans/${id_profile}`),
          fetch(`/api/clans/${id_profile}/invites`, { headers: auth }),
          fetch("/api/users/me", { headers: auth }),
          fetch(`/api/clans/${id_profile}/messages`, { headers: auth }),
          fetch(`/api/profile/${id_profile}/portfolio`, { headers: auth }),
        ])
      const clanData = await clanRes.json()
      const invitesData = await invitesRes.json()
      const meData = await meRes.json()
      const messagesData = await messagesRes.json()
      const portfolioData = await portfolioRes.json()
      setPortfolio(portfolioData?.items || [])

      if (!clanRes.ok) {
        setError(clanData?.error || "Clan não encontrado")
        return
      }
      setClan(clanData.clan)
      setInvites(invitesData.invites || [])
      setMe(meData?.user || meData)
      // backend retorna em ordem desc; inverte para chat-style asc
      setMessages(((messagesData.messages || []) as ClanMessage[]).slice().reverse())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Erro ao carregar: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id_profile])

  async function handleSearch() {
    setInviteError("")
    setSearchResults([])
    if (!search.trim()) return
    setSearching(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(
        `/api/clans/invitable?username=${encodeURIComponent(search.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data?.error || "Erro na busca")
        return
      }
      setSearchResults(data.profiles || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setInviteError(`Erro na busca: ${msg}`)
    } finally {
      setSearching(false)
    }
  }

  async function handleInvite(id_invited_profile: string) {
    setInviteError("")
    setActionLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/clans/${id_profile}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id_invited_profile }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data?.error || "Erro ao convidar")
        return
      }
      setSearch("")
      setSearchResults([])
      await loadAll()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setInviteError(`Erro: ${msg}`)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancelInvite(id_clan_invite: number) {
    if (!confirm("Cancelar este convite?")) return
    const token = localStorage.getItem("token")
    setActionLoading(true)
    await fetch(`/api/clans/invites/${id_clan_invite}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    await loadAll()
    setActionLoading(false)
  }

  async function handleRemove(id_member_profile: string, isSelf: boolean) {
    const msg = isSelf
      ? "Tem certeza que quer sair do clan?"
      : "Remover este membro do clan?"
    if (!confirm(msg)) return
    const token = localStorage.getItem("token")
    setActionLoading(true)
    const res = await fetch(
      `/api/clans/${id_profile}/members/${id_member_profile}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    if (!res.ok) {
      alert(data?.error || "Erro ao remover")
    } else if (isSelf) {
      router.push("/account/clans")
      return
    } else {
      await loadAll()
    }
    setActionLoading(false)
  }

  function clearNewPortfolioMedia() {
    if (newItemPreview?.startsWith("blob:")) URL.revokeObjectURL(newItemPreview)
    setNewItemFile(null)
    setNewItemOriginalImage(null)
    setNewItemPreview(null)
  }

  function setProcessedPortfolioImage(processed: ProcessedImage, originalFile: File) {
    if (newItemPreview?.startsWith("blob:")) URL.revokeObjectURL(newItemPreview)
    setNewItemFile(processed.file)
    setNewItemOriginalImage(originalFile)
    setNewItemPreview(processed.previewUrl)
  }

  async function prepareClanPortfolioFile(file: File) {
    setPortfolioError("")

    if (file.type.startsWith("image/")) {
      const validation = validateImageFile(file, POST_IMAGE_MAX_SIZE_BYTES)
      if (!validation.ok) {
        setPortfolioError(validation.error)
        return
      }

      try {
        const dimensions = await getImageDimensions(file)
        if (!isAspectRatio(dimensions.width, dimensions.height, POST_IMAGE_ASPECT_RATIO)) {
          setNewItemCropFile(file)
          return
        }

        setProcessingPortfolioMedia(true)
        const processed = await compressImageToMaxSize(file, {
          outputWidth: POST_IMAGE_OUTPUT.width,
          outputHeight: POST_IMAGE_OUTPUT.height,
          maxSizeBytes: POST_IMAGE_MAX_SIZE_BYTES,
          mimeType: "image/webp",
          errorMessage: "A imagem do post precisa ter no máximo 3MB.",
        })
        setProcessedPortfolioImage(processed, file)
      } catch (err) {
        setPortfolioError(err instanceof Error ? err.message : "Não foi possível otimizar esse arquivo. Tente outro.")
      } finally {
        setProcessingPortfolioMedia(false)
      }
      return
    }

    const validation = validateVideoFile(file)
    if (!validation.ok) {
      setPortfolioError(validation.error)
      return
    }

    if (newItemPreview?.startsWith("blob:")) URL.revokeObjectURL(newItemPreview)
    setNewItemFile(file)
    setNewItemOriginalImage(null)
    setNewItemPreview(URL.createObjectURL(file))
  }

  function handleClanPortfolioFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    void prepareClanPortfolioFile(file)
  }

  function handleClanPortfolioCropConfirm(image: ProcessedImage) {
    if (!newItemCropFile) return
    setProcessedPortfolioImage(image, newItemCropFile)
    setNewItemCropFile(null)
  }

  async function handleAddPortfolioItem() {
    setPortfolioError("")
    const title = newItemTitle.trim()
    if (!title) return setPortfolioError("Dê um título ao item")
    if (!newItemFile) return setPortfolioError("Selecione um arquivo")

    setUploadingPortfolio(true)
    try {
      const token = localStorage.getItem("token")
      const auth = { Authorization: `Bearer ${token}` }

      // 1. Cria item
      const createRes = await fetch(`/api/profile/${id_profile}/portfolio`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) {
        setPortfolioError(createData?.error || "Erro ao criar item")
        return
      }
      const itemId = createData?.item?.id_portfolio_item
      if (!itemId) {
        setPortfolioError("Resposta inesperada do backend")
        return
      }

      // 2. Faz upload da mídia
      const fd = new FormData()
      fd.append("file", newItemFile)
      const upRes = await fetch(
        `/api/profile/${id_profile}/portfolio/${itemId}/upload`,
        { method: "POST", headers: auth, body: fd }
      )
      const upData = await upRes.json()
      if (!upRes.ok) {
        setPortfolioError(upData?.error || "Item criado, mas upload falhou")
      }

      // Reset + reload
      setNewItemTitle("")
      clearNewPortfolioMedia()
      const refreshed = await fetch(`/api/profile/${id_profile}/portfolio`, {
        headers: auth,
      })
      const refreshedData = await refreshed.json()
      setPortfolio(refreshedData?.items || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setPortfolioError(`Erro: ${msg}`)
    } finally {
      setUploadingPortfolio(false)
    }
  }

  async function handleDeletePortfolioItem(id_portfolio_item: string) {
    if (!confirm("Apagar este item do portfólio?")) return
    const token = localStorage.getItem("token")
    const res = await fetch(
      `/api/profile/${id_profile}/portfolio/${id_portfolio_item}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.ok) {
      setPortfolio((prev) =>
        prev.filter((i) => i.id_portfolio_item !== id_portfolio_item)
      )
    } else {
      const data = await res.json()
      alert(data?.error || "Erro ao apagar item")
    }
  }

  async function handleBuySlot() {
    if (!confirm("Comprar uma vaga adicional por R$39? Você será redirecionado ao pagamento.")) return
    setBuyingSlot(true)
    try {
      const token = localStorage.getItem("token")
      const sharedCoupon = getCapturedCoupon()
      const res = await fetch(`/api/clans/${id_profile}/slots/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(sharedCoupon?.code ? { coupon_code: sharedCoupon.code } : {}),
      })
      const data = await res.json()
      if (!res.ok || !data?.checkout_url) {
        alert(data?.error || "Erro ao iniciar checkout")
        setBuyingSlot(false)
        return
      }
      window.location.href = data.checkout_url
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Erro: ${msg}`)
      setBuyingSlot(false)
    }
  }

  async function handleSendMessage() {
    setMessageError("")
    const text = newMessage.trim()
    if (!text) return
    if (text.length > 2000) {
      setMessageError("Mensagem deve ter no máximo 2000 caracteres")
      return
    }
    setSendingMessage(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/clans/${id_profile}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessageError(data?.error || "Erro ao enviar mensagem")
        return
      }
      setNewMessage("")
      setMessages((prev) => [...prev, data.message])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMessageError(`Erro: ${msg}`)
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleDeleteMessage(id_clan_message: number) {
    if (!confirm("Apagar esta mensagem?")) return
    const token = localStorage.getItem("token")
    const res = await fetch(`/api/clans/messages/${id_clan_message}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setMessages((prev) =>
        prev.filter((m) => m.id_clan_message !== id_clan_message)
      )
    } else {
      const data = await res.json()
      alert(data?.error || "Erro ao apagar mensagem")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground">Carregando clan...</p>
      </div>
    )
  }

  if (error || !clan) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <Card>
          <CardContent className="pt-6 flex items-center gap-2 text-red-600">
            <AlertCircle className="size-5" />
            {error || "Clan não encontrado"}
          </CardContent>
        </Card>
        <Link
          href="/account/clans"
          className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </div>
    )
  }

  const myMembership = clan.members.find(
    (m) => me && String(m.id_user) === String(me.id_user)
  )
  const isOwner = myMembership?.role === "owner"
  const occupied = clan.members.length + invites.length
  const freeSlots = clan.settings?.free_slots ?? 3
  const paidSlots = clan.settings?.paid_slots ?? 0
  const totalUnlocked = freeSlots + paidSlots
  const slotsAvailable = totalUnlocked - occupied
  const lockedSlots = 6 - totalUnlocked
  const slotPrice = ((clan.settings?.slot_price_cents ?? 3900) / 100).toFixed(2)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href={`/clans/${id_profile}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar para o clan
        </Link>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/account/profile/${id_profile}/agenda`}>
                <CalendarDays className="size-4 mr-1" /> Agenda
              </Link>
            </Button>
          )}
          {!isOwner && myMembership && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRemove(myMembership.id_member_profile, true)}
              disabled={actionLoading}
            >
              <LogOut className="size-4 mr-1" /> Sair do clan
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {clan.display_name}
            {isOwner && (
              <Badge variant="default" className="ml-2">
                <Crown className="size-3 mr-1" /> Você é o dono
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {clan.machine_name || "—"} · {clan.members_count}/{clan.max_slots ?? 3} membros
            {clan.bio ? ` · ${clan.bio}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {clan.members.map((m) => (
              <div
                key={m.id_member_profile}
                className="flex items-center gap-2 border rounded-md px-3 py-2"
              >
                <Avatar className="size-8">
                  <AvatarImage src={m.avatar_url || undefined} />
                  <AvatarFallback>
                    {m.display_name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {m.display_name}
                    {m.role === "owner" && (
                      <Crown className="size-3 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">@{m.username}</div>
                </div>
                {isOwner && m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(m.id_member_profile, false)}
                    disabled={actionLoading}
                    title="Remover do clan"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vagas do clan</CardTitle>
          <CardDescription>
            {freeSlots} vaga(s) grátis + {paidSlots} paga(s) ·{" "}
            {occupied}/{totalUnlocked} ocupadas
            {lockedSlots > 0 && ` · ${lockedSlots} bloqueada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, i) => {
              const member = clan.members[i]
              const isUnlocked = i < totalUnlocked
              const hasPendingInvite =
                !member && i < clan.members.length + invites.length
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-md border flex flex-col items-center justify-center gap-1 text-center p-2 ${
                    member
                      ? "bg-muted/40"
                      : !isUnlocked
                        ? "bg-muted/20 border-dashed text-muted-foreground"
                        : hasPendingInvite
                          ? "bg-amber-50 border-amber-200"
                          : "bg-background border-dashed"
                  }`}
                >
                  {member ? (
                    <>
                      <Avatar className="size-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.display_name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate w-full">
                        {member.display_name}
                      </span>
                    </>
                  ) : !isUnlocked ? (
                    <>
                      <Lock className="size-5" />
                      <span className="text-xs">Bloqueada</span>
                    </>
                  ) : hasPendingInvite ? (
                    <>
                      <UserPlus className="size-5 text-amber-600" />
                      <span className="text-xs text-amber-700">Convite enviado</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Vaga aberta</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {isOwner && lockedSlots > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 border rounded-md p-3 bg-muted/30">
              <div className="text-sm">
                <div className="font-medium">Liberar mais 1 vaga</div>
                <div className="text-xs text-muted-foreground">
                  R$ {slotPrice} · pagamento único · libera 1 vaga adicional
                  permanentemente.
                </div>
              </div>
              <Button onClick={handleBuySlot} disabled={buyingSlot}>
                <CreditCard className="size-4 mr-1" />
                {buyingSlot ? "Redirecionando..." : `Comprar vaga`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {myMembership && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-5" /> Portfólio do clan
            </CardTitle>
            <CardDescription>
              Qualquer membro pode adicionar itens. {isOwner ? "Como dono, você pode remover qualquer item." : "Apenas o dono pode remover itens."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolio.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum item ainda. Adicione abaixo.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {portfolio.map((item) => {
                  const cover = item.media?.[0]
                  const isImage = cover?.media_type === "image"
                  return (
                    <div
                      key={item.id_portfolio_item}
                      className="border rounded-md overflow-hidden group relative"
                    >
                      <div className="aspect-square bg-muted">
                        {isImage && cover?.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover.media_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : cover?.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover.thumbnail_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            {cover?.media_type || "vazio"}
                          </div>
                        )}
                      </div>
                      <div className="p-2 text-xs truncate">{item.title}</div>
                      {isOwner && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            handleDeletePortfolioItem(item.id_portfolio_item)
                          }
                          title="Remover item"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="text-sm font-medium">Adicionar item</div>
              <Input
                placeholder="Título do item"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                maxLength={160}
              />
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={handleClanPortfolioFileSelect}
              />
              {newItemPreview && (
                <div className={`relative overflow-hidden rounded-md border bg-muted ${newItemFile?.type.startsWith("image/") ? "aspect-[4/5]" : "aspect-video"}`}>
                  {newItemFile?.type.startsWith("image/") ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={newItemPreview} alt="Preview" className="h-full w-full object-cover" />
                      {newItemOriginalImage && (
                        <button
                          type="button"
                          onClick={() => setNewItemCropFile(newItemOriginalImage)}
                          className="absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/85"
                        >
                          Cortar imagem
                        </button>
                      )}
                    </>
                  ) : (
                    <video src={newItemPreview} className="h-full w-full object-cover" controls preload="metadata" />
                  )}
                  <button
                    type="button"
                    onClick={clearNewPortfolioMedia}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/85"
                    aria-label="Remover mídia"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              {portfolioError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-4" /> {portfolioError}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddPortfolioItem}
                  disabled={uploadingPortfolio || processingPortfolioMedia || !newItemFile || !newItemTitle.trim()}
                >
                  <Upload className="size-4 mr-1" />
                  {uploadingPortfolio ? "Enviando..." : processingPortfolioMedia ? "Otimizando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" /> Quadro de mensagens
          </CardTitle>
          <CardDescription>
            Recados visíveis apenas para os membros do clan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma mensagem ainda. Seja o primeiro a deixar um recado.
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = me && String(msg.id_user) === String(me.id_user)
                const canDelete = isMine || isOwner
                return (
                  <div
                    key={msg.id_clan_message}
                    className="flex items-start gap-2 group"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={msg.author_avatar_url || undefined} />
                      <AvatarFallback>
                        {msg.author_display_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/50 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">
                          {msg.author_display_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{msg.author_username} ·{" "}
                          {new Date(msg.created_at).toLocaleString("pt-BR")}
                        </span>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 ml-auto opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteMessage(msg.id_clan_message)}
                            title="Apagar"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {myMembership && (
            <div className="space-y-2 pt-2 border-t">
              <Textarea
                placeholder="Deixe um recado..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={2}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              {messageError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-4" /> {messageError}
                </p>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {newMessage.length}/2000 · Ctrl+Enter envia
                </span>
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                >
                  <Send className="size-4 mr-1" />
                  {sendingMessage ? "Enviando..." : "Enviar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-5" /> Convidar sub-perfil
              </CardTitle>
              <CardDescription>
                {slotsAvailable > 0
                  ? `${slotsAvailable} vaga(s) disponível(eis). Busque pelo @username.`
                  : "Sem vagas disponíveis. Compre uma vaga adicional para convidar mais."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Username (sem o @)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  disabled={slotsAvailable <= 0}
                />
                <Button
                  onClick={handleSearch}
                  disabled={searching || slotsAvailable <= 0}
                >
                  <Search className="size-4 mr-1" /> Buscar
                </Button>
              </div>

              {inviteError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="size-4" /> {inviteError}
                </p>
              )}

              {searchResults.length > 0 && (() => {
                const head = searchResults[0]
                return (
                  <div className="border rounded-md overflow-hidden">
                    <div className="flex items-center gap-3 p-3 bg-muted/40">
                      <Avatar className="size-12">
                        <AvatarImage src={head.user_avatar || undefined} />
                        <AvatarFallback>
                          {head.username?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">@{head.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {searchResults.length} subperfil(is) encontrado(s) — escolha qual entra no clan
                        </div>
                      </div>
                    </div>
                    <div className="divide-y">
                      {searchResults.map((p) => {
                        const blocked = !p.is_paid || p.already_in_clan
                        const reason = !p.is_paid
                          ? "Subperfil inativo"
                          : p.already_in_clan
                            ? "Já está em outro clan"
                            : ""
                        return (
                          <div
                            key={p.id_profile}
                            className="flex items-center gap-3 p-3"
                          >
                            <Avatar className="size-9">
                              <AvatarImage src={p.avatar_url || undefined} />
                              <AvatarFallback>
                                {p.display_name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{p.display_name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {p.desc_category || "—"}
                              </div>
                              {blocked && (
                                <div className="text-xs text-amber-700 mt-0.5">{reason}</div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleInvite(p.id_profile)}
                              disabled={blocked || actionLoading}
                            >
                              Convidar
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {invites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Convites pendentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id_clan_invite}
                    className="flex items-center gap-3 border rounded-md p-3"
                  >
                    <Avatar>
                      <AvatarImage src={inv.invited_avatar_url || undefined} />
                      <AvatarFallback>
                        {inv.invited_display_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {inv.invited_display_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{inv.invited_username}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvite(inv.id_clan_invite)}
                      disabled={actionLoading}
                    >
                      Cancelar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {newItemCropFile && (
        <MediaCropModal
          file={newItemCropFile}
          aspectRatio={POST_IMAGE_ASPECT_RATIO}
          outputWidth={POST_IMAGE_OUTPUT.width}
          outputHeight={POST_IMAGE_OUTPUT.height}
          maxSizeMB={3}
          mediaType="post_image"
          title="Cortar imagem"
          description="Corte sua imagem no formato 4:5 para aparecer melhor no feed."
          onCancel={() => setNewItemCropFile(null)}
          onConfirm={handleClanPortfolioCropConfirm}
        />
      )}
    </div>
  )
}
