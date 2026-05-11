"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export type ModuleStatus = "draft" | "published" | "hidden"

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string | null
  position: number
  status: ModuleStatus
  lessons_count: number
  created_at: string
  updated_at: string
}

export interface ModuleCreateInput {
  title: string
  description?: string | null
  status?: ModuleStatus
}

export interface ModuleUpdateInput {
  title?: string
  description?: string | null
  status?: ModuleStatus
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

export function useCourseModules(courseId: string | null | undefined) {
  const [modules, setModules] = useState<CourseModule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId) {
      setModules([])
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
        "useCourseModules:list",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | { modules?: CourseModule[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar módulos"))
        return
      }
      setModules(Array.isArray(data?.modules) ? data!.modules : [])
    } catch {
      setError("Falha de rede ao carregar módulos")
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createModule = useCallback(
    async (input: ModuleCreateInput): Promise<CourseModule> => {
      if (!courseId) throw new Error("Curso inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useCourseModules:create",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules`,
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
        | { module?: CourseModule; error?: string }
        | null
      if (!res.ok || !data?.module) {
        throw new Error(extractError(data, "Falha ao criar módulo"))
      }
      setModules((prev) =>
        [...prev, data.module!].sort((a, b) => a.position - b.position),
      )
      return data.module
    },
    [courseId],
  )

  const updateModule = useCallback(
    async (id: string, patch: ModuleUpdateInput): Promise<CourseModule> => {
      if (!courseId) throw new Error("Curso inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useCourseModules:update",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(id)}`,
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
        | { module?: CourseModule; error?: string }
        | null
      if (!res.ok || !data?.module) {
        throw new Error(extractError(data, "Falha ao atualizar módulo"))
      }
      setModules((prev) => prev.map((m) => (m.id === id ? data.module! : m)))
      return data.module
    },
    [courseId],
  )

  const deleteModule = useCallback(
    async (id: string): Promise<void> => {
      if (!courseId) throw new Error("Curso inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useCourseModules:delete",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        const data = await readJsonSafe(res)
        throw new Error(extractError(data, "Falha ao excluir módulo"))
      }
      setModules((prev) => prev.filter((m) => m.id !== id))
    },
    [courseId],
  )

  const reorderModules = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      if (!courseId) throw new Error("Curso inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      // Atualiza local otimisticamente para responsividade visual.
      setModules((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]))
        return orderedIds
          .map((id, idx) => {
            const m = map.get(id)
            return m ? { ...m, position: idx } : null
          })
          .filter(Boolean) as CourseModule[]
      })
      const res = await fetchWithLog(
        "useCourseModules:reorder",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/order`,
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
        | { modules?: CourseModule[]; error?: string }
        | null
      if (!res.ok) {
        // Reverte o estado consultando o servidor.
        await refresh()
        throw new Error(extractError(data, "Falha ao reordenar"))
      }
      if (Array.isArray(data?.modules)) {
        setModules(data!.modules)
      }
    },
    [courseId, refresh],
  )

  return {
    modules,
    isLoading,
    error,
    refresh,
    createModule,
    updateModule,
    deleteModule,
    reorderModules,
  }
}
