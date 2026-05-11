"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export interface CourseProgressSummary {
  lessons_count: number
  completed_lessons_count: number
  progress_percent: number
}

export interface CourseLessonProgress {
  lesson_id: string
  module_id: string
  title: string
  position: number
  status: "published"
  completed_at: string | null
  is_completed: boolean
}

const EMPTY_SUMMARY: CourseProgressSummary = {
  lessons_count: 0,
  completed_lessons_count: 0,
  progress_percent: 0,
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function extractError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error?: unknown }).error
    if (typeof e === "string" && e.trim()) return e
  }
  return fallback
}

export function useCourseProgress(courseId: string | null | undefined) {
  const [summary, setSummary] = useState<CourseProgressSummary>(EMPTY_SUMMARY)
  const [lessons, setLessons] = useState<CourseLessonProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId) {
      setSummary(EMPTY_SUMMARY)
      setLessons([])
      setIsLoading(false)
      return
    }
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchWithLog(
        "useCourseProgress:get",
        `/api/me/courses/purchased/${encodeURIComponent(courseId)}/progress`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | {
            summary?: CourseProgressSummary
            lessons?: CourseLessonProgress[]
            error?: string
          }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar progresso"))
        return
      }
      setSummary(data?.summary || EMPTY_SUMMARY)
      setLessons(Array.isArray(data?.lessons) ? data.lessons : [])
    } catch {
      setError("Falha de rede ao carregar progresso")
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setLessonCompleted = useCallback(
    async (lessonId: string, completed: boolean) => {
      if (!courseId) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useCourseProgress:setLesson",
        `/api/me/courses/purchased/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/progress`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ completed }),
        },
      )
      const data = (await readJsonSafe(res)) as
        | { summary?: CourseProgressSummary; error?: string }
        | null
      if (!res.ok) {
        throw new Error(extractError(data, "Falha ao atualizar progresso"))
      }
      if (data?.summary) setSummary(data.summary)
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.lesson_id === lessonId
            ? {
                ...lesson,
                is_completed: completed,
                completed_at: completed ? new Date().toISOString() : null,
              }
            : lesson,
        ),
      )
      return data
    },
    [courseId],
  )

  return {
    summary,
    lessons,
    isLoading,
    error,
    refresh,
    setLessonCompleted,
  }
}
