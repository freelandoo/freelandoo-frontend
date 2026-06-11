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
import { useTranslations } from "@/components/i18n/I18nProvider"
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
  const t = useTranslations("Account")

  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
        <span className="h-1 w-1 rounded-full bg-emerald-300" />
        {t("statusPublished", "Publicado")}
      </span>
    )
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
        <EyeOff className="h-3 w-3" /> {t("statusHidden", "Oculto")}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
      {t("statusDraft", "Rascunho")}
    </span>
  )
}

function VideoStatePill({
  status,
}: {
  status: CourseLesson["video_status"]
}) {
  const t = useTranslations("Account")

  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        {t("videoReadyShort", "Vídeo")}
      </span>
    )
  }
  if (status === "processing" || status === "uploading") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        {status === "processing" ? t("processing", "Processando...") : t("uploading", "Enviando...")}
      </span>
    )
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
        <AlertCircle className="h-3 w-3" />
        {t("errorShort", "Erro")}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-white/55">
      <VideoOff className="h-3 w-3" />
      {t("noVideo", "Sem vídeo")}
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
  const t = useTranslations("Account")
  const showVideoBadge = lesson.video_status !== "empty"
  return (
    <Link
      href={`/account/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lesson.id)}`}
      className="group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_45px_-22px_rgba(230,184,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]"
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
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/65">
              {lesson.description}
            </p>
          )}
        </div>

        <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-zinc-950/85 text-white/85 backdrop-blur-sm transition group-hover:border-primary/45 group-hover:text-primary">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <span className="sr-only">
        {t("openLessonSr", "Abrir aula {title} do módulo {moduleId}")
          .replace("{title}", lesson.title)
          .replace("{moduleId}", moduleId)}
      </span>
    </Link>
  )
}

