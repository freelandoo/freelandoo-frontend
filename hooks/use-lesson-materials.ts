"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export type MaterialKind = "file" | "link"

export interface LessonMaterial {
  id: string
  lesson_id: string
  kind: MaterialKind
  title: string
  file_url: string | null
  file_size_bytes: number | null
  mime: string | null
  link_url: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface CreateLinkInput {
  title: string
  link_url: string
}

export interface MaterialUpdateInput {
  title?: string
  link_url?: string
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

export function useLessonMaterials(
  courseId: string | null | undefined,
  moduleId: string | null | undefined,
  lessonId: string | null | undefined,
) {
  const [materials, setMaterials] = useState<LessonMaterial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const baseUrl =
    courseId && moduleId && lessonId
      ? `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}/materials`
      : null

  const refresh = useCallback(async () => {
    if (!baseUrl) {
      setMaterials([])
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
      const res = await fetchWithLog("useLessonMaterials:list", baseUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await readJsonSafe(res)) as
        | { materials?: LessonMaterial[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar materiais"))
        return
      }
      setMaterials(Array.isArray(data?.materials) ? data!.materials : [])
    } catch {
      setError("Falha de rede ao carregar materiais")
    } finally {
      setIsLoading(false)
    }
  }, [baseUrl])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const uploadFile = useCallback(
    async (
      file: File,
      onProgress?: (ratio: number) => void,
    ): Promise<LessonMaterial> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")

      const form = new FormData()
      form.append("file", file)
      form.append("title", file.name)

      return new Promise<LessonMaterial>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", `${baseUrl}/files`)
        xhr.setRequestHeader("Authorization", `Bearer ${token}`)

        if (onProgress) {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && evt.total > 0) {
              onProgress(evt.loaded / evt.total)
            }
          }
        }

        xhr.onload = () => {
          let data: unknown = null
          try {
            data = JSON.parse(xhr.responseText)
          } catch {
            data = null
          }
          const payload = data as
            | { material?: LessonMaterial; error?: string }
            | null
          if (xhr.status >= 200 && xhr.status < 300 && payload?.material) {
            setMaterials((prev) =>
              [...prev, payload.material!].sort(
                (a, b) => a.position - b.position,
              ),
            )
            resolve(payload.material!)
            return
          }
          reject(new Error(extractError(data, "Falha ao enviar arquivo")))
        }

        xhr.onerror = () =>
          reject(new Error("Falha de rede ao enviar arquivo"))
        xhr.onabort = () => reject(new Error("Upload cancelado"))

        xhr.send(form)
      })
    },
    [baseUrl],
  )

  const createLink = useCallback(
    async (input: CreateLinkInput): Promise<LessonMaterial> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useLessonMaterials:createLink",
        `${baseUrl}/links`,
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
        | { material?: LessonMaterial; error?: string }
        | null
      if (!res.ok || !data?.material) {
        throw new Error(extractError(data, "Falha ao adicionar link"))
      }
      setMaterials((prev) =>
        [...prev, data.material!].sort((a, b) => a.position - b.position),
      )
      return data.material
    },
    [baseUrl],
  )

  const updateMaterial = useCallback(
    async (
      id: string,
      patch: MaterialUpdateInput,
    ): Promise<LessonMaterial> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useLessonMaterials:update",
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
        | { material?: LessonMaterial; error?: string }
        | null
      if (!res.ok || !data?.material) {
        throw new Error(extractError(data, "Falha ao atualizar"))
      }
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? data.material! : m)),
      )
      return data.material
    },
    [baseUrl],
  )

  const deleteMaterial = useCallback(
    async (id: string): Promise<void> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useLessonMaterials:delete",
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
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    },
    [baseUrl],
  )

  const reorderMaterials = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      if (!baseUrl) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      setMaterials((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]))
        return orderedIds
          .map((id, idx) => {
            const m = map.get(id)
            return m ? { ...m, position: idx } : null
          })
          .filter(Boolean) as LessonMaterial[]
      })
      const res = await fetchWithLog(
        "useLessonMaterials:reorder",
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
        | { materials?: LessonMaterial[]; error?: string }
        | null
      if (!res.ok) {
        await refresh()
        throw new Error(extractError(data, "Falha ao reordenar"))
      }
      if (Array.isArray(data?.materials)) {
        setMaterials(data!.materials)
      }
    },
    [baseUrl, refresh],
  )

  return {
    materials,
    isLoading,
    error,
    refresh,
    uploadFile,
    createLink,
    updateMaterial,
    deleteMaterial,
    reorderMaterials,
  }
}
