"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type { CourseLesson } from "@/hooks/use-module-lessons"

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
 * Lista TODAS as aulas do curso de uma vez (endpoint flat).
 * Usado pela sidebar da página dedicada de edição da aula para
 * renderizar a árvore módulos → aulas com uma única chamada.
 */
export function useAllCourseLessons(courseId: string | null | undefined) {
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId) {
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
        "useAllCourseLessons:list",
        `/api/me/courses/${encodeURIComponent(courseId)}/lessons`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | { lessons?: CourseLesson[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar aulas do curso"))
        return
      }
      setLessons(Array.isArray(data?.lessons) ? data!.lessons : [])
    } catch {
      setError("Falha de rede ao carregar aulas")
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { lessons, isLoading, error, refresh }
}