export function ModuleLandingView({ courseId, moduleId }: Props) {
  const router = useRouter()
  const t = useTranslations("Account")
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
      toast.error(t("moduleTitleRequired", "Informe o nome do módulo."))
      return
    }
    setSavingEdit(true)
    try {
      await updateModule({
        title: trimmed,
        description: editDesc.trim() || null,
        status: editStatus,
      })
      toast.success(t("moduleUpdated", "Módulo atualizado."))
      setEditOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateFailed", "Falha ao atualizar"))
    } finally {
      setSavingEdit(false)
    }
  }

  const handleBannerUpload = useCallback(
    async (file: File) => {
      try {
        await uploadBanner(file)
        toast.success(t("bannerUpdated", "Banner atualizado!"))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("uploadFailed", "Falha ao enviar"))
        throw err
      }
    },
    [t, uploadBanner],
  )

  const handleBannerRemove = useCallback(async () => {
    try {
      await removeBanner()
      toast.success(t("bannerRemoved", "Banner removido."))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("removeFailed", "Falha ao remover"))
      throw err
    }
  }, [removeBanner, t])

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
      <PageShell className="md:pl-[80px]">
      <div className="relative z-10 px-4 py-10 text-white md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="h-9 w-32 animate-pulse rounded-full bg-white/[0.04]" />
          <div className="mt-6 aspect-[21/9] animate-pulse rounded-[1.5rem] bg-white/[0.05]" />
        </div>
      </div>
      </PageShell>
    )
  }

  if (moduleError || !module) {
    return (
      <PageShell className="md:pl-[80px]">
      <div className="relative z-10 px-4 py-10 text-white md:px-8">
        <div className="mx-auto w-full max-w-3xl rounded-[1.5rem] border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          <AlertCircle className="mb-3 h-5 w-5" />
          <p className="font-medium">{t("moduleLoadFailedTitle", "Não foi possível carregar o módulo.")}</p>
          <p className="mt-1 text-red-200/80">
            {moduleError || t("moduleUnavailable", "Módulo indisponível.")}
          </p>
          <Link
            href={`/account/courses/${encodeURIComponent(courseId)}`}
            className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white/85"
          >
            {t("backToCourse", "Voltar ao curso")}
          </Link>
        </div>
      </div>
      </PageShell>
    )
  }

  return (
    <PageShell className="text-white md:pl-[80px]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_30%_-10%,rgba(230,184,0,0.14),transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        {/* Top bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/account/courses/${encodeURIComponent(courseId)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("backToCourse", "Voltar ao curso")}
          </Link>
          <StatusPill status={module.status} />
          <div className="ml-auto">
            <button
              type="button"
              onClick={openEdit}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
            >
              <Settings className="h-3.5 w-3.5" />
              {t("editModule", "Editar módulo")}
            </button>
          </div>
        </div>

        {/* Hero banner */}
        <section className="relative">
          <ImageDropZone
            currentUrl={module.banner_url}
            aspect="21/9"
            label={t("moduleBannerLabel", "Banner do módulo")}
            title={t("moduleBannerDropTitle", "Arraste ou envie uma imagem para o banner do módulo")}
            hint={t("moduleBannerWideDropHint", "Recomendado 21:9 ou 16:9 · JPG, PNG ou WebP · até 12MB")}
            onUpload={handleBannerUpload}
            onRemove={module.banner_url ? handleBannerRemove : undefined}
          />

          <div className="relative mt-5 grid gap-3 rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary/85">
                  <Layers className="h-3 w-3" />
                  {t("moduleSingularTitle", "Módulo")}
                </p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight text-white md:text-3xl">
                  {module.title}
                </h1>
                {module.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                    {module.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[12px] font-semibold text-white/85">
                  <PlaySquare className="h-3.5 w-3.5 text-primary/85" />
                  {orderedLessons.length}{" "}
                  {orderedLessons.length === 1
                    ? t("lessonSingular", "aula")
                    : t("lessonPlural", "aulas")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[12px] font-semibold text-white/85">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300/85" />
                  {publishedLessons}{" "}
                  {publishedLessons === 1
                    ? t("publishedLessonSingular", "publicada")
                    : t("publishedLessonPlural", "publicadas")}
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
                {t("moduleLessonsEyebrow", "Aulas do módulo")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                {t("lessonsTitle", "Aulas")}
              </h2>
              <p className="mt-1 text-xs text-white/50">
                {t("moduleLessonsHint", "Cada aula tem sua landing com vídeo, materiais, questionário e comentários.")}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setNewLessonOpen(true)}
              className="rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_-14px_rgba(230,184,0,0.65)] hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("newLesson", "Nova aula")}
            </Button>
          </header>

          {lessonsLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "aspect-[4/5] animate-pulse rounded-[1.25rem]",
                    "border border-white/[0.06] bg-white/[0.025]",
                  )}
                />
              ))}
            </div>
          )}

          {!lessonsLoading && lessonsError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="h-4 w-4" />
              {lessonsError}
            </div>
          )}

          {!lessonsLoading && !lessonsError && orderedLessons.length === 0 && (
            <div className="rounded-[1.5rem] border border-dashed border-primary/25 bg-[radial-gradient(circle_at_top,rgba(230,184,0,0.1),transparent_36%),rgba(255,255,255,0.018)] p-10 text-center">
              <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <PlaySquare className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium text-white/85">
                {t("noLessonsInModule", "Nenhuma aula neste módulo")}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
                {t("noLessonsInModuleDesc", "Crie a primeira aula. Você poderá adicionar vídeo, materiais e questionário pela página dela.")}
              </p>
              <Button
                type="button"
                onClick={() => setNewLessonOpen(true)}
                className="mt-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("createFirstLesson", "Criar primeira aula")}
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
            <DialogTitle>{t("editModule", "Editar módulo")}</DialogTitle>
            <DialogDescription>
              {t("editModuleDesc", "Ajuste nome, descrição e status. Para trocar o banner, use o hero acima na página.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-module-title">{t("nameLabel", "Nome")}</Label>
              <Input
                id="edit-module-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={savingEdit}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-module-desc">{t("courseShortDescription", "Descrição curta")}</Label>
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
              <Label htmlFor="edit-module-status">{t("studentTableStatus", "Status")}</Label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as ModuleStatus)}
                disabled={savingEdit}
              >
                <SelectTrigger id="edit-module-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("statusDraft", "Rascunho")}</SelectItem>
                  <SelectItem value="published">{t("statusPublished", "Publicado")}</SelectItem>
                  <SelectItem value="hidden">{t("statusHidden", "Oculto")}</SelectItem>
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
              {t("cancel", "Cancelar")}
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("save", "Salvar")}
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
