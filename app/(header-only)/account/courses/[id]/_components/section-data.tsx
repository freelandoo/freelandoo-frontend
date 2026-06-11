"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AffiliateOptInField } from "@/components/affiliate/affiliate-opt-in-field"
import {
  COURSE_MIN_PUBLISH_PRICE_CENTS,
  centsToInputText,
  parsePriceInput,
} from "@/lib/courses/format"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type {
  CourseStatus,
  CourseUpdateInput,
  MyCourse,
} from "@/hooks/use-my-courses"

interface Props {
  course: MyCourse
  profileOptions?: { id: string; name: string }[]
  onSaved: (updated: MyCourse) => void
}

interface FormState {
  title: string
  short_description: string
  description: string
  cover_url: string
  price_text: string
  profile_id: string
  status: CourseStatus
  affiliates_allowed: boolean
}

function buildFormFromCourse(course: MyCourse): FormState {
  return {
    title: course.title || "",
    short_description: course.short_description || "",
    description: course.description || "",
    cover_url: course.cover_url || "",
    price_text: centsToInputText(course.price_cents),
    profile_id: course.profile_id || "",
    status: course.status,
    affiliates_allowed: course.affiliates_allowed ?? false,
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function CourseDataSection({
  course,
  profileOptions = [],
  onSaved,
}: Props) {
  const t = useTranslations("Account")
  const [form, setForm] = useState<FormState>(() => buildFormFromCourse(course))
  const [isSaving, setIsSaving] = useState(false)

  // Sincroniza quando o curso é recarregado externamente.
  useEffect(() => {
    setForm(buildFormFromCourse(course))
  }, [course])

  const isDirty = useMemo(() => {
    const base = buildFormFromCourse(course)
    return (
      base.title !== form.title ||
      base.short_description !== form.short_description ||
      base.description !== form.description ||
      base.cover_url !== form.cover_url ||
      base.price_text !== form.price_text ||
      base.profile_id !== form.profile_id ||
      base.status !== form.status ||
      base.affiliates_allowed !== form.affiliates_allowed
    )
  }, [course, form])

  async function handleSave() {
    const title = form.title.trim()
    if (!title) {
      toast.error(t("courseTitleRequired", "Informe o título do curso"))
      return
    }
    const priceCents = parsePriceInput(form.price_text)

    if (
      form.status === "published" &&
      (priceCents == null || priceCents < COURSE_MIN_PUBLISH_PRICE_CENTS)
    ) {
      toast.error(t("priceMinimumPublishError", "Para publicar, o preço precisa ser de no mínimo R$ 5,00"))
      return
    }

    const patch: CourseUpdateInput = {
      title,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      cover_url: form.cover_url.trim() || null,
      price_cents: priceCents,
      profile_id: form.profile_id || null,
      status: form.status,
      affiliates_allowed: form.affiliates_allowed,
    }

    const token = getToken()
    if (!token) {
      toast.error(t("sessionExpired", "Sessão expirada. Faça login novamente."))
      return
    }

    setIsSaving(true)
    try {
      const res = await fetchWithLog(
        "courseAdmin:update",
        `/api/me/courses/${encodeURIComponent(course.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patch),
        },
      )
      const data = (await res.json().catch(() => null)) as
        | { course?: MyCourse; error?: string }
        | null
      if (!res.ok || !data?.course) {
        throw new Error(data?.error || t("saveFailed", "Falha ao salvar"))
      }
      onSaved(data.course)
      toast.success(t("changesSaved", "Alterações salvas"))
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("saveChangesFailed", "Falha ao salvar alterações"),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="cd-title">
          {t("courseNameLabel", "Nome do curso")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="cd-title"
          placeholder={t("courseTitleExample", "Ex.: Fundamentos de Edição de Vídeo")}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          disabled={isSaving}
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cd-short">{t("courseShortDescription", "Descrição curta")}</Label>
        <Input
          id="cd-short"
          placeholder={t("courseShortPlaceholderData", "Uma frase que resume a proposta do curso")}
          value={form.short_description}
          onChange={(e) =>
            setForm({ ...form, short_description: e.target.value })
          }
          disabled={isSaving}
          maxLength={280}
        />
        <p className="text-[11px] text-white/45">
          {form.short_description.length}/280
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cd-desc">{t("courseFullDescription", "Descrição completa")}</Label>
        <Textarea
          id="cd-desc"
          placeholder={t("courseFullDescriptionDataPlaceholder", "Para quem é, o que o aluno aprende, como o curso está organizado...")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={6}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cd-cover">{t("coverUrlLabel", "URL da capa")}</Label>
        <Input
          id="cd-cover"
          placeholder="https://..."
          value={form.cover_url}
          onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
          disabled={isSaving}
        />
        <p className="text-[11px] text-white/45">
          {t("coverUrlHint", "Upload direto pelo R2 chega no próximo slice. Por enquanto cole uma URL pública (ex.: do seu R2 ou de qualquer host de imagem).")}
        </p>
        {form.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.cover_url}
            alt={t("coverPreviewAlt", "Pré-visualização da capa")}
            className="mt-2 aspect-[16/9] w-full max-w-md rounded-xl border border-white/[0.07] object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = "none"
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cd-price">{t("priceBrlLabel", "Preço (R$)")}</Label>
          <Input
            id="cd-price"
            placeholder="0,00"
            value={form.price_text}
            onChange={(e) => setForm({ ...form, price_text: e.target.value })}
            disabled={isSaving}
            inputMode="decimal"
          />
          <p className="text-[11px] text-white/45">
            {t("draftPriceHint", "Mínimo R$ 5,00 para publicar. Em rascunho pode ficar vazio.")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cd-status">{t("studentTableStatus", "Status")}</Label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              setForm({ ...form, status: v as CourseStatus })
            }
            disabled={isSaving}
          >
            <SelectTrigger id="cd-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t("statusDraft", "Rascunho")}</SelectItem>
              <SelectItem value="published">{t("statusPublished", "Publicado")}</SelectItem>
              <SelectItem value="paused">{t("statusPaused", "Pausado")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-white/45">
            {t("publishRequirementHint", "Publicar exige título e preço ≥ R$ 5,00.")}
          </p>
        </div>
      </div>

      {profileOptions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="cd-profile">{t("linkedProfile", "Perfil vinculado")}</Label>
          <Select
            value={form.profile_id || "__none__"}
            onValueChange={(v) =>
              setForm({ ...form, profile_id: v === "__none__" ? "" : v })
            }
            disabled={isSaving}
          >
            <SelectTrigger id="cd-profile">
              <SelectValue placeholder={t("noLinkedProfile", "Sem perfil vinculado")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("noLinkedProfile", "Sem perfil vinculado")}</SelectItem>
              {profileOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-white/45">
            {t("profileLinkHint", "Se associado, o curso vai aparecer na página deste subperfil.")}
          </p>
        </div>
      )}

      <AffiliateOptInField
        allowed={form.affiliates_allowed}
        onAllowedChange={(v) => setForm({ ...form, affiliates_allowed: v })}
        disabled={isSaving}
      />

      {/* Sticky save bar */}
      <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-white/[0.07] bg-zinc-950/85 px-4 py-3 backdrop-blur-md">
        <p className="mr-auto text-[12px] text-white/55">
          {isDirty
            ? t("unsavedChanges", "Você tem alterações não salvas.")
            : t("allSaved", "Tudo salvo.")}
        </p>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t("saveChanges", "Salvar alterações")}
        </Button>
      </div>
    </div>
  )
}
