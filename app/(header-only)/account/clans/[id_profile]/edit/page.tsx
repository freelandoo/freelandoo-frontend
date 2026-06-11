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
import { LoadingState, PageShell, TabloidBackLink, TabloidPageIntro } from "@/components/tabloide"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import { MediaCropModal } from "@/components/media/media-crop-modal"
import {
  AVATAR_IMAGE_ASPECT_RATIO,
  AVATAR_IMAGE_MAX_SIZE_BYTES,
  AVATAR_IMAGE_OUTPUT,
  validateImageFile,
} from "@/lib/media/media-validation"
import type { ProcessedImage } from "@/lib/media/image-processing"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"

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
  const t = useTranslations("Account")
  const tx = useTaxonomy()

  const [clan, setClan] = useState<Clan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null)
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
          setError(data?.error || t("clanNotFound", "Clan não encontrado"))
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
        setError(err instanceof Error ? err.message : t("loadClanError", "Erro ao carregar clan"))
      } finally {
        setLoading(false)
      }
    })()
  }, [id_profile, router, t])

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

  async function uploadAvatarFile(file: File) {
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
        setError(data?.error || t("uploadAvatarError", "Erro ao enviar avatar"))
        return
      }
      const newUrl =
        data?.avatar_url || data?.profile?.avatar_url || data?.url || null
      if (newUrl && clan) setClan({ ...clan, avatar_url: newUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadAvatarError", "Erro ao enviar avatar"))
    } finally {
      setUploadingAvatar(false)
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const validation = validateImageFile(file, AVATAR_IMAGE_MAX_SIZE_BYTES)
    if (!validation.ok) {
      setError(validation.error)
      return
    }

    setAvatarCropFile(file)
  }

  async function handleAvatarCropConfirm(image: ProcessedImage) {
    setAvatarCropFile(null)
    URL.revokeObjectURL(image.previewUrl)
    await uploadAvatarFile(image.file)
  }

  async function handleSave() {
    setError("")
    setSuccess("")
    const name = form.display_name.trim()
    if (!name) {
      setError(t("clanNameRequired", "Dê um nome ao clan"))
      return
    }
    if (form.bio.length > BIO_LIMIT) {
      setError(t("bioMaxChars", "A bio deve ter no máximo {limit} caracteres").replace("{limit}", String(BIO_LIMIT)))
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
        setError(data?.error || t("saveError", "Erro ao salvar"))
        return
      }
      setSuccess(t("savedSuccessfully", "Salvo com sucesso"))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError", "Erro ao salvar"))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageShell className="tabloid-account-page md:pl-[80px]">
        <div className="relative z-10 px-4 py-16">
          <LoadingState label={t("loading", "Carregando...")} />
        </div>
      </PageShell>
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
          <ArrowLeft className="size-4" /> {t("back", "Voltar")}
        </Link>
      </div>
    )
  }

  if (!clan) return null

  return (
    <PageShell className="tabloid-account-page md:pl-[80px]">
    <main className="relative z-10 mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <TabloidPageIntro
        eyebrow={t("clanWord", "Clan")}
        title={t("editTitle", "EDITAR.")}
        subtitle={t("editClanSubtitle", "Ajuste avatar, bio e localização do clan mantendo a vitrine com energia de manchete.")}
        back={<TabloidBackLink href={`/clans/${id_profile}`}>{t("backToClan", "Voltar para o clan")}</TabloidBackLink>}
      />

      <Card className="fl-card rounded-2xl border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D]">
        <CardHeader>
          <CardTitle>{t("editClanProfile", "Editar perfil do clan")}</CardTitle>
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
                accept="image/jpeg,image/png,image/webp"
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
                  {t("changeAvatar", "Trocar avatar")}
                </span>
              </Button>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">{t("clanNameLabel", "Nome do clan")}</Label>
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
            <Label htmlFor="bio">{t("bioLabel", "Bio")}</Label>
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
              <Label>{t("disclosureEnxame", "Enxame de divulgação")}</Label>
              <Input value={tx.enxame(null, clan.machine_name)} disabled />
              <p className="text-xs text-muted-foreground">
                {t("clanEnxameFixedHint", "O enxame é definido na criação e não pode ser alterado.")}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("stateLabel", "Estado")}</Label>
              <Select
                value={form.estado}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, estado: val, municipio: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select", "Selecione")} />
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
              <Label>{t("cityLabel", "Município")}</Label>
              <Select
                value={form.municipio}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, municipio: val }))
                }
                disabled={!form.estado || loadingMunicipios}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingMunicipios ? t("loading", "Carregando...") : t("select", "Selecione")} />
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
              {t("cancel", "Cancelar")}
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {t("saving", "Salvando...")}
                </>
              ) : (
                t("save", "Salvar")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {avatarCropFile && (
        <MediaCropModal
          file={avatarCropFile}
          aspectRatio={AVATAR_IMAGE_ASPECT_RATIO}
          outputWidth={AVATAR_IMAGE_OUTPUT.width}
          outputHeight={AVATAR_IMAGE_OUTPUT.height}
          maxSizeMB={2}
          mediaType="profile_avatar"
          title={t("adjustAvatarTitle", "Ajustar foto de perfil")}
          description={t("adjustAvatarDesc", "Ajuste sua foto de perfil.")}
          onCancel={() => setAvatarCropFile(null)}
          onConfirm={handleAvatarCropConfirm}
        />
      )}
    </main>
    </PageShell>
  )
}
