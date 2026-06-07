"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  EyeOff,
  Layers,
  Loader2,
  PlaySquare,
  Plus,
  Settings,
  Video,
  VideoOff,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { ImageDropZone } from "@/components/courses/image-drop-zone"
import { PageShell } from "@/components/tabloide"
import { useMyModule } from "@/hooks/use-my-module"
import {
  useModuleLessons,
  type CourseLesson,
  type LessonStatus,
} from "@/hooks/use-module-lessons"
import type { ModuleStatus } from "@/hooks/use-course-modules"
import { cn } from "@/lib/utils"
import { NewLessonModal } from "./new-lesson-modal"

interface Props {
  courseId: string
  moduleId: string
}

function StatusPill({ status }: { status: ModuleStatus | LessonStatus }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
        <span className="h-1 w-1 rounded-full bg-white/90" />
        Publicado
      </span>
    )
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-[#0B0B0D]/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
        <EyeOff className="h-3 w-3" /> Oculto
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-amber-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0B0B0D]">
      Rascunho
    </span>
  )
}

function VideoStatePill({
  status,
}: {
  status: CourseLesson["video_status"]
}) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
        <CheckCircle2 className="h-3 w-3" />
        Vídeo
      </span>
    )
  }
  if (status === "processing" || status === "uploading") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">
        <Loader2 className="h-3 w-3 animate-spin" />
        {status === "processing" ? "Processando" : "Enviando"}
      </span>
    )
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
        <AlertCircle className="h-3 w-3" />
        Erro
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-[#0B0B0D]/85 px-2 py-0.5 text-[10px] font-bold text-white">
      <VideoOff className="h-3 w-3" />
      Sem vídeo
    </span>
  )
}

function LessonCard({
  lesson,
  courseId,
  moduleId,
}: {
  lesson: CourseLesson
  courseId: string
  moduleId: string
}) {
  const showVideoBadge = lesson.video_status !== "empty"
  return (
    <Link
      href={`/account/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lesson.id)}`}
      className="group relative flex flex-col overflow-hidden border-2 border-[#0B0B0D] bg-[#1d1810] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#F2B705]"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-900">
        {lesson.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lesson.cover_url}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : lesson.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lesson.thumbnail_url}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(230,184,0,0.18),transparent_44%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]">
            <Video className="h-9 w-9 text-primary/45" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <StatusPill status={lesson.status} />
          {showVideoBadge && <VideoStatePill status={lesson.video_status} />}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3 text-left">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">
            {lesson.title}
          </p>
          {lesson.description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/70">
              {lesson.description}
            </p>
          )}
        </div>

        <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-zinc-950/85 text-white/85 backdrop-blur-sm transition group-hover:border-primary/45 group-hover:text-primary">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <span className="sr-only">
        Abrir aula {lesson.title} do módulo {moduleId}
      </span>
    </Link>
  )
}

