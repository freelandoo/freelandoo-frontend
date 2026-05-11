"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type { CourseProgressSummary } from "@/hooks/use-course-progress"
import type { LessonMaterial } from "@/hooks/use-lesson-materials"
import type { LessonQuestion } from "@/hooks/use-lesson-questions"

export interface PlayerCourse {
  id: string
  owner_user_id: string
  profile_id: string | null
  profile_display_name: string | null
  title: string
  slug: string | null
  short_description: string | null
  description: string | null
  cover_url: string | null
  price_cents: number | null
  status: "published" | "draft" | "paused"
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface PlayerLesson {
  id: string
  course_id: string
  module_id: string
  title: string
  description: string | null
  position: number
  status: "published"
  video_status: "empty" | "uploading" | "processing" | "ready" | "error"
  video_url: string | null
  thumbnail_url: string | null
  duration_seconds: number | null
  completed_at: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface PlayerModule {
  id: string
  course_id: string
  title: string
  description: string | null
  position: number
  status: "published"
  lessons: PlayerLesson[]
  created_at: string
  updated_at: string
}

export interface CoursePlayerPayload {
  course: PlayerCourse
  modules: PlayerModule[]
  active_lesson: PlayerLesson | null
  materials: LessonMaterial[]
  questions: LessonQuestion[]
  summary: CourseProgressSummary
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

export function useCoursePlayer(courseId: string, initialLessonId?: string) {
  const [data, setData] = useState<CoursePlayerPayload | null>(null)
  const [lessonId, setLessonId] = useState<string | undefined>(initialLessonId)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const url = useMemo(() => {
    const base = `/api/me/courses/purchased/${encodeURIComponent(courseId)}/player`
    return lessonId ? `${base}?lessonId=${encodeURIComponent(lessonId)}` : base
  }, [courseId, lessonId])

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchWithLog("useCoursePlayer:get", url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await readJsonSafe(res)) as
        | (Partial<CoursePlayerPayload> & { error?: string })
        | null
      if (!res.ok || !payload?.course) {
        setError(extractError(payload, "Falha ao carregar player"))
        return
      }
      setData(payload as CoursePlayerPayload)
    } catch {
      setError("Falha de rede ao carregar player")
    } finally {
      setIsLoading(false)
    }
  }, [url])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setLessonCompleted = useCallback(
    async (targetLessonId: string, completed: boolean) => {
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useCoursePlayer:setLesson",
        `/api/me/courses/purchased/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(targetLessonId)}/progress`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ completed }),
        },
      )
      const payload = (await readJsonSafe(res)) as
        | { summary?: CourseProgressSummary; error?: string }
        | null
      if (!res.ok) {
        throw new Error(extractError(payload, "Falha ao atualizar progresso"))
      }
      setData((prev) => {
        if (!prev) return prev
        const completedAt = completed ? new Date().toISOString() : null
        const updateLesson = (lesson: PlayerLesson): PlayerLesson =>
          lesson.id === targetLessonId
            ? {
                ...lesson,
                is_completed: completed,
                completed_at: completedAt,
              }
            : lesson
        return {
          ...prev,
          summary: payload?.summary || prev.summary,
          active_lesson: prev.active_lesson
            ? updateLesson(prev.active_lesson)
            : prev.active_lesson,
          modules: prev.modules.map((m) => ({
            ...m,
            lessons: m.lessons.map(updateLesson),
          })),
        }
      })
    },
    [courseId],
  )

  return {
    data,
    lessonId,
    setLessonId,
    isLoading,
    error,
    refresh,
    setLessonCompleted,
  }
}
