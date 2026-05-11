"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type { MyCourse, CourseUpdateInput } from "./use-my-courses"

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
 * Hook focado em UM curso (carregado pelo id da URL).
 * Usado pela landing visual em /account/courses/[id].
 */
export function useMyCourse(courseId: string | null | undefined) {
  const [course, setCourse] = useState<MyCourse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId) {
      setCourse(null)
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
        "useMyCourse:get",
        `/api/me/courses/${encodeURIComponent(courseId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | { course?: MyCourse; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar curso"))
        setCourse(null)
        return
      }
      setCourse(data?.course || null)
    } catch {
      setError("Falha de rede ao carregar curso")
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateCourse = useCallback(
    async (patch: CourseUpdateInput): Promise<MyCourse> => {
      if (!courseId) throw new Error("Curso inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useMyCourse:update",
        `/api/me/courses/${encodeURIComponent(courseId)}`,
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
        | { course?: MyCourse; error?: string }
        | null
      if (!res.ok || !data?.course) {
        throw new Error(extractError(data, "Falha ao atualizar curso"))
      }
      setCourse(data.course)
      return data.course
    },
    [courseId],
  )

  const uploadCover = useCallback(
    async (file: File): Promise<MyCourse> => {
      if (!courseId) throw new Error("Curso inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const form = new FormData()
      form.append("cover", file)
      const res = await fetchWithLog(
        "useMyCourse:uploadCover",
        `/api/me/courses/${encodeURIComponent(courseId)}/cover`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      )
      const data = (await readJsonSafe(res)) as
        | { course?: MyCourse; error?: string }
        | null
      if (!res.ok || !data?.course) {
        throw new Error(extractError(data, "Falha ao enviar capa"))
      }
      setCourse(data.course)
      return data.course
    },
    [courseId],
  )

  const removeCover = useCallback(async (): Promise<MyCourse> => {
    if (!courseId) throw new Error("Curso inválido")
    const token = getToken()
    if (!token) throw new Error("Não autenticado")
    const res = await fetchWithLog(
      "useMyCourse:removeCover",
      `/api/me/courses/${encodeURIComponent(courseId)}/cover`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    const data = (await readJsonSafe(res)) as
      | { course?: MyCourse; error?: string }
      | null
    if (!res.ok || !data?.course) {
      throw new Error(extractError(data, "Falha ao remover capa"))
    }
    setCourse(data.course)
    return data.course
  }, [courseId])

  return {
    course,
    isLoading,
    error,
    refresh,
    updateCourse,
    uploadCover,
    removeCover,
  }
}
