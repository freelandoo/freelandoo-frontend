import { headers } from "next/headers"

/**
 * Ranking GERAL de Participantes da Casa Views (dados reais, sem mock).
 * Soma dos pontos de posição (1º=8, 2º=7, 3º=6, 4º=5, demais=4) acumulados a
 * cada fechamento diário. Só roda em server components; busca o proxy
 * same-origin /api/acasaviews/ranking-geral (que lê RANKING_API_URL no servidor).
 */

export type GeneralEntry = {
  posicao: number
  ranking_user_id: string
  participant_id: string | null
  display_name: string
  slug: string | null
  avatar_url: string | null
  pontos_geral: number
  raw_total: number
  dias: number
  vitorias: number
}

async function originBaseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (!host) return ""
  const proto = h.get("x-forwarded-proto") ?? "https"
  return `${proto}://${host}`
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function fetchGeneralRanking(): Promise<GeneralEntry[]> {
  try {
    const base = await originBaseUrl()
    const res = await fetch(`${base}/api/acasaviews/ranking-geral`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = (await res.json()) as { standings?: unknown[] }
    const list = Array.isArray(data?.standings) ? data.standings : []
    return list.map((raw, i): GeneralEntry => {
      const r = raw as Record<string, unknown>
      return {
        posicao: num(r.posicao) || i + 1,
        ranking_user_id: String(r.ranking_user_id ?? ""),
        participant_id: r.participant_id ? String(r.participant_id) : null,
        display_name: String(r.display_name ?? r.ranking_user_id ?? "—"),
        slug: r.slug ? String(r.slug) : null,
        avatar_url: r.avatar_url ? String(r.avatar_url) : null,
        pontos_geral: num(r.pontos_geral),
        raw_total: num(r.raw_total),
        dias: num(r.dias),
        vitorias: num(r.vitorias),
      }
    })
  } catch {
    return []
  }
}
