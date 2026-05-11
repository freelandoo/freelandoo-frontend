"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type {
  CourseLesson,
  LessonUpdateInput,
} from "@/hooks/use-module-lessons"

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

/**
 * Carrega uma aula isolada via endpoint flat
 * `GET /me/courses/:courseId/lessons/:lessonId` e expõe update/delete
 * que reaproveitam as rotas aninhadas (usando o `module_id` retornado
 * pelo GET).
 */
export function useCourseLesson(
  courseId: string | null | undefined,
  lessonId: string | null | undefined,
) {
  const [lesson, setLesson] = useState<CourseLesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId || !lessonId) {
      setLesson(null)
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
        "useCourseLesson:get",
        `/api/me/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | { lesson?: CourseLesson; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar aula"))
        return
      }
      setLesson(data?.lesson ?? null)
    } catch {
      setError("Falha de rede ao carregar aula")
    } finally {
      setIsLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateLesson = useCallback(
    async (patch: LessonUpdateInput): Promise<CourseLesson> => {
      if (!courseId || !lesson) throw new Error("Aula não carregada")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useCourseLesson:update",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(lesson.module_id)}/lessons/${encodeURIComponent(lesson.id)}`,
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
      setLesson(data.lesson)
      return data.lesson
    },
    [courseId, lesson],
  )

  const deleteLesson = useCallback(async (): Promise<void> => {
    if (!courseId || !lesson) throw new Error("Aula não carregada")
    const token = getToken()
    if (!token) throw new Error("Não autenticado")
    const res = await fetchWithLog(
      "useCourseLesson:delete",
      `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(lesson.module_id)}/lessons/${encodeURIComponent(lesson.id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (!res.ok) {
      const data = await readJsonSafe(res)
      throw new Error(extractError(data, "Falha ao excluir aula"))
    }
    setLesson(null)
  }, [courseId, lesson])

  return { lesson, isLoading, error, refresh, updateLesson, deleteLesson }
}
