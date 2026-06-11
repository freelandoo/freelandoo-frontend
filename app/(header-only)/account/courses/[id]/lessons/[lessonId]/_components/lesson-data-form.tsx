"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useTranslations } from "@/components/i18n/I18nProvider"
import type {
  CourseLesson,
  LessonStatus,
  LessonUpdateInput,
} from "@/hooks/use-module-lessons"

interface Props {
  lesson: CourseLesson
  onSave: (patch: LessonUpdateInput) => Promise<void>
}

interface FormState {
  title: string
  description: string
  status: LessonStatus
}

function buildForm(l: CourseLesson): FormState {
  return {
    title: l.title || "",
    description: l.description || "",
    status: l.status,
  }
}

export function LessonDataForm({ lesson, onSave }: Props) {
  const t = useTranslations("Account")
  const [form, setForm] = useState<FormState>(() => buildForm(lesson))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setForm(buildForm(lesson))
  }, [lesson])

  const isDirty = useMemo(() => {
    const base = buildForm(lesson)
    return (
      base.title !== form.title ||
      base.description !== form.description ||
      base.status !== form.status
    )
  }, [lesson, form])

  async function handleSave() {
    const title = form.title.trim()
    if (!title) {
      toast.error(t("lessonTitleRequired", "Informe o título da aula"))
      return
    }
    setIsSaving(true)
    try {
      await onSave({
        title,
        description: form.description.trim() || null,
        status: form.status,
      })
      toast.success(t("lessonUpdated", "Aula atualizada"))
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("saveChangesFailed", "Falha ao salvar alterações"),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="ld-title">
          {t("lessonTitleLabel", "Título da aula")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ld-title"
          placeholder={t("lessonTitleExample", "Ex.: Visão geral do que você vai aprender")}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          disabled={isSaving}
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ld-desc">{t("descriptionLabel", "Descrição")}</Label>
        <Textarea
          id="ld-desc"
          placeholder={t(
            "lessonDescFormPlaceholder",
            "Resumo do que essa aula cobre. Você pode usar como contexto para o aluno antes de assistir.",
          )}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={6}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ld-status">{t("statusLabel", "Status")}</Label>
        <Select
          value={form.status}
          onValueChange={(v) =>
            setForm({ ...form, status: v as LessonStatus })
          }
          disabled={isSaving}
        >
          <SelectTrigger id="ld-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">{t("statusDraft", "Rascunho")}</SelectItem>
            <SelectItem value="published">{t("lessonStatusPublished", "Publicada")}</SelectItem>
            <SelectItem value="hidden">{t("lessonStatusHidden", "Oculta")}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-white/45">
          {t("onlyPublishedVisible", "Apenas aulas publicadas ficam visíveis para os alunos.")}
        </p>
      </div>

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
