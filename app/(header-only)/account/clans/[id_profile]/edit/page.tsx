"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Upload } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"

type Clan = {
  id_profile: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  estado: string | null
  municipio: string | null
  machine_name: string | null
}

const BIO_LIMIT = 200

export default function EditClanPage({
  params,
}: {
  params: Promise<{ id_profile: string }>
}) {
  const { id_profile } = use(params)
  const router = useRouter()

  const [clan, setClan] = useState<Clan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    estado: "",
    municipio: "",
  })
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/clans/${id_profile}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error || "Clan não encontrado")
          return
        }
        const c: Clan = data.clan
        setClan(c)
        setForm({
          display_name: c.display_name || "",
          bio: c.bio || "",
          estado: c.estado || "",
          municipio: c.municipio || "",
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar clan")
      } finally {
        setLoading(false)
      }
    })()
  }, [id_profile, router])

  useEffect(() => {
    if (!form.estado) {
      setMunicipios([])
      return
    }
    const estadoObj = ESTADOS_BRASIL.find((e) => e.uf === form.estado)
    if (!estadoObj) return
    setLoadingMunicipios(true)
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoObj.id}/municipios`
    )
      .then((r) => r.json())
      .then((rows: { id: number; nome: string }[]) => setMunicipios(rows))
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMunicipios(false))
  }, [form.estado])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const token = localStorage.getItem("token")
    if (!token) return
    setUploadingAvatar(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("avatar", file)
      const res = await fetch(`/api/profile/${id_profile}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Erro ao enviar avatar")
        return
      }
      const newUrl =
        data?.avatar_url || data?.profile?.avatar_url || data?.url || null
      if (newUrl && clan) setClan({ ...clan, avatar_url: newUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar avatar")
    } finally {
      setUploadingAvatar(false)
      e.target.value = ""
    }
  }

  async function handleSave() {
    setError("")
    setSuccess("")
    const name = form.display_name.trim()
    if (!name) {
      setError("Dê um nome ao clan")
      return
    }
    if (form.bio.length > BIO_LIMIT) {
      setError(`A bio deve ter no máximo ${BIO_LIMIT} caracteres`)
      return
    }
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/profile/${id_profile}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: name,
          bio: form.bio.trim() || null,
          estado: form.estado || null,
          municipio: form.municipio || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || "Erro ao salvar")
        return
      }
      setSuccess("Salvo com sucesso")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    )
  }

  if (error && !clan) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <p className="text-destructive">{error}</p>
        <Link
          href="/account/clans"
          className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
      </div>
    )
  }

  if (!clan) return null

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
      <Link
        href={`/clans/${id_profile}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="size-4" /> Voltar para o clan
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Editar perfil do clan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-20 border">
              {clan.avatar_url && (
                <AvatarImage src={clan.avatar_url} alt={clan.display_name} />
              )}
              <AvatarFallback>
                {clan.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                disabled={uploadingAvatar}
              >
                <span>
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Trocar avatar
                </span>
              </Button>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Nome do clan</Label>
            <Input
              id="display_name"
              value={form.display_name}
              maxLength={60}
              onChange={(e) =>
                setForm((f) => ({ ...f, display_name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={4}
              maxLength={BIO_LIMIT}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.bio.length}/{BIO_LIMIT}
            </p>
          </div>

          {clan.machine_name && (
            <div className="space-y-2">
              <Label>Máquina de divulgação</Label>
              <Input value={clan.machine_name} disabled />
              <p className="text-xs text-muted-foreground">
                A máquina é definida na criação e não pode ser alterada.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, estado: val, municipio: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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

            <div className="space-y-2">
              <Label>Cidade</Label>
              <Select
                value={form.municipio}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, municipio: val }))
                }
                disabled={!form.estado || loadingMunicipios}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingMunicipios ? "Carregando…" : "Selecione"} />
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

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/clans/${id_profile}`)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
