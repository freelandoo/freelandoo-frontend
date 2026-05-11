"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"

export interface CourseStudent {
  id: string
  course_id: string
  user_id: string
  order_id: string | null
  amount_paid_cents: number
  currency: string
  status: "active" | "refunded" | "canceled"
  enrolled_at: string
  created_at: string
  updated_at: string
  student_name: string
  student_email: string | null
  student_avatar: string | null
}

export interface CourseStudentsSummary {
  active_students_count: number
  total_enrollments_count: number
  active_revenue_cents: number
  gross_revenue_cents: number
  last_enrolled_at: string | null
}

const EMPTY_SUMMARY: CourseStudentsSummary = {
  active_students_count: 0,
  total_enrollments_count: 0,
  active_revenue_cents: 0,
  gross_revenue_cents: 0,
  last_enrolled_at: null,
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

export function useCourseStudents(courseId: string | null | undefined) {
  const [students, setStudents] = useState<CourseStudent[]>([])
  const [summary, setSummary] = useState<CourseStudentsSummary>(EMPTY_SUMMARY)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId) {
      setStudents([])
      setSummary(EMPTY_SUMMARY)
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
        "useCourseStudents:list",
        `/api/me/courses/${encodeURIComponent(courseId)}/students`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = (await readJsonSafe(res)) as
        | {
            students?: CourseStudent[]
            summary?: CourseStudentsSummary
            error?: string
          }
        | null
      if (!res.ok) {
        setError(extractError(data, "Falha ao carregar alunos"))
        return
      }
      setStudents(Array.isArray(data?.students) ? data.students : [])
      setSummary(data?.summary || EMPTY_SUMMARY)
    } catch {
      setError("Falha de rede ao carregar alunos")
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { students, summary, isLoading, error, refresh }
}
