"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDashed,
  Edit,
  HelpCircle,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useLessonQuestions,
  type LessonQuestion,
  type QuestionOptionInput,
} from "@/hooks/use-lesson-questions"

interface Props {
  courseId: string
  moduleId: string
  lessonId: string
}

const MIN_OPTIONS = 2
const MAX_OPTIONS = 8

interface DraftOption {
  label: string
  is_correct: boolean
}

function emptyDraft(): { prompt: string; options: DraftOption[] } {
  return {
    prompt: "",
    options: [
      { label: "", is_correct: true },
      { label: "", is_correct: false },
    ],
  }
}

function draftFromQuestion(q: LessonQuestion): {
  prompt: string
  options: DraftOption[]
} {
  return {
    prompt: q.prompt,
    options: q.options.map((o) => ({
      label: o.label,
      is_correct: o.is_correct,
    })),
  }
}

function validateDraft(draft: {
  prompt: string
  options: DraftOption[]
}): string | null {
  if (!draft.prompt.trim()) return "Escreva o enunciado da pergunta."
  if (draft.options.length < MIN_OPTIONS) {
    return `Adicione pelo menos ${MIN_OPTIONS} opções.`
  }
  if (draft.options.some((o) => !o.label.trim())) {
    return "Preencha o texto de todas as opções."
  }
  const correctCount = draft.options.filter((o) => o.is_correct).length
  if (correctCount !== 1) return "Marque exatamente 1 opção como correta."
  return null
}

function toInput(draft: {
  prompt: string
  options: DraftOption[]
}): { prompt: string; options: QuestionOptionInput[] } {
  return {
    prompt: draft.prompt.trim(),
    options: draft.options.map((o) => ({
      label: o.label.trim(),
      is_correct: o.is_correct,
    })),
  }
}

interface QuestionEditorProps {
  initial: { prompt: string; options: DraftOption[] }
  busy: boolean
  submitLabel: string
  onSubmit: (
    value: { prompt: string; options: QuestionOptionInput[] },
  ) => Promise<void> | void
  onCancel: () => void
}

