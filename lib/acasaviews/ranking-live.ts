import type { AudienceEntry, ParticipantEntry } from "./ranking-data"

/**
 * Dados REAIS do ranking (sem mock). Vêm do backend Railway que alimenta o
 * jogo da Casa Views. A API só expõe login, pontuação, posição e tipo —
 * métricas finas (views/likes/comentários/trend) não existem ainda, então
 * ficam zeradas/neutras e as páginas escondem esses chips.
 */

// URL do backend de ranking (Railway). Configurável por env pra trocar de
// serviço sem mexer no código — basta setar RANKING_API_URL no Vercel.
const RANKING_API = `${
  process.env.RANKING_API_URL ?? "https://casa-views-ranking-production.up.railway.app"
}/users`

interface RawUser {
  id_user: string
  user_login: string
  profile_pic_url: string | null
  tipo_usuario: string
  pontuacao: string | number
  posicao: string | number
}

async function fetchUsers(): Promise<RawUser[]> {
  try {
    const res = await fetch(RANKING_API, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return []
    const data = (await res.json()) as unknown
    return Array.isArray(data) ? (data as RawUser[]) : []
  } catch {
    return []
  }
}

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function byPosicao(a: RawUser, b: RawUser): number {
  return num(a.posicao) - num(b.posicao) || num(b.pontuacao) - num(a.pontuacao)
}

function mapAudience(u: RawUser, index: number): AudienceEntry {
  const login = u.user_login || "anonimo"
  return {
    id: u.id_user || `esp-${index}`,
    rank: index + 1,
    name: login,
    handle: `@${login}`,
    avatar: u.profile_pic_url || "",
    points: num(u.pontuacao),
    comments: 0,
    likes: 0,
    replies: 0,
    trend: "same",
    trendValue: 0,
    tag: "público",
    tagAccent: "cyan",
  }
}

function mapParticipant(u: RawUser, index: number): ParticipantEntry {
  const login = u.user_login || "anonimo"
  return {
    id: u.id_user || `part-${index}`,
    rank: index + 1,
    name: login,
    handle: `@${login}`,
    avatar: u.profile_pic_url || "",
    group: index % 2 === 0 ? "H" : "M",
    points: num(u.pontuacao),
    views: 0,
    likes: 0,
    comments: 0,
    trend: "same",
    trendValue: 0,
    tag: "na casa",
    tagAccent: "magenta",
  }
}

export async function fetchLiveRanking(): Promise<{
  audience: AudienceEntry[]
  participants: ParticipantEntry[]
}> {
  const users = await fetchUsers()

  const audience = users
    .filter((u) => String(u.tipo_usuario || "").toUpperCase() === "ESPECTADOR")
    .sort(byPosicao)
    .map(mapAudience)

  const participants = users
    .filter((u) => String(u.tipo_usuario || "").toUpperCase() === "PARTICIPANTE")
    .sort(byPosicao)
    .map(mapParticipant)

  return { audience, participants }
}
