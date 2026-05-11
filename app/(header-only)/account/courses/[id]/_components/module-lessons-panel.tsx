"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  AlertCircle,
  PlaySquare,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Video,
  VideoOff,
  AlertTriangle,
  CircleCheck,
  ExternalLink,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useModuleLessons,
  type CourseLesson,
  type LessonStatus,
  type VideoStatus,
} from "@/hooks/use-module-lessons"

interface Props {
  courseId: string
  moduleId: string
  /** Disparado quando aulas mudam (criar/excluir) para o pai atualizar contadores. */
  onLessonsChanged?: () => void
}

interface LessonFormState {
  title: string
  description: string
  status: LessonStatus
}

function emptyForm(): LessonFormState {
  return { title: "", description: "", status: "draft" }
}

function StatusPill({ status }: { status: LessonStatus }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
        <span className="h-1 w-1 rounded-full bg-emerald-300" />
        Publicada
      </span>
    )
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
        Oculta
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
      Rascunho
    </span>
  )
}

function VideoStatusPill({ status }: { status: VideoStatus }) {
  if (status === "ready") {
    return (
      <span
        title="Vídeo pronto"
        className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
      >
        <CircleCheck className="h-3 w-3" />
        Vídeo
      </span>
    )
  }
  if (status === "processing" || status === "uploading") {
    return (
      <span
        title={status === "processing" ? "Processando vídeo" : "Enviando vídeo"}
        className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300"
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        {status === "processing" ? "Processando" : "Enviando"}
      </span>
    )
  }
  if (status === "error") {
    return (
      <span
        title="Erro no vídeo"
        className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300"
      >
        <AlertTriangle className="h-3 w-3" />
        Erro
      </span>
    )
  }
  return (
    <span
      title="Sem vídeo (upload no Slice 7)"
      className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-white/45"
    >
      <VideoOff className="h-3 w-3" />
      Sem vídeo
    </span>
  )
}

function LessonForm({
  value,
  onChange,
  disabled,
}: {
  value: LessonFormState
  onChange: (next: LessonFormState) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ls-title">
          Título da aula <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ls-title"
          placeholder="Ex.: O que você vai aprender"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          disabled={disabled}
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ls-desc">Descrição (opcional)</Label>
        <Textarea
          id="ls-desc"
          placeholder="Resuma o que essa aula cobre. Você pode editar depois na página da aula."
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={3}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ls-status">Status</Label>
        <Select
          value={value.status}
          onValueChange={(v) =>
            onChange({ ...value, status: v as LessonStatus })
          }
          disabled={disabled}
        >
          <SelectTrigger id="ls-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="published">Publicada</SelectItem>
            <SelectItem value="hidden">Oculta</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-white/45">
          Apenas aulas publicadas ficam visíveis para os alunos.
        </p>
      </div>
    </div>
  )
}