function QuestionEditor({
  initial,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
}: QuestionEditorProps) {
  const [draft, setDraft] = useState(initial)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const setPrompt = useCallback((prompt: string) => {
    setDraft((s) => ({ ...s, prompt }))
  }, [])

  const setOptionLabel = useCallback((idx: number, label: string) => {
    setDraft((s) => {
      const options = s.options.slice()
      options[idx] = { ...options[idx], label }
      return { ...s, options }
    })
  }, [])

  const setCorrect = useCallback((idx: number) => {
    setDraft((s) => ({
      ...s,
      options: s.options.map((o, i) => ({ ...o, is_correct: i === idx })),
    }))
  }, [])

  const addOption = useCallback(() => {
    setDraft((s) => {
      if (s.options.length >= MAX_OPTIONS) return s
      return {
        ...s,
        options: [...s.options, { label: "", is_correct: false }],
      }
    })
  }, [])

  const removeOption = useCallback((idx: number) => {
    setDraft((s) => {
      if (s.options.length <= MIN_OPTIONS) return s
      const wasCorrect = s.options[idx].is_correct
      const next = s.options.filter((_, i) => i !== idx)
      if (wasCorrect && next.length) {
        next[0] = { ...next[0], is_correct: true }
      }
      return { ...s, options: next }
    })
  }, [])

  const moveOption = useCallback((idx: number, dir: -1 | 1) => {
    setDraft((s) => {
      const nextIdx = idx + dir
      if (nextIdx < 0 || nextIdx >= s.options.length) return s
      const options = s.options.slice()
      ;[options[idx], options[nextIdx]] = [options[nextIdx], options[idx]]
      return { ...s, options }
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    const err = validateDraft(draft)
    if (err) {
      toast.error(err)
      return
    }
    await onSubmit(toInput(draft))
  }, [draft, onSubmit])

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="question-prompt" className="text-white/80">
          Enunciado
        </Label>
        <Textarea
          id="question-prompt"
          value={draft.prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="Ex.: Qual é a melhor prática para nomear variáveis em JS?"
          className="mt-1 min-h-[68px] border-white/10 bg-zinc-900 text-white"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="text-white/80">
            Opções (marque a correta)
          </Label>
          <button
            type="button"
            onClick={addOption}
            disabled={draft.options.length >= MAX_OPTIONS}
            className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-white/80 transition hover:border-white/25 hover:text-white disabled:opacity-30"
          >
            <Plus className="h-3 w-3" />
            Adicionar opção
          </button>
        </div>
        <ul className="space-y-2">
          {draft.options.map((opt, idx) => (
            <li
              key={idx}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition ${
                opt.is_correct
                  ? "border-emerald-400/30 bg-emerald-500/10"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                onClick={() => setCorrect(idx)}
                className="shrink-0"
                aria-label={
                  opt.is_correct
                    ? "Opção correta"
                    : "Marcar como opção correta"
                }
              >
                {opt.is_correct ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                ) : (
                  <CircleDashed className="h-5 w-5 text-white/40" />
                )}
              </button>
              <Input
                value={opt.label}
                onChange={(e) => setOptionLabel(idx, e.target.value)}
                placeholder={`Opção ${idx + 1}`}
                className="flex-1 border-white/10 bg-zinc-900 text-white"
              />
              <button
                type="button"
                onClick={() => moveOption(idx, -1)}
                disabled={idx === 0}
                className="rounded-md p-1.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                aria-label="Mover opção para cima"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveOption(idx, 1)}
                disabled={idx === draft.options.length - 1}
                className="rounded-md p-1.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                aria-label="Mover opção para baixo"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeOption(idx)}
                disabled={draft.options.length <= MIN_OPTIONS}
                className="rounded-md p-1.5 text-white/45 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                aria-label="Remover opção"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={busy}
          className="text-white/70 hover:bg-white/[0.05] hover:text-white"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}

export function LessonQuestionsBlock({ courseId, moduleId, lessonId }: Props) {
  const {
    questions,
    isLoading,
    error,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  } = useLessonQuestions(courseId, moduleId, lessonId)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState(emptyDraft())

  const [editTarget, setEditTarget] = useState<LessonQuestion | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<LessonQuestion | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openCreate = useCallback(() => {
    setCreateDraft(emptyDraft())
    setCreateOpen(true)
  }, [])

  const submitCreate = useCallback(
    async (value: { prompt: string; options: QuestionOptionInput[] }) => {
      setCreating(true)
      try {
        await createQuestion(value)
        toast.success("Pergunta adicionada.")
        setCreateOpen(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao adicionar")
      } finally {
        setCreating(false)
      }
    },
    [createQuestion],
  )

  const submitEdit = useCallback(
    async (value: { prompt: string; options: QuestionOptionInput[] }) => {
      if (!editTarget) return
      setEditSaving(true)
      try {
        await updateQuestion(editTarget.id, value)
        toast.success("Pergunta atualizada.")
        setEditTarget(null)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao atualizar")
      } finally {
        setEditSaving(false)
      }
    },
    [editTarget, updateQuestion],
  )

  const submitDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteQuestion(deleteTarget.id)
      toast.success("Pergunta removida.")
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover")
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, deleteQuestion])

  const moveItem = useCallback(
    async (id: string, dir: -1 | 1) => {
      const idx = questions.findIndex((q) => q.id === id)
      if (idx < 0) return
      const next = idx + dir
      if (next < 0 || next >= questions.length) return
      const order = questions.map((q) => q.id)
      ;[order[idx], order[next]] = [order[next], order[idx]]
      try {
        await reorderQuestions(order)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha ao reordenar")
      }
    },
    [questions, reorderQuestions],
  )

  return (
    <section className="rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-7">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
            <HelpCircle className="h-4 w-4 text-primary" />
            Questionário
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Cada pergunta tem 2–{MAX_OPTIONS} opções e exatamente 1 marcada como
            correta.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={openCreate}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar pergunta
        </Button>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] py-6 text-xs text-white/55">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando perguntas...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.018] px-4 py-6 text-center text-xs text-white/50">
          Nenhuma pergunta ainda. Crie uma checagem rápida para reforçar o aprendizado.
        </div>
      )}

      {!isLoading && !error && questions.length > 0 && (
        <ol className="space-y-3">
          {questions.map((q, idx) => (
            <li
              key={q.id}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition hover:border-primary/25"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] px-1.5 text-[11px] font-semibold text-white/65">
                  {idx + 1}
                </span>
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-white">
                  {q.prompt}
                </p>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => moveItem(q.id, -1)}
                    disabled={idx === 0}
                    className="rounded-md p-1.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(q.id, 1)}
                    disabled={idx === questions.length - 1}
                    className="rounded-md p-1.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTarget(q)}
                    className="rounded-md p-1.5 text-white/55 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Editar"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(q)}
                    className="rounded-md p-1.5 text-red-300/70 transition hover:bg-red-500/10 hover:text-red-200"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5 pl-9">
                {q.options.map((opt) => (
                  <li
                    key={opt.id}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                      opt.is_correct
                        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                        : "border-white/[0.07] bg-white/[0.015] text-white/75"
                    }`}
                  >
                    {opt.is_correct ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5 shrink-0 text-white/35" />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {/* Modal: criar pergunta */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Nova pergunta</DialogTitle>
            <DialogDescription className="text-white/55">
              Adicione um enunciado e as alternativas. Marque qual é a correta.
            </DialogDescription>
          </DialogHeader>
          <QuestionEditor
            initial={createDraft}
            busy={creating}
            submitLabel="Adicionar"
            onSubmit={submitCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: editar pergunta */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="max-w-lg border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Editar pergunta</DialogTitle>
            <DialogDescription className="text-white/55">
              Edite o enunciado, opções e qual é a correta.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <QuestionEditor
              initial={draftFromQuestion(editTarget)}
              busy={editSaving}
              submitLabel="Salvar"
              onSubmit={submitEdit}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: confirmar delete */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Remover pergunta?</DialogTitle>
            <DialogDescription className="text-white/55">
              A pergunta e suas opções serão removidas desta aula. Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="text-white/70 hover:bg-white/[0.05] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={submitDelete}
              disabled={deleting}
              className="bg-red-500 text-white hover:bg-red-500/90"
            >
              {deleting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
