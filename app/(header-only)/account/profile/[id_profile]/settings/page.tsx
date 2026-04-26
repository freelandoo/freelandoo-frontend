"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useMeProfile } from "@/hooks/use-me-profile"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import type { Profile } from "@/lib/types/account"
import type { SocialMedia, SocialMediaType, FollowerRange } from "@/lib/types/freelancer-profile"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Trash2, Eye, EyeOff, Plus, Edit2, Instagram, Youtube, Video, MessageCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const Separator = () => <hr className="my-4 border-border" />

export default function ProfileSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const id_profile = params?.id_profile as string
  const { perfil, setPerfil, isLoading, error } = useMeProfile()

  const profile: Profile | undefined = useMemo(
    () => perfil?.profiles?.find((p) => p.id_profile === id_profile),
    [perfil, id_profile]
  )

  const [machines, setMachines] = useState<{ id_machine: number; name: string; slug: string }[]>([])
  const [professions, setProfessions] = useState<{ id_category: number; desc_category: string }[]>([])
  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    id_machine: "",
    id_category: "",
    estado: "",
    municipio: "",
  })
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const [isSocialMediaModalOpen, setIsSocialMediaModalOpen] = useState(false)
  const [socialMediaMeta, setSocialMediaMeta] = useState<{ types: SocialMediaType[]; follower_ranges: FollowerRange[] }>({ types: [], follower_ranges: [] })
  const [editingSocial, setEditingSocial] = useState<SocialMedia | null>(null)
  const [socialForm, setSocialForm] = useState({ id_social_media_type: "", url: "", id_follower_range: "", phone_number: "" })

  const selectedSocialType = useMemo(() => {
    const id = editingSocial ? editingSocial.id_social_media_type : Number(socialForm.id_social_media_type)
    return socialMediaMeta.types.find((t) => t.id_social_media_type === id) || null
  }, [editingSocial, socialForm.id_social_media_type, socialMediaMeta.types])

  const isWhatsapp = (selectedSocialType?.icon || "").toLowerCase() === "whatsapp"
  const [isSubmittingSocial, setIsSubmittingSocial] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      display_name: profile.display_name || "",
      bio: profile.bio || "",
      id_machine: profile.id_machine ? String(profile.id_machine) : "",
      id_category: profile.id_category ? String(profile.id_category) : "",
      estado: profile.estado || "",
      municipio: profile.municipio || "",
    })
  }, [profile])

  useEffect(() => {
    fetch("/api/machines")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMachines(Array.isArray(data) ? data : data.machines ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.id_machine) {
      setProfessions([])
      return
    }
    fetch(`/api/machines/${encodeURIComponent(form.id_machine)}/categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProfessions(Array.isArray(data) ? data : data.categories ?? []))
      .catch(() => setProfessions([]))
  }, [form.id_machine])

  useEffect(() => {
    if (!form.estado) {
      setMunicipios([])
      return
    }
    const estadoObj = ESTADOS_BRASIL.find((e) => e.uf === form.estado)
    if (!estadoObj) return
    setLoadingMunicipios(true)
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoObj.id}/municipios`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: number; nome: string }[]) => setMunicipios(list.map((m) => ({ id: m.id, nome: m.nome }))))
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMunicipios(false))
  }, [form.estado])

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    )
  }

  if (error || !perfil) {
    return (
      <main className="container mx-auto px-4 py-12">
        <p className="text-destructive">{error || "Erro ao carregar perfil"}</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="container mx-auto px-4 py-12 space-y-4">
        <p className="text-muted-foreground">Este perfil não existe ou não pertence a você.</p>
        <Button asChild variant="outline">
          <Link href="/account">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para minha conta
          </Link>
        </Button>
      </main>
    )
  }

  const isPaid = !!profile.is_paid
  const isVisible = profile.is_visible !== false
  const isPublished = !!profile.is_published

  const refreshMe = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    const res = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setPerfil(await res.json())
  }

  const handleSave = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    if (!form.display_name.trim()) {
      setStatusMsg({ kind: "error", text: "O nome de exibição é obrigatório." })
      return
    }
    if (form.bio.trim().length > 200) {
      setStatusMsg({ kind: "error", text: "A bio deve ter no máximo 200 caracteres." })
      return
    }
    if (!form.id_machine || !form.id_category) {
      setStatusMsg({ kind: "error", text: "Selecione máquina e profissão." })
      return
    }
    setSaving(true)
    setStatusMsg(null)
    try {
      const res = await fetch(`/api/profile/${id_profile}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: form.display_name.trim(),
          bio: form.bio.trim() || null,
          id_category: Number(form.id_category),
          estado: form.estado || null,
          municipio: form.municipio || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatusMsg({ kind: "ok", text: "Alterações salvas." })
        await refreshMe()
      } else {
        setStatusMsg({ kind: "error", text: data.error || "Erro ao salvar." })
      }
    } catch {
      setStatusMsg({ kind: "error", text: "Erro ao salvar." })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleVisibility = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setSavingVisibility(true)
    try {
      const res = await fetch(`/api/profile/${id_profile}/visibility`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: !isVisible }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        await refreshMe()
      } else {
        setStatusMsg({ kind: "error", text: data.error || "Erro ao alterar visibilidade." })
      }
    } finally {
      setSavingVisibility(false)
    }
  }

  const handleDelete = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    const ok = window.confirm(
      "Tem certeza que deseja excluir este perfil? Ele não aparecerá mais para você nem para o público. O histórico de pagamentos é preservado para auditoria."
    )
    if (!ok) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/profile/${id_profile}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        await refreshMe()
        router.push("/account")
      } else {
        const data = await res.json().catch(() => ({}))
        setStatusMsg({ kind: "error", text: data.error || "Erro ao excluir o perfil." })
      }
    } finally {
      setDeleting(false)
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
    setSocialForm({ id_social_media_type: "", url: "", id_follower_range: "", phone_number: "" })
    await fetchSocialMediaMeta()
    setIsSocialMediaModalOpen(true)
  }

  const handleOpenEditSocial = async (social: SocialMedia) => {
    setEditingSocial(social)
    setSocialForm({
      id_social_media_type: social.id_social_media_type.toString(),
      url: social.profile_url,
      id_follower_range: social.id_follower_range ? social.id_follower_range.toString() : "",
      phone_number: social.phone_number_normalized || "",
    })
    await fetchSocialMediaMeta()
    setIsSocialMediaModalOpen(true)
  }

  const handleSaveSocial = async () => {
    const currentToken = localStorage.getItem("token")
    if (!currentToken || !id_profile) return

    setIsSubmittingSocial(true)
    try {
      let response: Response

      const editBody = isWhatsapp
        ? { phone_number: socialForm.phone_number }
        : { url: socialForm.url, id_follower_range: parseInt(socialForm.id_follower_range) }

      const createBody = isWhatsapp
        ? {
            id_social_media_type: parseInt(socialForm.id_social_media_type),
            phone_number: socialForm.phone_number,
          }
        : {
            id_social_media_type: parseInt(socialForm.id_social_media_type),
            url: socialForm.url,
            id_follower_range: parseInt(socialForm.id_follower_range),
          }

      if (editingSocial) {
        response = await fetch(`/api/profile/${id_profile}/social-media/${editingSocial.id_social_media_type}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(editBody),
        })
      } else {
        response = await fetch(`/api/profile/${id_profile}/social-media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(createBody),
        })
      }

      if (response.ok) {
        await refreshMe()
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
      const response = await fetch(`/api/profile/${id_profile}/social-media/${social.id_social_media_type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${currentToken}` },
      })

      if (response.ok || response.status === 204) {
        await refreshMe()
      } else {
        const data = await response.json()
        alert(data.error || "Erro ao remover rede social")
      }
    } catch {
      alert("Erro ao remover rede social. Tente novamente.")
    }
  }

  const getSocialIcon = (icon: string) => {
    const lower = icon.toLowerCase()
    if (lower === "instagram") return <Instagram className="h-5 w-5 text-white" />
    if (lower === "youtube") return <Youtube className="h-5 w-5 text-white" />
    if (lower === "whatsapp") return <MessageCircle className="h-5 w-5 text-white" />
    return <Video className="h-5 w-5 text-white" />
  }

  const getSocialBg = (icon: string) => {
    const lower = icon.toLowerCase()
    if (lower === "instagram") return "bg-gradient-to-br from-purple-500 to-pink-500"
    if (lower === "youtube") return "bg-red-600"
    if (lower === "whatsapp") return "bg-green-500"
    return "bg-black"
  }

  const sub = profile.subscription
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : null

  return (
    <main className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/account/profile/${id_profile}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o Perfil
          </Link>
        </Button>
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {(profile.avatar_url) && (
                <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              )}
              <AvatarFallback>{(profile.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Configurações do Perfil</CardTitle>
              <CardDescription>{profile.machine_name || profile.machine_slug || "—"} · {profile.category || "—"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {statusMsg && (
            <div className={`text-sm ${statusMsg.kind === "ok" ? "text-green-600" : "text-destructive"}`}>{statusMsg.text}</div>
          )}

          {/* Informações básicas */}
          <section className="space-y-3">
            <h3 className="font-semibold">Informações básicas</h3>
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de exibição</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio / descrição (máx 200 caracteres)</Label>
              <textarea
                id="bio"
                rows={4}
                maxLength={200}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">{form.bio.length} / 200</div>
            </div>
          </section>

          <Separator />

          {/* Máquina e profissão */}
          <section className="space-y-3">
            <h3 className="font-semibold">Máquina e profissão</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Máquina</Label>
                <Select
                  value={form.id_machine}
                  onValueChange={(val) => setForm((f) => ({ ...f, id_machine: val, id_category: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Profissão</Label>
                <Select
                  value={form.id_category}
                  onValueChange={(val) => setForm((f) => ({ ...f, id_category: val }))}
                  disabled={!form.id_machine}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.id_machine ? "Selecione" : "Selecione uma máquina primeiro"} />
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
            </div>
          </section>

          <Separator />

          {/* Localização */}
          <section className="space-y-3">
            <h3 className="font-semibold">Localização</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={form.estado}
                  onValueChange={(val) => setForm((f) => ({ ...f, estado: val, municipio: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map((e) => (
                      <SelectItem key={e.uf} value={e.uf}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Município</Label>
                <Select
                  value={form.municipio}
                  onValueChange={(val) => setForm((f) => ({ ...f, municipio: val }))}
                  disabled={!form.estado || loadingMunicipios}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMunicipios ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {municipios.map((m) => (
                      <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Redes Sociais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Redes Sociais</CardTitle>
            <Button size="sm" variant="outline" onClick={handleOpenAddSocial}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
          <CardDescription>Gerencie as redes sociais exibidas no seu perfil.</CardDescription>
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
                      <p className="text-sm text-muted-foreground">
                        {social.icon?.toLowerCase() === "whatsapp" && social.phone_number_normalized
                          ? `+${social.phone_number_normalized}`
                          : social.profile_url}
                      </p>
                    </div>
                  </a>
                  <div className="flex items-center gap-2 ml-3">
                    {social.icon?.toLowerCase() !== "whatsapp" && social.follower_range && (
                      <Badge variant="secondary">{social.follower_range} seguidores</Badge>
                    )}
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Sem redes sociais cadastradas.</p>
          )}
        </CardContent>
      </Card>

      {/* Status da assinatura */}
      <Card>
        <CardHeader>
          <CardTitle>Status da assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPaid ? (
            <>
              <p className="text-sm">
                Assinatura <strong>ativa</strong>
                {periodEnd ? <> · próximo ciclo em {periodEnd}</> : null}.
              </p>
              <p className="text-xs text-muted-foreground">
                Para cancelar, entre em contato pelo suporte. O cancelamento manterá o histórico financeiro.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Este perfil ainda não possui assinatura. Ele continua editável, mas não aparece publicamente.
              </p>
              <Button onClick={() => router.push(`/payment/taxa?profile_id=${id_profile}`)}>
                Ativar perfil
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Visibilidade pública */}
      {isPaid && (
        <Card>
          <CardHeader>
            <CardTitle>Visibilidade pública</CardTitle>
            <CardDescription>
              Controle se o perfil aparece nas máquinas, buscas e vitrine. A assinatura continua ativa quando você deixa invisível.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              {isVisible ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              <span>{isVisible ? "Visível nas buscas" : "Invisível nas buscas"}</span>
            </div>
            <Button variant="outline" onClick={handleToggleVisibility} disabled={savingVisibility}>
              {savingVisibility ? "..." : isVisible ? "Deixar invisível" : "Tornar visível"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ações perigosas */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Ações perigosas</CardTitle>
          <CardDescription>
            A exclusão remove o perfil das buscas e do seu painel. O histórico de pagamentos é preservado para auditoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? "Excluindo..." : "Excluir perfil"}
          </Button>
        </CardContent>
      </Card>

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

            {isWhatsapp ? (
              <div className="space-y-2">
                <Label htmlFor="social-phone">Número de telefone</Label>
                <Input
                  id="social-phone"
                  type="tel"
                  placeholder="Ex: 11999999999"
                  value={socialForm.phone_number}
                  onChange={(e) => setSocialForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  O link do WhatsApp e a mensagem padrão são gerados automaticamente.
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setIsSocialMediaModalOpen(false)} disabled={isSubmittingSocial}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveSocial}
                disabled={
                  isSubmittingSocial ||
                  (!editingSocial && !socialForm.id_social_media_type) ||
                  (isWhatsapp ? !socialForm.phone_number : (!socialForm.url || !socialForm.id_follower_range))
                }
              >
                {isSubmittingSocial ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
