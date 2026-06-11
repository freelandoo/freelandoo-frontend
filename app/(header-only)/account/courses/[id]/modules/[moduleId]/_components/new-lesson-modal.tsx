"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/components/i18n/I18nProvider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageDropZone } from "@/components/courses/image-drop-zone"
import type {
  CourseLesson,
  LessonCreateInput,
} from "@/hooks/use-module-lessons"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: LessonCreateInput) => Promise<CourseLesson>
  onUploadCover?: (lessonId: string, file: File) => Promise<unknown>
  onCreated?: (lesson: CourseLesson) => void
}

export function NewLessonModal({
  open,
  onOpenChange,
  onCreate,
  onUploadCover,
  onCreated,
}: Props) {
  const t = useTranslations("Account")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setTitle("")
    setDescription("")
    setPendingFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  async function handleSelectFile(file: File): Promise<void> {
    setPendingFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  async function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed) {
      toast.error(t("lessonTitleRequired", "Informe o título da aula."))
      return
    }
    setSaving(true)
    try {
      const created = await onCreate({
        title: trimmed,
        description: description.trim() || null,
      })
      if (pendingFile && onUploadCover) {
        try {
          await onUploadCover(created.id, pendingFile)
        } catch (err) {
          toast.error(
            err instanceof Error
              ? t("lessonCreatedCoverFailedWithMessage", "Aula criada, mas a capa falhou: {message}").replace("{message}", err.message)
              : t("lessonCreatedCoverFailed", "Aula criada, mas a capa falhou."),
          )
        }
      }
      toast.success(t("lessonCreated", "Aula criada!"))
      onCreated?.(created)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("lessonCreateFailed", "Falha ao criar aula"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("newLesson", "Nova aula")}</DialogTitle>
          <DialogDescription>
            {t("newLessonDesc", "A aula nasce em rascunho. Você pode subir o vídeo, materiais e questionário depois pela página da aula.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              {t("lessonCoverOptional", "Capa da aula (opcional)")}
            </Label>
            <ImageDropZone
              aspect="4/5"
              currentUrl={preview}
              title={t("lessonCoverDropTitle", "Arraste ou envie uma imagem para a capa")}
              hint={t("lessonCoverDropHint", "Recomendado 4:5 (vertical) · JPG, PNG ou WebP · até 12MB")}
              onUpload={(file) => handleSelectFile(file)}
              onRemove={() => {
                setPendingFile(null)
                if (preview) URL.revokeObjectURL(preview)
                setPreview(null)
              }}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-lesson-title">{t("lessonTitleLabel", "Título da aula")}</Label>
            <Input
              id="new-lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("lessonTitlePlaceholder", "Ex.: Conheça seu mentor")}
              maxLength={160}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-lesson-desc">{t("lessonShortDescriptionOptional", "Breve descrição (opcional)")}</Label>
            <Textarea
              id="new-lesson-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("lessonDescriptionPlaceholder", "Resuma em uma ou duas linhas o que o aluno aprende aqui.")}
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("cancel", "Cancelar")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t("createLesson", "Criar aula")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
