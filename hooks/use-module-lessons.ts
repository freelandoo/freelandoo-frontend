"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export type LessonStatus = "draft" | "published" | "hidden"
export type VideoStatus =
  | "empty"
  | "uploading"
  | "processing"
  | "ready"
  | "error"

export interface CourseLesson {
  id: string
  course_id: string
  module_id: string
  title: string
  description: string | null
  position: number
  status: LessonStatus
  video_status: VideoStatus
  original_video_url: string | null
  processed_video_url: string | null
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  updated_at: string
}

export interface LessonCreateInput {
  title: string
  description?: string | null
  status?: LessonStatus
}

export interface LessonUpdateInput {
  title?: string
  description?: string | null
  status?: LessonStatus
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

export function useModuleLessons(
  courseId: string | null | undefined,
  moduleId: string | null | undefined,
) {
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId || !moduleId) {
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
        "useModuleLessons:list",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | { lessons?: CourseLesson[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar aulas"))
        return
      }
      setLessons(Array.isArray(data?.lessons) ? data!.lessons : [])
    } catch {
      setError("Falha de rede ao carregar aulas")
    } finally {
      setIsLoading(false)
    }
  }, [courseId, moduleId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createLesson = useCallback(
    async (input: LessonCreateInput): Promise<CourseLesson> => {
      if (!courseId || !moduleId) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useModuleLessons:create",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(input),
        },
      )
      const data = (await readJsonSafe(res)) as
        | { lesson?: CourseLesson; error?: string }
        | null
      if (!res.ok || !data?.lesson) {
        throw new Error(extractError(data, "Falha ao criar aula"))
      }
      setLessons((prev) =>
        [...prev, data.lesson!].sort((a, b) => a.position - b.position),
      )
      return data.lesson
    },
    [courseId, moduleId],
  )

  const updateLesson = useCallback(
    async (
      id: string,
      patch: LessonUpdateInput,
    ): Promise<CourseLesson> => {
      if (!courseId || !moduleId) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useModuleLessons:update",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patch),
        },
      )
      const data = (await readJsonSafe(res)) as
        | { lesson?: CourseLesson; error?: string }
        | null
      if (!res.ok || !data?.lesson) {
        throw new Error(extractError(data, "Falha ao atualizar aula"))
      }
      setLessons((prev) =>
        prev.map((l) => (l.id === id ? data.lesson! : l)),
      )
      return data.lesson
    },
    [courseId, moduleId],
  )

  const deleteLesson = useCallback(
    async (id: string): Promise<void> => {
      if (!courseId || !moduleId) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useModuleLessons:delete",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        const data = await readJsonSafe(res)
        throw new Error(extractError(data, "Falha ao excluir aula"))
      }
      setLessons((prev) => prev.filter((l) => l.id !== id))
    },
    [courseId, moduleId],
  )

  const reorderLessons = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      if (!courseId || !moduleId) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      setLessons((prev) => {
        const map = new Map(prev.map((l) => [l.id, l]))
        return orderedIds
          .map((id, idx) => {
            const l = map.get(id)
            return l ? { ...l, position: idx } : null
          })
          .filter(Boolean) as CourseLesson[]
      })
      const res = await fetchWithLog(
        "useModuleLessons:reorder",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/order`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ordered_ids: orderedIds }),
        },
      )
      const data = (await readJsonSafe(res)) as
        | { lessons?: CourseLesson[]; error?: string }
        | null
      if (!res.ok) {
        await refresh()
        throw new Error(extractError(data, "Falha ao reordenar"))
      }
      if (Array.isArray(data?.lessons)) {
        setLessons(data!.lessons)
      }
    },
    [courseId, moduleId, refresh],
  )

  return {
    lessons,
    isLoading,
    error,
    refresh,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
  }
}
