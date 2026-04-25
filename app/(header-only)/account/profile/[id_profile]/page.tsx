"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useMeProfile } from "@/hooks/use-me-profile"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import type { Profile } from "@/lib/types/account"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Trash2, Eye, EyeOff, ExternalLink, ImageIcon } from "lucide-react"

const Separator = () => <hr className="my-4 border-border" />

export default function ManageProfilePage() {
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
    avatar_url: "",
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

  useEffect(() => {
    if (!profile) return
    setForm({
      display_name: profile.display_name || "",
      bio: profile.bio || "",
      avatar_url: profile.avatar_url || "",
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
          avatar_url: form.avatar_url.trim() || null,
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

  const sub = profile.subscription
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : null

  return (
    <main className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link href="/account">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
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
              {form.avatar_url ? (
                <AvatarImage src={form.avatar_url} alt={form.display_name} />
              ) : (
                <AvatarFallback>{(form.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle>Gerenciar perfil</CardTitle>
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
              <Label htmlFor="bio">Bio / descrição</Label>
              <textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar_url">URL do avatar</Label>
              <Input
                id="avatar_url"
                type="url"
                placeholder="https://..."
                value={form.avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
              />
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

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portfólio */}
      <Card>
        <CardHeader>
          <CardTitle>Portfólio</CardTitle>
          <CardDescription>
            Você pode adicionar e editar fotos do portfólio mesmo sem assinatura ativa. Elas só aparecerão publicamente quando o perfil estiver pago e visível.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/freelancer/${id_profile}`}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Editar portfólio
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
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
    </main>
  )
}
