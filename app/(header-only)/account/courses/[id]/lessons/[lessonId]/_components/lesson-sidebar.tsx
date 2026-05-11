"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  PlaySquare,
  Loader2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Circle,
} from "lucide-react"
import type { CourseModule } from "@/hooks/use-course-modules"
import type { CourseLesson } from "@/hooks/use-module-lessons"

interface Props {
  courseId: string
  currentLessonId: string
  modules: CourseModule[]
  lessons: CourseLesson[]
  isLoading?: boolean
}

export function LessonSidebar({
  courseId,
  currentLessonId,
  modules,
  lessons,
  isLoading,
}: Props) {
  // Agrupa aulas por module_id, ordenadas pela position.
  const lessonsByModule = useMemo(() => {
    const map = new Map<string, CourseLesson[]>()
    for (const l of lessons) {
      if (!map.has(l.module_id)) map.set(l.module_id, [])
      map.get(l.module_id)!.push(l)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.position - b.position)
    }
    return map
  }, [lessons])

  // Ordena módulos pela position.
  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => a.position - b.position),
    [modules],
  )

  // Auto-expande o módulo da aula atual.
  const currentModuleId = useMemo(() => {
    const l = lessons.find((x) => x.id === currentLessonId)
    return l?.module_id ?? null
  }, [lessons, currentLessonId])

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const s = new Set<string>()
    if (currentModuleId) s.add(currentModuleId)
    return s
  })

  // Se o currentModuleId mudou (navegou pra aula de outro módulo), expande-o.
  useEffect(() => {
    if (currentModuleId) {
      setExpandedIds((prev) => {
        if (prev.has(currentModuleId)) return prev
        return new Set(prev).add(currentModuleId)
      })
    }
  }, [currentModuleId])

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isLoading && lessons.length === 0 && modules.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 text-[12px] text-white/55">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando estrutura...
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-4">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Estrutura do curso
      </p>

      {orderedModules.length === 0 ? (
        <p className="px-2 py-3 text-[12px] text-white/55">
          Sem módulos neste curso.
        </p>
      ) : (
        <ul className="space-y-1">
          {orderedModules.map((m, mIdx) => {
            const items = lessonsByModule.get(m.id) || []
            const isExpanded = expandedIds.has(m.id)
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[12px] font-semibold text-white/85 transition hover:bg-white/[0.05]"
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/45" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/45" />
                  )}
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                  <span className="flex-1 truncate">
                    {String(mIdx + 1).padStart(2, "0")}. {m.title}
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-px text-[10px] font-medium text-white/55">
                    {items.length}
                  </span>
                </button>
                {isExpanded && (
                  <ul className="ml-2 mt-1 space-y-0.5 border-l border-white/[0.06] pl-2">
                    {items.length === 0 ? (
                      <li className="px-2 py-1.5 text-[11px] text-white/40">
                        Sem aulas neste módulo
                      </li>
                    ) : (
                      items.map((l, lIdx) => {
                        const isCurrent = l.id === currentLessonId
                        const isPublished = l.status === "published"
                        return (
                          <li key={l.id}>
                            <Link
                              href={`/account/courses/${courseId}/lessons/${l.id}`}
                              className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] transition ${
                                isCurrent
                                  ? "bg-primary/15 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(242,196,9,0.35)]"
                                  : "text-white/65 hover:bg-white/[0.04] hover:text-white"
                              }`}
                            >
                              {isPublished ? (
                                <CircleCheck
                                  className={`h-3 w-3 shrink-0 ${
                                    isCurrent
                                      ? "text-primary"
                                      : "text-emerald-300/70"
                                  }`}
                                />
                              ) : (
                                <Circle
                                  className={`h-3 w-3 shrink-0 ${
                                    isCurrent
                                      ? "text-primary"
                                      : "text-white/35"
                                  }`}
                                />
                              )}
                              <PlaySquare
                                className={`h-3 w-3 shrink-0 ${
                                  isCurrent ? "text-primary" : "text-white/45"
                                }`}
                              />
                              <span className="flex-1 truncate">
                                {lIdx + 1}. {l.title}
                              </span>
                            </Link>
                          </li>
                        )
                      })
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
