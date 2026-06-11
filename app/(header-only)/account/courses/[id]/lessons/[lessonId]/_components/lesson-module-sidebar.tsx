"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  Circle,
  Layers,
  Loader2,
  Lock,
  PlaySquare,
  Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { CourseModule } from "@/hooks/use-course-modules"
import type { CourseLesson } from "@/hooks/use-module-lessons"
import { cn } from "@/lib/utils"

interface Props {
  courseId: string
  module: CourseModule | null
  currentLessonId: string
  lessons: CourseLesson[]
  isLoading?: boolean
}

/**
 * Sidebar da landing da aula (visão criador).
 * Foco no MÓDULO atual: banner + progresso + lista filtrável das aulas
 * do mesmo módulo.
 */
export function LessonModuleSidebar({
  courseId,
  module,
  currentLessonId,
  lessons,
  isLoading,
}: Props) {
  const t = useTranslations("Account")
  const [query, setQuery] = useState("")

  const orderedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.position - b.position),
    [lessons],
  )

  const filteredLessons = useMemo(() => {
    if (!query.trim()) return orderedLessons
    const q = query.trim().toLowerCase()
    return orderedLessons.filter((l) => l.title.toLowerCase().includes(q))
  }, [orderedLessons, query])

  const publishedCount = useMemo(
    () => orderedLessons.filter((l) => l.status === "published").length,
    [orderedLessons],
  )
  const totalCount = orderedLessons.length
  const progressPct = totalCount
    ? Math.round((publishedCount / totalCount) * 100)
    : 0

  if (isLoading && !module) {
    return (
      <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] p-4 text-[12px] text-white/55">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("loadingModuleShort", "Carregando módulo...")}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      {/* Voltar */}
      <div className="border-b border-white/[0.07] px-3 py-3">
        <Link
          href={`/account/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(module?.id || "")}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/85 transition hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("backToModules", "Voltar aos módulos")}
        </Link>
      </div>

      {/* Banner do módulo */}
      <div className="px-3 pt-3">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900">
          {module?.banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={module.banner_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(230,184,0,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))]">
              <Layers className="h-7 w-7 text-primary/45" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/85 via-black/0 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/85">
              {t("moduleEyebrow", "Módulo")}
            </p>
            <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">
              {module?.title || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Progresso */}
      <div className="px-4 pt-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
          <span>
            {publishedCount}/{totalCount} {t("lessonsPublishedLabel", "publicadas")}
          </span>
          <span className="font-mono text-white/40">{progressPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Busca */}
      <div className="relative px-3 pt-4">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchLessonPlaceholder", "Busque por uma aula...")}
          className="h-9 border-white/10 bg-white/[0.04] pl-9 text-[12px] text-white placeholder:text-white/35"
        />
      </div>

      {/* Lista */}
      <div className="px-2 pb-3 pt-3 lg:max-h-[calc(100dvh-22rem)] lg:overflow-y-auto">
        {filteredLessons.length === 0 ? (
          <p className="px-2 py-4 text-center text-[12px] text-white/45">
            {query.trim()
              ? t("noLessonMatch", "Nenhuma aula com esse nome.")
              : t("noLessonsInModule", "Sem aulas neste módulo.")}
          </p>
        ) : (
          <ul className="space-y-1">
            {filteredLessons.map((lesson, idx) => {
              const isCurrent = lesson.id === currentLessonId
              const isPublished = lesson.status === "published"
              const isHidden = lesson.status === "hidden"
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/account/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lesson.id)}`}
                    className={cn(
                      "group grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2.5 py-2 text-left transition",
                      isCurrent
                        ? "bg-primary/15 text-white shadow-[inset_0_0_0_1px_rgba(230,184,0,0.35)]"
                        : "text-white/70 hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    {isPublished ? (
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isCurrent ? "text-primary" : "text-emerald-300/85",
                        )}
                      />
                    ) : isHidden ? (
                      <Lock
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isCurrent ? "text-primary" : "text-white/30",
                        )}
                      />
                    ) : (
                      <Circle
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          isCurrent ? "text-primary" : "text-white/30",
                        )}
                      />
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-1 text-[12px] font-semibold">
                        {String(idx + 1).padStart(2, "0")}. {lesson.title}
                      </span>
                    </span>
                    <PlaySquare
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isCurrent ? "text-primary" : "text-white/35",
                      )}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
