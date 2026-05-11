"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithLog } from "@/lib/fetch-with-log"
import type { MyCourse } from "@/hooks/use-my-courses"

export interface CourseFeedPost {
  id?: string
  course_id: string
  portfolio_item_id: string | null
  message: string | null
  title?: string | null
  description?: string | null
  project_url: string | null
  status: "missing" | "draft" | "published" | "archived"
  is_active: boolean
  published_at: string | null
  created_at?: string
  updated_at?: string
  likes_count: number
  shares_count: number
  impressions_count: number
}

interface FeedPostResponse {
  course?: MyCourse
  feed_post?: CourseFeedPost
  error?: string
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function readJsonSafe(res: Response): Promise<FeedPostResponse | null> {
  try {
    return (await res.json()) as FeedPostResponse
  } catch {
    return null
  }
}

function extractError(data: FeedPostResponse | null, fallback: string) {
  return data?.error || fallback
}

export function useCourseFeedPost(courseId: string | null | undefined) {
  const [feedPost, setFeedPost] = useState<CourseFeedPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!courseId) {
      setFeedPost(null)
      setIsLoading(false)
      return
    }
    const token = getToken()
    if (!token) {
      setFeedPost(null)
      setIsLoading(false)
      setError("Não autenticado")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchWithLog(
        "useCourseFeedPost:get",
        `/api/me/courses/${encodeURIComponent(courseId)}/feed-post`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = await readJsonSafe(res)
      if (!res.ok || !data?.feed_post) {
        setError(extractError(data, "Falha ao carregar publicação"))
        return
      }
      setFeedPost(data.feed_post)
    } catch {
      setError("Falha de rede ao carregar publicação")
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const publish = useCallback(
    async (message: string): Promise<FeedPostResponse> => {
      if (!courseId) throw new Error("Curso inválido")
      const token = getToken()
      if (!token) throw new Error("Não autenticado")
      const res = await fetchWithLog(
        "useCourseFeedPost:publish",
        `/api/me/courses/${encodeURIComponent(courseId)}/feed-post`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
        },
      )
      const data = await readJsonSafe(res)
      if (!res.ok || !data?.feed_post) {
        throw new Error(extractError(data, "Falha ao publicar no feed"))
      }
      setFeedPost(data.feed_post)
      return data
    },
    [courseId],
  )

  const remove = useCallback(async (): Promise<FeedPostResponse> => {
    if (!courseId) throw new Error("Curso inválido")
    const token = getToken()
    if (!token) throw new Error("Não autenticado")
    const res = await fetchWithLog(
      "useCourseFeedPost:remove",
      `/api/me/courses/${encodeURIComponent(courseId)}/feed-post`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    const data = await readJsonSafe(res)
    if (!res.ok || !data?.feed_post) {
      throw new Error(extractError(data, "Falha ao remover do feed"))
    }
    setFeedPost(data.feed_post)
    return data
  }, [courseId])

  return { feedPost, isLoading, error, refresh, publish, remove }
}
