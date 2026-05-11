"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  AlertCircle,
  BookOpen,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  PlaySquare,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { ModuleLessonsPanel } from "./module-lessons-panel"
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
  useCourseModules,
  type CourseModule,
  type ModuleStatus,
} from "@/hooks/use-course-modules"

interface Props {
  courseId: string
  /** Disparado quando módulos mudam (criar/excluir) para o pai atualizar contadores. */
  onModulesChanged?: () => void
}

interface ModuleFormState {
  title: string
  description: string
  status: ModuleStatus
}

function emptyForm(): ModuleFormState {
  return { title: "", description: "", status: "draft" }
}

function ModuleStatusPill({ status }: { status: ModuleStatus }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        Publicado
      </span>
    )
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
        <EyeOff className="h-3 w-3" />
        Oculto
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
      Rascunho
    </span>
  )
}

function ModuleForm({
  value,
  onChange,
  disabled,
}: {
  value: ModuleFormState
  onChange: (next: ModuleFormState) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mod-title">
          Nome do módulo <span className="text-destructive">*</span>
        </Label>
        <Input
          id="mod-title"
          placeholder="Ex.: Comece por aqui"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          disabled={disabled}
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mod-desc">Descrição curta (opcional)</Label>
        <Textarea
          id="mod-desc"
          placeholder="Em poucas linhas, o que este módulo cobre."
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={3}
          disabled={disabled}
          maxLength={500}
        />
        <p className="text-[11px] text-white/45">
          {value.description.length}/500
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mod-status">Status</Label>
        <Select
          value={value.status}
          onValueChange={(v) =>
            onChange({ ...value, status: v as ModuleStatus })
          }
          disabled={disabled}
        >
          <SelectTrigger id="mod-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="hidden">Oculto</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-white/45">
          Apenas módulos publicados ficam visíveis para os alunos.
        </p>
      </div>
    </div>
  )
}

