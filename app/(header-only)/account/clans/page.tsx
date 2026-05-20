"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Users, Plus, Lock, AlertCircle, Check, X, CalendarDays } from "lucide-react"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"

type Machine = { id_machine: number; name: string; slug: string }

type SubProfile = {
  id_profile: string
  display_name: string
  is_published?: boolean
  is_paid?: boolean
}

type PendingInvite = {
  id_clan_invite: number
  id_clan_profile: string
  id_invited_profile: string
  invited_display_name: string
  clan_display_name: string
  clan_avatar_url: string | null
  clan_machine_name: string | null
  created_at: string
}

type ClanListItem = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  machine_slug: string | null
  machine_name: string | null
  my_role: "owner" | "member"
  free_slots: number | null
  paid_slots: number | null
  max_slots: number | null
  members_count: number
}

export default function MyClansPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [clans, setClans] = useState<ClanListItem[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [inviteActionId, setInviteActionId] = useState<number | null>(null)
  const [eligibility, setEligibility] = useState<{
    eligible: boolean
    required_minutes: number
    current_minutes: number
  } | null>(null)

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [machines, setMachines] = useState<Machine[]>([])
  const [subProfiles, setSubProfiles] = useState<SubProfile[]>([])
  const [form, setForm] = useState({
    id_profile_owner: "",
    id_machine: "",
    display_name: "",
    bio: "",
    estado: "",
    municipio: "",
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)

  // Carrega municípios do IBGE conforme estado selecionado
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
      .then((list: { id: number; nome: string }[]) =>
        setMunicipios(list.map((m) => ({ id: m.id, nome: m.nome })))
      )
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMunicipios(false))
  }, [form.estado])

  // Carrega clans, elegibilidade e dados do modal
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    const auth = { Authorization: `Bearer ${token}` }

    ;(async () => {
      try {
        const [clansRes, eligRes, machinesRes, meRes, invitesRes] =
          await Promise.all([
            fetch("/api/clans/me", { headers: auth }),
            fetch("/api/clans/eligibility", { headers: auth }),
            fetch("/api/machines"),
            fetch("/api/users/me", { headers: auth }),
            fetch("/api/clans/invites/me", { headers: auth }),
          ])

        if (clansRes.status === 401) {
          localStorage.removeItem("token")
          router.push("/login")
          return
        }

        const clansData = await clansRes.json()
        const eligData = await eligRes.json()
        const machinesData = await machinesRes.json()
        const meData = await meRes.json()
        const invitesData = await invitesRes.json()

        setClans(clansData.clans || [])
        setEligibility(eligData)
        setMachines(machinesData.machines || machinesData || [])
        setPendingInvites(invitesData.invites || [])

        const profiles: SubProfile[] = (meData?.profiles || meData?.user?.profiles || [])
          .filter((p: { is_clan?: boolean }) => !p.is_clan)
        setSubProfiles(profiles)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(`Erro ao carregar clans: ${msg}`)
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  async function respondInvite(id: number, action: "accept" | "decline") {
    setInviteActionId(id)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/clans/invites/${id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data?.error || "Erro ao responder convite")
        return
      }
      // Refresh
      const auth = { Authorization: `Bearer ${token}` }
      const [clansRes, invitesRes] = await Promise.all([
        fetch("/api/clans/me", { headers: auth }),
        fetch("/api/clans/invites/me", { headers: auth }),
      ])
      setClans((await clansRes.json()).clans || [])
      setPendingInvites((await invitesRes.json()).invites || [])
    } finally {
      setInviteActionId(null)
    }
  }

  async function handleCreate() {
    setFormError("")
    if (!form.id_profile_owner) return setFormError("Escolha o sub-perfil que vai criar o clan")
    if (!form.id_machine) return setFormError("Escolha o enxame do clan")
    if (!form.display_name.trim()) return setFormError("Dê um nome ao clan")

    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/clans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_profile_owner: form.id_profile_owner,
          id_machine: Number(form.id_machine),
          display_name: form.display_name.trim(),
          bio: form.bio.trim() || null,
          estado: form.estado.trim() || null,
          municipio: form.municipio.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data?.error || "Erro ao criar clan")
        return
      }

      // Sucesso: fecha modal e recarrega lista
      setIsCreateOpen(false)
      setForm({
        id_profile_owner: "",
        id_machine: "",
        display_name: "",
        bio: "",
        estado: "",
        municipio: "",
      })
      const token2 = localStorage.getItem("token")
      const refreshed = await fetch("/api/clans/me", {
        headers: { Authorization: `Bearer ${token2}` },
      })
      const refreshedData = await refreshed.json()
      setClans(refreshedData.clans || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFormError(`Erro ao criar clan: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <p className="text-muted-foreground">Carregando seus clans...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <Card>
          <CardContent className="pt-6 flex items-center gap-2 text-red-600">
            <AlertCircle className="size-5" />
            {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  const eligible = !!eligibility?.eligible
  const currentH = Math.floor((eligibility?.current_minutes || 0) / 60)
  const currentM = (eligibility?.current_minutes || 0) % 60
  const eligibleSubProfiles = subProfiles

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 space-y-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="size-7" /> Meus Clans
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie ou participe de clans com até 6 sub-perfis. As métricas do clan
            somam likes, horas e engajamento de todos os membros.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={!eligible}
          title={eligible ? "Criar um novo clan" : "Você precisa de 10h online para criar um clan"}
        >
          {eligible ? <Plus className="size-4 mr-2" /> : <Lock className="size-4 mr-2" />}
          Criar Clan
        </Button>
      </header>

      {!eligible && eligibility && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-amber-800">
            <p className="font-medium">Ainda não desbloqueou criação de clans</p>
            <p className="text-sm mt-1">
              Você tem {currentH}h{currentM}m online. Faltam{" "}
              {Math.max(0, 10 - currentH)}h
              {Math.max(0, 10 - currentH) === 0 ? `${60 - currentM}m` : ""} para
              destravar a criação.
            </p>
          </CardContent>
        </Card>
      )}

      {pendingInvites.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">
              Convites pendentes ({pendingInvites.length})
            </CardTitle>
            <CardDescription>
              Você foi convidado para os clans abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id_clan_invite}
                className="flex items-center gap-3 border rounded-md p-3 bg-background"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{inv.clan_display_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.clan_machine_name || "—"} · convite para{" "}
                    <strong>{inv.invited_display_name}</strong>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondInvite(inv.id_clan_invite, "decline")}
                  disabled={inviteActionId === inv.id_clan_invite}
                >
                  <X className="size-4 mr-1" /> Recusar
                </Button>
                <Button
                  size="sm"
                  onClick={() => respondInvite(inv.id_clan_invite, "accept")}
                  disabled={inviteActionId === inv.id_clan_invite}
                >
                  <Check className="size-4 mr-1" /> Aceitar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {clans.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Você ainda não participa de nenhum clan.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {clans.map((c) => (
            <Card key={c.id_profile}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{c.display_name}</span>
                  <Badge variant={c.my_role === "owner" ? "default" : "secondary"}>
                    {c.my_role === "owner" ? "Dono" : "Membro"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {c.machine_name || "—"} ·{" "}
                  {c.members_count}/{c.max_slots ?? 3} membros
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <Link
                  href={`/account/clans/${c.id_profile}`}
                  className="text-sm text-primary hover:underline"
                >
                  Gerenciar clan →
                </Link>
                {c.my_role === "owner" && (
                  <Link
                    href={`/account/profile/${c.id_profile}/agenda`}
                    className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  >
                    <CalendarDays className="size-3.5" /> Agenda
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar novo clan</DialogTitle>
            <DialogDescription>
              O sub-perfil escolhido vira dono do clan e ocupa 1 das 6 vagas.
              3 vagas grátis, mais 3 disponíveis a R$50 cada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Sub-perfil que cria o clan</Label>
              <Select
                value={form.id_profile_owner}
                onValueChange={(v) => setForm({ ...form, id_profile_owner: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um sub-perfil" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleSubProfiles.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      Nenhum sub-perfil disponível
                    </SelectItem>
                  )}
                  {eligibleSubProfiles.map((p) => (
                    <SelectItem key={p.id_profile} value={p.id_profile}>
                      {p.display_name}
                      {p.is_paid === false ? " (sem ativação)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Apenas subperfis ativados podem criar clan, e cada
                sub-perfil só pode estar em 1 clan.
              </p>
            </div>

            <div>
              <Label>Enxame</Label>
              <Select
                value={form.id_machine}
                onValueChange={(v) => setForm({ ...form, id_machine: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Em qual enxame o clan atua?" />
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

            <div>
              <Label>Nome do clan</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Ex: Estúdio Pixel"
                maxLength={120}
              />
            </div>

            <div>
              <Label>Bio (opcional)</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Conte em poucas palavras o que o clan faz"
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.bio.length}/200 caracteres
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado (opcional)</Label>
                <Select
                  value={form.estado}
                  onValueChange={(v) =>
                    setForm({ ...form, estado: v, municipio: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BRASIL.map((e) => (
                      <SelectItem key={e.uf} value={e.uf}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Município (opcional)</Label>
                <Select
                  value={form.municipio}
                  onValueChange={(v) => setForm({ ...form, municipio: v })}
                  disabled={!form.estado || loadingMunicipios}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingMunicipios ? "Carregando..." : "Cidade"}
                    />
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
            </div>

            {formError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="size-4" />
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Criando..." : "Criar clan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
