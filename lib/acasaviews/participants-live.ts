import { getBackendApiUrl } from "@/lib/backend"

/**
 * Dados dos participantes da Casa Views, mesclados SERVER-SIDE:
 *  - editorial (cofre, suspeita, jornada, segredos, teorias, produtos, bio…)
 *    vem do backend CORE do Freelandoo (/casa/participants[/:slug]);
 *  - números ao vivo (views/likes/comentários/pontos/posição) + deltas de 24h
 *    vêm do módulo casa-views-ranking (/users/deltas), casados por
 *    external_ranking_user_id (== id_user OU user_login do ranking).
 *
 * Só roda em server components. O backend de ranking é lido server-side via
 * RANKING_API_URL (env de servidor) — nunca chega ao browser.
 */

const RANKING_API_URL =
  process.env.RANKING_API_URL?.trim() ||
  "https://casa-views-ranking-production.up.railway.app"

export type LiveStats = {
  posicao: number | null
  posicao_prev: number | null
  views: number
  likes: number
  comments: number
  pontuacao: number
  views_delta_24h: number
  likes_delta_24h: number
  comments_delta_24h: number
  pontuacao_delta_24h: number
  views_pct_24h: number
  likes_pct_24h: number
  comments_pct_24h: number
  pontuacao_pct_24h: number
  matched: boolean
}

export type ParticipantBase = {
  id: string
  slug: string
  display_name: string
  tagline: string | null
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  quote: string | null
  profession: string | null
  archetype: string | null
  strengths: string | null
  risks: string | null
  vault_amount_cents: number
  suspicion_pct: number
  captures_count: number
  status: string
  accent_color: "magenta" | "cyan" | "gold" | string
  external_ranking_user_id: string | null
  is_active: boolean
  sort_order: number
}

export type JourneyItem = { id: string; label: string | null; title: string; description: string | null; happened_on: string | null; sentiment: string; sort_order: number }
export type SecretItem = { id: string; content: string; author_label: string; revealed: boolean; sort_order: number }
export type TheoryItem = { id: string; content: string; author_label: string; votes: number; sort_order: number }
export type ProductItem = { id: string; name: string; description: string | null; image_url: string | null; price_cents: number; stock: number | null; is_active: boolean; sort_order: number }

export type ParticipantCard = ParticipantBase & { live: LiveStats }
export type ParticipantFull = ParticipantCard & {
  journey: JourneyItem[]
  secrets: SecretItem[]
  theories: TheoryItem[]
  products: ProductItem[]
}

type RawDelta = {
  id_user: string
  user_login: string
  posicao: number
  posicao_prev: number | null
  pontuacao: number; pontuacao_delta_24h: number; pontuacao_pct_24h: number
  views: number; views_delta_24h: number; views_pct_24h: number
  likes: number; likes_delta_24h: number; likes_pct_24h: number
  comments: number; comments_delta_24h: number; comments_pct_24h: number
}

const EMPTY_LIVE: LiveStats = {
  posicao: null, posicao_prev: null, views: 0, likes: 0, comments: 0, pontuacao: 0,
  views_delta_24h: 0, likes_delta_24h: 0, comments_delta_24h: 0, pontuacao_delta_24h: 0,
  views_pct_24h: 0, likes_pct_24h: 0, comments_pct_24h: 0, pontuacao_pct_24h: 0, matched: false,
}

async function fetchDeltas(): Promise<RawDelta[]> {
  try {
    const res = await fetch(`${RANKING_API_URL.replace(/\/$/, "")}/users/deltas`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = (await res.json()) as unknown
    return Array.isArray(data) ? (data as RawDelta[]) : []
  } catch {
    return []
  }
}

function buildDeltaIndex(deltas: RawDelta[]): Map<string, RawDelta> {
  const idx = new Map<string, RawDelta>()
  for (const d of deltas) {
    if (d.id_user) idx.set(String(d.id_user).toLowerCase(), d)
    if (d.user_login) idx.set(String(d.user_login).toLowerCase(), d)
  }
  return idx
}

function mergeLive(p: ParticipantBase, idx: Map<string, RawDelta>): LiveStats {
  const key = p.external_ranking_user_id?.trim().toLowerCase()
  const d = key ? idx.get(key) : undefined
  if (!d) return EMPTY_LIVE
  const n = (v: number | null | undefined) => Number(v) || 0
  return {
    posicao: d.posicao ?? null,
    posicao_prev: d.posicao_prev ?? null,
    views: n(d.views), likes: n(d.likes), comments: n(d.comments), pontuacao: n(d.pontuacao),
    views_delta_24h: n(d.views_delta_24h), likes_delta_24h: n(d.likes_delta_24h),
    comments_delta_24h: n(d.comments_delta_24h), pontuacao_delta_24h: n(d.pontuacao_delta_24h),
    views_pct_24h: n(d.views_pct_24h), likes_pct_24h: n(d.likes_pct_24h),
    comments_pct_24h: n(d.comments_pct_24h), pontuacao_pct_24h: n(d.pontuacao_pct_24h),
    matched: true,
  }
}

async function fetchEditorialList(): Promise<ParticipantBase[]> {
  try {
    const res = await fetch(`${getBackendApiUrl()}/casa/participants`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.participants) ? data.participants : []
  } catch {
    return []
  }
}

export async function fetchParticipantsForGrid(): Promise<ParticipantCard[]> {
  const [participants, deltas] = await Promise.all([fetchEditorialList(), fetchDeltas()])
  const idx = buildDeltaIndex(deltas)
  return participants.map((p) => ({ ...p, live: mergeLive(p, idx) }))
}

export async function fetchParticipantBySlug(slug: string): Promise<ParticipantFull | null> {
  try {
    const [res, deltas] = await Promise.all([
      fetch(`${getBackendApiUrl()}/casa/participants/${encodeURIComponent(slug)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
      fetchDeltas(),
    ])
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.participant) return null
    const idx = buildDeltaIndex(deltas)
    return {
      ...(data.participant as ParticipantBase),
      live: mergeLive(data.participant as ParticipantBase, idx),
      journey: data.journey || [],
      secrets: data.secrets || [],
      theories: data.theories || [],
      products: data.products || [],
    }
  } catch {
    return null
  }
}