export function CourseModulesSection({ courseId, onModulesChanged }: Props) {
  const {
    modules,
    isLoading,
    error,
    refresh: refreshModules,
    createModule,
    updateModule,
    deleteModule,
    reorderModules,
  } = useCourseModules(courseId)

  // Quando uma aula muda dentro de um módulo, atualiza o lessons_count
  // do card (refresh local) e propaga para o pai atualizar o curso.
  async function handleLessonsChanged() {
    await refreshModules()
    onModulesChanged?.()
  }

  // Modais
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newForm, setNewForm] = useState<ModuleFormState>(emptyForm())
  const [isSavingNew, setIsSavingNew] = useState(false)

  const [editingModule, setEditingModule] = useState<CourseModule | null>(null)
  const [editForm, setEditForm] = useState<ModuleFormState>(emptyForm())
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [deletingModule, setDeletingModule] = useState<CourseModule | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const [movingId, setMovingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => a.position - b.position),
    [modules],
  )

  function openNew() {
    setNewForm(emptyForm())
    setIsNewOpen(true)
  }

  function openEdit(m: CourseModule) {
    setEditingModule(m)
    setEditForm({
      title: m.title || "",
      description: m.description || "",
      status: m.status,
    })
  }

  async function handleCreate() {
    const title = newForm.title.trim()
    if (!title) {
      toast.error("Informe o nome do módulo")
      return
    }
    setIsSavingNew(true)
    try {
      await createModule({
        title,
        description: newForm.description.trim() || null,
        status: newForm.status,
      })
      toast.success("Módulo criado")
      setIsNewOpen(false)
      setNewForm(emptyForm())
      onModulesChanged?.()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao criar módulo",
      )
    } finally {
      setIsSavingNew(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingModule) return
    const title = editForm.title.trim()
    if (!title) {
      toast.error("Informe o nome do módulo")
      return
    }
    setIsSavingEdit(true)
    try {
      await updateModule(editingModule.id, {
        title,
        description: editForm.description.trim() || null,
        status: editForm.status,
      })
      toast.success("Módulo atualizado")
      setEditingModule(null)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao atualizar módulo",
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingModule) return
    setIsDeleting(true)
    try {
      await deleteModule(deletingModule.id)
      toast.success("Módulo excluído")
      setDeletingModule(null)
      onModulesChanged?.()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao excluir módulo",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleMove(id: string, direction: -1 | 1) {
    const ids = orderedModules.map((m) => m.id)
    const idx = ids.indexOf(id)
    if (idx === -1) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= ids.length) return
    const swapped = [...ids]
    swapped[idx] = ids[newIdx]
    swapped[newIdx] = ids[idx]
    setMovingId(id)
    try {
      await reorderModules(swapped)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao reordenar módulos",
      )
    } finally {
      setMovingId(null)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/55">
            {modules.length} módulo{modules.length === 1 ? "" : "s"} ·{" "}
            {modules.filter((m) => m.status === "published").length} publicado
            {modules.filter((m) => m.status === "published").length === 1
              ? ""
              : "s"}
          </p>
          <Button
            type="button"
            onClick={openNew}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo módulo
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-10 text-white/55">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando módulos...
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!isLoading && !error && orderedModules.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-primary/25 bg-[radial-gradient(circle_at_top,rgba(242,196,9,0.1),transparent_36%),rgba(255,255,255,0.018)] p-10 text-center">
            <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-white/85">
              Nenhum módulo criado ainda
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
              Módulos agrupam as aulas do seu curso. Comece por algo simples
              como &ldquo;Comece por aqui&rdquo; ou &ldquo;Fundamentos&rdquo;.
            </p>
            <Button
              onClick={openNew}
              className="mt-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro módulo
            </Button>
          </div>
        )}

        {!isLoading && !error && orderedModules.length > 0 && (
          <ul className="space-y-3">
            {orderedModules.map((m, idx) => {
              const isFirst = idx === 0
              const isLast = idx === orderedModules.length - 1
              const isMoving = movingId === m.id
              const isExpanded = expandedIds.has(m.id)
              return (
                <li
                  key={m.id}
                  className="group rounded-[1.35rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] p-3 transition hover:border-primary/25 md:p-4"
                >
                  <div className="flex items-stretch gap-2">
                    {/* Coluna de ordenação */}
                    <div className="flex flex-col items-center justify-center gap-1 text-white/40">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>

                    {/* Conteúdo (clicável para expandir) */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(m.id)}
                      className="min-w-0 flex-1 text-left"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Recolher módulo" : "Expandir módulo"}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                          <BookOpen className="h-3.5 w-3.5 text-primary/80" />
                          <span className="truncate">{m.title}</span>
                        </h3>
                        <ModuleStatusPill status={m.status} />
                      </div>
                      {m.description && (
                        <p className="mt-1 line-clamp-2 text-[12px] text-white/55">
                          {m.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
                        <span className="inline-flex items-center gap-1">
                          <PlaySquare className="h-3 w-3" />
                          {m.lessons_count} aula
                          {m.lessons_count === 1 ? "" : "s"}
                        </span>
                        <span className="text-white/30">·</span>
                        <span className="inline-flex items-center gap-1 text-primary/80">
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Recolher aulas
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Mostrar aulas
                            </>
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Ações */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(m.id, -1)}
                          disabled={isFirst || isMoving}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-30"
                          aria-label="Subir módulo"
                          title="Subir"
                        >
                          {isMoving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArrowUp className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(m.id, 1)}
                          disabled={isLast || isMoving}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/70 transition hover:border-white/25 hover:text-white disabled:opacity-30"
                          aria-label="Descer módulo"
                          title="Descer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="inline-flex h-7 items-center gap-1 rounded-full border border-white/12 bg-white/[0.03] px-2.5 text-[11px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingModule(m)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-red-200 transition hover:border-red-500/50 hover:text-red-100"
                          aria-label="Excluir módulo"
                          title="Excluir módulo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Painel de aulas (montado apenas quando expandido) */}
                  {isExpanded && (
                    <ModuleLessonsPanel
                      courseId={courseId}
                      moduleId={m.id}
                      onLessonsChanged={handleLessonsChanged}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {!isLoading && !error && orderedModules.length > 0 && (
          <p className="text-[11px] text-white/45">
            <Eye className="mr-1 inline h-3 w-3" />
            Os alunos veem apenas os módulos com status <strong>Publicado</strong>.
            Use as setas para reordenar.
          </p>
        )}
      </div>

      {/* Modal: Novo módulo */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar novo módulo</DialogTitle>
            <DialogDescription>
              O módulo nasce em <strong>rascunho</strong>. Você pode adicionar
              aulas a ele assim que o Slice 5 entrar.
            </DialogDescription>
          </DialogHeader>
          <ModuleForm
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
              Criar módulo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar módulo */}
      <Dialog
        open={editingModule !== null}
        onOpenChange={(open) => {
          if (!open) setEditingModule(null)
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar módulo</DialogTitle>
            <DialogDescription>
              Atualize o nome, descrição ou status do módulo.
            </DialogDescription>
          </DialogHeader>
          <ModuleForm
            value={editForm}
            onChange={setEditForm}
            disabled={isSavingEdit}
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingModule(null)}
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
        open={deletingModule !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingModule(null)
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Excluir módulo?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Todas as aulas dentro deste
              módulo também serão removidas quando o Slice 5 entrar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingModule(null)}
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
