"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export interface LessonComment {
  id: string
  course_id: string
  lesson_id: string
  user_id: string
  body: string
  status: "active" | "deleted"
  created_at: string
  updated_at: string
  author_name: string
  author_avatar: string | null
  is_mine: boolean
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

export function useLessonComments({
  courseId,
  moduleId,
  lessonId,
  mode,
}: {
  courseId: string | null | undefined
  moduleId?: string | null | undefined
  lessonId: string | null | undefined
  mode: "owner" | "student"
}) {
  const [comments, setComments] = useState<LessonComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = useMemo(() => {
    if (!courseId || !lessonId) return null
    if (mode === "owner") {
      if (!moduleId) return null
      return `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}/comments`
    }
    return `/api/me/courses/purchased/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/comments`
  }, [courseId, lessonId, mode, moduleId])

  const refresh = useCallback(async () => {
    if (!baseUrl) {
      setComments([])
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
      const res = await fetchWithLog("useLessonComments:list", baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await readJsonSafe(res)) as
        | { comments?: LessonComment[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar comentários"))
        return
      }
      setComments(Array.isArray(data?.comments) ? data.comments : [])
    } catch {
      setError("Falha de rede ao carregar comentários")
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createComment = useCallback(
    async (body: string) => {
      if (!baseUrl || mode !== "student") throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog("useLessonComments:create", baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      })
      const data = (await readJsonSafe(res)) as
        | { comment?: LessonComment; error?: string }
        | null
      if (!res.ok || !data?.comment) {
        throw new Error(extractError(data, "Falha ao comentar"))
      }
      setComments((prev) => [data.comment!, ...prev])
      return data.comment
    },
    [baseUrl, mode],
  )

  const deleteComment = useCallback(
    async (id: string) => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useLessonComments:delete",
        `${baseUrl}/${encodeURIComponent(id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) {
        const data = await readJsonSafe(res)
        throw new Error(extractError(data, "Falha ao remover comentário"))
      }
      setComments((prev) => prev.filter((c) => c.id !== id))
    },
    [baseUrl],
  )

  return {
    comments,
    isLoading,
    error,
    refresh,
    createComment,
    deleteComment,
  }
}
