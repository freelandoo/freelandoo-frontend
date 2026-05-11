"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  HelpCircle,
  Loader2,
  Lock,
  PlayCircle,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LessonCommentsPanel } from "@/components/courses/lesson-comments-panel"
import { useCoursePlayer, type PlayerLesson } from "@/hooks/use-course-player"

interface Props {
  courseId: string
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "Sem duração"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

function LessonRow({
  lesson,
  active,
  onSelect,
}: {
  lesson: PlayerLesson
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
        active
          ? "bg-primary/15 text-white ring-1 ring-primary/35"
          : "text-white/70 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {lesson.is_completed ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
      ) : (
        <Circle className="h-4 w-4 text-white/35" />
      )}
      <span className="truncate text-[13px] font-medium">{lesson.title}</span>
      <span className="font-mono text-[10px] text-white/40">
        {formatDuration(lesson.duration_seconds)}
      </span>
    </button>
  )
}

export function CourseWatchView({ courseId }: Props) {
  const {
    data,
    setLessonId,
    isLoading,
    error,
    setLessonCompleted,
  } = useCoursePlayer(courseId)
  const [savingProgress, setSavingProgress] = useState(false)

  const activeLesson = data?.active_lesson || null
  const totalLessons = data?.summary.lessons_count || 0
  const completedLessons = data?.summary.completed_lessons_count || 0
  const progress = data?.summary.progress_percent || 0

  const nextLesson = useMemo(() => {
    if (!data?.modules.length || !activeLesson) return null
    const flat = data.modules.flatMap((m) => m.lessons)
    const idx = flat.findIndex((l) => l.id === activeLesson.id)
    return idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null
  }, [data?.modules, activeLesson])

  async function toggleCompleted() {
    if (!activeLesson) return
    const wasCompleted = activeLesson.is_completed
    setSavingProgress(true)
    try {
      await setLessonCompleted(activeLesson.id, !wasCompleted)
      if (!wasCompleted && nextLesson) {
        toast.success("Aula concluída. Indo para a próxima…")
        setLessonId(nextLesson.id)
      } else {
        toast.success(
          wasCompleted ? "Aula marcada como pendente." : "Aula concluída.",
        )
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao atualizar progresso",
      )
    } finally {
      setSavingProgress(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-[100dvh] bg-zinc-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="h-10 w-48 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="aspect-video animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-96 animate-pulse rounded-2xl bg-white/[0.04]" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-[100dvh] bg-zinc-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
          <AlertCircle className="mb-3 h-5 w-5" />
          <p className="font-medium">Não foi possível abrir o curso</p>
          <p className="mt-1 text-sm text-red-200/80">
            {error || "Curso indisponível."}
          </p>
          <Link
            href="/account"
            className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white/85"
          >
            Voltar para meus cursos
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(242,196,9,0.08),transparent_30%),#09090b] px-4 py-6 text-white md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Meus Cursos
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold md:text-xl">
              {data.course.title}
            </h1>
            <p className="text-xs text-white/45">
              {completedLessons}/{totalLessons} aulas concluídas
            </p>
          </div>
          <div className="ml-auto w-full max-w-xs md:w-64">
            <div className="mb-1 flex items-center justify-between text-[11px] text-white/45">
              <span>Progresso</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 space-y-5">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-zinc-900 shadow-[0_18px_55px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]">
              {activeLesson?.video_url ? (
                <video
                  src={activeLesson.video_url}
                  poster={activeLesson.thumbnail_url || undefined}
                  controls
                  className="aspect-video w-full bg-zinc-950"
                />
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,rgba(242,196,9,0.08),transparent_34%),#09090b] text-white/45">
                  {activeLesson ? (
                    <>
                      <Video className="h-10 w-10" />
                      <p className="text-sm">Vídeo ainda não disponível.</p>
                    </>
                  ) : (
                    <>
                      <Lock className="h-10 w-10" />
                      <p className="text-sm">Nenhuma aula publicada.</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {activeLesson && (
              <section className="rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">
                      {activeLesson.title}
                    </h2>
                    {activeLesson.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                        {activeLesson.description}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={toggleCompleted}
                    disabled={savingProgress}
                    className={
                      activeLesson.is_completed
                        ? "bg-emerald-500 text-white hover:bg-emerald-500/90"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }
                  >
                    {savingProgress ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : activeLesson.is_completed ? (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    ) : (
                      <Circle className="mr-2 h-4 w-4" />
                    )}
                    {activeLesson.is_completed
                      ? "Concluída"
                      : "Marcar concluída"}
                  </Button>
                </div>

                {nextLesson && (
                  <button
                    type="button"
                    onClick={() => setLessonId(nextLesson.id)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75 transition hover:border-white/25 hover:text-white"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    Próxima aula
                  </button>
                )}
              </section>
            )}

            {activeLesson && (
              <div className="grid gap-4 md:grid-cols-2">
                <section className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.025] p-4">
                  <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-primary" />
                    Materiais
                  </h3>
                  {data.materials.length > 0 ? (
                    <ul className="space-y-2">
                      {data.materials.map((m) => (
                        <li key={m.id}>
                          <a
                            href={m.kind === "link" ? m.link_url || "#" : m.file_url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-sm text-white/75 transition hover:border-primary/30 hover:text-white"
                          >
                            {m.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.018] px-3 py-5 text-center text-sm text-white/50">
                      Esta aula não tem material de apoio.
                    </p>
                  )}
                </section>

                <section className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.025] p-4">
                  <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    Questionário
                  </h3>
                  {data.questions.length > 0 ? (
                    <div className="space-y-3">
                      {data.questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                        >
                          <p className="text-sm font-medium">
                            {idx + 1}. {q.prompt}
                          </p>
                          <ul className="mt-2 space-y-1.5">
                            {q.options.map((o) => (
                              <li
                                key={o.id}
                                className="rounded-lg border border-white/[0.07] px-2.5 py-1.5 text-xs text-white/65"
                              >
                                {o.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.018] px-3 py-5 text-center text-sm text-white/50">
                      Esta aula não tem questionário.
                    </p>
                  )}
                </section>
              </div>
            )}

            {activeLesson && (
              <LessonCommentsPanel
                courseId={courseId}
                lessonId={activeLesson.id}
                mode="student"
              />
            )}
          </section>

          <aside className="rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Aulas publicadas
            </p>
            <div className="space-y-3">
              {data.modules.map((module) => {
                const moduleCompleted = module.lessons.filter(
                  (l) => l.is_completed,
                ).length
                const moduleTotal = module.lessons.length
                const allDone = moduleTotal > 0 && moduleCompleted === moduleTotal
                return (
                  <section key={module.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 px-2">
                      <p className="truncate text-xs font-semibold text-white/65">
                        {module.title}
                      </p>
                      <span
                        className={`shrink-0 font-mono text-[10px] ${
                          allDone ? "text-emerald-300/85" : "text-white/40"
                        }`}
                      >
                        {moduleCompleted}/{moduleTotal}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {module.lessons.map((lesson) => (
                        <LessonRow
                          key={lesson.id}
                          lesson={lesson}
                          active={activeLesson?.id === lesson.id}
                          onSelect={() => setLessonId(lesson.id)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
              {data.modules.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/45">
                  Este curso ainda não tem aulas publicadas.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
