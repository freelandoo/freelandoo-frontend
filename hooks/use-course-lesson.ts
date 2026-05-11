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

  // ---------------------------------------------------------------
  // Slice 7 — Vídeo
  // ---------------------------------------------------------------

  /**
   * Upload do vídeo da aula via XHR para conseguirmos progress real.
   * onProgress recebe 0..1.
   */
  const uploadVideo = useCallback(
    async (
      file: File,
      onProgress?: (ratio: number) => void,
    ): Promise<CourseLesson> => {
      if (!courseId || !lesson) throw new Error("Aula não carregada")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")

      const form = new FormData()
      form.append("video", file)

      const url = `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(lesson.module_id)}/lessons/${encodeURIComponent(lesson.id)}/video`

      // UI imediata: limpa URLs antigos (caso seja "trocar vídeo") e
      // deixa em "uploading" enquanto o XHR roda. Após a resposta do
      // servidor, o lesson é substituído pelo retorno autoritativo.
      setLesson((prev) =>
        prev
          ? {
              ...prev,
              video_status: "uploading",
              original_video_url: null,
              processed_video_url: null,
              thumbnail_url: null,
            }
          : prev,
      )

      return new Promise<CourseLesson>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", url)
        xhr.setRequestHeader("Authorization", `Bearer ${token}`)

        if (onProgress) {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && evt.total > 0) {
              onProgress(evt.loaded / evt.total)
            }
          }
        }

        // Bytes totalmente enviados — servidor agora processa (ffmpeg).
        // Reflete na UI antes da resposta chegar para não ficar travado
        // em "uploading 100%" durante minutos.
        xhr.upload.onload = () => {
          setLesson((prev) =>
            prev ? { ...prev, video_status: "processing" } : prev,
          )
        }

        xhr.onload = () => {
          let data: unknown = null
          try {
            data = JSON.parse(xhr.responseText)
          } catch {
            data = null
          }
          const payload = data as
            | { lesson?: CourseLesson; error?: string }
            | null
          if (xhr.status >= 200 && xhr.status < 300) {
            const next = payload?.lesson
            if (next) {
              setLesson(next)
              resolve(next)
              return
            }
            reject(new Error("Resposta inválida do servidor"))
            return
          }
          // Falha — se o backend devolveu o lesson (ex: ffmpeg falhou
          // mas original subiu), use-o; senão força status=error local.
          if (payload?.lesson) {
            setLesson(payload.lesson)
          } else {
            setLesson((prev) =>
              prev ? { ...prev, video_status: "error" } : prev,
            )
          }
          reject(new Error(extractError(data, "Falha ao enviar vídeo")))
        }

        xhr.onerror = () => {
          setLesson((prev) =>
            prev ? { ...prev, video_status: "error" } : prev,
          )
          reject(new Error("Falha de rede ao enviar vídeo"))
        }

        xhr.onabort = () => {
          setLesson((prev) =>
            prev ? { ...prev, video_status: "error" } : prev,
          )
          reject(new Error("Upload cancelado"))
        }

        xhr.send(form)
      })
    },
    [courseId, lesson],
  )

  const removeVideo = useCallback(async (): Promise<CourseLesson> => {
    if (!courseId || !lesson) throw new Error("Aula não carregada")
    const token = getToken()
    if (!token) throw new Error("Não autenticado")
    const res = await fetchWithLog(
      "useCourseLesson:removeVideo",
      `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(lesson.module_id)}/lessons/${encodeURIComponent(lesson.id)}/video`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    const data = (await readJsonSafe(res)) as
      | { lesson?: CourseLesson; error?: string }
      | null
    if (!res.ok || !data?.lesson) {
      throw new Error(extractError(data, "Falha ao remover vídeo"))
    }
    setLesson(data.lesson)
    return data.lesson
  }, [courseId, lesson])

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

  return {
    lesson,
    isLoading,
    error,
    refresh,
    updateLesson,
    deleteLesson,
    uploadVideo,
    removeVideo,
  }
}
