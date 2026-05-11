"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type {
  CourseModule,
  ModuleUpdateInput,
} from "./use-course-modules"

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
 * Carrega UM módulo específico de um curso. Como o backend só expõe lista
 * de módulos, usamos GET /modules e filtramos pelo id (mantém apenas
 * uma chamada — o módulo geralmente é pequeno).
 */
export function useMyModule(
  courseId: string | null | undefined,
  moduleId: string | null | undefined,
) {
  const [module, setModule] = useState<CourseModule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId || !moduleId) {
      setModule(null)
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
        "useMyModule:list",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | { modules?: CourseModule[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar módulo"))
        setModule(null)
        return
      }
      const found = (data?.modules || []).find((m) => m.id === moduleId) || null
      if (!found) {
        setError("Módulo não encontrado")
        setModule(null)
        return
      }
      setModule(found)
    } catch {
      setError("Falha de rede ao carregar módulo")
    } finally {
      setIsLoading(false)
    }
  }, [courseId, moduleId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateModule = useCallback(
    async (patch: ModuleUpdateInput): Promise<CourseModule> => {
      if (!courseId || !moduleId) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useMyModule:update",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`,
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
      setModule(data.module)
      return data.module
    },
    [courseId, moduleId],
  )

  const uploadBanner = useCallback(
    async (file: File): Promise<CourseModule> => {
      if (!courseId || !moduleId) throw new Error("Contexto inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const form = new FormData()
      form.append("banner", file)
      const res = await fetchWithLog(
        "useMyModule:uploadBanner",
        `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/banner`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      )
      const data = (await readJsonSafe(res)) as
        | { module?: CourseModule; error?: string }
        | null
      if (!res.ok || !data?.module) {
        throw new Error(extractError(data, "Falha ao enviar banner"))
      }
      setModule(data.module)
      return data.module
    },
    [courseId, moduleId],
  )

  const removeBanner = useCallback(async (): Promise<CourseModule> => {
    if (!courseId || !moduleId) throw new Error("Contexto inválido")
    const token = getToken()
    if (!token) throw new Error("Não autenticado")
    const res = await fetchWithLog(
      "useMyModule:removeBanner",
      `/api/me/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/banner`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    const data = (await readJsonSafe(res)) as
      | { module?: CourseModule; error?: string }
      | null
    if (!res.ok || !data?.module) {
      throw new Error(extractError(data, "Falha ao remover banner"))
    }
    setModule(data.module)
    return data.module
  }, [courseId, moduleId])

  return {
    module,
    isLoading,
    error,
    refresh,
    updateModule,
    uploadBanner,
    removeBanner,
  }
}
