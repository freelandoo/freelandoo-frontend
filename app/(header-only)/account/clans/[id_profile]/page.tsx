"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Crown,
  CreditCard,
  GraduationCap,
  ImageIcon,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Wallet,
  X,
} from "lucide-react"
import { MediaCropModal } from "@/components/media/media-crop-modal"
import {
  ProfilePublicServicesSection,
} from "@/components/profile/profile-public-services-section"
import type { ProfileServiceEditClanMember } from "@/components/profile/profile-service-edit-modal"
import { useMyCourses, type MyCourse } from "@/hooks/use-my-courses"
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
import { LoadingState, PageShell, TabloidBackLink, TabloidPageIntro } from "@/components/tabloide"

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

type ClanPayout = {
  id_clan_payout: number
  id_clan_profile: string
  source: string
  source_type: "clan_service" | "clan_course"
  amount_cents: number
  status: "aguardando" | "aprovado" | "pago" | "revertido"
  available_at: string
  created_at: string
  service_name: string | null
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

  // Saldo do clan (splits que caíram no meu Saldo via este clan)
  const [payouts, setPayouts] = useState<ClanPayout[]>([])

  // Cursos do clan criados por mim (qualquer membro pode criar)
  const { courses: myCourses, createCourse } = useMyCourses()
  const [creatingCourse, setCreatingCourse] = useState(false)

  async function loadAll() {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    const auth = { Authorization: `Bearer ${token}` }
    try {
      const [clanRes, invitesRes, meRes, payoutsRes, portfolioRes] =
        await Promise.all([
          fetch(`/api/clans/${id_profile}`),
          fetch(`/api/clans/${id_profile}/invites`, { headers: auth }),
          fetch("/api/users/me", { headers: auth }),
          fetch(`/api/me/booking-payouts`, { headers: auth, cache: "no-store" }),
          fetch(`/api/profile/${id_profile}/portfolio`, { headers: auth }),
        ])
      const clanData = await clanRes.json()
      const invitesData = await invitesRes.json()
      const meData = await meRes.json()
      const payoutsData = await payoutsRes.json()
      const portfolioData = await portfolioRes.json()
      setPortfolio(portfolioData?.items || [])

      if (!clanRes.ok) {
        setError(clanData?.error || "Clan não encontrado")
        return
      }
      setClan(clanData.clan)
      setInvites(invitesData.invites || [])
      setMe(meData?.user || meData)
      // Só os splits que vieram DESTE clan caem no Saldo do membro logado.
      setPayouts(
        ((payoutsData?.items || []) as ClanPayout[]).filter(
          (p) => p.source === "clan" && String(p.id_clan_profile) === String(id_profile)
        )
      )
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

  async function handleCreateCourse() {
    setCreatingCourse(true)
    try {
      const created = await createCourse({
        title: "Novo curso do clan",
        profile_id: id_profile,
      })
      router.push(`/account/courses/${created.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Erro ao criar curso: ${msg}`)
      setCreatingCourse(false)
    }
  }

  if (loading) {
    return (
      <PageShell className="tabloid-account-page md:pl-[80px]">
        <div className="relative z-10 px-4 py-16">
          <LoadingState label="Carregando clan..." />
        </div>
      </PageShell>
    )
  }

  if (error || !clan) {
    return (
      <PageShell className="tabloid-account-page md:pl-[80px]">
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-12">
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
      </PageShell>
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
    <PageShell className="tabloid-account-page md:pl-[80px]">
    <main className="relative z-10 mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
      <TabloidPageIntro
        eyebrow={isOwner ? "Dono do clan" : "Membro do clan"}
        title="CLAN."
        subtitle={`${clan.display_name} em modo operacional: membros, vagas, mural, convites e permissões em cards de papel.`}
        back={<TabloidBackLink href={`/clans/${id_profile}`}>Voltar para o clan</TabloidBackLink>}
        actions={
          <>
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
          </>
        }
      />

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

      {/* Chat do clan agora é o grupo fixado no /mensagens (não mais mural). */}
      {myMembership && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" /> Chat do clan
            </CardTitle>
            <CardDescription>
              O quadro de recados virou um grupo no /mensagens, fixado no topo da
              sua caixa de entrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/mensagens">
                <MessageSquare className="size-4 mr-1" /> Abrir chat do clan
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Serviços do clan — qualquer membro cria; anexa membros que dividem. */}
      {myMembership && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="size-5" /> Serviços do clan
            </CardTitle>
            <CardDescription>
              Qualquer membro pode criar um serviço e anexar quem participa. A
              venda é dividida igualmente no Saldo de cada anexado (liberação em
              8 dias).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfilePublicServicesSection
              profileId={id_profile}
              showOwnerControls
              allowPublicBooking
              isClan
              clanMembers={
                clan.members.map((m) => ({
                  id_member_profile: m.id_member_profile,
                  display_name: m.display_name,
                  avatar_url: m.avatar_url,
                  username: m.username,
                  role: m.role,
                })) as ProfileServiceEditClanMember[]
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Cursos do clan — qualquer membro cria; anexa membros no editor. */}
      {myMembership && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="size-5" /> Cursos do clan
              </CardTitle>
              <CardDescription>
                Crie cursos vinculados ao clan. Anexe os membros participantes no
                editor — a venda divide igual no Saldo de cada um.
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleCreateCourse} disabled={creatingCourse}>
              <Plus className="size-4 mr-1" />
              {creatingCourse ? "Criando..." : "Criar curso"}
            </Button>
          </CardHeader>
          <CardContent>
            {(() => {
              const clanCourses = (myCourses as MyCourse[]).filter(
                (c) => String(c.profile_id) === String(id_profile)
              )
              if (clanCourses.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    Você ainda não criou cursos neste clan.
                  </p>
                )
              }
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {clanCourses.map((c) => (
                    <Link
                      key={c.id}
                      href={`/account/courses/${c.id}`}
                      className="flex items-center gap-3 border rounded-md p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="size-10 shrink-0 rounded bg-muted overflow-hidden">
                        {c.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.cover_url} alt={c.title} className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                            <GraduationCap className="size-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{c.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">{c.status}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Saldo gerado pelo clan (splits de serviço/curso no meu Saldo). */}
      {myMembership && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" /> Saldo gerado pelo clan
            </CardTitle>
            <CardDescription>
              Sua parte das vendas deste clan. O dinheiro cai no seu Saldo geral —
              acompanhe e saque em <Link href="/pagamentos" className="underline">Pagamentos</Link>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma venda do clan ainda.
              </p>
            ) : (
              <>
                {(() => {
                  const sum = (st: ClanPayout["status"]) =>
                    payouts.filter((p) => p.status === st).reduce((a, p) => a + (p.amount_cents || 0), 0)
                  const brl = (c: number) => ((c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  return (
                    <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md border p-2">
                        <div className="text-xs text-muted-foreground">Aguardando</div>
                        <div className="text-sm font-bold text-amber-600">{brl(sum("aguardando"))}</div>
                      </div>
                      <div className="rounded-md border p-2">
                        <div className="text-xs text-muted-foreground">Liberado</div>
                        <div className="text-sm font-bold text-emerald-600">{brl(sum("aprovado"))}</div>
                      </div>
                      <div className="rounded-md border p-2">
                        <div className="text-xs text-muted-foreground">Pago</div>
                        <div className="text-sm font-bold text-[#E0A500]">{brl(sum("pago"))}</div>
                      </div>
                    </div>
                  )
                })()}
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {payouts.map((p) => (
                    <div
                      key={p.id_clan_payout}
                      className="flex items-center justify-between gap-3 border rounded-md p-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.source_type === "clan_course" ? "Curso do clan" : "Serviço do clan"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          {p.status === "aguardando" && ` · libera ${new Date(p.available_at).toLocaleDateString("pt-BR")}`}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold tabular-nums">
                          {((p.amount_cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground capitalize">{p.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

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
    </main>
    </PageShell>
  )
}
