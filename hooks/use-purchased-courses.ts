"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type { CourseStatus } from "@/hooks/use-my-courses"

export interface PurchasedCourse {
  enrollment_id: string
  enrolled_at: string
  amount_paid_cents: number
  currency: string
  progress_percent: number
  id: string
  owner_user_id: string
  profile_id: string | null
  profile_display_name: string | null
  creator_name: string | null
  creator_avatar: string | null
  title: string
  slug: string | null
  short_description: string | null
  description: string | null
  cover_url: string | null
  price_cents: number | null
  status: CourseStatus
  feed_post_id: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  modules_count: number
  lessons_count: number
  students_count: number
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

export function usePurchasedCourses() {
  const [courses, setCourses] = useState<PurchasedCourse[]>([])
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
      const res = await fetchWithLog(
        "usePurchasedCourses:list",
        "/api/me/courses/purchased",
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | { courses?: PurchasedCourse[]; error?: string }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar cursos comprados"))
        return
      }
      setCourses(Array.isArray(data?.courses) ? data.courses : [])
    } catch {
      setError("Falha de rede ao carregar cursos comprados")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { courses, isLoading, error, refresh }
}