export function ModuleLandingView({ courseId, moduleId }: Props) {
  const router = useRouter()
  const {
    module,
    isLoading: moduleLoading,
    error: moduleError,
    refresh: refreshModule,
    updateModule,
    uploadBanner,
    removeBanner,
  } = useMyModule(courseId, moduleId)
  const {
    lessons,
    isLoading: lessonsLoading,
    error: lessonsError,
    createLesson,
    uploadLessonCover,
  } = useModuleLessons(courseId, moduleId)

  const [editOpen, setEditOpen] = useState(false)
  const [newLessonOpen, setNewLessonOpen] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editStatus, setEditStatus] = useState<ModuleStatus>("draft")
  const [savingEdit, setSavingEdit] = useState(false)

  function openEdit() {
    if (!module) return
    setEditTitle(module.title)
    setEditDesc(module.description || "")
    setEditStatus(module.status)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    const trimmed = editTitle.trim()
    if (!trimmed) {
      toast.error("Informe o nome do módulo.")
      return
    }
    setSavingEdit(true)
    try {
      await updateModule({
        title: trimmed,
        description: editDesc.trim() || null,
        status: editStatus,
      })
      toast.success("Módulo atualizado.")
      setEditOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleBannerUpload = useCallback(
    async (file: File) => {
      try {
        await uploadBanner(file)
        toast.success("Banner atualizado!")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao enviar")
        throw err
      }
    },
    [uploadBanner],
  )

  const handleBannerRemove = useCallback(async () => {
    try {
      await removeBanner()
      toast.success("Banner removido.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover")
      throw err
    }
  }, [removeBanner])

  const orderedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.position - b.position),
    [lessons],
  )

  const publishedLessons = useMemo(
    () => orderedLessons.filter((l) => l.status === "published").length,
    [orderedLessons],
  )

  if (moduleLoading) {
    return (
      <PageShell texture={false} className="fl-paper-card md:pl-[80px]">
      <div className="relative z-10 px-4 py-10 text-[#0B0B0D] md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="h-9 w-32 animate-pulse rounded-full bg-[#0B0B0D]/[0.04]" />
          <div className="mt-6 aspect-[21/9] animate-pulse rounded-[1.5rem] bg-[#0B0B0D]/[0.05]" />
        </div>
      </div>
      </PageShell>
    )
  }

  if (moduleError || !module) {
    return (
      <PageShell texture={false} className="fl-paper-card md:pl-[80px]">
      <div className="relative z-10 px-4 py-10 text-[#0B0B0D] md:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-[1.5rem] border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-700">
          <AlertCircle className="mb-3 h-5 w-5" />
          <p className="font-medium">Não foi possível carregar o módulo.</p>
          <p className="mt-1 text-red-700/80">
            {moduleError || "Módulo indisponível."}
          </p>
          <Link
            href={`/account/courses/${encodeURIComponent(courseId)}`}
            className="mt-4 inline-flex rounded-full border border-[#0B0B0D]/20 px-4 py-2 text-sm text-[#0B0B0D]/80"
          >
            Voltar ao curso
          </Link>
        </div>
      </div>
      </PageShell>
    )
  }

  return (
    <PageShell texture={false} className="fl-paper-card text-[#0B0B0D] md:pl-[80px]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_30%_-10%,rgba(230,184,0,0.14),transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/account/courses/${encodeURIComponent(courseId)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] px-3 py-1.5 text-[12px] font-medium text-[#0B0B0D]/80 transition hover:border-[#0B0B0D]/35 hover:text-[#0B0B0D]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao curso
          </Link>
          <StatusPill status={module.status} />
          <div className="ml-auto">
            <button
              type="button"
              onClick={openEdit}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] px-3 py-1.5 text-[12px] font-medium text-[#0B0B0D]/80 transition hover:border-[#0B0B0D]/35 hover:text-[#0B0B0D]"
            >
              <Settings className="h-3.5 w-3.5" />
              Editar módulo
            </button>
          </div>
        </div>

        {/* Hero banner */}
        <section className="relative">
          <ImageDropZone
            currentUrl={module.banner_url}
            aspect="21/9"
            tone="light"
            label="Banner do módulo"
            title="Arraste ou envie uma imagem para o banner do módulo"
            hint="Recomendado 21:9 ou 16:9 · JPG, PNG ou WebP · até 12MB"
            onUpload={handleBannerUpload}
            onRemove={module.banner_url ? handleBannerRemove : undefined}
          />

          <div className="relative mt-5 grid gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-5 shadow-[4px_4px_0_0_#0B0B0D] md:p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary/85">
                  <Layers className="h-3 w-3" />
                  Módulo
                </p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#0B0B0D] md:text-3xl">
                  {module.title}
                </h1>
                {module.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#0B0B0D]/65">
                    {module.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] px-3 py-1 text-[12px] font-semibold text-[#0B0B0D]/80">
                  <PlaySquare className="h-3.5 w-3.5 text-primary/85" />
                  {orderedLessons.length} aula
                  {orderedLessons.length === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] px-3 py-1 text-[12px] font-semibold text-[#0B0B0D]/80">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {publishedLessons} publicada
                  {publishedLessons === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Aulas */}
        <section className="mt-10">
          <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary/85">
                <PlaySquare className="h-3 w-3" />
                Aulas do módulo
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#0B0B0D] md:text-2xl">
                Aulas
              </h2>
              <p className="mt-1 text-xs text-[#0B0B0D]/50">
                Cada aula tem sua landing com vídeo, materiais, questionário e
                comentários.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setNewLessonOpen(true)}
              className="rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_-14px_rgba(230,184,0,0.65)] hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova aula
            </Button>
          </header>

          {lessonsLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-[4/5] animate-pulse rounded-[1.25rem]",
                    "border border-[#0B0B0D]/10 bg-[#0B0B0D]/[0.03]",
                  )}
                />
              ))}
            </div>
          )}

          {!lessonsLoading && lessonsError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {lessonsError}
            </div>
          )}

          {!lessonsLoading && !lessonsError && orderedLessons.length === 0 && (
            <div className="rounded-[1.5rem] border border-dashed border-primary/25 bg-[radial-gradient(circle_at_top,rgba(230,184,0,0.1),transparent_36%),rgba(255,255,255,0.018)] p-10 text-center">
              <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <PlaySquare className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-[#0B0B0D]/80">
                Nenhuma aula neste módulo
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-[#0B0B0D]/55">
                Crie a primeira aula. Você poderá adicionar vídeo, materiais e
                questionário pela página dela.
              </p>
              <Button
                type="button"
                onClick={() => setNewLessonOpen(true)}
                className="mt-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira aula
              </Button>
            </div>
          )}

          {!lessonsLoading && !lessonsError && orderedLessons.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {orderedLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  moduleId={moduleId}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal: editar módulo */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar módulo</DialogTitle>
            <DialogDescription>
              Ajuste nome, descrição e status. Para trocar o banner, use o
              hero acima na página.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-module-title">Nome</Label>
              <Input
                id="edit-module-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={savingEdit}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-module-desc">Descrição curta</Label>
              <Textarea
                id="edit-module-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                disabled={savingEdit}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-module-status">Status</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as ModuleStatus)}
                disabled={savingEdit}
              >
                <SelectTrigger id="edit-module-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="hidden">Oculto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: nova aula */}
      <NewLessonModal
        open={newLessonOpen}
        onOpenChange={setNewLessonOpen}
        onCreate={(input) => createLesson(input)}
        onUploadCover={uploadLessonCover}
        onCreated={(created) => {
          // Redireciona para a landing da aula (rota já existente).
          router.push(
            `/account/courses/${encodeURIComponent(
              courseId,
            )}/lessons/${encodeURIComponent(created.id)}`,
          )
          // Garante refresh do counter quando voltar.
          void refreshModule()
        }}
      />
    </PageShell>
  )
}
