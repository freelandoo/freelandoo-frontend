// Paths (Feed Interativo F5): tipos do grafo e o cliente das rotas /paths/*.

import { getToken } from "@/lib/auth"
import type { FeedMedia } from "@/lib/types/portfolio-feed"
import { FxError } from "./api"

export interface PathChoice {
  id: string
  label: string
  target: string | null
  picks?: number
}

export interface PathNode {
  id: string
  title: string
  body: string
  is_ending: boolean
  media_post_id?: string | null
  /** Só no player: a mídia já resolvida. */
  media?: FeedMedia | null
  x?: number
  y?: number
  reach?: number
  choices: PathChoice[]
}

export interface PathGraph {
  id_story: string
  title: string
  status?: "draft" | "published"
  root: string | null
  post_id?: string | null
  plays?: number
  nodes: PathNode[]
}

export interface PathSummary {
  id_story: string
  title: string
  status: "draft" | "published"
  id_portfolio_item: string | null
  plays_count: number
  nodes_count: number
  updated_at: string
}

export async function pathsApi<T>(path: string, init: { method?: string; body?: unknown; auth?: "required" | "optional" } = {}): Promise<T> {
  const token = getToken()
  if (!token && init.auth !== "optional") throw new FxError("login", 401)
  const res = await fetch(`/api/paths${path}`, {
    method: init.method || "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) throw new FxError((data as { error?: string } | null)?.error || `HTTP ${res.status}`, res.status)
  return data as T
}
