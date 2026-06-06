"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export type CourseStatus = "draft" | "published" | "paused"

export interface MyCourse {
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
  status: CourseStatus
  feed_post_id: string | null
  affiliates_allowed: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  modules_count: number
  lessons_count: number
  students_count: number
  revenue_cents?: number
  /** Perfis do clan anexados (co-autores que dividem a venda). Só em curso de clan. */
  member_profile_ids?: string[]
}

export interface CourseCreateInput {
  title: string
  short_description?: string | null
  description?: string | null
  cover_url?: string | null
  price_cents?: number | null
  profile_id?: string | null
  affiliates_allowed?: boolean
  member_profile_ids?: string[]
}

export interface CourseUpdateInput extends Partial<CourseCreateInput> {
  status?: CourseStatus
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

/** Carrega `/api/me/courses` (criados pelo usuário logado). */
export function useMyCourses() {
  const [courses, setCourses] = useState<MyCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setCourses([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchWithLog("useMyCourses:list", "/api/me/courses", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await readJsonSafe(res)) as
        | { courses?: MyCourse[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar cursos"))
        return
      }
      setCourses(Array.isArray(data?.courses) ? data!.courses : [])
    } catch {
      setError("Falha de rede ao carregar cursos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createCourse = useCallback(
    async (input: CourseCreateInput): Promise<MyCourse> => {
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog("useMyCourses:create", "/api/me/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      })
      const data = (await readJsonSafe(res)) as
        | { course?: MyCourse; error?: string }
        | null
      if (!res.ok || !data?.course) {
        throw new Error(extractError(data, "Falha ao criar curso"))
      }
      setCourses((prev) => [data.course!, ...prev])
      return data.course
    },
    [],
  )

  const updateCourse = useCallback(
    async (id: string, patch: CourseUpdateInput): Promise<MyCourse> => {
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useMyCourses:update",
        `/api/me/courses/${encodeURIComponent(id)}`,
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
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? data.course! : c)),
      )
      return data.course
    },
    [],
  )

  const uploadCourseCover = useCallback(
    async (id: string, file: File): Promise<MyCourse> => {
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const form = new FormData()
      form.append("cover", file)
      const res = await fetchWithLog(
        "useMyCourses:uploadCover",
        `/api/me/courses/${encodeURIComponent(id)}/cover`,
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
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? data.course! : c)),
      )
      return data.course
    },
    [],
  )

  const removeCourseCover = useCallback(
    async (id: string): Promise<MyCourse> => {
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useMyCourses:removeCover",
        `/api/me/courses/${encodeURIComponent(id)}/cover`,
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
      setCourses((prev) =>
        prev.map((c) => (c.id === id ? data.course! : c)),
      )
      return data.course
    },
    [],
  )

  const deleteCourse = useCallback(async (id: string): Promise<void> => {
    const token = getToken()
    if (!token) throw new Error("Não autenticado")
    const res = await fetchWithLog(
      "useMyCourses:delete",
      `/api/me/courses/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (!res.ok) {
      const data = await readJsonSafe(res)
      throw new Error(extractError(data, "Falha ao excluir curso"))
    }
    setCourses((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return {
    courses,
    isLoading,
    error,
    refresh,
    createCourse,
    updateCourse,
    deleteCourse,
    uploadCourseCover,
    removeCourseCover,
  }
}
