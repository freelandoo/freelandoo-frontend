"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ActiveContextKind = "user" | "subprofile" | "clan"

export interface ActiveContext {
  kind: ActiveContextKind
  /** UUID do sub-perfil ou clan quando kind != "user". */
  id_profile: string | null
  /** Nome (display_name) — null enquanto carrega ou em modo user. */
  name: string | null
  /** URL do avatar — null enquanto carrega ou ausente. */
  avatar_url: string | null
}

interface ParsedRoute {
  kind: ActiveContextKind
  id_profile: string | null
}

/**
 * Detecta o contexto a partir do pathname:
 *  - /account/profile/<uuid>/* → subperfil
 *  - /account/clans/<uuid>/* → clan
 *  - qualquer outra rota → user
 */
function parsePathname(pathname: string): ParsedRoute {
  const parts = pathname.split("/").filter(Boolean)
  if (parts[0] !== "account") return { kind: "user", id_profile: null }

  if (parts[1] === "profile" && parts[2] && UUID_RE.test(parts[2])) {
    return { kind: "subprofile", id_profile: parts[2] }
  }
  if (parts[1] === "clans" && parts[2] && UUID_RE.test(parts[2])) {
    return { kind: "clan", id_profile: parts[2] }
  }
  return { kind: "user", id_profile: null }
}

/**
 * Cache em módulo pra evitar refetch quando a sidebar re-renderiza ou o user
 * navega entre subpáginas do mesmo contexto.
 */
const cache = new Map<string, { name: string | null; avatar_url: string | null }>()

async function fetchContextProfile(
  kind: "subprofile" | "clan",
  id_profile: string
): Promise<{ name: string | null; avatar_url: string | null }> {
  const cacheKey = `${kind}:${id_profile}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const url =
    kind === "clan"
      ? `/api/clans/${id_profile}`
      : `/api/profile/${id_profile}`
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      const empty = { name: null, avatar_url: null }
      cache.set(cacheKey, empty)
      return empty
    }
    const body = await res.json()
    // Endpoints retornam shapes diferentes mas ambos têm display_name +
    // avatar_url. Aceitamos null em qualquer um sem reclamar.
    const data = {
      name: typeof body?.display_name === "string" ? body.display_name : null,
      avatar_url: typeof body?.avatar_url === "string" ? body.avatar_url : null,
    }
    cache.set(cacheKey, data)
    return data
  } catch {
    return { name: null, avatar_url: null }
  }
}

export function useActiveContext(): ActiveContext {
  const pathname = usePathname() || "/"
  const route = parsePathname(pathname)
  const [data, setData] = useState<{ name: string | null; avatar_url: string | null }>(
    () => {
      if (route.kind === "user" || !route.id_profile) {
        return { name: null, avatar_url: null }
      }
      return cache.get(`${route.kind}:${route.id_profile}`) || { name: null, avatar_url: null }
    }
  )

  useEffect(() => {
    if (route.kind === "user" || !route.id_profile) {
      setData({ name: null, avatar_url: null })
      return
    }
    let cancelled = false
    fetchContextProfile(route.kind, route.id_profile).then((d) => {
      if (!cancelled) setData(d)
    })
    return () => {
      cancelled = true
    }
  }, [route.kind, route.id_profile])

  return {
    kind: route.kind,
    id_profile: route.id_profile,
    name: data.name,
    avatar_url: data.avatar_url,
  }
}
