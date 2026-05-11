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
import { useAllCourseLessons } from "@/hooks/use-all-course-lessons"
import { useCourseLesson } from "@/hooks/use-course-lesson"
import { LessonCommentsPanel } from "@/components/courses/lesson-comments-panel"
import { LessonSidebar } from "./lesson-sidebar"
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
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        Publicada
      </span>
    )
  }
  if (status === "hidden") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">
        Oculta
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
      Rascunho
    </span>
  )
}

export function LessonAdminView({ courseId, lessonId }: Props) {
  const router = useRouter()
  const { modules, isLoading: loadingModules } = useCourseModules(courseId)
  const { lessons: allLessons, isLoading: loadingAllLessons, refresh: refreshAllLessons } =
    useAllCourseLessons(courseId)
  const {
    lesson,
    isLoading: loadingLesson,
    error: lessonError,
    updateLesson,
    uploadVideo,
    removeVideo,
  } = useCourseLesson(courseId, lessonId)

  // Lista ordenada (módulo asc, aula asc) para navegação anterior/próxima.
  const flatOrder = useMemo(() => {
    const modulePos = new Map<string, number>()
    for (const m of modules) modulePos.set(m.id, m.position)
    const items = allLessons
      .filter((l) => modulePos.has(l.module_id))
      .map((l) => ({
        id: l.id,
        title: l.title,
        modulePosition: modulePos.get(l.module_id) ?? 0,
        lessonPosition: l.position,
      }))
    items.sort((a, b) => {
      if (a.modulePosition !== b.modulePosition)
        return a.modulePosition - b.modulePosition
      return a.lessonPosition - b.lessonPosition
    })
    return items
  }, [modules, allLessons])

  const currentIndex = flatOrder.findIndex((i) => i.id === lessonId)
  const prevLesson = currentIndex > 0 ? flatOrder[currentIndex - 1] : null
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatOrder.length - 1
      ? flatOrder[currentIndex + 1]
      : null

  const isLoading = loadingLesson || loadingModules || loadingAllLessons

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(242,196,9,0.08),transparent_30%),#09090b] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/account/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar para o curso
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
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white disabled:opacity-30"
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
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white disabled:opacity-30"
            >
              Próxima
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Estado: carregando aula */}
        {loadingLesson && (
          <div className="flex items-center justify-center rounded-[2rem] border border-white/[0.07] bg-white/[0.02] py-16 text-white/55">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando aula...
          </div>
        )}

        {/* Estado: erro */}
        {!loadingLesson && lessonError && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Não foi possível carregar a aula</p>
              <p className="mt-1 text-red-200/80">{lessonError}</p>
              <Link
                href={`/account/courses/${courseId}`}
                className="mt-3 inline-block text-red-200 underline underline-offset-2 hover:text-white"
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
            <h1 className="mb-6 inline-flex items-center gap-2 text-xl font-semibold text-white md:text-2xl">
              <PlaySquare className="h-5 w-5 text-primary" />
              <span className="truncate">{lesson.title}</span>
            </h1>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
              {/* Sidebar */}
              <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
                <LessonSidebar
                  courseId={courseId}
                  currentLessonId={lessonId}
                  modules={modules}
                  lessons={allLessons}
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
                    await refreshAllLessons()
                    return updated
                  }}
                  onRemove={async () => {
                    const updated = await removeVideo()
                    await refreshAllLessons()
                    return updated
                  }}
                />

                {/* Dados da aula (editável) */}
                <section className="rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:p-7">
                  <header className="mb-4">
                    <h2 className="text-lg font-semibold text-white">
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
                      await refreshAllLessons()
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
    </main>
  )
}
