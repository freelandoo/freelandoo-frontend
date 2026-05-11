"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export interface LessonQuestionOption {
  id: string
  question_id: string
  label: string
  is_correct: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface LessonQuestion {
  id: string
  lesson_id: string
  prompt: string
  position: number
  created_at: string
  updated_at: string
  options: LessonQuestionOption[]
}

export interface QuestionOptionInput {
  label: string
  is_correct: boolean
}

export interface QuestionInput {
  prompt: string
  options: QuestionOptionInput[]
}

export interface QuestionUpdateInput {
  prompt?: string
  options?: QuestionOptionInput[]
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

export function useLessonQuestions(
  courseId: string | null | undefined,
  moduleId: string | null | undefined,
  lessonId: string | null | undefined,
) {
  const [questions, setQuestions] = useState<LessonQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const baseUrl =
    courseId && moduleId && lessonId
      ? `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}/questions`
      : null

  const refresh = useCallback(async () => {
    if (!baseUrl) {
      setQuestions([])
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
      const res = await fetchWithLog("useLessonQuestions:list", baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await readJsonSafe(res)) as
        | { questions?: LessonQuestion[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar perguntas"))
        return
      }
      setQuestions(Array.isArray(data?.questions) ? data!.questions : [])
    } catch {
      setError("Falha de rede ao carregar perguntas")
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createQuestion = useCallback(
    async (input: QuestionInput): Promise<LessonQuestion> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog("useLessonQuestions:create", baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      })
      const data = (await readJsonSafe(res)) as
        | { question?: LessonQuestion; error?: string }
        | null
      if (!res.ok || !data?.question) {
        throw new Error(extractError(data, "Falha ao criar pergunta"))
      }
      setQuestions((prev) =>
        [...prev, data.question!].sort((a, b) => a.position - b.position),
      )
      return data.question
    },
    [baseUrl],
  )

  const updateQuestion = useCallback(
    async (
      id: string,
      patch: QuestionUpdateInput,
    ): Promise<LessonQuestion> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useLessonQuestions:update",
        `${baseUrl}/${encodeURIComponent(id)}`,
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
        | { question?: LessonQuestion; error?: string }
        | null
      if (!res.ok || !data?.question) {
        throw new Error(extractError(data, "Falha ao atualizar"))
      }
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? data.question! : q)),
      )
      return data.question
    },
    [baseUrl],
  )

  const deleteQuestion = useCallback(
    async (id: string): Promise<void> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useLessonQuestions:delete",
        `${baseUrl}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        const data = await readJsonSafe(res)
        throw new Error(extractError(data, "Falha ao excluir"))
      }
      setQuestions((prev) => prev.filter((q) => q.id !== id))
    },
    [baseUrl],
  )

  const reorderQuestions = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      setQuestions((prev) => {
        const map = new Map(prev.map((q) => [q.id, q]))
        return orderedIds
          .map((id, idx) => {
            const q = map.get(id)
            return q ? { ...q, position: idx } : null
          })
          .filter(Boolean) as LessonQuestion[]
      })
      const res = await fetchWithLog(
        "useLessonQuestions:reorder",
        `${baseUrl}/order`,
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
        | { questions?: LessonQuestion[]; error?: string }
        | null
      if (!res.ok) {
        await refresh()
        throw new Error(extractError(data, "Falha ao reordenar"))
      }
      if (Array.isArray(data?.questions)) {
        setQuestions(data!.questions)
      }
    },
    [baseUrl, refresh],
  )

  return {
    questions,
    isLoading,
    error,
    refresh,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  }
}