export function ModuleLessonsPanel({
  courseId,
  moduleId,
  onLessonsChanged,
}: Props) {
  const router = useRouter()
  const {
    lessons,
    isLoading,
    error,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
  } = useModuleLessons(courseId, moduleId)

  const orderedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.position - b.position),
    [lessons],
  )

  // Modais
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newForm, setNewForm] = useState<LessonFormState>(emptyForm())
  const [isSavingNew, setIsSavingNew] = useState(false)

  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null)
  const [editForm, setEditForm] = useState<LessonFormState>(emptyForm())
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [deletingLesson, setDeletingLesson] = useState<CourseLesson | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const [movingId, setMovingId] = useState<string | null>(null)

  function openNew() {
    setNewForm(emptyForm())
    setIsNewOpen(true)
  }

  function openEdit(l: CourseLesson) {
    setEditingLesson(l)
    setEditForm({
      title: l.title || "",
      description: l.description || "",
      status: l.status,
    })
  }

  function openLesson(l: CourseLesson) {
    // Slice 6: clique no título navega para a página dedicada da aula.
    // O botão "Editar" inline (no canto direito) continua abrindo o modal
    // rápido para mudanças sem sair do contexto do curso.
    router.push(`/account/courses/${courseId}/lessons/${l.id}`)
  }

  async function handleCreate() {
    const title = newForm.title.trim()
    if (!title) {
      toast.error("Informe o título da aula")
      return
    }
    setIsSavingNew(true)
    try {
      await createLesson({
        title,
        description: newForm.description.trim() || null,
        status: newForm.status,
      })
      toast.success("Aula criada")
      setIsNewOpen(false)
      setNewForm(emptyForm())
      onLessonsChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar aula")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingLesson) return
    const title = editForm.title.trim()
    if (!title) {
      toast.error("Informe o título da aula")
      return
    }
    setIsSavingEdit(true)
    try {
      await updateLesson(editingLesson.id, {
        title,
        description: editForm.description.trim() || null,
        status: editForm.status,
      })
      toast.success("Aula atualizada")
      setEditingLesson(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao atualizar aula",
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingLesson) return
    setIsDeleting(true)
    try {
      await deleteLesson(deletingLesson.id)
      toast.success("Aula excluída")
      setDeletingLesson(null)
      onLessonsChanged?.()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao excluir aula",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleMove(id: string, direction: -1 | 1) {
    const ids = orderedLessons.map((l) => l.id)
    const idx = ids.indexOf(id)
    if (idx === -1) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= ids.length) return
    const swapped = [...ids]
    swapped[idx] = ids[newIdx]
    swapped[newIdx] = ids[idx]
    setMovingId(id)
    try {
      await reorderLessons(swapped)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao reordenar aulas",
      )
    } finally {
      setMovingId(null)
    }
  }

  return (
    <>
      <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Aulas
          </p>
          <Button
            type="button"
            onClick={openNew}
            size="sm"
            variant="outline"
            className="h-7 rounded-full px-2.5 text-[11px]"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nova aula
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 px-1 py-3 text-[12px] text-white/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Carregando aulas...
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-[12px] text-red-200">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        {!isLoading && !error && orderedLessons.length === 0 && (
          <p className="px-1 py-2 text-[12px] text-white/50">
            Nenhuma aula neste módulo ainda.{" "}
            <button
              type="button"
              onClick={openNew}
              className="font-medium text-primary hover:underline"
            >
              Criar a primeira
            </button>
          </p>
        )}

        {!isLoading && !error && orderedLessons.length > 0 && (
          <ul className="space-y-1.5">
            {orderedLessons.map((l, idx) => {
              const isFirst = idx === 0
              const isLast = idx === orderedLessons.length - 1
              const isMoving = movingId === l.id
              return (
                <li
                  key={l.id}
                  className="group flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.015] px-2.5 py-1.5 transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-white/60">
                    {idx + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => openLesson(l)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    title="Editar aula"
                  >
                    <PlaySquare className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span className="truncate text-[13px] font-medium text-white">
                      {l.title}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    <VideoStatusPill status={l.video_status} />
                    <StatusPill status={l.status} />
                  </div>

                  <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleMove(l.id, -1)}
                      disabled={isFirst || isMoving}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30"
                      aria-label="Subir aula"
                      title="Subir"
                    >
                      {isMoving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(l.id, 1)}
                      disabled={isLast || isMoving}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30"
                      aria-label="Descer aula"
                      title="Descer"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(l)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.07] hover:text-white"
                      aria-label="Editar aula"
                      title="Editar"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingLesson(l)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-red-300/70 transition hover:bg-red-500/15 hover:text-red-200"
                      aria-label="Excluir aula"
                      title="Excluir"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!isLoading && !error && orderedLessons.length > 0 && (
          <p className="px-1 pt-1 text-[10px] text-white/35">
            <ExternalLink className="mr-0.5 inline h-2.5 w-2.5" />
            Clique no título da aula para abrir a página dedicada (vídeo,
            materiais, comentários).
          </p>
        )}
      </div>

      {/* Modal: Nova aula */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar nova aula</DialogTitle>
            <DialogDescription>
              A aula nasce em <strong>rascunho</strong>. Upload do vídeo entra
              no Slice 7; por aqui você já define título, descrição e status.
            </DialogDescription>
          </DialogHeader>
          <LessonForm
            value={newForm}
            onChange={setNewForm}
            disabled={isSavingNew}
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewOpen(false)}
              disabled={isSavingNew}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isSavingNew}
            >
              {isSavingNew ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Criar aula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar aula */}
      <Dialog
        open={editingLesson !== null}
        onOpenChange={(open) => {
          if (!open) setEditingLesson(null)
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar aula</DialogTitle>
            <DialogDescription>
              Quando o Slice 6 entrar, este modal vira uma página dedicada com
              vídeo, materiais, questionário e comentários.
            </DialogDescription>
          </DialogHeader>
          <LessonForm
            value={editForm}
            onChange={setEditForm}
            disabled={isSavingEdit}
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingLesson(null)}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar exclusão */}
      <Dialog
        open={deletingLesson !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingLesson(null)
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Excluir aula?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O vídeo, materiais, questionário
              e comentários associados também serão removidos quando os Slices
              7-15 entrarem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingLesson(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
