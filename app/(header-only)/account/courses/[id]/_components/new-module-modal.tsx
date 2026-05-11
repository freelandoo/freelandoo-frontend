"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
  CourseModule,
  ModuleCreateInput,
} from "@/hooks/use-course-modules"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cria o módulo e retorna o registro criado (para upload posterior do banner). */
  onCreate: (input: ModuleCreateInput) => Promise<CourseModule>
  /** Faz upload do banner do módulo recém-criado. Opcional. */
  onUploadBanner?: (moduleId: string, file: File) => Promise<unknown>
  /** Callback após criação completa. Recebe o módulo. */
  onCreated?: (module: CourseModule) => void
}

export function NewModuleModal({
  open,
  onOpenChange,
  onCreate,
  onUploadBanner,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setTitle("")
    setDescription("")
    setPendingFile(null)
    setPreview(null)
  }

  async function handleSelectFile(file: File): Promise<void> {
    setPendingFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  async function handleSubmit() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error("Informe o nome do módulo.")
      return
    }
    setSaving(true)
    try {
      const created = await onCreate({
        title: trimmedTitle,
        description: description.trim() || null,
      })
      if (pendingFile && onUploadBanner) {
        try {
          await onUploadBanner(created.id, pendingFile)
        } catch (err) {
          toast.error(
            err instanceof Error
              ? `Módulo criado, mas o banner falhou: ${err.message}`
              : "Módulo criado, mas o banner falhou.",
          )
        }
      }
      toast.success("Módulo criado!")
      onCreated?.(created)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar módulo")
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Novo módulo</DialogTitle>
          <DialogDescription>
            Um módulo agrupa aulas de um mesmo tema. Você pode trocar o banner
            depois pela página do módulo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              Banner do módulo (opcional)
            </Label>
            <ImageDropZone
              aspect="16/9"
              currentUrl={preview}
              title="Arraste ou envie uma imagem para o banner do módulo"
              hint="Recomendado 16:9 · JPG, PNG ou WebP · até 12MB"
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
            <Label htmlFor="new-module-title">Nome do módulo</Label>
            <Input
              id="new-module-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Fundamentos do design"
              maxLength={160}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-module-desc">Descrição curta (opcional)</Label>
            <Textarea
              id="new-module-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Em poucas linhas, o que este módulo cobre."
              rows={3}
              maxLength={500}
              disabled={saving}
            />
            <p className="text-[11px] text-white/40">
              {description.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Criar módulo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
