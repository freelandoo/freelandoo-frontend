"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  PlaySquare,
} from "lucide-react"
import { useCourseModules } from "@/hooks/use-course-modules"
import { useModuleLessons } from "@/hooks/use-module-lessons"
import { useCourseLesson } from "@/hooks/use-course-lesson"
import { LessonCommentsPanel } from "@/components/courses/lesson-comments-panel"
import { PageShell } from "@/components/tabloide"
import { LessonModuleSidebar } from "./lesson-module-sidebar"
import { LessonDataForm } from "./lesson-data-form"
import { LessonVideoPlaceholder } from "./lesson-video-placeholder"
import { LessonMaterialsBlock } from "./lesson-materials-block"
import { LessonQuestionsBlock } from "./lesson-questions-block"

interface Props {
  courseId: string
  lessonId: string
}

function LessonStatusPill({ status }: { status: "draft" | "published" | "hidden" }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
        Publicada
      </span>
    )
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-[#0B0B0D]/85 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
        Oculta
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#0B0B0D]/20 bg-amber-500 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#0B0B0D]">
      Rascunho
    </span>
  )
}

export function LessonAdminView({ courseId, lessonId }: Props) {
  const router = useRouter()
  const { modules, isLoading: loadingModules } = useCourseModules(courseId)
  const {
    lesson,
    isLoading: loadingLesson,
    error: lessonError,
    updateLesson,
    uploadVideo,
    removeVideo,
  } = useCourseLesson(courseId, lessonId)

  // Carrega as aulas DO MÓDULO da aula atual (não do curso inteiro).
  // Antes era useAllCourseLessons (todas aulas do curso) — agora a sidebar
  // foca no módulo, então só precisamos das aulas-irmãs.
  const moduleIdForLessons = lesson?.module_id ?? null
  const {
    lessons: moduleLessons,
    isLoading: loadingModuleLessons,
    refresh: refreshModuleLessons,
  } = useModuleLessons(courseId, moduleIdForLessons)

  const currentModule = useMemo(
    () => modules.find((m) => m.id === lesson?.module_id) ?? null,
    [modules, lesson?.module_id],
  )

  // Navegação anterior/próxima APENAS dentro do módulo atual.
  const flatOrder = useMemo(() => {
    return [...moduleLessons].sort((a, b) => a.position - b.position)
  }, [moduleLessons])

  const currentIndex = flatOrder.findIndex((i) => i.id === lessonId)
  const prevLesson = currentIndex > 0 ? flatOrder[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatOrder.length - 1
      ? flatOrder[currentIndex + 1]
      : null

  const isLoading = loadingLesson || loadingModules || loadingModuleLessons

  return (
    <PageShell texture={false} className="fl-paper-card md:pl-[80px]">
    <div className="relative z-10 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={
              lesson
                ? `/account/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(lesson.module_id)}`
                : `/account/courses/${encodeURIComponent(courseId)}`
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] px-3 py-1.5 text-[12px] font-medium text-[#0B0B0D]/80 transition hover:border-[#0B0B0D]/35 hover:text-[#0B0B0D]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar ao módulo
          </Link>
          {lesson && <LessonStatusPill status={lesson.status} />}

          <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() =>
                prevLesson &&
                router.push(`/account/courses/${courseId}/lessons/${prevLesson.id}`)
              }
              disabled={!prevLesson}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] px-3 py-1.5 text-[12px] font-medium text-[#0B0B0D]/80 transition hover:border-[#0B0B0D]/35 hover:text-[#0B0B0D] disabled:opacity-30"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() =>
                nextLesson &&
                router.push(`/account/courses/${courseId}/lessons/${nextLesson.id}`)
              }
              disabled={!nextLesson}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] px-3 py-1.5 text-[12px] font-medium text-[#0B0B0D]/80 transition hover:border-[#0B0B0D]/35 hover:text-[#0B0B0D] disabled:opacity-30"
            >
              Próxima
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Estado: carregando aula */}
        {loadingLesson && (
          <div className="flex items-center justify-center rounded-[2rem] border border-white/[0.07] bg-[#0B0B0D]/[0.03] py-16 text-[#0B0B0D]/55">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando aula...
          </div>
        )}

        {/* Estado: erro */}
        {!loadingLesson && lessonError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Não foi possível carregar a aula</p>
              <p className="mt-1 text-red-700/80">{lessonError}</p>
              <Link
                href={`/account/courses/${courseId}`}
                className="mt-3 inline-block text-red-700 underline underline-offset-2 hover:text-[#0B0B0D]"
              >
                Voltar para o curso
              </Link>
            </div>
          </div>
        )}

        {/* Layout principal */}
        {!loadingLesson && !lessonError && lesson && (
          <>
            {/* Título da aula */}
            <h1 className="mb-6 inline-flex items-center gap-2 text-xl font-semibold text-[#0B0B0D] md:text-2xl">
              <PlaySquare className="h-5 w-5 text-primary" />
              <span className="truncate">{lesson.title}</span>
            </h1>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
              {/* Sidebar focada no módulo da aula atual */}
              <aside className="lg:sticky lg:top-6">
                <LessonModuleSidebar
                  courseId={courseId}
                  module={currentModule}
                  currentLessonId={lessonId}
                  lessons={moduleLessons}
                  isLoading={isLoading}
                />
              </aside>

              {/* Área principal */}
              <div className="space-y-5">
                {/* Player de vídeo + upload (Slice 7) */}
                <LessonVideoPlaceholder
                  lesson={lesson}
                  onUpload={async (file, onProgress) => {
                    const updated = await uploadVideo(file, onProgress)
                    await refreshModuleLessons()
                    return updated
                  }}
                  onRemove={async () => {
                    const updated = await removeVideo()
                    await refreshModuleLessons()
                    return updated
                  }}
                />

                {/* Dados da aula (editável) */}
                <section className="border-2 border-[#0B0B0D] bg-[#15120E] p-5 shadow-[4px_4px_0_0_#0B0B0D] md:p-7">
                  <header className="mb-4">
                    <h2 className="text-lg font-semibold text-[#F5F1E8]">
                      Dados da aula
                    </h2>
                    <p className="mt-1 text-xs text-white/50">
                      Edite título, descrição e status da aula. Recursos de
                      vídeo, materiais, questionário e comentários ficam logo abaixo.
                    </p>
                  </header>
                  <LessonDataForm
                    lesson={lesson}
                    onSave={async (patch) => {
                      await updateLesson(patch)
                      // Refresca a sidebar (título/status podem ter mudado).
                      await refreshModuleLessons()
                    }}
                  />
                </section>

                {/* Materiais de apoio (Slice 9) */}
                <LessonMaterialsBlock
                  courseId={courseId}
                  moduleId={lesson.module_id}
                  lessonId={lessonId}
                />

                {/* Questionário (Slice 10) */}
                <LessonQuestionsBlock
                  courseId={courseId}
                  moduleId={lesson.module_id}
                  lessonId={lessonId}
                />

                {/* Comentários (Slice 15) */}
                <LessonCommentsPanel
                  courseId={courseId}
                  moduleId={lesson.module_id}
                  lessonId={lessonId}
                  mode="owner"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </PageShell>
  )
}
