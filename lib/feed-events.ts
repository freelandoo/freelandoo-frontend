"use client"

import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"
import type { FeedEventType, FeedFilters } from "@/lib/types/portfolio-feed"

const SESSION_KEY = "feed_session_id"

export function getFeedSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = window.sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    window.sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export interface SendFeedEventInput {
  post_id: string
  event_type: FeedEventType
  filters?: FeedFilters | null
  metadata?: Record<string, unknown>
}

export async function sendFeedEvent(input: SendFeedEventInput): Promise<void> {
  if (typeof window === "undefined") return
  const session_id = getFeedSessionId()
  const token = getToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const filtersPayload = input.filters
    ? {
        machine_id: input.filters.id_machine ?? undefined,
        profession_id: input.filters.id_category ?? undefined,
        city: input.filters.municipio ?? undefined,
        state: input.filters.estado ?? undefined,
      }
    : undefined

  try {
    /**
     * ⚠️ VAI DIRETO NO RAILWAY, nunca pelo proxy `/api/*` da Vercel — e aqui
     * isso não é economia de centavos, é a regra da casa aplicada à chamada
     * MAIS FREQUENTE do feed.
     *
     * Esta função não é disparada uma vez por post: o card manda
     * `content_retention` a cada ~10 segundos EM QUE ESTÁ VISÍVEL
     * (components/feed/portfolio-post-card.tsx), e nada é agrupado — é um
     * POST por card, por janela de 10s, mais as impressões e os cliques. Numa
     * tela com feed cheio são dezenas de requisições por minuto de UMA pessoa,
     * e o feed é a superfície mais visitada do site.
     *
     * Pelo proxy, cada uma dessas cobrava uma invocação/edge request. É a
     * mesma conta que já tirou de lá o heartbeat de XP, a batida de presença
     * das plataformas e o chat ao vivo; o CORS do backend já aceita o site.
     *
     * O caminho no backend é `/feed/events` — o `/api` era só o prefixo do
     * rewrite (next.config.mjs), e o backend não tem esse prefixo.
     */
    await fetch(`${getPublicBackendUrl()}/feed/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        post_id: input.post_id,
        event_type: input.event_type,
        session_id,
        filters: filtersPayload,
        metadata: input.metadata,
      }),
      keepalive: true,
    })
  } catch {
    // Silenciar — eventos não devem quebrar a UI.
  }
}
